/**
 * Core testing framework types
 * Based on patterns from synthetic user framework and prompt optimization
 * Extended with comprehensive testing capabilities
 */

import { SupportedProvider } from '../adapters/types';
import { SupportedEmbeddingProvider } from '../embeddings/types';

export interface TestScenario {
  id: string;
  description: string;
  category: string;
  userInput: string;
  expectedBehavior: string;
  evaluationCriteria: string[];
  context?: Record<string, any>;
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string[];
  metadata?: Record<string, any>;
  inputs?: ScenarioInput[];
  expectedOutputs?: ExpectedOutput[];
  contextInfo?: string;
  instructions?: string;
  data?: any[];
}

export interface Persona {
  id: string;
  name: string;
  domain: string;
  traits: PersonalityTraits;
  behaviorPatterns: BehaviorPattern[];
  demographics?: Demographics;
  goals?: string[];
  painPoints?: string[];
  expertise?: 'novice' | 'intermediate' | 'expert';
}

export interface PersonalityTraits {
  communicationStyle: 'direct' | 'verbose' | 'confused' | 'polite' | 'aggressive';
  emotionalState: 'calm' | 'frustrated' | 'urgent' | 'anxious' | 'excited';
  patienceLevel: 'low' | 'medium' | 'high';
  detailPreference: 'brief' | 'moderate' | 'comprehensive';
  techComfort: 'low' | 'medium' | 'high';
  decisionSpeed: 'quick' | 'thoughtful' | 'deliberate';
}

export interface BehaviorPattern {
  trigger: string;
  response: string;
  likelihood: number; // 0-1
}

export interface Demographics {
  age?: number;
  occupation?: string;
  location?: string;
  income?: number;
  education?: string;
}

export interface TestResult {
  id: string;
  scenario: TestScenario;
  persona: Persona;
  request: string;
  response: string;
  evaluation: EvaluationResult;
  metadata: TestMetadata;
  timestamp: string;
}

export interface EvaluationResult {
  overallScore: number; // 0-1
  criteriaScores: Record<string, number>;
  passed: boolean;
  feedback: string;
  specificIssues: string[];
  strengths: string[];
  suggestions: string[];
}

export interface TestMetadata {
  model: string;
  provider: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  duration: number; // milliseconds
  retries?: number;
  error?: string;
}

export interface TestSession {
  id: string;
  name: string;
  domain: string;
  startTime: string;
  endTime?: string;
  scenarios: TestScenario[];
  personas: Persona[];
  results: TestResult[];
  summary?: TestSummary;
  configuration: TestConfiguration;
}

export interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  successRate: number;
  averageScore: number;
  criteriaBreakdown: Record<string, number>;
  commonIssues: string[];
  topPerformingScenarios: string[];
  worstPerformingScenarios: string[];
}

export interface TestConfiguration {
  domain: string;
  providers: {
    primary: SupportedProvider;
    secondary?: SupportedProvider;
    embedding?: SupportedEmbeddingProvider;
  };
  evaluationCriteria: string[];
  scenarioCount: number;
  personaCount: number;
  enableOptimization: boolean;
  outputFormats: ('markdown' | 'html' | 'json' | 'chatml')[];
  database?: DatabaseConfig;
  maxRetries?: number;
  timeout?: number;
  temperature?: number;
  useVectorDatabase?: boolean;
}

// Extended test configuration for full framework capabilities
export interface TestConfig {
  name: string;
  description: string;
  provider: SupportedProvider;
  embeddingProvider?: SupportedEmbeddingProvider;
  model?: string;
  embeddingModel?: string;
  maxRetries?: number;
  timeout?: number;
  temperature?: number;
  useVectorDatabase?: boolean;
  scenarios: TestScenario[];
  personas?: PersonaConfig[];
  evaluation: EvaluationConfig;
}

// Enhanced persona configuration
export interface PersonaConfig {
  id: string;
  name: string;
  description: string;
  background: string;
  preferences: Record<string, any>;
  behaviorPatterns: {
    decisionSpeed: 'quick' | 'thoughtful' | 'deliberate';
    riskTolerance: 'low' | 'medium' | 'high';
    detailLevel: 'brief' | 'moderate' | 'comprehensive';
    communicationStyle: 'direct' | 'polite' | 'casual' | 'formal';
  };
}

// Evaluation configuration
export interface EvaluationConfig {
  criteria: EvaluationCriterion[];
  thresholds: {
    accuracy?: number;
    relevance?: number;
    coherence?: number;
    completeness?: number;
  };
  customEvaluators?: CustomEvaluator[];
}

export interface EvaluationCriterion {
  name: string;
  type: 'accuracy' | 'relevance' | 'coherence' | 'completeness' | 'safety' | 'creativity' | 'custom';
  weight: number;
  description: string;
  evaluator?: string;
}

export interface CustomEvaluator {
  id: string;
  name: string;
  description: string;
  implementation: 'llm' | 'function' | 'regex' | 'api';
  config: any;
}

export interface DatabaseConfig {
  enabled: boolean;
  schema?: Record<string, TableSchema>;
  seedData?: Record<string, any[]>;
  vectorTables?: string[];
}

export interface TableSchema {
  columns: Record<string, string>;
  constraints?: string[];
  indexes?: string[];
}

export interface TestDescription {
  domain: string;
  description: string;
  criteria: string[];
  count?: number;
  difficulties?: string[];
  context?: Record<string, any>;
  databaseRequirements?: DatabaseRequirement[];
}

export interface DatabaseRequirement {
  table: string;
  description: string;
  columns: Record<string, string>;
  seedCount?: number;
  needsVectors?: boolean;
}

export interface PersonaRequirements {
  domain: string;
  types: string[];
  count: number;
  diversity?: 'low' | 'medium' | 'high';
  expertise?: ('novice' | 'intermediate' | 'expert')[];
  traits?: Partial<PersonalityTraits>[];
}

// Event types for real-time updates
export interface TestEvent {
  type: 'scenario_started' | 'scenario_completed' | 'test_completed' | 'error' | 'progress';
  data: any;
  timestamp: string;
}

export type TestEventHandler = (event: TestEvent) => void;

// Progress tracking
export interface TestProgress {
  current: number;
  total: number;
  currentScenario?: string;
  currentPersona?: string;
  timeElapsed: number;
  estimatedTimeRemaining?: number;
  completedTests: TestResult[];
}

// Test execution types
export interface TestExecution {
  id: string;
  configId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  progress: {
    completed: number;
    total: number;
    currentScenario?: string;
    errors: number;
  };
  results: TestResult[];
  summary?: TestSummary;
  metadata: {
    provider: string;
    model: string;
    totalTokens: number;
    totalCost: number;
    environment: string;
  };
}

// Extended scenario input/output types
export interface ScenarioInput {
  id: string;
  prompt: string;
  context?: string;
  variables?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface ExpectedOutput {
  id: string;
  type: 'exact' | 'contains' | 'pattern' | 'json_schema' | 'similarity' | 'custom';
  value: any;
  threshold?: number;
  description?: string;
}

// Response generation types
export interface ResponseGenerationRequest {
  prompt: string;
  context?: string;
  persona?: PersonaConfig;
  scenario?: TestScenario;
  variables?: Record<string, any>;
  options?: {
    temperature?: number;
    maxTokens?: number;
    stopSequences?: string[];
    jsonMode?: boolean;
  };
}

export interface ResponseGenerationResult {
  content: string;
  metadata: {
    model: string;
    tokens: number;
    latency: number;
    cost: number;
    finishReason: string;
  };
  reasoning?: string;
  confidence?: number;
}

// Database and data types
export interface TestData {
  id: string;
  category: string;
  type: 'customer' | 'product' | 'order' | 'support_ticket' | 'content' | 'custom';
  data: any;
  metadata: {
    source: string;
    created: Date;
    tags: string[];
  };
  embeddings?: {
    provider: string;
    model: string;
    vector: number[];
    dimensions: number;
  };
}

export interface TestDatabase {
  id: string;
  name: string;
  description: string;
  schema: Record<string, any>;
  data: TestData[];
  vectorConfig?: {
    provider: SupportedEmbeddingProvider;
    model: string;
    dimensions: number;
    textColumn: string;
  };
  statistics: {
    totalRecords: number;
    categories: Record<string, number>;
    embeddingCoverage: number;
  };
}

// Optimization types
export interface OptimizationConfig {
  enabled: boolean;
  strategy: 'genetic' | 'hill_climbing' | 'random_search' | 'bayesian';
  objectives: OptimizationObjective[];
  parameters: OptimizationParameter[];
  constraints: OptimizationConstraint[];
  generations?: number;
  populationSize?: number;
  mutationRate?: number;
  crossoverRate?: number;
}

export interface OptimizationObjective {
  name: string;
  type: 'maximize' | 'minimize';
  weight: number;
  target?: number;
}

export interface OptimizationParameter {
  name: string;
  type: 'continuous' | 'discrete' | 'categorical';
  range: any[];
  default: any;
  description: string;
}

export interface OptimizationConstraint {
  name: string;
  type: 'hard' | 'soft';
  condition: string;
  penalty?: number;
}

export interface OptimizationResult {
  bestConfig: Record<string, any>;
  bestScore: number;
  history: Array<{
    generation: number;
    bestScore: number;
    averageScore: number;
    config: Record<string, any>;
  }>;
  convergence: {
    converged: boolean;
    generations: number;
    improvement: number;
  };
  recommendations: string[];
}

// Reporting types
export interface ReportConfig {
  format: 'html' | 'pdf' | 'json' | 'csv' | 'markdown';
  sections: ReportSection[];
  style?: {
    theme: 'light' | 'dark' | 'corporate';
    colors: Record<string, string>;
    fonts: Record<string, string>;
  };
  export?: {
    chatML?: boolean;
    includeRawData?: boolean;
    compressData?: boolean;
  };
}

export interface ReportSection {
  id: string;
  title: string;
  type: 'summary' | 'detailed_results' | 'analysis' | 'recommendations' | 'raw_data' | 'charts' | 'custom';
  enabled: boolean;
  config?: any;
}

export interface GeneratedReport {
  id: string;
  testExecutionId: string;
  format: string;
  content: string | Buffer;
  metadata: {
    generated: Date;
    size: number;
    sections: string[];
  };
  exports?: {
    chatML?: string;
    rawData?: any;
  };
}

// Streaming and real-time types
export interface StreamingUpdate {
  type: 'progress' | 'result' | 'error' | 'summary' | 'log';
  timestamp: Date;
  data: any;
  executionId: string;
}

export interface StreamingConfig {
  enabled: boolean;
  bufferSize?: number;
  flushInterval?: number;
  includeRawResponses?: boolean;
  includeEvaluations?: boolean;
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
  };
}

export interface ChatMLExport {
  conversations: ChatMLConversation[];
  metadata: {
    testName: string;
    totalConversations: number;
    totalMessages: number;
    exportDate: string;
    version: string;
  };
}

// Error and validation types
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

export interface TestFrameworkError extends Error {
  code: string;
  category: 'config' | 'execution' | 'evaluation' | 'data' | 'provider' | 'system';
  details?: any;
  recoverable: boolean;
}

// Utility types
export type TestStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type EvaluationType = 'accuracy' | 'relevance' | 'coherence' | 'completeness' | 'safety' | 'creativity' | 'custom';
export type ScenarioCategory = 'customer-service' | 'content-generation' | 'data-retrieval' | 'reasoning' | 'creative' | 'technical' | 'custom';
export type ReportFormat = 'html' | 'pdf' | 'json' | 'csv' | 'markdown';
export type OptimizationStrategy = 'genetic' | 'hill_climbing' | 'random_search' | 'bayesian';