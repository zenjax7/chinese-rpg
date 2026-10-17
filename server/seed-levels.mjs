#!/usr/bin/env node
// Seeds the level tables from docs/data/levels/ (level-editor.md §8). Run after `npm run db:migrate`, with the owner role:
//   node server/seed-levels.mjs              # refuses a non-empty levels table
//   node server/seed-levels.mjs --restore    # disaster recovery (§9.4): replace the level tables with the repo copy
// Uses DATABASE_URL_UNPOOLED (or DATABASE_URL), like server/migrate.mjs. The TypeScript seed and validators are bundled on the fly
// with esbuild (a Vite dependency), so this script needs no build step.
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Bundles server/seed.ts into a temporary ESM file and imports it. */
export async function loadSeed() {
  const { build } = await import('esbuild');
  const dir = mkdtempSync(join(tmpdir(), 'seed-'));
  const out = join(dir, 'seed.mjs');
  await build({ entryPoints: [join(ROOT, 'server/seed.ts')], bundle: true, platform: 'node', format: 'esm', outfile: out, packages: 'external', logLevel: 'error' });
  try { return await import(pathToFileURL(out).href); } finally { rmSync(dir, { recursive: true, force: true }); }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) { console.error('Set DATABASE_URL_UNPOOLED (owner role, direct endpoint).'); process.exit(2); }
  const { seedFromDir } = await loadSeed();
  const { default: pg } = await import('pg');
  const { wrapPgPool } = await import('./pgwrap.mjs');
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  try {
    const r = await seedFromDir(wrapPgPool(pool), join(ROOT, 'docs/data/levels'), { restore: process.argv.includes('--restore') });
    console.log(`seeded ${r.maps} maps, release ${r.release}`);
  } finally { await pool.end(); }
}
