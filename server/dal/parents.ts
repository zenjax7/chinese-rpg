import type { Db, Queryable } from '../db';
import { NOTICE_VERSION, type Ctx } from '../ctx';
import { hashPin, verifyPin } from '../crypto';
import { HttpError, locked, forbidden } from '../errors';
import { audit } from './audit';
import { hit, LIMITS } from './rateLimit';
import { requireParent, requireUnlocked } from './guard';

export const PIN_RULES = { shortFails: 5, shortLockMin: 15, dayFails: 10, dayLockMin: 60, unlockMin: 10, resetSessionMaxSec: 300 } as const;

/** GET /me: parent status and the children list. */
export async function getMe(q: Queryable, ctx: Ctx) {
  const children = ctx.parentId == null ? [] : (await q.query(
    `select c.id, c.nickname, c.avatar, c.speech_mode, c.sort, s.updated_at as last_played
       from child_profiles c left join saves s on s.child_id = c.id
      where c.parent_id = $1 and c.archived_at is null order by c.sort, c.created_at`, [ctx.parentId])).rows
    .map(r => ({ id: r.id, nickname: r.nickname, avatar: r.avatar, speechMode: r.speech_mode, sort: r.sort, lastPlayed: r.last_played }));
  const live = ctx.consent === 'granted' || ctx.consent === 'confirmed';
  return {
    email: ctx.email, consentStatus: ctx.consent, noticeVersion: NOTICE_VERSION,
    needsConsent: !live || ctx.consentVersion !== NOTICE_VERSION,
    needsConfirmation: ctx.consent === 'granted' && !!ctx.consentGrantedAt && Date.now() - ctx.consentGrantedAt.getTime() >= 24 * 3600e3,
    unlocked: ctx.unlocked, role: ctx.role, children,
  };
}

/** One PIN attempt with the §5.5 lockout. The parents row is locked FOR UPDATE for the whole check, so parallel guesses are
 *  serialized and can't race past the counters. A wrong PIN commits the bumped counters, then throws 403 (or 423 when it locks). */
export async function checkPin(db: Db, ctx: Ctx, pin: string): Promise<void> {
  const parentId = requireParent(ctx);
  await hit(db, LIMITS.pin, parentId);
  const res = await db.tx(async q => {
    const { rows } = await q.query(`select pin_hash, pin_salt, pin_failed_count, pin_fail_24h, pin_fail_window_start, pin_locked_until,
        pin_locked_until > now() as is_locked, pin_fail_window_start is null or pin_fail_window_start < now() - interval '24 hours' as window_over
        from parents where user_id = $1 for update`, [parentId]);
    const p = rows[0];
    if (!p) return { kind: 'forbidden' as const };
    if (p.is_locked) return { kind: 'locked' as const, until: new Date(p.pin_locked_until) };
    if (await verifyPin(pin, p.pin_hash, p.pin_salt)) {
      if (p.pin_failed_count) await q.query(`update parents set pin_failed_count = 0 where user_id = $1`, [parentId]);
      return { kind: 'ok' as const };
    }
    const fails = p.pin_failed_count + 1, day = p.window_over ? 1 : p.pin_fail_24h + 1;
    const lockMin = day >= PIN_RULES.dayFails ? PIN_RULES.dayLockMin : fails >= PIN_RULES.shortFails ? PIN_RULES.shortLockMin : 0;
    const { rows: u } = await q.query(
      `update parents set pin_failed_count = $2, pin_fail_24h = $3,
              pin_fail_window_start = case when $4::boolean then now() else pin_fail_window_start end,
              pin_locked_until = case when $5::int > 0 then now() + make_interval(mins => $5::int) else pin_locked_until end
        where user_id = $1 returning pin_locked_until`,
      [parentId, lockMin ? 0 : fails, day >= PIN_RULES.dayFails ? 0 : day, !!p.window_over, lockMin]);
    if (lockMin) {
      await audit(q, { actor: 'parent', parentId, action: 'pin_locked', details: { minutes: lockMin, rule: lockMin === PIN_RULES.dayLockMin ? '10_in_24h' : '5_in_a_row' } });
      return { kind: 'locked' as const, until: new Date(u[0].pin_locked_until) };
    }
    return { kind: 'wrong' as const, left: PIN_RULES.shortFails - fails };
  });
  if (res.kind === 'ok') return;
  if (res.kind === 'locked') throw locked(res.until);
  if (res.kind === 'forbidden') throw forbidden('consent_required', 'Parental consent is needed first.');
  throw new HttpError(403, 'wrong_pin', 'Wrong PIN.', { attemptsLeft: res.left });
}

/** POST /parent/unlock: a correct PIN unlocks the parent area for this session for 10 minutes. */
export async function unlock(db: Db, ctx: Ctx, pin: string) {
  await checkPin(db, ctx, pin);
  const { rows } = await db.query(
    `insert into parent_unlocks (session_id, until) values ($1, now() + make_interval(mins => $2))
     on conflict (session_id) do update set until = excluded.until returning until`, [ctx.sessionId, PIN_RULES.unlockMin]);
  return { unlockedUntil: rows[0].until };
}

/** POST /parent/pin: change the PIN while unlocked, or reset it from a fresh Google sign-in (session under 5 minutes old, §5.5). */
export async function changePin(db: Db, ctx: Ctx, newPin: string) {
  const parentId = requireParent(ctx);
  if (!ctx.unlocked && ctx.sessionAgeSec > PIN_RULES.resetSessionMaxSec) requireUnlocked(ctx);
  const { hash, salt } = await hashPin(newPin);
  await db.tx(async q => {
    await q.query(`update parents set pin_hash = $2, pin_salt = $3, pin_failed_count = 0, pin_fail_24h = 0, pin_locked_until = null where user_id = $1`, [parentId, hash, salt]);
    await audit(q, { actor: 'parent', parentId, action: 'pin_changed', details: { via: ctx.unlocked ? 'unlocked' : 'fresh_signin' } });
  });
  return { ok: true };
}
