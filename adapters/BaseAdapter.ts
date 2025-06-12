/**
 * Base LLM Adapter
 * Abstract class that all provider adapters extend
 * Based on patterns from services/llm/BaseLLMProvider.ts
 */

import { 
  GenerateOptions, 
  StreamOptions, 
  LLMResponse, 
  ModelInfo, 
  LLMProviderError,
  ProviderConfig,
  ProviderCapabilities,
  TokenUsage,
  CostDetails
} from './types';

export abstract class BaseAdapter {
  abstract readonly name: string;
  abstract readonly baseUrl: string;
  
  protected apiKey: string;
  protected currentModel: string;
  protected config: ProviderConfig;

  constructor(envKeyName: string, defaultModel: string, baseUrl?: string) {
    this.apiKey = process.env[envKeyName] || '';
    this.currentModel = defaultModel;
    
    if (!this.apiKey) {
      console.warn(`⚠️ ${envKeyName} not found in environment variables`);
    }

    this.config = {
      apiKey: this.apiKey,
      baseUrl: baseUrl || this.baseUrl
    };

    this.validateConfiguration();
  }

  // Abstract methods that each provider must implement
  abstract generate(prompt: string, options?: GenerateOptions): Promise<LLMResponse>;
  abstract generateStream(prompt: string, options?: StreamOptions): Promise<LLMResponse>;
  abstract listModels(): Promise<ModelInfo[]>;
  abstract getCapabilities(): ProviderCapabilities;

  // Common implementations
  async generateJSON(prompt: string, schema?: any, options?: GenerateOptions): Promise<any> {
    try {
      const response = await this.generate(prompt, { 
        ...options, 
        jsonMode: true 
      });
      
      const parsed = JSON.parse(response.text);
      
      // Basic schema validation if provided
      if (schema && !this.validateSchema(parsed, schema)) {
        throw new LLMProviderError(
          'Response does not match expected schema',
          this.name,
          'SCHEMA_VALIDATION_ERROR'
        );
      }
      
      return parsed;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new LLMProviderError(
          `Invalid JSON response: ${error.message}`,
          this.name,
          'JSON_PARSE_ERROR',
          error
        );
      }
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }
    
    try {
      await this.listModels();
      return true;
    } catch (error) {
      console.warn(`Provider ${this.name} unavailable:`, error);
      return false;
    }
  }

  setModel(model: string): void {
    this.currentModel = model;
  }

  getCurrentModel(): string {
    return this.currentModel;
  }

  getApiKey(): string {
    return this.apiKey ? '***' + this.apiKey.slice(-4) : 'NOT_SET';
  }

  // Helper methods
  protected validateConfiguration(): void {
    if (!this.apiKey) {
      throw new LLMProviderError(
        `API key not configured for ${this.name}`,
        this.name,
        'MISSING_API_KEY'
      );
    }
  }

  protected buildHeaders(additionalHeaders?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Synaptic-Lab-Kit/1.0.0',
      ...additionalHeaders
    };

    return headers;
  }

  protected handleError(error: any, operation: string): never {
    if (error instanceof LLMProviderError) {
      throw error;
    }

    if (error.response) {
      // HTTP error
      const status = error.response.status;
      const message = error.response.data?.error?.message || error.message;
      
      let errorCode = 'HTTP_ERROR';
      if (status === 401) errorCode = 'AUTHENTICATION_ERROR';
      if (status === 403) errorCode = 'PERMISSION_ERROR';
      if (status === 429) errorCode = 'RATE_LIMIT_ERROR';
      if (status >= 500) errorCode = 'SERVER_ERROR';

      throw new LLMProviderError(
        `${operation} failed: ${message}`,
        this.name,
        errorCode,
        error
      );
    }

    throw new LLMProviderError(
      `${operation} failed: ${error.message}`,
      this.name,
      'UNKNOWN_ERROR',
      error
    );
  }

  protected validateSchema(data: any, schema: any): boolean {
    // Basic schema validation - could be enhanced with a proper validator
    if (typeof schema !== 'object' || schema === null) {
      return true;
    }

    if (schema.type) {
      const expectedType = schema.type;
      const actualType = Array.isArray(data) ? 'array' : typeof data;
      
      if (expectedType !== actualType) {
        return false;
      }
    }

    if (schema.properties && typeof data === 'object') {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (schema.required?.includes(key) && !(key in data)) {
          return false;
        }
        
        if (key in data && !this.validateSchema(data[key], propSchema)) {
          return false;
        }
      }
    }

    return true;
  }

  protected buildMessages(prompt: string, systemPrompt?: string): any[] {
    const messages: any[] = [];
    
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    
    messages.push({ role: 'user', content: prompt });
    
    return messages;
  }

  protected extractUsage(response: any): TokenUsage | undefined {
    // Default implementation - override in specific adapters
    if (response.usage) {
      return {
        promptTokens: response.usage.prompt_tokens || response.usage.input_tokens || 0,
        completionTokens: response.usage.completion_tokens || response.usage.output_tokens || 0,
        totalTokens: response.usage.total_tokens || 0
      };
    }
    return undefined;
  }

  // Cost calculation methods
  protected calculateCost(usage: TokenUsage, model: string): CostDetails {
    const modelInfo = this.getModelPricing(model);
    
    const inputCost = (usage.promptTokens / 1_000_000) * modelInfo.inputPerMillion;
    const outputCost = (usage.completionTokens / 1_000_000) * modelInfo.outputPerMillion;
    const totalCost = inputCost + outputCost;

    return {
      inputCost,
      outputCost,
      totalCost,
      currency: modelInfo.currency,
      rateInputPerMillion: modelInfo.inputPerMillion,
      rateOutputPerMillion: modelInfo.outputPerMillion
    };
  }

  protected abstract getModelPricing(model: string): {
    inputPerMillion: number;
    outputPerMillion: number;
    currency: string;
  };

  protected buildLLMResponse(
    content: string,
    model: string,
    usage?: TokenUsage,
    metadata?: Record<string, any>,
    finishReason?: 'stop' | 'length' | 'tool_calls' | 'content_filter',
    toolCalls?: any[]
  ): LLMResponse {
    const response: LLMResponse = {
      text: content,
      model,
      provider: this.name,
      usage,
      metadata,
      finishReason,
      toolCalls
    };

    // Calculate cost if usage is available
    if (usage) {
      response.cost = this.calculateCost(usage, model);
    }

    return response;
  }

  // Rate limiting and retry logic
  protected async withRetry<T>(
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
        
        // Don't retry on certain errors
        if (error instanceof LLMProviderError) {
          if (['AUTHENTICATION_ERROR', 'PERMISSION_ERROR', 'MISSING_API_KEY'].includes(error.code || '')) {
            throw error;
          }
        }
        
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt);
          console.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError!;
  }
}