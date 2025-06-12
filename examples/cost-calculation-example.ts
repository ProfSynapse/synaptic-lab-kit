/**
 * Cost Calculation Example
 * Demonstrates how token usage and costs are automatically calculated
 */

import { OpenAIAdapter } from '../adapters/OpenAIAdapter';
import { AnthropicAdapter } from '../adapters/AnthropicAdapter';
import { GoogleAdapter } from '../adapters/GoogleAdapter';
import { MistralAdapter } from '../adapters/MistralAdapter';
import { 
  compareProviderCosts, 
  CostAnalyzer, 
  estimateCost 
} from '../adapters/pricing';

async function demonstrateCostCalculation() {
  console.log('🧪 Cost Calculation Demo\n');

  // Initialize adapters
  const openai = new OpenAIAdapter();
  const anthropic = new AnthropicAdapter();
  const google = new GoogleAdapter();
  const mistral = new MistralAdapter();

  const testPrompt = "Explain the concept of machine learning in simple terms.";

  console.log('📊 Generating responses with automatic cost calculation...\n');

  try {
    // Generate responses from different providers
    const responses = await Promise.allSettled([
      openai.generate(testPrompt, { model: 'gpt-4o' }),
      anthropic.generate(testPrompt, { model: 'claude-4-sonnet' }),
      google.generate(testPrompt, { model: 'gemini-2.5-flash' }),
      mistral.generate(testPrompt, { model: 'mistral-medium-3' })
    ]);

    // Display cost information for each provider
    responses.forEach((result, index) => {
      const providers = ['OpenAI GPT-4o', 'Claude 4 Sonnet', 'Gemini 2.5 Flash', 'Mistral Medium 3'];
      
      if (result.status === 'fulfilled') {
        const response = result.value;
        console.log(`\n🔹 ${providers[index]}`);
        console.log(`   Response: ${response.text.substring(0, 100)}...`);
        console.log(`   Tokens: ${response.usage?.promptTokens} input + ${response.usage?.completionTokens} output = ${response.usage?.totalTokens} total`);
        console.log(`   Cost: $${response.cost?.totalCost.toFixed(6)} (${response.cost?.currency})`);
        console.log(`   Rate: $${response.cost?.rateInputPerMillion}/M input, $${response.cost?.rateOutputPerMillion}/M output`);
      } else {
        console.log(`\n❌ ${providers[index]}: ${result.reason}`);
      }
    });

  } catch (error) {
    console.error('Error during generation:', error);
  }

  console.log('\n📈 Cost Comparison Analysis\n');

  // Compare costs for a hypothetical scenario
  const hypotheticalUsage = {
    inputTokens: 1000,
    outputTokens: 500
  };

  const costComparison = compareProviderCosts([
    { provider: 'openai', model: 'gpt-4o' },
    { provider: 'anthropic', model: 'claude-4-sonnet' },
    { provider: 'google', model: 'gemini-2.5-flash' },
    { provider: 'mistral', model: 'mistral-medium-3' }
  ], hypotheticalUsage.inputTokens, hypotheticalUsage.outputTokens);

  console.log(`For ${hypotheticalUsage.inputTokens} input + ${hypotheticalUsage.outputTokens} output tokens:\n`);
  costComparison.forEach((comparison, index) => {
    const rank = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🔹';
    console.log(`${rank} ${comparison.provider}/${comparison.model}: $${comparison.cost.toFixed(6)}`);
  });

  console.log('\n💰 Cost Tracking Example\n');

  // Demonstrate cost tracking across multiple requests
  const costAnalyzer = new CostAnalyzer();

  // Simulate several API calls
  const simulatedUsages = [
    { provider: 'openai', model: 'gpt-4o', input: 800, output: 300 },
    { provider: 'anthropic', model: 'claude-4-sonnet', input: 1200, output: 400 },
    { provider: 'google', model: 'gemini-2.5-flash', input: 900, output: 350 },
    { provider: 'mistral', model: 'mistral-medium-3', input: 1000, output: 250 },
    { provider: 'openai', model: 'gpt-4o', input: 600, output: 200 }
  ];

  simulatedUsages.forEach(usage => {
    costAnalyzer.addUsage(usage.provider, usage.model, usage.input, usage.output);
  });

  const report = costAnalyzer.getReport();
  console.log('📊 Cost Analysis Report:');
  console.log(`   Total Requests: ${report.totalRequests}`);
  console.log(`   Total Tokens: ${report.totalInputTokens + report.totalOutputTokens}`);
  console.log(`   Total Cost: $${report.totalCost.toFixed(6)}`);
  console.log(`   Average per Request: $${report.averageCostPerRequest.toFixed(6)}`);

  console.log('\n   Cost by Provider:');
  Object.entries(report.costByProvider).forEach(([provider, cost]) => {
    console.log(`   • ${provider}: $${cost.toFixed(6)}`);
  });

  const mostExpensive = costAnalyzer.getMostExpensive();
  const cheapest = costAnalyzer.getCheapest();
  
  if (mostExpensive && cheapest) {
    console.log(`\n   Most Expensive: ${mostExpensive.provider}/${mostExpensive.model} ($${mostExpensive.cost.toFixed(6)})`);
    console.log(`   Cheapest: ${cheapest.provider}/${cheapest.model} ($${cheapest.cost.toFixed(6)})`);
  }

  console.log('\n🎯 Cost Optimization Tips:\n');
  console.log('• Use cheaper models (like GPT-4o-mini or Gemini Flash) for simple tasks');
  console.log('• Implement prompt caching for repeated context (Anthropic offers 90% discount)');
  console.log('• Use batch processing for non-urgent requests (50% discount on many providers)');
  console.log('• Monitor and optimize prompt length to reduce input tokens');
  console.log('• Set appropriate max_tokens limits to control output costs');
}

// Utility function to estimate costs before making requests
export function estimateTestCosts(
  scenarios: Array<{ 
    provider: string; 
    model: string; 
    estimatedInputTokens: number; 
    estimatedOutputTokens: number; 
  }>
): void {
  console.log('💡 Cost Estimates for Test Scenarios:\n');
  
  let totalEstimatedCost = 0;
  
  scenarios.forEach((scenario, index) => {
    const cost = estimateCost(
      scenario.provider, 
      scenario.model, 
      scenario.estimatedInputTokens, 
      scenario.estimatedOutputTokens
    );
    
    if (cost) {
      totalEstimatedCost += cost.totalCost;
      console.log(`Scenario ${index + 1}: ${scenario.provider}/${scenario.model}`);
      console.log(`  Estimated tokens: ${scenario.estimatedInputTokens} + ${scenario.estimatedOutputTokens}`);
      console.log(`  Estimated cost: $${cost.totalCost.toFixed(6)}\n`);
    }
  });
  
  console.log(`🔢 Total estimated cost for all scenarios: $${totalEstimatedCost.toFixed(6)}\n`);
}

// Example usage for planning test runs
export function planTestBudget() {
  console.log('📋 Test Budget Planning Example\n');
  
  // Estimate costs for a typical test suite
  const testScenarios = [
    { provider: 'openai', model: 'gpt-4o', estimatedInputTokens: 500, estimatedOutputTokens: 200 },
    { provider: 'anthropic', model: 'claude-4-sonnet', estimatedInputTokens: 500, estimatedOutputTokens: 200 },
    { provider: 'google', model: 'gemini-2.5-flash', estimatedInputTokens: 500, estimatedOutputTokens: 200 },
    { provider: 'mistral', model: 'mistral-medium-3', estimatedInputTokens: 500, estimatedOutputTokens: 200 }
  ];
  
  // Multiply by number of test iterations
  const iterations = 50;
  const scaledScenarios = testScenarios.flatMap(scenario => 
    Array(iterations).fill(scenario)
  );
  
  console.log(`Planning costs for ${iterations} iterations of ${testScenarios.length} providers:\n`);
  estimateTestCosts(scaledScenarios);
}

// Run the demonstration if this file is executed directly
if (require.main === module) {
  demonstrateCostCalculation()
    .then(() => {
      console.log('\n✅ Cost calculation demo completed!');
      planTestBudget();
    })
    .catch(console.error);
}