/**
 * Unified Token Counter Utility
 * Provides flexible token counting with multiple tokenizer fallbacks
 * Primary: gpt-tokenizer (fastest, most reliable for 2025)
 * Fallbacks: js-tiktoken, tiktoken, estimation
 */

export type TokenizerType = 'gpt-tokenizer' | 'js-tiktoken' | 'tiktoken' | 'estimation';

export interface TokenCounterConfig {
  preferredTokenizer?: TokenizerType;
  encoding?: string;
  model?: string;
}

export class TokenCounter {
  private tokenizer: any = null;
  private tokenizerType: TokenizerType = 'estimation';
  private encoding: string;
  private model: string;

  constructor(config: TokenCounterConfig = {}) {
    this.encoding = config.encoding || 'cl100k_base';
    this.model = config.model || 'gpt-3.5-turbo';
    this.initializeTokenizer(config.preferredTokenizer);
  }

  private initializeTokenizer(preferred?: TokenizerType): void {
    // Try preferred tokenizer first
    if (preferred) {
      if (this.tryInitTokenizer(preferred)) {
        return;
      }
    }

    // Try all tokenizers in order of preference (gpt-tokenizer first as it's fastest and most reliable)
    const tokenizers: TokenizerType[] = ['gpt-tokenizer', 'js-tiktoken', 'tiktoken'];
    for (const type of tokenizers) {
      if (this.tryInitTokenizer(type)) {
        return;
      }
    }

    // Fall back to estimation
    console.warn('No tokenizer library available. Using character-based estimation for token counting.');
    this.tokenizerType = 'estimation';
  }

  private tryInitTokenizer(type: TokenizerType): boolean {
    try {
      switch (type) {
        case 'tiktoken':
          const tiktoken = require('tiktoken');
          try {
            this.tokenizer = tiktoken.get_encoding(this.encoding);
          } catch {
            this.tokenizer = tiktoken.encoding_for_model(this.model);
          }
          this.tokenizerType = 'tiktoken';
          return true;

        case 'js-tiktoken':
          const jsTiktoken = require('js-tiktoken');
          this.tokenizer = jsTiktoken.getEncoding(this.encoding);
          this.tokenizerType = 'js-tiktoken';
          return true;

        case 'gpt-tokenizer':
          const { encode } = require('gpt-tokenizer');
          this.tokenizer = { encode };
          this.tokenizerType = 'gpt-tokenizer';
          return true;

        default:
          return false;
      }
    } catch (error) {
      // Tokenizer not available or failed to initialize
      return false;
    }
  }

  /**
   * Count tokens in text using the initialized tokenizer
   */
  countTokens(text: string): number {
    if (!text) return 0;

    switch (this.tokenizerType) {
      case 'tiktoken':
      case 'js-tiktoken':
        try {
          const tokens = this.tokenizer.encode(text);
          return Array.isArray(tokens) ? tokens.length : tokens.length || 0;
        } catch {
          return this.estimateTokens(text);
        }

      case 'gpt-tokenizer':
        try {
          const tokens = this.tokenizer.encode(text);
          return Array.isArray(tokens) ? tokens.length : 0;
        } catch {
          return this.estimateTokens(text);
        }

      default:
        return this.estimateTokens(text);
    }
  }

  /**
   * Estimate token count using hybrid word/character approach
   */
  private estimateTokens(text: string): number {
    if (!text) return 0;

    // Clean and normalize text
    const normalizedText = text.trim();
    if (normalizedText.length === 0) return 0;

    // Count words (split by whitespace and punctuation)
    const words = normalizedText.split(/\s+|(?=[.!?;,])|(?<=[.!?;,])/).filter(w => w.length > 0);
    const wordCount = words.length;
    const charCount = normalizedText.length;

    // Different strategies based on text characteristics
    let estimate: number;

    if (charCount < 100) {
      // Short text: use more conservative estimate
      estimate = Math.ceil(charCount / 3);
    } else if (wordCount / charCount > 0.15) {
      // Word-heavy text (like English)
      const wordBasedEstimate = Math.ceil(wordCount * 1.3);
      const charBasedEstimate = Math.ceil(charCount / 3.5);
      estimate = Math.ceil((wordBasedEstimate * 0.7 + charBasedEstimate * 0.3));
    } else {
      // Character-heavy text (like code or non-English)
      estimate = Math.ceil(charCount / 3);
    }

    return Math.max(1, estimate);
  }

  /**
   * Get the current tokenizer type being used
   */
  getTokenizerType(): TokenizerType {
    return this.tokenizerType;
  }

  /**
   * Check if a specific tokenizer is available
   */
  static isTokenizerAvailable(type: TokenizerType): boolean {
    if (type === 'estimation') return true;
    
    try {
      switch (type) {
        case 'tiktoken':
          require('tiktoken');
          return true;
        case 'js-tiktoken':
          require('js-tiktoken');
          return true;
        case 'gpt-tokenizer':
          require('gpt-tokenizer');
          return true;
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  /**
   * Get available tokenizers
   */
  static getAvailableTokenizers(): TokenizerType[] {
    const available: TokenizerType[] = [];
    const types: TokenizerType[] = ['tiktoken', 'js-tiktoken', 'gpt-tokenizer'];
    
    for (const type of types) {
      if (this.isTokenizerAvailable(type)) {
        available.push(type);
      }
    }
    
    available.push('estimation'); // Always available
    return available;
  }

  /**
   * Cleanup tokenizer resources
   */
  dispose(): void {
    if (this.tokenizer && typeof this.tokenizer.free === 'function') {
      try {
        this.tokenizer.free();
      } catch {
        // Ignore cleanup errors
      }
    }
    this.tokenizer = null;
  }
}

/**
 * Singleton instance for convenience
 */
let defaultCounter: TokenCounter | null = null;

export function getDefaultTokenCounter(): TokenCounter {
  if (!defaultCounter) {
    defaultCounter = new TokenCounter();
  }
  return defaultCounter;
}

export function countTokens(text: string): number {
  return getDefaultTokenCounter().countTokens(text);
}