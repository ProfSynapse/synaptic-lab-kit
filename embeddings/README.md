# Embedding Providers

Unified embedding provider interfaces for semantic search, similarity calculations, and vector operations across multiple embedding services.

## 🎯 Purpose

The embedding providers enable semantic analysis and vector operations for:
- **Semantic similarity** evaluation in response testing
- **Vector database** operations for RAG testing
- **Content clustering** and topic discovery
- **Hybrid search** combining keywords and semantics
- **Training data** similarity analysis

## 🔌 Available Providers

### OpenAI Embeddings
**Models**: text-embedding-3-small, text-embedding-3-large  
**Best for**: General-purpose embeddings with good performance/cost balance
```typescript
import { OpenAIEmbeddingProvider } from './OpenAIEmbeddingProvider';

const provider = new OpenAIEmbeddingProvider({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'text-embedding-3-small', // 1536 dimensions, lower cost
  // model: 'text-embedding-3-large', // 3072 dimensions, higher quality
});

// Single embedding
const embedding = await provider.embed('How do I return a product?');
console.log(`Embedding dimensions: ${embedding.length}`);

// Batch embeddings
const texts = [
  'How to return products',
  'Payment methods accepted', 
  'Customer service hours'
];
const embeddings = await provider.embedBatch(texts);
```

### Voyage Embeddings
**Models**: voyage-3-large, voyage-3-lite  
**Best for**: 2025 performance leader, excellent retrieval quality
```typescript
import { VoyageEmbeddingProvider } from './VoyageEmbeddingProvider';

const provider = new VoyageEmbeddingProvider({
  apiKey: process.env.VOYAGE_API_KEY,
  model: 'voyage-3-large' // Best overall performance in 2025
});

// Voyage supports input types for optimization
const embedding = await provider.embed('Customer support documentation', {
  inputType: 'document' // 'document', 'query', or 'classification'
});

// Optimized for query/document pairs
const queryEmbedding = await provider.embed('How to return items?', {
  inputType: 'query'
});

const docEmbeddings = await provider.embedBatch([
  'Return policy document...',
  'Shipping policy document...'
], {
  inputType: 'document'
});
```

### Cohere Embeddings
**Models**: embed-english-v3.0, embed-multilingual-v3.0  
**Best for**: Multilingual support and compression options
```typescript
import { CohereEmbeddingProvider } from './CohereEmbeddingProvider';

const provider = new CohereEmbeddingProvider({
  apiKey: process.env.COHERE_API_KEY,
  model: 'embed-english-v3.0'
});

// Cohere supports compression and input types
const embedding = await provider.embed('Customer service query', {
  inputType: 'search_query',
  embeddingTypes: ['float'], // 'float', 'int8', 'uint8', 'binary', 'ubinary'
  truncate: 'END' // How to handle long texts
});

// Multilingual embeddings
const multilingualProvider = new CohereEmbeddingProvider({
  apiKey: process.env.COHERE_API_KEY,
  model: 'embed-multilingual-v3.0'
});

const multilingualEmbeddings = await multilingualProvider.embedBatch([
  'How do I return a product?', // English
  '¿Cómo devuelvo un producto?', // Spanish  
  'Comment puis-je retourner un produit?', // French
  'Wie kann ich ein Produkt zurückgeben?' // German
]);
```

### Google Embeddings
**Models**: text-embedding-004, text-embedding-005  
**Best for**: Integration with Google ecosystem and recent improvements
```typescript
import { GoogleEmbeddingProvider } from './GoogleEmbeddingProvider';

const provider = new GoogleEmbeddingProvider({
  apiKey: process.env.GOOGLE_API_KEY,
  model: 'text-embedding-004',
  projectId: process.env.GOOGLE_PROJECT_ID // Optional
});

// Google supports task type specification
const embedding = await provider.embed('Return policy documentation', {
  taskType: 'RETRIEVAL_DOCUMENT' // 'RETRIEVAL_QUERY', 'SEMANTIC_SIMILARITY', 'CLASSIFICATION'
});

// Optimized for different tasks
const queryEmbedding = await provider.embed('how to return items', {
  taskType: 'RETRIEVAL_QUERY'
});

const similarityEmbedding = await provider.embed('customer service', {
  taskType: 'SEMANTIC_SIMILARITY'
});
```

### Mistral Embeddings
**Models**: mistral-embed, codestral-embed  
**Best for**: Code embeddings and European data residency
```typescript
import { MistralEmbeddingProvider } from './MistralEmbeddingProvider';

// General embeddings
const provider = new MistralEmbeddingProvider({
  apiKey: process.env.MISTRAL_API_KEY,
  model: 'mistral-embed'
});

// Code-specific embeddings
const codeProvider = new MistralEmbeddingProvider({
  apiKey: process.env.MISTRAL_API_KEY,
  model: 'codestral-embed' // Optimized for code
});

const codeEmbedding = await codeProvider.embed(`
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}
`);

// Batch processing with progress tracking
const codeSnippets = loadCodeSnippets();
const embeddings = await codeProvider.embedBatch(codeSnippets, {
  batchSize: 50,
  onProgress: (completed, total) => {
    console.log(`Embedded ${completed}/${total} code snippets`);
  }
});
```

## 🛠️ Common Interface

All providers implement the same interface for easy swapping:

```typescript
interface BaseEmbeddingProvider {
  // Single embedding
  embed(text: string, options?: EmbeddingOptions): Promise<number[]>;
  
  // Batch embeddings
  embedBatch(texts: string[], options?: BatchEmbeddingOptions): Promise<number[][]>;
  
  // Calculate similarity between embeddings
  similarity(embedding1: number[], embedding2: number[]): number;
  
  // Get model information
  getModelInfo(): ModelInfo;
  
  // Health check
  healthCheck(): Promise<boolean>;
}
```

### Response Format
```typescript
interface EmbeddingResponse {
  embedding: number[];
  dimensions: number;
  model: string;
  tokens: number;
  cost: number;
  metadata: {
    provider: string;
    requestId?: string;
    inputType?: string;
    truncated?: boolean;
  };
}
```

## 🎮 Usage Patterns

### Provider Selection
```typescript
import { createEmbeddingProvider } from './embeddings';

// Auto-select best available provider
const provider = createEmbeddingProvider('auto');

// Specific provider for specific needs
const voyageProvider = createEmbeddingProvider('voyage'); // Best overall quality
const openaiProvider = createEmbeddingProvider('openai'); // Good balance
const cohereProvider = createEmbeddingProvider('cohere'); // Multilingual
const mistralProvider = createEmbeddingProvider('mistral'); // Code-focused
```

### Semantic Similarity Evaluation
```typescript
async function evaluateSemanticSimilarity(expected: string, actual: string) {
  const provider = createEmbeddingProvider('voyage');
  
  // Generate embeddings
  const [expectedEmbedding, actualEmbedding] = await provider.embedBatch([
    expected,
    actual
  ]);
  
  // Calculate similarity
  const similarity = provider.similarity(expectedEmbedding, actualEmbedding);
  
  return {
    similarity,
    passed: similarity > 0.8, // Threshold for "similar enough"
    explanation: similarity > 0.9 ? 'Very similar' :
                 similarity > 0.8 ? 'Similar' :
                 similarity > 0.6 ? 'Somewhat similar' : 'Not similar'
  };
}
```

### Batch Processing for Large Datasets
```typescript
async function processLargeDataset(documents: string[]) {
  const provider = createEmbeddingProvider('openai');
  
  // Process in batches with progress tracking
  const embeddings = await provider.embedBatch(documents, {
    batchSize: 100,        // Process 100 at a time
    maxConcurrency: 3,     // Max 3 concurrent requests
    retryAttempts: 3,      // Retry failed requests
    onProgress: (completed, total) => {
      console.log(`Progress: ${completed}/${total} (${(completed/total*100).toFixed(1)}%)`);
    },
    onError: (error, text, index) => {
      console.warn(`Failed to embed document ${index}: ${error.message}`);
    }
  });
  
  return embeddings;
}
```

### Cost Optimization
```typescript
// Choose provider based on volume and budget
function selectProviderByVolume(textCount: number, budget: number) {
  const costPerToken = {
    'openai-small': 0.00002,    // text-embedding-3-small
    'openai-large': 0.00013,    // text-embedding-3-large  
    'voyage': 0.00012,          // voyage-3-large
    'cohere': 0.0001,           // embed-english-v3.0
    'mistral': 0.0001,          // mistral-embed
    'google': 0.0001            // text-embedding-004
  };
  
  const estimatedTokens = textCount * 100; // Rough estimate
  
  for (const [provider, cost] of Object.entries(costPerToken)) {
    const estimatedCost = estimatedTokens * cost;
    if (estimatedCost <= budget) {
      return provider.split('-')[0]; // Return provider name
    }
  }
  
  return 'openai-small'; // Cheapest option
}
```

## 🔍 Semantic Analysis Features

### Content Clustering
```typescript
async function clusterContent(texts: string[], numClusters: number = 5) {
  const provider = createEmbeddingProvider('voyage');
  
  // Generate embeddings
  const embeddings = await provider.embedBatch(texts);
  
  // Simple k-means clustering
  const clusters = await kMeansClustering(embeddings, numClusters);
  
  // Analyze clusters
  const clusterAnalysis = clusters.map((cluster, index) => ({
    id: index,
    size: cluster.points.length,
    centroid: cluster.centroid,
    examples: cluster.points.slice(0, 3).map(point => texts[point.index]),
    averageSimilarity: calculateAverageIntraClusterSimilarity(cluster)
  }));
  
  return clusterAnalysis;
}
```

### Topic Discovery
```typescript
async function discoverTopics(documents: string[]) {
  const provider = createEmbeddingProvider('voyage');
  
  // Embed all documents
  const embeddings = await provider.embedBatch(documents);
  
  // Find most representative documents (highest average similarity to others)
  const representativeScores = embeddings.map((embedding, index) => {
    const similarities = embeddings.map(otherEmbedding => 
      provider.similarity(embedding, otherEmbedding)
    );
    
    const averageSimilarity = similarities.reduce((sum, sim) => sum + sim, 0) / similarities.length;
    
    return {
      index,
      document: documents[index],
      averageSimilarity
    };
  });
  
  // Sort by representativeness
  representativeScores.sort((a, b) => b.averageSimilarity - a.averageSimilarity);
  
  return representativeScores.slice(0, 10); // Top 10 representative documents
}
```

### Similarity Search
```typescript
async function findSimilarContent(query: string, documents: string[], topK: number = 5) {
  const provider = createEmbeddingProvider('voyage');
  
  // Embed query and documents
  const [queryEmbedding, ...docEmbeddings] = await provider.embedBatch([query, ...documents]);
  
  // Calculate similarities
  const similarities = docEmbeddings.map((docEmbedding, index) => ({
    index,
    document: documents[index],
    similarity: provider.similarity(queryEmbedding, docEmbedding)
  }));
  
  // Sort by similarity and return top K
  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}
```

## 🔧 Provider-Specific Features

### Voyage Features
```typescript
// Voyage supports input type optimization
const voyageProvider = new VoyageEmbeddingProvider({
  apiKey: process.env.VOYAGE_API_KEY,
  model: 'voyage-3-large'
});

// Optimize for different use cases
const docEmbedding = await voyageProvider.embed(document, {
  inputType: 'document'
});

const queryEmbedding = await voyageProvider.embed(userQuery, {
  inputType: 'query'
});

// Better similarity scores when input types are specified correctly
const similarity = voyageProvider.similarity(queryEmbedding, docEmbedding);
```

### Cohere Features
```typescript
// Cohere supports compression for storage efficiency
const cohereProvider = new CohereEmbeddingProvider({
  apiKey: process.env.COHERE_API_KEY,
  model: 'embed-english-v3.0'
});

// Get compressed embeddings for storage
const compressedEmbedding = await cohereProvider.embed(text, {
  embeddingTypes: ['int8'] // 8x smaller than float32
});

// Multilingual clustering
const multilingualTexts = [
  'Customer service in English',
  'Servicio al cliente en español',
  'Service client en français'
];

const multiProvider = new CohereEmbeddingProvider({
  model: 'embed-multilingual-v3.0'
});

const multiEmbeddings = await multiProvider.embedBatch(multilingualTexts);
```

### Google Features
```typescript
// Google supports task-specific optimization
const googleProvider = new GoogleEmbeddingProvider({
  apiKey: process.env.GOOGLE_API_KEY,
  model: 'text-embedding-004'
});

// Optimized for different tasks
const retrievalDoc = await googleProvider.embed(document, {
  taskType: 'RETRIEVAL_DOCUMENT'
});

const retrievalQuery = await googleProvider.embed(query, {
  taskType: 'RETRIEVAL_QUERY'
});

const classification = await googleProvider.embed(text, {
  taskType: 'CLASSIFICATION'
});
```

## 🧪 Testing Integration

### Response Evaluation with Embeddings
```typescript
async function evaluateResponseSemantically(testConfig: any) {
  const provider = createEmbeddingProvider('voyage');
  
  for (const scenario of testConfig.scenarios) {
    // Generate response
    const response = await llmProvider.generate(scenario.userInput);
    
    // Evaluate semantic similarity
    const similarity = await evaluateSemanticSimilarity(
      scenario.expectedOutput,
      response.content
    );
    
    // Store evaluation result
    scenario.evaluation = {
      semanticSimilarity: similarity.similarity,
      passed: similarity.passed,
      explanation: similarity.explanation
    };
  }
  
  return testConfig;
}
```

### Vector Database Testing
```typescript
async function testVectorRetrieval(queries: string[], documents: string[]) {
  const provider = createEmbeddingProvider('voyage');
  
  // Embed documents
  const docEmbeddings = await provider.embedBatch(documents);
  
  // Test each query
  const results = [];
  for (const query of queries) {
    const queryEmbedding = await provider.embed(query);
    
    // Find most similar documents
    const similarities = docEmbeddings.map((docEmbedding, index) => ({
      index,
      document: documents[index],
      similarity: provider.similarity(queryEmbedding, docEmbedding)
    }));
    
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    results.push({
      query,
      topResults: similarities.slice(0, 5),
      averageSimilarity: similarities.slice(0, 5).reduce((sum, r) => sum + r.similarity, 0) / 5
    });
  }
  
  return results;
}
```

## 🎯 Best Practices

### 1. Provider Selection
- **Quality needs**: Voyage for best performance, OpenAI for balance
- **Volume considerations**: OpenAI small for high volume, large for quality
- **Multilingual**: Cohere for multilingual content
- **Code**: Mistral for code embeddings
- **Budget**: Compare costs for your expected volume

### 2. Performance Optimization
- **Batch processing**: Always use batch operations for multiple texts
- **Caching**: Cache embeddings to avoid recomputation
- **Chunking**: Split long documents into appropriate chunks
- **Parallel processing**: Use concurrent requests within rate limits

### 3. Quality Optimization
- **Input types**: Use provider-specific input type optimization
- **Text preprocessing**: Clean and normalize text before embedding
- **Similarity thresholds**: Calibrate thresholds for your use case
- **Evaluation**: Regularly evaluate embedding quality on your data

### 4. Cost Management
- **Monitor usage**: Track token consumption and costs
- **Choose appropriately**: Don't over-engineer with expensive models
- **Compression**: Use compressed embeddings when storage is a concern
- **Batch efficiently**: Optimize batch sizes for cost and performance

The embedding providers give you the semantic understanding capabilities needed to evaluate AI responses based on meaning rather than just keywords! 🔍✨