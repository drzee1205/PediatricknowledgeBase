// Enhanced LangGraph Workflow for NelsonGPT with Advanced Medical AI Integration
import { enhancedRAGPipeline, EnhancedRAGResult, MedicalContext } from './rag-pipeline';
import { vectorDatabaseService } from './vector-database';
import { embeddingService } from './embeddings';
import { mistralService } from './mistral-service';
import { geminiService } from './gemini-service';
import { supabaseServiceBackend } from './supabase';
import { securityService } from './security';

export interface EnhancedWorkflowState {
  // Input
  query: string;
  medicalContext?: Partial<MedicalContext>;
  sessionId?: string;
  userId?: string;
  
  // Processing state
  enhancedQuery?: string;
  medicalAnalysis?: {
    queryType: string;
    urgencyLevel: string;
    specialties: string[];
    ageGroup?: string;
    clinicalSetting: string;
    riskFactors: string[];
  };
  
  // RAG results
  ragResult?: EnhancedRAGResult;
  relevantDocuments?: any[];
  context?: string;
  
  // AI responses
  primaryResponse?: {
    content: string;
    confidence: number;
    reasoning: string;
    usage: any;
  };
  enhancedResponse?: {
    content: string;
    improvements: string[];
    usage: any;
  };
  
  // Clinical analysis
  clinicalAssessment?: {
    diagnosis?: string[];
    recommendations: string[];
    warnings: string[];
    followUp: string[];
    evidenceLevel: string;
  };
  
  // Quality and validation
  qualityCheck?: {
    passed: boolean;
    score: number;
    issues: string[];
    recommendations: string[];
  };
  
  medicalValidation?: {
    safetyCheck: boolean;
    appropriateness: boolean;
    completeness: boolean;
    accuracy: boolean;
    warnings: string[];
  };
  
  // Final output
  finalAnswer?: string;
  confidence?: number;
  sources?: string[];
  metadata?: any;
  
  // Error handling
  error?: string;
  warnings?: string[];
  
  // Performance tracking
  processingSteps?: Array<{
    step: string;
    duration: number;
    success: boolean;
    details?: any;
  }>;
  processingTime?: number;
}

export interface EnhancedWorkflowNode {
  id: string;
  name: string;
  description: string;
  execute: (state: EnhancedWorkflowState) => Promise<Partial<EnhancedWorkflowState>>;
  retryable?: boolean;
  timeout?: number;
}

export interface EnhancedWorkflowEdge {
  from: string;
  to: string;
  condition?: (state: EnhancedWorkflowState) => boolean;
  weight?: number;
}

export class EnhancedLangGraphWorkflow {
  private nodes: Map<string, EnhancedWorkflowNode> = new Map();
  private edges: EnhancedWorkflowEdge[] = [];
  private startNodeId: string = 'security_validation';
  private maxRetries: number = 2;
  private defaultTimeout: number = 30000; // 30 seconds

  constructor() {
    this.initializeNodes();
    this.initializeEdges();
  }

  private initializeNodes() {
    // Node 1: Security and Input Validation
    this.nodes.set('security_validation', {
      id: 'security_validation',
      name: 'Security Validation',
      description: 'Validate input for security threats and PHI',
      execute: async (state: EnhancedWorkflowState) => {
        try {
          const startTime = Date.now();
          
          // Validate input for security issues
          const validation = securityService.validateMedicalInput({
            query: state.query,
            medicalContext: state.medicalContext,
          });
          
          if (!validation.isValid) {
            return {
              error: `Security validation failed: ${validation.errors.join(', ')}`,
            };
          }
          
          // Log security validation
          if (state.sessionId) {
            await securityService.createAuditLog(
              'query_security_validation',
              'medical_query',
              {
                ipAddress: 'system',
                userAgent: 'workflow',
                timestamp: new Date(),
                sessionId: state.sessionId,
                userId: state.userId,
              },
              true,
              { queryLength: state.query.length }
            );
          }
          
          return {
            processingSteps: [{
              step: 'security_validation',
              duration: Date.now() - startTime,
              success: true,
              details: { validationPassed: true }
            }]
          };
        } catch (error) {
          return {
            error: `Security validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      },
      retryable: false,
      timeout: 5000,
    });

    // Node 2: Advanced Medical Query Analysis
    this.nodes.set('medical_analysis', {
      id: 'medical_analysis',
      name: 'Medical Query Analysis',
      description: 'Analyze query for medical context, urgency, and specialties',
      execute: async (state: EnhancedWorkflowState) => {
        try {
          const startTime = Date.now();
          
          // Enhanced medical analysis using AI
          const analysis = await this.performAdvancedMedicalAnalysis(state.query, state.medicalContext);
          
          // Extract enhanced query for better retrieval
          const enhancedQuery = await this.enhanceQueryForRetrieval(state.query, analysis);
          
          return {
            medicalAnalysis: analysis,
            enhancedQuery,
            processingSteps: [
              ...(state.processingSteps || []),
              {
                step: 'medical_analysis',
                duration: Date.now() - startTime,
                success: true,
                details: { 
                  queryType: analysis.queryType,
                  urgencyLevel: analysis.urgencyLevel,
                  specialtiesCount: analysis.specialties.length
                }
              }
            ]
          };
        } catch (error) {
          return {
            error: `Medical analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      },
      retryable: true,
      timeout: 15000,
    });

    // Node 3: Enhanced Document Retrieval
    this.nodes.set('document_retrieval', {
      id: 'document_retrieval',
      name: 'Enhanced Document Retrieval',
      description: 'Retrieve relevant medical documents using advanced RAG',
      execute: async (state: EnhancedWorkflowState) => {
        try {
          const startTime = Date.now();
          
          // Build medical context from analysis
          const medicalContext: Partial<MedicalContext> = {
            ...state.medicalContext,
            queryType: state.medicalAnalysis?.queryType as any,
            urgencyLevel: state.medicalAnalysis?.urgencyLevel as any,
            medicalSpecialties: state.medicalAnalysis?.specialties,
            patientAge: state.medicalAnalysis?.ageGroup,
            clinicalSetting: state.medicalAnalysis?.clinicalSetting as any,
          };
          
          // Execute enhanced RAG pipeline
          const ragResult = await enhancedRAGPipeline.execute(
            state.enhancedQuery || state.query,
            medicalContext,
            {
              bypassCache: false,
              includeEnhancement: false, // We'll do enhancement separately
            }
          );
          
          return {
            ragResult,
            relevantDocuments: ragResult.relevantDocuments,
            context: ragResult.enrichedContext,
            processingSteps: [
              ...(state.processingSteps || []),
              {
                step: 'document_retrieval',
                duration: Date.now() - startTime,
                success: true,
                details: {
                  documentsRetrieved: ragResult.metadata.documentCount,
                  averageSimilarity: ragResult.relevantDocuments.reduce((sum, doc) => sum + (doc.similarity || 0), 0) / ragResult.relevantDocuments.length,
                  confidence: ragResult.confidence
                }
              }
            ]
          };
        } catch (error) {
          return {
            error: `Document retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      },
      retryable: true,
      timeout: 25000,
    });

    // Node 4: Primary Medical Response Generation
    this.nodes.set('primary_response', {
      id: 'primary_response',
      name: 'Primary Medical Response',
      description: 'Generate primary medical response using Mistral AI',
      execute: async (state: EnhancedWorkflowState) => {
        try {
          const startTime = Date.now();
          
          if (!state.ragResult) {
            throw new Error('No RAG result available for response generation');
          }
          
          // Generate clinical reasoning first
          const reasoning = await this.generateClinicalReasoning(
            state.query,
            state.ragResult,
            state.medicalAnalysis!
          );
          
          // Generate primary response with reasoning context
          const response = await mistralService.generateMedicalResponse({
            query: state.query,
            context: state.ragResult.enrichedContext,
            clinicalAssessment: state.ragResult.clinicalAssessment,
            sources: state.ragResult.sources.map(s => `${s.chapter}${s.section ? ` - ${s.section}` : ''}`),
          });
          
          // Calculate confidence based on multiple factors
          const confidence = this.calculateResponseConfidence(
            state.ragResult,
            response.response,
            state.medicalAnalysis!
          );
          
          return {
            primaryResponse: {
              content: response.response,
              confidence,
              reasoning,
              usage: response.usage,
            },
            processingSteps: [
              ...(state.processingSteps || []),
              {
                step: 'primary_response',
                duration: Date.now() - startTime,
                success: true,
                details: {
                  responseLength: response.response.length,
                  confidence,
                  tokensUsed: response.usage?.total_tokens || 0
                }
              }
            ]
          };
        } catch (error) {
          return {
            error: `Primary response generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      },
      retryable: true,
      timeout: 30000,
    });

    // Node 5: Enhanced Response with Gemini
    this.nodes.set('enhanced_response', {
      id: 'enhanced_response',
      name: 'Enhanced Response',
      description: 'Enhance response using Gemini AI for better cognitive processing',
      execute: async (state: EnhancedWorkflowState) => {
        try {
          const startTime = Date.now();
          
          if (!state.primaryResponse) {
            throw new Error('No primary response available for enhancement');
          }
          
          // Determine enhancement strategy based on query characteristics
          const enhancementType = this.determineEnhancementType(state.medicalAnalysis!);
          const targetAudience = this.determineTargetAudience(state.medicalAnalysis!);
          
          // Enhance with Gemini
          const enhancement = await geminiService.enhanceMedicalContent({
            originalContent: state.primaryResponse.content,
            enhancementType,
            targetAudience,
            additionalContext: `
              Medical Context: ${JSON.stringify(state.medicalAnalysis, null, 2)}
              Clinical Reasoning: ${state.primaryResponse.reasoning}
              Confidence Level: ${state.primaryResponse.confidence}
            `,
          });
          
          // Analyze improvements made
          const improvements = this.analyzeEnhancements(
            state.primaryResponse.content,
            enhancement.enhancedContent
          );
          
          return {
            enhancedResponse: {
              content: enhancement.enhancedContent,
              improvements,
              usage: enhancement.usage,
            },
            processingSteps: [
              ...(state.processingSteps || []),
              {
                step: 'enhanced_response',
                duration: Date.now() - startTime,
                success: true,
                details: {
                  enhancementType,
                  targetAudience,
                  improvementsCount: improvements.length,
                  tokensUsed: enhancement.usage?.totalTokenCount || 0
                }
              }
            ]
          };
        } catch (error) {
          console.warn('Enhancement failed, proceeding with primary response:', error);
          return {
            warnings: [
              ...(state.warnings || []),
              `Enhancement failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            ]
          };
        }
      },
      retryable: true,
      timeout: 25000,
    });

    // Node 6: Clinical Assessment and Validation
    this.nodes.set('clinical_validation', {
      id: 'clinical_validation',
      name: 'Clinical Validation',
      description: 'Comprehensive medical validation and clinical assessment',
      execute: async (state: EnhancedWorkflowState) => {
        try {
          const startTime = Date.now();
          
          const finalResponse = state.enhancedResponse?.content || state.primaryResponse?.content || '';
          
          // Perform comprehensive clinical assessment
          const clinicalAssessment = await this.performComprehensiveClinicalAssessment(
            state.query,
            finalResponse,
            state.ragResult!,
            state.medicalAnalysis!
          );
          
          // Perform medical safety validation
          const medicalValidation = await this.performMedicalSafetyValidation(
            finalResponse,
            state.medicalAnalysis!,
            clinicalAssessment
          );
          
          return {
            clinicalAssessment,
            medicalValidation,
            processingSteps: [
              ...(state.processingSteps || []),
              {
                step: 'clinical_validation',
                duration: Date.now() - startTime,
                success: true,
                details: {
                  safetyPassed: medicalValidation.safetyCheck,
                  appropriatenessPassed: medicalValidation.appropriateness,
                  warningsCount: medicalValidation.warnings.length
                }
              }
            ]
          };
        } catch (error) {
          return {
            error: `Clinical validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      },
      retryable: false,
      timeout: 20000,
    });

    // Node 7: Quality Assurance and Finalization
    this.nodes.set('quality_finalization', {
      id: 'quality_finalization',
      name: 'Quality Finalization',
      description: 'Final quality checks and response preparation',
      execute: async (state: EnhancedWorkflowState) => {
        try {
          const startTime = Date.now();
          
          const finalResponse = state.enhancedResponse?.content || state.primaryResponse?.content || '';
          
          // Comprehensive quality check
          const qualityCheck = await this.performComprehensiveQualityCheck(
            state.query,
            finalResponse,
            state.ragResult!,
            state.medicalValidation!,
            state.clinicalAssessment!
          );
          
          // Calculate final confidence score
          const finalConfidence = this.calculateFinalConfidence(
            state.primaryResponse?.confidence || 0,
            qualityCheck.score,
            state.medicalValidation!,
            state.ragResult!.confidence
          );
          
          // Prepare final answer with all enhancements
          const finalAnswer = this.prepareFinalAnswer(
            finalResponse,
            state.clinicalAssessment!,
            state.ragResult!.sources,
            state.medicalValidation!.warnings
          );
          
          // Extract sources
          const sources = state.ragResult!.sources.map(s => `${s.chapter}${s.section ? ` - ${s.section}` : ''}`);
          
          return {
            qualityCheck,
            finalAnswer,
            confidence: finalConfidence,
            sources,
            processingSteps: [
              ...(state.processingSteps || []),
              {
                step: 'quality_finalization',
                duration: Date.now() - startTime,
                success: true,
                details: {
                  qualityScore: qualityCheck.score,
                  finalConfidence,
                  sourcesCount: sources.length
                }
              }
            ]
          };
        } catch (error) {
          return {
            error: `Quality finalization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      },
      retryable: false,
      timeout: 15000,
    });
  }

  private initializeEdges() {
    this.edges = [
      { from: 'security_validation', to: 'query_analysis' },
      { from: 'query_analysis', to: 'document_retrieval' },
      { from: 'document_retrieval', to: 'clinical_assessment' },
      { from: 'clinical_assessment', to: 'response_generation' },
      { from: 'response_generation', to: 'quality_check' },
    ];
  }

  async execute(query: string): Promise<WorkflowState> {
    const state: WorkflowState = { query };
    const visitedNodes = new Set<string>();
    
    try {
      let currentNodeId = this.startNodeId;
      
      while (currentNodeId) {
        if (visitedNodes.has(currentNodeId)) {
          throw new Error(`Cycle detected in workflow at node: ${currentNodeId}`);
        }
        
        visitedNodes.add(currentNodeId);
        const node = this.nodes.get(currentNodeId);
        
        if (!node) {
          throw new Error(`Node not found: ${currentNodeId}`);
        }
        
        console.log(`Executing node: ${node.name}`);
        const result = await node.execute(state);
        
        // Update state with node results
        Object.assign(state, result);
        
        // Check for errors
        if (state.error) {
          throw new Error(state.error);
        }
        
        // Find next node
        const nextEdge = this.edges.find(edge => edge.from === currentNodeId);
        currentNodeId = nextEdge?.to || '';
      }
      
      return state;
    } catch (error) {
      return {
        ...state,
        error: `Workflow execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  // Helper methods for workflow nodes
  private extractMedicalKeywords(query: string): string[] {
    const medicalTerms = [
      'asthma', 'diabetes', 'fever', 'vaccine', 'antibiotic', 'diagnosis',
      'treatment', 'symptoms', 'pediatric', 'infant', 'child', 'adolescent',
      'disease', 'disorder', 'syndrome', 'infection', 'inflammation',
      'medication', 'dosage', 'therapy', 'prevention', 'prognosis'
    ];
    
    return medicalTerms.filter(term => 
      query.toLowerCase().includes(term.toLowerCase())
    );
  }

  private classifyQueryType(query: string): 'diagnosis' | 'treatment' | 'information' | 'emergency' {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('emergency') || lowerQuery.includes('urgent') || lowerQuery.includes('critical')) {
      return 'emergency';
    }
    
    if (lowerQuery.includes('diagnos') || lowerQuery.includes('what is') || lowerQuery.includes('symptoms')) {
      return 'diagnosis';
    }
    
    if (lowerQuery.includes('treat') || lowerQuery.includes('therapy') || lowerQuery.includes('medication')) {
      return 'treatment';
    }
    
    return 'information';
  }

  private assessUrgency(query: string): 'low' | 'medium' | 'high' | 'critical' {
    const lowerQuery = query.toLowerCase();
    const urgentKeywords = ['emergency', 'urgent', 'critical', 'severe', 'life-threatening'];
    const highKeywords = ['fever', 'pain', 'breathing', 'bleeding'];
    
    if (urgentKeywords.some(keyword => lowerQuery.includes(keyword))) {
      return 'critical';
    }
    
    if (highKeywords.some(keyword => lowerQuery.includes(keyword))) {
      return 'high';
    }
    
    if (lowerQuery.includes('help') || lowerQuery.includes('advice')) {
      return 'medium';
    }
    
    return 'low';
  }

  private enhanceQuery(query: string, analysis: {
    keywords: string[];
    type: string;
    urgency: string;
  }): string {
    let enhanced = query;
    
    // Add medical context based on keywords
    if (analysis.keywords.length > 0) {
      enhanced += ` pediatric ${analysis.keywords.join(' ')}`;
    }
    
    // Add urgency context
    if (analysis.urgency === 'critical' || analysis.urgency === 'high') {
      enhanced += ' urgent medical attention';
    }
    
    return enhanced;
  }

  private async performClinicalAssessment(
    query: string,
    context: string,
    documents: any[]
  ): Promise<{ assessment: string; confidence: number }> {
    // This is a placeholder for clinical assessment
    // In a real implementation, this would use medical AI models
    
    const relevantKeywords = this.extractMedicalKeywords(query);
    const documentCount = documents.length;
    const contextLength = context.length;
    
    // Simple confidence calculation based on available information
    let confidence = 0.5;
    
    if (documentCount > 0) confidence += 0.2;
    if (contextLength > 1000) confidence += 0.1;
    if (relevantKeywords.length > 2) confidence += 0.1;
    
    confidence = Math.min(confidence, 0.95);
    
    const assessment = `
Clinical Assessment:
- Query Type: ${this.classifyQueryType(query)}
- Urgency Level: ${this.assessUrgency(query)}
- Relevant Medical Keywords: ${relevantKeywords.join(', ')}
- Information Sources: ${documentCount} documents from Nelson Textbook
- Confidence Score: ${(confidence * 100).toFixed(1)}%

Recommendation: ${confidence > 0.7 ? 'Sufficient information available for reliable response' : 'Limited information - response may require additional verification'}
    `.trim();
    
    return { assessment, confidence };
  }

  private async generateFinalResponse(params: {
    query: string;
    context: string;
    clinicalAssessment: string;
    confidence: number;
    sources: string[];
  }): Promise<string> {
    // This is a placeholder for response generation
    // In the next step, we'll integrate with Mistral API
    
    const { query, context, clinicalAssessment, confidence, sources } = params;
    
    let response = `Based on the Nelson Textbook of Pediatrics, here's the information regarding your query about "${query}":\n\n`;
    
    if (confidence > 0.7) {
      response += `I found relevant information from ${sources.length} sources in the Nelson Textbook. `;
      response += `The clinical assessment indicates ${confidence > 0.8 ? 'high' : 'moderate'} confidence in the available information.\n\n`;
    } else {
      response += `I found limited information from ${sources.length} sources. The clinical assessment suggests low confidence, `;
      response += `so I recommend consulting additional medical resources or a healthcare professional.\n\n`;
    }
    
    response += `Clinical Assessment:\n${clinicalAssessment}\n\n`;
    response += `Sources: ${sources.join(', ')}\n\n`;
    response += `Note: This response will be enhanced with Mistral API integration for more comprehensive medical information.`;
    
    return response;
  }

  private async performQualityCheck(params: {
    query: string;
    answer: string;
    context: string;
    confidence: number;
  }): Promise<{ passed: boolean; confidence: number; reason?: string }> {
    const { query, answer, context, confidence } = params;
    
    // Basic quality checks
    const checks = [
      {
        condition: answer.length > 100,
        reason: 'Response too short',
      },
      {
        condition: confidence > 0.3,
        reason: 'Confidence too low',
      },
      {
        condition: answer.toLowerCase().includes('nelson'),
        reason: 'Missing source attribution',
      },
      {
        condition: !answer.toLowerCase().includes('error'),
        reason: 'Response contains error indicators',
      },
    ];
    
    const failedChecks = checks.filter(check => !check.condition);
    
    if (failedChecks.length > 0) {
      return {
        passed: false,
        confidence: Math.max(0, confidence - 0.3),
        reason: failedChecks.map(check => check.reason).join(', '),
      };
    }
    
    return {
      passed: true,
      confidence: Math.min(1, confidence + 0.1),
    };
  }

  async testWorkflow(): Promise<{ success: boolean; message: string; result?: WorkflowState }> {
    try {
      const testQuery = "What are the treatment options for pediatric asthma?";
      const result = await this.execute(testQuery);

      if (result.error) {
        return {
          success: false,
          message: `Workflow test failed: ${result.error}`,
        };
      }

      return {
        success: true,
        message: `Workflow test completed successfully. Final answer length: ${result.finalAnswer?.length || 0} characters.`,
        result,
      };
    } catch (error) {
      return {
        success: false,
        message: `Workflow test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}

// Export singleton instance
export const langGraphWorkflow = new LangGraphWorkflow();
