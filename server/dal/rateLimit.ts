import type { Queryable } from '../db';
import { tooMany } from '../errors';

/** §8.5 Postgres fixed-window limits (the Vercel WAF rule handles per-IP floods before a Function runs). */
export const LIMITS = {
  saveMinute: { bucket: 'save_m', limit: 60, windowSec: 60 },
  saveHour: { bucket: 'save_h', limit: 600, windowSec: 3600 },
  pin: { bucket: 'pin_h', limit: 10, windowSec: 3600 },
  import: { bucket: 'import_d', limit: 5, windowSec: 86400 },
  export: { bucket: 'export_d', limit: 10, windowSec: 86400 },
  consentIp: { bucket: 'consent_ip_d', limit: 20, windowSec: 86400 },
} as const;
export type Limit = typeof LIMITS[keyof typeof LIMITS];

/** One upsert bumps the counter for the current window and returns it; over the limit -> 429 with Retry-After. */
export async function hit(q: Queryable, l: Limit, subject: string | number): Promise<number> {
  const { rows } = await q.query(
    `insert into rate_limits (bucket, subject, window_start, count)
     values ($1, $2, to_timestamp(floor(extract(epoch from now()) / $3) * $3), 1)
     on conflict (bucket, subject, window_start) do update set count = rate_limits.count + 1
     returning count, ceil($3 - (extract(epoch from now()) - extract(epoch from window_start)))::int as retry`,
    [l.bucket, String(subject), l.windowSec]);
  const r = rows[0];
  if (r.count > l.limit) throw tooMany(Math.max(1, r.retry));
  return r.count;
}
