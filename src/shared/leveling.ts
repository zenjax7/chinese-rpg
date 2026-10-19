/** Leveling v2 (Jack 2026-10-17; combat-spec §1.1 speed, §2.1 hero, §2.3 enemy levels). Pure functions with no game imports, so the
 *  game, the server (save plausibility) and the unit tests (tests/api/leveling.test.ts) share one copy. Rounding is Math.round
 *  (half up), like the spec and docs/tech/tools/sim/combat_sim.py. */

/** balance.json `hero` (§2.1): HP hpBase + hpPerLevel·L, MP mpBase + mpPerLevel·L, ATK + atkPerLevel·(L−1), DEF + floor((L−1)/defLevelDiv),
 *  SPD = L, EXP from L to L+1 = round(expBase + expQuad·(L−1)²). No level cap. */
export interface HeroGrowth { hpBase: number; hpPerLevel: number; mpBase: number; mpPerLevel: number; atkPerLevel: number; defLevelDiv: number;
  expBase: number; expQuad: number }
export const expToNextAt = (L: number, h: HeroGrowth) => Math.round(h.expBase + h.expQuad * (L - 1) ** 2);
/** The hero's stats from level alone (gear is added by the game). */
export function heroLevelStats(L: number, h: HeroGrowth) {
  return { maxHp: h.hpBase + h.hpPerLevel * L, maxMp: h.mpBase + h.mpPerLevel * L, atk: h.atkPerLevel * (L - 1), def: Math.floor((L - 1) / h.defLevelDiv), spd: L };
}

// ---------------- enemy levels (§2.3) ----------------
export type EnemyKind = 'normal' | 'elite' | 'locboss' | 'realmboss';
/** §2.3 constants: H(t) by tier (t ≥ 10: 2), the ATK factors on DEF_ref, the boss HP factors and the boss ATK ×0.8 (v3.6).
 *  The reference hero at level n has common tier-t gear: weapon 3t+2, armor 2t+1, shield t (§2.1). */
export const ENEMY_RULES = {
  hitsByTier: [2.4, 3, 2.5, 2.25, 2.25, 2, 2, 2, 2], hitsDefault: 2,
  atkK: { normal: 1.21, elite: 1.2, locboss: 1.2, realmboss: 1.3 } as Record<EnemyKind, number>,   // normal: Jack 2026-10-12 ×1.1 on 1.1
  eliteHpX: 2, bossHpK: { locboss: 5, realmboss: 7 } as Record<string, number>, bossAtkMult: 0.8,
};
/** An archetype's offsets around the band (data/enemies/enemies.csv hp_mult / atk_mult / def_add); bosses and elites are 1 / 1 / 0. */
export interface Archetype { hpMult: number; atkMult: number; defAdd: number }
export interface LevelStats { level: number; hp: number; atk: number; def_: number; spd: number }
const isBoss = (k: EnemyKind) => k === 'locboss' || k === 'realmboss';
/** Stats of a tier-t enemy at level n: ATK_ref / DEF_ref = a level-n hero with common tier-t gear, DEF_e = ceil(n/5),
 *  base = ATK_ref − 0.5·DEF_e, SPD = n. Normals and elites take their archetype; bosses take m(t) on HP (bossHpMult) and ×0.8 ATK. */
export function enemyStatsAt(kind: EnemyKind, t: number, n: number, arch: Archetype = { hpMult: 1, atkMult: 1, defAdd: 0 }, bossHpMult = 1): LevelStats {
  const R = ENEMY_RULES; const r = Math.round;
  const atkRef = 3 * t + 2 + (n - 1), defRef = 3 * t + 1 + Math.floor((n - 1) / 3);
  const de = Math.ceil(n / 5); const base = Math.max(1, atkRef - 0.5 * de); const H = R.hitsByTier[t - 1] ?? R.hitsDefault;
  const hp0 = kind === 'normal' ? r(H * base) : kind === 'elite' ? R.eliteHpX * r(H * base) : r(R.bossHpK[kind] * base);
  const atk0 = r(R.atkK[kind] * defRef);
  const boss = isBoss(kind);
  return { level: n, hp: boss ? r(hp0 * bossHpMult) : r(hp0 * arch.hpMult), atk: boss ? r(atk0 * R.bossAtkMult) : r(atk0 * arch.atkMult),
    def_: Math.max(0, de + arch.defAdd), spd: n };
}

/** A map's level settings as the battle reads them (level/0.2 settings: gearTier, recLevel, enemyLevel, eliteLevel, boss.level, roster[].level). */
export interface MapLevels { tier: number; recLevel?: [number, number]; enemyLevel?: [number, number]; eliteLevel?: number; bossLevel?: number;
  /** roster[].level by Desy enemy id: a level or [lo, hi] */ roster: Record<string, number | [number, number]> }
export function mapLevels(s: any): MapLevels | undefined {
  if (!s || typeof s.gearTier !== 'number') return undefined;
  const roster: MapLevels['roster'] = {};
  for (const x of s.roster || []) if (x && x.level != null) roster[x.enemy] = x.level;
  return { tier: s.gearTier, recLevel: s.recLevel, enemyLevel: s.enemyLevel, eliteLevel: s.eliteLevel ?? s.enemyLevel?.[1], bossLevel: s.boss?.level, roster };
}
/** Classic mode (Desy 2026-10-17): each classic location reads enemyLevel, eliteLevel, boss.level and recLevel (and gearTier) from the
 *  graph map it corresponds to, by this static table; a location not in it uses its realm's main map realm_<realm>. The map's
 *  roster[].level overrides belong to that map's roster, so they are not carried over. */
export const CLASSIC_MAPS: Record<string, string> = { meadow: 'realm_1', forest: 'realm_2' };
export const classicMapId = (locId: string, realm: number) => CLASSIC_MAPS[locId] ?? `realm_${realm}`;
export function classicLevels(locId: string, realm: number, byMap: Record<string, any>): MapLevels | undefined {
  const m = mapLevels(byMap[classicMapId(locId, realm)]);
  return m && { ...m, roster: {} };
}
/** Desy 2026-10-17: a worker bee summoned in a boss fight takes the boss's level; anywhere else (a roster worker bee) it rolls like any
 *  normal enemy (undefined = no forced level). */
export const summonLevel = (summonDesyId: string, summonerKind: EnemyKind, summonerLevel: number): number | undefined =>
  summonDesyId === 'worker_bee' && isBoss(summonerKind) ? summonerLevel : undefined;
const roll = (lo: number, hi: number, rnd: () => number) => lo + Math.floor(rnd() * (hi - lo + 1));
/** An enemy's level on spawn: its roster[].level override, else eliteLevel (elites) / boss.level (bosses), else a uniform roll in
 *  enemyLevel. null = the map sets no level for it (the enemy keeps its table stats). */
export function resolveEnemyLevel(desyId: string, kind: EnemyKind, m: MapLevels | undefined, rnd: () => number = Math.random): number | null {
  if (!m) return null;
  const o = m.roster[desyId];
  if (o != null) return Array.isArray(o) ? roll(o[0], o[1], rnd) : o;
  if (kind === 'elite' && m.eliteLevel != null) return m.eliteLevel;
  if (isBoss(kind)) return m.bossLevel ?? null;
  return m.enemyLevel ? roll(m.enemyLevel[0], m.enemyLevel[1], rnd) : null;
}

// ---------------- speed (§1.1) ----------------
export const MAX_HERO_ACTIONS = 3;
/** Hero actions this round = clamp(floor(hero SPD ÷ the highest SPD among living enemies), 1, 3). Set at round start only. */
export function heroActions(heroSpd: number, livingEnemySpds: number[]): number {
  const top = Math.max(0, ...livingEnemySpds);
  if (!top) return 1;
  return Math.max(1, Math.min(MAX_HERO_ACTIONS, Math.floor(heroSpd / top)));
}
/** heroActions over a battle's foe list: only living enemies count (a dead fastest enemy no longer holds the ratio down next round). */
export const roundActions = (heroSpd: number, foes: { alive: boolean; spd: number }[]) => heroActions(heroSpd, foes.filter(f => f.alive).map(f => f.spd));
