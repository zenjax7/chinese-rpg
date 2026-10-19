import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { expToNextAt, heroLevelStats, enemyStatsAt, resolveEnemyLevel, heroActions, roundActions, mapLevels, EnemyKind, CLASSIC_MAPS, classicMapId, classicLevels, bossHomeLevels, summonLevel } from '../../src/shared/leveling.js';
import balance from '../../src/data/balance.json' with { type: 'json' };

// Leveling v2 (Jack 2026-10-17): the engine's formulas against Desy's tables (docs/data/json, written by leveling_v2_tables.py from the sim).
const J = (f: string) => JSON.parse(readFileSync(`docs/data/json/${f}.json`, 'utf8'));
const H = (balance as any).hero;
const KIND: Record<string, EnemyKind> = { normal: 'normal', elite: 'elite', location: 'locboss', realm: 'realmboss' };
const kindOf = (r: any): EnemyKind => KIND[r.role === 'boss' ? r.boss_type : r.role];
const M: Record<string, number> = Object.fromEntries(J('combat_data').boss_hp.map((r: any) => [`${r.tier},${KIND[r.boss_type]}`, r.hp_mult]));
const seq = (...xs: number[]) => { let i = 0; return () => xs[i++ % xs.length]; };

describe('hero curve (§2.1)', () => {
  it('EXP to next = round(15 + 1.5(L−1)²): 15, 17, 21, 29, 39 … and matches hero_levels L1–60', () => {
    expect([1, 2, 3, 4, 5, 10].map(L => expToNextAt(L, H))).toEqual([15, 17, 21, 29, 39, 137]);
    for (const r of J('hero_levels')) expect(expToNextAt(r.level, H), `L${r.level}`).toBe(r.exp_to_next);
  });
  it('no level cap: the curve keeps growing past 60', () => {
    expect(expToNextAt(100, H)).toBe(Math.round(15 + 1.5 * 99 ** 2));
    expect(expToNextAt(61, H)).toBeGreaterThan(expToNextAt(60, H));
  });
  it('+1 ATK per level, DEF +floor((L−1)/3), HP 30+4L, MP 10+L, SPD = L (hero_levels L1–60)', () => {
    for (const r of J('hero_levels')) {
      const s = heroLevelStats(r.level, H);
      expect([s.maxHp, s.maxMp, s.atk, s.def, s.spd], `L${r.level}`).toEqual([r.hp, r.mp, r.atk_from_level, r.def_from_level, r.spd]);
    }
    for (let L = 1; L < 60; L++) expect(heroLevelStats(L + 1, H).atk - heroLevelStats(L, H).atk).toBe(1);
  });
});

describe('enemy stats by level (§2.3)', () => {
  it('reproduces every row of enemy_stat_bands (normal / elite bands, every boss at its level)', () => {
    const rows = J('enemy_stat_bands'); expect(rows.length).toBeGreaterThan(50);
    for (const r of rows) {
      const k = kindOf(r); const s = enemyStatsAt(k, r.tier, r.level, undefined, M[`${r.tier},${k}`] ?? 1);
      expect([s.hp, s.atk, s.def_, s.spd], `t${r.tier} ${r.role} ${r.boss_type} L${r.level}`).toEqual([r.hp, r.atk, r.def, r.spd]);
    }
  });
  it('reproduces all 50 roster enemies at their first level with their archetype (hp_mult / atk_mult / def_add)', () => {
    const rows = J('enemies'); expect(rows.length).toBe(50);
    for (const r of rows) {
      const k = kindOf(r); const s = enemyStatsAt(k, r.realm, r.level, { hpMult: r.hp_mult, atkMult: r.atk_mult, defAdd: r.def_add }, M[`${r.realm},${k}`] ?? 1);
      expect([s.hp, s.atk, s.def_], r.id).toEqual([r.hp, r.atk, r.def]);
    }
  });
  it('the rabbit targets: an L1 rabbit is 11 HP / 5 ATK / 1 DEF; SPD = level', () => {
    expect(enemyStatsAt('normal', 1, 1)).toEqual({ level: 1, hp: 11, atk: 5, def_: 1, spd: 1 });
    expect(enemyStatsAt('normal', 4, 25).spd).toBe(25);
  });
});

describe('enemy level on spawn: roster override, then elite / boss, then the map range', () => {
  const m = mapLevels({ gearTier: 2, recLevel: [16, 19], enemyLevel: [14, 16], eliteLevel: 16,
    roster: [{ enemy: 'giant_bee', weight: 3 }, { enemy: 'forest_spider', weight: 2, level: 20 }, { enemy: 'sapling_sprite', weight: 1, level: [30, 31] }],
    boss: { node: 'b', gateEdge: 'e', kind: 'locboss', enemy: 'greedy_bear', level: 17 } })!;
  it('reads the map settings', () => {
    expect(m).toEqual({ tier: 2, recLevel: [16, 19], enemyLevel: [14, 16], eliteLevel: 16, bossLevel: 17, roster: { forest_spider: 20, sapling_sprite: [30, 31] } });
  });
  it('a roster[].level wins over everything (a fixed level, or a roll in [lo, hi])', () => {
    expect(resolveEnemyLevel('forest_spider', 'normal', m, seq(0.99))).toBe(20);
    expect(resolveEnemyLevel('forest_spider', 'elite', m)).toBe(20);
    expect(resolveEnemyLevel('sapling_sprite', 'normal', m, seq(0))).toBe(30);
    expect(resolveEnemyLevel('sapling_sprite', 'normal', m, seq(0.999))).toBe(31);
  });
  it('then elites take eliteLevel and bosses boss.level', () => {
    expect(resolveEnemyLevel('royal_guard_bee', 'elite', m, seq(0))).toBe(16);
    expect(resolveEnemyLevel('greedy_bear', 'locboss', m, seq(0))).toBe(17);
    expect(resolveEnemyLevel('queen_bee', 'realmboss', m, seq(0))).toBe(17);
  });
  it('then normals roll uniformly in enemyLevel [lo, hi] (both ends reachable)', () => {
    expect(resolveEnemyLevel('giant_bee', 'normal', m, seq(0))).toBe(14);
    expect(resolveEnemyLevel('giant_bee', 'normal', m, seq(0.5))).toBe(15);
    expect(resolveEnemyLevel('giant_bee', 'normal', m, seq(0.9999))).toBe(16);
    const seen = new Set<number>(); for (let i = 0; i < 300; i++) seen.add(resolveEnemyLevel('giant_bee', 'normal', m)!);
    expect([...seen].sort()).toEqual([14, 15, 16]);
  });
  it('eliteLevel defaults to enemyLevel hi; no map / no boss.level = null (table stats)', () => {
    const d = mapLevels({ gearTier: 4, enemyLevel: [24, 26], roster: [] })!;
    expect(resolveEnemyLevel('goblin_brute', 'elite', d)).toBe(26);
    expect(resolveEnemyLevel('goblin_king', 'realmboss', d)).toBeNull();
    expect(resolveEnemyLevel('goblin', 'normal', undefined)).toBeNull();
    expect(mapLevels({})).toBeUndefined();
  });
  it('every combat map in docs/data/levels resolves a level in range for its roster', () => {
    const idx = readFileSync('src/data/world/level-hashes.json', 'utf8'); const ids = Object.keys(JSON.parse(idx).hashes);
    let n = 0;
    for (const id of ids) {
      const L = JSON.parse(readFileSync(`docs/data/levels/${id}.json`, 'utf8')); const lv = mapLevels(L.settings);
      if (!lv?.enemyLevel) continue; n++;
      for (const r of L.settings.roster || []) { const x = resolveEnemyLevel(r.enemy, 'normal', lv)!; expect(x).toBeGreaterThanOrEqual(lv.enemyLevel[0]); expect(x).toBeLessThanOrEqual(lv.enemyLevel[1]); }
    }
    expect(n).toBe(37);
  });
});

describe('speed: hero actions per round (§1.1)', () => {
  it('clamp(floor(hero SPD ÷ highest living enemy SPD), 1, 3)', () => {
    expect(heroActions(10, [10])).toBe(1);
    expect(heroActions(19, [10])).toBe(1);
    expect(heroActions(20, [10])).toBe(2);
    expect(heroActions(29, [10])).toBe(2);
    expect(heroActions(30, [10])).toBe(3);
    expect(heroActions(90, [10])).toBe(3);    // capped at 3
    expect(heroActions(1, [3])).toBe(1);      // slower hero still acts once
    expect(heroActions(30, [5, 15, 10])).toBe(2);   // the fastest enemy sets the ratio
  });
  it('recomputes from the living enemies: the fastest one dying raises the next round\'s count', () => {
    const foes = [{ alive: true, spd: 16 }, { alive: true, spd: 14 }, { alive: true, spd: 10 }];
    expect(roundActions(30, foes)).toBe(1);
    foes[0].alive = false; expect(roundActions(30, foes)).toBe(2);
    foes[1].alive = false; expect(roundActions(30, foes)).toBe(3);
  });
  it('no living enemy counts as 1', () => { expect(heroActions(30, [])).toBe(1); expect(roundActions(30, [{ alive: false, spd: 1 }])).toBe(1); });
});

// Desy 2026-10-17 (combat-spec §2.3 notes): classic locations read their map's levels; a boss's worker bee takes the boss's level.
describe('classic locations read the corresponding graph map (static table)', () => {
  const ML = JSON.parse(readFileSync('src/data/world/index.json', 'utf8')).mapLevels;
  const LOCS = JSON.parse(readFileSync('src/data/locations.json', 'utf8')).locations;
  it('meadow → realm_1, forest → realm_2; a location not in the table uses realm_<realm>', () => {
    expect(CLASSIC_MAPS).toEqual({ meadow: 'realm_1', forest: 'realm_2' });
    expect(classicMapId('somewhere', 3)).toBe('realm_3');
    expect(classicLevels('somewhere', 3, ML)).toEqual({ ...mapLevels(ML.realm_3), roster: { ...mapLevels(ML.realm_3)!.roster, ...bossHomeLevels(ML) } });
    for (const l of LOCS) expect(ML[classicMapId(l.id, l.tier)], l.id).toBeTruthy();   // every classic location has its map
  });
  it('meadow: enemyLevel [1, 3], eliteLevel 3, boss.level 10, recLevel [1, 11] at tier 1 (realm_1); forest: realm_2', () => {
    expect(classicLevels('meadow', 1, ML)).toEqual({ tier: 1, recLevel: [1, 11], enemyLevel: [1, 3], eliteLevel: 3, bossLevel: 10, roster: bossHomeLevels(ML) });
    expect(classicLevels('forest', 2, ML)).toEqual({ ...mapLevels(ML.realm_2), roster: { ...mapLevels(ML.realm_2)!.roster, ...bossHomeLevels(ML) } });
  });
  it('so a meadow wolf pup rolls L1–3 (it was its table level 10)', () => {
    const m = classicLevels('meadow', 1, ML);
    expect([0, 0.5, 0.999].map(x => resolveEnemyLevel('wolf_pup', 'normal', m, () => x))).toEqual([1, 2, 3]);
  });
});
// Desy 2026-10-18: a classic boss takes the boss.level of the graph map where it lives (by enemy id); roster[].level overrides go through
// the same lookup; a boss on no graph map keeps the location's map.
describe('classic bosses use their home graph map\'s boss level', () => {
  const ML = JSON.parse(readFileSync('src/data/world/index.json', 'utf8')).mapLevels;
  const meadow = classicLevels('meadow', 1, ML), forest = classicLevels('forest', 2, ML);
  it('big_grey_wolf → clover_hills L13, horned_rabbit_king → warren L15, crow → realm_1 L10; bear → realm_2 L17, queen_bee → great_hive_1 L19', () => {
    expect(resolveEnemyLevel('big_grey_wolf', 'locboss', meadow)).toBe(13);
    expect(resolveEnemyLevel('horned_rabbit_king', 'realmboss', meadow)).toBe(15);
    expect(resolveEnemyLevel('big_beak_crow', 'locboss', meadow)).toBe(10);
    expect(resolveEnemyLevel('greedy_bear', 'locboss', forest)).toBe(17);
    expect(resolveEnemyLevel('queen_bee', 'realmboss', forest)).toBe(19);
  });
  it('a boss on no graph map falls back to the location\'s map boss.level', () => {
    expect(resolveEnemyLevel('no_such_boss', 'realmboss', meadow)).toBe(10);
    expect(resolveEnemyLevel('no_such_boss', 'locboss', forest)).toBe(17);
  });
  it('roster[].level overrides: the location map\'s carry over; a home map\'s override for its own boss wins over its boss.level', () => {
    const byMap = { ...ML,
      realm_1: { ...ML.realm_1, roster: [{ enemy: 'wolf_pup', level: [2, 2] }, { enemy: 'rabbit', weight: 1 }] },
      warren: { ...ML.warren, roster: [{ enemy: 'horned_rabbit_king', level: 16 }] } };
    const m = classicLevels('meadow', 1, byMap);
    expect(resolveEnemyLevel('wolf_pup', 'normal', m, () => 0)).toBe(2);
    expect(resolveEnemyLevel('horned_rabbit_king', 'realmboss', m)).toBe(16);
    expect(bossHomeLevels(byMap).big_grey_wolf).toBe(13);
  });
});
describe('worker bee level', () => {
  const A = JSON.parse(readFileSync('src/data/leveling.json', 'utf8')).archetype;
  it('summoned in a boss fight: the boss\'s level; otherwise no forced level (it rolls in enemyLevel like any normal)', () => {
    expect(summonLevel('worker_bee', 'realmboss', 19)).toBe(19);
    expect(summonLevel('worker_bee', 'locboss', 17)).toBe(17);
    expect(summonLevel('worker_bee', 'normal', 15)).toBeUndefined();
    expect(summonLevel('horned_rabbit', 'realmboss', 15)).toBeUndefined();   // the rule is the worker bee's only
  });
  it('keeps the giant bee archetype at half the HP multiplier; at the Queen Bee\'s L19 (tier 2): same ATK, half the HP factor', () => {
    expect(A.worker_bee).toEqual({ ...A.giant_bee, hpMult: A.giant_bee.hpMult / 2 });
    const w = enemyStatsAt('normal', 2, 19, A.worker_bee), g = enemyStatsAt('normal', 2, 19, A.giant_bee);
    expect(w.level).toBe(19); expect(w.atk).toBe(g.atk); expect(w.hp).toBe(Math.round(g.hp / A.giant_bee.hpMult * A.worker_bee.hpMult));
  });
});
// CI check (Desy 2026-10-18): every classic boss (a location's boss and its scripted path bosses) gets, in its classic location, the
// boss.level of the published graph map (docs/data/levels) whose boss it is; a boss on no graph map gets the location map's boss.level.
describe('CI: every classic boss level equals its graph map boss.level', () => {
  const ML = JSON.parse(readFileSync('src/data/world/index.json', 'utf8')).mapLevels;
  const LOCS = JSON.parse(readFileSync('src/data/locations.json', 'utf8')).locations;
  const EN: Record<string, any> = Object.fromEntries(JSON.parse(readFileSync('src/data/enemies.json', 'utf8')).enemies.map((e: any) => [e.id, e]));
  const home: Record<string, { map: string; level: number }> = {};
  for (const f of readdirSync('docs/data/levels').filter(f => f.endsWith('.json'))) {
    const L = JSON.parse(readFileSync(`docs/data/levels/${f}`, 'utf8')); const b = L.settings?.boss;
    if (!String(L.schema || '').startsWith('level/') || !b?.enemy || b.level == null) continue;
    const o = (L.settings.roster || []).find((r: any) => r.enemy === b.enemy && r.level != null);
    home[b.enemy] = { map: L.id, level: o ? o.level : b.level };
  }
  const bosses = (l: any) => [...new Set([l.boss, ...Object.values(l.scripted || {}).flat(), ...(l.roster || []).map((r: any) => r.enemy)] as string[])]
    .filter(id => EN[id] && (EN[id].kind === 'locboss' || EN[id].kind === 'realmboss'));
  it('finds the classic bosses', () => { expect(LOCS.flatMap(bosses).length).toBeGreaterThanOrEqual(5); });
  for (const l of LOCS) for (const id of bosses(l)) {
    const did = EN[id].desyId.split(' ')[0];
    it(`${l.id} ${id} (${did})`, () => {
      const want = home[did]?.level ?? ML[classicMapId(l.id, l.tier)].boss.level;
      expect(resolveEnemyLevel(did, EN[id].kind, classicLevels(l.id, l.tier, ML))).toEqual(want);
    });
  }
});
