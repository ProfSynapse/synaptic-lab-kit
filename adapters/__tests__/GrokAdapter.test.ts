/**
 * Tests for Grok (xAI) Adapter
 * Verifies correct implementation of the adapter pattern
 */

import { GrokAdapter } from '../grok/GrokAdapter';
import { LLMProviderError } from '../types';
import OpenAI from 'openai';

// Mock OpenAI module
jest.mock('openai');
const MockedOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;

describe('GrokAdapter', () => {
  let adapter: GrokAdapter;
  const mockApiKey = 'test-xai-api-key';
  
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.XAI_API_KEY = mockApiKey;
    adapter = new GrokAdapter();
  });

  afterEach(() => {
    delete process.env.XAI_API_KEY;
  });

  describe('Constructor', () => {
    it('should initialize with correct defaults', () => {
      expect(adapter.name).toBe('grok');
      expect(adapter.baseUrl).toBe('https://api.x.ai/v1');
      expect(adapter.getCurrentModel()).toBe('grok-3');
    });

    it('should initialize with custom model', () => {
      const customAdapter = new GrokAdapter('grok-3-mini');
      expect(customAdapter.getCurrentModel()).toBe('grok-3-mini');
    });

    it('should initialize OpenAI client with correct config', () => {
      expect(MockedOpenAI).toHaveBeenCalledWith({
        apiKey: mockApiKey,
        baseURL: 'https://api.x.ai/v1'
      });
    });

    it('should throw error when API key is missing', () => {
      delete process.env.XAI_API_KEY;
      expect(() => new GrokAdapter()).toThrow(LLMProviderError);
    });
  });

  describe('Generate', () => {
    const mockCompletion = {
      id: 'chatcmpl-123',
      object: 'chat.completion',
      created: 1733927041,
      model: 'grok-3',
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: 'Test response from Grok'
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30
      }
    };

    beforeEach(() => {
      const mockCreate = jest.fn().mockResolvedValue(mockCompletion);
      MockedOpenAI.prototype.chat = {
        completions: { create: mockCreate }
      } as any;
    });

    it('should generate a response with default parameters', async () => {
      const response = await adapter.generate('Test prompt');
      
      expect(response.text).toBe('Test response from Grok');
      expect(response.model).toBe('grok-3');
      expect(response.provider).toBe('grok');
      expect(response.usage).toEqual({
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30
      });
    });

    it('should pass custom options to the API', async () => {
      await adapter.generate('Test prompt', {
        temperature: 0.5,
        maxTokens: 1000,
        systemPrompt: 'You are a helpful assistant',
        jsonMode: true
      });

      const mockCreate = MockedOpenAI.prototype.chat.completions.create as jest.Mock;
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'grok-3',
        messages: [
          { role: 'system', content: 'You are a helpful assistant' },
          { role: 'user', content: 'Test prompt' }
        ],
        temperature: 0.5,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      });
    });

    it('should handle API errors properly', async () => {
      const mockError = new Error('API Error');
      (mockError as any).response = {
        status: 429,
        data: { error: { message: 'Rate limit exceeded' } }
      };
      
      const mockCreate = jest.fn().mockRejectedValue(mockError);
      MockedOpenAI.prototype.chat = {
        completions: { create: mockCreate }
      } as any;

      // Clear the cache to ensure we actually call the API
      await adapter.clearCache();

      await expect(adapter.generate('Test prompt', { disableCache: true })).rejects.toThrow(LLMProviderError);
    });
  });

  describe('Generate Stream', () => {
    const mockStreamChunks = [
      { choices: [{ delta: { content: 'Hello' } }] },
      { choices: [{ delta: { content: ' from' } }] },
      { choices: [{ delta: { content: ' Grok' } }], model: 'grok-3' },
      { 
        choices: [{ delta: {}, finish_reason: 'stop' }],
        usage: { prompt_tokens: 5, completion_tokens: 10, total_tokens: 15 }
      }
    ];

    beforeEach(() => {
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of mockStreamChunks) {
            yield chunk;
          }
        }
      };
      
      const mockCreate = jest.fn().mockResolvedValue(mockStream);
      MockedOpenAI.prototype.chat = {
        completions: { create: mockCreate }
      } as any;
    });

    it('should stream responses correctly', async () => {
      const tokens: string[] = [];
      const response = await adapter.generateStream('Test prompt', {
        onToken: (token) => tokens.push(token)
      });

      expect(tokens).toEqual(['Hello', ' from', ' Grok']);
      expect(response.text).toBe('Hello from Grok');
      expect(response.model).toBe('grok-3');
      expect(response.usage).toEqual({
        promptTokens: 5,
        completionTokens: 10,
        totalTokens: 15
      });
    });

    it('should call onComplete callback', async () => {
      const onComplete = jest.fn();
      await adapter.generateStream('Test prompt', { onComplete });
      
      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Hello from Grok',
          model: 'grok-3'
        })
      );
    });

    it('should handle stream errors', async () => {
      const mockError = new Error('Stream error');
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          throw mockError;
        }
      };
      
      const mockCreate = jest.fn().mockResolvedValue(mockStream);
      MockedOpenAI.prototype.chat = {
        completions: { create: mockCreate }
      } as any;

      const onError = jest.fn();
      await expect(
        adapter.generateStream('Test prompt', { onError })
      ).rejects.toThrow();
      
      expect(onError).toHaveBeenCalledWith(mockError);
    });
  });

  describe('List Models', () => {
    it('should return available Grok models', async () => {
      const models = await adapter.listModels();
      
      expect(models).toHaveLength(2);
      expect(models[0]).toMatchObject({
        id: 'grok-3',
        name: 'Grok 3',
        contextWindow: 131072,
        maxOutputTokens: 32768,
        supportsJSON: true,
        supportsImages: false,
        supportsFunctions: true,
        supportsStreaming: true,
        supportsThinking: false,
        pricing: {
          inputPerMillion: 3.00,
          outputPerMillion: 15.00,
          currency: 'USD'
        }
      });
      
      expect(models[1]).toMatchObject({
        id: 'grok-3-mini',
        name: 'Grok 3 Mini',
        supportsThinking: true
      });
    });
  });

  describe('Get Capabilities', () => {
    it('should return correct capabilities', () => {
      const capabilities = adapter.getCapabilities();
      
      expect(capabilities).toEqual({
        supportsStreaming: true,
        supportsJSON: true,
        supportsImages: false,
        supportsFunctions: true,
        supportsThinking: true,
        maxContextWindow: 131072,
        supportedFeatures: [
          'chat',
          'completion',
          'json_mode',
          'function_calling',
          'streaming',
          'reasoning'
        ]
      });
    });
  });

  describe('Get Model Pricing', () => {
    it('should return pricing for valid model', async () => {
      const pricing = await adapter.getModelPricing('grok-3');
      
      expect(pricing).toMatchObject({
        rateInputPerMillion: 3.00,
        rateOutputPerMillion: 15.00,
        currency: 'USD'
      });
    });

    it('should return null for invalid model', async () => {
      const pricing = await adapter.getModelPricing('invalid-model');
      expect(pricing).toBeNull();
    });
  });

  describe('Model Management', () => {
    it('should set and get current model', () => {
      adapter.setModel('grok-3-mini');
      expect(adapter.getCurrentModel()).toBe('grok-3-mini');
    });
  });

  describe('Availability Check', () => {
    it('should return true when API key is set', async () => {
      // Mock successful listModels call
      jest.spyOn(adapter, 'listModels').mockResolvedValue([]);
      
      const available = await adapter.isAvailable();
      expect(available).toBe(true);
    });

    it('should return false when API key is not set', async () => {
      // Create adapter with mocked environment
      const originalKey = process.env.XAI_API_KEY;
      process.env.XAI_API_KEY = 'dummy-key'; // Set a dummy key to avoid constructor error
      
      const newAdapter = new GrokAdapter();
      
      // Override the API key to empty for the test
      (newAdapter as any).apiKey = '';
      
      const available = await newAdapter.isAvailable();
      expect(available).toBe(false);
      
      // Restore original key
      process.env.XAI_API_KEY = originalKey;
    });
  });
});