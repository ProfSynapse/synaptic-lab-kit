/**
 * OpenAI Adapter with Responses API support
 * Supports latest OpenAI features including the new Responses API
 * Based on 2025 API documentation
 */

import OpenAI from 'openai';
import { BaseAdapter } from './BaseAdapter';
import { 
  GenerateOptions, 
  StreamOptions, 
  LLMResponse, 
  ModelInfo, 
  LLMProviderError,
  ProviderCapabilities 
} from './types';
import { getProviderPricing } from './pricing';

export class OpenAIAdapter extends BaseAdapter {
  readonly name = 'openai';
  readonly baseUrl = 'https://api.openai.com/v1';
  
  private client: OpenAI;
  private supportsResponsesAPI: boolean = false;

  constructor() {
    super('OPENAI_API_KEY', 'gpt-4-turbo-preview');
    
    this.client = new OpenAI({
      apiKey: this.apiKey,
      organization: process.env.OPENAI_ORG_ID,
      project: process.env.OPENAI_PROJECT_ID
    });

    // Check if Responses API is available
    this.checkResponsesAPIAvailability();
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<LLMResponse> {
    return this.withRetry(async () => {
      try {
        // Try new Responses API first if available
        if (this.supportsResponsesAPI) {
          return await this.generateWithResponsesAPI(prompt, options);
        }
        
        // Fallback to Chat Completions
        return await this.generateWithChatCompletions(prompt, options);
      } catch (error) {
        this.handleError(error, 'generation');
      }
    });
  }

  async generateStream(prompt: string, options?: StreamOptions): Promise<LLMResponse> {
    return this.withRetry(async () => {
      try {
        const stream = await this.client.chat.completions.create({
          model: options?.model || this.currentModel,
          messages: this.buildMessages(prompt, options?.systemPrompt),
          stream: true,
          temperature: options?.temperature,
          max_tokens: options?.maxTokens,
          response_format: options?.jsonMode ? { type: 'json_object' } : undefined,
          stop: options?.stopSequences,
          tools: options?.tools
        });

        let fullText = '';
        let usage: any = undefined;

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content || '';
          if (delta) {
            fullText += delta;
            options?.onToken?.(delta);
          }
          
          if (chunk.usage) {
            usage = chunk.usage;
          }
        }

        const extractedUsage = this.extractUsage({ usage });
        const response = this.buildLLMResponse(
          fullText,
          this.currentModel,
          extractedUsage,
          undefined,
          'stop'
        );

        options?.onComplete?.(response);
        return response;
      } catch (error) {
        options?.onError?.(error as Error);
        this.handleError(error, 'streaming generation');
      }
    });
  }

  async listModels(): Promise<ModelInfo[]> {
    try {
      const response = await this.client.models.list();
      
      return response.data
        .filter(model => model.id.startsWith('gpt-'))
        .map(model => ({
          id: model.id,
          name: this.getModelDisplayName(model.id),
          contextWindow: this.getContextWindow(model.id),
          maxOutputTokens: this.getMaxOutputTokens(model.id),
          supportsJSON: this.supportsJSON(model.id),
          supportsImages: this.supportsImages(model.id),
          supportsFunctions: this.supportsFunctions(model.id),
          supportsStreaming: true,
          supportsThinking: false, // OpenAI doesn't have thinking mode like Gemini/Claude
          pricing: this.getModelPricingInfo(model.id)
        }));
    } catch (error) {
      this.handleError(error, 'listing models');
    }
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsStreaming: true,
      supportsJSON: true,
      supportsImages: true,
      supportsFunctions: true,
      supportsThinking: false,
      maxContextWindow: 128000, // GPT-4 Turbo
      supportedFeatures: [
        'chat_completions',
        'responses_api',
        'function_calling',
        'json_mode',
        'vision',
        'streaming',
        'web_search',
        'file_search'
      ]
    };
  }

  // Private methods
  private async generateWithResponsesAPI(prompt: string, options?: GenerateOptions): Promise<LLMResponse> {
    try {
      // Note: This is based on the new Responses API documentation
      // The actual implementation may vary when the API is fully released
      const response = await (this.client as any).responses.create({
        model: options?.model || this.currentModel,
        messages: this.buildMessages(prompt, options?.systemPrompt),
        temperature: options?.temperature,
        max_tokens: options?.maxTokens,
        response_format: options?.jsonMode ? { type: 'json_object' } : undefined,
        tools: options?.tools,
        web_search: options?.webSearch,
        file_search: options?.fileSearch
      });

      const extractedUsage = this.extractUsage(response);
      return this.buildLLMResponse(
        response.choices[0].message.content || '',
        response.model,
        extractedUsage,
        undefined,
        response.choices[0].finish_reason,
        response.choices[0].message.tool_calls
      );
    } catch (error) {
      // If Responses API fails, fall back to Chat Completions
      console.warn('Responses API failed, falling back to Chat Completions');
      this.supportsResponsesAPI = false;
      return this.generateWithChatCompletions(prompt, options);
    }
  }

  private async generateWithChatCompletions(prompt: string, options?: GenerateOptions): Promise<LLMResponse> {
    const response = await this.client.chat.completions.create({
      model: options?.model || this.currentModel,
      messages: this.buildMessages(prompt, options?.systemPrompt),
      temperature: options?.temperature,
      max_tokens: options?.maxTokens,
      response_format: options?.jsonMode ? { type: 'json_object' } : undefined,
      stop: options?.stopSequences,
      tools: options?.tools
    });

    const extractedUsage = this.extractUsage(response);
    return this.buildLLMResponse(
      response.choices[0].message.content || '',
      response.model,
      extractedUsage,
      undefined,
      response.choices[0].finish_reason,
      response.choices[0].message.tool_calls
    );
  }

  private async checkResponsesAPIAvailability(): Promise<void> {
    try {
      // Try to access responses endpoint to check if it's available
      await (this.client as any).responses?.list?.();
      this.supportsResponsesAPI = true;
      console.log('✅ OpenAI Responses API available');
    } catch (error) {
      this.supportsResponsesAPI = false;
      console.log('ℹ️ OpenAI Responses API not available, using Chat Completions');
    }
  }

  private getModelDisplayName(modelId: string): string {
    const displayNames: Record<string, string> = {
      'gpt-4-turbo-preview': 'GPT-4 Turbo (Preview)',
      'gpt-4o': 'GPT-4o',
      'gpt-4': 'GPT-4',
      'gpt-3.5-turbo': 'GPT-3.5 Turbo'
    };
    return displayNames[modelId] || modelId;
  }

  private getContextWindow(modelId: string): number {
    const contextWindows: Record<string, number> = {
      'gpt-4-turbo-preview': 128000,
      'gpt-4o': 128000,
      'gpt-4': 8192,
      'gpt-3.5-turbo': 16385
    };
    return contextWindows[modelId] || 8192;
  }

  private getMaxOutputTokens(modelId: string): number {
    const maxOutputTokens: Record<string, number> = {
      'gpt-4-turbo-preview': 4096,
      'gpt-4o': 4096,
      'gpt-4': 4096,
      'gpt-3.5-turbo': 4096
    };
    return maxOutputTokens[modelId] || 4096;
  }

  private supportsJSON(modelId: string): boolean {
    return [
      'gpt-4-turbo-preview',
      'gpt-4o',
      'gpt-3.5-turbo'
    ].includes(modelId);
  }

  private supportsImages(modelId: string): boolean {
    return [
      'gpt-4-turbo-preview',
      'gpt-4o'
    ].includes(modelId);
  }

  private supportsFunctions(modelId: string): boolean {
    return [
      'gpt-4-turbo-preview',
      'gpt-4o',
      'gpt-4',
      'gpt-3.5-turbo'
    ].includes(modelId);
  }

  protected getModelPricing(model: string): {
    inputPerMillion: number;
    outputPerMillion: number;
    currency: string;
  } {
    const pricing = getProviderPricing('openai', model);
    if (pricing) {
      return {
        inputPerMillion: pricing.inputPerMillion,
        outputPerMillion: pricing.outputPerMillion,
        currency: pricing.currency
      };
    }

    // Fallback pricing if not found in pricing table
    const fallbackPricing: Record<string, { inputPerMillion: number; outputPerMillion: number }> = {
      'gpt-4-turbo-preview': { inputPerMillion: 10, outputPerMillion: 30 },
      'gpt-4o': { inputPerMillion: 5, outputPerMillion: 20 },
      'gpt-4': { inputPerMillion: 30, outputPerMillion: 60 },
      'gpt-3.5-turbo': { inputPerMillion: 0.5, outputPerMillion: 1.5 }
    };

    const fallback = fallbackPricing[model];
    return {
      inputPerMillion: fallback?.inputPerMillion || 5,
      outputPerMillion: fallback?.outputPerMillion || 20,
      currency: 'USD'
    };
  }

  private getModelPricingInfo(modelId: string): {
    inputPerMillion: number;
    outputPerMillion: number;
    currency: string;
    lastUpdated: string;
  } {
    const pricing = getProviderPricing('openai', modelId);
    if (pricing) {
      return pricing;
    }

    // Fallback
    const fallback = this.getModelPricing(modelId);
    return {
      ...fallback,
      lastUpdated: '2025-01-10'
    };
  }
}