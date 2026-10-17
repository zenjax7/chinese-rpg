import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { validateLevel, hasErrors } from '../../src/shared/level/validate.js';
import { levelHash, canonical } from '../../src/shared/level/hash.js';
import { WORD_IDS } from '../../src/shared/level/wordbank.js';
// @ts-ignore plain JS
import { schemaCheckSource } from '../../tools/editor/build_schema_check.mjs';

const DIR = 'docs/data/levels';
const files = readdirSync(DIR).filter(f => f.endsWith('.json') && f !== 'index.json' && f !== 'world_rules.json');
const maps = files.map(f => JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8')));
const nodeIds = Object.fromEntries(maps.map(m => [m.id, new Set<string>(m.nodes.map((n: any) => n.id))]));
const ctx = { words: WORD_IDS, maps: nodeIds };
const clone = (o: any) => JSON.parse(JSON.stringify(o));

describe('level validator (§6.1)', () => {
  it('passes every converted map in docs/data/levels with 0 errors', () => {
    expect(maps.length).toBe(38);
    for (const m of maps) expect(validateLevel(m, ctx).filter(p => p.level === 'error'), m.id).toEqual([]);
  });
  it('reports schema errors', () => {
    const m = clone(maps[0]); delete m.entry;
    expect(validateLevel(m, ctx).map(p => p.code)).toContain('schema');
  });
  it('reports missing nodes, duplicate ids, unknown and duplicate words, missing link targets', () => {
    const m = clone(maps.find(x => x.id === 'old_mine_1'));
    m.nodes.push({ ...m.nodes[0] });
    m.edges.push({ id: 'e_bad', from: 'nowhere', to: 'stairs_1', kind: 'path' });
    m.edges.push({ id: 'x_bad', from: 'stairs_1', to: { graph: 'no_such_map', node: 'a' }, kind: 'portal' });
    m.settings.words = ['C001', 'C001', 'C9999'];
    const codes = validateLevel(m, ctx).map(p => p.code);
    for (const c of ['node_dup', 'edge_from', 'link_map', 'word_dup', 'word_unknown']) expect(codes).toContain(c);
    expect(hasErrors(validateLevel(m, ctx))).toBe(true);
  });
  it('allows blank nodes (no event required, R8)', () => {
    const m = clone(maps.find(x => x.id === 'old_mine_1'));
    m.nodes.push({ id: 'blank_1', idx: 99, kind: 'waypoint', x: 0.5, y: 0.5 });
    expect(hasErrors(validateLevel(m, ctx))).toBe(false);
  });
});

describe('version hash (§2.9)', () => {
  it('is canonical: key order and the server-set version do not change it', async () => {
    const m = maps[0];
    const reordered = Object.fromEntries(Object.entries(m).reverse());
    expect(await levelHash(reordered)).toBe(await levelHash(m));
    expect(await levelHash({ ...m, version: 7 })).toBe(await levelHash(m));
    expect(await levelHash({ ...m, state: 'golden' })).not.toBe(await levelHash(m));
    expect(canonical({ b: 1, a: [1, 'x'] })).toBe('{"a":[1,"x"],"b":1}');
  });
});

describe('word bank', () => {
  it('is in sync with curriculum.csv', () => {
    const before = readFileSync('src/shared/level/wordbank.json', 'utf8');
    execFileSync('python3', ['tools/editor/build_wordbank.py']);
    expect(readFileSync('src/shared/level/wordbank.json', 'utf8')).toBe(before);
    expect(WORD_IDS.size).toBeGreaterThan(1000);
  });
});

describe('bundled level hashes (src/data/world/level-hashes.json)', () => {
  it('match src/shared/level/hash.ts on every map (Python and TypeScript canonical JSON agree)', async () => {
    execFileSync('python3', ['tools/editor/level_hashes.py']);
    const { hashes } = JSON.parse(readFileSync('src/data/world/level-hashes.json', 'utf8'));
    expect(Object.keys(hashes)).toHaveLength(38);
    for (const m of maps) expect(hashes[m.id], m.id).toBe(await levelHash(m));
  });
  it('the precompiled schema check is up to date and has no eval (the CSP has no unsafe-eval)', () => {
    const src = readFileSync('src/shared/level/schema-check.js', 'utf8');
    expect(src).toBe(schemaCheckSource());
    expect(src).not.toMatch(/new Function|\beval\(|require\(/);
  });
});
