/**
 * Data Seeder
 * Generate and insert test data
 * Based on patterns from existing seeding scripts
 */

import { faker } from '@faker-js/faker';
import { SupabaseManager } from './SupabaseManager';
import { DataGenerator, SeedingOptions } from './types';

export class DataSeeder {
  constructor(private db: SupabaseManager) {}

  /**
   * Seed table with generated data
   */
  async generateAndSeed<T>(
    table: string,
    generator: DataGenerator<T>,
    count: number = 10,
    options?: SeedingOptions
  ): Promise<T[]> {
    const batchSize = options?.batchSize || 100;
    const data: T[] = [];
    
    try {
      console.log(`🌱 Generating ${count} records for ${table}...`);
      
      for (let i = 0; i < count; i++) {
        try {
          const item = generator();
          data.push(item);
          
          // Progress callback
          if (options?.onProgress && (i + 1) % 10 === 0) {
            options.onProgress(i + 1, count);
          }
        } catch (error) {
          if (options?.onError) {
            options.onError(error as Error, i);
          } else {
            throw error;
          }
        }
      }

      // Insert in batches
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        await this.seed(table, batch, options);
      }

      console.log(`✅ Seeded ${data.length} records into ${table}`);
      return data;
    } catch (error) {
      console.error(`Failed to seed ${table}:`, error);
      throw error;
    }
  }

  /**
   * Insert data directly
   */
  async seed(table: string, data: any[], options?: SeedingOptions): Promise<void> {
    if (data.length === 0) return;

    try {
      const query = this.db.getClient().from(table);
      
      if (options?.skipDuplicates) {
        const { error } = await query.upsert(data, { onConflict: 'id' });
        if (error) throw error;
      } else {
        const { error } = await query.insert(data);
        if (error) throw error;
      }
    } catch (error) {
      console.error(`Failed to insert data into ${table}:`, error);
      throw error;
    }
  }

  /**
   * Common data generators
   */
  generators = {
    // Customer/User data
    customer: (): any => ({
      name: faker.person.fullName(),
      email: faker.internet.email(),
      phone: faker.phone.number(),
      address: faker.location.streetAddress(true),
      tier: faker.helpers.arrayElement(['free', 'pro', 'enterprise']),
      account_balance: faker.number.float({ min: -100, max: 1000, fractionDigits: 2 }),
      is_active: faker.datatype.boolean(0.9),
      registration_date: faker.date.past()
    }),

    // Product data
    product: (): any => ({
      name: faker.commerce.productName(),
      description: faker.commerce.productDescription(),
      price: parseFloat(faker.commerce.price({ min: 10, max: 500 })),
      category: faker.commerce.department(),
      sku: faker.string.alphanumeric(8).toUpperCase(),
      in_stock: faker.datatype.boolean(0.8),
      stock_quantity: faker.number.int({ min: 0, max: 100 }),
      brand: faker.company.name()
    }),

    // Support ticket data
    supportTicket: (): any => ({
      subject: faker.lorem.sentence(),
      description: faker.lorem.paragraphs(2),
      status: faker.helpers.arrayElement(['open', 'pending', 'resolved', 'closed']),
      priority: faker.helpers.arrayElement(['low', 'medium', 'high', 'urgent']),
      category: faker.helpers.arrayElement(['billing', 'technical', 'general', 'feature_request']),
      customer_email: faker.internet.email(),
      assigned_agent: faker.person.fullName(),
      created_date: faker.date.past(),
      resolution_time: faker.number.int({ min: 30, max: 1440 }) // minutes
    }),

    // Order data
    order: (): any => ({
      order_number: faker.string.alphanumeric(10).toUpperCase(),
      customer_email: faker.internet.email(),
      total_amount: parseFloat(faker.commerce.price({ min: 20, max: 500 })),
      status: faker.helpers.arrayElement(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
      shipping_address: faker.location.streetAddress(true),
      order_date: faker.date.past(),
      items_count: faker.number.int({ min: 1, max: 5 })
    }),

    // Employee data
    employee: (): any => ({
      name: faker.person.fullName(),
      email: faker.internet.email(),
      department: faker.helpers.arrayElement(['engineering', 'sales', 'marketing', 'support', 'hr']),
      position: faker.person.jobTitle(),
      salary: faker.number.int({ min: 40000, max: 150000 }),
      hire_date: faker.date.past(),
      is_active: faker.datatype.boolean(0.95),
      manager_email: faker.internet.email()
    }),

    // Article/Content data
    article: (): any => ({
      title: faker.lorem.sentence(),
      content: faker.lorem.paragraphs(5),
      author: faker.person.fullName(),
      category: faker.helpers.arrayElement(['tutorial', 'guide', 'faq', 'announcement', 'troubleshooting']),
      tags: faker.helpers.arrayElements(['help', 'guide', 'documentation', 'api', 'billing', 'security'], { min: 1, max: 3 }),
      status: faker.helpers.arrayElement(['draft', 'published', 'archived']),
      view_count: faker.number.int({ min: 0, max: 1000 }),
      published_date: faker.date.past()
    }),

    // Log entry data
    logEntry: (): any => ({
      level: faker.helpers.arrayElement(['DEBUG', 'INFO', 'WARN', 'ERROR']),
      message: faker.lorem.sentence(),
      source: faker.helpers.arrayElement(['api', 'web', 'worker', 'scheduler']),
      user_id: faker.string.uuid(),
      session_id: faker.string.uuid(),
      ip_address: faker.internet.ip(),
      user_agent: faker.internet.userAgent(),
      timestamp: faker.date.recent(),
      metadata: {
        action: faker.helpers.arrayElement(['login', 'logout', 'purchase', 'view', 'search']),
        duration: faker.number.int({ min: 10, max: 5000 })
      }
    }),

    // Financial transaction data
    transaction: (): any => ({
      transaction_id: faker.string.uuid(),
      customer_email: faker.internet.email(),
      amount: parseFloat(faker.finance.amount({ min: 1, max: 1000 })),
      currency: faker.finance.currencyCode(),
      type: faker.helpers.arrayElement(['payment', 'refund', 'adjustment', 'fee']),
      status: faker.helpers.arrayElement(['pending', 'completed', 'failed', 'cancelled']),
      payment_method: faker.helpers.arrayElement(['credit_card', 'debit_card', 'paypal', 'bank_transfer']),
      transaction_date: faker.date.past(),
      description: faker.finance.transactionDescription()
    })
  };

  /**
   * Generate related data (with foreign keys)
   */
  async generateRelatedData(
    parentTable: string,
    childTable: string,
    relationshipKey: string,
    childGenerator: DataGenerator,
    childrenPerParent: { min: number; max: number } = { min: 1, max: 5 }
  ): Promise<void> {
    try {
      // Get parent records
      const { data: parents, error } = await this.db.getClient()
        .from(parentTable)
        .select('id');

      if (error || !parents || parents.length === 0) {
        throw new Error(`No parent records found in ${parentTable}`);
      }

      // Generate children for each parent
      const allChildren: any[] = [];
      
      for (const parent of parents) {
        const childCount = faker.number.int(childrenPerParent);
        
        for (let i = 0; i < childCount; i++) {
          const child = childGenerator();
          child[relationshipKey] = parent.id;
          allChildren.push(child);
        }
      }

      await this.seed(childTable, allChildren);
      console.log(`✅ Generated ${allChildren.length} related records in ${childTable}`);
    } catch (error) {
      console.error(`Failed to generate related data:`, error);
      throw error;
    }
  }

  /**
   * Clear all data from table
   */
  async clearTable(table: string): Promise<void> {
    try {
      const { error } = await this.db.getClient()
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (error) throw error;
      console.log(`🗑️ Cleared all data from ${table}`);
    } catch (error) {
      console.error(`Failed to clear table ${table}:`, error);
      throw error;
    }
  }

  /**
   * Create test scenario with realistic data flow
   */
  async createTestScenario(scenario: string): Promise<void> {
    switch (scenario.toLowerCase()) {
      case 'customer-support':
        await this.createCustomerSupportScenario();
        break;
      case 'e-commerce':
        await this.createECommerceScenario();
        break;
      case 'content-management':
        await this.createContentManagementScenario();
        break;
      default:
        throw new Error(`Unknown scenario: ${scenario}`);
    }
  }

  private async createCustomerSupportScenario(): Promise<void> {
    console.log('🎭 Creating customer support test scenario...');
    
    // Create customers
    await this.generateAndSeed('customers', this.generators.customer, 50);
    
    // Create products
    await this.generateAndSeed('products', this.generators.product, 20);
    
    // Create support tickets
    await this.generateAndSeed('support_tickets', this.generators.supportTicket, 100);
    
    console.log('✅ Customer support scenario created');
  }

  private async createECommerceScenario(): Promise<void> {
    console.log('🛍️ Creating e-commerce test scenario...');
    
    // Create customers
    await this.generateAndSeed('customers', this.generators.customer, 100);
    
    // Create products
    await this.generateAndSeed('products', this.generators.product, 50);
    
    // Create orders
    await this.generateAndSeed('orders', this.generators.order, 200);
    
    // Create transactions
    await this.generateAndSeed('transactions', this.generators.transaction, 150);
    
    console.log('✅ E-commerce scenario created');
  }

  private async createContentManagementScenario(): Promise<void> {
    console.log('📝 Creating content management test scenario...');
    
    // Create employees (authors)
    await this.generateAndSeed('employees', this.generators.employee, 10);
    
    // Create articles
    await this.generateAndSeed('articles', this.generators.article, 100);
    
    // Create log entries
    await this.generateAndSeed('log_entries', this.generators.logEntry, 500);
    
    console.log('✅ Content management scenario created');
  }
}