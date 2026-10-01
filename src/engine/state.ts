import { B, LOCATIONS, LOC, GEAR, SKILLS, CONS } from '../data';

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
  skills: string[]; skillsEquipped: string[];
  courage: number; lastDefeatLoc: string | null;
  where: string;            // 'town' or a location id
  lastInn: { place: string; node: number } | null;   // where the Return Feather / waking after a defeat takes you
  practice: Record<string, { done: string[]; rewarded: boolean; stickers: string[] }>;
  locs: Record<string, LocState>;
  prog: Record<string, ItemProg>;
  stats: { battles: number; wins: number; defeats: number; flees: number; freeInn: number; paidInn: number; questions: number; correct: number; spoken: number; voids: number };
  log: any[];
}
const KEY = 'chinese-rpg-proto-v3';

export function newState(): SaveState {
  const s: SaveState = {
    version: 3, consent: { given: false, speech: false, at: 0 },
    level: B.hero.startLevel, exp: 0, hp: 0, mp: 0, gold: B.economy.startGold,
    inv: { honey: 0, bighoney: 0, manatea: 0, feather: 0, ...B.economy.startInventory },
    gear: [...B.economy.startGear], equip: { weapon: null, armor: null, shield: null, charm: null },
    skills: [], skillsEquipped: [], courage: 0, lastDefeatLoc: null, where: 'town', lastInn: null, practice: {}, locs: {}, prog: {},
    stats: { battles: 0, wins: 0, defeats: 0, flees: 0, freeInn: 0, paidInn: 0, questions: 0, correct: 0, spoken: 0, voids: 0 }, log: [],
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
    if (raw) { const s = JSON.parse(raw); if (s && s.version === 3) return s; }
  } catch { /* ignore */ }
  return newState();
}
export function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* quota */ } }
export function resetAll() { localStorage.removeItem(KEY); S = newState(); save(); }
export function replaceState(s: SaveState) { S = s; save(); }

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
export function refreshSkills(s: SaveState) {
  for (const sk of SKILLS) {
    const u = sk.unlock;
    const ok = u.start || (u.level && s.level >= u.level) || (u.boss && s.locs[u.boss]?.bossDefeated);
    if (ok && !s.skills.includes(sk.id)) { s.skills.push(sk.id); if (s.skillsEquipped.length < skillSlots(s)) s.skillsEquipped.push(sk.id); }
  }
}
export function frontierLoc() {
  let f = LOCATIONS[0]; for (const l of LOCATIONS) if (S.locs[l.id].unlocked) f = l; return f;
}
export function G() { return frontierLoc().G; }
export function innPrice(place = 'town') { return B.economy.innPriceG * (place === 'town' ? G() : LOC[place].G); }
export function consPrice(id: string) { return CONS[id].priceG * G(); }
export function clampHpMp() { const h = heroStats(); S.hp = Math.max(0, Math.min(S.hp, h.maxHp)); S.mp = Math.max(0, Math.min(S.mp, h.maxMp)); }
export function locDef(id: string) { return LOC[id]; }
