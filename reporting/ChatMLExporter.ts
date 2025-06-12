/**
 * ChatML Exporter
 * Exports test results to ChatML format for training
 */

import { TestExecution, TestResult } from '../core/types';
import { ChatMLExport, ChatMLConversation, ChatMLMessage } from './types';

export class ChatMLExporter {
  /**
   * Export test execution to ChatML format
   */
  async exportToChatML(execution: TestExecution): Promise<string> {
    const chatMLExport = await this.buildChatMLExport(execution);
    return this.formatAsJSONL(chatMLExport);
  }

  /**
   * Build ChatML export structure
   */
  private async buildChatMLExport(execution: TestExecution): Promise<ChatMLExport> {
    const conversations = await this.buildConversations(execution);
    
    const totalMessages = conversations.reduce((sum, conv) => sum + conv.messages.length, 0);
    const totalTokens = conversations.reduce((sum, conv) => sum + conv.metadata.totalTokens, 0);
    const totalCost = conversations.reduce((sum, conv) => sum + conv.metadata.totalCost, 0);
    const averageScore = conversations.length > 0 ?
      conversations.reduce((sum, conv) => sum + conv.metadata.averageScore, 0) / conversations.length :
      0;

    return {
      conversations,
      metadata: {
        testName: execution.configId,
        totalConversations: conversations.length,
        totalMessages,
        totalTokens,
        totalCost,
        averageScore,
        exportDate: new Date().toISOString(),
        version: '1.0.0',
        framework: 'Synaptic Lab Kit'
      }
    };
  }

  /**
   * Build conversations from test results
   */
  private async buildConversations(execution: TestExecution): Promise<ChatMLConversation[]> {
    const conversations: ChatMLConversation[] = [];
    
    // Group results by scenario and persona
    const groups = this.groupResults(execution.results);
    
    for (const [key, results] of Object.entries(groups)) {
      const [scenarioId, personaId] = key.split('|');
      const conversation = await this.buildConversation(
        execution,
        scenarioId,
        personaId,
        results
      );
      
      if (conversation.messages.length > 0) {
        conversations.push(conversation);
      }
    }
    
    return conversations;
  }

  /**
   * Build a single conversation
   */
  private async buildConversation(
    execution: TestExecution,
    scenarioId: string,
    personaId: string,
    results: TestResult[]
  ): Promise<ChatMLConversation> {
    const messages: ChatMLMessage[] = [];
    
    // Add system message with context
    messages.push({
      role: 'system',
      content: this.buildSystemMessage(execution, scenarioId, personaId),
      metadata: {
        scenario: scenarioId,
        persona: personaId,
        timestamp: execution.startTime.toISOString()
      }
    });
    
    // Add user/assistant pairs for each result
    for (const result of results) {
      // User message
      messages.push({
        role: 'user',
        content: this.extractUserMessage(result),
        metadata: {
          scenario: scenarioId,
          persona: personaId,
          timestamp: result.timestamp.toISOString()
        }
      });
      
      // Assistant message
      messages.push({
        role: 'assistant',
        content: result.response.content,
        metadata: {
          scenario: scenarioId,
          persona: personaId,
          evaluation: result.evaluation,
          timestamp: result.timestamp.toISOString(),
          tokens: result.response.tokens,
          cost: result.response.cost,
          model: result.response.metadata.model
        }
      });
    }
    
    const totalTokens = results.reduce((sum, r) => sum + r.response.tokens, 0);
    const totalCost = results.reduce((sum, r) => sum + r.response.cost, 0);
    const averageScore = results.length > 0 ?
      results.reduce((sum, r) => sum + r.evaluation.overall, 0) / results.length :
      0;
    
    return {
      id: `${execution.id}_${scenarioId}_${personaId}`,
      messages,
      metadata: {
        testId: execution.id,
        scenario: scenarioId,
        persona: personaId,
        provider: execution.metadata.provider,
        model: execution.metadata.model,
        created: execution.startTime.toISOString(),
        totalTokens,
        totalCost,
        averageScore
      }
    };
  }

  /**
   * Build system message with context
   */
  private buildSystemMessage(
    execution: TestExecution,
    scenarioId: string,
    personaId: string
  ): string {
    let systemMessage = 'You are a helpful AI assistant. ';
    
    // Add persona context if available
    if (personaId && personaId !== 'default') {
      systemMessage += `You are interacting with a ${personaId} user. `;
    }
    
    // Add scenario context
    systemMessage += `This is a ${scenarioId} scenario. `;
    
    // Add general instructions
    systemMessage += 'Please provide helpful, accurate, and relevant responses. ';
    systemMessage += 'Focus on being clear, concise, and addressing the user\'s specific needs.';
    
    return systemMessage;
  }

  /**
   * Extract user message from test result
   */
  private extractUserMessage(result: TestResult): string {
    // The user message would typically be stored in the test result
    // For now, we'll use a placeholder or try to infer from context
    return result.inputId || 'User input not available';
  }

  /**
   * Group results by scenario and persona
   */
  private groupResults(results: TestResult[]): Record<string, TestResult[]> {
    return results.reduce((groups, result) => {
      const key = `${result.scenarioId}|${result.personaId || 'default'}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(result);
      return groups;
    }, {} as Record<string, TestResult[]>);
  }

  /**
   * Format as JSONL (JSON Lines) format
   */
  private formatAsJSONL(chatMLExport: ChatMLExport): string {
    const lines: string[] = [];
    
    // Add metadata line
    lines.push(JSON.stringify({
      type: 'metadata',
      data: chatMLExport.metadata
    }));
    
    // Add conversation lines
    for (const conversation of chatMLExport.conversations) {
      lines.push(JSON.stringify({
        type: 'conversation',
        data: conversation
      }));
      
      // Add individual message lines for easier training consumption
      for (let i = 0; i < conversation.messages.length - 1; i += 2) {
        const userMessage = conversation.messages[i];
        const assistantMessage = conversation.messages[i + 1];
        
        if (userMessage?.role === 'user' && assistantMessage?.role === 'assistant') {
          lines.push(JSON.stringify({
            type: 'message_pair',
            data: {
              user: userMessage,
              assistant: assistantMessage,
              conversation_id: conversation.id,
              metadata: {
                scenario: conversation.metadata.scenario,
                persona: conversation.metadata.persona,
                evaluation: assistantMessage.metadata?.evaluation
              }
            }
          }));
        }
      }
    }
    
    return lines.join('\n');
  }

  /**
   * Export specific scenarios only
   */
  async exportScenarios(
    execution: TestExecution,
    scenarioIds: string[]
  ): Promise<string> {
    const filteredResults = execution.results.filter(r => 
      scenarioIds.includes(r.scenarioId)
    );
    
    const filteredExecution = {
      ...execution,
      results: filteredResults
    };
    
    return this.exportToChatML(filteredExecution);
  }

  /**
   * Export high-quality results only
   */
  async exportHighQuality(
    execution: TestExecution,
    minScore: number = 0.8
  ): Promise<string> {
    const highQualityResults = execution.results.filter(r => 
      r.evaluation.overall >= minScore && r.evaluation.passed
    );
    
    const filteredExecution = {
      ...execution,
      results: highQualityResults
    };
    
    return this.exportToChatML(filteredExecution);
  }

  /**
   * Export with custom message filtering
   */
  async exportWithFilter(
    execution: TestExecution,
    filter: (result: TestResult) => boolean
  ): Promise<string> {
    const filteredResults = execution.results.filter(filter);
    
    const filteredExecution = {
      ...execution,
      results: filteredResults
    };
    
    return this.exportToChatML(filteredExecution);
  }

  /**
   * Get export statistics
   */
  getExportStats(chatMLData: string): {
    totalLines: number;
    conversations: number;
    messagePairs: number;
    averageTokens: number;
    totalCost: number;
  } {
    const lines = chatMLData.split('\n').filter(line => line.trim());
    
    let conversations = 0;
    let messagePairs = 0;
    let totalTokens = 0;
    let totalCost = 0;
    
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        
        switch (parsed.type) {
          case 'conversation':
            conversations++;
            break;
          case 'message_pair':
            messagePairs++;
            totalTokens += parsed.data.assistant.metadata?.tokens || 0;
            totalCost += parsed.data.assistant.metadata?.cost || 0;
            break;
        }
      } catch (error) {
        // Skip invalid lines
      }
    }
    
    return {
      totalLines: lines.length,
      conversations,
      messagePairs,
      averageTokens: messagePairs > 0 ? totalTokens / messagePairs : 0,
      totalCost
    };
  }
}
