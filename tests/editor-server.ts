/** Local editor server for tests/editor.mjs and hand testing (level-editor.md §5, §6): the REAL server/router.ts on an in-process
 *  PGlite database (migrated, seeded from docs/data/levels), plus the built dist-cloud/ site with the /editor rewrite.
 *  Auth.js is stubbed: POST /api/auth/signin/google signs in as the bootstrap owner (a test Google sub, not Jack's) through the
 *  X-Test-Session injector, which the router honours only when NODE_ENV=test. Never deploy this; it has no real auth. */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, resolve, extname, normalize } from 'node:path';
import { randomBytes } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { pathToFileURL } from 'node:url';
import { handle } from '../server/router.js';
import { seedFromDir } from '../server/seed.js';
import type { Db, Queryable } from '../server/db.js';

const TEST_SUB = 'test-owner-sub-0001';
const MIME: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp',
  '.png': 'image/png', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.svg': 'image/svg+xml' };

function wrapPglite(pg: any): Db {
  const norm = (r: any) => ({ rows: r.rows, rowCount: Math.max(r.rows.length, r.affectedRows ?? 0) });
  const client = (c: any): Queryable => ({ query: async (t, p = []) => norm(await c.query(t, p)), exec: async t => { await c.exec(t); } });
  return { ...client(pg), tx: fn => pg.transaction((t: any) => fn(client(t))) } as Db;
}

export async function startEditorServer(root: string, port: number, distDir = 'dist-cloud') {
  const origin = `http://127.0.0.1:${port}`;
  Object.assign(process.env, { NODE_ENV: 'test', APP_ORIGIN: origin, EDITOR_GOOGLE_SUBS: TEST_SUB,
    PIN_PEPPER: 'test-pepper', IP_HASH_KEY: 'test-ip-key', AUDIT_HASH_SALT: 'test-audit-salt', CRON_SECRET: 'test-cron-secret' });   // test-only values
  const pg = await PGlite.create(); const db = wrapPglite(pg);
  const migrateUrl = pathToFileURL(join(root, 'server/migrate.mjs')).href;   // loaded at run time: it finds migrations/ next to itself
  const { migrate } = await import(migrateUrl);
  await migrate(db);
  await seedFromDir(db, join(root, 'docs/data/levels'));
  const u = await db.query(`insert into users (email, "emailVerified") values ('owner@example.test', now()) returning id`);
  await db.query(`insert into accounts ("userId", type, provider, "providerAccountId") values ($1, 'oidc', 'google', $2)`, [u.rows[0].id, TEST_SUB]);
  const token = randomBytes(24).toString('hex');
  await db.query(`insert into sessions ("userId", expires, "sessionToken", created_at) values ($1, now() + interval '1 day', $2, now())`, [u.rows[0].id, token]);
  const st = { signedIn: false };
  const dist = resolve(root, distDir);

  const server = createServer(async (req, res) => {
    const url = new URL(req.url || '/', origin);
    try {
      if (url.pathname.startsWith('/api/auth/')) {
        if (url.pathname === '/api/auth/csrf') { res.writeHead(200, { 'content-type': 'application/json' }); res.end('{"csrfToken":"local"}'); return; }
        if (url.pathname === '/api/auth/session') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(st.signedIn ? '{"user":{"name":"Owner"}}' : '{}'); return; }
        if (url.pathname === '/api/auth/signin/google') st.signedIn = true;
        if (url.pathname === '/api/auth/signout') st.signedIn = false;
        res.writeHead(302, { location: '/editor' }); res.end(); return;
      }
      if (url.pathname.startsWith('/api/v1/')) {
        const chunks: Buffer[] = []; for await (const c of req) chunks.push(c as Buffer);
        const headers = new Headers(); for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
        headers.delete('cookie'); if (st.signedIn) headers.set('x-test-session', token);
        const r = await handle(new Request(url, { method: req.method, headers, body: chunks.length && req.method !== 'GET' ? Buffer.concat(chunks) : undefined }), { db });
        res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer())); return;
      }
      let p = url.pathname === '/editor' || url.pathname.startsWith('/editor/') ? '/editor.html' : url.pathname === '/' ? '/index.html' : url.pathname;
      p = normalize(p).replace(/^(\.\.[/\\])+/, '');
      const body = await readFile(join(dist, p));
      res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' }); res.end(body);
    } catch (e: any) {
      res.writeHead(e?.code === 'ENOENT' ? 404 : 500); res.end(e?.code === 'ENOENT' ? 'not found' : String(e?.message || e));
    }
  });
  await new Promise<void>(r => server.listen(port, '127.0.0.1', r));
  return { origin, db, close: async () => { server.close(); await pg.close(); } };
}
