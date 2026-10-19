import { B, ITEM, ITEMS, POOLS, POOL_ORDER, Item } from '../data';
import { S, WayKey, ALL_WAYS, ItemProg, WayStat, WordCycle, speechOn } from './state';

const L = () => B.learning;
const MIN = 60_000;
export const now = () => Date.now();

function blankWay(): WayStat { return { c: 0, a: 0, box: 0, last: 0, due: 0, wrongRun: 0 }; }
export function prog(id: string): ItemProg {
  let p = S.prog[id];
  if (!p) { p = S.prog[id] = { seen: false, recentMiss: 0, ways: { rZE: blankWay(), rEZ: blankWay(), sZE: blankWay(), sEZ: blankWay() } }; }
  return p;
}
export function activeWays(id: string, speech = speechOn()): WayKey[] {
  return speech && ITEM[id].speaking ? ALL_WAYS : ['rZE', 'rEZ'];
}
export function proficient(id: string, speech = speechOn()) {
  const p = prog(id); return activeWays(id, speech).every(w => p.ways[w].c >= L().proficientCorrect);
}
export function readingProficient(id: string) { const p = prog(id); return p.ways.rZE.c >= 2 && p.ways.rEZ.c >= 2; }
export function progress(id: string, speech = speechOn()) {
  const ws = activeWays(id, speech); const p = prog(id); const need = L().proficientCorrect;
  return ws.reduce((a, w) => a + Math.min(need, p.ways[w].c), 0) / (need * ws.length);
}
export function estAcc(w: WayStat) { return (w.c + 1) / (w.a + 2); }
function intervalMs(box: number) { return L().leitnerIntervalsMin[Math.min(box, L().maxBox)] * MIN; }
/** Overdue ratio of a way: 0 when not yet due (or never asked); >= 1 when due. Box 0 counts as due (ratio 1). */
export function overdue(w: WayStat, t = now()) {
  if (w.a === 0) return 0;
  const iv = intervalMs(w.box); if (iv === 0) return 1;
  const r = (t - w.last) / iv; return r >= 1 ? r : 0;
}
export function maxOverdue(id: string) { const p = prog(id); return Math.max(...activeWays(id).map(w => overdue(p.ways[w]))); }

export function weightedSample<T>(items: T[], w: number[], k: number): T[] {
  if (k <= 0 || !items.length) return [];
  const keyed = items.map((it, i) => ({ it, key: Math.pow(Math.random(), 1 / Math.max(w[i], 1e-6)) }));
  keyed.sort((a, b) => b.key - a.key); return keyed.slice(0, k).map(x => x.it);
}
function wReview(id: string) {
  const l = L();
  return (proficient(id) ? l.proficientWeight : l.localBaseWeight + l.localProgressWeight * (1 - progress(id))) + l.overdueWeight * Math.min(maxOverdue(id), l.overdueCap);
}
export function earlierItems(locId: string): string[] {
  const out: string[] = []; for (const l of POOL_ORDER) { if (l === locId) break; out.push(...(POOLS[l] || [])); } return out;
}
/** Carried-over "debt": seen, not-yet-proficient earlier items, oldest first, capped (spec §3.3). */
export function carried(locId: string) { return earlierItems(locId).filter(id => prog(id).seen && !proficient(id)).slice(0, L().carryOverCap); }
export function bossPool(locId: string) { return [...POOLS[locId], ...carried(locId)]; }
/** Proficient words of the location's own pool (the 📚 meter). Jack Oct 11: no patrol trigger, so nothing is gated on it. */
export function readiness(locId: string) {
  const pool = POOLS[locId];   // v3: the location's own pool only (carried-over items still appear in battles)
  const n = pool.filter(id => proficient(id)).length;
  return { n, total: pool.length, frac: n / pool.length };
}

function shuffle<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function wordCycle(key: string): WordCycle { return ((S.wordCycles ??= {})[key] ??= { used: [], last: [] }); }
/** Jack Oct 17: the battle fill draws without replacement across battles: words not yet drawn in this pool's cycle first, in random
 *  order. Only when every candidate was drawn does a new cycle start, and then the previous battle's words come last. */
export function cycleFill(key: string, pool: string[], candidates: string[], k: number): string[] {
  if (k <= 0 || !candidates.length) return [];
  const c = wordCycle(key); const inPool = new Set(pool);
  let used = new Set(c.used.filter(id => inPool.has(id)));
  const out = shuffle(candidates.filter(id => !used.has(id))).slice(0, k);
  if (out.length < k) {
    used = new Set();
    const last = new Set(c.last); const more = candidates.filter(id => !out.includes(id));
    out.push(...[...shuffle(more.filter(id => !last.has(id))), ...shuffle(more.filter(id => last.has(id)))].slice(0, k - out.length));
  }
  c.used = [...used, ...out];
  return out;
}
/** Marks a battle's words as drawn in the pool's cycle and remembers them as the previous battle. */
function noteBattleSet(key: string, pool: string[], ids: string[]) {
  const c = wordCycle(key); const inPool = new Set(pool);
  c.used = [...new Set([...c.used, ...ids.filter(id => inPool.has(id))])];
  c.last = [...ids];
}

/** Spec §3.3 with Jack's cap of 3 new items per battle. Returns the battle's focus items (weakest first) and which are new.
 *  The review slots and the new items follow the learning rules as before; the rest of the set (the fill) comes from the pool's
 *  draw-without-replacement cycle (cycleFill), keyed by `poolKey` (the location, or a map with its own word pool). */
export function chooseBattleSet(locId: string, reviewSlots: number, poolKey = locId): { ids: string[]; newIds: string[] } {
  const l = L();
  const review = earlierItems(locId).filter(id => prog(id).seen);
  const s: string[] = weightedSample(review, review.map(wReview), reviewSlots);
  const local = POOLS[locId];
  const unseen = local.filter(id => !prog(id).seen);
  const active = local.filter(id => prog(id).seen && !proficient(id));
  let q = Math.min(l.newCap, unseen.length, Math.max(0, l.workingSet - active.length));
  if (active.length + s.length < l.setSize - q) q = Math.min(unseen.length, l.setSize - s.length - active.length);
  q = Math.min(q, l.newCap);                        // Jack: at most 3 new items per battle, always
  const newIds = unseen.slice(0, q); s.push(...newIds);
  const pool = [...local, ...carried(locId)];
  const rest = pool.filter(id => prog(id).seen && !s.includes(id));
  s.push(...cycleFill(poolKey, pool, rest, l.setSize - s.length));
  noteBattleSet(poolKey, pool, s);
  const key: Record<string, number> = {}; for (const id of s) key[id] = progress(id) + Math.random() * 0.08;
  s.sort((a, b) => key[a] - key[b]);
  return { ids: s, newIds };
}

export interface WayCtx { asked: number; spoken: number; cooling: Set<string>; }
export function spokenAllowed(ctx: WayCtx) { return speechOn() && ctx.spoken + 1 <= L().spokenShareCap * (ctx.asked + 1); }
/** Spec §3.4 plus the ~50% spoken-share cap and the per-battle "cooling" after a void. */
export function pickWay(id: string, ctx: WayCtx): WayKey {
  let ways = activeWays(id);
  if (!spokenAllowed(ctx) || ctx.cooling.has(id)) ways = ways.filter(w => w[0] === 'r');
  const p = prog(id); const need = L().proficientCorrect;
  const todo = ways.filter(w => p.ways[w].c < need);
  const r: Record<string, number> = {}; for (const w of ways) r[w] = Math.random();
  if (todo.length) return todo.sort((a, b) => (p.ways[a].c - p.ways[b].c) || (estAcc(p.ways[a]) - estAcc(p.ways[b])) || (r[a] - r[b]))[0];
  return ways.sort((a, b) => (overdue(p.ways[b]) - overdue(p.ways[a])) || (estAcc(p.ways[a]) - estAcc(p.ways[b])) || (r[a] - r[b]))[0];
}

/** Spec §4 question feed: unasked in order, then missed (gap >= 2, same way), then weakest; max 4 asks per item. */
export class QuestionFeed {
  unasked: string[]; missed: { id: string; way: WayKey; form?: RezForm; tray?: string[] }[] = []; hist: string[] = []; count: Record<string, number> = {}; score: Record<string, number> = {};
  constructor(public items: string[]) { this.unasked = [...items]; for (const i of items) { this.count[i] = 0; this.score[i] = 0; } }
  gap(id: string) { for (let k = this.hist.length - 1; k >= 0; k--) if (this.hist[k] === id) return this.hist.length - 1 - k; return 99; }
  next(ctx: WayCtx): { id: string; way: WayKey; why: string; form?: RezForm; tray?: string[] } {
    const l = L();
    if (this.unasked.length) { const id = this.unasked.shift()!; return { id, way: pickWay(id, ctx), why: prog(id).seen ? 'focus' : 'new' }; }
    const m = this.missed.find(x => this.gap(x.id) >= l.reaskGap);
    if (m) {
      this.missed.splice(this.missed.indexOf(m), 1);
      let way = m.way; if (way[0] === 's' && (!spokenAllowed(ctx) || ctx.cooling.has(m.id))) way = pickWay(m.id, ctx);
      return { id: m.id, way, why: 're-ask missed', ...(way === m.way && m.form ? { form: m.form, tray: m.tray } : {}) };
    }
    let pool = this.items.filter(i => this.gap(i) >= l.reaskGap && this.count[i] < l.maxAsksPerItem);
    if (!pool.length) pool = this.items.filter(i => this.gap(i) >= 1);
    if (!pool.length) pool = this.items;
    const k: Record<string, number> = {}; for (const i of pool) k[i] = progress(i) + this.score[i] + Math.random() * 0.1;
    const id = pool.sort((a, b) => k[a] - k[b])[0];
    return { id, way: pickWay(id, ctx), why: 'weakest' };
  }
  /** form/tray: the R-EZ form of this question (§9.4: a re-ask after a miss keeps the form; tray = its distractor characters). */
  record(id: string, way: WayKey, result: 'correct' | 'wrong' | 'void', form?: RezForm, tray?: string[]) {
    if (result === 'void') return;
    this.hist.push(id); this.count[id]++;
    this.score[id] += result === 'correct' ? 0.15 : -0.3;
    if (result === 'wrong') this.missed.push({ id, way, ...(form ? { form, tray } : {}) });
  }
}

/** Leitner + proficiency update (spec §3.2). Returns EXP events. */
export function grade(id: string, way: WayKey, correct: boolean, hinted: boolean): { wayDone: boolean; becameProficient: boolean } {
  const p = prog(id); const w = p.ways[way]; const t = now(); const l = L();
  const wasProf = proficient(id); const before = w.c;
  p.seen = true; w.a++;
  if (correct) {
    if (!hinted) {
      const due = w.a === 1 || t >= w.due;
      if (due || w.box <= 1) w.box = Math.min(l.maxBox, w.box + 1);
      w.c++;
    }
    w.wrongRun = 0;
  } else { w.box = Math.max(0, w.box - l.wrongBoxDrop); w.wrongRun++; p.recentMiss++; }
  w.last = t; w.due = t + intervalMs(w.box);
  const wayDone = before < l.proficientCorrect && w.c >= l.proficientCorrect && activeWays(id).includes(way);
  return { wayDone, becameProficient: !wasProf && proficient(id) };
}
/** Practice answer (spec v3 §8): at most 1 of the 2 corrects per way may come from practice; no Leitner move, does not mark the item seen. */
export function gradePractice(id: string, way: WayKey, correct: boolean): boolean {
  const w = prog(id).ways[way]; const cap = B.practice.creditCapPerWay;
  if (correct && (w.pc || 0) < cap && w.c < L().proficientCorrect) { w.c++; w.pc = (w.pc || 0) + 1; return true; }
  return false;
}
export function decayRecentMisses() { for (const id in S.prog) S.prog[id].recentMiss = Math.floor(S.prog[id].recentMiss / 2); }

// ---------------- distractors (spec §8.3, simplified) ----------------
const STOP = new Set(['to', 'a', 'an', 'the', 'be', 'of', 'one', 'is', 'am', 'are', 'it', 's', 'i', 'you', 'on']);
function contentTokens(en: string) { return new Set(en.toLowerCase().replace(/\([^)]*\)/g, ' ').split(/[^a-z']+/).filter(t => t && !STOP.has(t))); }
const GROUPS = [['高兴', '开心', '快乐'], ['怕', '害怕'], ['帮', '帮忙', '帮助'], ['看', '看见'], ['二', '两'], ['哪儿', '哪里'], ['这儿', '这里'],
  ['但是', '可是', '不过'], ['很', '非常'], ['家', '房子'], ['你好', '您好'], ['再见', '拜拜'], ['饭', '米饭'], ['要', '想']];
function sameGroup(a: Item, b: Item) { return GROUPS.some(g => g.includes(a.zh) && g.includes(b.zh)); }
function sharesChar(a: Item, b: Item) { return [...a.zh].some(c => b.zh.includes(c)); }
function excluded(c: Item, t: Item) {
  if (c.zh === t.zh || t.altZh.includes(c.zh) || c.altZh.includes(t.zh)) return true;
  const A = contentTokens(c.en), T = contentTokens(t.en);
  for (const x of A) if (T.has(x)) return true;
  if (sameGroup(c, t)) return true;
  const phr = (x: Item) => ['phrase', 'exclamation'].includes(x.type);
  if (phr(t) && !phr(c)) return true;
  if (sharesChar(c, t) && [...c.zh].length <= 2) return true;
  return false;
}
const lastDistractors: Record<string, string[]> = {};
export function distractors(targetId: string, k: number): string[] {
  const t = ITEM[targetId];
  let C = ITEMS.filter(c => c.id !== t.id && !excluded(c, t));
  const tl = [...t.zh].length;
  const scored = C.map(c => ({ c, s: (c.topic === t.topic ? 3 : 0) + (c.type === t.type && c.pos === t.pos ? 2 : 0)
      + (Math.abs([...c.zh].length - tl) <= 1 ? 1 : 0)
      + (c.enPrimary.length / t.enPrimary.length >= 0.6 && c.enPrimary.length / t.enPrimary.length <= 1.6 ? 1 : 0)
      + (c.loc === t.loc ? 1 : 0) + (prog(c.id).seen ? 1 : 0) - ((lastDistractors[t.id] || []).includes(c.id) ? 2 : 0) + Math.random() * 0.5 }));
  scored.sort((a, b) => b.s - a.s);
  const top = scored.slice(0, 2 * k).map(x => x.c);
  // pick k from the top 2k, avoiding two distractors with the same English/Chinese as each other
  const out: Item[] = [];
  for (const c of top.sort(() => Math.random() - 0.5)) { if (out.length >= k) break; if (out.some(o => excluded(o, c))) continue; out.push(c); }
  lastDistractors[t.id] = out.map(o => o.id);
  return out.map(o => o.id);
}

// ---------------- character assembly (combat-spec §9.4) ----------------
export type RezForm = 'mc' | 'assembly';
const HAN = /^\p{Script=Han}+$/u;
/** §9.4.1: 2+ characters, all Han, reading = Y. */
export function assemblyEligible(id: string): boolean {
  const t = ITEM[id]; return !!t && t.reading && [...t.zh].length >= 2 && HAN.test(t.zh);
}
/** §9.4.2: an R-EZ question on an eligible item is assembly when R-EZ.attempts is odd, MC when even (so the first is MC). */
export function rezForm(id: string): RezForm {
  return assemblyEligible(id) ? 'assembly' : 'mc';   // Jack 2026-10-18: always assembly when eligible
}
/** §9.4.3: d = mcOptions − 1; the first-ever-question reduction maps to d − 1 (minimum 1), as for MC. */
export function assemblyD(mcOptions: number, first: boolean): number {
  return Math.max(1, mcOptions - 1 - (first ? L().firstAskOptionReduction : 0));
}
/** §9.4.4 candidate distractor characters for a target, from a pool: [met-first group, rest group]. */
export function assemblyCandidates(targetId: string, pool: string[]): { met: string[]; rest: string[] } {
  const t = ITEM[targetId]; const ans = [...t.zh];
  const byZh = new Map<string, Item[]>(); for (const c of ITEMS) { const l = byZh.get(c.zh); if (l) l.push(c); else byZh.set(c.zh, [c]); }
  const bad = (ch: string) => ans.some((_, i) => {
    const s = ans.map((a, k) => (k === i ? ch : a)).join('');
    return t.altZh.includes(s) || (byZh.get(s) || []).some(c => c.id !== t.id && excluded(c, t));
  });
  const met = new Set<string>(), all = new Set<string>();
  for (const pid of pool) { const c = ITEM[pid]; if (!c) continue; for (const ch of c.zh) { if (!HAN.test(ch)) continue; all.add(ch); if (prog(pid).seen) met.add(ch); } }
  const ok = (ch: string) => !ans.includes(ch) && !bad(ch);
  return { met: [...met].filter(ok), rest: [...all].filter(ch => !met.has(ch) && ok(ch)) };
}
/** §9.4.3–4: pick up to d distinct distractor characters (met first, random within each group). [] = ask as MC.
 *  prev = the missed question's distractors (§9.4.2 re-ask): keep them, swapping one for a new candidate when there is one. */
export function assemblyDistractors(targetId: string, pool: string[], d: number, prev?: string[]): string[] {
  const { met, rest } = assemblyCandidates(targetId, pool);
  const ordered = [...shuffle(met), ...shuffle(rest)];
  if (prev?.length) {
    const keep = prev.filter(ch => ordered.includes(ch)); const fresh = ordered.filter(ch => !keep.includes(ch));
    if (fresh.length && keep.length) keep.splice(Math.floor(Math.random() * keep.length), 1, fresh[0]);
    return keep.slice(0, d);
  }
  return ordered.slice(0, d);
}
/** §9.4.3 tray: the answer's characters (repeats included) + distractors, in random order. */
export function assemblyTray(targetId: string, distractorChars: string[]): string[] { return shuffle([...ITEM[targetId].zh, ...distractorChars]); }
/** §9.4.5 one tap, checked at once against the next empty slot. Grading is by character. */
export interface AsmState { answer: string[]; filled: number; taps: string[]; wrongSlot: number | null; done: boolean; }
export function asmStart(targetId: string): AsmState { return { answer: [...ITEM[targetId].zh], filled: 0, taps: [], wrongSlot: null, done: false }; }
export function asmTap(s: AsmState, ch: string): 'ok' | 'correct' | 'wrong' | 'ignored' {
  if (s.done) return 'ignored';
  s.taps.push(ch);
  if (ch !== s.answer[s.filled]) { s.wrongSlot = s.filled; s.done = true; return 'wrong'; }
  s.filled++; if (s.filled === s.answer.length) { s.done = true; return 'correct'; }
  return 'ok';
}
// ---------------- audio-only (listen) prompts (combat-spec §3.4, Jack 2026-10-18) ----------------
/** Whether a question is shown audio-only (listen) or with its text. out = which voices can speak now (zh: clip or zh-CN TTS; en: en-US TTS).
 *  rZE: listen & pick (speech input off or not speakable: alternates listen & pick / shown-text MC by R-ZE.attempts parity).
 *  rEZ: listen & pick unless §9.4 makes it assembly. sZE/sEZ: listen & say when attempts is even, read & say when odd.
 *  No voice for the prompt's language -> the written form. */
export function listenFor(id: string, way: WayKey, form: RezForm | undefined, out: { zh: boolean; en: boolean }, speechIn = speechOn()): boolean {
  const a = prog(id).ways[way].a; const zhAudio = way === 'rZE' || way === 'sZE';
  if (!(zhAudio ? out.zh : out.en)) return false;
  if (way === 'rEZ') return form !== 'assembly';
  if (way === 'rZE') return (speechIn && ITEM[id].speaking) || a % 2 === 0;
  return a % 2 === 0;
}

// exposed for automated tests (tests/world.mjs, tests/play.mjs)
if (typeof window !== 'undefined') (window as any).__proto = Object.assign((window as any).__proto || {}, { asm: { listenFor, pickWay, grade, activeWays, assemblyEligible, rezForm, assemblyD, assemblyCandidates, assemblyDistractors, assemblyTray, asmStart, asmTap, prog,
  pool: (loc: string) => POOLS[loc] || [], item: (id: string) => ITEM[id], ids: () => ITEMS.map(i => i.id), log: () => S.log,
  feed: (ids: string[]) => new QuestionFeed(ids) } });
