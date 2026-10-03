import type { Queryable } from '../db';
import type { GraphDelta } from '../schemas';
import { popcount, graphNodeCount } from '../progress';

const or = (a: Uint8Array, b: Uint8Array) => { const o = Buffer.alloc(Math.max(a.length, b.length)); for (let i = 0; i < o.length; i++) o[i] = (a[i] ?? 0) | (b[i] ?? 0); return o; };

/** §9.4 rule 2: graph progress never conflicts. Visited and cleared bitsets merge with a bitwise OR. */
export async function applyGraphs(q: Queryable, childId: string, deltas: GraphDelta[]) {
  for (const d of deltas) {
    const { rows } = await q.query(`select visited, cleared from graph_progress where child_id = $1 and graph_id = $2 for update`, [childId, d.graph]);
    const v = or(rows[0]?.visited ?? Buffer.alloc(0), Buffer.from(d.visited, 'base64'));
    const c = or(rows[0]?.cleared ?? Buffer.alloc(0), Buffer.from(d.cleared, 'base64'));
    await q.query(
      `insert into graph_progress (child_id, graph_id, node_count, visited, cleared, visited_n, cleared_n, last_node, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, now())
       on conflict (child_id, graph_id) do update set node_count = coalesce(excluded.node_count, graph_progress.node_count), visited = excluded.visited,
         cleared = excluded.cleared, visited_n = excluded.visited_n, cleared_n = excluded.cleared_n,
         last_node = coalesce(excluded.last_node, graph_progress.last_node), updated_at = now()`,
      [childId, d.graph, d.n ?? graphNodeCount(d.graph), v, c, popcount(v), popcount(c), d.lastNode ?? null]);
  }
  return deltas.length;
}
