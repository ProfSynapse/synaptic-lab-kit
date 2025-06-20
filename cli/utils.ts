import { BaseAdapter } from '../adapters/BaseAdapter';
import * as adapters from '../adapters';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';

export interface CliConfig {
  provider?: string;
  model?: string;
  outputFormat?: 'markdown' | 'html' | 'json';
  outputDir?: string;
  verbose?: boolean;
}

export function loadConfig(): CliConfig {
  const configPath = join(process.cwd(), '.synapticrc.json');
  if (existsSync(configPath)) {
    try {
      return JSON.parse(readFileSync(configPath, 'utf-8'));
    } catch (error) {
      console.warn('Failed to load .synapticrc.json', error);
    }
  }
  return {};
}

export function getAvailableProviders(): string[] {
  const providers: string[] = [];
  if (process.env.OPENAI_API_KEY) providers.push('openai');
  if (process.env.GOOGLE_API_KEY) providers.push('google');
  if (process.env.ANTHROPIC_API_KEY) providers.push('anthropic');
  if (process.env.MISTRAL_API_KEY) providers.push('mistral');
  if (process.env.OPENROUTER_API_KEY) providers.push('openrouter');
  if (process.env.REQUESTY_API_KEY) providers.push('requesty');
  providers.push('ollama'); // Always available
  return providers;
}

export async function createAdapter(provider?: string, model?: string): Promise<BaseAdapter> {
  const config = loadConfig();
  const selectedProvider = provider || config.provider;
  const selectedModel = model || config.model;
  
  if (!selectedProvider) {
    const available = getAvailableProviders();
    if (available.length === 0) {
      throw new Error('No API keys found. Please set at least one provider API key.');
    }
    throw new Error(`No provider specified. Available: ${available.join(', ')}`);
  }
  
  const adapterMap: Record<string, any> = {
    openai: adapters.OpenAIAdapter,
    anthropic: adapters.AnthropicAdapter,
    // Other adapters temporarily disabled for stability
  };

  const AdapterClass = adapterMap[selectedProvider];
  if (!AdapterClass) {
    throw new Error(`Unknown provider: ${selectedProvider}`);
  }

  return new AdapterClass(selectedModel);
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

export function formatCost(cost: number): string {
  if (cost < 0.01) return `$${cost.toFixed(6)}`;
  if (cost < 1) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}

export function printHeader(title: string): void {
  const width = 60;
  const padding = Math.floor((width - title.length - 2) / 2);
  const line = '═'.repeat(width);
  
  console.log(chalk.blue(`\n${line}`));
  console.log(chalk.blue(`║${' '.repeat(padding)}${title}${' '.repeat(width - padding - title.length - 2)}║`));
  console.log(chalk.blue(`${line}\n`));
}