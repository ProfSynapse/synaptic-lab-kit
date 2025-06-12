# Prompt Optimization Engine

AI-powered prompt optimization using genetic algorithms and failure analysis to automatically improve prompt performance.

## 🎯 Purpose

The optimization engine automatically improves prompts based on test results using:
- **Genetic Algorithms**: Evolve prompts through mutation and crossover
- **AI-Powered Mutations**: Intelligent modifications rather than random changes
- **Multi-Objective Optimization**: Balance accuracy, cost, latency, and other metrics
- **Failure Analysis**: Learn from specific failure patterns
- **Real-time Progress Tracking**: Monitor optimization as it happens

## 🧬 How Genetic Algorithm Works

Think of it as **breeding better prompts** through natural selection:

### 1. Population Initialization
```typescript
import { PromptOptimizer } from './PromptOptimizer';

const optimizer = new PromptOptimizer();

optimizer.configure({
  basePrompt: "Help the user with their customer service question",
  testScenarios: scenarios,
  evaluationCriteria: ['accuracy', 'helpfulness', 'empathy'],
  providers: ['openai'],
  generations: 10,           // How many iterations
  populationSize: 12,        // How many prompt variations per generation
  mutationRate: 0.3          // Probability of mutation
});

const result = await optimizer.optimize();
```

### 2. The Evolution Process
```typescript
// Generation 1: Start with base prompt + random variations
const generation1 = [
  { prompt: "Help the user with their customer service question", score: 0.7 },
  { prompt: "Please assist the customer with their inquiry", score: 0.6 },
  { prompt: "Help the user. Be empathetic and thorough", score: 0.8 }, // ⭐ Best
  // ... more variations
];

// Generation 2: Breed the best prompts
const generation2 = [
  // Keep the best from generation 1 (elitism)
  { prompt: "Help the user. Be empathetic and thorough", score: 0.8 },
  
  // Crossover: Combine good prompts
  { prompt: "Please assist the user. Be empathetic and thorough", score: 0.85 }, // ⭐⭐ Even better!
  
  // Mutations: Smart modifications
  { prompt: "Help the user. Be empathetic, thorough, and provide examples", score: 0.9 }, // 🏆
  // ... more variations
];
```

### 3. Intelligent Mutations
Unlike random changes, the AI suggests meaningful improvements:

```typescript
const mutationTypes = [
  {
    type: 'add_context',
    description: 'Add relevant context or background',
    example: 'Context: Consider the customer\'s history and tier level'
  },
  {
    type: 'add_examples', 
    description: 'Include specific examples',
    example: 'Example: "For a return, you can visit our returns portal at..."'
  },
  {
    type: 'improve_tone',
    description: 'Enhance empathy and helpfulness',
    example: 'I understand this is frustrating. Let me help you resolve this quickly.'
  },
  {
    type: 'add_structure',
    description: 'Organize response format',
    example: 'Please provide: 1) Immediate next step 2) Full explanation 3) Alternative options'
  },
  {
    type: 'domain_expertise',
    description: 'Add domain-specific guidance',
    example: 'For technical issues, ask for error messages and system details first'
  }
];
```

## 🎮 Real Example: Customer Service Optimization

### Initial Prompt
```
"Help the customer with their question"
```
**Score: 0.62** - Generic, lacks guidance

### After 5 Generations
```
"You are an empathetic customer service expert. Help resolve the customer's issue by:
1. Acknowledging their concern
2. Asking clarifying questions if needed  
3. Providing clear, actionable steps
4. Offering alternatives when possible

Context: Consider the customer's account tier and history for personalized assistance."
```
**Score: 0.91** - Much more specific and effective!

### The Evolution Path
```typescript
const evolutionHistory = [
  { generation: 1, bestScore: 0.62, bestPrompt: "Help the customer..." },
  { generation: 2, bestScore: 0.71, bestPrompt: "Help the customer. Be empathetic..." },
  { generation: 3, bestScore: 0.78, bestPrompt: "You are a customer service expert..." },
  { generation: 4, bestScore: 0.84, bestPrompt: "You are an empathetic expert. Provide clear steps..." },
  { generation: 5, bestScore: 0.91, bestPrompt: "You are an empathetic expert. Help resolve by: 1)..." }
];
```

## 🔬 Advanced Features

### Multi-Objective Optimization
```typescript
optimizer.configure({
  basePrompt: "Analyze this code for issues",
  objectives: [
    { name: 'accuracy', type: 'maximize', weight: 0.4 },
    { name: 'response_time', type: 'minimize', weight: 0.2 },
    { name: 'cost', type: 'minimize', weight: 0.2 },
    { name: 'user_satisfaction', type: 'maximize', weight: 0.2 }
  ],
  // Automatically balances competing objectives
});
```

### Provider-Specific Optimization
```typescript
// Optimize for specific model characteristics
const gpt4Optimizer = new PromptOptimizer();
gpt4Optimizer.configure({
  basePrompt: basePrompt,
  providers: ['openai'],
  models: ['gpt-4'],
  optimizationStrategy: 'detailed_instructions', // GPT-4 likes detailed prompts
});

const claudeOptimizer = new PromptOptimizer();
claudeOptimizer.configure({
  basePrompt: basePrompt,
  providers: ['anthropic'],
  models: ['claude-4'],
  optimizationStrategy: 'conversational', // Claude prefers conversational tone
});
```

### Failure-Driven Optimization
```typescript
// Optimize based on specific failure patterns
const failureAnalysis = await optimizer.analyzeFailures(testResults);

const targetedOptimizer = new PromptOptimizer();
targetedOptimizer.configure({
  basePrompt: basePrompt,
  testScenarios: failureAnalysis.problematicScenarios,
  focusAreas: failureAnalysis.weakestCriteria, // Focus on biggest problems
  mutationStrategies: failureAnalysis.suggestedMutations
});
```

## 📊 Real-time Monitoring

### Progress Tracking
```typescript
optimizer.on('generation:start', (generation) => {
  console.log(`🧬 Starting generation ${generation}`);
});

optimizer.on('evaluation:progress', (progress) => {
  console.log(`📊 Evaluated ${progress.completed}/${progress.total} variations`);
});

optimizer.on('improvement:found', (improvement) => {
  console.log(`🎉 New best score: ${improvement.score} (${improvement.improvement}% better)`);
  console.log(`🔥 Best prompt: "${improvement.prompt}"`);
});

optimizer.on('convergence', (result) => {
  console.log(`✅ Optimization converged after ${result.generations} generations`);
  console.log(`🏆 Final score: ${result.bestScore}`);
});
```

### Live Dashboard
```typescript
// Get real-time optimization metrics
const progress = optimizer.getProgress();

const dashboard = {
  currentGeneration: progress.currentGeneration,
  totalGenerations: progress.totalGenerations,
  bestScore: progress.bestScore,
  averageScore: progress.averageScore,
  improvementRate: progress.improvementRate,
  timeElapsed: progress.timeElapsed,
  estimatedTimeRemaining: progress.estimatedTimeRemaining,
  
  // Population diversity
  populationDiversity: progress.populationDiversity,
  stagnationCount: progress.stagnationCount,
  
  // Performance metrics
  totalCost: progress.totalCost,
  avgCostPerGeneration: progress.avgCostPerGeneration,
  tokensUsed: progress.tokensUsed
};
```

## 🎯 Optimization Strategies

### Quick Optimization (Fast Results)
```typescript
const quickResult = await optimizePrompt({
  basePrompt: "Help with customer service",
  testScenarios: scenarios,
  provider: 'openai',
  maxGenerations: 5,      // Fast optimization
  populationSize: 8,      // Smaller population
  mutationRate: 0.4      // Higher mutation for more exploration
});
```

### Thorough Optimization (Best Results)
```typescript
const thoroughResult = await optimizePrompt({
  basePrompt: "Help with customer service", 
  testScenarios: scenarios,
  provider: 'openai',
  maxGenerations: 20,     // More generations
  populationSize: 16,     // Larger population
  mutationRate: 0.2,     // Lower mutation for fine-tuning
  elitismRate: 0.3       // Keep more good prompts
});
```

### Multi-Provider Optimization
```typescript
// Optimize for best overall performance across providers
const multiProviderResult = await optimizer.optimizeAcrossProviders({
  basePrompt: basePrompt,
  providers: ['openai', 'anthropic', 'google'],
  testScenarios: scenarios,
  strategy: 'consensus', // Optimize for average performance across all
});

// Or optimize for each provider separately
const providerSpecificResults = await optimizer.optimizePerProvider({
  basePrompt: basePrompt,
  providers: ['openai', 'anthropic', 'google'],
  testScenarios: scenarios,
  strategy: 'specialized' // Different optimized prompt for each provider
});
```

## 🔧 Configuration Options

### Basic Configuration
```typescript
interface OptimizationConfig {
  basePrompt: string;                    // Starting prompt
  testScenarios: TestScenario[];         // What to test against
  evaluationCriteria: string[];          // What to optimize for
  providers: string[];                   // Which LLM providers to use
  
  // Genetic Algorithm Parameters
  generations: number;                   // How many iterations (default: 10)
  populationSize: number;               // Variations per generation (default: 12)  
  mutationRate: number;                 // Probability of mutation (default: 0.3)
  crossoverRate: number;                // Probability of crossover (default: 0.7)
  elitismRate: number;                  // Top % to keep (default: 0.2)
  
  // Termination Conditions
  maxStagnation: number;                // Stop if no improvement (default: 5)
  targetScore: number;                  // Stop if reached (default: 0.95)
  maxCost: number;                      // Stop if too expensive (default: $10)
  maxTime: number;                      // Stop after time limit (default: 30min)
}
```

### Advanced Configuration
```typescript
interface AdvancedOptimizationConfig extends OptimizationConfig {
  // Mutation Strategies
  mutationStrategies: {
    'add_context': { weight: 0.2, complexity: 'simple' },
    'improve_structure': { weight: 0.3, complexity: 'medium' },
    'domain_expertise': { weight: 0.25, complexity: 'complex' },
    'tone_adjustment': { weight: 0.15, complexity: 'simple' },
    'example_addition': { weight: 0.1, complexity: 'medium' }
  };
  
  // Selection Methods
  selectionMethod: 'tournament' | 'roulette' | 'rank';
  tournamentSize: number;               // For tournament selection
  
  // Diversity Management
  diversityPenalty: number;             // Penalize similar prompts
  nicheRadius: number;                  // How similar is "too similar"
  
  // Adaptive Parameters
  adaptiveMutation: boolean;            // Increase mutation if stagnating
  adaptiveSelection: boolean;           // Change selection pressure over time
}
```

## 📈 Results and Analysis

### Optimization Results
```typescript
interface OptimizationResult {
  bestConfig: {
    prompt: string;
    score: number;
    criteria: Record<string, number>;    // Score breakdown by criterion
  };
  
  convergence: {
    converged: boolean;
    generations: number;
    reason: 'target_reached' | 'stagnation' | 'max_generations' | 'max_cost';
    improvement: number;                 // Total improvement from start
  };
  
  history: Array<{
    generation: number;
    bestScore: number;
    averageScore: number;
    worstScore: number;
    diversity: number;
    bestPrompt: string;
  }>;
  
  recommendations: string[];            // Actionable insights
  
  metadata: {
    strategy: string;
    totalTime: number;
    totalCost: number;
    totalTokens: number;
    startTime: Date;
    endTime: Date;
  };
}
```

### Analysis and Insights
```typescript
// Analyze what made the optimization successful
const analysis = await analyzer.analyzeOptimizationRun(result);

console.log({
  keyImprovements: analysis.keyImprovements,
  // ["Added specific examples", "Improved tone and empathy", "Added structured format"]
  
  mostEffectiveMutations: analysis.mostEffectiveMutations,
  // [{ type: "add_examples", improvementScore: 0.15 }, ...]
  
  convergencePattern: analysis.convergencePattern,
  // "steady_improvement" | "quick_plateau" | "late_breakthrough"
  
  recommendations: analysis.recommendations
  // ["Consider longer optimization for better results", "Try higher mutation rate", ...]
});
```

## 🎛️ Integration with Testing Framework

### Automatic Optimization
```typescript
// Run tests, and if they fail, automatically optimize
const testRunner = new TestRunner();
const results = await testRunner.run(testConfig);

if (results.summary.accuracy < 0.8) {
  console.log('🔧 Accuracy below threshold, starting optimization...');
  
  const optimizer = new PromptOptimizer();
  const optimizationResult = await optimizer.optimizeFromFailures({
    basePrompt: testConfig.systemPrompt,
    failures: results.failures,
    targetAccuracy: 0.85
  });
  
  // Re-run tests with optimized prompt
  testConfig.systemPrompt = optimizationResult.bestConfig.prompt;
  const improvedResults = await testRunner.run(testConfig);
  
  console.log(`🎉 Improved accuracy: ${results.summary.accuracy} → ${improvedResults.summary.accuracy}`);
}
```

### Continuous Optimization
```typescript
// Set up continuous optimization in production
const continuousOptimizer = new ContinuousOptimizer({
  checkInterval: '1 day',
  minSampleSize: 100,
  optimizationTrigger: {
    accuracyDrop: 0.05,      // Optimize if accuracy drops by 5%
    userComplaintRate: 0.1   // Or if 10% of users complain
  }
});

continuousOptimizer.monitor(productionSystem);
```

## 🚀 Best Practices

### 1. Start Simple
- Begin with a basic prompt and let evolution add complexity
- Use smaller populations and fewer generations for initial experiments
- Test optimization on a subset of scenarios first

### 2. Choose Good Test Scenarios  
- Include diverse, realistic scenarios
- Cover edge cases and failure modes
- Ensure scenarios represent real user interactions

### 3. Monitor Progress
- Watch for early convergence (may need more diversity)
- Track cost vs. improvement trade-offs
- Stop early if improvement stagnates

### 4. Multi-Stage Optimization
```typescript
// Stage 1: Broad exploration
const stage1 = await optimizer.optimize({
  generations: 10,
  populationSize: 16,
  mutationRate: 0.4,     // High mutation for exploration
});

// Stage 2: Fine-tuning
const stage2 = await optimizer.optimize({
  basePrompt: stage1.bestConfig.prompt,
  generations: 15,
  populationSize: 12,
  mutationRate: 0.2,     // Lower mutation for refinement
});
```

### 5. Cross-Validation
```typescript
// Validate optimized prompts on unseen scenarios
const validationScenarios = await ScenarioBuilder.build({
  domain: 'customer-support',
  count: 50,
  excludeSimilarTo: trainingScenarios  // Ensure no overlap
});

const validationResults = await testRunner.run({
  scenarios: validationScenarios,
  systemPrompt: optimizedPrompt
});
```

The optimization engine transforms the tedious manual process of prompt engineering into an automated, data-driven approach that consistently produces better results than human iteration alone! 🧬✨