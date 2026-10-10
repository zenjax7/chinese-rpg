import type { Db } from '../db';
import type { Ctx } from '../ctx';
import { audit } from './audit';
import { hit, LIMITS } from './rateLimit';
import { checkPin } from './parents';
import { requireParent } from './guard';

const b64 = (b: Uint8Array | null) => Buffer.from(b ?? new Uint8Array()).toString('base64');

/** GET /export (PIN): everything stored for this account, as JSON (COPPA parental review, §5.6). Every query is scoped by ctx. */
export async function exportAccount(db: Db, ctx: Ctx) {
  const parentId = requireParent(ctx);
  await hit(db, LIMITS.export, parentId);
  const one = async (sql: string) => (await db.query(sql, [parentId])).rows;
  const [user] = await one(`select u.email, u."emailVerified" as email_verified from users u where u.id = $1`);
  const [parent] = await one(`select consent_status, consent_version, consent_granted_at, role, locale, last_active_at, created_at from parents where user_id = $1`);
  const accounts = await one(`select provider, type, scope from accounts where "userId" = $1`);
  const consent = await one(`select kind, notice_version, at, ip_hash, user_agent_family, auth_provider, method_detail from consent_records where parent_id = $1 order by at`);
  const children = await one(`select id, nickname, avatar, speech_mode, sort, created_at from child_profiles where parent_id = $1 order by sort, created_at`);
  const saves = await one(`select s.child_id, s.version, s.schema, s.content_version, s.state, s.progress_key, s.pos_realm, s.pos_graph, s.pos_node, s.pos_dungeon,
      s.pos_level, s.last_inn_graph, s.last_inn_node, s.bosses, s.flags, s.updated_at from saves s join child_profiles c on c.id = s.child_id where c.parent_id = $1`);
  const graphs = await one(`select g.child_id, g.graph_id, g.node_count, g.visited, g.cleared, g.visited_n, g.cleared_n, g.last_node, g.first_at, g.updated_at
      from graph_progress g join child_profiles c on c.id = g.child_id where c.parent_id = $1 order by g.graph_id`);
  const mastery = await one(`select m.child_id, m.item_id, m.seen, m.recent_miss, m.ways, m.proficient, m.updated_at
      from word_mastery m join child_profiles c on c.id = m.child_id where c.parent_id = $1 order by m.item_id`);
  const backups = await one(`select b.child_id, b.id, b.version, b.content_version, b.reason, b.saved_at, b.state
      from save_backups b join child_profiles c on c.id = b.child_id where c.parent_id = $1 order by b.saved_at`);
  await audit(db, { actor: 'parent', parentId, action: 'export' });
  return {
    exportedAt: new Date().toISOString(), format: 'chinese-rpg-export/1',
    note: 'Everything the game stores about this family account. IP addresses are never stored; consent records keep only a keyed hash.',
    parent: { email: user?.email ?? null, emailVerified: user?.email_verified ?? null, ...parent, signIn: accounts },
    consentRecords: consent,
    children: children.map(c => ({
      ...c,
      save: saves.find(s => s.child_id === c.id) ?? null,
      graphProgress: graphs.filter(g => g.child_id === c.id).map(({ child_id, visited, cleared, ...g }) => ({ ...g, visited: b64(visited), cleared: b64(cleared) })),
      wordMastery: mastery.filter(m => m.child_id === c.id).map(({ child_id, ...m }) => m),
      backups: backups.filter(b => b.child_id === c.id).map(({ child_id, ...b }) => ({ ...b, id: String(b.id) })),
    })),
  };
}

/** DELETE /account (PIN, confirm: "DELETE"): deletes the users row; parents, children, saves, mastery, graphs, backups, consent
 *  records, accounts and sessions all cascade. One audit tombstone (hashes only) stays. */
export async function deleteAccount(db: Db, ctx: Ctx, pin: string) {
  const parentId = requireParent(ctx);
  await checkPin(db, ctx, pin);
  return db.tx(async q => {
    const { rows } = await q.query(`select count(*)::int as n from child_profiles where parent_id = $1`, [parentId]);
    await q.query(`delete from users where id = $1`, [ctx.userId]);
    await audit(q, { actor: 'parent', parentId, action: 'account_deleted', details: { children: rows[0].n } });
    return { ok: true, signedOut: true };
  });
}
