// Enhanced Vector Database Service for NelsonGPT
import { supabaseService } from './supabase';
import { embeddingService } from './embeddings';
import { securityService } from './security';

export interface VectorDocument {
  id: string;
  content: string;
  embedding: number[];
  metadata: {
    chapter: string;
    section?: string;
    title?: string;
    medical_specialties?: string[];
    age_groups?: string[];
    urgency_level?: string;
    evidence_level?: string;
    source: string;
    page?: number;
    last_reviewed?: string;
    chunk_index?: number;
    total_chunks?: number;
  };
  similarity?: number;
}

export interface VectorSearchOptions {
  threshold?: number;
  limit?: number;
  filters?: {
    chapter?: string;
    medical_specialties?: string[];
    age_groups?: string[];
    urgency_level?: string;
    evidence_level?: string;
  };
  includeMetadata?: boolean;
  rerank?: boolean;
}

export interface VectorSearchResult {
  documents: VectorDocument[];
  totalCount: number;
  processingTime: number;
  queryEmbedding: number[];
  averageSimilarity: number;
  maxSimilarity: number;
  metadata: {
    searchStrategy: string;
    filtersApplied: boolean;
    rerankingApplied: boolean;
    cacheHit: boolean;
  };
}

export class VectorDatabaseService {
  private cache = new Map<string, { result: VectorSearchResult; timestamp: number }>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  /**
   * Enhanced vector similarity search with medical context
   */
  async vectorSearch(
    query: string, 
    options: VectorSearchOptions = {}
  ): Promise<VectorSearchResult> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(query, options);
      const cached = this.getCachedResult(cacheKey);
      if (cached) {
        return {
          ...cached,
          metadata: { ...cached.metadata, cacheHit: true },
          processingTime: Date.now() - startTime
        };
      }

      // Generate query embedding
      const queryEmbeddingResult = await embeddingService.generateEmbedding(query);
      const queryEmbedding = queryEmbeddingResult.embedding;

      // Determine search strategy based on query
      const searchStrategy = this.determineSearchStrategy(query, options);
      
      // Execute vector search
      const searchResult = await this.executeVectorSearch(
        queryEmbedding,
        options,
        searchStrategy
      );

      // Apply medical context filtering
      const filteredDocuments = await this.applyMedicalFiltering(
        searchResult.documents,
        query,
        options
      );

      // Re-rank results if requested
      const finalDocuments = options.rerank 
        ? await this.rerankDocuments(filteredDocuments, query, queryEmbedding)
        : filteredDocuments;

      const result: VectorSearchResult = {
        documents: finalDocuments,
        totalCount: finalDocuments.length,
        processingTime: Date.now() - startTime,
        queryEmbedding,
        averageSimilarity: this.calculateAverageSimilarity(finalDocuments),
        maxSimilarity: this.calculateMaxSimilarity(finalDocuments),
        metadata: {
          searchStrategy,
          filtersApplied: !!options.filters,
          rerankingApplied: !!options.rerank,
          cacheHit: false,
        },
      };

      // Cache the result
      this.cacheResult(cacheKey, result);

      return result;
    } catch (error) {
      console.error('Vector search failed:', error);
      throw new Error(`Vector search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute the actual vector search against Supabase
   */
  private async executeVectorSearch(
    queryEmbedding: number[],
    options: VectorSearchOptions,
    strategy: string
  ): Promise<{ documents: VectorDocument[] }> {
    const threshold = options.threshold || 0.7;
    const limit = options.limit || 10;

    try {
      // Build SQL query for vector similarity search
      let query = supabaseService
        .from('nelson_embeddings')
        .select(`
          id,
          document_id,
          chunk_index,
          embedding,
          metadata,
          nelson_documents!inner (
            id,
            title,
            chapter,
            section,
            content,
            medical_specialties,
            age_groups,
            urgency_level,
            evidence_level,
            last_reviewed,
            metadata
          )
        `)
        .limit(limit * 2); // Get extra results for filtering

      // Apply filters if provided
      if (options.filters?.chapter) {
        query = query.eq('nelson_documents.chapter', options.filters.chapter);
      }

      if (options.filters?.medical_specialties && options.filters.medical_specialties.length > 0) {
        query = query.overlaps('nelson_documents.medical_specialties', options.filters.medical_specialties);
      }

      if (options.filters?.age_groups && options.filters.age_groups.length > 0) {
        query = query.overlaps('nelson_documents.age_groups', options.filters.age_groups);
      }

      if (options.filters?.urgency_level) {
        query = query.eq('nelson_documents.urgency_level', options.filters.urgency_level);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // Calculate similarities and filter
      const documents: VectorDocument[] = (data || [])
        .map((row: any) => {
          const doc = row.nelson_documents;
          const similarity = embeddingService.calculateCosineSimilarity(
            queryEmbedding,
            row.embedding
          );

          return {
            id: row.document_id,
            content: doc.content,
            embedding: row.embedding,
            similarity,
            metadata: {
              chapter: doc.chapter,
              section: doc.section,
              title: doc.title,
              medical_specialties: doc.medical_specialties || [],
              age_groups: doc.age_groups || [],
              urgency_level: doc.urgency_level,
              evidence_level: doc.evidence_level,
              source: 'Nelson Textbook of Pediatrics',
              last_reviewed: doc.last_reviewed,
              chunk_index: row.chunk_index,
              ...doc.metadata,
              ...row.metadata,
            },
          };
        })
        .filter(doc => doc.similarity >= threshold)
        .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
        .slice(0, limit);

      return { documents };
    } catch (error) {
      console.error('Supabase vector search failed:', error);
      throw error;
    }
  }

  /**
   * Apply medical context-aware filtering
   */
  private async applyMedicalFiltering(
    documents: VectorDocument[],
    query: string,
    options: VectorSearchOptions
  ): Promise<VectorDocument[]> {
    // Extract medical context from query
    const medicalContext = this.extractMedicalContext(query);
    
    return documents.filter(doc => {
      // Age-appropriate filtering
      if (medicalContext.ageGroup && doc.metadata.age_groups) {
        const isAgeAppropriate = doc.metadata.age_groups.some(group => 
          this.isAgeGroupCompatible(medicalContext.ageGroup!, group)
        );
        if (!isAgeAppropriate) return false;
      }

      // Urgency level filtering
      if (medicalContext.urgencyLevel && doc.metadata.urgency_level) {
        const isUrgencyMatch = this.isUrgencyCompatible(
          medicalContext.urgencyLevel,
          doc.metadata.urgency_level
        );
        if (!isUrgencyMatch) return false;
      }

      // Medical specialty filtering
      if (medicalContext.specialties.length > 0 && doc.metadata.medical_specialties) {
        const hasSpecialtyMatch = medicalContext.specialties.some(specialty =>
          doc.metadata.medical_specialties!.includes(specialty)
        );
        if (!hasSpecialtyMatch) return false;
      }

      return true;
    });
  }

  /**
   * Re-rank documents using advanced similarity and medical relevance
   */
  private async rerankDocuments(
    documents: VectorDocument[],
    query: string,
    queryEmbedding: number[]
  ): Promise<VectorDocument[]> {
    // Enhanced ranking that considers medical context
    const rankedDocuments = documents.map(doc => {
      const vectorSimilarity = doc.similarity || 0;
      const medicalRelevance = this.calculateMedicalRelevance(doc, query);
      const recencyScore = this.calculateRecencyScore(doc);
      const evidenceScore = this.calculateEvidenceScore(doc);

      // Weighted combination of different relevance factors
      const combinedScore = (
        vectorSimilarity * 0.4 +
        medicalRelevance * 0.3 +
        recencyScore * 0.15 +
        evidenceScore * 0.15
      );

      return {
        ...doc,
        similarity: combinedScore,
      };
    });

    return rankedDocuments.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
  }

  /**
   * Store document embeddings in vector database
   */
  async storeDocumentEmbedding(document: {
    id: string;
    content: string;
    metadata: any;
  }): Promise<{ success: boolean; embeddingId?: string; error?: string }> {
    try {
      // Generate embedding
      const embeddingResult = await embeddingService.generateEmbedding(document.content);
      
      // Store in Supabase
      const { data, error } = await supabaseService
        .from('nelson_embeddings')
        .insert([{
          document_id: document.id,
          embedding: embeddingResult.embedding,
          content_hash: this.generateContentHash(document.content),
          metadata: {
            ...document.metadata,
            token_count: embeddingResult.tokenCount,
            processing_time: embeddingResult.processingTime,
            created_at: new Date().toISOString(),
          },
        }])
        .select('id')
        .single();

      if (error) {
        throw error;
      }

      return { success: true, embeddingId: data.id };
    } catch (error) {
      console.error('Failed to store document embedding:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Batch process multiple documents for embedding storage
   */
  async batchStoreEmbeddings(documents: Array<{
    id: string;
    content: string;
    metadata: any;
  }>): Promise<{ 
    successful: number; 
    failed: number; 
    errors: string[];
    processingTime: number;
  }> {
    const startTime = Date.now();
    let successful = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process in batches to avoid overwhelming the system
    const batchSize = 10;
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      
      const promises = batch.map(async (doc) => {
        try {
          const result = await this.storeDocumentEmbedding(doc);
          if (result.success) {
            successful++;
          } else {
            failed++;
            errors.push(`Document ${doc.id}: ${result.error}`);
          }
        } catch (error) {
          failed++;
          errors.push(`Document ${doc.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      });

      await Promise.all(promises);
    }

    return {
      successful,
      failed,
      errors,
      processingTime: Date.now() - startTime,
    };
  }

  /**
   * Update existing embeddings when documents change
   */
  async updateDocumentEmbedding(
    documentId: string,
    newContent: string,
    newMetadata?: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Generate new embedding
      const embeddingResult = await embeddingService.generateEmbedding(newContent);
      
      // Update in database
      const { error } = await supabaseService
        .from('nelson_embeddings')
        .update({
          embedding: embeddingResult.embedding,
          content_hash: this.generateContentHash(newContent),
          metadata: {
            ...newMetadata,
            token_count: embeddingResult.tokenCount,
            processing_time: embeddingResult.processingTime,
            updated_at: new Date().toISOString(),
          },
        })
        .eq('document_id', documentId);

      if (error) {
        throw error;
      }

      // Clear related cache entries
      this.clearCacheForDocument(documentId);

      return { success: true };
    } catch (error) {
      console.error('Failed to update document embedding:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Delete document embeddings
   */
  async deleteDocumentEmbedding(documentId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabaseService
        .from('nelson_embeddings')
        .delete()
        .eq('document_id', documentId);

      if (error) {
        throw error;
      }

      // Clear related cache entries
      this.clearCacheForDocument(documentId);

      return { success: true };
    } catch (error) {
      console.error('Failed to delete document embedding:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get vector database statistics
   */
  async getVectorStats(): Promise<{
    totalDocuments: number;
    totalEmbeddings: number;
    averageEmbeddingDimension: number;
    lastUpdated: string;
    diskUsage?: string;
  }> {
    try {
      const [documentsResult, embeddingsResult] = await Promise.all([
        supabaseService.from('nelson_documents').select('count'),
        supabaseService.from('nelson_embeddings').select('count, embedding'),
      ]);

      const totalDocuments = documentsResult.count || 0;
      const totalEmbeddings = embeddingsResult.count || 0;
      const averageEmbeddingDimension = embeddingsResult.data?.[0]?.embedding?.length || 0;

      return {
        totalDocuments,
        totalEmbeddings,
        averageEmbeddingDimension,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Failed to get vector statistics:', error);
      throw error;
    }
  }

  // Helper methods
  private generateCacheKey(query: string, options: VectorSearchOptions): string {
    return `vector_search:${Buffer.from(JSON.stringify({ query, options })).toString('base64')}`;
  }

  private getCachedResult(key: string): VectorSearchResult | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.result;
    }
    this.cache.delete(key);
    return null;
  }

  private cacheResult(key: string, result: VectorSearchResult): void {
    this.cache.set(key, { result, timestamp: Date.now() });
  }

  private clearCacheForDocument(documentId: string): void {
    // Simple cache invalidation - in production, use more sophisticated cache invalidation
    this.cache.clear();
  }

  private determineSearchStrategy(query: string, options: VectorSearchOptions): string {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('emergency') || queryLower.includes('urgent')) {
      return 'emergency_prioritized';
    }
    
    if (queryLower.includes('diagnosis') || queryLower.includes('differential')) {
      return 'diagnostic_focused';
    }
    
    if (queryLower.includes('treatment') || queryLower.includes('therapy')) {
      return 'treatment_focused';
    }
    
    return 'general_medical';
  }

  private extractMedicalContext(query: string): {
    ageGroup?: string;
    urgencyLevel?: string;
    specialties: string[];
  } {
    const queryLower = query.toLowerCase();
    const context: { ageGroup?: string; urgencyLevel?: string; specialties: string[] } = {
      specialties: [],
    };

    // Age group detection
    if (queryLower.includes('infant') || queryLower.includes('newborn')) {
      context.ageGroup = 'infant';
    } else if (queryLower.includes('toddler') || queryLower.includes('preschool')) {
      context.ageGroup = 'toddler';
    } else if (queryLower.includes('child') || queryLower.includes('pediatric')) {
      context.ageGroup = 'child';
    } else if (queryLower.includes('adolescent') || queryLower.includes('teenager')) {
      context.ageGroup = 'adolescent';
    }

    // Urgency level detection
    if (queryLower.includes('emergency') || queryLower.includes('critical')) {
      context.urgencyLevel = 'critical';
    } else if (queryLower.includes('urgent') || queryLower.includes('acute')) {
      context.urgencyLevel = 'high';
    }

    // Medical specialty detection
    const specialties = [
      'cardiology', 'neurology', 'gastroenterology', 'pulmonology',
      'endocrinology', 'nephrology', 'hematology', 'oncology',
      'infectious disease', 'dermatology', 'psychiatry', 'orthopedics'
    ];

    context.specialties = specialties.filter(specialty => 
      queryLower.includes(specialty) || queryLower.includes(specialty.replace('ology', ''))
    );

    return context;
  }

  private isAgeGroupCompatible(queryAge: string, docAge: string): boolean {
    // Age group compatibility matrix
    const ageCompatibility: Record<string, string[]> = {
      'infant': ['infant', 'general'],
      'toddler': ['toddler', 'child', 'general'],
      'child': ['child', 'toddler', 'general'],
      'adolescent': ['adolescent', 'child', 'general'],
    };

    return ageCompatibility[queryAge]?.includes(docAge) || false;
  }

  private isUrgencyCompatible(queryUrgency: string, docUrgency: string): boolean {
    // Urgency compatibility - higher urgency docs can answer lower urgency queries
    const urgencyLevels = ['low', 'medium', 'high', 'critical'];
    const queryIndex = urgencyLevels.indexOf(queryUrgency);
    const docIndex = urgencyLevels.indexOf(docUrgency);
    
    return docIndex >= queryIndex;
  }

  private calculateMedicalRelevance(doc: VectorDocument, query: string): number {
    let relevance = 0.5; // Base relevance

    // Medical specialty match
    const querySpecialties = this.extractMedicalContext(query).specialties;
    if (querySpecialties.length > 0 && doc.metadata.medical_specialties) {
      const matches = querySpecialties.filter(s => doc.metadata.medical_specialties!.includes(s));
      relevance += (matches.length / querySpecialties.length) * 0.3;
    }

    // Age group relevance
    const queryAgeGroup = this.extractMedicalContext(query).ageGroup;
    if (queryAgeGroup && doc.metadata.age_groups?.includes(queryAgeGroup)) {
      relevance += 0.2;
    }

    return Math.min(relevance, 1.0);
  }

  private calculateRecencyScore(doc: VectorDocument): number {
    if (!doc.metadata.last_reviewed) return 0.5;

    const reviewDate = new Date(doc.metadata.last_reviewed);
    const now = new Date();
    const ageInYears = (now.getTime() - reviewDate.getTime()) / (1000 * 60 * 60 * 24 * 365);

    // Score decreases with age, but doesn't go below 0.3
    return Math.max(0.3, 1.0 - (ageInYears / 10));
  }

  private calculateEvidenceScore(doc: VectorDocument): number {
    const evidenceScores: Record<string, number> = {
      'high': 1.0,
      'medium': 0.7,
      'low': 0.4,
      'expert_opinion': 0.6,
    };

    return evidenceScores[doc.metadata.evidence_level || 'medium'] || 0.5;
  }

  private calculateAverageSimilarity(documents: VectorDocument[]): number {
    if (documents.length === 0) return 0;
    const sum = documents.reduce((acc, doc) => acc + (doc.similarity || 0), 0);
    return sum / documents.length;
  }

  private calculateMaxSimilarity(documents: VectorDocument[]): number {
    if (documents.length === 0) return 0;
    return Math.max(...documents.map(doc => doc.similarity || 0));
  }

  private generateContentHash(content: string): string {
    // Simple hash function - in production, use a proper crypto hash
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }
}

// Export singleton instance
export const vectorDatabaseService = new VectorDatabaseService();