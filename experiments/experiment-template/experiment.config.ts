/**
 * TEMPLATE: New Experiment Configuration
 * 
 * Copy this template to create new experiments:
 * 1. Copy experiments/experiment-template/ to experiments/your-experiment-name/
 * 2. Update this config file with your experiment details
 * 3. Implement the run() function in index.ts
 * 4. Your experiment automatically appears in the CLI!
 */

import { ExperimentConfig } from '../ExperimentRegistry';

export const config: ExperimentConfig = {
  id: 'your-experiment-id',                          // Unique identifier
  name: 'Your Experiment Name',                      // Display name
  description: 'Brief description of what this experiment does and its purpose',
  icon: '🔬',                                        // Emoji icon for the CLI
  category: 'evaluation',                            // training | evaluation | optimization | analysis
  difficulty: 'beginner',                           // beginner | intermediate | advanced
  estimatedTime: '5-15 minutes',                    // Human-readable time estimate
  
  requirements: {
    localModels: ['llama3.1:8b', 'qwen3:8b'],      // Optional: Required Ollama models
    apiKeys: ['OPENAI_API_KEY'],                     // Optional: Required API keys  
    dependencies: ['some-npm-package']               // Optional: Required npm packages
  },

  options: [
    {
      id: 'quick',
      name: 'Quick Test',
      description: 'Fast validation with minimal examples',
      type: 'quick',
      defaultModel: 'llama3.1:8b',
      estimatedTime: '2 minutes',
      command: ['npx', 'tsx', 'experiments/your-experiment-id/run.ts', '--mode=quick']
    },
    {
      id: 'comprehensive',
      name: 'Full Analysis',
      description: 'Complete experiment with detailed analysis',
      type: 'comprehensive',
      defaultModel: 'llama3.1:8b',
      estimatedTime: '15 minutes',
      command: ['npx', 'tsx', 'experiments/your-experiment-id/run.ts', '--mode=full']
    }
  ],

  examples: [
    {
      name: 'Basic Usage',
      description: 'Standard experiment run',
      command: ['npx', 'tsx', 'experiments/your-experiment-id/run.ts'],
      useCase: 'General evaluation and analysis'
    }
  ]
};