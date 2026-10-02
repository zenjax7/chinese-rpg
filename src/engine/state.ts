import { B, LOCATIONS, LOC, GEAR, GEAR_LIST, SKILLS, CONS } from '../data';
import type { GearDef } from '../data';

export type WayKey = 'rZE' | 'rEZ' | 'sZE' | 'sEZ';
export const ALL_WAYS: WayKey[] = ['rZE', 'rEZ', 'sZE', 'sEZ'];
export const WAY_LABEL: Record<WayKey, string> = { rZE: 'Read ZH→EN', rEZ: 'Read EN→ZH', sZE: 'Say ZH→EN', sEZ: 'Say EN→ZH' };
export interface WayStat { c: number; a: number; box: number; last: number; due: number; wrongRun: number; pc?: number /* practice credit used */; }
export interface ItemProg { seen: boolean; ways: Record<WayKey, WayStat>; recentMiss: number; }
export interface LocState { unlocked: boolean; bossDefeated: boolean; pathCleared: number; previewSeen: boolean;
  patrolsLeft: number; approachArmed: boolean; bossCheckpoint: boolean; patrolsFought: number; }
export interface SaveState {
  version: number;
  consent: { given: boolean; speech: boolean; at: number };
  level: number; exp: number; hp: number; mp: number; gold: number;
  inv: Record<string, number>;
  gear: string[]; equip: { weapon: string | null; armor: string | null; shield: string | null; charm: string | null };
  skills: string[]; skillsEquipped: string[]; slotsSeen?: number;
  courage: number; lastDefeatLoc: string | null;
  where: string;            // 'town' or a location id
  lastInn: { place: string; node: number } | null;   // where the Return Feather / waking after a defeat takes you
  practice: Record<string, { done: string[]; rewarded: boolean; stickers: string[] }>;
  locs: Record<string, LocState>;
  prog: Record<string, ItemProg>;
  stats: { battles: number; wins: number; defeats: number; flees: number; freeInn: number; paidInn: number; questions: number; correct: number; spoken: number; voids: number };
  log: any[];
  // v3.3: bought spells (owned for good) and the town quest boards
  spells: string[];
  quests: Record<string, QuestState>;
}
/** One quest's saved progress. n = kills / drops counted; base = the realm words already Ready when a words quest was accepted. */
export interface QuestState { s: 'active' | 'claimed'; n: number; base?: string[]; at: number; done?: number; }
const KEY = 'chinese-rpg-proto-v3';

export function newState(): SaveState {
  const s: SaveState = {
    version: 3, consent: { given: false, speech: false, at: 0 },
    level: B.hero.startLevel, exp: 0, hp: 0, mp: 0, gold: B.economy.startGold,
    inv: { honey: 0, bighoney: 0, manatea: 0, bigmanatea: 0, feather: 0, ...B.economy.startInventory },
    gear: [...B.economy.startGear], equip: { weapon: null, armor: null, shield: null, charm: null },
    skills: [], skillsEquipped: [], courage: 0, lastDefeatLoc: null, where: 'town', lastInn: null, practice: {}, locs: {}, prog: {},
    stats: { battles: 0, wins: 0, defeats: 0, flees: 0, freeInn: 0, paidInn: 0, questions: 0, correct: 0, spoken: 0, voids: 0 }, log: [],
    spells: [], quests: {},
  };
  for (const g of s.gear) { const d = GEAR[g]; if (d && !s.equip[d.slot]) s.equip[d.slot] = g; }
  LOCATIONS.forEach((l, i) => s.practice[l.id] = { done: [], rewarded: false, stickers: [] });
  LOCATIONS.forEach((l, i) => s.locs[l.id] = { unlocked: i === 0, bossDefeated: false, pathCleared: 0, previewSeen: false, patrolsLeft: 0, approachArmed: true, bossCheckpoint: false, patrolsFought: 0 });
  refreshSkills(s);
  const h = heroStats(s); s.hp = h.maxHp; s.mp = h.maxMp;
  return s;
}

export let S: SaveState = load();
export const session = { speechBlocked: false, speechBlockReason: '', voids: 0 };

function load(): SaveState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const s = JSON.parse(raw); if (s && s.version === 3) { s.spells ??= []; s.quests ??= {}; fillSkillSlots(s); return s; } }
  } catch { /* ignore */ }
  return newState();
}
export function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* quota */ } }
export function resetAll() { localStorage.removeItem(KEY); S = newState(); save(); }
export function replaceState(s: SaveState) { s.spells ??= []; s.quests ??= {}; S = s; save(); }

export function speechOn(): boolean { return S.consent.given && S.consent.speech && !session.speechBlocked; }

export function heroStats(s: SaveState = S) {
  const L = s.level; const h = B.hero;
  let atk = Math.floor(L / h.atkLevelDiv), def = Math.floor(L / h.defLevelDiv), maxHp = h.hpBase + h.hpPerLevel * L, maxMp = h.mpBase + h.mpPerLevel * L;
  for (const slot of ['weapon', 'armor', 'shield', 'charm'] as const) {
    const id = s.equip[slot]; if (!id) continue; if (slot === 'charm' && L < B.slots.charmUnlockLevel) continue;
    const g = GEAR[id]; atk += g.atk || 0; def += g.def || 0; maxMp += g.mp || 0; maxHp += g.hp || 0;
  }
  const courageMult = 1 + B.economy.courageStep * Math.min(B.economy.courageMaxStacks, s.courage);
  return { atk, def, defBattle: def * courageMult, courageMult, maxHp, maxMp };
}
export function expToNext(L: number) { return B.hero.expToNextPerLevel * L; }
/** Adds EXP; returns the number of levels gained. Level-ups add the max-HP/MP increase to current HP/MP (no full heal: no auto-heal rule). */
export function addExp(n: number): number {
  S.exp += n; let gained = 0;
  while (S.exp >= expToNext(S.level)) {
    const before = heroStats(); S.exp -= expToNext(S.level); S.level++; gained++;
    const after = heroStats(); S.hp += after.maxHp - before.maxHp; S.mp += after.maxMp - before.maxMp;
  }
  if (gained) refreshSkills(S);
  return gained;
}
export function skillSlots(s: SaveState = S) {
  let n = 0; for (const r of B.slots.skillSlotsByLevel) if (s.level >= r.level) n = r.slots; return n;
}
/** Grants skills whose unlock condition is met and auto-equips into free slots. */
export function refreshSkills(s: SaveState): string[] {
  const got: string[] = [];
  // a boss reward counts as earned before a level-up of the same victory (so Guardian Shield, from the Meadow boss, keeps its slot order)
  for (const sk of [...SKILLS].sort((a, b) => +!!b.unlock.boss - +!!a.unlock.boss)) {
    const u = sk.unlock;
    const ok = u.start || (u.level && s.level >= u.level) || (u.boss && s.locs[u.boss]?.bossDefeated);
    if (ok && !s.skills.includes(sk.id)) { s.skills.push(sk.id); got.push(sk.id); }
  }
  return fillSkillSlots(s, got);
}
/** Owned skills fill empty skill slots, in the order they were earned (e.g. the 3rd slot opening at L8 takes Guardian Shield).
 *  Runs only when a slot has just opened or a skill was just earned, so a skill the player took off stays off.
 *  Returns the ids that were newly slotted; they are also queued in `notices` for a toast. */
export function fillSkillSlots(s: SaveState, justEarned: string[] = []): string[] {
  const n = skillSlots(s); const opened = n > (s.slotsSeen ?? 0); s.slotsSeen = Math.max(n, s.slotsSeen ?? 0);
  const added: string[] = [];
  for (const id of opened ? s.skills : justEarned) {
    if (s.skillsEquipped.length >= n) break;
    if (!s.skillsEquipped.includes(id)) { s.skillsEquipped.push(id); added.push(id); }
  }
  if (opened && s.slotsSeen > 2 && added.length) for (const id of added) { const sk = SKILLS.find(k => k.id === id)!; notices.push(`✨ New skill slot! ${sk.emoji} ${sk.zh} ${sk.en} is ready.`); }
  return added;
}
/** Short messages for the UI to toast (skill slots filled, gear auto-equipped outside the shop). */
export const notices: string[] = [];

// ---------------- gear comparison, auto-equip, tier check (spec v3.2 §7.9 / §11.4 item 7) ----------------
const GEAR_STATS = ['atk', 'def', 'mp', 'hp', 'startStreak'] as const;
/** a is strictly better than b (same slot): at least as good on every stat and perk, better on at least one. Anything beats an empty slot. */
export function strictlyBetter(a: GearDef, b: GearDef | null | undefined): boolean {
  if (!b) return true;
  if (a.slot !== b.slot || a.id === b.id) return false;
  let more = false;
  for (const k of GEAR_STATS) { const x = a[k] || 0, y = b[k] || 0; if (x < y) return false; if (x > y) more = true; }
  return more;
}
/** Adds a gear piece (drop or purchase). Auto-equips it when strictly better than what is worn in that slot.
 *  Returns the replaced item when it was equipped (null = slot was empty), or undefined when it was not equipped. */
export function gainGear(id: string, s: SaveState = S): { equipped: boolean; from: GearDef | null } {
  const g = GEAR[id]; if (!s.gear.includes(id)) s.gear.push(id);
  const cur = s.equip[g.slot] ? GEAR[s.equip[g.slot]!] : null;
  if (!strictlyBetter(g, cur)) return { equipped: false, from: cur };
  s.equip[g.slot] = id; return { equipped: true, from: cur };
}
/** "Equipped 🗡️ 角兔角 Rabbit-Horn Dagger (ATK 5 → 7)" */
export function equipLine(g: GearDef, from: GearDef | null) {
  const st = g.slot === 'weapon' ? 'atk' : g.slot === 'charm' ? (g.mp ? 'mp' : g.def ? 'def' : 'atk') : 'def';
  const lbl = st.toUpperCase(); const a = from?.[st] || 0, b = g[st] || 0;
  return `✨ Equipped ${g.emoji} ${g.zh} ${g.en}${a !== b ? ` (${lbl} ${a} → ${b})` : ''}${g.perk ? ` · ${g.perk}` : ''}`;
}
export function gearStatText(g: GearDef) {
  return [g.atk ? `ATK ${g.atk}` : '', g.def ? `DEF ${g.def}` : '', g.mp ? `MP +${g.mp}` : '', g.hp ? `HP +${g.hp}` : '', g.startStreak ? `🔥+${g.startStreak}` : ''].filter(Boolean).join(' · ');
}
/** Common (shop) gear of a tier for the three core slots. */
export function tierGear(tier: number): GearDef[] {
  return (['weapon', 'armor', 'shield'] as const).map(sl => GEAR_LIST.find(g => g.slot === sl && g.tier === tier && g.rarity === 'common')!).filter(Boolean);
}
/** Core slots whose worn gear is below the location tier's common gear (the §6.2 "recommended gear"), except a heroic piece from the previous tier.
 *  Charms are optional and not checked. */
export function weakGear(locId: string, s: SaveState = S): { slot: 'weapon' | 'armor' | 'shield'; worn: GearDef | null; want: GearDef }[] {
  const out: { slot: 'weapon' | 'armor' | 'shield'; worn: GearDef | null; want: GearDef }[] = [];
  for (const want of tierGear(LOC[locId].tier)) {
    const worn = s.equip[want.slot] ? GEAR[s.equip[want.slot]!] : null;
    const st = want.slot === 'weapon' ? 'atk' : 'def';
    const carried = worn?.rarity === 'heroic' && worn.tier === LOC[locId].tier - 1;   // a heroic piece from the previous realm still counts (diag: the dagger alone wins 86–100%)
    if ((worn?.[st] || 0) < (want[st] || 0) && !carried) out.push({ slot: want.slot as any, worn, want });
  }
  return out;
}
export function frontierLoc() {
  let f = LOCATIONS[0]; for (const l of LOCATIONS) if (S.locs[l.id].unlocked) f = l; return f;
}
export function G() { return frontierLoc().G; }
export function innPrice(place = 'town') { return B.economy.innPriceG * (place === 'town' ? G() : LOC[place].G); }
export function consPrice(id: string) { return CONS[id].priceG * G(); }
export function clampHpMp() { const h = heroStats(); S.hp = Math.max(0, Math.min(S.hp, h.maxHp)); S.mp = Math.max(0, Math.min(S.mp, h.maxMp)); }
export function locDef(id: string) { return LOC[id]; }
