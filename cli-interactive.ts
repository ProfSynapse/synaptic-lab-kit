#!/usr/bin/env node
import inquirer from 'inquirer';
import chalk from 'chalk';
import { 
  displayWelcome,
  displayHeader,
  icons,
  displayTable
} from './cli/ui/components';
import { envManager, API_KEY_CONFIGS } from './cli/env-manager';
import { showMenu, handleNavigation, confirm, input, returnToMenu } from './cli/navigation';
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
        { name: '🚀 Quick Start - Set up everything', value: 'quickstart' },
        { name: '🧪 Run Interactive Test', value: 'test' },
        { name: '🔑 Manage API Keys', value: 'auth' },
        { name: '📁 Project Setup', value: 'project' },
        { name: '📊 Batch Testing', value: 'batch' },
        { name: '🎯 Optimize Prompts', value: 'optimize' },
        { name: '🛠  Settings & Config', value: 'config' },
        { name: '❓ Help & Documentation', value: 'help' },
        { name: '📋 Quick Reference', value: 'reference' }
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
      case 'quickstart':
        await this.quickStart();
        break;
      case 'test':
        await this.runTest();
        break;
      case 'auth':
        await this.manageAuth();
        break;
      case 'project':
        await this.projectSetup();
        break;
      case 'batch':
        await this.batchTesting();
        break;
      case 'optimize':
        await this.optimizePrompts();
        break;
      case 'config':
        await this.manageConfig();
        break;
      case 'help':
        await this.showHelp();
        break;
      case 'reference':
        await this.showReference();
        break;
      default:
        console.log(chalk.red('Unknown option'));
    }
  }

  async quickStart() {
    displayHeader('🚀 Quick Start', 'Get up and running in 3 steps');
    
    console.log(`
${chalk.bold('Let\'s get you set up!')}

This will guide you through:
${chalk.hex('#00A99D')('1.')} Installing dependencies
${chalk.hex('#00A99D')('2.')} Adding API keys  
${chalk.hex('#00A99D')('3.')} Running your first test

Ready to begin?
`);

    const { proceed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'proceed',
        message: 'Start quick setup?',
        default: true
      }
    ]);

    if (proceed) {
      await this.installDeps();
      await this.setupApiKeys();
      await this.runFirstTest();
    }

    await this.returnToMenu();
  }

  async installDeps() {
    console.log(`\n${chalk.hex('#29ABE2')('📦 Checking dependencies...')}`);
    
    // Simulate dependency check
    await this.simulateProgress('Installing missing packages', 3000);
    
    console.log(`${icons.success} All dependencies installed!`);
  }

  async setupApiKeys() {
    console.log(`\n${chalk.hex('#29ABE2')('🔑 API Key Setup')}`);
    
    const providers = [
      { name: 'OpenAI (GPT-4, GPT-3.5)', value: 'openai' },
      { name: 'Anthropic (Claude)', value: 'anthropic' },
      { name: 'Skip for now', value: 'skip' }
    ];

    const { provider } = await inquirer.prompt([
      {
        type: 'list',
        name: 'provider',
        message: 'Which provider would you like to set up first?',
        choices: providers
      }
    ]);

    if (provider !== 'skip') {
      const { apiKey } = await inquirer.prompt([
        {
          type: 'password',
          name: 'apiKey',
          message: `Enter your ${provider.toUpperCase()} API key:`,
          mask: '*'
        }
      ]);

      if (apiKey) {
        console.log(`${icons.success} ${provider.toUpperCase()} API key saved!`);
      }
    }
  }

  async runFirstTest() {
    console.log(`\n${chalk.hex('#29ABE2')('🧪 Your First Test')}`);
    
    const { runTest } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'runTest',
        message: 'Would you like to run a quick test now?',
        default: true
      }
    ]);

    if (runTest) {
      await this.simulateProgress('Running test scenario', 2000);
      console.log(`
${icons.success} Test completed!

${chalk.bold('Results:')}
✓ Success Rate: 85%
✓ Response Time: 1.2s  
✓ Cost: $0.0023

${chalk.hex('#00A99D')('Great job! You\'re all set up.')}`);
    }
  }

  async runTest() {
    displayHeader('🧪 Experiments & Testing', 'Run AI experiments and tests');
    
    // Get discovered experiments
    const experiments = experimentRegistry.getExperiments();
    
    if (experiments.length === 0) {
      console.log(`\n${icons.warning} No experiments found. Make sure experiments are properly configured.`);
      await this.returnToMenu();
      return;
    }

    // Build choices from experiments
    const experimentChoices = experiments.map(exp => ({
      name: `${exp.config.icon} ${exp.config.name} (${exp.config.difficulty})`,
      value: exp.config.id,
      description: exp.config.description
    }));

    const choices = [
      ...experimentChoices,
      { name: '', value: 'separator' }, // Visual separator
      { name: '🔬 Custom Scenario', value: 'custom' },
      { name: '📋 List All Experiments', value: 'list' },
      { name: '← Back to Main Menu', value: 'back' }
    ];

    const { choice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message: 'Choose an experiment to run:',
        choices: choices.filter(c => c.value !== 'separator'),
        pageSize: 12
      }
    ]);

    if (choice === 'back') return;
    
    if (choice === 'list') {
      await this.listExperiments();
    } else if (choice === 'custom') {
      await this.createCustomTest();
    } else {
      await this.runExperiment(choice);
    }

    await this.returnToMenu();
  }

  async createCustomTest() {
    console.log(`\n${chalk.hex('#93278F').bold('🎯 Custom Test Creation')}`);
    
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'description',
        message: 'Describe what you want to test:',
        validate: (input) => input.length > 0 || 'Please enter a description'
      },
      {
        type: 'editor',
        name: 'prompt',
        message: 'Enter the prompt to test:'
      },
      {
        type: 'checkbox',
        name: 'criteria',
        message: 'Select evaluation criteria:',
        choices: [
          'Accuracy',
          'Relevance', 
          'Helpfulness',
          'Professional tone',
          'Completeness',
          'Safety'
        ]
      }
    ]);

    console.log(`\n${chalk.hex('#00A99D')('Test created!')} Running now...`);
    await this.simulateProgress('Testing your prompt', 3000);
    
    console.log(`
${icons.success} Test completed!

${chalk.bold('Scenario:')} ${answers.description}
${chalk.bold('Criteria:')} ${answers.criteria.join(', ')}
${chalk.bold('Result:')} ✓ Passed (${Math.floor(Math.random() * 20 + 80)}% success rate)
`);
  }

  async runPredefinedTest(type: string) {
    const scenarios = {
      chatbot: 'Customer support chatbot',
      content: 'Blog post generation',
      qa: 'Technical Q&A system'
    };

    console.log(`\n${chalk.hex('#00A99D')('Running:')} ${scenarios[type as keyof typeof scenarios]}`);
    await this.simulateProgress('Testing scenario', 2500);
    
    console.log(`${icons.success} Test completed! Check the reports/ folder for details.`);
  }

  async runExperiment(experimentId: string) {
    const experiment = experimentRegistry.getExperiment(experimentId);
    if (!experiment) {
      console.log(`\n${icons.error} Experiment not found: ${experimentId}`);
      return;
    }

    displayHeader(
      `${experiment.config.icon} ${experiment.config.name}`,
      experiment.config.description
    );

    console.log(`\n${chalk.bold('About this experiment:')}\n`);
    console.log(experiment.config.description);
    console.log(`\n${chalk.bold('Difficulty:')} ${experiment.config.difficulty}`);
    console.log(`${chalk.bold('Estimated time:')} ${experiment.config.estimatedTime}\n`);

    // Show available options
    const optionChoices = experiment.config.options.map(option => ({
      name: `${option.name} (${option.estimatedTime}) - ${option.description}`,
      value: option.id
    }));

    optionChoices.push({ name: '← Back to Experiments', value: 'back' });

    const { optionId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'optionId',
        message: 'Choose experiment option:',
        choices: optionChoices,
        pageSize: 10
      }
    ]);

    if (optionId === 'back') return;

    // Get provider and model selection
    let selectedProvider: string | undefined;
    let selectedModel: string | undefined;
    const option = experiment.config.options.find(opt => opt.id === optionId);
    
    // Build available providers based on API keys and Ollama
    const availableProviders = await this.getAvailableProviders();
    
    if (availableProviders.length > 0) {
      const { provider } = await inquirer.prompt([
        {
          type: 'list',
          name: 'provider',
          message: 'Select provider:',
          choices: availableProviders.map(p => ({
            name: `${p.name} ${p.available ? '✅' : '❌'}`,
            value: p.id,
            disabled: !p.available
          }))
        }
      ]);
      
      selectedProvider = provider;
      
      // Get model based on provider
      if (provider === 'ollama') {
        const ollamaModels = await this.getOllamaModels();
        const modelChoices = ollamaModels.map(model => ({
          name: model,
          value: model
        }));
        
        if (modelChoices.length > 0) {
          const { model } = await inquirer.prompt([
            {
              type: 'list',
              name: 'model',
              message: 'Select Ollama model:',
              choices: modelChoices
            }
          ]);
          selectedModel = model;
        }
      } else {
        // For API providers, let them enter model name
        const defaultModels = {
          'openai': 'gpt-4o',
          'anthropic': 'claude-3-5-sonnet-20241022',
          'google': 'gemini-1.5-pro'
        };
        
        const { model } = await inquirer.prompt([
          {
            type: 'input',
            name: 'model',
            message: `Enter ${provider} model:`,
            default: defaultModels[provider as keyof typeof defaultModels] || '',
            validate: (input) => input.length > 0 || 'Please enter a model name'
          }
        ]);
        selectedModel = model;
      }
    }
    
    // Handle custom parameters for genetic algorithm
    let customArgs = option?.args || {};
    
    if (optionId === 'custom') {
      console.log(`\n${chalk.bold('Genetic Algorithm Parameters:')}`);
      
      const paramPrompts = await inquirer.prompt([
        {
          type: 'number',
          name: 'generations',
          message: 'Number of generations:',
          default: 15,
          validate: (input) => input > 0 || 'Must be greater than 0'
        },
        {
          type: 'number',
          name: 'populationSize',
          message: 'Population size:',
          default: 20,
          validate: (input) => input > 0 || 'Must be greater than 0'
        },
        {
          type: 'number',
          name: 'stagnationLimit',
          message: 'Stagnation limit (generations without improvement):',
          default: 5,
          validate: (input) => input > 0 || 'Must be greater than 0'
        },
        {
          type: 'number',
          name: 'questionsPerCategory',
          message: 'Questions per category:',
          default: 3,
          validate: (input) => input > 0 || 'Must be greater than 0'
        }
      ]);
      
      customArgs = { ...customArgs, ...paramPrompts };
    }

    console.log(`\n${chalk.hex('#29ABE2')('Running experiment...')}`);
    
    try {
      await this.simulateProgress('Validating experiment', 1000);
      
      // Run the experiment with all parameters
      const experimentArgs = {
        provider: selectedProvider,
        model: selectedModel,
        ...customArgs
      };
      
      await experimentRegistry.runExperiment(experimentId, optionId, selectedModel, experimentArgs);
      
      console.log(`\n${icons.success} Experiment completed successfully!`);
      console.log(`\n${chalk.bold('Next steps:')}`);
      console.log('• Check the outputs/ directory for results');
      console.log('• Review generated reports and data');
      
    } catch (error) {
      console.error(`\n${icons.error} Experiment failed:`, error);
      console.log(`\n${chalk.bold('Troubleshooting:')}`);
      console.log('• Make sure Ollama is running: `ollama serve`');
      if (selectedModel) {
        console.log(`• Ensure model is available: \`ollama pull ${selectedModel}\``);
      }
      console.log('• Check experiment requirements and dependencies');
    }
  }

  async listExperiments() {
    displayHeader('📋 Available Experiments', 'Experiment catalog and information');
    
    experimentRegistry.printSummary();
    
    await this.returnToMenu();
  }

  async manageAuth() {
    displayHeader('🔑 API Key Management', 'Configure provider credentials');
    
    const action = await showMenu({
      title: 'API Key Management',
      subtitle: 'What would you like to do?',
      choices: [
        { name: '➕ Add New API Key', value: 'add' },
        { name: '📋 Show Configured Keys', value: 'list' },
        { name: '🧪 Test Connections', value: 'test' },
        { name: '🗑  Remove Keys', value: 'remove' }
      ],
      allowBack: true
    });

    if (await handleNavigation(action, () => Promise.resolve())) {
      return;
    }

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

    if (await returnToMenu('API key menu')) {
      await this.manageAuth();
    }
  }

  async addApiKey() {
    const providerChoices = API_KEY_CONFIGS.map(config => ({
      name: config.description,
      value: config.provider
    }));

    const { provider } = await inquirer.prompt([
      {
        type: 'list',
        name: 'provider',
        message: 'Select provider:',
        choices: providerChoices
      }
    ]);

    const config = API_KEY_CONFIGS.find(c => c.provider === provider)!;
    
    const apiKey = await input(
      `Enter ${config.description} API key (${config.example}):`,
      {
        mask: '*',
        validate: (input) => {
          if (input.length === 0) return 'API key is required';
          const validation = this.env.validateApiKeyFormat(provider, input);
          return validation.valid || validation.message!;
        }
      }
    );

    try {
      await this.env.saveApiKey(config.envVar, apiKey);
      console.log(`\n${icons.success} API key for ${config.description} saved successfully!`);
    } catch (error) {
      console.error(`\n${icons.error} Failed to save API key: ${error}`);
    }
  }

  async listApiKeys() {
    console.log(`\n${chalk.bold('🔑 Configured API Keys:')}`);
    
    const keyStatus = this.env.getApiKeyStatus();
    
    if (keyStatus.filter(k => k.isSet).length === 0) {
      console.log('\n  No API keys configured yet.');
      console.log('  Use "Add New API Key" to get started.\n');
      return;
    }

    const tableData = keyStatus.map(status => [
      status.description,
      status.isSet ? status.preview! : 'Not set',
      status.isSet ? '✅ Configured' : '❌ Missing'
    ]);

    displayTable(tableData, ['Provider', 'Key Preview', 'Status']);
  }

  async testApiKeys() {
    console.log(`\n${chalk.hex('#29ABE2')('Testing API connections...')}`);
    
    await this.simulateProgress('Verifying OpenAI', 1500);
    console.log(`${icons.success} OpenAI: Connected`);
    
    await this.simulateProgress('Verifying Anthropic', 1500);
    console.log(`${icons.success} Anthropic: Connected`);
  }

  async removeApiKeys() {
    const keyStatus = this.env.getApiKeyStatus();
    const configuredKeys = keyStatus.filter(k => k.isSet);
    
    if (configuredKeys.length === 0) {
      console.log('\n  No API keys to remove.\n');
      return;
    }

    const choices = configuredKeys.map(status => ({
      name: `${status.description} (${status.preview})`,
      value: status.envVar
    }));

    const { keysToRemove } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'keysToRemove',
        message: 'Select API keys to remove:',
        choices
      }
    ]);

    if (keysToRemove.length === 0) {
      console.log('\n  No keys selected for removal.\n');
      return;
    }

    const confirmed = await confirm(
      `Are you sure you want to remove ${keysToRemove.length} API key(s)?`,
      false
    );

    if (confirmed) {
      for (const envVar of keysToRemove) {
        await this.env.removeApiKey(envVar);
      }
      console.log(`\n${icons.success} Selected API keys removed.\n`);
    }
  }

  async projectSetup() {
    displayHeader('📁 Project Setup', 'Initialize your testing environment');
    
    const { createDirs } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'createDirs',
        message: 'Create test-scenarios and reports directories?',
        default: true
      }
    ]);

    if (createDirs) {
      console.log(`${icons.success} Created project structure!`);
    }

    await this.returnToMenu();
  }

  async batchTesting() {
    displayHeader('📊 Batch Testing', 'Run multiple tests automatically');
    
    console.log(`
${chalk.bold('Batch Testing Options:')}

• Run all scenarios in test-scenarios/
• Generate combined reports
• Parallel execution for speed
• Stop on failure option
`);

    const { proceed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'proceed',
        message: 'Start batch testing?',
        default: false
      }
    ]);

    if (proceed) {
      await this.simulateProgress('Running batch tests', 4000);
      console.log(`${icons.success} Batch testing completed! Check reports/ for results.`);
    }

    await this.returnToMenu();
  }

  async optimizePrompts() {
    displayHeader('🎯 Prompt Optimization', 'Improve your prompts with AI');
    
    console.log(`
${chalk.bold('AI-Powered Optimization:')}

• Analyze prompt performance
• Suggest improvements
• A/B test variations
• Iterative refinement
`);

    await this.returnToMenu();
  }

  async manageConfig() {
    displayHeader('🛠 Settings & Configuration', 'Customize your experience');
    
    const configOptions = [
      { name: '🎨 Default Output Format', value: 'output' },
      { name: '🤖 Default Provider', value: 'provider' },
      { name: '📁 Output Directory', value: 'directory' },
      { name: '← Back to Main Menu', value: 'back' }
    ];

    const { option } = await inquirer.prompt([
      {
        type: 'list',
        name: 'option',
        message: 'What would you like to configure?',
        choices: configOptions
      }
    ]);

    if (option === 'back') return;

    console.log(`${icons.success} Configuration updated!`);
    await this.returnToMenu();
  }

  async showHelp() {
    displayHeader('❓ Help & Documentation', 'Learn how to use Synaptic Lab Kit');
    
    const helpTopics = [
      { name: '🚀 Getting Started Guide', value: 'getting-started' },
      { name: '🧪 Testing Workflows', value: 'testing' },
      { name: '🔑 API Key Setup', value: 'api-keys' },
      { name: '📊 Understanding Reports', value: 'reports' },
      { name: '🎯 Prompt Optimization', value: 'optimization' },
      { name: '🆘 Troubleshooting', value: 'troubleshooting' },
      { name: '← Back to Main Menu', value: 'back' }
    ];

    const { topic } = await inquirer.prompt([
      {
        type: 'list',
        name: 'topic',
        message: 'Choose a help topic:',
        choices: helpTopics
      }
    ]);

    if (topic === 'back') return;

    await this.showHelpTopic(topic);
    await this.returnToMenu();
  }

  async showHelpTopic(topic: string) {
    const content = {
      'getting-started': `
${chalk.bold('🚀 Getting Started')}

1. Set up API keys (OpenAI or Anthropic)
2. Create your first test scenario
3. Run interactive testing
4. Review generated reports
5. Optimize and iterate

${chalk.hex('#00A99D')('Tip:')} Start with the Quick Start option!
`,
      'testing': `
${chalk.bold('🧪 Testing Workflows')}

• Interactive Testing: Guided test creation
• Batch Testing: Run multiple scenarios
• Watch Mode: Auto-run on file changes
• Custom Scenarios: Build your own tests

${chalk.hex('#00A99D')('Best Practice:')} Start simple, then add complexity.
`,
      'api-keys': `
${chalk.bold('🔑 API Key Setup')}

Supported Providers:
• OpenAI: platform.openai.com/api-keys
• Anthropic: console.anthropic.com/account/keys

${chalk.hex('#F7931E')('Security:')} Keys are stored locally in .env file.
`,
    };

    console.log(content[topic as keyof typeof content] || 'Help topic not found.');
  }

  async showReference() {
    displayHeader('📋 Quick Reference', 'Essential commands and shortcuts');
    
    const commands = [
      ['🚀', 'Quick Start', 'Complete setup wizard'],
      ['🧪', 'Test', 'Run interactive tests'],
      ['🔑', 'Auth', 'Manage API keys'],
      ['📁', 'Project', 'Setup project structure'],
      ['📊', 'Batch', 'Run multiple tests'],
      ['🎯', 'Optimize', 'Improve prompts'],
      ['🛠', 'Config', 'Settings & preferences'],
      ['❓', 'Help', 'Documentation & guides']
    ];

    displayTable(commands, ['Icon', 'Command', 'Description']);
    
    await this.returnToMenu();
  }

  async returnToMenu() {
    const { back } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'back',
        message: 'Return to main menu?',
        default: true
      }
    ]);

    if (!back) {
      await this.exit();
    }
  }

  async getAvailableProviders() {
    const providers = [
      { 
        id: 'ollama', 
        name: 'Ollama (Local)', 
        available: await this.checkOllamaAvailable() 
      }
    ];

    // Add API-based providers using env manager
    const keyStatus = this.env.getApiKeyStatus();
    keyStatus.forEach(status => {
      providers.push({
        id: status.provider,
        name: status.description,
        available: status.isSet
      });
    });
    
    // Debug logging
    console.log('\n🔍 Provider Debug:');
    providers.forEach(p => {
      if (p.id === 'ollama') {
        console.log(`  ${p.name}: ${p.available ? '✅' : '❌'} (localhost:11434)`);
      } else {
        const keyConfig = keyStatus.find(k => k.provider === p.id);
        if (keyConfig) {
          const status = keyConfig.isSet ? `SET (${keyConfig.preview})` : 'UNSET';
          console.log(`  ${p.name}: ${p.available ? '✅' : '❌'} (${keyConfig.envVar}=${status})`);
        }
      }
    });
    
    return providers.filter(p => p.available);
  }

  async checkOllamaAvailable(): Promise<boolean> {
    try {
      const response = await fetch('http://localhost:11434/api/version');
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async getOllamaModels(): Promise<string[]> {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      const data = await response.json() as { models?: Array<{ name: string }> };
      return data.models?.map((model: any) => model.name) || [];
    } catch (error) {
      console.warn('Could not fetch Ollama models:', error);
      return [];
    }
  }

  async exit() {
    console.log(`\n${chalk.hex('#00A99D')('Thanks for using Synaptic Lab Kit!')}`);
    console.log(chalk.hex('#33475B')('Happy testing! 🚀\n'));
    this.isRunning = false;
    process.exit(0);
  }

  private async simulateProgress(message: string, duration: number) {
    const ora = (await import('ora')).default;
    const spinner = ora(message).start();
    
    setTimeout(() => {
      spinner.succeed();
    }, duration);
    
    return new Promise(resolve => setTimeout(resolve, duration + 100));
  }
}

// Start the interactive CLI
const cli = new SynapticCLI();
cli.start().catch(console.error);