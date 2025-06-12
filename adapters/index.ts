/**
 * Adapter exports and factory functions
 * Provides unified access to all LLM providers
 */

export { BaseAdapter } from './BaseAdapter';
export * from './types';

// Provider implementations
export { OpenAIAdapter } from './OpenAIAdapter';
export { GoogleAdapter } from './GoogleAdapter';
export { AnthropicAdapter } from './AnthropicAdapter';
export { MistralAdapter } from './MistralAdapter';
export { OpenRouterAdapter } from './OpenRouterAdapter';
export { RequestyAdapter } from './RequestyAdapter';

import { BaseAdapter } from './BaseAdapter';
import { OpenAIAdapter } from './OpenAIAdapter';
import { GoogleAdapter } from './GoogleAdapter';
import { AnthropicAdapter } from './AnthropicAdapter';
import { MistralAdapter } from './MistralAdapter';
import { OpenRouterAdapter } from './OpenRouterAdapter';
import { RequestyAdapter } from './RequestyAdapter';
import { SupportedProvider, LLMProviderError } from './types';

/**
 * Factory function to create adapter instances
 */
export function createAdapter(provider: SupportedProvider): BaseAdapter {
  switch (provider.toLowerCase()) {
    case 'openai':
      return new OpenAIAdapter();
    case 'google':
    case 'gemini':
      return new GoogleAdapter();
    case 'anthropic':
    case 'claude':
      return new AnthropicAdapter();
    case 'mistral':
      return new MistralAdapter();
    case 'openrouter':
      return new OpenRouterAdapter();
    case 'requesty':
      return new RequestyAdapter();
    default:
      throw new LLMProviderError(
        `Unsupported provider: ${provider}`,
        'factory',
        'UNSUPPORTED_PROVIDER'
      );
  }
}

/**
 * Get all available providers
 */
export function getAvailableProviders(): SupportedProvider[] {
  return ['openai', 'google', 'anthropic', 'mistral', 'openrouter', 'requesty'];
}

/**
 * Check which providers are available (have API keys)
 */
export async function getAvailableProvidersWithKeys(): Promise<Array<{
  provider: SupportedProvider;
  available: boolean;
  error?: string;
}>> {
  const providers = getAvailableProviders();
  const results = await Promise.allSettled(
    providers.map(async (provider) => {
      try {
        const adapter = createAdapter(provider);
        const available = await adapter.isAvailable();
        return { provider, available };
      } catch (error) {
        return { 
          provider, 
          available: false, 
          error: (error as Error).message 
        };
      }
    })
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        provider: providers[index],
        available: false,
        error: result.reason?.message || 'Unknown error'
      };
    }
  });
}

/**
 * Auto-select best available provider based on criteria
 */
export async function selectBestProvider(criteria?: {
  requiresThinking?: boolean;
  requiresImages?: boolean;
  requiresFunctions?: boolean;
  prefersCost?: boolean;
  prefersSpeed?: boolean;
}): Promise<BaseAdapter | null> {
  const availableProviders = await getAvailableProvidersWithKeys();
  const available = availableProviders.filter(p => p.available);

  if (available.length === 0) {
    console.warn('No LLM providers available. Please check your API keys.');
    return null;
  }

  // Score providers based on criteria
  const providerScores = available.map(({ provider }) => {
    const adapter = createAdapter(provider);
    const capabilities = adapter.getCapabilities();
    let score = 1;

    if (criteria?.requiresThinking && capabilities.supportsThinking) score += 3;
    if (criteria?.requiresImages && capabilities.supportsImages) score += 2;
    if (criteria?.requiresFunctions && capabilities.supportsFunctions) score += 1;

    // Performance preferences (subjective weights based on 2025 performance)
    const performanceScores: Record<string, number> = {
      'google': 5,    // Gemini 2.5 Flash - best performance/cost
      'anthropic': 4, // Claude 4 - best reasoning
      'openai': 3,    // GPT-4 Turbo - reliable
      'mistral': 2,   // Good specialized models
      'openrouter': 1, // Good for variety
      'requesty': 1   // Good for cost optimization
    };

    score += performanceScores[provider] || 0;

    if (criteria?.prefersCost) {
      // Adjust for cost (lower cost = higher score)
      const costScores: Record<string, number> = {
        'google': 3,    // Gemini Flash - best value
        'mistral': 2,   // Good pricing
        'requesty': 2,  // Cost optimization
        'openrouter': 1,
        'anthropic': 0, // More expensive
        'openai': 0     // More expensive
      };
      score += costScores[provider] || 0;
    }

    if (criteria?.prefersSpeed) {
      // Adjust for speed
      const speedScores: Record<string, number> = {
        'google': 3,    // Gemini Flash
        'openai': 2,    // GPT-4 Turbo
        'openrouter': 2,
        'requesty': 2,
        'anthropic': 1, // Slower but higher quality
        'mistral': 1
      };
      score += speedScores[provider] || 0;
    }

    return { provider, score };
  });

  // Sort by score and return the best
  providerScores.sort((a, b) => b.score - a.score);
  const bestProvider = providerScores[0]?.provider;

  if (bestProvider) {
    console.log(`🎯 Auto-selected provider: ${bestProvider} (score: ${providerScores[0].score})`);
    return createAdapter(bestProvider);
  }

  return null;
}

/**
 * Provider comparison utility
 */
export interface ProviderComparison {
  provider: SupportedProvider;
  capabilities: ReturnType<BaseAdapter['getCapabilities']>;
  available: boolean;
  models: number;
  maxContext: number;
}

export async function compareProviders(): Promise<ProviderComparison[]> {
  const providers = getAvailableProviders();
  const comparisons: ProviderComparison[] = [];

  for (const provider of providers) {
    try {
      const adapter = createAdapter(provider);
      const available = await adapter.isAvailable();
      const capabilities = adapter.getCapabilities();
      const models = available ? (await adapter.listModels()).length : 0;

      comparisons.push({
        provider,
        capabilities,
        available,
        models,
        maxContext: capabilities.maxContextWindow
      });
    } catch (error) {
      comparisons.push({
        provider,
        capabilities: {
          supportsStreaming: false,
          supportsJSON: false,
          supportsImages: false,
          supportsFunctions: false,
          supportsThinking: false,
          maxContextWindow: 0,
          supportedFeatures: []
        },
        available: false,
        models: 0,
        maxContext: 0
      });
    }
  }

  return comparisons;
}