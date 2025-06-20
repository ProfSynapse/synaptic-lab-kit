/**
 * Optimization types and interfaces
 * Based on patterns from existing prompt optimization framework
 * Extended with Hugging Face dataset and model support
 */

export interface OptimizationConfig {
  enabled: boolean;
  strategy: OptimizationStrategy;
  objectives: OptimizationObjective[];
  parameters: OptimizationParameter[];
  constraints: OptimizationConstraint[];
  generations?: number;
  populationSize?: number;
  mutationRate?: number;
  crossoverRate?: number;
  convergenceThreshold?: number;
  maxStagnation?: number;
}

export type OptimizationStrategy = 
  | 'genetic'
  | 'hill_climbing' 
  | 'random_search'
  | 'bayesian'
  | 'gradient_descent'
  | 'simulated_annealing';

export interface OptimizationObjective {
  name: string;
  type: 'maximize' | 'minimize';
  weight: number;
  target?: number;
  tolerance?: number;
}

export interface OptimizationParameter {
  name: string;
  type: 'continuous' | 'discrete' | 'categorical';
  range: any[];
  default: any;
  description: string;
  constraints?: ParameterConstraint[];
}

export interface ParameterConstraint {
  type: 'min' | 'max' | 'step' | 'enum' | 'regex';
  value: any;
}

export interface OptimizationConstraint {
  name: string;
  type: 'hard' | 'soft';
  condition: string;
  penalty?: number;
  tolerance?: number;
}

export interface OptimizationResult {
  bestConfig: Record<string, any>;
  bestScore: number;
  history: OptimizationIteration[];
  convergence: ConvergenceInfo;
  recommendations: string[];
  metadata: {
    strategy: OptimizationStrategy;
    totalIterations: number;
    totalTime: number;
    startTime: Date;
    endTime: Date;
  };
}

export interface OptimizationIteration {
  generation: number;
  bestScore: number;
  averageScore: number;
  worstScore: number;
  config: Record<string, any>;
  timestamp: Date;
  diversity?: number;
  stagnation?: number;
}

export interface ConvergenceInfo {
  converged: boolean;
  generations: number;
  improvement: number;
  stagnationCount: number;
  reason: 'threshold' | 'stagnation' | 'maxGenerations' | 'userStop';
}

export interface PromptOptimizationConfig extends OptimizationConfig {
  basePrompt: string;
  testScenarios: any[];
  evaluationCriteria: string[];
  providers: string[];
  models: string[];
}

export interface PromptVariation {
  id: string;
  prompt: string;
  score: number;
  generation: number;
  parent?: string;
  mutations: string[];
  metadata: {
    tokens: number;
    cost: number;
    latency: number;
    created: Date;
  };
}

export interface OptimizationMetrics {
  accuracy: number;
  relevance: number;
  coherence: number;
  completeness: number;
  efficiency: number;
  cost: number;
  latency: number;
  custom?: Record<string, number>;
}

export interface OptimizationProgress {
  currentGeneration: number;
  totalGenerations: number;
  bestScore: number;
  averageScore: number;
  improvementRate: number;
  timeElapsed: number;
  estimatedTimeRemaining?: number;
  stagnationCount: number;
  currentBest: Record<string, any>;
}

export interface OptimizationEvent {
  type: 'iteration' | 'improvement' | 'stagnation' | 'convergence' | 'error';
  data: any;
  timestamp: Date;
}

export type OptimizationEventHandler = (event: OptimizationEvent) => void;

// Hugging Face Dataset Types
export interface OptimizationDataset {
  id: string;
  name: string;
  description: string;
  source: 'huggingface' | 'local' | 'synthetic';
  rows: DatasetRow[];
  metadata: DatasetMetadata;
}

export interface DatasetRow {
  id: string;
  data: Record<string, any>;
  metadata?: {
    originalIndex?: number;
    source?: string;
    tags?: string[];
    [key: string]: any;
  };
}

export interface DatasetMetadata {
  totalRows: number;
  columns: string[];
  loadedAt: Date;
  source?: string;
  repository?: string;
  subset?: string;
  split?: string;
  [key: string]: any;
}

export interface DatasetConfig {
  name: string;
  description?: string;
  maxRows?: number;
  validation?: {
    required_columns?: string[];
    data_types?: Record<string, string>;
    constraints?: Record<string, any>;
  };
}

// Hugging Face Model Integration Types
export interface HuggingFaceOptimizationConfig extends OptimizationConfig {
  dataset?: OptimizationDataset;
  datasetConfig?: DatasetConfig;
  modelConfigs?: HuggingFaceModelConfig[];
  evaluationDataset?: OptimizationDataset;
  benchmarkModels?: string[];
}

export interface HuggingFaceModelConfig {
  modelId: string;
  task?: 'text-generation' | 'text2text-generation' | 'conversational' | 'feature-extraction';
  token?: string;
  useInferenceAPI?: boolean;
  useTransformersJS?: boolean;
  parameters?: Record<string, any>;
  quantized?: boolean;
  revision?: string;
}

// Extended Optimization Result with HF Support
export interface HuggingFaceOptimizationResult extends OptimizationResult {
  datasetMetrics?: {
    totalSamples: number;
    trainingSamples: number;
    validationSamples: number;
    testSamples: number;
    datasetQuality: number;
  };
  modelComparisons?: ModelComparisonResult[];
  huggingFaceMetadata?: {
    datasetsUsed: string[];
    modelsEvaluated: string[];
    totalInferences: number;
    averageInferenceTime: number;
  };
}

export interface ModelComparisonResult {
  modelId: string;
  score: number;
  metrics: OptimizationMetrics;
  performance: {
    latency: number;
    throughput: number;
    memoryUsage?: number;
    cost?: number;
  };
  recommendation: 'excellent' | 'good' | 'fair' | 'poor';
  notes: string[];
}
