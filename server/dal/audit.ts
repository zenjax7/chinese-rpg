import type { Queryable } from '../db.js';
import { auditHash } from '../crypto.js';

export type AuditAction = 'consent_granted' | 'consent_confirmed' | 'consent_revoked' | 'child_created' | 'child_deleted' | 'account_deleted'
  | 'export' | 'import' | 'restore' | 'save_flagged' | 'pin_locked' | 'pin_changed' | 'cross_parent_denied' | 'cron_daily'
  // level-editor.md §3 (actor 'editor'): no content, no email in details
  | 'editor.signin' | 'level.save' | 'level.publish' | 'level.golden_unlock' | 'levels.read';

/** Append an audit row. No FKs and no raw ids: the parent and child are salted hashes, so rows survive deletion as tombstones.
 *  Never put an email, nickname or IP in details. */
export async function audit(q: Queryable, a: { actor: 'parent' | 'system' | 'admin' | 'editor'; parentId?: number | null; editorId?: string | null; childId?: string | null; action: AuditAction; details?: Record<string, unknown> }) {
  const actorHash = a.parentId != null ? auditHash('p', a.parentId) : a.editorId != null ? auditHash('e', a.editorId) : null;
  await q.query(`insert into audit_log (actor_type, actor_hash, child_hash, action, details) values ($1, $2, $3, $4, $5)`,
    [a.actor, actorHash, a.childId ? auditHash('c', a.childId) : null, a.action, JSON.stringify(a.details ?? {})]);
}
