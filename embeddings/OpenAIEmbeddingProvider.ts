/**
 * OpenAI Embedding Provider
 * Implementation for OpenAI's embedding models
 * Based on latest 2025 API with text-embedding-3 models
 */

import axios, { AxiosInstance } from 'axios';
import { BaseEmbeddingProvider } from './BaseEmbeddingProvider';
import { 
  EmbeddingRequest, 
  EmbeddingResponse, 
  EmbeddingCapabilities,
  OpenAIEmbeddingConfig
} from './types';

export class OpenAIEmbeddingProvider extends BaseEmbeddingProvider {
  private client: AxiosInstance;
  private model: string;
  private dimensions?: number;

  constructor(config: Partial<OpenAIEmbeddingConfig> = {}) {
    const apiKey = config.apiKey || process.env.OPENAI_API_KEY || '';
    super(apiKey, config.baseURL, config.timeout);
    
    this.model = config.model || 'text-embedding-3-small';
    if (config.dimensions !== undefined) {
      this.dimensions = config.dimensions;
    }
    
    this.client = axios.create({
      baseURL: this.baseURL || 'https://api.openai.com/v1',
      timeout: this.timeout,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'synaptic-lab-kit/1.0.0'
      }
    });
  }

  async embedUncached(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const startTime = Date.now();
    
    try {
      this.validateInput(request.input);
      
      const inputs = this.formatInput(request.input);
      const model = request.model || this.model;
      const dimensions = request.dimensions || this.dimensions;
      
      const payload: any = {
        input: inputs,
        model,
        encoding_format: request.encodingFormat || 'float'
      };
      
      // Add dimensions if supported by model
      if (dimensions && this.supportsDimensions(model)) {
        payload.dimensions = dimensions;
      }
      
      if (request.user) {
        payload.user = request.user;
      }
      
      const response = await this.retryWithBackoff(async () => {
        return await this.client.post('/embeddings', payload);
      });
      
      const embeddings = response.data.data.map((item: any) => item.embedding);
      const usage = response.data.usage;
      
      const result: EmbeddingResponse = {
        embeddings,
        model: response.data.model,
        usage: {
          promptTokens: usage.prompt_tokens,
          totalTokens: usage.total_tokens
        },
        dimensions: embeddings[0]?.length || 0
      };
      
      this.updateMetrics(Date.now() - startTime, usage.total_tokens, 0);
      return result;
    } catch (error) {
      this.updateMetrics(Date.now() - startTime, 0, 1);
      throw this.createStandardError(error, 'OpenAI embedding');
    }
  }

  getCapabilities(): EmbeddingCapabilities {
    const modelCapabilities = this.getModelCapabilities(this.model);
    
    return {
      maxInputLength: 8191, // tokens, varies by model
      maxBatchSize: 2048,
      supportedDimensions: modelCapabilities.dimensions,
      supportsBatching: true,
      supportsCustomDimensions: modelCapabilities.customDimensions,
      defaultModel: 'text-embedding-3-small',
      availableModels: [
        'text-embedding-3-small',
        'text-embedding-3-large', 
        'text-embedding-ada-002'
      ]
    };
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }
    
    try {
      await this.client.get('/models');
      return true;
    } catch (error) {
      return false;
    }
  }

  getProviderName(): string {
    return 'openai';
  }

  /**
   * Get available models with their specifications
   */
  async getModels(): Promise<Array<{
    id: string;
    dimensions: number[];
    maxTokens: number;
    pricing: { per1k: number };
  }>> {
    return [
      {
        id: 'text-embedding-3-small',
        dimensions: [512, 1536], // Configurable
        maxTokens: 8191,
        pricing: { per1k: 0.00002 }
      },
      {
        id: 'text-embedding-3-large',
        dimensions: [256, 1024, 3072], // Configurable
        maxTokens: 8191,
        pricing: { per1k: 0.00013 }
      },
      {
        id: 'text-embedding-ada-002',
        dimensions: [1536], // Fixed
        maxTokens: 8191,
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
    // Rough approximation: 1 token ≈ 4 characters for English
    return Math.ceil(text.length / 4);
  }

  // Private helper methods

  private getModelCapabilities(model: string): {
    dimensions: number[];
    customDimensions: boolean;
  } {
    switch (model) {
      case 'text-embedding-3-small':
        return { dimensions: [512, 1536], customDimensions: true };
      case 'text-embedding-3-large':
        return { dimensions: [256, 1024, 3072], customDimensions: true };
      case 'text-embedding-ada-002':
        return { dimensions: [1536], customDimensions: false };
      default:
        return { dimensions: [1536], customDimensions: false };
    }
  }

  private supportsDimensions(model: string): boolean {
    return model.startsWith('text-embedding-3');
  }

  /**
   * Create provider with common configurations
   */
  static createSmall(apiKey?: string): OpenAIEmbeddingProvider {
    const config: Partial<OpenAIEmbeddingConfig> = {
      model: 'text-embedding-3-small',
      dimensions: 1536
    };
    if (apiKey !== undefined) {
      config.apiKey = apiKey;
    }
    return new OpenAIEmbeddingProvider(config);
  }

  static createLarge(apiKey?: string): OpenAIEmbeddingProvider {
    const config: Partial<OpenAIEmbeddingConfig> = {
      model: 'text-embedding-3-large',
      dimensions: 3072
    };
    if (apiKey !== undefined) {
      config.apiKey = apiKey;
    }
    return new OpenAIEmbeddingProvider(config);
  }

  static createAda(apiKey?: string): OpenAIEmbeddingProvider {
    const config: Partial<OpenAIEmbeddingConfig> = {
      model: 'text-embedding-ada-002'
    };
    if (apiKey !== undefined) {
      config.apiKey = apiKey;
    }
    return new OpenAIEmbeddingProvider(config);
  }
}
