/** Pure edits on a level/0.2 map for the editor (level-editor.md §5.3). Every function returns a new map and never mutates its input. */
import type { Level, LevelEdge, LevelNode, NodeRef, Scene, SceneLine } from '../shared/level/types.js';

const copy = <T>(v: T): T => structuredClone(v);
const nextIdx = (xs: { idx?: number }[]) => xs.reduce((m, x) => Math.max(m, x.idx ?? -1), -1) + 1;
/** The first free id `${prefix}${n}` (n from 1) among `taken`. */
export function freeId(prefix: string, taken: Iterable<string>): string {
  const t = new Set(taken); let n = 1;
  while (t.has(`${prefix}${n}`)) n++;
  return `${prefix}${n}`;
}
export const isCrossMap = (e: LevelEdge): e is LevelEdge & { to: NodeRef } => typeof e.to === 'object' && e.to !== null;

// ---------------- nodes ----------------
export function addNode(l: Level, at: { x: number; y: number }): { level: Level; id: string } {
  const out = copy(l);
  const id = freeId('node_', out.nodes.map(n => n.id));
  out.nodes.push({ id, idx: nextIdx(out.nodes), kind: 'waypoint', x: clamp01(at.x), y: clamp01(at.y), title: { en: 'New node' } });
  return { level: out, id };
}
export function updateNode(l: Level, id: string, patch: Partial<LevelNode>): Level {
  const out = copy(l);
  const n = out.nodes.find(x => x.id === id); if (!n) return out;
  Object.assign(n, patch);
  for (const [k, v] of Object.entries(patch)) if (v === undefined || v === '') delete (n as any)[k];
  return out;
}
/** Renames a node and every reference to it on this map (edges, events, entry, boss). */
export function renameNode(l: Level, from: string, to: string): Level {
  if (!/^[a-z0-9_]+$/.test(to) || l.nodes.some(n => n.id === to)) return l;
  const out = copy(l);
  for (const n of out.nodes) if (n.id === from) n.id = to;
  for (const e of out.edges) { if (e.from === from) e.from = to; if (e.to === from) e.to = to; }
  for (const ev of out.events ?? []) if (ev.node === from) ev.node = to;
  if (out.entry === from) out.entry = to;
  if (out.settings.boss?.node === from) out.settings.boss.node = to;
  return out;
}
/** Deletes nodes with their links and events. Cross-map links that leave these nodes are returned, so their pairs can go too. */
export function removeNodes(l: Level, ids: string[]): { level: Level; crossMap: LevelEdge[] } {
  const gone = new Set(ids);
  const out = copy(l);
  const crossMap = out.edges.filter(e => gone.has(e.from) && isCrossMap(e));
  out.nodes = out.nodes.filter(n => !gone.has(n.id));
  out.edges = out.edges.filter(e => !gone.has(e.from) && !(typeof e.to === 'string' && gone.has(e.to)));
  out.events = (out.events ?? []).filter(ev => !gone.has(ev.node));
  return { level: out, crossMap };
}
export const moveNode = (l: Level, id: string, x: number, y: number) => updateNode(l, id, { x: round4(clamp01(x)), y: round4(clamp01(y)) });

/** "Jack picks" (§2.2): a treasure node gets its chest event; Blank removes every event on the node. */
export const TREASURE_EVENT = (node: string) => ({ id: `${node}.1`, node, on: 'enter', once: true, outcome: 'treasure', do: [{ openChest: 'chest_normal' }] });
export function setKind(l: Level, id: string, kind: string): Level {
  let out = updateNode(l, id, { kind });
  if (kind === 'chest' && !(out.events ?? []).some(ev => ev.node === id)) { out = copy(out); (out.events ??= []).push(TREASURE_EVENT(id)); }
  return out;
}
export function blankNode(l: Level, id: string): Level {
  const out = copy(l); out.events = (out.events ?? []).filter(ev => ev.node !== id); return out;
}
export const nodeEvents = (l: Level, id: string) => (l.events ?? []).filter(ev => ev.node === id);
/** Replaces the node's events, keeping their place in the ordered list (the first eligible event wins, §2.1). */
export function setNodeEvents(l: Level, id: string, events: any[]): Level {
  const out = copy(l); const all = out.events ?? [];
  const first = all.findIndex(ev => ev.node === id);
  const rest = all.filter(ev => ev.node !== id);
  rest.splice(first < 0 ? rest.length : first, 0, ...events.map(ev => ({ ...ev, node: id })));
  out.events = rest; return out;
}

// ---------------- links ----------------
export function addEdge(l: Level, from: string, to: string | NodeRef, kind = 'path'): { level: Level; id: string } {
  const out = copy(l);
  const taken = out.edges.map(e => e.id);
  const base = typeof to === 'string' ? '' : `x_${from}_${to.graph}`;   // Desy's cross-map naming, e.g. x_boss_1_demon_castle_3
  const unique = typeof to === 'string' ? freeId('e', taken) : taken.includes(base) ? freeId(`${base}_`, taken) : base;
  const edge: LevelEdge = typeof to === 'string' ? { id: unique, idx: nextIdx(out.edges), from, to, kind, danger: 1, steps: 1 } : { id: unique, idx: nextIdx(out.edges), from, kind, to };
  out.edges.push(edge);
  return { level: out, id: unique };
}
export function updateEdge(l: Level, id: string, patch: Partial<LevelEdge>): Level {
  const out = copy(l);
  const e = out.edges.find(x => x.id === id); if (!e) return out;
  Object.assign(e, patch);
  for (const [k, v] of Object.entries(patch)) if (v === undefined || v === '') delete (e as any)[k];
  return out;
}
export function removeEdges(l: Level, ids: string[]): { level: Level; crossMap: LevelEdge[] } {
  const gone = new Set(ids);
  const out = copy(l);
  const crossMap = out.edges.filter(e => gone.has(e.id) && isCrossMap(e));
  out.edges = out.edges.filter(e => !gone.has(e.id));
  return { level: out, crossMap };
}
/** §2.3: the other half of a cross-map pair lives on the target map. `addPair` writes it there; `removePair` takes it out. */
export function addPair(target: Level, targetNode: string, back: NodeRef, kind: string): Level {
  if (target.edges.some(e => isCrossMap(e) && e.from === targetNode && e.to.graph === back.graph && e.to.node === back.node)) return target;
  return addEdge(target, targetNode, back, kind).level;
}
export function removePair(target: Level, targetNode: string, back: NodeRef): Level {
  const out = copy(target);
  out.edges = out.edges.filter(e => !(isCrossMap(e) && e.from === targetNode && e.to.graph === back.graph && e.to.node === back.node));
  return out;
}

// ---------------- dialogue (scene/0.2, §2.8) ----------------
export const EXPRESSIONS = ['neutral', 'happy', 'sad', 'angry', 'surprised', 'thinking', 'worried'] as const;
export const SIDES = ['L1', 'L2', 'R1', 'R2'] as const;
export function addScene(l: Level, id: string): Level {
  if (!/^sc_[a-z0-9_]+$/.test(id) || l.scenes?.[id]) return l;
  const out = copy(l);
  (out.scenes ??= {})[id] = { schema: 'scene/0.2', id, trigger: { graph: l.id, on: 'talk' }, slots: { L1: { char: 'hero', expr: 'neutral' } },
    lines: [{ id: 'l1', speaker: 'hero', side: 'L1', expr: 'neutral', en: '' }] } as Scene;
  return out;
}
function withScene(l: Level, id: string, f: (s: Scene) => void): Level {
  const out = copy(l); const s = out.scenes?.[id]; if (s) f(s); return out;
}
export const setSlot = (l: Level, id: string, side: string, char: string, expr?: string) => withScene(l, id, s => {
  s.slots ??= {};
  if (char) s.slots[side] = { char, ...(expr ? { expr } : {}) }; else delete s.slots[side];
});
export const addLine = (l: Level, id: string) => withScene(l, id, s => {
  const last = s.lines[s.lines.length - 1];
  s.lines.push({ id: freeId('l', s.lines.map(x => x.id)), speaker: last?.speaker ?? 'hero', side: last?.side, expr: 'neutral', en: '' });
});
/** Edits a line. Changing the Chinese drops the stored traditional copy, which would be stale (zhTrad is data only). */
export const updateLine = (l: Level, id: string, lineId: string, patch: Partial<SceneLine>) => withScene(l, id, s => {
  const line = s.lines.find(x => x.id === lineId); if (!line) return;
  if ('zh' in patch && patch.zh !== line.zh) delete line.zhTrad;
  Object.assign(line, patch);
  for (const [k, v] of Object.entries(patch)) if (v === undefined || v === '') if (k !== 'en') delete (line as any)[k];
});
export const removeLine = (l: Level, id: string, lineId: string) => withScene(l, id, s => { if (s.lines.length > 1) s.lines = s.lines.filter(x => x.id !== lineId); });
export const moveLine = (l: Level, id: string, lineId: string, by: -1 | 1) => withScene(l, id, s => {
  const i = s.lines.findIndex(x => x.id === lineId), j = i + by;
  if (i < 0 || j < 0 || j >= s.lines.length) return;
  [s.lines[i], s.lines[j]] = [s.lines[j], s.lines[i]];
});

// ---------------- word pool (settings.words, §2.5) ----------------
export function addWord(l: Level, id: string): Level {
  if (l.settings.words.includes(id)) return l;
  const out = copy(l); out.settings.words.push(id); return out;
}
export function removeWord(l: Level, id: string): Level {
  const out = copy(l); out.settings.words = out.settings.words.filter(w => w !== id); return out;
}
export function moveWord(l: Level, id: string, by: -1 | 1): Level {
  const out = copy(l); const w = out.settings.words; const i = w.indexOf(id), j = i + by;
  if (i < 0 || j < 0 || j >= w.length) return out;
  [w[i], w[j]] = [w[j], w[i]]; return out;
}
export function updateSettings(l: Level, patch: Record<string, unknown>): Level {
  const out = copy(l); Object.assign(out.settings, patch);
  for (const [k, v] of Object.entries(patch)) if (v === undefined) delete (out.settings as any)[k];
  return out;
}

function clamp01(v: number) { return Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0)); }
function round4(v: number) { return Math.round(v * 10000) / 10000; }

// ---------------- the node's main scene (Jack 2026-10-18: selecting a node shows its scene) ----------------
/** Event triggers that mean "the hero arrives at / interacts with the node". The game runs a node's arrival events in data order
 *  (engine.pickEvents: on 'enter', plus 'firstEnter' on the first visit). */
const ARRIVE = new Set(['firstEnter', 'enter', 'talk', 'interact']);
const scenesIn = (ev: any): string[] => [...(ev.do ?? []), ...(ev.pick ?? []).flatMap((o: any) => o.do ?? [])].map((a: any) => a?.scene).filter((s: unknown): s is string => typeof s === 'string');
/** The scene the editor shows for a node, by the first rule that finds one that exists on this map:
 *  1. the first arrival / interact event of the node (data order = the order the game runs them) that plays a scene: its first scene
 *     (a direct `do` scene before one inside a weighted `pick` option);
 *  2. any other event of the node that plays a scene (e.g. on `clear`);
 *  3. the node's quest variants: the first `quests[]` entry with a scene, `pre` before `in` before `post`;
 *  4. a scene whose trigger names this node.
 *  null = the node has no scene. */
export function mainScene(l: Level, node: string): { id: string; rule: 1 | 2 | 3 | 4 } | null {
  const has = (id: string | undefined): id is string => !!id && !!l.scenes?.[id];
  const evs = nodeEvents(l, node);
  for (const ev of evs) if (ARRIVE.has(ev.on)) { const s = scenesIn(ev).find(has); if (s) return { id: s, rule: 1 }; }
  for (const ev of evs) if (!ARRIVE.has(ev.on)) { const s = scenesIn(ev).find(has); if (s) return { id: s, rule: 2 }; }
  const n = l.nodes.find(x => x.id === node) as any;
  for (const q of n?.quests ?? []) for (const k of ['pre', 'in', 'post']) if (has(q?.[k]?.scene)) return { id: q[k].scene, rule: 3 };
  const t = Object.keys(l.scenes ?? {}).sort().find(id => l.scenes![id].trigger?.node === node);
  return t ? { id: t, rule: 4 } : null;
}
