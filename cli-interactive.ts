#!/usr/bin/env node
import inquirer from 'inquirer';
import chalk from 'chalk';
import { 
  displayWelcome,
  displayHeader,
  icons
} from './cli/ui/components';
import { envManager, API_KEY_CONFIGS } from './cli/env-manager';
import { showMenu, handleNavigation } from './cli/navigation';
import { experimentRegistry } from './experiments/ExperimentRegistry';

// Load environment variables first
envManager.loadEnv();

class SynapticCLI {
  private isRunning = true;
  private experimentsLoaded = false;
  private env = envManager;

  async start() {
    // Clear screen and show welcome
    console.clear();
    displayWelcome();
    
    // Ensure .env file exists and reload environment
    await this.env.ensureEnvFile();
    await this.env.loadEnv();
    
    // Auto-discover experiments on first run
    if (!this.experimentsLoaded) {
      await this.loadExperiments();
    }
    
    // Main interactive loop
    while (this.isRunning) {
      await this.showMainMenu();
    }
  }

  private async loadExperiments() {
    try {
      console.log(`\n${icons.info} Discovering experiments...`);
      await experimentRegistry.discoverExperiments();
      this.experimentsLoaded = true;
      const count = experimentRegistry.getExperiments().length;
      if (count > 0) {
        console.log(`\n${icons.success} Loaded ${count} experiments`);
        // List loaded experiments
        experimentRegistry.getExperiments().forEach(exp => {
          console.log(`  ${exp.config.icon} ${exp.config.name}`);
        });
      } else {
        console.log(`\n${icons.warning} No experiments found`);
      }
    } catch (error) {
      console.warn(`\n${icons.error} Could not load experiments:`, error);
    }
  }

  async showMainMenu() {
    console.log('\n' + chalk.hex('#93278F').bold('What would you like to do?'));
    
    const action = await showMenu({
      title: 'Main Menu',
      subtitle: 'Choose an option:',
      choices: [
        { name: '🧪 Run Experiments', value: 'experiments' },
        { name: '🔑 Setup API Keys', value: 'auth' },
        { name: '❓ Help & Documentation', value: 'help' }
      ],
      allowExit: true
    });

    await this.handleAction(action);
  }

  async handleAction(action: string) {
    // Handle navigation first
    if (await handleNavigation(action, undefined, () => this.exit())) {
      return;
    }

    switch (action) {
      case 'experiments':
        await this.runExperiments();
        break;
      case 'auth':
        await this.manageAuth();
        break;
      case 'help':
        await this.showHelp();
        break;
      default:
        console.log(chalk.red('Unknown option'));
    }
  }

  async runExperiments() {
    displayHeader('🧪 Experiments & Testing', 'Run AI experiments and tests');
    
    // Get discovered experiments
    const experiments = experimentRegistry.getExperiments();
    
    if (experiments.length === 0) {
      console.log(`\n${icons.warning} No experiments found!`);
      console.log(`Make sure you have experiment directories in /experiments/`);
      await this.returnToMenu();
      return;
    }

    // Show experiment selection
    const choices = experiments.map(exp => ({
      name: `${exp.config.icon} ${exp.config.name} ${chalk.dim(`(${exp.config.estimatedTime})`)}`,
      value: exp.config.id,
      description: exp.config.description
    }));

    const experimentId = await showMenu({
      title: 'Choose Experiment',
      subtitle: 'Select an experiment to run:',
      choices,
      allowBack: true
    });

    if (experimentId) {
      await this.runExperiment(experimentId);
    }
  }

  async runExperiment(experimentId: string) {
    const experiment = experimentRegistry.getExperiment(experimentId);
    if (!experiment) {
      console.log(`\n${icons.error} Experiment not found: ${experimentId}`);
      await this.returnToMenu();
      return;
    }

    displayHeader(`${experiment.config.icon} ${experiment.config.name}`, experiment.config.description);
    
    // Check requirements
    console.log(`\n${icons.info} Checking requirements...`);
    const missingKeys = this.checkRequiredApiKeys(experiment.config.requirements?.apiKeys || []);
    
    if (missingKeys.length > 0) {
      console.log(`\n${icons.warning} Missing required API keys: ${missingKeys.join(', ')}`);
      const setup = await inquirer.prompt([{
        type: 'confirm',
        name: 'setup',
        message: 'Would you like to set up API keys now?',
        default: true
      }]);
      
      if (setup.setup) {
        await this.manageAuth();
        return;
      } else {
        await this.returnToMenu();
        return;
      }
    }

    // Show experiment options
    const choices = experiment.config.options.map(option => ({
      name: `${option.name} ${chalk.dim(`(${option.estimatedTime})`)}`,
      value: option.id,
      description: option.description
    }));

    const optionId = await showMenu({
      title: 'Choose Test Option',
      subtitle: 'Select how to run this experiment:',
      choices,
      allowBack: true
    });

    if (!optionId) return;

    // Get model selection if needed
    let model: string | undefined;
    const localModels = experiment.config.requirements?.localModels || [];
    
    if (localModels.length > 0) {
      console.log(`\n${icons.info} This experiment can use local models`);
      const useLocal = await inquirer.prompt([{
        type: 'confirm',
        name: 'useLocal',
        message: 'Use local Ollama models?',
        default: true
      }]);
      
      if (useLocal.useLocal) {
        const availableModels = await this.getOllamaModels();
        const requiredModels = localModels.filter(m => availableModels.includes(m));
        
        if (requiredModels.length === 0) {
          console.log(`\n${icons.warning} No required local models found. Please install: ${localModels.join(', ')}`);
          console.log(`Run: ollama pull ${localModels[0]}`);
          await this.returnToMenu();
          return;
        }
        
        model = requiredModels[0];
      }
    }

    // Run the experiment
    console.log(`\n${icons.info} Running experiment...`);
    console.log(`Option: ${optionId}`);
    if (model) console.log(`Model: ${model}`);
    
    try {
      await experiment.run(optionId, model);
      console.log(`\n${icons.success} Experiment completed successfully!`);
    } catch (error) {
      console.log(`\n${icons.error} Experiment failed:`, error);
    }
    
    await this.returnToMenu();
  }

  async manageAuth() {
    displayHeader('🔑 API Key Management', 'Setup and manage your API keys');
    
    const action = await showMenu({
      title: 'API Key Management',
      subtitle: 'Choose an action:',
      choices: [
        { name: '➕ Add API Key', value: 'add' },
        { name: '📋 List API Keys', value: 'list' },
        { name: '🧪 Test API Keys', value: 'test' },
        { name: '🗑️  Remove API Keys', value: 'remove' }
      ],
      allowBack: true
    });

    if (!action) return;

    switch (action) {
      case 'add':
        await this.addApiKey();
        break;
      case 'list':
        await this.listApiKeys();
        break;
      case 'test':
        await this.testApiKeys();
        break;
      case 'remove':
        await this.removeApiKeys();
        break;
    }
  }

  async addApiKey() {
    const provider = await showMenu({
      title: 'Select Provider',
      subtitle: 'Choose a provider to add API key for:',
      choices: API_KEY_CONFIGS.map(config => ({
        name: `🔑 ${config.description}`,
        value: config.provider
      })),
      allowBack: true
    });

    if (!provider) return;

    const config = API_KEY_CONFIGS.find(c => c.provider === provider);
    if (!config) {
      console.log(`\n${icons.error} Provider configuration not found`);
      return;
    }

    console.log(`\n🔑 ${config.description}`);
    console.log(`${chalk.dim(`Example: ${config.example}`)}`);

    const { apiKey } = await inquirer.prompt([{
      type: 'password',
      name: 'apiKey',
      message: `Enter your ${config.description} API key:`,
      mask: '*'
    }]);

    if (apiKey) {
      await this.env.saveApiKey(config.envVar, apiKey);
      console.log(`\n${icons.success} API key added successfully!`);
    }

    await this.returnToMenu();
  }

  async listApiKeys() {
    const keys = this.env.getApiKeyStatus();
    
    if (keys.length === 0) {
      console.log(`\n${icons.info} No API keys configured yet.`);
    } else {
      console.log(`\n${icons.info} Configured API keys:`);
      keys.forEach(key => {
        const status = key.isSet ? chalk.green('✓') : chalk.red('✗');
        const preview = key.preview ? chalk.dim(` (${key.preview})`) : '';
        console.log(`  🔑 ${key.description}: ${status}${preview}`);
      });
    }
    
    await this.returnToMenu();
  }

  async testApiKeys() {
    console.log(`\n${icons.info} Testing API keys...`);
    // Simple test - just check if keys exist
    const keys = this.env.getApiKeyStatus();
    const hasKeys = keys.some(k => k.isSet);
    
    if (hasKeys) {
      console.log(`\n${icons.success} API keys are configured!`);
    } else {
      console.log(`\n${icons.warning} No API keys found. Add some API keys first.`);
    }
    
    await this.returnToMenu();
  }

  async removeApiKeys() {
    const keys = this.env.getApiKeyStatus();
    const keysToRemove = keys.filter(k => k.isSet);
    
    if (keysToRemove.length === 0) {
      console.log(`\n${icons.info} No API keys to remove.`);
      await this.returnToMenu();
      return;
    }

    const choices = keysToRemove.map(key => ({
      name: `🔑 ${key.description}`,
      value: key.envVar
    }));

    const selectedKeys = await inquirer.prompt([{
      type: 'checkbox',
      name: 'keys',
      message: 'Select API keys to remove:',
      choices
    }]);

    if (selectedKeys.keys.length > 0) {
      const confirm = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: `Remove ${selectedKeys.keys.length} API key(s)?`,
        default: false
      }]);

      if (confirm.confirm) {
        for (const keyName of selectedKeys.keys) {
          await this.env.removeApiKey(keyName);
        }
        console.log(`\n${icons.success} API keys removed successfully!`);
      }
    }

    await this.returnToMenu();
  }

  async showHelp() {
    displayHeader('❓ Help & Documentation', 'Get help with Synaptic Lab Kit');
    
    console.log(`
${chalk.bold('🧪 Synaptic Lab Kit')} - AI-Powered Testing Framework

${chalk.hex('#00A99D')('Quick Start:')}
1. Setup API keys for your preferred providers
2. Run experiments to test your AI systems
3. Review results and iterate

${chalk.hex('#00A99D')('Available Experiments:')}
${experimentRegistry.getExperiments().map(exp => 
  `  ${exp.config.icon} ${exp.config.name} - ${exp.config.description}`
).join('\n')}

${chalk.hex('#00A99D')('Need Help?')}
- Check the README.md for detailed documentation
- Visit the /experiments folder for implementation examples
- Each experiment has its own documentation and examples

${chalk.hex('#00A99D')('API Keys:')}
Setup keys for providers you want to use:
${API_KEY_CONFIGS.map(config => 
  `  🔑 ${config.description} - ${config.example}`
).join('\n')}
`);

    await this.returnToMenu();
  }

  async returnToMenu() {
    const { proceed } = await inquirer.prompt([{
      type: 'confirm',
      name: 'proceed',
      message: 'Return to main menu?',
      default: true
    }]);
    
    if (!proceed) {
      await this.exit();
    }
  }

  private checkRequiredApiKeys(requiredKeys: string[]): string[] {
    const missing: string[] = [];
    
    for (const keyName of requiredKeys) {
      const value = process.env[keyName];
      if (!value || value.trim() === '') {
        missing.push(keyName);
      }
    }
    
    return missing;
  }

  async getOllamaModels(): Promise<string[]> {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      const data = await response.json() as { models?: Array<{ name: string }> };
      return data.models?.map((model: any) => model.name) || [];
    } catch (error) {
      return [];
    }
  }

  async exit() {
    console.log(`\n${chalk.hex('#00A99D')('Thanks for using Synaptic Lab Kit!')}`);
    console.log(chalk.hex('#33475B')('Happy testing! 🚀\n'));
    this.isRunning = false;
    process.exit(0);
  }
}

// Start the interactive CLI
const cli = new SynapticCLI();
cli.start().catch(console.error);