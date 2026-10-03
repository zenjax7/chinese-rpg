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
export interface ConsumableDef { id: string; zh: string; en: string; emoji: string; priceG: number; healHpFrac?: number; healMpFrac?: number; warp?: boolean; carryLimit?: number;
  /** v3.4: false = map only (MP potions never drunk in battle). fromTown: first town that sells it. magicShop: sold in the 🔮 magic shop. */
  battleUse?: boolean; fromTown?: number; magicShop?: boolean; }
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

// ---- v3.3: towns, spells, quests ----
import spellsJ from './data/spells.json';
import questsJ from './data/quests.json';
import townsJ from './data/towns.json';
export interface TownDef { town: number; zh: string; en: string; G: number; realmLocs: string[]; inBuild: boolean; hub: string | null; arriveAt: string | null; gearSetPrice: number | null; }
export interface SpellDef { id: string; town: number; zh: string; zhTrad: string; en: string; target: 'single' | 'same_type' | 'all'; element: string; emoji: string;
  power: number; mp: number; priceG: number; status: 'soak' | 'daze' | 'chill' | 'freeze' | null; statusZh: string | null; statusEn: string | null; statusText: string | null;
  skipChance: number; soak: boolean; statusTurns: number; }
export interface SpellRules { version: string; castRequiresAnswer: boolean; fizzleSpendsMp: boolean; tiredMult: number; defMult: number;
  maxTargets: number; bossStatusMult: number; statusBossMultBy: Record<string, number>; soakMult: number; castStreak: string; castMpRegen: number;
  blacksmithFirst: 'warn' | 'lock' | 'off'; town1Shelf: string; }
export interface QuestDef { id: string; town: number; type: 'bounty' | 'collect' | 'words' | 'delivery'; titleZh: string; titleEn: string; n: number; rewardG: number;
  rewardItem: string | null; rewardCosmetic: string | null; enemy: string | null; enemyDesyId: string | null; dropZh: string | null; dropEn: string | null; toTown: number | null; }
export const TOWNS: TownDef[] = (townsJ as any).towns;
export const TOWN: Record<number, TownDef> = Object.fromEntries(TOWNS.map(t => [t.town, t]));
export const SPELL_RULES: SpellRules = (spellsJ as any).rules;
export const SPELLS: SpellDef[] = (spellsJ as any).spells;
export const SPELL: Record<string, SpellDef> = Object.fromEntries(SPELLS.map(s => [s.id, s]));
export const QUEST_RULES: { collectDrop: number; oneTime: boolean; wordsCountFrom: string; deliveryAfterRealmBoss: boolean } = (questsJ as any).rules;
export const QUESTS: QuestDef[] = (questsJ as any).quests;
export const QUEST: Record<string, QuestDef> = Object.fromEntries(QUESTS.map(q => [q.id, q]));
export const spellPrice = (s: SpellDef) => Math.round(s.priceG * (TOWN[s.town]?.G || 0));
export const questGold = (q: QuestDef) => Math.round(q.rewardG * (TOWN[q.town]?.G || 0));
