/** The level (map) DAL (level-editor.md §3, §6, §7.1, §8). Editor functions take the branded EditorCtx and re-check the role;
 *  the public read functions take no ctx and only ever return published (beta / golden) maps, never drafts. */
import type { Db, Queryable } from '../db.js';
import { HttpError, conflict, forbidden, notFound } from '../errors.js';
import { type EditorCtx, requireOwner, requireFreshSession } from './editors.js';
import { audit } from './audit.js';
import { validateLevel, hasErrors } from '../../src/shared/level/validate.js';
import { levelHash } from '../../src/shared/level/hash.js';
import { WORD_IDS } from '../../src/shared/level/wordbank.js';
import type { Level, NodeRef, Problem } from '../../src/shared/level/types.js';

const CHECKPOINT_EVERY_SEC = 600;   // §3: a draft checkpoint revision at most every 10 minutes

const nodeSets = (bodies: Level[]) => Object.fromEntries(bodies.map(b => [b.id, new Set((b.nodes ?? []).map(n => n.id))]));
const validate = (body: unknown, maps: Record<string, Set<string>>) => validateLevel(body, { words: WORD_IDS, maps });

async function draftNodeSets(q: Queryable): Promise<Record<string, Set<string>>> {
  const { rows } = await q.query(`select draft from levels`);
  return nodeSets(rows.map(r => r.draft));
}

export async function listLevels(q: Queryable, _ctx: EditorCtx) {
  const { rows } = await q.query(
    `select id, kind, state, draft->'title' as title, draft->>'dungeon' as dungeon, draft->'settings'->'words' as words, draft_rev, published_version, updated_at,
            (published is null or (draft - 'version') is distinct from (published - 'version')) as draft_ahead,
            coalesce((select count(*) from jsonb_array_elements(coalesce(draft_validation, '[]'::jsonb)) p where p->>'level' = 'error'), 0)::int as errors
       from levels order by id`);
  return { levels: rows.map(r => ({ id: r.id, kind: r.kind, state: r.state, title: r.title, dungeon: r.dungeon, draftRev: r.draft_rev,
    publishedVersion: r.published_version, draftAhead: r.draft_ahead, errors: r.errors, updatedAt: r.updated_at, words: r.words ?? [] })) };
}

export async function getLevel(q: Queryable, _ctx: EditorCtx, id: string) {
  const { rows } = await q.query(`select id, state, draft, draft_rev, draft_validation, published_version, published_hash, published_at from levels where id = $1`, [id]);
  const r = rows[0]; if (!r) throw notFound();
  return { id: r.id, state: r.state, draft: r.draft, draftRev: r.draft_rev, validation: r.draft_validation ?? [], publishedVersion: r.published_version,
    publishedHash: r.published_hash, publishedAt: r.published_at };
}

/** §4.1 golden lock: changing a golden map needs the owner's explicit confirm, recorded as a golden-unlock revision. */
async function goldenUnlock(q: Queryable, ctx: EditorCtx, row: { id: string; published: any; published_version: number; published_hash: string }, confirm: boolean) {
  if (!confirm) throw new HttpError(409, 'golden_locked', 'This map is golden. Confirm to change it.');
  requireOwner(ctx); requireFreshSession(ctx);
  await q.query(`insert into level_revisions (level_id, version, kind, body, content_hash, created_by, note) values ($1, $2, 'golden-unlock', $3, $4, $5, 'golden confirm')`,
    [row.id, row.published_version, JSON.stringify(row.published), row.published_hash, ctx.userId]);
  await audit(q, { actor: 'editor', editorId: ctx.userId, action: 'level.golden_unlock', details: { level: row.id } });
}

/** §6.2 autosave: validate, store with draft_rev + 1. Never blocked by validation errors; a stale draftRev is a 409 with the server copy. */
export async function saveDraft(db: Db, ctx: EditorCtx, id: string, b: { draftRev: number; body: Level; goldenConfirm?: boolean }) {
  if (b.body.id !== id) throw new HttpError(400, 'bad_request', 'The map id in the body must match the URL.');
  const canWrite = ctx.role === 'owner' || (ctx.role === 'drafter' && b.body.state === 'draft');
  if (!canWrite) throw forbidden('owner_only', 'Only the owner can change this map.');
  return db.tx(async q => {
    const { rows } = await q.query(`select id, state, draft, draft_rev, published, published_version, published_hash,
                                           extract(epoch from now() - coalesce((select max(created_at) from level_revisions where level_id = $1 and kind = 'checkpoint'), 'epoch'))::int as since_checkpoint
                                      from levels where id = $1 for update`, [id]);
    const row = rows[0]; if (!row) throw notFound();
    if (ctx.role === 'drafter' && row.state !== 'draft') throw forbidden('owner_only', 'Only the owner can change this map.');
    if (row.draft_rev !== b.draftRev) throw new HttpError(409, 'draft_conflict', 'Someone saved this map since you opened it.', { draftRev: row.draft_rev, draft: row.draft });
    if (row.state === 'golden') await goldenUnlock(q, ctx, row, !!b.goldenConfirm);
    const problems = validate(b.body, { ...(await draftNodeSets(q)), [id]: new Set(b.body.nodes.map(n => n.id)) });
    const up = await q.query(`update levels set draft = $2, draft_rev = draft_rev + 1, draft_validation = $3, kind = $4, updated_by = $5, updated_at = now()
                               where id = $1 returning draft_rev`, [id, JSON.stringify(b.body), JSON.stringify(problems), b.body.kind, ctx.userId]);
    if (row.since_checkpoint >= CHECKPOINT_EVERY_SEC) {
      await q.query(`insert into level_revisions (level_id, version, kind, body, content_hash, created_by) values ($1, $2, 'checkpoint', $3, $4, $5)`,
        [id, row.published_version, JSON.stringify(b.body), await levelHash(b.body), ctx.userId]);
      await audit(q, { actor: 'editor', editorId: ctx.userId, action: 'level.save', details: { level: id } });   // sampled: one per checkpoint
    }
    return { draftRev: up.rows[0].draft_rev as number, validation: problems };
  });
}

/** The runtime index (§7.1): beta and golden maps only, never drafts. */
async function compileIndex(q: Queryable, start: NodeRef) {
  const { rows } = await q.query(`select id, kind, state, published_version, published_hash, published->'title' as title from levels
                                   where published is not null and state in ('beta', 'golden') order by id`);
  const maps: Record<string, { v: number; hash: string; state: string; kind: string; title: unknown }> = Object.fromEntries(rows.map(r => [r.id, { v: r.published_version, hash: r.published_hash, state: r.state, kind: r.kind, title: r.title }]));
  return { start, maps };
}
async function latestStart(q: Queryable): Promise<NodeRef> {
  const { rows } = await q.query(`select index->'start' as start from content_releases order by id desc limit 1`);
  return rows[0]?.start ?? { graph: 'realm_1', node: 'village' };
}
async function writeRelease(q: Queryable, createdBy: string | null, note: string | null, start: NodeRef) {
  const index = await compileIndex(q, start);
  const rel = await q.query(`insert into content_releases (created_by, note, index) values ($1, $2, $3) returning id`, [createdBy, note, JSON.stringify(index)]);
  const release = rel.rows[0].id as number;
  for (const [id, m] of Object.entries(index.maps)) await q.query(`insert into release_levels (release_id, level_id, version) values ($1, $2, $3)`, [release, id, m.v]);
  return { release, index };
}

/** §6.3 atomic publish: owner only, fresh session; every map in the set validated against the others (drafts in the set, published
 *  copies otherwise); any error -> 422 and nothing is written. The draft's own `state` (draft / beta / golden) is what gets published. */
export async function publish(db: Db, ctx: EditorCtx, b: { levels: { id: string; draftRev: number }[]; note?: string; goldenConfirm?: boolean }) {
  requireOwner(ctx); requireFreshSession(ctx);
  return db.tx(async q => {
    const ids = b.levels.map(l => l.id);
    const { rows } = await q.query(`select id, state, draft, draft_rev, published, published_version, published_hash from levels where id = any($1) order by id for update`, [ids]);
    if (rows.length !== ids.length) throw notFound();
    for (const r of rows) {
      const want = b.levels.find(l => l.id === r.id)!.draftRev;
      if (r.draft_rev !== want) throw new HttpError(409, 'draft_conflict', `Map ${r.id} changed since you opened it.`, { id: r.id, draftRev: r.draft_rev });
    }
    const others = await q.query(`select coalesce(published, draft) as body from levels where id <> all($1)`, [ids]);
    const maps = nodeSets([...others.rows.map(r => r.body), ...rows.map(r => r.draft)]);
    const problems: Record<string, Problem[]> = {};
    for (const r of rows) { const p = validate(r.draft, maps); if (hasErrors(p)) problems[r.id] = p.filter(x => x.level === 'error'); }
    if (Object.keys(problems).length) throw new HttpError(422, 'invalid', 'Fix the errors before publishing.', { problems });
    for (const r of rows) if (r.state === 'golden') await goldenUnlock(q, ctx, r, !!b.goldenConfirm);
    const versions: Record<string, number> = {};
    for (const r of rows) {
      const version = r.published_version + 1, hash = await levelHash(r.draft);
      const body = { ...r.draft, version };
      await q.query(`update levels set published = $2, state = $3, published_version = $4, published_hash = $5, published_at = now(), updated_by = $6 where id = $1`,
        [r.id, JSON.stringify(body), r.draft.state, version, hash, ctx.userId]);
      await q.query(`insert into level_revisions (level_id, version, kind, body, content_hash, created_by, note) values ($1, $2, 'publish', $3, $4, $5, $6)`,
        [r.id, version, JSON.stringify(body), hash, ctx.userId, b.note ?? null]);
      versions[r.id] = version;
    }
    const { release } = await writeRelease(q, ctx.userId, b.note ?? null, await latestStart(q));
    await audit(q, { actor: 'editor', editorId: ctx.userId, action: 'level.publish', details: { levels: ids, release } });
    return { release, versions };
  });
}

/** §9.2 Download JSON: every published map, editor session only. Read-only; nothing is written anywhere else. */
export async function exportLevels(q: Queryable, ctx: EditorCtx) {
  const { rows } = await q.query(`select id, published from levels where published is not null order by id`);
  const rel = await q.query(`select id from content_releases order by id desc limit 1`);
  await audit(q, { actor: 'editor', editorId: ctx.userId, action: 'levels.read', details: { export: true } });
  return { release: rel.rows[0]?.id ?? null, levels: Object.fromEntries(rows.map(r => [r.id, r.published])) };
}

// ---- public (§7.1): published content only ----
export async function publicIndex(q: Queryable) {
  const { rows } = await q.query(`select id, index from content_releases order by id desc limit 1`);
  if (!rows[0]) throw notFound();
  return { release: rows[0].id as number, ...rows[0].index };
}
export async function publicLevel(q: Queryable, id: string, v: number) {
  const { rows } = await q.query(`select r.body from level_revisions r join levels l on l.id = r.level_id
                                   where r.level_id = $1 and r.version = $2 and r.kind = 'publish' and l.state in ('beta', 'golden')`, [id, v]);
  if (!rows[0]) throw notFound();
  return rows[0].body;
}
export async function currentVersion(q: Queryable, id: string): Promise<number> {
  const { rows } = await q.query(`select published_version from levels where id = $1 and published is not null and state in ('beta', 'golden')`, [id]);
  if (!rows[0]) throw notFound();
  return rows[0].published_version;
}

// ---- seed (§8) ----
/** Inserts every map as published version 1 in its file state, identical draft, one revision each and release 1, in one
 *  transaction. Refuses a non-empty table unless `restore` (§9.4), and refuses maps with validation errors. */
export async function seedLevels(db: Db, maps: Level[], start: NodeRef, opts: { restore?: boolean } = {}) {
  const sets = nodeSets(maps);
  const bad = maps.map(m => ({ id: m.id, errors: validate(m, sets).filter(p => p.level === 'error') })).filter(x => x.errors.length);
  if (bad.length) throw new Error(`seed: validation errors in ${bad.map(b => `${b.id} (${b.errors[0].msg})`).join(', ')}`);
  return db.tx(async q => {
    const n = Number((await q.query(`select count(*)::int as n from levels`)).rows[0].n);
    if (n && !opts.restore) throw new Error('seed: the levels table is not empty (use --restore to load the repo copy anyway)');
    if (opts.restore) for (const t of ['release_levels', 'content_releases', 'level_revisions', 'levels']) await q.query(`delete from ${t}`);
    for (const m of maps) {
      const hash = await levelHash(m), body = { ...m, version: 1 };
      await q.query(`insert into levels (id, kind, state, draft, draft_rev, draft_validation, published, published_version, published_hash, published_at)
                     values ($1, $2, $3, $4, 1, $5, $6, 1, $7, now())`,
        [m.id, m.kind, m.state, JSON.stringify(m), JSON.stringify(validate(m, sets)), JSON.stringify(body), hash]);
      await q.query(`insert into level_revisions (level_id, version, kind, body, content_hash, note) values ($1, 1, 'publish', $2, $3, 'seed from docs/data/levels')`,
        [m.id, JSON.stringify(body), hash]);
    }
    const { release } = await writeRelease(q, null, 'seed from docs/data/levels', start);
    return { maps: maps.length, release };
  });
}
