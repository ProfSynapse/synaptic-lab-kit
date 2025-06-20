# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Run CLI in watch mode with tsx
- `npm run build` - Compile TypeScript to dist/
- `npm run build:watch` - Build in watch mode

### Testing
- `npm run test` - Run Jest tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage report

### Linting & Formatting
- `npm run lint` - Run ESLint on src/
- `npm run lint:fix` - Auto-fix ESLint issues
- `npm run format` - Format code with Prettier

### Examples
- `npm run example:customer-support` - Run customer support testing example
- `npm run example:code-review` - Run code review validation example
- `npm run example:content-generation` - Run content generation testing example
- `npm run cli` - Run the CLI directly with tsx

## Architecture Overview

This is a modular testing framework for LLM applications with AI-first design. The system enables agentic coding systems to assemble testing pipelines through natural language instructions.

### Core Module Structure

**Adapters (`/adapters`)** - Unified interface to LLM providers
- All adapters extend `BaseAdapter` with standardized methods
- Providers: OpenAI (with new Responses API), Google Gemini 2.5, Anthropic Claude 4, Mistral, OpenRouter (400+ models), Requesty (150+ models), Ollama
- Key pattern: Provider-agnostic interface with automatic retry and error handling

**Database Layer (`/database`)** - Supabase integration with vector support
- `SupabaseManager` - Core connection management and raw SQL execution
- `SchemaBuilder` - Dynamic table creation from natural language descriptions
- `DataSeeder` - Generate realistic test data with Faker.js
- `VectorManager` - Semantic search operations with pgvector
- Requires environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

**Core Framework (`/core`)** - Test orchestration engine
- `TestRunner` - Main test execution orchestrator
- `ScenarioBuilder` - Generate test scenarios from natural language
- `PersonaGenerator` - Create synthetic user personas
- `ResponseEvaluator` - AI-powered evaluation (not keyword matching)
- Key types defined in `core/types.ts` - comprehensive test scenario and result structures

**Embeddings (`/embeddings`)** - Vector embedding providers
- All extend `BaseEmbeddingProvider`
- Providers: Voyage (2025 performance leader), OpenAI, Cohere, Google, Mistral
- Used for semantic search and similarity scoring

**Optimization (`/optimization`)** - AI-powered prompt improvement
- `PromptOptimizer` - Iteratively improve prompts based on failures
- Supports multiple optimization strategies (genetic, hill climbing, etc.)

**Reporting (`/reporting`)** - Output generation
- `ReportGenerator` - Human-readable markdown/HTML reports
- `ChatMLExporter` - Training data in JSONL format
- `AnalysisEngine` - Deep analysis of test results

### Key Design Patterns

1. **Provider Abstraction** - All LLM/embedding providers implement common interfaces
2. **AI-Powered Evaluation** - Uses LLM-as-Judge, semantic similarity, and multi-criteria scoring instead of keyword matching
3. **Modular Assembly** - Components can be mixed and matched based on test requirements
4. **Natural Language Configuration** - Test scenarios and personas generated from descriptions

### Environment Configuration

Required environment variables:
```bash
# LLM Providers (at least one required)
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=AIza...
ANTHROPIC_API_KEY=sk-ant-...
MISTRAL_API_KEY=...
OPENROUTER_API_KEY=sk-or-...
REQUESTY_API_KEY=...

# Embedding Providers (optional)
COHERE_API_KEY=...
VOYAGE_API_KEY=...

# Database (required for data-driven tests)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_ACCESS_TOKEN=sbp_...  # For MCP server
```

### Testing Pipeline Pattern

When implementing tests, follow this pattern:

1. **Setup Phase** - Create scenarios, personas, and database schema
2. **Execution Phase** - Run tests with TestRunner using adapter and evaluator
3. **Evaluation Phase** - AI-powered evaluation against criteria
4. **Optimization Phase** (optional) - Improve prompts based on failures
5. **Reporting Phase** - Generate reports and export training data

### Important Notes

- The framework uses TypeScript with strict typing throughout
- All async operations use proper error handling with custom error types
- Cost tracking is built into all LLM operations
- The system supports both streaming and non-streaming responses
- Database operations require service role key for admin access
- Vector operations require pgvector extension to be enabled