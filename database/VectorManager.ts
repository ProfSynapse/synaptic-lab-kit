/**
 * Vector Manager
 * Handles vector operations and semantic search
 * Based on patterns from embeddingService.ts and semanticContextService.ts
 */

import { SupabaseManager } from './SupabaseManager';
import { SemanticSearchResult, VectorTableConfig } from './types';

export class VectorManager {
  constructor(private db: SupabaseManager) {}

  /**
   * Insert vector with text content
   */
  async insertVector(
    table: string,
    content: string,
    embedding: number[],
    metadata?: Record<string, any>
  ): Promise<string> {
    try {
      const record = {
        content,
        embedding,
        metadata: metadata || {},
        ...metadata // Spread metadata fields as columns
      };

      const { data, error } = await this.db.getClient()
        .from(table)
        .insert(record)
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error(`Failed to insert vector into ${table}:`, error);
      throw error;
    }
  }

  /**
   * Batch insert vectors
   */
  async insertVectors(
    table: string,
    vectors: Array<{
      content: string;
      embedding: number[];
      metadata?: Record<string, any>;
    }>
  ): Promise<string[]> {
    try {
      const records = vectors.map(v => ({
        content: v.content,
        embedding: v.embedding,
        metadata: v.metadata || {},
        ...v.metadata
      }));

      const { data, error } = await this.db.getClient()
        .from(table)
        .insert(records)
        .select('id');

      if (error) throw error;
      return data.map(d => d.id);
    } catch (error) {
      console.error(`Failed to batch insert vectors into ${table}:`, error);
      throw error;
    }
  }

  /**
   * Perform semantic search using cosine similarity
   */
  async semanticSearch(
    table: string,
    queryEmbedding: number[],
    options: {
      limit?: number;
      threshold?: number;
      vectorColumn?: string;
      filter?: Record<string, any>;
    } = {}
  ): Promise<SemanticSearchResult[]> {
    try {
      const {
        limit = 10,
        threshold = 0.5,
        vectorColumn = 'embedding',
        filter
      } = options;

      // Build similarity query
      let query = this.db.getClient()
        .rpc('match_documents', {
          query_embedding: queryEmbedding,
          match_threshold: threshold,
          match_count: limit,
          table_name: table,
          vector_column: vectorColumn
        });

      // Apply filters if provided
      if (filter) {
        for (const [key, value] of Object.entries(filter)) {
          query = query.eq(key, value);
        }
      }

      const { data, error } = await query;

      if (error) {
        // Fallback to manual similarity calculation
        return await this.manualSimilaritySearch(table, queryEmbedding, options);
      }

      return (data || []).map((item: any) => ({
        id: item.id,
        content: item.content,
        similarity: item.similarity,
        metadata: item.metadata
      }));
    } catch (error) {
      console.error(`Semantic search failed for ${table}:`, error);
      throw error;
    }
  }

  /**
   * Manual similarity search (fallback)
   */
  private async manualSimilaritySearch(
    table: string,
    queryEmbedding: number[],
    options: {
      limit?: number;
      threshold?: number;
      vectorColumn?: string;
      filter?: Record<string, any>;
    }
  ): Promise<SemanticSearchResult[]> {
    try {
      const { limit = 10, threshold = 0.5, vectorColumn = 'embedding' } = options;

      // Get all vectors (this is not efficient for large datasets)
      let query = this.db.getClient()
        .from(table)
        .select(`id, content, ${vectorColumn}, metadata`);

      if (options.filter) {
        for (const [key, value] of Object.entries(options.filter)) {
          query = query.eq(key, value);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      // Calculate similarities in JavaScript
      const results = (data || [])
        .map((item: any) => {
          const similarity = this.cosineSimilarity(queryEmbedding, item[vectorColumn]);
          return {
            id: item.id,
            content: item.content,
            similarity,
            metadata: item.metadata
          };
        })
        .filter(item => item.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      return results;
    } catch (error) {
      console.error(`Manual similarity search failed:`, error);
      throw error;
    }
  }

  /**
   * Update vector content and embedding
   */
  async updateVector(
    table: string,
    id: string,
    content?: string,
    embedding?: number[],
    metadata?: Record<string, any>
  ): Promise<boolean> {
    try {
      const updates: any = {};
      if (content !== undefined) updates.content = content;
      if (embedding !== undefined) updates.embedding = embedding;
      if (metadata !== undefined) {
        updates.metadata = metadata;
        Object.assign(updates, metadata); // Spread metadata fields
      }

      const { error } = await this.db.getClient()
        .from(table)
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error(`Failed to update vector ${id} in ${table}:`, error);
      return false;
    }
  }

  /**
   * Delete vector by ID
   */
  async deleteVector(table: string, id: string): Promise<boolean> {
    try {
      const { error } = await this.db.getClient()
        .from(table)
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error(`Failed to delete vector ${id} from ${table}:`, error);
      return false;
    }
  }

  /**
   * Get vector by ID
   */
  async getVector(table: string, id: string): Promise<any | null> {
    try {
      const { data, error } = await this.db.getClient()
        .from(table)
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Failed to get vector ${id} from ${table}:`, error);
      return null;
    }
  }

  /**
   * Find similar vectors to a given vector ID
   */
  async findSimilarVectors(
    table: string,
    vectorId: string,
    options: {
      limit?: number;
      threshold?: number;
      vectorColumn?: string;
    } = {}
  ): Promise<SemanticSearchResult[]> {
    try {
      // First get the reference vector
      const referenceVector = await this.getVector(table, vectorId);
      if (!referenceVector) {
        throw new Error(`Vector ${vectorId} not found`);
      }

      const { vectorColumn = 'embedding' } = options;
      const queryEmbedding = referenceVector[vectorColumn];

      // Search for similar vectors (excluding the reference vector)
      const results = await this.semanticSearch(table, queryEmbedding, options);
      return results.filter(r => r.id !== vectorId);
    } catch (error) {
      console.error(`Failed to find similar vectors for ${vectorId}:`, error);
      throw error;
    }
  }

  /**
   * Get vector statistics
   */
  async getVectorStats(table: string): Promise<{
    totalVectors: number;
    avgSimilarityThreshold: number;
    dimensionality: number;
  }> {
    try {
      const { data, error } = await this.db.getClient()
        .from(table)
        .select('embedding')
        .limit(1000); // Sample for stats

      if (error) throw error;

      const vectors = data || [];
      const totalVectors = vectors.length;
      const dimensionality = vectors.length > 0 ? vectors[0].embedding.length : 0;

      // Calculate average pairwise similarity (sample)
      let totalSimilarity = 0;
      let comparisons = 0;
      const sampleSize = Math.min(50, vectors.length);

      for (let i = 0; i < sampleSize; i++) {
        for (let j = i + 1; j < sampleSize; j++) {
          totalSimilarity += this.cosineSimilarity(
            vectors[i].embedding,
            vectors[j].embedding
          );
          comparisons++;
        }
      }

      const avgSimilarityThreshold = comparisons > 0 ? totalSimilarity / comparisons : 0;

      return {
        totalVectors,
        avgSimilarityThreshold,
        dimensionality
      };
    } catch (error) {
      console.error(`Failed to get vector stats for ${table}:`, error);
      throw error;
    }
  }

  /**
   * Cosine similarity calculation
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same dimensionality');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Create vector search function in database
   */
  async createSearchFunction(): Promise<void> {
    try {
      await this.db.sql(`
        CREATE OR REPLACE FUNCTION match_documents(
          query_embedding vector(1536),
          match_threshold float DEFAULT 0.5,
          match_count int DEFAULT 10,
          table_name text DEFAULT 'documents',
          vector_column text DEFAULT 'embedding'
        )
        RETURNS TABLE (
          id uuid,
          content text,
          metadata jsonb,
          similarity float
        )
        LANGUAGE plpgsql
        AS $$
        DECLARE
          sql_query text;
        BEGIN
          sql_query := format(
            'SELECT id, content, metadata, 1 - (%s <=> %L) AS similarity '
            'FROM %I '
            'WHERE 1 - (%s <=> %L) > %L '
            'ORDER BY %s <=> %L '
            'LIMIT %L',
            vector_column, query_embedding, table_name,
            vector_column, query_embedding, match_threshold,
            vector_column, query_embedding, match_count
          );
          
          RETURN QUERY EXECUTE sql_query;
        END;
        $$;
      `);

      console.log('✅ Vector search function created');
    } catch (error) {
      console.error('Failed to create vector search function:', error);
      throw error;
    }
  }
}
