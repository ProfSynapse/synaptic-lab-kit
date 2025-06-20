/**
 * Query Builder
 * Fluent interface for building complex database queries
 * Based on patterns from existing data services
 */

import { SupabaseManager } from './SupabaseManager';
import { QueryResult } from './types';

export class QueryBuilder {
  private tableName: string;
  private selectColumns: string[] = ['*'];
  private whereConditions: Array<{ column: string; operator: string; value: any }> = [];
  private orderByClause: Array<{ column: string; ascending: boolean }> = [];
  private limitValue?: number;
  private offsetValue?: number;
  private joinClauses: Array<{ type: string; table: string; condition: string }> = [];
  private groupByColumns: string[] = [];
  private havingConditions: Array<{ column: string; operator: string; value: any }> = [];

  constructor(private db: SupabaseManager, tableName: string) {
    this.tableName = tableName;
  }

  /**
   * Select specific columns
   */
  select(columns: string | string[]): QueryBuilder {
    if (typeof columns === 'string') {
      this.selectColumns = [columns];
    } else {
      this.selectColumns = columns;
    }
    return this;
  }

  /**
   * Add WHERE condition
   */
  where(column: string, operator: string, value: any): QueryBuilder {
    this.whereConditions.push({ column, operator, value });
    return this;
  }

  /**
   * Add WHERE condition with equals
   */
  whereEquals(column: string, value: any): QueryBuilder {
    return this.where(column, '=', value);
  }

  /**
   * Add WHERE condition with IN
   */
  whereIn(column: string, values: any[]): QueryBuilder {
    return this.where(column, 'IN', values);
  }

  /**
   * Add WHERE condition with LIKE
   */
  whereLike(column: string, pattern: string): QueryBuilder {
    return this.where(column, 'LIKE', pattern);
  }

  /**
   * Add WHERE condition with ILIKE (case-insensitive)
   */
  whereILike(column: string, pattern: string): QueryBuilder {
    return this.where(column, 'ILIKE', pattern);
  }

  /**
   * Add WHERE condition for null values
   */
  whereNull(column: string): QueryBuilder {
    return this.where(column, 'IS', null);
  }

  /**
   * Add WHERE condition for non-null values
   */
  whereNotNull(column: string): QueryBuilder {
    return this.where(column, 'IS NOT', null);
  }

  /**
   * Add WHERE condition with greater than
   */
  whereGreaterThan(column: string, value: any): QueryBuilder {
    return this.where(column, '>', value);
  }

  /**
   * Add WHERE condition with less than
   */
  whereLessThan(column: string, value: any): QueryBuilder {
    return this.where(column, '<', value);
  }

  /**
   * Add WHERE condition with date range
   */
  whereDateBetween(column: string, startDate: Date, endDate: Date): QueryBuilder {
    this.where(column, '>=', startDate.toISOString());
    this.where(column, '<=', endDate.toISOString());
    return this;
  }

  /**
   * Add JSONB path condition
   */
  whereJsonPath(column: string, path: string, value: any): QueryBuilder {
    return this.where(`${column}->>'${path}'`, '=', value);
  }

  /**
   * Add JSONB contains condition
   */
  whereJsonContains(column: string, value: any): QueryBuilder {
    return this.where(column, '@>', JSON.stringify(value));
  }

  /**
   * Add full-text search condition
   */
  whereFullTextSearch(columns: string[], query: string, language: string = 'english'): QueryBuilder {
    const columnList = columns.join(" || ' ' || ");
    const condition = `to_tsvector('${language}', ${columnList}) @@ plainto_tsquery('${language}', '${query}')`;
    this.whereConditions.push({ column: 'custom', operator: 'CUSTOM', value: condition });
    return this;
  }

  /**
   * Add ORDER BY clause
   */
  orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): QueryBuilder {
    this.orderByClause.push({ column, ascending: direction === 'ASC' });
    return this;
  }

  /**
   * Add ORDER BY clause (ascending)
   */
  orderByAsc(column: string): QueryBuilder {
    return this.orderBy(column, 'ASC');
  }

  /**
   * Add ORDER BY clause (descending)
   */
  orderByDesc(column: string): QueryBuilder {
    return this.orderBy(column, 'DESC');
  }

  /**
   * Add LIMIT clause
   */
  limit(count: number): QueryBuilder {
    this.limitValue = count;
    return this;
  }

  /**
   * Add OFFSET clause
   */
  offset(count: number): QueryBuilder {
    this.offsetValue = count;
    return this;
  }

  /**
   * Add pagination (limit + offset)
   */
  paginate(page: number, pageSize: number): QueryBuilder {
    this.limitValue = pageSize;
    this.offsetValue = (page - 1) * pageSize;
    return this;
  }

  /**
   * Add JOIN clause
   */
  join(table: string, condition: string, type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' = 'INNER'): QueryBuilder {
    this.joinClauses.push({ type, table, condition });
    return this;
  }

  /**
   * Add INNER JOIN
   */
  innerJoin(table: string, condition: string): QueryBuilder {
    return this.join(table, condition, 'INNER');
  }

  /**
   * Add LEFT JOIN
   */
  leftJoin(table: string, condition: string): QueryBuilder {
    return this.join(table, condition, 'LEFT');
  }

  /**
   * Add GROUP BY clause
   */
  groupBy(columns: string | string[]): QueryBuilder {
    if (typeof columns === 'string') {
      this.groupByColumns = [columns];
    } else {
      this.groupByColumns = columns;
    }
    return this;
  }

  /**
   * Add HAVING condition
   */
  having(column: string, operator: string, value: any): QueryBuilder {
    this.havingConditions.push({ column, operator, value });
    return this;
  }

  /**
   * Execute the query and return results
   */
  async execute(): Promise<QueryResult> {
    try {
      const sql = this.buildSQL();
      const data = await this.db.sql(sql);
      
      return {
        data: data || [],
        error: null,
        count: data?.length || 0
      };
    } catch (error) {
      console.error('Query execution failed:', error);
      return {
        data: null,
        error: error as Error,
        count: 0
      };
    }
  }

  /**
   * Execute and return first result
   */
  async first(): Promise<any | null> {
    const result = await this.limit(1).execute();
    if (result.error || !result.data || result.data.length === 0) {
      return null;
    }
    return result.data[0];
  }

  /**
   * Execute and return count only
   */
  async count(): Promise<number> {
    try {
      // Build COUNT query
      const countSQL = this.buildCountSQL();
      const result = await this.db.sql(countSQL);
      return result?.[0]?.count || 0;
    } catch (error) {
      console.error('Count query failed:', error);
      return 0;
    }
  }

  /**
   * Check if any records exist
   */
  async exists(): Promise<boolean> {
    const count = await this.count();
    return count > 0;
  }

  /**
   * Execute using Supabase client (for simple queries)
   */
  async executeWithSupabase(): Promise<QueryResult> {
    try {
      let query = this.db.getClient().from(this.tableName);

      // Apply select
      let selectQuery = query.select(this.selectColumns.join(', '));

      // Apply where conditions
      for (const condition of this.whereConditions) {
        if (condition.operator === 'CUSTOM') {
          // Skip custom conditions for Supabase client
          continue;
        }
        
        switch (condition.operator) {
          case '=':
            selectQuery = selectQuery.eq(condition.column, condition.value);
            break;
          case '!=':
            selectQuery = selectQuery.neq(condition.column, condition.value);
            break;
          case '>':
            selectQuery = selectQuery.gt(condition.column, condition.value);
            break;
          case '<':
            selectQuery = selectQuery.lt(condition.column, condition.value);
            break;
          case '>=':
            selectQuery = selectQuery.gte(condition.column, condition.value);
            break;
          case '<=':
            selectQuery = selectQuery.lte(condition.column, condition.value);
            break;
          case 'LIKE':
            selectQuery = selectQuery.like(condition.column, condition.value);
            break;
          case 'ILIKE':
            selectQuery = selectQuery.ilike(condition.column, condition.value);
            break;
          case 'IN':
            selectQuery = selectQuery.in(condition.column, condition.value);
            break;
          case 'IS':
            if (condition.value === null) {
              selectQuery = selectQuery.is(condition.column, null);
            }
            break;
        }
      }

      // Apply order by
      for (const order of this.orderByClause) {
        selectQuery = selectQuery.order(order.column, { ascending: order.ascending });
      }

      // Apply limit and offset
      if (this.limitValue !== undefined) {
        const rangeEnd = this.offsetValue ? 
          this.offsetValue + this.limitValue - 1 : 
          this.limitValue - 1;
        selectQuery = selectQuery.range(this.offsetValue || 0, rangeEnd);
      }

      const { data, error, count } = await selectQuery;

      return {
        data,
        error,
        count: count || data?.length || 0
      };
    } catch (error) {
      console.error('Supabase query execution failed:', error);
      return {
        data: null,
        error: error as Error,
        count: 0
      };
    }
  }

  /**
   * Build SQL string from query components
   */
  private buildSQL(): string {
    let sql = `SELECT ${this.selectColumns.join(', ')} FROM ${this.tableName}`;

    // Add JOINs
    for (const join of this.joinClauses) {
      sql += ` ${join.type} JOIN ${join.table} ON ${join.condition}`;
    }

    // Add WHERE
    if (this.whereConditions.length > 0) {
      const whereClause = this.whereConditions
        .map(condition => {
          if (condition.operator === 'CUSTOM') {
            return condition.value;
          }
          
          if (condition.operator === 'IN') {
            const values = Array.isArray(condition.value) 
              ? condition.value.map(v => `'${v}'`).join(', ')
              : `'${condition.value}'`;
            return `${condition.column} IN (${values})`;
          }
          
          if (condition.value === null) {
            return `${condition.column} ${condition.operator} NULL`;
          }
          
          const value = typeof condition.value === 'string' 
            ? `'${condition.value.replace(/'/g, "''")}'` 
            : condition.value;
          return `${condition.column} ${condition.operator} ${value}`;
        })
        .join(' AND ');
      
      sql += ` WHERE ${whereClause}`;
    }

    // Add GROUP BY
    if (this.groupByColumns.length > 0) {
      sql += ` GROUP BY ${this.groupByColumns.join(', ')}`;
    }

    // Add HAVING
    if (this.havingConditions.length > 0) {
      const havingClause = this.havingConditions
        .map(condition => {
          const value = typeof condition.value === 'string' 
            ? `'${condition.value.replace(/'/g, "''")}'` 
            : condition.value;
          return `${condition.column} ${condition.operator} ${value}`;
        })
        .join(' AND ');
      
      sql += ` HAVING ${havingClause}`;
    }

    // Add ORDER BY
    if (this.orderByClause.length > 0) {
      const orderClause = this.orderByClause
        .map(order => `${order.column} ${order.ascending ? 'ASC' : 'DESC'}`)
        .join(', ');
      
      sql += ` ORDER BY ${orderClause}`;
    }

    // Add LIMIT and OFFSET
    if (this.limitValue !== undefined) {
      sql += ` LIMIT ${this.limitValue}`;
    }
    
    if (this.offsetValue !== undefined) {
      sql += ` OFFSET ${this.offsetValue}`;
    }

    return sql;
  }

  /**
   * Build COUNT SQL
   */
  private buildCountSQL(): string {
    let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;

    // Add JOINs
    for (const join of this.joinClauses) {
      sql += ` ${join.type} JOIN ${join.table} ON ${join.condition}`;
    }

    // Add WHERE (same as buildSQL)
    if (this.whereConditions.length > 0) {
      const whereClause = this.whereConditions
        .map(condition => {
          if (condition.operator === 'CUSTOM') {
            return condition.value;
          }
          
          if (condition.operator === 'IN') {
            const values = Array.isArray(condition.value) 
              ? condition.value.map(v => `'${v}'`).join(', ')
              : `'${condition.value}'`;
            return `${condition.column} IN (${values})`;
          }
          
          if (condition.value === null) {
            return `${condition.column} ${condition.operator} NULL`;
          }
          
          const value = typeof condition.value === 'string' 
            ? `'${condition.value.replace(/'/g, "''")}'` 
            : condition.value;
          return `${condition.column} ${condition.operator} ${value}`;
        })
        .join(' AND ');
      
      sql += ` WHERE ${whereClause}`;
    }

    // Add GROUP BY
    if (this.groupByColumns.length > 0) {
      sql += ` GROUP BY ${this.groupByColumns.join(', ')}`;
    }

    // Add HAVING
    if (this.havingConditions.length > 0) {
      const havingClause = this.havingConditions
        .map(condition => {
          const value = typeof condition.value === 'string' 
            ? `'${condition.value.replace(/'/g, "''")}'` 
            : condition.value;
          return `${condition.column} ${condition.operator} ${value}`;
        })
        .join(' AND ');
      
      sql += ` HAVING ${havingClause}`;
    }

    return sql;
  }

  /**
   * Get SQL string without executing
   */
  toSQL(): string {
    return this.buildSQL();
  }

  /**
   * Clone the query builder
   */
  clone(): QueryBuilder {
    const cloned = new QueryBuilder(this.db, this.tableName);
    cloned.selectColumns = [...this.selectColumns];
    cloned.whereConditions = [...this.whereConditions];
    cloned.orderByClause = [...this.orderByClause];
    if (this.limitValue !== undefined) cloned.limitValue = this.limitValue;
    if (this.offsetValue !== undefined) cloned.offsetValue = this.offsetValue;
    cloned.joinClauses = [...this.joinClauses];
    cloned.groupByColumns = [...this.groupByColumns];
    cloned.havingConditions = [...this.havingConditions];
    return cloned;
  }
}

/**
 * Factory function for creating query builders
 */
export function createQueryBuilder(db: SupabaseManager, tableName: string): QueryBuilder {
  return new QueryBuilder(db, tableName);
}
