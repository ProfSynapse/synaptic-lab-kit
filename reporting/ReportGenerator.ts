/**
 * Report Generator
 * Creates comprehensive test reports in multiple formats
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import { join } from 'path';
import {
  ReportConfig,
  GeneratedReport,
  ReportProgress,
  ReportStage,
  AnalysisResult,
  ChartConfig,
  ReportError
} from './types';
import { TestExecution } from '../core/types';
import { ChatMLExporter } from './ChatMLExporter';
import { AnalysisEngine } from './AnalysisEngine';

export class ReportGenerator extends EventEmitter {
  private chatMLExporter: ChatMLExporter;
  private analysisEngine: AnalysisEngine;
  private isGenerating: boolean = false;

  constructor() {
    super();
    this.chatMLExporter = new ChatMLExporter();
    this.analysisEngine = new AnalysisEngine();
  }

  /**
   * Generate a comprehensive report
   */
  async generateReport(
    execution: TestExecution,
    config: ReportConfig
  ): Promise<GeneratedReport> {
    if (this.isGenerating) {
      throw new Error('Report generation already in progress');
    }

    this.isGenerating = true;
    const startTime = Date.now();

    try {
      console.log(`📊 Generating ${config.format} report...`);
      this.emitProgress('initializing', 0);

      // Analyze test data
      this.emitProgress('analyzing_data', 10);
      const analyses = await this.analysisEngine.analyzeExecution(execution);

      // Generate charts
      this.emitProgress('generating_charts', 30);
      const charts = await this.generateCharts(execution);

      // Render sections
      this.emitProgress('rendering_sections', 50);
      const sections = await this.renderSections(execution, analyses, charts, config);

      // Format output
      this.emitProgress('formatting_output', 80);
      const content = await this.formatOutput(sections, config);

      // Create output directory structure
      this.emitProgress('exporting', 85);
      const outputDir = await this.createOutputDirectory(execution, config);
      
      // Create exports
      this.emitProgress('exporting', 90);
      const exports = await this.createExports(execution, config, outputDir);

      const report: GeneratedReport = {
        id: `report_${execution.id}_${Date.now()}`,
        testExecutionId: execution.id,
        format: config.format,
        content,
        metadata: {
          generated: new Date(),
          size: this.calculateSize(content),
          sections: config.sections.filter(s => s.enabled).map(s => s.id),
          version: '1.0.0',
          generator: 'Synaptic Lab Kit',
          title: `Test Report: ${execution.configId}`,
          description: `Comprehensive analysis of test execution ${execution.id}`,
          outputPath: outputDir
        },
        exports
      };
      
      // Save main report file
      await this.saveReport(report, outputDir);

      this.emitProgress('completed', 100);
      const duration = Date.now() - startTime;
      console.log(`✅ Report generated in ${duration}ms`);

      return report;
    } catch (error) {
      this.emitError('formatting_output', (error as Error).message);
      throw error;
    } finally {
      this.isGenerating = false;
    }
  }

  /**
   * Generate charts for the report
   */
  private async generateCharts(
    execution: TestExecution
  ): Promise<ChartConfig[]> {
    const charts: ChartConfig[] = [];

    // Accuracy over time
    if (execution.results.length > 0) {
      charts.push({
        type: 'line',
        title: 'Response Quality Over Time',
        data: {
          labels: execution.results.map((_, i) => `Test ${i + 1}`),
          datasets: [{
            label: 'Overall Score',
            data: execution.results.map(r => r.evaluation.overallScore),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)'
          }]
        }
      });
    }

    // Criteria breakdown
    if (execution.summary?.criteriaBreakdown) {
      const criteriaEntries = Object.entries(execution.summary.criteriaBreakdown);
      charts.push({
        type: 'radar',
        title: 'Evaluation Criteria Breakdown',
        data: {
          labels: criteriaEntries.map(([name]) => name),
          datasets: [{
            label: 'Scores',
            data: criteriaEntries.map(([, score]) => score),
            backgroundColor: 'rgba(34, 197, 94, 0.2)',
            borderColor: '#22c55e'
          }]
        }
      });
    }

    // Response times histogram
    const latencies = execution.results.map(r => r.metadata.duration).filter(l => l > 0);
    if (latencies.length > 0) {
      const bins = this.createHistogramBins(latencies, 10);
      charts.push({
        type: 'bar',
        title: 'Response Time Distribution',
        data: {
          labels: bins.map(b => `${b.min}-${b.max}ms`),
          datasets: [{
            label: 'Count',
            data: bins.map(b => b.count),
            backgroundColor: '#f59e0b'
          }]
        }
      });
    }

    return charts;
  }

  /**
   * Render report sections
   */
  private async renderSections(
    execution: TestExecution,
    analyses: AnalysisResult[],
    charts: ChartConfig[],
    config: ReportConfig
  ): Promise<Record<string, string>> {
    const sections: Record<string, string> = {};
    const enabledSections = config.sections.filter(s => s.enabled);

    for (const section of enabledSections) {
      try {
        switch (section.type) {
          case 'summary':
            sections[section.id] = this.renderSummary(execution);
            break;
          case 'detailed_results':
            sections[section.id] = this.renderDetailedResults(execution);
            break;
          case 'analysis':
            sections[section.id] = this.renderAnalysis(analyses);
            break;
          case 'recommendations':
            sections[section.id] = this.renderRecommendations(execution, analyses);
            break;
          case 'charts':
            sections[section.id] = this.renderCharts(charts);
            break;
          case 'metrics':
            sections[section.id] = this.renderMetrics(execution);
            break;
          default:
            sections[section.id] = `Section ${section.type} not implemented`;
        }
      } catch (error) {
        console.warn(`Failed to render section ${section.id}:`, error);
        sections[section.id] = `Error rendering section: ${(error as Error).message}`;
      }
    }

    return sections;
  }

  /**
   * Render summary section
   */
  private renderSummary(execution: TestExecution): string {
    const summary = execution.summary;
    if (!summary) return 'No summary available';
    
    // Calculate additional metrics from results
    const averageLatency = execution.results.length > 0 
      ? execution.results.reduce((sum, r) => sum + r.metadata.duration, 0) / execution.results.length 
      : 0;
    const totalTokens = execution.results.reduce((sum, r) => 
      sum + (r.metadata.usage?.totalTokens || 0), 0);
    const totalCost = 0; // Would need pricing calculation

    return `
# Test Summary

**Test Configuration:** ${execution.configId}
**Execution ID:** ${execution.id}
**Status:** ${execution.status}
**Duration:** ${this.formatDuration(execution.startTime, execution.endTime)}

## Results Overview

- **Total Tests:** ${summary.total}
- **Passed:** ${summary.passed} (${((summary.passed / summary.total) * 100).toFixed(1)}%)
- **Failed:** ${summary.failed} (${((summary.failed / summary.total) * 100).toFixed(1)}%)
- **Average Score:** ${summary.averageScore.toFixed(2)}
- **Average Latency:** ${averageLatency.toFixed(0)}ms
- **Total Cost:** $${totalCost.toFixed(4)}
- **Total Tokens:** ${totalTokens.toLocaleString()}

## Key Insights

**Common Issues:**
${summary.commonIssues.map(issue => `- ${issue}`).join('\n')}

**Top Performing Scenarios:**
${summary.topPerformingScenarios.map(scenario => `- ${scenario}`).join('\n')}

**Areas Needing Improvement:**
${summary.worstPerformingScenarios.map(scenario => `- ${scenario}`).join('\n')}

`;
  }

  /**
   * Render detailed results section
   */
  private renderDetailedResults(execution: TestExecution): string {
    let content = '# Detailed Results\n\n';
    
    // Group results by scenario
    const byScenario = execution.results.reduce((groups, result) => {
      const key = result.scenario.id;
      if (!groups[key]) groups[key] = [];
      groups[key].push(result);
      return groups;
    }, {} as Record<string, typeof execution.results>);
    
    Object.entries(byScenario).forEach(([scenarioId, results]) => {
      content += `## Scenario: ${scenarioId}\n\n`;
      
      results.forEach((result, index) => {
        const passed = result.evaluation.passed ? '✅' : '❌';
        content += `### Test ${index + 1} ${passed}\n\n`;
        content += `**Score:** ${result.evaluation.overallScore.toFixed(2)}\n`;
        content += `**Persona:** ${result.persona.id}\n`;
        content += `**Latency:** ${result.metadata.duration}ms\n`;
        content += `**Tokens:** ${result.metadata.usage?.totalTokens || 0}\n\n`;
        
        if (result.evaluation.feedback) {
          content += `**Feedback:**\n${result.evaluation.feedback}\n\n`;
        }
        
        content += '---\n\n';
      });
    });
    
    return content;
  }

  /**
   * Render analysis section
   */
  private renderAnalysis(analyses: AnalysisResult[]): string {
    let content = '# Analysis\n\n';
    
    analyses.forEach(analysis => {
      content += `## ${analysis.title}\n\n`;
      content += `${analysis.summary}\n\n`;
      
      if (analysis.insights.length > 0) {
        content += `**Key Insights:**\n${analysis.insights.map(i => `- ${i}`).join('\n')}\n\n`;
      }
      
      if (analysis.recommendations.length > 0) {
        content += `**Recommendations:**\n${analysis.recommendations.map(r => `- ${r}`).join('\n')}\n\n`;
      }
      
      content += `**Confidence:** ${(analysis.confidence * 100).toFixed(0)}%\n\n`;
      content += '---\n\n';
    });
    
    return content;
  }

  /**
   * Render recommendations section
   */
  private renderRecommendations(_execution: TestExecution, analyses: AnalysisResult[]): string {
    let content = '# Recommendations\n\n';
    
    // Collect all recommendations
    const allRecommendations = [
      ...analyses.flatMap(a => a.recommendations)
    ];
    
    // Deduplicate and categorize
    const unique = [...new Set(allRecommendations)];
    
    if (unique.length === 0) {
      return content + 'No specific recommendations at this time.\n';
    }
    
    unique.forEach((rec, index) => {
      content += `${index + 1}. ${rec}\n`;
    });
    
    return content;
  }

  /**
   * Render charts section
   */
  private renderCharts(charts: ChartConfig[]): string {
    let content = '# Charts and Visualizations\n\n';
    
    charts.forEach(chart => {
      content += `## ${chart.title}\n\n`;
      content += `*${chart.type.charAt(0).toUpperCase() + chart.type.slice(1)} chart*\n\n`;
      // In a real implementation, this would embed actual chart images
      content += '[Chart would be rendered here]\n\n';
    });
    
    return content;
  }

  /**
   * Render metrics section
   */
  private renderMetrics(execution: TestExecution): string {
    const summary = execution.summary;
    if (!summary) return 'No metrics available';
    
    // Calculate metrics from results
    const averageLatency = execution.results.length > 0 
      ? execution.results.reduce((sum, r) => sum + r.metadata.duration, 0) / execution.results.length 
      : 0;
    const totalTokens = execution.results.reduce((sum, r) => 
      sum + (r.metadata.usage?.totalTokens || 0), 0);
    const totalCost = 0;
    
    let content = '# Detailed Metrics\n\n';
    
    content += '## Performance Metrics\n\n';
    content += `| Metric | Value |\n`;
    content += `|--------|-------|\n`;
    content += `| Average Score | ${summary.averageScore.toFixed(3)} |\n`;
    content += `| Average Latency | ${averageLatency.toFixed(0)}ms |\n`;
    content += `| Total Cost | $${totalCost.toFixed(4)} |\n`;
    content += `| Total Tokens | ${totalTokens.toLocaleString()} |\n`;
    content += `| Success Rate | ${((summary.passed / summary.total) * 100).toFixed(1)}% |\n\n`;
    
    if (Object.keys(summary.criteriaBreakdown).length > 0) {
      content += '## Criteria Scores\n\n';
      content += `| Criterion | Score |\n`;
      content += `|-----------|-------|\n`;
      Object.entries(summary.criteriaBreakdown).forEach(([criterion, score]) => {
        content += `| ${criterion} | ${score.toFixed(3)} |\n`;
      });
      content += '\n';
    }
    
    return content;
  }

  /**
   * Format output based on report format
   */
  private async formatOutput(sections: Record<string, string>, config: ReportConfig): Promise<string | Buffer> {
    const allContent = Object.values(sections).join('\n\n');
    
    switch (config.format) {
      case 'markdown':
        return allContent;
      case 'html':
        return this.markdownToHtml(allContent, config);
      case 'json':
        return JSON.stringify(sections, null, 2);
      case 'csv':
        return this.sectionsToCSV(sections);
      default:
        return allContent;
    }
  }

  /**
   * Create output directory structure
   */
  private async createOutputDirectory(execution: TestExecution, config: ReportConfig): Promise<string> {
    const model = execution.metadata?.model || 'unknown-model';
    const now = new Date().toISOString().replace(/[:.]/g, '-');
    const parts = now.split('T');
    const datePart = parts[0];
    const timePart = parts[1] || '00-00-00';
    const timeWithoutMs = timePart.split('.')[0] || timePart;
    const timestamp = `${datePart}_${timeWithoutMs}`;
    
    const basePath = config.outputPath || './reports';
    const runDir = join(basePath, `${model}_${timestamp}`);
    
    // Create directory structure
    await fs.mkdir(runDir, { recursive: true });
    await fs.mkdir(join(runDir, 'charts'), { recursive: true });
    await fs.mkdir(join(runDir, 'exports'), { recursive: true });
    await fs.mkdir(join(runDir, 'raw-data'), { recursive: true });
    
    return runDir;
  }

  /**
   * Create additional exports
   */
  private async createExports(execution: TestExecution, config: ReportConfig, outputDir: string) {
    const exports: any = {};
    
    if (config.export?.chatML) {
      const chatMLData = await this.chatMLExporter.exportToChatML(execution);
      const chatMLPath = join(outputDir, 'exports', 'chatml.jsonl');
      await fs.writeFile(chatMLPath, chatMLData, 'utf8');
      exports.chatML = chatMLPath;
    }
    
    if (config.export?.includeRawData) {
      const rawData = {
        execution,
        timestamp: new Date().toISOString()
      };
      const rawDataPath = join(outputDir, 'raw-data', 'execution.json');
      await fs.writeFile(rawDataPath, JSON.stringify(rawData, null, 2), 'utf8');
      exports.rawData = rawDataPath;
    }
    
    return exports;
  }

  /**
   * Save the main report file
   */
  private async saveReport(report: GeneratedReport, outputDir: string): Promise<void> {
    const extension = this.getFileExtension(report.format);
    const filename = `report.${extension}`;
    const filepath = join(outputDir, filename);
    
    if (typeof report.content === 'string') {
      await fs.writeFile(filepath, report.content, 'utf8');
    } else {
      await fs.writeFile(filepath, report.content);
    }
    
    // Also save metadata
    const metadataPath = join(outputDir, 'metadata.json');
    await fs.writeFile(metadataPath, JSON.stringify(report.metadata, null, 2), 'utf8');
    
    console.log(`📁 Report saved to: ${outputDir}`);
  }

  // Helper methods

  private calculateSize(content: string | Buffer): number {
    return typeof content === 'string' ? 
      Buffer.byteLength(content, 'utf8') : 
      content.length;
  }

  private formatDuration(start: Date, end?: Date): string {
    if (!end) return 'In progress';
    const duration = end.getTime() - start.getTime();
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }

  private createHistogramBins(values: number[], binCount: number) {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binSize = (max - min) / binCount;
    
    const bins = [];
    for (let i = 0; i < binCount; i++) {
      const binMin = min + i * binSize;
      const binMax = min + (i + 1) * binSize;
      const count = values.filter(v => v >= binMin && v < binMax).length;
      
      bins.push({
        min: Math.round(binMin),
        max: Math.round(binMax),
        count
      });
    }
    
    return bins;
  }

  private markdownToHtml(markdown: string, _config: ReportConfig): string {
    // Simplified markdown to HTML conversion
    // In a real implementation, use a proper markdown parser
    let html = markdown
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
    
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
    h1 { color: #333; border-bottom: 2px solid #333; }
    h2 { color: #666; border-bottom: 1px solid #ccc; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    .passed { color: green; }
    .failed { color: red; }
  </style>
</head>
<body>
  <p>${html}</p>
</body>
</html>`;
  }

  private sectionsToCSV(sections: Record<string, string>): string {
    let csv = 'Section,Content\n';
    Object.entries(sections).forEach(([section, content]) => {
      const escapedContent = content.replace(/"/g, '""').replace(/\n/g, ' ');
      csv += `"${section}","${escapedContent}"\n`;
    });
    return csv;
  }

  private emitProgress(stage: ReportStage, progress: number): void {
    const progressData: ReportProgress = {
      stage,
      progress,
      sectionsCompleted: 0,
      totalSections: 0
    };
    
    this.emit('progress', progressData);
  }

  private emitError(stage: ReportStage, message: string): void {
    const error: ReportError = {
      stage,
      message,
      recoverable: false
    };
    
    this.emit('error', error);
  }

  /**
   * Get file extension for report format
   */
  private getFileExtension(format: string): string {
    switch (format) {
      case 'html': return 'html';
      case 'pdf': return 'pdf';
      case 'json': return 'json';
      case 'csv': return 'csv';
      case 'markdown': return 'md';
      case 'xlsx': return 'xlsx';
      default: return 'txt';
    }
  }
}
