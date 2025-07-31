import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

// Public client for frontend use
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Service client for backend operations
export const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

// Database table names
export const TABLES = {
  NELSON_DOCUMENTS: 'nelson_documents',
  NELSON_EMBEDDINGS: 'nelson_embeddings',
  CHAT_SESSIONS: 'chat_sessions',
  CHAT_MESSAGES: 'chat_messages',
  CLINICAL_REFERENCES: 'clinical_references',
} as const;

// Vector database configuration
export const VECTOR_CONFIG = {
  DIMENSION: 384,
  TABLE_NAME: TABLES.NELSON_EMBEDDINGS,
  CONTENT_TABLE: TABLES.NELSON_DOCUMENTS,
} as const;

// Helper functions for database operations
export class SupabaseService {
  private client: SupabaseClient;

  constructor(useServiceClient = false) {
    this.client = useServiceClient ? supabaseService : supabase;
  }

  // Test database connection
  async testConnection() {
    try {
      const { data, error } = await this.client
        .from(TABLES.NELSON_DOCUMENTS)
        .select('count')
        .limit(1);

      if (error) {
        throw error;
      }

      return { success: true, message: 'Database connection successful' };
    } catch (error) {
      return { 
        success: false, 
        message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  // Get documents by similarity search (vector search)
  async searchDocuments(query: string, limit = 5) {
    try {
      // This is a placeholder for vector search
      // In a real implementation, you would use pgvector or similar
      const { data, error } = await this.client
        .from(TABLES.NELSON_DOCUMENTS)
        .select('*')
        .textSearch('content', query, {
          type: 'websearch',
          config: 'english'
        })
        .limit(limit);

      if (error) {
        throw error;
      }

      return { success: true, data: data || [] };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Get document by ID
  async getDocumentById(id: string) {
    try {
      const { data, error } = await this.client
        .from(TABLES.NELSON_DOCUMENTS)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw error;
      }

      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Get documents by chapter or section
  async getDocumentsByChapter(chapter: string, section?: string) {
    try {
      let query = this.client
        .from(TABLES.NELSON_DOCUMENTS)
        .select('*')
        .eq('chapter', chapter);

      if (section) {
        query = query.eq('section', section);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return { success: true, data: data || [] };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Store chat session
  async storeChatSession(sessionData: {
    id?: string;
    title: string;
    user_id?: string;
    created_at?: string;
  }) {
    try {
      const { data, error } = await this.client
        .from(TABLES.CHAT_SESSIONS)
        .upsert([sessionData])
        .select()
        .single();

      if (error) {
        throw error;
      }

      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Store chat message
  async storeChatMessage(messageData: {
    id?: string;
    session_id: string;
    role: 'user' | 'assistant';
    content: string;
    metadata?: Record<string, any>;
    created_at?: string;
  }) {
    try {
      const { data, error } = await this.client
        .from(TABLES.CHAT_MESSAGES)
        .insert([messageData])
        .select()
        .single();

      if (error) {
        throw error;
      }

      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Get chat session with messages
  async getChatSession(sessionId: string) {
    try {
      const { data: session, error: sessionError } = await this.client
        .from(TABLES.CHAT_SESSIONS)
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) {
        throw sessionError;
      }

      const { data: messages, error: messagesError } = await this.client
        .from(TABLES.CHAT_MESSAGES)
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (messagesError) {
        throw messagesError;
      }

      return { 
        success: true, 
        data: {
          session,
          messages: messages || []
        }
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

// Export singleton instances
export const supabaseServicePublic = new SupabaseService(false);
export const supabaseServiceBackend = new SupabaseService(true);