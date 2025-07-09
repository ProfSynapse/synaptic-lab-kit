/**
 * RAG Customer Support Experiment - Main Runner
 * Registry interface for the experiment framework
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { config } from './experiment.config';
import { OllamaEmbeddingProvider } from '../../embeddings/OllamaEmbeddingProvider';
import { OllamaAdapter } from '../../adapters/OllamaAdapter';

export { config };

/**
 * Validate experiment requirements
 */
export async function validate(): Promise<boolean> {
  console.log('🔍 Validating RAG Customer Support experiment requirements...');
  
  // Check if Ollama is available
  try {
    const response = await fetch('http://localhost:11434/api/version');
    if (!response.ok) {
      console.error('❌ Ollama server not accessible. Run: ollama serve');
      return false;
    }
    console.log('✅ Ollama server is running');
  } catch (error) {
    console.error('❌ Ollama server not running. Run: ollama serve');
    return false;
  }

  // Check if embedding model is available
  try {
    const embeddings = new OllamaEmbeddingProvider();
    const isEmbeddingModelAvailable = await embeddings.isModelAvailable('nomic-embed-text:latest');
    
    if (!isEmbeddingModelAvailable) {
      console.error('❌ nomic-embed-text model not found. Run: ollama pull nomic-embed-text:latest');
      return false;
    }
    console.log('✅ nomic-embed-text model available');
    embeddings.dispose();
  } catch (error) {
    console.error('❌ Failed to check embedding model:', error);
    return false;
  }

  // Check if LLM model is available
  try {
    const llm = new OllamaAdapter();
    const models = await llm.listModels();
    const hasLLMModel = models.some(model => 
      model.id.includes('mistral-small') || 
      model.id.includes('mistral') ||
      model.id.includes('llama')
    );
    
    if (!hasLLMModel) {
      console.error('❌ No suitable LLM model found. Run: ollama pull mistral-small:22b-instruct-2409-q6_K');
      console.log('   Alternative: ollama pull llama3.1:8b');
      return false;
    }
    console.log('✅ LLM model available');
  } catch (error) {
    console.error('❌ Failed to check LLM model:', error);
    return false;
  }

  return true;
}

/**
 * Run the experiment
 */
export async function run(
  option: string, 
  model: string = 'mistral-small:22b-instruct-2409-q6_K', 
  args: Record<string, any> = {}
): Promise<void> {
  const optionConfig = config.options.find(opt => opt.id === option);
  if (!optionConfig) {
    throw new Error(`Unknown option: ${option}`);
  }

  console.log(`🎧 Running RAG Customer Support: ${optionConfig.name}`);
  console.log(`🤖 Using model: ${model}`);
  console.log(`⏱️  Estimated time: ${optionConfig.estimatedTime}`);
  console.log(`📝 ${optionConfig.description}\n`);

  // Import and run the experiment directly
  const { RAGExperiment } = await import('./RAGExperiment');
  
  // Create experiment configuration
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const experimentConfig = {
    mode: option as 'baseline' | 'optimize' | 'validate',
    model,
    outputDir: join(process.cwd(), 'outputs', `rag-customer-support-${timestamp}`),
    optimizationIterations: 10,
    targetScore: 0.85,
    populationSize: 5
  };

  // Create and run experiment
  const experiment = new RAGExperiment(experimentConfig);
  
  try {
    if (option === 'baseline') {
      await experiment.runBaseline();
    } else if (option === 'optimize') {
      await experiment.runOptimization();
    } else if (option === 'validate') {
      await experiment.runValidation();
    }
    
    console.log('\n✅ RAG Customer Support experiment completed successfully!');
    console.log(`\n📂 Results saved to: ${experimentConfig.outputDir}`);
    console.log('\n📄 Generated files:');
    console.log('   • evaluation-report.json - Main results summary');
    console.log('   • detailed-results.json - Full test case details');
    console.log('   • optimization-report.md - Prompt optimization analysis');
    console.log('   • results-analysis.csv - Data for further analysis');
    
  } catch (error) {
    console.error('\n❌ Experiment failed:', error);
    throw error;
  }
}

/**
 * Get available models from Ollama
 */
export async function getAvailableModels(): Promise<string[]> {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    const data = await response.json() as { models?: Array<{ name: string }> };
    return data.models?.map((model) => model.name) || [];
  } catch (error) {
    console.warn('Could not fetch Ollama models:', error);
    return config.requirements.localModels || [];
  }
}

/**
 * Check if a specific model is available
 */
export async function isModelAvailable(modelName: string): Promise<boolean> {
  const availableModels = await getAvailableModels();
  return availableModels.includes(modelName);
}

/**
 * Get experiment statistics
 */
export async function getExperimentStats(): Promise<{
  knowledgeBaseSize: number;
  testCasesCount: number;
  supportedCategories: string[];
  difficultyLevels: string[];
}> {
  // This would normally load from the knowledge base
  return {
    knowledgeBaseSize: 18,
    testCasesCount: 22,
    supportedCategories: ['password', 'billing', 'technical', 'account', 'product', 'support'],
    difficultyLevels: ['easy', 'medium', 'hard']
  };
}