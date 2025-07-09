/**
 * Ollama Embedding Provider
 * Implementation for Ollama's embedding models (nomic-embed-text)
 * Local inference with no API key required
 */

import { BaseEmbeddingProvider } from './BaseEmbeddingProvider';
import { 
  EmbeddingRequest, 
  EmbeddingResponse, 
  EmbeddingCapabilities
} from './types';
import { encode } from 'gpt-tokenizer';

export interface OllamaEmbeddingConfig {
  baseURL?: string;
  model?: string;
  timeout?: number;
}

export interface OllamaEmbeddingAPIResponse {
  embedding: number[];
}

export class OllamaEmbeddingProvider extends BaseEmbeddingProvider {
  protected baseURL: string;
  private model: string;
  protected timeout: number;

  constructor(config: OllamaEmbeddingConfig = {}) {
    // Ollama doesn't need API key - pass empty string
    const baseURL = config.baseURL || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    super('', baseURL, config.timeout);
    
    this.baseURL = baseURL;
    this.model = config.model || 'nomic-embed-text:latest';
    this.timeout = config.timeout || 30000;
  }

  async embedUncached(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const startTime = Date.now();
    
    try {
      this.validateInput(request.input);
      
      const inputs = this.formatInput(request.input);
      const model = request.model || this.model;
      
      const embeddings: number[][] = [];
      let totalTokens = 0;
      
      // Process each input individually (Ollama embedding API handles single inputs)
      for (const input of inputs) {
        const response = await this.makeRequest('/api/embeddings', {
          model,
          prompt: input
        });
        
        if (!response.embedding || !Array.isArray(response.embedding)) {
          throw new Error('Invalid embedding response from Ollama');
        }
        
        embeddings.push(response.embedding);
        totalTokens += this.countTokens(input);
      }
      
      // Update metrics
      this.updateMetrics(Date.now() - startTime, totalTokens, 0);
      
      return {
        embeddings,
        usage: {
          promptTokens: totalTokens,
          totalTokens
        },
        model,
        dimensions: embeddings[0]?.length || 0
      };
      
    } catch (error) {
      this.updateMetrics(Date.now() - startTime, 0, 1);
      throw this.createStandardError(error, 'Embedding generation');
    }
  }

  getCapabilities(): EmbeddingCapabilities {
    return {
      maxInputLength: 8192, // Typical context window for nomic-embed-text
      maxBatchSize: 100, // Process in batches for efficiency
      supportedDimensions: [768], // nomic-embed-text standard dimensions
      supportsBatching: true,
      supportsCustomDimensions: false,
      defaultModel: 'nomic-embed-text:latest',
      availableModels: ['nomic-embed-text:latest']
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/api/version`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  getProviderName(): string {
    return 'ollama';
  }

  /**
   * Check if the embedding model is available
   */
  async isModelAvailable(modelName?: string): Promise<boolean> {
    const model = modelName || this.model;
    try {
      const response = await fetch(`${this.baseURL}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      
      if (!response.ok) {
        return false;
      }
      
      const data = await response.json() as { models?: Array<{ name: string }> };
      return data.models?.some(m => m.name === model) || false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Pull the embedding model if not available
   */
  async pullModel(modelName?: string): Promise<boolean> {
    const model = modelName || this.model;
    try {
      const response = await this.makeRequest('/api/pull', { name: model });
      return response.status === 'success';
    } catch (error) {
      console.error(`Failed to pull model ${model}:`, error);
      return false;
    }
  }

  /**
   * Get model information
   */
  async getModelInfo(modelName?: string): Promise<any> {
    const model = modelName || this.model;
    try {
      const response = await this.makeRequest('/api/show', { name: model });
      return response;
    } catch (error) {
      console.error(`Failed to get model info for ${model}:`, error);
      return null;
    }
  }

  // Private helper methods

  private async makeRequest(endpoint: string, body: any): Promise<any> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeout)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error (${response.status}): ${errorText}`);
    }

    return await response.json();
  }

  private countTokens(text: string): number {
    try {
      // Use gpt-tokenizer for fast, accurate token counting
      const tokens = encode(text);
      return tokens.length;
    } catch (error) {
      // Fallback to character-based estimation if encoding fails
      // Use improved hybrid approach
      const words = text.trim().split(/\s+/).length;
      const chars = text.length;
      
      // Hybrid estimate: average of word-based and character-based
      const wordBasedEstimate = Math.ceil(words * 1.3); // ~1.3 tokens per word
      const charBasedEstimate = Math.ceil(chars / 3.5); // ~3.5 chars per token
      
      return Math.ceil((wordBasedEstimate + charBasedEstimate) / 2);
    }
  }

  /**
   * Cleanup resources (no cleanup needed for gpt-tokenizer)
   */
  dispose(): void {
    // gpt-tokenizer doesn't require cleanup
  }
}