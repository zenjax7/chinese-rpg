import type { Queryable } from '../db';
import { auditHash } from '../crypto';

export type AuditAction = 'consent_granted' | 'consent_confirmed' | 'consent_revoked' | 'child_created' | 'child_deleted' | 'account_deleted'
  | 'export' | 'import' | 'restore' | 'save_flagged' | 'pin_locked' | 'pin_changed' | 'cross_parent_denied' | 'cron_daily';

/** Append an audit row. No FKs and no raw ids: the parent and child are salted hashes, so rows survive deletion as tombstones.
 *  Never put an email, nickname or IP in details. */
export async function audit(q: Queryable, a: { actor: 'parent' | 'system' | 'admin'; parentId?: number | null; childId?: string | null; action: AuditAction; details?: Record<string, unknown> }) {
  await q.query(`insert into audit_log (actor_type, actor_hash, child_hash, action, details) values ($1, $2, $3, $4, $5)`,
    [a.actor, a.parentId != null ? auditHash('p', a.parentId) : null, a.childId ? auditHash('c', a.childId) : null, a.action, JSON.stringify(a.details ?? {})]);
}
