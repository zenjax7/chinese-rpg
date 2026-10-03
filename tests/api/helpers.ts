/** Test harness: a fresh, migrated database per test file. Default: PGlite (Postgres 17 compiled to WASM, in-process, no network
 *  services). Set TEST_DATABASE_URL to run the same suite against a real Postgres (each file gets its own schema). */
import { randomBytes } from 'node:crypto';
import type { Db, Queryable } from '../../server/db';
import { wrapPool } from '../../server/db';
// @ts-ignore plain JS
import { migrate } from '../../server/migrate.mjs';
import { handle } from '../../server/router';

export const ORIGIN = 'http://localhost:5173';

function wrapPglite(pg: any): Db {
  const norm = (r: any) => ({ rows: r.rows, rowCount: r.affectedRows ?? r.rows.length });
  const client = (c: any): Queryable => ({ query: async (t, p = []) => norm(await c.query(t, p)), exec: async t => { await c.exec(t); } });
  return { ...client(pg), tx: fn => pg.transaction((t: any) => fn(client(t))) } as Db;
}

export interface TestDb { db: Db; close: () => Promise<void>; kind: 'pglite' | 'postgres' }
export async function freshDb(): Promise<TestDb> {
  const url = process.env.TEST_DATABASE_URL;
  let t: TestDb;
  if (url) {
    const { default: pg } = await import('pg');
    const schema = `t_${randomBytes(6).toString('hex')}`;
    const admin = new pg.Pool({ connectionString: url, max: 1 });
    await admin.query(`create schema ${schema}`);
    await admin.end();
    const pool = new pg.Pool({ connectionString: url, max: 4, options: `-c search_path=${schema}` });
    t = { db: wrapPool(pool), kind: 'postgres', close: async () => { await pool.query(`drop schema ${schema} cascade`); await pool.end(); } };
  } else {
    const { PGlite } = await import('@electric-sql/pglite');
    const pg = await PGlite.create();
    t = { db: wrapPglite(pg), kind: 'pglite', close: () => pg.close() };
  }
  await migrate(t.db);
  return t;
}

/** What the Auth.js adapter does at sign-in: a users row and a sessions row. Returns the session token. */
export async function signIn(db: Db, email: string, opts: { ageSec?: number; expiresInSec?: number } = {}) {
  const u = await db.query(`insert into users (email, "emailVerified") values ($1, now()) returning id`, [email]);
  const token = randomBytes(24).toString('hex');
  const s = await db.query(`insert into sessions ("userId", expires, "sessionToken", created_at) values ($1, now() + make_interval(secs => $2), $3, now() - make_interval(secs => $4)) returning id`,
    [u.rows[0].id, opts.expiresInSec ?? 30 * 86400, token, opts.ageSec ?? 3600]);
  return { userId: u.rows[0].id as number, sessionId: s.rows[0].id as number, token };
}

export type Call = (method: string, path: string, body?: unknown, headers?: Record<string, string>) => Promise<{ status: number; body: any; headers: Headers }>;
/** A same-origin browser request from the game: Origin, X-App-Request and JSON content type, with the test session header. */
export function client(db: Db, token: string | null, base: Record<string, string> = {}): Call {
  return async (method, path, body, headers = {}) => {
    const h: Record<string, string> = { origin: ORIGIN, 'x-app-request': '1', 'content-type': 'application/json', 'sec-fetch-site': 'same-origin',
      'x-real-ip': '203.0.113.7', 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 Chrome/140.0 Safari/537.36', ...base, ...headers };
    if (token) h['x-test-session'] = token;
    for (const k of Object.keys(h)) if (h[k] === '') delete h[k];
    const req = new Request(`${ORIGIN}/api/v1${path}`, { method, headers: h, body: body === undefined || method === 'GET' ? undefined : typeof body === 'string' ? body : JSON.stringify(body) });
    const res = await handle(req, { db });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null, headers: res.headers };
  };
}

export const PIN = '4821';
/** A parent who signed in, consented (PIN set) and unlocked the parent area. */
export async function parent(db: Db, email: string, opts: { children?: number } = {}) {
  const s = await signIn(db, email);
  const api = client(db, s.token);
  const c = await api('POST', '/consent', { noticeVersion: 'v1', pin: PIN, attest: true });
  if (c.status !== 200) throw new Error(`consent failed ${c.status} ${JSON.stringify(c.body)}`);
  const u = await api('POST', '/parent/unlock', { pin: PIN });
  if (u.status !== 200) throw new Error(`unlock failed ${u.status}`);
  const kids: string[] = [];
  for (let i = 0; i < (opts.children ?? 0); i++) kids.push((await api('POST', '/children', { nickname: `Kid${i + 1}`, avatar: 'fox' })).body.id);
  return { ...s, api, kids };
}

/** A valid graph-mode snapshot (SaveState v3 + progress/0.3 world), without prog and log. */
export function snapshot(over: Record<string, any> = {}, world: Record<string, any> = {}) {
  return {
    version: 3, level: 3, exp: 40, hp: 30, mp: 10, gold: 120, inv: { honey: 2 }, gear: ['wood_sword'], equip: { weapon: 'wood_sword', armor: null, shield: null, charm: null },
    skills: [], skillsEquipped: [], courage: 0, lastDefeatLoc: null, where: 'town', lastInn: null, practice: {}, locs: {},
    stats: { battles: 10, wins: 9, defeats: 1, flees: 0, freeInn: 0, paidInn: 0, questions: 40, correct: 30, spoken: 0, voids: 0 },
    spells: [], quests: {}, consent: { given: true, speech: false, at: 0 },
    ...over,
    world: { schema: 'progress/0.3', seed: 42, pos: { graph: 'realm_1', node: 'village', edge: null, step: 0 }, lastInn: { graph: 'realm_1', node: 'village' },
      visitedTowns: [], graphs: { realm_1: { visited: 'Aw==', walked: '', revealed: '', crossings: {}, edgeProgress: {}, visits: {} } },
      eventsDone: [], eventLastFired: {}, shortcuts: [], zonesDefeated: [], flags: [], feathers: 2, ...world },
  };
}
export const DEVICE = 'device-aaaa-1111';
