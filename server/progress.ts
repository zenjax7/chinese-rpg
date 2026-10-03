/** Snapshot rules shared by the DAL: ajv validation of the graph-mode progress against Desy's progress.schema.json, the §9.4
 *  progress key, position columns, and §9.6 plausibility flags. Pure functions, no SQL. */
import { Ajv2020 } from 'ajv/dist/2020.js';
import progressSchema from '../docs/data/world/schemas/progress.schema.json' with { type: 'json' };
import commonSchema from '../docs/data/world/schemas/common.schema.json' with { type: 'json' };
import worldIndex from '../src/data/world/index.json' with { type: 'json' };
import balance from '../src/data/balance.json' with { type: 'json' };

const ajv = new Ajv2020({ allErrors: true, strict: false });
ajv.addSchema(commonSchema as object);
const validateFn = ajv.compile(progressSchema as object);

/** [] when valid, else readable errors ("/pos/node must match pattern ..."). */
export function validateWorld(world: unknown): string[] {
  if (validateFn(world)) return [];
  return (validateFn.errors ?? []).slice(0, 20).map(e => `${e.instancePath || '(root)'} ${e.message ?? 'invalid'}`);
}

type Snap = Record<string, any>;
const b64bytes = (s: string) => Buffer.from(s || '', 'base64');
export const popcount = (b: Uint8Array) => { let n = 0; for (const x of b) { let v = x; while (v) { n += v & 1; v >>= 1; } } return n; };

/** §9.4: [bosses defeated, quests claimed, level, exp, nodes cleared, battles], compared in that order. */
export function progressKey(s: Snap): number[] {
  const w = s.world ?? {};
  const bosses = new Set<string>([...(w.zonesDefeated ?? []), ...Object.entries<any>(s.locs ?? {}).filter(([, l]) => l?.bossDefeated).map(([k]) => `loc:${k}`)]).size;
  const quests = Object.values<any>(s.quests ?? {}).filter(q => q?.s === 'claimed').length
    + Object.values<any>(s.storyQuests ?? {}).filter(q => q?.s === 'completed').length;
  const nodes = Object.values<any>(w.graphs ?? {}).reduce((a, g) => a + popcount(b64bytes(g?.visited)), 0);
  return [bosses, quests, s.level | 0, s.exp | 0, nodes, (s.stats?.battles | 0)];
}
export function compareKeys(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) { const d = (a[i] ?? 0) - (b[i] ?? 0); if (d) return Math.sign(d); }
  return 0;
}

const graphs = new Map<string, { realm: number; dungeon?: string; level?: number; nodes: number }>(
  (worldIndex as any).graphs.map((g: any) => [g.id, { realm: g.realm, dungeon: g.dungeon, level: g.level, nodes: g.nodes }]));
export const contentVersion = (worldIndex as any).contentVersion as string;
export const startNode = (worldIndex as any).start as { graph: string; node: string };

/** The indexed position columns on `saves` (§6.4), copied out of the snapshot. Realm, dungeon and level come from the build's index. */
export function positionColumns(s: Snap) {
  const w = s.world ?? {}; const g = graphs.get(w.pos?.graph);
  return {
    pos_realm: g?.realm ?? null, pos_graph: w.pos?.graph ?? null, pos_node: w.pos?.node ?? null,
    pos_dungeon: g?.dungeon ?? null, pos_level: g?.level ?? null,
    last_inn_graph: w.lastInn?.graph ?? null, last_inn_node: w.lastInn?.node ?? null,
    bosses: [...new Set<string>(w.zonesDefeated ?? [])],
  };
}

/** §9.6: plausibility FLAGS, never rejections, so a save from a newer build is never lost. */
export function plausibilityFlags(s: Snap): string[] {
  const f: string[] = [];
  const per = (balance as any).hero?.expToNextPerLevel ?? 100;
  if (s.exp >= per * s.level) f.push('exp_over_curve');
  if (s.debug === true) f.push('debug');
  const w = s.world ?? {};
  if (w.pos?.graph && !graphs.has(w.pos.graph)) f.push('unknown_graph');
  for (const gid of Object.keys(w.graphs ?? {})) if (!graphs.has(gid)) { f.push('unknown_graph_progress'); break; }
  const owned = new Set<string>(s.gear ?? []);
  for (const g of Object.values<any>(s.equip ?? {})) if (g && !owned.has(g)) { f.push('equipped_not_owned'); break; }
  return f;
}
export function graphNodeCount(id: string): number | null { return graphs.get(id)?.nodes ?? null; }
