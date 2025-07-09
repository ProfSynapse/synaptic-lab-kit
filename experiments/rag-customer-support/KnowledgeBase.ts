/**
 * Knowledge Base Builder for RAG Customer Support
 * Creates synthetic customer support documentation with numbered chunks
 */

import { OllamaEmbeddingProvider } from '../../embeddings/OllamaEmbeddingProvider';
import { VectorManager } from '../../database/VectorManager';
import { SupabaseManager } from '../../database/SupabaseManager';

export interface KnowledgeChunk {
  id: number;
  category: string;
  title: string;
  content: string;
  keywords: string[];
  embedding?: number[];
}

export interface TestCase {
  query: string;
  expectedChunks: number[];
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  description: string;
}

export class KnowledgeBase {
  private chunks: KnowledgeChunk[] = [];
  private testCases: TestCase[] = [];
  private embeddings: OllamaEmbeddingProvider;
  private vectorManager?: VectorManager;

  constructor(embeddings: OllamaEmbeddingProvider) {
    this.embeddings = embeddings;
    this.initializeKnowledgeBase();
    this.initializeTestCases();
  }

  private initializeKnowledgeBase(): void {
    this.chunks = [
      // Password & Security (1-3)
      {
        id: 1,
        category: 'password',
        title: 'Password Reset Process',
        content: 'To reset your password: 1) Go to the login page 2) Click "Forgot Password" link 3) Enter your registered email address 4) Check your email for reset instructions 5) Click the reset link in the email 6) Create a new secure password 7) Confirm your new password',
        keywords: ['password', 'reset', 'forgot', 'login', 'email', 'security']
      },
      {
        id: 2,
        category: 'password',
        title: 'Password Requirements',
        content: 'Your password must meet these requirements: At least 8 characters long, contain at least one uppercase letter, one lowercase letter, one number, and one special character (!@#$%^&*). Avoid using common words, personal information, or previously used passwords.',
        keywords: ['password', 'requirements', 'security', 'characters', 'rules']
      },
      {
        id: 3,
        category: 'security',
        title: 'Account Security Tips',
        content: 'Keep your account secure: Enable two-factor authentication, use unique passwords for each account, log out from shared devices, monitor account activity regularly, and never share your login credentials with others.',
        keywords: ['security', 'account', 'two-factor', 'authentication', 'protection']
      },

      // Billing & Payments (4-6)
      {
        id: 4,
        category: 'billing',
        title: 'Billing Support',
        content: 'For billing questions: View your invoice in the account dashboard, download statements for your records, contact billing@company.com for disputes, update payment methods in account settings, and set up automatic payments to avoid late fees.',
        keywords: ['billing', 'invoice', 'payment', 'charges', 'dashboard']
      },
      {
        id: 5,
        category: 'billing',
        title: 'Payment Methods',
        content: 'Accepted payment methods: Credit cards (Visa, MasterCard, American Express), debit cards, PayPal, bank transfers, and digital wallets. Update your payment method in Account Settings > Payment Methods. Failed payments will result in service suspension.',
        keywords: ['payment', 'methods', 'credit', 'card', 'paypal', 'bank']
      },
      {
        id: 6,
        category: 'billing',
        title: 'Refund Policy',
        content: 'Refund policy: Full refunds available within 30 days of purchase for unused services. Partial refunds may apply for pro-rated unused periods. Contact support@company.com with your order number to request a refund. Processing takes 5-7 business days.',
        keywords: ['refund', 'policy', 'money', 'back', 'return', 'cancel']
      },

      // Technical Support (7-9)
      {
        id: 7,
        category: 'technical',
        title: 'Software Installation',
        content: 'Software installation help: Check system requirements first, download the latest version from our website, run the installer as administrator, restart your computer after installation, and contact technical support if you encounter errors.',
        keywords: ['software', 'installation', 'download', 'install', 'technical']
      },
      {
        id: 8,
        category: 'technical',
        title: 'Troubleshooting Common Issues',
        content: 'Common troubleshooting steps: Clear your browser cache and cookies, disable browser extensions, check your internet connection, restart the application, update to the latest version, and try accessing from a different device.',
        keywords: ['troubleshooting', 'problems', 'issues', 'bugs', 'technical']
      },
      {
        id: 9,
        category: 'technical',
        title: 'System Requirements',
        content: 'System requirements: Windows 10 or macOS 10.14+, 4GB RAM minimum (8GB recommended), 2GB free disk space, stable internet connection, and modern web browser (Chrome, Firefox, Safari, Edge latest versions).',
        keywords: ['system', 'requirements', 'windows', 'mac', 'browser', 'hardware']
      },

      // Account Management (10-12)
      {
        id: 10,
        category: 'account',
        title: 'Account Settings',
        content: 'Manage your account: Update personal information in Profile Settings, change notification preferences, manage privacy settings, view activity logs, and download your data. Changes are saved automatically.',
        keywords: ['account', 'settings', 'profile', 'information', 'preferences']
      },
      {
        id: 11,
        category: 'account',
        title: 'Profile Management',
        content: 'Profile management: Edit your name, email, phone number, and address in Profile Settings. Upload a profile picture, set display preferences, and manage connected social accounts. Email changes require verification.',
        keywords: ['profile', 'management', 'edit', 'information', 'personal']
      },
      {
        id: 12,
        category: 'account',
        title: 'Privacy Settings',
        content: 'Privacy controls: Manage who can see your profile, control data sharing preferences, set communication preferences, review app permissions, and delete your account if needed. All changes take effect immediately.',
        keywords: ['privacy', 'settings', 'data', 'sharing', 'permissions', 'control']
      },

      // Product Information (13-15)
      {
        id: 13,
        category: 'product',
        title: 'Product Features',
        content: 'Key product features: Real-time collaboration, cloud storage, advanced analytics, mobile app access, API integration, custom workflows, reporting tools, and 24/7 customer support.',
        keywords: ['product', 'features', 'collaboration', 'analytics', 'mobile', 'api']
      },
      {
        id: 14,
        category: 'product',
        title: 'Service Plans',
        content: 'Available service plans: Basic ($9.99/month), Professional ($19.99/month), and Enterprise ($49.99/month). Each plan includes different storage limits, features, and support levels. Upgrade or downgrade anytime.',
        keywords: ['plans', 'pricing', 'basic', 'professional', 'enterprise', 'upgrade']
      },
      {
        id: 15,
        category: 'product',
        title: 'API Documentation',
        content: 'API access: RESTful API with comprehensive documentation, authentication via API keys, rate limiting applies, webhook support available, and SDKs for popular programming languages. Full documentation at api.company.com.',
        keywords: ['api', 'documentation', 'rest', 'authentication', 'webhook', 'sdk']
      },

      // Contact & Support (16-18)
      {
        id: 16,
        category: 'support',
        title: 'Contact Information',
        content: 'Contact support: Email support@company.com for general inquiries, billing@company.com for billing issues, technical@company.com for technical problems, or use live chat available 24/7 on our website.',
        keywords: ['contact', 'support', 'email', 'help', 'assistance', 'chat']
      },
      {
        id: 17,
        category: 'support',
        title: 'Support Hours',
        content: 'Support availability: Live chat and email support available 24/7. Phone support available Monday-Friday 9AM-6PM EST. Premium customers get priority support with faster response times.',
        keywords: ['support', 'hours', 'availability', 'phone', 'chat', 'email']
      },
      {
        id: 18,
        category: 'support',
        title: 'Knowledge Base',
        content: 'Self-service resources: Browse our comprehensive knowledge base, watch tutorial videos, join community forums, download user guides, and access frequently asked questions. Most issues can be resolved quickly using these resources.',
        keywords: ['knowledge', 'base', 'tutorials', 'videos', 'forums', 'guides', 'faq']
      }
    ];
  }

  private initializeTestCases(): void {
    this.testCases = [
      // Password queries
      {
        query: 'How do I reset my password?',
        expectedChunks: [1, 2],
        category: 'password',
        difficulty: 'easy',
        description: 'Basic password reset inquiry'
      },
      {
        query: 'I forgot my password and need help',
        expectedChunks: [1],
        category: 'password',
        difficulty: 'easy',
        description: 'Forgot password request'
      },
      {
        query: 'What are the password requirements?',
        expectedChunks: [2],
        category: 'password',
        difficulty: 'easy',
        description: 'Password policy question'
      },
      {
        query: 'How to make my account more secure?',
        expectedChunks: [3, 2],
        category: 'security',
        difficulty: 'medium',
        description: 'Security best practices'
      },

      // Billing queries
      {
        query: 'Where can I find my invoice?',
        expectedChunks: [4],
        category: 'billing',
        difficulty: 'easy',
        description: 'Invoice location question'
      },
      {
        query: 'What payment methods do you accept?',
        expectedChunks: [5],
        category: 'billing',
        difficulty: 'easy',
        description: 'Payment options inquiry'
      },
      {
        query: 'I want to request a refund',
        expectedChunks: [6],
        category: 'billing',
        difficulty: 'medium',
        description: 'Refund request'
      },
      {
        query: 'How do I update my payment method?',
        expectedChunks: [5, 4],
        category: 'billing',
        difficulty: 'easy',
        description: 'Payment method update'
      },

      // Technical queries
      {
        query: 'I need help installing the software',
        expectedChunks: [7, 9],
        category: 'technical',
        difficulty: 'medium',
        description: 'Installation assistance'
      },
      {
        query: 'The application is not working properly',
        expectedChunks: [8, 7],
        category: 'technical',
        difficulty: 'medium',
        description: 'General technical issue'
      },
      {
        query: 'What are the system requirements?',
        expectedChunks: [9],
        category: 'technical',
        difficulty: 'easy',
        description: 'System requirements question'
      },

      // Account queries
      {
        query: 'How do I update my profile information?',
        expectedChunks: [11, 10],
        category: 'account',
        difficulty: 'easy',
        description: 'Profile update request'
      },
      {
        query: 'How to change my notification settings?',
        expectedChunks: [10, 12],
        category: 'account',
        difficulty: 'easy',
        description: 'Notification preferences'
      },
      {
        query: 'I want to manage my privacy settings',
        expectedChunks: [12, 10],
        category: 'account',
        difficulty: 'medium',
        description: 'Privacy controls'
      },

      // Product queries
      {
        query: 'What features are included in the Professional plan?',
        expectedChunks: [14, 13],
        category: 'product',
        difficulty: 'easy',
        description: 'Plan features question'
      },
      {
        query: 'How do I access the API documentation?',
        expectedChunks: [15],
        category: 'product',
        difficulty: 'easy',
        description: 'API documentation request'
      },
      {
        query: 'Can I upgrade my service plan?',
        expectedChunks: [14],
        category: 'product',
        difficulty: 'easy',
        description: 'Plan upgrade inquiry'
      },

      // Support queries
      {
        query: 'How do I contact customer support?',
        expectedChunks: [16, 17],
        category: 'support',
        difficulty: 'easy',
        description: 'Contact information request'
      },
      {
        query: 'What are your support hours?',
        expectedChunks: [17],
        category: 'support',
        difficulty: 'easy',
        description: 'Support availability question'
      },
      {
        query: 'Where can I find tutorials and guides?',
        expectedChunks: [18],
        category: 'support',
        difficulty: 'easy',
        description: 'Self-service resources'
      },

      // Complex multi-category queries
      {
        query: 'I cannot login and need to reset my password but also have billing questions',
        expectedChunks: [1, 4, 16],
        category: 'multi',
        difficulty: 'hard',
        description: 'Multi-category support request'
      },
      {
        query: 'Software installation failed and I want to check my service plan',
        expectedChunks: [7, 8, 14],
        category: 'multi',
        difficulty: 'hard',
        description: 'Technical + billing inquiry'
      },
      {
        query: 'Update profile, change password requirements, and contact support',
        expectedChunks: [11, 2, 16],
        category: 'multi',
        difficulty: 'hard',
        description: 'Multiple account actions'
      }
    ];
  }

  /**
   * Generate embeddings for all knowledge base chunks
   */
  async generateEmbeddings(): Promise<void> {
    console.log('🔄 Generating embeddings for knowledge base...');
    
    const texts = this.chunks.map(chunk => 
      `${chunk.title}: ${chunk.content}`
    );
    
    const batchResponse = await this.embeddings.embedBatch({
      inputs: texts,
      batchSize: 5,
      onProgress: (completed, total) => {
        process.stdout.write(`\r📊 Progress: ${completed}/${total} chunks embedded`);
      }
    });
    
    console.log(`\n✅ Generated ${batchResponse.successful} embeddings`);
    
    // Store embeddings in chunks
    this.chunks.forEach((chunk, index) => {
      chunk.embedding = batchResponse.embeddings[index];
    });
  }

  /**
   * Set up vector database for efficient similarity search
   */
  async setupVectorDatabase(): Promise<void> {
    const db = new SupabaseManager();
    this.vectorManager = new VectorManager(db, this.embeddings);
    
    // Create vector table
    await this.vectorManager.createVectorTable('rag_knowledge_base', {
      chunk_id: 'INTEGER',
      category: 'TEXT',
      title: 'TEXT',
      content: 'TEXT',
      keywords: 'TEXT[]'
    });
    
    // Insert chunks with embeddings
    const documents = this.chunks.map(chunk => ({
      chunk_id: chunk.id,
      category: chunk.category,
      title: chunk.title,
      content: chunk.content,
      keywords: chunk.keywords
    }));
    
    await this.vectorManager.insertWithEmbeddings(
      'rag_knowledge_base',
      documents,
      'content'
    );
    
    console.log('✅ Vector database setup complete');
  }

  /**
   * Search for relevant chunks using vector similarity
   */
  async searchChunks(query: string, topK: number = 5, threshold: number = 0.3): Promise<Array<{
    chunk: KnowledgeChunk;
    similarity: number;
  }>> {
    // Generate embedding for query
    const queryResponse = await this.embeddings.embed({ input: query });
    const queryEmbedding = queryResponse.embeddings[0]!;
    
    // Calculate similarities with all chunks
    const similarities = this.chunks.map(chunk => ({
      chunk,
      similarity: this.embeddings.cosineSimilarity(queryEmbedding, chunk.embedding!)
    }));
    
    // Sort by similarity and filter by threshold
    return similarities
      .filter(result => result.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  /**
   * Get chunks by IDs
   */
  getChunksByIds(ids: number[]): KnowledgeChunk[] {
    return this.chunks.filter(chunk => ids.includes(chunk.id));
  }

  /**
   * Get all chunks
   */
  getAllChunks(): KnowledgeChunk[] {
    return [...this.chunks];
  }

  /**
   * Get all test cases
   */
  getAllTestCases(): TestCase[] {
    return [...this.testCases];
  }

  /**
   * Get test cases by category
   */
  getTestCasesByCategory(category: string): TestCase[] {
    return this.testCases.filter(test => test.category === category);
  }

  /**
   * Get test cases by difficulty
   */
  getTestCasesByDifficulty(difficulty: 'easy' | 'medium' | 'hard'): TestCase[] {
    return this.testCases.filter(test => test.difficulty === difficulty);
  }

  /**
   * Get knowledge base statistics
   */
  getStatistics(): {
    totalChunks: number;
    chunksByCategory: Record<string, number>;
    totalTestCases: number;
    testCasesByCategory: Record<string, number>;
    testCasesByDifficulty: Record<string, number>;
  } {
    const chunksByCategory = this.chunks.reduce((acc, chunk) => {
      acc[chunk.category] = (acc[chunk.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const testCasesByCategory = this.testCases.reduce((acc, test) => {
      acc[test.category] = (acc[test.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const testCasesByDifficulty = this.testCases.reduce((acc, test) => {
      acc[test.difficulty] = (acc[test.difficulty] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalChunks: this.chunks.length,
      chunksByCategory,
      totalTestCases: this.testCases.length,
      testCasesByCategory,
      testCasesByDifficulty
    };
  }
}