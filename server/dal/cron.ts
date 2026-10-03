import type { Db } from '../db';
import { audit } from './audit';

/** GET /cron/daily (Vercel Cron, Bearer CRON_SECRET): the §5.6 retention policy and housekeeping. Returns row counts only. */
export async function dailyCron(db: Db) {
  const n = async (sql: string) => (await db.query(sql)).rowCount;
  const out = {
    rateLimits: await n(`delete from rate_limits where window_start < now() - interval '1 day'`),
    unlocks: await n(`delete from parent_unlocks where until < now()`),
    sessions: await n(`delete from sessions where expires < now()`),
    backupsOld: await n(`delete from save_backups where saved_at < now() - interval '30 days'`),
    backupsTrim: await n(`delete from save_backups b using (select id, row_number() over (partition by child_id order by saved_at desc, id desc) as rn from save_backups) x
                          where b.id = x.id and x.rn > 10`),
    audit: await n(`delete from audit_log where at < now() - interval '2 years'`),
    // consent never completed within 14 days: a users row with no parents row and no session younger than 14 days
    noConsent: await n(`delete from users u where not exists (select 1 from parents p where p.user_id = u.id)
                          and not exists (select 1 from sessions s where s."userId" = u.id and s.created_at > now() - interval '14 days')`),
    inactive: await n(`delete from users u using parents p where p.user_id = u.id and coalesce(p.last_active_at, p.created_at) < now() - interval '18 months'`),
  };
  await audit(db, { actor: 'system', action: 'cron_daily', details: out });
  return out;
}
