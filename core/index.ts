/**
 * Core testing framework exports
 * Main entry point for all testing components
 */

// Core components
export { TestRunner } from './TestRunner';
export { ResponseGenerator } from './ResponseGenerator';
export { ResponseEvaluator } from './ResponseEvaluator';
export { PersonaGenerator } from './PersonaGenerator';
export { ScenarioBuilder } from './ScenarioBuilder';

// Types
export * from './types';

// Re-export key dependencies for convenience
export { createAdapter, getAvailableProviders } from '../adapters';
export { createEmbeddingProvider, getAvailableEmbeddingProviders } from '../embeddings';
export { DatabaseManager, createDatabaseManager } from '../database';

/**
 * Main testing framework class
 * Provides a high-level interface for setting up and running tests
 */
import { TestRunner } from './TestRunner';
import { PersonaGenerator } from './PersonaGenerator';
import { ScenarioBuilder } from './ScenarioBuilder';
import { DatabaseManager } from '../database';
import { 
  TestConfig, 
  TestExecution, 
  TestDescription, 
  PersonaRequirements,
  TestFrameworkError
} from './types';

export class SynapticLabKit {
  private testRunner: TestRunner;
  private personaGenerator: PersonaGenerator;
  private scenarioBuilder: ScenarioBuilder;
  private database?: DatabaseManager;
  private initialized: boolean = false;

  constructor() {
    this.testRunner = new TestRunner();
    this.personaGenerator = new PersonaGenerator();
    this.scenarioBuilder = new ScenarioBuilder();
  }

  /**
   * Initialize the framework
   */
  async initialize(config?: {
    database?: any;
    customTemplates?: {
      personas?: Record<string, any>;
      scenarios?: Record<string, any>;
    };
  }): Promise<void> {
    try {
      // Initialize test runner
      await this.testRunner.initialize(config);
      
      // Setup database if provided
      if (config?.database) {
        this.database = new DatabaseManager(config.database);
        await this.database.initialize();
      }
      
      // Add custom templates if provided
      if (config?.customTemplates?.personas) {
        Object.entries(config.customTemplates.personas).forEach(([name, template]) => {
          this.personaGenerator.addTemplate(name, template);
        });
      }
      
      if (config?.customTemplates?.scenarios) {
        Object.entries(config.customTemplates.scenarios).forEach(([name, template]) => {
          this.scenarioBuilder.addTemplate(name, template);
        });
      }
      
      this.initialized = true;
      console.log('✅ Synaptic Lab Kit initialized successfully');
    } catch (error) {
      throw new TestFrameworkError(
        `Failed to initialize Synaptic Lab Kit: ${(error as Error).message}`,
        'INIT_FAILED',
        'system',
        { config },
        false
      );
    }
  }

  /**
   * Create a test configuration from natural language description
   */
  async createTest(description: {
    name: string;
    description: string;
    provider: string;
    scenarios?: TestDescription;
    personas?: PersonaRequirements;
    evaluation?: {
      criteria: string[];
      thresholds?: Record<string, number>;
    };
    database?: {
      enabled: boolean;
      schema?: any;
      seedData?: any;
    };
  }): Promise<TestConfig> {
    this.ensureInitialized();
    
    try {
      // Generate scenarios
      const scenarios = description.scenarios ? 
        await this.scenarioBuilder.buildScenarios(description.scenarios) :
        [];
      
      // Generate personas
      const personas = description.personas ? 
        await this.personaGenerator.generatePersonas(description.personas) :
        [];
      
      // Build evaluation config
      const evaluation = {
        criteria: (description.evaluation?.criteria || ['accuracy', 'relevance']).map(name => ({
          name,
          type: name as any,
          weight: 1.0,
          description: `Evaluate ${name} of the response`
        })),
        thresholds: description.evaluation?.thresholds || {
          accuracy: 0.7,
          relevance: 0.7
        }
      };
      
      const config: TestConfig = {
        name: description.name,
        description: description.description,
        provider: description.provider as any,
        scenarios,
        personas,
        evaluation,
        useVectorDatabase: description.database?.enabled || false,
        maxRetries: 3,
        timeout: 30000,
        temperature: 0.7
      };
      
      return config;
    } catch (error) {
      throw new TestFrameworkError(
        `Failed to create test configuration: ${(error as Error).message}`,
        'CONFIG_CREATION_FAILED',
        'config',
        { description },
        true
      );
    }
  }

  /**
   * Run a test configuration
   */
  async runTest(config: TestConfig): Promise<string> {
    this.ensureInitialized();
    
    try {
      return await this.testRunner.startTest(config);
    } catch (error) {
      throw new TestFrameworkError(
        `Failed to run test: ${(error as Error).message}`,
        'TEST_EXECUTION_FAILED',
        'execution',
        { config },
        true
      );
    }
  }

  /**
   * Get test execution status
   */
  getTestExecution(executionId: string): TestExecution | undefined {
    return this.testRunner.getExecution(executionId);
  }

  /**
   * Get test progress
   */
  getTestProgress(executionId: string) {
    return this.testRunner.getProgress(executionId);
  }

  /**
   * Cancel a running test
   */
  async cancelTest(executionId: string): Promise<boolean> {
    return await this.testRunner.cancelTest(executionId);
  }

  /**
   * Setup database for testing
   */
  async setupDatabase(config: {
    schema: Record<string, any>;
    seedData?: Record<string, any[]>;
    vectorTables?: string[];
  }): Promise<boolean> {
    if (!this.database) {
      throw new Error('Database not initialized. Call initialize() with database config first.');
    }
    
    try {
      // Create tables from schema
      for (const [tableName, tableSchema] of Object.entries(config.schema)) {
        await this.database.schema.createTable(tableName, tableSchema);
      }
      
      // Seed data if provided
      if (config.seedData) {
        for (const [tableName, data] of Object.entries(config.seedData)) {
          await this.database.seeder.seed(tableName, data);
        }
      }
      
      // Setup vector tables if specified
      if (config.vectorTables) {
        for (const tableName of config.vectorTables) {
          const tableConfig = {
            ...config.schema[tableName],
            vectorColumn: 'embedding',
            vectorDimensions: 1536, // Default OpenAI dimensions
            textColumn: 'content'
          };
          
          await this.database.schema.createVectorTable(tableName, tableConfig);
        }
      }
      
      console.log('✅ Database setup completed');
      return true;
    } catch (error) {
      console.error('❌ Database setup failed:', error);
      return false;
    }
  }

  /**
   * Listen to test execution events
   */
  onTestUpdate(callback: (update: any) => void): void {
    this.testRunner.on('update', callback);
  }

  /**
   * Remove test update listener
   */
  offTestUpdate(callback: (update: any) => void): void {
    this.testRunner.off('update', callback);
  }

  /**
   * Get framework capabilities
   */
  getCapabilities(): {
    providers: string[];
    embeddingProviders: string[];
    scenarioCategories: string[];
    personaTypes: string[];
    evaluationCriteria: string[];
  } {
    return {
      providers: ['openai', 'google', 'anthropic', 'mistral', 'openrouter', 'requesty'],
      embeddingProviders: ['openai', 'voyage', 'cohere', 'google', 'mistral'],
      scenarioCategories: this.scenarioBuilder.getAvailableCategories(),
      personaTypes: this.personaGenerator.getAvailableTypes(),
      evaluationCriteria: ['accuracy', 'relevance', 'coherence', 'completeness', 'safety', 'creativity']
    };
  }

  /**
   * Health check for all components
   */
  async healthCheck(): Promise<{
    framework: boolean;
    database: boolean;
    details: any;
  }> {
    const health = {
      framework: this.initialized,
      database: false,
      details: {
        initialized: this.initialized,
        components: {
          testRunner: !!this.testRunner,
          personaGenerator: !!this.personaGenerator,
          scenarioBuilder: !!this.scenarioBuilder
        }
      }
    };
    
    if (this.database) {
      const dbHealth = await this.database.healthCheck();
      health.database = dbHealth.overall;
      health.details.database = dbHealth.details;
    }
    
    return health;
  }

  // Private helper methods

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new TestFrameworkError(
        'Synaptic Lab Kit not initialized. Call initialize() first.',
        'NOT_INITIALIZED',
        'system',
        {},
        true
      );
    }
  }
}

/**
 * Create a new instance of Synaptic Lab Kit
 */
export function createSynapticLabKit(): SynapticLabKit {
  return new SynapticLabKit();
}

/**
 * Quick setup function for common use cases
 */
export async function quickSetup(config: {
  provider: string;
  database?: boolean;
  embeddingProvider?: string;
}): Promise<SynapticLabKit> {
  const kit = new SynapticLabKit();
  
  const initConfig: any = {};
  
  if (config.database) {
    initConfig.database = {
      // Use environment variables for database config
    };
  }
  
  await kit.initialize(initConfig);
  return kit;
}
