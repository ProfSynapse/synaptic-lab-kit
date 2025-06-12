/**
 * Response Generator
 * Handles LLM response generation with persona and context integration
 */

import { BaseAdapter } from '../adapters/BaseAdapter';
import { BaseEmbeddingProvider } from '../embeddings/BaseEmbeddingProvider';
import { ResponseGenerationRequest, ResponseGenerationResult } from './types';

export class ResponseGenerator {
  private adapter?: BaseAdapter;
  private embeddingProvider?: BaseEmbeddingProvider;
  private model?: string;
  private temperature?: number;
  private maxRetries: number = 3;
  private timeout: number = 30000;

  configure(config: {
    adapter: BaseAdapter;
    embeddingProvider?: BaseEmbeddingProvider;
    model?: string;
    temperature?: number;
    maxRetries?: number;
    timeout?: number;
  }): void {
    this.adapter = config.adapter;
    this.embeddingProvider = config.embeddingProvider;
    this.model = config.model;
    this.temperature = config.temperature;
    this.maxRetries = config.maxRetries || 3;
    this.timeout = config.timeout || 30000;
  }

  async generate(request: ResponseGenerationRequest): Promise<ResponseGenerationResult> {
    if (!this.adapter) {
      throw new Error('Response generator not configured');
    }

    const startTime = Date.now();
    
    try {
      // Build prompt with persona and context
      const prompt = await this.buildPrompt(request);
      
      // Generate response
      const response = await this.adapter.generate(prompt, {
        model: this.model,
        temperature: request.options?.temperature || this.temperature,
        maxTokens: request.options?.maxTokens,
        stopSequences: request.options?.stopSequences,
        jsonMode: request.options?.jsonMode
      });
      
      const latency = Date.now() - startTime;
      
      return {
        content: response.content,
        metadata: {
          model: response.model,
          tokens: response.usage.totalTokens,
          latency,
          cost: this.calculateCost(response.usage.totalTokens, response.model),
          finishReason: response.finishReason
        },
        reasoning: response.reasoning,
        confidence: response.confidence
      };
    } catch (error) {
      throw new Error(`Response generation failed: ${(error as Error).message}`);
    }
  }

  private async buildPrompt(request: ResponseGenerationRequest): Promise<string> {
    let prompt = '';
    
    // Add system context
    if (request.context) {
      prompt += `Context: ${request.context}\n\n`;
    }
    
    // Add persona information
    if (request.persona) {
      prompt += `You are ${request.persona.name}. ${request.persona.description}\n`;
      prompt += `Background: ${request.persona.background}\n`;
      
      const patterns = request.persona.behaviorPatterns;
      prompt += `Behavior: You make decisions ${patterns.decisionSpeed}ly, have ${patterns.riskTolerance} risk tolerance, `;
      prompt += `prefer ${patterns.detailLevel} details, and communicate in a ${patterns.communicationStyle} style.\n\n`;
    }
    
    // Add scenario instructions
    if (request.scenario?.instructions) {
      prompt += `Instructions: ${request.scenario.instructions}\n\n`;
    }
    
    // Add the main prompt
    prompt += request.prompt;
    
    // Replace variables
    if (request.variables) {
      for (const [key, value] of Object.entries(request.variables)) {
        prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
      }
    }
    
    return prompt;
  }

  private calculateCost(tokens: number, model: string): number {
    // Simple cost calculation - would be provider-specific in reality
    const costPer1kTokens = 0.002; // Default rate
    return (tokens / 1000) * costPer1kTokens;
  }
}
