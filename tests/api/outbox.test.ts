/** The browser outbox (src/net/outbox.ts) against the real router: snapshot without prog/log, mastery deltas sent once, graph bitsets,
 *  idempotent retries after a lost response, offline / 503 / 429 keep the batch, 400 drops it, sign-out pauses, server-wins conflicts. */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { freshDb, parent, snapshot, type TestDb } from './helpers';
import { handle } from '../../server/router';
import { ApiClient } from '../../src/net/api';
import { Outbox, type KV } from '../../src/net/outbox';
import { cloudChild, cloudSender, CLOUD_KEY } from '../../src/net/cloud';

let t: TestDb;
beforeAll(async () => { t = await freshDb(); });
afterAll(async () => { await t.close(); });

const memKV = (): KV & { m: Map<string, string> } => { const m = new Map<string, string>(); return { m, get: k => m.get(k) ?? null, set: (k, v) => void m.set(k, v), remove: k => void m.delete(k) }; };
/** fetch -> the router, with the browser's same-origin headers and the test session; `mode` simulates the network. */
function net(token: string) {
  const s = { mode: 'ok' as 'ok' | 'offline' | 'lostResponse' | 'down', calls: 0 };
  const api = new ApiClient('/api/v1', async (u, init) => {
    s.calls++;
    if (s.mode === 'offline') throw new TypeError('Failed to fetch');
    if (s.mode === 'down') return new Response(JSON.stringify({ error: 'unavailable' }), { status: 503, headers: { 'retry-after': '60' } });
    const h = new Headers(init.headers as any); h.set('origin', 'http://localhost:5173'); h.set('sec-fetch-site', 'same-origin'); h.set('x-test-session', token);
    const res = await handle(new Request('http://localhost:5173' + u, { ...init, headers: h }), { db: t.db });
    if (s.mode === 'lostResponse') { s.mode = 'ok'; throw new TypeError('network reset'); }   // the server applied it, the reply is lost
    return res;
  });
  return { api, s };
}
const prog = (a: number, c: number) => ({ C001: { seen: true, recentMiss: 1, ways: { rZE: { a, c, box: 2, due: 5, last: 4, wrongRun: 0 }, rEZ: { a: 0, c: 0, box: 0, due: 0, last: 0, wrongRun: 0 } } } });
const full = (level: number, a: number, c: number, visited = 'Aw==') => ({ ...snapshot({ level }, { graphs: { realm_1: { visited, walked: 'AQ==', revealed: '', crossings: {}, edgeProgress: {}, visits: {} } } }),
  prog: prog(a, c), log: [{ t: 1, id: 'C001', result: 'correct' }] });

describe('cloud outbox (§9.2)', () => {
  it('pushes the snapshot without prog/log, mastery deltas once, and changed graph bitsets', async () => {
    const P = await parent(t.db, 'outbox1@example.com', { children: 1 }); const { api } = net(P.token);
    const box = new Outbox(memKV(), api, P.kids[0], 'graph');
    box.enqueue(full(3, 4, 3)); expect(await box.flush()).toMatchObject({ kind: 'sent', version: 1 });
    const s = (await t.db.query(`select state, version from saves where child_id = $1`, [P.kids[0]])).rows[0];
    expect(s.version).toBe(1); expect('prog' in s.state).toBe(false); expect('log' in s.state).toBe(false); expect(s.state.level).toBe(3);
    const m = async () => (await t.db.query(`select ways from word_mastery where child_id = $1 and item_id = 'C001'`, [P.kids[0]])).rows[0].ways.rZE;
    expect(await m()).toMatchObject({ a: 4, c: 3 });
    box.enqueue(full(3, 6, 4)); expect(await box.flush()).toMatchObject({ kind: 'sent', version: 2 });
    expect(await m()).toMatchObject({ a: 6, c: 4 });                 // +2/+1, not +6/+4 again
    box.enqueue(full(3, 6, 4, 'Bw==')); await box.flush();
    expect(await m()).toMatchObject({ a: 6, c: 4 });                 // nothing new: no delta
    const g = (await t.db.query(`select encode(visited, 'base64') as v from graph_progress where child_id = $1 and graph_id = 'realm_1'`, [P.kids[0]])).rows[0];
    expect(g.v).toBe('Bw==');
    expect(await box.flush()).toEqual({ kind: 'idle' });
  });
  it('a lost response is retried with the same seq: the server ignores the duplicate, counters are not doubled', async () => {
    const P = await parent(t.db, 'outbox2@example.com', { children: 1 }); const { api, s } = net(P.token); const kv = memKV();
    const box = new Outbox(kv, api, P.kids[0], 'graph');
    box.enqueue(full(2, 3, 3)); s.mode = 'lostResponse';
    expect((await box.flush()).kind).toBe('retry');
    const again = new Outbox(kv, api, P.kids[0], 'graph');        // a reload: the batch is persisted
    expect(again.hasWork).toBe(true);
    expect(await again.flush()).toMatchObject({ kind: 'sent', duplicate: true });
    expect((await t.db.query(`select ways from word_mastery where child_id = $1`, [P.kids[0]])).rows[0].ways.rZE).toMatchObject({ a: 3, c: 3 });
  });
  it('offline, 503 and 429 keep the batch (with a back-off); 400 drops it; a sign-out keeps it for later', async () => {
    const P = await parent(t.db, 'outbox3@example.com', { children: 1 }); const { api, s } = net(P.token);
    const box = new Outbox(memKV(), api, P.kids[0], 'graph');
    box.enqueue(full(2, 1, 1)); s.mode = 'offline';
    const r1 = await box.flush(); expect(r1.kind).toBe('retry'); expect(box.hasWork).toBe(true);
    s.mode = 'down'; const r2: any = await box.flush(); expect(r2).toMatchObject({ kind: 'retry', status: 503, afterSec: 60 });
    s.mode = 'ok'; expect((await box.flush()).kind).toBe('sent');
    await t.db.query(`insert into rate_limits (bucket, subject, window_start, count) values ('save_m', $1, to_timestamp(floor(extract(epoch from now()) / 60) * 60), 60)
      on conflict (bucket, subject, window_start) do update set count = 60`, [String(P.userId)]);
    box.enqueue(full(2, 2, 2)); expect(await box.flush()).toMatchObject({ kind: 'retry', status: 429 });
    await t.db.query(`delete from rate_limits`);
    expect((await box.flush()).kind).toBe('sent');
    box.enqueue({ ...full(2, 2, 2), world: { schema: 'progress/0.3', junk: true } }); expect(await box.flush()).toMatchObject({ kind: 'dropped', status: 400 });
    expect(box.hasWork).toBe(false);
    await t.db.query(`delete from sessions where "userId" = $1`, [P.userId]);
    box.enqueue(full(2, 3, 3)); expect(await box.flush()).toMatchObject({ kind: 'signedOut', status: 401 }); expect(box.hasWork).toBe(true);
  });
  it('two devices: the one with less progress loses (server wins) and is told about the newer cloud save', async () => {
    const P = await parent(t.db, 'outbox4@example.com', { children: 1 });
    const a = new Outbox(memKV(), net(P.token).api, P.kids[0], 'graph'), b = new Outbox(memKV(), net(P.token).api, P.kids[0], 'graph');
    expect(a.deviceId).not.toBe(b.deviceId);
    a.enqueue(full(5, 1, 1)); await a.flush();
    b.enqueue(full(2, 1, 1)); const r: any = await b.flush();
    expect(r.kind).toBe('conflict'); expect(r.winner).toBe('server'); expect(r.server.state.level).toBe(5);
    expect((await t.db.query(`select count(*)::int as n from save_backups where child_id = $1 and reason = 'conflict_lost'`, [P.kids[0]])).rows[0].n).toBe(1);
  });
  it('cloud saving is off by default: no build flag or no chosen child -> no sender', () => {
    const kv = memKV();
    expect(cloudSender(false, 'graph', { kv })).toBeUndefined();
    expect(cloudSender(true, 'graph', { kv })).toBeUndefined();
    kv.set(CLOUD_KEY, JSON.stringify({ childId: 'not-a-uuid' })); expect(cloudChild(kv)).toBeNull();
    kv.set(CLOUD_KEY, JSON.stringify({ childId: '3f1c1f9e-0a51-4f43-9a8e-2b8a4c1d0e77' }));
    expect(cloudSender(false, 'graph', { kv })).toBeUndefined();
    expect(typeof cloudSender(true, 'graph', { kv, api: new ApiClient('/x', async () => new Response('{}', { status: 503 })) })).toBe('function');
  });
});
