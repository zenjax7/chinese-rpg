/** The ONLY file that imports the Neon driver (architecture.md §8.3 rule 1). The DAL sees the small Db interface below, so tests run
 *  the same DAL against PGlite (in-process) or a local Postgres through `pg`, and production uses the Neon serverless Pool. */
import { Pool } from '@neondatabase/serverless';
// @ts-ignore: plain JS module, typed by the interfaces here
import { wrapPgPool } from './pgwrap.mjs';

export interface QueryResult<T = any> { rows: T[]; rowCount: number }
export interface Queryable {
  query<T = any>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
  /** Multi-statement SQL without parameters (migrations only). */
  exec(text: string): Promise<void>;
}
export interface Db extends Queryable {
  /** Interactive transaction: commit when fn resolves, roll back when it throws. */
  tx<T>(fn: (q: Queryable) => Promise<T>): Promise<T>;
}

export function wrapPool(pool: unknown): Db { return wrapPgPool(pool) as Db; }

/** Production: a Neon Pool (WebSocket, pooled DATABASE_URL), created per request and closed after it (§8.7). */
export function neonDb(url = process.env.DATABASE_URL): { db: Db; close: () => Promise<void> } {
  if (!url) throw new Error('DATABASE_URL is not set');
  const pool = new Pool({ connectionString: url });
  return { db: wrapPool(pool), close: () => pool.end() };
}
/** The raw Neon Pool, for the Auth.js adapter only (api/auth). */
export function neonPool(url = process.env.DATABASE_URL) {
  if (!url) throw new Error('DATABASE_URL is not set');
  return new Pool({ connectionString: url });
}
