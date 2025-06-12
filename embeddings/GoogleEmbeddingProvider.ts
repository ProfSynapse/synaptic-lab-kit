/**
 * Google AI Embedding Provider
 * Implementation for Google's embedding models
 * Based on latest 2025 API with text-embedding-004
 */

import axios, { AxiosInstance } from 'axios';
import { BaseEmbeddingProvider } from './BaseEmbeddingProvider';
import { 
  EmbeddingRequest, 
  EmbeddingResponse, 
  EmbeddingCapabilities,
  GoogleEmbeddingConfig
} from './types';

export class GoogleEmbeddingProvider extends BaseEmbeddingProvider {
  private client: AxiosInstance;
  private model: string;
  private taskType: 'RETRIEVAL_QUERY' | 'RETRIEVAL_DOCUMENT' | 'SEMANTIC_SIMILARITY' | 'CLASSIFICATION' | 'CLUSTERING';

  constructor(config: Partial<GoogleEmbeddingConfig> = {}) {
    const apiKey = config.apiKey || process.env.GOOGLE_AI_API_KEY || '';
    super(apiKey, config.baseURL, config.timeout);
    
    this.model = config.model || 'text-embedding-004';
    this.taskType = config.taskType || 'RETRIEVAL_DOCUMENT';
    
    this.client = axios.create({
      baseURL: this.baseURL || 'https://generativelanguage.googleapis.com/v1beta',
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'synaptic-lab-kit/1.0.0'
      },
      params: {
        key: this.apiKey
      }
    });
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const startTime = Date.now();
    
    try {
      this.validateInput(request.input);
      
      const inputs = this.formatInput(request.input);
      const model = request.model || this.model;
      
      // For batch requests, we need to make multiple calls
      if (inputs.length > 1) {
        return await this.embedBatchInternal(inputs, model);
      }
      
      const payload: any = {
        model: `models/${model}`,
        content: {
          parts: [{ text: inputs[0] }]
        },
        taskType: this.taskType
      };
      
      const response = await this.retryWithBackoff(async () => {
        return await this.client.post(`/models/${model}:embedContent`, payload);
      });
      
      const embedding = response.data.embedding.values;
      
      const result: EmbeddingResponse = {
        embeddings: [embedding],
        model: model,
        usage: {
          promptTokens: this.countTokens(inputs[0]),
          totalTokens: this.countTokens(inputs[0])
        },
        dimensions: embedding.length
      };
      
      this.updateMetrics(Date.now() - startTime, result.usage.totalTokens, 0);
      return result;
    } catch (error) {
      this.updateMetrics(Date.now() - startTime, 0, 1);
      throw this.createStandardError(error, 'Google AI embedding');
    }
  }

  private async embedBatchInternal(inputs: string[], model: string): Promise<EmbeddingResponse> {
    const embeddings: number[][] = [];
    let totalTokens = 0;
    
    // Process each input individually (Google AI doesn't support batch embedding)
    for (const input of inputs) {
      const payload = {
        model: `models/${model}`,
        content: {
          parts: [{ text: input }]
        },
        taskType: this.taskType
      };
      
      const response = await this.retryWithBackoff(async () => {
        return await this.client.post(`/models/${model}:embedContent`, payload);
      });
      
      embeddings.push(response.data.embedding.values);
      totalTokens += this.countTokens(input);
      
      // Rate limiting delay
      await this.delay(100);
    }
    
    return {
      embeddings,
      model,
      usage: {
        promptTokens: totalTokens,
        totalTokens
      },
      dimensions: embeddings[0]?.length || 0
    };
  }

  getCapabilities(): EmbeddingCapabilities {
    const modelCapabilities = this.getModelCapabilities(this.model);
    
    return {
      maxInputLength: modelCapabilities.maxTokens,
      maxBatchSize: 1, // Google AI processes one at a time
      supportedDimensions: [modelCapabilities.dimensions],
      supportsBatching: false, // Not natively, but we simulate it
      supportsCustomDimensions: false,
      defaultModel: 'text-embedding-004',
      availableModels: [
        'text-embedding-004',
        'text-multilingual-embedding-002'
      ]
    };
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }
    
    try {
      // Test with a simple embedding request
      await this.embed({ input: 'test' });
      return true;
    } catch (error) {
      return false;
    }
  }

  getProviderName(): string {
    return 'google';
  }

  /**
   * Set task type for embeddings
   */
  setTaskType(type: 'RETRIEVAL_QUERY' | 'RETRIEVAL_DOCUMENT' | 'SEMANTIC_SIMILARITY' | 'CLASSIFICATION' | 'CLUSTERING'): void {
    this.taskType = type;
  }

  /**
   * Get available models with their specifications
   */
  async getModels(): Promise<Array<{
    id: string;
    dimensions: number;
    maxTokens: number;
    description: string;
    pricing: { per1k: number };
  }>> {
    return [
      {
        id: 'text-embedding-004',
        dimensions: 768,
        maxTokens: 2048,
        description: 'Latest English text embedding model',
        pricing: { per1k: 0.000025 } // Very competitive pricing
      },
      {
        id: 'text-multilingual-embedding-002',
        dimensions: 768,
        maxTokens: 2048,
        description: 'Multilingual text embedding model',
        pricing: { per1k: 0.000025 }
      }
    ];
  }

  /**
   * Estimate cost for embedding request
   */
  async estimateCost(inputTokens: number, model?: string): Promise<number> {
    const models = await this.getModels();
    const targetModel = models.find(m => m.id === (model || this.model));
    
    if (!targetModel) {
      throw new Error(`Unknown model: ${model || this.model}`);
    }
    
    return (inputTokens / 1000) * targetModel.pricing.per1k;
  }

  /**
   * Count tokens in text (approximate)
   */
  countTokens(text: string): number {
    // Rough approximation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Generate embeddings with specific task optimization
   */
  async embedForTask(
    input: string | string[],
    task: 'query' | 'document' | 'similarity' | 'classification' | 'clustering'
  ): Promise<EmbeddingResponse> {
    const taskTypeMap = {
      query: 'RETRIEVAL_QUERY',
      document: 'RETRIEVAL_DOCUMENT',
      similarity: 'SEMANTIC_SIMILARITY',
      classification: 'CLASSIFICATION',
      clustering: 'CLUSTERING'
    } as const;
    
    const originalTaskType = this.taskType;
    this.taskType = taskTypeMap[task];
    
    try {
      return await this.embed({ input });
    } finally {
      this.taskType = originalTaskType;
    }
  }

  // Private helper methods

  private getModelCapabilities(model: string): {
    dimensions: number;
    maxTokens: number;
  } {
    switch (model) {
      case 'text-embedding-004':
      case 'text-multilingual-embedding-002':
        return { dimensions: 768, maxTokens: 2048 };
      default:
        return { dimensions: 768, maxTokens: 2048 };
    }
  }

  /**
   * Create provider with common configurations
   */
  static createEnglish(apiKey?: string): GoogleEmbeddingProvider {
    return new GoogleEmbeddingProvider({
      apiKey,
      model: 'text-embedding-004',
      taskType: 'RETRIEVAL_DOCUMENT'
    });
  }

  static createMultilingual(apiKey?: string): GoogleEmbeddingProvider {
    return new GoogleEmbeddingProvider({
      apiKey,
      model: 'text-multilingual-embedding-002',
      taskType: 'RETRIEVAL_DOCUMENT'
    });
  }

  static createForRetrieval(apiKey?: string, isQuery: boolean = false): GoogleEmbeddingProvider {
    return new GoogleEmbeddingProvider({
      apiKey,
      model: 'text-embedding-004',
      taskType: isQuery ? 'RETRIEVAL_QUERY' : 'RETRIEVAL_DOCUMENT'
    });
  }

  static createForSimilarity(apiKey?: string): GoogleEmbeddingProvider {
    return new GoogleEmbeddingProvider({
      apiKey,
      model: 'text-embedding-004',
      taskType: 'SEMANTIC_SIMILARITY'
    });
  }

  static createForClassification(apiKey?: string): GoogleEmbeddingProvider {
    return new GoogleEmbeddingProvider({
      apiKey,
      model: 'text-embedding-004',
      taskType: 'CLASSIFICATION'
    });
  }

  static createForClustering(apiKey?: string): GoogleEmbeddingProvider {
    return new GoogleEmbeddingProvider({
      apiKey,
      model: 'text-embedding-004',
      taskType: 'CLUSTERING'
    });
  }
}
