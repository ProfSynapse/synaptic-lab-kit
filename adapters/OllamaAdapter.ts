/**
 * Ollama Adapter
 * Connects to local Ollama server for cost-effective LLM inference
 * Supports multiple local models including Llama, Qwen, DeepSeek-R1
 */

import { BaseAdapter } from './BaseAdapter';
import { LLMResponse, GenerateOptions, StreamOptions, ModelInfo, ProviderCapabilities, CostDetails } from './types';

export interface OllamaConfig {
  baseUrl?: string; // Default: http://localhost:11434
  timeout?: number;
  model?: string;
}

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export class OllamaAdapter extends BaseAdapter {
  readonly name = 'ollama';
  readonly baseUrl: string;
  private timeout: number;
  private defaultModel: string;

  constructor(config: OllamaConfig = {}) {
    // Calculate values before super() call
    const baseUrl = config.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const defaultModel = config.model || 'llama3.1:8b';
    
    // Set dummy API key to avoid BaseAdapter warning
    process.env.OLLAMA_API_KEY_TEMP = 'not-required';
    super('OLLAMA_API_KEY_TEMP', defaultModel, baseUrl);
    delete process.env.OLLAMA_API_KEY_TEMP;
    
    // Now we can safely set instance properties
    this.baseUrl = baseUrl;
    this.timeout = config.timeout || 120000; // 2 minutes default
    this.defaultModel = defaultModel;
    
    // Override with empty API key since Ollama doesn't need one
    this.apiKey = '';
    this.config = {
      apiKey: '',
      baseUrl: this.baseUrl
    };

    // Initialize cache for response caching
    this.initializeCache();
  }

  // Override validation since Ollama doesn't need API keys
  protected validateConfiguration(): void {
    // Skip API key validation for local Ollama
  }

  /**
   * Generate response from Ollama model (uncached)
   */
  async generateUncached(prompt: string, options: GenerateOptions = {}): Promise<LLMResponse> {
    const startTime = Date.now();
    
    try {
      const model = options.model || this.defaultModel;
      
      // Prepare messages
      const messages: OllamaMessage[] = [
        { role: 'user', content: prompt }
      ];

      // Add system message if provided
      if (options.systemPrompt) {
        messages.unshift({ role: 'system', content: options.systemPrompt });
      }

      const requestBody = {
        model,
        messages,
        stream: false,
        options: {
          temperature: options.temperature || 0.7,
          top_p: options.topP || 0.9,
          num_predict: options.maxTokens || 2000,
          stop: options.stopSequences || [],
        }
      };

      const response = await this.makeRequest('/api/chat', requestBody);
      const endTime = Date.now();

      if (!response.message?.content) {
        throw new Error('No content in Ollama response');
      }

      // Calculate tokens (approximate based on response metadata)
      const promptTokens = response.prompt_eval_count || this.estimateTokens(prompt);
      const completionTokens = response.eval_count || this.estimateTokens(response.message.content);
      const totalTokens = promptTokens + completionTokens;

      return {
        text: response.message.content,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens
        },
        model: response.model,
        provider: 'ollama',
        finishReason: response.done ? 'stop' : 'length',
        cost: {
          totalCost: 0, // Local models are free!
          inputCost: 0,
          outputCost: 0,
          currency: 'USD',
          rateInputPerMillion: 0,
          rateOutputPerMillion: 0
        },
        metadata: {
          provider: 'ollama',
          model: response.model,
          totalDuration: response.total_duration,
          loadDuration: response.load_duration,
          promptEvalDuration: response.prompt_eval_duration,
          evalDuration: response.eval_duration,
          latency: endTime - startTime
        }
      };

    } catch (error) {
      throw new Error(`Ollama generation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Generate JSON response with schema validation
   */
  async generateJSON(prompt: string, schema?: any, options: GenerateOptions = {}): Promise<any> {
    const jsonPrompt = schema 
      ? `${prompt}\n\nPlease respond with valid JSON that matches this schema: ${JSON.stringify(schema, null, 2)}`
      : `${prompt}\n\nPlease respond with valid JSON.`;

    const response = await this.generateUncached(jsonPrompt, {
      ...options,
      temperature: 0.1 // Lower temperature for more consistent JSON
    });

    try {
      return JSON.parse(response.text);
    } catch (error) {
      // Try to extract JSON from response if it's wrapped in text
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (parseError) {
          throw new Error(`Failed to parse JSON response: ${response.text}`);
        }
      }
      throw new Error(`Invalid JSON response: ${response.text}`);
    }
  }

  /**
   * Generate streaming response
   */
  async generateStream(
    prompt: string, 
    options: StreamOptions = {}
  ): Promise<LLMResponse> {
    const startTime = Date.now();
    
    try {
      const model = options.model || this.defaultModel;
      
      const messages: OllamaMessage[] = [
        { role: 'user', content: prompt }
      ];

      if (options.systemPrompt) {
        messages.unshift({ role: 'system', content: options.systemPrompt });
      }

      const requestBody = {
        model,
        messages,
        stream: true,
        options: {
          temperature: options.temperature || 0.7,
          top_p: options.topP || 0.9,
          num_predict: options.maxTokens || 2000,
          stop: options.stopSequences || [],
        }
      };

      let fullResponse = '';
      let finalResponse: OllamaResponse | null = null;

      await this.makeStreamRequest('/api/chat', requestBody, (chunk) => {
        if (chunk.message?.content) {
          const content = chunk.message.content;
          fullResponse += content;
          
          // Call the onToken callback if provided
          if (options.onToken) {
            options.onToken(content);
          }
        }
        
        if (chunk.done) {
          finalResponse = chunk;
        }
      });

      const endTime = Date.now();

      if (!finalResponse) {
        throw new Error('No final response received from Ollama stream');
      }

      const promptTokens = (finalResponse as OllamaResponse).prompt_eval_count || this.estimateTokens(prompt);
      const completionTokens = (finalResponse as OllamaResponse).eval_count || this.estimateTokens(fullResponse);
      const totalTokens = promptTokens + completionTokens;

      const response: LLMResponse = {
        text: fullResponse,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens
        },
        model: (finalResponse as OllamaResponse).model,
        provider: 'ollama',
        finishReason: (finalResponse as OllamaResponse).done ? 'stop' : 'length',
        cost: {
          totalCost: 0,
          inputCost: 0,
          outputCost: 0,
          currency: 'USD',
          rateInputPerMillion: 0,
          rateOutputPerMillion: 0
        },
        metadata: {
          provider: 'ollama',
          model: (finalResponse as OllamaResponse).model,
          totalDuration: (finalResponse as OllamaResponse).total_duration,
          loadDuration: (finalResponse as OllamaResponse).load_duration,
          promptEvalDuration: (finalResponse as OllamaResponse).prompt_eval_duration,
          evalDuration: (finalResponse as OllamaResponse).eval_duration,
          latency: endTime - startTime
        }
      };

      // Call the onComplete callback if provided
      if (options.onComplete) {
        options.onComplete(response);
      }

      return response;

    } catch (error) {
      // Call the onError callback if provided
      if (options.onError) {
        options.onError(error as Error);
      }
      throw new Error(`Ollama streaming failed: ${(error as Error).message}`);
    }
  }

  /**
   * List available models from Ollama
   */
  async listModels(): Promise<ModelInfo[]> {
    try {
      // Use GET request for listing models
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error (${response.status}): ${errorText}`);
      }

      const data = await response.json() as { models?: any[] };
      
      return data.models?.map((model: any) => ({
        id: model.name,
        name: model.name,
        contextWindow: model.details?.parameter_size ? 
          this.estimateContextLength(model.details.parameter_size) : 4096,
        maxOutputTokens: model.details?.parameter_size ? 
          this.estimateContextLength(model.details.parameter_size) : 4096,
        supportsJSON: true,
        supportsImages: false,
        supportsFunctions: false,
        supportsStreaming: true,
        supportsThinking: false,
        pricing: {
          inputPerMillion: 0,
          outputPerMillion: 0,
          currency: 'USD',
          lastUpdated: new Date().toISOString()
        }
      })) || [];

    } catch (error) {
      console.warn('Failed to list Ollama models:', error);
      return [];
    }
  }

  /**
   * Check if Ollama server is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/version`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Pull a model from Ollama registry
   */
  async pullModel(modelName: string): Promise<boolean> {
    try {
      const response = await this.makeRequest('/api/pull', { name: modelName });
      return response.status === 'success';
    } catch (error) {
      console.error(`Failed to pull model ${modelName}:`, error);
      return false;
    }
  }

  /**
   * Get provider capabilities
   */
  getCapabilities(): ProviderCapabilities {
    return {
      supportsStreaming: true,
      supportsJSON: true,
      supportsImages: false,
      supportsFunctions: false,
      supportsThinking: false,
      maxContextWindow: 32768,
      supportedFeatures: ['text', 'streaming', 'json', 'system_messages']
    };
  }

  /**
   * Get recommended models for doubt training
   */
  getRecommendedModels(): { reasoning: string[]; general: string[]; efficient: string[] } {
    return {
      reasoning: [
        'deepseek-r1:7b',
        'deepseek-r1:14b', 
        'deepseek-r1:32b',
        'qwq:32b',
        'qwen3:30b',
        'llama3.1-intuitive-thinker:8b'
      ],
      general: [
        'llama3.1:8b',
        'llama3.1:70b',
        'llama3.3:70b',
        'qwen3:8b',
        'qwen3:14b'
      ],
      efficient: [
        'llama3.2:3b',
        'qwen3:4b',
        'phi3:3.8b',
        'gemma2:2b'
      ]
    };
  }

  // Private helper methods

  /**
   * Make HTTP request to Ollama API
   */
  private async makeRequest(endpoint: string, body: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
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

  /**
   * Make streaming request to Ollama API
   */
  private async makeStreamRequest(
    endpoint: string, 
    body: any, 
    onChunk: (chunk: any) => void
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
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

    if (!response.body) {
      throw new Error('No response body for streaming');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            onChunk(data);
          } catch (error) {
            // Skip malformed JSON lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough approximation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Get model pricing (Ollama is free)
   */
  async getModelPricing(modelId: string): Promise<CostDetails | null> {
    // Ollama models are always free (local inference)
    console.debug(`Getting pricing for Ollama model: ${modelId}`);
    return {
      inputCost: 0,
      outputCost: 0,
      totalCost: 0,
      currency: 'USD',
      rateInputPerMillion: 0,
      rateOutputPerMillion: 0
    };
  }

  /**
   * Estimate context length based on parameter size
   */
  private estimateContextLength(parameterSize: string): number {
    // Common context lengths for different model sizes
    const sizeMap: Record<string, number> = {
      '7B': 8192,
      '8B': 8192,
      '13B': 8192,
      '14B': 8192,
      '30B': 8192,
      '32B': 32768,
      '70B': 8192,
    };

    for (const [size, contextLength] of Object.entries(sizeMap)) {
      if (parameterSize.includes(size)) {
        return contextLength;
      }
    }

    return 4096; // Default fallback
  }
}