/**
 * Database layer exports
 * Unified access to all database functionality
 */

// Core database management
export { SupabaseManager } from './SupabaseManager';
export { SchemaBuilder } from './SchemaBuilder';
export { DataSeeder } from './DataSeeder';
export { VectorManager } from './VectorManager';
export { QueryBuilder, createQueryBuilder } from './QueryBuilder';

// Types
export * from './types';

// Re-export Supabase client for direct access
export { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Database factory for creating configured instances
 */
import { SupabaseManager } from './SupabaseManager';
import { SchemaBuilder } from './SchemaBuilder';
import { DataSeeder } from './DataSeeder';
import { VectorManager } from './VectorManager';
import { QueryBuilder } from './QueryBuilder';
import { SupabaseConfig } from './types';

export class DatabaseManager {
  public supabase: SupabaseManager;
  public schema: SchemaBuilder;
  public seeder: DataSeeder;
  public vectors: VectorManager;

  constructor(config?: Partial<SupabaseConfig>) {
    this.supabase = new SupabaseManager(config);
    this.schema = new SchemaBuilder(this.supabase);
    this.seeder = new DataSeeder(this.supabase);
    this.vectors = new VectorManager(this.supabase);
  }

  /**
   * Create a query builder for a table
   */
  table(tableName: string): QueryBuilder {
    return new QueryBuilder(this.supabase, tableName);
  }

  /**
   * Initialize database with extensions and functions
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🔧 Initializing database...');
      
      // Enable required extensions
      await this.supabase.enableExtension('vector');
      await this.supabase.enableExtension('uuid-ossp');
      
      // Create vector search function
      await this.vectors.createSearchFunction();
      
      // Create migrations table if not exists
      await this.supabase.sql(`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          version VARCHAR(255) UNIQUE NOT NULL,
          executed_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      
      console.log('✅ Database initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      return false;
    }
  }

  /**
   * Health check for all components
   */
  async healthCheck(): Promise<{
    overall: boolean;
    supabase: boolean;
    vector: boolean;
    details: any;
  }> {
    try {
      const health = await this.supabase.healthCheck();
      const vectorStats = health.vectorSupport ? 
        await this.getVectorHealthCheck() : 
        { healthy: false, reason: 'Vector extension not enabled' };

      return {
        overall: health.connected && vectorStats.healthy,
        supabase: health.connected,
        vector: vectorStats.healthy,
        details: {
          database: health,
          vector: vectorStats
        }
      };
    } catch (error) {
      return {
        overall: false,
        supabase: false,
        vector: false,
        details: { error: (error as Error).message }
      };
    }
  }

  /**
   * Get comprehensive database statistics
   */
  async getStats(): Promise<{
    database: any;
    tables: Array<{ name: string; rows: number; size: string }>;
    vectors: Array<{ table: string; vectors: number; dimensions: number }>;
  }> {
    try {
      const dbStats = await this.supabase.getStats();
      
      // Get table statistics
      const { data: tables } = await this.supabase.getClient()
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');

      const tableStats = [];
      for (const table of tables || []) {
        try {
          const { data, error } = await this.supabase.getClient()
            .from(table.table_name)
            .select('*', { count: 'exact', head: true });
          
          if (!error) {
            tableStats.push({
              name: table.table_name,
              rows: data?.length || 0,
              size: 'N/A' // Would need pg_size_pretty for actual size
            });
          }
        } catch (error) {
          // Skip tables we can't access
        }
      }

      // Get vector table statistics
      const vectorStats = [];
      for (const table of tableStats) {
        try {
          const schema = await this.supabase.getTableSchema(table.name);
          const hasVectorColumn = schema.some(col => col.data_type === 'vector');
          
          if (hasVectorColumn) {
            const stats = await this.vectors.getVectorStats(table.name);
            vectorStats.push({
              table: table.name,
              vectors: stats.totalVectors,
              dimensions: stats.dimensionality
            });
          }
        } catch (error) {
          // Skip if can't get vector stats
        }
      }

      return {
        database: dbStats,
        tables: tableStats,
        vectors: vectorStats
      };
    } catch (error) {
      console.error('Failed to get database stats:', error);
      return {
        database: {},
        tables: [],
        vectors: []
      };
    }
  }

  /**
   * Backup entire database
   */
  async backup(): Promise<{
    success: boolean;
    tables: Record<string, any[]>;
    timestamp: string;
  }> {
    try {
      const timestamp = new Date().toISOString();
      const backup: Record<string, any[]> = {};

      // Get all table names
      const { data: tables } = await this.supabase.getClient()
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');

      // Backup each table
      for (const table of tables || []) {
        try {
          backup[table.table_name] = await this.supabase.backupTable(table.table_name);
          console.log(`✅ Backed up table: ${table.table_name}`);
        } catch (error) {
          console.warn(`⚠️ Failed to backup table ${table.table_name}:`, error);
          backup[table.table_name] = [];
        }
      }

      console.log(`✅ Database backup completed at ${timestamp}`);
      return {
        success: true,
        tables: backup,
        timestamp
      };
    } catch (error) {
      console.error('Database backup failed:', error);
      return {
        success: false,
        tables: {},
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    await this.supabase.close();
  }

  // Private helper methods

  private async getVectorHealthCheck(): Promise<{ healthy: boolean; reason?: string }> {
    try {
      // Test vector operations
      await this.supabase.sql('SELECT vector_dims(ARRAY[1,2,3]::vector)');
      return { healthy: true };
    } catch (error) {
      return { 
        healthy: false, 
        reason: `Vector operations failed: ${(error as Error).message}` 
      };
    }
  }
}

/**
 * Create a configured database manager instance
 */
export function createDatabaseManager(config?: Partial<SupabaseConfig>): DatabaseManager {
  return new DatabaseManager(config);
}

/**
 * Singleton database manager for easy access
 */
let _defaultManager: DatabaseManager | null = null;

export function getDefaultDatabaseManager(): DatabaseManager {
  if (!_defaultManager) {
    _defaultManager = new DatabaseManager();
  }
  return _defaultManager;
}

export function setDefaultDatabaseManager(manager: DatabaseManager): void {
  _defaultManager = manager;
}
