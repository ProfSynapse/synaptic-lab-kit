/**
 * Response Evaluator
 * Evaluates LLM responses against defined criteria
 */

import { EvaluationConfig, EvaluationResult, EvaluationCriterion, CustomEvaluator } from './types';

export class ResponseEvaluator {
  private criteria: EvaluationCriterion[] = [];
  private thresholds: Record<string, number> = {};
  private customEvaluators: CustomEvaluator[] = [];

  configure(config: {
    criteria: EvaluationCriterion[];
    thresholds?: Record<string, number>;
    customEvaluators?: CustomEvaluator[];
  }): void {
    this.criteria = config.criteria;
    this.thresholds = config.thresholds || {};
    this.customEvaluators = config.customEvaluators || [];
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

  private evaluateAccuracy(prompt: string, response: string, scenario?: any): number {
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

  private evaluateCompleteness(prompt: string, response: string, scenario?: any): number {
    if (!response || response.trim().length === 0) return 0;
    
    // Check if response addresses the prompt comprehensively
    const promptQuestions = (prompt.match(/\?/g) || []).length;
    const responseLength = response.length;
    
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
    prompt: string,
    response: string,
    scenario?: any,
    persona?: any
  ): Promise<number> {
    const evaluator = this.customEvaluators.find(e => e.id === criterion.evaluator);
    if (!evaluator) {
      console.warn(`Custom evaluator ${criterion.evaluator} not found`);
      return 0.5;
    }
    
    switch (evaluator.implementation) {
      case 'regex':
        const pattern = new RegExp(evaluator.config.pattern, evaluator.config.flags || 'i');
        return pattern.test(response) ? 1.0 : 0.0;
        
      case 'function':
        // Would implement custom function evaluation
        return 0.5;
        
      case 'llm':
        // Would implement LLM-based evaluation
        return 0.5;
        
      case 'api':
        // Would implement external API evaluation
        return 0.5;
        
      default:
        return 0.5;
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
