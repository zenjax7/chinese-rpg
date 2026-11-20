/** Ending C (Desy, Jack's choice 2026-11-20): build_world.py turns the node-triggered R9 scenes into story events, so the engine plays
 *  sc_r9_chain on entering demon_castle_2/boss_1 (before the fight), sc_r9_mom_freed on clearing it, and sc_r9_ending on clearing
 *  demon_castle_5/boss_9. sc_r9_mom_freed sets xiaolong_form_grown, which draws grown 小龙 (hatchling art until Arty delivers). */
import { describe, it, expect } from 'vitest';
import { xiaolongArt, xiaolongForm } from '../../src/world/xiaolong-form';
import DC2 from '../../public/world/graphs/demon_castle_2.json';
import DC5 from '../../public/world/graphs/demon_castle_5.json';
import MOM from '../../src/data/world/scenes/sc_r9_mom_freed.json';
import ENDING from '../../src/data/world/scenes/sc_r9_ending.json';

type Ev = { id: string; node: string; on: string; once?: boolean; cond?: any; do: { scene?: string }[] };
const scenesAt = (g: { events: Ev[] }, node: string, on: string) => g.events.filter(e => e.node === node && e.on === on).flatMap(e => (e.do || []).map(a => a.scene).filter(Boolean));

describe('Ending C scenes', () => {
  it('play at the right boss nodes: chain on entering boss_1, mom freed on clearing it, the ending on clearing boss_9', () => {
    expect(scenesAt(DC2 as any, 'boss_1', 'enter')).toContain('sc_r9_chain');
    expect(scenesAt(DC2 as any, 'boss_1', 'clear')).toEqual(['sc_r9_mom_freed']);
    expect(scenesAt(DC5 as any, 'boss_9', 'clear')).toEqual(['sc_r9_ending']);
    const end = (DC5 as any).events.find((e: Ev) => (e.do || []).some(a => a.scene === 'sc_r9_ending'));
    expect(end).toMatchObject({ once: true, cond: { bossDefeated: 'throne_hall' } });
  });
  it('mom freed sets the grown form; grown art when delivered, else the current hatchling art', () => {
    const flags = ['xiaolong_form_hatch', 'xiaolong_form_fledgling', ...MOM.onEnd.map((a: any) => a.setFlag)];
    expect(flags).toContain('mom_freed');
    expect(xiaolongForm(flags).form).toBe('grown');
    expect(xiaolongArt(flags, k => k === 'xiaolong_grown')).toBe('xiaolong_grown');
    expect(xiaolongArt(flags, () => false)).toBe('xiaolong');
  });
  it('the ending keeps the xiaolong slot (the engine swaps the art from the flag)', () => {
    expect(Object.values(ENDING.slots as Record<string, { char: string }>).map(s => s.char)).toContain('xiaolong');
  });
});
