import { embeddingService } from './embeddings';
import { supabaseServiceBackend } from './supabase';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';

export interface RAGConfig {
  chunkSize: number;
  chunkOverlap: number;
  topK: number;
  similarityThreshold: number;
  maxTokens: number;
}

export interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    chapter: string;
    section?: string;
    title?: string;
    source: string;
    page?: number;
  };
  embedding?: number[];
}

export interface RAGResult {
  query: string;
  relevantDocuments: DocumentChunk[];
  context: string;
  answer: string;
  sources: string[];
  processingTime: number;
  metadata: {
    documentCount: number;
    totalTokens: number;
    similarityScores: number[];
  };
}

export class RAGPipeline {
  private config: RAGConfig;

  constructor(config: Partial<RAGConfig> = {}) {
    this.config = {
      chunkSize: config.chunkSize || 1000,
      chunkOverlap: config.chunkOverlap || 200,
      topK: config.topK || 5,
      similarityThreshold: config.similarityThreshold || 0.7,
      maxTokens: config.maxTokens || 4000,
    };
  }

  /**
   * Process documents into chunks
   */
  private chunkDocument(document: { content: string; metadata: any }): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const { content, metadata } = document;
    
    let start = 0;
    let chunkIndex = 0;

    while (start < content.length) {
      const end = Math.min(start + this.config.chunkSize, content.length);
      const chunkContent = content.substring(start, end);
      
      chunks.push({
        id: `${metadata.id || 'doc'}_${chunkIndex}`,
        content: chunkContent,
        metadata: {
          ...metadata,
          chunkIndex,
          totalChunks: Math.ceil(content.length / this.config.chunkSize),
        },
      });

      start = end - this.config.chunkOverlap;
      chunkIndex++;
    }

    return chunks;
  }

  /**
   * Retrieve relevant documents from Supabase
   */
  async retrieveDocuments(query: string): Promise<DocumentChunk[]> {
    try {
      const startTime = Date.now();

      // Generate query embedding
      const queryEmbeddingResult = await embeddingService.generateEmbedding(query);
      const queryEmbedding = queryEmbeddingResult.embedding;

      // Search for documents in Supabase
      const searchResult = await supabaseServiceBackend.searchDocuments(query, this.config.topK * 2);

      if (!searchResult.success || !searchResult.data) {
        throw new Error('Failed to retrieve documents from database');
      }

      // Convert to document chunks and generate embeddings
      const documents: DocumentChunk[] = [];
      for (const doc of searchResult.data) {
        const chunks = this.chunkDocument({
          content: doc.content,
          metadata: {
            chapter: doc.chapter,
            section: doc.section,
            title: doc.title,
            source: 'Nelson Textbook of Pediatrics',
            id: doc.id,
          },
        });

        // Generate embeddings for chunks (in production, this would be cached)
        for (const chunk of chunks) {
          const embeddingResult = await embeddingService.generateEmbedding(chunk.content);
          chunk.embedding = embeddingResult.embedding;
          documents.push(chunk);
        }
      }

      // Calculate similarity scores and filter
      const documentsWithSimilarity = documents.map(doc => ({
        ...doc,
        similarity: embeddingService.calculateCosineSimilarity(queryEmbedding, doc.embedding || []),
      }));

      // Filter by threshold and sort by similarity
      const filteredDocuments = documentsWithSimilarity
        .filter(doc => doc.similarity >= this.config.similarityThreshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, this.config.topK);

      const endTime = Date.now();
      console.log(`Document retrieval completed in ${endTime - startTime}ms`);

      return filteredDocuments;
    } catch (error) {
      console.error('Error retrieving documents:', error);
      throw new Error(`Failed to retrieve documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build context from retrieved documents
   */
  private buildContext(documents: DocumentChunk[]): string {
    if (documents.length === 0) {
      return 'No relevant medical information found in the Nelson Textbook of Pediatrics.';
    }

    const contextParts = documents.map((doc, index) => {
      const source = `Source: ${doc.metadata.chapter}${doc.metadata.section ? ` - ${doc.metadata.section}` : ''}`;
      const title = doc.metadata.title ? `Title: ${doc.metadata.title}` : '';
      const content = doc.content;
      
      return `[Document ${index + 1}]\n${title}\n${source}\n\nContent:\n${content}\n`;
    });

    return contextParts.join('\n---\n');
  }

  /**
   * Generate answer using retrieved context
   */
  async generateAnswer(query: string, context: string): Promise<string> {
    try {
      // This is a placeholder for the actual LLM call
      // In a real implementation, you would use Mistral or Gemini API
      
      const prompt = `
You are a pediatric medical assistant powered by the Nelson Textbook of Pediatrics. 
Answer the following question based on the provided medical context. 
Be accurate, evidence-based, and cite your sources.

Context:
${context}

Question: ${query}

Instructions:
1. Provide a comprehensive answer based on the context
2. If the context doesn't contain sufficient information, acknowledge this limitation
3. Always cite the specific chapters and sections from the Nelson Textbook
4. Use professional medical terminology but explain complex concepts clearly
5. Include important clinical considerations when relevant

Answer:
`;

      // For now, return a placeholder response
      // In the next step, we'll integrate with Mistral API
      return `Based on the Nelson Textbook of Pediatrics, I found relevant information regarding your query. However, I need to integrate with the Mistral API to provide a comprehensive answer. The context contains ${context.length} characters of medical information from ${context.split('---').length} document sources.`;
    } catch (error) {
      console.error('Error generating answer:', error);
      throw new Error(`Failed to generate answer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute the complete RAG pipeline
   */
  async execute(query: string): Promise<RAGResult> {
    try {
      const startTime = Date.now();

      // Step 1: Retrieve relevant documents
      const relevantDocuments = await this.retrieveDocuments(query);

      // Step 2: Build context
      const context = this.buildContext(relevantDocuments);

      // Step 3: Generate answer
      const answer = await this.generateAnswer(query, context);

      // Step 4: Extract sources
      const sources = relevantDocuments.map(doc => 
        `${doc.metadata.chapter}${doc.metadata.section ? ` - ${doc.metadata.section}` : ''}`
      );

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      return {
        query,
        relevantDocuments,
        context,
        answer,
        sources,
        processingTime,
        metadata: {
          documentCount: relevantDocuments.length,
          totalTokens: this.estimateTotalTokens(query, context, answer),
          similarityScores: relevantDocuments.map(doc => doc.similarity || 0),
        },
      };
    } catch (error) {
      console.error('Error executing RAG pipeline:', error);
      throw new Error(`RAG pipeline execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Estimate total tokens used in the pipeline
   */
  private estimateTotalTokens(query: string, context: string, answer: string): number {
    const queryTokens = Math.ceil(query.length / 4);
    const contextTokens = Math.ceil(context.length / 4);
    const answerTokens = Math.ceil(answer.length / 4);
    
    return queryTokens + contextTokens + answerTokens;
  }

  /**
   * Test the RAG pipeline
   */
  async testPipeline(): Promise<{ success: boolean; message: string; result?: RAGResult }> {
    try {
      const testQuery = "What are the common symptoms of pediatric asthma?";
      const result = await this.execute(testQuery);

      return {
        success: true,
        message: `RAG pipeline test completed successfully. Retrieved ${result.relevantDocuments.length} documents in ${result.processingTime}ms.`,
        result,
      };
    } catch (error) {
      return {
        success: false,
        message: `RAG pipeline test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}

// Export singleton instance
export const ragPipeline = new RAGPipeline();