/**
 * TEMPLATE: Experiment Implementation
 * 
 * This file must export:
 * - config: The experiment configuration
 * - run: Function to execute the experiment
 * - validate: (optional) Function to check if experiment can run
 */

import { config } from './experiment.config';

export { config };

/**
 * Validate experiment requirements (optional)
 */
export async function validate(): Promise<boolean> {
  // Check if required files exist
  // Check if API keys are available  
  // Check if dependencies are installed
  // Check if local models are available
  
  console.log('✅ Experiment validation passed');
  return true;
}

/**
 * Run the experiment
 */
export async function run(
  option: string, 
  model: string = 'llama3.1:8b', 
  args: Record<string, any> = {}
): Promise<void> {
  const optionConfig = config.options.find(opt => opt.id === option);
  if (!optionConfig) {
    throw new Error(`Unknown option: ${option}`);
  }

  console.log(`🔬 Running ${config.name}: ${optionConfig.name}`);
  console.log(`📊 Using model: ${model}`);
  console.log(`⏱️  Estimated time: ${optionConfig.estimatedTime}`);
  console.log(`📝 ${optionConfig.description}\n`);

  // Your experiment implementation here
  switch (option) {
    case 'quick':
      await runQuickTest(model, args);
      break;
    case 'comprehensive':
      await runComprehensiveTest(model, args);
      break;
    default:
      throw new Error(`Unsupported option: ${option}`);
  }

  console.log('\n✅ Experiment completed successfully!');
}

/**
 * Quick test implementation
 */
async function runQuickTest(_model: string, _args: Record<string, any>): Promise<void> {
  console.log('⚡ Running quick test...');
  
  // Simulate work
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('📊 Quick test results: 85% success rate');
}

/**
 * Comprehensive test implementation  
 */
async function runComprehensiveTest(_model: string, _args: Record<string, any>): Promise<void> {
  console.log('🔍 Running comprehensive analysis...');
  
  // Simulate longer work
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  console.log('📈 Comprehensive results:');
  console.log('  • Analysis 1: 92% accuracy');
  console.log('  • Analysis 2: 78% efficiency'); 
  console.log('  • Analysis 3: 88% reliability');
}