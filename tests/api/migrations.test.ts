import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { freshDb, type TestDb } from './helpers';
// @ts-ignore plain JS
import { migrate, listMigrations, MIGRATIONS_DIR } from '../../server/migrate.mjs';

let t: TestDb;
beforeAll(async () => { t = await freshDb(); });
afterAll(async () => { await t.close(); });

describe('migrations', () => {
  it('apply cleanly and record every file', async () => {
    const { rows } = await t.db.query('select name from schema_migrations order by name');
    expect(rows.map(r => r.name)).toEqual(listMigrations().map((m: any) => m.name));
  });
  it('are idempotent: a second run applies nothing', async () => {
    expect(await migrate(t.db)).toEqual([]);
  });
  it('create every §7.2 table', async () => {
    const want = ['users', 'accounts', 'sessions', 'verification_token', 'parents', 'parent_unlocks', 'child_profiles', 'consent_records', 'saves',
      'graph_progress', 'word_mastery', 'save_backups', 'audit_log', 'rate_limits'];
    const { rows } = await t.db.query(`select table_name from information_schema.tables where table_schema = current_schema() and table_type = 'BASE TABLE'`);
    const have = rows.map(r => r.table_name);
    for (const w of want) expect(have).toContain(w);
    const views = await t.db.query(`select table_name from information_schema.views where table_schema = current_schema()`);
    expect(views.rows.map(r => r.table_name).sort()).toEqual(['v_inventory', 'v_quests']);
  });
  it('create the §7.4 indexes', async () => {
    const { rows } = await t.db.query(`select indexname from pg_indexes where schemaname = current_schema()`);
    const have = rows.map(r => r.indexname);
    for (const i of ['users_email_lower_uq', 'accounts_provider_uq', 'accounts_user_idx', 'sessions_token_uq', 'sessions_user_idx', 'child_profiles_parent_idx',
      'child_profiles_linked_email_uq', 'saves_pos_graph_idx', 'saves_content_version_idx', 'word_mastery_proficient_idx', 'save_backups_child_idx',
      'consent_records_parent_idx', 'audit_log_at_idx', 'rate_limits_pkey', 'graph_progress_pkey', 'word_mastery_pkey', 'saves_pkey']) expect(have).toContain(i);
  });
  it('refuse an applied migration that was edited', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'mig-'));
    cpSync(MIGRATIONS_DIR, dir, { recursive: true });
    writeFileSync(join(dir, '001_init.sql'), '-- edited\n');
    await expect(migrate(t.db, { dir })).rejects.toThrow(/edited after it was applied/);
  });
  it('keep the 13+ teen-link columns null until the feature ships', async () => {
    const { rows } = await t.db.query(`select pg_get_constraintdef(oid) as d from pg_constraint where conname = 'teen_link_not_built'`);
    expect(rows[0].d).toMatch(/linked_email IS NULL/);
  });
});
