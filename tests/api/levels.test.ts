/** Level editor API (level-editor.md §3, §4, §6, §7.1, §8): seed, editor auth and roles (a non-owner can't publish), save with
 *  validation and the optimistic lock, publish as beta, the golden lock, and the public routes the game reads. PGlite by default. */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { freshDb, client, signIn, type TestDb } from './helpers.js';
import { seedLevels } from '../../server/dal/levels.js';
import { levelHash } from '../../src/shared/level/hash.js';
import type { Db } from '../../server/db.js';

const DIR = 'docs/data/levels';
const MAPS = readdirSync(DIR).filter(f => f.endsWith('.json') && f !== 'index.json' && f !== 'world_rules.json').map(f => JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8')));
const START = JSON.parse(readFileSync(`${DIR}/index.json`, 'utf8')).start;
const OWNER_SUB = '100000000000000000001';

/** A Google sign-in as the Auth.js adapter stores it: users + accounts (sub) + sessions. */
async function googleSignIn(db: Db, email: string, sub: string, opts: { ageSec?: number } = {}) {
  const s = await signIn(db, email, opts);
  await db.query(`insert into accounts ("userId", type, provider, "providerAccountId") values ($1, 'oidc', 'google', $2)`, [s.userId, sub]);
  return { ...s, api: client(db, s.token) };
}

let t: TestDb;
let owner: Awaited<ReturnType<typeof googleSignIn>>;
beforeAll(async () => {
  t = await freshDb();
  await seedLevels(t.db, MAPS, START);
  vi.stubEnv('EDITOR_GOOGLE_SUBS', `${OWNER_SUB}, 999`);
  owner = await googleSignIn(t.db, 'jack@example.com', OWNER_SUB);
});
afterAll(async () => { vi.unstubAllEnvs(); await t.close(); });
afterEach(() => { vi.stubEnv('EDITOR_GOOGLE_SUBS', `${OWNER_SUB}, 999`); });

const draftOf = async (id: string) => (await owner.api('GET', `/editor/levels/${id}`)).body;
const pub = (path: string) => client(t.db, null)('GET', path);

describe('seed (§8)', () => {
  it('loads every map from docs/data/levels as published version 1, with release 1', async () => {
    const r = await t.db.query(`select count(*)::int as n, min(published_version) as v, count(distinct state) as states from levels`);
    expect(r.rows[0]).toMatchObject({ n: 38, v: 1 });
    const rel = await t.db.query(`select id, index from content_releases`);
    expect(rel.rows).toHaveLength(1);
    expect(Object.keys(rel.rows[0].index.maps)).toHaveLength(38);
    expect(rel.rows[0].index.start).toEqual(START);
    const m = MAPS.find(x => x.id === 'old_mine_1');
    expect(rel.rows[0].index.maps.old_mine_1.hash).toBe(await levelHash(m));   // = the bundled file's hash
  });
  it('refuses a non-empty table without --restore', async () => {
    await expect(seedLevels(t.db, MAPS, START)).rejects.toThrow(/not empty/);
  });
});

describe('editor auth and roles (§4)', () => {
  it('needs a session (401) and an editor (403 for any other signed-in user)', async () => {
    expect((await client(t.db, null)('GET', '/editor/levels')).status).toBe(401);
    const stranger = await googleSignIn(t.db, 'someone@example.com', '200000000000000000002');
    const r = await stranger.api('GET', '/editor/levels');
    expect(r.status).toBe(403); expect(r.body.error).toBe('not_editor');
  });
  it('the bootstrap Google sub (EDITOR_GOOGLE_SUBS) is the owner, and gets an editors row on first use', async () => {
    const me = await owner.api('GET', '/editor/me');
    expect(me.body).toEqual({ role: 'owner' });
    const row = await t.db.query(`select role, google_sub from editors where user_id = $1`, [String(owner.userId)]);
    expect(row.rows[0]).toEqual({ role: 'owner', google_sub: OWNER_SUB });
  });
  it('a tester can read but cannot save or publish (owner only, checked on the server)', async () => {
    const tester = await googleSignIn(t.db, 'tester@example.com', '300000000000000000003');
    await t.db.query(`insert into editors (user_id, google_sub, role) values ($1, '300000000000000000003', 'tester')`, [String(tester.userId)]);
    expect((await tester.api('GET', '/editor/levels')).body.levels).toHaveLength(38);
    const d = await draftOf('old_mine_1');
    const save = await tester.api('PUT', '/editor/levels/old_mine_1/draft', { draftRev: d.draftRev, body: d.draft });
    expect(save.status).toBe(403);
    const p = await tester.api('POST', '/editor/publish', { levels: [{ id: 'old_mine_1', draftRev: d.draftRev }] });
    expect(p.status).toBe(403); expect(p.body.error).toBe('owner_only');
    expect((await t.db.query(`select count(*)::int as n from content_releases`)).rows[0].n).toBe(1);
  });
  it('a disabled editor row is refused, even for a known role', async () => {
    const gone = await googleSignIn(t.db, 'gone@example.com', '400000000000000000004');
    await t.db.query(`insert into editors (user_id, role, disabled_at) values ($1, 'owner', now())`, [String(gone.userId)]);
    expect((await gone.api('GET', '/editor/levels')).status).toBe(403);
  });
  it('a parent session alone never opens editor routes, and the editor never sees parent routes as an editor', async () => {
    vi.stubEnv('EDITOR_GOOGLE_SUBS', '');
    expect((await owner.api('GET', '/editor/levels')).status).toBe(200);   // the editors row now carries the owner role
    await t.db.query(`update editors set disabled_at = now() where user_id = $1`, [String(owner.userId)]);
    expect((await owner.api('GET', '/editor/levels')).status).toBe(403);
    await t.db.query(`update editors set disabled_at = null where user_id = $1`, [String(owner.userId)]);
  });
  it('writes need the CSRF headers', async () => {
    const d = await draftOf('old_mine_1');
    const r = await owner.api('PUT', '/editor/levels/old_mine_1/draft', { draftRev: d.draftRev, body: d.draft }, { 'x-app-request': '' });
    expect(r.status).toBe(403);
  });
});

describe('save and validate (§6.2, §6.4)', () => {
  it('saves a draft with draft_rev + 1 and returns the validation', async () => {
    const d = await draftOf('old_mine_1');
    d.draft.nodes.find((n: any) => n.id === 'path_1').title = { en: 'Very dark hall' };
    const r = await owner.api('PUT', '/editor/levels/old_mine_1/draft', { draftRev: d.draftRev, body: d.draft });
    expect(r.status).toBe(200);
    expect(r.body.draftRev).toBe(d.draftRev + 1);
    expect(r.body.validation.filter((p: any) => p.level === 'error')).toEqual([]);
    expect((await draftOf('old_mine_1')).draft.nodes.find((n: any) => n.id === 'path_1').title.en).toBe('Very dark hall');
  });
  it('a stale draftRev is a 409 with the server copy', async () => {
    const d = await draftOf('old_mine_1');
    const r = await owner.api('PUT', '/editor/levels/old_mine_1/draft', { draftRev: d.draftRev - 1, body: d.draft });
    expect(r.status).toBe(409);
    expect(r.body).toMatchObject({ error: 'draft_conflict', draftRev: d.draftRev });
    expect(r.body.draft.id).toBe('old_mine_1');
  });
  it('saving is never blocked by validation errors', async () => {
    const d = await draftOf('realm_4');
    d.draft.settings.words = [...d.draft.settings.words, 'C9999'];
    const r = await owner.api('PUT', '/editor/levels/realm_4/draft', { draftRev: d.draftRev, body: d.draft });
    expect(r.status).toBe(200);
    expect(r.body.validation.map((p: any) => p.code)).toContain('word_unknown');
    const list = (await owner.api('GET', '/editor/levels')).body.levels;
    expect(list.find((l: any) => l.id === 'realm_4')).toMatchObject({ errors: expect.any(Number), draftAhead: true });
  });
  it('rejects a body for another map and a malformed envelope (zod)', async () => {
    const d = await draftOf('old_mine_1');
    expect((await owner.api('PUT', '/editor/levels/realm_1/draft', { draftRev: 1, body: d.draft })).status).toBe(400);
    expect((await owner.api('PUT', '/editor/levels/old_mine_1/draft', { draftRev: d.draftRev, body: { id: 'old_mine_1' } })).status).toBe(400);
    expect((await owner.api('PUT', '/editor/levels/old_mine_1/draft', { draftRev: d.draftRev, body: d.draft, extra: 1 })).status).toBe(400);
  });
});

describe('publish as beta (§6.3, §7.1)', () => {
  it('publishing errors is a 422 and writes nothing', async () => {
    const d = await draftOf('realm_4');
    const r = await owner.api('POST', '/editor/publish', { levels: [{ id: 'realm_4', draftRev: d.draftRev }] });
    expect(r.status).toBe(422);
    expect(r.body.problems.realm_4.length).toBeGreaterThan(0);
    expect((await t.db.query(`select published_version from levels where id = 'realm_4'`)).rows[0].published_version).toBe(1);
  });
  it('drafts are not public until published; publish makes version 2 in a new release with a new hash', async () => {
    const before = (await pub('/levels/index')).body;
    expect((await pub('/levels/old_mine_1?v=1')).body.nodes.find((n: any) => n.id === 'path_1').title.en).toBe('Dark hall');
    const d = await draftOf('old_mine_1');
    const r = await owner.api('POST', '/editor/publish', { levels: [{ id: 'old_mine_1', draftRev: d.draftRev }], note: 'test' });
    expect(r.status).toBe(200);
    expect(r.body.versions).toEqual({ old_mine_1: 2 });
    const idx = await pub('/levels/index');
    expect(idx.body.release).toBe(before.release + 1);
    expect(idx.body.maps.old_mine_1).toMatchObject({ v: 2, state: 'beta' });
    expect(idx.body.maps.old_mine_1.hash).not.toBe(before.maps.old_mine_1.hash);
    expect(idx.headers.get('etag')).toBe(`"r${idx.body.release}"`);
    expect(idx.headers.get('cdn-cache-control')).toMatch(/s-maxage=300/);
    const lv = await pub('/levels/old_mine_1?v=2');
    expect(lv.body.version).toBe(2);
    expect(lv.body.nodes.find((n: any) => n.id === 'path_1').title.en).toBe('Very dark hall');
    expect(lv.headers.get('cache-control')).toMatch(/immutable/);
    const audit = await t.db.query(`select actor_type from audit_log where action = 'level.publish'`);
    expect(audit.rows).toEqual([{ actor_type: 'editor' }]);
  });
  it('GET /levels/:id without v redirects to the current version; unknown maps are 404', async () => {
    const r = await pub('/levels/old_mine_1');
    expect(r.status).toBe(302);
    expect(r.headers.get('location')).toBe('/api/v1/levels/old_mine_1?v=2');
    expect((await pub('/levels/no_such_map?v=1')).status).toBe(404);
  });
  it('a draft-state map leaves the public index', async () => {
    const d = await draftOf('cloud_caves_1');
    d.draft.state = 'draft';
    const s = await owner.api('PUT', '/editor/levels/cloud_caves_1/draft', { draftRev: d.draftRev, body: d.draft });
    await owner.api('POST', '/editor/publish', { levels: [{ id: 'cloud_caves_1', draftRev: s.body.draftRev }] });
    expect((await pub('/levels/index')).body.maps.cloud_caves_1).toBeUndefined();
    expect((await pub('/levels/cloud_caves_1?v=1')).status).toBe(404);
  });
  it('publishing needs a session younger than 12 hours (step-up)', async () => {
    const old = await googleSignIn(t.db, 'jack@example.com'.replace('jack', 'jack2'), OWNER_SUB.replace(/1$/, '5'), { ageSec: 13 * 3600 });
    vi.stubEnv('EDITOR_GOOGLE_SUBS', OWNER_SUB.replace(/1$/, '5'));
    const d = await draftOf('old_mine_1');
    const r = await old.api('POST', '/editor/publish', { levels: [{ id: 'old_mine_1', draftRev: d.draftRev }] });
    expect(r.status).toBe(403); expect(r.body.error).toBe('step_up');
  });
  it('shows how many saves have progress on a map (a count only)', async () => {
    const r = await owner.api('GET', '/editor/levels/old_mine_1/affected');
    expect(r.body).toEqual({ saves: 0 });
  });
});

describe('golden lock (§4.1)', () => {
  it('a golden map changes only with the owner’s confirm, recorded as a golden-unlock revision', async () => {
    let d = await draftOf('realm_9');
    d.draft.state = 'golden';
    let s = await owner.api('PUT', '/editor/levels/realm_9/draft', { draftRev: d.draftRev, body: d.draft });
    expect((await owner.api('POST', '/editor/publish', { levels: [{ id: 'realm_9', draftRev: s.body.draftRev }] })).status).toBe(200);
    d = await draftOf('realm_9');
    expect(d.state).toBe('golden');
    const refused = await owner.api('PUT', '/editor/levels/realm_9/draft', { draftRev: d.draftRev, body: d.draft });
    expect(refused.status).toBe(409); expect(refused.body.error).toBe('golden_locked');
    s = await owner.api('PUT', '/editor/levels/realm_9/draft', { draftRev: d.draftRev, body: d.draft, goldenConfirm: true });
    expect(s.status).toBe(200);
    const rev = await t.db.query(`select count(*)::int as n from level_revisions where level_id = 'realm_9' and kind = 'golden-unlock'`);
    expect(rev.rows[0].n).toBe(1);
  });
});

describe('Download JSON (§9.2)', () => {
  it('returns every published map to an editor session, as an attachment', async () => {
    const r = await owner.api('GET', '/editor/export');
    expect(r.status).toBe(200);
    expect(r.headers.get('content-disposition')).toMatch(/attachment/);
    expect(Object.keys(r.body.levels)).toHaveLength(38);
    expect((await client(t.db, null)('GET', '/editor/export')).status).toBe(401);
  });
});

describe('server/seed-levels.mjs (§8)', () => {
  it('bundles the TypeScript seed and seeds a fresh database from docs/data/levels', async () => {
    // @ts-ignore plain JS
    const { loadSeed } = await import('../../server/seed-levels.mjs');
    const { seedFromDir } = await loadSeed();
    const fresh = await freshDb();
    try {
      expect(await seedFromDir(fresh.db, DIR)).toEqual({ maps: 38, release: 1 });
      await expect(seedFromDir(fresh.db, DIR)).rejects.toThrow(/not empty/);
      expect(await seedFromDir(fresh.db, DIR, { restore: true })).toMatchObject({ maps: 38 });
    } finally { await fresh.close(); }
  });
});
