import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { freshDb, parent, snapshot, DEVICE, type TestDb } from './helpers.js';
import { progressKey, compareKeys, validateWorld } from '../../server/progress.js';

let t: TestDb;
beforeAll(async () => { t = await freshDb(); });
afterAll(async () => { await t.close(); });
const put = (p: any, kid: string, b: Record<string, unknown>) => p.api('PUT', `/children/${kid}/save`, { deviceId: DEVICE, contentVersion: 'c1', mastery: [], graphs: [], ...b });
const md = (o: Record<string, unknown>) => ({ item: 'C001', way: 'rZE', da: 1, dc: 1, box: 1, due: 100, last: 100, wrongRun: 0, ...o });

describe('save round trip', () => {
  it('stores the snapshot, position columns, mastery and graphs; loads them back', async () => {
    const p = await parent(t.db, 'rt@example.com', { children: 1 }); const kid = p.kids[0];
    const empty = await p.api('GET', `/children/${kid}/save`);
    expect(empty.body).toMatchObject({ version: 0, state: null, graphs: [], mastery: [] });
    const st = snapshot({ level: 4, gold: 77 }, { pos: { graph: 'realm_1', node: 'village', edge: null, step: 0 }, zonesDefeated: ['meadow'] });
    const r = await put(p, kid, { baseVersion: 0, seq: 1, state: st, mastery: [md({ da: 3, dc: 2 }), md({ way: 'rEZ', da: 2, dc: 2 }), md({ item: 'C002', da: 1, dc: 0 })],
      graphs: [{ graph: 'realm_1', visited: 'Aw==', cleared: 'AQ==', lastNode: 'village' }] });
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ ok: true, version: 1, conflict: false });
    const g = await p.api('GET', `/children/${kid}/save`);
    expect(g.body.version).toBe(1);
    expect(g.body.contentVersion).toBe('c1');
    expect(g.body.state).toEqual(st);
    expect(g.body.graphs).toEqual([{ graph: 'realm_1', n: expect.any(Number), visited: 'Aw==', cleared: 'AQ==', lastNode: 'village' }]);
    const c001 = g.body.mastery.find((m: any) => m.item === 'C001');
    expect(c001.ways.rZE).toMatchObject({ a: 3, c: 2, box: 1 });
    expect(c001.ways.rEZ).toMatchObject({ a: 2, c: 2 });
    expect(c001.proficient).toBe(true);    // both reading ways c >= 2 and no speaking way asked yet
    expect(g.body.mastery.find((m: any) => m.item === 'C002').proficient).toBe(false);
    const cols = (await t.db.query(`select pos_realm, pos_graph, pos_node, last_inn_graph, last_inn_node, bosses, schema, progress_key from saves where child_id = $1`, [kid])).rows[0];
    expect(cols).toMatchObject({ pos_realm: 1, pos_graph: 'realm_1', pos_node: 'village', last_inn_graph: 'realm_1', last_inn_node: 'village', bosses: ['meadow'], schema: 4 });
    expect(cols.progress_key).toEqual(progressKey(st));
    // the next save with the right baseVersion is accepted
    const r2 = await put(p, kid, { baseVersion: 1, seq: 2, state: { ...st, gold: 80 } });
    expect(r2.body).toEqual({ ok: true, version: 2, conflict: false });
  });

  it('merges mastery deltas (a += da, c += dc) and ORs graph bitsets, even across devices', async () => {
    const p = await parent(t.db, 'merge@example.com', { children: 1 }); const kid = p.kids[0];
    await put(p, kid, { baseVersion: 0, seq: 1, state: snapshot(), mastery: [md({ da: 2, dc: 1, box: 2, last: 200 })], graphs: [{ graph: 'realm_1', visited: 'AQ==', cleared: '' }] });
    await put(p, kid, { deviceId: 'device-tablet-02', baseVersion: 0, seq: 1, mastery: [md({ da: 3, dc: 3, box: 5, last: 100 })], graphs: [{ graph: 'realm_1', visited: 'Ag==', cleared: 'Ag==' }] });
    const g = await p.api('GET', `/children/${kid}/save`);
    const w = g.body.mastery[0].ways.rZE;
    expect(w).toMatchObject({ a: 5, c: 4, box: 2, last: 200 });       // counters summed; box from the newer `last`
    expect(g.body.graphs[0]).toMatchObject({ visited: 'Aw==', cleared: 'Ag==' });  // 0b01 | 0b10
  });

  it('makes retries idempotent: a repeated (deviceId, seq) applies nothing', async () => {
    const p = await parent(t.db, 'idem@example.com', { children: 1 }); const kid = p.kids[0];
    const body = { baseVersion: 0, seq: 1, state: snapshot(), mastery: [md({ da: 2, dc: 2 })] };
    expect((await put(p, kid, body)).body.version).toBe(1);
    const again = await put(p, kid, body);
    expect(again.body).toMatchObject({ ok: true, version: 1, duplicate: true });
    const g = await p.api('GET', `/children/${kid}/save`);
    expect(g.body.mastery[0].ways.rZE.a).toBe(2);
    expect((await t.db.query(`select count(*)::int as n from save_backups where child_id = $1`, [kid])).rows[0].n).toBe(0);
  });
});

describe('§9.4 conflict policy', () => {
  it('server has more progress: server wins, the incoming snapshot is kept as a backup', async () => {
    const p = await parent(t.db, 'c1@example.com', { children: 1 }); const kid = p.kids[0];
    await put(p, kid, { baseVersion: 0, seq: 1, state: snapshot({ level: 6 }) });              // v1 from device A
    const stale = snapshot({ level: 3, gold: 999 });
    const r = await put(p, kid, { deviceId: 'device-tablet-02', baseVersion: 0, seq: 1, state: stale });  // device B, offline since v0
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ ok: true, conflict: true, winner: 'server', version: 1 });
    expect(r.body.server.state.level).toBe(6);
    const b = (await t.db.query(`select reason, from_device, state, version from save_backups where child_id = $1`, [kid])).rows;
    expect(b).toHaveLength(1);
    expect(b[0]).toMatchObject({ reason: 'conflict_lost', from_device: 'device-tablet-02', version: 0 });
    expect(b[0].state.gold).toBe(999);
    expect((await p.api('GET', `/children/${kid}/save`)).body.state.level).toBe(6);
  });
  it('incoming has more progress: incoming wins, the server copy goes to backups', async () => {
    const p = await parent(t.db, 'c2@example.com', { children: 1 }); const kid = p.kids[0];
    await put(p, kid, { baseVersion: 0, seq: 1, state: snapshot({ level: 2 }) });
    await put(p, kid, { baseVersion: 1, seq: 2, state: snapshot({ level: 3 }) });               // v2
    const better = snapshot({ level: 3 }, { zonesDefeated: ['meadow'] });                       // a boss beats level
    const r = await put(p, kid, { deviceId: 'device-tablet-02', baseVersion: 1, seq: 1, state: better });
    expect(r.body).toEqual({ ok: true, conflict: true, winner: 'client', version: 3 });
    const b = (await t.db.query(`select reason, version, state, from_device from save_backups where child_id = $1`, [kid])).rows;
    expect(b).toHaveLength(1);
    expect(b[0]).toMatchObject({ reason: 'conflict_lost', version: 2, from_device: null });
    expect(b[0].state.world.zonesDefeated).toEqual([]);
    expect((await p.api('GET', `/children/${kid}/save`)).body.state.world.zonesDefeated).toEqual(['meadow']);
  });
  it('a tie goes to the server copy', async () => {
    const p = await parent(t.db, 'c3@example.com', { children: 1 }); const kid = p.kids[0];
    await put(p, kid, { baseVersion: 0, seq: 1, state: snapshot({ gold: 1 }) });
    await put(p, kid, { baseVersion: 1, seq: 2, state: snapshot({ gold: 2 }) });
    const r = await put(p, kid, { deviceId: 'device-tablet-02', baseVersion: 1, seq: 1, state: snapshot({ gold: 3 }) });
    expect(r.body).toMatchObject({ conflict: true, winner: 'server', version: 2 });
    expect((await p.api('GET', `/children/${kid}/save`)).body.state.gold).toBe(2);
  });
  it('progress key order: bosses > quests > level > exp > nodes > battles', () => {
    expect(compareKeys([1, 0, 1, 0, 0, 0], [0, 9, 99, 999, 99, 99])).toBe(1);
    expect(compareKeys([0, 1, 1, 0, 0, 0], [0, 0, 99, 0, 0, 0])).toBe(1);
    expect(compareKeys([0, 0, 2, 0, 0, 0], [0, 0, 2, 0, 0, 0])).toBe(0);
    const k = progressKey(snapshot({ level: 7, exp: 12, quests: { a: { s: 'claimed' }, b: { s: 'active' } }, storyQuests: { q1: { s: 'completed' } } }, { zonesDefeated: ['x', 'y'] }));
    expect(k).toEqual([2, 2, 7, 12, 2, 10]);   // 'Aw==' = 2 visited nodes, 10 battles
  });
  it('backups list and restore: the current save goes to backups (pre_restore) first', async () => {
    const p = await parent(t.db, 'restore@example.com', { children: 1 }); const kid = p.kids[0];
    await put(p, kid, { baseVersion: 0, seq: 1, state: snapshot({ level: 6 }) });
    await put(p, kid, { deviceId: 'device-tablet-02', baseVersion: 0, seq: 1, state: snapshot({ level: 2, gold: 555 }) });
    const list = await p.api('GET', `/children/${kid}/backups`);
    expect(list.body.backups).toHaveLength(1);
    expect(list.body.backups[0]).not.toHaveProperty('state');
    const r = await p.api('POST', `/children/${kid}/restore`, { backupId: list.body.backups[0].id });
    expect(r.body).toEqual({ ok: true, version: 2 });
    expect((await p.api('GET', `/children/${kid}/save`)).body.state.gold).toBe(555);
    const reasons = (await t.db.query(`select reason from save_backups where child_id = $1 order by id`, [kid])).rows.map(x => x.reason);
    expect(reasons).toEqual(['conflict_lost', 'pre_restore']);
    expect((await p.api('POST', `/children/${kid}/restore`, { backupId: '999999' })).status).toBe(404);
  });
});

describe('snapshot validation (ajv, progress.schema.json)', () => {
  it('accepts the real progress/0.3 shape', () => {
    expect(validateWorld(snapshot().world)).toEqual([]);
  });
  it('rejects a world that breaks the schema, and writes nothing', async () => {
    const p = await parent(t.db, 'schema@example.com', { children: 1 }); const kid = p.kids[0];
    const bad: [string, Record<string, unknown>][] = [
      ['wrong schema id', { schema: 'progress/0.2' }],
      ['bad node id', { pos: { graph: 'realm_1', node: 'Bad Node!' } }],
      ['unknown key', { cheat: true }],
      ['feathers over cap', { feathers: 9 }],
      ['bad bitset', { graphs: { realm_1: { visited: '***' } } }],
    ];
    for (const [why, w] of bad) {
      expect(validateWorld(snapshot({}, w).world).length, why).toBeGreaterThan(0);
      const r = await put(p, kid, { baseVersion: 0, seq: 1, state: snapshot({}, w) });
      expect(r.status, why).toBe(400);
      expect(r.body.message).toMatch(/progress.schema.json/);
    }
    const missing = snapshot(); delete (missing.world as any).seed;
    expect((await put(p, kid, { baseVersion: 0, seq: 1, state: missing })).status).toBe(400);
    expect((await put(p, kid, { baseVersion: 0, seq: 1, state: { ...snapshot(), prog: {} } })).status).toBe(400);   // prog travels as deltas
    expect((await p.api('GET', `/children/${kid}/save`)).body.version).toBe(0);
  });
  it('flags implausible saves without rejecting them (§9.6)', async () => {
    const p = await parent(t.db, 'flags@example.com', { children: 1 }); const kid = p.kids[0];
    const r = await put(p, kid, { baseVersion: 0, seq: 1, state: snapshot({ level: 1, exp: 5000, equip: { weapon: 'not_owned' } }) });
    expect(r.status).toBe(200);
    const g = await p.api('GET', `/children/${kid}/save`);
    expect(g.body.flags).toEqual(expect.arrayContaining(['exp_over_curve', 'equipped_not_owned']));
    expect((await t.db.query(`select count(*)::int as n from audit_log where action = 'save_flagged'`)).rows[0].n).toBeGreaterThan(0);
  });
});

describe('guest import (§12)', () => {
  it('converts a v3 guest save: prog -> word_mastery, log dropped, fresh world, pre_import backup', async () => {
    const p = await parent(t.db, 'import@example.com', { children: 1 }); const kid = p.kids[0];
    await put(p, kid, { baseVersion: 0, seq: 1, state: snapshot({ level: 2 }) });
    const guest = { ...snapshot({ level: 5 }), log: [{ q: 'secret answer log' }], prog: { C001: { seen: true, recentMiss: 0, ways: { rZE: { c: 3, a: 4, box: 2, last: 5, due: 6, wrongRun: 0 } } } } };
    delete (guest as any).world;
    const r = await p.api('POST', `/children/${kid}/import`, { contentVersion: 'c1', save: guest });
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ ok: true, version: 2 });
    const g = await p.api('GET', `/children/${kid}/save`);
    expect(g.body.state.level).toBe(5);
    expect(g.body.state).not.toHaveProperty('log');
    expect(g.body.state).not.toHaveProperty('prog');
    expect(g.body.state.world.schema).toBe('progress/0.3');
    expect(g.body.mastery[0]).toMatchObject({ item: 'C001', seen: true, ways: { rZE: { c: 3, a: 4 } } });
    expect((await t.db.query(`select reason from save_backups where child_id = $1`, [kid])).rows.map(x => x.reason)).toEqual(['pre_import']);
  });
});
