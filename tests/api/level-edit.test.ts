import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as X from '../../src/editor/level-edit.js';
import { validateLevel } from '../../src/shared/level/validate.js';
import { WORD_IDS } from '../../src/shared/level/wordbank.js';
import type { Level } from '../../src/shared/level/types.js';

const load = (id: string): Level => JSON.parse(readFileSync(`docs/data/levels/${id}.json`, 'utf8'));
const errors = (l: Level) => validateLevel(l, { words: WORD_IDS }).filter(p => p.level === 'error' && !['link_map', 'link_node'].includes(p.code));

describe('editor map edits (level-edit.ts, §5.3)', () => {
  it('never mutates its input', () => {
    const m = load('old_mine_1'); const before = JSON.stringify(m);
    X.addNode(m, { x: 0.2, y: 0.3 }); X.moveNode(m, m.nodes[0].id, 2, -1); X.removeNodes(m, [m.nodes[1].id]); X.addWord(m, 'C001');
    expect(JSON.stringify(m)).toBe(before);
  });
  it('adds a node, links it, and the map stays valid', () => {
    const m = load('old_mine_1');
    const a = X.addNode(m, { x: 0.5, y: 0.5 });
    const b = X.addEdge(a.level, m.entry, a.id);
    expect(b.level.nodes.at(-1)).toMatchObject({ id: 'node_1', kind: 'waypoint' });
    expect(b.level.edges.at(-1)).toMatchObject({ from: m.entry, to: 'node_1', kind: 'path' });
    expect(errors(b.level)).toEqual([]);
  });
  it('clamps and rounds moves to the 0..1 square', () => {
    const m = load('old_mine_1'); const id = m.nodes[0].id;
    expect(X.moveNode(m, id, 1.7, 0.123456).nodes[0]).toMatchObject({ x: 1, y: 0.1235 });
  });
  it('renames a node with every reference; refuses a taken or bad id', () => {
    const m = load('old_mine_1'); const e = m.entry;
    const r = X.renameNode(m, e, 'front_door');
    expect(r.entry).toBe('front_door');
    expect(r.edges.some(x => x.from === e || x.to === e)).toBe(false);
    expect(errors(r)).toEqual([]);
    expect(X.renameNode(m, e, m.nodes[1].id)).toBe(m);
    expect(X.renameNode(m, e, 'Bad Id')).toBe(m);
  });
  it('deletes nodes with their links and events and returns cross-map links for their pairs', () => {
    const m = load('old_mine_1');
    const cross = m.edges.find(X.isCrossMap)!;
    const r = X.removeNodes(m, [cross.from]);
    expect(r.level.nodes.some(n => n.id === cross.from)).toBe(false);
    expect(r.level.edges.some(e => e.from === cross.from || e.to === cross.from)).toBe(false);
    expect(r.crossMap.map(e => e.id)).toContain(cross.id);
  });
  it('a chest gets its treasure event; Blank clears the node’s events', () => {
    const m = load('old_mine_1'); const a = X.addNode(m, { x: 0, y: 0 });
    const c = X.setKind(a.level, a.id, 'chest');
    expect(X.nodeEvents(c, a.id)).toEqual([X.TREASURE_EVENT(a.id)]);
    expect(X.nodeEvents(X.blankNode(c, a.id), a.id)).toEqual([]);
  });
  it('cross-map pairs: addPair writes the return half once, removePair takes it out', () => {
    const t = load('realm_1'); const back = { graph: 'old_mine_1', node: 'zz_new' };
    const once = X.addPair(t, t.entry, back, 'portal');
    expect(X.addPair(once, t.entry, back, 'portal')).toBe(once);
    const e = once.edges.at(-1)!;
    expect(e).toMatchObject({ from: t.entry, to: back, kind: 'portal' });
    expect(e.id.startsWith(`x_${t.entry}_old_mine_1`)).toBe(true);
    expect(X.removePair(once, t.entry, back).edges.length).toBe(t.edges.length);
  });
  it('dialogue: add scene and lines, edit, reorder; editing zh drops stale zhTrad', () => {
    let m = load('old_mine_1');
    m = X.addScene(m, 'sc_test_talk');
    m = X.addLine(m, 'sc_test_talk');
    const s = m.scenes!.sc_test_talk;
    expect(s.lines.map(l => l.id)).toEqual(['l1', 'l2']);
    m = X.updateLine(m, 'sc_test_talk', 'l1', { zh: '你好', zhTrad: '你好', pinyin: 'nǐ hǎo', en: 'Hello' });
    m = X.updateLine(m, 'sc_test_talk', 'l1', { zh: '您好' });
    expect(m.scenes!.sc_test_talk.lines[0]).toMatchObject({ zh: '您好', en: 'Hello' });
    expect(m.scenes!.sc_test_talk.lines[0].zhTrad).toBeUndefined();
    m = X.moveLine(m, 'sc_test_talk', 'l1', 1);
    expect(m.scenes!.sc_test_talk.lines.map(l => l.id)).toEqual(['l2', 'l1']);
    expect(X.removeLine(X.removeLine(m, 'sc_test_talk', 'l1'), 'sc_test_talk', 'l2').scenes!.sc_test_talk.lines.length).toBe(1);
    expect(X.addScene(m, 'bad id')).toBe(m);
  });
  it('word pool: add once, reorder, remove', () => {
    const m = load('old_mine_1'); const w = m.settings.words;
    const fresh = [...WORD_IDS].find(id => !w.includes(id))!;
    const a = X.addWord(m, fresh);
    expect(a.settings.words.at(-1)).toBe(fresh);
    expect(X.addWord(a, fresh)).toBe(a);
    expect(X.moveWord(a, fresh, -1).settings.words.at(-2)).toBe(fresh);
    expect(X.removeWord(a, fresh).settings.words).toEqual(w);
    expect(errors(a)).toEqual([]);
  });
});
