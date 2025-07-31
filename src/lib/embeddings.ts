import { HfInference } from '@huggingface/inference';

// Initialize Hugging Face client
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

// Embedding configuration
export const EMBEDDING_CONFIG = {
  MODEL: 'sentence-transformers/all-MiniLM-L6-v2',
  DIMENSION: 384,
  MAX_TOKENS: 512,
  BATCH_SIZE: 32,
} as const;

export interface EmbeddingResult {
  embedding: number[];
  tokenCount: number;
  processingTime: number;
}

export class EmbeddingService {
  private model: string;
  private hf: HfInference;

  constructor(model = EMBEDDING_CONFIG.MODEL) {
    this.model = model;
    this.hf = hf;
  }

  /**
   * Generate embeddings for a single text
   */
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    try {
      const startTime = Date.now();

      // Truncate text if too long
      const truncatedText = text.length > 8000 ? text.substring(0, 8000) : text;

      const result = await this.hf.featureExtraction({
        model: this.model,
        inputs: truncatedText,
      });

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      return {
        embedding: Array.isArray(result) ? result : [],
        tokenCount: this.estimateTokenCount(truncatedText),
        processingTime,
      };
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate embeddings for multiple texts (batch processing)
   */
  async generateEmbeddingsBatch(texts: string[]): Promise<EmbeddingResult[]> {
    try {
      const results: EmbeddingResult[] = [];
      const batchSize = EMBEDDING_CONFIG.BATCH_SIZE;

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const batchPromises = batch.map(text => this.generateEmbedding(text));
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }

      return results;
    } catch (error) {
      console.error('Error generating batch embeddings:', error);
      throw new Error(`Failed to generate batch embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  calculateCosineSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimensions');
    }

    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      magnitude1 += embedding1[i] * embedding1[i];
      magnitude2 += embedding2[i] * embedding2[i];
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    return dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * Find most similar embeddings using cosine similarity
   */
  async findSimilarEmbeddings(
    queryEmbedding: number[],
    candidateEmbeddings: Array<{ embedding: number[]; metadata?: any }>,
    topK = 5
  ): Promise<Array<{ similarity: number; metadata?: any }>> {
    try {
      const similarities = candidateEmbeddings.map(candidate => ({
        similarity: this.calculateCosineSimilarity(queryEmbedding, candidate.embedding),
        metadata: candidate.metadata,
      }));

      // Sort by similarity in descending order
      similarities.sort((a, b) => b.similarity - a.similarity);

      // Return top K results
      return similarities.slice(0, topK);
    } catch (error) {
      console.error('Error finding similar embeddings:', error);
      throw new Error(`Failed to find similar embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokenCount(text: string): number {
    // Simple approximation: average of 4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Test the embedding service
   */
  async testService(): Promise<{ success: boolean; message: string; embedding?: number[] }> {
    try {
      const testText = "This is a test text for embedding generation.";
      const result = await this.generateEmbedding(testText);

      return {
        success: true,
        message: `Embedding generated successfully. Dimension: ${result.embedding.length}, Tokens: ${result.tokenCount}`,
        embedding: result.embedding.slice(0, 10), // Return first 10 dimensions for testing
      };
    } catch (error) {
      return {
        success: false,
        message: `Embedding service test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}

// Export singleton instance
export const embeddingService = new EmbeddingService();