/** Story rework 2026-11-20: 小龙's sprite and portrait follow his story form (hatch R1–R3, fledgling from R4, grown once his mother is
 *  freed in R9), with the hatchling art as the fallback until Arty's new sets exist. */
import { describe, it, expect } from 'vitest';
import { xiaolongForm, xiaolongArt, formFlagsOnEnter, withXiaolongArt } from '../../src/world/xiaolong-form';

const none = () => false, all = () => true;

describe('小龙 forms', () => {
  it('picks the latest form whose flag is set', () => {
    expect(xiaolongForm([]).form).toBe('hatch');
    expect(xiaolongForm(['xiaolong_form_hatch']).form).toBe('hatch');
    expect(xiaolongForm(['xiaolong_form_hatch', 'xiaolong_form_fledgling']).form).toBe('fledgling');
    expect(xiaolongForm(['xiaolong_form_hatch', 'xiaolong_form_fledgling', 'xiaolong_form_grown']).form).toBe('grown');
  });
  it('draws the form art when it exists, else falls back to an older form, down to the current hatchling art', () => {
    const grown = ['xiaolong_form_hatch', 'xiaolong_form_fledgling', 'xiaolong_form_grown'];
    expect(xiaolongArt(grown, all)).toBe('xiaolong_grown');
    expect(xiaolongArt(grown, k => k === 'xiaolong_fledgling')).toBe('xiaolong_fledgling');
    expect(xiaolongArt(grown, none)).toBe('xiaolong');
    expect(xiaolongArt(['xiaolong_form_fledgling'], none)).toBe('xiaolong');
    expect(xiaolongArt([], all)).toBe('xiaolong');
  });
  it('earns the fledgling flag on entering realm 4+ with 小龙 in the party, once', () => {
    expect(formFlagsOnEnter(3, ['xiaolong_form_hatch'], ['xiaolong'])).toEqual([]);
    expect(formFlagsOnEnter(4, ['xiaolong_form_hatch'], ['xiaolong'])).toEqual(['xiaolong_form_fledgling']);
    expect(formFlagsOnEnter(7, ['xiaolong_form_hatch'], ['xiaolong'])).toEqual(['xiaolong_form_fledgling']);
    expect(formFlagsOnEnter(4, ['xiaolong_form_fledgling'], ['xiaolong'])).toEqual([]);
    expect(formFlagsOnEnter(4, [], [])).toEqual([]);   // not hatched yet
  });
  it('swaps only 小龙’s portrait in a scene', () => {
    const sc = { id: 's', slots: { L1: { char: 'hero' }, R2: { char: 'xiaolong', expr: 'happy' } },
      lines: [{ speaker: 'xiaolong' }, { speaker: 'hero' }, { speaker: 'xiaolong', portrait: 'other' }] };
    expect(withXiaolongArt(sc, 'xiaolong')).toBe(sc);
    const out = withXiaolongArt(sc, 'xiaolong_grown');
    expect(out.slots.R2).toEqual({ char: 'xiaolong_grown', expr: 'happy' });
    expect(out.slots.L1).toEqual({ char: 'hero' });
    expect(out.lines.map(l => l.portrait)).toEqual(['xiaolong_grown', undefined, 'other']);
    expect(out.lines[0].speaker).toBe('xiaolong');
    expect(sc.slots.R2.char).toBe('xiaolong');   // input untouched
  });
});
