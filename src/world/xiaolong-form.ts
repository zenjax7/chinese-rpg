/** 小龙's three story forms (story rework 2026-11-20, Jack's option A; docs/art/arty brief ARTY_XIAOLONG_FORMS.md). Art is story-only:
 *  the Friendship team attack does not change. A form is chosen by story flag, the latest form first; its art key prefixes every file
 *  (portraits/<key>.portrait.json, companions manifest id <key>, map_sprites/<key>_map_fly.png). Until Arty delivers a form's files the
 *  game keeps the hatchling art (key 'xiaolong'), so nothing breaks while the new sets are being painted. */
export const XIAOLONG = 'xiaolong';
export interface XiaolongForm { form: 'hatch' | 'fledgling' | 'grown'; flag: string; key: string; fromRealm?: number }
export const XIAOLONG_FORMS: XiaolongForm[] = [
  { form: 'grown', flag: 'xiaolong_form_grown', key: 'xiaolong_grown' },                         // R9, once his mother is freed (set by that scene)
  { form: 'fledgling', flag: 'xiaolong_form_fledgling', key: 'xiaolong_fledgling', fromRealm: 4 },  // set on entering realm 4 (Goblin Caves)
  { form: 'hatch', flag: 'xiaolong_form_hatch', key: XIAOLONG },                                  // set at sc_r1_hatch (R1–R3)
];
const HATCH = XIAOLONG_FORMS[XIAOLONG_FORMS.length - 1];

/** The current form: the first (latest) form whose flag is set, else the hatchling. */
export function xiaolongForm(flags: readonly string[]): XiaolongForm {
  return XIAOLONG_FORMS.find(f => flags.includes(f.flag)) || HATCH;
}
/** The art key to draw: the current form's key when `has(key)` says its files exist, else the next older form's, down to the hatchling. */
export function xiaolongArt(flags: readonly string[], has: (key: string) => boolean): string {
  const i = XIAOLONG_FORMS.indexOf(xiaolongForm(flags));
  return XIAOLONG_FORMS.slice(i).find(f => f.key === XIAOLONG || has(f.key))?.key ?? XIAOLONG;
}
/** Form flags earned by entering a map of `realm` with 小龙 in the party (fledgling from realm 4); [] when nothing new. */
export function formFlagsOnEnter(realm: number | undefined, flags: readonly string[], party: readonly string[] = []): string[] {
  if (!party.includes(XIAOLONG) || realm == null) return [];
  return XIAOLONG_FORMS.filter(f => f.fromRealm != null && realm >= f.fromRealm && !flags.includes(f.flag)).map(f => f.flag);
}
interface SceneLike { slots?: Record<string, { char: string; expr?: string }>; lines: { speaker: string; portrait?: string }[] }
/** A scene with 小龙's portrait drawn from `key` (slots and his own lines; his nameplate stays 小龙). Same object when key is the hatchling. */
export function withXiaolongArt<T extends SceneLike>(sc: T, key: string): T {
  if (key === XIAOLONG) return sc;
  const slots = sc.slots && Object.fromEntries(Object.entries(sc.slots).map(([k, v]) => [k, v.char === XIAOLONG ? { ...v, char: key } : v]));
  const lines = sc.lines.map(l => (l.speaker === XIAOLONG && (!l.portrait || l.portrait === XIAOLONG)) ? { ...l, portrait: key } : l);
  return { ...sc, ...(slots ? { slots } : {}), lines };
}
