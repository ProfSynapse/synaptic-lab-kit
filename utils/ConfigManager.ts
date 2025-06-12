/**
 * Configuration Manager
 * Centralized configuration management for the lab kit
 * Handles environment variables, validation, and default settings
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface LabKitConfig {
  // Provider configurations
  providers: {
    openai: {
      apiKey?: string;
      baseUrl?: string;
      organization?: string;
      project?: string;
    };
    google: {
      apiKey?: string;
      projectId?: string;
      location?: string;
    };
    anthropic: {
      apiKey?: string;
      version?: string;
    };
    mistral: {
      apiKey?: string;
      endpoint?: string;
    };
    openrouter: {
      apiKey?: string;
      httpReferer?: string;
      xTitle?: string;
    };
    requesty: {
      apiKey?: string;
      baseUrl?: string;
    };
  };

  // Database configuration
  database: {
    supabase: {
      url?: string;
      anonKey?: string;
      serviceRoleKey?: string;
    };
  };

  // Embedding providers
  embeddings: {
    openai: {
      apiKey?: string;
      model?: string;
    };
    voyage: {
      apiKey?: string;
    };
    cohere: {
      apiKey?: string;
    };
    google: {
      apiKey?: string;
    };
    mistral: {
      apiKey?: string;
    };
  };

  // Default test settings
  defaults: {
    timeout: number;
    retries: number;
    concurrency: number;
    batchSize: number;
  };

  // Logging and debugging
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enableFileLogging: boolean;
    logDirectory: string;
  };
}

export class ConfigManager {
  private static instance: ConfigManager;
  private config: LabKitConfig;
  private configPath?: string;

  private constructor() {
    this.config = this.loadDefaultConfig();
    this.loadEnvironmentConfig();
    this.loadFileConfig();
    this.validateConfig();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Get the complete configuration
   */
  getConfig(): LabKitConfig {
    return { ...this.config };
  }

  /**
   * Get provider configuration
   */
  getProvider(name: keyof LabKitConfig['providers']): any {
    return this.config.providers[name];
  }

  /**
   * Get database configuration
   */
  getDatabase(): LabKitConfig['database'] {
    return this.config.database;
  }

  /**
   * Get embedding provider configuration
   */
  getEmbeddingProvider(name: keyof LabKitConfig['embeddings']): any {
    return this.config.embeddings[name];
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<LabKitConfig>): void {
    this.config = this.mergeConfigs(this.config, updates);
    this.validateConfig();
  }

  /**
   * Load configuration from file
   */
  loadFromFile(path: string): void {
    this.configPath = path;
    this.loadFileConfig();
    this.validateConfig();
  }

  /**
   * Check if a provider is configured
   */
  isProviderConfigured(name: keyof LabKitConfig['providers']): boolean {
    const provider = this.config.providers[name];
    return !!(provider.apiKey);
  }

  /**
   * Get list of configured providers
   */
  getConfiguredProviders(): string[] {
    return Object.keys(this.config.providers).filter(name => 
      this.isProviderConfigured(name as keyof LabKitConfig['providers'])
    );
  }

  /**
   * Check if database is configured
   */
  isDatabaseConfigured(): boolean {
    const db = this.config.database.supabase;
    return !!(db.url && (db.anonKey || db.serviceRoleKey));
  }

  /**
   * Get configuration for specific embedding provider
   */
  isEmbeddingProviderConfigured(name: keyof LabKitConfig['embeddings']): boolean {
    const provider = this.config.embeddings[name];
    return !!(provider.apiKey);
  }

  // Private methods

  private loadDefaultConfig(): LabKitConfig {
    return {
      providers: {
        openai: {
          baseUrl: 'https://api.openai.com/v1'
        },
        google: {
          location: 'us-central1'
        },
        anthropic: {
          version: '2024-02-15'
        },
        mistral: {
          endpoint: 'https://api.mistral.ai/v1'
        },
        openrouter: {},
        requesty: {}
      },
      database: {
        supabase: {}
      },
      embeddings: {
        openai: {
          model: 'text-embedding-3-small'
        },
        voyage: {},
        cohere: {},
        google: {},
        mistral: {}
      },
      defaults: {
        timeout: 30000,
        retries: 3,
        concurrency: 5,
        batchSize: 10
      },
      logging: {
        level: 'info',
        enableFileLogging: false,
        logDirectory: './logs'
      }
    };
  }

  private loadEnvironmentConfig(): void {
    // Provider API keys
    this.setIfExists('providers.openai.apiKey', process.env.OPENAI_API_KEY);
    this.setIfExists('providers.openai.organization', process.env.OPENAI_ORGANIZATION);
    this.setIfExists('providers.openai.project', process.env.OPENAI_PROJECT);
    
    this.setIfExists('providers.google.apiKey', process.env.GOOGLE_API_KEY);
    this.setIfExists('providers.google.projectId', process.env.GOOGLE_PROJECT_ID);
    
    this.setIfExists('providers.anthropic.apiKey', process.env.ANTHROPIC_API_KEY);
    
    this.setIfExists('providers.mistral.apiKey', process.env.MISTRAL_API_KEY);
    
    this.setIfExists('providers.openrouter.apiKey', process.env.OPENROUTER_API_KEY);
    this.setIfExists('providers.openrouter.httpReferer', process.env.OPENROUTER_HTTP_REFERER);
    this.setIfExists('providers.openrouter.xTitle', process.env.OPENROUTER_X_TITLE);
    
    this.setIfExists('providers.requesty.apiKey', process.env.REQUESTY_API_KEY);
    this.setIfExists('providers.requesty.baseUrl', process.env.REQUESTY_BASE_URL);

    // Database
    this.setIfExists('database.supabase.url', process.env.SUPABASE_URL);
    this.setIfExists('database.supabase.anonKey', process.env.SUPABASE_ANON_KEY);
    this.setIfExists('database.supabase.serviceRoleKey', process.env.SUPABASE_SERVICE_ROLE_KEY);

    // Embedding providers
    this.setIfExists('embeddings.openai.apiKey', process.env.OPENAI_API_KEY);
    this.setIfExists('embeddings.voyage.apiKey', process.env.VOYAGE_API_KEY);
    this.setIfExists('embeddings.cohere.apiKey', process.env.COHERE_API_KEY);
    this.setIfExists('embeddings.google.apiKey', process.env.GOOGLE_API_KEY);
    this.setIfExists('embeddings.mistral.apiKey', process.env.MISTRAL_API_KEY);

    // Defaults
    if (process.env.LAB_KIT_TIMEOUT) {
      this.config.defaults.timeout = parseInt(process.env.LAB_KIT_TIMEOUT);
    }
    if (process.env.LAB_KIT_RETRIES) {
      this.config.defaults.retries = parseInt(process.env.LAB_KIT_RETRIES);
    }
    if (process.env.LAB_KIT_CONCURRENCY) {
      this.config.defaults.concurrency = parseInt(process.env.LAB_KIT_CONCURRENCY);
    }

    // Logging
    if (process.env.LAB_KIT_LOG_LEVEL) {
      this.config.logging.level = process.env.LAB_KIT_LOG_LEVEL as any;
    }
    if (process.env.LAB_KIT_LOG_DIRECTORY) {
      this.config.logging.logDirectory = process.env.LAB_KIT_LOG_DIRECTORY;
    }
  }

  private loadFileConfig(): void {
    const configPaths = [
      this.configPath,
      './lab-kit.config.json',
      './lab-kit.config.js',
      './.labkitrc',
      join(process.cwd(), 'lab-kit.config.json')
    ].filter(Boolean);

    for (const path of configPaths) {
      if (existsSync(path!)) {
        try {
          let fileConfig;
          
          if (path!.endsWith('.js')) {
            fileConfig = require(path!);
          } else {
            const content = readFileSync(path!, 'utf8');
            fileConfig = JSON.parse(content);
          }

          this.config = this.mergeConfigs(this.config, fileConfig);
          console.log(`📁 Loaded configuration from ${path}`);
          break;
        } catch (error) {
          console.warn(`Failed to load config from ${path}:`, error);
        }
      }
    }
  }

  private setIfExists(path: string, value: any): void {
    if (value !== undefined && value !== null && value !== '') {
      this.setNestedValue(this.config, path, value);
    }
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  private mergeConfigs(base: any, override: any): any {
    const result = { ...base };
    
    for (const key in override) {
      if (override[key] && typeof override[key] === 'object' && !Array.isArray(override[key])) {
        result[key] = this.mergeConfigs(result[key] || {}, override[key]);
      } else {
        result[key] = override[key];
      }
    }
    
    return result;
  }

  private validateConfig(): void {
    const errors: string[] = [];

    // Check for at least one provider
    const configuredProviders = this.getConfiguredProviders();
    if (configuredProviders.length === 0) {
      errors.push('At least one LLM provider must be configured');
    }

    // Validate timeout values
    if (this.config.defaults.timeout < 1000) {
      errors.push('Timeout must be at least 1000ms');
    }

    if (this.config.defaults.retries < 0 || this.config.defaults.retries > 10) {
      errors.push('Retries must be between 0 and 10');
    }

    if (this.config.defaults.concurrency < 1 || this.config.defaults.concurrency > 50) {
      errors.push('Concurrency must be between 1 and 50');
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
  }

  /**
   * Get configuration summary for debugging
   */
  getConfigSummary(): Record<string, any> {
    return {
      providers: {
        configured: this.getConfiguredProviders(),
        total: Object.keys(this.config.providers).length
      },
      database: {
        configured: this.isDatabaseConfigured()
      },
      embeddings: {
        configured: Object.keys(this.config.embeddings).filter(name => 
          this.isEmbeddingProviderConfigured(name as keyof LabKitConfig['embeddings'])
        )
      },
      defaults: this.config.defaults,
      logging: this.config.logging
    };
  }
}