/**
 * Optimization engine exports
 * Prompt optimization and improvement tools
 */

export { PromptOptimizer } from './PromptOptimizer';
export * from './types';

// Additional optimization strategies could be added here
// export { GeneticOptimizer } from './GeneticOptimizer';
// export { BayesianOptimizer } from './BayesianOptimizer';
// export { HillClimbingOptimizer } from './HillClimbingOptimizer';

/**
 * Factory function for creating optimizers
 */
import { PromptOptimizer } from './PromptOptimizer';
import { OptimizationStrategy } from './types';

export function createOptimizer(strategy: OptimizationStrategy = 'genetic'): PromptOptimizer {
  switch (strategy) {
    case 'genetic':
      return new PromptOptimizer();
    // Add other strategies as they're implemented
    case 'hill_climbing':
    case 'random_search':
    case 'bayesian':
    case 'gradient_descent':
    case 'simulated_annealing':
    default:
      console.warn(`Strategy '${strategy}' not yet implemented, falling back to genetic`);
      return new PromptOptimizer();
  }
}

/**
 * Quick optimization helper
 */
export async function optimizePrompt(config: {
  basePrompt: string;
  testScenarios: any[];
  provider: string;
  maxGenerations?: number;
  populationSize?: number;
}): Promise<{ bestPrompt: string; score: number; iterations: number }> {
  const optimizer = createOptimizer('genetic');
  
  optimizer.configure({
    enabled: true,
    strategy: 'genetic',
    basePrompt: config.basePrompt,
    testScenarios: config.testScenarios,
    evaluationCriteria: ['accuracy', 'relevance'],
    providers: [config.provider],
    models: [],
    objectives: [{
      name: 'overall_score',
      type: 'maximize',
      weight: 1.0
    }],
    parameters: [],
    constraints: [],
    generations: config.maxGenerations || 5,
    populationSize: config.populationSize || 8
  });
  
  const result = await optimizer.optimize();
  
  return {
    bestPrompt: result.bestConfig.prompt,
    score: result.bestScore,
    iterations: result.metadata.totalIterations
  };
}
