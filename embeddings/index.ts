/**
 * Embedding providers exports and factory functions
 * Unified access to all embedding providers
 */

export { BaseEmbeddingProvider } from './BaseEmbeddingProvider';
export * from './types';

// Provider implementations
export { OpenAIEmbeddingProvider } from './OpenAIEmbeddingProvider';
export { VoyageEmbeddingProvider } from './VoyageEmbeddingProvider';
export { CohereEmbeddingProvider } from './CohereEmbeddingProvider';
export { GoogleEmbeddingProvider } from './GoogleEmbeddingProvider';
export { MistralEmbeddingProvider } from './MistralEmbeddingProvider';

import { BaseEmbeddingProvider } from './BaseEmbeddingProvider';
import { OpenAIEmbeddingProvider } from './OpenAIEmbeddingProvider';
import { VoyageEmbeddingProvider } from './VoyageEmbeddingProvider';
import { CohereEmbeddingProvider } from './CohereEmbeddingProvider';
import { GoogleEmbeddingProvider } from './GoogleEmbeddingProvider';
import { MistralEmbeddingProvider } from './MistralEmbeddingProvider';
import { 
  SupportedEmbeddingProvider, 
  EmbeddingProviderError,
  AnyEmbeddingConfig 
} from './types';

/**
 * Factory function to create embedding provider instances
 */
export function createEmbeddingProvider(provider: SupportedEmbeddingProvider, config?: any): BaseEmbeddingProvider {
  switch (provider.toLowerCase()) {
    case 'openai':
      return new OpenAIEmbeddingProvider(config);
    case 'voyage':
      return new VoyageEmbeddingProvider(config);
    case 'cohere':
      return new CohereEmbeddingProvider(config);
    case 'google':
      return new GoogleEmbeddingProvider(config);
    case 'mistral':
      return new MistralEmbeddingProvider(config);
    default:
      throw new EmbeddingProviderError(
        `Unsupported embedding provider: ${provider}`,
        'factory'
      );
  }
}

/**
 * Get all available embedding providers
 */
export function getAvailableEmbeddingProviders(): SupportedEmbeddingProvider[] {
  return ['openai', 'voyage', 'cohere', 'google', 'mistral'];
}

/**
 * Check which embedding providers are available (have API keys)
 */
export async function getAvailableEmbeddingProvidersWithKeys(): Promise<Array<{
  provider: SupportedEmbeddingProvider;
  available: boolean;
  error?: string;
}>> {
  const providers = getAvailableEmbeddingProviders();
  const results = await Promise.allSettled(
    providers.map(async (provider) => {
      try {
        const embeddingProvider = createEmbeddingProvider(provider);
        const available = await embeddingProvider.isAvailable();
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
 * Auto-select best available embedding provider based on criteria
 */
export async function selectBestEmbeddingProvider(criteria?: {
  requiresMultilingual?: boolean;
  prefersCost?: boolean;
  prefersSpeed?: boolean;
  requiresLargeDimensions?: boolean;
  prefersBatching?: boolean;
}): Promise<BaseEmbeddingProvider | null> {
  const availableProviders = await getAvailableEmbeddingProvidersWithKeys();
  const available = availableProviders.filter(p => p.available);

  if (available.length === 0) {
    console.warn('No embedding providers available. Please check your API keys.');
    return null;
  }

  // Score providers based on criteria
  const providerScores = available.map(({ provider }) => {
    const embeddingProvider = createEmbeddingProvider(provider);
    const capabilities = embeddingProvider.getCapabilities();
    let score = 1;

    // Base performance scores (subjective weights based on 2025 performance)
    const performanceScores: Record<string, number> = {
      'google': 5,   // Best cost/performance ratio
      'voyage': 4,   // Excellent specialized models
      'openai': 3,   // Reliable and feature-rich
      'mistral': 2,  // Good basic embedding
      'cohere': 4,   // Great for search and reranking
    };

    score += performanceScores[provider] || 0;

    // Apply criteria-based scoring
    if (criteria?.requiresMultilingual) {
      const multilingualScores: Record<string, number> = {
        'cohere': 3,   // Best multilingual support
        'google': 2,   // Good multilingual model
        'voyage': 2,   // Multilingual options
        'openai': 1,   // Limited multilingual
        'mistral': 1   // Basic multilingual
      };
      score += multilingualScores[provider] || 0;
    }

    if (criteria?.prefersCost) {
      // Lower cost = higher score
      const costScores: Record<string, number> = {
        'google': 3,   // Very competitive pricing
        'mistral': 2,  // Good pricing
        'voyage': 1,   // Moderate pricing
        'openai': 1,   // Moderate pricing
        'cohere': 1    // Moderate pricing
      };
      score += costScores[provider] || 0;
    }

    if (criteria?.prefersSpeed) {
      const speedScores: Record<string, number> = {
        'openai': 3,   // Fast API
        'google': 2,   // Good speed
        'mistral': 2,  // Good speed
        'cohere': 2,   // Good speed
        'voyage': 1    // Moderate speed
      };
      score += speedScores[provider] || 0;
    }

    if (criteria?.requiresLargeDimensions) {
      const maxDimensions = Math.max(...capabilities.supportedDimensions);
      if (maxDimensions >= 3000) score += 3;
      else if (maxDimensions >= 1500) score += 2;
      else if (maxDimensions >= 1000) score += 1;
    }

    if (criteria?.prefersBatching && capabilities.supportsBatching) {
      score += 2;
      if (capabilities.maxBatchSize > 100) score += 1;
    }

    return { provider, score };
  });

  // Sort by score and return the best
  providerScores.sort((a, b) => b.score - a.score);
  const bestProvider = providerScores[0]?.provider;

  if (bestProvider) {
    console.log(`🎯 Auto-selected embedding provider: ${bestProvider} (score: ${providerScores[0].score})`);
    return createEmbeddingProvider(bestProvider);
  }

  return null;
}

/**
 * Provider comparison utility
 */
export interface EmbeddingProviderComparison {
  provider: SupportedEmbeddingProvider;
  capabilities: ReturnType<BaseEmbeddingProvider['getCapabilities']>;
  available: boolean;
  maxDimensions: number;
  supportsBatching: boolean;
}

export async function compareEmbeddingProviders(): Promise<EmbeddingProviderComparison[]> {
  const providers = getAvailableEmbeddingProviders();
  const comparisons: EmbeddingProviderComparison[] = [];

  for (const provider of providers) {
    try {
      const embeddingProvider = createEmbeddingProvider(provider);
      const available = await embeddingProvider.isAvailable();
      const capabilities = embeddingProvider.getCapabilities();

      comparisons.push({
        provider,
        capabilities,
        available,
        maxDimensions: Math.max(...capabilities.supportedDimensions),
        supportsBatching: capabilities.supportsBatching
      });
    } catch (error) {
      comparisons.push({
        provider,
        capabilities: {
          maxInputLength: 0,
          maxBatchSize: 0,
          supportedDimensions: [],
          supportsBatching: false,
          supportsCustomDimensions: false,
          defaultModel: '',
          availableModels: []
        },
        available: false,
        maxDimensions: 0,
        supportsBatching: false
      });
    }
  }

  return comparisons;
}

/**
 * Embedding manager for coordinating multiple providers
 */
export class EmbeddingManager {
  private providers: Map<SupportedEmbeddingProvider, BaseEmbeddingProvider> = new Map();
  private defaultProvider?: BaseEmbeddingProvider;

  /**
   * Add an embedding provider
   */
  addProvider(provider: SupportedEmbeddingProvider, config?: any): void {
    const embeddingProvider = createEmbeddingProvider(provider, config);
    this.providers.set(provider, embeddingProvider);
    
    if (!this.defaultProvider) {
      this.defaultProvider = embeddingProvider;
    }
  }

  /**
   * Get a specific provider
   */
  getProvider(provider: SupportedEmbeddingProvider): BaseEmbeddingProvider | undefined {
    return this.providers.get(provider);
  }

  /**
   * Get the default provider
   */
  getDefaultProvider(): BaseEmbeddingProvider | undefined {
    return this.defaultProvider;
  }

  /**
   * Set the default provider
   */
  setDefaultProvider(provider: SupportedEmbeddingProvider): void {
    const embeddingProvider = this.providers.get(provider);
    if (!embeddingProvider) {
      throw new Error(`Provider ${provider} not found. Add it first with addProvider().`);
    }
    this.defaultProvider = embeddingProvider;
  }

  /**
   * Generate embeddings with automatic fallback
   */
  async embed(
    input: string | string[],
    options?: {
      provider?: SupportedEmbeddingProvider;
      model?: string;
      dimensions?: number;
      fallback?: boolean;
    }
  ) {
    const targetProvider = options?.provider 
      ? this.providers.get(options.provider)
      : this.defaultProvider;

    if (!targetProvider) {
      throw new Error('No embedding provider available');
    }

    try {
      return await targetProvider.embed({
        input,
        model: options?.model,
        dimensions: options?.dimensions
      });
    } catch (error) {
      if (options?.fallback && this.providers.size > 1) {
        // Try other providers as fallback
        for (const [providerName, provider] of this.providers.entries()) {
          if (provider === targetProvider) continue;
          
          try {
            console.warn(`Falling back to ${providerName} embedding provider`);
            return await provider.embed({ input });
          } catch (fallbackError) {
            console.warn(`Fallback provider ${providerName} also failed:`, fallbackError);
          }
        }
      }
      throw error;
    }
  }

  /**
   * Get all providers status
   */
  async getAllProvidersStatus(): Promise<Record<SupportedEmbeddingProvider, {
    available: boolean;
    capabilities: ReturnType<BaseEmbeddingProvider['getCapabilities']>;
    metrics: ReturnType<BaseEmbeddingProvider['getMetrics']>;
  }>> {
    const status: any = {};
    
    for (const [providerName, provider] of this.providers.entries()) {
      status[providerName] = {
        available: await provider.isAvailable(),
        capabilities: provider.getCapabilities(),
        metrics: provider.getMetrics()
      };
    }
    
    return status;
  }
}

/**
 * Create a configured embedding manager instance
 */
export function createEmbeddingManager(): EmbeddingManager {
  return new EmbeddingManager();
}
