import { NextRequest, NextResponse } from 'next/server';
import { langGraphWorkflow } from '@/lib/langgraph-workflow';
import { mistralService } from '@/lib/mistral-service';
import { geminiService } from '@/lib/gemini-service';
import { supabaseServiceBackend } from '@/lib/supabase';
import { embeddingService } from '@/lib/embeddings';
import { securityService, checkRateLimit } from '@/lib/security';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  // Create security context
  const securityContext = {
    ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
    timestamp: new Date(),
    sessionId: request.headers.get('x-session-id') || undefined,
    userId: request.headers.get('x-user-id') || undefined,
  };

  // Rate limiting check
  const rateLimitResult = await checkRateLimit(securityContext.ipAddress, {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50 // 50 requests per 15 minutes for medical queries
  });

  if (!rateLimitResult.allowed) {
    await securityService.createAuditLog(
      'rate_limit_exceeded',
      '/api/rag/chat',
      securityContext,
      false,
      { resetTime: rateLimitResult.resetTime }
    );
    
    return NextResponse.json(
      { 
        error: 'Rate limit exceeded. Please try again later.',
        retryAfter: rateLimitResult.resetTime ? Math.round((rateLimitResult.resetTime - Date.now()) / 1000) : 900
      },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { query, sessionId, chatHistory, enhancementOptions } = body;

    // Enhanced validation with security checks
    if (!query || typeof query !== 'string') {
      await securityService.createAuditLog(
        'invalid_request',
        '/api/rag/chat',
        securityContext,
        false,
        { reason: 'Missing or invalid query parameter' }
      );
      
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      );
    }

    // Additional security validation
    const validation = securityService.validateMedicalInput({ query, sessionId, enhancementOptions });
    if (!validation.isValid) {
      await securityService.createAuditLog(
        'input_validation_failed',
        '/api/rag/chat',
        securityContext,
        false,
        { errors: validation.errors }
      );
      
      return NextResponse.json(
        { 
          error: 'Input validation failed',
          details: validation.errors 
        },
        { status: 400 }
      );
    }

    // Audit successful medical query
    await securityService.createAuditLog(
      'medical_query',
      '/api/rag/chat',
      securityContext,
      true,
      { 
        queryLength: query.length,
        hasSessionId: !!sessionId,
        enhancementEnabled: !!enhancementOptions?.enableGemini 
      }
    );

    console.log(`🔍 Processing RAG chat request: ${query.substring(0, 100)}...`);

    // Step 1: Execute LangGraph workflow for document retrieval and analysis
    const workflowResult = await langGraphWorkflow.execute(query);

    if (workflowResult.error) {
      console.error('Workflow execution failed:', workflowResult.error);
      return NextResponse.json(
        { error: workflowResult.error },
        { status: 500 }
      );
    }

    // Step 2: Generate enhanced response using Mistral API
    let mistralResponse;
    try {
      mistralResponse = await mistralService.generateMedicalResponse({
        query,
        context: workflowResult.context || '',
        clinicalAssessment: workflowResult.clinicalAssessment,
        sources: workflowResult.sources || [],
        chatHistory: chatHistory || [],
      });
    } catch (mistralError) {
      console.error('Mistral API failed:', mistralError);
      
      // Audit AI service failure
      await securityService.createAuditLog(
        'ai_service_failure',
        '/api/rag/chat',
        securityContext,
        false,
        { service: 'mistral', error: mistralError instanceof Error ? mistralError.message : 'Unknown error' }
      );
      
      // Fallback to workflow result if Mistral fails
      mistralResponse = {
        response: workflowResult.finalAnswer || 'Unable to generate enhanced response. Please try again.',
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      };
    }

    // Step 3: Apply Gemini enhancements if requested
    let enhancedResponse = mistralResponse.response;
    let geminiUsage = null;

    if (enhancementOptions?.enableGemini && geminiService) {
      try {
        const geminiResult = await geminiService.enhanceMedicalContent({
          originalContent: mistralResponse.response,
          enhancementType: enhancementOptions.enhancementType || 'clinical_reasoning',
          targetAudience: enhancementOptions.targetAudience || 'clinicians',
          additionalContext: enhancementOptions.additionalContext,
        });

        enhancedResponse = geminiResult.enhancedContent;
        geminiUsage = geminiResult.usage;
      } catch (geminiError) {
        console.error('Gemini enhancement failed:', geminiError);
        
        // Audit Gemini service failure
        await securityService.createAuditLog(
          'ai_service_failure',
          '/api/rag/chat',
          securityContext,
          false,
          { service: 'gemini', error: geminiError instanceof Error ? geminiError.message : 'Unknown error' }
        );
        
        // Continue with Mistral response if Gemini fails
      }
    }

    // Step 4: Store chat session and messages if sessionId is provided
    if (sessionId) {
      try {
        // Store user message
        await supabaseServiceBackend.storeChatMessage({
          session_id: sessionId,
          role: 'user',
          content: query,
          metadata: {
            processingTime: workflowResult.processingTime,
            documentCount: workflowResult.ragResult?.metadata?.documentCount || 0,
          },
        });

        // Store assistant response
        await supabaseServiceBackend.storeChatMessage({
          session_id: sessionId,
          role: 'assistant',
          content: enhancedResponse,
          metadata: {
            sources: workflowResult.sources,
            confidence: workflowResult.confidence,
            mistralUsage: mistralResponse.usage,
            geminiUsage,
            enhancementOptions,
          },
        });
      } catch (storageError) {
        console.error('Failed to store chat messages:', storageError);
        
        // Audit storage failure
        await securityService.createAuditLog(
          'storage_failure',
          '/api/rag/chat',
          securityContext,
          false,
          { error: storageError instanceof Error ? storageError.message : 'Unknown error' }
        );
        
        // Continue even if storage fails
      }
    }

    // Step 5: Prepare and return response
    const totalProcessingTime = Date.now() - startTime;
    
    const responseData = {
      query,
      response: enhancedResponse,
      sources: workflowResult.sources,
      confidence: workflowResult.confidence,
      processingTime: totalProcessingTime,
      metadata: {
        documentCount: workflowResult.ragResult?.metadata?.documentCount || 0,
        totalTokens: workflowResult.ragResult?.metadata?.totalTokens || 0,
        similarityScores: workflowResult.ragResult?.metadata?.similarityScores || [],
        mistralUsage: mistralResponse.usage,
        geminiUsage,
        enhancementApplied: !!geminiUsage,
        securityValidated: true,
      },
      workflowSteps: {
        queryAnalysis: !!workflowResult.enhancedQuery,
        documentRetrieval: !!(workflowResult.relevantDocuments && workflowResult.relevantDocuments.length > 0),
        clinicalAssessment: !!workflowResult.clinicalAssessment,
        responseGeneration: !!workflowResult.finalAnswer,
        qualityCheck: workflowResult.confidence !== undefined,
        securityChecks: true,
      },
    };

    // Audit successful response
    await securityService.createAuditLog(
      'medical_response_generated',
      '/api/rag/chat',
      securityContext,
      true,
      { 
        responseLength: enhancedResponse.length,
        processingTime: totalProcessingTime,
        confidence: workflowResult.confidence,
        sourcesCount: workflowResult.sources?.length || 0 
      }
    );

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('RAG chat API error:', error);
    
    // Audit critical error
    await securityService.createAuditLog(
      'api_error',
      '/api/rag/chat',
      securityContext,
      false,
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        processingTime: Date.now() - startTime
      }
    );
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.message : 'Unknown error')
          : 'An unexpected error occurred',
        requestId: securityContext.sessionId || 'unknown'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const securityContext = {
    ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
    timestamp: new Date(),
  };

  try {
    // Audit health check access
    await securityService.createAuditLog(
      'health_check',
      '/api/rag/chat',
      securityContext,
      true
    );

    // Test all services
    const [supabaseTest, embeddingTest, mistralTest, geminiTest] = await Promise.allSettled([
      supabaseServiceBackend.testConnection(),
      embeddingService.testService(),
      mistralService.testService(),
      geminiService.testService(),
    ]);

    // Validate security configuration
    const securityValidation = securityService.validateSecurityConfig();

    const healthStatus = {
      supabase: supabaseTest.status === 'fulfilled' ? supabaseTest.value : { success: false, message: supabaseTest.reason },
      embeddings: embeddingTest.status === 'fulfilled' ? embeddingTest.value : { success: false, message: embeddingTest.reason },
      mistral: mistralTest.status === 'fulfilled' ? mistralTest.value : { success: false, message: mistralTest.reason },
      gemini: geminiTest.status === 'fulfilled' ? geminiTest.value : { success: false, message: geminiTest.reason },
      security: {
        success: securityValidation.isValid,
        message: securityValidation.isValid ? 'Security configuration valid' : 'Security configuration issues detected',
        warnings: securityValidation.warnings,
      },
      timestamp: new Date().toISOString(),
    };

    const allHealthy = Object.values(healthStatus).every(
      (service: any) => service.success === true
    );

    return NextResponse.json({
      status: allHealthy ? 'healthy' : 'degraded',
      services: healthStatus,
      security: {
        configured: securityValidation.isValid,
        errors: securityValidation.errors,
        warnings: securityValidation.warnings,
      },
    });
  } catch (error) {
    // Audit health check failure
    await securityService.createAuditLog(
      'health_check_failed',
      '/api/rag/chat',
      securityContext,
      false,
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );

    return NextResponse.json(
      { 
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}