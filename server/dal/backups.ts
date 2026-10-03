import type { Db } from '../db';
import type { Ctx } from '../ctx';
import { notFound } from '../errors';
import { audit } from './audit';
import { denied, requireConsent } from './guard';
import { replaceSnapshot } from './saves';

/** GET /children/:id/backups (PIN): newest first, without the snapshots themselves. */
export async function listBackups(db: Db, ctx: Ctx, childId: string) {
  const parentId = requireConsent(ctx);
  const own = await db.query(`select 1 from child_profiles where id = $1 and parent_id = $2 and archived_at is null`, [childId, parentId]);
  if (!own.rowCount) return denied(db, ctx, childId, 'GET backups');
  const { rows } = await db.query(
    `select b.id, b.version, b.content_version, b.progress_key, b.reason, b.from_device, b.saved_at
       from save_backups b join child_profiles c on c.id = b.child_id
      where b.child_id = $1 and c.parent_id = $2 order by b.saved_at desc, b.id desc limit 50`, [childId, parentId]);
  return { backups: rows.map(r => ({ id: String(r.id), version: r.version, contentVersion: r.content_version, progressKey: r.progress_key, reason: r.reason, fromDevice: r.from_device, savedAt: r.saved_at })) };
}

/** POST /children/:id/restore (PIN): the current save goes to save_backups ('pre_restore') first, then the backup becomes current. */
export async function restoreBackup(db: Db, ctx: Ctx, childId: string, backupId: string) {
  const parentId = requireConsent(ctx);
  const r = await db.tx(async q => {
    const { rows } = await q.query(
      `select b.state, b.content_version from save_backups b join child_profiles c on c.id = b.child_id
        where b.id = $1 and b.child_id = $2 and c.parent_id = $3 and c.archived_at is null for update of c`, [backupId, childId, parentId]);
    if (!rows.length) {
      const own = await q.query(`select 1 from child_profiles where id = $1 and parent_id = $2`, [childId, parentId]);
      return own.rowCount ? 'no_backup' : null;
    }
    const version = await replaceSnapshot(q, childId, rows[0].state, rows[0].content_version, 'pre_restore');
    await audit(q, { actor: 'parent', parentId, childId, action: 'restore' });
    return { ok: true, version };
  });
  if (r === null) return denied(db, ctx, childId, 'POST restore');
  if (r === 'no_backup') throw notFound();
  return r;
}
