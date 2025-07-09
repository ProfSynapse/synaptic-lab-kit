/**
 * RAG Customer Support Experiment - Main Implementation
 * Orchestrates the full experiment workflow
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { OllamaEmbeddingProvider } from '../../embeddings/OllamaEmbeddingProvider';
import { OllamaAdapter } from '../../adapters/OllamaAdapter';
import { KnowledgeBase } from './KnowledgeBase';
import { RAGPipeline } from './RAGPipeline';
import { HybridEvaluator } from './HybridEvaluator';
import { PromptOptimizer } from './PromptOptimizer';
import { ReportGenerator } from '../../reporting/ReportGenerator';

export interface ExperimentConfig {
  mode: 'baseline' | 'optimize' | 'validate';
  model: string;
  outputDir: string;
  optimizationIterations?: number;
  targetScore?: number;
  populationSize?: number;
}

export interface ExperimentResults {
  config: ExperimentConfig;
  startTime: string;
  endTime: string;
  duration: number;
  knowledgeBaseStats: any;
  ragResults: any[];
  evaluationResults: any[];
  performanceMetrics: any;
  retrievalAnalysis: any;
}

export class RAGExperiment {
  private embeddings: OllamaEmbeddingProvider;
  private llm: OllamaAdapter;
  private knowledgeBase: KnowledgeBase;
  private ragPipeline: RAGPipeline;
  private evaluator: HybridEvaluator;
  private reportGenerator: ReportGenerator;
  private config: ExperimentConfig;

  constructor(config: ExperimentConfig) {
    this.config = config;
    this.initializeComponents();
  }

  private initializeComponents(): void {
    // Initialize embedding provider
    this.embeddings = new OllamaEmbeddingProvider({
      model: 'nomic-embed-text:latest',
      baseURL: 'http://localhost:11434'
    });

    // Initialize LLM adapter
    this.llm = new OllamaAdapter({
      model: this.config.model,
      baseUrl: 'http://localhost:11434'
    });

    // Initialize knowledge base
    this.knowledgeBase = new KnowledgeBase(this.embeddings);

    // Initialize RAG pipeline
    this.ragPipeline = new RAGPipeline(
      this.embeddings,
      this.llm,
      this.knowledgeBase,
      {
        llmModel: this.config.model,
        retrievalTopK: this.config.mode === 'quick' ? 2 : 3,
        retrievalThreshold: 0.3,
        temperature: 0.1
      }
    );

    // Initialize hybrid evaluator
    this.evaluator = new HybridEvaluator(
      this.llm,
      this.knowledgeBase,
      {
        chunkWeight: 0.4,
        responseWeight: 0.6,
        passingThreshold: 0.7
      }
    );

    // Initialize report generator
    this.reportGenerator = new ReportGenerator();
  }

  /**
   * Run baseline performance test
   */
  async runBaseline(): Promise<ExperimentResults> {
    console.log('📊 Running baseline performance test...');
    return this.runExperiment();
  }

  /**
   * Run prompt optimization
   */
  async runOptimization(): Promise<ExperimentResults> {
    console.log('🎯 Running prompt optimization...');
    
    // Ensure output directory exists
    await fs.mkdir(this.config.outputDir, { recursive: true });
    console.log(`📁 Output directory created: ${this.config.outputDir}\n`);
    
    // First run baseline
    const baselineResults = await this.runExperiment();
    
    // Then run optimization
    const optimizer = new PromptOptimizer(
      this.ragPipeline,
      this.evaluator,
      this.knowledgeBase,
      this.llm,
      {
        maxIterations: this.config.optimizationIterations || 10,
        targetScore: this.config.targetScore || 0.85,
        populationSize: this.config.populationSize || 5
      }
    );
    
    const optimizationResults = await optimizer.optimize();
    
    // Generate optimization report
    const optimizationReport = optimizer.generateOptimizationReport(optimizationResults.optimizationHistory);
    
    // Save optimization report
    await fs.writeFile(
      path.join(this.config.outputDir, 'optimization-report.md'),
      optimizationReport
    );
    
    console.log(`🎉 Optimization completed! Improved from baseline to ${optimizationResults.bestScore.toFixed(3)}`);
    
    return baselineResults;
  }

  /**
   * Run validation with optimized prompts
   */
  async runValidation(): Promise<ExperimentResults> {
    console.log('✅ Running validation with optimized prompts...');
    return this.runExperiment();
  }

  /**
   * Run the complete experiment
   */
  async runExperiment(): Promise<ExperimentResults> {
    const startTime = new Date().toISOString();
    const startTimestamp = Date.now();
    
    console.log(`🧪 Starting RAG Customer Support Experiment`);
    console.log(`📊 Mode: ${this.config.mode}`);
    console.log(`🤖 Model: ${this.config.model}`);
    console.log(`⏰ Started at: ${startTime}\n`);

    try {
      // Ensure output directory exists
      await fs.mkdir(this.config.outputDir, { recursive: true });
      console.log(`📁 Output directory created: ${this.config.outputDir}\n`);
      // Step 1: Setup knowledge base
      await this.setupKnowledgeBase();

      // Step 2: Select test cases
      const testCases = this.selectTestCases();
      console.log(`📋 Selected ${testCases.length} test cases\n`);

      // Step 3: Run RAG pipeline
      console.log('🔄 Running RAG pipeline...');
      const ragResults = await this.ragPipeline.processTestCases(testCases);
      console.log(`✅ Processed ${ragResults.length} queries\n`);

      // Step 4: Evaluate results
      console.log('📊 Evaluating results with hybrid approach...');
      const evaluationResults = await this.evaluator.evaluateBatch(
        testCases,
        ragResults.map(r => r.result)
      );
      console.log(`✅ Completed ${evaluationResults.length} evaluations\n`);

      // Step 5: Generate analysis
      const performanceMetrics = this.generatePerformanceMetrics(ragResults);
      const retrievalAnalysis = this.ragPipeline.analyzeRetrievalPatterns(
        ragResults.map(r => r.result)
      );
      const evaluationReport = this.evaluator.generateEvaluationReport(evaluationResults);

      // Step 6: Generate reports
      await this.generateReports(ragResults, evaluationResults, evaluationReport);

      const endTime = new Date().toISOString();
      const duration = Date.now() - startTimestamp;

      console.log(`🎉 Experiment completed successfully!`);
      console.log(`⏱️  Total duration: ${(duration / 1000).toFixed(1)}s`);
      console.log(`📊 Pass rate: ${(evaluationReport.summary.passRate * 100).toFixed(1)}%`);
      console.log(`🎯 Average score: ${evaluationReport.summary.avgCombinedScore.toFixed(3)}`);
      console.log(`📂 Reports saved to: ${this.config.outputDir}\n`);

      return {
        config: this.config,
        startTime,
        endTime,
        duration,
        knowledgeBaseStats: this.knowledgeBase.getStatistics(),
        ragResults: ragResults.map(r => ({
          testCase: r.testCase,
          result: r.result,
          retrievalAccuracy: r.retrievalAccuracy
        })),
        evaluationResults,
        performanceMetrics,
        retrievalAnalysis
      };

    } catch (error) {
      console.error('❌ Experiment failed:', error);
      throw error;
    } finally {
      this.cleanup();
    }
  }

  /**
   * Run quick analysis mode
   */
  async runAnalysis(): Promise<void> {
    console.log('🔍 Running retrieval analysis...');
    
    await this.setupKnowledgeBase();
    
    const testCases = this.selectTestCases();
    const analysisQueries = [
      'How do I reset my password?',
      'What payment methods do you accept?',
      'I need help with software installation',
      'How to update my account information?',
      'What are your support hours?'
    ];

    console.log('\n📊 Analyzing retrieval patterns...');
    
    for (const query of analysisQueries) {
      const results = await this.knowledgeBase.searchChunks(query, 5, 0.2);
      
      console.log(`\n🔍 Query: "${query}"`);
      console.log('📋 Top retrievals:');
      results.forEach((result, index) => {
        const score = (result.similarity * 100).toFixed(1);
        console.log(`   ${index + 1}. [${score}%] ${result.chunk.title} (Chunk ${result.chunk.id})`);
      });
    }

    console.log('\n📈 Knowledge base statistics:');
    const stats = this.knowledgeBase.getStatistics();
    console.log(`   Total chunks: ${stats.totalChunks}`);
    console.log(`   Categories: ${Object.keys(stats.chunksByCategory).join(', ')}`);
    console.log(`   Test cases: ${stats.totalTestCases}`);
    
    this.cleanup();
  }

  /**
   * Setup knowledge base with embeddings
   */
  private async setupKnowledgeBase(): Promise<void> {
    console.log('📚 Setting up knowledge base...');
    
    const stats = this.knowledgeBase.getStatistics();
    console.log(`   Loading ${stats.totalChunks} knowledge chunks`);
    
    await this.knowledgeBase.generateEmbeddings();
    console.log('✅ Knowledge base ready\n');
  }

  /**
   * Select test cases based on experiment mode
   */
  private selectTestCases() {
    let testCases = this.knowledgeBase.getAllTestCases();
    
    // Filter by category if specified
    if (this.config.categories && this.config.categories.length > 0) {
      testCases = testCases.filter(tc => this.config.categories!.includes(tc.category));
    }
    
    // Filter by difficulty if specified
    if (this.config.difficulty) {
      testCases = testCases.filter(tc => tc.difficulty === this.config.difficulty);
    }
    
    // Limit based on mode
    switch (this.config.mode) {
      case 'quick':
        testCases = testCases.slice(0, this.config.testCaseCount || 10);
        break;
      case 'full':
        testCases = testCases.slice(0, this.config.testCaseCount || 22);
        break;
      case 'optimize':
        // Use a focused set for optimization
        testCases = testCases.filter(tc => tc.difficulty !== 'easy').slice(0, 15);
        break;
      default:
        testCases = testCases.slice(0, 10);
    }
    
    return testCases;
  }

  /**
   * Generate performance metrics
   */
  private generatePerformanceMetrics(ragResults: any[]) {
    const totalQueries = ragResults.length;
    const avgRetrievalTime = ragResults.reduce((sum, r) => sum + r.result.retrievalTime, 0) / totalQueries;
    const avgGenerationTime = ragResults.reduce((sum, r) => sum + r.result.generationTime, 0) / totalQueries;
    const avgTotalTime = ragResults.reduce((sum, r) => sum + r.result.totalTime, 0) / totalQueries;
    const avgTokens = ragResults.reduce((sum, r) => sum + r.result.totalTokens, 0) / totalQueries;
    
    const retrievalAccuracies = ragResults.map(r => r.retrievalAccuracy.f1Score);
    const avgRetrievalAccuracy = retrievalAccuracies.reduce((sum, acc) => sum + acc, 0) / totalQueries;
    
    return {
      totalQueries,
      avgRetrievalTime,
      avgGenerationTime,
      avgTotalTime,
      avgTokens,
      avgRetrievalAccuracy,
      throughput: totalQueries / (avgTotalTime / 1000) // queries per second
    };
  }

  /**
   * Generate comprehensive reports
   */
  private async generateReports(ragResults: any[], evaluationResults: any[], evaluationReport: any): Promise<void> {
    // Ensure output directory exists
    await fs.mkdir(this.config.outputDir, { recursive: true });
    
    // Generate main evaluation report
    const mainReport = {
      experiment: {
        mode: this.config.mode,
        model: this.config.model,
        timestamp: new Date().toISOString()
      },
      summary: evaluationReport.summary,
      chunkAnalysis: evaluationReport.chunkAnalysis,
      responseAnalysis: evaluationReport.responseAnalysis,
      categoryPerformance: evaluationReport.categoryPerformance,
      difficultyPerformance: evaluationReport.difficultyPerformance,
      failures: evaluationReport.failures
    };
    
    await fs.writeFile(
      path.join(this.config.outputDir, 'evaluation-report.json'),
      JSON.stringify(mainReport, null, 2)
    );
    
    // Generate detailed results
    const detailedResults = ragResults.map((r, index) => ({
      testCase: r.testCase,
      ragResult: {
        query: r.result.query,
        retrievedChunks: r.result.retrievedChunks.map(chunk => ({
          id: chunk.chunk.id,
          title: chunk.chunk.title,
          similarity: chunk.similarity
        })),
        response: r.result.response,
        tokens: r.result.totalTokens,
        timings: {
          retrieval: r.result.retrievalTime,
          generation: r.result.generationTime,
          total: r.result.totalTime
        }
      },
      evaluation: evaluationResults[index]
    }));
    
    await fs.writeFile(
      path.join(this.config.outputDir, 'detailed-results.json'),
      JSON.stringify(detailedResults, null, 2)
    );
    
    // Generate CSV for analysis
    const csvRows = ragResults.map((r, index) => ({
      query: r.testCase.query,
      category: r.testCase.category,
      difficulty: r.testCase.difficulty,
      expected_chunks: r.testCase.expectedChunks.join(';'),
      retrieved_chunks: r.result.retrievedChunks.map(c => c.chunk.id).join(';'),
      retrieval_f1: r.retrievalAccuracy.f1Score,
      response_score: evaluationResults[index].responseEvaluation.overallScore,
      combined_score: evaluationResults[index].combinedScore,
      passed: evaluationResults[index].passed,
      retrieval_time: r.result.retrievalTime,
      generation_time: r.result.generationTime,
      total_tokens: r.result.totalTokens
    }));
    
    const csvContent = [
      Object.keys(csvRows[0]).join(','),
      ...csvRows.map(row => Object.values(row).map(v => `"${v}"`).join(','))
    ].join('\n');
    
    await fs.writeFile(
      path.join(this.config.outputDir, 'results-analysis.csv'),
      csvContent
    );
    
    // Generate markdown report
    const markdownReport = this.generateMarkdownReport(evaluationReport, ragResults);
    await fs.writeFile(
      path.join(this.config.outputDir, 'experiment-report.md'),
      markdownReport
    );
    
    console.log('📄 Generated reports:');
    console.log(`   • evaluation-report.json - Main evaluation results`);
    console.log(`   • detailed-results.json - Full test case details`);
    console.log(`   • results-analysis.csv - Data for analysis`);
    console.log(`   • experiment-report.md - Human-readable summary`);
  }

  /**
   * Generate markdown report
   */
  private generateMarkdownReport(evaluationReport: any, ragResults: any[]): string {
    const passRate = (evaluationReport.summary.passRate * 100).toFixed(1);
    const avgScore = evaluationReport.summary.avgCombinedScore.toFixed(3);
    
    return `# RAG Customer Support Experiment Report

## Experiment Configuration
- **Mode**: ${this.config.mode}
- **Model**: ${this.config.model}
- **Test Cases**: ${evaluationReport.summary.totalTests}
- **Generated**: ${new Date().toISOString()}

## Summary Results
- **Pass Rate**: ${passRate}%
- **Average Combined Score**: ${avgScore}
- **Passed**: ${evaluationReport.summary.passed}/${evaluationReport.summary.totalTests}
- **Failed**: ${evaluationReport.summary.failed}

## Retrieval Analysis
- **Average Precision**: ${evaluationReport.chunkAnalysis.avgPrecision.toFixed(3)}
- **Average Recall**: ${evaluationReport.chunkAnalysis.avgRecall.toFixed(3)}
- **Average F1 Score**: ${evaluationReport.chunkAnalysis.avgF1Score.toFixed(3)}
- **Exact Match Rate**: ${(evaluationReport.chunkAnalysis.exactMatchRate * 100).toFixed(1)}%

## Response Quality Analysis
- **Average Accuracy**: ${evaluationReport.responseAnalysis.avgAccuracy.toFixed(3)}
- **Average Helpfulness**: ${evaluationReport.responseAnalysis.avgHelpfulness.toFixed(3)}
- **Average Completeness**: ${evaluationReport.responseAnalysis.avgCompleteness.toFixed(3)}
- **Average Clarity**: ${evaluationReport.responseAnalysis.avgClarity.toFixed(3)}
- **Average Groundedness**: ${evaluationReport.responseAnalysis.avgGroundedness.toFixed(3)}

## Performance by Category
${Object.entries(evaluationReport.categoryPerformance).map(([category, perf]: [string, any]) => 
  `- **${category}**: ${(perf.passRate * 100).toFixed(1)}% pass rate, ${perf.avgScore.toFixed(3)} avg score`
).join('\n')}

## Performance by Difficulty
${Object.entries(evaluationReport.difficultyPerformance).map(([difficulty, perf]: [string, any]) => 
  `- **${difficulty}**: ${(perf.passRate * 100).toFixed(1)}% pass rate, ${perf.avgScore.toFixed(3)} avg score`
).join('\n')}

## Top Failures
${evaluationReport.failures.slice(0, 5).map((failure: any, index: number) => 
  `${index + 1}. **${failure.query}** (${failure.category}, ${failure.difficulty})
   - Combined Score: ${failure.combinedScore.toFixed(3)}
   - Issues: ${failure.issues.join(', ')}`
).join('\n\n')}

## Recommendations
${this.generateRecommendations(evaluationReport)}
`;
  }

  /**
   * Generate recommendations based on results
   */
  private generateRecommendations(evaluationReport: any): string {
    const recommendations: string[] = [];
    
    if (evaluationReport.summary.passRate < 0.8) {
      recommendations.push('- Overall performance needs improvement. Consider prompt optimization.');
    }
    
    if (evaluationReport.chunkAnalysis.avgRecall < 0.7) {
      recommendations.push('- Improve chunk retrieval by adjusting similarity thresholds or retrieval count.');
    }
    
    if (evaluationReport.responseAnalysis.avgGroundedness < 0.7) {
      recommendations.push('- Responses are not well grounded. Improve context injection prompts.');
    }
    
    const worstCategory = Object.entries(evaluationReport.categoryPerformance)
      .sort(([,a], [,b]) => (a as any).passRate - (b as any).passRate)[0];
    
    if (worstCategory && (worstCategory[1] as any).passRate < 0.6) {
      recommendations.push(`- Focus on improving ${worstCategory[0]} category performance.`);
    }
    
    if (recommendations.length === 0) {
      recommendations.push('- Performance is good! Consider testing with more challenging scenarios.');
    }
    
    return recommendations.join('\n');
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.embeddings) {
      this.embeddings.dispose();
    }
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] as 'quick' | 'full' | 'optimize' | 'analyze' || 'quick';
  const modelArg = args.find(arg => arg.startsWith('--model='));
  const model = modelArg ? modelArg.split('=')[1] : 'mistral-small:22b-instruct-2409-q6_K';
  
  const config: ExperimentConfig = {
    mode,
    model,
    outputDir: path.join(process.cwd(), 'outputs', `rag-customer-support-${Date.now()}`)
  };
  
  const experiment = new RAGExperiment(config);
  
  try {
    if (mode === 'analyze') {
      await experiment.runAnalysis();
    } else {
      await experiment.runExperiment();
    }
  } catch (error) {
    console.error('❌ Experiment failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}