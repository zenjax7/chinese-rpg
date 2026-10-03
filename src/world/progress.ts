/** Save validation + migration for graph-mode progress (progress/0.3, docs/data/world/schemas/progress.schema.json).
 *  A tiny JSON Schema subset (type, const, pattern, required, properties, additionalProperties, items, minimum, maximum, local and
 *  common.schema.json $refs): exactly what progress.schema.json uses. No imports, so the node tests load this file directly. */
type Sch = Record<string, any>;
export function validate(v: unknown, s: Sch, defs: { common: Sch; self: Sch }, at = ''): string[] {
  if (s.$ref) {
    const [file, frag] = String(s.$ref).split('#'); const base = file ? (file.includes('common') ? defs.common : defs.self) : defs.self;
    const t = (frag || '').split('/').filter(Boolean).reduce((o: any, k) => o?.[k], base); return t ? validate(v, t, defs, at) : [`${at || '(root)'}: bad $ref ${s.$ref}`];
  }
  const e: string[] = []; const where = at || '(root)';
  const ty = (x: unknown) => x === null ? 'null' : Array.isArray(x) ? 'array' : Number.isInteger(x) ? 'integer' : typeof x;
  if ('const' in s && v !== s.const) return [`${where}: must be ${JSON.stringify(s.const)}`];
  if (s.type) { const ts: string[] = [].concat(s.type); const t = ty(v); if (!ts.some(x => x === t || (x === 'number' && t === 'integer'))) return [`${where}: must be ${ts.join('|')}, got ${t}`]; }
  if (typeof v === 'string' && s.pattern && !new RegExp(s.pattern).test(v)) e.push(`${where}: does not match ${s.pattern}`);
  if (typeof v === 'number') { if (s.minimum !== undefined && v < s.minimum) e.push(`${where}: < ${s.minimum}`); if (s.maximum !== undefined && v > s.maximum) e.push(`${where}: > ${s.maximum}`); }
  if (Array.isArray(v) && s.items) v.forEach((x, i) => e.push(...validate(x, s.items, defs, `${at}/${i}`)));
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const o = v as Record<string, unknown>;
    for (const r of s.required || []) if (!(r in o)) e.push(`${where}: missing ${r}`);
    for (const [k, x] of Object.entries(o)) {
      if (s.properties?.[k]) e.push(...validate(x, s.properties[k], defs, `${at}/${k}`));
      else if (s.additionalProperties === false) e.push(`${where}: unknown key ${k}`);
      else if (s.additionalProperties && typeof s.additionalProperties === 'object') e.push(...validate(x, s.additionalProperties, defs, `${at}/${k}`));
    }
  }
  return e;
}
export function validateProgress(p: unknown, schema: Sch, common: Sch): string[] { return validate(p, schema, { common, self: schema }); }

const B64 = /^[A-Za-z0-9+/]*={0,2}$/, ID = /^[a-z0-9_]+$/;
const ref = (r: any, fb: { graph: string; node: string }) => r && ID.test(r.graph) && ID.test(r.node) ? { graph: r.graph, node: r.node } : { ...fb };
const ints = (o: any) => Object.fromEntries(Object.entries(o && typeof o === 'object' ? o : {}).filter(([, n]) => Number.isInteger(n) && (n as number) >= 0)) as Record<string, number>;
const strs = (a: any) => Array.isArray(a) ? [...new Set(a.filter((x: unknown) => typeof x === 'string'))] as string[] : [];
/** Bring any older / damaged progress object to progress/0.3: progress/0.1-0.2 field names, missing fields, bad bitsets, unknown keys,
 *  feathers over the carry cap. Grow-only facts (visited bitsets, flags, events, bosses) are kept. Returns a new object. */
export function migrateProgress(old: any, start: { graph: string; node: string }, carry = 3): any {
  const o = old && typeof old === 'object' ? old : {};
  const graphs: Record<string, any> = {};
  for (const [gid, g0] of Object.entries<any>(o.graphs && typeof o.graphs === 'object' ? o.graphs : {})) {
    if (!ID.test(gid) || !g0 || typeof g0 !== 'object') continue;
    const bs = (x: any) => typeof x === 'string' && B64.test(x) ? x : '';
    graphs[gid] = { visited: bs(g0.visited), walked: bs(g0.walked ?? g0.cleared), revealed: bs(g0.revealed), crossings: ints(g0.crossings), edgeProgress: ints(g0.edgeProgress), visits: ints(g0.visits) };
  }
  const pos0 = o.pos || {};
  const pos = { ...ref(pos0, start), edge: null as string | null, step: 0 };   // a half-walked edge restarts at its start node
  const z = o.zone && typeof o.zone === 'object' ? o.zone : {};
  return {
    schema: 'progress/0.3', ...(typeof o.dataVersion === 'string' ? { dataVersion: o.dataVersion } : {}),
    seed: Number.isInteger(o.seed) ? o.seed >>> 0 : (Math.random() * 2 ** 32) >>> 0,
    pos, lastInn: ref(o.lastInn, start), visitedTowns: (Array.isArray(o.visitedTowns) ? o.visitedTowns : []).filter((r: any) => r && ID.test(r.graph) && ID.test(r.node)).map((r: any) => ({ graph: r.graph, node: r.node })),
    graphs, eventsDone: strs(o.eventsDone), eventLastFired: Object.fromEntries(Object.entries(o.eventLastFired || {}).filter(([, n]) => Number.isInteger(n))),
    shortcuts: strs(o.shortcuts), zonesDefeated: strs(o.zonesDefeated ?? o.bosses).filter(x => ID.test(x)), flags: strs(o.flags),
    zone: { id: typeof z.id === 'string' && ID.test(z.id) ? z.id : 'none', freshBattles: Number.isInteger(z.freshBattles) ? z.freshBattles : 0, pity: Number.isInteger(z.pity) ? z.pity : 0,
      approachArmed: typeof z.approachArmed === 'boolean' ? z.approachArmed : true, patrolsLeft: Number.isInteger(z.patrolsLeft) ? z.patrolsLeft : 0,
      bossCheckpoint: z.bossCheckpoint && typeof z.bossCheckpoint === 'object' ? z.bossCheckpoint : null },
    safeUntil: Object.fromEntries(Object.entries(o.safeUntil || {}).filter(([, n]) => Number.isInteger(n))), hops: Number.isInteger(o.hops) && o.hops >= 0 ? o.hops : 0,
    feathers: Math.max(0, Math.min(carry, Number.isInteger(o.feathers) ? o.feathers : 0)),
  };
}
