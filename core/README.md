# Core Testing Framework

The heart of the testing system - orchestrates test execution, generates realistic scenarios and personas, and evaluates responses using AI-powered methods.

## 🎯 Purpose

The core framework provides the essential components for running comprehensive AI tests:
- **TestRunner**: Orchestrates entire test execution pipeline
- **ScenarioBuilder**: Generates realistic test scenarios from natural language descriptions
- **PersonaGenerator**: Creates synthetic user personas with realistic behaviors
- **ResponseEvaluator**: Evaluates AI responses using sophisticated AI-as-judge methods
- **ResponseGenerator**: Handles response generation with retries and error handling

## 🧪 TestRunner

The main orchestrator that ties everything together.

### Basic Usage
```typescript
import { TestRunner } from './TestRunner';
import { createAdapter } from '../adapters';

const adapter = createAdapter('openai');
const testRunner = new TestRunner();

const testConfig = {
  name: 'Customer Service Test',
  description: 'Test AI customer service responses',
  provider: 'openai',
  scenarios: [
    {
      id: 'return_policy',
      userInput: 'How do I return a defective product?',
      expectedOutput: 'Should mention return window and process',
      metadata: { category: 'returns', difficulty: 'easy' }
    }
  ],
  evaluation: {
    criteria: [
      { name: 'accuracy', type: 'llm_judge', weight: 0.4 },
      { name: 'helpfulness', type: 'semantic_similarity', weight: 0.3 },
      { name: 'completeness', type: 'llm_judge', weight: 0.3 }
    ],
    thresholds: { overall: 0.7, accuracy: 0.8 }
  }
};

// Start test execution
const executionId = await testRunner.startTest(testConfig);

// Monitor progress
testRunner.on('progress', (progress) => {
  console.log(`Progress: ${progress.completed}/${progress.total}`);
});

// Wait for completion
const results = await testRunner.waitForCompletion(executionId);
console.log(`Test completed with ${results.summary.accuracy * 100}% accuracy`);
```

### Advanced Features
```typescript
// Run with multiple personas
const personas = await PersonaGenerator.generatePersonas([
  'frustrated_customer',
  'tech_savvy_user', 
  'elderly_user'
]);

const results = await testRunner.runWithPersonas(testConfig, personas);

// Compare multiple providers
const providers = ['openai', 'anthropic', 'google'];
const comparison = await testRunner.compareProviders(testConfig, providers);

// Run with database context
const dbConfig = {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_ANON_KEY
};
const results = await testRunner.runWithDatabase(testConfig, dbConfig);
```

## 🎭 PersonaGenerator

Creates realistic user personas to simulate diverse user behaviors.

### Basic Persona Generation
```typescript
import { PersonaGenerator } from './PersonaGenerator';

const generator = new PersonaGenerator(adapter);

// Generate from predefined types
const personas = await generator.generatePersonas([
  'frustrated_customer',
  'tech_savvy_user',
  'non_technical_user',
  'elderly_user',
  'impatient_user'
], { count: 3 }); // 3 of each type

// Generate custom personas
const customPersonas = await generator.generateCustomPersonas({
  domain: 'healthcare',
  userTypes: ['patient', 'doctor', 'nurse'],
  traits: ['anxious', 'detailed', 'time_pressed'],
  count: 5
});
```

### Persona Structure
```typescript
interface Persona {
  id: string;
  name: string;
  type: string;
  demographics: {
    age: number;
    occupation: string;
    techComfort: 'low' | 'medium' | 'high';
    communicationStyle: 'direct' | 'verbose' | 'hesitant';
  };
  traits: string[];
  background: string;
  goals: string[];
  frustrations: string[];
  preferredLanguage: string;
  behaviorPatterns: {
    questioningStyle: 'direct' | 'roundabout' | 'multiple';
    patienceLevel: 'low' | 'medium' | 'high';
    detailPreference: 'brief' | 'moderate' | 'comprehensive';
  };
}
```

### Using Personas in Tests
```typescript
// Personas automatically modify user inputs to match their style
const persona = {
  type: 'frustrated_customer',
  traits: ['impatient', 'direct', 'skeptical'],
  behaviorPatterns: { 
    questioningStyle: 'direct',
    patienceLevel: 'low' 
  }
};

// Original: "How do I return this item?"
// With frustrated persona: "This item is broken and I need to return it NOW. What's your return process?"
```

## 🎯 ScenarioBuilder

Generates comprehensive test scenarios from natural language descriptions.

### Domain-Specific Scenarios
```typescript
import { ScenarioBuilder } from './ScenarioBuilder';

const builder = new ScenarioBuilder(adapter);

// Customer service scenarios
const customerScenarios = await builder.build({
  domain: 'customer-support',
  criteria: ['accuracy', 'empathy', 'resolution'],
  count: 20,
  difficulty: ['easy', 'medium', 'hard'],
  categories: ['returns', 'billing', 'technical', 'complaints']
});

// Code review scenarios  
const codeScenarios = await builder.build({
  domain: 'code-review',
  criteria: ['correctness', 'security', 'performance', 'style'],
  count: 15,
  languages: ['javascript', 'python', 'go'],
  issueTypes: ['bugs', 'vulnerabilities', 'performance', 'style']
});

// Healthcare scenarios
const healthScenarios = await builder.build({
  domain: 'healthcare',
  criteria: ['accuracy', 'empathy', 'safety'],
  count: 25,
  specialties: ['general', 'cardiology', 'pediatrics'],
  complexity: ['routine', 'complex', 'emergency']
});
```

### Custom Scenarios
```typescript
// Generate scenarios from examples
const scenarios = await builder.buildFromExamples([
  {
    input: "How do I reset my password?",
    expectedOutput: "Should guide user through reset process",
    category: "account_management"
  },
  {
    input: "Why is my order delayed?",
    expectedOutput: "Should check order status and provide explanation",
    category: "order_tracking"
  }
], { expand: true, count: 10 });

// Generate edge cases
const edgeCases = await builder.generateEdgeCases(baseScenarios, {
  types: ['boundary_conditions', 'error_states', 'unusual_inputs'],
  count: 15
});
```

### Scenario Structure
```typescript
interface TestScenario {
  id: string;
  userInput: string;
  expectedOutput?: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  metadata: {
    domain: string;
    tags: string[];
    estimatedTokens: number;
    language?: string;
    requiresDatabase?: boolean;
    contextNeeded?: string[];
  };
  variations?: string[]; // Alternative ways to ask the same thing
}
```

## 🧠 ResponseEvaluator

Sophisticated AI-powered evaluation that goes far beyond keyword matching.

### Evaluation Methods
```typescript
import { ResponseEvaluator } from './ResponseEvaluator';

const evaluator = new ResponseEvaluator(adapter);

// LLM-as-Judge evaluation
const llmResult = await evaluator.evaluateWithLLM({
  input: "How do I return a product?",
  response: "Visit our returns page and follow the instructions",
  criteria: [
    {
      name: 'accuracy',
      type: 'llm_judge',
      prompt: 'Rate how factually accurate this response is',
      weight: 0.4
    },
    {
      name: 'helpfulness',
      type: 'llm_judge', 
      prompt: 'Rate how helpful this response would be to a customer',
      weight: 0.3
    }
  ]
});

// Semantic similarity evaluation
const semanticResult = await evaluator.evaluateSemanticSimilarity({
  expected: "You can return items within 30 days by visiting our returns portal",
  actual: "Items can be sent back within a month through our online return system",
  threshold: 0.8
});

// Multi-model consensus
const consensusResult = await evaluator.evaluateWithConsensus({
  input: "Technical question about API usage",
  response: "Here's how to use the API...",
  models: ['gpt-4', 'claude-4', 'gemini-2.5'],
  criteria: ['accuracy', 'completeness', 'clarity']
});
```

### Database Verification
```typescript
// Verify facts against database
const dbResult = await evaluator.evaluateWithDatabase({
  input: "What's my account balance?",
  response: "Your account balance is $150.23",
  verificationQueries: [
    {
      table: 'accounts',
      where: { customer_id: 'user123' },
      expectedField: 'balance',
      tolerance: 0.01
    }
  ]
});
```

### Custom Evaluation Criteria
```typescript
// Domain-specific evaluation
const customEvaluator = await evaluator.createCustomEvaluator({
  domain: 'medical',
  criteria: [
    {
      name: 'medical_accuracy',
      type: 'specialist_judge',
      model: 'gpt-4', // Use most capable model for medical eval
      prompt: `As a medical expert, rate the accuracy of this medical advice.
               Consider safety, correctness, and appropriateness.`,
      weight: 0.5
    },
    {
      name: 'empathy',
      type: 'llm_judge',
      prompt: 'Rate how empathetic and caring this response sounds',
      weight: 0.3
    },
    {
      name: 'safety',
      type: 'safety_check',
      prompt: 'Does this response avoid giving dangerous medical advice?',
      weight: 0.2
    }
  ]
});
```

### Evaluation Results
```typescript
interface EvaluationResult {
  overall: number; // 0.0 - 1.0 overall score
  passed: boolean; // Whether it meets thresholds
  criteria: {
    [criterionName: string]: {
      score: number;
      passed: boolean;
      explanation?: string;
      confidence: number;
    };
  };
  feedback: string; // Human-readable feedback
  recommendations: string[]; // Suggestions for improvement
  metadata: {
    evaluationTime: number;
    model: string;
    tokensUsed: number;
    cost: number;
  };
}
```

## 🚀 ResponseGenerator

Handles response generation with advanced features like retries, caching, and error handling.

### Basic Generation
```typescript
import { ResponseGenerator } from './ResponseGenerator';

const generator = new ResponseGenerator(adapter);

const response = await generator.generate({
  input: "User question here",
  context: "Additional context if needed",
  systemPrompt: "You are a helpful customer service agent",
  options: {
    temperature: 0.7,
    maxTokens: 500,
    stopSequences: ["END_RESPONSE"]
  }
});
```

### Advanced Features
```typescript
// With persona modification
const response = await generator.generateWithPersona({
  input: "How do I return this?",
  persona: frustratedCustomerPersona,
  basePrompt: "Help the customer with their return"
});

// With database context
const response = await generator.generateWithContext({
  input: "What's my order status?",
  context: await database.getCustomerContext(customerId),
  includeRecentHistory: true
});

// Batch generation
const responses = await generator.generateBatch([
  { input: "Question 1", context: "Context 1" },
  { input: "Question 2", context: "Context 2" },
  { input: "Question 3", context: "Context 3" }
], { concurrency: 3 });
```

## 🔄 Integration with Other Components

### Complete Test Pipeline
```typescript
async function runCompleteTest(domain: string) {
  // 1. Generate scenarios
  const scenarios = await ScenarioBuilder.build({
    domain,
    count: 20,
    difficulty: ['easy', 'medium', 'hard']
  });

  // 2. Create personas
  const personas = await PersonaGenerator.generatePersonas([
    `${domain}_expert`,
    `${domain}_novice`, 
    `${domain}_frustrated_user`
  ]);

  // 3. Set up evaluation
  const evaluator = new ResponseEvaluator(adapter);
  await evaluator.setupDomainEvaluation(domain);

  // 4. Run tests
  const testRunner = new TestRunner();
  const results = await testRunner.run({
    scenarios,
    personas,
    evaluator,
    provider: 'openai'
  });

  // 5. Generate reports
  return results;
}
```

### Event-Driven Architecture
```typescript
const testRunner = new TestRunner();

// Monitor test progress
testRunner.on('scenario:start', (scenario) => {
  console.log(`Starting scenario: ${scenario.id}`);
});

testRunner.on('scenario:complete', (result) => {
  console.log(`Completed: ${result.scenario.id} - Score: ${result.evaluation.overall}`);
});

testRunner.on('persona:switch', (persona) => {
  console.log(`Switching to persona: ${persona.type}`);
});

testRunner.on('evaluation:complete', (evaluation) => {
  if (!evaluation.passed) {
    console.warn(`Evaluation failed: ${evaluation.feedback}`);
  }
});

testRunner.on('test:complete', (summary) => {
  console.log(`Test complete: ${summary.passed}/${summary.total} passed`);
});
```

## 🎯 Best Practices

### 1. Scenario Design
- **Cover edge cases** - Include boundary conditions and error states
- **Vary difficulty** - Mix easy, medium, and hard scenarios
- **Domain-specific** - Use terminology and contexts from your domain
- **Real user language** - Generate scenarios that match how real users ask questions

### 2. Persona Usage
- **Diverse representation** - Include users with different backgrounds and needs
- **Realistic behaviors** - Base personas on real user research when possible
- **Consistent application** - Ensure personas consistently modify inputs throughout tests
- **Cultural sensitivity** - Consider different cultural communication styles

### 3. Evaluation Strategy
- **Multiple criteria** - Don't rely on a single evaluation metric
- **Appropriate models** - Use your most capable models for evaluation
- **Human validation** - Spot-check AI evaluations with human review
- **Domain expertise** - Include domain-specific evaluation criteria

### 4. Performance Optimization
- **Parallel execution** - Run multiple tests concurrently when possible
- **Caching** - Cache similar inputs to reduce API calls
- **Progressive difficulty** - Start with easier tests to catch obvious issues
- **Early termination** - Stop tests early if failure rate is too high

## 📊 Monitoring & Analytics

### Built-in Metrics
```typescript
const metrics = testRunner.getMetrics();

console.log({
  totalTests: metrics.totalTests,
  passRate: metrics.passRate,
  averageScore: metrics.averageScore,
  testDuration: metrics.averageTestDuration,
  costPerTest: metrics.averageCostPerTest,
  tokenUsage: metrics.totalTokens
});
```

### Real-time Monitoring
```typescript
// Monitor test execution in real-time
testRunner.on('metrics:update', (metrics) => {
  updateDashboard(metrics);
  
  if (metrics.passRate < 0.5) {
    console.warn('Low pass rate detected - consider stopping test');
  }
  
  if (metrics.averageCostPerTest > 0.10) {
    console.warn('High cost per test - consider optimizing prompts');
  }
});
```

The core framework provides everything you need to run sophisticated AI tests that generate realistic scenarios, simulate diverse user behaviors, and evaluate responses using state-of-the-art AI evaluation techniques.