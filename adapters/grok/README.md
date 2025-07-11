# Grok (xAI) Adapter

This adapter provides integration with xAI's Grok models through their OpenAI-compatible API.

## Features

- **OpenAI SDK Compatibility**: Uses the OpenAI SDK with xAI's endpoint
- **Model Support**: Grok 3 and Grok 3 Mini
- **Large Context Window**: 131,072 tokens (131k)
- **Streaming Support**: Full streaming capabilities
- **JSON Mode**: Structured output generation
- **Function Calling**: Tool use support
- **Reasoning Model**: Grok 3 Mini excels at quantitative tasks with reasoning

## Configuration

Set your xAI API key in your environment:

```bash
export XAI_API_KEY="your-api-key-here"
```

Get your API key from [console.x.ai](https://console.x.ai)

## Usage

```typescript
import { GrokAdapter } from '../adapters/grok/GrokAdapter';

// Initialize with default model (grok-3)
const grok = new GrokAdapter();

// Initialize with specific model
const grokMini = new GrokAdapter('grok-3-mini');

// Generate a response
const response = await grok.generate('What is quantum computing?');

// Stream a response
await grok.generateStream('Explain relativity', {
  onToken: (token) => process.stdout.write(token),
  onComplete: (response) => console.log('\nDone!')
});

// Use JSON mode
const structured = await grok.generateJSON(
  'List 3 quantum computing applications',
  { type: 'array', items: { type: 'string' } }
);
```

## Available Models

### Grok 3
- **Model ID**: `grok-3`
- **Context**: 131k tokens
- **Pricing**: $3/M input, $15/M output
- **Best for**: General tasks, data extraction, programming, summarization

### Grok 3 Mini
- **Model ID**: `grok-3-mini`
- **Context**: 131k tokens
- **Pricing**: $0.30/M input, $0.50/M output
- **Best for**: Math, reasoning, quantitative analysis
- **Special**: Thinks before responding for better accuracy

## API Compatibility

The Grok API is fully compatible with OpenAI's API format. If you're migrating from OpenAI:

```typescript
// OpenAI
const openai = new OpenAI({ apiKey: 'sk-...' });

// Grok (xAI)
const grok = new OpenAI({ 
  apiKey: process.env.XAI_API_KEY,
  baseURL: 'https://api.x.ai/v1'
});
```

## Limitations

- **No Vision Support Yet**: Image processing capabilities coming soon
- **Context Window**: API limited to 131k tokens (though Grok 3 supports up to 1M)
- **Model Availability**: Only Grok 3 and Grok 3 Mini currently available via API

## Error Handling

The adapter includes comprehensive error handling:

```typescript
try {
  const response = await grok.generate('Hello');
} catch (error) {
  if (error instanceof LLMProviderError) {
    console.error(`Provider: ${error.provider}`);
    console.error(`Code: ${error.code}`);
    console.error(`Message: ${error.message}`);
  }
}
```

## Testing

Run tests with:

```bash
npm test -- adapters/__tests__/GrokAdapter.test.ts
```

## Links

- [xAI API Documentation](https://docs.x.ai)
- [API Console](https://console.x.ai)
- [Pricing](https://docs.x.ai/docs/models)