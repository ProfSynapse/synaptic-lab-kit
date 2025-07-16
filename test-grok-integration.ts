#!/usr/bin/env tsx
/**
 * Integration test for Grok adapter
 * Tests actual API connectivity and basic functionality
 */

import { GrokAdapter } from './adapters/grok/GrokAdapter';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './adapters/.env' });

async function testGrokIntegration() {
  console.log('🧪 Testing Grok API Integration...\n');

  try {
    // Initialize adapter
    const grok = new GrokAdapter();
    console.log('✅ Adapter initialized successfully');
    console.log(`📍 Using endpoint: ${grok.baseUrl}`);
    console.log(`🤖 Default model: ${grok.getCurrentModel()}\n`);

    // Test 1: List available models
    console.log('📋 Available models:');
    const models = await grok.listModels();
    models.forEach(model => {
      console.log(`  - ${model.name} (${model.id})`);
      console.log(`    Context: ${model.contextWindow.toLocaleString()} tokens`);
      console.log(`    Price: $${model.pricing.inputPerMillion}/M input, $${model.pricing.outputPerMillion}/M output`);
    });
    console.log();

    // Test 2: Check availability
    const isAvailable = await grok.isAvailable();
    console.log(`🔌 API Available: ${isAvailable ? '✅ Yes' : '❌ No'}\n`);

    if (!isAvailable) {
      console.error('❌ API is not available. Please check your XAI_API_KEY.');
      return;
    }

    // Test 3: Simple generation
    console.log('💬 Testing simple generation...');
    const response = await grok.generate('Say "Hello from Grok!" and nothing else.');
    console.log(`Response: "${response.text}"`);
    console.log(`Model: ${response.model}`);
    console.log(`Tokens: ${response.usage?.totalTokens || 'N/A'}\n`);

    // Test 4: Streaming
    console.log('🌊 Testing streaming...');
    process.stdout.write('Response: "');
    await grok.generateStream('Count from 1 to 5 with one word per number.', {
      onToken: (token) => process.stdout.write(token),
      onComplete: (response) => {
        console.log('"');
        console.log(`Total tokens: ${response.usage?.totalTokens || 'N/A'}\n`);
      }
    });

    // Test 5: JSON mode
    console.log('📊 Testing JSON mode...');
    const jsonResponse = await grok.generateJSON(
      'Return a JSON object with two fields: name (string) = "Grok" and version (number) = 3',
      { type: 'object', properties: { name: { type: 'string' }, version: { type: 'number' } } }
    );
    console.log('JSON Response:', JSON.stringify(jsonResponse, null, 2));
    console.log();

    // Test 6: Test with Grok 3 Mini
    console.log('🧠 Testing Grok 3 Mini (reasoning model)...');
    grok.setModel('grok-3-mini');
    const miniResponse = await grok.generate('What is 17 * 23? Show your calculation.');
    console.log(`Response: "${miniResponse.text}"`);
    console.log(`Model: ${miniResponse.model}\n`);

    console.log('✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
  }
}

// Run the test
testGrokIntegration();