/**
 * Voyage AI Embedding Provider
 * Implementation for Voyage AI's embedding models
 * Based on latest 2025 API
 */

import axios, { AxiosInstance } from 'axios';
import { BaseEmbeddingProvider } from './BaseEmbeddingProvider';
import { 
  EmbeddingRequest, 
  EmbeddingResponse, 
  EmbeddingCapabilities,
  VoyageEmbeddingConfig
} from './types';

export class VoyageEmbeddingProvider extends BaseEmbeddingProvider {
  private client: AxiosInstance;
  private model: string;
  private inputType: 'query' | 'document';

  constructor(config: Partial<VoyageEmbeddingConfig> = {}) {
    const apiKey = config.apiKey || process.env.VOYAGE_API_KEY || '';
    super(apiKey, config.baseURL, config.timeout);
    
    this.model = config.model || 'voyage-3';
    this.inputType = config.inputType || 'document';
    
    this.client = axios.create({
      baseURL: this.baseURL || 'https://api.voyageai.com/v1',
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
      
      const payload: any = {
        input: inputs,
        model,
        input_type: this.inputType
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
          promptTokens: usage.prompt_tokens || usage.total_tokens || 0,
          totalTokens: usage.total_tokens || 0
        },
        dimensions: embeddings[0]?.length || 0
      };
      
      this.updateMetrics(Date.now() - startTime, usage.total_tokens || 0, 0);
      return result;
    } catch (error) {
      this.updateMetrics(Date.now() - startTime, 0, 1);
      throw this.createStandardError(error, 'Voyage AI embedding');
    }
  }

  getCapabilities(): EmbeddingCapabilities {
    const modelCapabilities = this.getModelCapabilities(this.model);
    
    return {
      maxInputLength: modelCapabilities.maxTokens,
      maxBatchSize: 128, // Voyage AI batch limit
      supportedDimensions: [modelCapabilities.dimensions],
      supportsBatching: true,
      supportsCustomDimensions: false,
      defaultModel: 'voyage-3',
      availableModels: [
        'voyage-3',
        'voyage-3-lite',
        'voyage-finance-2',
        'voyage-multilingual-2',
        'voyage-law-2',
        'voyage-code-2'
      ]
    };
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }
    
    try {
      // Test with a simple embedding request
      await this.embedUncached({ input: 'test' });
      return true;
    } catch (error) {
      return false;
    }
  }

  getProviderName(): string {
    return 'voyage';
  }

  /**
   * Set input type for embeddings
   */
  setInputType(type: 'query' | 'document'): void {
    this.inputType = type;
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
        id: 'voyage-3',
        dimensions: 1024,
        maxTokens: 32000,
        description: 'Latest general-purpose embedding model',
        pricing: { per1k: 0.00012 }
      },
      {
        id: 'voyage-3-lite',
        dimensions: 512,
        maxTokens: 32000,
        description: 'Lightweight version of voyage-3',
        pricing: { per1k: 0.00007 }
      },
      {
        id: 'voyage-finance-2',
        dimensions: 1024,
        maxTokens: 32000,
        description: 'Optimized for finance and business content',
        pricing: { per1k: 0.00012 }
      },
      {
        id: 'voyage-multilingual-2',
        dimensions: 1024,
        maxTokens: 32000,
        description: 'Multilingual embedding model',
        pricing: { per1k: 0.00012 }
      },
      {
        id: 'voyage-law-2',
        dimensions: 1024,
        maxTokens: 32000,
        description: 'Optimized for legal documents',
        pricing: { per1k: 0.00012 }
      },
      {
        id: 'voyage-code-2',
        dimensions: 1536,
        maxTokens: 16000,
        description: 'Optimized for code and technical content',
        pricing: { per1k: 0.00012 }
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

  // Private helper methods

  private getModelCapabilities(model: string): {
    dimensions: number;
    maxTokens: number;
  } {
    switch (model) {
      case 'voyage-3':
        return { dimensions: 1024, maxTokens: 32000 };
      case 'voyage-3-lite':
        return { dimensions: 512, maxTokens: 32000 };
      case 'voyage-finance-2':
        return { dimensions: 1024, maxTokens: 32000 };
      case 'voyage-multilingual-2':
        return { dimensions: 1024, maxTokens: 32000 };
      case 'voyage-law-2':
        return { dimensions: 1024, maxTokens: 32000 };
      case 'voyage-code-2':
        return { dimensions: 1536, maxTokens: 16000 };
      default:
        return { dimensions: 1024, maxTokens: 32000 };
    }
  }

  /**
   * Create provider with common configurations
   */
  static createGeneral(apiKey?: string): VoyageEmbeddingProvider {
    const config: Partial<VoyageEmbeddingConfig> = {
      model: 'voyage-3',
      inputType: 'document'
    };
    if (apiKey !== undefined) {
      config.apiKey = apiKey;
    }
    return new VoyageEmbeddingProvider(config);
  }

  static createLite(apiKey?: string): VoyageEmbeddingProvider {
    const config: Partial<VoyageEmbeddingConfig> = {
      model: 'voyage-3-lite',
      inputType: 'document'
    };
    if (apiKey !== undefined) {
      config.apiKey = apiKey;
    }
    return new VoyageEmbeddingProvider(config);
  }

  static createFinance(apiKey?: string): VoyageEmbeddingProvider {
    const config: Partial<VoyageEmbeddingConfig> = {
      model: 'voyage-finance-2',
      inputType: 'document'
    };
    if (apiKey !== undefined) {
      config.apiKey = apiKey;
    }
    return new VoyageEmbeddingProvider(config);
  }

  static createCode(apiKey?: string): VoyageEmbeddingProvider {
    const config: Partial<VoyageEmbeddingConfig> = {
      model: 'voyage-code-2',
      inputType: 'document'
    };
    if (apiKey !== undefined) {
      config.apiKey = apiKey;
    }
    return new VoyageEmbeddingProvider(config);
  }

  static createMultilingual(apiKey?: string): VoyageEmbeddingProvider {
    const config: Partial<VoyageEmbeddingConfig> = {
      model: 'voyage-multilingual-2',
      inputType: 'document'
    };
    if (apiKey !== undefined) {
      config.apiKey = apiKey;
    }
    return new VoyageEmbeddingProvider(config);
  }

  static createLegal(apiKey?: string): VoyageEmbeddingProvider {
    const config: Partial<VoyageEmbeddingConfig> = {
      model: 'voyage-law-2',
      inputType: 'document'
    };
    if (apiKey !== undefined) {
      config.apiKey = apiKey;
    }
    return new VoyageEmbeddingProvider(config);
  }
}
