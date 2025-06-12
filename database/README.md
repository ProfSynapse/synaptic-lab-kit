# Database Integration Layer

Comprehensive Supabase integration with schema management, data seeding, vector operations, and semantic search capabilities.

## 🎯 Purpose

The database layer provides everything needed to test AI systems that interact with databases:
- **SupabaseManager**: Core database connection and query execution
- **SchemaBuilder**: Dynamic table creation from natural language descriptions
- **DataSeeder**: Realistic test data generation using Faker.js
- **VectorManager**: Semantic search and hybrid search operations
- **QueryBuilder**: Simple, safe query construction

## 🗄️ SupabaseManager

Core database connection with health monitoring and transaction support.

### Basic Setup
```typescript
import { SupabaseManager } from './SupabaseManager';

const db = new SupabaseManager({
  url: process.env.SUPABASE_URL,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY, // For testing with RLS bypass
  anonKey: process.env.SUPABASE_ANON_KEY, // For production-like testing
});

// Health check
const isHealthy = await db.healthCheck();
if (!isHealthy) {
  throw new Error('Database connection failed');
}

console.log('✅ Database connected successfully');
```

### Raw SQL Execution
```typescript
// Execute raw SQL with parameters
const users = await db.sql(`
  SELECT * FROM users 
  WHERE created_at > $1 
  AND status = $2
`, ['2025-01-01', 'active']);

// Execute with proper error handling
try {
  const result = await db.sql(`
    INSERT INTO customers (name, email, tier) 
    VALUES ($1, $2, $3) 
    RETURNING id
  `, ['John Doe', 'john@example.com', 'premium']);
  
  console.log(`Created customer with ID: ${result[0].id}`);
} catch (error) {
  console.error('Database operation failed:', error);
}
```

### Transaction Support
```typescript
// Execute multiple operations in a transaction
const result = await db.transaction(async (client) => {
  // Create customer
  const customer = await client.sql(`
    INSERT INTO customers (name, email) 
    VALUES ($1, $2) 
    RETURNING id
  `, ['Jane Smith', 'jane@example.com']);

  // Create initial order
  const order = await client.sql(`
    INSERT INTO orders (customer_id, amount, status) 
    VALUES ($1, $2, $3) 
    RETURNING id
  `, [customer[0].id, 99.99, 'pending']);

  return { customerId: customer[0].id, orderId: order[0].id };
});
```

### Client Access
```typescript
// Access Supabase client directly for advanced operations
const client = db.getClient();

// Use Supabase features like real-time subscriptions
const subscription = client
  .channel('orders')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'orders'
  }, (payload) => {
    console.log('New order created:', payload.new);
  })
  .subscribe();
```

## 🏗️ SchemaBuilder

Create database schemas dynamically from natural language descriptions.

### Basic Table Creation
```typescript
import { SchemaBuilder } from './SchemaBuilder';

const schema = new SchemaBuilder(db);

// Create table from column definitions
await schema.createTable('customers', {
  name: 'TEXT NOT NULL',
  email: 'TEXT UNIQUE NOT NULL', 
  phone: 'TEXT',
  tier: 'TEXT DEFAULT \'standard\'',
  account_balance: 'DECIMAL(10,2) DEFAULT 0.00',
  created_at: 'TIMESTAMP DEFAULT NOW()',
  metadata: 'JSONB'
});

// Create table with indexes
await schema.createTableWithIndexes('orders', {
  customer_id: 'UUID REFERENCES customers(id)',
  amount: 'DECIMAL(10,2) NOT NULL',
  status: 'TEXT NOT NULL',
  order_date: 'TIMESTAMP DEFAULT NOW()',
  items: 'JSONB'
}, {
  indexes: [
    'customer_id',
    'status', 
    'order_date',
    '(customer_id, status)' // Composite index
  ]
});
```

### Natural Language Schema Creation
```typescript
// Create schema from description
const schema = await SchemaBuilder.fromDescription(`
  Create a customer support system with:
  - Customers with names, emails, and support tiers
  - Support tickets with titles, descriptions, priorities, and status
  - Agents with names, departments, and skill levels
  - Ticket assignments linking agents to tickets
`);

await schema.apply(db);
```

### Advanced Schema Features
```typescript
// Create table with RLS (Row Level Security)
await schema.createTableWithRLS('user_data', {
  user_id: 'UUID REFERENCES auth.users(id)',
  data: 'JSONB',
  created_at: 'TIMESTAMP DEFAULT NOW()'
}, {
  policies: [
    {
      name: 'Users can only see their own data',
      operation: 'SELECT',
      condition: 'auth.uid() = user_id'
    },
    {
      name: 'Users can only update their own data',
      operation: 'UPDATE', 
      condition: 'auth.uid() = user_id'
    }
  ]
});

// Create table with triggers
await schema.createTableWithTriggers('audit_log', {
  table_name: 'TEXT NOT NULL',
  operation: 'TEXT NOT NULL',
  old_values: 'JSONB',
  new_values: 'JSONB',
  changed_at: 'TIMESTAMP DEFAULT NOW()'
}, {
  triggers: [
    {
      name: 'audit_customers',
      table: 'customers',
      events: ['INSERT', 'UPDATE', 'DELETE'],
      function: 'log_audit_event'
    }
  ]
});
```

## 🌱 DataSeeder

Generate realistic test data using Faker.js with domain-specific generators.

### Built-in Data Generators
```typescript
import { DataSeeder } from './DataSeeder';

const seeder = new DataSeeder(db);

// Generate customers
await seeder.generateAndSeed('customers', seeder.generators.customer, 100);

// Generate orders
await seeder.generateAndSeed('orders', seeder.generators.order, 500);

// Generate support tickets
await seeder.generateAndSeed('support_tickets', seeder.generators.supportTicket, 200);

// Generate articles/documentation
await seeder.generateAndSeed('articles', seeder.generators.article, 50);
```

### Available Generators
```typescript
// Customer data
const customerData = seeder.generators.customer();
/*
{
  name: 'John Smith',
  email: 'john.smith@example.com', 
  phone: '+1-555-123-4567',
  tier: 'premium',
  account_balance: 245.67,
  address: '123 Main St, Anytown, NY 12345',
  preferences: { newsletter: true, sms: false }
}
*/

// Product data
const productData = seeder.generators.product();
/*
{
  name: 'Wireless Bluetooth Headphones',
  description: 'High-quality wireless headphones with noise cancellation',
  price: 199.99,
  category: 'Electronics',
  sku: 'WBH-001',
  stock: 45,
  tags: ['bluetooth', 'wireless', 'audio']
}
*/

// Support ticket data
const ticketData = seeder.generators.supportTicket();
/*
{
  title: 'Unable to process payment',
  description: 'Customer reported that their credit card is being declined...',
  priority: 'high',
  status: 'open',
  category: 'billing',
  customer_email: 'customer@example.com'
}
*/
```

### Custom Data Generation
```typescript
// Create custom generator
const customGenerator = () => ({
  product_name: faker.commerce.productName(),
  price: parseFloat(faker.commerce.price()),
  category: faker.helpers.arrayElement(['Electronics', 'Clothing', 'Home', 'Sports']),
  rating: faker.number.float({ min: 1, max: 5, precision: 0.1 }),
  in_stock: faker.datatype.boolean(),
  tags: faker.helpers.arrayElements(['popular', 'sale', 'new', 'trending'], { min: 0, max: 3 })
});

await seeder.generateAndSeed('products', customGenerator, 250);

// Seed with relationships
await seeder.seedWithRelationships([
  {
    table: 'customers',
    count: 100,
    generator: seeder.generators.customer
  },
  {
    table: 'orders',
    count: 300,
    generator: (customers) => ({
      customer_id: faker.helpers.arrayElement(customers).id,
      amount: parseFloat(faker.commerce.price()),
      status: faker.helpers.arrayElement(['pending', 'completed', 'cancelled']),
      order_date: faker.date.recent({ days: 30 })
    }),
    dependsOn: 'customers'
  }
]);
```

### Bulk Operations
```typescript
// High-performance bulk insert
const data = Array.from({ length: 10000 }, () => seeder.generators.customer());
await seeder.bulkInsert('customers', data, { batchSize: 1000 });

// Seed multiple tables efficiently
await seeder.seedMultipleTables({
  customers: { count: 1000, generator: seeder.generators.customer },
  products: { count: 500, generator: seeder.generators.product },
  orders: { count: 2000, generator: seeder.generators.order },
  support_tickets: { count: 800, generator: seeder.generators.supportTicket }
});
```

## 🔍 VectorManager

Semantic search and hybrid search operations using embeddings.

### Vector Table Setup
```typescript
import { VectorManager } from './VectorManager';
import { OpenAIEmbeddingProvider } from '../embeddings';

const embeddings = new OpenAIEmbeddingProvider({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'text-embedding-3-small'
});

const vectors = new VectorManager(db, embeddings);

// Create vector table for documents
await vectors.createVectorTable('documents', {
  title: 'TEXT',
  content: 'TEXT', 
  category: 'TEXT',
  url: 'TEXT',
  metadata: 'JSONB'
});

// Create hybrid search table (keyword + semantic)
await vectors.createHybridSearchTable('knowledge_base', {
  title: 'TEXT',
  content: 'TEXT',
  tags: 'TEXT[]',
  difficulty: 'TEXT'
});
```

### Document Embedding & Storage
```typescript
// Insert documents with automatic embeddings
const documents = [
  {
    title: 'How to Return Products',
    content: 'Our return policy allows returns within 30 days of purchase...',
    category: 'customer_service',
    url: '/help/returns'
  },
  {
    title: 'Payment Methods',
    content: 'We accept all major credit cards, PayPal, and bank transfers...',
    category: 'billing',
    url: '/help/payments'
  }
];

await vectors.insertWithEmbeddings('documents', documents, 'content');

// Batch embedding for large datasets
const largeDocuments = await loadDocumentsFromSource();
await vectors.batchEmbeddings('documents', largeDocuments, 'content', {
  batchSize: 50,
  parallelRequests: 3
});
```

### Semantic Search
```typescript
// Basic semantic search
const results = await vectors.semanticSearch('documents', 'how to get my money back', {
  limit: 5,
  threshold: 0.7 // Minimum similarity score
});

results.forEach(result => {
  console.log(`${result.title} (similarity: ${result.similarity.toFixed(3)})`);
  console.log(result.content.substring(0, 200) + '...');
});

// Advanced semantic search with filters
const filteredResults = await vectors.semanticSearch('documents', 'payment issues', {
  limit: 10,
  threshold: 0.6,
  where: { category: 'billing' },
  select: ['title', 'content', 'url', 'similarity']
});
```

### Hybrid Search (Keyword + Semantic)
```typescript
// Combine keyword and semantic search
const hybridResults = await vectors.hybridSearch('knowledge_base', 'API authentication problems', {
  keywordWeight: 0.3,    // 30% keyword matching
  semanticWeight: 0.7,   // 70% semantic similarity
  limit: 8,
  where: { difficulty: { in: ['beginner', 'intermediate'] } }
});

// Get search explanations
const explainedResults = await vectors.hybridSearchWithExplanation('knowledge_base', 'database connection errors');
explainedResults.forEach(result => {
  console.log(`${result.title}`);
  console.log(`  Keyword score: ${result.keywordScore.toFixed(3)}`);
  console.log(`  Semantic score: ${result.semanticScore.toFixed(3)}`);
  console.log(`  Combined score: ${result.combinedScore.toFixed(3)}`);
});
```

### Vector Operations
```typescript
// Find similar documents
const similarDocs = await vectors.findSimilar('documents', 'doc_123', {
  limit: 5,
  excludeSelf: true
});

// Clustering and topic discovery
const clusters = await vectors.clusterDocuments('documents', {
  numClusters: 10,
  field: 'content'
});

// Vector analytics
const analytics = await vectors.getVectorAnalytics('documents');
console.log({
  totalDocuments: analytics.totalDocuments,
  averageContentLength: analytics.averageContentLength,
  topCategories: analytics.topCategories,
  embeddingDimensions: analytics.embeddingDimensions
});
```

## 🔨 QueryBuilder

Simple, safe query construction with parameter binding.

### Basic Queries
```typescript
import { QueryBuilder } from './QueryBuilder';

const qb = new QueryBuilder(db);

// Simple select
const users = await qb
  .select('*')
  .from('users')
  .where('status', 'active')
  .orderBy('created_at', 'DESC')
  .limit(10)
  .execute();

// Filtered search
const orders = await qb
  .select(['id', 'amount', 'status', 'created_at'])
  .from('orders')
  .where('amount', '>', 100)
  .where('status', 'IN', ['pending', 'processing'])
  .where('created_at', '>=', '2025-01-01')
  .execute();
```

### Complex Queries
```typescript
// Joins and aggregations
const customerStats = await qb
  .select([
    'c.name',
    'c.tier', 
    'COUNT(o.id) as order_count',
    'SUM(o.amount) as total_spent'
  ])
  .from('customers c')
  .leftJoin('orders o', 'c.id = o.customer_id')
  .where('c.tier', 'premium')
  .groupBy(['c.id', 'c.name', 'c.tier'])
  .having('COUNT(o.id)', '>', 5)
  .orderBy('total_spent', 'DESC')
  .execute();

// Subqueries
const topCustomers = await qb
  .select('*')
  .from('customers')
  .where('id', 'IN', 
    qb.subquery()
      .select('customer_id')
      .from('orders')
      .where('amount', '>', 500)
      .groupBy('customer_id')
  )
  .execute();
```

### Insert/Update/Delete
```typescript
// Insert with returning
const newCustomer = await qb
  .insert('customers', {
    name: 'Alice Johnson',
    email: 'alice@example.com',
    tier: 'premium'
  })
  .returning(['id', 'created_at'])
  .execute();

// Batch insert
await qb
  .insertBatch('orders', [
    { customer_id: 1, amount: 99.99, status: 'pending' },
    { customer_id: 2, amount: 149.99, status: 'completed' },
    { customer_id: 3, amount: 79.99, status: 'pending' }
  ])
  .execute();

// Update with conditions
await qb
  .update('orders')
  .set({ status: 'shipped', shipped_at: new Date() })
  .where('status', 'processing')
  .where('created_at', '<', new Date(Date.now() - 24 * 60 * 60 * 1000))
  .execute();

// Safe delete with conditions
await qb
  .delete('orders')
  .where('status', 'cancelled')
  .where('created_at', '<', '2024-01-01')
  .execute();
```

## 🧪 Testing Integration Examples

### Customer Service Database Setup
```typescript
async function setupCustomerServiceDB() {
  const db = new SupabaseManager();
  const schema = new SchemaBuilder(db);
  const seeder = new DataSeeder(db);
  const vectors = new VectorManager(db, embeddings);

  // 1. Create schema
  await schema.createTable('customers', {
    name: 'TEXT NOT NULL',
    email: 'TEXT UNIQUE NOT NULL',
    tier: 'TEXT DEFAULT \'standard\'',
    account_balance: 'DECIMAL(10,2) DEFAULT 0.00',
    support_history: 'JSONB DEFAULT \'[]\''
  });

  await schema.createTable('support_tickets', {
    customer_id: 'UUID REFERENCES customers(id)',
    title: 'TEXT NOT NULL',
    description: 'TEXT NOT NULL',
    status: 'TEXT DEFAULT \'open\'',
    priority: 'TEXT DEFAULT \'medium\'',
    category: 'TEXT',
    created_at: 'TIMESTAMP DEFAULT NOW()'
  });

  // 2. Create knowledge base with vector search
  await vectors.createVectorTable('knowledge_base', {
    title: 'TEXT',
    content: 'TEXT',
    category: 'TEXT',
    tags: 'TEXT[]'
  });

  // 3. Seed with realistic data
  await seeder.generateAndSeed('customers', seeder.generators.customer, 100);
  await seeder.generateAndSeed('support_tickets', seeder.generators.supportTicket, 200);

  // 4. Add knowledge base articles
  const articles = [
    {
      title: 'How to Return Products',
      content: 'Step-by-step guide to returning products within 30 days...',
      category: 'returns',
      tags: ['returns', 'refund', 'policy']
    },
    // ... more articles
  ];

  await vectors.insertWithEmbeddings('knowledge_base', articles, 'content');

  console.log('✅ Customer service database setup complete');
}
```

### Testing Database-Driven AI Responses
```typescript
async function testDatabaseIntegration() {
  const qb = new QueryBuilder(db);
  const vectors = new VectorManager(db, embeddings);

  // Test scenario: Customer asks about their order status
  const customerEmail = 'john.doe@example.com';
  const question = 'What is the status of my recent order?';

  // 1. Get customer context
  const customer = await qb
    .select('*')
    .from('customers')
    .where('email', customerEmail)
    .execute();

  if (!customer.length) {
    throw new Error('Customer not found');
  }

  // 2. Get recent orders
  const orders = await qb
    .select(['id', 'amount', 'status', 'created_at'])
    .from('orders')
    .where('customer_id', customer[0].id)
    .orderBy('created_at', 'DESC')
    .limit(3)
    .execute();

  // 3. Find relevant knowledge base articles
  const relevantArticles = await vectors.semanticSearch('knowledge_base', question, {
    limit: 3,
    threshold: 0.7
  });

  // 4. Build context for AI response
  const context = {
    customer: customer[0],
    orders: orders,
    knowledgeBase: relevantArticles.map(a => a.content)
  };

  // 5. Generate AI response with database context
  const prompt = `
    Customer: ${customerEmail} (${customer[0].tier} tier)
    Recent Orders: ${JSON.stringify(orders, null, 2)}
    
    Relevant Knowledge: ${relevantArticles.map(a => a.content).join('\n\n')}
    
    Customer Question: ${question}
    
    Provide a helpful, personalized response using the customer's actual data.
  `;

  const response = await llmProvider.generate(prompt);

  // 6. Verify response mentions actual order details
  const validation = await ResponseEvaluator.validateDatabaseAccuracy({
    response: response.content,
    customerData: context.customer,
    orderData: context.orders,
    expectedMentions: ['order status', 'order number', customer[0].tier]
  });

  return {
    response,
    validation,
    context
  };
}
```

## 🎯 Best Practices

### 1. Schema Design
- **Use meaningful names** - Table and column names should be self-explanatory
- **Plan for growth** - Consider how schema might evolve
- **Index strategically** - Index on columns used in WHERE clauses and JOINs
- **Use constraints** - Enforce data integrity at the database level

### 2. Data Seeding
- **Realistic data** - Use patterns that match real user behavior
- **Consistent relationships** - Ensure foreign keys reference valid records
- **Performance considerations** - Use batch operations for large datasets
- **Cleanup strategy** - Plan how to reset test data between runs

### 3. Vector Operations
- **Choose good embedding models** - More dimensions aren't always better
- **Optimize chunk sizes** - Balance detail vs. searchability
- **Monitor performance** - Vector operations can be expensive
- **Cache when possible** - Avoid re-computing embeddings

### 4. Query Safety
- **Use parameters** - Always parameterize queries to prevent SQL injection
- **Validate inputs** - Check data before building queries
- **Handle errors gracefully** - Database operations can fail
- **Monitor performance** - Log slow queries and optimize them

The database layer provides everything needed to test AI systems that interact with real data, ensuring your AI applications work correctly with actual database operations! 🗄️✨