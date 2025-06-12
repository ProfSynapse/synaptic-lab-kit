/**
 * Current pricing data for all LLM providers (as of January 2025)
 * Prices in USD per million tokens
 * 
 * Sources:
 * - OpenAI: https://openai.com/pricing
 * - Anthropic: https://docs.anthropic.com/en/docs/about-claude/pricing
 * - Google: https://ai.google.dev/pricing
 * - Mistral: https://mistral.ai/pricing
 * - OpenRouter: https://openrouter.ai/models
 */

export interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
  currency: string;
  lastUpdated: string;
}

export const PROVIDER_PRICING: Record<string, Record<string, ModelPricing>> = {
  openai: {
    'gpt-4o': {
      inputPerMillion: 5.00,
      outputPerMillion: 20.00,
      currency: 'USD',
      lastUpdated: '2025-01-10'
    },
    'gpt-4o-mini': {
      inputPerMillion: 0.15,
      outputPerMillion: 0.60,
      currency: 'USD',
      lastUpdated: '2025-01-10'
    },
    'gpt-4-turbo': {
      inputPerMillion: 10.00,
      outputPerMillion: 30.00,
      currency: 'USD',
      lastUpdated: '2025-01-10'
    },
    'gpt-3.5-turbo': {
      inputPerMillion: 0.50,
      outputPerMillion: 1.50,
      currency: 'USD',
      lastUpdated: '2025-01-10'
    }
  },

  anthropic: {
    'claude-4-opus': {
      inputPerMillion: 15.00,
      outputPerMillion: 75.00,
      currency: 'USD',
      lastUpdated: '2025-01-10'
    },
    'claude-4-sonnet': {
      inputPerMillion: 3.00,
      outputPerMillion: 15.00,
      currency: 'USD',
      lastUpdated: '2025-01-10'
    },
    'claude-3.5-sonnet': {
      inputPerMillion: 3.00,
      outputPerMillion: 15.00,
      currency: 'USD',
      lastUpdated: '2025-01-10'
    },
    'claude-3.5-haiku': {
      inputPerMillion: 0.80,
      outputPerMillion: 4.00,
      currency: 'USD',
      lastUpdated: '2025-01-10'
    }
  },

  google: {
    'gemini-2.5-pro': {
      inputPerMillion: 1.25, // Up to 200K tokens
      outputPerMillion: 10.00,
      currency: 'USD',
      lastUpdated: '2025-01-10'
    },
    'gemini-2.5-flash': {
      inputPerMillion: 0.10,
      outputPerMillion: 0.40,
      currency: 'USD',
      lastUpdated: '2025-01-10'
    },
    'gemini-2.0-flash': {
      inputPerMillion: 0.10,
      outputPerMillion: 0.40,
      currency: 'USD',
      lastUpdated: '2025-01-10'
    },
    'gemini-2.0-pro-experimental': {
      inputPerMillion: 0.00, // Currently free in experimental
      outputPerMillion: 0.00,
      currency: 'USD',
      lastUpdated: '2025-01-10'
    }
  },

  mistral: {
    'mistral-large': {
      inputPerMillion: 2.00,
      outputPerMillion: 6.00,
      currency: 'USD',
      lastUpdated: '2025-01-10'
    },
    'mistral-medium-3': {
      inputPerMillion: 0.40,
      outputPerMillion: 2.00,
      currency: 'USD',
      lastUpdated: '2025-01-10'
    },
    'mistral-small': {
      inputPerMillion: 0.20,
      outputPerMillion: 0.60,
      currency: 'USD',
      lastUpdated: '2025-01-10'
    },
    'codestral': {
      inputPerMillion: 0.20,
      outputPerMillion: 0.60,
      currency: 'USD',
      lastUpdated: '2025-01-10'
    }
  },

  // OpenRouter passes through provider pricing, so we include common models
  openrouter: {
    'openai/gpt-4o': {
      inputPerMillion: 5.00,
      outputPerMillion: 20.00,
      currency: 'USD',
      lastUpdated: '2025-01-10'
    },
    'anthropic/claude-4-sonnet': {
      inputPerMillion: 3.00,
      outputPerMillion: 15.00,
      currency: 'USD',
      lastUpdated: '2025-01-10'
    },
    'google/gemini-2.5-flash': {
      inputPerMillion: 0.10,
      outputPerMillion: 0.40,
      currency: 'USD',
      lastUpdated: '2025-01-10'
    }
  },

  // Requesty pricing - placeholder values, update with actual pricing
  requesty: {
    'requesty-pro': {
      inputPerMillion: 1.00,
      outputPerMillion: 3.00,
      currency: 'USD',
      lastUpdated: '2025-01-10'
    }
  }
};

// Utility functions for pricing
export function getProviderPricing(provider: string, model: string): ModelPricing | undefined {
  return PROVIDER_PRICING[provider]?.[model];
}

export function getAllModelsForProvider(provider: string): string[] {
  return Object.keys(PROVIDER_PRICING[provider] || {});
}

export function getAllProviders(): string[] {
  return Object.keys(PROVIDER_PRICING);
}

export function estimateCost(
  provider: string, 
  model: string, 
  inputTokens: number, 
  outputTokens: number
): { inputCost: number; outputCost: number; totalCost: number; currency: string } | null {
  const pricing = getProviderPricing(provider, model);
  if (!pricing) return null;

  const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMillion;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMillion;
  const totalCost = inputCost + outputCost;

  return {
    inputCost,
    outputCost,
    totalCost,
    currency: pricing.currency
  };
}

export function compareProviderCosts(
  providers: Array<{ provider: string; model: string }>,
  inputTokens: number,
  outputTokens: number
): Array<{ provider: string; model: string; cost: number; currency: string }> {
  return providers
    .map(({ provider, model }) => {
      const cost = estimateCost(provider, model, inputTokens, outputTokens);
      return cost ? {
        provider,
        model,
        cost: cost.totalCost,
        currency: cost.currency
      } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a!.cost - b!.cost) as Array<{ provider: string; model: string; cost: number; currency: string }>;
}

// Cost tracking for analytics
export interface CostTracker {
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  costByProvider: Record<string, number>;
  costByModel: Record<string, number>;
  averageCostPerRequest: number;
  currency: string;
}

export class CostAnalyzer {
  private tracker: CostTracker = {
    totalRequests: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCost: 0,
    costByProvider: {},
    costByModel: {},
    averageCostPerRequest: 0,
    currency: 'USD'
  };

  addUsage(provider: string, model: string, inputTokens: number, outputTokens: number): void {
    const cost = estimateCost(provider, model, inputTokens, outputTokens);
    if (!cost) return;

    this.tracker.totalRequests++;
    this.tracker.totalInputTokens += inputTokens;
    this.tracker.totalOutputTokens += outputTokens;
    this.tracker.totalCost += cost.totalCost;
    
    this.tracker.costByProvider[provider] = (this.tracker.costByProvider[provider] || 0) + cost.totalCost;
    this.tracker.costByModel[`${provider}/${model}`] = (this.tracker.costByModel[`${provider}/${model}`] || 0) + cost.totalCost;
    
    this.tracker.averageCostPerRequest = this.tracker.totalCost / this.tracker.totalRequests;
  }

  getReport(): CostTracker {
    return { ...this.tracker };
  }

  getMostExpensive(): { provider: string; model: string; cost: number } | null {
    const entries = Object.entries(this.tracker.costByModel);
    if (entries.length === 0) return null;

    const [model, cost] = entries.reduce((max, entry) => 
      entry[1] > max[1] ? entry : max
    );

    const [provider, modelName] = model.split('/');
    return { provider, model: modelName, cost };
  }

  getCheapest(): { provider: string; model: string; cost: number } | null {
    const entries = Object.entries(this.tracker.costByModel);
    if (entries.length === 0) return null;

    const [model, cost] = entries.reduce((min, entry) => 
      entry[1] < min[1] ? entry : min
    );

    const [provider, modelName] = model.split('/');
    return { provider, model: modelName, cost };
  }

  reset(): void {
    this.tracker = {
      totalRequests: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCost: 0,
      costByProvider: {},
      costByModel: {},
      averageCostPerRequest: 0,
      currency: 'USD'
    };
  }
}