/**
 * Reporting types and interfaces
 * Based on patterns from existing test reporting
 */

export interface ReportConfig {
  format: ReportFormat;
  sections: ReportSection[];
  style?: ReportStyle;
  export?: ExportConfig;
  template?: string;
  outputPath?: string;
}

export type ReportFormat = 'html' | 'pdf' | 'json' | 'csv' | 'markdown' | 'xlsx';

export interface ReportSection {
  id: string;
  title: string;
  type: SectionType;
  enabled: boolean;
  config?: any;
  order?: number;
}

export type SectionType = 
  | 'summary'
  | 'detailed_results'
  | 'analysis'
  | 'recommendations'
  | 'raw_data'
  | 'charts'
  | 'metrics'
  | 'comparisons'
  | 'trends'
  | 'custom';

export interface ReportStyle {
  theme: 'light' | 'dark' | 'corporate' | 'academic';
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    success: string;
    warning: string;
    error: string;
    background: string;
    text: string;
  };
  fonts: {
    primary: string;
    secondary: string;
    code: string;
  };
  layout: {
    margin: string;
    padding: string;
    columnWidth: string;
  };
}

export interface ExportConfig {
  chatML?: boolean;
  includeRawData?: boolean;
  compressData?: boolean;
  includeImages?: boolean;
  includeCode?: boolean;
  anonymize?: boolean;
}

export interface GeneratedReport {
  id: string;
  testExecutionId: string;
  format: ReportFormat;
  content: string | Buffer;
  metadata: ReportMetadata;
  exports?: ReportExports;
}

export interface ReportMetadata {
  generated: Date;
  size: number;
  sections: string[];
  version: string;
  generator: string;
  title: string;
  author?: string;
  description?: string;
}

export interface ReportExports {
  chatML?: string;
  rawData?: any;
  images?: Buffer[];
  attachments?: Array<{
    name: string;
    content: Buffer;
    type: string;
  }>;
}

// ChatML export types
export interface ChatMLMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  metadata?: {
    scenario?: string;
    persona?: string;
    evaluation?: any;
    timestamp?: string;
    tokens?: number;
    cost?: number;
    model?: string;
  };
}

export interface ChatMLConversation {
  id: string;
  messages: ChatMLMessage[];
  metadata: {
    testId: string;
    scenario: string;
    persona?: string;
    provider: string;
    model: string;
    created: string;
    totalTokens: number;
    totalCost: number;
    averageScore: number;
  };
}

export interface ChatMLExport {
  conversations: ChatMLConversation[];
  metadata: {
    testName: string;
    totalConversations: number;
    totalMessages: number;
    totalTokens: number;
    totalCost: number;
    averageScore: number;
    exportDate: string;
    version: string;
    framework: string;
  };
}

// Chart and visualization types
export interface ChartConfig {
  type: ChartType;
  title: string;
  data: ChartData;
  options?: ChartOptions;
}

export type ChartType = 
  | 'line'
  | 'bar'
  | 'pie'
  | 'scatter'
  | 'radar'
  | 'heatmap'
  | 'histogram'
  | 'box';

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
    borderWidth?: number;
  }>;
}

export interface ChartOptions {
  responsive?: boolean;
  maintainAspectRatio?: boolean;
  scales?: any;
  plugins?: any;
  animation?: any;
}

// Analysis types
export interface AnalysisResult {
  type: AnalysisType;
  title: string;
  summary: string;
  insights: string[];
  recommendations: string[];
  data: any;
  charts?: ChartConfig[];
  confidence: number;
}

export type AnalysisType = 
  | 'performance_trends'
  | 'provider_comparison'
  | 'cost_analysis'
  | 'quality_metrics'
  | 'error_patterns'
  | 'optimization_impact'
  | 'persona_analysis'
  | 'scenario_analysis';

// Report templates
export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  format: ReportFormat;
  sections: ReportSection[];
  style: ReportStyle;
  variables: TemplateVariable[];
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  default?: any;
  required: boolean;
  description: string;
}

// Comparison types
export interface ComparisonConfig {
  baseline: string; // Test execution ID
  comparisons: string[]; // Other test execution IDs
  metrics: string[];
  analysisTypes: AnalysisType[];
}

export interface ComparisonResult {
  baseline: {
    id: string;
    name: string;
    summary: any;
  };
  comparisons: Array<{
    id: string;
    name: string;
    summary: any;
    changes: {
      metric: string;
      baseline: number;
      current: number;
      change: number;
      changePercent: number;
      improvement: boolean;
    }[];
  }>;
  overallInsights: string[];
}

// Progress tracking
export interface ReportProgress {
  stage: ReportStage;
  progress: number;
  currentSection?: string;
  estimatedTimeRemaining?: number;
  sectionsCompleted: number;
  totalSections: number;
}

export type ReportStage = 
  | 'initializing'
  | 'analyzing_data'
  | 'generating_charts'
  | 'rendering_sections'
  | 'formatting_output'
  | 'exporting'
  | 'completed'
  | 'error';

export interface ReportError {
  stage: ReportStage;
  section?: string;
  message: string;
  details?: any;
  recoverable: boolean;
}
