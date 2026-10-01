import balanceJ from './data/balance.json';
import itemsJ from './data/items.json';
import enemiesJ from './data/enemies.json';
import locationsJ from './data/locations.json';
import shopJ from './data/shop.json';
import skillsJ from './data/skills.json';

export interface Item { id: string; zh: string; trad: string; py: string; en: string; enPrimary: string; type: string; pos: string;
  topic: string; loc: string; speaking: boolean; reading: boolean; altZh: string[]; altEn: string[]; }
export interface EnemyDef { id: string; zh: string; py: string; en: string; emoji: string; color: number; tier: number;
  kind: 'normal' | 'elite' | 'locboss' | 'realmboss'; role: string; desyId: string; sprite: string; spriteTint: number | null; level: number; hp: number; atk: number; def_: number;
  exp: number; gold: number; chestRate: number; minions: string[]; attackZh: string; attackEn: string; special: string; group: string;
  mech: { partnerFallSkip?: boolean; dozeEveryNRounds?: number; quickStart?: boolean; summonAtHalf?: { enemy: string; maxOnScreen: number };
    honeyDistract?: boolean; rootOnBroken?: boolean; webOnBroken?: { nextAttackMult: number }; waxShieldFirstHit?: number; healOnceAtHalf?: number;
    summonEveryNTurns?: { n: number; enemy: string; maxOnScreen: number; maxSummons?: number }; coinGrab?: number; bigHuffEveryN?: { n: number; extraBrokenDamage: number } }; }
export interface LocationDef { id: string; name: string; zh: string; emoji: string; tier: number; G: number; recLevel: [number, number];
  enemiesPerBattle: [number, number]; mcOptions: number; reviewSlots: number; pathFights: number;
  roster: { enemy: string; weight: number }[]; boss: string; packs: Record<string, number>; scripted: Record<string, string[]>;
  elite?: string; desyPool?: string; unlockRequires: string[]; bg: string;
  bossReward: { skill?: string; heroic?: string; text: string };
  mapNodes?: { x: number; y: number; kind: 'inn' | 'fight' | 'gate' | 'boss' }[]; }
export interface GearDef { id: string; slot: 'weapon' | 'armor' | 'shield' | 'charm'; tier: number; rarity: string; zh: string; en: string;
  emoji: string; atk?: number; def?: number; mp?: number; hp?: number; price: number; shop?: boolean; shopRequires?: string; startStreak?: number; perk?: string; }
export interface ConsumableDef { id: string; zh: string; en: string; emoji: string; priceG: number; healHpFrac?: number; healMpFrac?: number; warp?: boolean; carryLimit?: number; }
export interface SkillDef { id: string; zh: string; en: string; emoji: string; mp: number; perBattle?: number; cooldownRounds?: number;
  minStreak?: number; secondHitFrac?: number; healFrac?: number; kind: string; unlock: { start?: boolean; level?: number; boss?: string }; desc: string; }

export const B = balanceJ as any;
export const ITEMS: Item[] = (itemsJ as any).items;
export const ITEM: Record<string, Item> = Object.fromEntries(ITEMS.map(i => [i.id, i]));
export const POOLS: Record<string, string[]> = (itemsJ as any).pools;
export const ENEMIES: Record<string, EnemyDef> = Object.fromEntries((enemiesJ as any).enemies.map((e: EnemyDef) => [e.id, e]));
export const LOCATIONS: LocationDef[] = (locationsJ as any).locations;
export const LOC: Record<string, LocationDef> = Object.fromEntries(LOCATIONS.map(l => [l.id, l]));
export const GEAR: Record<string, GearDef> = Object.fromEntries((shopJ as any).gear.map((g: GearDef) => [g.id, g]));
export const GEAR_LIST: GearDef[] = (shopJ as any).gear;
export const CONSUMABLES: ConsumableDef[] = (shopJ as any).consumables;
export const CONS: Record<string, ConsumableDef> = Object.fromEntries(CONSUMABLES.map(c => [c.id, c]));
export const SKILLS: SkillDef[] = (skillsJ as any).skills;
export const SKILL: Record<string, SkillDef> = Object.fromEntries(SKILLS.map(s => [s.id, s]));
