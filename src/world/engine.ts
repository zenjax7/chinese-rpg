/** Graph world engine (v3.9.1, docs/design/world-graph.md). Pure functions over the generated data in public/world/ and the
 *  player's progress (docs/data/world/schemas/progress.schema.json, progress/0.3). No DOM and no save-state imports, so the
 *  tests bundle this file with esbuild and run it in node. */

// ---------------- data types (only the fields the runtime uses; the files carry more) ----------------
export interface Txt { zh: string; en: string }
export interface GNode { id: string; idx: number; kind: string; x: number; y: number; zone?: string; title?: Txt; boss?: string; fog?: string;
  services?: string[]; campfire?: boolean; save?: boolean; npc?: string; town?: number }
export interface NodeRef { graph: string; node: string }
export interface GEdge { id: string; idx: number; from: string; to: string | NodeRef; kind: string; danger?: number; steps?: number; patrol?: boolean;
  cond?: Cond; scripted?: { enemies: string[]; fill?: boolean; once?: boolean; step?: number } }
export type Action = Record<string, any>;
export interface GEvent { id: string; node: string; on: string; once?: boolean; cooldown?: number; cond?: Cond; outcome?: string; do?: Action[];
  pick?: { weight: number; outcome?: string; once?: boolean; cooldown?: number; cond?: Cond; do: Action[] }[]; tutorial?: boolean }
export interface Graph { id: string; kind: string; realm: number; dungeon?: string; level?: number; title?: Txt; entry?: string; aspect?: number;
  nodes: GNode[]; edges: GEdge[]; events?: GEvent[]; dialogue?: Record<string, { speaker: string; en: string; zh?: string; tokens?: string[] }[]>;
  npcs?: Record<string, Txt & { portrait?: string; base?: string }> }
export interface Zone { id: string; realm: number; order: number; title: Txt; location: string; bossNode?: NodeRef; bossKind?: string; boss?: string;
  enemiesPerBattle?: number[]; roster?: { enemy: string; weight: number }[]; elite?: string; tier?: number }
export interface WorldIndex { contentVersion: string; dataVersion: string; start: NodeRef; rules: any; zones: Zone[];
  graphs: { id: string; kind: string; realm: number; dungeon?: string; level?: number; title?: Txt }[]; scenes: string[];
  words: Record<string, Txt>; speakers: Record<string, Txt> }
export type Cond = Record<string, any>;
export interface QuestStep { id: string; event?: string; objective: { type: string; npc?: string; enemy?: string; enemies?: string[]; n?: number; item?: string;
  source?: string; dropFrom?: string[]; dropChance?: number; turnIn?: boolean; scope?: { realm?: number } }; at: (NodeRef & { edges?: string[] }) | { graph: string; edges: string[] } | null }
export interface Quest { id: string; realm: number; zone: string; title: Txt; giver: any; giverAt: NodeRef | null; turnIn: any; turnInAt: NodeRef | null;
  returnToGiver?: boolean; requires?: Cond | null; objectives: QuestStep[]; scenes?: { offer?: string; progress?: string; turnIn?: string } | null;
  rewards: { goldValue?: number; expValue?: number; items?: Record<string, number>; flags?: string[] }; summary?: string; repeatable?: boolean }
/** One story quest's saved state (architecture §11.2): only active / ready / completed are stored. */
export interface QState { s: 'active' | 'ready' | 'completed'; at: number; done?: number; step: number; obj: Record<string, number> }

// ---------------- progress (progress/0.3) ----------------
export interface GraphProg { visited: string; walked: string; revealed: string; crossings: Record<string, number>; edgeProgress: Record<string, number>; visits: Record<string, number> }
export interface Progress {
  schema: 'progress/0.3'; dataVersion?: string; seed: number;
  pos: { graph: string; node: string; edge: string | null; step: number };
  lastInn: NodeRef; visitedTowns: NodeRef[]; graphs: Record<string, GraphProg>;
  eventsDone: string[]; eventLastFired: Record<string, number>; shortcuts: string[]; zonesDefeated: string[]; flags: string[];
  zone: { id: string; freshBattles: number; pity: number; approachArmed: boolean; patrolsLeft: number; bossCheckpoint: object | null };
  safeUntil: Record<string, number>; hops: number; feathers: number;
}
/** zone: the start node's zone id (the schema wants a non-empty id). */
export function newProgress(seed: number, start: NodeRef, dataVersion = '', feathers = 2, zone = 'none'): Progress {
  return { schema: 'progress/0.3', dataVersion, seed: seed >>> 0, pos: { graph: start.graph, node: start.node, edge: null, step: 0 },
    lastInn: { ...start }, visitedTowns: [], graphs: {}, eventsDone: [], eventLastFired: {}, shortcuts: [], zonesDefeated: [], flags: [],
    zone: { id: zone, freshBattles: 0, pity: 0, approachArmed: true, patrolsLeft: 0, bossCheckpoint: null }, safeUntil: {}, hops: 0, feathers };
}
export function gp(P: Progress, gid: string): GraphProg {
  return P.graphs[gid] ??= { visited: '', walked: '', revealed: '', crossings: {}, edgeProgress: {}, visits: {} };
}

// ---------------- base64 bitsets (bit i = idx i, LSB first in each byte) ----------------
const b64enc = (u: Uint8Array) => { let s = ''; u.forEach(b => s += String.fromCharCode(b)); return btoa(s); };
const b64dec = (s: string) => Uint8Array.from(atob(s || ''), c => c.charCodeAt(0));
export function bitGet(b: string, i: number) { const u = b64dec(b); return ((u[i >> 3] || 0) >> (i & 7) & 1) === 1; }
export function bitSet(b: string, i: number): string {
  const u = b64dec(b); const n = new Uint8Array(Math.max(u.length, (i >> 3) + 1)); n.set(u); n[i >> 3] |= 1 << (i & 7); return b64enc(n);
}
export function bitList(b: string): number[] { const u = b64dec(b); const o: number[] = []; u.forEach((x, k) => { for (let j = 0; j < 8; j++) if (x >> j & 1) o.push(k * 8 + j); }); return o; }

// ---------------- deterministic rolls: mulberry32(FNV-1a 32 of the key) ----------------
/** FNV-1a 32-bit (the spec names mulberry32 but not the string hash; FNV-1a is our choice, documented in the report). */
export function fnv1a(s: string): number { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; }
export function mulberry32(a: number): () => number {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export const roll = (key: string) => mulberry32(fnv1a(key))();

// ---------------- graph helpers ----------------
export const nodeOf = (g: Graph, id: string) => g.nodes.find(n => n.id === id);
export const crossGraph = (e: GEdge) => typeof e.to === 'object';
/** Edges leaving a node: in-graph edges both ways (except oneway against its direction) and cross-graph links from it. */
export function edgesAt(g: Graph, node: string): GEdge[] {
  return g.edges.filter(e => e.from === node || (!crossGraph(e) && e.to === node && e.kind !== 'oneway'));
}
export function otherEnd(e: GEdge, node: string): string | NodeRef { return e.from === node ? e.to : e.from; }

// ---------------- conditions (world-graph §5.2 grammar) ----------------
export interface Ctx { P: Progress; quests: Record<string, QState>; level?: number; inv?: Record<string, number> }
export function evalCond(c: Cond | null | undefined, x: Ctx): boolean {
  if (!c) return true;
  return Object.entries(c).every(([k, v]) => {
    switch (k) {
      case 'all': return (v as Cond[]).every(s => evalCond(s, x));
      case 'any': return (v as Cond[]).some(s => evalCond(s, x));
      case 'not': return !evalCond(v, x);
      case 'flag': return x.P.flags.includes(v);
      case 'questActive': return x.quests[v]?.s === 'active';
      case 'questReady': return x.quests[v]?.s === 'ready';
      case 'questClaimed': case 'questDone': case 'questCompleted': return x.quests[v]?.s === 'completed';
      case 'bossDefeated': return x.P.zonesDefeated.includes(v);
      case 'levelAtLeast': return (x.level ?? 1) >= v;
      case 'hasItem': return ((x.inv || {})[v] || 0) > 0;
      case 'shortcutOpen': return x.P.shortcuts.includes(v);
      case 'visited': { const [g, n] = String(v).split('/'); return isVisited(x.P, g, n); }
      default: return true;   // wordsReady / readinessAtLeast: not tracked per pool yet -> open
    }
  });
}
const graphsCache: Record<string, Graph> = {};
export function registerGraph(g: Graph) { graphsCache[g.id] = g; }
export function isVisited(P: Progress, gid: string, node: string) { const g = graphsCache[gid]; const n = g && nodeOf(g, node); return !!n && bitGet(gp(P, gid).visited, n.idx); }

/** Can the hero walk this edge now? (edge cond; a shortcut until opened) */
export function edgeOpen(e: GEdge, x: Ctx) { return evalCond(e.cond, x) && (e.kind !== 'shortcut' || x.P.shortcuts.includes(e.id)); }

// ---------------- fog of war ----------------
export type FogState = 'visited' | 'seen' | 'landmark' | 'hidden';
/** visited nodes; '?' for nodes one open edge away from a visited node; landmarks (town, village, boss or node.fog='landmark'); revealed bits. */
export function fog(g: Graph, P: Progress, x: Ctx, landmarkKinds: string[] = ['town', 'village', 'boss']): Record<string, FogState> {
  const pr = gp(P, g.id); const out: Record<string, FogState> = {};
  const vis = new Set(bitList(pr.visited)); const rev = new Set(bitList(pr.revealed));
  for (const n of g.nodes) out[n.id] = vis.has(n.idx) ? 'visited' : 'hidden';
  for (const n of g.nodes) if (vis.has(n.idx)) for (const e of edgesAt(g, n.id)) {
    const o = otherEnd(e, n.id); if (typeof o === 'string' && out[o] === 'hidden' && edgeOpen(e, x)) out[o] = 'seen';
  }
  for (const n of g.nodes) if (out[n.id] === 'hidden' && (rev.has(n.idx) || n.fog === 'landmark' || landmarkKinds.includes(n.kind))) out[n.id] = 'landmark';
  return out;
}
export function markVisited(P: Progress, g: Graph, node: string) {
  const n = nodeOf(g, node); if (!n) return; const pr = gp(P, g.id);
  pr.visited = bitSet(pr.visited, n.idx); pr.visits[n.idx] = (pr.visits[n.idx] || 0) + 1;
  if ((n.kind === 'town' || n.kind === 'village') && !P.visitedTowns.some(t => t.graph === g.id && t.node === node)) P.visitedTowns.push({ graph: g.id, node });
}

// ---------------- encounters (world-graph §4) ----------------
const SAFE_NODE = ['town', 'village', 'inn'];
export function edgeSafe(g: Graph, e: GEdge, P: Progress, rules: any): boolean {
  if (!['path', 'oneway', 'shortcut'].includes(e.kind) || !(e.danger ?? 0)) return true;
  if (e.patrol && rules.safe?.bossApproach !== false) return true;
  const ends = [e.from, e.to as string].map(id => nodeOf(g, id)?.kind || '');
  if (ends.some(k => SAFE_NODE.includes(k))) return true;
  const su = P.safeUntil[`${g.id}/${e.idx}`]; if (su !== undefined && P.hops <= su) return true;
  return false;
}
export function stepRate(g: Graph, e: GEdge, P: Progress, rules: any): { p: number; fresh: boolean } {
  const base = rules.encounterRate[String(e.danger ?? 0)] ?? 0;
  let p = Math.min(rules.maxRate, base * (1 + rules.depthStep * ((g.level || 1) - 1)));
  const fresh = !bitGet(gp(P, g.id).walked, e.idx);
  if (!fresh) p *= rules.clearedStepMult;
  else if (P.zone.freshBattles >= rules.zoneBattleBudget) p *= rules.budgetSpentMult;
  else if (P.zone.pity >= rules.pityRolls) p = 1;
  return { p, fresh };
}
/** Roll one step of an edge. Pure in (seed, graph, edge, crossing, step); updates pity / fresh counters. */
export function rollStep(g: Graph, e: GEdge, step: number, P: Progress, rules: any): boolean {
  if (edgeSafe(g, e, P, rules)) return false;
  const crossing = gp(P, g.id).crossings[e.idx] || 0;
  const { p, fresh } = stepRate(g, e, P, rules);
  const hit = roll(`${P.seed}|${g.id}|${e.id}|${crossing}|${step}`) < p;
  if (fresh) { if (hit) { P.zone.freshBattles++; P.zone.pity = 0; } else P.zone.pity++; }
  return hit;
}
/** The zone an edge's battles use: its own nodes' zone, else the `to` node's (§4.1). */
export function edgeZone(g: Graph, e: GEdge): string | undefined {
  const t = typeof e.to === 'string' ? nodeOf(g, e.to) : undefined; const f = nodeOf(g, e.from);
  return t?.zone || f?.zone;
}
export function finishEdge(P: Progress, g: Graph, e: GEdge) {
  const pr = gp(P, g.id); pr.walked = bitSet(pr.walked, e.idx); pr.crossings[e.idx] = (pr.crossings[e.idx] || 0) + 1; delete pr.edgeProgress[e.idx]; P.hops++;
}
/** After a boss / mini-boss clear: the way back (BFS over walked or safe edges to the nearest inn or town) stays safe for N hops. */
export function markSafeBack(P: Progress, g: Graph, from: string, rules: any) {
  const hops = rules.safe?.afterBossClear?.hops ?? 20; const pr = gp(P, g.id);
  const prev: Record<string, GEdge | null> = { [from]: null }; const q = [from]; let goal: string | null = null;
  while (q.length && !goal) {
    const n = q.shift()!;
    for (const e of edgesAt(g, n)) { const o = otherEnd(e, n); if (typeof o !== 'string' || o in prev) continue;
      if (!bitGet(pr.walked, e.idx) && !edgeSafe(g, e, P, rules)) continue;
      prev[o] = e; if (SAFE_NODE.includes(nodeOf(g, o)?.kind || '')) { goal = o; break; } q.push(o); }
  }
  for (let n = goal; n && prev[n]; ) { const e = prev[n]!; P.safeUntil[`${g.id}/${e.idx}`] = P.hops + hops; n = otherEnd(e, n) as string; }
}

// ---------------- arrival events (§5.2: first eligible event per arrival) ----------------
export interface Fired { ev: GEvent; actions: Action[]; key: string; outcome?: string }
export function pickEvent(g: Graph, node: string, on: string, x: Ctx, first: boolean): Fired | null {
  const P = x.P; const n = nodeOf(g, node)!; const visits = gp(P, g.id).visits[n.idx] || 0;
  for (const ev of g.events || []) {
    if (ev.node !== node) continue;
    if (!(ev.on === on || (on === 'enter' && ev.on === 'firstEnter' && first))) continue;
    if (ev.on === 'firstEnter' && !first) continue;
    const key = `${g.id}/${ev.id}`;
    if (!evalCond(ev.cond, x)) continue;
    if (ev.pick) {
      const opts = ev.pick.map((o, i) => ({ o, i, k: `${key}#${i}` })).filter(({ o, k }) => evalCond(o.cond, x) && !(o.once && P.eventsDone.includes(k))
        && !(o.cooldown && P.eventLastFired[k] !== undefined && visits - P.eventLastFired[k] < o.cooldown));
      if (!opts.length) continue;
      const tot = opts.reduce((s, a) => s + a.o.weight, 0); let r = roll(`${P.seed}|${node}|${visits}|${ev.id}`) * tot;
      const ch = opts.find(a => (r -= a.o.weight) < 0) || opts[opts.length - 1];
      return { ev, actions: ch.o.do, key: ch.k, outcome: ch.o.outcome };
    }
    if (ev.once && P.eventsDone.includes(key)) continue;
    if (ev.cooldown && P.eventLastFired[key] !== undefined && visits - P.eventLastFired[key] < ev.cooldown) continue;
    return { ev, actions: ev.do || [], key, outcome: ev.outcome };
  }
  return null;
}
export function markFired(P: Progress, g: Graph, f: Fired, onceOpt?: boolean) {
  const n = nodeOf(g, f.ev.node)!; const visits = gp(P, g.id).visits[n.idx] || 0;
  const once = f.key.includes('#') ? onceOpt : f.ev.once;
  if (once && !P.eventsDone.includes(f.key)) P.eventsDone.push(f.key);
  P.eventLastFired[f.key] = visits;
}

// ---------------- quests (architecture §11.2 state machine) ----------------
export type QStatus = 'locked' | 'available' | 'active' | 'ready' | 'completed';
export function questStatus(q: Quest, x: Ctx): QStatus {
  const st = x.quests[q.id]; if (st) return st.s;
  return evalCond(q.requires || null, x) ? 'available' : 'locked';
}
export const atNode = (a: any, gid: string, node: string) => !!a && a.graph === gid && a.node === node;
export const autoTurnIn = (q: Quest) => q.turnIn === 'auto' || q.returnToGiver === false;
/** The steps that count as objectives (the first talk = the offer, the last talk with turnIn = the hand-in). */
export function objectiveSteps(q: Quest): QuestStep[] {
  return q.objectives.filter((s, i) => !(i === 0 && s.objective.type === 'talk') && !s.objective.turnIn);
}
export function accept(q: Quest, x: Ctx, now = Date.now()): QState {
  const st: QState = { s: 'active', at: now, step: 0, obj: {} }; x.quests[q.id] = st; skipAuto(q, st); return st;
}
export function currentStep(q: Quest, st: QState): QuestStep | null { return objectiveSteps(q)[st.step] || null; }
/** Advance past the current step; returns the new status. 'ready' waits for the giver, auto quests become 'completed'. */
export function completeStep(q: Quest, st: QState, now = Date.now()): QState['s'] {
  st.step++; skipAuto(q, st);
  if (st.step >= objectiveSteps(q).length) { st.s = autoTurnIn(q) ? 'completed' : 'ready'; if (st.s === 'completed') st.done = now; }
  return st.s;
}
/** escort and words steps have no runtime check yet: they complete as soon as they become current (gap, see report). */
function skipAuto(q: Quest, st: QState) { let s = currentStep(q, st); while (s && ['escort', 'words'].includes(s.objective.type)) { st.step++; s = currentStep(q, st); } }
export function turnIn(st: QState, now = Date.now()) { st.s = 'completed'; st.done = now; }
export type QEvent = { type: 'arrive'; graph: string; node: string } | { type: 'kill'; enemies: string[]; realm: number } | { type: 'collect'; item: string; n?: number }
  | { type: 'fightWon'; graph: string; node: string };
/** Feed one game event to every active quest; returns the ids whose state changed (step done / ready / completed). */
export function questEvent(quests: Quest[], x: Ctx, ev: QEvent, rnd: () => number = Math.random): { id: string; s: QState['s']; stepDone: boolean }[] {
  const out: { id: string; s: QState['s']; stepDone: boolean }[] = [];
  for (const q of quests) {
    const st = x.quests[q.id]; if (!st || st.s !== 'active') continue;
    skipAuto(q, st);
    const step = currentStep(q, st);
    if (!step) { st.s = autoTurnIn(q) ? 'completed' : 'ready'; if (st.s === 'completed') st.done = Date.now(); out.push({ id: q.id, s: st.s, stepDone: false }); continue; }
    let cur: QuestStep | null = step; let fresh = true; let changed = false;
    while (cur && st.s === 'active') {
      const o = cur.objective; let done = false;
      if (fresh && ev.type === 'arrive' && atNode(cur.at, ev.graph, ev.node) && ['talk', 'reach', 'deliver'].includes(o.type)) done = true;
      else if (fresh && ev.type === 'arrive' && o.type === 'collect' && o.source === 'nodeItem' && atNode(cur.at, ev.graph, ev.node)) done = true;
      else if (o.type === 'collect' && !o.dropFrom && o.item && ((x.inv || {})[o.item] || 0) >= (o.n || 1)) done = true;   // already carried
      else if (fresh && ev.type === 'collect' && o.type === 'collect' && o.item === ev.item) { st.obj[cur.id] = (st.obj[cur.id] || 0) + (ev.n || 1); done = st.obj[cur.id] >= (o.n || 1); }
      else if (fresh && ev.type === 'fightWon' && o.type === 'kill' && o.enemies && atNode(cur.at, ev.graph, ev.node)) done = true;
      else if (fresh && ev.type === 'kill' && o.type === 'kill' && o.enemy && (!o.scope?.realm || o.scope.realm === ev.realm)) {
        const k = ev.enemies.filter(e => e === o.enemy).length; if (k) { st.obj[cur.id] = (st.obj[cur.id] || 0) + k; done = st.obj[cur.id] >= (o.n || 1); }
      } else if (fresh && ev.type === 'kill' && o.type === 'collect' && o.dropFrom) {
        for (const e of ev.enemies) if (o.dropFrom.includes(e) && rnd() < (o.dropChance ?? 0.35)) st.obj[cur.id] = (st.obj[cur.id] || 0) + 1;
        done = (st.obj[cur.id] || 0) >= (o.n || 1);
      }
      if (!done) break;
      completeStep(q, st); changed = true;
      // the same arrival can also satisfy the next step (reach the well, then pick up the hoe that lies there)
      const nx = currentStep(q, st); fresh = !!nx && ev.type === 'arrive' && atNode(nx.at, (ev as any).graph, (ev as any).node); cur = nx;
      if (!fresh && cur && !(cur.objective.type === 'collect' && !cur.objective.dropFrom)) break;
    }
    if (changed) out.push({ id: q.id, s: st.s, stepDone: true });
  }
  return out;
}
/** A quest-gated fight on this node: an active quest whose current step is `kill` with listed enemies here. */
export function questFightAt(quests: Quest[], x: Ctx, gid: string, node: string): { quest: Quest; enemies: string[] } | null {
  for (const q of quests) { const st = x.quests[q.id]; if (st?.s !== 'active') continue; const s = currentStep(q, st);
    if (s && s.objective.type === 'kill' && s.objective.enemies?.length && atNode(s.at, gid, node)) return { quest: q, enemies: s.objective.enemies }; }
  return null;
}

// ---------------- Return Feather (rules.returnFeather, realmBossFeather) ----------------
export function featherDestinations(P: Progress, title: (r: NodeRef) => string): { ref: NodeRef; label: string; kind: 'inn' | 'town' }[] {
  const out: { ref: NodeRef; label: string; kind: 'inn' | 'town' }[] = [];
  const same = (a: NodeRef, b: NodeRef) => a.graph === b.graph && a.node === b.node;
  out.push({ ref: P.lastInn, label: title(P.lastInn), kind: 'inn' });
  for (const t of P.visitedTowns) if (!out.some(o => same(o.ref, t))) out.push({ ref: t, label: title(t), kind: 'town' });
  return out.filter(o => !same(o.ref, { graph: P.pos.graph, node: P.pos.node }));
}
/** Add feathers up to the carry cap; returns how many were actually added. */
export function addFeathers(have: number, n: number, carry = 3) { return Math.max(0, Math.min(n, carry - have)); }
