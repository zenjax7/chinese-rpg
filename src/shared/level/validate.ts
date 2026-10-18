/** Map validator shared by the editor (browser) and the editor API (level-editor.md §6.1). This is the minimal first port: the
 *  level/0.2 schema (Desy's level.schema.json, ajv) plus the graph and word-pool checks the editor needs to save and publish.
 *  Errors block a publish, never a save (§6.2). Desy's validate_levels.py stays the reference. */
import schemaCheck from './schema-check.js';   // precompiled from level.schema.json: the CSP has no 'unsafe-eval' (tools/editor/build_schema_check.mjs)
import type { Level, Problem } from './types.js';


export interface ValidateCtx {
  /** The global word bank ids (§2.5.1). */
  words: Set<string>;
  /** Node ids of every other map, for cross-map links (§2.3). A map missing here is reported. */
  maps?: Record<string, Set<string>>;
}

const err = (code: string, msg: string, at?: string): Problem => ({ level: 'error', code, msg, at });
const warn = (code: string, msg: string, at?: string): Problem => ({ level: 'warning', code, msg, at });

function schemaProblems(level: unknown): Problem[] {
  if (schemaCheck(level)) return [];
  return (schemaCheck.errors ?? []).slice(0, 30).map(e => err('schema', `${e.instancePath || '(map)'} ${e.message ?? 'is invalid'}`, e.instancePath));
}

function duplicates(ids: string[]): string[] {
  const seen = new Set<string>(), dup = new Set<string>();
  for (const id of ids) (seen.has(id) ? dup : seen).add(id);
  return [...dup];
}

function graphProblems(l: Level, ctx: ValidateCtx): Problem[] {
  const out: Problem[] = [];
  const nodes = new Set(l.nodes.map(n => n.id));
  for (const id of duplicates(l.nodes.map(n => n.id))) out.push(err('node_dup', `Two nodes have the id ${id}.`, `node:${id}`));
  for (const id of duplicates(l.edges.map(e => e.id))) out.push(err('edge_dup', `Two links have the id ${id}.`, `edge:${id}`));
  if (!nodes.has(l.entry)) out.push(err('entry', `The entry node ${l.entry} does not exist.`));
  for (const e of l.edges) {
    if (!nodes.has(e.from)) out.push(err('edge_from', `Link ${e.id} starts at a missing node ${e.from}.`, `edge:${e.id}`));
    if (typeof e.to === 'string') { if (!nodes.has(e.to)) out.push(err('edge_to', `Link ${e.id} ends at a missing node ${e.to}.`, `edge:${e.id}`)); }
    else if (ctx.maps && e.to.graph !== l.id) {
      const target = ctx.maps[e.to.graph];
      if (!target) out.push(err('link_map', `Link ${e.id} goes to a missing map ${e.to.graph}.`, `edge:${e.id}`));
      else if (!target.has(e.to.node)) out.push(err('link_node', `Link ${e.id} goes to a missing node ${e.to.graph}/${e.to.node}.`, `edge:${e.id}`));
    }
    if (JSON.stringify(e.cond ?? null).includes('bossDefeated')) out.push(warn('edge_boss_cond', `Link ${e.id} is gated on a boss (links are the only progression, §2.3).`, `edge:${e.id}`));
  }
  const boss = l.settings?.boss?.node;
  if (boss && !nodes.has(boss)) out.push(err('boss_node', `The boss node ${boss} does not exist.`));
  return out;
}

function eventProblems(l: Level): Problem[] {
  const nodes = new Set(l.nodes.map(n => n.id));
  return (l.events ?? []).filter(ev => ev?.node && !nodes.has(ev.node)).map(ev => err('event_node', `Event ${ev.id} is on a missing node ${ev.node}.`, `event:${ev.id}`));
}

function wordProblems(l: Level, ctx: ValidateCtx): Problem[] {
  const words = l.settings?.words ?? [];
  const out = words.filter(w => !ctx.words.has(w)).map(w => err('word_unknown', `Word ${w} is not in the word bank.`, `word:${w}`));
  for (const w of duplicates(words)) out.push(err('word_dup', `Word ${w} is in the pool twice.`, `word:${w}`));
  return out;
}

function sceneProblems(l: Level): Problem[] {
  const out: Problem[] = [];
  for (const [key, s] of Object.entries(l.scenes ?? {})) {
    if (s.id !== key) out.push(err('scene_id', `Scene ${key} has the id ${s.id}.`, `scene:${key}`));
    for (const id of duplicates((s.lines ?? []).map(x => x.id))) out.push(err('line_dup', `Scene ${key} has two lines with the id ${id}.`, `scene:${key}`));
    for (const line of s.lines ?? []) if ('pinyin' in line) out.push(err('line_pinyin', `Scene ${key} line ${line.id} has a pinyin field (no pinyin in scenes).`, `scene:${key}`));
  }
  return out;
}

/** Leveling v2 (Jack 2026-10-17; mirrors validate_levels.py 2b): a map with a roster says its enemy levels (enemyLevel [lo, hi]),
 *  1 <= lo <= hi (roster[].level too), and a boss has a level. */
function levelProblems(l: Level): Problem[] {
  const out: Problem[] = []; const s: any = l.settings;
  const ok = (r: unknown) => { const a = typeof r === 'number' ? [r, r] : r; return Array.isArray(a) && Number.isInteger(a[0]) && Number.isInteger(a[1]) && 1 <= a[0] && a[0] <= a[1]; };
  if (s.roster?.length && !s.enemyLevel) out.push(err('enemy_level', 'A map with a roster needs enemy levels (settings.enemyLevel [lo, hi]).'));
  if (s.enemyLevel && !ok(s.enemyLevel)) out.push(err('enemy_level_range', `Enemy levels ${JSON.stringify(s.enemyLevel)}: need 1 ≤ lo ≤ hi.`));
  for (const r of s.roster ?? []) if (r?.level != null && !ok(r.level)) out.push(err('roster_level', `Roster ${r.enemy} level ${JSON.stringify(r.level)}: need 1 ≤ lo ≤ hi.`));
  if (s.boss && s.boss.level == null) out.push(err('boss_level', 'The boss needs a level (settings.boss.level).'));
  return out;
}

const hasShape = (l: any): l is Level => !!l && Array.isArray(l.nodes) && Array.isArray(l.edges) && typeof l.settings === 'object'
  && l.nodes.every((n: any) => n && typeof n.id === 'string') && l.edges.every((e: any) => e && typeof e.id === 'string');

/** All problems for one map: the schema, then the deeper checks whenever the basic shape (nodes, edges, settings) is there. */
export function validateLevel(level: unknown, ctx: ValidateCtx): Problem[] {
  const schema = schemaProblems(level);
  if (!hasShape(level)) return schema;
  return [...schema, ...graphProblems(level, ctx), ...eventProblems(level), ...wordProblems(level, ctx), ...sceneProblems(level), ...levelProblems(level)];
}

export const hasErrors = (ps: Problem[]) => ps.some(p => p.level === 'error');
