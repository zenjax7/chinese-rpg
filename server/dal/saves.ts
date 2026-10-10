import type { Db, Queryable } from '../db';
import type { Ctx } from '../ctx';
import type { SaveBody } from '../schemas';
import { badRequest } from '../errors';
import { validateWorld, progressKey, compareKeys, positionColumns, plausibilityFlags, startNode } from '../progress';
import { audit } from './audit';
import { hit, LIMITS } from './rateLimit';
import { denied, requireConsent } from './guard';
import { applyMastery } from './mastery';
import { applyGraphs } from './graphs';

/** saves.schema: 4 = today's SaveState (version 3) plus the graph-mode `world` (progress/0.3), without prog and log. */
export const SNAPSHOT_SCHEMA = 4;
const b64 = (b: Uint8Array | null) => Buffer.from(b ?? new Uint8Array()).toString('base64');

/** Locks the child row (ownership in the same statement) and returns it with its save, or null when it isn't this parent's child. */
async function lockOwnedChild(q: Queryable, childId: string, parentId: number) {
  const { rows } = await q.query(
    `select c.id, c.speech_mode, s.child_id as has_save, s.version, s.state, s.progress_key, s.device_seq, s.content_version, s.flags
       from child_profiles c left join saves s on s.child_id = c.id
      where c.id = $1 and c.parent_id = $2 and c.archived_at is null
      for update of c`, [childId, parentId]);
  return rows[0] ?? null;
}

/** GET /children/:id/save: the snapshot, version and content_version, plus every graph_progress and word_mastery row. */
export async function loadSave(db: Db, ctx: Ctx, childId: string) {
  const parentId = requireConsent(ctx);
  const { rows } = await db.query(
    `select c.id, s.version, s.content_version, s.state, s.updated_at, s.flags
       from child_profiles c left join saves s on s.child_id = c.id
      where c.id = $1 and c.parent_id = $2 and c.archived_at is null`, [childId, parentId]);
  if (!rows.length) return denied(db, ctx, childId, 'GET save');
  const g = await db.query(
    `select g.graph_id, g.node_count, g.visited, g.cleared, g.last_node from graph_progress g
       join child_profiles c on c.id = g.child_id where g.child_id = $1 and c.parent_id = $2 order by g.graph_id`, [childId, parentId]);
  const m = await db.query(
    `select m.item_id, m.seen, m.recent_miss, m.ways, m.proficient from word_mastery m
       join child_profiles c on c.id = m.child_id where m.child_id = $1 and c.parent_id = $2 order by m.item_id`, [childId, parentId]);
  const s = rows[0];
  return {
    version: s.version ?? 0, contentVersion: s.content_version ?? null, state: s.state ?? null, updatedAt: s.updated_at ?? null, flags: s.flags ?? [],
    graphs: g.rows.map(r => ({ graph: r.graph_id, n: r.node_count, visited: b64(r.visited), cleared: b64(r.cleared), lastNode: r.last_node })),
    mastery: m.rows.map(r => ({ item: r.item_id, seen: r.seen, recentMiss: r.recent_miss, ways: r.ways, proficient: r.proficient })),
  };
}

export type SaveResult =
  | { ok: true; version: number; conflict: false; duplicate?: boolean }
  | { ok: true; version: number; conflict: true; winner: 'client' }
  | { ok: true; version: number; conflict: true; winner: 'server'; server: { version: number; contentVersion: string; state: unknown } };

/** PUT /children/:id/save, the §9 policy, in one transaction with the child row locked:
 *  - a repeated (deviceId, seq) returns the current version without re-applying anything (idempotent retries, §9.2);
 *  - mastery deltas and graph bitsets always merge (§9.4 rules 1-2);
 *  - the snapshot: baseVersion == server version -> accepted. Otherwise it's a conflict and the save with more progress
 *    (the §9.4 progress key) wins; a tie goes to the server. The loser is copied to save_backups ('conflict_lost'). */
export async function saveProgress(db: Db, ctx: Ctx, childId: string, body: SaveBody): Promise<SaveResult> {
  const parentId = requireConsent(ctx);
  if (body.state) {
    const errs = validateWorld(body.state.world);
    if (errs.length) throw badRequest('The save does not match progress.schema.json.', errs);
  }
  await hit(db, LIMITS.saveMinute, parentId);
  await hit(db, LIMITS.saveHour, parentId);
  const r = await db.tx(async q => {
    const c = await lockOwnedChild(q, childId, parentId);
    if (!c) return null;
    const seen = Number(c.device_seq?.[body.deviceId] ?? 0);
    if (c.has_save && body.seq <= seen) return { ok: true, version: c.version, conflict: false, duplicate: true } as SaveResult;
    await applyMastery(q, childId, body.mastery, c.speech_mode !== 'off');
    await applyGraphs(q, childId, body.graphs);
    let result: SaveResult = { ok: true, version: c.version ?? 0, conflict: false };
    let wrote = false;
    if (body.state) {
      const st = body.state as Record<string, any>;
      const key = progressKey(st);
      const flags = plausibilityFlags(st);
      const write = async (version: number) => {
        wrote = true;
        const p = positionColumns(st);
        await q.query(
          `insert into saves (child_id, version, schema, content_version, state, progress_key, pos_realm, pos_graph, pos_node, pos_dungeon, pos_level,
                              last_inn_graph, last_inn_node, bosses, device_seq, flags, updated_at)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, now())
           on conflict (child_id) do update set version = excluded.version, schema = excluded.schema, content_version = excluded.content_version,
             state = excluded.state, progress_key = excluded.progress_key, pos_realm = excluded.pos_realm, pos_graph = excluded.pos_graph,
             pos_node = excluded.pos_node, pos_dungeon = excluded.pos_dungeon, pos_level = excluded.pos_level, last_inn_graph = excluded.last_inn_graph,
             last_inn_node = excluded.last_inn_node, bosses = excluded.bosses, flags = excluded.flags, updated_at = now(),
             device_seq = saves.device_seq || excluded.device_seq`,
          [childId, version, SNAPSHOT_SCHEMA, body.contentVersion, JSON.stringify(st), key, p.pos_realm, p.pos_graph, p.pos_node, p.pos_dungeon, p.pos_level,
            p.last_inn_graph, p.last_inn_node, p.bosses, JSON.stringify({ [body.deviceId]: body.seq }), flags]);
        if (flags.length) await audit(q, { actor: 'system', parentId, childId, action: 'save_flagged', details: { flags } });
      };
      const backup = async (from: { version: number | null; contentVersion: string; key: number[]; state: unknown }, device: string | null) =>
        q.query(`insert into save_backups (child_id, version, content_version, progress_key, state, reason, from_device) values ($1, $2, $3, $4, $5, 'conflict_lost', $6)`,
          [childId, from.version, from.contentVersion, from.key, JSON.stringify(from.state), device]);
      if (!c.has_save) { await write(1); result = { ok: true, version: 1, conflict: false }; }
      else if (body.baseVersion === c.version) { await write(c.version + 1); result = { ok: true, version: c.version + 1, conflict: false }; }
      else if (compareKeys(key, c.progress_key ?? []) > 0) {
        await backup({ version: c.version, contentVersion: c.content_version, key: c.progress_key, state: c.state }, null);
        await write(c.version + 1);
        result = { ok: true, version: c.version + 1, conflict: true, winner: 'client' };
      } else {
        await backup({ version: body.baseVersion, contentVersion: body.contentVersion, key, state: st }, body.deviceId);
        result = { ok: true, version: c.version, conflict: true, winner: 'server', server: { version: c.version, contentVersion: c.content_version, state: c.state } };
      }
    }
    if (c.has_save && !wrote)
      await q.query(`update saves set device_seq = device_seq || $2 where child_id = $1`, [childId, JSON.stringify({ [body.deviceId]: body.seq })]);
    await q.query(`update parents set last_active_at = now() where user_id = $1 and (last_active_at is null or last_active_at < now() - interval '1 hour')`, [parentId]);
    return result;
  });
  if (!r) return denied(db, ctx, childId, 'PUT save');
  return r;
}

/** Shared by import and restore: replace the current snapshot (after backing it up with `reason`). */
export async function replaceSnapshot(q: Queryable, childId: string, st: Record<string, any>, contentVersion: string, reason: 'pre_import' | 'pre_restore') {
  const { rows } = await q.query(`select version, content_version, progress_key, state from saves where child_id = $1`, [childId]);
  const cur = rows[0];
  if (cur) await q.query(`insert into save_backups (child_id, version, content_version, progress_key, state, reason) values ($1, $2, $3, $4, $5, $6)`,
    [childId, cur.version, cur.content_version, cur.progress_key, JSON.stringify(cur.state), reason]);
  const p = positionColumns(st), version = (cur?.version ?? 0) + 1;
  await q.query(
    `insert into saves (child_id, version, schema, content_version, state, progress_key, pos_realm, pos_graph, pos_node, pos_dungeon, pos_level, last_inn_graph, last_inn_node, bosses, flags)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
     on conflict (child_id) do update set version = excluded.version, schema = excluded.schema, content_version = excluded.content_version, state = excluded.state,
       progress_key = excluded.progress_key, pos_realm = excluded.pos_realm, pos_graph = excluded.pos_graph, pos_node = excluded.pos_node,
       pos_dungeon = excluded.pos_dungeon, pos_level = excluded.pos_level, last_inn_graph = excluded.last_inn_graph, last_inn_node = excluded.last_inn_node,
       bosses = excluded.bosses, flags = excluded.flags, updated_at = now()`,
    [childId, version, SNAPSHOT_SCHEMA, contentVersion, JSON.stringify(st), progressKey(st), p.pos_realm, p.pos_graph, p.pos_node, p.pos_dungeon, p.pos_level,
      p.last_inn_graph, p.last_inn_node, p.bosses, plausibilityFlags(st)]);
  return version;
}

/** POST /children/:id/import (§12): the raw v3 guest save, converted server-side. `prog` becomes word_mastery rows (taking the
 *  larger counters where the profile already has some), `log` is dropped (it stays on the device), and a save without a graph-mode
 *  `world` gets a fresh progress/0.3 at the build's start node. The current snapshot is backed up first ('pre_import'). */
export async function importGuestSave(db: Db, ctx: Ctx, childId: string, body: { contentVersion: string; save: Record<string, any> }) {
  const parentId = requireConsent(ctx);
  const { prog, log: _log, ...rest } = body.save as Record<string, any>;
  const st: Record<string, any> = { ...rest };
  if (!st.world) st.world = { schema: 'progress/0.3', seed: Math.floor(Math.random() * 2 ** 31), pos: { graph: startNode.graph, node: startNode.node, edge: null, step: 0 },
    lastInn: { ...startNode }, visitedTowns: [], graphs: {}, eventsDone: [], eventLastFired: {}, shortcuts: [], zonesDefeated: [], flags: [], feathers: 2 };
  const errs = validateWorld(st.world);
  if (errs.length) throw badRequest('The save does not match progress.schema.json.', errs);
  const owned = await db.query(`select 1 from child_profiles where id = $1 and parent_id = $2 and archived_at is null`, [childId, parentId]);
  if (!owned.rowCount) return denied(db, ctx, childId, 'POST import');
  await hit(db, LIMITS.import, parentId);
  const version = await db.tx(async q => {
    const c = await lockOwnedChild(q, childId, parentId);
    if (!c) return null;
    const v = await replaceSnapshot(q, childId, st, body.contentVersion, 'pre_import');
    for (const [item, p] of Object.entries<any>(prog && typeof prog === 'object' ? prog : {})) {
      if (!/^[A-Za-z0-9_]{1,32}$/.test(item) || !p?.ways) continue;
      const ways: Record<string, any> = {};
      for (const [w, s] of Object.entries<any>(p.ways)) if (['rZE', 'rEZ', 'sZE', 'sEZ'].includes(w) && s && Number.isFinite(s.a) && Number.isFinite(s.c))
        ways[w] = { c: Math.max(0, Math.min(s.c | 0, s.a | 0)), a: Math.max(0, s.a | 0), box: s.box | 0, last: Number(s.last) || 0, due: Number(s.due) || 0, wrongRun: s.wrongRun | 0 };
      await q.query(
        `insert into word_mastery (child_id, item_id, seen, recent_miss, ways) values ($1, $2, $3, $4, $5)
         on conflict (child_id, item_id) do update set seen = word_mastery.seen or excluded.seen,
           ways = case when (select coalesce(sum((v->>'a')::int), 0) from jsonb_each(excluded.ways) e(k, v)) >
                            (select coalesce(sum((v->>'a')::int), 0) from jsonb_each(word_mastery.ways) e(k, v)) then excluded.ways else word_mastery.ways end,
           updated_at = now()`, [childId, item, !!p.seen, p.recentMiss | 0, JSON.stringify(ways)]);
    }
    await audit(q, { actor: 'parent', parentId, childId, action: 'import', details: { words: Object.keys(prog ?? {}).length } });
    return v;
  });
  if (version == null) return denied(db, ctx, childId, 'POST import');
  return { ok: true, version };
}
