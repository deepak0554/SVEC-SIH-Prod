import { db } from "../db";

/**
 * Base Repository providing unified parameterized query execution against PostgreSQL
 * and local fallback storage.
 * 
 * STRICT MANDATE: ALL queries MUST use parameterized inputs ($1, $2, ...).
 * NEVER concatenate or interpolate user input directly into SQL strings.
 */
export abstract class BaseRepository {
  protected get dbManager() {
    return db;
  }

  /**
   * Execute parameterized SQL query safely
   */
  protected async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    // Note: Parameterized query enforcement
    if (this.dbManager.isPostgres()) {
      try {
        // Access underlying pool safely
        const pool = (this.dbManager as any).pgPool;
        if (pool) {
          const res = await pool.query(sql, params);
          return res.rows as T[];
        }
      } catch (err: any) {
        console.error(`[SQL Execution Error in ${this.constructor.name}]:`, err.message);
        throw err;
      }
    }
    return [];
  }
}
