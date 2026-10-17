#!/usr/bin/env node
// CI guard: package.json is "type": "module" and Vercel runs api/** as separately compiled ESM files, so every relative
// import/export in the server code must carry its runtime extension ('./errors.js', not './errors'). An extensionless
// specifier type-checks under bundler resolution but crashes at runtime with ERR_MODULE_NOT_FOUND.
// tsc -p tsconfig.server.json (nodenext) enforces this too; this script also covers .mjs files and dynamic import().
import fs from 'node:fs';
import path from 'node:path';

const ROOTS = process.argv.slice(2).length ? process.argv.slice(2) : ['api', 'server', 'src/net', 'src/shared'];
const EXT = /\.(ts|mts|mjs|js)$/;
const SPEC = /(?:\bfrom\s*|\bimport\s*\(\s*|^\s*import\s+|\bexport\s[^'"]*?\bfrom\s*)(['"])(\.{1,2}\/[^'"]*)\1/gm;
const OK = /\.(js|mjs|cjs|json)$/;

const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? (e.name === 'node_modules' ? [] : walk(path.join(d, e.name))) : EXT.test(e.name) && !e.name.endsWith('.d.ts') ? [path.join(d, e.name)] : []);

const bad = [];
for (const root of ROOTS) {
  if (!fs.existsSync(root)) continue;
  for (const f of walk(root)) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(SPEC)) {
      if (!OK.test(m[2])) bad.push(`${f}:${src.slice(0, m.index).split('\n').length}: '${m[2]}'`);
    }
  }
}
if (bad.length) {
  console.error(`Extensionless relative imports (add .js; Node ESM on Vercel cannot resolve them):\n  ${bad.join('\n  ')}`);
  process.exit(1);
}
console.log(`check:esm ok (${ROOTS.join(', ')})`);
