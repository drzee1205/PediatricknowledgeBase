// Mistral API Service for NelsonGPT

export interface MistralMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface MistralChatRequest {
  model: string;
  messages: MistralMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
  stop?: string[];
}

export interface MistralChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface MistralConfig {
  apiKey: string;
  baseUrl: string;
  defaultModel: string;
  maxTokens: number;
  temperature: number;
}

export class MistralService {
  private config: MistralConfig;
  private retryAttempts: number = 3;
  private retryDelay: number = 1000;

  constructor(config?: Partial<MistralConfig>) {
    this.config = {
      apiKey: config?.apiKey || process.env.MISTRAL_API_KEY || '',
      baseUrl: config?.baseUrl || 'https://api.mistral.ai/v1',
      defaultModel: config?.defaultModel || 'mistral-medium',
      maxTokens: config?.maxTokens || 4000,
      temperature: config?.temperature || 0.7,
    };

    if (!this.config.apiKey) {
      throw new Error('Mistral API key is required');
    }
  }

  /**
   * Make a request to the Mistral API
   */
  private async makeRequest(endpoint: string, options: RequestInit): Promise<any> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
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
          throw new Error(`Mistral API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < this.retryAttempts) {
          console.log(`Retry attempt ${attempt + 1} after ${this.retryDelay}ms...`);
          await this.sleep(this.retryDelay * attempt);
        }
      }
    }

    throw lastError || new Error('Unknown error occurred');
  }

  /**
   * Generate a chat completion
   */
  async chatCompletion(request: MistralChatRequest): Promise<MistralChatResponse> {
    try {
      const enhancedRequest: MistralChatRequest = {
        model: request.model || this.config.defaultModel,
        messages: request.messages,
        temperature: request.temperature ?? this.config.temperature,
        max_tokens: request.max_tokens ?? this.config.maxTokens,
        top_p: request.top_p ?? 1,
        stream: request.stream ?? false,
        stop: request.stop,
      };

      const response = await this.makeRequest('/chat/completions', {
        method: 'POST',
        body: JSON.stringify(enhancedRequest),
      });

      return response;
    } catch (error) {
      console.error('Error in Mistral chat completion:', error);
      throw new Error(`Failed to generate chat completion: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a medical response using Nelson Textbook context
   */
  async generateMedicalResponse(params: {
    query: string;
    context: string;
    clinicalAssessment?: string;
    sources: string[];
    chatHistory?: MistralMessage[];
  }): Promise<{ response: string; usage: any }> {
    try {
      const { query, context, clinicalAssessment, sources, chatHistory = [] } = params;

      // Build system prompt for pediatric medical assistant
      const systemPrompt = this.buildSystemPrompt();

      // Build user prompt with context
      const userPrompt = this.buildUserPrompt({
        query,
        context,
        clinicalAssessment,
        sources,
      });

      // Prepare messages
      const messages: MistralMessage[] = [
        { role: 'system', content: systemPrompt },
        ...chatHistory.slice(-6), // Include last 6 messages for context
        { role: 'user', content: userPrompt },
      ];

      // Make API request
      const response = await this.chatCompletion({
        model: this.config.defaultModel,
        messages,
        temperature: 0.3, // Lower temperature for more factual responses
        max_tokens: this.config.maxTokens,
      });

      return {
        response: response.choices[0]?.message?.content || 'No response generated',
        usage: response.usage,
      };
    } catch (error) {
      console.error('Error generating medical response:', error);
      throw new Error(`Failed to generate medical response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build system prompt for pediatric medical assistant
   */
  private buildSystemPrompt(): string {
    return `You are NelsonGPT, an AI-powered pediatric medical assistant based on the Nelson Textbook of Pediatrics. Your role is to provide evidence-based medical information to pediatric clinicians, residents, and medical students.

Guidelines:
1. Always base your responses on the provided context from the Nelson Textbook of Pediatrics
2. Be accurate, evidence-based, and cite specific chapters and sections when possible
3. Use professional medical terminology but explain complex concepts clearly
4. Include important clinical considerations, contraindications, and precautions
5. For medication information, include dosing guidelines, side effects, and monitoring requirements
6. Acknowledge limitations in the provided information and suggest additional resources when appropriate
7. Never provide definitive diagnoses or replace professional medical judgment
8. Include appropriate disclaimers about consulting healthcare professionals
9. Use structured formatting with clear headings and bullet points for complex information
10. Prioritize patient safety and evidence-based practices

Your tone should be professional, authoritative yet approachable, and focused on providing practical clinical information.`;
  }

  /**
   * Build user prompt with context and query
   */
  private buildUserPrompt(params: {
    query: string;
    context: string;
    clinicalAssessment?: string;
    sources: string[];
  }): string {
    const { query, context, clinicalAssessment, sources } = params;

    let prompt = `Medical Query: ${query}

Context from Nelson Textbook of Pediatrics:
${context}

Sources: ${sources.join(', ')}`;

    if (clinicalAssessment) {
      prompt += `

Clinical Assessment:
${clinicalAssessment}`;
    }

    prompt += `

Please provide a comprehensive, evidence-based response that:
1. Directly addresses the medical query
2. Cites specific information from the Nelson Textbook sources
3. Includes relevant clinical considerations and precautions
4. Provides practical guidance for pediatric clinicians
5. Acknowledges any limitations in the available information

Response:`;

    return prompt;
  }

  /**
   * Generate a differential diagnosis suggestion
   */
  async generateDifferentialDiagnosis(params: {
    symptoms: string[];
    patientAge: string;
    patientGender?: string;
    additionalContext?: string;
  }): Promise<{ response: string; usage: any }> {
    try {
      const { symptoms, patientAge, patientGender, additionalContext } = params;

      const systemPrompt = `You are a pediatric medical specialist. Generate a differential diagnosis based on the provided symptoms and patient information. Prioritize common conditions in pediatrics and consider age-appropriate diagnoses.`;

      const userPrompt = `Patient Information:
- Age: ${patientAge}
- Gender: ${patientGender || 'Not specified'}
- Symptoms: ${symptoms.join(', ')}
${additionalContext ? `Additional Context: ${additionalContext}` : ''}

Please provide a structured differential diagnosis with:
1. Most likely diagnoses (with brief reasoning)
2. Important conditions to rule out
3. Recommended initial diagnostic workup
4. Red flag symptoms that require urgent attention

Differential Diagnosis:`;

      const response = await this.chatCompletion({
        model: this.config.defaultModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 2000,
      });

      return {
        response: response.choices[0]?.message?.content || 'No differential diagnosis generated',
        usage: response.usage,
      };
    } catch (error) {
      console.error('Error generating differential diagnosis:', error);
      throw new Error(`Failed to generate differential diagnosis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate treatment recommendations
   */
  async generateTreatmentRecommendations(params: {
    condition: string;
    patientAge: string;
    patientWeight?: string;
    allergies?: string[];
    currentMedications?: string[];
    severity?: 'mild' | 'moderate' | 'severe';
  }): Promise<{ response: string; usage: any }> {
    try {
      const { condition, patientAge, patientWeight, allergies, currentMedications, severity } = params;

      const systemPrompt = `You are a pediatric pharmacology and treatment specialist. Provide evidence-based treatment recommendations following pediatric guidelines and considering safety factors.`;

      const userPrompt = `Clinical Scenario:
- Condition: ${condition}
- Patient Age: ${patientAge}
- Patient Weight: ${patientWeight || 'Not specified'}
- Allergies: ${allergies?.join(', ') || 'None reported'}
- Current Medications: ${currentMedications?.join(', ') || 'None'}
- Severity: ${severity || 'Not specified'}

Please provide comprehensive treatment recommendations including:
1. First-line treatment options with dosing
2. Alternative treatments if first-line contraindicated
3. Monitoring requirements and follow-up
4. Potential side effects and management
5. Patient education points
6. When to seek urgent care

Treatment Recommendations:`;

      const response = await this.chatCompletion({
        model: this.config.defaultModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2500,
      });

      return {
        response: response.choices[0]?.message?.content || 'No treatment recommendations generated',
        usage: response.usage,
      };
    } catch (error) {
      console.error('Error generating treatment recommendations:', error);
      throw new Error(`Failed to generate treatment recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Test the Mistral service
   */
  async testService(): Promise<{ success: boolean; message: string; response?: string }> {
    try {
      const testResponse = await this.chatCompletion({
        model: this.config.defaultModel,
        messages: [
          { role: 'user', content: 'Hello, I am testing the Mistral API connection for NelsonGPT.' },
        ],
        max_tokens: 100,
      });

      return {
        success: true,
        message: 'Mistral API connection successful',
        response: testResponse.choices[0]?.message?.content,
      };
    } catch (error) {
      return {
        success: false,
        message: `Mistral API test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
export const mistralService = new MistralService();