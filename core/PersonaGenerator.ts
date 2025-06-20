/**
 * Persona Generator
 * Creates realistic user personas for testing
 */

import { PersonaRequirements, PersonaConfig } from './types';

export class PersonaGenerator {
  private templates: Record<string, Partial<PersonaConfig>> = {
    novice: {
      name: 'Novice User',
      description: 'New to the system with basic needs',
      background: 'Limited experience with similar tools',
      behaviorPatterns: {
        decisionSpeed: 'thoughtful',
        riskTolerance: 'low',
        detailLevel: 'comprehensive',
        communicationStyle: 'polite'
      }
    },
    expert: {
      name: 'Expert User',
      description: 'Experienced user with advanced requirements',
      background: 'Extensive experience with similar systems',
      behaviorPatterns: {
        decisionSpeed: 'quick',
        riskTolerance: 'high',
        detailLevel: 'brief',
        communicationStyle: 'direct'
      }
    },
    frustrated: {
      name: 'Frustrated User',
      description: 'User experiencing issues and seeking help',
      background: 'Has encountered problems and needs resolution',
      behaviorPatterns: {
        decisionSpeed: 'quick',
        riskTolerance: 'low',
        detailLevel: 'moderate',
        communicationStyle: 'direct'
      }
    },
    business: {
      name: 'Business User',
      description: 'Professional user focused on business outcomes',
      background: 'Works in a corporate environment with specific goals',
      behaviorPatterns: {
        decisionSpeed: 'thoughtful',
        riskTolerance: 'medium',
        detailLevel: 'moderate',
        communicationStyle: 'formal'
      }
    }
  };

  async generatePersonas(requirements: PersonaRequirements): Promise<PersonaConfig[]> {
    const personas: PersonaConfig[] = [];
    
    // Generate based on types requested
    const types = requirements.types.length > 0 ? requirements.types : ['novice', 'expert', 'frustrated'];
    
    for (let i = 0; i < requirements.count; i++) {
      const typeIndex = i % types.length;
      const type = types[typeIndex];
      if (!type) continue;
      const template = this.templates[type] || this.templates.novice;
      if (!template) continue;
      
      const persona: PersonaConfig = {
        id: `${type}_${i + 1}`,
        name: `${template.name} ${i + 1}`,
        description: this.customizeDescription(template.description || '', requirements.domain),
        background: this.customizeBackground(template.background || '', requirements.domain),
        preferences: this.generatePreferences(type, requirements.domain || ''),
        behaviorPatterns: template.behaviorPatterns || {
          decisionSpeed: 'thoughtful',
          riskTolerance: 'medium',
          detailLevel: 'moderate',
          communicationStyle: 'polite'
        }
      };
      
      personas.push(persona);
    }
    
    return personas;
  }

  private customizeDescription(baseDescription: string, domain: string): string {
    const domainDescriptions: Record<string, string> = {
      'customer-service': 'seeking help with product or service issues',
      'e-commerce': 'looking to make purchases or manage orders',
      'content-management': 'managing and organizing content',
      'technical-support': 'needing technical assistance and troubleshooting',
      'finance': 'handling financial transactions and account management'
    };
    
    const domainDesc = domainDescriptions[domain] || 'using the system';
    return `${baseDescription} when ${domainDesc}`;
  }

  private customizeBackground(baseBackground: string, domain: string): string {
    const domainBackgrounds: Record<string, string> = {
      'customer-service': 'Has contacted customer service before with mixed experiences',
      'e-commerce': 'Regular online shopper familiar with e-commerce platforms',
      'content-management': 'Works with content creation and organization tools',
      'technical-support': 'Has varying levels of technical expertise',
      'finance': 'Manages financial accounts and transactions regularly'
    };
    
    const domainBg = domainBackgrounds[domain] || 'Has general experience with digital tools';
    return `${baseBackground}. ${domainBg}.`;
  }

  private generatePreferences(type: string, domain: string): Record<string, any> {
    const basePreferences: Record<string, Record<string, any>> = {
      novice: {
        needsGuidance: true,
        prefersStepByStep: true,
        wantsExplanations: true,
        comfortWithTechnology: 'low'
      },
      expert: {
        needsGuidance: false,
        prefersStepByStep: false,
        wantsExplanations: false,
        comfortWithTechnology: 'high',
        wantsAdvancedFeatures: true
      },
      frustrated: {
        needsGuidance: true,
        prefersStepByStep: true,
        wantsQuickResolution: true,
        hasLimitedPatience: true
      },
      business: {
        needsGuidance: false,
        prefersStepByStep: false,
        focusedOnROI: true,
        wantsReporting: true,
        comfortWithTechnology: 'medium'
      }
    };
    
    const domainPreferences: Record<string, Record<string, any>> = {
      'customer-service': {
        expectsQuickResponse: true,
        wantsPersonalizedHelp: true
      },
      'e-commerce': {
        careAboutPrice: true,
        wantsProductDetails: true,
        concernedAboutSecurity: true
      },
      'content-management': {
        organizationFocused: true,
        wantsCollaboration: true
      }
    };
    
    return {
      ...basePreferences[type] || {},
      ...domainPreferences[domain] || {}
    };
  }

  /**
   * Generate a single persona with specific characteristics
   */
  generatePersona(config: {
    type?: string;
    domain?: string;
    name?: string;
    customTraits?: Record<string, any>;
  }): PersonaConfig {
    const type = config.type || 'novice';
    const template = this.templates[type] || this.templates.novice;
    
    if (!template) {
      throw new Error('No template available for persona generation');
    }
    
    return {
      id: `custom_${Date.now()}`,
      name: config.name || template.name || 'Custom User',
      description: template.description || 'Custom user persona',
      background: template.background || 'Custom background',
      preferences: {
        ...this.generatePreferences(type, config.domain || 'general'),
        ...config.customTraits
      },
      behaviorPatterns: template.behaviorPatterns || {
        decisionSpeed: 'thoughtful',
        riskTolerance: 'medium',
        detailLevel: 'moderate',
        communicationStyle: 'polite'
      }
    };
  }

  /**
   * Add a custom persona template
   */
  addTemplate(name: string, template: Partial<PersonaConfig>): void {
    this.templates[name] = template;
  }

  /**
   * Get available persona types
   */
  getAvailableTypes(): string[] {
    return Object.keys(this.templates);
  }
}
