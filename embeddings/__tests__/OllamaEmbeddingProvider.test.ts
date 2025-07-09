/**
 * Test suite for OllamaEmbeddingProvider
 * Tests embedding generation, retrieval, and similarity calculations
 */

import { OllamaEmbeddingProvider } from '../OllamaEmbeddingProvider';
import { EmbeddingRequest } from '../types';

// Mock fetch for testing
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('OllamaEmbeddingProvider', () => {
  let provider: OllamaEmbeddingProvider;
  
  beforeEach(() => {
    provider = new OllamaEmbeddingProvider({
      baseURL: 'http://localhost:11434',
      model: 'nomic-embed-text:latest'
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    provider.dispose();
  });

  describe('Constructor and Configuration', () => {
    it('should initialize with default config', () => {
      const defaultProvider = new OllamaEmbeddingProvider();
      expect(defaultProvider.getProviderName()).toBe('ollama');
    });

    it('should initialize with custom config', () => {
      const customProvider = new OllamaEmbeddingProvider({
        baseURL: 'http://custom:8080',
        model: 'custom-model',
        timeout: 60000
      });
      expect(customProvider.getProviderName()).toBe('ollama');
    });

    it('should not require API key', () => {
      // Should not throw error even without API key
      expect(() => new OllamaEmbeddingProvider()).not.toThrow();
    });
  });

  describe('Capabilities', () => {
    it('should return correct capabilities', () => {
      const capabilities = provider.getCapabilities();
      
      expect(capabilities.maxInputLength).toBe(8192);
      expect(capabilities.maxBatchSize).toBe(100);
      expect(capabilities.supportedDimensions).toEqual([768]);
      expect(capabilities.supportsBatching).toBe(true);
      expect(capabilities.supportsCustomDimensions).toBe(false);
      expect(capabilities.defaultModel).toBe('nomic-embed-text:latest');
      expect(capabilities.availableModels).toEqual(['nomic-embed-text:latest']);
    });
  });

  describe('Server Availability', () => {
    it('should check if Ollama server is available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ version: '0.1.0' })
      } as Response);

      const isAvailable = await provider.isAvailable();
      expect(isAvailable).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/version',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should return false when server is not available', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection failed'));

      const isAvailable = await provider.isAvailable();
      expect(isAvailable).toBe(false);
    });
  });

  describe('Model Management', () => {
    it('should check if model is available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            { name: 'nomic-embed-text:latest' },
            { name: 'other-model' }
          ]
        })
      } as Response);

      const isAvailable = await provider.isModelAvailable();
      expect(isAvailable).toBe(true);
    });

    it('should return false when model is not available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [{ name: 'other-model' }]
        })
      } as Response);

      const isAvailable = await provider.isModelAvailable();
      expect(isAvailable).toBe(false);
    });

    it('should pull model if not available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success' })
      } as Response);

      const pulled = await provider.pullModel('nomic-embed-text:latest');
      expect(pulled).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/pull',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'nomic-embed-text:latest' })
        })
      );
    });
  });

  describe('Embedding Generation', () => {
    const mockEmbedding = Array(768).fill(0).map(() => Math.random());

    it('should generate embedding for single input', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: mockEmbedding })
      } as Response);

      const request: EmbeddingRequest = {
        input: 'Hello world'
      };

      const response = await provider.embed(request);
      
      expect(response.embeddings).toHaveLength(1);
      expect(response.embeddings[0]).toEqual(mockEmbedding);
      expect(response.dimensions).toBe(768);
      expect(response.model).toBe('nomic-embed-text:latest');
      expect(response.usage.totalTokens).toBeGreaterThan(0);
    });

    it('should generate embeddings for multiple inputs', async () => {
      const embedding1 = Array(768).fill(0).map(() => Math.random());
      const embedding2 = Array(768).fill(0).map(() => Math.random());
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ embedding: embedding1 })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ embedding: embedding2 })
        } as Response);

      const request: EmbeddingRequest = {
        input: ['Hello world', 'Goodbye world']
      };

      const response = await provider.embed(request);
      
      expect(response.embeddings).toHaveLength(2);
      expect(response.embeddings[0]).toEqual(embedding1);
      expect(response.embeddings[1]).toEqual(embedding2);
      expect(response.dimensions).toBe(768);
    });

    it('should handle custom model in request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: mockEmbedding })
      } as Response);

      const request: EmbeddingRequest = {
        input: 'Test text',
        model: 'custom-model'
      };

      await provider.embed(request);
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/embeddings',
        expect.objectContaining({
          body: JSON.stringify({
            model: 'custom-model',
            prompt: 'Test text'
          })
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal server error'
      } as Response);

      const request: EmbeddingRequest = {
        input: 'Test text'
      };

      await expect(provider.embed(request)).rejects.toThrow();
    });

    it('should handle invalid embedding response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: null })
      } as Response);

      const request: EmbeddingRequest = {
        input: 'Test text'
      };

      await expect(provider.embed(request)).rejects.toThrow('Invalid embedding response');
    });
  });

  describe('Similarity Calculations', () => {
    it('should calculate cosine similarity correctly', () => {
      const embedding1 = [1, 0, 0];
      const embedding2 = [0, 1, 0];
      const embedding3 = [1, 0, 0];

      const similarity1 = provider.cosineSimilarity(embedding1, embedding2);
      const similarity2 = provider.cosineSimilarity(embedding1, embedding3);

      expect(similarity1).toBe(0); // Orthogonal vectors
      expect(similarity2).toBe(1); // Identical vectors
    });

    it('should find most similar embeddings', () => {
      const query = [1, 0, 0];
      const candidates = [
        [1, 0, 0],    // Identical (similarity: 1.0)
        [0, 1, 0],    // Orthogonal (similarity: 0.0)
        [0.5, 0.5, 0], // Partial match
        [-1, 0, 0]    // Opposite (similarity: -1.0)
      ];

      const results = provider.findSimilar(query, candidates, 3, 0.0);
      
      expect(results).toHaveLength(3);
      expect(results[0]!.similarity).toBe(1.0);
      expect(results[0]!.index).toBe(0);
      expect(results[1]!.index).toBe(2);
      expect(results[2]!.similarity).toBe(0.0);
    });

    it('should filter by similarity threshold', () => {
      const query = [1, 0, 0];
      const candidates = [
        [1, 0, 0],    // similarity: 1.0
        [0, 1, 0],    // similarity: 0.0
        [0.9, 0.1, 0] // similarity: ~0.9
      ];

      const results = provider.findSimilar(query, candidates, 10, 0.5);
      
      expect(results).toHaveLength(2); // Only similarities >= 0.5
      expect(results.every(r => r.similarity >= 0.5)).toBe(true);
    });
  });

  describe('Embedding Validation', () => {
    it('should validate correct embedding format', () => {
      const validEmbedding = [0.1, 0.2, 0.3, 0.4];
      expect(provider.validateEmbedding(validEmbedding)).toBe(true);
    });

    it('should reject invalid embedding formats', () => {
      expect(provider.validateEmbedding([])).toBe(false);
      expect(provider.validateEmbedding([1, 2, NaN])).toBe(false);
      expect(provider.validateEmbedding([1, 2, 'invalid'] as any)).toBe(false);
      expect(provider.validateEmbedding(null as any)).toBe(false);
    });
  });

  describe('Normalization', () => {
    it('should normalize embedding to unit vector', () => {
      const embedding = [3, 4, 0]; // Length = 5
      const normalized = provider.normalize(embedding);
      
      expect(normalized).toEqual([0.6, 0.8, 0]);
      
      // Check that length is approximately 1
      const length = Math.sqrt(normalized.reduce((sum, val) => sum + val * val, 0));
      expect(length).toBeCloseTo(1, 5);
    });

    it('should handle zero vector', () => {
      const embedding = [0, 0, 0];
      const normalized = provider.normalize(embedding);
      
      expect(normalized).toEqual([0, 0, 0]);
    });
  });

  describe('Caching', () => {
    it('should cache embedding results', async () => {
      const mockEmbedding = Array(768).fill(0).map(() => Math.random());
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ embedding: mockEmbedding })
      } as Response);

      const request: EmbeddingRequest = {
        input: 'Test caching'
      };

      // First call should hit the API
      const response1 = await provider.embed(request);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      // Second call should use cache
      const response2 = await provider.embed(request);
      expect(mockFetch).toHaveBeenCalledTimes(1); // No additional API calls
      
      expect(response1.embeddings[0]).toEqual(response2.embeddings[0]);
    });
  });

  describe('Batch Processing', () => {
    it('should process batch embeddings', async () => {
      const mockEmbeddings = [
        Array(768).fill(0).map(() => Math.random()),
        Array(768).fill(0).map(() => Math.random()),
        Array(768).fill(0).map(() => Math.random())
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ embedding: mockEmbeddings[0] })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ embedding: mockEmbeddings[1] })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ embedding: mockEmbeddings[2] })
        } as Response);

      const inputs = ['Text 1', 'Text 2', 'Text 3'];
      const batchResponse = await provider.embedBatch({
        inputs,
        batchSize: 2
      });

      expect(batchResponse.embeddings).toHaveLength(3);
      expect(batchResponse.successful).toBe(3);
      expect(batchResponse.failed).toBe(0);
      expect(batchResponse.errors).toHaveLength(0);
    });
  });

  describe('Token Counting', () => {
    it('should count tokens in text', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: Array(768).fill(0.1) })
      } as Response);

      const request: EmbeddingRequest = {
        input: 'This is a test sentence with multiple words.'
      };

      const response = await provider.embed(request);
      
      // Should be more accurate than simple character/4 estimation
      expect(response.usage.totalTokens).toBeGreaterThan(5);
      expect(response.usage.totalTokens).toBeLessThan(50);
    });
  });

  describe('Provider Test', () => {
    it('should pass basic functionality test', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: Array(768).fill(0.1) })
      } as Response);

      const testPassed = await provider.test('Hello world');
      expect(testPassed).toBe(true);
    });

    it('should fail test when API is unavailable', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API unavailable'));

      const testPassed = await provider.test('Hello world');
      expect(testPassed).toBe(false);
    });
  });
});