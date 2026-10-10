/** PIN hashing and lockout (§5.5), consent (§5.3–5.4), rate limits (§8.5), export / delete (§5.6), CSRF (§5.2), the session
 *  injector, the Auth.js config (§5.2) and the daily cron (§5.6). PGlite by default; TEST_DATABASE_URL for a real Postgres. */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { freshDb, parent, signIn, client, snapshot, DEVICE, PIN, ORIGIN, type TestDb } from './helpers';
import { hashPin, verifyPin, hashIp } from '../../server/crypto';
import { authConfig, minimalAccounts } from '../../server/auth-config';
import { handle } from '../../server/router';
import { uaFamily } from '../../server/dal/consent';

let t: TestDb;
beforeAll(async () => { t = await freshDb(); });
afterAll(async () => { await t.close(); });
const q1 = async (sql: string, p: unknown[] = []) => (await t.db.query(sql, p)).rows[0];
const count = async (sql: string, p: unknown[] = []) => Number((await q1(`select count(*)::int as n from (${sql}) x`, p)).n);

describe('PIN hashing (§5.5)', () => {
  it('scrypt over HMAC(PIN_PEPPER, pin) with a per-parent 16-byte salt; the PIN itself is never stored', async () => {
    const a = await hashPin('4821'), b = await hashPin('4821');
    expect(a.hash).toMatch(/^scrypt\$16384\$8\$1\$[A-Za-z0-9+/]+=*$/);
    expect(a.salt.length).toBe(16);
    expect(a.hash).not.toBe(b.hash);                  // different salts
    expect(await verifyPin('4821', a.hash, a.salt)).toBe(true);
    expect(await verifyPin('4822', a.hash, a.salt)).toBe(false);
    expect(await verifyPin('4821', null, null)).toBe(false);
    const old = process.env.PIN_PEPPER; process.env.PIN_PEPPER = 'another-pepper';
    try { expect(await verifyPin('4821', a.hash, a.salt)).toBe(false); } finally { process.env.PIN_PEPPER = old; }   // a leaked DB alone can't be brute-forced
    const P = await parent(t.db, 'pin-store@example.com');
    const row = await q1(`select pin_hash, encode(pin_salt, 'hex') as salt from parents where user_id = $1`, [P.userId]);
    expect(row.pin_hash).toMatch(/^scrypt\$/); expect(row.pin_hash).not.toContain(PIN); expect(row.salt).toHaveLength(32);
  });
});

describe('PIN lockout (§5.5)', () => {
  it('5 wrong in a row lock for 15 minutes (423 + Retry-After), even the right PIN; one audit row', async () => {
    const P = await parent(t.db, 'lock5@example.com');
    for (let i = 1; i <= 4; i++) { const r = await P.api('POST', '/parent/unlock', { pin: '0000' }); expect(r.status).toBe(403); expect(r.body.error).toBe('wrong_pin'); expect(r.body.attemptsLeft).toBe(5 - i); }
    const fifth = await P.api('POST', '/parent/unlock', { pin: '0000' });
    expect(fifth.status).toBe(423); expect(fifth.body.error).toBe('pin_locked'); expect(Number(fifth.headers.get('retry-after'))).toBeGreaterThan(14 * 60);
    expect((await P.api('POST', '/parent/unlock', { pin: PIN })).status).toBe(423);
    const mins = Number((await q1(`select extract(epoch from pin_locked_until - now()) / 60 as m from parents where user_id = $1`, [P.userId])).m);
    expect(mins).toBeGreaterThan(14); expect(mins).toBeLessThanOrEqual(15);
    expect(await count(`select 1 from audit_log where action = 'pin_locked' and details->>'rule' = '5_in_a_row'`)).toBeGreaterThanOrEqual(1);
    // once the lock runs out the right PIN works and resets the counter
    await t.db.query(`update parents set pin_locked_until = now() - interval '1 second' where user_id = $1`, [P.userId]);
    expect((await P.api('POST', '/parent/unlock', { pin: PIN })).status).toBe(200);
    expect((await q1(`select pin_failed_count from parents where user_id = $1`, [P.userId])).pin_failed_count).toBe(0);
  });
  it('10 wrong in 24 hours lock for 60 minutes', async () => {
    const P = await parent(t.db, 'lock10@example.com');
    for (let i = 0; i < 5; i++) await P.api('POST', '/parent/unlock', { pin: '1111' });
    await t.db.query(`update parents set pin_locked_until = now() - interval '1 second' where user_id = $1`, [P.userId]);
    await t.db.query(`delete from rate_limits where bucket = 'pin_h' and subject = $1`, [String(P.userId)]);   // the hourly attempt limit is tested on its own
    let last: any; for (let i = 0; i < 5; i++) last = await P.api('POST', '/parent/unlock', { pin: '1111' });
    expect(last.status).toBe(423);
    const mins = Number((await q1(`select extract(epoch from pin_locked_until - now()) / 60 as m from parents where user_id = $1`, [P.userId])).m);
    expect(mins).toBeGreaterThan(59); expect(mins).toBeLessThanOrEqual(60);
  });
  it('PIN attempts are also rate-limited per parent (10 an hour -> 429)', async () => {
    const P = await parent(t.db, 'pinrate@example.com');
    await t.db.query(`update rate_limits set count = 10 where bucket = 'pin_h' and subject = $1`, [String(P.userId)]);
    const r = await P.api('POST', '/parent/unlock', { pin: PIN });
    expect(r.status).toBe(429); expect(Number(r.headers.get('retry-after'))).toBeGreaterThan(0);
  });
  it('the unlock lasts 10 minutes; PIN routes need it', async () => {
    const P = await parent(t.db, 'unlock@example.com');
    expect((await P.api('GET', '/me')).body.unlocked).toBe(true);
    await t.db.query(`update parent_unlocks set until = now() - interval '1 second' where session_id = $1`, [P.sessionId]);
    expect((await P.api('GET', '/me')).body.unlocked).toBe(false);
    const r = await P.api('POST', '/children', { nickname: 'Lily', avatar: 'fox' });
    expect(r.status).toBe(403); expect(r.body.error).toBe('pin_required');
    expect((await P.api('GET', '/export')).body.error).toBe('pin_required');
  });
  it('change PIN while unlocked; reset only from a fresh sign-in (< 5 min) when locked out of the PIN', async () => {
    const P = await parent(t.db, 'change@example.com');
    expect((await P.api('POST', '/parent/pin', { newPin: '7777' })).status).toBe(200);
    expect((await P.api('POST', '/parent/unlock', { pin: PIN })).status).toBe(403);
    expect((await P.api('POST', '/parent/unlock', { pin: '7777' })).status).toBe(200);
    // an old session that is not unlocked can't change it
    await t.db.query(`delete from parent_unlocks where session_id = $1`, [P.sessionId]);
    await t.db.query(`update sessions set created_at = now() - interval '1 hour' where id = $1`, [P.sessionId]);
    expect((await P.api('POST', '/parent/pin', { newPin: '8888' })).body.error).toBe('pin_required');
    // a fresh Google sign-in (new session, 1 minute old) can reset it
    const tok = 'fresh-' + P.token.slice(0, 20);
    await t.db.query(`insert into sessions ("userId", expires, "sessionToken", created_at) values ($1, now() + interval '1 day', $2, now() - interval '1 minute')`, [P.userId, tok]);
    expect((await client(t.db, tok)('POST', '/parent/pin', { newPin: '9999' })).status).toBe(200);
    expect(await count(`select 1 from audit_log where action = 'pin_changed' and details->>'via' = 'fresh_signin'`)).toBeGreaterThanOrEqual(1);
  });
});

describe('consent (§5.3, §5.4)', () => {
  it('nothing child-scoped works before consent; consent needs the attestation and the current notice', async () => {
    const s = await signIn(t.db, 'consent@example.com'); const api = client(t.db, s.token);
    const me = await api('GET', '/me'); expect(me.status).toBe(200); expect(me.body.needsConsent).toBe(true); expect(me.body.consentStatus).toBe('none');
    expect((await api('POST', '/children', { nickname: 'Max', avatar: 'cat' })).status).toBe(403);
    expect((await api('POST', '/consent', { noticeVersion: 'v1', pin: PIN })).status).toBe(400);                     // no attest
    expect((await api('POST', '/consent', { noticeVersion: 'v0', pin: PIN, attest: true })).status).toBe(400);       // old notice
    expect((await api('POST', '/consent', { noticeVersion: 'v1', pin: '12', attest: true })).status).toBe(400);      // bad PIN
    const ok = await api('POST', '/consent', { noticeVersion: 'v1', pin: PIN, attest: true });
    expect(ok.status).toBe(200); expect(ok.body.receipt.kind).toBe('vpc_onscreen'); expect(ok.body.receipt.noticeVersion).toBe('v1');
    const rec = await q1(`select ip_hash, user_agent_family, method_detail from consent_records where parent_id = $1`, [s.userId]);
    expect(rec.ip_hash).toBe(hashIp('203.0.113.7')); expect(rec.ip_hash).not.toContain('203.0.113'); expect(rec.user_agent_family).toBe('Chrome/macOS');
    expect(JSON.stringify(await t.db.query(`select * from consent_records`).then(r => r.rows))).not.toContain('203.0.113.7');
    expect((await api('GET', '/me')).body.needsConsent).toBe(false);
  });
  it('the user-agent family keeps only browser/OS', () => {
    expect(uaFamily('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1')).toBe('Safari/iOS');
    expect(uaFamily('Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/140.0 Safari/537.36 Edg/140.0')).toBe('Edge/Windows');
  });
  it('the delayed confirmation needs 24 hours', async () => {
    const P = await parent(t.db, 'confirm@example.com');
    expect((await P.api('POST', '/consent/confirm', {})).status).toBe(409);
    await t.db.query(`update parents set consent_granted_at = now() - interval '25 hours' where user_id = $1`, [P.userId]);
    expect((await P.api('GET', '/me')).body.needsConfirmation).toBe(true);
    expect((await P.api('POST', '/consent/confirm', {})).status).toBe(200);
    expect((await q1(`select consent_status from parents where user_id = $1`, [P.userId])).consent_status).toBe('confirmed');
    expect(await count(`select 1 from consent_records where parent_id = $1 and kind = 'confirmation'`, [P.userId])).toBe(1);
  });
  it('revoking (PIN) signs out everywhere and stops saves; data stays; re-consent asks for the existing PIN', async () => {
    const P = await parent(t.db, 'revoke@example.com', { children: 1 });
    expect((await P.api('PUT', `/children/${P.kids[0]}/save`, { baseVersion: 0, deviceId: DEVICE, seq: 1, contentVersion: 'c1', state: snapshot() })).status).toBe(200);
    expect((await P.api('POST', '/consent/revoke', { pin: '0000' })).status).toBe(403);
    const r = await P.api('POST', '/consent/revoke', { pin: PIN }); expect(r.status).toBe(200); expect(r.body.signedOut).toBe(true);
    expect((await P.api('GET', '/me')).status).toBe(401);
    expect(await count(`select 1 from sessions where "userId" = $1`, [P.userId])).toBe(0);
    expect(await count(`select 1 from saves where child_id = $1`, [P.kids[0]])).toBe(1);
    const s2 = await t.db.query(`insert into sessions ("userId", expires, "sessionToken") values ($1, now() + interval '1 day', 'revoked-relogin-token') returning id`, [P.userId]);
    const api2 = client(t.db, 'revoked-relogin-token');
    expect(s2.rowCount).toBe(1);
    const save = await api2('PUT', `/children/${P.kids[0]}/save`, { baseVersion: 1, deviceId: DEVICE, seq: 2, contentVersion: 'c1', state: snapshot() });
    expect(save.status).toBe(403); expect(save.body.error).toBe('consent_required');
    expect((await api2('POST', '/consent', { noticeVersion: 'v1', pin: '5555', attest: true })).status).toBe(403);   // not the parent's PIN
    expect((await api2('POST', '/consent', { noticeVersion: 'v1', pin: PIN, attest: true })).status).toBe(200);
    expect(await count(`select 1 from consent_records where parent_id = $1 and kind = 'revocation'`, [P.userId])).toBe(1);
  });
  it('consent attempts are rate-limited per IP hash (20 a day)', async () => {
    const s = await signIn(t.db, 'consent-flood@example.com'); const api = client(t.db, s.token, { 'x-real-ip': '198.51.100.9' });
    await t.db.query(`insert into rate_limits (bucket, subject, window_start, count) values ('consent_ip_d', $1, to_timestamp(floor(extract(epoch from now()) / 86400) * 86400), 20)`, [hashIp('198.51.100.9')]);
    const r = await api('POST', '/consent', { noticeVersion: 'v1', pin: PIN, attest: true });
    expect(r.status).toBe(429);
  });
});

describe('rate limits (§8.5)', () => {
  it('saves: 60 a minute per parent, then 429 with Retry-After; nothing written', async () => {
    const P = await parent(t.db, 'saverate@example.com', { children: 1 }); const kid = P.kids[0];
    let st = 0; for (let i = 1; i <= 60; i++) st = (await P.api('PUT', `/children/${kid}/save`, { baseVersion: i - 1, deviceId: DEVICE, seq: i, contentVersion: 'c1', state: snapshot({ exp: i }) })).status;
    expect(st).toBe(200);
    const r = await P.api('PUT', `/children/${kid}/save`, { baseVersion: 60, deviceId: DEVICE, seq: 61, contentVersion: 'c1', state: snapshot({ exp: 999 }) });
    expect(r.status).toBe(429); expect(r.body.error).toBe('rate_limited');
    const ra = Number(r.headers.get('retry-after')); expect(ra).toBeGreaterThan(0); expect(ra).toBeLessThanOrEqual(60);
    expect((await q1(`select state->>'exp' as exp from saves where child_id = $1`, [kid])).exp).toBe('60');
  });
  it('export: 10 a day; import: 5 a day', async () => {
    const P = await parent(t.db, 'exportrate@example.com', { children: 1 });
    for (let i = 0; i < 10; i++) expect((await P.api('GET', '/export')).status).toBe(200);
    expect((await P.api('GET', '/export')).status).toBe(429);
    await t.db.query(`insert into rate_limits (bucket, subject, window_start, count) values ('import_d', $1, to_timestamp(floor(extract(epoch from now()) / 86400) * 86400), 5)`, [String(P.userId)]);
    expect((await P.api('POST', `/children/${P.kids[0]}/import`, { contentVersion: 'c1', save: { version: 3, level: 1, exp: 0 } })).status).toBe(429);
  });
});

describe('export and delete (§5.6)', () => {
  it('export is the whole account as JSON, with no PIN hash, salt or raw IP', async () => {
    const P = await parent(t.db, 'export@example.com', { children: 2 });
    await P.api('PUT', `/children/${P.kids[0]}/save`, { baseVersion: 0, deviceId: DEVICE, seq: 1, contentVersion: 'c1', state: snapshot({ level: 4 }),
      mastery: [{ item: 'C001', way: 'rZE', da: 3, dc: 2, box: 1, due: 1, last: 1, wrongRun: 0 }], graphs: [{ graph: 'realm_1', visited: 'Aw==', cleared: 'AQ==' }] });
    const ex = await P.api('GET', '/export'); expect(ex.status).toBe(200);
    expect(ex.body.format).toBe('chinese-rpg-export/1'); expect(ex.body.parent.email).toBe('export@example.com');
    expect(ex.body.children).toHaveLength(2); expect(ex.body.consentRecords).toHaveLength(1);
    const c0 = ex.body.children.find((c: any) => c.id === P.kids[0]);
    expect(c0.save.state.level).toBe(4); expect(c0.wordMastery[0].item_id).toBe('C001'); expect(c0.graphProgress[0].visited).toBe('Aw==');
    const s = JSON.stringify(ex.body);
    for (const bad of ['pin_hash', 'pin_salt', 'scrypt$', '203.0.113.7', 'sessionToken', P.token]) expect(s).not.toContain(bad);
    expect(ex.headers.get('cache-control')).toBe('no-store');
    expect(await count(`select 1 from audit_log where action = 'export' and actor_hash is not null`)).toBeGreaterThanOrEqual(1);
  });
  it('delete needs confirm "DELETE" and the PIN; everything cascades; only a hashed tombstone stays', async () => {
    const P = await parent(t.db, 'delete-me@example.com', { children: 2 }); const kid = P.kids[0];
    await P.api('PUT', `/children/${kid}/save`, { baseVersion: 0, deviceId: DEVICE, seq: 1, contentVersion: 'c1', state: snapshot(),
      mastery: [{ item: 'C002', way: 'rEZ', da: 1, dc: 1, box: 1, due: 1, last: 1, wrongRun: 0 }], graphs: [{ graph: 'realm_1', visited: 'Aw==', cleared: 'AQ==' }] });
    await P.api('PUT', `/children/${kid}/save`, { baseVersion: 0, deviceId: 'device-cccc-3333', seq: 1, contentVersion: 'c1', state: snapshot({ level: 1 }) });   // a backup
    expect((await P.api('DELETE', '/account', { pin: PIN })).status).toBe(400);
    expect((await P.api('DELETE', '/account', { confirm: 'DELETE', pin: '0000' })).status).toBe(403);
    const r = await P.api('DELETE', '/account', { confirm: 'DELETE', pin: PIN }); expect(r.status).toBe(200);
    for (const [tbl, col] of [['users', 'id'], ['parents', 'user_id'], ['sessions', '"userId"'], ['consent_records', 'parent_id'], ['child_profiles', 'parent_id']])
      expect(await count(`select 1 from ${tbl} where ${col} = $1`, [P.userId]), tbl).toBe(0);
    for (const tbl of ['saves', 'word_mastery', 'graph_progress', 'save_backups']) expect(await count(`select 1 from ${tbl} where child_id = any($1::uuid[])`, [P.kids]), tbl).toBe(0);
    expect((await P.api('GET', '/me')).status).toBe(401);
    const tomb = await q1(`select actor_hash, details from audit_log where action = 'account_deleted' order by id desc limit 1`);
    expect(tomb.actor_hash).toMatch(/^[0-9a-f]{32}$/); expect(tomb.details.children).toBe(2);
    expect(JSON.stringify((await t.db.query(`select * from audit_log`)).rows)).not.toContain('delete-me@example.com');
  });
});

describe('CSRF and request checks (§5.2)', () => {
  let P: Awaited<ReturnType<typeof parent>>;
  beforeAll(async () => { P = await parent(t.db, 'csrf@example.com', { children: 1 }); });
  const put = (h: Record<string, string>) => P.api('PATCH', `/children/${P.kids[0]}`, { nickname: 'Evil' }, h);
  it('state-changing calls need our Origin, not cross-site, X-App-Request: 1 and JSON', async () => {
    expect((await put({ origin: '' })).body.error).toBe('bad_origin');
    expect((await put({ origin: 'https://evil.example' })).body.error).toBe('bad_origin');
    expect((await put({ 'sec-fetch-site': 'cross-site' })).body.error).toBe('bad_origin');
    expect((await put({ 'x-app-request': '' })).body.error).toBe('missing_app_header');
    const ct = await put({ 'content-type': 'text/plain' }); expect(ct.status).toBe(415);
    expect((await q1(`select nickname from child_profiles where id = $1`, [P.kids[0]])).nickname).toBe('Kid1');
    expect((await put({})).status).toBe(200);
  });
  it('GETs need no CSRF headers; no CORS headers are ever sent', async () => {
    const r = await P.api('GET', '/me', undefined, { origin: '', 'x-app-request': '', 'sec-fetch-site': '' });
    expect(r.status).toBe(200);
    for (const res of [r, await put({ origin: 'https://evil.example' })]) for (const [k] of res.headers) expect(k.startsWith('access-control-')).toBe(false);
    const opt = await handle(new Request(`${ORIGIN}/api/v1/me`, { method: 'OPTIONS', headers: { origin: 'https://evil.example' } }), { db: t.db });
    expect([404, 405]).toContain(opt.status); expect(opt.headers.get('access-control-allow-origin')).toBeNull();
  });
  it('APP_ORIGIN pins the allowed origin', async () => {
    const old = process.env.APP_ORIGIN; process.env.APP_ORIGIN = 'https://game.example';
    try { expect((await put({})).body.error).toBe('bad_origin'); expect((await put({ origin: 'https://game.example' })).status).toBe(200); }
    finally { process.env.APP_ORIGIN = old; }
  });
  it('the X-Test-Session injector works only when NODE_ENV=test; the Auth.js cookie always does', async () => {
    const old = process.env.NODE_ENV; process.env.NODE_ENV = 'production';
    try {
      expect((await P.api('GET', '/me')).status).toBe(401);
      const r = await P.api('GET', '/me', undefined, { cookie: `__Secure-authjs.session-token=${P.token}` }); expect(r.status).toBe(200);
    } finally { process.env.NODE_ENV = old; }
    expect((await client(t.db, null)('GET', '/me')).status).toBe(401);
    expect((await client(t.db, 'no-such-token')('GET', '/me')).status).toBe(401);
  });
  it('an expired session is signed out', async () => {
    const s = await signIn(t.db, 'expired@example.com', { expiresInSec: -10 });
    expect((await client(t.db, s.token)('GET', '/me')).status).toBe(401);
  });
});

describe('Auth.js config (§5.2)', () => {
  const env = { AUTH_SECRET: 'x', AUTH_GOOGLE_ID: 'id.apps.googleusercontent.com', AUTH_GOOGLE_SECRET: 'y' };
  it('Google only, scope "openid email", database sessions (30 days), host trusted, at /api/auth', () => {
    const c = authConfig({ linkAccount: async (a: any) => a } as any, env);
    expect(c.providers).toHaveLength(1);
    const g: any = c.providers[0];
    expect(g.id).toBe('google'); expect(g.options.authorization.params.scope).toBe('openid email');
    expect(c.session?.strategy).toBe('database'); expect(c.session?.maxAge).toBe(30 * 24 * 3600);
    expect(c.basePath).toBe('/api/auth'); expect(c.trustHost).toBe(true); expect(c.secret).toBe('x');
  });
  it('stores no name or photo, and only verified emails sign in', async () => {
    const g: any = authConfig({ linkAccount: async (a: any) => a } as any, env).providers[0];
    const u = g.options.profile({ sub: '123', email: 'kid-parent@example.com', email_verified: true, name: 'Real Name', picture: 'https://x/y.png' });
    expect(u).toEqual({ id: '123', email: 'kid-parent@example.com', emailVerified: expect.any(Date), name: null, image: null });
    const cb = authConfig({} as any, env).callbacks!.signIn!;
    expect(await cb({ profile: { email_verified: true } } as any)).toBe(true);
    expect(await cb({ profile: { email_verified: false } } as any)).toBe(false);
    expect(await cb({ profile: {} } as any)).toBe(false);
  });
  it('drops Google tokens before the account row is stored', async () => {
    let stored: any = null;
    const a = minimalAccounts({ linkAccount: async (x: any) => { stored = x; return x; } } as any);
    await a.linkAccount!({ userId: '1', type: 'oidc', provider: 'google', providerAccountId: '123', access_token: 'at', refresh_token: 'rt', id_token: 'it', expires_at: 1, session_state: 's', scope: 'openid email' } as any);
    expect(stored.access_token).toBeUndefined(); expect(stored.refresh_token).toBeUndefined(); expect(stored.id_token).toBeUndefined();
    expect(stored.provider).toBe('google'); expect(stored.scope).toBe('openid email');
  });
});

describe('daily cron (§5.6)', () => {
  const cron = (auth?: string) => handle(new Request(`${ORIGIN}/api/v1/cron/daily`, { headers: auth ? { authorization: auth } : {} }), { db: t.db });
  it('needs Bearer CRON_SECRET', async () => {
    expect((await cron()).status).toBe(401);
    expect((await cron('Bearer wrong')).status).toBe(401);
    expect((await cron(`Bearer ${process.env.CRON_SECRET}x`)).status).toBe(401);
    const old = process.env.CRON_SECRET; delete process.env.CRON_SECRET;
    try { expect((await cron('Bearer ')).status).toBe(401); } finally { process.env.CRON_SECRET = old; }
  });
  it('applies the retention policy and keeps live data', async () => {
    const P = await parent(t.db, 'cron-live@example.com', { children: 1 }); const kid = P.kids[0];
    await P.api('PUT', `/children/${kid}/save`, { baseVersion: 0, deviceId: DEVICE, seq: 1, contentVersion: 'c1', state: snapshot() });
    for (let i = 0; i < 12; i++) await t.db.query(`insert into save_backups (child_id, state, reason, saved_at) values ($1, '{}', 'daily', now() - make_interval(hours => $2))`, [kid, i]);
    await t.db.query(`insert into save_backups (child_id, state, reason, saved_at) values ($1, '{}', 'daily', now() - interval '31 days')`, [kid]);
    const stale = await signIn(t.db, 'never-consented@example.com', { ageSec: 15 * 86400 });
    await t.db.query(`update sessions set expires = now() - interval '1 day' where id = $1`, [stale.sessionId]);
    const fresh = await signIn(t.db, 'just-signed-in@example.com');
    const old = await parent(t.db, 'inactive@example.com', { children: 1 });
    await t.db.query(`update parents set last_active_at = now() - interval '19 months' where user_id = $1`, [old.userId]);
    await t.db.query(`insert into rate_limits (bucket, subject, window_start, count) values ('save_m', 'x', now() - interval '2 days', 3)`);
    await t.db.query(`insert into audit_log (actor_type, action, at) values ('system', 'cron_daily', now() - interval '3 years')`);
    const r = await cron(`Bearer ${process.env.CRON_SECRET}`); expect(r.status).toBe(200);
    const out = await r.json();
    expect(out.backupsOld).toBeGreaterThanOrEqual(1); expect(out.backupsTrim).toBeGreaterThanOrEqual(2); expect(out.sessions).toBeGreaterThanOrEqual(1);
    expect(await count(`select 1 from save_backups where child_id = $1`, [kid])).toBe(10);
    expect(await count(`select 1 from users where id = $1`, [stale.userId])).toBe(0);
    expect(await count(`select 1 from users where id = $1`, [fresh.userId])).toBe(1);
    expect(await count(`select 1 from users where id = $1`, [old.userId])).toBe(0);
    expect(await count(`select 1 from child_profiles where id = $1`, [old.kids[0]])).toBe(0);
    expect(await count(`select 1 from users where id = $1`, [P.userId])).toBe(1);
    expect(await count(`select 1 from saves where child_id = $1`, [kid])).toBe(1);
    expect(await count(`select 1 from rate_limits where window_start < now() - interval '1 day'`)).toBe(0);
    expect(await count(`select 1 from audit_log where at < now() - interval '2 years'`)).toBe(0);
    expect(await count(`select 1 from audit_log where action = 'cron_daily'`)).toBeGreaterThanOrEqual(1);
  });
});
