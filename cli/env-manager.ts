/**
 * Environment Manager - Handle .env file operations
 */

import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

export interface ApiKeyConfig {
  provider: string;
  envVar: string;
  description: string;
  example: string;
}

export const API_KEY_CONFIGS: ApiKeyConfig[] = [
  {
    provider: 'openai',
    envVar: 'OPENAI_API_KEY',
    description: 'OpenAI (GPT-4, GPT-3.5)',
    example: 'sk-...'
  },
  {
    provider: 'anthropic',
    envVar: 'ANTHROPIC_API_KEY',
    description: 'Anthropic (Claude)',
    example: 'sk-ant-...'
  },
  {
    provider: 'google',
    envVar: 'GOOGLE_API_KEY',
    description: 'Google (Gemini)',
    example: 'AIza...'
  },
  {
    provider: 'mistral',
    envVar: 'MISTRAL_API_KEY',
    description: 'Mistral AI',
    example: '...'
  },
  {
    provider: 'openrouter',
    envVar: 'OPENROUTER_API_KEY',
    description: 'OpenRouter (400+ models)',
    example: 'sk-or-...'
  },
  {
    provider: 'requesty',
    envVar: 'REQUESTY_API_KEY',
    description: 'Requesty (150+ models)',
    example: '...'
  }
];

export class EnvManager {
  private envPath: string;
  private envExamplePath: string;

  constructor(projectRoot: string = process.cwd()) {
    this.envPath = path.join(projectRoot, '.env');
    this.envExamplePath = path.join(projectRoot, '.env.example');
  }

  /**
   * Load environment variables and return them
   */
  async loadEnv(): Promise<Record<string, string>> {
    // First load from .env file if it exists
    if (fsSync.existsSync(this.envPath)) {
      dotenv.config({ path: this.envPath });
    }
    
    return process.env as Record<string, string>;
  }

  /**
   * Check if an API key is properly set
   */
  isApiKeySet(envVar: string): boolean {
    const value = process.env[envVar];
    return !!(value && value.trim().length > 0 && value !== 'undefined' && value !== 'null' && !value.includes('...'));
  }

  /**
   * Get all configured API keys with their status
   */
  getApiKeyStatus(): Array<{ provider: string; envVar: string; description: string; isSet: boolean; preview?: string }> {
    return API_KEY_CONFIGS.map(config => {
      const isSet = this.isApiKeySet(config.envVar);
      const result: { provider: string; envVar: string; description: string; isSet: boolean; preview?: string } = {
        provider: config.provider,
        envVar: config.envVar,
        description: config.description,
        isSet
      };
      
      if (isSet) {
        result.preview = this.maskApiKey(process.env[config.envVar]!);
      }
      
      return result;
    });
  }

  /**
   * Save an API key to the .env file
   */
  async saveApiKey(envVar: string, value: string): Promise<void> {
    // Validate the key format
    if (!value || value.trim().length === 0) {
      throw new Error('API key cannot be empty');
    }

    // Read existing .env file or create new one
    let envContent = '';
    if (fsSync.existsSync(this.envPath)) {
      envContent = await fs.readFile(this.envPath, 'utf8');
    } else {
      // If no .env exists, copy from .env.example as template
      if (fsSync.existsSync(this.envExamplePath)) {
        envContent = await fs.readFile(this.envExamplePath, 'utf8');
        // Remove example values
        envContent = envContent.replace(/=.*/g, '=');
      }
    }

    // Update or add the specific environment variable
    const lines = envContent.split('\n');
    let updated = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line && line.startsWith(`${envVar}=`)) {
        lines[i] = `${envVar}=${value}`;
        updated = true;
        break;
      }
    }

    // If not found, add it
    if (!updated) {
      lines.push(`${envVar}=${value}`);
    }

    // Write back to file
    await fs.writeFile(this.envPath, lines.join('\n'));
    
    // Update process.env immediately
    process.env[envVar] = value;
    
    console.log(`✅ Saved ${envVar} to .env file`);
  }

  /**
   * Remove an API key from the .env file
   */
  async removeApiKey(envVar: string): Promise<void> {
    if (!fsSync.existsSync(this.envPath)) {
      console.log('No .env file found');
      return;
    }

    const envContent = await fs.readFile(this.envPath, 'utf8');
    const lines = envContent.split('\n');
    
    const filteredLines = lines.filter(line => !line.startsWith(`${envVar}=`));
    
    await fs.writeFile(this.envPath, filteredLines.join('\n'));
    
    // Update process.env
    delete process.env[envVar];
    
    console.log(`🗑️  Removed ${envVar} from .env file`);
  }

  /**
   * Create .env file from template if it doesn't exist
   */
  async ensureEnvFile(): Promise<void> {
    if (fsSync.existsSync(this.envPath)) {
      return;
    }

    if (fsSync.existsSync(this.envExamplePath)) {
      const exampleContent = await fs.readFile(this.envExamplePath, 'utf8');
      // Clear all values but keep structure
      const cleanedContent = exampleContent.replace(/=.+$/gm, '=');
      await fs.writeFile(this.envPath, cleanedContent);
      console.log('📁 Created .env file from template');
    } else {
      // Create minimal .env file
      const minimalContent = API_KEY_CONFIGS
        .map(config => `${config.envVar}=`)
        .join('\n');
      await fs.writeFile(this.envPath, minimalContent);
      console.log('📁 Created minimal .env file');
    }
  }

  /**
   * Mask API key for display
   */
  private maskApiKey(key: string): string {
    if (key.length <= 8) return '*'.repeat(key.length);
    return key.substring(0, 4) + '*'.repeat(key.length - 8) + key.substring(key.length - 4);
  }

  /**
   * Validate API key format for specific providers
   */
  validateApiKeyFormat(provider: string, key: string): { valid: boolean; message?: string } {
    const trimmedKey = key.trim();
    
    switch (provider) {
      case 'openai':
        if (!trimmedKey.startsWith('sk-')) {
          return { valid: false, message: 'OpenAI API keys should start with "sk-"' };
        }
        break;
      case 'anthropic':
        if (!trimmedKey.startsWith('sk-ant-')) {
          return { valid: false, message: 'Anthropic API keys should start with "sk-ant-"' };
        }
        break;
      case 'google':
        if (!trimmedKey.startsWith('AIza')) {
          return { valid: false, message: 'Google API keys typically start with "AIza"' };
        }
        break;
      case 'openrouter':
        if (!trimmedKey.startsWith('sk-or-')) {
          return { valid: false, message: 'OpenRouter API keys should start with "sk-or-"' };
        }
        break;
    }

    if (trimmedKey.length < 20) {
      return { valid: false, message: 'API key seems too short' };
    }

    return { valid: true };
  }
}

// Singleton instance
export const envManager = new EnvManager();