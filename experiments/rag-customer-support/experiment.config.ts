/**
 * RAG Customer Support Experiment Configuration
 * Tests retrieval-augmented generation for customer support scenarios
 */

import { ExperimentConfig } from '../ExperimentRegistry';

export const config: ExperimentConfig = {
  id: 'rag-customer-support',
  name: 'RAG Customer Support Experiment',
  description: 'Optimize RAG prompts for customer support using iterative prompt improvement and hybrid evaluation',
  icon: '🎧',
  category: 'evaluation',
  difficulty: 'intermediate',
  estimatedTime: '10-30 minutes',
  
  requirements: {
    localModels: ['nomic-embed-text:latest', 'mistral-small:22b-instruct-2409-q6_K'],
    apiKeys: [],
    dependencies: ['tiktoken']
  },

  options: [
    {
      id: 'baseline',
      name: 'Baseline RAG Test',
      description: 'Test current RAG performance with baseline prompts',
      type: 'quick',
      estimatedTime: '5-10 minutes',
      command: ['npx', 'tsx', 'experiments/rag-customer-support/index.ts', 'baseline']
    },
    {
      id: 'optimize',
      name: 'Prompt Optimization',
      description: 'Iteratively improve RAG prompts using genetic algorithm',
      type: 'optimization',
      estimatedTime: '15-25 minutes',
      command: ['npx', 'tsx', 'experiments/rag-customer-support/index.ts', 'optimize']
    },
    {
      id: 'validate',
      name: 'Validate Optimized Prompts',
      description: 'Test optimized prompts on full test suite',
      type: 'full',
      estimatedTime: '10-15 minutes',
      command: ['npx', 'tsx', 'experiments/rag-customer-support/index.ts', 'validate']
    }
  ],

  examples: [
    {
      name: 'Baseline Performance',
      description: 'Test RAG performance with default prompts',
      command: ['npx', 'tsx', 'experiments/rag-customer-support/RAGExperiment.ts', 'baseline'],
      useCase: 'Establish baseline performance metrics for prompt optimization'
    },
    {
      name: 'Prompt Optimization',
      description: 'Iteratively improve RAG prompts using genetic algorithm',
      command: ['npx', 'tsx', 'experiments/rag-customer-support/RAGExperiment.ts', 'optimize'],
      useCase: 'Demonstrate systematic prompt improvement for better RAG performance'
    },
    {
      name: 'Performance Validation',
      description: 'Test optimized prompts on full evaluation suite',
      command: ['npx', 'tsx', 'experiments/rag-customer-support/RAGExperiment.ts', 'validate'],
      useCase: 'Validate that prompt optimization improves real-world performance'
    }
  ]
};