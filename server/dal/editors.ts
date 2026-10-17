/** EditorCtx (level-editor.md §4): built only from the Auth.js session, for a user with a live `editors` row or whose Google `sub`
 *  is in the bootstrap list EDITOR_GOOGLE_SUBS (always the owner). Disjoint from the parent ctx: editor routes accept only this. */
import type { Queryable } from '../db.js';
import { forbidden } from '../errors.js';
import { audit } from './audit.js';

export type EditorRole = 'owner' | 'tester' | 'drafter';
declare const editorBrand: unique symbol;
export interface EditorCtx { readonly [editorBrand]: true; userId: string; role: EditorRole; sessionAgeSec: number }

/** The comma-separated EDITOR_GOOGLE_SUBS env var (Sensitive, server only) as a set. */
export const bootstrapSubs = (raw = process.env.EDITOR_GOOGLE_SUBS ?? '') => new Set(raw.split(',').map(s => s.trim()).filter(Boolean));

export async function editorCtx(q: Queryable, token: string, subs: Set<string>): Promise<EditorCtx | null> {
  const { rows } = await q.query(
    `select u.id::text as user_id, a."providerAccountId" as sub, e.role, e.disabled_at, extract(epoch from now() - s.created_at)::int as age
       from sessions s join users u on u.id = s."userId"
       left join accounts a on a."userId" = u.id and a.provider = 'google'
       left join editors e on e.user_id = u.id::text
      where s."sessionToken" = $1 and s.expires > now()`, [token]);
  const r = rows[0];
  if (!r || r.disabled_at) return null;
  const isBootstrap = !!r.sub && subs.has(r.sub);
  const role: EditorRole | null = isBootstrap ? 'owner' : r.role ?? null;
  if (!role) return null;
  if (isBootstrap && r.role !== 'owner') {
    // first sign-in of the bootstrap owner: record the allowlist row (levels.updated_by points at it)
    await q.query(`insert into editors (user_id, google_sub, role) values ($1, $2, 'owner') on conflict (user_id) do update set role = 'owner', google_sub = excluded.google_sub`,
      [r.user_id, r.sub]);
    await audit(q, { actor: 'editor', editorId: r.user_id, action: 'editor.signin', details: { role: 'owner', bootstrap: true } });
  }
  return { userId: r.user_id, role, sessionAgeSec: Number(r.age) } as EditorCtx;
}

/** §4.1: the owner (Jack) may do everything; the role is re-checked in every DAL function that writes. */
export function requireOwner(ctx: EditorCtx) {
  if (ctx.role !== 'owner') throw forbidden('owner_only', 'Only the owner can do this.');
}
/** §4 step-up: publish (and the golden confirm) needs a session younger than 12 hours. */
export const STEP_UP_SEC = 12 * 3600;
export function requireFreshSession(ctx: EditorCtx) {
  if (ctx.sessionAgeSec > STEP_UP_SEC) throw forbidden('step_up', 'Sign in again to publish (sessions older than 12 hours can’t publish).');
}
