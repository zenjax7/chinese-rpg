import type { Db } from '../db';
import type { Ctx } from '../ctx';
import { conflict } from '../errors';
import { audit } from './audit';
import { checkPin } from './parents';
import { denied, requireConsent } from './guard';

export const MAX_CHILDREN = 6;
const out = (r: any) => ({ id: r.id, nickname: r.nickname, avatar: r.avatar, speechMode: r.speech_mode, sort: r.sort, createdAt: r.created_at });

/** POST /children: one guarded statement (§8.3 rule 7). Zero rows -> 409; the before-insert trigger is the backstop for races. */
export async function createChild(db: Db, ctx: Ctx, b: { nickname: string; avatar: string }) {
  const parentId = requireConsent(ctx);
  let rows: any[];
  try {
    ({ rows } = await db.query(
      `insert into child_profiles (parent_id, nickname, avatar, sort)
       select p.user_id, $2, $3, (select coalesce(max(sort) + 1, 0) from child_profiles where parent_id = p.user_id)
         from parents p
        where p.user_id = $1 and (select count(*) from child_profiles where parent_id = $1 and archived_at is null) < $4
       returning id, nickname, avatar, speech_mode, sort, created_at`, [parentId, b.nickname, b.avatar, MAX_CHILDREN]));
  } catch (e: any) {
    if (e?.code === 'P0001' && /child profile limit/.test(e.message)) rows = [];
    else throw e;
  }
  if (!rows.length) throw conflict('child_limit', `A family can have at most ${MAX_CHILDREN} child profiles.`);
  await audit(db, { actor: 'parent', parentId, childId: rows[0].id, action: 'child_created' });
  return out(rows[0]);
}

/** PATCH /children/:id: ownership is in the WHERE clause; zero rows -> 404 + audit. */
export async function updateChild(db: Db, ctx: Ctx, childId: string, p: { nickname?: string; avatar?: string; speechMode?: string; sort?: number }) {
  const parentId = requireConsent(ctx);
  const { rows } = await db.query(
    `update child_profiles set nickname = coalesce($3, nickname), avatar = coalesce($4, avatar), speech_mode = coalesce($5, speech_mode), sort = coalesce($6, sort)
      where id = $1 and parent_id = $2 and archived_at is null
      returning id, nickname, avatar, speech_mode, sort, created_at`,
    [childId, parentId, p.nickname ?? null, p.avatar ?? null, p.speechMode ?? null, p.sort ?? null]);
  if (!rows.length) return denied(db, ctx, childId, 'PATCH child');
  return out(rows[0]);
}

/** DELETE /children/:id: a hard delete (saves, mastery, graphs and backups cascade) plus an audit tombstone. PIN every time. */
export async function deleteChild(db: Db, ctx: Ctx, childId: string, pin: string) {
  const parentId = requireConsent(ctx);
  const owned = await db.query(`select 1 from child_profiles where id = $1 and parent_id = $2`, [childId, parentId]);
  if (!owned.rowCount) return denied(db, ctx, childId, 'DELETE child');
  await checkPin(db, ctx, pin);
  const { rowCount } = await db.query(`delete from child_profiles where id = $1 and parent_id = $2`, [childId, parentId]);
  if (!rowCount) return denied(db, ctx, childId, 'DELETE child');
  await audit(db, { actor: 'parent', parentId, childId, action: 'child_deleted' });
  return { ok: true };
}
