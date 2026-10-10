/** §8.6: with parent B's session, every endpoint that takes a :childId is called with parent A's child. Each must return 404 (never
 *  403), change nothing in A's rows (row hash before and after), and write a cross_parent_denied audit row. The route table is
 *  enumerated, so a new child-scoped route without a case here fails the suite. */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { freshDb, parent, snapshot, DEVICE, PIN, type TestDb } from './helpers.js';
import { ROUTES } from '../../server/router.js';

let t: TestDb;
let A: Awaited<ReturnType<typeof parent>>, B: Awaited<ReturnType<typeof parent>>;
let backupId = '';
beforeAll(async () => {
  t = await freshDb();
  A = await parent(t.db, 'a@example.com', { children: 1 });
  B = await parent(t.db, 'b@example.com', { children: 1 });
  const kid = A.kids[0];
  // give A's child a save, mastery, graph progress and a backup (a forced conflict)
  expect((await A.api('PUT', `/children/${kid}/save`, { baseVersion: 0, deviceId: DEVICE, seq: 1, contentVersion: 'c1', state: snapshot({ level: 5 }),
    mastery: [{ item: 'C001', way: 'rZE', da: 2, dc: 2, box: 1, due: 1, last: 1, wrongRun: 0 }], graphs: [{ graph: 'realm_1', visited: 'Aw==', cleared: 'AQ==' }] })).status).toBe(200);
  await A.api('PUT', `/children/${kid}/save`, { baseVersion: 0, deviceId: 'device-bbbb-2222', seq: 1, contentVersion: 'c1', state: snapshot({ level: 2 }) });
  backupId = (await A.api('GET', `/children/${kid}/backups`)).body.backups[0].id;
});
afterAll(async () => { await t.close(); });

async function rowHash(childId: string) {
  const q = async (sql: string) => JSON.stringify((await t.db.query(sql, [childId])).rows);
  return [
    await q(`select id, parent_id, nickname, avatar, speech_mode, sort, archived_at from child_profiles where id = $1`),
    await q(`select child_id, version, state, progress_key, device_seq, updated_at from saves where child_id = $1`),
    await q(`select * from word_mastery where child_id = $1 order by item_id`),
    await q(`select child_id, graph_id, visited, cleared, updated_at from graph_progress where child_id = $1 order by graph_id`),
    await q(`select id, version, reason, state from save_backups where child_id = $1 order by id`),
  ].join('|');
}

const bodies = (): Record<string, unknown> => ({
  'PATCH /children/:childId': { nickname: 'Hacked' },
  'DELETE /children/:childId': { pin: PIN },
  'GET /children/:childId/save': undefined,
  'PUT /children/:childId/save': { baseVersion: 1, deviceId: 'device-evil-0001', seq: 1, contentVersion: 'c1', state: snapshot({ level: 99 }),
    mastery: [{ item: 'C001', way: 'rZE', da: 50, dc: 0, box: 0, due: 0, last: 9e12, wrongRun: 9 }], graphs: [{ graph: 'realm_1', visited: '/w==', cleared: '/w==' }] },
  'POST /children/:childId/import': { contentVersion: 'c1', save: { version: 3, level: 1, exp: 0 } },
  'GET /children/:childId/backups': undefined,
  'POST /children/:childId/restore': { backupId },
});

describe('cross-parent access', () => {
  const childRoutes = ROUTES.filter(r => r.path.includes(':childId'));
  it('every child-scoped route has a denial case', () => {
    const keys = Object.keys(bodies());
    for (const r of childRoutes) expect(keys, `no cross-parent case for ${r.method} ${r.path}`).toContain(`${r.method} ${r.path}`);
    expect(childRoutes.length).toBeGreaterThanOrEqual(7);
  });
  for (const r of childRoutes) {
    it(`${r.method} ${r.path} with another parent's child -> 404, unchanged, audited`, async () => {
      const kid = A.kids[0];
      const before = await rowHash(kid);
      const audits = (await t.db.query(`select count(*)::int as n from audit_log where action = 'cross_parent_denied'`)).rows[0].n;
      const res = await B.api(r.method, r.path.replace(':childId', kid), bodies()[`${r.method} ${r.path}`]);
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('not_found');
      expect(await rowHash(kid)).toBe(before);
      const after = (await t.db.query(`select count(*)::int as n from audit_log where action = 'cross_parent_denied'`)).rows[0].n;
      expect(after).toBe(audits + 1);
    });
  }
  it('a random (nonexistent) child id is also a 404, so ids cannot be probed', async () => {
    expect((await B.api('GET', '/children/3f1c1f9e-0a51-4f43-9a8e-2b8a4c1d0e77/save')).status).toBe(404);
  });
  it("B's export contains none of A's data", async () => {
    const ex = await B.api('GET', '/export');
    expect(ex.status).toBe(200);
    expect(JSON.stringify(ex.body)).not.toContain(A.kids[0]);
    expect(JSON.stringify(ex.body)).not.toContain('a@example.com');
    expect(ex.body.children).toHaveLength(1);
  });
  it('A still sees its own child and save', async () => {
    const r = await A.api('GET', `/children/${A.kids[0]}/save`);
    expect(r.status).toBe(200);
    expect(r.body.state.level).toBe(5);
  });
});
