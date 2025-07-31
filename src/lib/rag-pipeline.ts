// Enhanced RAG Pipeline for NelsonGPT with Advanced Medical Context
import { embeddingService } from './embeddings';
import { supabaseServiceBackend } from './supabase';
import { vectorDatabaseService, VectorSearchOptions } from './vector-database';
import { mistralService } from './mistral-service';
import { geminiService } from './gemini-service';
import { securityService } from './security';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';

export interface EnhancedRAGConfig {
  chunkSize: number;
  chunkOverlap: number;
  topK: number;
  similarityThreshold: number;
  maxTokens: number;
  enableReranking: boolean;
  enableMedicalFiltering: boolean;
  enableContextEnrichment: boolean;
  cacheResults: boolean;
}

export interface MedicalContext {
  patientAge?: string;
  urgencyLevel?: 'low' | 'medium' | 'high' | 'critical';
  medicalSpecialties?: string[];
  clinicalSetting?: 'primary_care' | 'emergency' | 'specialty' | 'inpatient';
  evidenceLevel?: 'high' | 'medium' | 'low';
  queryType?: 'diagnosis' | 'treatment' | 'information' | 'emergency' | 'education';
}

export interface EnhancedDocumentChunk {
  id: string;
  content: string;
  metadata: {
    chapter: string;
    section?: string;
    title?: string;
    source: string;
    page?: number;
    medical_specialties?: string[];
    age_groups?: string[];
    urgency_level?: string;
    evidence_level?: string;
    last_reviewed?: string;
    chunk_index?: number;
    total_chunks?: number;
    clinical_relevance_score?: number;
  };
  embedding?: number[];
  similarity?: number;
  relevanceScore?: number;
}

export interface EnhancedRAGResult {
  query: string;
  medicalContext: MedicalContext;
  relevantDocuments: EnhancedDocumentChunk[];
  enrichedContext: string;
  primaryResponse: string;
  enhancedResponse?: string;
  clinicalAssessment?: string;
  sources: Array<{
    chapter: string;
    section?: string;
    title?: string;
    relevanceScore: number;
    evidenceLevel?: string;
  }>;
  confidence: number;
  processingTime: number;
  metadata: {
    documentCount: number;
    totalTokens: number;
    similarityScores: number[];
    searchStrategy: string;
    medicalValidation: {
      passed: boolean;
      warnings: string[];
      recommendations: string[];
    };
    aiUsage: {
      mistral?: any;
      gemini?: any;
      embeddings: any;
    };
  };
}

export class EnhancedRAGPipeline {
  private config: EnhancedRAGConfig;
  private responseCache = new Map<string, { result: EnhancedRAGResult; timestamp: number }>();
  private cacheTimeout = 10 * 60 * 1000; // 10 minutes

  constructor(config: Partial<EnhancedRAGConfig> = {}) {
    this.config = {
      chunkSize: config.chunkSize || 1000,
      chunkOverlap: config.chunkOverlap || 200,
      topK: config.topK || 8,
      similarityThreshold: config.similarityThreshold || 0.75,
      maxTokens: config.maxTokens || 4000,
      enableReranking: config.enableReranking ?? true,
      enableMedicalFiltering: config.enableMedicalFiltering ?? true,
      enableContextEnrichment: config.enableContextEnrichment ?? true,
      cacheResults: config.cacheResults ?? true,
    };
  }

  /**
   * Execute the enhanced RAG pipeline with medical context awareness
   */
  async execute(
    query: string,
    medicalContext?: Partial<MedicalContext>,
    options?: {
      bypassCache?: boolean;
      includeEnhancement?: boolean;
      maxRetries?: number;
    }
  ): Promise<EnhancedRAGResult> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(query, medicalContext);
    
    try {
      // Check cache if enabled
      if (this.config.cacheResults && !options?.bypassCache) {
        const cached = this.getCachedResult(cacheKey);
        if (cached) {
          return {
            ...cached,
            processingTime: Date.now() - startTime,
          };
        }
      }

      // Step 1: Analyze and enhance the medical query
      const enhancedMedicalContext = await this.analyzeMedicalQuery(query, medicalContext);
      
      // Step 2: Retrieve relevant documents with medical filtering
      const retrievalResult = await this.retrieveRelevantDocuments(
        query,
        enhancedMedicalContext
      );

      // Step 3: Enrich context with medical knowledge
      const enrichedContext = this.config.enableContextEnrichment
        ? await this.enrichMedicalContext(retrievalResult.documents, enhancedMedicalContext)
        : this.buildBasicContext(retrievalResult.documents);

      // Step 4: Generate primary response using Mistral
      const primaryResponse = await this.generatePrimaryResponse(
        query,
        enrichedContext,
        enhancedMedicalContext,
        retrievalResult.documents
      );

      // Step 5: Enhance response with Gemini (if requested)
      let enhancedResponse: string | undefined;
      let geminiUsage: any;
      
      if (options?.includeEnhancement !== false) {
        try {
          const geminiResult = await this.enhanceWithGemini(
            query,
            primaryResponse.response,
            enhancedMedicalContext
          );
          enhancedResponse = geminiResult.enhancedContent;
          geminiUsage = geminiResult.usage;
        } catch (error) {
          console.warn('Gemini enhancement failed, using primary response:', error);
        }
      }

      // Step 6: Perform medical validation
      const medicalValidation = await this.performMedicalValidation(
        query,
        enhancedResponse || primaryResponse.response,
        enhancedMedicalContext,
        retrievalResult.documents
      );

      // Step 7: Generate clinical assessment
      const clinicalAssessment = await this.generateClinicalAssessment(
        enhancedMedicalContext,
        retrievalResult.documents,
        medicalValidation
      );

      // Step 8: Calculate confidence score
      const confidence = this.calculateConfidenceScore(
        retrievalResult.documents,
        medicalValidation,
        primaryResponse.confidence || 0.5
      );

      // Step 9: Prepare sources with relevance scores
      const sources = this.prepareSources(retrievalResult.documents);

      const result: EnhancedRAGResult = {
        query,
        medicalContext: enhancedMedicalContext,
        relevantDocuments: retrievalResult.documents,
        enrichedContext,
        primaryResponse: primaryResponse.response,
        enhancedResponse,
        clinicalAssessment,
        sources,
        confidence,
        processingTime: Date.now() - startTime,
        metadata: {
          documentCount: retrievalResult.documents.length,
          totalTokens: this.estimateTotalTokens(query, enrichedContext, enhancedResponse || primaryResponse.response),
          similarityScores: retrievalResult.documents.map(doc => doc.similarity || 0),
          searchStrategy: retrievalResult.searchStrategy,
          medicalValidation,
          aiUsage: {
            mistral: primaryResponse.usage,
            gemini: geminiUsage,
            embeddings: retrievalResult.embeddingUsage,
          },
        },
      };

      // Cache the result
      if (this.config.cacheResults) {
        this.cacheResult(cacheKey, result);
      }

      return result;
    } catch (error) {
      console.error('Enhanced RAG pipeline execution failed:', error);
      throw new Error(`Enhanced RAG pipeline failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze medical query and extract context
   */
  private async analyzeMedicalQuery(
    query: string,
    providedContext?: Partial<MedicalContext>
  ): Promise<MedicalContext> {
    const queryLower = query.toLowerCase();
    
    // Extract age information
    let patientAge = providedContext?.patientAge;
    if (!patientAge) {
      if (queryLower.includes('infant') || queryLower.includes('newborn')) {
        patientAge = 'infant';
      } else if (queryLower.includes('toddler') || queryLower.includes('preschool')) {
        patientAge = 'toddler';
      } else if (queryLower.includes('child') || queryLower.includes('pediatric')) {
        patientAge = 'child';
      } else if (queryLower.includes('adolescent') || queryLower.includes('teen')) {
        patientAge = 'adolescent';
      }
    }

    // Determine urgency level
    let urgencyLevel = providedContext?.urgencyLevel || 'medium';
    if (queryLower.includes('emergency') || queryLower.includes('critical') || queryLower.includes('life-threatening')) {
      urgencyLevel = 'critical';
    } else if (queryLower.includes('urgent') || queryLower.includes('acute') || queryLower.includes('severe')) {
      urgencyLevel = 'high';
    } else if (queryLower.includes('chronic') || queryLower.includes('stable')) {
      urgencyLevel = 'low';
    }

    // Identify medical specialties
    const specialties = providedContext?.medicalSpecialties || [];
    const specialtyKeywords = {
      'cardiology': ['heart', 'cardiac', 'cardiovascular', 'arrhythmia', 'murmur'],
      'pulmonology': ['lung', 'respiratory', 'breathing', 'asthma', 'pneumonia'],
      'neurology': ['brain', 'neurological', 'seizure', 'headache', 'development'],
      'gastroenterology': ['stomach', 'intestinal', 'digestive', 'abdominal', 'nausea'],
      'endocrinology': ['diabetes', 'thyroid', 'growth', 'hormone', 'metabolism'],
      'infectious_disease': ['infection', 'fever', 'virus', 'bacteria', 'antibiotic'],
      'dermatology': ['skin', 'rash', 'dermatitis', 'eczema', 'acne'],
      'hematology': ['blood', 'anemia', 'bleeding', 'clotting', 'leukemia'],
    };

    for (const [specialty, keywords] of Object.entries(specialtyKeywords)) {
      if (keywords.some(keyword => queryLower.includes(keyword))) {
        if (!specialties.includes(specialty)) {
          specialties.push(specialty);
        }
      }
    }

    // Determine query type
    let queryType: MedicalContext['queryType'] = 'information';
    if (queryLower.includes('diagnos') || queryLower.includes('what is') || queryLower.includes('symptoms')) {
      queryType = 'diagnosis';
    } else if (queryLower.includes('treat') || queryLower.includes('therapy') || queryLower.includes('medication')) {
      queryType = 'treatment';
    } else if (queryLower.includes('emergency') || queryLower.includes('urgent')) {
      queryType = 'emergency';
    } else if (queryLower.includes('learn') || queryLower.includes('explain') || queryLower.includes('education')) {
      queryType = 'education';
    }

    // Determine clinical setting
    let clinicalSetting = providedContext?.clinicalSetting || 'primary_care';
    if (urgencyLevel === 'critical' || queryType === 'emergency') {
      clinicalSetting = 'emergency';
    } else if (specialties.length > 0) {
      clinicalSetting = 'specialty';
    }

    return {
      patientAge,
      urgencyLevel: urgencyLevel as MedicalContext['urgencyLevel'],
      medicalSpecialties: specialties,
      clinicalSetting,
      evidenceLevel: providedContext?.evidenceLevel || 'high',
      queryType,
    };
  }

  /**
   * Retrieve relevant documents with enhanced medical filtering
   */
  private async retrieveRelevantDocuments(
    query: string,
    medicalContext: MedicalContext
  ): Promise<{
    documents: EnhancedDocumentChunk[];
    searchStrategy: string;
    embeddingUsage: any;
  }> {
    const searchOptions: VectorSearchOptions = {
      threshold: this.config.similarityThreshold,
      limit: this.config.topK,
      rerank: this.config.enableReranking,
      filters: {
        medical_specialties: medicalContext.medicalSpecialties,
        urgency_level: medicalContext.urgencyLevel,
      },
    };

    const searchResult = await vectorDatabaseService.vectorSearch(query, searchOptions);
    
    // Convert to enhanced document chunks
    const enhancedDocuments: EnhancedDocumentChunk[] = searchResult.documents.map(doc => ({
      id: doc.id,
      content: doc.content,
      metadata: {
        ...doc.metadata,
        clinical_relevance_score: this.calculateClinicalRelevance(doc, medicalContext),
      },
      embedding: doc.embedding,
      similarity: doc.similarity,
      relevanceScore: this.calculateOverallRelevance(doc, medicalContext),
    }));

    // Sort by overall relevance score
    enhancedDocuments.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

    return {
      documents: enhancedDocuments,
      searchStrategy: searchResult.metadata.searchStrategy,
      embeddingUsage: {
        totalTokens: 0, // Would be calculated from embedding service
        processingTime: searchResult.processingTime,
      },
    };
  }

  /**
   * Enrich medical context with domain knowledge
   */
  private async enrichMedicalContext(
    documents: EnhancedDocumentChunk[],
    medicalContext: MedicalContext
  ): Promise<string> {
    if (documents.length === 0) {
      return `No relevant medical information found in the Nelson Textbook of Pediatrics for this ${medicalContext.queryType} query.`;
    }

    // Group documents by medical relevance
    const highRelevanceDocs = documents.filter(doc => (doc.relevanceScore || 0) > 0.8);
    const mediumRelevanceDocs = documents.filter(doc => (doc.relevanceScore || 0) > 0.6 && (doc.relevanceScore || 0) <= 0.8);
    
    let context = `Medical Information from Nelson Textbook of Pediatrics\n\n`;
    
    // Add medical context header
    context += `Clinical Context:\n`;
    if (medicalContext.patientAge) {
      context += `- Patient Age Group: ${medicalContext.patientAge}\n`;
    }
    if (medicalContext.urgencyLevel) {
      context += `- Urgency Level: ${medicalContext.urgencyLevel}\n`;
    }
    if (medicalContext.medicalSpecialties && medicalContext.medicalSpecialties.length > 0) {
      context += `- Medical Specialties: ${medicalContext.medicalSpecialties.join(', ')}\n`;
    }
    context += `\n`;

    // Add high relevance documents first
    if (highRelevanceDocs.length > 0) {
      context += `Primary Medical Information (High Relevance):\n`;
      highRelevanceDocs.forEach((doc, index) => {
        const source = `${doc.metadata.chapter}${doc.metadata.section ? ` - ${doc.metadata.section}` : ''}`;
        const title = doc.metadata.title ? `Title: ${doc.metadata.title}` : '';
        const evidenceLevel = doc.metadata.evidence_level ? `Evidence Level: ${doc.metadata.evidence_level}` : '';
        
        context += `\n[Primary Source ${index + 1}]\n`;
        if (title) context += `${title}\n`;
        context += `Source: ${source}\n`;
        if (evidenceLevel) context += `${evidenceLevel}\n`;
        context += `Relevance Score: ${(doc.relevanceScore || 0).toFixed(2)}\n`;
        context += `\nContent:\n${doc.content}\n`;
        context += `\n---\n`;
      });
    }

    // Add medium relevance documents
    if (mediumRelevanceDocs.length > 0) {
      context += `\nSupporting Medical Information (Medium Relevance):\n`;
      mediumRelevanceDocs.forEach((doc, index) => {
        const source = `${doc.metadata.chapter}${doc.metadata.section ? ` - ${doc.metadata.section}` : ''}`;
        const title = doc.metadata.title ? `${doc.metadata.title}` : '';
        
        context += `\n[Supporting Source ${index + 1}]\n`;
        context += `${title ? title + ' - ' : ''}${source}\n`;
        context += `Relevance: ${(doc.relevanceScore || 0).toFixed(2)}\n`;
        context += `${doc.content}\n`;
        context += `\n---\n`;
      });
    }

    return context;
  }

  /**
   * Generate primary medical response using Mistral
   */
  private async generatePrimaryResponse(
    query: string,
    context: string,
    medicalContext: MedicalContext,
    documents: EnhancedDocumentChunk[]
  ): Promise<{ response: string; usage: any; confidence: number }> {
    try {
      const sources = documents.map(doc => `${doc.metadata.chapter}${doc.metadata.section ? ` - ${doc.metadata.section}` : ''}`);
      
      const response = await mistralService.generateMedicalResponse({
        query,
        context,
        clinicalAssessment: this.buildClinicalAssessment(medicalContext, documents),
        sources,
      });

      // Calculate confidence based on document relevance and AI response
      const avgRelevance = documents.reduce((sum, doc) => sum + (doc.relevanceScore || 0), 0) / documents.length;
      const confidence = Math.min(0.95, avgRelevance * 0.7 + 0.3);

      return {
        response: response.response,
        usage: response.usage,
        confidence,
      };
    } catch (error) {
      console.error('Primary response generation failed:', error);
      throw error;
    }
  }

  /**
   * Enhance response with Gemini's cognitive capabilities
   */
  private async enhanceWithGemini(
    query: string,
    primaryResponse: string,
    medicalContext: MedicalContext
  ): Promise<{ enhancedContent: string; usage: any }> {
    try {
      // Determine enhancement type based on medical context
      let enhancementType: 'summarization' | 'simplification' | 'expansion' | 'clinical_reasoning' = 'clinical_reasoning';
      let targetAudience: 'clinicians' | 'students' | 'patients' = 'clinicians';
      
      if (medicalContext.queryType === 'education') {
        enhancementType = 'expansion';
        targetAudience = 'students';
      } else if (medicalContext.urgencyLevel === 'critical') {
        enhancementType = 'summarization';
      } else if (medicalContext.clinicalSetting === 'primary_care') {
        enhancementType = 'simplification';
      }

      const result = await geminiService.enhanceMedicalContent({
        originalContent: primaryResponse,
        enhancementType,
        targetAudience,
        additionalContext: `Medical Context: ${JSON.stringify(medicalContext, null, 2)}`,
      });

      return result;
    } catch (error) {
      console.error('Gemini enhancement failed:', error);
      throw error;
    }
  }

  /**
   * Perform comprehensive medical validation
   */
  private async performMedicalValidation(
    query: string,
    response: string,
    medicalContext: MedicalContext,
    documents: EnhancedDocumentChunk[]
  ): Promise<{
    passed: boolean;
    warnings: string[];
    recommendations: string[];
  }> {
    const warnings: string[] = [];
    const recommendations: string[] = [];
    let passed = true;

    // Check for emergency indicators
    if (medicalContext.urgencyLevel === 'critical' && !response.toLowerCase().includes('emergency')) {
      warnings.push('High urgency query may require emergency care disclaimer');
      recommendations.push('Consider adding emergency care guidance');
    }

    // Check for dosing information validation
    if (response.toLowerCase().includes('dose') || response.toLowerCase().includes('mg/kg')) {
      if (!response.toLowerCase().includes('consult') && !response.toLowerCase().includes('verify')) {
        warnings.push('Dosing information should include verification guidance');
        recommendations.push('Add recommendation to verify dosing with current guidelines');
      }
    }

    // Check source attribution
    const hasSourceAttribution = response.toLowerCase().includes('nelson') || 
                                response.toLowerCase().includes('textbook') ||
                                documents.some(doc => response.includes(doc.metadata.chapter));
    
    if (!hasSourceAttribution) {
      warnings.push('Response may lack proper source attribution');
      recommendations.push('Ensure Nelson Textbook sources are clearly cited');
    }

    // Check for medical disclaimers
    const hasDisclaimer = response.toLowerCase().includes('consult') ||
                         response.toLowerCase().includes('healthcare provider') ||
                         response.toLowerCase().includes('physician');
    
    if (!hasDisclaimer && medicalContext.clinicalSetting !== 'specialty') {
      warnings.push('Missing medical disclaimer for clinical guidance');
      recommendations.push('Add appropriate medical consultation disclaimer');
    }

    // Check response length and completeness
    if (response.length < 200) {
      warnings.push('Response may be too brief for medical complexity');
      recommendations.push('Consider providing more comprehensive medical information');
    }

    // Check for age-appropriate content
    if (medicalContext.patientAge && !this.isAgeAppropriateResponse(response, medicalContext.patientAge)) {
      warnings.push('Response may not be age-appropriate');
      recommendations.push('Ensure content is appropriate for specified age group');
    }

    // Overall validation
    if (warnings.length > 3) {
      passed = false;
    }

    return { passed, warnings, recommendations };
  }

  /**
   * Generate clinical assessment summary
   */
  private async generateClinicalAssessment(
    medicalContext: MedicalContext,
    documents: EnhancedDocumentChunk[],
    validation: { passed: boolean; warnings: string[]; recommendations: string[] }
  ): Promise<string> {
    const assessment = [];
    
    assessment.push(`Clinical Assessment Summary:`);
    assessment.push(`- Query Type: ${medicalContext.queryType}`);
    assessment.push(`- Urgency Level: ${medicalContext.urgencyLevel}`);
    assessment.push(`- Clinical Setting: ${medicalContext.clinicalSetting}`);
    
    if (medicalContext.patientAge) {
      assessment.push(`- Patient Age Group: ${medicalContext.patientAge}`);
    }
    
    if (medicalContext.medicalSpecialties && medicalContext.medicalSpecialties.length > 0) {
      assessment.push(`- Medical Specialties: ${medicalContext.medicalSpecialties.join(', ')}`);
    }
    
    assessment.push(``);
    assessment.push(`Information Quality:`);
    assessment.push(`- Documents Retrieved: ${documents.length}`);
    assessment.push(`- Average Relevance Score: ${(documents.reduce((sum, doc) => sum + (doc.relevanceScore || 0), 0) / documents.length).toFixed(2)}`);
    assessment.push(`- Evidence Level: ${medicalContext.evidenceLevel}`);
    
    const highQualityDocs = documents.filter(doc => (doc.relevanceScore || 0) > 0.8).length;
    assessment.push(`- High Quality Sources: ${highQualityDocs}`);
    
    assessment.push(``);
    assessment.push(`Medical Validation: ${validation.passed ? 'Passed' : 'Needs Review'}`);
    
    if (validation.warnings.length > 0) {
      assessment.push(`Warnings: ${validation.warnings.length}`);
    }
    
    if (validation.recommendations.length > 0) {
      assessment.push(`Recommendations: ${validation.recommendations.length}`);
    }
    
    return assessment.join('\n');
  }

  // Helper methods
  private buildBasicContext(documents: EnhancedDocumentChunk[]): string {
    if (documents.length === 0) {
      return 'No relevant medical information found in the Nelson Textbook of Pediatrics.';
    }

    const contextParts = documents.map((doc, index) => {
      const source = `Source: ${doc.metadata.chapter}${doc.metadata.section ? ` - ${doc.metadata.section}` : ''}`;
      const title = doc.metadata.title ? `Title: ${doc.metadata.title}` : '';
      
      return `[Document ${index + 1}]\n${title}\n${source}\n\nContent:\n${doc.content}\n`;
    });

    return contextParts.join('\n---\n');
  }

  private buildClinicalAssessment(
    medicalContext: MedicalContext, 
    documents: EnhancedDocumentChunk[]
  ): string {
    const assessment = [];
    
    assessment.push(`Clinical Context: ${medicalContext.queryType} query`);
    if (medicalContext.urgencyLevel) {
      assessment.push(`Urgency: ${medicalContext.urgencyLevel}`);
    }
    if (medicalContext.patientAge) {
      assessment.push(`Age Group: ${medicalContext.patientAge}`);
    }
    
    assessment.push(`Information Sources: ${documents.length} documents from Nelson Textbook`);
    
    const avgRelevance = documents.reduce((sum, doc) => sum + (doc.relevanceScore || 0), 0) / documents.length;
    assessment.push(`Average Relevance: ${avgRelevance.toFixed(2)}`);
    
    return assessment.join(', ');
  }

  private calculateClinicalRelevance(
    document: any,
    medicalContext: MedicalContext
  ): number {
    let relevance = 0.5;
    
    // Age group relevance
    if (medicalContext.patientAge && document.metadata.age_groups) {
      if (document.metadata.age_groups.includes(medicalContext.patientAge)) {
        relevance += 0.2;
      }
    }
    
    // Specialty relevance
    if (medicalContext.medicalSpecialties && document.metadata.medical_specialties) {
      const matches = medicalContext.medicalSpecialties.filter(s => 
        document.metadata.medical_specialties.includes(s)
      );
      relevance += (matches.length / medicalContext.medicalSpecialties.length) * 0.2;
    }
    
    // Urgency relevance
    if (medicalContext.urgencyLevel && document.metadata.urgency_level) {
      const urgencyMatch = this.getUrgencyCompatibility(medicalContext.urgencyLevel, document.metadata.urgency_level);
      relevance += urgencyMatch * 0.1;
    }
    
    return Math.min(relevance, 1.0);
  }

  private calculateOverallRelevance(
    document: any,
    medicalContext: MedicalContext
  ): number {
    const vectorSimilarity = document.similarity || 0;
    const clinicalRelevance = document.metadata.clinical_relevance_score || 0;
    const evidenceScore = this.getEvidenceScore(document.metadata.evidence_level);
    
    // Weighted combination
    return (
      vectorSimilarity * 0.4 +
      clinicalRelevance * 0.3 +
      evidenceScore * 0.3
    );
  }

  private calculateConfidenceScore(
    documents: EnhancedDocumentChunk[],
    validation: { passed: boolean; warnings: string[] },
    baseConfidence: number
  ): number {
    let confidence = baseConfidence;
    
    // Document quality factor
    const avgRelevance = documents.reduce((sum, doc) => sum + (doc.relevanceScore || 0), 0) / documents.length;
    confidence = confidence * 0.6 + avgRelevance * 0.4;
    
    // Validation factor
    if (!validation.passed) {
      confidence *= 0.8;
    }
    
    if (validation.warnings.length > 0) {
      confidence *= (1 - validation.warnings.length * 0.05);
    }
    
    // Document count factor
    if (documents.length < 3) {
      confidence *= 0.9;
    }
    
    return Math.max(0.1, Math.min(0.95, confidence));
  }

  private prepareSources(documents: EnhancedDocumentChunk[]): Array<{
    chapter: string;
    section?: string;
    title?: string;
    relevanceScore: number;
    evidenceLevel?: string;
  }> {
    return documents.map(doc => ({
      chapter: doc.metadata.chapter,
      section: doc.metadata.section,
      title: doc.metadata.title,
      relevanceScore: doc.relevanceScore || 0,
      evidenceLevel: doc.metadata.evidence_level,
    }));
  }

  private isAgeAppropriateResponse(response: string, ageGroup: string): boolean {
    const responseLower = response.toLowerCase();
    
    // Age-specific term checking
    const ageTerms: Record<string, string[]> = {
      'infant': ['infant', 'newborn', 'baby', 'neonate'],
      'toddler': ['toddler', 'child', 'young'],
      'child': ['child', 'pediatric', 'kid'],
      'adolescent': ['adolescent', 'teenager', 'teen', 'young adult'],
    };
    
    const expectedTerms = ageTerms[ageGroup] || [];
    return expectedTerms.some(term => responseLower.includes(term)) || 
           responseLower.includes('pediatric') ||
           responseLower.includes('age-appropriate');
  }

  private getUrgencyCompatibility(queryUrgency: string, docUrgency: string): number {
    const urgencyLevels = ['low', 'medium', 'high', 'critical'];
    const queryIndex = urgencyLevels.indexOf(queryUrgency);
    const docIndex = urgencyLevels.indexOf(docUrgency);
    
    if (queryIndex === -1 || docIndex === -1) return 0.5;
    
    // Perfect match gets 1.0, adjacent levels get 0.7, etc.
    const difference = Math.abs(queryIndex - docIndex);
    return Math.max(0.2, 1.0 - difference * 0.3);
  }

  private getEvidenceScore(evidenceLevel?: string): number {
    const scores: Record<string, number> = {
      'high': 1.0,
      'medium': 0.7,
      'low': 0.4,
      'expert_opinion': 0.6,
    };
    return scores[evidenceLevel || 'medium'] || 0.5;
  }

  private estimateTotalTokens(query: string, context: string, response: string): number {
    return Math.ceil((query.length + context.length + response.length) / 4);
  }

  private generateCacheKey(query: string, medicalContext?: Partial<MedicalContext>): string {
    const key = JSON.stringify({ query, medicalContext });
    return Buffer.from(key).toString('base64');
  }

  private getCachedResult(key: string): EnhancedRAGResult | null {
    const cached = this.responseCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.result;
    }
    this.responseCache.delete(key);
    return null;
  }

  private cacheResult(key: string, result: EnhancedRAGResult): void {
    this.responseCache.set(key, { result, timestamp: Date.now() });
  }
  /**
   * Test the enhanced RAG pipeline
   */
  async testPipeline(): Promise<{ 
    success: boolean; 
    message: string; 
    result?: EnhancedRAGResult;
    performance: {
      responseTime: number;
      documentsRetrieved: number;
      confidenceScore: number;
      validationPassed: boolean;
    };
  }> {
    try {
      const testQuery = "What are the treatment options for pediatric asthma in a 5-year-old child?";
      const testContext: Partial<MedicalContext> = {
        patientAge: 'child',
        urgencyLevel: 'medium',
        queryType: 'treatment',
        clinicalSetting: 'primary_care',
      };
      
      const result = await this.execute(testQuery, testContext, { includeEnhancement: true });

      const performance = {
        responseTime: result.processingTime,
        documentsRetrieved: result.metadata.documentCount,
        confidenceScore: result.confidence,
        validationPassed: result.metadata.medicalValidation.passed,
      };

      return {
        success: true,
        message: `Enhanced RAG pipeline test completed successfully. Retrieved ${result.metadata.documentCount} documents with ${(result.confidence * 100).toFixed(1)}% confidence in ${result.processingTime}ms.`,
        result,
        performance,
      };
    } catch (error) {
      return {
        success: false,
        message: `Enhanced RAG pipeline test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        performance: {
          responseTime: 0,
          documentsRetrieved: 0,
          confidenceScore: 0,
          validationPassed: false,
        },
      };
    }
  }

  /**
   * Get pipeline performance metrics
   */
  async getMetrics(): Promise<{
    cacheSize: number;
    cacheHitRate: number;
    averageResponseTime: number;
    totalQueries: number;
  }> {
    // In a production system, these would be tracked in a database
    return {
      cacheSize: this.responseCache.size,
      cacheHitRate: 0.0, // Would be calculated from actual metrics
      averageResponseTime: 0.0, // Would be calculated from actual metrics
      totalQueries: 0, // Would be tracked in actual implementation
    };
  }

  /**
   * Clear cache and reset metrics
   */
  clearCache(): void {
    this.responseCache.clear();
  }
}

// Export singleton instance
export const enhancedRAGPipeline = new EnhancedRAGPipeline();

// Legacy export for backward compatibility
export const ragPipeline = enhancedRAGPipeline;