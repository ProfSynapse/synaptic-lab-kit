# API Reference - Latest Provider Documentation (2025)

## 🚨 Important Updates

This document contains the latest API information as of June 2025. Many providers have made significant changes since most AI training data cutoffs.

## 🧪 For AI Assistants

Use this reference when building testing pipelines. The Synaptic Lab Kit abstracts these APIs through unified adapters, so you focus on test logic while the framework handles provider differences.

**Your Role**: Select appropriate models based on:
- **Use case requirements** (accuracy vs speed vs cost)
- **User budget constraints** (token pricing varies significantly)
- **Feature needs** (thinking, multimodal, function calling)
- **Context window requirements** (document length, conversation history)

**User Role**: Execute via interactive CLI after you've built the pipeline.

## 🤖 LLM Providers

### OpenAI (Latest: Responses API)

**🆕 Major Update**: OpenAI introduced the **Responses API** in March 2025, replacing Chat Completions by mid-2026.

**Base URL**: `https://api.openai.com/v1`

**Latest Models (June 2025)**:
- `gpt-4o` - Most capable, multimodal
- `gpt-4o-mini` - Fast and efficient  
- `o1-preview` - Advanced reasoning
- `o1-mini` - Fast reasoning

**New Responses API Features**:
```typescript
// New Responses API (replaces Chat Completions)
const response = await openai.responses.create({
  model: "gpt-4.1",
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "Hello!" }
  ],
  // New features
  response_format: { type: "json_object" }, // JSON mode
  tools: [...], // Function calling
  web_search: true, // Built-in web search
  file_search: true, // File search capability
  thinking: true // Extended thinking mode
});
```

**Environment**: `OPENAI_API_KEY=sk-...`

**Framework Usage**:
```typescript
// AI Assistant: Configure in testing pipeline
const adapter = new OpenAIAdapter({
  model: 'gpt-4.1',        // Choose based on requirements
  thinking: true,          // For complex reasoning tasks
  web_search: false        // Disable for isolated testing
});

// User: Executes via CLI → "🧪 Run Interactive Test" → Select "OpenAI GPT-4.1"
```

**Documentation**: https://platform.openai.com/docs/api-reference/responses

---

### Google Gemini (Latest: 2.5 with Thinking)

**🆕 Major Update**: Gemini 2.5 Pro/Flash with thinking capabilities released in 2025.

**Base URL**: `https://generativelanguage.googleapis.com/v1`

**Latest Models (June 2025)**:
- `gemini-2.5-pro-preview-06-05` - Latest preview, #1 on LMArena
- `gemini-2.5-flash-preview-05-20` - Most efficient preview  
- `gemini-2.0-flash-001` - Stable multimodal model
- `gemini-1.5-pro-002` - Stable 2M token context
- `gemini-1.5-flash-002` - Stable fast option

**New SDK (google-genai v1.0)**:
```typescript
import { genai } from '@google/genai';

const client = genai.Client({
  apiKey: process.env.GOOGLE_API_KEY
});

const response = await client.models.generateContent({
  model: "gemini-2.5-flash",
  contents: "How does AI work?",
  // New features
  thinking: true, // Enable reasoning process
  tools: [...], // Function calling
  multimodal: true // Native multimodal support
});
```

**Key Features**:
- 1M token context window (2M coming soon)
- Native multimodality (text, image, video, audio)
- Text-to-speech in 24 languages
- Extended reasoning capabilities

**Environment**: `GOOGLE_API_KEY=AIza...`

**Framework Usage**:
```typescript
// AI Assistant: Configure for multimodal testing
const adapter = new GoogleAdapter({
  model: 'gemini-2.5-flash',  // Cost-effective for most tests
  thinking: true,             // Enable for reasoning evaluation
  multimodal: true           // For image/video testing
});

// User: Executes via CLI → Provider selection → "Google Gemini 2.5"
```

**Documentation**: https://ai.google.dev/gemini-api/docs

---

### Anthropic Claude (Latest: Opus 4 & Sonnet 4)

**🆕 Major Update**: Claude 4 models with extended thinking released in 2025.

**Base URL**: `https://api.anthropic.com`

**Latest Models (June 2025)**:
- `claude-opus-4-20250514` - World's best coding model, $15/$75 per million tokens
- `claude-sonnet-4-20250514` - Superior coding/reasoning, $3/$15 per million tokens, 64K output
- `claude-3-5-sonnet-20241022` - Graduate-level reasoning (still available)
- `claude-3-5-haiku-20241022` - Fastest option

**New Features (2025)**:
```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const response = await anthropic.messages.create({
  model: "claude-4-sonnet-latest",
  max_tokens: 4096,
  messages: [{ role: "user", content: "Hello!" }],
  // New features
  thinking: "extended", // Extended thinking mode
  tools: [...], // Function calling
  web_search: true, // Web search tool ($10/1000 searches)
  computer_use: true, // Computer use capability
  code_execution: true, // Python code execution
  mcp_connector: true, // MCP server connection
  interleaved_thinking: true, // Think between tool calls
  beta: "interleaved-thinking-2025-05-14"
});
```

**New Tools (January 2025)**:
- `bash_20250124` - Independent bash tool
- `text_editor_20250124` - Independent text editor
- `computer_20250124` - Enhanced computer use with new commands

**Environment**: `ANTHROPIC_API_KEY=sk-ant-...`

**Framework Usage**:
```typescript
// AI Assistant: Configure for sophisticated reasoning
const adapter = new AnthropicAdapter({
  model: 'claude-4-sonnet-latest',  // Balanced option
  thinking: 'extended',             // For complex evaluation tasks
  computer_use: false,              // Disable for testing isolation
  web_search: false                 // Keep testing controlled
});

// User: Executes via CLI → "🧪 Run Interactive Test" → "Anthropic Claude 4"
```

**Documentation**: https://docs.anthropic.com/

---

### Mistral AI (Latest: OCR 25.05 & Agents API)

**🆕 Major Update**: New Agents API and specialized models released in 2025.

**Base URL**: `https://api.mistral.ai/v1`

**Latest Models (2025)**:
- `mistral-medium-3` - Latest general model (May 2025)
- `mistral-small-3.1-25.03` - Multimodal with 128k context
- `mistral-ocr-25.05` - OCR and document understanding
- `devstral-small` - Specialized coding model
- `codestral-25.01` - Latest code generation model

**New Agents API**:
```typescript
import MistralClient from '@mistralai/mistralai';

const client = new MistralClient(process.env.MISTRAL_API_KEY);

// Traditional chat
const chatResponse = await client.chat({
  model: 'mistral-medium-3',
  messages: [{ role: 'user', content: 'Hello!' }],
  // Features
  response_format: { type: 'json_object' }, // JSON mode
  tools: [...], // Function calling
  citations: true // Citation support
});

// New Agents API
const agentResponse = await client.agents.complete({
  agent_id: 'agent-id',
  messages: [{ role: 'user', content: 'Search for information about AI' }],
  // Built-in tools
  web_search: true, // Web search connector
  document_library: true // RAG with uploaded documents
});
```

**Environment**: `MISTRAL_API_KEY=...`

**Framework Usage**:
```typescript
// AI Assistant: Configure for code testing
const adapter = new MistralAdapter({
  model: 'codestral-25.01',        // For code review testing
  // OR
  model: 'mistral-medium-3',       // For general testing
  response_format: { type: 'json_object' }, // Structured evaluation
  citations: true                   // For factual accuracy testing
});

// User: Executes via CLI → Provider selection → "Mistral (Code Specialized)"
```

**Documentation**: https://docs.mistral.ai/

---

### OpenRouter (400+ Models)

**🆕 Update**: No markup pricing, 5% + $0.35 fee structure.

**Base URL**: `https://openrouter.ai/api/v1`

**Pricing Model**: 
- 5% + $0.35 fee when purchasing credits
- No markup on model pricing (same as direct provider)
- BYOK option: 5% fee on what the model normally costs

**Model Variants**:
```typescript
// Standard OpenAI-compatible interface
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'anthropic/claude-3.5-sonnet', // Or any of 400+ models
    messages: [{ role: 'user', content: 'Hello!' }],
    // Model variants
    model: 'anthropic/claude-3.5-sonnet:free', // Free tier
    model: 'anthropic/claude-3.5-sonnet:nitro', // Optimized for speed
    model: 'anthropic/claude-3.5-sonnet:floor', // Optimized for cost
    model: 'anthropic/claude-3.5-sonnet:online' // With web search
  })
});
```

**Rate Limits**:
- Free models: 20 requests/minute
- With <$10 credits: 50 free requests/day
- With ≥$10 credits: 1000 free requests/day

**Environment**: `OPENROUTER_API_KEY=sk-or-...`

**Framework Usage**:
```typescript
// AI Assistant: Configure for provider comparison testing
const adapters = [
  new OpenRouterAdapter({
    model: 'anthropic/claude-3.5-sonnet',  // Standard model
    variant: 'nitro'                       // Optimized for speed
  }),
  new OpenRouterAdapter({
    model: 'openai/gpt-4-turbo',          // Different provider
    variant: 'floor'                       // Optimized for cost
  })
];

// Compare multiple providers through single interface
// User: Executes via CLI → "🔄 Compare Providers" → Select models
```

**Documentation**: https://openrouter.ai/docs

---

### Requesty AI (150+ Models via Router)

**🆕 New Provider**: Unified LLM platform with model routing.

**Base URL**: `https://router.requesty.ai/v1`

**Features**:
- 150+ models through single API
- OpenAI-compatible interface
- Application-specific models
- Analytics & logging
- Cost optimization (reports 40% savings)

```typescript
// OpenAI-compatible interface
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://router.requesty.ai/v1',
  apiKey: process.env.REQUESTY_API_KEY
});

const response = await client.chat.completions.create({
  model: 'gpt-4-turbo', // Routed through Requesty
  messages: [{ role: 'user', content: 'Hello!' }]
});
```

**Environment**: `REQUESTY_API_KEY=...`

**Documentation**: https://docs.requesty.ai/

---

## 🧠 Embedding Providers

### Voyage AI (Performance Leader 2025)

**🏆 2025 Winner**: Voyage-3-large leads embedding performance benchmarks.

**Base URL**: `https://api.voyageai.com/v1`

**Latest Models (2025)**:
- `voyage-3-large` - Best performance, 1024 dimensions, $0.06/1M tokens
- `voyage-3-lite` - Near-GPT-4 performance, 1/5 the price
- `voyage-multilingual-2` - 89 languages support

```typescript
const response = await fetch('https://api.voyageai.com/v1/embeddings', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.VOYAGE_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    input: ["Text to embed"],
    model: "voyage-3-large"
  })
});
```

**Environment**: `VOYAGE_API_KEY=...`

**Documentation**: https://docs.voyageai.com/

---

### OpenAI Embeddings (Still Competitive)

**Base URL**: `https://api.openai.com/v1`

**Models (March 2023, still widely used)**:
- `text-embedding-3-large` - 3072 dimensions, high performance
- `text-embedding-3-small` - 1536 dimensions, cost-effective

```typescript
const response = await openai.embeddings.create({
  model: "text-embedding-3-small",
  input: "Text to embed"
});
```

**Environment**: `OPENAI_API_KEY=sk-...`

---

### Cohere (Specialized for Short Text)

**Base URL**: `https://api.cohere.ai/v1`

**Latest Models**:
- `embed-english-v3.0` - English optimization
- `embed-multilingual-v3.0` - Multilingual support

```typescript
const response = await fetch('https://api.cohere.ai/v1/embed', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    texts: ["Text to embed"],
    model: "embed-english-v3.0"
  })
});
```

**Environment**: `COHERE_API_KEY=...`

**Documentation**: https://docs.cohere.com/

---

### Google Embeddings

**Base URL**: `https://generativelanguage.googleapis.com/v1`

**Latest Models**:
- `text-embedding-004` - Available via Gemini API
- `text-embedding-005` - Enterprise Vertex platform

```typescript
const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/text-embedding-004:embedContent?key=${process.env.GOOGLE_API_KEY}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content: { parts: [{ text: "Text to embed" }] }
  })
});
```

**Environment**: `GOOGLE_API_KEY=AIza...`

---

### Mistral Embeddings (Code Specialist)

**Base URL**: `https://api.mistral.ai/v1`

**Specialized Model**:
- `codestral-embed` - Code-specific embeddings, $0.15/1M tokens

```typescript
const response = await fetch('https://api.mistral.ai/v1/embeddings', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: "codestral-embed",
    input: ["Code to embed"]
  })
});
```

**Environment**: `MISTRAL_API_KEY=...`

---

## 💾 Database Configuration

### Supabase with MCP

**Required Environment Variables**:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_ACCESS_TOKEN=sbp_...  # For MCP server
```

**MCP Configuration** (`.mcp.json`):
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

**Vector Extension**:
```sql
-- Enable pgvector for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Create table with vector column
CREATE TABLE documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  embedding vector(1536), -- Adjust dimensions per provider
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create vector index
CREATE INDEX documents_embedding_idx ON documents 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);
```

---

## 🔄 Migration Notes

### Important Changes Since Training Data

1. **OpenAI Chat Completions** → **Responses API** (deprecated by mid-2026)
2. **Google Bard** → **Gemini 2.5** with thinking capabilities
3. **Claude 3.5** → **Claude 4** with extended thinking
4. **Mistral 7B/8x7B** → **Mistral Medium 3** and specialized models
5. **Together AI** ≠ **Requesty** (Requesty is new, separate provider)
6. **Voyage embeddings** now performance leader (was OpenAI)

### Recommended Provider Stack (2025)

**For Testing Pipelines**:
- **Primary LLM**: Gemini 2.5 Flash (best performance/cost)
- **Secondary LLM**: Claude 4 Sonnet (reasoning tasks)
- **Embedding**: Voyage-3-large (best performance)
- **Multi-provider**: OpenRouter (fallback/comparison)
- **Database**: Supabase with pgvector

This reference should be updated quarterly as providers release new models and features.

---

## 🧪 AI Assistant Workflow Summary

### Your Role: Technical Architect

When users request testing pipelines, follow this pattern:

**1. Analyze Requirements**
```typescript
// Identify: domain, criteria, scale, budget constraints
if (userRequest.includes('customer support')) {
  domain = 'customer-support';
  criteria = ['accuracy', 'empathy', 'resolution'];
  providers = ['gpt-4.1', 'claude-4-sonnet', 'gemini-2.5-flash'];
}
```

**2. Select Optimal Providers**
```typescript
// Budget-conscious: Gemini 2.5 Flash
const adapter = new GoogleAdapter({ model: 'gemini-2.5-flash' });

// Reasoning-heavy: Claude 4 Sonnet  
const adapter = new AnthropicAdapter({ model: 'claude-4-sonnet-latest' });

// Comparison testing: Multiple via OpenRouter
const adapters = [
  new OpenRouterAdapter({ model: 'openai/gpt-4-turbo' }),
  new OpenRouterAdapter({ model: 'anthropic/claude-3.5-sonnet' })
];
```

**3. Build Complete Pipeline**
```typescript
// Full implementation ready for CLI execution
export async function createCustomerSupportTest() {
  const adapter = new GoogleAdapter({ model: 'gemini-2.5-flash' });
  
  const scenarios = await new ScenarioBuilder(adapter).build({
    domain: 'customer-support',
    criteria: ['accuracy', 'empathy'],
    count: 20
  });
  
  const personas = await new PersonaGenerator(adapter).generate({
    types: ['frustrated_customer', 'confused_customer'],
    count: 5
  });
  
  return { adapter, scenarios, personas };
}
```

**4. Provide User Instructions**
```
🧪 Lab Kit: Your customer support testing pipeline is ready!

Components built:
- ✅ 20 empathy-focused test scenarios  
- ✅ 5 diverse customer personas
- ✅ AI-powered evaluation for accuracy + empathy
- ✅ Database schema for customer/order data

To execute:
1. Run: `npm run cli`
2. Select: "🧪 Run Interactive Test" 
3. Choose: "Google Gemini 2.5 Flash"
4. Review: Generated reports in /reports

For optimization:
- Review failed cases in reports
- Use "🎯 Optimize Prompts" menu option
- Re-test with improved prompts
```

### User Role: Execution and Iteration

Users operate your pipelines through the interactive CLI without needing technical knowledge of APIs, models, or configuration details.

### Success Pattern

✅ **AI Assistant**: Builds sophisticated testing architecture  
✅ **User**: Executes and iterates through intuitive menus  
✅ **Framework**: Handles all API complexity and provider differences  
✅ **Results**: Professional reports + training data + optimization cycles