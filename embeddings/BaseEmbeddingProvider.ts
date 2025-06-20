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
  SimilarityResult,
  EmbeddingCache
} from './types';
import { BaseCache, CacheManager } from '../utils/CacheManager';
import { createHash } from 'crypto';

export abstract class BaseEmbeddingProvider implements EmbeddingCache {
  protected apiKey: string;
  protected baseURL?: string;
  protected timeout: number = 30000;
  protected cache: BaseCache<number[]>;
  protected metrics: EmbeddingMetrics = {
    requests: 0,
    tokens: 0,
    errors: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageLatency: 0,
    lastRequest: new Date()
  };

  constructor(apiKey: string, baseURL?: string, timeout?: number, cacheConfig?: any) {
    this.apiKey = apiKey;
    if (baseURL !== undefined) this.baseURL = baseURL;
    if (timeout) this.timeout = timeout;

    // Initialize cache
    const providerName = this.constructor.name.replace('EmbeddingProvider', '').toLowerCase();
    const cacheName = `${providerName}-embeddings`;
    this.cache = CacheManager.getCache<number[]>(cacheName) || 
                 CacheManager.createLRUCache<number[]>(cacheName, {
                   maxSize: cacheConfig?.maxSize || 10000,
                   defaultTTL: cacheConfig?.defaultTTL || 7 * 24 * 60 * 60 * 1000, // 7 days
                   ...cacheConfig
                 });
  }

  /**
   * Generate embeddings for input text(s) - abstract method for providers to implement
   */
  abstract embedUncached(request: EmbeddingRequest): Promise<EmbeddingResponse>;

  /**
   * Generate embeddings with caching
   */
  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    
    // Handle single input
    if (typeof request.input === 'string') {
      const cacheKey = this.generateCacheKey(request.input, request.model);
      
      // Try cache first
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        this.metrics.cacheHits++;
        return {
          embeddings: [cached],
          usage: { promptTokens: 0, totalTokens: 0 }, // Cached, no tokens used
          model: request.model || 'unknown',
          dimensions: cached.length
        };
      }

      // Generate new embedding
      const response = await this.embedUncached(request);
      
      // Cache the result if single embedding
      if (response.embeddings.length === 1) {
        await this.cache.set(cacheKey, response.embeddings[0]!);
      }
      
      this.metrics.cacheMisses++;
      return response;
    }

    // Handle array input - cache each individually
    const inputs = Array.isArray(request.input) ? request.input : [request.input];
    const cachedEmbeddings: (number[] | null)[] = [];
    const uncachedInputs: string[] = [];
    const uncachedIndices: number[] = [];

    // Check cache for each input
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i]!;
      const cacheKey = this.generateCacheKey(input, request.model);
      const cached = await this.cache.get(cacheKey);
      
      if (cached) {
        cachedEmbeddings[i] = cached;
        this.metrics.cacheHits++;
      } else {
        cachedEmbeddings[i] = null;
        uncachedInputs.push(input);
        uncachedIndices.push(i);
        this.metrics.cacheMisses++;
      }
    }

    // Generate embeddings for uncached inputs
    let uncachedResponse: EmbeddingResponse | null = null;
    if (uncachedInputs.length > 0) {
      uncachedResponse = await this.embedUncached({
        ...request,
        input: uncachedInputs
      });

      // Cache new embeddings
      for (let i = 0; i < uncachedInputs.length; i++) {
        const input = uncachedInputs[i]!;
        const embedding = uncachedResponse.embeddings[i]!;
        const cacheKey = this.generateCacheKey(input, request.model);
        await this.cache.set(cacheKey, embedding);
      }
    }

    // Combine cached and uncached results
    const finalEmbeddings: number[][] = [];
    let uncachedIndex = 0;

    for (let i = 0; i < inputs.length; i++) {
      if (cachedEmbeddings[i]) {
        finalEmbeddings[i] = cachedEmbeddings[i]!;
      } else {
        finalEmbeddings[i] = uncachedResponse!.embeddings[uncachedIndex]!;
        uncachedIndex++;
      }
    }

    return {
      embeddings: finalEmbeddings,
      usage: uncachedResponse?.usage || { promptTokens: 0, totalTokens: 0 },
      model: request.model || 'unknown',
      dimensions: finalEmbeddings[0]?.length || 0
    };
  }

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
          const embeddingRequest: EmbeddingRequest = {
            input: batch
          };
          if (request.model !== undefined) embeddingRequest.model = request.model;
          if (request.dimensions !== undefined) embeddingRequest.dimensions = request.dimensions;
          
          const response = await this.embed(embeddingRequest);

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
      const embeddingError = new Error(`Batch embedding failed: ${(error as Error).message}`) as EmbeddingProviderError;
      embeddingError.provider = this.getProviderName();
      throw embeddingError;
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
      dotProduct += a[i]! * b[i]!;
      normA += a[i]! * a[i]!;
      normB += b[i]! * b[i]!;
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
      return response.embeddings.length > 0 && this.validateEmbedding(response.embeddings[0]!);
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
    if (code !== undefined) error.code = code;
    if (statusCode !== undefined) error.statusCode = statusCode;
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
      } else if (statusCode !== undefined && statusCode >= 500) {
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

  // Cache management methods (implementing EmbeddingCache interface)
  
  /**
   * Generate cache key for embedding
   */
  protected generateCacheKey(input: string, model?: string): string {
    const data = `${input}:${model || 'default'}`;
    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Get embedding from cache
   */
  async get(key: string): Promise<number[] | null> {
    return this.cache.get(key);
  }

  /**
   * Set embedding in cache
   */
  async set(key: string, embedding: number[], ttl?: number): Promise<void> {
    return this.cache.set(key, embedding, ttl);
  }

  /**
   * Clear all cached embeddings
   */
  async clear(): Promise<void> {
    await this.cache.clear();
    this.metrics.cacheHits = 0;
    this.metrics.cacheMisses = 0;
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size();
  }

  /**
   * Get cache metrics combined with embedding metrics
   */
  getCacheMetrics() {
    return {
      ...this.cache.getMetrics(),
      embeddings: this.getMetrics()
    };
  }
}
