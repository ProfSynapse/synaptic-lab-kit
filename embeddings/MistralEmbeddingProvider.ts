/**
 * Mistral AI Embedding Provider
 * Implementation for Mistral's embedding models
 * Based on latest 2025 API
 */

import axios, { AxiosInstance } from 'axios';
import { BaseEmbeddingProvider } from './BaseEmbeddingProvider';
import { 
  EmbeddingRequest, 
  EmbeddingResponse, 
  EmbeddingCapabilities,
  MistralEmbeddingConfig
} from './types';

export class MistralEmbeddingProvider extends BaseEmbeddingProvider {
  private client: AxiosInstance;
  private model: string;

  constructor(config: Partial<MistralEmbeddingConfig> = {}) {
    const apiKey = config.apiKey || process.env.MISTRAL_API_KEY || '';
    super(apiKey, config.baseURL, config.timeout);
    
    this.model = config.model || 'mistral-embed';
    
    this.client = axios.create({
      baseURL: this.baseURL || 'https://api.mistral.ai/v1',
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
        model,
        input: inputs,
        encoding_format: request.encodingFormat || 'float'
      };
      
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
      throw this.createStandardError(error, 'Mistral embedding');
    }
  }

  getCapabilities(): EmbeddingCapabilities {
    const modelCapabilities = this.getModelCapabilities(this.model);
    
    return {
      maxInputLength: modelCapabilities.maxTokens,
      maxBatchSize: 512, // Mistral batch limit
      supportedDimensions: [modelCapabilities.dimensions],
      supportsBatching: true,
      supportsCustomDimensions: false,
      defaultModel: 'mistral-embed',
      availableModels: [
        'mistral-embed'
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
    return 'mistral';
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
        id: 'mistral-embed',
        dimensions: 1024,
        maxTokens: 8192,
        description: 'Mistral embedding model',
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
   * Get list of available models from API
   */
  async getAvailableModels(): Promise<Array<{
    id: string;
    object: string;
    created: number;
    owned_by: string;
  }>> {
    try {
      const response = await this.client.get('/models');
      return response.data.data.filter((model: any) => 
        model.id.includes('embed')
      );
    } catch (error) {
      console.warn('Failed to get available models:', error);
      return [];
    }
  }

  // Private helper methods

  private getModelCapabilities(model: string): {
    dimensions: number;
    maxTokens: number;
  } {
    switch (model) {
      case 'mistral-embed':
        return { dimensions: 1024, maxTokens: 8192 };
      default:
        return { dimensions: 1024, maxTokens: 8192 };
    }
  }

  /**
   * Create provider with common configurations
   */
  static createDefault(apiKey?: string): MistralEmbeddingProvider {
    return new MistralEmbeddingProvider({
      apiKey,
      model: 'mistral-embed'
    });
  }
}
