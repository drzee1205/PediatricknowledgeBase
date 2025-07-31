import { ragPipeline, RAGResult } from './rag-pipeline';
import { embeddingService } from './embeddings';
import { supabaseServiceBackend } from './supabase';

export interface WorkflowState {
  query: string;
  context?: string;
  relevantDocuments?: any[];
  ragResult?: RAGResult;
  enhancedQuery?: string;
  clinicalAssessment?: string;
  finalAnswer?: string;
  confidence?: number;
  sources?: string[];
  processingTime?: number;
  error?: string;
}

export interface WorkflowNode {
  id: string;
  name: string;
  execute: (state: WorkflowState) => Promise<Partial<WorkflowState>>;
}

export interface WorkflowEdge {
  from: string;
  to: string;
  condition?: (state: WorkflowState) => boolean;
}

export class LangGraphWorkflow {
  private nodes: Map<string, WorkflowNode> = new Map();
  private edges: WorkflowEdge[] = [];
  private startNodeId: string = 'query_analysis';

  constructor() {
    this.initializeNodes();
    this.initializeEdges();
  }

  private initializeNodes() {
    // Node 1: Query Analysis
    this.nodes.set('query_analysis', {
      id: 'query_analysis',
      name: 'Query Analysis',
      execute: async (state: WorkflowState) => {
        try {
          const startTime = Date.now();
          
          // Analyze query for medical context and intent
          const medicalKeywords = this.extractMedicalKeywords(state.query);
          const queryType = this.classifyQueryType(state.query);
          const urgency = this.assessUrgency(state.query);
          
          // Enhance query based on analysis
          const enhancedQuery = this.enhanceQuery(state.query, {
            keywords: medicalKeywords,
            type: queryType,
            urgency,
          });

          return {
            enhancedQuery,
            processingTime: Date.now() - startTime,
          };
        } catch (error) {
          return {
            error: `Query analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      },
    });

    // Node 2: Document Retrieval
    this.nodes.set('document_retrieval', {
      id: 'document_retrieval',
      name: 'Document Retrieval',
      execute: async (state: WorkflowState) => {
        try {
          const startTime = Date.now();
          
          // Use enhanced query for better retrieval
          const queryToUse = state.enhancedQuery || state.query;
          const ragResult = await ragPipeline.execute(queryToUse);

          return {
            ragResult,
            relevantDocuments: ragResult.relevantDocuments,
            context: ragResult.context,
            sources: ragResult.sources,
            processingTime: Date.now() - startTime,
          };
        } catch (error) {
          return {
            error: `Document retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      },
    });

    // Node 3: Clinical Assessment
    this.nodes.set('clinical_assessment', {
      id: 'clinical_assessment',
      name: 'Clinical Assessment',
      execute: async (state: WorkflowState) => {
        try {
          const startTime = Date.now();
          
          // Perform clinical assessment based on retrieved documents
          const assessment = await this.performClinicalAssessment(
            state.query,
            state.context || '',
            state.relevantDocuments || []
          );

          return {
            clinicalAssessment: assessment.assessment,
            confidence: assessment.confidence,
            processingTime: Date.now() - startTime,
          };
        } catch (error) {
          return {
            error: `Clinical assessment failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      },
    });

    // Node 4: Response Generation
    this.nodes.set('response_generation', {
      id: 'response_generation',
      name: 'Response Generation',
      execute: async (state: WorkflowState) => {
        try {
          const startTime = Date.now();
          
          // Generate final response using all available information
          const finalAnswer = await this.generateFinalResponse({
            query: state.query,
            context: state.context || '',
            clinicalAssessment: state.clinicalAssessment || '',
            confidence: state.confidence || 0,
            sources: state.sources || [],
          });

          return {
            finalAnswer,
            processingTime: Date.now() - startTime,
          };
        } catch (error) {
          return {
            error: `Response generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      },
    });

    // Node 5: Quality Check
    this.nodes.set('quality_check', {
      id: 'quality_check',
      name: 'Quality Check',
      execute: async (state: WorkflowState) => {
        try {
          const startTime = Date.now();
          
          // Perform quality checks on the generated response
          const qualityResult = await this.performQualityCheck({
            query: state.query,
            answer: state.finalAnswer || '',
            context: state.context || '',
            confidence: state.confidence || 0,
          });

          if (!qualityResult.passed) {
            // If quality check fails, we might want to retry or adjust
            return {
              error: `Quality check failed: ${qualityResult.reason}`,
              confidence: Math.max(0, (state.confidence || 0) - 0.2),
            };
          }

          return {
            confidence: qualityResult.confidence,
            processingTime: Date.now() - startTime,
          };
        } catch (error) {
          return {
            error: `Quality check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      },
    });
  }

  private initializeEdges() {
    this.edges = [
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