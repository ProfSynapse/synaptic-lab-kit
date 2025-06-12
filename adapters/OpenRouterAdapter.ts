/**
 * OpenRouter Adapter for 400+ models
 * Supports OpenRouter's unified API with model variants
 */

import { BaseAdapter } from './BaseAdapter';
import { GenerateOptions, StreamOptions, LLMResponse, ModelInfo, ProviderCapabilities } from './types';

export class OpenRouterAdapter extends BaseAdapter {
  readonly name = 'openrouter';
  readonly baseUrl = 'https://openrouter.ai/api/v1';

  constructor() {
    super('OPENROUTER_API_KEY', 'anthropic/claude-3.5-sonnet');
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<LLMResponse> {
    return this.withRetry(async () => {
      try {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            ...this.buildHeaders(),
            'Authorization': `Bearer ${this.apiKey}`,
            'HTTP-Referer': 'https://synaptic-lab-kit.com',
            'X-Title': 'Synaptic Lab Kit'
          },
          body: JSON.stringify({
            model: options?.model || this.currentModel,
            messages: this.buildMessages(prompt, options?.systemPrompt),
            temperature: options?.temperature,
            max_tokens: options?.maxTokens,
            response_format: options?.jsonMode ? { type: 'json_object' } : undefined,
            stop: options?.stopSequences,
            tools: options?.tools
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        return {
          text: data.choices[0].message.content || '',
          model: data.model,
          provider: this.name,
          usage: this.extractUsage(data),
          finishReason: data.choices[0].finish_reason,
          toolCalls: data.choices[0].message.tool_calls,
          metadata: {
            provider_used: data.provider,
            cost: data.cost
          }
        };
      } catch (error) {
        this.handleError(error, 'generation');
      }
    });
  }

  async generateStream(prompt: string, options?: StreamOptions): Promise<LLMResponse> {
    return this.withRetry(async () => {
      try {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            ...this.buildHeaders(),
            'Authorization': `Bearer ${this.apiKey}`,
            'HTTP-Referer': 'https://synaptic-lab-kit.com',
            'X-Title': 'Synaptic Lab Kit'
          },
          body: JSON.stringify({
            model: options?.model || this.currentModel,
            messages: this.buildMessages(prompt, options?.systemPrompt),
            temperature: options?.temperature,
            max_tokens: options?.maxTokens,
            stream: true
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        let fullText = '';
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim());

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;

              try {
                const parsed = JSON.parse(data);
                const deltaText = parsed.choices[0]?.delta?.content || '';
                if (deltaText) {
                  fullText += deltaText;
                  options?.onToken?.(deltaText);
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }

        const result: LLMResponse = {
          text: fullText,
          model: options?.model || this.currentModel,
          provider: this.name,
          finishReason: 'stop'
        };

        options?.onComplete?.(result);
        return result;
      } catch (error) {
        options?.onError?.(error as Error);
        this.handleError(error, 'streaming generation');
      }
    });
  }

  async listModels(): Promise<ModelInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      return data.data.map((model: any) => ({
        id: model.id,
        name: model.name || model.id,
        contextWindow: model.context_length || 8192,
        maxOutputTokens: model.max_completion_tokens || 4096,
        supportsJSON: true, // Most models support JSON through OpenRouter
        supportsImages: model.modalities?.includes('image') || false,
        supportsFunctions: model.modalities?.includes('tool') || false,
        supportsStreaming: true,
        supportsThinking: false,
        costPer1kTokens: {
          input: parseFloat(model.pricing?.prompt || '0') * 1000,
          output: parseFloat(model.pricing?.completion || '0') * 1000
        }
      }));
    } catch (error) {
      // Fallback to popular models if API call fails
      return this.getPopularModels();
    }
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsStreaming: true,
      supportsJSON: true,
      supportsImages: true,
      supportsFunctions: true,
      supportsThinking: false,
      maxContextWindow: 2000000, // Varies by model
      supportedFeatures: [
        'chat_completions',
        'model_routing',
        'fallback_providers',
        'cost_optimization',
        'streaming',
        'function_calling',
        'json_mode',
        'free_models'
      ]
    };
  }

  // Model variants
  addModelVariant(baseModel: string, variant: 'free' | 'nitro' | 'floor' | 'online'): string {
    return `${baseModel}:${variant}`;
  }

  private getPopularModels(): ModelInfo[] {
    const models = [
      'anthropic/claude-3.5-sonnet',
      'openai/gpt-4-turbo-preview',
      'google/gemini-2.5-flash',
      'meta-llama/llama-3.2-90b-vision-instruct',
      'mistralai/mistral-medium-3',
      'anthropic/claude-3.5-haiku'
    ];

    return models.map(id => ({
      id,
      name: this.getModelDisplayName(id),
      contextWindow: 128000,
      maxOutputTokens: 4096,
      supportsJSON: true,
      supportsImages: true,
      supportsFunctions: true,
      supportsStreaming: true,
      supportsThinking: false
    }));
  }

  private getModelDisplayName(modelId: string): string {
    const parts = modelId.split('/');
    return parts[parts.length - 1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
}