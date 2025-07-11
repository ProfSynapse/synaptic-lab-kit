/**
 * Grok (xAI) Adapter
 * Supports Grok 3 and Grok 3 Mini models via xAI API
 * OpenAI-compatible REST API
 * Based on 2025 API documentation
 */

import OpenAI from 'openai';
import { BaseAdapter } from '../BaseAdapter';
import { 
  GenerateOptions, 
  StreamOptions, 
  LLMResponse, 
  ModelInfo, 
  ProviderCapabilities,
  CostDetails 
} from '../types';
import { ModelRegistry } from '../ModelRegistry';
import { LLMProviderError } from '../types';

export class GrokAdapter extends BaseAdapter {
  readonly name = 'grok';
  readonly baseUrl = 'https://api.x.ai/v1';
  
  private client: OpenAI;

  constructor(model?: string) {
    super('XAI_API_KEY', model || 'grok-3', 'https://api.x.ai/v1');
    
    // Since Grok API is OpenAI-compatible, we can use the OpenAI SDK
    this.client = new OpenAI({
      apiKey: this.apiKey,
      baseURL: this.baseUrl
    });

    this.initializeCache();
  }

  async generateUncached(prompt: string, options?: GenerateOptions): Promise<LLMResponse> {
    try {
      const params: any = {
        model: options?.model || this.currentModel,
        messages: this.buildMessages(prompt, options?.systemPrompt)
      };

      // Add optional parameters
      if (options?.temperature !== undefined) params.temperature = options.temperature;
      if (options?.maxTokens !== undefined) params.max_tokens = options.maxTokens;
      if (options?.topP !== undefined) params.top_p = options.topP;
      if (options?.frequencyPenalty !== undefined) params.frequency_penalty = options.frequencyPenalty;
      if (options?.presencePenalty !== undefined) params.presence_penalty = options.presencePenalty;
      if (options?.jsonMode) params.response_format = { type: 'json_object' };
      if (options?.stopSequences) params.stop = options.stopSequences;
      if (options?.tools) params.tools = options.tools;

      const completion = await this.client.chat.completions.create(params);
      
      const choice = completion.choices[0];
      if (!choice) {
        throw new LLMProviderError('No response choice returned', this.name, 'EMPTY_RESPONSE');
      }
      
      const usage = this.extractUsage(completion);
      
      return await this.buildLLMResponse(
        choice.message?.content || '',
        completion.model,
        usage,
        {
          grokId: completion.id,
          systemFingerprint: (completion as any).system_fingerprint
        },
        choice.finish_reason as any,
        choice.message?.tool_calls
      );
    } catch (error) {
      throw this.handleError(error, 'generation');
    }
  }

  async generateStream(prompt: string, options?: StreamOptions): Promise<LLMResponse> {
    try {
      const streamParams: any = {
        model: options?.model || this.currentModel,
        messages: this.buildMessages(prompt, options?.systemPrompt),
        stream: true
      };

      // Add optional parameters
      if (options?.temperature !== undefined) streamParams.temperature = options.temperature;
      if (options?.maxTokens !== undefined) streamParams.max_tokens = options.maxTokens;
      if (options?.topP !== undefined) streamParams.top_p = options.topP;
      if (options?.frequencyPenalty !== undefined) streamParams.frequency_penalty = options.frequencyPenalty;
      if (options?.presencePenalty !== undefined) streamParams.presence_penalty = options.presencePenalty;
      if (options?.jsonMode) streamParams.response_format = { type: 'json_object' };
      if (options?.stopSequences) streamParams.stop = options.stopSequences;
      if (options?.tools) streamParams.tools = options.tools;

      const stream = await this.client.chat.completions.create(streamParams);

      let fullText = '';
      let usage: any = undefined;
      let finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter' = 'stop';
      let model = this.currentModel;

      for await (const chunk of stream as any) {
        const delta = chunk.choices[0]?.delta?.content || '';
        if (delta) {
          fullText += delta;
          options?.onToken?.(delta);
        }
        
        if (chunk.usage) {
          usage = chunk.usage;
        }

        if (chunk.model) {
          model = chunk.model;
        }

        if (chunk.choices[0]?.finish_reason) {
          const reason = chunk.choices[0].finish_reason;
          if (reason === 'stop' || reason === 'length' || reason === 'tool_calls' || reason === 'content_filter') {
            finishReason = reason;
          }
        }
      }

      const extractedUsage = this.extractUsage({ usage });
      const response = await this.buildLLMResponse(
        fullText,
        model,
        extractedUsage,
        { streaming: true },
        finishReason
      );

      options?.onComplete?.(response);
      return response;
    } catch (error) {
      options?.onError?.(error as Error);
      throw this.handleError(error, 'streaming');
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    try {
      // Since xAI doesn't expose a models endpoint yet, we return hardcoded models
      const models = ModelRegistry.getProviderModels('grok');
      
      return models.map(model => ({
        id: model.apiName,
        name: model.name,
        contextWindow: model.contextWindow,
        maxOutputTokens: model.maxTokens,
        supportsJSON: model.capabilities.supportsJSON,
        supportsImages: model.capabilities.supportsImages,
        supportsFunctions: model.capabilities.supportsFunctions,
        supportsStreaming: model.capabilities.supportsStreaming,
        supportsThinking: model.capabilities.supportsThinking,
        pricing: {
          inputPerMillion: model.inputCostPerMillion,
          outputPerMillion: model.outputCostPerMillion,
          currency: 'USD',
          lastUpdated: '2025-01-11'
        }
      }));
    } catch (error) {
      throw this.handleError(error, 'listModels');
    }
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsStreaming: true,
      supportsJSON: true,
      supportsImages: false, // Vision capabilities coming soon
      supportsFunctions: true,
      supportsThinking: true, // Grok 3 Mini has reasoning capabilities
      maxContextWindow: 131072, // 131k tokens
      supportedFeatures: [
        'chat',
        'completion',
        'json_mode',
        'function_calling',
        'streaming',
        'reasoning' // Grok 3 Mini
      ]
    };
  }

  async getModelPricing(modelId: string): Promise<CostDetails | null> {
    const model = ModelRegistry.findModel('grok', modelId);
    if (!model) return null;

    return {
      inputCost: 0,
      outputCost: 0,
      totalCost: 0,
      currency: 'USD',
      rateInputPerMillion: model.inputCostPerMillion,
      rateOutputPerMillion: model.outputCostPerMillion
    };
  }

  // Override validateConfiguration to check for xAI API key
  protected validateConfiguration(): void {
    if (!this.apiKey) {
      throw new LLMProviderError(
        `XAI_API_KEY not configured for Grok. Get your API key from console.x.ai`,
        this.name,
        'MISSING_API_KEY'
      );
    }
  }

  // Override buildHeaders to add xAI-specific headers if needed
  protected buildHeaders(additionalHeaders?: Record<string, string>): Record<string, string> {
    return super.buildHeaders({
      'X-Provider': 'xAI',
      ...additionalHeaders
    });
  }
}