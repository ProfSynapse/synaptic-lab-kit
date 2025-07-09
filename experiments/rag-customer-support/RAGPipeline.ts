/**
 * RAG Pipeline for Customer Support
 * Implements retrieval-augmented generation with embedding-based search
 */

import { OllamaEmbeddingProvider } from '../../embeddings/OllamaEmbeddingProvider';
import { OllamaAdapter } from '../../adapters/OllamaAdapter';
import { KnowledgeBase, KnowledgeChunk, TestCase } from './KnowledgeBase';

export interface RAGConfig {
  embeddingModel: string;
  llmModel: string;
  retrievalTopK: number;
  retrievalThreshold: number;
  maxResponseTokens: number;
  temperature: number;
}

export interface RAGResult {
  query: string;
  retrievedChunks: Array<{
    chunk: KnowledgeChunk;
    similarity: number;
  }>;
  response: string;
  promptTokens: number;
  responseTokens: number;
  totalTokens: number;
  retrievalTime: number;
  generationTime: number;
  totalTime: number;
}

export interface RetrievalPrompts {
  queryEnhancement: string;
  contextFormatting: string;
  responseGeneration: string;
}

export class RAGPipeline {
  private embeddings: OllamaEmbeddingProvider;
  private llm: OllamaAdapter;
  private knowledgeBase: KnowledgeBase;
  private config: RAGConfig;
  private prompts: RetrievalPrompts;

  constructor(
    embeddings: OllamaEmbeddingProvider,
    llm: OllamaAdapter,
    knowledgeBase: KnowledgeBase,
    config: Partial<RAGConfig> = {}
  ) {
    this.embeddings = embeddings;
    this.llm = llm;
    this.knowledgeBase = knowledgeBase;
    
    this.config = {
      embeddingModel: 'nomic-embed-text:latest',
      llmModel: 'mistral-small:22b-instruct-2409-q6_K',
      retrievalTopK: 3,
      retrievalThreshold: 0.3,
      maxResponseTokens: 500,
      temperature: 0.1,
      ...config
    };
    
    this.prompts = {
      queryEnhancement: `You are a query enhancement specialist. Your job is to expand and clarify customer support queries to improve information retrieval.

Original query: "{query}"

Enhanced query (add relevant keywords, synonyms, and context):`,

      contextFormatting: `Format the retrieved information for optimal use in response generation:

Retrieved chunks:
{chunks}

Formatted context:`,

      responseGeneration: `You are a professional customer support agent. Provide helpful, accurate responses based on the provided context.

CONTEXT:
{context}

CUSTOMER QUERY: {query}

INSTRUCTIONS:
- Use ONLY the information provided in the context
- Be helpful, professional, and concise
- If the context doesn't contain enough information, say so
- Include specific steps or details when applicable
- Format your response clearly with bullet points or numbered lists when appropriate

RESPONSE:`
    };
  }

  /**
   * Process a customer query through the RAG pipeline
   */
  async processQuery(query: string): Promise<RAGResult> {
    const startTime = Date.now();
    
    // Step 1: Enhanced query processing (optional)
    const enhancedQuery = await this.enhanceQuery(query);
    
    // Step 2: Retrieve relevant chunks
    const retrievalStart = Date.now();
    const retrievedChunks = await this.retrieveChunks(enhancedQuery || query);
    const retrievalTime = Date.now() - retrievalStart;
    
    // Step 3: Generate response
    const generationStart = Date.now();
    const response = await this.generateResponse(query, retrievedChunks);
    const generationTime = Date.now() - generationStart;
    
    const totalTime = Date.now() - startTime;
    
    return {
      query,
      retrievedChunks,
      response: response.text,
      promptTokens: response.usage.promptTokens,
      responseTokens: response.usage.completionTokens,
      totalTokens: response.usage.totalTokens,
      retrievalTime,
      generationTime,
      totalTime
    };
  }

  /**
   * Process multiple queries in batch
   */
  async processBatch(queries: string[]): Promise<RAGResult[]> {
    const results: RAGResult[] = [];
    
    for (const query of queries) {
      try {
        const result = await this.processQuery(query);
        results.push(result);
        
        // Add small delay to avoid overwhelming the system
        await this.delay(100);
      } catch (error) {
        console.error(`Failed to process query: ${query}`, error);
        // Add placeholder result for failed queries
        results.push({
          query,
          retrievedChunks: [],
          response: 'Error processing query',
          promptTokens: 0,
          responseTokens: 0,
          totalTokens: 0,
          retrievalTime: 0,
          generationTime: 0,
          totalTime: 0
        });
      }
    }
    
    return results;
  }

  /**
   * Process test cases with expected chunk tracking
   */
  async processTestCases(testCases: TestCase[]): Promise<Array<{
    testCase: TestCase;
    result: RAGResult;
    retrievalAccuracy: {
      expectedChunks: number[];
      retrievedChunks: number[];
      correctlyRetrieved: number[];
      missedChunks: number[];
      unexpectedChunks: number[];
      precision: number;
      recall: number;
      f1Score: number;
    };
  }>> {
    const results = [];
    
    for (const testCase of testCases) {
      const result = await this.processQuery(testCase.query);
      
      // Calculate retrieval accuracy
      const retrievedChunkIds = result.retrievedChunks.map(r => r.chunk.id);
      const expectedChunks = testCase.expectedChunks;
      
      const correctlyRetrieved = expectedChunks.filter(id => retrievedChunkIds.includes(id));
      const missedChunks = expectedChunks.filter(id => !retrievedChunkIds.includes(id));
      const unexpectedChunks = retrievedChunkIds.filter(id => !expectedChunks.includes(id));
      
      const precision = retrievedChunkIds.length > 0 ? 
        correctlyRetrieved.length / retrievedChunkIds.length : 0;
      const recall = expectedChunks.length > 0 ? 
        correctlyRetrieved.length / expectedChunks.length : 0;
      const f1Score = (precision + recall) > 0 ? 
        2 * (precision * recall) / (precision + recall) : 0;
      
      results.push({
        testCase,
        result,
        retrievalAccuracy: {
          expectedChunks,
          retrievedChunks: retrievedChunkIds,
          correctlyRetrieved,
          missedChunks,
          unexpectedChunks,
          precision,
          recall,
          f1Score
        }
      });
      
      // Add delay between test cases
      await this.delay(100);
    }
    
    return results;
  }

  /**
   * Enhance query with additional context (optional step)
   */
  private async enhanceQuery(query: string): Promise<string | null> {
    try {
      const enhancementPrompt = this.prompts.queryEnhancement.replace('{query}', query);
      
      const response = await this.llm.generate(enhancementPrompt, {
        temperature: 0.3,
        maxTokens: 100
      });
      
      return response.text.trim();
    } catch (error) {
      console.warn('Query enhancement failed, using original query:', error);
      return null;
    }
  }

  /**
   * Retrieve relevant chunks using semantic search
   */
  private async retrieveChunks(query: string): Promise<Array<{
    chunk: KnowledgeChunk;
    similarity: number;
  }>> {
    return await this.knowledgeBase.searchChunks(
      query,
      this.config.retrievalTopK,
      this.config.retrievalThreshold
    );
  }

  /**
   * Generate response using retrieved context
   */
  private async generateResponse(
    query: string,
    retrievedChunks: Array<{chunk: KnowledgeChunk; similarity: number}>
  ) {
    // Format context from retrieved chunks
    const contextChunks = retrievedChunks.map((item, index) => 
      `[${index + 1}] ${item.chunk.title}: ${item.chunk.content}`
    ).join('\n\n');
    
    // Build the response generation prompt
    const responsePrompt = this.prompts.responseGeneration
      .replace('{context}', contextChunks)
      .replace('{query}', query);
    
    // Generate response
    return await this.llm.generate(responsePrompt, {
      temperature: this.config.temperature,
      maxTokens: this.config.maxResponseTokens
    });
  }

  /**
   * Update retrieval prompts for optimization
   */
  updatePrompts(newPrompts: Partial<RetrievalPrompts>): void {
    this.prompts = {
      ...this.prompts,
      ...newPrompts
    };
  }

  /**
   * Update pipeline configuration
   */
  updateConfig(newConfig: Partial<RAGConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): RAGConfig {
    return { ...this.config };
  }

  /**
   * Get current prompts
   */
  getPrompts(): RetrievalPrompts {
    return { ...this.prompts };
  }

  /**
   * Analyze retrieval patterns
   */
  analyzeRetrievalPatterns(results: RAGResult[]): {
    avgRetrievalTime: number;
    avgGenerationTime: number;
    avgSimilarityScore: number;
    chunkUtilization: Record<number, number>;
    categoryDistribution: Record<string, number>;
    queryLengthVsRetrievalTime: Array<{queryLength: number; retrievalTime: number}>;
  } {
    const chunkUtilization: Record<number, number> = {};
    const categoryDistribution: Record<string, number> = {};
    
    let totalRetrievalTime = 0;
    let totalGenerationTime = 0;
    let totalSimilarityScore = 0;
    let totalSimilarityCount = 0;
    
    const queryLengthVsRetrievalTime: Array<{queryLength: number; retrievalTime: number}> = [];
    
    for (const result of results) {
      totalRetrievalTime += result.retrievalTime;
      totalGenerationTime += result.generationTime;
      
      queryLengthVsRetrievalTime.push({
        queryLength: result.query.length,
        retrievalTime: result.retrievalTime
      });
      
      for (const retrieved of result.retrievedChunks) {
        // Track chunk utilization
        chunkUtilization[retrieved.chunk.id] = (chunkUtilization[retrieved.chunk.id] || 0) + 1;
        
        // Track category distribution
        categoryDistribution[retrieved.chunk.category] = 
          (categoryDistribution[retrieved.chunk.category] || 0) + 1;
        
        // Track similarity scores
        totalSimilarityScore += retrieved.similarity;
        totalSimilarityCount++;
      }
    }
    
    return {
      avgRetrievalTime: totalRetrievalTime / results.length,
      avgGenerationTime: totalGenerationTime / results.length,
      avgSimilarityScore: totalSimilarityCount > 0 ? totalSimilarityScore / totalSimilarityCount : 0,
      chunkUtilization,
      categoryDistribution,
      queryLengthVsRetrievalTime
    };
  }

  /**
   * Generate retrieval quality report
   */
  generateRetrievalReport(results: Array<{
    testCase: TestCase;
    result: RAGResult;
    retrievalAccuracy: any;
  }>): {
    overallAccuracy: {
      avgPrecision: number;
      avgRecall: number;
      avgF1Score: number;
    };
    byCategory: Record<string, {
      precision: number;
      recall: number;
      f1Score: number;
      count: number;
    }>;
    byDifficulty: Record<string, {
      precision: number;
      recall: number;
      f1Score: number;
      count: number;
    }>;
    commonFailures: Array<{
      query: string;
      expectedChunks: number[];
      retrievedChunks: number[];
      missedChunks: number[];
    }>;
  } {
    const overallMetrics = { precision: 0, recall: 0, f1Score: 0 };
    const categoryMetrics: Record<string, { precision: number; recall: number; f1Score: number; count: number }> = {};
    const difficultyMetrics: Record<string, { precision: number; recall: number; f1Score: number; count: number }> = {};
    const commonFailures: Array<{
      query: string;
      expectedChunks: number[];
      retrievedChunks: number[];
      missedChunks: number[];
    }> = [];
    
    for (const result of results) {
      const { testCase, retrievalAccuracy } = result;
      
      // Overall metrics
      overallMetrics.precision += retrievalAccuracy.precision;
      overallMetrics.recall += retrievalAccuracy.recall;
      overallMetrics.f1Score += retrievalAccuracy.f1Score;
      
      // Category metrics
      if (!categoryMetrics[testCase.category]) {
        categoryMetrics[testCase.category] = { precision: 0, recall: 0, f1Score: 0, count: 0 };
      }
      categoryMetrics[testCase.category].precision += retrievalAccuracy.precision;
      categoryMetrics[testCase.category].recall += retrievalAccuracy.recall;
      categoryMetrics[testCase.category].f1Score += retrievalAccuracy.f1Score;
      categoryMetrics[testCase.category].count++;
      
      // Difficulty metrics
      if (!difficultyMetrics[testCase.difficulty]) {
        difficultyMetrics[testCase.difficulty] = { precision: 0, recall: 0, f1Score: 0, count: 0 };
      }
      difficultyMetrics[testCase.difficulty].precision += retrievalAccuracy.precision;
      difficultyMetrics[testCase.difficulty].recall += retrievalAccuracy.recall;
      difficultyMetrics[testCase.difficulty].f1Score += retrievalAccuracy.f1Score;
      difficultyMetrics[testCase.difficulty].count++;
      
      // Track failures
      if (retrievalAccuracy.f1Score < 0.5 || retrievalAccuracy.missedChunks.length > 0) {
        commonFailures.push({
          query: testCase.query,
          expectedChunks: retrievalAccuracy.expectedChunks,
          retrievedChunks: retrievalAccuracy.retrievedChunks,
          missedChunks: retrievalAccuracy.missedChunks
        });
      }
    }
    
    const numResults = results.length;
    
    // Calculate averages
    const avgOverallMetrics = {
      avgPrecision: overallMetrics.precision / numResults,
      avgRecall: overallMetrics.recall / numResults,
      avgF1Score: overallMetrics.f1Score / numResults
    };
    
    // Calculate category averages
    const avgCategoryMetrics: Record<string, {
      precision: number;
      recall: number;
      f1Score: number;
      count: number;
    }> = {};
    
    for (const [category, metrics] of Object.entries(categoryMetrics)) {
      avgCategoryMetrics[category] = {
        precision: metrics.precision / metrics.count,
        recall: metrics.recall / metrics.count,
        f1Score: metrics.f1Score / metrics.count,
        count: metrics.count
      };
    }
    
    // Calculate difficulty averages
    const avgDifficultyMetrics: Record<string, {
      precision: number;
      recall: number;
      f1Score: number;
      count: number;
    }> = {};
    
    for (const [difficulty, metrics] of Object.entries(difficultyMetrics)) {
      avgDifficultyMetrics[difficulty] = {
        precision: metrics.precision / metrics.count,
        recall: metrics.recall / metrics.count,
        f1Score: metrics.f1Score / metrics.count,
        count: metrics.count
      };
    }
    
    return {
      overallAccuracy: avgOverallMetrics,
      byCategory: avgCategoryMetrics,
      byDifficulty: avgDifficultyMetrics,
      commonFailures: commonFailures.slice(0, 10) // Top 10 failures
    };
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}