import type { Queryable } from '../db';
import { WAYS, type MasteryDelta } from '../schemas';

export const PROFICIENT_CORRECT = 2;   // balance.json learning.proficientCorrect
type WayStat = { c: number; a: number; box: number; last: number; due: number; wrongRun: number; pc?: number };

/** §9.4 rule 1: word mastery never conflicts. a += da, c += dc (c never above a); box, due, last and wrongRun come from whichever side
 *  has the newer `last`. Rows are read FOR UPDATE inside the save transaction (the child row is already locked). */
export async function applyMastery(q: Queryable, childId: string, deltas: MasteryDelta[], speechOn: boolean) {
  if (!deltas.length) return 0;
  const items = [...new Set(deltas.map(d => d.item))];
  const { rows } = await q.query(`select item_id, seen, recent_miss, ways from word_mastery where child_id = $1 and item_id = any($2::text[]) for update`, [childId, items]);
  const cur = new Map<string, { seen: boolean; recentMiss: number; ways: Record<string, WayStat> }>(rows.map(r => [r.item_id, { seen: r.seen, recentMiss: r.recent_miss, ways: r.ways ?? {} }]));
  for (const d of deltas) {
    const row = cur.get(d.item) ?? { seen: false, recentMiss: 0, ways: {} };
    const w: WayStat = row.ways[d.way] ?? { c: 0, a: 0, box: 0, last: 0, due: 0, wrongRun: 0 };
    const a = w.a + d.da, c = Math.min(a, w.c + d.dc);
    row.ways[d.way] = d.last >= w.last ? { ...w, a, c, box: d.box, due: d.due, last: d.last, wrongRun: d.wrongRun } : { ...w, a, c };
    if (d.seen) row.seen = true;
    if (d.recentMiss !== undefined && d.last >= w.last) row.recentMiss = d.recentMiss;
    cur.set(d.item, row);
  }
  for (const item of items) {
    const r = cur.get(item)!;
    await q.query(
      `insert into word_mastery (child_id, item_id, seen, recent_miss, ways, proficient, updated_at) values ($1, $2, $3, $4, $5, $6, now())
       on conflict (child_id, item_id) do update set seen = excluded.seen, recent_miss = excluded.recent_miss, ways = excluded.ways,
         proficient = excluded.proficient, updated_at = now()`,
      [childId, item, r.seen, r.recentMiss, JSON.stringify(r.ways), isProficient(r.ways, speechOn)]);
  }
  return items.length;
}
/** Mirrors proficient() in src/engine/learning.ts: the reading ways always count; the speaking ways count when speech is on and the
 *  word has been asked that way (the server has no per-word `speaking` flag, so an unasked speaking way is treated as inactive). */
export function isProficient(ways: Record<string, WayStat>, speechOn: boolean): boolean {
  const active = WAYS.filter(w => w === 'rZE' || w === 'rEZ' || (speechOn && (ways[w]?.a ?? 0) > 0));
  return active.every(w => (ways[w]?.c ?? 0) >= PROFICIENT_CORRECT);
}
