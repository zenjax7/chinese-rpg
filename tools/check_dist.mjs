// Fails the Pages build if dist/ contains any server code or server env names (docs/tech/api.md).
// The client needs no keys; server/ and api/ must never be bundled into the static site.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
const DIR = process.argv[2] || 'dist';
const BAD = [
  /server\/(dal|db|session|crypto|router)\b/, /@neondatabase/, /@auth\/core/, /next-auth/, /\bpg-boss\b/, /@electric-sql\/pglite/,
  /PIN_PEPPER/, /IP_HASH_KEY/, /AUDIT_HASH_SALT/, /CRON_SECRET/, /AUTH_SECRET/, /AUTH_GOOGLE_SECRET/, /DATABASE_URL/,
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
if (hits.length) { console.error('dist contains server code or server env names:\n' + hits.join('\n')); process.exit(1); }
console.log(`check:dist ok (${DIR} has no server code)`);
