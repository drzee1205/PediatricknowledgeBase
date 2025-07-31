// Gemini API Service for Enhanced Cognitive Capabilities

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: Array<{
    text?: string;
    inlineData?: {
      mimeType: string;
      data: string;
    };
  }>;
}

export interface GeminiGenerateContentRequest {
  contents: GeminiMessage[];
  generationConfig?: {
    temperature?: number;
    topK?: number;
    topP?: number;
    maxOutputTokens?: number;
    stopSequences?: string[];
  };
  safetySettings?: Array<{
    category: string;
    threshold: string;
  }>;
}

export interface GeminiGenerateContentResponse {
  candidates: Array<{
    content: GeminiMessage;
    finishReason: string;
    safetyRatings?: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export interface GeminiConfig {
  apiKey: string;
  baseUrl: string;
  defaultModel: string;
  maxTokens: number;
  temperature: number;
}

export class GeminiService {
  private config: GeminiConfig;
  private retryAttempts: number = 3;
  private retryDelay: number = 1000;

  constructor(config?: Partial<GeminiConfig>) {
    this.config = {
      apiKey: config?.apiKey || process.env.GEMINI_API_KEY || '',
      baseUrl: config?.baseUrl || 'https://generativelanguage.googleapis.com/v1beta',
      defaultModel: config?.defaultModel || 'gemini-pro',
      maxTokens: config?.maxTokens || 4000,
      temperature: config?.temperature || 0.7,
    };

    if (!this.config.apiKey) {
      console.warn('Gemini API key not provided. Gemini service will be disabled.');
    }
  }

  /**
   * Make a request to the Gemini API
   */
  private async makeRequest(endpoint: string, options: RequestInit): Promise<any> {
    const url = `${this.config.baseUrl}${endpoint}?key=${this.config.apiKey}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await fetch(url, config);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < this.retryAttempts) {
          console.log(`Gemini retry attempt ${attempt + 1} after ${this.retryDelay}ms...`);
          await this.sleep(this.retryDelay * attempt);
        }
      }
    }

    throw lastError || new Error('Unknown error occurred in Gemini API');
  }

  /**
   * Generate content using Gemini
   */
  async generateContent(request: GeminiGenerateContentRequest): Promise<GeminiGenerateContentResponse> {
    if (!this.config.apiKey) {
      throw new Error('Gemini API key is required');
    }

    try {
      const enhancedRequest: GeminiGenerateContentRequest = {
        contents: request.contents,
        generationConfig: {
          temperature: request.generationConfig?.temperature ?? this.config.temperature,
          topK: request.generationConfig?.topK ?? 40,
          topP: request.generationConfig?.topP ?? 0.95,
          maxOutputTokens: request.generationConfig?.maxOutputTokens ?? this.config.maxTokens,
          stopSequences: request.generationConfig?.stopSequences,
        },
        safetySettings: request.safetySettings || [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_NONE'
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_NONE'
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_NONE'
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_NONE'
          }
        ],
      };

      const response = await this.makeRequest(`/models/${this.config.defaultModel}:generateContent`, {
        method: 'POST',
        body: JSON.stringify(enhancedRequest),
      });

      return response;
    } catch (error) {
      console.error('Error in Gemini content generation:', error);
      throw new Error(`Failed to generate content with Gemini: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Enhance medical content with Gemini's multimodal capabilities
   */
  async enhanceMedicalContent(params: {
    originalContent: string;
    enhancementType: 'summarization' | 'simplification' | 'expansion' | 'clinical_reasoning';
    targetAudience?: 'clinicians' | 'students' | 'patients';
    additionalContext?: string;
  }): Promise<{ enhancedContent: string; usage: any }> {
    try {
      const { originalContent, enhancementType, targetAudience = 'clinicians', additionalContext } = params;

      const systemPrompt = this.buildEnhancementSystemPrompt(enhancementType, targetAudience);
      const userPrompt = this.buildEnhancementUserPrompt({
        originalContent,
        enhancementType,
        additionalContext,
      });

      const request: GeminiGenerateContentRequest = {
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 3000,
        },
      };

      const response = await this.generateContent(request);

      const enhancedContent = response.candidates[0]?.content?.parts[0]?.text || 'No enhancement generated';

      return {
        enhancedContent,
        usage: response.usageMetadata,
      };
    } catch (error) {
      console.error('Error enhancing medical content:', error);
      throw new Error(`Failed to enhance medical content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate clinical reasoning analysis
   */
  async generateClinicalReasoning(params: {
    patientCase: string;
    availableData: {
      symptoms: string[];
      vitals: Record<string, any>;
      labResults?: Record<string, any>;
      imagingResults?: Record<string, any>;
    };
    clinicalQuestion: string;
  }): Promise<{ reasoning: string; usage: any }> {
    try {
      const { patientCase, availableData, clinicalQuestion } = params;

      const systemPrompt = `You are an expert pediatric clinician with advanced clinical reasoning skills. Analyze the provided patient case and data to generate a comprehensive clinical reasoning process that includes differential diagnosis, diagnostic reasoning, and management considerations.`;

      const userPrompt = `Patient Case: ${patientCase}

Available Data:
- Symptoms: ${availableData.symptoms.join(', ')}
- Vitals: ${JSON.stringify(availableData.vitals, null, 2)}
${availableData.labResults ? `- Lab Results: ${JSON.stringify(availableData.labResults, null, 2)}` : ''}
${availableData.imagingResults ? `- Imaging Results: ${JSON.stringify(availableData.imagingResults, null, 2)}` : ''}

Clinical Question: ${clinicalQuestion}

Please provide a structured clinical reasoning analysis including:
1. Initial clinical impression and key findings
2. Differential diagnosis with likelihood rankings
3. Pathophysiological reasoning
4. Diagnostic workup recommendations
5. Initial management plan
6. Red flags and monitoring requirements
7. Follow-up considerations

Clinical Reasoning Analysis:`;

      const request: GeminiGenerateContentRequest = {
        contents: [
          {
            role: 'user',
            parts: [{ text: userPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 3500,
        },
      };

      const response = await this.generateContent(request);

      const reasoning = response.candidates[0]?.content?.parts[0]?.text || 'No clinical reasoning generated';

      return {
        reasoning,
        usage: response.usageMetadata,
      };
    } catch (error) {
      console.error('Error generating clinical reasoning:', error);
      throw new Error(`Failed to generate clinical reasoning: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate medical education content
   */
  async generateMedicalEducation(params: {
    topic: string;
    difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
    contentType: 'overview' | 'deep_dive' | 'case_study' | 'q_and_a';
    targetAudience: 'medical_students' | 'residents' | 'fellows' | 'attendings';
  }): Promise<{ educationalContent: string; usage: any }> {
    try {
      const { topic, difficultyLevel, contentType, targetAudience } = params;

      const systemPrompt = `You are a medical educator specializing in pediatrics. Create engaging, accurate, and educational content tailored to the specified audience and difficulty level.`;

      const userPrompt = `Educational Content Request:
- Topic: ${topic}
- Difficulty Level: ${difficultyLevel}
- Content Type: ${contentType}
- Target Audience: ${targetAudience}

Please create comprehensive educational content that:
1. Is appropriate for the specified difficulty level and audience
2. Includes key learning objectives
3. Presents information in a clear, structured manner
4. Includes relevant clinical correlations
5. Provides practical takeaways
6. Uses appropriate medical terminology with explanations when needed

Educational Content:`;

      const request: GeminiGenerateContentRequest = {
        contents: [
          {
            role: 'user',
            parts: [{ text: userPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 4000,
        },
      };

      const response = await this.generateContent(request);

      const educationalContent = response.candidates[0]?.content?.parts[0]?.text || 'No educational content generated';

      return {
        educationalContent,
        usage: response.usageMetadata,
      };
    } catch (error) {
      console.error('Error generating medical education:', error);
      throw new Error(`Failed to generate medical education: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze medical images (if available)
   */
  async analyzeMedicalImage(params: {
    imageData: string; // base64 encoded image
    mimeType: string;
    clinicalContext: string;
    question: string;
  }): Promise<{ analysis: string; usage: any }> {
    try {
      const { imageData, mimeType, clinicalContext, question } = params;

      const systemPrompt = `You are a pediatric radiologist and clinical imaging specialist. Analyze the provided medical image in the context of the clinical information and answer the specific question.`;

      const userPrompt = `Clinical Context: ${clinicalContext}

Question: ${question}

Please analyze the provided medical image and provide:
1. Description of key findings
2. Clinical interpretation
3. Differential diagnosis considerations
4. Recommended follow-up actions
5. Important limitations or caveats

Image Analysis:`;

      const request: GeminiGenerateContentRequest = {
        contents: [
          {
            role: 'user',
            parts: [
              { text: `${systemPrompt}\n\n${userPrompt}` },
              {
                inlineData: {
                  mimeType,
                  data: imageData,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 3000,
        },
      };

      const response = await this.generateContent(request);

      const analysis = response.candidates[0]?.content?.parts[0]?.text || 'No image analysis generated';

      return {
        analysis,
        usage: response.usageMetadata,
      };
    } catch (error) {
      console.error('Error analyzing medical image:', error);
      throw new Error(`Failed to analyze medical image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build system prompt for content enhancement
   */
  private buildEnhancementSystemPrompt(enhancementType: string, targetAudience: string): string {
    const basePrompt = `You are a medical content enhancement specialist with expertise in pediatric medicine. Your task is to enhance medical content to make it more effective for the target audience.`;

    switch (enhancementType) {
      case 'summarization':
        return `${basePrompt} Create a concise, comprehensive summary that captures all key medical information while maintaining accuracy and clinical relevance.`;
      
      case 'simplification':
        return `${basePrompt} Simplify complex medical concepts while preserving accuracy. Use clear language and appropriate analogies for the target audience.`;
      
      case 'expansion':
        return `${basePrompt} Expand the content with additional relevant details, context, and clinical considerations to provide a more comprehensive understanding.`;
      
      case 'clinical_reasoning':
        return `${basePrompt} Enhance the content with structured clinical reasoning, including pathophysiology, diagnostic considerations, and evidence-based management approaches.`;
      
      default:
        return basePrompt;
    }
  }

  /**
   * Build user prompt for content enhancement
   */
  private buildEnhancementUserPrompt(params: {
    originalContent: string;
    enhancementType: string;
    additionalContext?: string;
  }): string {
    const { originalContent, enhancementType, additionalContext } = params;

    let prompt = `Original Content:
${originalContent}

Enhancement Type: ${enhancementType}`;

    if (additionalContext) {
      prompt += `

Additional Context:
${additionalContext}`;
    }

    prompt += `

Please provide the enhanced content while maintaining medical accuracy and relevance to pediatric practice.`;

    return prompt;
  }

  /**
   * Test the Gemini service
   */
  async testService(): Promise<{ success: boolean; message: string; response?: string }> {
    if (!this.config.apiKey) {
      return {
        success: false,
        message: 'Gemini API key not provided',
      };
    }

    try {
      const testResponse = await this.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Hello, I am testing the Gemini API connection for NelsonGPT.' }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 100,
        },
      });

      return {
        success: true,
        message: 'Gemini API connection successful',
        response: testResponse.candidates[0]?.content?.parts[0]?.text,
      };
    } catch (error) {
      return {
        success: false,
        message: `Gemini API test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Utility function for sleep/delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const geminiService = new GeminiService();