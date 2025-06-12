/**
 * Mistral AI Adapter with Agents API and latest models
 * Supports Mistral OCR 25.05, Agents API, and specialized models
 */

import { BaseAdapter } from './BaseAdapter';
import { GenerateOptions, StreamOptions, LLMResponse, ModelInfo, ProviderCapabilities } from './types';

export class MistralAdapter extends BaseAdapter {
  readonly name = 'mistral';
  readonly baseUrl = 'https://api.mistral.ai/v1';

  constructor() {
    super('MISTRAL_API_KEY', 'mistral-medium-3');
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<LLMResponse> {
    return this.withRetry(async () => {
      try {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            ...this.buildHeaders(),
            'Authorization': `Bearer ${this.apiKey}`
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
          toolCalls: data.choices[0].message.tool_calls
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
            'Authorization': `Bearer ${this.apiKey}`
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
    const models = [
      {
        id: 'mistral-medium-3',
        name: 'Mistral Medium 3',
        contextWindow: 128000,
        maxOutputTokens: 4096,
        features: ['chat', 'function_calling', 'json_mode']
      },
      {
        id: 'mistral-small-3.1-25.03',
        name: 'Mistral Small 3.1',
        contextWindow: 128000,
        maxOutputTokens: 4096,
        features: ['chat', 'multimodal', 'function_calling']
      },
      {
        id: 'mistral-ocr-25.05',
        name: 'Mistral OCR 25.05',
        contextWindow: 32000,
        maxOutputTokens: 4096,
        features: ['ocr', 'document_understanding']
      },
      {
        id: 'codestral-25.01',
        name: 'Codestral 25.01',
        contextWindow: 32000,
        maxOutputTokens: 4096,
        features: ['code_generation', 'code_completion']
      }
    ];

    return models.map(model => ({
      id: model.id,
      name: model.name,
      contextWindow: model.contextWindow,
      maxOutputTokens: model.maxOutputTokens,
      supportsJSON: model.features.includes('json_mode'),
      supportsImages: model.features.includes('multimodal'),
      supportsFunctions: model.features.includes('function_calling'),
      supportsStreaming: true,
      supportsThinking: false,
      costPer1kTokens: this.getCostPer1kTokens(model.id)
    }));
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsStreaming: true,
      supportsJSON: true,
      supportsImages: true,
      supportsFunctions: true,
      supportsThinking: false,
      maxContextWindow: 128000,
      supportedFeatures: [
        'chat_completions',
        'agents_api',
        'function_calling',
        'json_mode',
        'ocr',
        'code_generation',
        'streaming'
      ]
    };
  }

  private getCostPer1kTokens(modelId: string): { input: number; output: number } | undefined {
    const costs: Record<string, { input: number; output: number }> = {
      'mistral-medium-3': { input: 0.0025, output: 0.0075 },
      'mistral-small-3.1-25.03': { input: 0.001, output: 0.003 },
      'mistral-ocr-25.05': { input: 0.15, output: 0.15 }, // Per 1M tokens
      'codestral-25.01': { input: 0.001, output: 0.003 }
    };
    return costs[modelId];
  }
}