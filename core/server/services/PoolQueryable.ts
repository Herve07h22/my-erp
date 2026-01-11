import type { Pool, QueryResultRow, QueryResult } from 'pg';
import type { Queryable } from '../orm/types.js';

/**
 * Wrapper pour Pool qui implémente Queryable
 */
export class PoolQueryable implements Queryable {
  constructor(public readonly pool: Pool) { }

  async query<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(sql, params as never[]);
  }
}
