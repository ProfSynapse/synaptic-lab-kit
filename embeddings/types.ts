/**
 * Embedding types and interfaces
 * Based on patterns from embeddingService.ts
 */

export type SupportedEmbeddingProvider = 
  | 'openai'
  | 'voyage'
  | 'cohere'
  | 'google'
  | 'mistral'
  | 'ollama';

export interface EmbeddingConfig {
  provider: SupportedEmbeddingProvider;
  apiKey: string;
  model?: string;
  dimensions?: number;
  baseURL?: string;
  timeout?: number;
}

export interface EmbeddingRequest {
  input: string | string[];
  model?: string;
  dimensions?: number;
  encodingFormat?: 'float' | 'base64';
  user?: string;
}

export interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
  dimensions: number;
}

export interface EmbeddingCapabilities {
  maxInputLength: number;
  maxBatchSize: number;
  supportedDimensions: number[];
  supportsBatching: boolean;
  supportsCustomDimensions: boolean;
  defaultModel: string;
  availableModels: string[];
}

export interface EmbeddingProviderError extends Error {
  provider: string;
  code?: string;
  statusCode?: number;
}

export interface BatchEmbeddingRequest {
  inputs: string[];
  model?: string;
  dimensions?: number;
  batchSize?: number;
  onProgress?: (completed: number, total: number) => void;
  onError?: (error: Error, input: string, index: number) => void;
}

export interface BatchEmbeddingResponse {
  embeddings: number[][];
  successful: number;
  failed: number;
  errors: Array<{ index: number; input: string; error: string }>;
  totalTokens: number;
}

export interface SimilarityResult {
  index: number;
  similarity: number;
  content?: string;
}

export interface ClusteringResult {
  clusters: Array<{
    centroid: number[];
    members: number[];
    size: number;
  }>;
  assignments: number[];
  silhouetteScore?: number;
}

// Provider-specific configurations
export interface OpenAIEmbeddingConfig extends EmbeddingConfig {
  provider: 'openai';
  model?: 'text-embedding-3-small' | 'text-embedding-3-large' | 'text-embedding-ada-002';
  dimensions?: 512 | 1536 | 3072;
}

export interface VoyageEmbeddingConfig extends EmbeddingConfig {
  provider: 'voyage';
  model?: 'voyage-3' | 'voyage-3-lite' | 'voyage-finance-2' | 'voyage-multilingual-2' | 'voyage-law-2' | 'voyage-code-2';
  inputType?: 'query' | 'document';
}

export interface CohereEmbeddingConfig extends EmbeddingConfig {
  provider: 'cohere';
  model?: 'embed-english-v3.0' | 'embed-multilingual-v3.0' | 'embed-english-light-v3.0' | 'embed-multilingual-light-v3.0';
  inputType?: 'search_document' | 'search_query' | 'classification' | 'clustering';
  truncate?: 'NONE' | 'START' | 'END';
}

export interface GoogleEmbeddingConfig extends EmbeddingConfig {
  provider: 'google';
  model?: 'text-embedding-004' | 'text-multilingual-embedding-002';
  taskType?: 'RETRIEVAL_QUERY' | 'RETRIEVAL_DOCUMENT' | 'SEMANTIC_SIMILARITY' | 'CLASSIFICATION' | 'CLUSTERING';
}

export interface MistralEmbeddingConfig extends EmbeddingConfig {
  provider: 'mistral';
  model?: 'mistral-embed';
}

// Utility types
export type AnyEmbeddingConfig = 
  | OpenAIEmbeddingConfig
  | VoyageEmbeddingConfig
  | CohereEmbeddingConfig
  | GoogleEmbeddingConfig
  | MistralEmbeddingConfig;

export interface EmbeddingCache {
  get(key: string): Promise<number[] | null>;
  set(key: string, embedding: number[], ttl?: number): Promise<void>;
  clear(): Promise<void>;
  size(): number;
}

export interface EmbeddingMetrics {
  requests: number;
  tokens: number;
  errors: number;
  cacheHits: number;
  cacheMisses: number;
  averageLatency: number;
  lastRequest: Date;
}
