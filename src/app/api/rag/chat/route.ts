import { NextRequest, NextResponse } from 'next/server';
import { langGraphWorkflow } from '@/lib/langgraph-workflow';
import { mistralService } from '@/lib/mistral-service';
import { geminiService } from '@/lib/gemini-service';
import { supabaseServiceBackend } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, sessionId, chatHistory, enhancementOptions } = body;

    // Validate required parameters
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      );
    }

    console.log(`Processing RAG chat request: ${query.substring(0, 100)}...`);

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
        // Continue even if storage fails
      }
    }

    // Step 5: Prepare and return response
    const responseData = {
      query,
      response: enhancedResponse,
      sources: workflowResult.sources,
      confidence: workflowResult.confidence,
      processingTime: workflowResult.processingTime,
      metadata: {
        documentCount: workflowResult.ragResult?.metadata?.documentCount || 0,
        totalTokens: workflowResult.ragResult?.metadata?.totalTokens || 0,
        similarityScores: workflowResult.ragResult?.metadata?.similarityScores || [],
        mistralUsage: mistralResponse.usage,
        geminiUsage,
        enhancementApplied: !!geminiUsage,
      },
      workflowSteps: {
        queryAnalysis: !!workflowResult.enhancedQuery,
        documentRetrieval: !!(workflowResult.relevantDocuments && workflowResult.relevantDocuments.length > 0),
        clinicalAssessment: !!workflowResult.clinicalAssessment,
        responseGeneration: !!workflowResult.finalAnswer,
        qualityCheck: workflowResult.confidence !== undefined,
      },
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('RAG chat API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Test all services
    const [supabaseTest, embeddingTest, mistralTest, geminiTest] = await Promise.allSettled([
      supabaseServiceBackend.testConnection(),
      embeddingService.testService(),
      mistralService.testService(),
      geminiService.testService(),
    ]);

    const healthStatus = {
      supabase: supabaseTest.status === 'fulfilled' ? supabaseTest.value : { success: false, message: supabaseTest.reason },
      embeddings: embeddingTest.status === 'fulfilled' ? embeddingTest.value : { success: false, message: embeddingTest.reason },
      mistral: mistralTest.status === 'fulfilled' ? mistralTest.value : { success: false, message: mistralTest.reason },
      gemini: geminiTest.status === 'fulfilled' ? geminiTest.value : { success: false, message: geminiTest.reason },
      timestamp: new Date().toISOString(),
    };

    const allHealthy = Object.values(healthStatus).every(
      (service: any) => service.success === true
    );

    return NextResponse.json({
      status: allHealthy ? 'healthy' : 'degraded',
      services: healthStatus,
    });
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}