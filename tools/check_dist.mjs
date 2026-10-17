// Fails the Pages build if dist/ contains any server code or server env names (docs/tech/api.md).
// The client needs no keys; server/ and api/ must never be bundled into the static site.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
const DIR = process.argv[2] || 'dist';
const BAD = [
  /server\/(dal|db|session|crypto|router)\b/, /@neondatabase/, /@auth\/core/, /next-auth/, /\bpg-boss\b/, /@electric-sql\/pglite/,
  /PIN_PEPPER/, /IP_HASH_KEY/, /AUDIT_HASH_SALT/, /CRON_SECRET/, /AUTH_SECRET/, /AUTH_GOOGLE_SECRET/, /DATABASE_URL/, /EDITOR_GOOGLE_SUBS/,
  /pin_hash/, /consent_records/, /audit_log/,
];
const hits = [];
function walk(d) {
  for (const n of readdirSync(d)) {
    const p = join(d, n); const s = statSync(p);
    if (s.isDirectory()) { if (n === 'api' || n === 'server') hits.push(`${p}: server folder in dist`); walk(p); continue; }
    if (!/\.(js|mjs|cjs|html|json|map|css|txt)$/.test(n)) continue;
    const t = readFileSync(p, 'utf8');
    for (const re of BAD) if (re.test(t)) hits.push(`${p}: ${re}`);
  }
}
walk(DIR);
// level-editor.md §5.2: the game's own chunks (everything index.html loads) never carry React, React Flow or editor code.
const EDITOR_MARK = [/react-flow__/, /react\.transitional\.element/, /chinese-rpg-editor-unsent/];
function gameChunks() {
  const seen = new Set(), html = readFileSync(join(DIR, 'index.html'), 'utf8');
  const todo = [...html.matchAll(/(?:src|href)="\.?\/?(assets\/[^"]+\.js)"/g)].map(m => m[1]);
  while (todo.length) {
    const f = todo.pop(); if (seen.has(f)) continue; seen.add(f);
    const t = readFileSync(join(DIR, f), 'utf8');
    for (const m of t.matchAll(/["'`]\.\/([\w.-]+\.js)["'`]/g)) todo.push('assets/' + m[1]);
  }
  return [...seen];
}
for (const f of gameChunks()) { const t = readFileSync(join(DIR, f), 'utf8'); for (const re of EDITOR_MARK) if (re.test(t)) hits.push(`${f}: editor code in a game chunk (${re})`); }
if (hits.length) { console.error('dist contains server code or server env names:\n' + hits.join('\n')); process.exit(1); }
console.log(`check:dist ok (${DIR} has no server code)`);
