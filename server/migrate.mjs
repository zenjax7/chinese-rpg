#!/usr/bin/env node
// Simple forward-only migration runner (architecture.md §8.3 rule 8: run with the owner role over DATABASE_URL_UNPOOLED,
// from CI or Jack's machine, never from a Function). Applies migrations/NNN_*.sql in name order, each in its own transaction,
// and records name + sha256 in schema_migrations. An applied file whose checksum changed is an error (write a new migration).
//   node server/migrate.mjs            # uses DATABASE_URL_UNPOOLED (or DATABASE_URL)
//   node server/migrate.mjs --status
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

export function listMigrations(dir = MIGRATIONS_DIR) {
  return readdirSync(dir).filter(f => /^\d{3}_[a-z0-9_]+\.sql$/.test(f)).sort()
    .map(name => { const sql = readFileSync(join(dir, name), 'utf8'); return { name, sql, sha: createHash('sha256').update(sql).digest('hex') }; });
}

/** db: { query(text, params) -> {rows}, exec(multiStatementSql), tx(fn) }  (server/db.ts Db). Returns the names applied now. */
export async function migrate(db, { dir = MIGRATIONS_DIR, log = () => {} } = {}) {
  await db.exec(`create table if not exists schema_migrations (name text primary key, sha256 text not null, applied_at timestamptz not null default now())`);
  const done = new Map((await db.query('select name, sha256 from schema_migrations')).rows.map(r => [r.name, r.sha256]));
  const applied = [];
  for (const m of listMigrations(dir)) {
    if (done.has(m.name)) {
      if (done.get(m.name) !== m.sha) throw new Error(`migration ${m.name} was edited after it was applied; add a new migration instead`);
      continue;
    }
    await db.tx(async q => {
      await q.exec(m.sql);
      await q.query('insert into schema_migrations (name, sha256) values ($1, $2)', [m.name, m.sha]);
    });
    applied.push(m.name); log(`applied ${m.name}`);
  }
  return applied;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) { console.error('Set DATABASE_URL_UNPOOLED (owner role, direct endpoint).'); process.exit(2); }
  const { default: pg } = await import('pg');
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const { wrapPgPool } = await import('./pgwrap.mjs');
  const db = wrapPgPool(pool);
  try {
    if (process.argv.includes('--status')) {
      const have = await db.query(`select to_regclass('schema_migrations') as t`);
      const done = have.rows[0].t ? new Set((await db.query('select name from schema_migrations')).rows.map(r => r.name)) : new Set();
      for (const m of listMigrations()) console.log(`${done.has(m.name) ? 'applied ' : 'pending '} ${m.name}`);
    } else {
      const a = await migrate(db, { log: console.log });
      console.log(a.length ? `${a.length} migration(s) applied` : 'up to date');
    }
  } finally { await pool.end(); }
}
