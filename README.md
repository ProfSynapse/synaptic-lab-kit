# Synaptic Lab Kit 🧪

**AI-Powered Testing Framework for LLM Applications**

A modular framework designed for agentic coding systems to quickly assemble testing pipelines for LLM-powered applications through natural language instructions.

## 📋 REQUIRED READING for AI Assistants

**Before working with this framework, AI assistants MUST read:**
- `SYSTEM_PROMPT.md` - Your complete role definition, implementation patterns, and success criteria as **🧪 Lab Kit Agent**

This system prompt contains essential context for your specialized role in building testing pipelines, experiment creation workflows, evaluation strategies, and user handoff procedures.

## 🎯 For AI Assistants: Your Role

**You are the architect, users are the operators.** When a user asks you to test an LLM system:

### Your Responsibilities (AI Assistant):
1. **Build the testing pipeline** using the lab components
2. **Create scenarios and personas** programmatically 
3. **Set up databases and data seeding** if needed
4. **Write the experiment code** that tests their use case
5. **Explain how to run it** via the interactive CLI

### User Responsibilities:
1. **Provide API keys** through the CLI setup
2. **Run the interactive CLI** with `npm run lab`
3. **Execute tests** through the menu interface
4. **Review reports** and iterate based on results

### Division of Labor:
- **AI Assistant** = Heavy lifting (coding, architecture, complex setup)
- **User** = Execution and iteration (running tests, reviewing results)

When a user asks you to test an LLM system, follow these steps:

### 1. **Understand the Request**
Look for these key elements:
- **Domain**: What kind of system? (customer support, code review, content generation, etc.)
- **Test Goals**: What should be validated? (accuracy, empathy, retrieval, etc.)
- **Data Requirements**: Do they need a database? What kind of data?
- **Providers**: Which LLM/embedding providers to use?

### 2. **Assemble the Pipeline**
Use the available components:

```typescript
// Example: Customer Support Testing
const adapter = new GeminiAdapter(); // or OpenAIAdapter, ClaudeAdapter, etc.
const scenarios = await new ScenarioBuilder(adapter).build({
  domain: 'customer-support',
  criteria: ['accuracy', 'empathy', 'resolution']
});

const personas = await new PersonaGenerator(adapter).generate({
  types: ['frustrated_customer', 'confused_customer'],
  count: 5
});

// Setup database if needed
const db = new SupabaseManager();
await new SchemaBuilder(db).createTable('customers', {
  name: 'TEXT', tier: 'TEXT', account_balance: 'DECIMAL'
});
await new DataSeeder(db).generateAndSeed('customers', customerGenerator, 100);
```

### 3. **Run Tests and Generate Reports**
```typescript
const runner = new TestRunner(adapter, evaluator, metrics);
const results = await runner.run(scenarios, personas);

// Generate outputs
await new ReportGenerator().generateMarkdown(results);
await new ChatMLExporter().exportConversations(results); // Training data
```

## 🔧 Available Components

### **LLM Adapters** (`/adapters`)
All implement the same interface - just swap providers:

- **OpenAIAdapter**: GPT-4 Turbo, GPT-4o (with new Responses API)
- **GoogleAdapter**: Gemini 2.5 Pro/Flash (with thinking capabilities)
- **AnthropicAdapter**: Claude Opus 4, Sonnet 4 (with extended thinking)
- **MistralAdapter**: Latest models including OCR, Agents API
- **OpenRouterAdapter**: 400+ models through unified interface
- **RequestyAdapter**: 150+ models through LLM router

### **Embedding Providers** (`/embeddings`)
For semantic search and RAG testing:

- **VoyageEmbeddings**: voyage-3-large (2025 performance leader)
- **OpenAIEmbeddings**: text-embedding-3-small/large
- **CohereEmbeddings**: embed-english-v3.0, embed-multilingual-v3.0
- **GoogleEmbeddings**: text-embedding-004/005
- **MistralEmbeddings**: codestral-embed (code-specific)

### **Database Layer** (`/database`)
Supabase with vector support:

- **SupabaseManager**: Raw SQL execution and client access
- **SchemaBuilder**: Create tables and vector tables from descriptions
- **DataSeeder**: Generate realistic test data with Faker.js
- **VectorManager**: Semantic search and hybrid search
- **QueryBuilder**: Simple query interface

### **Core Framework** (`/core`)
Test orchestration:

- **ScenarioBuilder**: Generate test scenarios from natural language
- **PersonaGenerator**: Create synthetic user personas
- **TestRunner**: Execute tests with scenarios and personas
- **ResponseEvaluator**: Evaluate responses against criteria
- **MetricsCollector**: Aggregate and analyze results

### **Optimization Engine** (`/optimization`)
AI-powered improvement:

- **PromptOptimizer**: Improve prompts based on failures
- **FailureAnalyzer**: Identify patterns in test failures

### **Reporting** (`/reporting`)
Output generation:

- **ReportGenerator**: Human-readable markdown/HTML reports
- **ChatMLExporter**: Training-friendly JSONL format

## 🚀 Quick Start Examples

### Example 1: Customer Support Bot Testing
*User says: "Test our customer support bot for accurate data retrieval"*

```typescript
// 1. Setup database with customer data
const db = new SupabaseManager();
const schema = new SchemaBuilder(db);
await schema.createTable('customers', {
  name: 'TEXT', email: 'TEXT', tier: 'TEXT', account_balance: 'DECIMAL'
});

const seeder = new DataSeeder(db);
await seeder.generateAndSeed('customers', seeder.generators.customer, 100);

// 2. Generate test scenarios
const adapter = new GeminiAdapter();
const scenarios = await new ScenarioBuilder(adapter).build({
  domain: 'customer-support',
  criteria: ['accuracy', 'empathy', 'data_retrieval'],
  count: 15
});

// 3. Create personas
const personas = await new PersonaGenerator(adapter).generate({
  types: ['frustrated_customer', 'confused_customer', 'urgent_customer'],
  count: 5
});

// 4. Run tests
const evaluator = new ResponseEvaluator(adapter);
const runner = new TestRunner(adapter, evaluator, new MetricsCollector());
const results = await runner.run(scenarios, personas);

// 5. Generate reports
await new ReportGenerator().generateMarkdown(results);
await new ChatMLExporter().exportConversations(results);
```

### Example 2: Documentation Search Testing
*User says: "Test semantic search for our documentation to ensure relevant results"*

```typescript
// 1. Setup vector database
const db = new SupabaseManager();
const embeddings = new VoyageEmbeddings('voyage-3-large');
const vectors = new VectorManager(db, embeddings);

await vectors.createVectorTable('documentation', {
  title: 'TEXT', content: 'TEXT', category: 'TEXT'
});

// 2. Seed documentation with embeddings
const docs = [
  { title: 'Password Reset Guide', content: 'How to reset your password...', category: 'account' },
  { title: 'Payment Methods', content: 'We accept credit cards...', category: 'billing' }
];
await vectors.insertWithEmbeddings('documentation', docs, 'content');

// 3. Test semantic search scenarios
const scenarios = await new ScenarioBuilder(adapter).build({
  domain: 'documentation-search',
  criteria: ['relevance', 'completeness', 'accuracy'],
  context: { search_type: 'semantic' }
});

// 4. Run and evaluate
const results = await runner.run(scenarios, personas);
```

### Example 3: Multi-Provider Comparison
*User says: "Compare GPT-4 vs Claude 4 for code review accuracy"*

```typescript
// Test with multiple providers
const providers = {
  'gpt-4': new OpenAIAdapter(),
  'claude-4': new AnthropicAdapter()
};

const allResults = {};
for (const [name, adapter] of Object.entries(providers)) {
  const runner = new TestRunner(adapter, evaluator, metrics);
  allResults[name] = await runner.run(scenarios, personas);
}

// Generate comparison report
await new ComparisonReporter().generateComparison(allResults);
```

## 📊 Validation & Evaluation

The framework uses sophisticated AI-powered evaluation, **not keyword matching**:

### Evaluation Methods
- **LLM-as-Judge**: Uses AI to evaluate response quality
- **Semantic Similarity**: Vector-based meaning comparison using embeddings
- **Multi-Criteria Scoring**: Combines multiple evaluation dimensions
- **Behavioral Testing**: Tests if instructions actually work in practice
- **Database Verification**: Checks facts against ground truth data
- **Multi-Model Consensus**: Averages evaluations from multiple AI models

### How It Works
```typescript
// LLM-as-Judge evaluation
const evaluationPrompt = `
You are an expert evaluator. Score this response:
Original Question: "${input}"
AI Response: "${response}"

Rate each criterion from 0.0 to 1.0:
- Accuracy: Is the information factually correct?
- Relevance: Does it directly address the question?
- Completeness: Does it cover all aspects asked?

Provide scores as JSON: {"accuracy": 0.85, "relevance": 0.90, ...}
`;

// Semantic similarity using embeddings
const expectedEmbedding = await embeddingProvider.embed(expectedOutput);
const actualEmbedding = await embeddingProvider.embed(response.content);
const semanticSimilarity = calculateCosineSimilarity(expectedEmbedding, actualEmbedding);

// Multi-model consensus
const evaluations = await Promise.all([
  evaluateWithGPT4(response, criteria),
  evaluateWithClaude(response, criteria),  
  evaluateWithGemini(response, criteria)
]);
const consensusScore = calculateWeightedAverage(evaluations);
```

### Example: Why Not Keywords
```typescript
// ❌ Keyword matching would miss this:
// Question: "How do I return a defective product?"
// Good Response: "To send back your faulty item, visit our returns portal..."
// Keywords: No "return", "defective", or "product" - but semantically perfect!

// ✅ Our AI evaluation catches semantic meaning:
const evaluation = await llmJudge.evaluate({
  question: "How do I return a defective product?",
  response: "To send back your faulty item, visit our returns portal...",
  criteria: ["accuracy", "completeness", "helpfulness"]
});
// Result: High scores because it understands the meaning, not just words
```

## 📁 Project Structure

```
synaptic-lab-kit/
├── 📋 README.md                      # This file - instructions for AI agents
├── 🏗️ ARCHITECTURE.md               # Detailed architecture overview
├── 📚 API_REFERENCE.md               # Latest provider APIs (2025)
├── 🛠️ IMPLEMENTATION_PLAN.md         # Step-by-step build guide
├── 🔐 .env.example                   # Environment template
├── 🔧 .mcp.json                      # Supabase MCP configuration
├── 📦 package.json                   # Dependencies and scripts
│
├── 🔌 adapters/                      # LLM provider adapters
│   ├── BaseAdapter.ts                # Abstract base for all adapters
│   ├── types.ts                      # Shared adapter types
│   ├── OpenAIAdapter.ts              # OpenAI + Responses API
│   ├── GoogleAdapter.ts              # Gemini 2.5 with thinking
│   ├── AnthropicAdapter.ts           # Claude 4 with extended thinking
│   ├── MistralAdapter.ts             # Mistral + Agents API
│   ├── OpenRouterAdapter.ts          # 400+ models
│   ├── RequestyAdapter.ts            # 150+ models
│   └── index.ts                      # Exports and factory
│
├── 💾 database/                      # Supabase integration
│   ├── SupabaseManager.ts            # Database connection and queries
│   ├── SchemaBuilder.ts              # Dynamic schema creation
│   ├── DataSeeder.ts                 # Test data generation
│   ├── VectorManager.ts              # Semantic search operations
│   ├── QueryBuilder.ts               # Simple query interface
│   └── types.ts                      # Database types
│
├── 🧠 embeddings/                    # Vector embeddings
│   ├── BaseEmbeddingProvider.ts      # Abstract base for embeddings
│   ├── VoyageEmbeddings.ts           # Voyage AI (2025 leader)
│   ├── OpenAIEmbeddings.ts           # OpenAI embeddings
│   ├── CohereEmbeddings.ts           # Cohere embeddings
│   ├── GoogleEmbeddings.ts           # Google embeddings
│   ├── MistralEmbeddings.ts          # Mistral code embeddings
│   └── types.ts                      # Embedding types
│
├── 🧪 core/                          # Test framework
│   ├── TestRunner.ts                 # Main test orchestrator
│   ├── ScenarioBuilder.ts            # Generate test scenarios
│   ├── PersonaGenerator.ts           # Create synthetic personas
│   ├── ResponseEvaluator.ts          # Evaluate LLM responses
│   ├── MetricsCollector.ts           # Aggregate test metrics
│   └── types.ts                      # Core framework types
│
├── 🔄 optimization/                  # Prompt optimization
│   ├── PromptOptimizer.ts            # AI-powered prompt improvement
│   ├── FailureAnalyzer.ts            # Pattern detection in failures
│   └── types.ts                      # Optimization types
│
├── 📊 reporting/                     # Output generation
│   ├── ReportGenerator.ts            # Markdown/HTML reports
│   ├── ChatMLExporter.ts             # Training data (JSONL)
│   ├── ComparisonReporter.ts         # Multi-provider comparisons
│   └── types.ts                      # Report types
│
├── 🛠️ utils/                         # Shared utilities
│   ├── ConfigManager.ts              # Environment configuration
│   ├── Logger.ts                     # Logging utility
│   └── PromptLoader.ts               # Load prompts from files
│
├── 📚 examples/                      # Example configurations
│   ├── customer-support.yaml         # Customer support testing
│   ├── code-review.yaml              # Code review validation
│   ├── content-generation.yaml       # Content quality testing
│   └── run-examples.ts               # Example execution script
│
└── 🏃 cli-interactive.ts             # Interactive CLI (chat-like interface)
```

## 🔐 Environment Setup

Copy `.env.example` to `.env` and add your API keys:

```bash
# LLM Providers
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=AIza...
ANTHROPIC_API_KEY=sk-ant-...
MISTRAL_API_KEY=...
OPENROUTER_API_KEY=sk-or-...
REQUESTY_API_KEY=...

# Embedding Providers (some overlap with LLM)
COHERE_API_KEY=...
VOYAGE_API_KEY=...

# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_ACCESS_TOKEN=sbp_...  # For MCP server
```

## 📖 Usage Patterns

### Pattern 1: Domain-Specific Testing
When user describes a specific domain to test:

1. **Identify domain** (customer-support, code-review, etc.)
2. **Setup appropriate database schema**
3. **Generate domain-specific scenarios and personas**
4. **Choose optimal provider** for the use case
5. **Run tests and generate reports**

### Pattern 2: Provider Comparison
When user wants to compare multiple providers:

1. **Use same scenarios/personas across providers**
2. **Run tests in parallel** or sequence
3. **Generate comparison reports**
4. **Highlight strengths/weaknesses** of each

### Pattern 3: Semantic Search Validation
When testing retrieval or RAG systems:

1. **Setup vector database** with embeddings
2. **Seed with realistic data**
3. **Test semantic search accuracy**
4. **Validate context retrieval**

### Pattern 4: Prompt Optimization
When tests reveal failures:

1. **Analyze failure patterns**
2. **Generate improved prompts**
3. **Re-test with optimized prompts**
4. **Iterate until target accuracy**

## 🚀 Interactive CLI Experience

After you (AI assistant) create the testing pipeline, users interact through a single chat-like CLI:

```bash
# Setup (done once)
npm install
cp .env.example .env
# Edit .env with your API keys

# Launch interactive CLI
npm run lab
```

**The CLI provides a streamlined experience:**
- 🧪 **Run Experiments** - Choose and run AI experiments with model selection
- 🔑 **Setup API Keys** - Add, list, test, and remove provider credentials  
- ❓ **Help & Documentation** - Built-in guidance and experiment descriptions

**Key Feature**: Users stay inside the CLI (like a chat) rather than running individual commands.

**Typical Workflow:**
1. **AI Assistant** (you) creates the testing pipeline code
2. **User** runs `npm run lab` to enter interactive mode
3. **User** sets up API keys (one-time setup)
4. **User** selects experiments and runs tests with preferred models
5. **CLI** handles all execution and provides real-time feedback

## 🎮 CLI User Guide

### **For Users: How to Run Your Tests**

Once an AI assistant creates your experiment, here's how to execute it:

#### **One-Time Setup:**
```bash
# 1. Install dependencies
npm install

# 2. Start the interactive CLI
npm run lab
```

#### **CLI Navigation:**
- Use **arrow keys** to navigate menus
- Press **Enter** to select options
- Type **responses** when prompted
- Use **Ctrl+C** to exit at any time

#### **Streamlined Workflows:**

**🚀 First Time Users:**
1. Run `npm run lab`
2. Select "🔑 Setup API Keys" 
3. Add API keys for your preferred providers
4. Select "🧪 Run Experiments"
5. Choose an experiment and run it

**🧪 Running Experiments:**
1. Select "🧪 Run Experiments"
2. Choose your experiment from the list
3. Select test options (baseline/optimize/validate)
4. Choose model (local Ollama or cloud provider)
5. Review results in the CLI

**🔑 Managing API Keys:**
1. Select "🔑 Setup API Keys"
2. Add/list/test/remove provider credentials
3. Get links to provider signup pages

**📊 Viewing Results:**
- Results are displayed in the CLI
- Full reports saved to `/outputs/` folder
- Training data exported as JSONL files

#### **Tips:**
- **API keys are managed in the CLI** - no need to manually edit .env
- **Check outputs folder** for detailed reports
- **Help section** shows available experiments and providers
- **Local models** (Ollama) work without API keys

## 📊 Output Formats

### Human-Readable Reports
- **Markdown reports** with summaries and analysis
- **HTML dashboards** with interactive charts
- **Failure analysis** with recommendations

### Training-Friendly Data
- **JSONL ChatML format** for fine-tuning
- **Conversation logs** with metadata
- **Evaluation scores** for each interaction

## 🎯 Success Criteria

A successful test run should produce:

1. ✅ **Comprehensive scenarios** covering edge cases
2. ✅ **Diverse personas** with realistic behaviors  
3. ✅ **Accurate evaluations** against defined criteria
4. ✅ **Actionable insights** for improvement
5. ✅ **Training data** in JSONL format
6. ✅ **Clear reports** for stakeholders

## 🧪 Building Custom Experiments (For AI Assistants)

### **Quick Start: Use the Experiment Template**

For any new testing requirement, start with the template:

```bash
# 1. Copy the experiment template
cp -r experiments/experiment-template experiments/your-experiment-name

# 2. Update the configuration
# Edit experiments/your-experiment-name/experiment.config.ts

# 3. Implement your logic
# Edit experiments/your-experiment-name/index.ts

# 4. Test your experiment
npm run lab  # Your experiment appears automatically!
```

### **Step-by-Step Experiment Creation**

The framework includes an **Experiment Registry** that makes adding new experiments trivial:

### **Step 1: Create Experiment Directory**
```bash
mkdir experiments/your-experiment-name/
```

### **Step 2: Add Configuration**
Create `experiments/your-experiment-name/experiment.config.ts`:
```typescript
import { ExperimentConfig } from '../ExperimentRegistry';

export const config: ExperimentConfig = {
  id: 'your-experiment-id',
  name: 'Your Experiment Name', 
  description: 'Brief description of what this experiment does',
  icon: '🔬',
  category: 'evaluation', // training | evaluation | optimization | analysis
  difficulty: 'beginner', // beginner | intermediate | advanced
  estimatedTime: '5-15 minutes',
  
  requirements: {
    localModels: ['llama3.1:8b'],      // Required Ollama models
    apiKeys: ['OPENAI_API_KEY'],       // Required API keys
    dependencies: ['some-package']      // Required npm packages
  },

  options: [
    {
      id: 'quick',
      name: 'Quick Test',
      description: 'Fast validation',
      type: 'quick',
      estimatedTime: '2 minutes',
      command: ['npx', 'tsx', 'experiments/your-experiment/run.ts', 'quick']
    }
  ]
};
```

### **Step 3: Implement Experiment**
Create `experiments/your-experiment-name/index.ts`:
```typescript
import { config } from './experiment.config';
export { config };

export async function run(option: string, model?: string, args?: any): Promise<void> {
  console.log(`🔬 Running ${config.name}: ${option}`);
  
  // Your experiment logic here
  switch (option) {
    case 'quick':
      await runQuickTest(model);
      break;
  }
}

async function runQuickTest(model: string): Promise<void> {
  // Implementation here
}
```

### **Step 4: Automatic CLI Integration**
Your experiment **automatically appears** in the interactive CLI! No additional configuration needed.

### **Common Experiment Patterns**

#### **Pattern A: Simple Evaluation**
```typescript
// Test a single aspect (accuracy, empathy, etc.)
export async function run(option: string, model?: string): Promise<void> {
  const adapter = createAdapter('openai'); // or user's preferred provider
  const scenarios = await new ScenarioBuilder(adapter).build({
    domain: 'your-domain',
    criteria: ['accuracy'],
    count: 10
  });
  
  const evaluator = new ResponseEvaluator(adapter);
  const results = await new TestRunner(adapter, evaluator).run(scenarios);
  
  await new ReportGenerator().generateMarkdown(results, 'outputs/');
}
```

#### **Pattern B: Provider Comparison**
```typescript
// Compare multiple providers on same task
export async function run(option: string): Promise<void> {
  const providers = ['openai', 'anthropic', 'google'];
  const scenarios = await generateScenarios();
  
  const results = {};
  for (const provider of providers) {
    const adapter = createAdapter(provider);
    results[provider] = await runTests(adapter, scenarios);
  }
  
  await new ComparisonReporter().generate(results);
}
```

#### **Pattern C: Database-Driven Testing**
```typescript
// Test with real data scenarios
export async function run(option: string): Promise<void> {
  // Setup database
  const db = new SupabaseManager();
  await setupSchema(db);
  await seedTestData(db);
  
  // Run tests that query the database
  const scenarios = await generateDatabaseScenarios(db);
  const results = await runTests(scenarios);
  
  await generateReports(results);
}
```

#### **Pattern D: Semantic Search Validation**
```typescript
// Test RAG/retrieval systems
export async function run(option: string): Promise<void> {
  const embeddings = new VoyageEmbeddings();
  const vectors = new VectorManager(db, embeddings);
  
  // Setup vector database
  await vectors.createVectorTable('documents');
  await vectors.insertWithEmbeddings('documents', testDocs);
  
  // Test semantic search accuracy
  const searchTests = await generateSearchScenarios();
  const results = await evaluateSearchResults(vectors, searchTests);
  
  await generateReports(results);
}
```

### **Experiment Configuration Guide**

```typescript
export const config: ExperimentConfig = {
  id: 'unique-experiment-id',
  name: 'Human-Readable Name',
  description: 'What this experiment tests and why it matters',
  icon: '🔬', // Emoji for CLI display
  category: 'evaluation', // training | evaluation | optimization | analysis
  difficulty: 'beginner', // beginner | intermediate | advanced
  estimatedTime: '5-15 minutes',
  
  // What's needed to run this experiment
  requirements: {
    localModels: ['llama3.1:8b'],      // Ollama models (if needed)
    apiKeys: ['OPENAI_API_KEY'],       // Required API keys
    dependencies: ['faker']            // npm packages (if needed)
  },

  // Different ways to run the experiment
  options: [
    {
      id: 'quick',
      name: 'Quick Validation (2 min)',
      description: 'Fast test with 5 scenarios',
      type: 'quick',
      estimatedTime: '2 minutes',
      command: ['npx', 'tsx', 'experiments/your-experiment/index.ts', 'quick']
    },
    {
      id: 'full',
      name: 'Comprehensive Test (15 min)',
      description: 'Full evaluation with 50 scenarios',
      type: 'full', 
      estimatedTime: '15 minutes',
      command: ['npx', 'tsx', 'experiments/your-experiment/index.ts', 'full']
    }
  ]
};
```

### **Best Practices for AI Assistants**

1. **Always start with the template** - Don't build from scratch
2. **Use descriptive names** - Make it clear what the experiment tests
3. **Provide multiple options** - Quick test + comprehensive test
4. **Include realistic data** - Use DataSeeder for believable test data
5. **Generate meaningful reports** - Focus on actionable insights
6. **Test locally first** - Validate with small scenarios before full runs
7. **Document requirements** - Be explicit about needed API keys/models

### **Template Available**
Always copy `/experiments/experiment-template/` as your starting point.

## 📁 Example Experiments 

The framework includes real-world experiments that demonstrate best practices for building different types of tests. **Study these examples** to understand effective experiment design patterns:

### **🤔 Doubt Training (`/experiments/doubt-training/`)**
**Purpose**: Train models to express calibrated confidence and uncertainty  
**Pattern**: Prompt optimization using genetic algorithms  
**Features**:
- Systematic prompt variations (plain text, markdown, XML formats)
- Confidence calibration across different question types
- Genetic algorithm for automated prompt improvement
- Multi-model testing and comparison

**Key Lessons**:
- How to implement systematic prompt variation strategies
- Using genetic algorithms for prompt optimization
- Measuring confidence calibration and overconfidence bias
- Creating training data for model fine-tuning

### **🎧 RAG Customer Support (`/experiments/rag-customer-support/`)**
**Purpose**: Optimize RAG prompts for customer support scenarios  
**Pattern**: Hybrid evaluation with concrete retrieval + LLM-as-judge  
**Features**:
- Local Ollama embeddings (nomic-embed-text) 
- Knowledge base with 18 support documents
- Hybrid evaluation: chunk retrieval accuracy + response quality
- Systematic prompt format testing (markdown, XML, conversational, etc.)

**Key Lessons**:
- Building RAG pipelines with local embeddings
- Implementing hybrid evaluation approaches
- Testing systematic prompt format variations
- Using concrete metrics alongside LLM evaluation

### **📝 Content Generation (`/experiments/content-generation/`)**
**Purpose**: Validate content quality across different domains  
**Pattern**: Multi-criteria evaluation with style consistency  
**Features**:
- Domain-specific persona generation
- Style guide adherence testing
- Brand voice consistency evaluation
- Multi-provider comparison

**Key Lessons**:
- Domain-specific testing approaches
- Style and brand consistency evaluation
- Multi-criteria scoring systems

### **🔍 Code Review (`/experiments/code-review/`)**
**Purpose**: Test AI code review accuracy and completeness  
**Pattern**: Ground truth validation with expert annotations  
**Features**:
- Real code samples with known issues
- Security vulnerability detection
- Best practice enforcement
- Explanation quality assessment

**Key Lessons**:
- Ground truth dataset construction
- Technical accuracy evaluation
- Security-focused testing

### **🧪 Experiment Template (`/experiments/experiment-template/`)**
**Purpose**: Starting point for new experiments  
**Pattern**: Minimal example with all necessary components  
**Features**:
- Complete experiment structure
- Configuration template
- CLI integration setup
- Documentation examples

**Key Lessons**:
- Standard experiment architecture
- Configuration best practices
- CLI integration patterns

### **💡 How to Learn from Examples**

1. **Read the experiment configs** (`experiment.config.ts`) to understand structure
2. **Study the main implementation** (`index.ts`) to see patterns
3. **Look at evaluation approaches** (how success is measured)
4. **Run the experiments** yourself to see outputs
5. **Copy and modify** for your own use cases

### **🎯 Choosing the Right Pattern**

- **Prompt Optimization** → Study `doubt-training` for genetic algorithms
- **RAG Testing** → Study `rag-customer-support` for hybrid evaluation  
- **Content Quality** → Study `content-generation` for multi-criteria evaluation
- **Technical Accuracy** → Study `code-review` for ground truth validation
- **Starting Fresh** → Copy `experiment-template` as your base

## 🔍 When to Use Each Component

### **Use ScenarioBuilder when:**
- User provides domain description
- Need edge case generation
- Want comprehensive test coverage

### **Use PersonaGenerator when:**
- Testing user interactions
- Need behavioral diversity
- Simulating real user types

### **Use VectorManager when:**
- Testing semantic search
- Validating RAG systems
- Checking similarity matching

### **Use PromptOptimizer when:**
- Tests show consistent failures
- Need iterative improvement
- Want automated optimization

### **Use multiple providers when:**
- Comparing performance
- Need fallback options
- Testing provider-specific features

## 🎭 AI Agent Decision Tree

```
User Request
    ├── Contains "test" or "validate"?
    │   ├── Mentions specific domain?
    │   │   ├── Setup domain-specific pipeline
    │   │   └── Use appropriate examples
    │   ├── Mentions "compare" or "vs"?
    │   │   └── Setup multi-provider comparison
    │   ├── Mentions "semantic" or "search"?
    │   │   └── Setup vector testing pipeline
    │   └── Mentions "data" or "database"?
    │       └── Setup database with test data
    ├── Contains "optimize" or "improve"?
    │   └── Use PromptOptimizer with existing results
    └── Contains "report" or "analyze"?
        └── Generate reports from existing results
```

This framework is designed to be intuitive for AI agents while providing comprehensive testing capabilities for LLM applications. Focus on understanding user intent and assembling the appropriate components to meet their testing needs.