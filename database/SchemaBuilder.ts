/**
 * Schema Builder
 * Dynamic database schema creation from descriptions
 */

import { SupabaseManager } from './SupabaseManager';
import { TableSchema, VectorTableConfig } from './types';

export class SchemaBuilder {
  constructor(private db: SupabaseManager) {}

  /**
   * Create table from schema definition
   */
  async createTable(tableName: string, schema: TableSchema): Promise<void> {
    try {
      // Build column definitions
      const columnDefs = Object.entries(schema.columns)
        .map(([name, type]) => `${name} ${type}`)
        .join(', ');

      // Build CREATE TABLE statement
      let sql = `
        CREATE TABLE IF NOT EXISTS ${tableName} (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          ${columnDefs},
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `;

      await this.db.sql(sql);

      // Add constraints
      if (schema.constraints) {
        for (const constraint of schema.constraints) {
          await this.db.sql(`ALTER TABLE ${tableName} ADD ${constraint}`);
        }
      }

      // Add indexes
      if (schema.indexes) {
        for (const index of schema.indexes) {
          const indexName = `${tableName}_${index.replace(/[^a-zA-Z0-9]/g, '_')}_idx`;
          await this.db.sql(`CREATE INDEX IF NOT EXISTS ${indexName} ON ${tableName} (${index})`);
        }
      }

      // Enable RLS if specified
      if (schema.rls) {
        await this.db.sql(`ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY`);
      }

      // Create updated_at trigger
      await this.createUpdatedAtTrigger(tableName);

      console.log(`✅ Table '${tableName}' created successfully`);
    } catch (error) {
      console.error(`Failed to create table '${tableName}':`, error);
      throw error;
    }
  }

  /**
   * Create vector-enabled table
   */
  async createVectorTable(tableName: string, config: VectorTableConfig): Promise<void> {
    try {
      // Enable vector extension first
      await this.db.enableExtension('vector');

      // Build column definitions (excluding vector column)
      const regularColumns = { ...config.columns };
      delete regularColumns[config.vectorColumn];

      const columnDefs = Object.entries(regularColumns)
        .map(([name, type]) => `${name} ${type}`)
        .join(', ');

      // Create table with vector column
      const sql = `
        CREATE TABLE IF NOT EXISTS ${tableName} (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          ${columnDefs},
          ${config.vectorColumn} vector(${config.vectorDimensions}),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `;

      await this.db.sql(sql);

      // Create vector index for similarity search
      await this.createVectorIndex(tableName, config.vectorColumn);

      // Add other constraints and indexes
      if (config.constraints) {
        for (const constraint of config.constraints) {
          await this.db.sql(`ALTER TABLE ${tableName} ADD ${constraint}`);
        }
      }

      if (config.indexes) {
        for (const index of config.indexes) {
          const indexName = `${tableName}_${index.replace(/[^a-zA-Z0-9]/g, '_')}_idx`;
          await this.db.sql(`CREATE INDEX IF NOT EXISTS ${indexName} ON ${tableName} (${index})`);
        }
      }

      // Enable RLS if specified
      if (config.rls) {
        await this.db.sql(`ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY`);
      }

      // Create updated_at trigger
      await this.createUpdatedAtTrigger(tableName);

      console.log(`✅ Vector table '${tableName}' created with ${config.vectorDimensions}D embeddings`);
    } catch (error) {
      console.error(`Failed to create vector table '${tableName}':`, error);
      throw error;
    }
  }

  /**
   * Create table from natural language description
   */
  async createFromDescription(tableName: string, description: string): Promise<void> {
    // This would use an LLM to parse the description into a schema
    // For now, we'll provide a simple implementation
    const schema = this.parseDescription(description);
    await this.createTable(tableName, schema);
  }

  /**
   * Add column to existing table
   */
  async addColumn(tableName: string, columnName: string, columnType: string): Promise<void> {
    try {
      await this.db.sql(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`);
      console.log(`✅ Column '${columnName}' added to '${tableName}'`);
    } catch (error) {
      console.error(`Failed to add column '${columnName}' to '${tableName}':`, error);
      throw error;
    }
  }

  /**
   * Drop column from table
   */
  async dropColumn(tableName: string, columnName: string): Promise<void> {
    try {
      await this.db.sql(`ALTER TABLE ${tableName} DROP COLUMN ${columnName}`);
      console.log(`✅ Column '${columnName}' dropped from '${tableName}'`);
    } catch (error) {
      console.error(`Failed to drop column '${columnName}' from '${tableName}':`, error);
      throw error;
    }
  }

  /**
   * Create foreign key relationship
   */
  async addForeignKey(
    tableName: string,
    columnName: string,
    referencedTable: string,
    referencedColumn: string = 'id'
  ): Promise<void> {
    try {
      const constraintName = `fk_${tableName}_${columnName}`;
      await this.db.sql(`
        ALTER TABLE ${tableName} 
        ADD CONSTRAINT ${constraintName} 
        FOREIGN KEY (${columnName}) 
        REFERENCES ${referencedTable}(${referencedColumn})
      `);
      console.log(`✅ Foreign key constraint added: ${tableName}.${columnName} -> ${referencedTable}.${referencedColumn}`);
    } catch (error) {
      console.error(`Failed to add foreign key constraint:`, error);
      throw error;
    }
  }

  /**
   * Create full-text search index
   */
  async createTextSearchIndex(tableName: string, columns: string[], language: string = 'english'): Promise<void> {
    try {
      const indexName = `${tableName}_fts_idx`;
      const columnList = columns.join(" || ' ' || ");
      
      await this.db.sql(`
        CREATE INDEX IF NOT EXISTS ${indexName} 
        ON ${tableName} 
        USING GIN (to_tsvector('${language}', ${columnList}))
      `);
      
      console.log(`✅ Full-text search index created on ${tableName} (${columns.join(', ')})`);
    } catch (error) {
      console.error(`Failed to create text search index:`, error);
      throw error;
    }
  }

  // Private helper methods

  private async createVectorIndex(tableName: string, vectorColumn: string): Promise<void> {
    const indexName = `${tableName}_${vectorColumn}_idx`;
    
    // Create IVFFlat index for vector similarity search
    await this.db.sql(`
      CREATE INDEX IF NOT EXISTS ${indexName} 
      ON ${tableName} 
      USING ivfflat (${vectorColumn} vector_cosine_ops)
      WITH (lists = 100)
    `);
    
    console.log(`✅ Vector index created: ${indexName}`);
  }

  private async createUpdatedAtTrigger(tableName: string): Promise<void> {
    // Create or replace trigger function for updated_at
    await this.db.sql(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);

    // Create trigger for this table
    const triggerName = `update_${tableName}_updated_at`;
    await this.db.sql(`
      CREATE TRIGGER ${triggerName}
        BEFORE UPDATE ON ${tableName}
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `);
  }

  private parseDescription(description: string): TableSchema {
    // Simple parser - in real implementation, this would use an LLM
    const schema: TableSchema = {
      columns: {},
      constraints: [],
      indexes: []
    };

    // Extract common patterns
    if (description.includes('name')) {
      schema.columns.name = 'TEXT NOT NULL';
    }
    if (description.includes('email')) {
      schema.columns.email = 'TEXT UNIQUE';
      schema.indexes?.push('email');
    }
    if (description.includes('price')) {
      schema.columns.price = 'DECIMAL(10,2)';
    }
    if (description.includes('description')) {
      schema.columns.description = 'TEXT';
    }
    if (description.includes('status')) {
      schema.columns.status = 'TEXT DEFAULT \'active\'';
    }

    return schema;
  }

  /**
   * Generate schema from existing data
   */
  inferSchemaFromData(data: any[]): TableSchema {
    if (data.length === 0) {
      throw new Error('Cannot infer schema from empty data array');
    }

    const schema: TableSchema = {
      columns: {},
      constraints: [],
      indexes: []
    };

    const sample = data[0];
    
    for (const [key, value] of Object.entries(sample)) {
      if (key === 'id') continue; // Skip ID, it's auto-generated

      const type = this.inferColumnType(value, data.map(item => item[key]));
      schema.columns[key] = type;

      // Add indexes for likely lookup columns
      if (key.includes('email') || key.includes('username') || key.includes('code')) {
        schema.indexes?.push(key);
      }
    }

    return schema;
  }

  private inferColumnType(value: any, allValues: any[]): string {
    if (typeof value === 'string') {
      // Check if it's a date
      if (!isNaN(Date.parse(value))) {
        return 'TIMESTAMPTZ';
      }
      // Check if it's an email
      if (value.includes('@')) {
        return 'TEXT';
      }
      // Check max length
      const maxLength = Math.max(...allValues.map(v => String(v).length));
      return maxLength > 255 ? 'TEXT' : `VARCHAR(${Math.max(maxLength + 50, 255)})`;
    }
    
    if (typeof value === 'number') {
      // Check if all values are integers
      const allIntegers = allValues.every(v => Number.isInteger(v));
      if (allIntegers) {
        return 'INTEGER';
      }
      return 'DECIMAL(10,2)';
    }
    
    if (typeof value === 'boolean') {
      return 'BOOLEAN';
    }
    
    if (Array.isArray(value)) {
      return 'JSONB';
    }
    
    if (typeof value === 'object') {
      return 'JSONB';
    }
    
    return 'TEXT';
  }
}