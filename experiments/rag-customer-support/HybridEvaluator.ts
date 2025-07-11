/**
 * Hybrid Evaluator for RAG Customer Support
 * Combines concrete chunk retrieval testing with LLM-as-Judge response evaluation
 */

import { BaseAdapter } from '../../adapters/BaseAdapter';
import { KnowledgeBase, KnowledgeChunk, TestCase } from './KnowledgeBase';
import { RAGResult } from './RAGPipeline';

export interface ChunkEvaluationResult {
  expectedChunks: number[];
  retrievedChunks: number[];
  correctlyRetrieved: number[];
  missedChunks: number[];
  unexpectedChunks: number[];
  precision: number;
  recall: number;
  f1Score: number;
  exactMatch: boolean;
}

export interface ResponseEvaluationResult {
  accuracy: number;
  helpfulness: number;
  completeness: number;
  clarity: number;
  groundedness: number;
  overallScore: number;
  reasoning: string;
  feedback: string;
}

export interface HybridEvaluationResult {
  testCase: TestCase;
  ragResult: RAGResult;
  chunkEvaluation: ChunkEvaluationResult;
  responseEvaluation: ResponseEvaluationResult;
  combinedScore: number;
  passed: boolean;
}

export interface EvaluationCriteria {
  chunkWeight: number;
  responseWeight: number;
  passingThreshold: number;
  requireExactChunkMatch: boolean;
}

export class HybridEvaluator {
  private llmJudge: BaseAdapter;
  private knowledgeBase: KnowledgeBase;
  private criteria: EvaluationCriteria;

  constructor(
    llmJudge: BaseAdapter,
    knowledgeBase: KnowledgeBase,
    criteria: Partial<EvaluationCriteria> = {}
  ) {
    this.llmJudge = llmJudge;
    this.knowledgeBase = knowledgeBase;
    
    this.criteria = {
      chunkWeight: 0.4,
      responseWeight: 0.6,
      passingThreshold: 0.7,
      requireExactChunkMatch: false,
      ...criteria
    };
  }

  /**
   * Evaluate a single RAG result using hybrid approach
   */
  async evaluateResult(
    testCase: TestCase,
    ragResult: RAGResult
  ): Promise<HybridEvaluationResult> {
    // 1. Evaluate chunk retrieval (concrete)
    const chunkEvaluation = this.evaluateChunkRetrieval(testCase, ragResult);
    
    // 2. Evaluate response quality (LLM judge)
    const responseEvaluation = await this.evaluateResponseQuality(testCase, ragResult);
    
    // 3. Combine scores
    const combinedScore = (
      chunkEvaluation.f1Score * this.criteria.chunkWeight +
      responseEvaluation.overallScore * this.criteria.responseWeight
    );
    
    // 4. Determine if passed
    const passed = combinedScore >= this.criteria.passingThreshold &&
      (!this.criteria.requireExactChunkMatch || chunkEvaluation.exactMatch);
    
    return {
      testCase,
      ragResult,
      chunkEvaluation,
      responseEvaluation,
      combinedScore,
      passed
    };
  }

  /**
   * Evaluate multiple RAG results in batch
   */
  async evaluateBatch(
    testCases: TestCase[],
    ragResults: RAGResult[]
  ): Promise<HybridEvaluationResult[]> {
    if (testCases.length !== ragResults.length) {
      throw new Error('Test cases and RAG results must have same length');
    }
    
    const evaluations: HybridEvaluationResult[] = [];
    
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i]!;
      const ragResult = ragResults[i]!;
      
      try {
        const evaluation = await this.evaluateResult(testCase, ragResult);
        evaluations.push(evaluation);
        
        // Progress indicator
        if (i % 5 === 0) {
          console.log(`📊 Evaluation progress: ${i + 1}/${testCases.length}`);
        }
        
        // Small delay to avoid overwhelming the LLM
        await this.delay(200);
      } catch (error) {
        console.error(`Failed to evaluate test case: ${testCase.query}`, error);
        // Add failed evaluation result
        evaluations.push({
          testCase,
          ragResult,
          chunkEvaluation: {
            expectedChunks: testCase.expectedChunks,
            retrievedChunks: [],
            correctlyRetrieved: [],
            missedChunks: testCase.expectedChunks,
            unexpectedChunks: [],
            precision: 0,
            recall: 0,
            f1Score: 0,
            exactMatch: false
          },
          responseEvaluation: {
            accuracy: 0,
            helpfulness: 0,
            completeness: 0,
            clarity: 0,
            groundedness: 0,
            overallScore: 0,
            reasoning: 'Evaluation failed',
            feedback: 'Could not evaluate response'
          },
          combinedScore: 0,
          passed: false
        });
      }
    }
    
    return evaluations;
  }

  /**
   * Evaluate chunk retrieval accuracy (concrete evaluation)
   */
  private evaluateChunkRetrieval(
    testCase: TestCase,
    ragResult: RAGResult
  ): ChunkEvaluationResult {
    const expectedChunks = testCase.expectedChunks;
    const retrievedChunks = ragResult.retrievedChunks.map(r => r.chunk.id);
    
    const correctlyRetrieved = expectedChunks.filter(id => retrievedChunks.includes(id));
    const missedChunks = expectedChunks.filter(id => !retrievedChunks.includes(id));
    const unexpectedChunks = retrievedChunks.filter(id => !expectedChunks.includes(id));
    
    const precision = retrievedChunks.length > 0 ? 
      correctlyRetrieved.length / retrievedChunks.length : 0;
    const recall = expectedChunks.length > 0 ? 
      correctlyRetrieved.length / expectedChunks.length : 0;
    const f1Score = (precision + recall) > 0 ? 
      2 * (precision * recall) / (precision + recall) : 0;
    
    // Check for exact match (all expected chunks retrieved, no unexpected chunks)
    const exactMatch = correctlyRetrieved.length === expectedChunks.length && 
      unexpectedChunks.length === 0;
    
    return {
      expectedChunks,
      retrievedChunks,
      correctlyRetrieved,
      missedChunks,
      unexpectedChunks,
      precision,
      recall,
      f1Score,
      exactMatch
    };
  }

  /**
   * Evaluate response quality using LLM as Judge
   */
  private async evaluateResponseQuality(
    testCase: TestCase,
    ragResult: RAGResult
  ): Promise<ResponseEvaluationResult> {
    // Get the full reference documents for the expected chunks
    const referenceChunks = this.knowledgeBase.getChunksByIds(testCase.expectedChunks);
    const referenceContext = referenceChunks.map(chunk => 
      `${chunk.title}: ${chunk.content}`
    ).join('\n\n');
    
    // Build comprehensive evaluation prompt
    const evaluationPrompt = `You are an expert evaluator of customer support responses. Evaluate the AI assistant's response against the provided reference information and customer query.

CUSTOMER QUERY:
${testCase.query}

REFERENCE INFORMATION (Ground Truth):
${referenceContext}

AI ASSISTANT'S RESPONSE:
${ragResult.response}

EVALUATION CRITERIA:
Rate each aspect from 0.0 to 1.0:

1. ACCURACY: How factually correct is the response based on the reference information?
2. HELPFULNESS: How well does the response address the customer's needs?
3. COMPLETENESS: Does the response cover all important aspects of the query?
4. CLARITY: How clear and easy to understand is the response?
5. GROUNDEDNESS: How well does the response stick to the provided information without hallucinating?

RESPONSE FORMAT:
Provide your evaluation as a JSON object with the following structure:
{
  "accuracy": 0.0-1.0,
  "helpfulness": 0.0-1.0,
  "completeness": 0.0-1.0,
  "clarity": 0.0-1.0,
  "groundedness": 0.0-1.0,
  "reasoning": "Brief explanation of your evaluation",
  "feedback": "Specific feedback for improvement"
}

EVALUATION:`;

    try {
      const judgeResponse = await this.llmJudge.generate(evaluationPrompt, {
        temperature: 0.1,
        maxTokens: 600
      });
      
      // Parse the JSON response
      const evaluation = this.parseEvaluationResponse(judgeResponse.text);
      
      // Calculate overall score
      const overallScore = (
        evaluation.accuracy * 0.25 +
        evaluation.helpfulness * 0.25 +
        evaluation.completeness * 0.2 +
        evaluation.clarity * 0.15 +
        evaluation.groundedness * 0.15
      );
      
      return {
        ...evaluation,
        overallScore
      };
      
    } catch (error) {
      console.error('LLM judge evaluation failed:', error);
      
      // Return fallback evaluation
      return {
        accuracy: 0.5,
        helpfulness: 0.5,
        completeness: 0.5,
        clarity: 0.5,
        groundedness: 0.5,
        overallScore: 0.5,
        reasoning: 'Evaluation failed - using fallback scores',
        feedback: 'Could not evaluate response quality'
      };
    }
  }

  /**
   * Parse LLM evaluation response
   */
  private parseEvaluationResponse(responseText: string): {
    accuracy: number;
    helpfulness: number;
    completeness: number;
    clarity: number;
    groundedness: number;
    reasoning: string;
    feedback: string;
  } {
    try {
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate and normalize scores
      const normalizeScore = (score: any): number => {
        const num = typeof score === 'number' ? score : parseFloat(score);
        return isNaN(num) ? 0.5 : Math.max(0, Math.min(1, num));
      };
      
      return {
        accuracy: normalizeScore(parsed.accuracy),
        helpfulness: normalizeScore(parsed.helpfulness),
        completeness: normalizeScore(parsed.completeness),
        clarity: normalizeScore(parsed.clarity),
        groundedness: normalizeScore(parsed.groundedness),
        reasoning: parsed.reasoning || 'No reasoning provided',
        feedback: parsed.feedback || 'No feedback provided'
      };
      
    } catch (error) {
      console.warn('Failed to parse evaluation response:', error);
      
      // Fallback parsing - look for individual scores
      const accuracy = this.extractScore(responseText, 'accuracy') || 0.5;
      const helpfulness = this.extractScore(responseText, 'helpfulness') || 0.5;
      const completeness = this.extractScore(responseText, 'completeness') || 0.5;
      const clarity = this.extractScore(responseText, 'clarity') || 0.5;
      const groundedness = this.extractScore(responseText, 'groundedness') || 0.5;
      
      return {
        accuracy,
        helpfulness,
        completeness,
        clarity,
        groundedness,
        reasoning: 'Parsed from fallback extraction',
        feedback: 'Could not parse structured feedback'
      };
    }
  }

  /**
   * Extract score from text using regex
   */
  private extractScore(text: string, criterion: string): number | null {
    const pattern = new RegExp(`${criterion}[:\s]*([0-9.]+)`, 'i');
    const match = text.match(pattern);
    
    if (match && match[1]) {
      const score = parseFloat(match[1]);
      return isNaN(score) ? null : Math.max(0, Math.min(1, score));
    }
    
    return null;
  }

  /**
   * Generate comprehensive evaluation report
   */
  generateEvaluationReport(evaluations: HybridEvaluationResult[]): {
    summary: {
      totalTests: number;
      passed: number;
      failed: number;
      passRate: number;
      avgCombinedScore: number;
      avgChunkF1: number;
      avgResponseScore: number;
    };
    chunkAnalysis: {
      avgPrecision: number;
      avgRecall: number;
      avgF1Score: number;
      exactMatchRate: number;
      mostMissedChunks: Array<{chunkId: number; missCount: number}>;
    };
    responseAnalysis: {
      avgAccuracy: number;
      avgHelpfulness: number;
      avgCompleteness: number;
      avgClarity: number;
      avgGroundedness: number;
    };
    categoryPerformance: Record<string, {
      passRate: number;
      avgScore: number;
      count: number;
    }>;
    difficultyPerformance: Record<string, {
      passRate: number;
      avgScore: number;
      count: number;
    }>;
    failures: Array<{
      query: string;
      category: string;
      difficulty: string;
      combinedScore: number;
      chunkF1: number;
      responseScore: number;
      issues: string[];
    }>;
  } {
    const totalTests = evaluations.length;
    const passed = evaluations.filter(e => e.passed).length;
    const failed = totalTests - passed;
    
    // Calculate averages
    const avgCombinedScore = evaluations.reduce((sum, e) => sum + e.combinedScore, 0) / totalTests;
    const avgChunkF1 = evaluations.reduce((sum, e) => sum + e.chunkEvaluation.f1Score, 0) / totalTests;
    const avgResponseScore = evaluations.reduce((sum, e) => sum + e.responseEvaluation.overallScore, 0) / totalTests;
    
    // Chunk analysis
    const avgPrecision = evaluations.reduce((sum, e) => sum + e.chunkEvaluation.precision, 0) / totalTests;
    const avgRecall = evaluations.reduce((sum, e) => sum + e.chunkEvaluation.recall, 0) / totalTests;
    const avgF1Score = evaluations.reduce((sum, e) => sum + e.chunkEvaluation.f1Score, 0) / totalTests;
    const exactMatchRate = evaluations.filter(e => e.chunkEvaluation.exactMatch).length / totalTests;
    
    // Most missed chunks
    const chunkMissCount: Record<number, number> = {};
    evaluations.forEach(e => {
      e.chunkEvaluation.missedChunks.forEach(chunkId => {
        chunkMissCount[chunkId] = (chunkMissCount[chunkId] || 0) + 1;
      });
    });
    
    const mostMissedChunks = Object.entries(chunkMissCount)
      .map(([chunkId, count]) => ({ chunkId: parseInt(chunkId), missCount: count }))
      .sort((a, b) => b.missCount - a.missCount)
      .slice(0, 5);
    
    // Response analysis
    const avgAccuracy = evaluations.reduce((sum, e) => sum + e.responseEvaluation.accuracy, 0) / totalTests;
    const avgHelpfulness = evaluations.reduce((sum, e) => sum + e.responseEvaluation.helpfulness, 0) / totalTests;
    const avgCompleteness = evaluations.reduce((sum, e) => sum + e.responseEvaluation.completeness, 0) / totalTests;
    const avgClarity = evaluations.reduce((sum, e) => sum + e.responseEvaluation.clarity, 0) / totalTests;
    const avgGroundedness = evaluations.reduce((sum, e) => sum + e.responseEvaluation.groundedness, 0) / totalTests;
    
    // Category performance
    const categoryStats: Record<string, {passed: number; total: number; scoreSum: number}> = {};
    evaluations.forEach(e => {
      const category = e.testCase.category;
      if (!categoryStats[category]) {
        categoryStats[category] = { passed: 0, total: 0, scoreSum: 0 };
      }
      categoryStats[category].total++;
      categoryStats[category].scoreSum += e.combinedScore;
      if (e.passed) categoryStats[category].passed++;
    });
    
    const categoryPerformance: Record<string, {passRate: number; avgScore: number; count: number}> = {};
    Object.entries(categoryStats).forEach(([category, stats]) => {
      categoryPerformance[category] = {
        passRate: stats.passed / stats.total,
        avgScore: stats.scoreSum / stats.total,
        count: stats.total
      };
    });
    
    // Difficulty performance
    const difficultyStats: Record<string, {passed: number; total: number; scoreSum: number}> = {};
    evaluations.forEach(e => {
      const difficulty = e.testCase.difficulty;
      if (!difficultyStats[difficulty]) {
        difficultyStats[difficulty] = { passed: 0, total: 0, scoreSum: 0 };
      }
      difficultyStats[difficulty].total++;
      difficultyStats[difficulty].scoreSum += e.combinedScore;
      if (e.passed) difficultyStats[difficulty].passed++;
    });
    
    const difficultyPerformance: Record<string, {passRate: number; avgScore: number; count: number}> = {};
    Object.entries(difficultyStats).forEach(([difficulty, stats]) => {
      difficultyPerformance[difficulty] = {
        passRate: stats.passed / stats.total,
        avgScore: stats.scoreSum / stats.total,
        count: stats.total
      };
    });
    
    // Failure analysis
    const failures = evaluations
      .filter(e => !e.passed)
      .map(e => {
        const issues: string[] = [];
        
        if (e.chunkEvaluation.f1Score < 0.5) {
          issues.push('Poor chunk retrieval');
        }
        if (e.responseEvaluation.accuracy < 0.7) {
          issues.push('Low accuracy');
        }
        if (e.responseEvaluation.groundedness < 0.7) {
          issues.push('Not well grounded');
        }
        if (e.chunkEvaluation.missedChunks.length > 0) {
          issues.push(`Missed chunks: ${e.chunkEvaluation.missedChunks.join(', ')}`);
        }
        
        return {
          query: e.testCase.query,
          category: e.testCase.category,
          difficulty: e.testCase.difficulty,
          combinedScore: e.combinedScore,
          chunkF1: e.chunkEvaluation.f1Score,
          responseScore: e.responseEvaluation.overallScore,
          issues
        };
      })
      .sort((a, b) => a.combinedScore - b.combinedScore)
      .slice(0, 10);
    
    return {
      summary: {
        totalTests,
        passed,
        failed,
        passRate: passed / totalTests,
        avgCombinedScore,
        avgChunkF1,
        avgResponseScore
      },
      chunkAnalysis: {
        avgPrecision,
        avgRecall,
        avgF1Score,
        exactMatchRate,
        mostMissedChunks
      },
      responseAnalysis: {
        avgAccuracy,
        avgHelpfulness,
        avgCompleteness,
        avgClarity,
        avgGroundedness
      },
      categoryPerformance,
      difficultyPerformance,
      failures
    };
  }

  /**
   * Update evaluation criteria
   */
  updateCriteria(newCriteria: Partial<EvaluationCriteria>): void {
    this.criteria = {
      ...this.criteria,
      ...newCriteria
    };
  }

  /**
   * Get current evaluation criteria
   */
  getCriteria(): EvaluationCriteria {
    return { ...this.criteria };
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}