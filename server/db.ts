/** The ONLY file that imports the Neon driver (architecture.md §8.3 rule 1). The DAL sees the small Db interface below, so tests run
 *  the same DAL against PGlite (in-process) or a local Postgres through `pg`, and production uses the Neon serverless Pool. */
import { Pool } from '@neondatabase/serverless';
// @ts-ignore: plain JS module, typed by the interfaces here
import { wrapPgPool } from './pgwrap.mjs';
import { HttpError } from './errors.js';

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

/** Thrown when DATABASE_URL is missing (e.g. a deploy before the database is provisioned). An HttpError, so the router answers with
 *  a clean 503 JSON instead of the function crashing; routes that never touch the database (401 without a session) still work. */
export const dbNotConfigured = () =>
  new HttpError(503, 'not_configured', 'Cloud saving is not available yet. Progress is safe on this device.');

/** Production: a Neon Pool (WebSocket, pooled DATABASE_URL), created per request and closed after it (§8.7). The pool is created
 *  lazily on the first query, so requests that never reach the database don't open (or need) a connection. */
export function neonDb(url = process.env.DATABASE_URL): { db: Db; close: () => Promise<void> } {
  let pool: Pool | null = null, inner: Db | null = null;
  const get = (): Db => {
    if (!inner) { if (!url) throw dbNotConfigured(); pool = new Pool({ connectionString: url }); inner = wrapPool(pool); }
    return inner;
  };
  const db: Db = {
    query: async <T = any>(text: string, params?: unknown[]) => get().query<T>(text, params),
    exec: async (text: string) => get().exec(text),
    tx: async <T>(fn: (q: Queryable) => Promise<T>) => get().tx(fn),
  };
  return { db, close: async () => { if (pool) await pool.end(); } };
}
/** The raw Neon Pool, for the Auth.js adapter only (api/auth). Without DATABASE_URL it returns a stand-in whose queries reject, so
 *  Auth.js endpoints that don't use the adapter (providers, csrf) still answer and the ones that do fail through Auth.js's own
 *  error handling instead of crashing the function. */
export function neonPool(url = process.env.DATABASE_URL): Pool {
  if (url) return new Pool({ connectionString: url });
  const fail = async () => { throw new Error('DATABASE_URL is not set'); };
  return { query: fail, connect: fail, end: async () => {}, on: () => {} } as unknown as Pool;
}
