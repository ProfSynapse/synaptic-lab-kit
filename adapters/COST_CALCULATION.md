# Cost Calculation & Token Tracking

Comprehensive cost calculation system that tracks token usage and calculates costs across all LLM providers based on current 2025 pricing.

## 🎯 Features

- **Automatic Cost Calculation**: Every LLM response includes detailed cost breakdown
- **Real-time Pricing**: Current 2025 pricing for all major providers
- **Token Usage Tracking**: Precise input/output token counts from provider APIs
- **Cost Analytics**: Track spending across providers, models, and time periods
- **Cost Comparison**: Compare costs across different providers for the same task
- **Budget Planning**: Estimate costs before running test suites

## 💰 How It Works

All LLM providers return token usage in their API responses:

### Token Usage Response Formats

**OpenAI/Mistral**:
```json
"usage": {
  "prompt_tokens": 123,
  "completion_tokens": 45,
  "total_tokens": 168
}
```

**Anthropic (Claude)**:
```json
"usage": {
  "input_tokens": 123,
  "output_tokens": 45
}
```

**Google Gemini**:
```json
"usageMetadata": {
  "promptTokenCount": 123,
  "candidatesTokenCount": 45,
  "totalTokenCount": 168
}
```

### Automatic Cost Calculation

Every `LLMResponse` includes a `cost` object:
```typescript
{
  text: "Response content...",
  model: "gpt-4o",
  provider: "openai",
  usage: {
    promptTokens: 123,
    completionTokens: 45,
    totalTokens: 168
  },
  cost: {
    inputCost: 0.000615,      // $0.000615
    outputCost: 0.0009,       // $0.0009
    totalCost: 0.001515,      // $0.001515
    currency: "USD",
    rateInputPerMillion: 5.00,
    rateOutputPerMillion: 20.00
  }
}
```

## 📊 Current 2025 Pricing (Per Million Tokens)

| Provider | Model | Input | Output |
|----------|--------|--------|---------|
| **OpenAI** | GPT-4o | $5.00 | $20.00 |
| | GPT-4o-mini | $0.15 | $0.60 |
| **Anthropic** | Claude 4 Sonnet | $3.00 | $15.00 |
| | Claude 3.5 Haiku | $0.80 | $4.00 |
| **Google** | Gemini 2.5 Flash | $0.10 | $0.40 |
| | Gemini 2.0 Pro (Experimental) | $0.00 | $0.00 |
| **Mistral** | Mistral Medium 3 | $0.40 | $2.00 |
| | Mistral Large | $2.00 | $6.00 |

## 🔧 Usage Examples

### Basic Cost Tracking
```typescript
import { OpenAIAdapter } from './adapters/OpenAIAdapter';

const adapter = new OpenAIAdapter();
const response = await adapter.generate("Explain machine learning", {
  model: 'gpt-4o'
});

console.log(`Cost: $${response.cost?.totalCost.toFixed(6)}`);
console.log(`Tokens: ${response.usage?.totalTokens}`);
```

### Cost Comparison Across Providers
```typescript
import { compareProviderCosts } from './adapters/pricing';

const costs = compareProviderCosts([
  { provider: 'openai', model: 'gpt-4o' },
  { provider: 'anthropic', model: 'claude-4-sonnet' },
  { provider: 'google', model: 'gemini-2.5-flash' }
], 1000, 500); // 1000 input + 500 output tokens

costs.forEach(cost => {
  console.log(`${cost.provider}/${cost.model}: $${cost.cost.toFixed(6)}`);
});
```

### Cost Analytics & Tracking
```typescript
import { CostAnalyzer } from './adapters/pricing';

const analyzer = new CostAnalyzer();

// Track usage across multiple requests
analyzer.addUsage('openai', 'gpt-4o', 800, 300);
analyzer.addUsage('anthropic', 'claude-4-sonnet', 900, 250);

const report = analyzer.getReport();
console.log(`Total cost: $${report.totalCost.toFixed(6)}`);
console.log(`Average per request: $${report.averageCostPerRequest.toFixed(6)}`);
```

### Pre-Test Cost Estimation
```typescript
import { estimateCost } from './adapters/pricing';

// Estimate costs before running tests
const estimate = estimateCost('openai', 'gpt-4o', 500, 200);
console.log(`Estimated cost: $${estimate?.totalCost.toFixed(6)}`);

// Budget for 100 test iterations
const testBudget = estimate?.totalCost * 100;
console.log(`Budget needed: $${testBudget?.toFixed(2)}`);
```

## 🎯 Cost Optimization Strategies

### 1. **Model Selection**
- Use cheaper models for simple tasks (GPT-4o-mini, Gemini Flash)
- Reserve expensive models (GPT-4o, Claude Opus) for complex reasoning

### 2. **Prompt Optimization**
- Minimize prompt length to reduce input token costs
- Use clear, concise prompts that get to the point quickly
- Avoid unnecessary context or examples

### 3. **Output Control**
- Set appropriate `max_tokens` limits
- Use structured outputs (JSON) to reduce verbose text
- Request concise responses when appropriate

### 4. **Provider Features**
- **Anthropic**: Use prompt caching (90% discount on cached tokens)
- **All Providers**: Use batch processing (50% discount when available)
- **OpenRouter**: Compare live pricing across providers

### 5. **Smart Routing**
- Route simple queries to cheaper models
- Use expensive models only for complex reasoning tasks
- Implement fallback chains (expensive → medium → cheap)

## 📈 Integration with Testing Framework

### Test Configuration with Cost Limits
```typescript
const testConfig = {
  name: "Customer Service Test",
  providers: ['openai', 'anthropic', 'google'],
  costLimits: {
    perRequest: 0.01,     // $0.01 max per request
    totalBudget: 5.00,    // $5.00 total budget
    alertThreshold: 0.80  // Alert at 80% of budget
  },
  scenarios: [...]
};
```

### Automatic Budget Monitoring
```typescript
testRunner.on('request:complete', (response) => {
  if (response.cost?.totalCost > testConfig.costLimits.perRequest) {
    console.warn(`⚠️ High cost request: $${response.cost.totalCost.toFixed(6)}`);
  }
});

testRunner.on('budget:threshold', (usage) => {
  console.log(`💰 Budget alert: ${usage.percentUsed}% of budget used`);
});
```

### Cost-Aware Test Reports
All test reports automatically include:
- Total cost breakdown by provider/model
- Cost per scenario and persona
- Cost efficiency metrics (cost per successful test)
- Budget utilization and projections

## 🔍 Debugging Cost Issues

### High Cost Scenarios
```typescript
// Find expensive requests
const expensiveRequests = testResults.filter(r => 
  r.cost?.totalCost > 0.01
);

// Analyze token usage patterns
const tokenAnalysis = expensiveRequests.map(r => ({
  tokens: r.usage?.totalTokens,
  cost: r.cost?.totalCost,
  efficiency: r.cost?.totalCost / (r.usage?.totalTokens || 1)
}));
```

### Cost Validation
```typescript
// Verify cost calculations match expected rates
function validateCost(response: LLMResponse) {
  const expected = (response.usage?.promptTokens * inputRate + 
                   response.usage?.completionTokens * outputRate) / 1_000_000;
  const actual = response.cost?.totalCost;
  
  if (Math.abs(expected - actual) > 0.000001) {
    console.warn('Cost calculation mismatch!');
  }
}
```

The cost calculation system ensures you never have surprise bills and can optimize your testing budget for maximum coverage and efficiency! 💰✨