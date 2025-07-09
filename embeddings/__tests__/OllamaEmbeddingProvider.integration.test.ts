/**
 * Integration tests for OllamaEmbeddingProvider
 * These tests require Ollama to be running with nomic-embed-text model
 */

import { OllamaEmbeddingProvider } from '../OllamaEmbeddingProvider';
import { EmbeddingRequest } from '../types';

describe('OllamaEmbeddingProvider Integration Tests', () => {
  let provider: OllamaEmbeddingProvider;
  
  beforeAll(async () => {
    provider = new OllamaEmbeddingProvider({
      baseURL: 'http://localhost:11434',
      model: 'nomic-embed-text:latest'
    });
  });

  afterAll(() => {
    provider.dispose();
  });

  describe('Basic Functionality', () => {
    it('should check if Ollama server is running', async () => {
      const isAvailable = await provider.isAvailable();
      
      if (!isAvailable) {
        console.warn('⚠️  Ollama server not running. Start with: ollama serve');
        console.warn('⚠️  Then pull the embedding model: ollama pull nomic-embed-text:latest');
      }
      
      expect(typeof isAvailable).toBe('boolean');
    }, 10000);

    it('should check if embedding model is available', async () => {
      const isAvailable = await provider.isAvailable();
      
      if (isAvailable) {
        const isModelAvailable = await provider.isModelAvailable();
        
        if (!isModelAvailable) {
          console.warn('⚠️  nomic-embed-text model not found. Pull with: ollama pull nomic-embed-text:latest');
        }
        
        expect(typeof isModelAvailable).toBe('boolean');
      } else {
        console.warn('⚠️  Skipping model check - Ollama server not available');
      }
    }, 15000);
  });

  describe('Embedding Generation', () => {
    it('should generate embeddings for simple text', async () => {
      const isAvailable = await provider.isAvailable();
      
      if (!isAvailable) {
        console.warn('⚠️  Skipping embedding test - Ollama server not available');
        return;
      }

      const request: EmbeddingRequest = {
        input: 'Hello world, this is a test sentence.'
      };

      const response = await provider.embed(request);
      
      expect(response.embeddings).toHaveLength(1);
      expect(response.embeddings[0]).toHaveLength(768); // nomic-embed-text dimensions
      expect(response.dimensions).toBe(768);
      expect(response.model).toBe('nomic-embed-text:latest');
      expect(response.usage.totalTokens).toBeGreaterThan(0);
      
      // Validate embedding is normalized (approximately unit vector)
      const embedding = response.embeddings[0]!;
      const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
      expect(magnitude).toBeCloseTo(1.0, 1); // Should be close to 1.0
    }, 30000);

    it('should generate different embeddings for different text', async () => {
      const isAvailable = await provider.isAvailable();
      
      if (!isAvailable) {
        console.warn('⚠️  Skipping embedding test - Ollama server not available');
        return;
      }

      const text1 = 'The weather is sunny today.';
      const text2 = 'How do I reset my password?';
      
      const [response1, response2] = await Promise.all([
        provider.embed({ input: text1 }),
        provider.embed({ input: text2 })
      ]);
      
      expect(response1.embeddings[0]).toHaveLength(768);
      expect(response2.embeddings[0]).toHaveLength(768);
      
      // Embeddings should be different
      const similarity = provider.cosineSimilarity(response1.embeddings[0]!, response2.embeddings[0]!);
      expect(similarity).toBeLessThan(0.9); // Should not be too similar
    }, 30000);

    it('should generate similar embeddings for similar text', async () => {
      const isAvailable = await provider.isAvailable();
      
      if (!isAvailable) {
        console.warn('⚠️  Skipping embedding test - Ollama server not available');
        return;
      }

      const text1 = 'How to reset my password?';
      const text2 = 'I need to reset my password.';
      
      const [response1, response2] = await Promise.all([
        provider.embed({ input: text1 }),
        provider.embed({ input: text2 })
      ]);
      
      const similarity = provider.cosineSimilarity(response1.embeddings[0]!, response2.embeddings[0]!);
      expect(similarity).toBeGreaterThan(0.5); // Should be reasonably similar
    }, 30000);

    it('should handle batch embedding generation', async () => {
      const isAvailable = await provider.isAvailable();
      
      if (!isAvailable) {
        console.warn('⚠️  Skipping batch embedding test - Ollama server not available');
        return;
      }

      const texts = [
        'Customer service inquiry',
        'Technical support question',
        'Billing and payment issue',
        'Product information request',
        'Account management help'
      ];

      const batchResponse = await provider.embedBatch({
        inputs: texts,
        batchSize: 2
      });

      expect(batchResponse.embeddings).toHaveLength(5);
      expect(batchResponse.successful).toBe(5);
      expect(batchResponse.failed).toBe(0);
      expect(batchResponse.errors).toHaveLength(0);
      
      // All embeddings should be valid
      batchResponse.embeddings.forEach(embedding => {
        expect(embedding).toHaveLength(768);
        expect(provider.validateEmbedding(embedding)).toBe(true);
      });
    }, 60000);
  });

  describe('Similarity and Retrieval', () => {
    it('should perform semantic similarity search', async () => {
      const isAvailable = await provider.isAvailable();
      
      if (!isAvailable) {
        console.warn('⚠️  Skipping similarity test - Ollama server not available');
        return;
      }

      // Create a knowledge base of customer support topics
      const knowledgeBase = [
        'To reset your password, go to the login page and click "Forgot Password".',
        'For billing issues, contact our billing department at billing@company.com.',
        'Our technical support team can help with software installation problems.',
        'To update your account information, log into your account settings.',
        'Product warranty information can be found in your user manual.'
      ];

      // Generate embeddings for knowledge base
      const kbEmbeddings = await provider.embedBatch({
        inputs: knowledgeBase,
        batchSize: 3
      });

      // Query for password reset
      const queryResponse = await provider.embed({
        input: 'I forgot my password and need to reset it'
      });

      // Find most similar documents
      const similarities = kbEmbeddings.embeddings.map((embedding, index) => ({
        index,
        text: knowledgeBase[index]!,
        similarity: provider.cosineSimilarity(queryResponse.embeddings[0]!, embedding)
      }));

      similarities.sort((a, b) => b.similarity - a.similarity);

      // The password reset document should be most similar
      expect(similarities[0]!.text).toContain('reset your password');
      expect(similarities[0]!.similarity).toBeGreaterThan(0.3);
      
      console.log('🔍 Similarity search results:');
      similarities.slice(0, 3).forEach((result, i) => {
        console.log(`  ${i + 1}. [${result.similarity.toFixed(3)}] ${result.text.substring(0, 50)}...`);
      });
    }, 60000);

    it('should demonstrate retrieval-augmented generation workflow', async () => {
      const isAvailable = await provider.isAvailable();
      
      if (!isAvailable) {
        console.warn('⚠️  Skipping RAG workflow test - Ollama server not available');
        return;
      }

      // Simulate a customer support knowledge base
      const documents = [
        {
          id: 'doc1',
          title: 'Password Reset',
          content: 'To reset your password: 1) Go to login page 2) Click "Forgot Password" 3) Enter your email 4) Check email for reset link 5) Create new password'
        },
        {
          id: 'doc2', 
          title: 'Billing Support',
          content: 'For billing questions: Check your account dashboard for invoices. Contact billing@company.com for disputes. Payment methods can be updated in settings.'
        },
        {
          id: 'doc3',
          title: 'Account Settings',
          content: 'Update your account: 1) Log into your account 2) Go to Settings 3) Update personal information 4) Change notification preferences 5) Save changes'
        }
      ];

      // Generate embeddings for documents
      const docTexts = documents.map(doc => `${doc.title}: ${doc.content}`);
      const docEmbeddings = await provider.embedBatch({
        inputs: docTexts,
        batchSize: 2
      });

      // Test query
      const customerQuery = 'I need to change my password';
      const queryResponse = await provider.embed({ input: customerQuery });

      // Find most relevant document
      const relevantDoc = provider.findSimilar(
        queryResponse.embeddings[0]!,
        docEmbeddings.embeddings,
        1, // Top 1 result
        0.1 // Low threshold
      );

      expect(relevantDoc).toHaveLength(1);
      expect(relevantDoc[0]!.index).toBe(0); // Should match password reset document
      expect(relevantDoc[0]!.similarity).toBeGreaterThan(0.2);

      const retrievedDoc = documents[relevantDoc[0]!.index]!;
      expect(retrievedDoc.title).toBe('Password Reset');
      
      console.log('📋 RAG Workflow Test Results:');
      console.log(`  Query: "${customerQuery}"`);
      console.log(`  Retrieved: "${retrievedDoc.title}"`);
      console.log(`  Similarity: ${relevantDoc[0]!.similarity.toFixed(3)}`);
      console.log(`  Content: ${retrievedDoc.content.substring(0, 100)}...`);
    }, 60000);
  });

  describe('Caching and Performance', () => {
    it('should cache embeddings for repeated queries', async () => {
      const isAvailable = await provider.isAvailable();
      
      if (!isAvailable) {
        console.warn('⚠️  Skipping caching test - Ollama server not available');
        return;
      }

      const testText = 'This is a test for caching functionality';
      
      // Clear cache first
      await provider.clear();
      
      // First call - should hit API
      const start1 = Date.now();
      const response1 = await provider.embed({ input: testText });
      const time1 = Date.now() - start1;
      
      // Second call - should use cache
      const start2 = Date.now();
      const response2 = await provider.embed({ input: testText });
      const time2 = Date.now() - start2;
      
      // Results should be identical
      expect(response1.embeddings[0]).toEqual(response2.embeddings[0]);
      
      // Second call should be much faster (cached)
      expect(time2).toBeLessThan(time1 * 0.5);
      
      console.log('⚡ Caching Performance:');
      console.log(`  First call: ${time1}ms`);
      console.log(`  Second call: ${time2}ms (cached)`);
      console.log(`  Speedup: ${(time1 / time2).toFixed(1)}x`);
    }, 60000);

    it('should provide accurate token counting', async () => {
      const isAvailable = await provider.isAvailable();
      
      if (!isAvailable) {
        console.warn('⚠️  Skipping token counting test - Ollama server not available');
        return;
      }

      const shortText = 'Hello world';
      const longText = 'This is a much longer text that contains many more words and should result in a higher token count when processed by the embedding model.';
      
      const [shortResponse, longResponse] = await Promise.all([
        provider.embed({ input: shortText }),
        provider.embed({ input: longText })
      ]);
      
      expect(shortResponse.usage.totalTokens).toBeGreaterThan(0);
      expect(longResponse.usage.totalTokens).toBeGreaterThan(shortResponse.usage.totalTokens);
      
      console.log('📊 Token Counting:');
      console.log(`  Short text (${shortText.length} chars): ${shortResponse.usage.totalTokens} tokens`);
      console.log(`  Long text (${longText.length} chars): ${longResponse.usage.totalTokens} tokens`);
    }, 30000);
  });
});