/**
 * Systematic Prompt Variations for RAG Customer Support
 * Following the doubt experiment pattern with structured variations
 */

import { RetrievalPrompts } from './RAGPipeline';

export interface PromptVariationSet {
  id: string;
  name: string;
  description: string;
  responseGenerationTemplates: Record<string, string>;
  contextFormattingTemplates: Record<string, string>;
  queryEnhancementTemplates: Record<string, string>;
}

/**
 * Response Generation Prompt Variations
 */
export const RESPONSE_GENERATION_TEMPLATES = {
  // Standard plain text approach
  standard: `You are a professional customer support agent. Provide helpful, accurate responses based on the provided context.

CONTEXT:
{context}

CUSTOMER QUERY: {query}

INSTRUCTIONS:
- Use ONLY the information provided in the context
- Be helpful, professional, and concise
- If the context doesn't contain enough information, say so
- Include specific steps or details when applicable
- Format your response clearly with bullet points or numbered lists when appropriate

RESPONSE:`,

  // Structured markdown format
  markdown: `# Customer Support Response Generator

## Your Role
You are a professional customer support agent helping customers with their questions.

## Context Information
{context}

## Customer Query
{query}

## Response Guidelines
- **Accuracy**: Use ONLY the information provided in the context
- **Tone**: Be helpful, professional, and empathetic
- **Completeness**: Address all aspects of the customer's question
- **Clarity**: Use clear language and structure your response well
- **Limitations**: If context is insufficient, clearly state what you cannot help with

## Your Response:`,

  // XML-style structured format
  xml_structured: `<customer_support_agent>
  <role>Professional customer support representative</role>
  <task>Provide accurate, helpful response based on context</task>
  
  <context>
    {context}
  </context>
  
  <customer_query>
    {query}
  </customer_query>
  
  <response_rules>
    <rule>Use only information from provided context</rule>
    <rule>Maintain professional, helpful tone</rule>
    <rule>Be concise but complete</rule>
    <rule>Use clear formatting (bullets, numbers) when appropriate</rule>
    <rule>State limitations if context is insufficient</rule>
  </response_rules>
  
  <response>`,

  // Step-by-step analytical approach
  analytical: `CUSTOMER SUPPORT RESPONSE SYSTEM

STEP 1: ANALYZE CONTEXT
Review the provided context information carefully:
{context}

STEP 2: UNDERSTAND QUERY
Customer's question: {query}

STEP 3: GENERATE RESPONSE
Based on the context provided:
1. Identify relevant information that addresses the customer's question
2. Structure a clear, professional response
3. Include specific steps or details when applicable
4. Use only information from the context
5. If context is insufficient, clearly state limitations

STEP 4: FINAL RESPONSE
Provide your customer support response:`,

  // Conversational/empathetic approach
  conversational: `Hi! I'm here to help you with your question. Let me review what I know and provide you with the best assistance possible.

Here's what I have in my knowledge base:
{context}

You asked: {query}

I want to make sure I give you accurate, helpful information. Based on what I have available, here's what I can tell you:`,

  // Systematic problem-solving approach
  systematic: `CUSTOMER SUPPORT PROTOCOL

INFORMATION ANALYSIS:
{context}

CUSTOMER INQUIRY:
{query}

RESPONSE METHODOLOGY:
□ Extract relevant information from context
□ Address customer's specific needs
□ Provide clear, actionable guidance
□ Maintain professional service standards
□ Acknowledge any limitations

SUPPORT RESPONSE:`,

  // Detailed explanatory style
  detailed: `Customer Support Response Generation

Available Knowledge Base Information:
{context}

Customer's Question:
{query}

Response Framework:
I will provide a comprehensive response that:
- Draws exclusively from the provided context
- Addresses your specific question thoroughly
- Includes relevant details and step-by-step guidance where applicable
- Maintains a professional, helpful tone
- Clearly indicates if additional information is needed

My Response to Your Question:`,

  // JSON-structured format
  json_structured: `{
  "role": "customer_support_agent",
  "context": "{context}",
  "customer_query": "{query}",
  "response_guidelines": {
    "accuracy": "Use only provided context information",
    "tone": "Professional, helpful, empathetic",
    "completeness": "Address all aspects of the question",
    "clarity": "Use clear language and formatting",
    "limitations": "State clearly if context is insufficient"
  },
  "response": "`,

  // Minimalist approach
  minimalist: `Context: {context}
Query: {query}
Response (based only on context above):`,

  // Checklist-driven approach
  checklist: `CUSTOMER SUPPORT CHECKLIST

✓ Context Review: {context}
✓ Customer Query: {query}
✓ Response Requirements:
  - Use only context information
  - Professional tone
  - Complete answer
  - Clear formatting
  - State limitations if needed

✓ Customer Response:`
};

/**
 * Context Formatting Variations
 */
export const CONTEXT_FORMATTING_TEMPLATES = {
  standard: `Format the retrieved information for optimal use in response generation:

Retrieved chunks:
{chunks}

Formatted context:`,

  structured: `CONTEXT FORMATTING SYSTEM

Raw Retrieved Information:
{chunks}

Processed Context (organized for response generation):`,

  numbered: `Context Preparation:

1. Retrieved Information:
{chunks}

2. Formatted Context for Response:`,

  categorized: `KNOWLEDGE BASE EXTRACTION

Source Materials:
{chunks}

Organized Context:`,

  minimal: `Retrieved: {chunks}
Context: `
};

/**
 * Query Enhancement Variations
 */
export const QUERY_ENHANCEMENT_TEMPLATES = {
  standard: `You are a query enhancement specialist. Your job is to expand and clarify customer support queries to improve information retrieval.

Original query: "{query}"

Enhanced query (add relevant keywords, synonyms, and context):`,

  analytical: `QUERY ENHANCEMENT ANALYSIS

Original Customer Query: "{query}"

Enhancement Process:
1. Identify core concepts
2. Add relevant synonyms
3. Include context keywords
4. Expand abbreviations
5. Add domain-specific terms

Enhanced Query:`,

  systematic: `Query Enhancement System

Input: "{query}"
Task: Expand query for better retrieval
Method: Add keywords, synonyms, context
Output: Enhanced query`,

  conversational: `I need to help improve this customer query for better search results.

Customer asked: "{query}"

Let me enhance this by adding relevant keywords and context:`,

  minimal: `Query: "{query}"
Enhanced:`
};

/**
 * Predefined Variation Sets
 */
export const PROMPT_VARIATION_SETS: PromptVariationSet[] = [
  {
    id: 'standard',
    name: 'Standard Professional',
    description: 'Traditional customer support format with clear instructions',
    responseGenerationTemplates: { main: RESPONSE_GENERATION_TEMPLATES.standard },
    contextFormattingTemplates: { main: CONTEXT_FORMATTING_TEMPLATES.standard },
    queryEnhancementTemplates: { main: QUERY_ENHANCEMENT_TEMPLATES.standard }
  },
  {
    id: 'structured',
    name: 'Structured Markdown',
    description: 'Markdown-formatted prompts with clear sections',
    responseGenerationTemplates: { main: RESPONSE_GENERATION_TEMPLATES.markdown },
    contextFormattingTemplates: { main: CONTEXT_FORMATTING_TEMPLATES.structured },
    queryEnhancementTemplates: { main: QUERY_ENHANCEMENT_TEMPLATES.analytical }
  },
  {
    id: 'xml',
    name: 'XML Structured',
    description: 'XML-like structured format for clear parsing',
    responseGenerationTemplates: { main: RESPONSE_GENERATION_TEMPLATES.xml_structured },
    contextFormattingTemplates: { main: CONTEXT_FORMATTING_TEMPLATES.categorized },
    queryEnhancementTemplates: { main: QUERY_ENHANCEMENT_TEMPLATES.systematic }
  },
  {
    id: 'analytical',
    name: 'Step-by-Step Analytical',
    description: 'Systematic analytical approach with clear steps',
    responseGenerationTemplates: { main: RESPONSE_GENERATION_TEMPLATES.analytical },
    contextFormattingTemplates: { main: CONTEXT_FORMATTING_TEMPLATES.numbered },
    queryEnhancementTemplates: { main: QUERY_ENHANCEMENT_TEMPLATES.analytical }
  },
  {
    id: 'conversational',
    name: 'Conversational Empathetic',
    description: 'Friendly, conversational tone with empathy',
    responseGenerationTemplates: { main: RESPONSE_GENERATION_TEMPLATES.conversational },
    contextFormattingTemplates: { main: CONTEXT_FORMATTING_TEMPLATES.standard },
    queryEnhancementTemplates: { main: QUERY_ENHANCEMENT_TEMPLATES.conversational }
  },
  {
    id: 'systematic',
    name: 'Systematic Protocol',
    description: 'Protocol-driven systematic approach',
    responseGenerationTemplates: { main: RESPONSE_GENERATION_TEMPLATES.systematic },
    contextFormattingTemplates: { main: CONTEXT_FORMATTING_TEMPLATES.structured },
    queryEnhancementTemplates: { main: QUERY_ENHANCEMENT_TEMPLATES.systematic }
  },
  {
    id: 'detailed',
    name: 'Detailed Explanatory',
    description: 'Comprehensive, detailed response format',
    responseGenerationTemplates: { main: RESPONSE_GENERATION_TEMPLATES.detailed },
    contextFormattingTemplates: { main: CONTEXT_FORMATTING_TEMPLATES.categorized },
    queryEnhancementTemplates: { main: QUERY_ENHANCEMENT_TEMPLATES.standard }
  },
  {
    id: 'minimalist',
    name: 'Minimalist Concise',
    description: 'Minimal, concise format focusing on efficiency',
    responseGenerationTemplates: { main: RESPONSE_GENERATION_TEMPLATES.minimalist },
    contextFormattingTemplates: { main: CONTEXT_FORMATTING_TEMPLATES.minimal },
    queryEnhancementTemplates: { main: QUERY_ENHANCEMENT_TEMPLATES.minimal }
  },
  {
    id: 'checklist',
    name: 'Checklist-Driven',
    description: 'Checklist-based approach ensuring completeness',
    responseGenerationTemplates: { main: RESPONSE_GENERATION_TEMPLATES.checklist },
    contextFormattingTemplates: { main: CONTEXT_FORMATTING_TEMPLATES.numbered },
    queryEnhancementTemplates: { main: QUERY_ENHANCEMENT_TEMPLATES.systematic }
  }
];

/**
 * Generate all possible prompt combinations
 */
export function generateAllPromptCombinations(): RetrievalPrompts[] {
  const combinations: RetrievalPrompts[] = [];
  
  const responseKeys = Object.keys(RESPONSE_GENERATION_TEMPLATES);
  const contextKeys = Object.keys(CONTEXT_FORMATTING_TEMPLATES);
  const queryKeys = Object.keys(QUERY_ENHANCEMENT_TEMPLATES);
  
  // Generate systematic combinations
  for (const responseKey of responseKeys) {
    for (const contextKey of contextKeys) {
      for (const queryKey of queryKeys) {
        combinations.push({
          responseGeneration: RESPONSE_GENERATION_TEMPLATES[responseKey as keyof typeof RESPONSE_GENERATION_TEMPLATES],
          contextFormatting: CONTEXT_FORMATTING_TEMPLATES[contextKey as keyof typeof CONTEXT_FORMATTING_TEMPLATES],
          queryEnhancement: QUERY_ENHANCEMENT_TEMPLATES[queryKey as keyof typeof QUERY_ENHANCEMENT_TEMPLATES]
        });
      }
    }
  }
  
  return combinations;
}

/**
 * Get variation set by ID
 */
export function getVariationSet(id: string): PromptVariationSet | undefined {
  return PROMPT_VARIATION_SETS.find(set => set.id === id);
}

/**
 * Get random variation set
 */
export function getRandomVariationSet(): PromptVariationSet {
  const randomIndex = Math.floor(Math.random() * PROMPT_VARIATION_SETS.length);
  return PROMPT_VARIATION_SETS[randomIndex];
}

/**
 * Create a random prompt combination
 */
export function createRandomPromptCombination(): RetrievalPrompts {
  const responseKeys = Object.keys(RESPONSE_GENERATION_TEMPLATES);
  const contextKeys = Object.keys(CONTEXT_FORMATTING_TEMPLATES);
  const queryKeys = Object.keys(QUERY_ENHANCEMENT_TEMPLATES);
  
  const randomResponse = responseKeys[Math.floor(Math.random() * responseKeys.length)];
  const randomContext = contextKeys[Math.floor(Math.random() * contextKeys.length)];
  const randomQuery = queryKeys[Math.floor(Math.random() * queryKeys.length)];
  
  return {
    responseGeneration: randomResponse ? RESPONSE_GENERATION_TEMPLATES[randomResponse as keyof typeof RESPONSE_GENERATION_TEMPLATES] : RESPONSE_GENERATION_TEMPLATES.standard,
    contextFormatting: randomContext ? CONTEXT_FORMATTING_TEMPLATES[randomContext as keyof typeof CONTEXT_FORMATTING_TEMPLATES] : CONTEXT_FORMATTING_TEMPLATES.standard,
    queryEnhancement: randomQuery ? QUERY_ENHANCEMENT_TEMPLATES[randomQuery as keyof typeof QUERY_ENHANCEMENT_TEMPLATES] : QUERY_ENHANCEMENT_TEMPLATES.standard
  };
}