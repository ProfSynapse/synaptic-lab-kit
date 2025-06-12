# Reporting & Export System

Comprehensive report generation and data export capabilities for test results, optimization insights, and training data.

## 🎯 Purpose

The reporting system provides multiple output formats for different audiences:
- **Human-readable reports** for stakeholders and developers
- **Training data exports** in ChatML format for model fine-tuning
- **Analytics dashboards** with interactive visualizations
- **Comparison reports** for multi-provider analysis
- **Export formats** including HTML, PDF, JSON, CSV, and Markdown

## 📊 ReportGenerator

Creates comprehensive reports in multiple formats with advanced analytics.

### Basic Report Generation
```typescript
import { ReportGenerator, DEFAULT_REPORT_CONFIGS } from './ReportGenerator';

const generator = new ReportGenerator();

// Quick markdown report
const quickReport = await generator.generateReport(testExecution, {
  format: 'markdown',
  sections: [
    { id: 'summary', title: 'Summary', type: 'summary', enabled: true },
    { id: 'metrics', title: 'Key Metrics', type: 'metrics', enabled: true }
  ]
});

// Detailed HTML report with charts
const detailedReport = await generator.generateReport(testExecution, {
  format: 'html',
  sections: [
    { id: 'summary', title: 'Executive Summary', type: 'summary', enabled: true },
    { id: 'detailed_results', title: 'Detailed Results', type: 'detailed_results', enabled: true },
    { id: 'analysis', title: 'Analysis', type: 'analysis', enabled: true },
    { id: 'charts', title: 'Visualizations', type: 'charts', enabled: true },
    { id: 'recommendations', title: 'Recommendations', type: 'recommendations', enabled: true }
  ],
  export: {
    chatML: true,
    includeRawData: true
  }
});
```

### Report Sections Available
```typescript
type SectionType = 
  | 'summary'           // Executive summary with key metrics
  | 'detailed_results'  // Individual test results with scores
  | 'analysis'          // AI-powered insights and patterns
  | 'recommendations'   // Actionable improvement suggestions
  | 'charts'           // Visualizations and graphs
  | 'metrics'          // Detailed performance metrics
  | 'comparisons'      // Multi-provider or multi-test comparisons
  | 'trends'           // Performance trends over time
  | 'raw_data';        // Raw test data for further analysis
```

### Real-time Progress Monitoring
```typescript
generator.on('progress', (progress) => {
  console.log(`📊 Report generation: ${progress.stage} (${progress.progress}%)`);
  
  switch (progress.stage) {
    case 'analyzing_data':
      console.log('🔍 Analyzing test results...');
      break;
    case 'generating_charts':
      console.log('📈 Creating visualizations...');
      break;
    case 'rendering_sections':
      console.log('📝 Rendering report sections...');
      break;
    case 'formatting_output':
      console.log('✨ Formatting final output...');
      break;
  }
});

generator.on('error', (error) => {
  console.error(`❌ Report generation failed: ${error.message}`);
});
```

## 💾 ChatML Export for Training Data

Export test conversations in ChatML format for model fine-tuning.

### Basic ChatML Export
```typescript
import { ChatMLExporter } from './ChatMLExporter';

const exporter = new ChatMLExporter();

// Export all conversations
const chatMLData = await exporter.exportToChatML(testExecution);

// Save to file for training
fs.writeFileSync('./training_data.jsonl', chatMLData);

// Get export statistics
const stats = exporter.getExportStats(chatMLData);
console.log({
  totalConversations: stats.conversations,
  messagePairs: stats.messagePairs,
  averageTokens: stats.averageTokens,
  totalCost: stats.totalCost
});
```

### Filtered Exports
```typescript
// Export only high-quality interactions
const highQualityData = await exporter.exportHighQuality(testExecution, 0.8);

// Export specific scenarios only
const scenarioData = await exporter.exportScenarios(testExecution, [
  'customer_returns',
  'billing_questions',
  'technical_support'
]);

// Export with custom filter
const customData = await exporter.exportWithFilter(testExecution, (result) => {
  return result.evaluation.overall > 0.7 &&
         result.evaluation.passed &&
         result.response.tokens < 500; // Keep concise responses
});
```

### ChatML Format Structure
```jsonl
{"type": "metadata", "data": {"testName": "Customer Service Test", "totalConversations": 50, ...}}
{"type": "conversation", "data": {"id": "conv_1", "messages": [...], "metadata": {...}}}
{"type": "message_pair", "data": {"user": {...}, "assistant": {...}, "evaluation": {...}}}
```

### Example ChatML Output
```json
{
  "type": "message_pair",
  "data": {
    "user": {
      "role": "user",
      "content": "How do I return a defective product?",
      "metadata": {
        "scenario": "returns_policy",
        "persona": "frustrated_customer",
        "timestamp": "2025-01-10T10:30:00Z"
      }
    },
    "assistant": {
      "role": "assistant", 
      "content": "I understand your frustration with a defective product. Here's how to return it:\n\n1. Visit our returns portal at returns.company.com\n2. Enter your order number\n3. Select the defective item and reason\n4. Print the prepaid return label\n5. Drop off at any shipping location\n\nYou'll receive a full refund within 3-5 business days once we receive the item.",
      "metadata": {
        "evaluation": {
          "overall": 0.92,
          "accuracy": 0.95,
          "helpfulness": 0.90,
          "empathy": 0.90
        },
        "tokens": 187,
        "cost": 0.0045,
        "model": "gpt-4"
      }
    }
  }
}
```

## 🔍 AnalysisEngine

AI-powered analysis that goes beyond basic metrics to provide actionable insights.

### Comprehensive Analysis
```typescript
import { AnalysisEngine } from './AnalysisEngine';

const analysisEngine = new AnalysisEngine();
const analyses = await analysisEngine.analyzeExecution(testExecution);

// Different analysis types
analyses.forEach(analysis => {
  console.log(`📊 ${analysis.title}`);
  console.log(`Summary: ${analysis.summary}`);
  console.log(`Confidence: ${(analysis.confidence * 100).toFixed(0)}%`);
  
  if (analysis.insights.length > 0) {
    console.log('💡 Key Insights:');
    analysis.insights.forEach(insight => console.log(`  • ${insight}`));
  }
  
  if (analysis.recommendations.length > 0) {
    console.log('🎯 Recommendations:');
    analysis.recommendations.forEach(rec => console.log(`  • ${rec}`));
  }
});
```

### Analysis Types Available
```typescript
type AnalysisType = 
  | 'performance_trends'    // Performance changes over time
  | 'provider_comparison'   // Multi-provider performance analysis
  | 'cost_analysis'        // Cost efficiency and optimization
  | 'quality_metrics'      // Response quality patterns
  | 'error_patterns'       // Failure analysis and clustering
  | 'optimization_impact'  // Before/after optimization analysis
  | 'persona_analysis'     // Performance by user type
  | 'scenario_analysis';   // Performance by scenario category
```

### Example Analysis Output
```typescript
// Performance Trends Analysis
{
  type: 'performance_trends',
  title: 'Performance Trends Analysis',
  summary: 'Analyzed trends across 150 test results',
  insights: [
    'Quality scores are improving over time',
    'Response times are stable around 2.3 seconds',
    'Cost per interaction decreased by 12%'
  ],
  recommendations: [
    'Continue current optimization approach',
    'Consider caching for repeated queries'
  ],
  data: {
    scoreSlope: 0.023,       // Positive trend
    latencySlope: -15.2,     // Improving speed
    degrading: false
  },
  confidence: 0.85
}

// Error Patterns Analysis
{
  type: 'error_patterns',
  title: 'Error Pattern Analysis', 
  summary: '23 failures out of 150 tests (15.3%)',
  insights: [
    'Consistent failures in billing_complex scenarios',
    'High error rate for elderly_user persona (28%)',
    'Technical questions have 3x higher failure rate'
  ],
  recommendations: [
    'Focus testing efforts on billing scenarios',
    'Improve prompts for non-technical users',
    'Add technical knowledge base integration'
  ],
  data: {
    errorRate: 0.153,
    problematicScenarios: ['billing_complex', 'technical_api'],
    errorsByScenario: { 'billing_complex': 8, 'technical_api': 6 }
  },
  confidence: 0.92
}
```

### Multi-Execution Comparison
```typescript
// Compare multiple test runs
const comparison = await analysisEngine.compareExecutions({
  baseline: 'test_run_1',
  comparisons: ['test_run_2', 'test_run_3'],
  metrics: ['accuracy', 'cost', 'latency']
}, executionsMap);

console.log('📈 Comparison Results:');
comparison.comparisons.forEach(comp => {
  console.log(`\n${comp.name}:`);
  comp.changes.forEach(change => {
    const direction = change.improvement ? '📈' : '📉';
    console.log(`  ${direction} ${change.metric}: ${change.changePercent.toFixed(1)}%`);
  });
});
```

## 📈 Chart Generation & Visualizations

### Automatic Chart Creation
```typescript
// Charts are automatically generated based on data
const charts = [
  {
    type: 'line',
    title: 'Response Quality Over Time',
    data: {
      labels: ['Test 1', 'Test 2', 'Test 3', ...],
      datasets: [{
        label: 'Overall Score',
        data: [0.75, 0.78, 0.82, ...],
        borderColor: '#3b82f6'
      }]
    }
  },
  {
    type: 'radar',
    title: 'Evaluation Criteria Breakdown',
    data: {
      labels: ['Accuracy', 'Helpfulness', 'Empathy', 'Completeness'],
      datasets: [{
        label: 'Scores',
        data: [0.85, 0.78, 0.92, 0.80],
        backgroundColor: 'rgba(34, 197, 94, 0.2)'
      }]
    }
  },
  {
    type: 'bar',
    title: 'Response Time Distribution', 
    data: {
      labels: ['0-1s', '1-2s', '2-3s', '3-4s', '4s+'],
      datasets: [{
        label: 'Count',
        data: [12, 45, 67, 23, 8],
        backgroundColor: '#f59e0b'
      }]
    }
  }
];
```

### Custom Chart Configuration
```typescript
const customReport = await generator.generateReport(testExecution, {
  format: 'html',
  sections: [
    {
      id: 'custom_charts',
      title: 'Performance Dashboard',
      type: 'charts',
      enabled: true,
      config: {
        charts: [
          {
            type: 'line',
            title: 'Cost vs Quality Trade-off',
            data: getCostQualityData(testExecution),
            options: {
              scales: {
                x: { title: { display: true, text: 'Cost per Request ($)' } },
                y: { title: { display: true, text: 'Quality Score' } }
              }
            }
          }
        ]
      }
    }
  ]
});
```

## 🎨 Custom Report Templates

### Pre-built Templates
```typescript
import { DEFAULT_REPORT_CONFIGS } from './reporting';

// Quick summary report
const quickReport = await generator.generateReport(
  testExecution,
  DEFAULT_REPORT_CONFIGS.quick
);

// Detailed analysis report
const detailedReport = await generator.generateReport(
  testExecution, 
  DEFAULT_REPORT_CONFIGS.detailed
);

// Comparison report for multiple providers
const comparisonReport = await generator.generateReport(
  testExecution,
  DEFAULT_REPORT_CONFIGS.comparison
);
```

### Custom Templates
```typescript
const customTemplate = {
  format: 'html' as ReportFormat,
  sections: [
    {
      id: 'executive_summary',
      title: 'Executive Summary',
      type: 'summary' as const,
      enabled: true,
      config: {
        includeMetrics: ['accuracy', 'cost', 'user_satisfaction'],
        highlightThresholds: { accuracy: 0.8, cost: 0.05 }
      }
    },
    {
      id: 'failure_analysis', 
      title: 'Failure Deep Dive',
      type: 'analysis' as const,
      enabled: true,
      config: {
        focusOn: ['error_patterns', 'problematic_scenarios'],
        includeRecommendations: true
      }
    }
  ],
  style: {
    theme: 'corporate',
    colors: {
      primary: '#1e40af',
      success: '#16a34a', 
      warning: '#ca8a04',
      error: '#dc2626'
    }
  }
};
```

## 📤 Multiple Export Formats

### Supported Formats
```typescript
type ReportFormat = 'html' | 'pdf' | 'json' | 'csv' | 'markdown' | 'xlsx';

// HTML with interactive charts
const htmlReport = await generator.generateReport(execution, {
  format: 'html',
  sections: allSections
});

// PDF for sharing
const pdfReport = await generator.generateReport(execution, {
  format: 'pdf', 
  sections: allSections
});

// JSON for programmatic access
const jsonReport = await generator.generateReport(execution, {
  format: 'json',
  sections: allSections
});

// CSV for spreadsheet analysis
const csvReport = await generator.generateReport(execution, {
  format: 'csv',
  sections: ['metrics', 'detailed_results']
});
```

### Batch Export
```typescript
// Export multiple formats at once
const reports = await generator.generateMultipleFormats(testExecution, {
  formats: ['html', 'pdf', 'json', 'csv'],
  sections: DEFAULT_REPORT_CONFIGS.detailed.sections,
  outputDirectory: './reports',
  filenamePrefix: 'customer_service_test_2025_01_10'
});

// Results in:
// ./reports/customer_service_test_2025_01_10.html
// ./reports/customer_service_test_2025_01_10.pdf
// ./reports/customer_service_test_2025_01_10.json
// ./reports/customer_service_test_2025_01_10.csv
```

## 🔄 Integration Examples

### Automated Reporting Pipeline
```typescript
// Automatically generate reports after test completion
testRunner.on('test:complete', async (results) => {
  console.log('📊 Generating reports...');
  
  // Generate different reports for different audiences
  const reports = await Promise.all([
    // Executive summary for stakeholders
    generator.generateReport(results, {
      format: 'pdf',
      sections: [
        { id: 'summary', type: 'summary', enabled: true },
        { id: 'recommendations', type: 'recommendations', enabled: true }
      ]
    }),
    
    // Technical report for developers
    generator.generateReport(results, {
      format: 'html',
      sections: DEFAULT_REPORT_CONFIGS.detailed.sections
    }),
    
    // Training data for ML team
    chatMLExporter.exportToChatML(results)
  ]);
  
  console.log('✅ Reports generated successfully');
});
```

### Continuous Monitoring Reports
```typescript
// Generate daily/weekly summary reports
const monitoringReporter = new MonitoringReporter();

monitoringReporter.scheduleReport({
  frequency: 'daily',
  recipients: ['team@company.com'],
  template: 'daily_summary',
  includeAlerts: true,
  thresholds: {
    accuracy: 0.85,
    costPerRequest: 0.10,
    responseTime: 3000
  }
});

// Alert on significant changes
monitoringReporter.on('threshold_breach', (alert) => {
  console.log(`🚨 Alert: ${alert.metric} is ${alert.value} (threshold: ${alert.threshold})`);
  // Send notification, create ticket, etc.
});
```

## 🎯 Best Practices

### 1. Report Design
- **Know your audience** - Different reports for different stakeholders
- **Highlight key insights** - Don't bury important findings in data
- **Include context** - Explain what the metrics mean and why they matter
- **Actionable recommendations** - Provide specific next steps

### 2. Data Export
- **Filter for quality** - Only export high-quality training data
- **Include metadata** - Context helps with training and analysis
- **Regular exports** - Don't let valuable training data pile up
- **Version control** - Track changes in exported datasets

### 3. Performance
- **Cache analysis results** - Expensive analytics should be cached
- **Generate asynchronously** - Don't block on report generation
- **Compress large exports** - Use compression for large datasets
- **Clean up old reports** - Implement retention policies

### 4. Monitoring
- **Track report usage** - Know which reports are valuable
- **Monitor generation times** - Optimize slow report sections
- **Alert on anomalies** - Automatically flag unusual patterns
- **Regular review** - Ensure reports stay relevant and useful

The reporting system transforms raw test data into actionable insights, beautiful visualizations, and valuable training datasets! 📊✨