/**
 * Hugging Face Model Loader
 * Loads and integrates models from Hugging Face Hub for optimization
 * 
 * TEMPORARILY DISABLED: Missing @huggingface dependencies
 * To enable: npm install @huggingface/transformers @huggingface/hub @huggingface/inference
 */

export interface HuggingFaceModelConfig {
  modelId: string;
  task?: 'text-generation' | 'text2text-generation' | 'conversational';
  token?: string;
  endpoint?: string;
  parameters?: HuggingFaceParameters;
  quantized?: boolean;
  revision?: string;
  useInferenceAPI?: boolean;
  useTransformersJS?: boolean;
}

export interface HuggingFaceParameters {
  max_new_tokens?: number;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  repetition_penalty?: number;
  do_sample?: boolean;
  num_return_sequences?: number;
  return_full_text?: boolean;
  stop_sequences?: string[];
  seed?: number;
}

export class HuggingFaceModelLoader {
  private config: HuggingFaceModelConfig;

  constructor(config: HuggingFaceModelConfig) {
    this.config = config;
    console.warn('HuggingFace integration temporarily disabled - missing dependencies');
  }

  async initialize(): Promise<void> {
    throw new Error('HuggingFace integration disabled - install required dependencies to enable');
  }

  async loadModel(): Promise<void> {
    throw new Error('HuggingFace integration disabled - install required dependencies to enable');
  }

  async generate(_prompt: string): Promise<any> {
    throw new Error('HuggingFace integration disabled - install required dependencies to enable');
  }

  getModelInfo(): any {
    return null;
  }

  getConfig(): HuggingFaceModelConfig {
    return this.config;
  }
}

/**
 * Factory function for creating HuggingFace model loaders
 */
export function createHuggingFaceLoader(config: HuggingFaceModelConfig): HuggingFaceModelLoader {
  return new HuggingFaceModelLoader(config);
}

/**
 * Get available HuggingFace models (placeholder)
 */
export function getAvailableHuggingFaceModels(): string[] {
  return [];
}