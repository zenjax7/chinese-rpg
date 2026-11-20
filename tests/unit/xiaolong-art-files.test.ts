/** Arty's final 小龙 sets (2026-11-20, docs/art/arty/xiaolong_forms.md): every form resolves to real files on all three surfaces, so the
 *  flag lookup picks the form's own art with no fallback. */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { XIAOLONG_FORMS, xiaolongArt } from '../../src/world/xiaolong-form';

const pub = (f: string) => `public/${f}`;
const json = (f: string) => JSON.parse(readFileSync(pub(f), 'utf-8'));
const PORTRAITS = new Set<string>(json('portraits/portraits_index.json').characters.map((c: { id: string }) => c.id));
const COMP = json('companions/manifest.json'); const MAP = json('map_sprites/manifest.json');
const EXPR = ['neutral', 'happy', 'sad', 'surprised', 'angry', 'worried', 'thinking', 'hungry', 'brave'];

describe.each(XIAOLONG_FORMS.map(f => [f.form, f] as const))('小龙 %s art', (_name, f) => {
  it('has a portrait set (index entry, portrait.json, nine webp expressions)', () => {
    expect(PORTRAITS.has(f.key)).toBe(true);
    const pj = json(`portraits/${f.key}.portrait.json`);
    for (const e of EXPR) { expect(pj.expressions).toContain(e); expect(existsSync(pub(`portraits/${f.key}_${e}.webp`))).toBe(true); }
  });
  it('has battle strips (idle, cheer, attack hitting on frame 2, hurt)', () => {
    const c = COMP[f.key]; expect(c).toBeTruthy(); expect([c.frameWidth, c.frameHeight]).toEqual([256, 256]);
    for (const st of ['idle', 'cheer', 'attack', 'hurt']) expect(existsSync(pub(`companions/${c.states[st].file}`))).toBe(true);
    expect(c.states.attack.hitFrame).toBe(2);
  });
  it('has a map fly strip', () => {
    const m = MAP[`${f.key}_map_fly`]; expect(m?.frameCount).toBe(4);
    expect(existsSync(pub(`map_sprites/${f.key}_map_fly.png`))).toBe(true);
  });
  it('is picked by its flag with no fallback', () => {
    const has = (k: string) => PORTRAITS.has(k) && !!COMP[k] && !!MAP[`${k}_map_fly`];
    expect(xiaolongArt([f.flag], has)).toBe(f.key);
  });
});
