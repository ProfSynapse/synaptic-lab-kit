/**
 * Analysis Engine
 * Advanced analytics and insights generation for test results
 * Based on patterns from existing analytics services
 */

import {
  AnalysisResult,
  AnalysisType,
  ChartConfig,
  ComparisonResult,
  ComparisonConfig
} from './types';
import { TestExecution, TestResult } from '../core/types';

export class AnalysisEngine {
  /**
   * Analyze a test execution and generate insights
   */
  async analyzeExecution(execution: TestExecution): Promise<AnalysisResult[]> {
    const analyses: AnalysisResult[] = [];
    
    try {
      // Performance trend analysis
      analyses.push(await this.analyzePerformanceTrends(execution));
      
      // Quality metrics analysis
      analyses.push(await this.analyzeQualityMetrics(execution));
      
      // Error pattern analysis
      analyses.push(await this.analyzeErrorPatterns(execution));
      
      // Cost analysis
      analyses.push(await this.analyzeCostEfficiency(execution));
      
      // Provider comparison (if multiple providers used)
      if (this.hasMultipleProviders(execution)) {
        analyses.push(await this.analyzeProviderComparison(execution));
      }
      
      // Persona analysis (if personas were used)
      if (this.hasPersonaData(execution)) {
        analyses.push(await this.analyzePersonaPerformance(execution));
      }
      
      return analyses.filter(analysis => analysis.confidence > 0.3);
    } catch (error) {
      console.warn('Analysis generation failed:', error);
      return [];
    }
  }

  /**
   * Compare multiple test executions
   */
  async compareExecutions(config: ComparisonConfig, executions: Map<string, TestExecution>): Promise<ComparisonResult> {
    const baseline = executions.get(config.baseline);
    if (!baseline) {
      throw new Error(`Baseline execution ${config.baseline} not found`);
    }

    const comparisons = [];
    for (const id of config.comparisons) {
      const execution = executions.get(id);
      if (execution) {
        const comparison = await this.buildComparison(baseline, execution, config.metrics);
        comparisons.push(comparison);
      }
    }

    return {
      baseline: {
        id: baseline.id,
        name: baseline.configId,
        summary: baseline.summary
      },
      comparisons,
      overallInsights: this.generateComparisonInsights(baseline, comparisons)
    };
  }

  /**
   * Generate recommendations based on analysis
   */
  generateRecommendations(analyses: AnalysisResult[]): string[] {
    const recommendations = new Set<string>();

    for (const analysis of analyses) {
      analysis.recommendations.forEach(rec => recommendations.add(rec));
    }

    // Add meta-recommendations based on patterns
    if (analyses.some(a => a.type === 'cost_analysis' && a.data.highCost)) {
      recommendations.add('Consider optimizing prompts to reduce token usage and costs');
    }

    if (analyses.some(a => a.type === 'performance_trends' && a.data.degrading)) {
      recommendations.add('Performance appears to be degrading over time - investigate recent changes');
    }

    return Array.from(recommendations);
  }

  // Private analysis methods

  private async analyzePerformanceTrends(execution: TestExecution): Promise<AnalysisResult> {
    const results = execution.results.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    if (results.length < 3) {
      return this.createLowConfidenceResult('performance_trends', 'Insufficient data for trend analysis');
    }

    const scores = results.map(r => r.evaluation.overall);
    const latencies = results.map(r => r.response.latency);

    // Calculate trends
    const scoreSlope = this.calculateSlope(scores);
    const latencySlope = this.calculateSlope(latencies);

    const insights = [];
    const recommendations = [];

    if (scoreSlope > 0.01) {
      insights.push('Quality scores are improving over time');
    } else if (scoreSlope < -0.01) {
      insights.push('Quality scores are declining over time');
      recommendations.push('Review recent prompt changes or model performance');
    }

    if (latencySlope > 100) {
      insights.push('Response times are increasing');
      recommendations.push('Consider optimizing prompt length or switching to faster models');
    }

    return {
      type: 'performance_trends',
      title: 'Performance Trends Analysis',
      summary: `Analyzed trends across ${results.length} test results`,
      insights,
      recommendations,
      data: {
        scoreSlope,
        latencySlope,
        degrading: scoreSlope < -0.01 || latencySlope > 100
      },
      confidence: Math.min(results.length / 10, 1.0)
    };
  }

  private async analyzeQualityMetrics(execution: TestExecution): Promise<AnalysisResult> {
    const summary = execution.summary;
    if (!summary) {
      return this.createLowConfidenceResult('quality_metrics', 'No summary data available');
    }

    const insights = [];
    const recommendations = [];

    // Analyze overall accuracy
    if (summary.accuracy > 0.9) {
      insights.push('Excellent overall accuracy achieved');
    } else if (summary.accuracy > 0.7) {
      insights.push('Good accuracy with room for improvement');
      recommendations.push('Focus on edge cases that are causing failures');
    } else {
      insights.push('Accuracy below target threshold');
      recommendations.push('Review prompt engineering and test scenarios');
    }

    // Analyze criteria scores
    const criteriaEntries = Object.entries(summary.criteriaScores);
    if (criteriaEntries.length > 0) {
      const lowest = criteriaEntries.reduce((min, current) => 
        current[1] < min[1] ? current : min
      );
      
      if (lowest[1] < 0.6) {
        insights.push(`${lowest[0]} is the weakest performance area`);
        recommendations.push(`Focus improvement efforts on ${lowest[0]}`);
      }
    }

    // Analyze consistency
    const scores = execution.results.map(r => r.evaluation.overall);
    const variance = this.calculateVariance(scores);
    
    if (variance > 0.1) {
      insights.push('High variance in response quality detected');
      recommendations.push('Investigate inconsistent performance patterns');
    }

    return {
      type: 'quality_metrics',
      title: 'Quality Metrics Analysis',
      summary: `Overall accuracy: ${(summary.accuracy * 100).toFixed(1)}%`,
      insights,
      recommendations,
      data: {
        accuracy: summary.accuracy,
        variance,
        criteriaScores: summary.criteriaScores
      },
      confidence: 0.9
    };
  }

  private async analyzeErrorPatterns(execution: TestExecution): Promise<AnalysisResult> {
    const failures = execution.results.filter(r => !r.evaluation.passed);
    
    if (failures.length === 0) {
      return {
        type: 'error_patterns',
        title: 'Error Pattern Analysis',
        summary: 'No failures detected - excellent reliability',
        insights: ['Perfect success rate achieved'],
        recommendations: ['Maintain current approach'],
        data: { errorRate: 0 },
        confidence: 1.0
      };
    }

    const insights = [];
    const recommendations = [];

    const errorRate = failures.length / execution.results.length;
    
    if (errorRate > 0.2) {
      insights.push('High error rate detected');
      recommendations.push('Review test scenarios and prompt robustness');
    }

    // Analyze error clustering by scenario
    const errorsByScenario = failures.reduce((acc, failure) => {
      acc[failure.scenarioId] = (acc[failure.scenarioId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const problematicScenarios = Object.entries(errorsByScenario)
      .filter(([, count]) => count > 1)
      .map(([scenario]) => scenario);

    if (problematicScenarios.length > 0) {
      insights.push(`Consistent failures in scenarios: ${problematicScenarios.join(', ')}`);
      recommendations.push('Focus testing efforts on problematic scenarios');
    }

    return {
      type: 'error_patterns',
      title: 'Error Pattern Analysis',
      summary: `${failures.length} failures out of ${execution.results.length} tests (${(errorRate * 100).toFixed(1)}%)`,
      insights,
      recommendations,
      data: {
        errorRate,
        totalFailures: failures.length,
        errorsByScenario,
        problematicScenarios
      },
      confidence: 0.8
    };
  }

  private async analyzeCostEfficiency(execution: TestExecution): Promise<AnalysisResult> {
    const summary = execution.summary;
    if (!summary) {
      return this.createLowConfidenceResult('cost_analysis', 'No cost data available');
    }

    const insights = [];
    const recommendations = [];

    const costPerTest = summary.totalCost / summary.totalInputs;
    const tokensPerTest = summary.totalTokens / summary.totalInputs;

    // Cost thresholds (adjustable)
    const HIGH_COST_THRESHOLD = 0.10;
    const HIGH_TOKEN_THRESHOLD = 2000;

    if (costPerTest > HIGH_COST_THRESHOLD) {
      insights.push('High cost per test detected');
      recommendations.push('Consider prompt optimization to reduce token usage');
    }

    if (tokensPerTest > HIGH_TOKEN_THRESHOLD) {
      insights.push('High token usage per test');
      recommendations.push('Review prompt length and context size');
    }

    // Cost efficiency score
    const efficiencyScore = summary.accuracy / costPerTest;
    
    if (efficiencyScore > 10) {
      insights.push('Excellent cost efficiency achieved');
    } else if (efficiencyScore < 2) {
      insights.push('Cost efficiency below optimal range');
      recommendations.push('Balance accuracy improvements with cost management');
    }

    return {
      type: 'cost_analysis',
      title: 'Cost Efficiency Analysis',
      summary: `Total cost: $${summary.totalCost.toFixed(4)}, Efficiency score: ${efficiencyScore.toFixed(2)}`,
      insights,
      recommendations,
      data: {
        totalCost: summary.totalCost,
        costPerTest,
        tokensPerTest,
        efficiencyScore,
        highCost: costPerTest > HIGH_COST_THRESHOLD
      },
      confidence: 0.9
    };
  }

  private async analyzeProviderComparison(execution: TestExecution): Promise<AnalysisResult> {
    // Group results by provider (would need provider info in results)
    const insights = ['Multiple providers detected in results'];
    const recommendations = ['Compare provider performance for optimization'];

    return {
      type: 'provider_comparison',
      title: 'Provider Comparison Analysis',
      summary: 'Analysis of performance across different providers',
      insights,
      recommendations,
      data: {},
      confidence: 0.6
    };
  }

  private async analyzePersonaPerformance(execution: TestExecution): Promise<AnalysisResult> {
    const personaResults = execution.results.reduce((acc, result) => {
      const persona = result.personaId || 'default';
      if (!acc[persona]) acc[persona] = [];
      acc[persona].push(result);
      return acc;
    }, {} as Record<string, TestResult[]>);

    const insights = [];
    const recommendations = [];

    const personaScores = Object.entries(personaResults).map(([persona, results]) => ({
      persona,
      averageScore: results.reduce((sum, r) => sum + r.evaluation.overall, 0) / results.length,
      count: results.length
    }));

    const bestPersona = personaScores.reduce((best, current) => 
      current.averageScore > best.averageScore ? current : best
    );

    const worstPersona = personaScores.reduce((worst, current) => 
      current.averageScore < worst.averageScore ? current : worst
    );

    if (personaScores.length > 1) {
      insights.push(`${bestPersona.persona} persona performed best (${(bestPersona.averageScore * 100).toFixed(1)}%)`);
      insights.push(`${worstPersona.persona} persona performed worst (${(worstPersona.averageScore * 100).toFixed(1)}%)`);
      
      if (bestPersona.averageScore - worstPersona.averageScore > 0.2) {
        recommendations.push('Significant performance variance between personas - investigate prompt adaptation');
      }
    }

    return {
      type: 'persona_analysis',
      title: 'Persona Performance Analysis',
      summary: `Analyzed performance across ${personaScores.length} personas`,
      insights,
      recommendations,
      data: {
        personaScores,
        bestPersona: bestPersona.persona,
        worstPersona: worstPersona.persona
      },
      confidence: 0.8
    };
  }

  // Helper methods

  private hasMultipleProviders(execution: TestExecution): boolean {
    // Would check if results contain multiple providers
    return false;
  }

  private hasPersonaData(execution: TestExecution): boolean {
    return execution.results.some(r => r.personaId && r.personaId !== 'default');
  }

  private createLowConfidenceResult(type: AnalysisType, message: string): AnalysisResult {
    return {
      type,
      title: `${type.replace('_', ' ').toUpperCase()} Analysis`,
      summary: message,
      insights: [],
      recommendations: [],
      data: {},
      confidence: 0.1
    };
  }

  private calculateSlope(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + (i * val), 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;

    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }

  private calculateVariance(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private async buildComparison(
    baseline: TestExecution,
    comparison: TestExecution,
    metrics: string[]
  ): Promise<any> {
    const changes = [];
    
    if (baseline.summary && comparison.summary) {
      // Compare accuracy
      if (metrics.includes('accuracy')) {
        const baselineAccuracy = baseline.summary.accuracy;
        const currentAccuracy = comparison.summary.accuracy;
        const change = currentAccuracy - baselineAccuracy;
        
        changes.push({
          metric: 'accuracy',
          baseline: baselineAccuracy,
          current: currentAccuracy,
          change,
          changePercent: (change / baselineAccuracy) * 100,
          improvement: change > 0
        });
      }
      
      // Compare cost
      if (metrics.includes('cost')) {
        const baselineCost = baseline.summary.totalCost;
        const currentCost = comparison.summary.totalCost;
        const change = currentCost - baselineCost;
        
        changes.push({
          metric: 'cost',
          baseline: baselineCost,
          current: currentCost,
          change,
          changePercent: (change / baselineCost) * 100,
          improvement: change < 0 // Lower cost is better
        });
      }
    }

    return {
      id: comparison.id,
      name: comparison.configId,
      summary: comparison.summary,
      changes
    };
  }

  private generateComparisonInsights(baseline: TestExecution, comparisons: any[]): string[] {
    const insights = [];
    
    const improvementCount = comparisons.reduce((count, comp) => 
      count + comp.changes.filter((change: any) => change.improvement).length, 0
    );
    
    if (improvementCount > comparisons.length * 0.6) {
      insights.push('Most comparisons show improvement over baseline');
    } else if (improvementCount < comparisons.length * 0.3) {
      insights.push('Most comparisons show degradation from baseline');
    }
    
    return insights;
  }
}