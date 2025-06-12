/**
 * Prompt Optimizer
 * Core optimization engine for improving prompts
 * Based on patterns from scripts/promptOptimization/
 */

import { EventEmitter } from 'events';
import {
  OptimizationConfig,
  OptimizationResult,
  OptimizationProgress,
  OptimizationEvent,
  PromptOptimizationConfig,
  PromptVariation,
  OptimizationMetrics
} from './types';
import { TestRunner } from '../core/TestRunner';
import { createAdapter } from '../adapters';

export class PromptOptimizer extends EventEmitter {
  private config?: PromptOptimizationConfig;
  private testRunner: TestRunner;
  private isRunning: boolean = false;
  private currentGeneration: number = 0;
  private population: PromptVariation[] = [];
  private bestVariation?: PromptVariation;
  private stagnationCount: number = 0;

  constructor() {
    super();
    this.testRunner = new TestRunner();
  }

  /**
   * Configure the optimizer
   */
  configure(config: PromptOptimizationConfig): void {
    this.config = config;
    this.validateConfig();
  }

  /**
   * Start optimization process
   */
  async optimize(): Promise<OptimizationResult> {
    if (!this.config) {
      throw new Error('Optimizer not configured');
    }

    this.isRunning = true;
    this.currentGeneration = 0;
    this.stagnationCount = 0;
    const startTime = new Date();
    const history: any[] = [];

    try {
      console.log('🚀 Starting prompt optimization...');
      this.emitEvent('iteration', { generation: 0, status: 'starting' });

      // Initialize population
      await this.initializePopulation();

      // Evolution loop
      while (this.shouldContinue()) {
        this.currentGeneration++;
        
        this.emitProgress();
        
        // Evaluate current population
        await this.evaluatePopulation();
        
        // Check for improvement
        const currentBest = this.getBestVariation();
        if (!this.bestVariation || currentBest.score > this.bestVariation.score) {
          this.bestVariation = currentBest;
          this.stagnationCount = 0;
          this.emitEvent('improvement', {
            generation: this.currentGeneration,
            score: currentBest.score,
            prompt: currentBest.prompt
          });
        } else {
          this.stagnationCount++;
          this.emitEvent('stagnation', {
            generation: this.currentGeneration,
            stagnationCount: this.stagnationCount
          });
        }
        
        // Record iteration
        const iteration = {
          generation: this.currentGeneration,
          bestScore: currentBest.score,
          averageScore: this.getAverageScore(),
          worstScore: this.getWorstScore(),
          config: this.extractConfig(currentBest),
          timestamp: new Date()
        };
        
        history.push(iteration);
        
        // Generate next generation
        if (this.shouldContinue()) {
          await this.generateNextGeneration();
        }
      }

      const endTime = new Date();
      const result = this.buildResult(history, startTime, endTime);
      
      this.emitEvent('convergence', result);
      console.log('✅ Optimization completed');
      
      return result;
    } catch (error) {
      this.emitEvent('error', { error: (error as Error).message });
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Stop optimization process
   */
  stop(): void {
    this.isRunning = false;
    console.log('🛑 Optimization stopped by user');
  }

  /**
   * Get current optimization progress
   */
  getProgress(): OptimizationProgress {
    const currentBest = this.getBestVariation();
    
    return {
      currentGeneration: this.currentGeneration,
      totalGenerations: this.config?.generations || 10,
      bestScore: currentBest?.score || 0,
      averageScore: this.getAverageScore(),
      improvementRate: this.calculateImprovementRate(),
      timeElapsed: 0, // Would calculate from start time
      stagnationCount: this.stagnationCount,
      currentBest: currentBest ? this.extractConfig(currentBest) : {}
    };
  }

  // Private methods

  private async initializePopulation(): Promise<void> {
    if (!this.config) throw new Error('Config not set');
    
    const populationSize = this.config.populationSize || 10;
    this.population = [];
    
    // Add base prompt as first individual
    this.population.push({
      id: 'base',
      prompt: this.config.basePrompt,
      score: 0,
      generation: 0,
      mutations: [],
      metadata: {
        tokens: this.estimateTokens(this.config.basePrompt),
        cost: 0,
        latency: 0,
        created: new Date()
      }
    });
    
    // Generate random variations
    for (let i = 1; i < populationSize; i++) {
      const variation = this.generateRandomVariation(this.config.basePrompt, i);
      this.population.push(variation);
    }
    
    console.log(`📊 Initialized population with ${this.population.length} variations`);
  }

  private async evaluatePopulation(): Promise<void> {
    if (!this.config) return;
    
    console.log(`🔍 Evaluating generation ${this.currentGeneration}...`);
    
    for (const variation of this.population) {
      if (variation.score === 0) { // Only evaluate unscored variations
        try {
          const metrics = await this.evaluateVariation(variation);
          variation.score = this.calculateOverallScore(metrics);
          
          // Update metadata
          variation.metadata.cost = metrics.cost;
          variation.metadata.latency = metrics.latency;
        } catch (error) {
          console.warn(`Failed to evaluate variation ${variation.id}:`, error);
          variation.score = 0.1; // Low score for failed evaluations
        }
      }
    }
  }

  private async evaluateVariation(variation: PromptVariation): Promise<OptimizationMetrics> {
    if (!this.config) throw new Error('Config not set');
    
    // Create test configuration for this variation
    const testConfig = {
      name: `optimization_test_${variation.id}`,
      description: 'Prompt optimization evaluation',
      provider: this.config.providers[0] as any, // Use first provider
      scenarios: this.config.testScenarios,
      evaluation: {
        criteria: this.config.evaluationCriteria.map(name => ({
          name,
          type: name as any,
          weight: 1.0,
          description: `Evaluate ${name}`
        })),
        thresholds: {}
      }
    };
    
    // Replace base prompt with variation
    testConfig.scenarios = testConfig.scenarios.map(scenario => ({
      ...scenario,
      userInput: variation.prompt
    }));
    
    // Run test
    const executionId = await this.testRunner.startTest(testConfig);
    
    // Wait for completion (simplified - would implement proper waiting)
    await this.waitForCompletion(executionId);
    
    const execution = this.testRunner.getExecution(executionId);
    if (!execution?.summary) {
      throw new Error('Test execution failed');
    }
    
    // Convert summary to metrics
    return {
      accuracy: execution.summary.accuracy,
      relevance: execution.summary.criteriaScores.relevance || 0,
      coherence: execution.summary.criteriaScores.coherence || 0,
      completeness: execution.summary.criteriaScores.completeness || 0,
      efficiency: 1 - (execution.summary.averageLatency / 10000), // Normalize latency
      cost: execution.summary.totalCost,
      latency: execution.summary.averageLatency
    };
  }

  private calculateOverallScore(metrics: OptimizationMetrics): number {
    // Weighted combination of metrics
    const weights = {
      accuracy: 0.3,
      relevance: 0.25,
      coherence: 0.2,
      completeness: 0.15,
      efficiency: 0.1
    };
    
    return (
      metrics.accuracy * weights.accuracy +
      metrics.relevance * weights.relevance +
      metrics.coherence * weights.coherence +
      metrics.completeness * weights.completeness +
      metrics.efficiency * weights.efficiency
    );
  }

  private generateRandomVariation(basePrompt: string, index: number): PromptVariation {
    const mutations = this.generateMutations(basePrompt);
    const mutatedPrompt = this.applyMutations(basePrompt, mutations);
    
    return {
      id: `gen0_${index}`,
      prompt: mutatedPrompt,
      score: 0,
      generation: 0,
      mutations,
      metadata: {
        tokens: this.estimateTokens(mutatedPrompt),
        cost: 0,
        latency: 0,
        created: new Date()
      }
    };
  }

  private generateMutations(prompt: string): string[] {
    const mutations = [];
    const mutationTypes = [
      'add_context',
      'modify_instruction',
      'add_examples',
      'change_tone',
      'add_constraints'
    ];
    
    // Randomly select 1-3 mutations
    const numMutations = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < numMutations; i++) {
      const mutation = mutationTypes[Math.floor(Math.random() * mutationTypes.length)];
      mutations.push(mutation);
    }
    
    return mutations;
  }

  private applyMutations(prompt: string, mutations: string[]): string {
    let mutatedPrompt = prompt;
    
    for (const mutation of mutations) {
      switch (mutation) {
        case 'add_context':
          mutatedPrompt += '\n\nContext: Please consider relevant background information.';
          break;
        case 'modify_instruction':
          mutatedPrompt = mutatedPrompt.replace(/please/gi, 'kindly');
          break;
        case 'add_examples':
          mutatedPrompt += '\n\nExample: Provide specific examples in your response.';
          break;
        case 'change_tone':
          mutatedPrompt = 'Please be thorough and detailed. ' + mutatedPrompt;
          break;
        case 'add_constraints':
          mutatedPrompt += '\n\nConstraints: Keep response under 200 words.';
          break;
      }
    }
    
    return mutatedPrompt;
  }

  private async generateNextGeneration(): Promise<void> {
    if (!this.config) return;
    
    const newPopulation: PromptVariation[] = [];
    const populationSize = this.config.populationSize || 10;
    
    // Keep best performers (elitism)
    const eliteCount = Math.floor(populationSize * 0.2);
    const elite = this.population
      .sort((a, b) => b.score - a.score)
      .slice(0, eliteCount);
    
    newPopulation.push(...elite);
    
    // Generate offspring through crossover and mutation
    while (newPopulation.length < populationSize) {
      const parent1 = this.selectParent();
      const parent2 = this.selectParent();
      
      const offspring = this.crossover(parent1, parent2);
      const mutatedOffspring = this.mutate(offspring);
      
      newPopulation.push(mutatedOffspring);
    }
    
    this.population = newPopulation;
  }

  private selectParent(): PromptVariation {
    // Tournament selection
    const tournamentSize = 3;
    const tournament = [];
    
    for (let i = 0; i < tournamentSize; i++) {
      const randomIndex = Math.floor(Math.random() * this.population.length);
      tournament.push(this.population[randomIndex]);
    }
    
    return tournament.reduce((best, current) => 
      current.score > best.score ? current : best
    );
  }

  private crossover(parent1: PromptVariation, parent2: PromptVariation): PromptVariation {
    // Simple crossover: combine prompts
    const combinedPrompt = this.combinePrompts(parent1.prompt, parent2.prompt);
    
    return {
      id: `gen${this.currentGeneration}_${Date.now()}`,
      prompt: combinedPrompt,
      score: 0,
      generation: this.currentGeneration,
      parent: `${parent1.id}+${parent2.id}`,
      mutations: [...parent1.mutations, ...parent2.mutations],
      metadata: {
        tokens: this.estimateTokens(combinedPrompt),
        cost: 0,
        latency: 0,
        created: new Date()
      }
    };
  }

  private mutate(variation: PromptVariation): PromptVariation {
    if (!this.config) return variation;
    
    const mutationRate = this.config.mutationRate || 0.1;
    
    if (Math.random() < mutationRate) {
      const newMutations = this.generateMutations(variation.prompt);
      const mutatedPrompt = this.applyMutations(variation.prompt, newMutations);
      
      return {
        ...variation,
        prompt: mutatedPrompt,
        mutations: [...variation.mutations, ...newMutations],
        metadata: {
          ...variation.metadata,
          tokens: this.estimateTokens(mutatedPrompt)
        }
      };
    }
    
    return variation;
  }

  private combinePrompts(prompt1: string, prompt2: string): string {
    // Simple combination strategy
    const sentences1 = prompt1.split('. ');
    const sentences2 = prompt2.split('. ');
    
    const combined = [];
    const maxLength = Math.max(sentences1.length, sentences2.length);
    
    for (let i = 0; i < maxLength; i++) {
      if (i < sentences1.length) combined.push(sentences1[i]);
      if (i < sentences2.length && Math.random() > 0.5) {
        combined.push(sentences2[i]);
      }
    }
    
    return combined.join('. ');
  }

  private shouldContinue(): boolean {
    if (!this.isRunning) return false;
    if (!this.config) return false;
    
    const maxGenerations = this.config.generations || 10;
    const maxStagnation = this.config.maxStagnation || 5;
    
    if (this.currentGeneration >= maxGenerations) return false;
    if (this.stagnationCount >= maxStagnation) return false;
    
    return true;
  }

  private getBestVariation(): PromptVariation {
    return this.population.reduce((best, current) => 
      current.score > best.score ? current : best
    );
  }

  private getAverageScore(): number {
    const total = this.population.reduce((sum, v) => sum + v.score, 0);
    return this.population.length > 0 ? total / this.population.length : 0;
  }

  private getWorstScore(): number {
    return this.population.reduce((worst, current) => 
      current.score < worst.score ? current : worst
    ).score;
  }

  private calculateImprovementRate(): number {
    // Simplified improvement rate calculation
    return this.stagnationCount === 0 ? 0.1 : 0;
  }

  private extractConfig(variation: PromptVariation): Record<string, any> {
    return {
      prompt: variation.prompt,
      score: variation.score,
      generation: variation.generation,
      mutations: variation.mutations
    };
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private async waitForCompletion(executionId: string): Promise<void> {
    // Simplified waiting - would implement proper polling
    return new Promise(resolve => setTimeout(resolve, 5000));
  }

  private validateConfig(): void {
    if (!this.config) throw new Error('No configuration provided');
    if (!this.config.basePrompt) throw new Error('Base prompt is required');
    if (!this.config.testScenarios || this.config.testScenarios.length === 0) {
      throw new Error('Test scenarios are required');
    }
  }

  private buildResult(
    history: any[], 
    startTime: Date, 
    endTime: Date
  ): OptimizationResult {
    const best = this.getBestVariation();
    
    return {
      bestConfig: this.extractConfig(best),
      bestScore: best.score,
      history,
      convergence: {
        converged: this.stagnationCount >= (this.config?.maxStagnation || 5),
        generations: this.currentGeneration,
        improvement: best.score,
        stagnationCount: this.stagnationCount,
        reason: this.stagnationCount >= (this.config?.maxStagnation || 5) ? 'stagnation' : 'maxGenerations'
      },
      recommendations: this.generateRecommendations(best),
      metadata: {
        strategy: this.config?.strategy || 'genetic',
        totalIterations: this.currentGeneration,
        totalTime: endTime.getTime() - startTime.getTime(),
        startTime,
        endTime
      }
    };
  }

  private generateRecommendations(best: PromptVariation): string[] {
    const recommendations = [];
    
    if (best.score > 0.8) {
      recommendations.push('Excellent performance achieved');
    } else if (best.score > 0.6) {
      recommendations.push('Good performance, consider further refinement');
    } else {
      recommendations.push('Performance below target, review approach');
    }
    
    if (best.mutations.includes('add_examples')) {
      recommendations.push('Examples improved performance');
    }
    
    return recommendations;
  }

  private emitEvent(type: string, data: any): void {
    const event: OptimizationEvent = {
      type: type as any,
      data,
      timestamp: new Date()
    };
    
    this.emit('optimization', event);
  }

  private emitProgress(): void {
    this.emit('progress', this.getProgress());
  }
}
