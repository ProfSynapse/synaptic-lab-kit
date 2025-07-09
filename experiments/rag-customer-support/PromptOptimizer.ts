/**
 * Prompt Optimizer for RAG Customer Support
 * Iteratively improves retrieval and response generation prompts based on evaluation results
 */

import { RAGPipeline, RetrievalPrompts } from './RAGPipeline';
import { HybridEvaluator } from './HybridEvaluator';
import { KnowledgeBase, TestCase } from './KnowledgeBase';
import { OllamaAdapter } from '../../adapters/OllamaAdapter';
import { 
  PROMPT_VARIATION_SETS, 
  RESPONSE_GENERATION_TEMPLATES,
  CONTEXT_FORMATTING_TEMPLATES,
  QUERY_ENHANCEMENT_TEMPLATES,
  createRandomPromptCombination
} from './PromptVariations';

export interface PromptOptimizationConfig {
  maxIterations: number;
  improvementThreshold: number;
  populationSize: number;
  mutationRate: number;
  targetScore: number;
}

export interface PromptVariation {
  id: string;
  prompts: RetrievalPrompts;
  score: number;
  evaluated: boolean;
  generation: number;
}

export interface OptimizationResult {
  iteration: number;
  bestScore: number;
  improvements: number;
  currentPrompts: RetrievalPrompts;
  scoreHistory: number[];
  failurePatterns: string[];
}

export class PromptOptimizer {
  private ragPipeline: RAGPipeline;
  private evaluator: HybridEvaluator;
  private knowledgeBase: KnowledgeBase;
  private llm: OllamaAdapter;
  private config: PromptOptimizationConfig;
  private testCases: TestCase[];

  constructor(
    ragPipeline: RAGPipeline,
    evaluator: HybridEvaluator,
    knowledgeBase: KnowledgeBase,
    llm: OllamaAdapter,
    config: Partial<PromptOptimizationConfig> = {}
  ) {
    this.ragPipeline = ragPipeline;
    this.evaluator = evaluator;
    this.knowledgeBase = knowledgeBase;
    this.llm = llm;
    
    this.config = {
      maxIterations: 10,
      improvementThreshold: 0.02,
      populationSize: 5,
      mutationRate: 0.3,
      targetScore: 0.85,
      ...config
    };
    
    // Use a focused set of test cases for optimization
    this.testCases = this.selectOptimizationTestCases();
  }

  /**
   * Run prompt optimization using genetic algorithm approach
   */
  async optimize(): Promise<{
    bestPrompts: RetrievalPrompts;
    bestScore: number;
    iterations: number;
    optimizationHistory: OptimizationResult[];
  }> {
    console.log('🎯 Starting RAG Prompt Optimization');
    console.log(`📊 Using ${this.testCases.length} test cases`);
    console.log(`🔄 Max iterations: ${this.config.maxIterations}`);
    console.log(`🎯 Target score: ${this.config.targetScore}\n`);

    const optimizationHistory: OptimizationResult[] = [];
    let population = await this.initializePopulation();
    let bestScore = 0;
    let bestPrompts = this.ragPipeline.getPrompts();
    let improvementCount = 0;

    for (let iteration = 0; iteration < this.config.maxIterations; iteration++) {
      console.log(`\n🔄 Iteration ${iteration + 1}/${this.config.maxIterations}`);
      
      // Evaluate current population
      population = await this.evaluatePopulation(population);
      
      // Find best performer
      const currentBest = population.reduce((best, current) => 
        current.score > best.score ? current : best
      );
      
      // Check for improvement
      const improvement = currentBest.score - bestScore;
      if (improvement > this.config.improvementThreshold) {
        bestScore = currentBest.score;
        bestPrompts = currentBest.prompts;
        improvementCount++;
        
        console.log(`✅ Improvement found! Score: ${bestScore.toFixed(3)} (+${improvement.toFixed(3)})`);
        
        // Update RAG pipeline with best prompts
        this.ragPipeline.updatePrompts(bestPrompts);
      } else {
        console.log(`📊 No significant improvement. Best score: ${bestScore.toFixed(3)}`);
      }
      
      // Analyze failure patterns
      const failurePatterns = await this.analyzeFailures(currentBest.prompts);
      
      // Record optimization result
      optimizationHistory.push({
        iteration: iteration + 1,
        bestScore,
        improvements: improvementCount,
        currentPrompts: bestPrompts,
        scoreHistory: population.map(p => p.score),
        failurePatterns
      });
      
      // Check if target reached
      if (bestScore >= this.config.targetScore) {
        console.log(`🎉 Target score ${this.config.targetScore} reached!`);
        break;
      }
      
      // Generate next population
      if (iteration < this.config.maxIterations - 1) {
        population = await this.generateNextPopulation(population);
      }
    }

    console.log(`\n🏁 Optimization complete!`);
    console.log(`🏆 Best score: ${bestScore.toFixed(3)}`);
    console.log(`📈 Improvements: ${improvementCount}`);

    return {
      bestPrompts,
      bestScore,
      iterations: optimizationHistory.length,
      optimizationHistory
    };
  }

  /**
   * Initialize population with baseline and systematic variations
   */
  private async initializePopulation(): Promise<PromptVariation[]> {
    const basePrompts = this.ragPipeline.getPrompts();
    const population: PromptVariation[] = [];
    
    // Add baseline
    population.push({
      id: 'baseline',
      prompts: basePrompts,
      score: 0,
      evaluated: false,
      generation: 0
    });
    
    // Add systematic variations from predefined sets
    const variationSets = PROMPT_VARIATION_SETS.slice(0, Math.min(this.config.populationSize - 1, PROMPT_VARIATION_SETS.length));
    
    for (let i = 0; i < variationSets.length; i++) {
      const variationSet = variationSets[i];
      if (variationSet) {
        const variation = {
          responseGeneration: variationSet.responseGenerationTemplates.main,
          contextFormatting: variationSet.contextFormattingTemplates.main,
          queryEnhancement: variationSet.queryEnhancementTemplates.main
        };
        
        population.push({
          id: `${variationSet.id}_${i}`,
          prompts: variation,
          score: 0,
          evaluated: false,
          generation: 0
        });
      }
    }
    
    // Fill remaining slots with random combinations
    while (population.length < this.config.populationSize) {
      const randomVariation = createRandomPromptCombination();
      population.push({
        id: `random_${population.length}`,
        prompts: randomVariation,
        score: 0,
        evaluated: false,
        generation: 0
      });
    }
    
    return population;
  }

  /**
   * Generate a systematic variation of the prompts
   */
  private async generatePromptVariation(basePrompts: RetrievalPrompts, variationId: number): Promise<RetrievalPrompts> {
    // Use systematic variations instead of LLM-generated ones
    const responseKeys = Object.keys(RESPONSE_GENERATION_TEMPLATES);
    const contextKeys = Object.keys(CONTEXT_FORMATTING_TEMPLATES);
    const queryKeys = Object.keys(QUERY_ENHANCEMENT_TEMPLATES);
    
    // Create systematic combinations based on variation ID
    const responseIndex = variationId % responseKeys.length;
    const contextIndex = Math.floor(variationId / responseKeys.length) % contextKeys.length;
    const queryIndex = Math.floor(variationId / (responseKeys.length * contextKeys.length)) % queryKeys.length;
    
    const responseKey = responseKeys[responseIndex];
    const contextKey = contextKeys[contextIndex];
    const queryKey = queryKeys[queryIndex];
    
    return {
      responseGeneration: responseKey ? RESPONSE_GENERATION_TEMPLATES[responseKey as keyof typeof RESPONSE_GENERATION_TEMPLATES] : basePrompts.responseGeneration,
      contextFormatting: contextKey ? CONTEXT_FORMATTING_TEMPLATES[contextKey as keyof typeof CONTEXT_FORMATTING_TEMPLATES] : basePrompts.contextFormatting,
      queryEnhancement: queryKey ? QUERY_ENHANCEMENT_TEMPLATES[queryKey as keyof typeof QUERY_ENHANCEMENT_TEMPLATES] : basePrompts.queryEnhancement
    };
  }

  /**
   * Evaluate population using test cases
   */
  private async evaluatePopulation(population: PromptVariation[]): Promise<PromptVariation[]> {
    const evaluatedPopulation: PromptVariation[] = [];
    
    for (const individual of population) {
      if (individual.evaluated) {
        evaluatedPopulation.push(individual);
        continue;
      }
      
      console.log(`📊 Evaluating ${individual.id}...`);
      
      // Update pipeline with this individual's prompts
      this.ragPipeline.updatePrompts(individual.prompts);
      
      // Run test cases
      const ragResults = await this.ragPipeline.processTestCases(this.testCases);
      const evaluationResults = await this.evaluator.evaluateBatch(
        this.testCases,
        ragResults.map(r => r.result)
      );
      
      // Calculate average score
      const avgScore = evaluationResults.reduce((sum, result) => sum + result.combinedScore, 0) / evaluationResults.length;
      
      evaluatedPopulation.push({
        ...individual,
        score: avgScore,
        evaluated: true
      });
      
      console.log(`   Score: ${avgScore.toFixed(3)}`);
    }
    
    return evaluatedPopulation;
  }

  /**
   * Generate next population using genetic algorithm
   */
  private async generateNextPopulation(currentPopulation: PromptVariation[]): Promise<PromptVariation[]> {
    // Sort by score (descending)
    const sortedPopulation = currentPopulation.sort((a, b) => b.score - a.score);
    
    // Keep best performers
    const eliteCount = Math.ceil(this.config.populationSize * 0.3);
    const nextPopulation = sortedPopulation.slice(0, eliteCount).map(individual => ({
      ...individual,
      evaluated: true // Keep their scores
    }));
    
    // Generate offspring from best performers
    const bestParents = sortedPopulation.slice(0, 2);
    
    while (nextPopulation.length < this.config.populationSize) {
      const parent1 = bestParents[0]!;
      const parent2 = bestParents[1] || bestParents[0]!;
      
      const offspring = await this.crossover(parent1, parent2);
      
      // Apply mutation
      const mutatedOffspring = Math.random() < this.config.mutationRate ? 
        await this.mutate(offspring) : offspring;
      
      nextPopulation.push({
        id: `gen_${nextPopulation.length}`,
        prompts: mutatedOffspring,
        score: 0,
        evaluated: false,
        generation: currentPopulation[0]!.generation + 1
      });
    }
    
    return nextPopulation;
  }

  /**
   * Crossover two prompt sets using systematic variations
   */
  private async crossover(parent1: PromptVariation, parent2: PromptVariation): Promise<RetrievalPrompts> {
    // Systematic crossover - randomly select each component from either parent
    const responseKeys = Object.keys(RESPONSE_GENERATION_TEMPLATES);
    const contextKeys = Object.keys(CONTEXT_FORMATTING_TEMPLATES);
    const queryKeys = Object.keys(QUERY_ENHANCEMENT_TEMPLATES);
    
    // Use random selection between parents and systematic variations
    const useParent1Response = Math.random() < 0.5;
    const useParent1Context = Math.random() < 0.5;
    const useParent1Query = Math.random() < 0.5;
    
    // Sometimes introduce completely new variations
    const introduceNewResponse = Math.random() < 0.2;
    const introduceNewContext = Math.random() < 0.2;
    const introduceNewQuery = Math.random() < 0.2;
    
    let responseGeneration = useParent1Response ? parent1.prompts.responseGeneration : parent2.prompts.responseGeneration;
    let contextFormatting = useParent1Context ? parent1.prompts.contextFormatting : parent2.prompts.contextFormatting;
    let queryEnhancement = useParent1Query ? parent1.prompts.queryEnhancement : parent2.prompts.queryEnhancement;
    
    // Introduce new variations
    if (introduceNewResponse) {
      const randomResponseKey = responseKeys[Math.floor(Math.random() * responseKeys.length)];
      responseGeneration = randomResponseKey ? RESPONSE_GENERATION_TEMPLATES[randomResponseKey as keyof typeof RESPONSE_GENERATION_TEMPLATES] : responseGeneration;
    }
    
    if (introduceNewContext) {
      const randomContextKey = contextKeys[Math.floor(Math.random() * contextKeys.length)];
      contextFormatting = randomContextKey ? CONTEXT_FORMATTING_TEMPLATES[randomContextKey as keyof typeof CONTEXT_FORMATTING_TEMPLATES] : contextFormatting;
    }
    
    if (introduceNewQuery) {
      const randomQueryKey = queryKeys[Math.floor(Math.random() * queryKeys.length)];
      queryEnhancement = randomQueryKey ? QUERY_ENHANCEMENT_TEMPLATES[randomQueryKey as keyof typeof QUERY_ENHANCEMENT_TEMPLATES] : queryEnhancement;
    }
    
    return {
      queryEnhancement,
      contextFormatting,
      responseGeneration
    };
  }

  /**
   * Mutate a prompt set using systematic variations
   */
  private async mutate(prompts: RetrievalPrompts): Promise<RetrievalPrompts> {
    const responseKeys = Object.keys(RESPONSE_GENERATION_TEMPLATES);
    const contextKeys = Object.keys(CONTEXT_FORMATTING_TEMPLATES);
    const queryKeys = Object.keys(QUERY_ENHANCEMENT_TEMPLATES);
    
    // Randomly decide which component to mutate
    const mutationChoice = Math.random();
    
    if (mutationChoice < 0.5) {
      // Mutate response generation (most important)
      const randomResponseKey = responseKeys[Math.floor(Math.random() * responseKeys.length)];
      return {
        ...prompts,
        responseGeneration: randomResponseKey ? RESPONSE_GENERATION_TEMPLATES[randomResponseKey as keyof typeof RESPONSE_GENERATION_TEMPLATES] : prompts.responseGeneration
      };
    } else if (mutationChoice < 0.8) {
      // Mutate context formatting
      const randomContextKey = contextKeys[Math.floor(Math.random() * contextKeys.length)];
      return {
        ...prompts,
        contextFormatting: randomContextKey ? CONTEXT_FORMATTING_TEMPLATES[randomContextKey as keyof typeof CONTEXT_FORMATTING_TEMPLATES] : prompts.contextFormatting
      };
    } else {
      // Mutate query enhancement
      const randomQueryKey = queryKeys[Math.floor(Math.random() * queryKeys.length)];
      return {
        ...prompts,
        queryEnhancement: randomQueryKey ? QUERY_ENHANCEMENT_TEMPLATES[randomQueryKey as keyof typeof QUERY_ENHANCEMENT_TEMPLATES] : prompts.queryEnhancement
      };
    }
  }

  /**
   * Analyze failure patterns to guide optimization
   */
  private async analyzeFailures(prompts: RetrievalPrompts): Promise<string[]> {
    // Quick evaluation to identify common failure patterns
    this.ragPipeline.updatePrompts(prompts);
    
    const ragResults = await this.ragPipeline.processTestCases(this.testCases.slice(0, 5));
    const evaluationResults = await this.evaluator.evaluateBatch(
      this.testCases.slice(0, 5),
      ragResults.map(r => r.result)
    );
    
    const failures = evaluationResults.filter(result => !result.passed);
    const patterns: string[] = [];
    
    // Analyze common failure patterns
    const lowChunkAccuracy = failures.filter(f => f.chunkEvaluation.f1Score < 0.5).length;
    const lowResponseQuality = failures.filter(f => f.responseEvaluation.overallScore < 0.7).length;
    const lowGroundedness = failures.filter(f => f.responseEvaluation.groundedness < 0.7).length;
    
    if (lowChunkAccuracy > failures.length * 0.5) {
      patterns.push('Poor chunk retrieval accuracy');
    }
    if (lowResponseQuality > failures.length * 0.5) {
      patterns.push('Low response quality');
    }
    if (lowGroundedness > failures.length * 0.5) {
      patterns.push('Responses not well grounded in context');
    }
    
    return patterns;
  }

  /**
   * Select test cases optimized for prompt optimization
   */
  private selectOptimizationTestCases(): TestCase[] {
    const allTestCases = this.knowledgeBase.getAllTestCases();
    
    // Select a balanced set focusing on medium/hard cases
    const easyCount = 2;
    const mediumCount = 5;
    const hardCount = 3;
    
    const easy = allTestCases.filter(tc => tc.difficulty === 'easy').slice(0, easyCount);
    const medium = allTestCases.filter(tc => tc.difficulty === 'medium').slice(0, mediumCount);
    const hard = allTestCases.filter(tc => tc.difficulty === 'hard').slice(0, hardCount);
    
    return [...easy, ...medium, ...hard];
  }

  /**
   * Generate detailed optimization report
   */
  generateOptimizationReport(optimizationHistory: OptimizationResult[]): string {
    const finalResult = optimizationHistory[optimizationHistory.length - 1]!;
    const initialScore = optimizationHistory[0]!.bestScore;
    const improvement = finalResult.bestScore - initialScore;
    
    // Analyze which prompt formats were most effective
    const promptAnalysis = this.analyzePromptEffectiveness(finalResult.currentPrompts);
    
    return `# RAG Prompt Optimization Report

## Summary
- **Initial Score**: ${initialScore.toFixed(3)}
- **Final Score**: ${finalResult.bestScore.toFixed(3)}
- **Improvement**: +${improvement.toFixed(3)} (${((improvement / initialScore) * 100).toFixed(1)}%)
- **Iterations**: ${optimizationHistory.length}
- **Total Improvements**: ${finalResult.improvements}

## Score Progress
${optimizationHistory.map(result => 
  `Iteration ${result.iteration}: ${result.bestScore.toFixed(3)}`
).join('\n')}

## Optimal Prompt Format Analysis
${promptAnalysis}

## Common Failure Patterns
${optimizationHistory.map(result => 
  `Iteration ${result.iteration}: ${result.failurePatterns.join(', ') || 'None'}`
).join('\n')}

## Final Optimized Prompts

### Response Generation Prompt
\`\`\`
${finalResult.currentPrompts.responseGeneration}
\`\`\`

### Context Formatting Prompt
\`\`\`
${finalResult.currentPrompts.contextFormatting}
\`\`\`

### Query Enhancement Prompt
\`\`\`
${finalResult.currentPrompts.queryEnhancement}
\`\`\`

## Recommendations
${this.generateRecommendations(finalResult)}
`;
  }

  /**
   * Analyze which prompt formats were most effective
   */
  private analyzePromptEffectiveness(prompts: RetrievalPrompts): string {
    const responseKeys = Object.keys(RESPONSE_GENERATION_TEMPLATES);
    const contextKeys = Object.keys(CONTEXT_FORMATTING_TEMPLATES);
    const queryKeys = Object.keys(QUERY_ENHANCEMENT_TEMPLATES);
    
    // Find which templates match the final prompts
    let responseFormat = 'Custom';
    let contextFormat = 'Custom';
    let queryFormat = 'Custom';
    
    for (const [key, template] of Object.entries(RESPONSE_GENERATION_TEMPLATES)) {
      if (prompts.responseGeneration === template) {
        responseFormat = key;
        break;
      }
    }
    
    for (const [key, template] of Object.entries(CONTEXT_FORMATTING_TEMPLATES)) {
      if (prompts.contextFormatting === template) {
        contextFormat = key;
        break;
      }
    }
    
    for (const [key, template] of Object.entries(QUERY_ENHANCEMENT_TEMPLATES)) {
      if (prompts.queryEnhancement === template) {
        queryFormat = key;
        break;
      }
    }
    
    // Find matching variation set
    const matchingVariationSet = PROMPT_VARIATION_SETS.find(set => 
      set.responseGenerationTemplates.main === prompts.responseGeneration &&
      set.contextFormattingTemplates.main === prompts.contextFormatting &&
      set.queryEnhancementTemplates.main === prompts.queryEnhancement
    );
    
    return `**Optimal Prompt Format Combination:**
- **Response Generation**: ${responseFormat} format
- **Context Formatting**: ${contextFormat} format  
- **Query Enhancement**: ${queryFormat} format
- **Variation Set**: ${matchingVariationSet?.name || 'Custom combination'}

**Format Characteristics:**
- **Response Style**: ${this.getFormatCharacteristics(responseFormat)}
- **Context Style**: ${this.getFormatCharacteristics(contextFormat)}
- **Query Style**: ${this.getFormatCharacteristics(queryFormat)}`;
  }

  /**
   * Get characteristics of prompt format
   */
  private getFormatCharacteristics(format: string): string {
    const characteristics: Record<string, string> = {
      'standard': 'Traditional professional format with clear instructions',
      'markdown': 'Structured markdown with clear sections and emphasis',
      'xml_structured': 'XML-like tags for clear parsing and structure',
      'analytical': 'Step-by-step analytical approach with numbered steps',
      'conversational': 'Friendly, empathetic tone with natural language',
      'systematic': 'Protocol-driven systematic approach',
      'detailed': 'Comprehensive explanatory format with thorough guidance',
      'minimalist': 'Concise, efficient format focusing on brevity',
      'checklist': 'Checklist-based approach ensuring completeness',
      'structured': 'Well-organized format with clear sections',
      'numbered': 'Numbered list format for clear sequencing',
      'categorized': 'Categorized information for better organization',
      'minimal': 'Minimal overhead with essential information only'
    };
    
    return characteristics[format] || 'Custom format';
  }

  /**
   * Generate recommendations based on optimization results
   */
  private generateRecommendations(finalResult: OptimizationResult): string {
    const recommendations: string[] = [];
    
    if (finalResult.bestScore < 0.8) {
      recommendations.push('- Consider longer optimization runs or different mutation strategies');
    }
    
    if (finalResult.improvements < 3) {
      recommendations.push('- Try increasing mutation rate or population size');
    }
    
    if (finalResult.failurePatterns.includes('Poor chunk retrieval accuracy')) {
      recommendations.push('- Focus on improving query enhancement prompts');
    }
    
    if (finalResult.failurePatterns.includes('Responses not well grounded in context')) {
      recommendations.push('- Emphasize context adherence in response generation prompts');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('- Optimization successful! Consider testing with more challenging scenarios');
    }
    
    return recommendations.join('\n');
  }
}