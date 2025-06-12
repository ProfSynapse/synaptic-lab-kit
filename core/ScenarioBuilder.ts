/**
 * Scenario Builder
 * Creates test scenarios from natural language descriptions
 */

import { TestScenario, TestDescription, ScenarioInput, ExpectedOutput } from './types';

export class ScenarioBuilder {
  private templates: Record<string, Partial<TestScenario>> = {
    'customer-service': {
      category: 'customer-service',
      description: 'Customer support interaction',
      expectedBehavior: 'Provide helpful, accurate, and empathetic assistance',
      evaluationCriteria: ['accuracy', 'relevance', 'completeness', 'safety']
    },
    'data-retrieval': {
      category: 'data-retrieval',
      description: 'Information lookup and retrieval',
      expectedBehavior: 'Accurately find and present requested information',
      evaluationCriteria: ['accuracy', 'relevance', 'completeness']
    },
    'content-generation': {
      category: 'content-generation',
      description: 'Creative or informational content creation',
      expectedBehavior: 'Generate relevant, coherent, and engaging content',
      evaluationCriteria: ['creativity', 'coherence', 'relevance']
    },
    'reasoning': {
      category: 'reasoning',
      description: 'Logical reasoning and problem solving',
      expectedBehavior: 'Demonstrate clear logical thinking and reasoning',
      evaluationCriteria: ['accuracy', 'coherence', 'completeness']
    }
  };

  /**
   * Build scenarios from natural language description
   */
  async buildScenarios(description: TestDescription): Promise<TestScenario[]> {
    const scenarios: TestScenario[] = [];
    const count = description.count || 5;
    
    // Get base template for the domain
    const template = this.getTemplate(description.domain);
    
    // Generate scenarios
    for (let i = 0; i < count; i++) {
      const scenario = await this.createScenario({
        ...template,
        id: `${description.domain}_${i + 1}`,
        description: this.enhanceDescription(template.description || '', description.description, i),
        evaluationCriteria: description.criteria.length > 0 ? description.criteria : template.evaluationCriteria || [],
        context: description.context,
        difficulty: this.assignDifficulty(i, count, description.difficulties)
      });
      
      scenarios.push(scenario);
    }
    
    return scenarios;
  }

  /**
   * Create a single scenario
   */
  async createScenario(config: Partial<TestScenario> & { id: string }): Promise<TestScenario> {
    const scenario: TestScenario = {
      id: config.id,
      description: config.description || 'Test scenario',
      category: config.category || 'custom',
      userInput: config.userInput || this.generateUserInput(config),
      expectedBehavior: config.expectedBehavior || 'Provide appropriate response',
      evaluationCriteria: config.evaluationCriteria || ['accuracy', 'relevance'],
      context: config.context,
      difficulty: config.difficulty || 'medium',
      tags: config.tags || [config.category || 'general'],
      metadata: config.metadata || {},
      inputs: config.inputs || [{
        id: 'default',
        prompt: config.userInput || this.generateUserInput(config),
        context: config.context
      }],
      expectedOutputs: config.expectedOutputs,
      instructions: config.instructions,
      data: config.data
    };
    
    return scenario;
  }

  /**
   * Create scenario inputs with variations
   */
  createScenarioInputs(basePrompt: string, variations: number = 3): ScenarioInput[] {
    const inputs: ScenarioInput[] = [];
    
    // Base input
    inputs.push({
      id: 'base',
      prompt: basePrompt
    });
    
    // Generate variations
    for (let i = 1; i < variations; i++) {
      inputs.push({
        id: `variation_${i}`,
        prompt: this.createVariation(basePrompt, i),
        metadata: { variationType: 'linguistic', variationIndex: i }
      });
    }
    
    return inputs;
  }

  /**
   * Create expected outputs for validation
   */
  createExpectedOutputs(config: {
    exactMatches?: string[];
    containsText?: string[];
    patterns?: string[];
    jsonSchema?: any;
  }): ExpectedOutput[] {
    const outputs: ExpectedOutput[] = [];
    
    if (config.exactMatches) {
      config.exactMatches.forEach((text, index) => {
        outputs.push({
          id: `exact_${index}`,
          type: 'exact',
          value: text,
          description: `Must contain exact text: ${text}`
        });
      });
    }
    
    if (config.containsText) {
      config.containsText.forEach((text, index) => {
        outputs.push({
          id: `contains_${index}`,
          type: 'contains',
          value: text,
          description: `Must contain: ${text}`
        });
      });
    }
    
    if (config.patterns) {
      config.patterns.forEach((pattern, index) => {
        outputs.push({
          id: `pattern_${index}`,
          type: 'pattern',
          value: pattern,
          description: `Must match pattern: ${pattern}`
        });
      });
    }
    
    if (config.jsonSchema) {
      outputs.push({
        id: 'json_schema',
        type: 'json_schema',
        value: config.jsonSchema,
        description: 'Must conform to JSON schema'
      });
    }
    
    return outputs;
  }

  /**
   * Create scenario for specific domain
   */
  createDomainScenario(domain: string, config: {
    userQuery: string;
    expectedData?: any[];
    context?: Record<string, any>;
    difficulty?: 'easy' | 'medium' | 'hard';
  }): TestScenario {
    const template = this.getTemplate(domain);
    
    return {
      id: `${domain}_${Date.now()}`,
      description: `${domain} scenario: ${config.userQuery}`,
      category: domain as any,
      userInput: config.userQuery,
      expectedBehavior: template.expectedBehavior || 'Provide appropriate response',
      evaluationCriteria: template.evaluationCriteria || ['accuracy', 'relevance'],
      context: config.context,
      difficulty: config.difficulty || 'medium',
      tags: [domain],
      metadata: { domain, generatedAt: new Date().toISOString() },
      inputs: [{
        id: 'primary',
        prompt: config.userQuery,
        context: JSON.stringify(config.context)
      }],
      data: config.expectedData
    };
  }

  // Private helper methods

  private getTemplate(domain: string): Partial<TestScenario> {
    return this.templates[domain] || this.templates['customer-service'];
  }

  private enhanceDescription(baseDescription: string, userDescription: string, index: number): string {
    const variations = [
      `Scenario ${index + 1}: ${userDescription}`,
      `Test case ${index + 1}: ${userDescription} with ${baseDescription.toLowerCase()}`,
      `Variation ${index + 1}: ${userDescription} focusing on ${baseDescription.toLowerCase()}`
    ];
    
    return variations[index % variations.length];
  }

  private generateUserInput(config: Partial<TestScenario>): string {
    const category = config.category || 'general';
    
    const prompts: Record<string, string[]> = {
      'customer-service': [
        'I need help with my account',
        'How do I return a product?',
        'My order hasn\'t arrived yet',
        'Can you explain your pricing?'
      ],
      'data-retrieval': [
        'Find information about our latest products',
        'What are the sales figures for last quarter?',
        'Show me customer feedback data',
        'Retrieve user account details'
      ],
      'content-generation': [
        'Write a product description',
        'Create a marketing email',
        'Generate a blog post outline',
        'Draft a social media post'
      ],
      'reasoning': [
        'Analyze this business problem',
        'What\'s the best approach to solve this?',
        'Compare these two options',
        'Recommend a course of action'
      ]
    };
    
    const categoryPrompts = prompts[category] || prompts['customer-service'];
    return categoryPrompts[Math.floor(Math.random() * categoryPrompts.length)];
  }

  private assignDifficulty(
    index: number, 
    total: number, 
    requestedDifficulties?: string[]
  ): 'easy' | 'medium' | 'hard' {
    if (requestedDifficulties && requestedDifficulties.length > 0) {
      const difficulty = requestedDifficulties[index % requestedDifficulties.length];
      return difficulty as 'easy' | 'medium' | 'hard';
    }
    
    // Default distribution: 40% easy, 40% medium, 20% hard
    const ratio = index / total;
    if (ratio < 0.4) return 'easy';
    if (ratio < 0.8) return 'medium';
    return 'hard';
  }

  private createVariation(basePrompt: string, variationIndex: number): string {
    const variations = [
      // More formal
      basePrompt.replace(/can you/gi, 'could you please').replace(/\?$/, ' if possible?'),
      // More casual
      basePrompt.replace(/could you please/gi, 'can you').replace(/if possible\?$/, '?'),
      // More urgent
      `I urgently need to ${basePrompt.toLowerCase().replace(/^(can|could)\s+(you\s+)?/i, '')}`,
      // More detailed
      `${basePrompt} I would appreciate detailed information about this.`
    ];
    
    return variations[variationIndex - 1] || basePrompt;
  }

  /**
   * Add custom scenario template
   */
  addTemplate(domain: string, template: Partial<TestScenario>): void {
    this.templates[domain] = template;
  }

  /**
   * Get available scenario categories
   */
  getAvailableCategories(): string[] {
    return Object.keys(this.templates);
  }
}
