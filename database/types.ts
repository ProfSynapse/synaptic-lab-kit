/**
 * Database types for Supabase integration
 * Based on patterns from services/database/
 */

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
  accessToken?: string; // For MCP
}

export interface TableSchema {
  columns: Record<string, string>;
  constraints?: string[];
  indexes?: string[];
  rls?: boolean; // Row Level Security
}

export interface VectorTableConfig extends TableSchema {
  vectorColumn: string;
  vectorDimensions: number;
  embeddingProvider?: string;
  textColumn: string; // Column to generate embeddings from
}

export interface QueryResult {
  data: any[] | null;
  error: any | null;
  count?: number;
}

export interface SemanticSearchResult {
  id: string;
  content: string;
  similarity: number;
  metadata?: Record<string, any>;
}

export interface DatabaseHealth {
  connected: boolean;
  version?: string;
  extensions: string[];
  tables: string[];
  vectorSupport: boolean;
}

export interface MigrationResult {
  success: boolean;
  version?: string;
  error?: string;
  changes: string[];
}

// Data generator types
export interface DataGenerator<T = any> {
  (): T;
}

export interface SeedingOptions {
  batchSize?: number;
  onProgress?: (completed: number, total: number) => void;
  onError?: (error: Error, item: any) => void;
  skipDuplicates?: boolean;
}