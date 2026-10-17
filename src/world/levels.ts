/** Published maps from the API (level-editor.md §7). The game asks GET /api/v1/levels/index (CDN-cached) and loads a map from
 *  GET /api/v1/levels/:id?v=N only when its published hash differs from the copy bundled at build time (docs/data/levels, hashed by
 *  tools/editor/level_hashes.py); otherwise, and whenever the API is unreachable, it keeps the static graph (§7.2 fallback). The Pages
 *  build has no API and never asks (§7.2.3). The engine is still zone-based (§12), so a level/0.2 map is adapted onto the runtime
 *  graph shape here, taking realm and zones from the bundled graph of the same id. */
import type { Graph, GNode, Progress, Quest, Zone } from './engine';
import BUNDLED from '../data/world/level-hashes.json';

export interface LevelIndex { release: number; start: { graph: string; node: string }; maps: Record<string, { v: number; hash: string; state: string }> }
export interface ApiLevel { id: string; version: number; state: string; kind: string; title?: any; entry: string; aspect?: number; dungeon?: string; level?: number;
  settings: { words?: string[]; background?: { map?: string; battle?: string }; boss?: { node?: string } }; nodes: any[]; edges: any[]; events?: any[];
  scenes?: Record<string, any>; npcs?: any }
/** The runtime graph of an API map: the engine Graph plus the map's own word pool (§2.5.1) and scenes (§2.8). */
export type LevelGraph = Graph & { words?: string[]; levelHash?: string; levelState?: string; scenes?: Record<string, any> };

const HASHES = (BUNDLED as { hashes: Record<string, string> }).hashes;
export const bundledHash = (id: string): string | undefined => HASHES[id];
const TIMEOUT_MS = 4000;
let indexP: Promise<LevelIndex | null> | null = null;

const getJson = async (url: string) => {
  const r = await fetch(url, { credentials: 'omit', signal: (AbortSignal as any).timeout?.(TIMEOUT_MS) });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
};

/** The published index once per page load, or null (Pages build, offline, API down). */
export function levelIndex(): Promise<LevelIndex | null> {
  if (!__CLOUD__) return Promise.resolve(null);
  return indexP ??= getJson('/api/v1/levels/index').catch(() => null);
}

/** The published map when it differs from the bundled copy, else null (play the static graph). */
export async function publishedLevel(id: string): Promise<{ level: ApiLevel; hash: string } | null> {
  const m = (await levelIndex())?.maps[id];
  if (!m || m.hash === HASHES[id]) return null;
  try { return { level: await getJson(`/api/v1/levels/${encodeURIComponent(id)}?v=${m.v}`), hash: m.hash }; } catch { return null; }
}

function mostCommonZone(base: Graph | null): string | undefined {
  const n: Record<string, number> = {};
  for (const x of base?.nodes ?? []) if (x.zone) n[x.zone] = (n[x.zone] ?? 0) + 1;
  return Object.entries(n).sort((a, b) => b[1] - a[1])[0]?.[0];
}

/** level/0.2 -> the engine's graph shape. Nodes keep their bundled zone / boss zone; new nodes get the map's zone. */
export function levelToGraph(lv: ApiLevel, base: Graph | null, zones: Record<string, Zone>, hash = ''): LevelGraph {
  const zone = zones[lv.id]?.id ?? mostCommonZone(base);
  const realm = base?.realm ?? zones[zone ?? '']?.realm ?? 1;
  const baseNode = new Map((base?.nodes ?? []).map(n => [n.id, n]));
  const nodes: GNode[] = lv.nodes.map(n => {
    const b = baseNode.get(n.id);
    const z = b?.zone ?? zone;
    const boss = n.kind === 'boss' ? (b?.boss ?? (lv.settings.boss?.node === n.id ? z : undefined)) : undefined;
    return { ...n, zone: z, ...(boss ? { boss } : {}) };
  });
  return { id: lv.id, kind: lv.kind, realm, dungeon: lv.dungeon, level: lv.level, title: lv.title, entry: lv.entry, aspect: lv.aspect,
    nodes, edges: lv.edges.map((e, i) => ({ idx: i, ...e })), events: lv.events ?? [], npcs: lv.npcs, background: lv.settings.background,
    words: lv.settings.words, scenes: lv.scenes ?? {}, levelHash: hash, levelState: lv.state } as LevelGraph;
}

/** §2.9 beta reset of one map: its fog bitsets, events done, visit and crossing counters, shortcuts and edge progress go; a player
 *  standing on it moves to its entry; every quest given on it goes back to not-started. Gold, gear, EXP and other maps stay. */
export function resetMap(P: Progress, storyQuests: Record<string, unknown>, quests: Quest[], g: Graph) {
  delete P.graphs[g.id];
  const mine = (k: string) => k.startsWith(`${g.id}/`);
  P.eventsDone = P.eventsDone.filter(k => !mine(k));
  for (const k of Object.keys(P.eventLastFired)) if (mine(k)) delete P.eventLastFired[k];
  const edgeIds = new Set(g.edges.map(e => e.id));
  P.shortcuts = P.shortcuts.filter(s => !edgeIds.has(s));
  const entry = g.entry ?? g.nodes[0]?.id;
  if (P.pos.graph === g.id && entry) P.pos = { graph: g.id, node: entry, edge: null, step: 0 };
  if (P.lastInn.graph === g.id && entry && !g.nodes.some(n => n.id === P.lastInn.node)) P.lastInn = { graph: g.id, node: entry };
  for (const q of quests) if (q.giverAt?.graph === g.id) delete storyQuests[q.id];
}
