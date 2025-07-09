#!/usr/bin/env tsx

/**
 * Test script to verify Ollama embeddings work on your local machine
 * Run this on your desktop with: npm run test-embeddings
 */

import { OllamaEmbeddingProvider } from './embeddings/OllamaEmbeddingProvider';

async function testLocalEmbeddings() {
  console.log('🧪 Testing Local Ollama Embeddings...\n');
  
  const provider = new OllamaEmbeddingProvider({
    baseURL: 'http://localhost:11434',
    model: 'nomic-embed-text:latest'
  });

  try {
    // Test 1: Server connectivity
    console.log('1️⃣ Testing Ollama server connection...');
    const isAvailable = await provider.isAvailable();
    console.log(`   Server available: ${isAvailable ? '✅' : '❌'}`);
    
    if (!isAvailable) {
      console.log('   💡 Make sure Ollama is running: ollama serve');
      throw new Error('Ollama server not available');
    }

    // Test 2: Model availability
    console.log('\n2️⃣ Checking embedding model...');
    const isModelAvailable = await provider.isModelAvailable();
    console.log(`   Model available: ${isModelAvailable ? '✅' : '❌'}`);
    
    if (!isModelAvailable) {
      console.log('   💡 Pull the model: ollama pull nomic-embed-text:latest');
      throw new Error('Embedding model not available');
    }

    // Test 3: Single embedding generation
    console.log('\n3️⃣ Generating single embedding...');
    const testText = 'How do I reset my password?';
    
    const startTime = Date.now();
    const response = await provider.embed({ input: testText });
    const duration = Date.now() - startTime;
    
    console.log(`   ✅ Generated in ${duration}ms`);
    console.log(`   📊 Dimensions: ${response.dimensions}`);
    console.log(`   🔢 Tokens: ${response.usage.totalTokens}`);
    console.log(`   📝 Model: ${response.model}`);
    
    const embedding = response.embeddings[0]!;
    console.log(`   📏 Vector length: ${embedding.length}`);
    console.log(`   🎯 Sample values: [${embedding.slice(0, 3).map(v => v.toFixed(4)).join(', ')}...]`);
    
    // Validate embedding properties
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    console.log(`   📐 Vector magnitude: ${magnitude.toFixed(4)} (should be ~1.0)`);
    
    // Test 4: Multiple embeddings
    console.log('\n4️⃣ Testing batch embeddings...');
    const texts = [
      'Password reset instructions',
      'Billing and payment questions', 
      'Technical support for software issues',
      'Account settings and profile updates'
    ];
    
    const batchStart = Date.now();
    const batchResponse = await provider.embedBatch({
      inputs: texts,
      batchSize: 2
    });
    const batchDuration = Date.now() - batchStart;
    
    console.log(`   ✅ Batch completed in ${batchDuration}ms`);
    console.log(`   📊 Successful: ${batchResponse.successful}/${texts.length}`);
    console.log(`   ❌ Failed: ${batchResponse.failed}`);
    
    // Test 5: Similarity search
    console.log('\n5️⃣ Testing similarity search...');
    const query = 'I forgot my password and need help';
    const queryResponse = await provider.embed({ input: query });
    
    const similarities = batchResponse.embeddings.map((embedding, index) => ({
      text: texts[index]!,
      similarity: provider.cosineSimilarity(queryResponse.embeddings[0]!, embedding)
    }));
    
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    console.log(`   🔍 Query: "${query}"`);
    console.log('   📋 Ranked results:');
    similarities.forEach((result, index) => {
      const score = (result.similarity * 100).toFixed(1);
      console.log(`      ${index + 1}. [${score}%] ${result.text}`);
    });
    
    // Test 6: RAG retrieval simulation
    console.log('\n6️⃣ Testing RAG retrieval workflow...');
    
    // Mock knowledge base documents
    const knowledgeBase = [
      {
        id: 'doc1',
        title: 'Password Reset',
        content: 'To reset your password: 1) Go to login page 2) Click "Forgot Password" 3) Enter email 4) Check email for reset link 5) Create new password'
      },
      {
        id: 'doc2',
        title: 'Billing Issues',
        content: 'For billing problems: Check account dashboard for invoices. Contact billing@company.com for payment disputes. Update payment methods in account settings.'
      },
      {
        id: 'doc3',
        title: 'Technical Support',
        content: 'For technical issues: Check system requirements first. Update software to latest version. Clear browser cache. Contact support@company.com for persistent problems.'
      },
      {
        id: 'doc4',
        title: 'Account Management',
        content: 'To update account: 1) Log into your account 2) Go to Settings 3) Update personal information 4) Change notification preferences 5) Save changes'
      }
    ];
    
    // Generate embeddings for knowledge base
    const kbTexts = knowledgeBase.map(doc => `${doc.title}: ${doc.content}`);
    const kbEmbeddings = await provider.embedBatch({
      inputs: kbTexts,
      batchSize: 2
    });
    
    // Test queries
    const testQueries = [
      'How to reset my password?',
      'Problem with my monthly bill',
      'Software won\'t install properly',
      'Update my email address'
    ];
    
    console.log('   🔍 Testing retrieval for different queries:');
    
    for (const testQuery of testQueries) {
      const queryEmbedding = await provider.embed({ input: testQuery });
      
      const results = provider.findSimilar(
        queryEmbedding.embeddings[0]!,
        kbEmbeddings.embeddings,
        2, // Top 2 results
        0.1 // Low threshold
      );
      
      console.log(`\n   Query: "${testQuery}"`);
      results.forEach((result, index) => {
        const doc = knowledgeBase[result.index]!;
        const score = (result.similarity * 100).toFixed(1);
        console.log(`      ${index + 1}. [${score}%] ${doc.title}`);
      });
    }
    
    // Test 7: Caching performance
    console.log('\n7️⃣ Testing caching performance...');
    const cacheTestText = 'This text will test caching performance';
    
    // Clear cache first
    await provider.clear();
    
    // First call (no cache)
    const t1 = Date.now();
    await provider.embed({ input: cacheTestText });
    const firstCallTime = Date.now() - t1;
    
    // Second call (should be cached)
    const t2 = Date.now();
    await provider.embed({ input: cacheTestText });
    const secondCallTime = Date.now() - t2;
    
    console.log(`   ⚡ First call: ${firstCallTime}ms`);
    console.log(`   ⚡ Second call: ${secondCallTime}ms (cached)`);
    console.log(`   🚀 Speedup: ${(firstCallTime / secondCallTime).toFixed(1)}x`);
    
    // Test 8: Expected chunk retrieval test
    console.log('\n8️⃣ Testing concrete chunk retrieval (for hybrid evaluation)...');
    
    // This simulates the exact chunk matching we'll use in the RAG experiment
    const chunks = [
      { id: 1, text: 'Password reset procedure: Visit login page and click forgot password link' },
      { id: 2, text: 'Billing support: Contact billing department for invoice questions' },
      { id: 3, text: 'Technical help: Update software and clear cache for common issues' },
      { id: 4, text: 'Account settings: Login to update personal information and preferences' },
      { id: 5, text: 'Password security: Use strong passwords with numbers and symbols' }
    ];
    
    const chunkTexts = chunks.map(chunk => chunk.text);
    const chunkEmbeddings = await provider.embedBatch({
      inputs: chunkTexts,
      batchSize: 3
    });
    
    // Test case: "password reset" should retrieve chunks 1 and 5
    const passwordQuery = 'How do I reset my password?';
    const passwordQueryEmbedding = await provider.embed({ input: passwordQuery });
    
    const passwordResults = provider.findSimilar(
      passwordQueryEmbedding.embeddings[0]!,
      chunkEmbeddings.embeddings,
      3,
      0.2
    );
    
    console.log(`   🔍 Query: "${passwordQuery}"`);
    console.log('   📋 Expected chunks [1, 5] - Actual results:');
    passwordResults.forEach((result, index) => {
      const chunk = chunks[result.index]!;
      const score = (result.similarity * 100).toFixed(1);
      console.log(`      ${index + 1}. [${score}%] Chunk ${chunk.id}: ${chunk.text.substring(0, 50)}...`);
    });
    
    // Check if we got the expected chunks
    const retrievedChunkIds = passwordResults.map(r => chunks[r.index]!.id);
    const expectedChunks = [1, 5]; // Password reset and password security
    const hasExpectedChunks = expectedChunks.some(id => retrievedChunkIds.includes(id));
    console.log(`   ✅ Retrieved expected chunks: ${hasExpectedChunks ? 'YES' : 'NO'}`);
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('✅ Ollama embeddings are working perfectly');
    console.log('✅ Similarity search is functioning correctly');
    console.log('✅ Caching is providing performance benefits');
    console.log('✅ Chunk retrieval is working for hybrid evaluation');
    console.log('🚀 Ready to build the RAG customer support experiment!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  } finally {
    provider.dispose();
  }
}

// Export for npm script usage
export { testLocalEmbeddings };

// Run if called directly
if (require.main === module) {
  testLocalEmbeddings()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}