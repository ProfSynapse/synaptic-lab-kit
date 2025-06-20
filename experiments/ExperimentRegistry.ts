/**
 * Experiment Registry - Auto-discovery and execution system
 * 
 * This system makes it trivial to add new experiments:
 * 1. Create experiment in /experiments/{name}/
 * 2. Add experiment.config.ts with metadata
 * 3. Implement run() method
 * 4. Automatically appears in CLI
 */

import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';

export interface ExperimentConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'training' | 'evaluation' | 'optimization' | 'analysis';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  requirements: {
    localModels?: string[];
    apiKeys?: string[];
    dependencies?: string[];
  };
  options: ExperimentOption[];
  examples: ExperimentExample[];
}

export interface ExperimentOption {
  id: string;
  name: string;
  description: string;
  type: 'quick' | 'standard' | 'comprehensive' | 'custom';
  defaultModel?: string;
  estimatedTime: string;
  command: string[];
  args?: Record<string, any>;
}

export interface ExperimentExample {
  name: string;
  description: string;
  command: string[];
  useCase: string;
}

export interface ExperimentModule {
  config: ExperimentConfig;
  run: (option: string, model?: string, args?: Record<string, any>) => Promise<void>;
  validate?: () => Promise<boolean>;
}

export class ExperimentRegistry {
  private experiments: Map<string, ExperimentModule> = new Map();
  private experimentsDir: string;

  constructor(experimentsDir: string = './experiments') {
    this.experimentsDir = experimentsDir;
  }

  /**
   * Auto-discover all experiments in the experiments directory
   */
  async discoverExperiments(): Promise<void> {
    if (!existsSync(this.experimentsDir)) {
      console.warn(`Experiments directory not found: ${this.experimentsDir}`);
      return;
    }

    const experimentDirs = readdirSync(this.experimentsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)
      .filter(name => name !== 'experiment-template'); // Skip template directory

    for (const experimentDir of experimentDirs) {
      await this.loadExperiment(experimentDir);
    }
  }

  /**
   * Load a specific experiment
   */
  private async loadExperiment(experimentDir: string): Promise<void> {
    const experimentPath = join(this.experimentsDir, experimentDir);
    const configPath = join(experimentPath, 'experiment.config.ts');
    const indexPath = join(experimentPath, 'index.ts');

    // Check if required files exist
    if (!existsSync(configPath)) {
      console.debug(`Skipping ${experimentDir}: no experiment.config.ts found at ${configPath}`);
      return;
    }

    if (!existsSync(indexPath)) {
      console.debug(`Skipping ${experimentDir}: no index.ts found at ${indexPath}`);
      return;
    }

    console.debug(`Loading experiment ${experimentDir} from ${experimentPath}`);

    try {
      // Convert path to file:// URL for ESM imports (handles Windows paths correctly)
      const absolutePath = join(process.cwd(), experimentPath);
      const fileUrl = pathToFileURL(absolutePath).href;
      
      // Dynamic import the experiment module
      const module = await import(fileUrl);
      
      if (!module.config || !module.run) {
        console.warn(`Invalid experiment module: ${experimentDir} (missing config or run function)`);
        return;
      }

      this.experiments.set(experimentDir, module);
      console.debug(`Loaded experiment: ${module.config.name}`);
      
    } catch (error) {
      console.warn(`Failed to load experiment ${experimentDir}:`, error);
    }
  }

  /**
   * Get all discovered experiments
   */
  getExperiments(): ExperimentModule[] {
    return Array.from(this.experiments.values());
  }

  /**
   * Get experiments by category
   */
  getExperimentsByCategory(category: string): ExperimentModule[] {
    return this.getExperiments().filter(exp => exp.config.category === category);
  }

  /**
   * Get experiment by ID
   */
  getExperiment(id: string): ExperimentModule | undefined {
    return this.experiments.get(id);
  }

  /**
   * Run an experiment
   */
  async runExperiment(
    experimentId: string, 
    option: string, 
    model?: string, 
    args?: Record<string, any>
  ): Promise<void> {
    const experiment = this.getExperiment(experimentId);
    if (!experiment) {
      throw new Error(`Experiment not found: ${experimentId}`);
    }

    // Validate experiment if validation function exists
    if (experiment.validate) {
      const isValid = await experiment.validate();
      if (!isValid) {
        throw new Error(`Experiment validation failed: ${experimentId}`);
      }
    }

    await experiment.run(option, model, args);
  }

  /**
   * Generate CLI choices for inquirer
   */
  generateCliChoices(): Array<{ name: string; value: string; description?: string }> {
    const experiments = this.getExperiments();
    
    return experiments.map(exp => ({
      name: `${exp.config.icon} ${exp.config.name}`,
      value: exp.config.id,
      description: exp.config.description
    }));
  }

  /**
   * Generate experiment options for CLI
   */
  generateExperimentOptions(experimentId: string): Array<{ name: string; value: string }> {
    const experiment = this.getExperiment(experimentId);
    if (!experiment) return [];

    return experiment.config.options.map(option => ({
      name: `${option.name} (${option.estimatedTime})`,
      value: option.id
    }));
  }

  /**
   * Get model recommendations for an experiment
   */
  getModelRecommendations(experimentId: string): string[] {
    const experiment = this.getExperiment(experimentId);
    if (!experiment) return [];

    return experiment.config.requirements.localModels || [];
  }

  /**
   * Print experiment summary
   */
  printSummary(): void {
    const experiments = this.getExperiments();
    console.log(`\n📚 Discovered ${experiments.length} experiments:\n`);

    const categories = new Map<string, ExperimentModule[]>();
    experiments.forEach(exp => {
      const category = exp.config.category;
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(exp);
    });

    categories.forEach((exps, category) => {
      console.log(`🗂️  ${category.toUpperCase()}:`);
      exps.forEach(exp => {
        console.log(`   ${exp.config.icon} ${exp.config.name} - ${exp.config.description}`);
        console.log(`      ${exp.config.options.length} options, ${exp.config.difficulty} level`);
      });
      console.log();
    });
  }
}

// Singleton instance
export const experimentRegistry = new ExperimentRegistry();