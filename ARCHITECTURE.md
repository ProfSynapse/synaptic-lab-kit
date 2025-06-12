# Synaptic Lab Kit - Architecture Overview

## 🎯 Purpose

The Synaptic Lab Kit is a modular framework designed for agentic coding systems to quickly assemble testing pipelines for LLM-powered applications. It enables AI agents to understand requirements, build test scenarios, and validate system performance through natural language instructions.

## 🏗️ Architecture Principles

### SOLID Principles Applied
- **Single Responsibility**: Each component has one clear purpose
- **Open/Closed**: Extensible without modifying existing code
- **Liskov Substitution**: All providers/components are interchangeable
- **Interface Segregation**: Small, focused interfaces
- **Dependency Inversion**: Depend on abstractions, not implementations

### DRY (Don't Repeat Yourself)
- Shared base classes for common functionality
- Utility functions for repetitive tasks
- Type definitions reused across components

### AI-First Design
- Clear, readable structure for AI comprehension
- Self-documenting code with descriptive names
- Minimal cognitive overhead for assembly

## 🔧 Core Components

### 1. **Adapters Layer** (`/adapters`)
Unified interface to multiple LLM and embedding providers.

```typescript
// All adapters implement this interface
interface LLMAdapter {
  name: string;
  generate(prompt: string, options?: GenerateOptions): Promise<LLMResponse>;
  generateJSON(prompt: string, schema?: any): Promise<any>;
  generateStream(prompt: string, onChunk: (text: string) => void): Promise<LLMResponse>;
  listModels(): Promise<ModelInfo[]>;
  isAvailable(): Promise<boolean>;
}
```

**Provider Coverage:**
- **OpenAI**: GPT-4 Turbo, GPT-4o, including new Responses API
- **Google**: Gemini 2.5 Pro/Flash with thinking capabilities  
- **Anthropic**: Claude Opus 4, Sonnet 4 with extended thinking
- **Mistral**: Latest models including OCR 25.05, Small 3.1
- **OpenRouter**: 400+ models through unified interface
- **Requesty**: 150+ models through LLM router

### 2. **Database Layer** (`/database`)
Supabase-powered data management with vector support.

```typescript
// Core database management
class SupabaseManager {
  sql(query: string, params?: any[]): Promise<any>;
  getClient(): SupabaseClient;
}

// Schema and data operations
class SchemaBuilder {
  createTable(name: string, columns: Record<string, string>): Promise<void>;
  createVectorTable(name: string, columns: Record<string, string>): Promise<void>;
}

class DataSeeder {
  seed(table: string, data: any[]): Promise<void>;
  generateAndSeed(table: string, generator: () => any, count: number): Promise<void>;
}
```

### 3. **Embeddings Layer** (`/embeddings`)  
Vector operations for semantic search testing.

**Provider Coverage:**
- **OpenAI**: text-embedding-3-small/large (latest models)
- **Cohere**: embed-english-v3.0, embed-multilingual-v3.0
- **Voyage**: voyage-3-large (performance leader), voyage-3-lite  
- **Google**: text-embedding-004/005
- **Mistral**: Codestral Embed (code-specific)

### 4. **Core Framework** (`/core`)
Test orchestration and execution engine.

```typescript
// Main orchestrator
class TestRunner {
  async run(scenarios: TestScenario[], personas: Persona[]): Promise<TestResult[]>;
}

// Scenario generation
class ScenarioBuilder {
  async build(description: TestDescription): Promise<TestScenario[]>;
}

// Synthetic user simulation  
class PersonaGenerator {
  async generate(requirements: PersonaRequirements): Promise<Persona[]>;
}
```

### 5. **Optimization Engine** (`/optimization`)
AI-powered prompt improvement system.

```typescript
class PromptOptimizer {
  async optimize(prompt: string, failures: TestFailure[]): Promise<string>;
}

class FailureAnalyzer {
  async analyzePatterns(results: TestResult[]): Promise<FailureAnalysis>;
}
```

### 6. **Reporting Layer** (`/reporting`)
Output generation for humans and training systems.

```typescript
class ReportGenerator {
  async generateMarkdown(results: TestResult[]): Promise<string>;
  async generateHTML(results: TestResult[]): Promise<string>;
}

// Training-friendly format
class ChatMLExporter {
  async exportConversations(results: TestResult[]): Promise<ChatMLRecord[]>;
}
```

## 🔌 Provider Integration Patterns

### LLM Adapters
Each provider implements `BaseAdapter` with standardized methods:

```typescript
abstract class BaseAdapter {
  constructor(envKeyName: string, defaultModel: string);
  abstract generate(prompt: string, options?: GenerateOptions): Promise<LLMResponse>;
  // ... other required methods
}
```

### Environment Configuration
Simple `.env` based configuration:

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
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_ACCESS_TOKEN=...  # For MCP
```

### Model Context Protocol (MCP)
Direct AI-database communication via `.mcp.json`:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y", "@supabase/mcp-server-supabase@latest",
        "--access-token", "${SUPABASE_ACCESS_TOKEN}"
      ]
    }
  }
}
```

## 📊 Data Flow Architecture

### 1. **Assembly Phase**
```
User Description → ScenarioBuilder → Test Scenarios
                → PersonaGenerator → Synthetic Personas  
                → SchemaBuilder → Database Schema
                → DataSeeder → Test Data
```

### 2. **Execution Phase**
```
TestRunner → LLMAdapter → Generate Response
          → ResponseEvaluator → Evaluate Quality
          → MetricsCollector → Aggregate Results
```

### 3. **Optimization Phase**
```
TestResult → FailureAnalyzer → Identify Patterns
          → PromptOptimizer → Generate Improvements
          → TestRunner → Re-test (Loop)
```

### 4. **Output Phase**
```
TestResults → ReportGenerator → Human-readable Reports
           → ChatMLExporter → Training Data (JSONL)
```

## 🎭 Usage Patterns for AI Agents

### Example: Customer Support Testing
When user says: *"Test customer support bot for accurate data retrieval"*

```typescript
// 1. Assembly
const scenarios = await new ScenarioBuilder().build({
  domain: 'customer-support',
  criteria: ['accuracy', 'empathy', 'resolution']
});

const personas = await new PersonaGenerator().generate({
  types: ['frustrated_customer', 'confused_customer'],
  count: 10
});

// 2. Database Setup  
const schema = new SchemaBuilder(db);
await schema.createTable('customers', {
  name: 'TEXT', email: 'TEXT', tier: 'TEXT'
});
await new DataSeeder(db).generateAndSeed('customers', customerGenerator, 100);

// 3. Testing
const runner = new TestRunner({
  adapter: new OpenAIAdapter(),
  evaluator: new ResponseEvaluator(['accuracy', 'empathy'])
});

const results = await runner.run(scenarios, personas);

// 4. Output
await new ReportGenerator().generateMarkdown(results);
await new ChatMLExporter().exportConversations(results);
```

## 🔍 Reference Files from Current System

### Patterns to Extract:
- **PromptOptimizationPipeline** (`scripts/promptOptimization/pipeline.ts`)
- **LLMProviderManager** (`services/llm/LLMProviderManager.ts`)  
- **SupabaseAdapter** (`services/database/SupabaseAdapter.ts`)
- **SyntheticUserEnvironment** (`scripts/syntheticUserFramework/SyntheticUserEnvironment.ts`)
- **PersonaLoader** (`scripts/syntheticUserFramework/PersonaLoader.ts`)
- **ResponseEvaluator** (`scripts/promptOptimization/responseEvaluator.ts`)

### Types to Reuse:
- **TestScenario** (`scripts/promptOptimization/types.ts`)
- **UserPersona** (`scripts/syntheticUserFramework/PersonaLoader.ts`)
- **LLMProvider interfaces** (`types/llmProvider.ts`)

### Configuration Patterns:
- **Environment setup** (`scripts/syntheticUserFramework/SyntheticUserEnvironment.ts`)
- **MCP integration** (`.mcp.json`)
- **Provider switching** (`services/llm/LLMProviderManager.ts`)

## 🚀 Extension Points

### Adding New Providers
1. Extend `BaseAdapter` for LLMs
2. Extend `BaseEmbeddingProvider` for embeddings  
3. Add environment variable
4. Register in factory function

### Adding New Domains
1. Create domain-specific scenario templates
2. Add specialized evaluators
3. Create domain personas
4. Add to examples folder

### Adding New Output Formats
1. Extend `ReportGenerator`
2. Implement new export format
3. Register in CLI options

## 📈 Performance Considerations

### Concurrency
- Parallel provider testing
- Batch embedding generation
- Async database operations

### Caching
- Model response caching
- Embedding caching
- Schema template caching

### Rate Limiting
- Provider-specific limits
- Graceful degradation
- Intelligent retries

This architecture enables rapid assembly of testing pipelines while maintaining flexibility and extensibility for diverse use cases.