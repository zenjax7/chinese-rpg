#!/usr/bin/env node
// Runs tests/editor-server.ts (the real API on PGlite + the built site) for hand testing:  node tests/editor-serve.mjs [port] [distDir]
// Build first with `npm run build:cloud`. Open http://127.0.0.1:<port>/editor and press Sign in (stubbed: signs in as a test owner).
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync, rmSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
/** Bundles the TypeScript server harness into node_modules/.cache (so its packages resolve) and imports it. */
export async function loadEditorServer() {
  const { build } = await import('esbuild');
  const dir = join(ROOT, 'node_modules/.cache/editor-server'); mkdirSync(dir, { recursive: true });
  const out = join(dir, `editor-server-${process.pid}.mjs`);
  await build({ entryPoints: [join(ROOT, 'tests/editor-server.ts')], bundle: true, platform: 'node', format: 'esm', outfile: out, packages: 'external', logLevel: 'error' });
  try { return await import(pathToFileURL(out).href); } finally { rmSync(out, { force: true }); }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { startEditorServer } = await loadEditorServer();
  const s = await startEditorServer(ROOT, +(process.argv[2] || 8830), process.argv[3] || 'dist-cloud');
  console.log(`editor server: ${s.origin}/editor (real API on PGlite, stubbed sign-in)`);
}
