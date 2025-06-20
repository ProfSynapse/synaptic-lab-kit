/**
 * Test Runner
 * Core orchestrator for running test scenarios
 * Based on patterns from synthetic user framework
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { 
  TestConfig, 
  TestExecution, 
  TestResult, 
  TestSummary,
  TestProgress,
  StreamingUpdate
} from './types';
import { ResponseGenerator } from './ResponseGenerator';
import { ResponseEvaluator } from './ResponseEvaluator';
import { PersonaGenerator } from './PersonaGenerator';
import { DatabaseManager } from '../database';
import { createAdapter } from '../adapters';
import { createEmbeddingProvider } from '../embeddings';

export class TestRunner extends EventEmitter {
  private executions: Map<string, TestExecution> = new Map();
  private responseGenerator: ResponseGenerator;
  private responseEvaluator: ResponseEvaluator;
  private personaGenerator: PersonaGenerator;
  // private scenarioBuilder: ScenarioBuilder;
  private database?: DatabaseManager;

  constructor() {
    super();
    this.responseGenerator = new ResponseGenerator();
    this.responseEvaluator = new ResponseEvaluator();
    this.personaGenerator = new PersonaGenerator();
    // this.scenarioBuilder = new ScenarioBuilder();
  }

  /**
   * Initialize test runner with database if needed
   */
  async initialize(config?: { database?: any }): Promise<void> {
    try {
      if (config?.database) {
        this.database = new DatabaseManager(config.database);
        await this.database.initialize();
        console.log('✅ Test runner initialized with database support');
      } else {
        console.log('✅ Test runner initialized without database');
      }
    } catch (error) {
      console.error('Failed to initialize test runner:', error);
      throw error;
    }
  }

  /**
   * Start a new test execution
   */
  async startTest(config: TestConfig): Promise<string> {
    const executionId = uuidv4();
    
    try {
      // Validate configuration
      this.validateConfig(config);
      
      // Create execution record
      const execution: TestExecution = {
        id: executionId,
        configId: config.name,
        status: 'pending',
        startTime: new Date(),
        progress: {
          completed: 0,
          total: this.calculateTotalTests(config),
          errors: 0
        },
        results: [],
        metadata: {
          provider: config.provider,
          model: config.model || 'default',
          totalTokens: 0,
          totalCost: 0,
          environment: process.env.NODE_ENV || 'development'
        }
      };
      
      this.executions.set(executionId, execution);
      
      // Start execution asynchronously
      this.executeTest(execution, config).catch(error => {
        console.error(`Test execution ${executionId} failed:`, error);
        execution.status = 'failed';
        this.emit('error', { executionId, error });
      });
      
      return executionId;
    } catch (error) {
      const testError = new Error(`Failed to start test: ${(error as Error).message}`) as any;
      testError.code = 'TEST_START_FAILED';
      testError.category = 'execution';
      testError.details = { config };
      testError.recoverable = false;
      throw testError;
    }
  }

  /**
   * Execute the test configuration
   */
  private async executeTest(execution: TestExecution, config: TestConfig): Promise<void> {
    try {
      execution.status = 'running';
      this.emitUpdate(execution, 'progress', { status: 'started' });
      
      // Setup providers
      const llmAdapter = createAdapter(config.provider);
      const embeddingProvider = config.embeddingProvider ? 
        createEmbeddingProvider(config.embeddingProvider) : 
        undefined;
      
      // Configure response generator
      this.responseGenerator.configure({
        adapter: llmAdapter,
        ...(embeddingProvider && { embeddingProvider }),
        ...(config.model && { model: config.model }),
        ...(config.temperature !== undefined && { temperature: config.temperature }),
        maxRetries: config.maxRetries || 3,
        timeout: config.timeout || 30000
      });
      
      // Configure evaluator
      this.responseEvaluator.configure({
        criteria: config.evaluation.criteria,
        thresholds: config.evaluation.thresholds,
        ...(config.evaluation.customEvaluators && { customEvaluators: config.evaluation.customEvaluators })
      });
      
      // Generate personas if not provided
      const personas = config.personas || await this.generatePersonas(config);
      
      // Execute scenarios
      for (let i = 0; i < config.scenarios.length; i++) {
        const scenario = config.scenarios[i];
        if (scenario) {
          execution.progress.currentScenario = scenario.id;
          
          this.emitUpdate(execution, 'progress', {
            currentScenario: scenario.id,
            scenarioIndex: i,
            totalScenarios: config.scenarios.length
          });
          
          await this.executeScenario(execution, scenario, personas, config);
        }
      }
      
      // Complete execution
      execution.status = 'completed';
      execution.endTime = new Date();
      execution.summary = await this.generateSummary(execution);
      
      this.emitUpdate(execution, 'summary', execution.summary);
      
      console.log(`✅ Test execution ${execution.id} completed`);
    } catch (error) {
      execution.status = 'failed';
      execution.endTime = new Date();
      
      console.error(`❌ Test execution ${execution.id} failed:`, error);
      throw error;
    }
  }

  /**
   * Execute a single scenario with all personas
   */
  private async executeScenario(
    execution: TestExecution,
    scenario: any,
    personas: any[],
    config: TestConfig
  ): Promise<void> {
    const inputs = scenario.inputs || [{ id: 'default', prompt: scenario.userInput || scenario.description }];
    
    for (const input of inputs) {
      for (const persona of personas) {
        try {
          // Generate response
          const response = await this.responseGenerator.generate({
            prompt: input.prompt,
            context: scenario.context || input.context,
            persona,
            scenario,
            variables: input.variables,
            options: {
              ...(config.temperature !== undefined && { temperature: config.temperature }),
              maxTokens: 2000
            }
          });
          
          // Evaluate response
          const evaluation = await this.responseEvaluator.evaluate(
            input.prompt,
            response.content,
            scenario,
            persona
          );
          
          // Create result
          const result: TestResult = {
            id: uuidv4(),
            scenario,
            persona,
            request: input.prompt,
            response: response.content,
            evaluation: {
              overallScore: evaluation.overallScore,
              criteriaScores: evaluation.criteriaScores,
              passed: evaluation.passed,
              feedback: evaluation.feedback,
              specificIssues: evaluation.specificIssues || [],
              strengths: evaluation.strengths || [],
              suggestions: evaluation.suggestions || []
            },
            metadata: {
              model: response.metadata.model,
              provider: config.provider,
              usage: {
                promptTokens: 0,
                completionTokens: response.metadata.tokens,
                totalTokens: response.metadata.tokens
              },
              duration: response.metadata.latency,
              retries: 0
            },
            timestamp: new Date().toISOString()
          };
          
          execution.results.push(result);
          execution.progress.completed++;
          execution.metadata.totalTokens += response.metadata.tokens;
          execution.metadata.totalCost += response.metadata.cost;
          
          this.emitUpdate(execution, 'result', result);
          
        } catch (error) {
          execution.progress.errors++;
          
          const errorResult: TestResult = {
            id: uuidv4(),
            scenario,
            persona,
            request: input.prompt,
            response: '',
            evaluation: {
              overallScore: 0,
              criteriaScores: {},
              passed: false,
              feedback: 'Execution failed',
              specificIssues: [(error as Error).message],
              strengths: [],
              suggestions: []
            },
            metadata: {
              model: '',
              provider: config.provider,
              usage: {
                promptTokens: 0,
                completionTokens: 0,
                totalTokens: 0
              },
              duration: 0,
              retries: 0,
              error: (error as Error).message
            },
            timestamp: new Date().toISOString()
          };
          
          execution.results.push(errorResult);
          execution.progress.completed++;
          
          this.emitUpdate(execution, 'error', { result: errorResult, error });
          
          console.error(`Error in scenario ${scenario.id} with persona ${persona.id}:`, error);
        }
        
        // Small delay between requests
        await this.delay(100);
      }
    }
  }

  /**
   * Generate personas for the test
   */
  private async generatePersonas(config: TestConfig): Promise<any[]> {
    try {
      return await this.personaGenerator.generatePersonas({
        domain: config.name,
        count: 3, // Default persona count
        types: ['novice', 'expert', 'frustrated'],
        diversity: 'medium'
      });
    } catch (error) {
      console.warn('Failed to generate personas, using default:', error);
      return [{
        id: 'default',
        name: 'Default User',
        description: 'A typical user',
        background: 'General user background',
        preferences: {},
        behaviorPatterns: {
          decisionSpeed: 'thoughtful',
          riskTolerance: 'medium',
          detailLevel: 'moderate',
          communicationStyle: 'polite'
        }
      }];
    }
  }

  /**
   * Generate test summary
   */
  private async generateSummary(execution: TestExecution): Promise<TestSummary> {
    const results = execution.results;
    const passed = results.filter(r => r.evaluation.passed).length;
    const failed = results.length - passed;
    
    const criteriaScores: Record<string, number> = {};
    const allCriteria = new Set<string>();
    
    // Collect all criteria
    results.forEach(result => {
      Object.keys(result.evaluation.criteriaScores).forEach(criterion => {
        allCriteria.add(criterion);
      });
    });
    
    // Calculate average scores for each criterion
    allCriteria.forEach(criterion => {
      const scores = results
        .map(r => r.evaluation.criteriaScores[criterion])
        .filter(score => score !== undefined);
      
      criteriaScores[criterion] = scores.length > 0 ?
        scores.reduce((sum, score) => sum + score, 0) / scores.length :
        0;
    });
    
    const overallScores = results.map(r => r.evaluation.overallScore);
    const accuracy = overallScores.length > 0 ?
      overallScores.reduce((sum, score) => sum + score, 0) / overallScores.length :
      0;
    
    const latencies = results.map(r => r.metadata.duration).filter(l => l > 0);
    const averageLatency = latencies.length > 0 ?
      latencies.reduce((sum, latency) => sum + latency, 0) / latencies.length :
      0;
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    if (accuracy < 0.7) {
      recommendations.push('Consider improving prompt clarity or model selection');
    }
    
    if (averageLatency > 5000) {
      recommendations.push('Consider optimizing for faster response times');
    }
    
    if (execution.progress.errors > 0) {
      recommendations.push('Review and fix errors in test execution');
    }
    
    return {
      total: results.length,
      passed,
      failed,
      successRate: results.length > 0 ? passed / results.length : 0,
      averageScore: accuracy,
      criteriaBreakdown: criteriaScores,
      commonIssues: this.identifyWeaknesses(results),
      topPerformingScenarios: this.identifyStrengths(results),
      worstPerformingScenarios: this.identifyWeaknesses(results)
    };
  }

  /**
   * Get test execution status
   */
  getExecution(executionId: string): TestExecution | undefined {
    return this.executions.get(executionId);
  }

  /**
   * Get test progress
   */
  getProgress(executionId: string): TestProgress | undefined {
    const execution = this.executions.get(executionId);
    if (!execution) return undefined;
    
    const timeElapsed = Date.now() - execution.startTime.getTime();
    const estimatedTimeRemaining = execution.progress.completed > 0 ?
      (timeElapsed / execution.progress.completed) * (execution.progress.total - execution.progress.completed) :
      undefined;
    
    return {
      current: execution.progress.completed,
      total: execution.progress.total,
      ...(execution.progress.currentScenario && { currentScenario: execution.progress.currentScenario }),
      timeElapsed,
      ...(estimatedTimeRemaining !== undefined && { estimatedTimeRemaining }),
      completedTests: execution.results
    };
  }

  /**
   * Cancel test execution
   */
  async cancelTest(executionId: string): Promise<boolean> {
    const execution = this.executions.get(executionId);
    if (!execution || execution.status !== 'running') {
      return false;
    }
    
    execution.status = 'cancelled';
    execution.endTime = new Date();
    
    this.emitUpdate(execution, 'progress', { status: 'cancelled' });
    
    console.log(`🛑 Test execution ${executionId} cancelled`);
    return true;
  }

  // Private helper methods

  private validateConfig(config: TestConfig): void {
    if (!config.name) {
      throw new Error('Test name is required');
    }
    
    if (!config.provider) {
      throw new Error('Provider is required');
    }
    
    if (!config.scenarios || config.scenarios.length === 0) {
      throw new Error('At least one scenario is required');
    }
    
    if (!config.evaluation || !config.evaluation.criteria) {
      throw new Error('Evaluation criteria are required');
    }
  }

  private calculateTotalTests(config: TestConfig): number {
    const scenarioInputs = config.scenarios.reduce((total, scenario) => {
      return total + (scenario.inputs?.length || 1);
    }, 0);
    
    const personaCount = config.personas?.length || 3; // Default persona count
    return scenarioInputs * personaCount;
  }

  private emitUpdate(execution: TestExecution, type: string, data: any): void {
    const update: StreamingUpdate = {
      type: type as any,
      timestamp: new Date(),
      data,
      executionId: execution.id
    };
    
    this.emit('update', update);
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private identifyStrengths(results: TestResult[]): string[] {
    const strengths: string[] = [];
    
    const highScoreResults = results.filter(r => r.evaluation.overallScore > 0.8);
    if (highScoreResults.length > results.length * 0.6) {
      strengths.push('Consistently high-quality responses');
    }
    
    const fastResults = results.filter(r => r.metadata.duration < 2000);
    if (fastResults.length > results.length * 0.8) {
      strengths.push('Fast response times');
    }
    
    return strengths;
  }

  private identifyWeaknesses(results: TestResult[]): string[] {
    const weaknesses: string[] = [];
    
    const lowScoreResults = results.filter(r => r.evaluation.overallScore < 0.5);
    if (lowScoreResults.length > results.length * 0.3) {
      weaknesses.push('Low overall response quality');
    }
    
    const errorResults = results.filter(r => r.metadata.error);
    if (errorResults.length > 0) {
      weaknesses.push(`${errorResults.length} execution errors occurred`);
    }
    
    return weaknesses;
  }

  /*
  // Commented out unused method
  private identifyPatterns(results: TestResult[]): string[] {
    const patterns: string[] = [];
    
    // Group by scenario and check for consistent performance
    const scenarioGroups = results.reduce((groups, result) => {
      const key = result.scenario.id;
      if (!groups[key]) groups[key] = [];
      groups[key].push(result);
      return groups;
    }, {} as Record<string, TestResult[]>);
    
    Object.entries(scenarioGroups).forEach(([scenarioId, scenarioResults]) => {
      const avgScore = scenarioResults.reduce((sum, r) => sum + r.evaluation.overallScore, 0) / scenarioResults.length;
      
      if (avgScore > 0.9) {
        patterns.push(`Scenario ${scenarioId} consistently performs well`);
      } else if (avgScore < 0.5) {
        patterns.push(`Scenario ${scenarioId} consistently underperforms`);
      }
    });
    
    return patterns;
  }
  */
}
