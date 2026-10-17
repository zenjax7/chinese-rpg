/** Jack Oct 17: battle words are drawn without replacement across battles, per word pool, so consecutive battles don't reuse the
 *  same words; the whole pool is cycled before any word repeats. The learning rules stay: at most 3 new words per battle (newCap),
 *  the working set, and the review slots. Engine-level and seeded (Math.random is a fixed PRNG), on level 1's pool (meadow). */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { chooseBattleSet, grade, prog, cycleFill, QuestionFeed } from '../../src/engine/learning';
import { S, resetAll, replaceState } from '../../src/engine/state';
import { POOLS, B } from '../../src/data';

function mulberry32(seed: number) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const LEVEL1 = 'meadow';                         // graph mode realm 1 (level 1) battles use the meadow pool (src/ui/graph.ts battleLoc)
const POOL = POOLS[LEVEL1];
const seenPool = () => POOL.filter(id => prog(id).seen);
/** One battle of 12 questions through the real question feed (it asks every set word before any repeat), 80% answered right. */
function battle(seedOk: () => number) {
  const set = chooseBattleSet(LEVEL1, 0);
  const feed = new QuestionFeed(set.ids); const ctx = { asked: 0, spoken: 0, cooling: new Set<string>() };
  for (let q = 0; q < 12; q++) { const n = feed.next(ctx); const right = seedOk() < 0.8; grade(n.id, n.way, right, false); feed.record(n.id, n.way, right ? 'correct' : 'wrong'); ctx.asked++; }
  return set;
}

beforeEach(() => { resetAll(); vi.spyOn(Math, 'random').mockImplementation(mulberry32(20261017)); });
afterEach(() => { vi.restoreAllMocks(); });

describe('battle words: draw without replacement across battles (level 1)', () => {
  it('across 40 consecutive battles no word repeats until every eligible word was drawn; consecutive battles share none once the rules allow', () => {
    const ok = mulberry32(7); let last: string[] = []; let drawn = new Set<string>(); let zeroOverlap = 0; const forced: number[] = [];
    for (let b = 0; b < 40; b++) {
      const seenBefore = seenPool(); const unused = seenBefore.filter(id => !drawn.has(id)); const notLast = seenBefore.filter(id => !last.includes(id));
      const set = battle(ok); const fill = set.ids.filter(id => !set.newIds.includes(id)); const need = fill.length;
      expect(set.newIds.length).toBeLessThanOrEqual(B.learning.newCap);                         // rule kept: ≤ 3 new words
      expect(set.newIds.every(id => !seenBefore.includes(id))).toBe(true);
      if (need <= unused.length) expect(fill.every(id => unused.includes(id)), `battle ${b + 1}: a fill word repeats before the cycle is exhausted`).toBe(true);
      else expect(unused.every(id => fill.includes(id)), `battle ${b + 1}: the cycle restarted before every word was drawn`).toBe(true);
      drawn = need <= unused.length ? new Set([...drawn, ...set.ids]) : new Set(set.ids);
      const overlap = set.ids.filter(id => last.includes(id)).length;
      expect(overlap, `battle ${b + 1}: only the words the rules force may repeat from the previous battle`).toBe(Math.max(0, need - notLast.length));
      if (overlap === 0) zeroOverlap++; else forced.push(b + 1);
      last = set.ids;
    }
    // the forced repeats are the first battles only: 3 new words per battle (newCap) cannot yet fill a 7-word set with unused words
    expect(forced.every(b => b <= 4), `forced repeats in battles ${forced}`).toBe(true);
    expect(zeroOverlap).toBeGreaterThanOrEqual(36);
  });

  it('the cycle covers the whole pool: with every level 1 word known, the first battles use each of the 52 words once before any repeats', () => {
    for (const id of POOL) { const p = prog(id); p.seen = true; for (const w of Object.values(p.ways)) { w.a = 2; w.c = 2; w.box = 2; w.last = Date.now(); } }
    const k = B.learning.setSize; const full = Math.floor(POOL.length / k); const words: string[] = [];
    for (let b = 0; b < Math.ceil(POOL.length / k); b++) words.push(...chooseBattleSet(LEVEL1, 0).ids);
    expect(new Set(words.slice(0, full * k)).size).toBe(full * k);                              // 7 battles × 7 words: 49 different words
    expect(new Set(words).size).toBe(POOL.length);                                               // battle 8 finishes the cycle: all 52
  });

  it('the cycle state is in the save: it survives a reload, and an old save without it loads and starts a fresh cycle', () => {
    for (const id of POOL) prog(id).seen = true;
    const a = chooseBattleSet(LEVEL1, 0).ids;
    expect(S.wordCycles?.[LEVEL1]?.used).toEqual(expect.arrayContaining(a));
    replaceState(JSON.parse(JSON.stringify(S)));                                                 // reload
    const b = chooseBattleSet(LEVEL1, 0).ids;
    expect(b.some(id => a.includes(id))).toBe(false);
    const old = JSON.parse(JSON.stringify(S)); delete old.wordCycles; replaceState(old);          // a save from before Oct 17
    expect(chooseBattleSet(LEVEL1, 0).ids).toHaveLength(B.learning.setSize);
    expect(S.wordCycles?.[LEVEL1]?.used.length).toBe(B.learning.setSize);
  });

  it('each pool has its own cycle (a map with its own word pool does not use up level 1’s)', () => {
    const pool = POOL.slice(0, 10);
    const m1 = cycleFill('map:test', pool, pool, 7);
    expect(S.wordCycles?.[LEVEL1]).toBeUndefined();
    const m2 = cycleFill('map:test', pool, pool, 3);
    expect(new Set([...m1, ...m2]).size).toBe(10);
  });
});
