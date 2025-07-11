/**
 * Grok (xAI) Model Specifications
 * Updated January 2025 with latest model releases
 */

import { ModelSpec } from '../modelTypes';

export const GROK_MODELS: ModelSpec[] = [
  // Grok 3 - Flagship model
  {
    provider: 'grok',
    name: 'Grok 3',
    apiName: 'grok-3',
    contextWindow: 131072, // 131k tokens
    maxTokens: 32768,
    inputCostPerMillion: 3.00,
    outputCostPerMillion: 15.00,
    capabilities: {
      supportsJSON: true,
      supportsImages: false, // Vision coming soon
      supportsFunctions: true,
      supportsStreaming: true,
      supportsThinking: false
    }
  },
  
  // Grok 3 Mini - Lightweight reasoning model
  {
    provider: 'grok',
    name: 'Grok 3 Mini',
    apiName: 'grok-3-mini',
    contextWindow: 131072, // 131k tokens
    maxTokens: 32768,
    inputCostPerMillion: 0.30,
    outputCostPerMillion: 0.50,
    capabilities: {
      supportsJSON: true,
      supportsImages: false, // Vision coming soon
      supportsFunctions: true,
      supportsStreaming: true,
      supportsThinking: true // Excels at quantitative tasks with reasoning
    }
  }
];

export const GROK_DEFAULT_MODEL = 'grok-3';