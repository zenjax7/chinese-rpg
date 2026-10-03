// Wraps any node-postgres-compatible Pool (pg.Pool, or @neondatabase/serverless Pool, which has the same API) as the DAL's Db.
// Plain JS so the migration CLI can use it without a TypeScript step; typed in server/db.ts.
export function wrapPgPool(pool) {
  const norm = r => ({ rows: r.rows, rowCount: r.rowCount ?? r.rows.length });
  const client = c => ({
    query: async (text, params = []) => norm(await c.query(text, params)),
    exec: async text => { await c.query(text); },
  });
  return {
    ...client(pool),
    async tx(fn) {
      const c = await pool.connect();
      try {
        await c.query('begin');
        const out = await fn(client(c));
        await c.query('commit');
        return out;
      } catch (e) { try { await c.query('rollback'); } catch { /* connection gone */ } throw e; }
      finally { c.release(); }
    },
  };
}
