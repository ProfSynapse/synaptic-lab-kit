/**
 * Reporting module exports
 * Comprehensive test reporting and analysis tools
 */

export { ReportGenerator } from './ReportGenerator';
export { ChatMLExporter } from './ChatMLExporter';
export { AnalysisEngine } from './AnalysisEngine';
export * from './types';

/**
 * Factory function for creating report generators
 */
import { ReportGenerator } from './ReportGenerator';
import { ChatMLExporter } from './ChatMLExporter';
import { ReportConfig, ReportFormat } from './types';

export function createReportGenerator(): ReportGenerator {
  return new ReportGenerator();
}

/**
 * Quick report generation helper
 */
export async function generateQuickReport(
  execution: any,
  format: ReportFormat = 'markdown'
): Promise<string> {
  const generator = createReportGenerator();
  
  const config: ReportConfig = {
    format,
    sections: [
      { id: 'summary', title: 'Summary', type: 'summary', enabled: true },
      { id: 'metrics', title: 'Metrics', type: 'metrics', enabled: true },
      { id: 'analysis', title: 'Analysis', type: 'analysis', enabled: true }
    ]
  };
  
  const report = await generator.generateReport(execution, config);
  return report.content as string;
}

/**
 * Export to ChatML format helper
 */
export async function exportToChatML(execution: any): Promise<string> {
  const exporter = new ChatMLExporter();
  return await exporter.exportToChatML(execution);
}

/**
 * Default report configurations
 */
export const DEFAULT_REPORT_CONFIGS = {
  quick: {
    format: 'markdown' as ReportFormat,
    sections: [
      { id: 'summary', title: 'Summary', type: 'summary' as const, enabled: true },
      { id: 'metrics', title: 'Key Metrics', type: 'metrics' as const, enabled: true }
    ]
  },
  
  detailed: {
    format: 'html' as ReportFormat,
    sections: [
      { id: 'summary', title: 'Executive Summary', type: 'summary' as const, enabled: true },
      { id: 'detailed_results', title: 'Detailed Results', type: 'detailed_results' as const, enabled: true },
      { id: 'analysis', title: 'Analysis', type: 'analysis' as const, enabled: true },
      { id: 'charts', title: 'Visualizations', type: 'charts' as const, enabled: true },
      { id: 'recommendations', title: 'Recommendations', type: 'recommendations' as const, enabled: true },
      { id: 'metrics', title: 'Detailed Metrics', type: 'metrics' as const, enabled: true }
    ],
    export: {
      chatML: true,
      includeRawData: true
    }
  },
  
  comparison: {
    format: 'html' as ReportFormat,
    sections: [
      { id: 'summary', title: 'Comparison Summary', type: 'summary' as const, enabled: true },
      { id: 'comparisons', title: 'Detailed Comparisons', type: 'comparisons' as const, enabled: true },
      { id: 'trends', title: 'Trend Analysis', type: 'trends' as const, enabled: true },
      { id: 'recommendations', title: 'Recommendations', type: 'recommendations' as const, enabled: true }
    ]
  }
};