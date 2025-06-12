/**
 * Supabase Manager
 * Core database connection and query management
 * Based on patterns from services/database/SupabaseAdapter.ts
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseConfig, QueryResult, DatabaseHealth, MigrationResult } from './types';

export class SupabaseManager {
  private client: SupabaseClient;
  private config: SupabaseConfig;
  private isConnected: boolean = false;

  constructor(config?: Partial<SupabaseConfig>) {
    this.config = {
      url: config?.url || process.env.SUPABASE_URL || '',
      anonKey: config?.anonKey || process.env.SUPABASE_ANON_KEY || '',
      serviceRoleKey: config?.serviceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      accessToken: config?.accessToken || process.env.SUPABASE_ACCESS_TOKEN
    };

    this.validateConfig();
    this.initializeClient();
  }

  /**
   * Initialize Supabase client with service role for admin operations
   */
  private initializeClient(): void {
    if (!this.config.url || !this.config.serviceRoleKey) {
      throw new Error('Supabase URL and Service Role Key are required');
    }

    this.client = createClient(this.config.url, this.config.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: {
        schema: 'public'
      }
    });

    console.log('✅ Supabase client initialized with service role');
  }

  /**
   * Get the Supabase client instance
   */
  getClient(): SupabaseClient {
    return this.client;
  }

  /**
   * Execute raw SQL with parameters
   */
  async sql(query: string, params?: any[]): Promise<any> {
    try {
      // Use rpc to execute raw SQL (requires exec_sql function in Supabase)
      const { data, error } = await this.client.rpc('exec_sql', {
        query,
        params: params || []
      });

      if (error) {
        throw new Error(`SQL Error: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('SQL execution failed:', error);
      throw error;
    }
  }

  /**
   * Execute SQL from file
   */
  async sqlFromFile(filePath: string): Promise<any> {
    try {
      const fs = await import('fs');
      const sql = fs.readFileSync(filePath, 'utf-8');
      return await this.sql(sql);
    } catch (error) {
      console.error(`Failed to execute SQL from file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Check database connection and health
   */
  async healthCheck(): Promise<DatabaseHealth> {
    try {
      // Test basic connectivity
      const { data: versionData, error: versionError } = await this.client.rpc('version');
      
      if (versionError) {
        return {
          connected: false,
          extensions: [],
          tables: [],
          vectorSupport: false
        };
      }

      // Get extensions
      const { data: extensions } = await this.client
        .from('pg_extension')
        .select('extname');

      // Get tables
      const { data: tables } = await this.client
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');

      // Check vector support
      const vectorSupport = extensions?.some(ext => ext.extname === 'vector') || false;

      this.isConnected = true;

      return {
        connected: true,
        version: versionData,
        extensions: extensions?.map(ext => ext.extname) || [],
        tables: tables?.map(table => table.table_name) || [],
        vectorSupport
      };
    } catch (error) {
      console.error('Health check failed:', error);
      this.isConnected = false;
      return {
        connected: false,
        extensions: [],
        tables: [],
        vectorSupport: false
      };
    }
  }

  /**
   * Enable extensions (requires superuser/service role)
   */
  async enableExtension(extensionName: string): Promise<boolean> {
    try {
      await this.sql(`CREATE EXTENSION IF NOT EXISTS ${extensionName}`);
      console.log(`✅ Extension '${extensionName}' enabled`);
      return true;
    } catch (error) {
      console.error(`Failed to enable extension '${extensionName}':`, error);
      return false;
    }
  }

  /**
   * Drop table if exists
   */
  async dropTable(tableName: string, cascade: boolean = false): Promise<boolean> {
    try {
      const cascadeClause = cascade ? 'CASCADE' : '';
      await this.sql(`DROP TABLE IF EXISTS ${tableName} ${cascadeClause}`);
      console.log(`✅ Table '${tableName}' dropped`);
      return true;
    } catch (error) {
      console.error(`Failed to drop table '${tableName}':`, error);
      return false;
    }
  }

  /**
   * Check if table exists
   */
  async tableExists(tableName: string): Promise<boolean> {
    try {
      const { data, error } = await this.client
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', tableName)
        .single();

      return !error && !!data;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get table schema information
   */
  async getTableSchema(tableName: string): Promise<any[]> {
    try {
      const { data, error } = await this.client
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_schema', 'public')
        .eq('table_name', tableName)
        .order('ordinal_position');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`Failed to get schema for table '${tableName}':`, error);
      return [];
    }
  }

  /**
   * Execute migration
   */
  async executeMigration(migrationSql: string, version?: string): Promise<MigrationResult> {
    try {
      // Execute migration in a transaction
      await this.sql('BEGIN');
      
      const changes: string[] = [];
      
      // Split SQL into statements
      const statements = migrationSql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);

      for (const statement of statements) {
        await this.sql(statement);
        changes.push(statement.substring(0, 100) + '...');
      }

      // Record migration if version provided
      if (version) {
        await this.sql(
          `INSERT INTO migrations (version, executed_at) VALUES ($1, NOW())`,
          [version]
        );
      }

      await this.sql('COMMIT');

      return {
        success: true,
        version,
        changes
      };
    } catch (error) {
      await this.sql('ROLLBACK');
      return {
        success: false,
        error: (error as Error).message,
        changes: []
      };
    }
  }

  /**
   * Backup table data
   */
  async backupTable(tableName: string): Promise<any[]> {
    try {
      const { data, error } = await this.client
        .from(tableName)
        .select('*');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`Failed to backup table '${tableName}':`, error);
      throw error;
    }
  }

  /**
   * Restore table data
   */
  async restoreTable(tableName: string, data: any[]): Promise<boolean> {
    try {
      if (data.length === 0) return true;

      const { error } = await this.client
        .from(tableName)
        .insert(data);

      if (error) throw error;
      console.log(`✅ Restored ${data.length} records to '${tableName}'`);
      return true;
    } catch (error) {
      console.error(`Failed to restore table '${tableName}':`, error);
      return false;
    }
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<Record<string, any>> {
    try {
      const stats: Record<string, any> = {};

      // Table sizes
      const { data: tableSizes } = await this.client.rpc('get_table_sizes');
      stats.tableSizes = tableSizes;

      // Connection count
      const { data: connections } = await this.client.rpc('get_connection_count');
      stats.connections = connections;

      // Database size
      const { data: dbSize } = await this.client.rpc('get_database_size');
      stats.databaseSize = dbSize;

      return stats;
    } catch (error) {
      console.error('Failed to get database stats:', error);
      return {};
    }
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    // Supabase client doesn't need explicit closing
    this.isConnected = false;
    console.log('🔌 Supabase connection closed');
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    const required = ['url', 'serviceRoleKey'];
    const missing = required.filter(key => !this.config[key as keyof SupabaseConfig]);

    if (missing.length > 0) {
      throw new Error(`Missing required Supabase configuration: ${missing.join(', ')}`);
    }

    // Validate URL format
    try {
      new URL(this.config.url);
    } catch {
      throw new Error('Invalid Supabase URL format');
    }

    // Validate key format
    if (!this.config.serviceRoleKey.startsWith('eyJ')) {
      console.warn('⚠️ Service role key format may be incorrect');
    }
  }

  /**
   * Get configuration info (without sensitive data)
   */
  getConfigInfo(): Record<string, any> {
    return {
      url: this.config.url,
      hasAnonKey: !!this.config.anonKey,
      hasServiceRoleKey: !!this.config.serviceRoleKey,
      hasAccessToken: !!this.config.accessToken,
      connected: this.isConnected
    };
  }
}