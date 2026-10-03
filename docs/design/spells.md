# Magic spells and quests: design and sim (v3.7)

For Jack (via Director). Revised 2026-10-02 (PT).

Jack's v3.7 call: **location bosses need about 15 correct answers, realm bosses stay at about 20**, both counted for a kid who arrives with full MP and spends it all on spells. Boss ATK × 0.8 stays.

Jack's v3.6 rules (on top of v3.5):
- **No MP regen.** The +1 MP per correct answer is gone. MP comes back only at the inn, on waking after a defeat, or from Mana Tea / Big Mana Tea (map only). Casting is expensive, and a kid who runs out of MP before the boss has only themselves to blame.
- **Bosses need about 20 correct answers** even from a kid who arrives with full MP and spends it all on spells, at every tier (v3.7: location bosses about 15).
- **No MP hints:** no inn or boss-gate "Save your MP" tip, no casts-ready count, no boss tip on the Preview page.

Kept from v3.5: casting is a free action (no question, no fizzle), no cast caps (MP is the only limit), MP costs 1.25 × v3.4, fixed spell power, no Magic Ward, Super Blizzard's Freeze 1 turn and not on bosses, 2–3 s skippable cast animations.

The short spec version is in `combat-spec.md` §6.7 (Spells) and §7.11 (Quests). Earlier versions of this document are kept in `build/v3/archive_v3_3/spells_v3_3.md`, `build/v3/archive_v3_4/spells.md` `build/v3/archive_v3_5/spells-v3.5.md` and `build/v3/archive_v3_6/spells-v3.6.md`.

Files:
- **Data:**
  - `data/spells.csv` / `.json` (16 spells)
  - `data/spell_falloff.csv`, `data/spell_mp_check.csv`, `data/mp_potions.csv`, `data/cast_rule.csv`, `data/boss_hp.csv` (v3.6, v3.7 location bosses)
  - `data/spells_full.json`
  - `data/quests.csv` / `.json`, `data/quests_full.json`
  - All generated from `build/v3/spells_data.py`.
- **Sim:** `build/spells_sim.py` + `build/spells_runner.py` → `build/v3/sim/v3_spells.txt` and `data/sim/sim_spells_*.csv`. Boss check: `build/v3/explore/boss_harness.py` → `build/v3/sim/v37_boss_check_*.json`.

## 1. Summary

- **v3.7 boss targets met.** Location boss HP is now × 1.2 / 1.55 / 1.9 / 1.7 / 1.85 / 1.8 / 1.7 / 1.85 / 1.9 for tiers 1–9 (v3.6: × 2.0–2.7); realm bosses are unchanged at × 1.05–1.85 (`data/boss_hp.csv`). In one boss fight from full HP and MP, spending every MP point on spells:

  | accuracy | location boss: full-MP spells / no spells | realm boss: full-MP spells / no spells |
  |---|---|---|
  | 75% | **14.8–15.4** / 15.3–19.3 | **19.4–20.1** / 20.1–24.9 |
  | 50% | 13.4–14.1 / 13.6–17.9 | 17.7–18.7 / 17.8–24.3 |
  | 90% | 14.2–15.4 / 14.9–17.9 | 17.9–20.4 / 18.5–22.8 |

  Full-MP spell use is 1.0–1.8 casts per boss. Per tier: §7.1.
- **v3.7 vs v3.6 in the campaign:** boss battles get shorter (75%: 29.6–31.1 → 26.0–27.5 questions; 50% saver 39–40 → 35–36), hours drop 0.1–0.3 h, defeats don't rise (50% saver 9.7% → 9.4%, spender 22.6% → 22.0%; the spender's first-try boss win 0.61 → 0.70), so boss ATK × 0.8 stays. Question share moves by at most ±0.005 (§7.3).
- **Spell costs and power are unchanged.** Boss HP is the knob, so normal and elite fights play as in v3.5.
- **Boss ATK × 0.8 (v3.6).** Longer boss fights with v3.5 ATK would raise 50% kids' defeats (saver 10.2% → 12.4%, spender 25.7% → 30.3%). With × 0.8 they fall (9.7% / 22.6% with no spells; 8.6% saver free), and first-try boss wins were 0.91–0.93 (saver) and 0.61 (spender) in v3.6, against 0.84 and 0.65 in v3.5 (v3.7: 0.93–0.94 and 0.70).
- **No regen, and Heal and Shield stay usable.** Removing regen alone moves defeats by less than 1 point, because the kid already goes back to the inn when MP is short for Heal. Heals per battle drop a little (50% saver 0.41 → 0.34). Free inns (50% spender 1.8 → 1.4 per run; 0–0.4 for everyone else) and the gold floor (lowest gold 14–33 by profile) don't move. So the MP pool, growth, inn and tea prices are unchanged.
- **Boss fights (v3.7 campaign):** 26–27.5 questions at 75% (v3.5: 19.7–21.4), 29–31 at 65%, 35–36 for a 50% saver and 20.8–21.6 at 90%. Playthrough hours are 0.1–0.3 h above v3.5.
- **Question share goes up.** No profile, style or realm falls below 0.85; the lowest single realm is 0.905 (v3.5: 0.857). Boss-battle share is 0.95–0.98 for kids who cast (v3.5: 0.90–0.97). Casts are at most 15% of hero turns in normal fights and 13% in boss fights (v3.5: 18% and 24.5%).
- **Saving matters a bit more.** Without regen, savers reach bosses with 94% MP against 89% for free spenders at 75% (90%: 89% vs 74%) and cast 0.2–0.3 more spells per boss. Nothing in the game tells them to.
- **No MP hints** (removed in v3.6). The MP bar is the only cue.
- **Prices, tea prices and quests are unchanged.**

## 2. Rules

| rule | v3.7 |
|---|---|
| Shop | A magic shop 魔法店 in every town. Towns 2–9 sell 2 spells each. Town 1 sells Mana Tea only. Price = price_G × G(town), 45–130 × G (unchanged). |
| Ownership | Permanent. Spellbook 魔法书 tab inside ✨ 技能 Skills. No skill slot; the battle keeps its 4 commands. |
| Cast | **Free action:** uses the hero turn, **no question, no fizzle**. MP is always spent. The streak is unchanged. The enemies' block questions that round are asked as usual. |
| Cast limit | **None except MP** (v3.5). No per-battle cap, no unlock, back-to-back allowed. |
| MP regen | **None** (v3.6). MP comes back only at the inn (2 × G, full HP + MP), on waking after a defeat, or from map-only Mana Tea. |
| Bosses | **About 15 correct answers per location boss and 20 per realm boss, even with a full MP bar spent on spells** (v3.7; v3.6 was 20 for both). Boss HP × 1.2–1.9 (location) / × 1.05–1.85 (realm) by tier; boss ATK × 0.8. |
| Damage | `max(1, round(P × (Tired ? 1.5 : 1) − DEF_e))`. P is fixed (no magic stat; decided v3.5). **Full** enemy DEF is subtracted. No streak, spoken or gear bonus. |
| Design rule | `P = round(F × HP_normal(t) + DEF(t))`; `MP = round(K × MP_pool(t))`, with `MP_pool = 10 + 2 × L_rec(t)` and K = 1.25 × the v3.4 K (0.41–0.60). |
| Targets | single / same type (every enemy of the tapped enemy's kind; a boss is its own kind) / all on screen; always max 3. |
| Statuses | Soaked (next attack ×0.5); Dazed / Chilled (chance to skip the next attack; bosses half). **Frozen (Super Blizzard):** non-boss targets skip their next attack (1 turn); **bosses immune** (v3.5). |
| MP potions | Mana Tea 6 × G (+50% MP); Big Mana Tea 15 × G (full MP, town 5+). **Map only** (confirmed v3.5). |
| Magic Ward | **Removed** (v3.5). |
| Animation | About 2–3 s per cast; a tap skips it (sim: 2.5 s). |
| MP hints | **None** (v3.6): no inn or boss-gate tip, no casts-ready count, no Preview boss tip. |
| Blacksmith first | Kept: the shop warns if a purchase would leave less gold than the next town's gear. |
| Elements | Cosmetic (open question). |

### Towns (placeholder names)

| # | town (placeholder) | realm | G (gold per normal kill) | spells sold |
|---|---|---|---|---|
| 1 | 小山村 Village of 小山 | Starter Meadow | 6 | none (Mana Tea + a “coming soon” shelf) |
| 2 | 蜂蜜镇 Honey Town | Honeycomb Forest | 12 | 小火球术, 泡泡术 |
| 3 | 十字路口集市 Crossroads Market | Crossroads Market | 18 | 雪球术, 小闪电术 |
| 4 | 矿工营地 Miner's Camp | Goblin Caves | 27 | 火球术, 旋风术 |
| 5 | 芦苇村 Reed Village | Hydra Swamp | 36 | 雪花术, 闪电术 |
| 6 | 晨光小镇 Dawn Chapel | Zombie Lands | 45 | 阳光术, 大火球术 |
| 7 | 云岭镇 Cloud Ridge | Griffin Peaks | 54 | 暴风雪术, 龙卷风术 |
| 8 | 角斗场镇 Arena Town | Ogre Colosseum | 63 | 流星术, 雷雨术 |
| 9 | 灯火营地 Lantern Light Camp | Demon King's Castle | 72 | 超暴风雪术, 流星雨术 |

## 3. Spell list

| town | spell (简 / 繁 / English) | price (G → gold) | power P | MP (v3.4 → v3.5, unchanged in v3.6) | casts from full MP | dmg vs normal enemy, own tier → t9 | target | element | status |
|---|---|---|---|---|---|---|---|---|---|
| 2 蜂蜜镇 | **小火球术** / 小火球術 / Small Fireball | 60 G → 720 | 20 | 7 → **9** | 2.0 | 67% → 15% | single | fire | – |
| 2 蜂蜜镇 | **泡泡术** / 泡泡術 / Bubble Spell | 45 G → 540 | 11 | 6 → **7** | 2.6 | 33% → 3% | single | water | Soaked: the target's next attack does half damage |
| 3 十字路口集市 | **雪球术** / 雪球術 / Snowball Volley | 60 G → 1,080 | 15 | 9 → **11** | 2.0 | 39% → 8% | same type | ice | – |
| 3 十字路口集市 | **小闪电术** / 小閃電術 / Little Lightning | 75 G → 1,350 | 25 | 9 → **11** | 2.0 | 71% → 22% | single | thunder | Dazed: 25% chance the target skips its next attack (bosses 12.5%) |
| 4 矿工营地 | **火球术** / 火球術 / Fireball | 70 G → 1,890 | 31 | 11 → **14** | 2.0 | 75% → 30% | single | fire | – |
| 4 矿工营地 | **旋风术** / 旋風術 / Whirlwind | 85 G → 2,295 | 20 | 13 → **16** | 1.8 | 44% → 15% | same type | wind | – |
| 5 芦苇村 | **雪花术** / 雪花術 / Snowflake Dance | 90 G → 3,240 | 21 | 15 → **19** | 1.8 | 35% → 16% | all (max 3) | ice | – |
| 5 芦苇村 | **闪电术** / 閃電術 / Lightning Bolt | 75 G → 2,700 | 40 | 14 → **17** | 2.0 | 76% → 42% | single | thunder | Dazed: 30% chance the target skips its next attack (bosses 15%) |
| 6 晨光小镇 | **阳光术** / 陽光術 / Sunbeam | 80 G → 3,600 | 30 | 18 → **22** | 1.8 | 50% → 29% | same type | light | – |
| 6 晨光小镇 | **大火球术** / 大火球術 / Big Fireball | 90 G → 4,050 | 47 | 16 → **20** | 2.0 | 85% → 52% | single | fire | – |
| 7 云岭镇 | **暴风雪术** / 暴風雪術 / Blizzard | 100 G → 5,400 | 30 | 21 → **26** | 1.8 | 40% → 29% | all (max 3) | ice | Chilled: each target 30% chance to skip its next attack (bosses 15%) |
| 7 云岭镇 | **龙卷风术** / 龍捲風術 / Tornado | 85 G → 4,590 | 38 | 21 → **26** | 1.8 | 54% → 40% | same type | wind | – |
| 8 角斗场镇 | **流星术** / 流星術 / Meteor | 90 G → 5,670 | 69 | 21 → **26** | 2.0 | 95% → 82% | single | star | – |
| 8 角斗场镇 | **雷雨术** / 雷雨術 / Thunderstorm | 110 G → 6,930 | 37 | 23 → **29** | 1.8 | 45% → 38% | all (max 3) | thunder | Dazed: each target 30% chance to skip its next attack (bosses 15%) |
| 9 灯火营地 | **超暴风雪术** / 超暴風雪術 / Super Blizzard | 130 G → 9,360 | 42 | 28 → **35** | 1.7 | 45% → 45% | all (max 3) | ice | Frozen: every non-boss target skips its next attack (1 turn); bosses are immune |
| 9 灯火营地 | **流星雨术** / 流星雨術 / Meteor Shower | 120 G → 8,640 | 49 | 28 → **35** | 1.7 | 55% → 55% | all (max 3) | star | – |

**How F and K were set:**
- **F (damage share at the spell's own tier):** single target 0.65 → 0.95 over the game (Bubble Spell 0.35, plus Soaked); same type 0.40 → 0.55; all on screen 0.35 → 0.55.
- **K (MP share of the bar), v3.5:** 0.50 for single target, about 0.56 for crowd spells, 0.60 for the two realm-9 spells, and 0.41 for Bubble Spell.

### 3.1 Fall-off: damage as % of a typical normal enemy's HP

| spell | town | power | target | t2 | t3 | t4 | t5 | t6 | t7 | t8 | t9 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| plain attack (rec. gear, no streak) | – | – | – | 33% | 40% | 44% | 45% | 50% | 50% | 50% | 50% |
| normal enemy HP / DEF | – | – | – | 27 / 2 | 31 / 3 | 36 / 4 | 46 / 5 | 48 / 6 | 57 / 7 | 64 / 8 | 73 / 9 |
| 小火球术 Small Fireball | 2 | 20 | single | 67% | 55% | 44% | 33% | 29% | 23% | 19% | 15% |
| 泡泡术 Bubble Spell | 2 | 11 | single | 33% | 26% | 19% | 13% | 10% | 7% | 5% | 3% |
| 雪球术 Snowball Volley | 3 | 15 | same type (max 3) |  | 39% | 31% | 22% | 19% | 14% | 11% | 8% |
| 小闪电术 Little Lightning | 3 | 25 | single |  | 71% | 58% | 43% | 40% | 32% | 27% | 22% |
| 火球术 Fireball | 4 | 31 | single |  |  | 75% | 57% | 52% | 42% | 36% | 30% |
| 旋风术 Whirlwind | 4 | 20 | same type (max 3) |  |  | 44% | 33% | 29% | 23% | 19% | 15% |
| 雪花术 Snowflake Dance | 5 | 21 | all on screen (max 3) |  |  |  | 35% | 31% | 25% | 20% | 16% |
| 闪电术 Lightning Bolt | 5 | 40 | single |  |  |  | 76% | 71% | 58% | 50% | 42% |
| 阳光术 Sunbeam | 6 | 30 | same type (max 3) |  |  |  |  | 50% | 40% | 34% | 29% |
| 大火球术 Big Fireball | 6 | 47 | single |  |  |  |  | 85% | 70% | 61% | 52% |
| 暴风雪术 Blizzard | 7 | 30 | all on screen (max 3) |  |  |  |  |  | 40% | 34% | 29% |
| 龙卷风术 Tornado | 7 | 38 | same type (max 3) |  |  |  |  |  | 54% | 47% | 40% |
| 流星术 Meteor | 8 | 69 | single |  |  |  |  |  |  | 95% | 82% |
| 雷雨术 Thunderstorm | 8 | 37 | all on screen (max 3) |  |  |  |  |  |  | 45% | 38% |
| 超暴风雪术 Super Blizzard | 9 | 42 | all on screen (max 3) |  |  |  |  |  |  |  | 45% |
| 流星雨术 Meteor Shower | 9 | 49 | all on screen (max 3) |  |  |  |  |  |  |  | 55% |

Every spell starts well above a plain attack in its own realm and falls to about a plain attack 2–3 realms later. Gear raises ATK, but spells don't use it.

### 3.2 MP check per tier

| tier | rec_level | mp_pool | spells_sold_mp | casts_from_full | casts_keeping_heal_12 | casts_at_level_plus_3 | top_spell_pct_of_realm_boss_hp |
|---|---|---|---|---|---|---|---|
| 1 | 2 | 14 | – | – | – | – | – |
| 2 | 4 | 18 | 小火球术 9, 泡泡术 7 | 2.0 | 0.7 | 2.7 | 29% |
| 3 | 6 | 22 | 雪球术 11, 小闪电术 11 | 2.0 | 0.9 | 2.5 | 14% |
| 4 | 9 | 28 | 火球术 14, 旋风术 16 | 1.8 | 1.0 | 2.1 | 14% |
| 5 | 12 | 34 | 雪花术 19, 闪电术 17 | 1.8 | 1.2 | 2.1 | 11% |
| 6 | 15 | 40 | 阳光术 22, 大火球术 20 | 1.8 | 1.3 | 2.1 | 14% |
| 7 | 18 | 46 | 暴风雪术 26, 龙卷风术 26 | 1.8 | 1.3 | 2.0 | 12% |
| 8 | 21 | 52 | 流星术 26, 雷雨术 29 | 1.8 | 1.4 | 2.0 | 13% |
| 9 | 24 | 58 | 超暴风雪术 35, 流星雨术 35 | 1.7 | 1.3 | 1.8 | 13% |

Chinese names: every name is "X + 术" (术 = magic art, the usual kid-fantasy word: 火球术 is what Chinese kids' games call a fireball). They build on curriculum words wherever possible: 雪, 风, 雨, 闪电, 太阳, 星星, 打雷 (雷), 大/小, and 火 (known from 火车). So reading the spell name is itself practice. 阳光, 流星 and 泡泡 aren't in the curriculum, but they're transparent compounds of known characters, or very common kid words. 超 and 暴 are the hardest characters. 超暴风雪术 is Jack's own example.

| spell | characters with HSK 3.0 level (word it is learned in) |
|---|---|
| 小火球术 | 小 1 · 火 3 · 球 1 · 术 (技术, 3) |
| 泡泡术 | 泡 6 · 术 (技术, 3) |
| 雪球术 | 雪 2 · 球 1 · 术 (技术, 3) |
| 小闪电术 | 小 1 · 闪 4 · 电 1 · 术 (技术, 3) |
| 火球术 | 火 3 · 球 1 · 术 (技术, 3) |
| 旋风术 | 旋 (旋转, 6) · 风 1 · 术 (技术, 3) |
| 雪花术 | 雪 2 · 花 1 · 术 (技术, 3) |
| 闪电术 | 闪 4 · 电 1 · 术 (技术, 3) |
| 阳光术 | 阳 (太阳, 2) · 光 3 · 术 (技术, 3) |
| 大火球术 | 大 1 · 火 3 · 球 1 · 术 (技术, 3) |
| 暴风雪术 | 暴 (暴风雨, 6) · 风 1 · 雪 2 · 术 (技术, 3) |
| 龙卷风术 | 龙 3 · 卷 4 · 风 1 · 术 (技术, 3) |
| 流星术 | 流 2 · 星 (星期, 1) · 术 (技术, 3) |
| 雷雨术 | 雷 (打雷, 4) · 雨 1 · 术 (技术, 3) |
| 超暴风雪术 | 超 6 · 暴 (暴风雨, 6) · 风 1 · 雪 2 · 术 (技术, 3) |
| 流星雨术 | 流 2 · 星 (星期, 1) · 雨 1 · 术 (技术, 3) |

### Visual briefs for Arty

Painterly, kid-safe, no gore and no burning or injured bodies. Hits are puffs, sparkles and comic reactions. Keep flashes under the flash-safety limit (no more than 3 per second, no full-screen red).
- **Cast animations:** about 2–3 s each, and a tap skips them (v3.5).
- **No casts-ready count** (v3.6): the Spellbook shows each spell's MP cost and the MP bar, but not "×2", and the boss gate shows nothing about MP.

| spell | visual brief for Arty |
|---|---|
| 小火球术 Small Fireball | A plum-sized orange fireball with a curly tail of sparks, thrown from the wand tip. On hit: a warm puff of orange light and a few floating embers. No scorch marks, nothing burns. |
| 泡泡术 Bubble Spell | A stream of shiny rainbow soap bubbles that wraps the enemy in a big wobbly bubble for a moment; when it pops the enemy is dripping and grumpy, with a little water cloud over its head. |
| 雪球术 Snowball Volley | Fluffy snowballs pop out of the air and pelt every enemy of the chosen kind; soft white bursts and a sprinkle of snowflakes. Enemies shiver comically. |
| 小闪电术 Little Lightning | A small zig-zag bolt from a palm-sized storm cloud; yellow flash, the target's fur/hair stands up and little stars circle its head when dazed. |
| 火球术 Fireball | A melon-sized fireball with a bright yellow core and a spiral trail; a round orange flash and a ring of sparks on impact. |
| 旋风术 Whirlwind | A green-white spinning gust with leaves in it that lifts every enemy of the chosen kind, spins them like tops and drops them dizzy. |
| 雪花术 Snowflake Dance | Big sparkling snowflakes swirl across the whole screen and tap each enemy (max 3) with a soft chime; frost glitter on their shoulders. |
| 闪电术 Lightning Bolt | A tall bright bolt from a dark-blue cloud; screen flashes white for a frame (keep under the flash-safety limit), target gets spiky hair and circling stars. |
| 阳光术 Sunbeam | Golden sunbeams break through grey clouds onto every enemy of the chosen kind; zombies/skeletons sneeze and look a bit more cheerful (ties to the "cured by kind words" theme). |
| 大火球术 Big Fireball | A big round fireball with a smiling glow that grows above the hero before it is thrown; big orange burst with confetti-like sparks. |
| 暴风雪术 Blizzard | A sideways snowstorm sweeps over all enemies (max 3); they get snow hats and icicle eyebrows when chilled. Blue-white palette, soft wind sound. |
| 龙卷风术 Tornado | A tall friendly-looking tornado (with leaves, feathers and a lost hat) gathers every enemy of the chosen kind, spins them up and plops them down. |
| 流星术 Meteor | A shooting star with a long rainbow tail falls on one enemy; a starburst flash and tiny stars bouncing off. No crater. |
| 雷雨术 Thunderstorm | A small storm cloud rains on all enemies (max 3) with friendly zig-zag bolts; puddles form under them and they hop around. |
| 超暴风雪术 Super Blizzard | The screen fills with a huge swirling snowstorm and a giant snowflake emblem; every enemy (max 3) is briefly frozen in a clear ice cube with a surprised face, then pops out. |
| 流星雨术 Meteor Shower | The sky turns deep violet and a shower of colourful shooting stars rains on all enemies (max 3); each hit makes a star-shaped sparkle. |

## 4. MP potions (expensive, map-only)

| item_id | name_zh | name_en | effect | price | price_in_normal_kills | from_town | battle_use |
|---|---|---|---|---|---|---|---|
| mana_tea | 魔力茶 | Mana Tea | +50% max MP | 6 × G | 6 | 1 | no (map only) |
| big_mana_tea | 大魔力茶 | Big Mana Tea | refills MP to full | 15 × G | 15 | 5 | no (map only) |

- **In kills:** Mana Tea = 6 normal kills; Big Mana Tea = 15. For comparison, the inn costs 2 × G for full HP + MP.
- **Kept map-only (no in-battle MP potions):**
  - A kid who saves MP and also drinks tea at the boss gate reaches the boss at 89–99% MP, but gains at most about 0.15 casts per boss over saving alone (v3.6).
  - In-battle potions would allow drink-cast-drink chains, which turn potion turns into question-free damage.
- **Cost of the tea habit (v3.6):** 3,500–6,100 gold per run for a 65–90% saver, about 1,500 at 50% accuracy, and up to 6,600 for a 90% kid who spends freely and refills with tea.

## 5. Cast limit, Ward, streak, and skills

**No cast caps (Jack, v3.5).**
- The cap is replaced by price: MP costs 1.25 × v3.4.
- v3.6: with no regen, a full bar is the whole budget for a fight. Spell costs stay at 1.25 × v3.4; the boss target is met with boss HP instead.

**Magic Ward: removed (Jack, v3.5).**

**No streak bonus for spells:** kept. A cast has no answer, so it neither adds to nor breaks the streak.

**Freeze (v3.5):** Super Blizzard freezes non-boss targets for 1 turn, and bosses are immune. Freeze also skips the kid's block question for that enemy, so keeping it off bosses avoids long question-free stretches in boss fights.

| existing | interaction |
|---|---|
| Attack | Still most turns (≥ 75% of hero turns in every profile and battle type). |
| Insight 提示 | Unchanged (MC questions only). |
| Guardian Shield 守护盾 (8 MP, auto) | Unchanged. It fires automatically and spends MP that no longer regenerates (v3.6). The kid model keeps 8 MP for it until it has fired. |
| Heal 治疗 (12 MP) | Unchanged. The kid model keeps 12 MP for Heal when HP is under 50%, and goes back to the inn when MP is under Heal's cost and HP under 70%. Without regen, heals per battle drop a little (50% saver 0.41 → 0.34) and defeats don't rise. |
| Frost 冰冻 / Sweep 横扫 | Attack modifiers that ask a question; they can't be combined with a spell on the same turn. In the v3.6 sim they keep 20 MP (Heal + Shield) in reserve. |
| Second Wind 再起 | Unchanged. The kid model keeps 20 MP for it in realm 9. |
| 50% spoken cap / 4-way selection | Unchanged. Casts aren't questions. |

## 6. Quests (unchanged from v3.3)

Each town has a quest board 任务板 with 4 one-time quests. Only change in v3.4: the words quest's Mana Tea is now worth 6 × G, so a realm's board is worth about 35 × G instead of about 30 × G. Quests don't interact with casting, so nothing else needed to change.

| town | bounty | collect | words | delivery | board total |
|---|---|---|---|---|---|
| 1 小山村 | 打败8只角兔 (Defeat 8 × Horned Rabbit): 36g + honey potion | 收集5个小蘑菇 (Collect 5 little mushrooms): 48g | 学会15个新词 (Get 15 words of this realm Ready): 60g + mana tea | 把信送到蜂蜜镇 (Deliver a letter to Honey Town): 36g + return feather | 180g |
| 2 蜂蜜镇 | 打败8只巨蜂 (Defeat 8 × Giant Bee): 72g + honey potion | 收集5根蜘蛛丝 (Collect 5 strands of spider silk): 96g | 学会15个新词 (Get 15 words of this realm Ready): 120g + mana tea | 把信送到十字路口集市 (Deliver a letter to Crossroads Market): 72g + return feather | 360g |
| 3 十字路口集市 | 打败8个山贼 (Defeat 8 × Road Bandit): 108g + honey potion | 收集5块果冻 (Collect 5 jelly blobs): 144g | 学会15个新词 (Get 15 words of this realm Ready): 180g + mana tea | 把信送到矿工营地 (Deliver a letter to Miner's Camp): 108g + return feather | 540g |
| 4 矿工营地 | 打败8只洞穴蝙蝠 (Defeat 8 × Cave Bat): 162g + honey potion | 收集5个小铃铛 (Collect 5 little bells): 216g | 学会15个新词 (Get 15 words of this realm Ready): 270g + mana tea | 把信送到芦苇村 (Deliver a letter to Reed Village): 162g + return feather | 810g |
| 5 芦苇村 | 打败8只沼泽怪 (Defeat 8 × Bog Monster): 216g + honey potion | 收集5片闪亮鳞片 (Collect 5 shiny shed scales): 288g | 学会15个新词 (Get 15 words of this realm Ready): 360g + mana tea | 把信送到晨光小镇 (Deliver a letter to Dawn Chapel): 216g + return feather | 1,080g |
| 6 晨光小镇 | 打败8个丧尸 (Defeat 8 × Zombie): 270g + honey potion | 收集5顶旧帽子 (Collect 5 old hats): 360g | 学会15个新词 (Get 15 words of this realm Ready): 450g + mana tea | 把信送到云岭镇 (Deliver a letter to Cloud Ridge): 270g + return feather | 1,350g |
| 7 云岭镇 | 打败8只鹰身女妖 (Defeat 8 × Harpy): 324g + honey potion | 收集5根羽毛 (Collect 5 feathers): 432g | 学会15个新词 (Get 15 words of this realm Ready): 540g + mana tea | 把信送到角斗场镇 (Deliver a letter to Arena Town): 324g + return feather | 1,620g |
| 8 角斗场镇 | 打败8个巨魔 (Defeat 8 × Arena Troll): 378g + honey potion | 收集5块铜奖牌 (Collect 5 bronze medals): 504g | 学会15个新词 (Get 15 words of this realm Ready): 630g + mana tea | 把信送到灯火营地 (Deliver a letter to Lantern Light Camp): 378g + return feather | 1,890g |
| 9 灯火营地 | 打败8个小恶魔 (Defeat 8 × Imp): 432g + honey potion | 收集5颗暗影水晶 (Collect 5 shadow crystals): 576g | 学会15个新词 (Get 15 words of this realm Ready): 720g + mana tea | 把信送到小山村 (Deliver a letter to Village of 小山): 432g + cosmetic: postman cap | 2,160g |

| spell | town | price | = normal kills at that town | that town's quests pay | kills if all quests done | normal fights | minutes at realm pace |
|---|---|---|---|---|---|---|---|
| 小火球术 Small Fireball | 2 | 720 | 60 | 324 | 33 | 31 | 77 |
| 泡泡术 Bubble Spell | 2 | 540 | 45 | 324 | 18 | 23 | 58 |
| 雪球术 Snowball Volley | 3 | 1080 | 60 | 504 | 32 | 25 | 73 |
| 小闪电术 Little Lightning | 3 | 1350 | 75 | 504 | 47 | 31 | 91 |
| 火球术 Fireball | 4 | 1890 | 70 | 756 | 42 | 24 | 76 |
| 旋风术 Whirlwind | 4 | 2295 | 85 | 756 | 57 | 29 | 92 |
| 雪花术 Snowflake Dance | 5 | 3240 | 90 | 1026 | 62 | 30 | 97 |
| 闪电术 Lightning Bolt | 5 | 2700 | 75 | 1026 | 46 | 25 | 81 |
| 阳光术 Sunbeam | 6 | 3600 | 80 | 1296 | 51 | 23 | 84 |
| 大火球术 Big Fireball | 6 | 4050 | 90 | 1296 | 61 | 26 | 95 |
| 暴风雪术 Blizzard | 7 | 5400 | 100 | 1566 | 71 | 29 | 108 |
| 龙卷风术 Tornado | 7 | 4590 | 85 | 1566 | 56 | 25 | 92 |
| 流星术 Meteor | 8 | 5670 | 90 | 1836 | 61 | 26 | 96 |
| 雷雨术 Thunderstorm | 8 | 6930 | 110 | 1836 | 81 | 32 | 117 |
| 超暴风雪术 Super Blizzard | 9 | 9360 | 130 | 2106 | 101 | 38 | 135 |
| 流星雨术 Meteor Shower | 9 | 8640 | 120 | 2106 | 91 | 35 | 125 |

(Kills = price ÷ G. Fights and minutes use the 75% saver's gold and minutes per fight in that realm.)


## 7. Sim results (v3.7)

**Model:**
- Same campaign sim: realms 1–9 in a row, 150 runs per row, gear tiers, skills, inns, the Blacksmith-first nudge, and the saver/spender gold profiles.
- v3.6 rules (no MP regen, boss ATK × 0.8, no hints) with the v3.7 boss HP (location ~15, realm ~20 correct answers). The comparison is with the archived v3.6 run (`build/v3/archive_v3_6/`, same code and seeds); v3.5 → v3.6 is in `build/v3/archive_v3_6/spells-v3.6.md`.

**MP styles** (kid habits; nothing in the game suggests them):
- **free:** casts in every fight whenever a spell beats an attack.
- **save:** in normal fights, keeps MP for 2 casts of its strongest spell; casts freely in elite and boss fights; goes back to the inn before a boss if MP is under 60%.
- **save+tea:** like save, plus it keeps a Mana Tea in stock (Big Mana Tea from town 5) and drinks it at the boss gate.
- **free+tea:** like free, plus the tea.

**Other rows:** "far gate": the kid goes back to the inn before a boss only below 50% HP (default: below 80%).

### 7.1 Boss target: correct answers per boss, full-MP spells vs no spells

One boss fight from full HP and full MP at the recommended level, with full gear and the 2 strongest spells of towns t and t−1. "Full-MP spells" = every MP point spent on spells (no Heal reserve); "no spells" = attacks only. Won fights only; correct answers = hero + block answers. 600 fights per cell.

| tier | boss | HP v3.5 -> v3.7 (mult) | ATK v3.5 -> v3.7 | 75%: correct no spells / full-MP spells | 75%: casts | 75%: questions no spells / spells | 50%: correct no spells / spells | 50%: win no spells / spells | 90%: correct no spells / spells |
|---|---|---|---|---|---|---|---|---|---|
| 1 | location | 28 -> 34 (x1.2) | 5 -> 4 | 15.3 / 15.4 | 0.0 | 20.4 / 20.5 | 13.6 / 13.8 | 1.00 / 1.00 | 14.9 / 14.9 |
| 1 | realm | 38 -> 57 (x1.5) | 5 -> 4 | 20.1 / 20.0 | 0.0 | 27.0 / 26.7 | 17.8 / 17.9 | 1.00 / 1.00 | 18.5 / 18.6 |
| 2 | location | 45 -> 70 (x1.55) | 10 -> 8 | 17.4 / 15.4 | 1.5 | 23.2 / 20.8 | 15.5 / 13.4 | 1.00 / 1.00 | 16.5 / 15.4 |
| 2 | realm | 63 -> 104 (x1.65) | 10 -> 8 | 21.8 / 19.8 | 1.6 | 28.9 / 26.4 | 20.1 / 17.8 | 1.00 / 0.99 | 20.0 / 19.2 |
| 3 | location | 62 -> 118 (x1.9) | 14 -> 11 | 19.3 / 15.4 | 1.6 | 26.1 / 20.6 | 17.9 / 14.1 | 0.99 / 1.00 | 17.9 / 14.8 |
| 3 | realm | 88 -> 163 (x1.85) | 16 -> 13 | 23.6 / 19.6 | 1.6 | 31.3 / 26.1 | 22.5 / 18.7 | 0.90 / 0.96 | 21.2 / 17.9 |
| 4 | location | 80 -> 136 (x1.7) | 19 -> 15 | 16.7 / 15.0 | 1.6 | 22.3 / 20.1 | 15.7 / 13.4 | 0.99 / 1.00 | 15.4 / 14.4 |
| 4 | realm | 112 -> 118 (x1.05) | 21 -> 17 | 21.0 / 20.1 | 1.5 | 28.0 / 26.9 | 19.5 / 18.0 | 0.85 / 0.78 | 19.8 / 20.4 |
| 5 | location | 102 -> 189 (x1.85) | 24 -> 19 | 17.9 / 15.2 | 1.6 | 24.2 / 20.3 | 17.0 / 13.9 | 0.99 / 0.99 | 16.1 / 14.6 |
| 5 | realm | 144 -> 173 (x1.2) | 26 -> 21 | 22.6 / 19.7 | 1.5 | 30.0 / 26.5 | 21.3 / 18.3 | 0.78 / 0.80 | 20.6 / 18.5 |
| 6 | location | 120 -> 216 (x1.8) | 29 -> 23 | 16.5 / 15.0 | 1.6 | 21.9 / 20.0 | 15.7 / 13.9 | 0.99 / 1.00 | 15.4 / 14.7 |
| 6 | realm | 168 -> 185 (x1.1) | 31 -> 25 | 20.4 / 19.9 | 1.4 | 26.8 / 26.7 | 19.0 / 17.9 | 0.87 / 0.84 | 19.4 / 19.8 |
| 7 | location | 142 -> 241 (x1.7) | 34 -> 27 | 17.0 / 15.0 | 1.6 | 22.6 / 19.9 | 15.6 / 13.8 | 1.00 / 1.00 | 16.3 / 14.7 |
| 7 | realm | 200 -> 280 (x1.4) | 36 -> 29 | 23.9 / 19.7 | 1.4 | 31.9 / 26.1 | 22.5 / 18.0 | 0.70 / 0.92 | 22.2 / 18.6 |
| 8 | location | 160 -> 296 (x1.85) | 38 -> 30 | 17.8 / 15.1 | 1.6 | 23.7 / 20.2 | 16.7 / 13.8 | 1.00 / 1.00 | 16.4 / 14.6 |
| 8 | realm | 224 -> 246 (x1.1) | 42 -> 34 | 21.4 / 19.4 | 1.4 | 28.6 / 26.1 | 20.0 / 17.7 | 0.78 / 0.77 | 20.4 / 19.5 |
| 9 | location | 182 -> 346 (x1.9) | 43 -> 34 | 17.7 / 14.8 | 1.0 | 23.5 / 19.8 | 16.6 / 13.8 | 1.00 / 1.00 | 16.1 / 14.2 |
| 9 | realm | 256 -> 397 (x1.55) | 47 -> 38 | 24.9 / 19.8 | 1.0 | 33.1 / 26.4 | 24.3 / 18.4 | 0.62 / 0.88 | 22.8 / 18.2 |

The same numbers are in `data/boss_hp.csv` (spec §2.3). "50%: win" is a single fight with no retry; in the campaign, bosses also have the 50% checkpoint and retries.

### 7.2 Key comparison, v3.6 → v3.7

| kid, accuracy | playthrough h: v3.6 free → v3.7 none / free / save | defeat %: v3.6 free / save → v3.7 none / free / save | boss 1st-try: v3.6 free → v3.7 free / save | boss questions: v3.6 free → v3.7 none / free / save | q share n / e / b: v3.6 free → v3.7 free → v3.7 save | min by realm n / e / b (v3.7 free; save) | hero turns cast n / b: v3.6 free → v3.7 free → v3.7 save | MP at boss start: v3.6 free → v3.7 free / save / save+tea |
|---|---|---|---|---|---|---|---|---|
| saver 75% | 18.2 → 18.0 / 17.9 / 17.9 | 0.0 / 0.0 → 0.0 / 0.0 / 0.0 | 1.00 → 1.00 / 1.00 | 30.0 → 27.5 / 26.1 / 26.0 | 0.949 → 0.949 → 0.991 / 0.958 → 0.959 → 0.958 / 0.965 → 0.962 → 0.955 | 0.926 / 0.935 / 0.925; 0.988 / 0.936 / 0.914 | 13.1% → 13.0% → 0.0% / 7.1% → 8.4% → 9.9% | 89% → 89% / 94% / 96% |
| spender 75% | 12.8 → 12.9 / 12.6 / 12.8 | 0.1 / 0.1 → 0.1 / 0.1 / 0.1 | 1.00 → 1.00 / 1.00 | 30.4 → 27.3 / 27.0 / 26.8 | 0.971 → 0.970 → 0.990 / 0.975 → 0.975 → 0.974 / 0.982 → 0.982 → 0.980 | 0.937 / 0.956 / 0.962; 0.987 / 0.950 / 0.956 | 6.1% → 6.2% → 0.0% / 3.1% → 3.4% → 4.0% | 88% → 88% / 92% / 93% |
| saver 65% | 20.9 → 20.7 / 20.8 / 20.6 | 0.2 / 0.7 → 0.8 / 0.2 / 0.6 | 1.00 → 1.00 / 1.00 | 34.0 → 31.2 / 29.7 / 29.3 | 0.935 → 0.934 → 0.982 / 0.944 → 0.943 → 0.949 / 0.957 → 0.955 → 0.953 | 0.904 / 0.911 / 0.918; 0.975 / 0.924 / 0.916 | 15.1% → 15.2% → 0.0% / 6.8% → 8.0% → 8.4% | 94% → 94% / 97% / 98% |
| saver 50% | 27.2 → 26.9 / 26.9 / 26.9 | 8.6 / 9.5 → 9.4 / 8.3 / 9.2 | 0.92 → 0.93 / 0.93 | 39.2 → 36.0 / 35.2 / 35.1 | 0.958 → 0.957 → 0.972 / 0.956 → 0.954 → 0.957 / 0.966 → 0.966 → 0.965 | 0.917 / 0.921 / 0.938; 0.962 / 0.926 / 0.937 | 4.4% → 4.6% → 0.2% / 2.2% → 2.8% → 2.8% | 98% → 98% / 99% / 99% |
| spender 50% | 18.6 → 18.3 / 18.3 / 18.3 | 22.6 / 22.6 → 22.0 / 22.0 / 22.0 | 0.61 → 0.70 / 0.70 | 34.6 → 32.1 / 32.1 / 32.1 | 0.990 → 0.990 → 0.990 / 0.993 → 0.993 → 0.993 / 0.996 → 0.996 → 0.996 | 0.988 / 0.982 / 0.987; 0.988 / 0.982 / 0.987 | 0.0% → 0.0% → 0.0% / 0.0% → 0.0% → 0.0% | 99% → 98% / 98% / 98% |
| saver 90% | 15.1 → 14.9 / 14.9 / 14.8 | 0.0 / 0.0 → 0.0 / 0.0 / 0.0 | 1.00 → 1.00 / 1.00 | 23.7 → 21.6 / 21.0 / 20.8 | 0.972 → 0.973 → 0.999 / 0.979 → 0.977 → 0.971 / 0.969 → 0.966 → 0.953 | 0.960 / 0.965 / 0.937; 0.998 / 0.950 / 0.923 | 7.8% → 7.8% → 0.0% / 7.5% → 8.4% → 11.6% | 74% → 72% / 89% / 94% |
| spender 90% | 11.2 → 11.2 / 11.1 / 11.2 | 0.0 / 0.0 → 0.0 / 0.0 / 0.0 | 1.00 → 1.00 / 1.00 | 23.9 → 21.6 / 21.3 / 21.2 | 0.981 → 0.981 → 0.999 / 0.985 → 0.984 → 0.982 / 0.982 → 0.981 → 0.968 | 0.961 / 0.965 / 0.955; 0.997 / 0.958 / 0.915 | 5.3% → 5.3% → 0.0% / 4.2% → 4.6% → 7.8% | 69% → 68% / 86% / 88% |

### 7.3 Question share, cast share, hours and defeats by profile, v3.7 vs v3.6

| kid | style | v3.6 q share n / e / b | v3.7 q share n / e / b | v3.7 min by tier n / e / b | v3.6 hero turns cast n / b | v3.7 hero turns cast n / e / b | v3.7 casts per battle n / e / b | v3.6 / v3.7 h | v3.6 / v3.7 defeat % | v3.6 / v3.7 boss q | flag |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 50% saver | no spells | 0.973 / 0.968 / 0.975 | 0.972 / 0.968 / 0.977 | 0.966 / 0.963 / 0.971 | 0.0% / 0.0% | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 27.1 / 26.9 | 9.7% / 9.4% | 40.1 / 36.0 | - |
| 50% saver | free | 0.958 / 0.956 / 0.966 | 0.957 / 0.954 / 0.966 | 0.917 / 0.921 / 0.938 | 4.4% / 2.2% | 4.6% / 3.6% / 2.8% | 0.32 / 0.33 / 0.40 | 27.2 / 26.9 | 8.6% / 8.3% | 39.2 / 35.2 | - |
| 50% saver | save | 0.972 / 0.958 / 0.966 | 0.972 / 0.957 / 0.965 | 0.962 / 0.926 / 0.937 | 0.2% / 2.3% | 0.2% / 2.9% / 2.8% | 0.01 / 0.27 / 0.40 | 27.1 / 26.9 | 9.5% / 9.2% | 39.2 / 35.1 | - |
| 50% saver | save+tea | 0.972 / 0.958 / 0.966 | 0.972 / 0.956 / 0.966 | 0.962 / 0.927 / 0.936 | 0.2% / 2.3% | 0.2% / 3.0% / 2.8% | 0.01 / 0.28 / 0.40 | 27.1 / 26.9 | 9.5% / 9.3% | 39.2 / 35.1 | - |
| 50% spender | no spells | 0.990 / 0.993 / 0.996 | 0.990 / 0.993 / 0.996 | 0.988 / 0.982 / 0.987 | 0.0% / 0.0% | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 18.6 / 18.3 | 22.6% / 22.0% | 34.6 / 32.1 | - |
| 50% spender | free | 0.990 / 0.993 / 0.996 | 0.990 / 0.993 / 0.996 | 0.988 / 0.982 / 0.987 | 0.0% / 0.0% | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 18.6 / 18.3 | 22.6% / 22.0% | 34.6 / 32.1 | - |
| 50% spender | save | 0.990 / 0.993 / 0.996 | 0.990 / 0.993 / 0.996 | 0.988 / 0.982 / 0.987 | 0.0% / 0.0% | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 18.6 / 18.3 | 22.6% / 22.0% | 34.6 / 32.1 | - |
| 50% spender | save+tea | 0.990 / 0.993 / 0.996 | 0.990 / 0.993 / 0.996 | 0.988 / 0.982 / 0.987 | 0.0% / 0.0% | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 18.6 / 18.3 | 22.6% / 22.0% | 34.6 / 32.1 | - |
| 65% saver | no spells | 0.981 / 0.977 / 0.988 | 0.981 / 0.977 / 0.989 | 0.975 / 0.967 / 0.983 | 0.0% / 0.0% | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 20.9 / 20.7 | 0.7% / 0.8% | 35.5 / 31.2 | - |
| 65% saver | free | 0.935 / 0.944 / 0.957 | 0.934 / 0.943 / 0.955 | 0.904 / 0.911 / 0.918 | 15.1% / 6.8% | 15.2% / 9.7% / 8.0% | 0.89 / 0.80 / 1.00 | 20.9 / 20.8 | 0.2% / 0.2% | 34.0 / 29.7 | - |
| 65% saver | save | 0.982 / 0.948 / 0.957 | 0.982 / 0.949 / 0.953 | 0.975 / 0.924 / 0.916 | 0.0% / 7.0% | 0.0% / 7.5% / 8.4% | 0.00 / 0.62 / 1.05 | 20.8 / 20.6 | 0.7% / 0.6% | 33.9 / 29.3 | - |
| 65% saver | save+tea | 0.982 / 0.949 / 0.957 | 0.982 / 0.950 / 0.954 | 0.975 / 0.922 / 0.921 | 0.0% / 7.1% | 0.0% / 7.3% / 8.5% | 0.00 / 0.61 / 1.07 | 20.8 / 20.6 | 0.6% / 0.7% | 34.0 / 29.4 | - |
| 65% spender | no spells | 0.988 / 0.990 / 0.995 | 0.988 / 0.989 / 0.996 | 0.984 / 0.983 / 0.989 | 0.0% / 0.0% | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 14.5 / 14.3 | 3.5% / 3.4% | 34.9 / 30.9 | - |
| 65% spender | free | 0.984 / 0.986 / 0.992 | 0.983 / 0.984 / 0.991 | 0.971 / 0.974 / 0.980 | 1.2% / 0.6% | 1.5% / 1.2% / 1.0% | 0.10 / 0.10 / 0.13 | 14.4 / 14.1 | 3.1% / 3.1% | 34.7 / 30.6 | - |
| 65% spender | save | 0.988 / 0.986 / 0.992 | 0.988 / 0.986 / 0.991 | 0.984 / 0.978 / 0.980 | 0.0% / 0.7% | 0.0% / 1.1% / 1.0% | 0.00 / 0.09 / 0.13 | 14.5 / 14.3 | 3.3% / 3.4% | 34.8 / 30.6 | - |
| 65% spender | save+tea | 0.988 / 0.987 / 0.992 | 0.988 / 0.986 / 0.991 | 0.984 / 0.979 / 0.980 | 0.0% / 0.7% | 0.0% / 1.0% / 1.0% | 0.00 / 0.09 / 0.13 | 14.5 / 14.3 | 3.4% / 3.5% | 34.8 / 30.6 | - |
| 75% saver | no spells | 0.991 / 0.988 / 0.996 | 0.991 / 0.988 / 0.996 | 0.987 / 0.981 / 0.992 | 0.0% / 0.0% | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 18.1 / 18.0 | 0.0% / 0.0% | 31.1 / 27.5 | - |
| 75% saver | free | 0.949 / 0.958 / 0.965 | 0.949 / 0.959 / 0.962 | 0.926 / 0.935 / 0.925 | 13.1% / 7.1% | 13.0% / 8.2% / 8.4% | 0.70 / 0.61 / 0.94 | 18.2 / 17.9 | 0.0% / 0.0% | 30.0 / 26.1 | - |
| 75% saver | save | 0.991 / 0.957 / 0.960 | 0.991 / 0.958 / 0.955 | 0.988 / 0.936 / 0.914 | 0.0% / 8.5% | 0.0% / 8.1% / 9.9% | 0.00 / 0.61 / 1.10 | 18.1 / 17.9 | 0.0% / 0.0% | 29.6 / 26.0 | - |
| 75% saver | save+tea | 0.991 / 0.960 / 0.960 | 0.991 / 0.958 / 0.955 | 0.988 / 0.937 / 0.920 | 0.0% / 8.4% | 0.0% / 8.0% / 9.9% | 0.00 / 0.60 / 1.11 | 18.0 / 17.9 | 0.0% / 0.0% | 29.8 / 26.0 | - |
| 75% saver | free+tea | 0.949 / 0.959 / 0.962 | 0.949 / 0.958 / 0.958 | 0.926 / 0.933 / 0.920 | 12.9% / 7.9% | 12.9% / 8.3% / 9.2% | 0.69 / 0.63 / 1.04 | 18.2 / 18.0 | 0.0% / 0.0% | 29.7 / 26.2 | - |
| 75% spender | no spells | 0.990 / 0.988 / 0.996 | 0.990 / 0.989 / 0.996 | 0.986 / 0.985 / 0.994 | 0.0% / 0.0% | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 13.1 / 12.9 | 0.1% / 0.1% | 30.8 / 27.3 | - |
| 75% spender | free | 0.971 / 0.975 / 0.982 | 0.970 / 0.975 / 0.982 | 0.937 / 0.956 / 0.962 | 6.1% / 3.1% | 6.2% / 3.7% / 3.4% | 0.34 / 0.28 / 0.38 | 12.8 / 12.6 | 0.1% / 0.1% | 30.4 / 27.0 | - |
| 75% spender | save | 0.991 / 0.974 / 0.981 | 0.990 / 0.974 / 0.980 | 0.987 / 0.950 / 0.956 | 0.0% / 3.5% | 0.0% / 3.8% / 4.0% | 0.00 / 0.29 / 0.46 | 13.0 / 12.8 | 0.1% / 0.1% | 30.3 / 26.8 | - |
| 75% spender | save+tea | 0.990 / 0.975 / 0.982 | 0.990 / 0.975 / 0.980 | 0.987 / 0.950 / 0.956 | 0.0% / 3.3% | 0.0% / 3.4% / 3.8% | 0.00 / 0.26 / 0.44 | 13.0 / 12.8 | 0.1% / 0.1% | 30.5 / 27.0 | - |
| 75% spender | free+tea | 0.971 / 0.976 / 0.981 | 0.971 / 0.976 / 0.980 | 0.937 / 0.955 / 0.954 | 6.0% / 3.3% | 6.1% / 3.5% / 3.9% | 0.34 / 0.27 / 0.44 | 12.8 / 12.6 | 0.1% / 0.1% | 30.6 / 26.9 | - |
| 90% saver | no spells | 0.999 / 0.999 / 1.000 | 0.999 / 0.999 / 1.000 | 0.998 / 0.997 / 0.999 | 0.0% / 0.0% | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 15.0 / 14.9 | 0.0% / 0.0% | 24.3 / 21.6 | - |
| 90% saver | free | 0.972 / 0.979 / 0.969 | 0.973 / 0.977 / 0.966 | 0.960 / 0.965 / 0.937 | 7.8% / 7.5% | 7.8% / 5.9% / 8.4% | 0.36 / 0.37 / 0.74 | 15.1 / 14.9 | 0.0% / 0.0% | 23.7 / 21.0 | - |
| 90% saver | save | 0.999 / 0.973 / 0.958 | 0.999 / 0.971 / 0.953 | 0.998 / 0.950 / 0.923 | 0.0% / 10.2% | 0.0% / 7.5% / 11.6% | 0.00 / 0.47 / 1.03 | 15.0 / 14.8 | 0.0% / 0.0% | 23.5 / 20.8 | - |
| 90% saver | save+tea | 0.999 / 0.972 / 0.953 | 0.999 / 0.973 / 0.948 | 0.998 / 0.953 / 0.910 | 0.0% / 11.4% | 0.0% / 7.0% / 12.9% | 0.00 / 0.44 / 1.14 | 15.0 / 14.8 | 0.0% / 0.0% | 23.5 / 20.8 | - |
| 90% saver | free+tea | 0.972 / 0.979 / 0.957 | 0.972 / 0.979 / 0.953 | 0.959 / 0.968 / 0.913 | 7.9% / 10.2% | 7.8% / 5.5% / 11.5% | 0.36 / 0.35 / 1.02 | 15.1 / 14.9 | 0.0% / 0.0% | 23.7 / 21.0 | - |
| 90% spender | no spells | 0.999 / 0.999 / 1.000 | 0.999 / 0.999 / 1.000 | 0.997 / 0.997 / 0.999 | 0.0% / 0.0% | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 11.3 / 11.2 | 0.0% / 0.0% | 24.3 / 21.6 | - |
| 90% spender | free | 0.981 / 0.985 / 0.982 | 0.981 / 0.984 / 0.981 | 0.961 / 0.965 / 0.955 | 5.3% / 4.2% | 5.3% / 4.0% / 4.6% | 0.25 / 0.25 / 0.41 | 11.2 / 11.1 | 0.0% / 0.0% | 23.9 / 21.3 | - |
| 90% spender | save | 0.999 / 0.981 / 0.972 | 0.999 / 0.982 / 0.968 | 0.997 / 0.958 / 0.915 | 0.0% / 6.7% | 0.0% / 4.4% / 7.8% | 0.00 / 0.28 / 0.69 | 11.3 / 11.2 | 0.0% / 0.0% | 23.8 / 21.2 | - |
| 90% spender | save+tea | 0.999 / 0.984 / 0.974 | 0.999 / 0.984 / 0.972 | 0.997 / 0.959 / 0.941 | 0.0% / 6.2% | 0.0% / 4.0% / 6.9% | 0.00 / 0.26 / 0.62 | 11.3 / 11.2 | 0.0% / 0.0% | 23.9 / 21.4 | - |
| 90% spender | free+tea | 0.983 / 0.987 / 0.976 | 0.983 / 0.986 / 0.973 | 0.962 / 0.972 / 0.942 | 4.7% / 5.8% | 4.6% / 3.3% / 6.5% | 0.22 / 0.21 / 0.58 | 11.3 / 11.2 | 0.0% / 0.0% | 24.1 / 21.5 | - |

### 7.3b Does saving MP pay off?

| acc | kid | style | boss 1st-try | boss q | boss HP lost | MP at boss start | casts per boss battle | normal q | defeat % | tea gold per run | playthrough h |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 50% | saver | no spells | 0.928 | 36.8 | 58% | 98% | 0.00 | 20.9 | 9.4% | 0 | 26.9 |
| 50% | saver | v3.7 free | 0.920 | 35.8 | 61% | 98% | 0.46 | 20.4 | 8.3% | 0 | 26.9 |
| 50% | saver | v3.7 save | 0.920 | 35.7 | 61% | 99% | 0.46 | 20.9 | 9.2% | 0 | 26.9 |
| 50% | saver | v3.7 save+tea | 0.917 | 35.7 | 61% | 99% | 0.46 | 20.9 | 9.3% | 1675 | 26.9 |
| 50% | spender | no spells | 0.643 | 32.2 | 78% | 98% | 0.00 | 20.8 | 22.0% | 0 | 18.3 |
| 50% | spender | v3.7 free | 0.643 | 32.2 | 78% | 98% | 0.00 | 20.8 | 22.0% | 0 | 18.3 |
| 50% | spender | v3.7 save | 0.643 | 32.2 | 78% | 98% | 0.00 | 20.8 | 22.0% | 0 | 18.3 |
| 50% | spender | v3.7 save+tea | 0.643 | 32.2 | 78% | 98% | 0.00 | 20.8 | 22.0% | 0 | 18.3 |
| 65% | saver | no spells | 1.000 | 32.0 | 41% | 96% | 0.00 | 18.5 | 0.8% | 0 | 20.7 |
| 65% | saver | v3.7 free | 1.000 | 30.2 | 42% | 94% | 1.18 | 16.7 | 0.2% | 0 | 20.8 |
| 65% | saver | v3.7 save | 0.999 | 29.8 | 43% | 97% | 1.24 | 18.4 | 0.6% | 0 | 20.6 |
| 65% | saver | v3.7 save+tea | 0.999 | 29.9 | 42% | 98% | 1.25 | 18.4 | 0.7% | 3546 | 20.6 |
| 65% | spender | no spells | 0.964 | 31.6 | 48% | 95% | 0.00 | 18.6 | 3.4% | 0 | 14.3 |
| 65% | spender | v3.7 free | 0.964 | 31.3 | 48% | 95% | 0.15 | 18.3 | 3.1% | 0 | 14.1 |
| 65% | spender | v3.7 save | 0.964 | 31.3 | 48% | 95% | 0.15 | 18.5 | 3.4% | 0 | 14.3 |
| 65% | spender | v3.7 save+tea | 0.961 | 31.2 | 48% | 95% | 0.16 | 18.5 | 3.5% | 1252 | 14.3 |
| 75% | saver | no spells | 1.000 | 28.1 | 31% | 90% | 0.00 | 16.5 | 0.0% | 0 | 18.0 |
| 75% | saver | v3.7 free | 1.000 | 26.5 | 31% | 89% | 1.10 | 15.4 | 0.0% | 0 | 17.9 |
| 75% | saver | v3.7 save | 1.000 | 26.4 | 32% | 94% | 1.29 | 16.5 | 0.0% | 0 | 17.9 |
| 75% | saver | v3.7 save+tea | 1.000 | 26.5 | 31% | 96% | 1.30 | 16.5 | 0.0% | 4325 | 17.9 |
| 75% | spender | no spells | 1.000 | 28.0 | 31% | 89% | 0.00 | 16.7 | 0.1% | 0 | 12.9 |
| 75% | spender | v3.7 free | 0.999 | 27.6 | 31% | 88% | 0.45 | 16.1 | 0.1% | 0 | 12.6 |
| 75% | spender | v3.7 save | 0.999 | 27.4 | 31% | 92% | 0.54 | 16.6 | 0.1% | 0 | 12.8 |
| 75% | spender | v3.7 save+tea | 0.998 | 27.6 | 31% | 93% | 0.51 | 16.7 | 0.1% | 4013 | 12.8 |
| 90% | saver | no spells | 1.000 | 22.0 | 10% | 70% | 0.00 | 13.9 | 0.0% | 0 | 14.9 |
| 90% | saver | v3.7 free | 1.000 | 21.4 | 11% | 72% | 0.87 | 13.5 | 0.0% | 0 | 14.9 |
| 90% | saver | v3.7 save | 1.000 | 21.2 | 11% | 89% | 1.21 | 13.9 | 0.0% | 0 | 14.8 |
| 90% | saver | v3.7 save+tea | 1.000 | 21.2 | 11% | 94% | 1.34 | 13.9 | 0.0% | 5927 | 14.8 |
| 90% | spender | no spells | 1.000 | 22.1 | 10% | 71% | 0.00 | 14.0 | 0.0% | 0 | 11.2 |
| 90% | spender | v3.7 free | 1.000 | 21.7 | 11% | 68% | 0.48 | 13.7 | 0.0% | 0 | 11.1 |
| 90% | spender | v3.7 save | 1.000 | 21.6 | 11% | 86% | 0.81 | 14.0 | 0.0% | 0 | 11.2 |
| 90% | spender | v3.7 save+tea | 1.000 | 21.8 | 10% | 88% | 0.73 | 14.0 | 0.0% | 5856 | 11.2 |
| 75% | saver | v3.7 free+tea | 1.000 | 26.7 | 31% | 94% | 1.22 | 15.4 | 0.0% | 3916 | 18.0 |
| 75% | spender | v3.7 free+tea | 0.999 | 27.6 | 31% | 93% | 0.52 | 16.2 | 0.1% | 4042 | 12.6 |
| 90% | saver | v3.7 free+tea | 1.000 | 21.4 | 11% | 91% | 1.21 | 13.5 | 0.0% | 6514 | 14.9 |
| 90% | spender | v3.7 free+tea | 1.000 | 22.0 | 11% | 88% | 0.68 | 13.9 | 0.0% | 6216 | 11.2 |
| 75% | saver | no spells, far gate | 0.997 | 28.1 | 22% | 69% | 0.00 | 16.5 | 0.0% | 0 | 17.9 |
| 75% | saver | v3.7 free, far gate | 1.000 | 26.8 | 28% | 81% | 0.93 | 15.4 | 0.0% | 0 | 18.0 |
| 75% | saver | v3.7 save, far gate | 1.000 | 27.0 | 26% | 88% | 1.14 | 16.5 | 0.0% | 0 | 17.9 |
| 75% | saver | v3.7 save+tea, far gate | 0.998 | 26.8 | 24% | 94% | 1.23 | 16.5 | 0.0% | 4329 | 17.9 |
| 50% | saver | no spells, far gate | 0.802 | 34.0 | 58% | 87% | 0.00 | 20.9 | 9.9% | 0 | 27.0 |
| 50% | saver | v3.7 free, far gate | 0.815 | 34.0 | 59% | 91% | 0.33 | 20.4 | 8.8% | 0 | 27.1 |
| 50% | saver | v3.7 save, far gate | 0.826 | 33.6 | 60% | 91% | 0.39 | 20.8 | 10.1% | 0 | 27.1 |
| 50% | saver | v3.7 save+tea, far gate | 0.793 | 33.0 | 60% | 93% | 0.43 | 20.8 | 10.3% | 1647 | 27.1 |

How to read it:
- **Saving gives** higher MP at the boss (75%: 94% vs 89%; 90%: 89% vs 74%) and 0.2–0.3 more casts per boss, but only 0.1–0.4 fewer boss questions, because a full bar is 1–2 casts against about 15–20 correct answers.
- **Saving doesn't change** first-try wins (≈1.00 at 65%+, about 0.90–0.91 for a 50% saver).
- **Free spenders aren't punished either.** They kill normal enemies faster and use the inn when MP runs low.
- **Removing regen alone** (v3.6 check, v3.5 boss stats): 50% saver no spells 11.5% → 10.8% defeats, free 10.2% → 10.0%; 50% spender 25.7% → 25.5%; 75% kids ≤ 0.4% either way (`build/v3/sim/v36_regen_only.json`).
- **Boss ATK** (v3.6 check) with v3.6 boss HP, 50% free (defeats / first-try boss win): × 1.0 12.4% / 0.70 (saver), 30.3% / 0.36 (spender); × 0.9 9.4% / 0.86, 24.7% / 0.49; **× 0.8** 8.6% / 0.92, 22.6% / 0.61; v3.5: 10.2% / 0.84, 25.7% / 0.65 (`build/v3/sim/v36_atk_check.json`).

### 7.4 Whole campaign

| acc | speech | kid | mode | playthrough h | spells owned | defeat % | boss 1st-try | boss q | normal q | question share normal / elite / boss | hero turns cast normal / elite / boss | casts per battle normal / elite / boss | heals/b | full-gear share | free inns | gold=0 | MP at battle start | MP at boss start | boss HP lost | casts per boss battle | Mana Tea bought / drunk per run | tea gold per run | proficient at realm end |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 50% | on | saver | no spells | 26.9 | 0.0 | 9.4% | 0.94 | 36.0 | 20.9 | 0.972 / 0.968 / 0.977 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 0.34 | 0.96 | 0.0 | 0.00 | 84% | 98% | 58% | 0.00 | 0.0 / 0.0 | 0 | 23% |
| 50% | on | saver | v3.7 free | 26.9 | 0.6 | 8.3% | 0.93 | 35.2 | 20.4 | 0.957 / 0.954 / 0.966 | 4.6% / 3.6% / 2.8% | 0.32 / 0.33 / 0.40 | 0.28 | 0.96 | 0.0 | 0.00 | 85% | 98% | 61% | 0.40 | 0.0 / 1.3 | 0 | 23% |
| 50% | on | saver | v3.7 save | 26.9 | 0.6 | 9.2% | 0.93 | 35.1 | 20.9 | 0.972 / 0.957 / 0.965 | 0.2% / 2.9% / 2.8% | 0.01 / 0.27 / 0.40 | 0.33 | 0.96 | 0.0 | 0.00 | 85% | 99% | 61% | 0.40 | 0.0 / 1.4 | 0 | 23% |
| 50% | on | saver | v3.7 save+tea | 26.9 | 0.6 | 9.3% | 0.93 | 35.1 | 20.9 | 0.972 / 0.956 / 0.966 | 0.2% / 3.0% / 2.8% | 0.01 / 0.28 / 0.40 | 0.33 | 0.95 | 0.0 | 0.00 | 85% | 99% | 61% | 0.40 | 2.2 / 2.6 | 1675 | 23% |
| 50% | on | spender | no spells | 18.3 | 0.0 | 22.0% | 0.70 | 32.1 | 20.8 | 0.990 / 0.993 / 0.996 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 0.52 | 0.92 | 1.5 | 0.00 | 91% | 98% | 78% | 0.00 | 0.0 / 0.0 | 0 | 11% |
| 50% | on | spender | v3.7 free | 18.3 | 0.0 | 22.0% | 0.70 | 32.1 | 20.8 | 0.990 / 0.993 / 0.996 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 0.52 | 0.92 | 1.5 | 0.00 | 91% | 98% | 78% | 0.00 | 0.0 / 0.0 | 0 | 11% |
| 50% | on | spender | v3.7 save | 18.3 | 0.0 | 22.0% | 0.70 | 32.1 | 20.8 | 0.990 / 0.993 / 0.996 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 0.52 | 0.92 | 1.5 | 0.00 | 91% | 98% | 78% | 0.00 | 0.0 / 0.0 | 0 | 11% |
| 50% | on | spender | v3.7 save+tea | 18.3 | 0.0 | 22.0% | 0.70 | 32.1 | 20.8 | 0.990 / 0.993 / 0.996 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 0.52 | 0.92 | 1.5 | 0.00 | 91% | 98% | 78% | 0.00 | 0.0 / 0.0 | 0 | 11% |
| 65% | on | saver | no spells | 20.7 | 0.0 | 0.8% | 1.00 | 31.2 | 18.5 | 0.981 / 0.977 / 0.989 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 0.16 | 0.96 | 0.0 | 0.00 | 76% | 96% | 41% | 0.00 | 0.0 / 0.0 | 0 | 23% |
| 65% | on | saver | v3.7 free | 20.8 | 4.3 | 0.2% | 1.00 | 29.7 | 16.7 | 0.934 / 0.943 / 0.955 | 15.2% / 9.7% / 8.0% | 0.89 / 0.80 / 1.00 | 0.03 | 0.97 | 0.0 | 0.00 | 74% | 94% | 42% | 1.00 | 0.0 / 4.5 | 0 | 23% |
| 65% | on | saver | v3.7 save | 20.6 | 4.1 | 0.6% | 1.00 | 29.3 | 18.4 | 0.982 / 0.949 / 0.953 | 0.0% / 7.5% / 8.4% | 0.00 / 0.62 / 1.05 | 0.14 | 0.96 | 0.0 | 0.00 | 76% | 97% | 43% | 1.05 | 0.0 / 3.3 | 0 | 23% |
| 65% | on | saver | v3.7 save+tea | 20.6 | 3.7 | 0.7% | 1.00 | 29.4 | 18.4 | 0.982 / 0.950 / 0.954 | 0.0% / 7.3% / 8.5% | 0.00 / 0.61 / 1.07 | 0.14 | 0.96 | 0.0 | 0.00 | 76% | 98% | 42% | 1.07 | 4.9 / 6.7 | 3546 | 23% |
| 65% | on | spender | no spells | 14.3 | 0.0 | 3.4% | 0.97 | 30.9 | 18.6 | 0.988 / 0.989 / 0.996 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 0.22 | 0.96 | 0.1 | 0.00 | 79% | 95% | 48% | 0.00 | 0.0 / 0.0 | 0 | 11% |
| 65% | on | spender | v3.7 free | 14.1 | 0.7 | 3.1% | 0.97 | 30.6 | 18.3 | 0.983 / 0.984 / 0.991 | 1.5% / 1.2% / 1.0% | 0.10 / 0.10 / 0.13 | 0.20 | 0.96 | 0.2 | 0.00 | 79% | 95% | 48% | 0.13 | 0.0 / 0.7 | 0 | 11% |
| 65% | on | spender | v3.7 save | 14.3 | 0.7 | 3.4% | 0.97 | 30.6 | 18.5 | 0.988 / 0.986 / 0.991 | 0.0% / 1.1% / 1.0% | 0.00 / 0.09 / 0.13 | 0.22 | 0.96 | 0.2 | 0.00 | 79% | 95% | 48% | 0.13 | 0.0 / 0.6 | 0 | 11% |
| 65% | on | spender | v3.7 save+tea | 14.3 | 0.7 | 3.5% | 0.97 | 30.6 | 18.5 | 0.988 / 0.986 / 0.991 | 0.0% / 1.0% / 1.0% | 0.00 / 0.09 / 0.13 | 0.22 | 0.95 | 0.5 | 0.00 | 79% | 95% | 48% | 0.13 | 1.4 / 0.9 | 1252 | 11% |
| 75% | on | saver | no spells | 18.0 | 0.0 | 0.0% | 1.00 | 27.5 | 16.5 | 0.991 / 0.988 / 0.996 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 0.07 | 0.96 | 0.0 | 0.00 | 70% | 90% | 31% | 0.00 | 0.0 / 0.0 | 0 | 24% |
| 75% | on | saver | v3.7 free | 17.9 | 5.1 | 0.0% | 1.00 | 26.1 | 15.4 | 0.949 / 0.959 / 0.962 | 13.0% / 8.2% / 8.4% | 0.70 / 0.61 / 0.94 | 0.01 | 0.97 | 0.0 | 0.00 | 62% | 89% | 31% | 0.94 | 0.0 / 6.5 | 0 | 23% |
| 75% | on | saver | v3.7 save | 17.9 | 5.3 | 0.0% | 1.00 | 26.0 | 16.5 | 0.991 / 0.958 / 0.955 | 0.0% / 8.1% / 9.9% | 0.00 / 0.61 / 1.10 | 0.06 | 0.96 | 0.0 | 0.00 | 69% | 94% | 32% | 1.10 | 0.0 / 4.5 | 0 | 23% |
| 75% | on | saver | v3.7 save+tea | 17.9 | 4.6 | 0.0% | 1.00 | 26.0 | 16.5 | 0.991 / 0.958 / 0.955 | 0.0% / 8.0% / 9.9% | 0.00 / 0.60 / 1.11 | 0.06 | 0.96 | 0.0 | 0.00 | 70% | 96% | 31% | 1.11 | 6.2 / 8.3 | 4325 | 23% |
| 75% | on | spender | no spells | 12.9 | 0.0 | 0.1% | 1.00 | 27.3 | 16.7 | 0.990 / 0.989 / 0.996 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 0.07 | 0.96 | 0.0 | 0.00 | 71% | 89% | 31% | 0.00 | 0.0 / 0.0 | 0 | 12% |
| 75% | on | spender | v3.7 free | 12.6 | 2.0 | 0.1% | 1.00 | 27.0 | 16.1 | 0.970 / 0.975 / 0.982 | 6.2% / 3.7% / 3.4% | 0.34 / 0.28 / 0.38 | 0.03 | 0.96 | 0.2 | 0.00 | 68% | 88% | 31% | 0.38 | 0.0 / 2.7 | 0 | 12% |
| 75% | on | spender | v3.7 save | 12.8 | 2.0 | 0.1% | 1.00 | 26.8 | 16.6 | 0.990 / 0.974 / 0.980 | 0.0% / 3.8% / 4.0% | 0.00 / 0.29 / 0.46 | 0.07 | 0.96 | 0.2 | 0.00 | 71% | 92% | 31% | 0.46 | 0.0 / 2.6 | 0 | 12% |
| 75% | on | spender | v3.7 save+tea | 12.8 | 1.5 | 0.1% | 1.00 | 27.0 | 16.7 | 0.990 / 0.975 / 0.980 | 0.0% / 3.4% / 3.8% | 0.00 / 0.26 / 0.44 | 0.07 | 0.96 | 0.3 | 0.00 | 71% | 93% | 31% | 0.44 | 5.0 / 4.7 | 4013 | 12% |
| 90% | on | saver | no spells | 14.9 | 0.0 | 0.0% | 1.00 | 21.6 | 13.9 | 0.999 / 0.999 / 1.000 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 0.00 | 0.96 | 0.0 | 0.00 | 54% | 70% | 10% | 0.00 | 0.0 / 0.0 | 0 | 24% |
| 90% | on | saver | v3.7 free | 14.9 | 6.2 | 0.0% | 1.00 | 21.0 | 13.5 | 0.973 / 0.977 / 0.966 | 7.8% / 5.9% / 8.4% | 0.36 / 0.37 / 0.74 | 0.00 | 0.96 | 0.0 | 0.00 | 40% | 72% | 11% | 0.74 | 0.0 / 8.6 | 0 | 23% |
| 90% | on | saver | v3.7 save | 14.8 | 6.3 | 0.0% | 1.00 | 20.8 | 13.9 | 0.999 / 0.971 / 0.953 | 0.0% / 7.5% / 11.6% | 0.00 / 0.47 / 1.03 | 0.00 | 0.96 | 0.0 | 0.00 | 53% | 89% | 11% | 1.03 | 0.0 / 7.8 | 0 | 23% |
| 90% | on | saver | v3.7 save+tea | 14.8 | 5.4 | 0.0% | 1.00 | 20.8 | 13.9 | 0.999 / 0.973 / 0.948 | 0.0% / 7.0% / 12.9% | 0.00 / 0.44 / 1.14 | 0.00 | 0.96 | 0.0 | 0.00 | 53% | 94% | 11% | 1.14 | 8.7 / 11.2 | 5927 | 23% |
| 90% | on | spender | no spells | 11.2 | 0.0 | 0.0% | 1.00 | 21.6 | 14.0 | 0.999 / 0.999 / 1.000 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 0.00 | 0.96 | 0.0 | 0.00 | 56% | 71% | 10% | 0.00 | 0.0 / 0.0 | 0 | 13% |
| 90% | on | spender | v3.7 free | 11.1 | 3.0 | 0.0% | 1.00 | 21.3 | 13.7 | 0.981 / 0.984 / 0.981 | 5.3% / 4.0% / 4.6% | 0.25 / 0.25 / 0.41 | 0.00 | 0.96 | 0.1 | 0.00 | 47% | 68% | 11% | 0.41 | 0.0 / 3.9 | 0 | 13% |
| 90% | on | spender | v3.7 save | 11.2 | 3.1 | 0.0% | 1.00 | 21.2 | 14.0 | 0.999 / 0.982 / 0.968 | 0.0% / 4.4% / 7.8% | 0.00 / 0.28 / 0.69 | 0.00 | 0.96 | 0.1 | 0.00 | 56% | 86% | 11% | 0.69 | 0.0 / 3.9 | 0 | 13% |
| 90% | on | spender | v3.7 save+tea | 11.2 | 2.0 | 0.0% | 1.00 | 21.4 | 14.0 | 0.999 / 0.984 / 0.972 | 0.0% / 4.0% / 6.9% | 0.00 / 0.26 / 0.62 | 0.00 | 0.96 | 0.1 | 0.00 | 56% | 88% | 10% | 0.62 | 7.6 / 8.3 | 5856 | 13% |
| 75% | on | saver | v3.7 free+tea | 18.0 | 4.5 | 0.0% | 1.00 | 26.2 | 15.4 | 0.949 / 0.958 / 0.958 | 12.9% / 8.3% / 9.2% | 0.69 / 0.63 / 1.04 | 0.01 | 0.97 | 0.0 | 0.00 | 62% | 94% | 31% | 1.04 | 5.6 / 7.0 | 3916 | 23% |
| 75% | on | spender | v3.7 free+tea | 12.6 | 1.1 | 0.1% | 1.00 | 26.9 | 16.2 | 0.971 / 0.976 / 0.980 | 6.1% / 3.5% / 3.9% | 0.34 / 0.27 / 0.44 | 0.04 | 0.95 | 0.4 | 0.00 | 69% | 93% | 31% | 0.44 | 5.2 / 4.5 | 4042 | 12% |
| 90% | on | saver | v3.7 free+tea | 14.9 | 5.1 | 0.0% | 1.00 | 21.0 | 13.5 | 0.972 / 0.979 / 0.953 | 7.8% / 5.5% / 11.5% | 0.36 / 0.35 / 1.02 | 0.00 | 0.96 | 0.0 | 0.00 | 41% | 91% | 11% | 1.02 | 9.9 / 11.9 | 6514 | 23% |
| 90% | on | spender | v3.7 free+tea | 11.2 | 1.8 | 0.0% | 1.00 | 21.5 | 13.9 | 0.983 / 0.986 / 0.973 | 4.6% / 3.3% / 6.5% | 0.22 / 0.21 / 0.58 | 0.00 | 0.96 | 0.1 | 0.00 | 49% | 88% | 11% | 0.58 | 8.4 / 8.6 | 6216 | 13% |
| 75% | on | saver | no spells, far gate | 17.9 | 0.0 | 0.0% | 1.00 | 27.5 | 16.5 | 0.991 / 0.989 / 0.990 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 0.07 | 0.96 | 0.0 | 0.00 | 69% | 69% | 22% | 0.00 | 0.0 / 0.0 | 0 | 24% |
| 75% | on | saver | v3.7 free, far gate | 18.0 | 5.2 | 0.0% | 1.00 | 26.3 | 15.4 | 0.948 / 0.958 / 0.965 | 13.2% / 8.6% / 7.1% | 0.71 / 0.64 / 0.79 | 0.01 | 0.97 | 0.0 | 0.00 | 62% | 81% | 28% | 0.79 | 0.0 / 6.6 | 0 | 23% |
| 75% | on | saver | v3.7 save, far gate | 17.9 | 5.3 | 0.0% | 1.00 | 26.5 | 16.5 | 0.991 / 0.958 / 0.956 | 0.0% / 8.3% / 8.6% | 0.00 / 0.63 / 0.97 | 0.06 | 0.96 | 0.0 | 0.00 | 69% | 88% | 26% | 0.97 | 0.0 / 4.6 | 0 | 23% |
| 75% | on | saver | v3.7 save+tea, far gate | 17.9 | 4.7 | 0.0% | 1.00 | 26.3 | 16.5 | 0.991 / 0.959 / 0.952 | 0.0% / 7.9% / 9.4% | 0.00 / 0.59 / 1.05 | 0.06 | 0.96 | 0.0 | 0.00 | 70% | 94% | 24% | 1.05 | 6.1 / 8.2 | 4329 | 23% |
| 50% | on | saver | no spells, far gate | 27.0 | 0.0 | 9.9% | 0.83 | 33.7 | 20.9 | 0.973 / 0.967 / 0.977 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 0.34 | 0.96 | 0.0 | 0.00 | 84% | 87% | 58% | 0.00 | 0.0 / 0.0 | 0 | 23% |
| 50% | on | saver | v3.7 free, far gate | 27.1 | 0.6 | 8.8% | 0.85 | 33.7 | 20.4 | 0.958 / 0.955 / 0.968 | 4.4% / 3.4% / 2.2% | 0.31 / 0.32 / 0.30 | 0.29 | 0.96 | 0.0 | 0.00 | 85% | 91% | 59% | 0.30 | 0.0 / 1.5 | 0 | 23% |
| 50% | on | saver | v3.7 save, far gate | 27.1 | 0.6 | 10.1% | 0.85 | 33.3 | 20.8 | 0.972 / 0.958 / 0.967 | 0.2% / 2.7% / 2.6% | 0.01 / 0.25 / 0.35 | 0.33 | 0.96 | 0.0 | 0.00 | 84% | 91% | 60% | 0.35 | 0.0 / 1.3 | 0 | 23% |
| 50% | on | saver | v3.7 save+tea, far gate | 27.1 | 0.6 | 10.3% | 0.82 | 32.9 | 20.8 | 0.972 / 0.958 / 0.967 | 0.2% / 2.7% / 2.9% | 0.01 / 0.25 / 0.38 | 0.33 | 0.95 | 0.0 | 0.00 | 85% | 93% | 60% | 0.38 | 2.2 / 2.7 | 1647 | 23% |
| 75% | off | saver | no spells | 11.5 | 0.0 | 0.0% | 1.00 | 24.3 | 15.1 | 0.996 / 0.994 / 0.999 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 0.03 | 0.94 | 0.0 | 0.00 | 65% | 83% | 20% | 0.00 | 0.0 / 0.0 | 0 | 52% |
| 75% | off | saver | v3.7 free | 11.5 | 2.5 | 0.0% | 1.00 | 24.1 | 14.7 | 0.974 / 0.978 / 0.979 | 6.4% / 4.4% / 4.7% | 0.32 / 0.31 / 0.47 | 0.01 | 0.94 | 0.0 | 0.00 | 59% | 85% | 21% | 0.47 | 0.0 / 6.3 | 0 | 51% |
| 75% | off | spender | no spells | 11.3 | 0.0 | 0.0% | 1.00 | 24.5 | 15.1 | 0.995 / 0.994 / 0.999 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 0.02 | 0.95 | 0.0 | 0.00 | 65% | 83% | 21% | 0.00 | 0.0 / 0.0 | 0 | 50% |
| 75% | off | spender | v3.7 free | 11.2 | 2.2 | 0.0% | 1.00 | 24.2 | 14.7 | 0.975 / 0.980 / 0.981 | 6.1% / 3.8% / 4.4% | 0.31 / 0.27 / 0.45 | 0.01 | 0.95 | 0.1 | 0.00 | 60% | 85% | 22% | 0.45 | 0.0 / 6.1 | 0 | 49% |

### 7.5 Per realm, 75% saver

| realm | mode | battles | defeat % | boss 1st-try | boss q | normal q | q share normal / elite / boss | casts/b normal / boss | min/location | MP at battle start | spell castable at start | heals/b | full gear | gold start | min gold | free inns | spell spend | gear spend | proficient at end |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | no spells | 52.4 | 0.0% | 1.00 | 23.7 | 11.7 | 0.999 / 0.995 / 1.000 | 0.00 / 0.00 | 41.6 | 100% | 0% | 0.00 | 0.91 | 24 | 30 | 0.00 | 0 | 35 | 26% |
| 1 | v3.7 free | 52.4 | 0.0% | 1.00 | 23.7 | 11.7 | 0.999 / 0.995 / 1.000 | 0.00 / 0.00 | 41.6 | 100% | 0% | 0.00 | 0.91 | 24 | 30 | 0.00 | 0 | 35 | 26% |
| 1 | v3.7 save | 52.4 | 0.0% | 1.00 | 23.7 | 11.7 | 0.999 / 0.995 / 1.000 | 0.00 / 0.00 | 41.6 | 100% | 0% | 0.00 | 0.91 | 24 | 30 | 0.00 | 0 | 35 | 26% |
| 1 | v3.7 save+tea | 52.4 | 0.0% | 1.00 | 23.7 | 11.7 | 0.999 / 0.995 / 1.000 | 0.00 / 0.00 | 41.6 | 100% | 0% | 0.00 | 0.91 | 24 | 30 | 0.00 | 0 | 35 | 26% |
| 2 | no spells | 39.4 | 0.0% | 1.00 | 28.0 | 12.1 | 0.995 / 0.997 / 0.999 | 0.00 / 0.00 | 48.9 | 57% | 0% | 0.00 | 0.97 | 778 | 504 | 0.00 | 0 | 288 | 23% |
| 2 | v3.7 free | 39.8 | 0.0% | 1.00 | 27.5 | 11.9 | 0.991 / 0.995 / 0.991 | 0.05 / 0.24 | 48.6 | 55% | 10% | 0.00 | 0.97 | 778 | 504 | 0.00 | 727 | 288 | 23% |
| 2 | v3.7 save | 39.4 | 0.0% | 1.00 | 27.5 | 12.1 | 0.995 / 0.993 / 0.987 | 0.00 / 0.36 | 48.8 | 57% | 12% | 0.00 | 0.97 | 778 | 504 | 0.00 | 724 | 288 | 23% |
| 2 | v3.7 save+tea | 39.4 | 0.0% | 1.00 | 27.5 | 12.1 | 0.995 / 0.993 / 0.987 | 0.00 / 0.36 | 48.8 | 57% | 12% | 0.00 | 0.97 | 778 | 504 | 0.00 | 724 | 288 | 23% |
| 3 | no spells | 36.9 | 0.0% | 1.00 | 30.1 | 15.3 | 0.996 / 0.993 / 0.997 | 0.00 / 0.00 | 54.5 | 74% | 0% | 0.01 | 0.97 | 1646 | 1165 | 0.00 | 0 | 528 | 24% |
| 3 | v3.7 free | 39.5 | 0.0% | 1.00 | 29.4 | 14.1 | 0.964 / 0.972 / 0.976 | 0.47 / 0.64 | 54.4 | 62% | 56% | 0.00 | 0.97 | 924 | 443 | 0.00 | 234 | 528 | 24% |
| 3 | v3.7 save | 36.7 | 0.0% | 1.00 | 29.3 | 15.3 | 0.997 / 0.972 / 0.971 | 0.00 / 0.75 | 54.1 | 73% | 81% | 0.00 | 0.97 | 916 | 432 | 0.00 | 279 | 528 | 24% |
| 3 | v3.7 save+tea | 36.7 | 0.0% | 1.00 | 28.6 | 15.3 | 0.997 / 0.972 / 0.964 | 0.00 / 0.97 | 54.0 | 73% | 81% | 0.00 | 0.97 | 919 | 436 | 0.00 | 261 | 528 | 23% |
| 4 | no spells | 46.8 | 0.0% | 1.00 | 25.7 | 16.9 | 0.987 / 0.988 / 0.996 | 0.00 / 0.00 | 49.6 | 73% | 0% | 0.03 | 0.98 | 3003 | 2200 | 0.00 | 0 | 912 | 24% |
| 4 | v3.7 free | 49.3 | 0.0% | 1.00 | 23.7 | 15.6 | 0.933 / 0.944 / 0.943 | 0.96 / 1.36 | 49.2 | 58% | 58% | 0.00 | 0.98 | 2020 | 1206 | 0.00 | 2218 | 912 | 24% |
| 4 | v3.7 save | 46.9 | 0.0% | 1.00 | 23.5 | 16.7 | 0.989 / 0.936 / 0.931 | 0.00 / 1.62 | 49.1 | 72% | 91% | 0.01 | 0.98 | 1971 | 1169 | 0.00 | 2228 | 912 | 24% |
| 4 | v3.7 save+tea | 47.2 | 0.0% | 1.00 | 23.5 | 16.6 | 0.989 / 0.938 / 0.928 | 0.00 / 1.71 | 49.1 | 73% | 92% | 0.01 | 0.98 | 1960 | 1159 | 0.00 | 2200 | 912 | 24% |
| 5 | no spells | 31.0 | 0.0% | 1.00 | 28.5 | 16.7 | 0.988 / 0.988 / 0.994 | 0.00 / 0.00 | 49.5 | 77% | 0% | 0.04 | 0.97 | 6256 | 4848 | 0.00 | 0 | 1560 | 24% |
| 5 | v3.7 free | 31.6 | 0.0% | 1.00 | 28.5 | 16.5 | 0.933 / 0.960 / 0.949 | 1.03 / 1.31 | 50.3 | 66% | 70% | 0.01 | 0.97 | 2797 | 1374 | 0.00 | 194 | 1560 | 24% |
| 5 | v3.7 save | 31.1 | 0.0% | 1.00 | 28.0 | 16.9 | 0.989 / 0.945 / 0.945 | 0.00 / 1.41 | 49.9 | 77% | 96% | 0.02 | 0.97 | 2924 | 1510 | 0.00 | 1058 | 1560 | 25% |
| 5 | v3.7 save+tea | 30.6 | 0.0% | 1.00 | 28.1 | 17.1 | 0.988 / 0.946 / 0.943 | 0.00 / 1.48 | 49.8 | 77% | 96% | 0.02 | 0.97 | 2867 | 959 | 0.00 | 130 | 1560 | 24% |
| 6 | no spells | 31.6 | 0.0% | 1.00 | 26.6 | 19.2 | 0.987 / 0.983 / 0.997 | 0.00 / 0.00 | 57.6 | 78% | 0% | 0.08 | 0.97 | 8828 | 6920 | 0.00 | 0 | 2160 | 22% |
| 6 | v3.7 free | 34.9 | 0.0% | 1.00 | 25.0 | 16.9 | 0.927 / 0.946 / 0.960 | 1.16 / 0.94 | 57.2 | 62% | 63% | 0.00 | 0.97 | 4803 | 2781 | 0.00 | 3753 | 2160 | 22% |
| 6 | v3.7 save | 31.4 | 0.0% | 1.00 | 26.0 | 19.1 | 0.988 / 0.936 / 0.947 | 0.00 / 1.29 | 57.0 | 77% | 96% | 0.05 | 0.97 | 4391 | 2350 | 0.00 | 2835 | 2160 | 22% |
| 6 | v3.7 save+tea | 31.4 | 0.0% | 1.00 | 24.9 | 19.0 | 0.988 / 0.937 / 0.953 | 0.00 / 1.08 | 56.8 | 78% | 97% | 0.06 | 0.97 | 4377 | 2449 | 0.00 | 3213 | 2160 | 22% |
| 7 | no spells | 36.9 | 0.0% | 1.00 | 29.3 | 20.2 | 0.987 / 0.981 / 0.993 | 0.00 / 0.00 | 68.5 | 69% | 0% | 0.17 | 0.97 | 12605 | 10158 | 0.00 | 0 | 2760 | 22% |
| 7 | v3.7 free | 40.2 | 0.0% | 1.00 | 26.8 | 18.4 | 0.927 / 0.940 / 0.946 | 1.25 / 1.33 | 68.8 | 68% | 72% | 0.00 | 0.98 | 4614 | 2156 | 0.00 | 2484 | 2760 | 22% |
| 7 | v3.7 save | 37.0 | 0.0% | 1.00 | 26.0 | 20.1 | 0.988 / 0.944 / 0.939 | 0.00 / 1.50 | 67.8 | 69% | 96% | 0.18 | 0.97 | 5197 | 2673 | 0.00 | 3924 | 2760 | 22% |
| 7 | v3.7 save+tea | 37.0 | 0.0% | 1.00 | 27.2 | 20.1 | 0.988 / 0.944 / 0.937 | 0.00 / 1.53 | 68.2 | 69% | 96% | 0.18 | 0.97 | 4591 | 2052 | 0.00 | 1944 | 2760 | 22% |
| 8 | no spells | 34.8 | 0.1% | 1.00 | 28.0 | 20.1 | 0.988 / 0.985 / 0.993 | 0.00 / 0.00 | 63.4 | 64% | 0% | 0.18 | 0.97 | 17500 | 14483 | 0.00 | 0 | 3360 | 23% |
| 8 | v3.7 free | 40.2 | 0.0% | 1.00 | 25.2 | 17.1 | 0.926 / 0.935 / 0.925 | 1.17 / 1.89 | 63.6 | 64% | 65% | 0.00 | 0.98 | 6700 | 3239 | 0.00 | 3788 | 3360 | 23% |
| 8 | v3.7 save | 34.9 | 0.0% | 1.00 | 25.3 | 20.1 | 0.988 / 0.942 / 0.914 | 0.00 / 2.24 | 63.3 | 65% | 94% | 0.18 | 0.97 | 6032 | 2785 | 0.00 | 2310 | 3360 | 23% |
| 8 | v3.7 save+tea | 34.6 | 0.0% | 1.00 | 25.7 | 20.1 | 0.988 / 0.946 / 0.920 | 0.00 / 2.04 | 62.8 | 65% | 94% | 0.17 | 0.97 | 6581 | 3379 | 0.00 | 3188 | 3360 | 23% |
| 9 | no spells | 32.8 | 0.0% | 1.00 | 30.1 | 19.9 | 0.991 / 0.984 / 0.992 | 0.00 / 0.00 | 59.8 | 66% | 0% | 0.17 | 0.97 | 22726 | 19067 | 0.00 | 0 | 4080 | 23% |
| 9 | v3.7 free | 36.4 | 0.0% | 1.00 | 27.6 | 17.7 | 0.966 / 0.964 / 0.960 | 0.47 / 0.99 | 59.3 | 62% | 94% | 0.09 | 0.97 | 8287 | 815 | 0.00 | 9298 | 4080 | 23% |
| 9 | v3.7 save | 33.1 | 0.0% | 1.00 | 27.5 | 19.6 | 0.991 / 0.963 / 0.959 | 0.00 / 1.02 | 59.1 | 67% | 97% | 0.15 | 0.97 | 8819 | 851 | 0.00 | 9173 | 4080 | 23% |
| 9 | v3.7 save+tea | 33.1 | 0.0% | 1.00 | 27.5 | 19.8 | 0.991 / 0.960 / 0.958 | 0.00 / 1.05 | 59.5 | 67% | 97% | 0.16 | 0.97 | 7367 | 1006 | 0.00 | 7238 | 4080 | 23% |

### 7.6 Per realm, 75% spender

| realm | mode | battles | defeat % | boss 1st-try | boss q | normal q | q share normal / elite / boss | casts/b normal / boss | min/location | MP at battle start | spell castable at start | heals/b | full gear | gold start | min gold | free inns | spell spend | gear spend | proficient at end |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | no spells | 33.0 | 0.0% | 1.00 | 23.3 | 11.7 | 0.999 / 0.995 / 1.000 | 0.00 / 0.00 | 29.8 | 100% | 0% | 0.00 | 0.95 | 24 | 14 | 0.01 | 0 | 35 | 14% |
| 1 | v3.7 free | 33.0 | 0.0% | 1.00 | 23.3 | 11.7 | 0.999 / 0.995 / 1.000 | 0.00 / 0.00 | 29.8 | 100% | 0% | 0.00 | 0.95 | 24 | 14 | 0.01 | 0 | 35 | 14% |
| 1 | v3.7 save | 33.0 | 0.0% | 1.00 | 23.3 | 11.7 | 0.999 / 0.995 / 1.000 | 0.00 / 0.00 | 29.8 | 100% | 0% | 0.00 | 0.95 | 24 | 14 | 0.01 | 0 | 35 | 14% |
| 1 | v3.7 save+tea | 33.0 | 0.0% | 1.00 | 23.3 | 11.7 | 0.999 / 0.995 / 1.000 | 0.00 / 0.00 | 29.8 | 100% | 0% | 0.00 | 0.95 | 24 | 14 | 0.01 | 0 | 35 | 14% |
| 2 | no spells | 22.0 | 0.0% | 1.00 | 27.9 | 12.3 | 0.992 / 0.995 / 0.998 | 0.00 / 0.00 | 33.0 | 60% | 0% | 0.01 | 0.95 | 593 | 325 | 0.00 | 0 | 288 | 10% |
| 2 | v3.7 free | 22.0 | 0.0% | 1.00 | 27.9 | 12.3 | 0.992 / 0.995 / 0.998 | 0.00 / 0.00 | 33.0 | 60% | 0% | 0.01 | 0.95 | 593 | 325 | 0.00 | 14 | 288 | 10% |
| 2 | v3.7 save | 22.0 | 0.0% | 1.00 | 27.9 | 12.3 | 0.992 / 0.995 / 0.998 | 0.00 / 0.00 | 33.0 | 60% | 0% | 0.01 | 0.95 | 593 | 325 | 0.00 | 14 | 288 | 10% |
| 2 | v3.7 save+tea | 22.0 | 0.0% | 1.00 | 27.9 | 12.3 | 0.992 / 0.995 / 0.998 | 0.00 / 0.00 | 33.0 | 60% | 0% | 0.01 | 0.95 | 593 | 325 | 0.00 | 14 | 288 | 10% |
| 3 | no spells | 22.0 | 0.0% | 1.00 | 30.3 | 15.4 | 0.995 / 0.992 / 0.997 | 0.00 / 0.00 | 37.2 | 74% | 0% | 0.01 | 0.95 | 1054 | 570 | 0.00 | 0 | 528 | 11% |
| 3 | v3.7 free | 22.0 | 0.0% | 1.00 | 30.1 | 15.4 | 0.995 / 0.992 / 0.997 | 0.01 / 0.02 | 37.2 | 74% | 1% | 0.01 | 0.95 | 1039 | 556 | 0.00 | 0 | 528 | 11% |
| 3 | v3.7 save | 22.0 | 0.0% | 1.00 | 30.3 | 15.5 | 0.995 / 0.992 / 0.997 | 0.00 / 0.01 | 37.3 | 74% | 2% | 0.01 | 0.95 | 1039 | 556 | 0.00 | 0 | 528 | 11% |
| 3 | v3.7 save+tea | 22.0 | 0.0% | 1.00 | 30.2 | 15.4 | 0.995 / 0.992 / 0.996 | 0.00 / 0.02 | 37.2 | 74% | 2% | 0.01 | 0.95 | 1039 | 556 | 0.00 | 0 | 528 | 11% |
| 4 | no spells | 33.0 | 0.1% | 1.00 | 25.9 | 16.8 | 0.987 / 0.991 / 0.996 | 0.00 / 0.00 | 37.7 | 74% | 0% | 0.03 | 0.97 | 1800 | 995 | 0.00 | 0 | 912 | 14% |
| 4 | v3.7 free | 33.0 | 0.1% | 1.00 | 25.8 | 16.8 | 0.985 / 0.989 / 0.991 | 0.03 / 0.11 | 37.6 | 74% | 3% | 0.03 | 0.97 | 1781 | 976 | 0.00 | 1867 | 912 | 14% |
| 4 | v3.7 save | 33.0 | 0.1% | 1.00 | 25.6 | 16.8 | 0.987 / 0.988 / 0.991 | 0.00 / 0.12 | 37.7 | 74% | 4% | 0.03 | 0.97 | 1785 | 979 | 0.00 | 1867 | 912 | 14% |
| 4 | v3.7 save+tea | 33.0 | 0.1% | 1.00 | 25.6 | 16.8 | 0.987 / 0.988 / 0.990 | 0.00 / 0.14 | 37.7 | 74% | 4% | 0.03 | 0.97 | 1786 | 980 | 0.00 | 1882 | 912 | 14% |
| 5 | no spells | 22.0 | 0.1% | 1.00 | 28.5 | 16.9 | 0.988 / 0.988 / 0.994 | 0.00 / 0.00 | 38.2 | 77% | 0% | 0.04 | 0.95 | 4250 | 2842 | 0.00 | 0 | 1560 | 15% |
| 5 | v3.7 free | 22.0 | 0.1% | 1.00 | 27.9 | 16.6 | 0.967 / 0.979 / 0.972 | 0.43 / 0.62 | 37.8 | 70% | 54% | 0.02 | 0.95 | 2353 | 930 | 0.00 | 259 | 1560 | 14% |
| 5 | v3.7 save | 22.0 | 0.1% | 1.00 | 28.2 | 16.9 | 0.989 / 0.970 / 0.971 | 0.00 / 0.66 | 38.1 | 77% | 76% | 0.03 | 0.95 | 2365 | 958 | 0.00 | 259 | 1560 | 14% |
| 5 | v3.7 save+tea | 22.0 | 0.1% | 1.00 | 28.3 | 16.9 | 0.989 / 0.970 / 0.971 | 0.00 / 0.65 | 38.2 | 77% | 76% | 0.03 | 0.95 | 2346 | 617 | 0.13 | 259 | 1560 | 14% |
| 6 | no spells | 22.0 | 0.1% | 1.00 | 25.9 | 19.2 | 0.986 / 0.988 / 0.997 | 0.00 / 0.00 | 43.4 | 78% | 0% | 0.09 | 0.95 | 5909 | 4010 | 0.00 | 0 | 2160 | 13% |
| 6 | v3.7 free | 22.0 | 0.1% | 1.00 | 25.3 | 17.2 | 0.937 / 0.956 / 0.962 | 0.95 / 0.91 | 40.7 | 65% | 59% | 0.01 | 0.95 | 3526 | 1606 | 0.00 | 432 | 2160 | 11% |
| 6 | v3.7 save | 22.0 | 0.1% | 1.00 | 25.3 | 19.2 | 0.988 / 0.950 / 0.958 | 0.00 / 1.01 | 43.4 | 78% | 86% | 0.07 | 0.95 | 3694 | 1792 | 0.00 | 486 | 2160 | 13% |
| 6 | v3.7 save+tea | 22.0 | 0.1% | 1.00 | 25.0 | 19.2 | 0.988 / 0.950 / 0.958 | 0.00 / 1.01 | 43.4 | 78% | 86% | 0.07 | 0.95 | 2880 | 1017 | 0.04 | 378 | 2160 | 13% |
| 7 | no spells | 22.0 | 0.1% | 1.00 | 29.2 | 20.2 | 0.988 / 0.985 / 0.994 | 0.00 / 0.00 | 45.3 | 71% | 0% | 0.19 | 0.95 | 8354 | 5887 | 0.00 | 0 | 2760 | 10% |
| 7 | v3.7 free | 22.0 | 0.0% | 1.00 | 28.0 | 18.7 | 0.951 / 0.960 / 0.968 | 0.76 / 0.70 | 43.1 | 70% | 67% | 0.02 | 0.95 | 5004 | 2538 | 0.00 | 0 | 2760 | 8% |
| 7 | v3.7 save | 22.0 | 0.2% | 1.00 | 27.7 | 20.1 | 0.988 / 0.962 / 0.966 | 0.00 / 0.83 | 44.9 | 71% | 87% | 0.18 | 0.95 | 5558 | 3113 | 0.00 | 252 | 2760 | 10% |
| 7 | v3.7 save+tea | 22.0 | 0.2% | 1.00 | 28.0 | 20.2 | 0.988 / 0.962 / 0.967 | 0.00 / 0.82 | 45.2 | 71% | 87% | 0.18 | 0.95 | 4677 | 2232 | 0.01 | 0 | 2760 | 10% |
| 8 | no spells | 22.1 | 0.5% | 1.00 | 27.7 | 20.1 | 0.988 / 0.988 / 0.995 | 0.00 / 0.00 | 43.9 | 65% | 0% | 0.18 | 0.95 | 10626 | 7622 | 0.00 | 0 | 3360 | 11% |
| 8 | v3.7 free | 22.0 | 0.1% | 1.00 | 27.6 | 18.9 | 0.943 / 0.957 / 0.962 | 0.91 / 0.95 | 42.4 | 66% | 71% | 0.05 | 0.95 | 6940 | 3914 | 0.00 | 0 | 3360 | 10% |
| 8 | v3.7 save | 22.0 | 0.2% | 1.00 | 27.6 | 20.1 | 0.989 / 0.962 / 0.956 | 0.00 / 1.13 | 43.8 | 67% | 89% | 0.18 | 0.95 | 7569 | 4562 | 0.00 | 416 | 3360 | 11% |
| 8 | v3.7 save+tea | 22.0 | 0.2% | 1.00 | 27.5 | 20.1 | 0.989 / 0.963 / 0.956 | 0.00 / 1.11 | 43.9 | 67% | 89% | 0.19 | 0.95 | 6029 | 3018 | 0.00 | 0 | 3360 | 11% |
| 9 | no spells | 22.1 | 0.3% | 1.00 | 30.1 | 20.0 | 0.990 / 0.985 / 0.995 | 0.00 / 0.00 | 43.5 | 68% | 0% | 0.17 | 0.95 | 13164 | 9462 | 0.00 | 0 | 4080 | 12% |
| 9 | v3.7 free | 22.0 | 0.2% | 0.99 | 29.1 | 18.9 | 0.974 / 0.969 / 0.978 | 0.32 / 0.48 | 41.7 | 65% | 80% | 0.14 | 0.95 | 9122 | 1138 | 0.22 | 8986 | 4080 | 11% |
| 9 | v3.7 save | 22.0 | 0.1% | 1.00 | 27.8 | 19.7 | 0.991 / 0.962 / 0.969 | 0.00 / 0.75 | 42.6 | 68% | 85% | 0.16 | 0.95 | 9687 | 821 | 0.17 | 8299 | 4080 | 12% |
| 9 | v3.7 save+tea | 22.0 | 0.2% | 0.99 | 29.7 | 19.8 | 0.991 / 0.974 / 0.977 | 0.00 / 0.54 | 43.2 | 69% | 88% | 0.18 | 0.95 | 7496 | 2938 | 0.07 | 4243 | 4080 | 12% |

### 7.7 Per realm, 65% saver

| realm | mode | battles | defeat % | boss 1st-try | boss q | normal q | q share normal / elite / boss | casts/b normal / boss | min/location | MP at battle start | spell castable at start | heals/b | full gear | gold start | min gold | free inns | spell spend | gear spend | proficient at end |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | no spells | 56.3 | 0.0% | 1.00 | 26.4 | 13.0 | 0.996 / 0.991 / 1.000 | 0.00 / 0.00 | 47.9 | 100% | 0% | 0.00 | 0.92 | 24 | 29 | 0.00 | 0 | 35 | 25% |
| 1 | v3.7 free | 56.3 | 0.0% | 1.00 | 26.4 | 13.0 | 0.996 / 0.991 / 1.000 | 0.00 / 0.00 | 47.9 | 100% | 0% | 0.00 | 0.92 | 24 | 29 | 0.00 | 0 | 35 | 25% |
| 1 | v3.7 save | 56.3 | 0.0% | 1.00 | 26.4 | 13.0 | 0.996 / 0.991 / 1.000 | 0.00 / 0.00 | 47.9 | 100% | 0% | 0.00 | 0.92 | 24 | 29 | 0.00 | 0 | 35 | 25% |
| 1 | v3.7 save+tea | 56.3 | 0.0% | 1.00 | 26.4 | 13.0 | 0.996 / 0.991 / 1.000 | 0.00 / 0.00 | 47.9 | 100% | 0% | 0.00 | 0.92 | 24 | 29 | 0.00 | 0 | 35 | 25% |
| 2 | no spells | 42.0 | 0.0% | 1.00 | 30.9 | 13.6 | 0.993 / 0.991 / 0.995 | 0.00 / 0.00 | 56.4 | 66% | 0% | 0.00 | 0.98 | 779 | 502 | 0.00 | 0 | 288 | 23% |
| 2 | v3.7 free | 42.8 | 0.0% | 1.00 | 30.2 | 13.3 | 0.990 / 0.988 / 0.988 | 0.05 / 0.23 | 56.2 | 64% | 8% | 0.00 | 0.98 | 779 | 502 | 0.00 | 715 | 288 | 23% |
| 2 | v3.7 save | 42.1 | 0.0% | 1.00 | 29.9 | 13.6 | 0.993 / 0.987 / 0.984 | 0.00 / 0.34 | 56.3 | 66% | 10% | 0.00 | 0.98 | 779 | 502 | 0.00 | 715 | 288 | 23% |
| 2 | v3.7 save+tea | 42.1 | 0.0% | 1.00 | 29.9 | 13.6 | 0.993 / 0.987 / 0.984 | 0.00 / 0.34 | 56.3 | 66% | 10% | 0.00 | 0.98 | 779 | 502 | 0.00 | 715 | 288 | 23% |
| 3 | no spells | 38.7 | 0.0% | 1.00 | 35.0 | 17.3 | 0.990 / 0.982 / 0.989 | 0.00 / 0.00 | 62.9 | 81% | 0% | 0.04 | 0.97 | 1565 | 1082 | 0.00 | 0 | 528 | 24% |
| 3 | v3.7 free | 42.5 | 0.0% | 1.00 | 33.3 | 15.4 | 0.954 / 0.956 / 0.964 | 0.62 / 0.77 | 62.2 | 72% | 66% | 0.00 | 0.98 | 859 | 376 | 0.00 | 27 | 528 | 23% |
| 3 | v3.7 save | 38.7 | 0.0% | 1.00 | 32.9 | 17.0 | 0.991 / 0.959 / 0.962 | 0.00 / 0.83 | 61.9 | 81% | 92% | 0.02 | 0.97 | 847 | 363 | 0.00 | 18 | 528 | 23% |
| 3 | v3.7 save+tea | 38.6 | 0.0% | 1.00 | 32.8 | 17.0 | 0.991 / 0.959 / 0.956 | 0.00 / 0.99 | 61.8 | 81% | 92% | 0.02 | 0.97 | 849 | 366 | 0.00 | 18 | 528 | 23% |
| 4 | no spells | 49.3 | 0.7% | 1.00 | 29.7 | 18.8 | 0.976 / 0.976 / 0.988 | 0.00 / 0.00 | 57.1 | 79% | 0% | 0.08 | 0.98 | 2787 | 1963 | 0.00 | 0 | 912 | 24% |
| 4 | v3.7 free | 54.1 | 0.2% | 1.00 | 27.5 | 17.0 | 0.910 / 0.921 / 0.933 | 1.32 / 1.58 | 57.5 | 72% | 71% | 0.00 | 0.98 | 1989 | 1159 | 0.00 | 2081 | 912 | 24% |
| 4 | v3.7 save | 49.8 | 0.4% | 1.00 | 26.2 | 18.5 | 0.977 / 0.924 / 0.930 | 0.00 / 1.64 | 56.4 | 79% | 97% | 0.03 | 0.98 | 2022 | 1205 | 0.00 | 2234 | 912 | 24% |
| 4 | v3.7 save+tea | 50.3 | 0.5% | 1.00 | 26.4 | 18.5 | 0.977 / 0.922 / 0.929 | 0.00 / 1.71 | 56.9 | 79% | 97% | 0.03 | 0.98 | 2001 | 1180 | 0.00 | 2234 | 912 | 24% |
| 5 | no spells | 33.0 | 0.9% | 1.00 | 32.6 | 18.6 | 0.977 / 0.977 / 0.985 | 0.00 / 0.00 | 57.1 | 81% | 0% | 0.09 | 0.97 | 5536 | 4076 | 0.00 | 0 | 1560 | 24% |
| 5 | v3.7 free | 33.9 | 0.2% | 1.00 | 32.8 | 18.1 | 0.920 / 0.948 / 0.945 | 1.17 / 1.25 | 58.0 | 79% | 84% | 0.02 | 0.97 | 2432 | 984 | 0.00 | 259 | 1560 | 24% |
| 5 | v3.7 save | 33.0 | 0.7% | 1.00 | 32.5 | 18.7 | 0.978 / 0.944 / 0.944 | 0.00 / 1.32 | 57.4 | 82% | 99% | 0.06 | 0.97 | 2582 | 1154 | 0.00 | 108 | 1560 | 24% |
| 5 | v3.7 save+tea | 32.9 | 0.9% | 0.99 | 32.5 | 18.7 | 0.978 / 0.943 / 0.943 | 0.00 / 1.34 | 57.1 | 81% | 99% | 0.06 | 0.97 | 2500 | 574 | 0.00 | 0 | 1560 | 24% |
| 6 | no spells | 33.1 | 1.6% | 1.00 | 29.7 | 21.3 | 0.977 / 0.970 / 0.987 | 0.00 / 0.00 | 65.4 | 82% | 0% | 0.22 | 0.97 | 7675 | 5717 | 0.00 | 0 | 2160 | 22% |
| 6 | v3.7 free | 39.6 | 0.2% | 1.00 | 28.3 | 17.6 | 0.907 / 0.928 / 0.950 | 1.42 / 1.08 | 66.1 | 74% | 75% | 0.02 | 0.97 | 4004 | 2041 | 0.00 | 2673 | 2160 | 22% |
| 6 | v3.7 save | 33.4 | 1.2% | 1.00 | 27.9 | 21.2 | 0.978 / 0.930 / 0.951 | 0.00 / 1.08 | 65.3 | 83% | 99% | 0.18 | 0.97 | 4596 | 2637 | 0.00 | 2943 | 2160 | 22% |
| 6 | v3.7 save+tea | 33.6 | 1.5% | 1.00 | 27.4 | 21.1 | 0.977 / 0.933 / 0.948 | 0.00 / 1.20 | 65.5 | 82% | 98% | 0.18 | 0.97 | 3823 | 1914 | 0.00 | 1242 | 2160 | 22% |
| 7 | no spells | 38.8 | 1.8% | 1.00 | 32.9 | 22.8 | 0.975 / 0.967 / 0.985 | 0.00 / 0.00 | 79.2 | 75% | 0% | 0.38 | 0.97 | 10537 | 7946 | 0.00 | 0 | 2760 | 22% |
| 7 | v3.7 free | 44.1 | 0.2% | 1.00 | 31.0 | 19.7 | 0.911 / 0.924 / 0.942 | 1.51 / 1.34 | 79.5 | 83% | 86% | 0.03 | 0.98 | 4609 | 2010 | 0.00 | 1800 | 2760 | 22% |
| 7 | v3.7 save | 38.9 | 1.4% | 1.00 | 31.0 | 22.6 | 0.975 / 0.936 / 0.939 | 0.00 / 1.41 | 78.6 | 74% | 97% | 0.36 | 0.97 | 4680 | 2083 | 0.00 | 1404 | 2760 | 22% |
| 7 | v3.7 save+tea | 39.0 | 1.6% | 1.00 | 31.0 | 22.6 | 0.975 / 0.939 / 0.944 | 0.00 / 1.30 | 78.8 | 74% | 97% | 0.35 | 0.97 | 5478 | 2884 | 0.00 | 2484 | 2760 | 22% |
| 8 | no spells | 36.3 | 1.3% | 1.00 | 31.7 | 22.6 | 0.976 / 0.973 / 0.984 | 0.00 / 0.00 | 72.9 | 70% | 0% | 0.38 | 0.97 | 13847 | 10691 | 0.00 | 0 | 3360 | 23% |
| 8 | v3.7 free | 44.7 | 0.5% | 1.00 | 28.7 | 18.2 | 0.904 / 0.911 / 0.918 | 1.55 / 1.99 | 74.1 | 79% | 79% | 0.01 | 0.98 | 6466 | 3353 | 0.00 | 2680 | 3360 | 23% |
| 8 | v3.7 save | 37.0 | 1.1% | 0.99 | 28.7 | 22.5 | 0.977 / 0.931 / 0.916 | 0.00 / 2.04 | 73.5 | 72% | 97% | 0.34 | 0.97 | 6955 | 3799 | 0.00 | 3049 | 3360 | 23% |
| 8 | v3.7 save+tea | 36.4 | 1.0% | 1.00 | 29.1 | 22.4 | 0.977 / 0.934 / 0.921 | 0.00 / 1.93 | 72.2 | 71% | 96% | 0.35 | 0.97 | 5804 | 2775 | 0.00 | 1063 | 3360 | 23% |
| 9 | no spells | 34.3 | 1.1% | 1.00 | 34.7 | 22.4 | 0.979 / 0.970 / 0.983 | 0.00 / 0.00 | 68.9 | 75% | 0% | 0.37 | 0.97 | 17620 | 13764 | 0.00 | 0 | 4080 | 23% |
| 9 | v3.7 free | 38.7 | 0.5% | 1.00 | 31.2 | 19.6 | 0.952 / 0.951 / 0.956 | 0.60 / 0.98 | 68.6 | 72% | 98% | 0.26 | 0.97 | 8117 | 880 | 0.00 | 8549 | 4080 | 23% |
| 9 | v3.7 save | 34.7 | 0.8% | 1.00 | 31.3 | 22.2 | 0.980 / 0.945 / 0.953 | 0.00 / 1.03 | 68.7 | 75% | 99% | 0.36 | 0.97 | 7925 | 1151 | 0.00 | 6490 | 4080 | 23% |
| 9 | v3.7 save+tea | 34.5 | 1.1% | 1.00 | 31.7 | 22.2 | 0.979 / 0.949 / 0.955 | 0.00 / 1.02 | 68.4 | 75% | 99% | 0.36 | 0.97 | 7859 | 1366 | 0.00 | 7238 | 4080 | 23% |

### 7.8 Per realm, 50% saver

| realm | mode | battles | defeat % | boss 1st-try | boss q | normal q | q share normal / elite / boss | casts/b normal / boss | min/location | MP at battle start | spell castable at start | heals/b | full gear | gold start | min gold | free inns | spell spend | gear spend | proficient at end |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | no spells | 65.9 | 0.1% | 1.00 | 31.2 | 15.2 | 0.990 / 0.979 / 0.997 | 0.00 / 0.00 | 62.0 | 100% | 0% | 0.00 | 0.90 | 24 | 28 | 0.00 | 0 | 35 | 25% |
| 1 | v3.7 free | 65.9 | 0.1% | 1.00 | 31.2 | 15.2 | 0.990 / 0.979 / 0.997 | 0.00 / 0.00 | 62.0 | 100% | 0% | 0.00 | 0.90 | 24 | 28 | 0.00 | 0 | 35 | 25% |
| 1 | v3.7 save | 65.9 | 0.1% | 1.00 | 31.2 | 15.2 | 0.990 / 0.979 / 0.997 | 0.00 / 0.00 | 62.0 | 100% | 0% | 0.00 | 0.90 | 24 | 28 | 0.00 | 0 | 35 | 25% |
| 1 | v3.7 save+tea | 65.9 | 0.1% | 1.00 | 31.2 | 15.2 | 0.990 / 0.979 / 0.997 | 0.00 / 0.00 | 62.0 | 100% | 0% | 0.00 | 0.90 | 24 | 28 | 0.00 | 0 | 35 | 25% |
| 2 | no spells | 50.0 | 0.7% | 1.00 | 37.0 | 15.4 | 0.989 / 0.976 / 0.980 | 0.00 / 0.00 | 72.3 | 76% | 0% | 0.00 | 0.97 | 760 | 447 | 0.00 | 0 | 288 | 23% |
| 2 | v3.7 free | 50.0 | 0.7% | 1.00 | 36.9 | 15.4 | 0.988 / 0.976 / 0.979 | 0.01 / 0.04 | 72.3 | 76% | 1% | 0.00 | 0.97 | 760 | 447 | 0.00 | 427 | 288 | 23% |
| 2 | v3.7 save | 49.9 | 0.7% | 1.00 | 36.9 | 15.4 | 0.989 / 0.976 / 0.979 | 0.00 / 0.04 | 72.2 | 76% | 1% | 0.00 | 0.97 | 760 | 447 | 0.00 | 427 | 288 | 23% |
| 2 | v3.7 save+tea | 49.9 | 0.7% | 1.00 | 36.9 | 15.4 | 0.989 / 0.976 / 0.979 | 0.00 / 0.04 | 72.2 | 76% | 1% | 0.00 | 0.97 | 760 | 447 | 0.00 | 427 | 288 | 23% |
| 3 | no spells | 43.6 | 1.1% | 0.98 | 41.4 | 20.4 | 0.978 / 0.963 / 0.971 | 0.00 / 0.00 | 80.5 | 89% | 0% | 0.24 | 0.97 | 1362 | 843 | 0.00 | 0 | 528 | 23% |
| 3 | v3.7 free | 48.0 | 0.6% | 0.97 | 39.6 | 18.2 | 0.956 / 0.944 / 0.955 | 0.53 / 0.54 | 79.9 | 88% | 54% | 0.08 | 0.98 | 937 | 427 | 0.00 | 0 | 528 | 23% |
| 3 | v3.7 save | 43.5 | 0.9% | 0.97 | 39.4 | 20.4 | 0.978 / 0.946 / 0.954 | 0.00 / 0.59 | 80.0 | 89% | 58% | 0.22 | 0.98 | 935 | 419 | 0.00 | 0 | 528 | 23% |
| 3 | v3.7 save+tea | 43.6 | 0.9% | 0.98 | 39.4 | 20.4 | 0.978 / 0.947 / 0.954 | 0.00 / 0.60 | 80.1 | 89% | 58% | 0.22 | 0.98 | 935 | 419 | 0.00 | 0 | 528 | 23% |
| 4 | no spells | 59.5 | 8.6% | 0.96 | 34.4 | 20.9 | 0.967 / 0.967 / 0.973 | 0.00 / 0.00 | 73.8 | 87% | 0% | 0.26 | 0.97 | 2074 | 1064 | 0.00 | 0 | 912 | 24% |
| 4 | v3.7 free | 63.1 | 5.5% | 0.95 | 32.0 | 19.6 | 0.917 / 0.921 / 0.938 | 1.05 / 1.17 | 74.3 | 87% | 53% | 0.10 | 0.97 | 1715 | 755 | 0.00 | 46 | 912 | 23% |
| 4 | v3.7 save | 60.0 | 9.3% | 0.94 | 31.3 | 20.9 | 0.967 / 0.926 / 0.937 | 0.00 / 1.22 | 73.9 | 87% | 59% | 0.22 | 0.96 | 1647 | 693 | 0.00 | 46 | 912 | 24% |
| 4 | v3.7 save+tea | 59.9 | 9.1% | 0.94 | 31.3 | 20.9 | 0.967 / 0.927 / 0.936 | 0.00 / 1.23 | 73.8 | 87% | 59% | 0.22 | 0.96 | 1648 | 698 | 0.00 | 46 | 912 | 24% |
| 5 | no spells | 39.8 | 12.5% | 0.93 | 37.7 | 20.9 | 0.968 / 0.968 / 0.972 | 0.00 / 0.00 | 74.4 | 87% | 0% | 0.31 | 0.96 | 3309 | 1636 | 0.00 | 0 | 1560 | 24% |
| 5 | v3.7 free | 39.9 | 10.5% | 0.92 | 37.1 | 20.6 | 0.956 / 0.959 / 0.965 | 0.23 / 0.28 | 73.8 | 87% | 60% | 0.25 | 0.96 | 2974 | 1333 | 0.00 | 0 | 1560 | 24% |
| 5 | v3.7 save | 40.2 | 11.8% | 0.92 | 36.7 | 20.8 | 0.967 / 0.959 / 0.966 | 0.00 / 0.28 | 74.8 | 88% | 61% | 0.30 | 0.96 | 2886 | 1297 | 0.00 | 0 | 1560 | 24% |
| 5 | v3.7 save+tea | 40.1 | 11.8% | 0.93 | 36.8 | 20.9 | 0.967 / 0.958 / 0.965 | 0.00 / 0.27 | 74.7 | 88% | 61% | 0.30 | 0.96 | 2897 | 1014 | 0.00 | 0 | 1560 | 24% |
| 6 | no spells | 40.1 | 13.9% | 0.95 | 34.7 | 23.9 | 0.968 / 0.966 / 0.975 | 0.00 / 0.00 | 85.2 | 88% | 0% | 0.50 | 0.97 | 3891 | 1857 | 0.00 | 0 | 2160 | 22% |
| 6 | v3.7 free | 40.4 | 13.7% | 0.94 | 33.8 | 23.7 | 0.965 / 0.959 / 0.969 | 0.09 / 0.20 | 85.0 | 89% | 61% | 0.48 | 0.97 | 3729 | 1699 | 0.00 | 0 | 2160 | 22% |
| 6 | v3.7 save | 40.1 | 13.7% | 0.96 | 34.9 | 23.8 | 0.967 / 0.963 / 0.968 | 0.01 / 0.20 | 85.0 | 89% | 61% | 0.50 | 0.97 | 3634 | 1621 | 0.00 | 0 | 2160 | 22% |
| 6 | v3.7 save+tea | 40.1 | 13.4% | 0.95 | 34.9 | 23.8 | 0.967 / 0.962 / 0.969 | 0.01 / 0.18 | 85.2 | 89% | 61% | 0.50 | 0.97 | 3359 | 1362 | 0.00 | 0 | 2160 | 22% |
| 7 | no spells | 48.3 | 21.0% | 0.83 | 35.9 | 24.9 | 0.967 / 0.965 / 0.976 | 0.00 / 0.00 | 104.4 | 83% | 0% | 0.64 | 0.97 | 4918 | 2089 | 0.00 | 0 | 2760 | 22% |
| 7 | v3.7 free | 48.3 | 17.6% | 0.84 | 35.4 | 25.0 | 0.953 / 0.951 / 0.962 | 0.31 / 0.45 | 105.1 | 86% | 61% | 0.58 | 0.97 | 4794 | 2064 | 0.00 | 0 | 2760 | 22% |
| 7 | v3.7 save | 47.8 | 20.0% | 0.85 | 35.5 | 25.0 | 0.967 / 0.952 / 0.966 | 0.00 / 0.36 | 103.8 | 83% | 60% | 0.63 | 0.97 | 4748 | 1971 | 0.00 | 0 | 2760 | 22% |
| 7 | v3.7 save+tea | 47.7 | 19.7% | 0.85 | 35.7 | 24.9 | 0.967 / 0.951 / 0.965 | 0.00 / 0.38 | 103.3 | 83% | 60% | 0.62 | 0.97 | 4480 | 1745 | 0.00 | 0 | 2760 | 22% |
| 8 | no spells | 44.7 | 16.5% | 0.91 | 35.9 | 25.0 | 0.966 / 0.964 / 0.973 | 0.00 / 0.00 | 96.3 | 81% | 0% | 0.65 | 0.97 | 4738 | 1480 | 0.00 | 0 | 3360 | 23% |
| 8 | v3.7 free | 44.2 | 15.7% | 0.89 | 36.0 | 25.1 | 0.953 / 0.954 / 0.961 | 0.30 / 0.42 | 96.1 | 83% | 61% | 0.63 | 0.96 | 4785 | 1539 | 0.00 | 0 | 3360 | 23% |
| 8 | v3.7 save | 43.8 | 15.6% | 0.89 | 35.8 | 25.2 | 0.962 / 0.954 / 0.961 | 0.10 / 0.41 | 95.1 | 82% | 61% | 0.66 | 0.96 | 4689 | 1489 | 0.00 | 0 | 3360 | 23% |
| 8 | v3.7 save+tea | 44.3 | 16.8% | 0.87 | 35.5 | 25.1 | 0.962 / 0.955 / 0.963 | 0.10 / 0.37 | 96.1 | 82% | 61% | 0.66 | 0.96 | 4352 | 1229 | 0.00 | 0 | 3360 | 23% |
| 9 | no spells | 41.4 | 16.5% | 0.87 | 38.7 | 25.2 | 0.967 / 0.964 / 0.974 | 0.00 / 0.00 | 90.6 | 84% | 0% | 0.69 | 0.96 | 5586 | 1668 | 0.00 | 0 | 4080 | 23% |
| 9 | v3.7 free | 41.7 | 18.0% | 0.84 | 37.3 | 25.2 | 0.959 / 0.956 / 0.971 | 0.20 / 0.25 | 91.4 | 85% | 61% | 0.71 | 0.96 | 5488 | 1629 | 0.00 | 0 | 4080 | 23% |
| 9 | v3.7 save | 41.6 | 16.4% | 0.84 | 37.6 | 25.2 | 0.967 / 0.956 / 0.970 | 0.00 / 0.23 | 91.0 | 84% | 62% | 0.69 | 0.96 | 5554 | 1668 | 0.00 | 0 | 4080 | 23% |
| 9 | v3.7 save+tea | 41.8 | 16.6% | 0.83 | 37.5 | 25.2 | 0.966 / 0.956 / 0.970 | 0.00 / 0.24 | 91.6 | 84% | 62% | 0.69 | 0.94 | 5002 | 1299 | 0.00 | 0 | 4080 | 23% |

### 7.9 Per realm, 90% saver

| realm | mode | battles | defeat % | boss 1st-try | boss q | normal q | q share normal / elite / boss | casts/b normal / boss | min/location | MP at battle start | spell castable at start | heals/b | full gear | gold start | min gold | free inns | spell spend | gear spend | proficient at end |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | no spells | 50.1 | 0.0% | 1.00 | 18.9 | 9.8 | 1.000 / 1.000 / 1.000 | 0.00 / 0.00 | 34.8 | 100% | 0% | 0.00 | 0.92 | 24 | 33 | 0.00 | 0 | 35 | 26% |
| 1 | v3.7 free | 50.1 | 0.0% | 1.00 | 18.9 | 9.8 | 1.000 / 1.000 / 1.000 | 0.00 / 0.00 | 34.8 | 100% | 0% | 0.00 | 0.92 | 24 | 33 | 0.00 | 0 | 35 | 26% |
| 1 | v3.7 save | 50.1 | 0.0% | 1.00 | 18.9 | 9.8 | 1.000 / 1.000 / 1.000 | 0.00 / 0.00 | 34.8 | 100% | 0% | 0.00 | 0.92 | 24 | 33 | 0.00 | 0 | 35 | 26% |
| 1 | v3.7 save+tea | 50.1 | 0.0% | 1.00 | 18.9 | 9.8 | 1.000 / 1.000 / 1.000 | 0.00 / 0.00 | 34.8 | 100% | 0% | 0.00 | 0.92 | 24 | 33 | 0.00 | 0 | 35 | 26% |
| 2 | no spells | 36.2 | 0.0% | 1.00 | 22.0 | 10.5 | 0.998 / 1.000 / 1.000 | 0.00 / 0.00 | 40.9 | 46% | 0% | 0.01 | 0.97 | 807 | 538 | 0.00 | 0 | 288 | 24% |
| 2 | v3.7 free | 36.5 | 0.0% | 1.00 | 21.7 | 10.4 | 0.994 / 0.998 / 0.992 | 0.04 / 0.17 | 40.7 | 43% | 10% | 0.01 | 0.97 | 807 | 537 | 0.00 | 742 | 288 | 23% |
| 2 | v3.7 save | 36.1 | 0.0% | 1.00 | 21.8 | 10.5 | 0.998 / 0.995 / 0.985 | 0.00 / 0.33 | 40.8 | 46% | 13% | 0.01 | 0.97 | 807 | 537 | 0.00 | 756 | 288 | 23% |
| 2 | v3.7 save+tea | 36.1 | 0.0% | 1.00 | 21.8 | 10.5 | 0.998 / 0.995 / 0.985 | 0.00 / 0.33 | 40.8 | 46% | 13% | 0.01 | 0.97 | 807 | 537 | 0.00 | 760 | 288 | 23% |
| 3 | no spells | 34.1 | 0.0% | 1.00 | 23.8 | 13.2 | 0.999 / 0.999 / 1.000 | 0.00 / 0.00 | 44.9 | 61% | 0% | 0.00 | 0.97 | 1766 | 1284 | 0.00 | 0 | 528 | 24% |
| 3 | v3.7 free | 35.9 | 0.0% | 1.00 | 22.8 | 12.4 | 0.981 / 0.985 / 0.983 | 0.22 / 0.39 | 44.9 | 48% | 43% | 0.00 | 0.97 | 1028 | 543 | 0.00 | 1089 | 528 | 23% |
| 3 | v3.7 save | 34.7 | 0.0% | 1.00 | 22.8 | 13.0 | 0.999 / 0.982 / 0.968 | 0.00 / 0.75 | 45.0 | 58% | 58% | 0.00 | 0.97 | 1001 | 518 | 0.00 | 1035 | 528 | 23% |
| 3 | v3.7 save+tea | 34.6 | 0.0% | 1.00 | 22.5 | 13.0 | 0.999 / 0.981 / 0.959 | 0.00 / 0.96 | 44.9 | 58% | 58% | 0.00 | 0.97 | 1003 | 521 | 0.00 | 819 | 528 | 23% |
| 4 | no spells | 44.2 | 0.0% | 1.00 | 20.5 | 14.2 | 0.999 / 1.000 / 1.000 | 0.00 / 0.00 | 40.9 | 61% | 0% | 0.00 | 0.98 | 3300 | 2492 | 0.00 | 0 | 912 | 24% |
| 4 | v3.7 free | 45.5 | 0.0% | 1.00 | 19.2 | 13.6 | 0.964 / 0.968 / 0.953 | 0.48 / 0.94 | 40.8 | 35% | 34% | 0.00 | 0.98 | 1492 | 681 | 0.00 | 2337 | 912 | 24% |
| 4 | v3.7 save | 44.1 | 0.0% | 1.00 | 18.7 | 14.2 | 0.998 / 0.956 / 0.929 | 0.00 / 1.43 | 40.7 | 56% | 70% | 0.00 | 0.98 | 1512 | 704 | 0.00 | 2355 | 912 | 24% |
| 4 | v3.7 save+tea | 44.4 | 0.0% | 1.00 | 18.7 | 14.2 | 0.998 / 0.958 / 0.922 | 0.00 / 1.58 | 40.9 | 57% | 70% | 0.00 | 0.98 | 1665 | 861 | 0.00 | 2353 | 912 | 24% |
| 5 | no spells | 29.1 | 0.0% | 1.00 | 22.1 | 14.3 | 0.999 / 0.999 / 1.000 | 0.00 / 0.00 | 40.9 | 62% | 0% | 0.01 | 0.97 | 6859 | 5469 | 0.00 | 0 | 1560 | 24% |
| 5 | v3.7 free | 29.3 | 0.0% | 1.00 | 22.1 | 14.2 | 0.961 / 0.969 / 0.951 | 0.55 / 1.13 | 41.4 | 38% | 42% | 0.00 | 0.97 | 2625 | 1219 | 0.00 | 540 | 1560 | 24% |
| 5 | v3.7 save | 29.4 | 0.0% | 1.00 | 22.2 | 14.2 | 0.999 / 0.950 / 0.932 | 0.00 / 1.61 | 41.2 | 60% | 78% | 0.00 | 0.97 | 2630 | 1229 | 0.00 | 670 | 1560 | 24% |
| 5 | v3.7 save+tea | 29.2 | 0.0% | 1.00 | 22.3 | 14.3 | 0.999 / 0.956 / 0.932 | 0.00 / 1.60 | 41.1 | 60% | 80% | 0.00 | 0.97 | 2651 | 779 | 0.00 | 238 | 1560 | 24% |
| 6 | no spells | 29.4 | 0.0% | 1.00 | 21.0 | 16.3 | 0.999 / 0.999 / 1.000 | 0.00 / 0.00 | 47.4 | 64% | 0% | 0.00 | 0.97 | 9715 | 7833 | 0.00 | 0 | 2160 | 22% |
| 6 | v3.7 free | 30.4 | 0.0% | 1.00 | 21.6 | 15.8 | 0.960 / 0.966 / 0.954 | 0.63 / 1.03 | 48.2 | 38% | 41% | 0.00 | 0.97 | 4748 | 2728 | 0.00 | 3402 | 2160 | 22% |
| 6 | v3.7 save | 29.5 | 0.0% | 1.00 | 20.9 | 16.2 | 0.999 / 0.953 / 0.943 | 0.00 / 1.25 | 47.6 | 62% | 81% | 0.00 | 0.97 | 4734 | 2708 | 0.00 | 3375 | 2160 | 22% |
| 6 | v3.7 save+tea | 29.6 | 0.0% | 1.00 | 20.7 | 16.3 | 0.999 / 0.953 / 0.944 | 0.00 / 1.23 | 47.7 | 63% | 83% | 0.00 | 0.97 | 4113 | 2199 | 0.00 | 3024 | 2160 | 22% |
| 7 | no spells | 36.0 | 0.0% | 1.00 | 22.8 | 16.5 | 0.999 / 0.998 / 1.000 | 0.00 / 0.00 | 56.5 | 51% | 0% | 0.00 | 0.97 | 13749 | 11325 | 0.00 | 0 | 2760 | 22% |
| 7 | v3.7 free | 37.5 | 0.0% | 1.00 | 21.6 | 15.9 | 0.961 / 0.966 / 0.948 | 0.62 / 1.17 | 56.9 | 38% | 43% | 0.00 | 0.97 | 5148 | 2651 | 0.00 | 5040 | 2760 | 22% |
| 7 | v3.7 save | 36.0 | 0.0% | 1.00 | 20.9 | 16.5 | 0.999 / 0.957 / 0.931 | 0.00 / 1.53 | 56.2 | 51% | 79% | 0.01 | 0.97 | 5311 | 2801 | 0.00 | 5112 | 2760 | 22% |
| 7 | v3.7 save+tea | 36.0 | 0.0% | 1.00 | 21.8 | 16.6 | 0.999 / 0.962 / 0.927 | 0.00 / 1.69 | 56.4 | 51% | 80% | 0.01 | 0.97 | 4530 | 2017 | 0.00 | 2844 | 2760 | 22% |
| 8 | no spells | 34.1 | 0.0% | 1.00 | 21.7 | 16.4 | 0.999 / 0.999 / 1.000 | 0.00 / 0.00 | 52.4 | 45% | 0% | 0.01 | 0.97 | 19440 | 16465 | 0.00 | 0 | 3360 | 23% |
| 8 | v3.7 free | 35.1 | 0.0% | 1.00 | 21.1 | 15.7 | 0.961 / 0.965 / 0.937 | 0.61 / 1.42 | 52.2 | 39% | 42% | 0.00 | 0.97 | 5619 | 2535 | 0.00 | 2495 | 3360 | 23% |
| 8 | v3.7 save | 33.6 | 0.0% | 1.00 | 21.1 | 16.6 | 0.999 / 0.970 / 0.923 | 0.00 / 1.77 | 52.2 | 46% | 72% | 0.01 | 0.97 | 5739 | 2667 | 0.00 | 3003 | 3360 | 23% |
| 8 | v3.7 save+tea | 33.7 | 0.0% | 1.00 | 20.9 | 16.5 | 0.999 / 0.971 / 0.910 | 0.00 / 2.05 | 52.1 | 46% | 72% | 0.01 | 0.97 | 6127 | 3038 | 0.00 | 3280 | 3360 | 23% |
| 9 | no spells | 31.8 | 0.0% | 1.00 | 23.2 | 16.4 | 0.999 / 0.997 / 0.999 | 0.00 / 0.00 | 49.2 | 46% | 0% | 0.00 | 0.97 | 25530 | 21892 | 0.00 | 0 | 4080 | 23% |
| 9 | v3.7 free | 33.1 | 0.0% | 1.00 | 22.2 | 15.5 | 0.983 / 0.984 / 0.970 | 0.25 / 0.69 | 48.6 | 42% | 71% | 0.00 | 0.97 | 9036 | 810 | 0.00 | 9590 | 4080 | 23% |
| 9 | v3.7 save | 31.9 | 0.0% | 1.00 | 22.3 | 16.3 | 0.999 / 0.985 / 0.962 | 0.00 / 0.89 | 48.9 | 46% | 80% | 0.00 | 0.97 | 8656 | 844 | 0.00 | 9528 | 4080 | 23% |
| 9 | v3.7 save+tea | 31.6 | 0.0% | 1.00 | 21.8 | 16.4 | 0.999 / 0.985 / 0.951 | 0.00 / 1.11 | 48.6 | 47% | 80% | 0.00 | 0.97 | 7391 | 967 | 0.00 | 8050 | 4080 | 23% |

### 7.10 Boss fights by realm

| realm | acc | no spells | free | save | save+tea | length target (q) |
|---|---|---|---|---|---|---|
| 1 | 75% | 1.00 / 23.7 / 0.00 / 17% | 1.00 / 23.7 / 0.00 / 17% | 1.00 / 23.7 / 0.00 / 17% | 1.00 / 23.7 / 0.00 / 17% | ~15 (location) / ~20 (realm) correct answers even with full-MP spells (v3.7) |
| 1 | 50% | 1.00 / 31.2 / 0.00 / 40% | 1.00 / 31.2 / 0.00 / 40% | 1.00 / 31.2 / 0.00 / 40% | 1.00 / 31.2 / 0.00 / 40% | ~15 (location) / ~20 (realm) correct answers even with full-MP spells (v3.7) |
| 2 | 75% | 1.00 / 28.0 / 0.00 / 26% | 1.00 / 27.5 / 0.24 / 26% | 1.00 / 27.5 / 0.36 / 27% | 1.00 / 27.5 / 0.36 / 27% | ~15 (location) / ~20 (realm) correct answers even with full-MP spells (v3.7) |
| 2 | 50% | 1.00 / 37.0 / 0.00 / 46% | 1.00 / 36.9 / 0.04 / 45% | 1.00 / 36.9 / 0.04 / 46% | 1.00 / 36.9 / 0.04 / 45% | ~15 (location) / ~20 (realm) correct answers even with full-MP spells (v3.7) |
| 3 | 75% | 1.00 / 30.1 / 0.00 / 31% | 1.00 / 29.4 / 0.64 / 32% | 1.00 / 29.3 / 0.75 / 33% | 1.00 / 28.6 / 0.97 / 34% | ~15 (location) / ~20 (realm) correct answers even with full-MP spells (v3.7) |
| 3 | 50% | 0.98 / 41.4 / 0.00 / 53% | 0.97 / 39.6 / 0.54 / 53% | 0.97 / 39.4 / 0.59 / 53% | 0.98 / 39.4 / 0.60 / 53% | ~15 (location) / ~20 (realm) correct answers even with full-MP spells (v3.7) |
| 4 | 75% | 1.00 / 25.7 / 0.00 / 28% | 1.00 / 23.7 / 1.36 / 28% | 1.00 / 23.5 / 1.62 / 31% | 1.00 / 23.5 / 1.71 / 30% | ~15 (location) / ~20 (realm) correct answers even with full-MP spells (v3.7) |
| 4 | 50% | 0.96 / 34.4 / 0.00 / 54% | 0.95 / 32.0 / 1.17 / 58% | 0.94 / 31.3 / 1.22 / 60% | 0.94 / 31.3 / 1.23 / 59% | ~15 (location) / ~20 (realm) correct answers even with full-MP spells (v3.7) |
| 5 | 75% | 1.00 / 28.5 / 0.00 / 33% | 1.00 / 28.5 / 1.31 / 34% | 1.00 / 28.0 / 1.41 / 32% | 1.00 / 28.1 / 1.48 / 32% | ~15 (location) / ~20 (realm) correct answers even with full-MP spells (v3.7) |
| 5 | 50% | 0.93 / 37.7 / 0.00 / 59% | 0.92 / 37.1 / 0.28 / 60% | 0.92 / 36.7 / 0.28 / 62% | 0.93 / 36.8 / 0.27 / 61% | ~15 (location) / ~20 (realm) correct answers even with full-MP spells (v3.7) |
| 6 | 75% | 1.00 / 26.6 / 0.00 / 31% | 1.00 / 25.0 / 0.94 / 30% | 1.00 / 26.0 / 1.29 / 32% | 1.00 / 24.9 / 1.08 / 31% | ~15 (location) / ~20 (realm) correct answers even with full-MP spells (v3.7) |
| 6 | 50% | 0.95 / 34.7 / 0.00 / 56% | 0.94 / 33.8 / 0.20 / 57% | 0.96 / 34.9 / 0.20 / 55% | 0.95 / 34.9 / 0.18 / 56% | ~15 (location) / ~20 (realm) correct answers even with full-MP spells (v3.7) |
| 7 | 75% | 1.00 / 29.3 / 0.00 / 32% | 1.00 / 26.8 / 1.33 / 34% | 1.00 / 26.0 / 1.50 / 32% | 1.00 / 27.2 / 1.53 / 32% | ~15 (location) / ~20 (realm) correct answers even with full-MP spells (v3.7) |
| 7 | 50% | 0.83 / 35.9 / 0.00 / 68% | 0.84 / 35.4 / 0.45 / 70% | 0.85 / 35.5 / 0.36 / 70% | 0.85 / 35.7 / 0.38 / 69% | ~15 (location) / ~20 (realm) correct answers even with full-MP spells (v3.7) |
| 8 | 75% | 1.00 / 28.0 / 0.00 / 32% | 1.00 / 25.2 / 1.89 / 34% | 1.00 / 25.3 / 2.24 / 33% | 1.00 / 25.7 / 2.04 / 33% | ~15 (location) / ~20 (realm) correct answers even with full-MP spells (v3.7) |
| 8 | 50% | 0.91 / 35.9 / 0.00 / 61% | 0.89 / 36.0 / 0.42 / 63% | 0.89 / 35.8 / 0.41 / 63% | 0.87 / 35.5 / 0.37 / 63% | ~15 (location) / ~20 (realm) correct answers even with full-MP spells (v3.7) |
| 9 | 75% | 1.00 / 30.1 / 0.00 / 34% | 1.00 / 27.6 / 0.99 / 32% | 1.00 / 27.5 / 1.02 / 34% | 1.00 / 27.5 / 1.05 / 32% | ~15 (location) / ~20 (realm) correct answers even with full-MP spells (v3.7) |
| 9 | 50% | 0.87 / 38.7 / 0.00 / 66% | 0.84 / 37.3 / 0.25 / 72% | 0.84 / 37.6 / 0.23 / 70% | 0.83 / 37.5 / 0.24 / 70% | ~15 (location) / ~20 (realm) correct answers even with full-MP spells (v3.7) |

### 7.11 Gold and MP timeline

| realm | no spells: gold at end | free: gold at end | save: gold at end | save+tea: gold at end | save: spells owned | free / save / save+tea: MP at battle start | free / save / save+tea: MP at boss start | save+tea: teas bought / drunk, tea gold | save: spell spend | save: gear spend |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 741 | 741 | 741 | 741 | 0.0 | 100% / 100% / 100% | 100% / 100% / 100% | 0.00 / 0.00, 0 | 0 | 35 |
| 2 | 1574 | 851 | 847 | 849 | 1.0 | 55% / 57% / 57% | 72% / 77% / 77% | 0.00 / 0.57, 0 | 724 | 288 |
| 3 | 2911 | 2075 | 2040 | 2011 | 1.2 | 62% / 73% / 73% | 89% / 90% / 98% | 0.33 / 1.25, 36 | 279 | 528 |
| 4 | 6071 | 2671 | 2846 | 2770 | 2.2 | 58% / 72% / 73% | 89% / 96% / 100% | 0.61 / 1.75, 98 | 2228 | 912 |
| 5 | 8593 | 4769 | 4542 | 4259 | 2.5 | 66% / 77% / 77% | 89% / 96% / 97% | 1.63 / 0.63, 878 | 1058 | 1560 |
| 6 | 12342 | 4282 | 4791 | 4037 | 3.2 | 62% / 77% / 78% | 92% / 96% / 98% | 0.33 / 0.74, 225 | 2835 | 2160 |
| 7 | 17217 | 7323 | 5234 | 6650 | 3.9 | 68% / 69% / 69% | 92% / 99% / 100% | 1.12 / 1.12, 907 | 3924 | 2760 |
| 8 | 22389 | 7886 | 9021 | 6847 | 4.3 | 64% / 65% / 65% | 92% / 99% / 100% | 1.19 / 1.19, 1121 | 2310 | 3360 |
| 9 | 27393 | 4537 | 5068 | 3431 | 5.3 | 62% / 67% / 67% | 95% / 98% / 100% | 0.98 / 1.08, 1058 | 9173 | 4080 |

Spell timelines (save style):

75% saver:

| spell | town | sold from (h) | first affordable (realm, h) | bought by % of runs | bought (realm, h, battle #) |
|---|---|---|---|---|---|
| 小火球术 Small Fireball | 2 | 2.1 | 2, 2.3 | 100% | 2, 3.4, 85 |
| 泡泡术 Bubble Spell | 2 | 2.1 | 2, 2.3 | 1% | 2, 3.8, 100 |
| 雪球术 Snowball Volley | 3 | 3.7 | 3, 4.6 | 0% | - |
| 小闪电术 Little Lightning | 3 | 3.7 | 3, 5.0 | 21% | 3, 5.6, 132 |
| 火球术 Fireball | 4 | 5.5 | 4, 5.7 | 1% | 4, 7.9, 180 |
| 旋风术 Whirlwind | 4 | 5.5 | 4, 6.4 | 96% | 4, 7.3, 162 |
| 雪花术 Snowflake Dance | 5 | 8.0 | 5, 8.9 | 33% | 5, 9.6, 206 |
| 闪电术 Lightning Bolt | 5 | 8.0 | 5, 8.2 | 0% | - |
| 阳光术 Sunbeam | 6 | 9.6 | 6, 10.0 | 0% | - |
| 大火球术 Big Fireball | 6 | 9.6 | 6, 10.0 | 70% | 6, 11.2, 231 |
| 暴风雪术 Blizzard | 7 | 11.5 | 7, 12.5 | 73% | 7, 13.5, 270 |
| 龙卷风术 Tornado | 7 | 11.5 | 7, 11.9 | 0% | - |
| 流星术 Meteor | 8 | 13.8 | 8, 14.7 | 0% | - |
| 雷雨术 Thunderstorm | 8 | 13.8 | 8, 15.2 | 33% | 8, 15.7, 306 |
| 超暴风雪术 Super Blizzard | 9 | 15.9 | 9, 16.5 | 98% | 9, 17.1, 328 |
| 流星雨术 Meteor Shower | 9 | 15.9 | 9, 16.3 | 0% | - |

75% spender:

| spell | town | sold from (h) | first affordable (realm, h) | bought by % of runs | bought (realm, h, battle #) |
|---|---|---|---|---|---|
| 小火球术 Small Fireball | 2 | 1.5 | 2, 2.4 | 2% | 2, 2.8, 55 |
| 泡泡术 Bubble Spell | 2 | 1.5 | 2, 1.7 | 0% | - |
| 雪球术 Snowball Volley | 3 | 2.6 | 3, 3.0 | 0% | - |
| 小闪电术 Little Lightning | 3 | 2.6 | 3, 3.6 | 0% | - |
| 火球术 Fireball | 4 | 3.8 | 4, 4.6 | 0% | - |
| 旋风术 Whirlwind | 4 | 3.8 | 4, 4.9 | 81% | 4, 5.7, 110 |
| 雪花术 Snowflake Dance | 5 | 5.7 | 5, 7.0 | 8% | 5, 7.0, 132 |
| 闪电术 Lightning Bolt | 5 | 5.7 | 5, 6.8 | 0% | - |
| 阳光术 Sunbeam | 6 | 7.0 | 6, 7.4 | 0% | - |
| 大火球术 Big Fireball | 6 | 7.0 | 6, 8.2 | 12% | 6, 8.4, 154 |
| 暴风雪术 Blizzard | 7 | 8.4 | 7, 8.7 | 5% | 7, 10.1, 176 |
| 龙卷风术 Tornado | 7 | 8.4 | 7, 8.7 | 0% | - |
| 流星术 Meteor | 8 | 10.0 | 8, 10.2 | 0% | - |
| 雷雨术 Thunderstorm | 8 | 10.0 | 8, 10.2 | 6% | 8, 11.3, 198 |
| 超暴风雪术 Super Blizzard | 9 | 11.4 | 9, 11.6 | 89% | 9, 12.2, 209 |
| 流星雨术 Meteor Shower | 9 | 11.4 | 9, 11.6 | 0% | - |

90% saver:

| spell | town | sold from (h) | first affordable (realm, h) | bought by % of runs | bought (realm, h, battle #) |
|---|---|---|---|---|---|
| 小火球术 Small Fireball | 2 | 1.7 | 2, 2.0 | 100% | 2, 2.8, 76 |
| 泡泡术 Bubble Spell | 2 | 1.7 | 2, 1.9 | 7% | 2, 3.1, 88 |
| 雪球术 Snowball Volley | 3 | 3.1 | 3, 3.7 | 0% | - |
| 小闪电术 Little Lightning | 3 | 3.1 | 3, 4.0 | 77% | 3, 4.6, 121 |
| 火球术 Fireball | 4 | 4.6 | 4, 5.6 | 4% | 4, 6.6, 168 |
| 旋风术 Whirlwind | 4 | 4.6 | 4, 5.7 | 99% | 4, 6.4, 159 |
| 雪花术 Snowflake Dance | 5 | 6.6 | 5, 7.6 | 21% | 5, 8.0, 192 |
| 闪电术 Lightning Bolt | 5 | 6.6 | 5, 7.4 | 0% | - |
| 阳光术 Sunbeam | 6 | 8.0 | 6, 8.3 | 0% | - |
| 大火球术 Big Fireball | 6 | 8.0 | 6, 8.3 | 83% | 6, 9.3, 217 |
| 暴风雪术 Blizzard | 7 | 9.6 | 7, 10.4 | 95% | 7, 11.2, 255 |
| 龙卷风术 Tornado | 7 | 9.6 | 7, 9.8 | 0% | - |
| 流星术 Meteor | 8 | 11.5 | 8, 12.2 | 0% | - |
| 雷雨术 Thunderstorm | 8 | 11.5 | 8, 12.6 | 43% | 8, 13.2, 293 |
| 超暴风雪术 Super Blizzard | 9 | 13.2 | 9, 13.6 | 99% | 9, 14.0, 309 |
| 流星雨术 Meteor Shower | 9 | 13.2 | 9, 13.6 | 3% | 9, 14.8, 332 |

65% saver:

| spell | town | sold from (h) | first affordable (realm, h) | bought by % of runs | bought (realm, h, battle #) |
|---|---|---|---|---|---|
| 小火球术 Small Fireball | 2 | 2.4 | 2, 2.7 | 99% | 2, 4.1, 93 |
| 泡泡术 Bubble Spell | 2 | 2.4 | 2, 2.6 | 0% | - |
| 雪球术 Snowball Volley | 3 | 4.3 | 3, 5.5 | 0% | - |
| 小闪电术 Little Lightning | 3 | 4.3 | 3, 5.8 | 1% | 3, 6.3, 138 |
| 火球术 Fireball | 4 | 6.3 | 4, 6.6 | 0% | - |
| 旋风术 Whirlwind | 4 | 6.3 | 4, 7.6 | 97% | 4, 8.7, 177 |
| 雪花术 Snowflake Dance | 5 | 9.2 | 5, 10.7 | 3% | 5, 10.9, 219 |
| 闪电术 Lightning Bolt | 5 | 9.2 | 5, 10.3 | 0% | - |
| 阳光术 Sunbeam | 6 | 11.1 | 6, 11.3 | 0% | - |
| 大火球术 Big Fireball | 6 | 11.1 | 6, 11.3 | 73% | 6, 13.1, 249 |
| 暴风雪术 Blizzard | 7 | 13.2 | 7, 15.0 | 26% | 7, 15.6, 288 |
| 龙卷风术 Tornado | 7 | 13.2 | 7, 14.7 | 0% | - |
| 流星术 Meteor | 8 | 15.8 | 8, 16.1 | 0% | - |
| 雷雨术 Thunderstorm | 8 | 15.8 | 8, 16.3 | 44% | 8, 18.2, 327 |
| 超暴风雪术 Super Blizzard | 9 | 18.3 | 9, 19.0 | 69% | 9, 19.8, 350 |
| 流星雨术 Meteor Shower | 9 | 18.3 | 9, 19.0 | 0% | - |

50% saver:

| spell | town | sold from (h) | first affordable (realm, h) | bought by % of runs | bought (realm, h, battle #) |
|---|---|---|---|---|---|
| 小火球术 Small Fireball | 2 | 3.1 | 2, 3.6 | 59% | 2, 5.5, 116 |
| 泡泡术 Bubble Spell | 2 | 3.1 | 2, 3.3 | 0% | - |
| 雪球术 Snowball Volley | 3 | 5.5 | 3, 7.5 | 0% | - |
| 小闪电术 Little Lightning | 3 | 5.5 | 3, 8.1 | 0% | - |
| 火球术 Fireball | 4 | 8.1 | 4, 10.3 | 0% | - |
| 旋风术 Whirlwind | 4 | 8.1 | 4, 10.9 | 2% | 4, 12.1, 219 |
| 雪花术 Snowflake Dance | 5 | 11.9 | 5, 14.4 | 0% | - |
| 闪电术 Lightning Bolt | 5 | 11.9 | 5, 12.6 | 0% | - |
| 阳光术 Sunbeam | 6 | 14.4 | 6, 16.3 | 0% | - |
| 大火球术 Big Fireball | 6 | 14.4 | 6, 17.1 | 0% | - |
| 暴风雪术 Blizzard | 7 | 17.2 | 8, 23.5 | 0% | - |
| 龙卷风术 Tornado | 7 | 17.2 | 7, 19.4 | 0% | - |
| 流星术 Meteor | 8 | 20.6 | 8, 23.8 | 0% | - |
| 雷雨术 Thunderstorm | 8 | 20.6 | 9, 25.3 | 0% | - |
| 超暴风雪术 Super Blizzard | 9 | 23.8 | - | 0% | - |
| 流星雨术 Meteor Shower | 9 | 23.8 | 9, 23.6 | 0% | - |

| spell | town | price | = normal kills at that town | that town's quests pay | kills if all quests done | normal fights | minutes at realm pace |
|---|---|---|---|---|---|---|---|
| 小火球术 Small Fireball | 2 | 720 | 60 | 324 | 33 | 31 | 77 |
| 泡泡术 Bubble Spell | 2 | 540 | 45 | 324 | 18 | 23 | 58 |
| 雪球术 Snowball Volley | 3 | 1080 | 60 | 504 | 32 | 25 | 73 |
| 小闪电术 Little Lightning | 3 | 1350 | 75 | 504 | 47 | 31 | 91 |
| 火球术 Fireball | 4 | 1890 | 70 | 756 | 42 | 24 | 76 |
| 旋风术 Whirlwind | 4 | 2295 | 85 | 756 | 57 | 29 | 92 |
| 雪花术 Snowflake Dance | 5 | 3240 | 90 | 1026 | 62 | 30 | 97 |
| 闪电术 Lightning Bolt | 5 | 2700 | 75 | 1026 | 46 | 25 | 81 |
| 阳光术 Sunbeam | 6 | 3600 | 80 | 1296 | 51 | 23 | 84 |
| 大火球术 Big Fireball | 6 | 4050 | 90 | 1296 | 61 | 26 | 95 |
| 暴风雪术 Blizzard | 7 | 5400 | 100 | 1566 | 71 | 29 | 108 |
| 龙卷风术 Tornado | 7 | 4590 | 85 | 1566 | 56 | 25 | 92 |
| 流星术 Meteor | 8 | 5670 | 90 | 1836 | 61 | 26 | 96 |
| 雷雨术 Thunderstorm | 8 | 6930 | 110 | 1836 | 81 | 32 | 117 |
| 超暴风雪术 Super Blizzard | 9 | 9360 | 130 | 2106 | 101 | 38 | 135 |
| 流星雨术 Meteor Shower | 9 | 8640 | 120 | 2106 | 91 | 35 | 125 |

## 8. Open questions for Jack

1. **50% kids' realm bosses** still take 33–36 questions with spells and up to 44.7 without (Tired cap 45). Lower the realm-boss target for them, or keep it?
2. **Location bosses without spells** take 15.3–19.3 correct answers at 75% (target 15 is with full-MP spells). OK, since kids without spells just fight a bit longer?
3. **Boss ATK × 0.8** (Director default, kept in v3.7) keeps 50% defeats at or below v3.5. × 0.9 would make 50% spenders' first-try boss wins 0.49 (v3.6 check). OK?
4. **MP costs 1.25 × v3.4** (2 single-target casts from full) are unchanged. With no regen, they're the knob if playtests show spells too rare.
5. **Town names** are placeholders. **Town 1's shop** (Mana Tea only, or a teaser spell?). **Elements** (cosmetic, or weaknesses?).
6. **First-spell price:** realm-1 savings still cover 小火球术 on arrival in town 2.
7. **Quests:** one-time or repeatable? Should the words quest count earlier realms' words?

**Closed in v3.7:**
- location bosses about 15 correct answers, realm bosses about 20 (Jack).

**Closed in v3.6:**
- MP regen (removed);
- the boss target (about 20 correct answers even with full-MP spells; boss HP raised);
- MP hints (removed);
- the saving payoff (no regen; no hints).

**Closed in v3.5:**
- the Magic Ward (removed);
- the cast cap and unlock (removed);
- a magic stat (none);
- MP costs and tea prices (tea unchanged; costs ×1.25 because the caps are gone);
- Super Blizzard's Freeze (1 turn, not bosses);
- cast animation (2–3 s, skippable).
