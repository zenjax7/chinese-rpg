import type { Db } from '../db';
import { NOTICE_VERSION, type Ctx } from '../ctx';
import { hashIp, hashPin } from '../crypto';
import { badRequest, conflict } from '../errors';
import { audit } from './audit';
import { hit, LIMITS } from './rateLimit';
import { checkPin } from './parents';
import { requireParent } from './guard';

/** "Chrome/macOS" style family only: never the full user-agent string. */
export function uaFamily(ua: string): string {
  const b = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Other';
  const o = /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Mac OS X|Macintosh/.test(ua) ? 'macOS' : /Windows/.test(ua) ? 'Windows' : /CrOS/.test(ua) ? 'ChromeOS' : /Linux/.test(ua) ? 'Linux' : 'Other';
  return `${b}/${o}`;
}

/** POST /consent (§5.3): creates or re-activates the parents row, sets the PIN on first consent, and appends a consent record with
 *  the notice version, the time and HMAC(IP_HASH_KEY, ip). One transaction. A parent who already has a PIN must enter it. */
export async function grantConsent(db: Db, ctx: Ctx, body: { noticeVersion: string; pin: string }) {
  if (body.noticeVersion !== NOTICE_VERSION) throw badRequest(`The privacy notice has changed (current: ${NOTICE_VERSION}). Reload and read it again.`);
  const ipHash = hashIp(ctx.ip);
  await hit(db, LIMITS.consentIp, ipHash);
  const hasPin = ctx.parentId != null && (await db.query(`select pin_hash is not null as has from parents where user_id = $1`, [ctx.userId])).rows[0]?.has;
  if (hasPin) await checkPin(db, ctx, body.pin);
  const pinNew = hasPin ? null : await hashPin(body.pin);
  return db.tx(async q => {
    const { rows } = await q.query(
      `insert into parents (user_id, consent_status, consent_version, consent_granted_at, pin_hash, pin_salt, last_active_at)
       values ($1, 'granted', $2, now(), $3, $4, now())
       on conflict (user_id) do update set consent_status = 'granted', consent_version = excluded.consent_version,
         consent_granted_at = now(), pin_hash = coalesce(excluded.pin_hash, parents.pin_hash), pin_salt = coalesce(excluded.pin_salt, parents.pin_salt),
         last_active_at = now()
       returning consent_granted_at`, [ctx.userId, NOTICE_VERSION, pinNew?.hash ?? null, pinNew?.salt ?? null]);
    const rec = await q.query(
      `insert into consent_records (parent_id, kind, notice_version, ip_hash, user_agent_family, method_detail)
       values ($1, 'vpc_onscreen', $2, $3, $4, $5) returning id, kind, notice_version, at`,
      [ctx.userId, NOTICE_VERSION, ipHash, uaFamily(ctx.userAgent), JSON.stringify({ attested: 'parent_or_guardian_18_plus', emailVerifiedBy: 'google' })]);
    await audit(q, { actor: 'parent', parentId: ctx.userId, action: 'consent_granted', details: { noticeVersion: NOTICE_VERSION } });
    const r = rec.rows[0];
    return { receipt: { id: String(r.id), kind: r.kind, noticeVersion: r.notice_version, at: r.at, grantedAt: rows[0].consent_granted_at } };
  });
}

/** POST /consent/confirm (§5.4): the delayed on-screen confirmation, at least 24 hours after consent. Needs the PIN unlock. */
export async function confirmConsent(db: Db, ctx: Ctx) {
  const parentId = requireParent(ctx);
  const ipHash = hashIp(ctx.ip);
  return db.tx(async q => {
    const { rowCount } = await q.query(`update parents set consent_status = 'confirmed' where user_id = $1 and consent_status = 'granted'
        and consent_granted_at <= now() - interval '24 hours'`, [parentId]);
    if (!rowCount) throw conflict('not_ready', 'There is nothing to confirm yet.');
    const rec = await q.query(`insert into consent_records (parent_id, kind, notice_version, ip_hash, user_agent_family)
        values ($1, 'confirmation', $2, $3, $4) returning id, at`, [parentId, ctx.consentVersion ?? NOTICE_VERSION, ipHash, uaFamily(ctx.userAgent)]);
    await audit(q, { actor: 'parent', parentId, action: 'consent_confirmed' });
    return { ok: true, at: rec.rows[0].at };
  });
}

/** POST /consent/revoke: stops collection now. Status 'revoked', a revocation record, and every session of this parent is deleted
 *  (instant sign-out everywhere, §5.2). The PIN is asked again every time. Data stays until the parent deletes it. */
export async function revokeConsent(db: Db, ctx: Ctx, pin: string) {
  const parentId = requireParent(ctx);
  await checkPin(db, ctx, pin);
  const ipHash = hashIp(ctx.ip);
  return db.tx(async q => {
    await q.query(`update parents set consent_status = 'revoked' where user_id = $1`, [parentId]);
    await q.query(`insert into consent_records (parent_id, kind, notice_version, ip_hash, user_agent_family) values ($1, 'revocation', $2, $3, $4)`,
      [parentId, ctx.consentVersion ?? NOTICE_VERSION, ipHash, uaFamily(ctx.userAgent)]);
    await audit(q, { actor: 'parent', parentId, action: 'consent_revoked' });
    await q.query(`delete from sessions where "userId" = $1`, [parentId]);
    return { ok: true, signedOut: true };
  });
}
