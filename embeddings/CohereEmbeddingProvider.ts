/**
 * Cohere Embedding Provider
 * Implementation for Cohere's embedding models
 * Based on latest 2025 API with v3.0 models
 */

import axios, { AxiosInstance } from 'axios';
import { BaseEmbeddingProvider } from './BaseEmbeddingProvider';
import { 
  EmbeddingRequest, 
  EmbeddingResponse, 
  EmbeddingCapabilities,
  CohereEmbeddingConfig
} from './types';

export class CohereEmbeddingProvider extends BaseEmbeddingProvider {
  private client: AxiosInstance;
  private model: string;
  private inputType: 'search_document' | 'search_query' | 'classification' | 'clustering';
  private truncate: 'NONE' | 'START' | 'END';

  constructor(config: Partial<CohereEmbeddingConfig> = {}) {
    const apiKey = config.apiKey || process.env.COHERE_API_KEY || '';
    super(apiKey, config.baseURL, config.timeout);
    
    this.model = config.model || 'embed-english-v3.0';
    this.inputType = config.inputType || 'search_document';
    this.truncate = config.truncate || 'END';
    
    this.client = axios.create({
      baseURL: this.baseURL || 'https://api.cohere.ai/v1',
      timeout: this.timeout,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'synaptic-lab-kit/1.0.0'
      }
    });
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const startTime = Date.now();
    
    try {
      this.validateInput(request.input);
      
      const inputs = this.formatInput(request.input);
      const model = request.model || this.model;
      
      const payload: any = {
        texts: inputs,
        model,
        input_type: this.inputType,
        truncate: this.truncate
      };
      
      const response = await this.retryWithBackoff(async () => {
        return await this.client.post('/embed', payload);
      });
      
      const embeddings = response.data.embeddings;
      const usage = response.data.meta?.billed_units || {};
      
      const result: EmbeddingResponse = {
        embeddings,
        model: response.data.model || model,
        usage: {
          promptTokens: usage.input_tokens || 0,
          totalTokens: usage.input_tokens || 0
        },
        dimensions: embeddings[0]?.length || 0
      };
      
      this.updateMetrics(Date.now() - startTime, usage.input_tokens || 0, 0);
      return result;
    } catch (error) {
      this.updateMetrics(Date.now() - startTime, 0, 1);
      throw this.createStandardError(error, 'Cohere embedding');
    }
  }

  getCapabilities(): EmbeddingCapabilities {
    const modelCapabilities = this.getModelCapabilities(this.model);
    
    return {
      maxInputLength: modelCapabilities.maxTokens,
      maxBatchSize: 96, // Cohere batch limit
      supportedDimensions: [modelCapabilities.dimensions],
      supportsBatching: true,
      supportsCustomDimensions: false,
      defaultModel: 'embed-english-v3.0',
      availableModels: [
        'embed-english-v3.0',
        'embed-multilingual-v3.0',
        'embed-english-light-v3.0',
        'embed-multilingual-light-v3.0'
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
    return 'cohere';
  }

  /**
   * Set input type for embeddings
   */
  setInputType(type: 'search_document' | 'search_query' | 'classification' | 'clustering'): void {
    this.inputType = type;
  }

  /**
   * Set truncation strategy
   */
  setTruncate(truncate: 'NONE' | 'START' | 'END'): void {
    this.truncate = truncate;
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
        id: 'embed-english-v3.0',
        dimensions: 1024,
        maxTokens: 512,
        description: 'English embedding model v3.0',
        pricing: { per1k: 0.0001 }
      },
      {
        id: 'embed-multilingual-v3.0',
        dimensions: 1024,
        maxTokens: 512,
        description: 'Multilingual embedding model v3.0',
        pricing: { per1k: 0.0001 }
      },
      {
        id: 'embed-english-light-v3.0',
        dimensions: 384,
        maxTokens: 512,
        description: 'Lightweight English embedding model v3.0',
        pricing: { per1k: 0.0001 }
      },
      {
        id: 'embed-multilingual-light-v3.0',
        dimensions: 384,
        maxTokens: 512,
        description: 'Lightweight multilingual embedding model v3.0',
        pricing: { per1k: 0.0001 }
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
   * Perform semantic search with reranking
   */
  async rerankSearch(
    query: string,
    documents: string[],
    options: {
      topK?: number;
      model?: string;
    } = {}
  ): Promise<Array<{ index: number; relevanceScore: number; document: string }>> {
    try {
      const payload = {
        model: options.model || 'rerank-english-v3.0',
        query,
        documents,
        top_k: options.topK || documents.length,
        return_documents: true
      };
      
      const response = await this.client.post('/rerank', payload);
      
      return response.data.results.map((result: any) => ({
        index: result.index,
        relevanceScore: result.relevance_score,
        document: result.document.text
      }));
    } catch (error) {
      throw this.createStandardError(error, 'Cohere rerank');
    }
  }

  // Private helper methods

  private getModelCapabilities(model: string): {
    dimensions: number;
    maxTokens: number;
  } {
    switch (model) {
      case 'embed-english-v3.0':
      case 'embed-multilingual-v3.0':
        return { dimensions: 1024, maxTokens: 512 };
      case 'embed-english-light-v3.0':
      case 'embed-multilingual-light-v3.0':
        return { dimensions: 384, maxTokens: 512 };
      default:
        return { dimensions: 1024, maxTokens: 512 };
    }
  }

  /**
   * Create provider with common configurations
   */
  static createEnglish(apiKey?: string): CohereEmbeddingProvider {
    return new CohereEmbeddingProvider({
      apiKey,
      model: 'embed-english-v3.0',
      inputType: 'search_document'
    });
  }

  static createMultilingual(apiKey?: string): CohereEmbeddingProvider {
    return new CohereEmbeddingProvider({
      apiKey,
      model: 'embed-multilingual-v3.0',
      inputType: 'search_document'
    });
  }

  static createEnglishLight(apiKey?: string): CohereEmbeddingProvider {
    return new CohereEmbeddingProvider({
      apiKey,
      model: 'embed-english-light-v3.0',
      inputType: 'search_document'
    });
  }

  static createMultilingualLight(apiKey?: string): CohereEmbeddingProvider {
    return new CohereEmbeddingProvider({
      apiKey,
      model: 'embed-multilingual-light-v3.0',
      inputType: 'search_document'
    });
  }

  static createForSearch(apiKey?: string, isQuery: boolean = false): CohereEmbeddingProvider {
    return new CohereEmbeddingProvider({
      apiKey,
      model: 'embed-english-v3.0',
      inputType: isQuery ? 'search_query' : 'search_document'
    });
  }

  static createForClassification(apiKey?: string): CohereEmbeddingProvider {
    return new CohereEmbeddingProvider({
      apiKey,
      model: 'embed-english-v3.0',
      inputType: 'classification'
    });
  }

  static createForClustering(apiKey?: string): CohereEmbeddingProvider {
    return new CohereEmbeddingProvider({
      apiKey,
      model: 'embed-english-v3.0',
      inputType: 'clustering'
    });
  }
}
