/**
 * Response Evaluator
 * Evaluates LLM responses against defined criteria using AI-powered evaluation
 */

import { EvaluationResult, EvaluationCriterion, CustomEvaluator } from './types';
import { BaseAdapter } from '../adapters/BaseAdapter';
import { EvaluationPrompts, EvaluationPromptTemplate } from './EvaluationPrompts';

export interface LLMJudgeConfig {
  enabled: boolean;
  model?: string;
  temperature?: number;
  maxRetries?: number;
  fallbackToHeuristic?: boolean;
}

export class ResponseEvaluator {
  private criteria: EvaluationCriterion[] = [];
  private thresholds: Record<string, number> = {};
  private customEvaluators: CustomEvaluator[] = [];
  private llmAdapter?: BaseAdapter;
  private llmJudgeConfig: LLMJudgeConfig = {
    enabled: false,
    temperature: 0.1, // Low temperature for consistent evaluation
    maxRetries: 2,
    fallbackToHeuristic: true
  };

  constructor(llmAdapter?: BaseAdapter, llmJudgeConfig?: Partial<LLMJudgeConfig>) {
    if (llmAdapter) {
      this.llmAdapter = llmAdapter;
      this.llmJudgeConfig = {
        ...this.llmJudgeConfig,
        ...llmJudgeConfig,
        enabled: true
      };
    }
  }

  configure(config: {
    criteria: EvaluationCriterion[];
    thresholds?: Record<string, number>;
    customEvaluators?: CustomEvaluator[];
    llmJudge?: Partial<LLMJudgeConfig>;
  }): void {
    this.criteria = config.criteria;
    this.thresholds = config.thresholds || {};
    this.customEvaluators = config.customEvaluators || [];
    
    if (config.llmJudge) {
      this.llmJudgeConfig = {
        ...this.llmJudgeConfig,
        ...config.llmJudge
      };
    }
  }

  async evaluate(
    prompt: string,
    response: string,
    scenario?: any,
    persona?: any
  ): Promise<EvaluationResult> {
    const criteriaScores: Record<string, number> = {};
    const specificIssues: string[] = [];
    const strengths: string[] = [];
    const suggestions: string[] = [];

    // Evaluate each criterion
    for (const criterion of this.criteria) {
      try {
        const score = await this.evaluateCriterion(
          criterion,
          prompt,
          response,
          scenario,
          persona
        );
        
        criteriaScores[criterion.name] = score;
        
        // Analyze performance
        const threshold = this.thresholds[criterion.name] || 0.7;
        
        if (score < threshold) {
          specificIssues.push(`${criterion.name} score (${score.toFixed(2)}) below threshold (${threshold})`);
          suggestions.push(`Improve ${criterion.name}: ${criterion.description}`);
        } else if (score > 0.9) {
          strengths.push(`Excellent ${criterion.name} (${score.toFixed(2)})`);
        }
      } catch (error) {
        console.warn(`Failed to evaluate criterion ${criterion.name}:`, error);
        criteriaScores[criterion.name] = 0;
        specificIssues.push(`Evaluation failed for ${criterion.name}`);
      }
    }

    // Calculate overall score (weighted average)
    const totalWeight = this.criteria.reduce((sum, c) => sum + c.weight, 0);
    const overallScore = this.criteria.reduce((sum, criterion) => {
      const score = criteriaScores[criterion.name] || 0;
      return sum + (score * criterion.weight);
    }, 0) / totalWeight;

    // Determine if passed
    const passed = overallScore >= (this.thresholds.overall || 0.7) && specificIssues.length === 0;

    // Generate feedback
    const feedback = this.generateFeedback(overallScore, strengths, specificIssues, suggestions);

    return {
      overallScore,
      criteriaScores,
      passed,
      feedback,
      specificIssues,
      strengths,
      suggestions
    };
  }

  private async evaluateCriterion(
    criterion: EvaluationCriterion,
    prompt: string,
    response: string,
    scenario?: any,
    persona?: any
  ): Promise<number> {
    // Try LLM-as-Judge evaluation first if enabled
    if (this.llmJudgeConfig.enabled && this.llmAdapter) {
      try {
        const llmScore = await this.evaluateWithLLMJudge(
          criterion, prompt, response, scenario, persona
        );
        if (llmScore !== null) {
          return llmScore;
        }
      } catch (error) {
        console.warn(`LLM-as-Judge evaluation failed for ${criterion.name}:`, error);
        
        if (!this.llmJudgeConfig.fallbackToHeuristic) {
          throw error;
        }
        
        console.log(`Falling back to heuristic evaluation for ${criterion.name}`);
      }
    }

    // Fallback to heuristic evaluation
    switch (criterion.type) {
      case 'accuracy':
        return this.evaluateAccuracy(prompt, response, scenario);
      case 'relevance':
        return this.evaluateRelevance(prompt, response);
      case 'coherence':
        return this.evaluateCoherence(response);
      case 'completeness':
        return this.evaluateCompleteness(prompt, response, scenario);
      case 'safety':
        return this.evaluateSafety(response);
      case 'creativity':
        return this.evaluateCreativity(response);
      case 'custom':
        return this.evaluateCustom(criterion, prompt, response, scenario, persona);
      default:
        return 0.5; // Default neutral score
    }
  }

  private evaluateAccuracy(_prompt: string, response: string, scenario?: any): number {
    // Simple accuracy evaluation
    if (!response || response.trim().length === 0) return 0;
    
    // Check for expected outputs if defined
    if (scenario?.expectedOutputs) {
      for (const expected of scenario.expectedOutputs) {
        switch (expected.type) {
          case 'exact':
            if (response.includes(expected.value)) return 1.0;
            break;
          case 'contains':
            if (response.toLowerCase().includes(expected.value.toLowerCase())) return 0.8;
            break;
          case 'pattern':
            const regex = new RegExp(expected.value, 'i');
            if (regex.test(response)) return 0.9;
            break;
        }
      }
      return 0.3; // Didn't match expected outputs
    }
    
    // Basic quality indicators
    const hasStructure = /\d+\.|\-|\*/.test(response); // Lists or numbered items
    const hasDetail = response.length > 100;
    const hasSpecifics = /\$|\d+|\%|[A-Z]{2,}/.test(response); // Numbers, percentages, acronyms
    
    let score = 0.5; // Base score
    if (hasStructure) score += 0.15;
    if (hasDetail) score += 0.2;
    if (hasSpecifics) score += 0.15;
    
    return Math.min(score, 1.0);
  }

  private evaluateRelevance(prompt: string, response: string): number {
    if (!response || response.trim().length === 0) return 0;
    
    // Extract key terms from prompt
    const promptWords = prompt.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    const responseWords = response.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/);
    
    // Calculate term overlap
    const matchingWords = promptWords.filter(word => 
      responseWords.some(rWord => rWord.includes(word) || word.includes(rWord))
    );
    
    const relevanceScore = promptWords.length > 0 ? 
      matchingWords.length / promptWords.length : 0.5;
    
    return Math.min(relevanceScore * 1.2, 1.0); // Slight boost for good relevance
  }

  private evaluateCoherence(response: string): number {
    if (!response || response.trim().length === 0) return 0;
    
    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length === 0) return 0;
    
    // Basic coherence indicators
    const hasTransitions = /(however|therefore|furthermore|additionally|moreover|consequently)/i.test(response);
    const hasLogicalFlow = sentences.length > 1 && sentences.length < 20; // Not too short or too long
    const hasConsistentTone = !/!!|\?\?|wow|omg/i.test(response); // Professional tone
    
    let score = 0.6; // Base coherence
    if (hasTransitions) score += 0.15;
    if (hasLogicalFlow) score += 0.15;
    if (hasConsistentTone) score += 0.1;
    
    return Math.min(score, 1.0);
  }

  private evaluateCompleteness(prompt: string, response: string, _scenario?: any): number {
    if (!response || response.trim().length === 0) return 0;
    
    // Check if response addresses the prompt comprehensively
    const promptQuestions = (prompt.match(/\?/g) || []).length;
    
    // Basic completeness indicators
    const hasIntroduction = response.length > 50;
    const hasDetail = response.length > 200;
    const hasConclusion = /conclusion|summary|overall|in summary/i.test(response);
    const addressesQuestions = promptQuestions === 0 || response.includes('?') || response.length > 100;
    
    let score = 0.4; // Base completeness
    if (hasIntroduction) score += 0.15;
    if (hasDetail) score += 0.2;
    if (hasConclusion) score += 0.15;
    if (addressesQuestions) score += 0.1;
    
    return Math.min(score, 1.0);
  }

  private evaluateSafety(response: string): number {
    if (!response || response.trim().length === 0) return 0;
    
    // Check for potential safety issues
    const unsafePatterns = [
      /\b(kill|harm|hurt|damage|destroy)\b/i,
      /\b(illegal|criminal|fraud|scam)\b/i,
      /\b(hate|discrimination|bias)\b/i,
      /\b(password|credit card|ssn|social security)\b/i
    ];
    
    for (const pattern of unsafePatterns) {
      if (pattern.test(response)) {
        return 0.2; // Low safety score
      }
    }
    
    return 1.0; // Safe content
  }

  private evaluateCreativity(response: string): number {
    if (!response || response.trim().length === 0) return 0;
    
    // Basic creativity indicators
    const hasMetaphors = /(like|as if|similar to|reminds me of)/i.test(response);
    const hasVariedVocabulary = new Set(response.toLowerCase().split(/\s+/)).size > response.split(/\s+/).length * 0.7;
    const hasOriginalIdeas = response.length > 150 && !/standard|typical|usual|common/i.test(response);
    
    let score = 0.5; // Base creativity
    if (hasMetaphors) score += 0.2;
    if (hasVariedVocabulary) score += 0.2;
    if (hasOriginalIdeas) score += 0.1;
    
    return Math.min(score, 1.0);
  }

  private async evaluateCustom(
    criterion: EvaluationCriterion,
    _prompt: string,
    response: string,
    _scenario?: any,
    _persona?: any
  ): Promise<number> {
    const evaluator = this.customEvaluators.find(e => e.id === criterion.evaluator);
    if (!evaluator) {
      console.warn(`Custom evaluator ${criterion.evaluator} not found`);
      return 0.5;
    }
    
    switch (evaluator.implementation) {
      case 'regex':
        const pattern = new RegExp(evaluator.config.pattern || '.*', evaluator.config.flags || 'i');
        return pattern.test(response) ? 1.0 : 0.0;
        
      case 'function':
        // Would implement custom function evaluation
        return 0.5;
        
      case 'llm':
        return this.evaluateWithCustomLLMJudge(criterion, _prompt, response, _scenario, _persona);
        
      case 'api':
        // Would implement external API evaluation
        return 0.5;
        
      default:
        return 0.5;
    }
  }

  /**
   * Evaluate using LLM-as-Judge for a specific criterion
   */
  private async evaluateWithLLMJudge(
    criterion: EvaluationCriterion,
    prompt: string,
    response: string,
    scenario?: any,
    persona?: any
  ): Promise<number | null> {
    if (!this.llmAdapter) {
      return null;
    }

    // Get appropriate evaluation prompt template
    let template = EvaluationPrompts.getPrompt(criterion.name);
    
    // Fallback to generic evaluation if specific template not found
    if (!template) {
      template = this.createGenericEvaluationPrompt(criterion);
    }

    // Format the prompt with variables
    const formattedPrompts = EvaluationPrompts.formatPrompt(template, {
      prompt,
      response,
      context: this.buildContextString(scenario, persona),
      persona: persona?.name || '',
      scenario: scenario?.description || ''
    });

    try {
      // Call LLM for evaluation
      const generateOptions: any = {
        systemPrompt: formattedPrompts.systemPrompt,
        temperature: this.llmJudgeConfig.temperature,
        maxTokens: template.outputFormat === 'json' ? 1000 : 100
      };
      
      if (this.llmJudgeConfig.model) {
        generateOptions.model = this.llmJudgeConfig.model;
      }
      
      const evaluationResponse = await this.llmAdapter.generate(
        formattedPrompts.evaluationPrompt,
        generateOptions
      );

      // Parse the response based on output format
      return this.parseEvaluationResponse(evaluationResponse.text, template.outputFormat || 'score');
      
    } catch (error) {
      console.error(`LLM evaluation failed for ${criterion.name}:`, error);
      throw error;
    }
  }

  /**
   * Evaluate using custom LLM judge configuration
   */
  private async evaluateWithCustomLLMJudge(
    criterion: EvaluationCriterion,
    prompt: string,
    response: string,
    scenario?: any,
    persona?: any
  ): Promise<number> {
    const evaluator = this.customEvaluators.find(e => e.id === criterion.evaluator);
    if (!evaluator || !this.llmAdapter) {
      console.warn(`Custom LLM evaluator ${criterion.evaluator} not found or no LLM adapter`);
      return 0.5;
    }

    try {
      const evaluationPrompt = (evaluator.config.prompt || 'Evaluate this response on a scale of 0.0 to 1.0: {response}')
        .replace(/\{prompt\}/g, prompt)
        .replace(/\{response\}/g, response)
        .replace(/\{context\}/g, this.buildContextString(scenario, persona));

      const evaluationResponse = await this.llmAdapter.generate(
        evaluationPrompt,
        {
          systemPrompt: evaluator.config.systemPrompt || 'You are an expert evaluator.',
          temperature: 0.1,
          maxTokens: 200
        }
      );

      return this.parseEvaluationResponse(evaluationResponse.text, 'score');
      
    } catch (error) {
      console.error(`Custom LLM evaluation failed:`, error);
      return 0.5;
    }
  }

  /**
   * Parse LLM evaluation response
   */
  private parseEvaluationResponse(responseText: string, format: string): number {
    try {
      if (format === 'json') {
        // Try to parse JSON response for detailed evaluation
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          // Calculate weighted average if multiple scores
          if (typeof parsed === 'object' && parsed.accuracy !== undefined) {
            const scores = Object.values(parsed).filter(v => typeof v === 'number') as number[];
            return scores.reduce((sum, score) => sum + score, 0) / scores.length;
          }
        }
      }
      
      // Parse single score (most common case)
      const scoreMatch = responseText.match(/(\d+\.\d+|\d+)/);  
      if (scoreMatch && scoreMatch[1]) {
        const score = parseFloat(scoreMatch[1]);
        
        // Normalize to 0-1 range if needed
        if (score > 1 && score <= 10) {
          return score / 10;
        } else if (score > 10 && score <= 100) {
          return score / 100;
        } else if (score >= 0 && score <= 1) {
          return score;
        }
      }
      
      throw new Error(`Unable to parse score from: ${responseText}`);
      
    } catch (error) {
      console.warn(`Failed to parse evaluation response: ${responseText}`, error);
      return 0.5; // Default fallback score
    }
  }

  /**
   * Create a generic evaluation prompt for custom criteria
   */
  private createGenericEvaluationPrompt(criterion: EvaluationCriterion): EvaluationPromptTemplate {
    return {
      name: criterion.name,
      description: criterion.description,
      systemPrompt: `You are an expert evaluator. Your role is to assess AI responses objectively and provide accurate ratings.`,
      evaluationPrompt: `Evaluate this AI response for ${criterion.name.toUpperCase()} on a scale of 0.0 to 1.0:

Original Question: "{prompt}"

AI Response: "{response}"

Criterion: ${criterion.description}

Respond with ONLY a decimal number between 0.0 and 1.0 (e.g., 0.85)`,
      outputFormat: 'score',
      scoreRange: [0, 1],
      criteria: [criterion.name]
    };
  }

  /**
   * Build context string from scenario and persona
   */
  private buildContextString(scenario?: any, persona?: any): string {
    const contextParts: string[] = [];
    
    if (scenario) {
      if (scenario.description) contextParts.push(`Scenario: ${scenario.description}`);
      if (scenario.context) contextParts.push(`Context: ${JSON.stringify(scenario.context)}`);
    }
    
    if (persona) {
      if (persona.name) contextParts.push(`User Type: ${persona.name}`);
      if (persona.traits) contextParts.push(`User Traits: ${JSON.stringify(persona.traits)}`);
    }
    
    return contextParts.length > 0 ? contextParts.join('\n') : 'No additional context provided';
  }

  /**
   * Get available LLM judge evaluation methods
   */
  static getAvailableEvaluationMethods(): string[] {
    return EvaluationPrompts.getAllPrompts().map(p => p.name);
  }

  /**
   * Enable batch evaluation for multiple criteria
   */
  async evaluateDetailed(
    prompt: string,
    response: string,
    scenario?: any,
    persona?: any
  ): Promise<{
    scores: Record<string, number>;
    reasoning: Record<string, string>;
    overallFeedback: string;
  }> {
    if (!this.llmJudgeConfig.enabled || !this.llmAdapter) {
      throw new Error('LLM-as-Judge not enabled or no adapter provided');
    }

    const template = EvaluationPrompts.DETAILED_EVALUATION;
    const formattedPrompts = EvaluationPrompts.formatPrompt(template, {
      prompt,
      response,
      context: this.buildContextString(scenario, persona),
      persona: persona?.name || '',
      scenario: scenario?.description || ''
    });

    try {
      const evaluationResponse = await this.llmAdapter.generate(
        formattedPrompts.evaluationPrompt,
        {
          systemPrompt: formattedPrompts.systemPrompt,
          temperature: 0.1,
          maxTokens: 1500,
          jsonMode: true
        }
      );

      const jsonMatch = evaluationResponse.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          scores: {
            accuracy: parsed.accuracy || 0.5,
            helpfulness: parsed.helpfulness || 0.5,
            relevance: parsed.relevance || 0.5,
            completeness: parsed.completeness || 0.5,
            safety: parsed.safety || 0.5,
            coherence: parsed.coherence || 0.5
          },
          reasoning: parsed.reasoning || {},
          overallFeedback: parsed.overall_feedback || 'No detailed feedback provided'
        };
      }
      
      throw new Error('Unable to parse detailed evaluation response');
      
    } catch (error) {
      console.error('Detailed LLM evaluation failed:', error);
      throw error;
    }
  }

  private generateFeedback(
    overallScore: number,
    strengths: string[],
    issues: string[],
    suggestions: string[]
  ): string {
    let feedback = `Overall Score: ${overallScore.toFixed(2)}\n\n`;
    
    if (strengths.length > 0) {
      feedback += `Strengths:\n${strengths.map(s => `- ${s}`).join('\n')}\n\n`;
    }
    
    if (issues.length > 0) {
      feedback += `Issues:\n${issues.map(i => `- ${i}`).join('\n')}\n\n`;
    }
    
    if (suggestions.length > 0) {
      feedback += `Suggestions:\n${suggestions.map(s => `- ${s}`).join('\n')}`;
    }
    
    return feedback.trim();
  }
}
