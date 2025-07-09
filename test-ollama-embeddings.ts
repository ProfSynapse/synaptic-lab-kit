#!/usr/bin/env tsx

/**
 * Quick test script to verify Ollama embeddings work
 * Run with: npx tsx test-ollama-embeddings.ts
 */

import { OllamaEmbeddingProvider } from './embeddings/OllamaEmbeddingProvider';

async function testOllamaEmbeddings() {
  console.log('🧪 Testing Ollama Embeddings Provider...\n');
  
  const provider = new OllamaEmbeddingProvider({
    baseURL: 'http://localhost:11434',
    model: 'nomic-embed-text:latest'
  });

  try {
    // Test 1: Check if Ollama server is running
    console.log('1️⃣ Checking Ollama server availability...');
    const isAvailable = await provider.isAvailable();
    
    if (!isAvailable) {
      console.error('❌ Ollama server not available at http://localhost:11434');
      console.log('💡 Start Ollama server with: ollama serve');
      process.exit(1);
    }
    console.log('✅ Ollama server is running');

    // Test 2: Check if embedding model is available
    console.log('\n2️⃣ Checking embedding model availability...');
    const isModelAvailable = await provider.isModelAvailable();
    
    if (!isModelAvailable) {
      console.error('❌ nomic-embed-text model not found');
      console.log('💡 Pull the model with: ollama pull nomic-embed-text:latest');
      process.exit(1);
    }
    console.log('✅ nomic-embed-text model is available');

    // Test 3: Generate a simple embedding
    console.log('\n3️⃣ Generating embedding for test text...');
    const testText = 'Hello world, this is a test sentence for embedding generation.';
    
    const startTime = Date.now();
    const response = await provider.embed({ input: testText });
    const endTime = Date.now();
    
    console.log(`✅ Embedding generated in ${endTime - startTime}ms`);
    console.log(`📊 Embedding dimensions: ${response.dimensions}`);
    console.log(`🔢 Token count: ${response.usage.totalTokens}`);
    console.log(`📝 Model used: ${response.model}`);
    
    // Validate embedding properties
    const embedding = response.embeddings[0]!;
    console.log(`📏 Embedding length: ${embedding.length}`);
    console.log(`🎯 First 5 values: [${embedding.slice(0, 5).map(v => v.toFixed(3)).join(', ')}]`);
    
    // Test 4: Generate embeddings for multiple texts
    console.log('\n4️⃣ Testing batch embedding generation...');
    const texts = [
      'Customer service question about password reset',
      'Technical support for software installation',
      'Billing inquiry about monthly charges',
      'Account management and settings update'
    ];
    
    const batchStart = Date.now();
    const batchResponse = await provider.embedBatch({
      inputs: texts,
      batchSize: 2
    });
    const batchEnd = Date.now();
    
    console.log(`✅ Batch embedding completed in ${batchEnd - batchStart}ms`);
    console.log(`📊 Processed ${batchResponse.successful} texts successfully`);
    console.log(`❌ Failed: ${batchResponse.failed}`);

    // Test 5: Similarity calculation
    console.log('\n5️⃣ Testing similarity calculation...');
    const query = 'I need help resetting my password';
    const queryResponse = await provider.embed({ input: query });
    
    const similarities = batchResponse.embeddings.map((embedding, index) => ({
      text: texts[index]!,
      similarity: provider.cosineSimilarity(queryResponse.embeddings[0]!, embedding)
    }));
    
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    console.log(`🔍 Query: "${query}"`);
    console.log('📋 Similarity results:');
    similarities.forEach((result, index) => {
      console.log(`  ${index + 1}. [${result.similarity.toFixed(3)}] ${result.text}`);
    });
    
    // Test 6: Caching test
    console.log('\n6️⃣ Testing caching functionality...');
    const cacheTestText = 'This text will be cached for performance testing';
    
    // First call
    const cacheStart1 = Date.now();
    await provider.embed({ input: cacheTestText });
    const cacheTime1 = Date.now() - cacheStart1;
    
    // Second call (should be cached)
    const cacheStart2 = Date.now();
    await provider.embed({ input: cacheTestText });
    const cacheTime2 = Date.now() - cacheStart2;
    
    console.log(`⚡ First call: ${cacheTime1}ms`);
    console.log(`⚡ Second call: ${cacheTime2}ms (cached)`);
    console.log(`🚀 Speedup: ${(cacheTime1 / cacheTime2).toFixed(1)}x`);
    
    // Test 7: RAG workflow simulation
    console.log('\n7️⃣ Testing RAG workflow simulation...');
    const knowledgeBase = [
      {
        id: 'kb1',
        title: 'Password Reset Guide',
        content: 'To reset your password: 1) Visit login page 2) Click "Forgot Password" 3) Enter email 4) Check email for reset link 5) Create new password'
      },
      {
        id: 'kb2',
        title: 'Billing Support',
        content: 'For billing questions: Check account dashboard for invoices. Contact billing@company.com for disputes. Update payment methods in settings.'
      },
      {
        id: 'kb3',
        title: 'Technical Support',
        content: 'For technical issues: Check system requirements. Update software to latest version. Contact support@company.com for complex problems.'
      }
    ];
    
    // Generate embeddings for knowledge base
    const kbTexts = knowledgeBase.map(doc => `${doc.title}: ${doc.content}`);
    const kbEmbeddings = await provider.embedBatch({
      inputs: kbTexts,
      batchSize: 2
    });
    
    // Test query
    const customerQuery = 'I forgot my password and need to reset it';
    const customerQueryResponse = await provider.embed({ input: customerQuery });
    
    // Find most relevant document
    const relevantDocs = provider.findSimilar(
      customerQueryResponse.embeddings[0]!,
      kbEmbeddings.embeddings,
      2, // Top 2 results
      0.1 // Low threshold
    );
    
    console.log(`🔍 Customer query: "${customerQuery}"`);
    console.log('📋 Most relevant documents:');
    relevantDocs.forEach((result, index) => {
      const doc = knowledgeBase[result.index]!;
      console.log(`  ${index + 1}. [${result.similarity.toFixed(3)}] ${doc.title}`);
      console.log(`     Content: ${doc.content.substring(0, 80)}...`);
    });

    console.log('\n🎉 All tests completed successfully!');
    console.log('✅ Ollama embeddings are working correctly');
    console.log('🚀 Ready to build RAG customer support experiment');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  } finally {
    provider.dispose();
  }
}

// Run the test
if (require.main === module) {
  testOllamaEmbeddings().catch(console.error);
}