import type { Queryable } from '../db';
import type { Ctx } from '../ctx';

/** §8.3 rule 6: one query turns the session token into the whole ctx (user, parent, consent, role, PIN unlock). */
export async function sessionCtx(q: Queryable, token: string, meta: { ip: string; userAgent: string }): Promise<Ctx | null> {
  const { rows } = await q.query(
    `select u.id as user_id, u.email, p.user_id as parent_id, coalesce(p.consent_status, 'none') as consent_status,
            p.consent_version, p.consent_granted_at, coalesce(p.role, 'parent') as role, s.id as session_id,
            coalesce(pu.until > now(), false) as unlocked, extract(epoch from now() - s.created_at)::int as age
       from sessions s join users u on u.id = s."userId"
       left join parents p on p.user_id = u.id
       left join parent_unlocks pu on pu.session_id = s.id
      where s."sessionToken" = $1 and s.expires > now()`, [token]);
  const r = rows[0]; if (!r) return null;
  return { userId: r.user_id, sessionId: r.session_id, parentId: r.parent_id ?? null, consent: r.consent_status, consentVersion: r.consent_version ?? null,
    consentGrantedAt: r.consent_granted_at ? new Date(r.consent_granted_at) : null, role: r.role, unlocked: !!r.unlocked,
    sessionAgeSec: Number(r.age), email: r.email ?? null, ip: meta.ip, userAgent: meta.userAgent };
}
