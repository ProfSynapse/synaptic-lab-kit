/**
 * Base Embedding Provider
 * Abstract base class for all embedding providers
 * Based on patterns from existing adapter architecture
 */

import { 
  EmbeddingRequest, 
  EmbeddingResponse, 
  EmbeddingCapabilities, 
  BatchEmbeddingRequest,
  BatchEmbeddingResponse,
  EmbeddingProviderError,
  EmbeddingMetrics,
  SimilarityResult
} from './types';

export abstract class BaseEmbeddingProvider {
  protected apiKey: string;
  protected baseURL?: string;
  protected timeout: number = 30000;
  protected metrics: EmbeddingMetrics = {
    requests: 0,
    tokens: 0,
    errors: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageLatency: 0,
    lastRequest: new Date()
  };

  constructor(apiKey: string, baseURL?: string, timeout?: number) {
    this.apiKey = apiKey;
    this.baseURL = baseURL;
    if (timeout) this.timeout = timeout;
  }

  /**
   * Generate embeddings for input text(s)
   */
  abstract embed(request: EmbeddingRequest): Promise<EmbeddingResponse>;

  /**
   * Get provider capabilities
   */
  abstract getCapabilities(): EmbeddingCapabilities;

  /**
   * Check if provider is available (has valid API key)
   */
  abstract isAvailable(): Promise<boolean>;

  /**
   * Get provider name
   */
  abstract getProviderName(): string;

  /**
   * Batch embedding with automatic chunking and retry logic
   */
  async embedBatch(request: BatchEmbeddingRequest): Promise<BatchEmbeddingResponse> {
    const startTime = Date.now();
    const capabilities = this.getCapabilities();
    const batchSize = Math.min(
      request.batchSize || capabilities.maxBatchSize,
      capabilities.maxBatchSize
    );

    const results: number[][] = [];
    const errors: Array<{ index: number; input: string; error: string }> = [];
    let totalTokens = 0;
    let successful = 0;
    let failed = 0;

    try {
      // Process inputs in batches
      for (let i = 0; i < request.inputs.length; i += batchSize) {
        const batch = request.inputs.slice(i, i + batchSize);
        
        try {
          const response = await this.embed({
            input: batch,
            model: request.model,
            dimensions: request.dimensions
          });

          results.push(...response.embeddings);
          totalTokens += response.usage.totalTokens;
          successful += batch.length;

          // Progress callback
          if (request.onProgress) {
            request.onProgress(Math.min(i + batchSize, request.inputs.length), request.inputs.length);
          }
        } catch (error) {
          // Handle batch error
          batch.forEach((input, batchIndex) => {
            const globalIndex = i + batchIndex;
            errors.push({
              index: globalIndex,
              input,
              error: (error as Error).message
            });
            
            // Add zero vector as placeholder
            const dimensions = request.dimensions || this.getCapabilities().supportedDimensions[0];
            results.push(new Array(dimensions).fill(0));
            
            if (request.onError) {
              request.onError(error as Error, input, globalIndex);
            }
          });
          
          failed += batch.length;
        }

        // Rate limiting delay
        if (i + batchSize < request.inputs.length) {
          await this.delay(100); // 100ms between batches
        }
      }

      // Update metrics
      this.updateMetrics(Date.now() - startTime, totalTokens, errors.length);

      return {
        embeddings: results,
        successful,
        failed,
        errors,
        totalTokens
      };
    } catch (error) {
      console.error(`Batch embedding failed for ${this.getProviderName()}:`, error);
      throw new EmbeddingProviderError(
        `Batch embedding failed: ${(error as Error).message}`,
        this.getProviderName()
      );
    }
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Embeddings must have the same dimensionality');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Find most similar embeddings
   */
  findSimilar(
    query: number[],
    candidates: number[][],
    topK: number = 5,
    threshold: number = 0.5
  ): SimilarityResult[] {
    const similarities = candidates.map((candidate, index) => ({
      index,
      similarity: this.cosineSimilarity(query, candidate)
    }));

    return similarities
      .filter(result => result.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  /**
   * Normalize embedding to unit vector
   */
  normalize(embedding: number[]): number[] {
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (norm === 0) return embedding;
    return embedding.map(val => val / norm);
  }

  /**
   * Calculate embedding dimensionality
   */
  getDimensionality(embedding: number[]): number {
    return embedding.length;
  }

  /**
   * Validate embedding format
   */
  validateEmbedding(embedding: number[]): boolean {
    if (!Array.isArray(embedding)) return false;
    if (embedding.length === 0) return false;
    return embedding.every(val => typeof val === 'number' && !isNaN(val));
  }

  /**
   * Get provider metrics
   */
  getMetrics(): EmbeddingMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      requests: 0,
      tokens: 0,
      errors: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageLatency: 0,
      lastRequest: new Date()
    };
  }

  /**
   * Test provider with a simple embedding request
   */
  async test(text: string = 'Hello, world!'): Promise<boolean> {
    try {
      const response = await this.embed({ input: text });
      return response.embeddings.length > 0 && this.validateEmbedding(response.embeddings[0]);
    } catch (error) {
      console.warn(`${this.getProviderName()} test failed:`, error);
      return false;
    }
  }

  // Protected helper methods

  protected async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected updateMetrics(latency: number, tokens: number, errors: number): void {
    this.metrics.requests++;
    this.metrics.tokens += tokens;
    this.metrics.errors += errors;
    this.metrics.lastRequest = new Date();
    
    // Update average latency
    this.metrics.averageLatency = 
      (this.metrics.averageLatency * (this.metrics.requests - 1) + latency) / this.metrics.requests;
  }

  protected createError(message: string, code?: string, statusCode?: number): EmbeddingProviderError {
    const error = new Error(message) as EmbeddingProviderError;
    error.provider = this.getProviderName();
    error.code = code;
    error.statusCode = statusCode;
    return error;
  }

  protected async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          break;
        }
        
        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        await this.delay(delay);
        
        console.warn(`${this.getProviderName()} attempt ${attempt + 1} failed, retrying in ${delay.toFixed(0)}ms...`);
      }
    }
    
    throw lastError!;
  }

  protected validateInput(input: string | string[]): void {
    if (Array.isArray(input)) {
      if (input.length === 0) {
        throw new Error('Input array cannot be empty');
      }
      
      const capabilities = this.getCapabilities();
      if (input.length > capabilities.maxBatchSize) {
        throw new Error(`Batch size ${input.length} exceeds maximum ${capabilities.maxBatchSize}`);
      }
      
      for (const text of input) {
        if (typeof text !== 'string') {
          throw new Error('All inputs must be strings');
        }
        if (text.length > capabilities.maxInputLength) {
          throw new Error(`Input length ${text.length} exceeds maximum ${capabilities.maxInputLength}`);
        }
      }
    } else {
      if (typeof input !== 'string') {
        throw new Error('Input must be a string or array of strings');
      }
      
      const capabilities = this.getCapabilities();
      if (input.length > capabilities.maxInputLength) {
        throw new Error(`Input length ${input.length} exceeds maximum ${capabilities.maxInputLength}`);
      }
    }
  }

  protected formatInput(input: string | string[]): string[] {
    return Array.isArray(input) ? input : [input];
  }

  protected createStandardError(error: any, operation: string): EmbeddingProviderError {
    let message = `${operation} failed`;
    let code = 'UNKNOWN_ERROR';
    let statusCode: number | undefined;
    
    if (error.response) {
      statusCode = error.response.status;
      message = error.response.data?.error?.message || error.response.statusText || message;
      
      if (statusCode === 401) {
        code = 'INVALID_API_KEY';
        message = 'Invalid API key';
      } else if (statusCode === 429) {
        code = 'RATE_LIMIT_EXCEEDED';
        message = 'Rate limit exceeded';
      } else if (statusCode >= 500) {
        code = 'SERVER_ERROR';
        message = 'Server error';
      }
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      code = 'NETWORK_ERROR';
      message = 'Network connection failed';
    } else {
      message = error.message || message;
    }
    
    return this.createError(message, code, statusCode);
  }
}
