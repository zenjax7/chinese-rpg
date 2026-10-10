/** The Vercel entry points as deployed: each api/** file is loaded as its own Node ESM module (relative imports need .js, see
 *  tools/check_esm_imports.mjs), and a deploy without DATABASE_URL must answer cleanly (401 / 503 JSON, Auth.js 200) rather than
 *  crash the function. No database: these requests never reach Postgres. */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import v1 from '../../api/v1/[...route].js';
import auth from '../../api/auth/[...auth].js';
import { neonDb } from '../../server/db.js';

const BASE = 'https://chinese-rpg.example';
beforeEach(() => { vi.stubEnv('DATABASE_URL', ''); vi.stubEnv('AUTH_SECRET', 'test-auth-secret-not-a-secret'); vi.stubEnv('NODE_ENV', 'production'); });
afterEach(() => { vi.unstubAllEnvs(); });

describe('Vercel functions without DATABASE_URL', () => {
  it('/api/v1/me without a session is 401 JSON', async () => {
    const r = await v1.fetch(new Request(`${BASE}/api/v1/me`));
    expect(r.status).toBe(401);
    expect(await r.json()).toMatchObject({ error: 'unauthorized' });
  });
  it('/api/v1/me with a session cookie is a clean 503 not_configured (the DB is needed to read the session)', async () => {
    const r = await v1.fetch(new Request(`${BASE}/api/v1/me`, { headers: { cookie: '__Secure-authjs.session-token=abc' } }));
    expect(r.status).toBe(503);
    expect(await r.json()).toMatchObject({ error: 'not_configured' });
  });
  it('neonDb() does not throw or connect until the first query', async () => {
    const { db, close } = neonDb(undefined);
    await expect(db.query('select 1')).rejects.toMatchObject({ status: 503, code: 'not_configured' });
    await close();
  });
  it('/api/auth/csrf and /api/auth/providers answer 200', async () => {
    const csrf = await auth.fetch(new Request(`${BASE}/api/auth/csrf`));
    expect(csrf.status).toBe(200);
    expect(await csrf.json()).toHaveProperty('csrfToken');
    const prov = await auth.fetch(new Request(`${BASE}/api/auth/providers`));
    expect(prov.status).toBe(200);
  });
});
