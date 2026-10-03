# Magic spells and quests: design and sim (v3.6)

For Jack (via Director). Revised 2026-10-02 (PT).

Jack's v3.6 rules (on top of v3.5):
- **No MP regen.** The +1 MP per correct answer is gone. MP comes back only at the inn, on waking after a defeat, or from Mana Tea / Big Mana Tea (map only). Casting is expensive, and a kid who runs out of MP before the boss has only themselves to blame.
- **Bosses need about 20 correct answers** even from a kid who arrives with full MP and spends it all on spells, at every tier, for location and realm bosses.
- **No MP hints:** no inn or boss-gate "Save your MP" tip, no casts-ready count, no boss tip on the Preview page.

Kept from v3.5: casting is a free action (no question, no fizzle), no cast caps (MP is the only limit), MP costs 1.25 × v3.4, fixed spell power, no Magic Ward, Super Blizzard's Freeze 1 turn and not on bosses, 2–3 s skippable cast animations.

The short spec version is in `combat-spec.md` §6.7 (Spells) and §7.11 (Quests). Earlier versions of this document are kept in `build/v3/archive_v3_3/spells_v3_3.md`, `build/v3/archive_v3_4/spells.md` and `build/v3/archive_v3_5/spells-v3.5.md`.

Files:
- **Data:**
  - `data/spells.csv` / `.json` (16 spells)
  - `data/spell_falloff.csv`, `data/spell_mp_check.csv`, `data/mp_potions.csv`, `data/cast_rule.csv`, `data/boss_hp.csv` (v3.6)
  - `data/spells_full.json`
  - `data/quests.csv` / `.json`, `data/quests_full.json`
  - All generated from `build/v3/spells_data.py`.
- **Sim:** `build/spells_sim.py` + `build/spells_runner.py` → `build/v3/sim/v3_spells.txt` and `data/sim/sim_spells_*.csv`. Boss check: `build/v3/explore/boss_harness.py` → `build/v3/sim/v36_boss_check_*.json`.

## 1. Summary

- **Boss target met.** Boss HP is raised by tier and type: location bosses × 2.0–2.7, realm bosses × 1.05–1.85 (`data/boss_hp.csv`). In one boss fight from full HP and MP, a 75% kid who spends every MP point on spells needs **19.4–20.1 correct answers** at every tier. Without spells it's 19.8–24.9. At 50% it's 17.7–18.7 with spells (17.8–24.3 without), and at 90% 17.9–20.4. Full-MP spell use is 1.0–1.7 casts per boss (§7.1).
- **Spell costs and power are unchanged.** Boss HP is the knob, so normal and elite fights play as in v3.5.
- **Boss ATK × 0.8.** Longer boss fights with v3.5 ATK would raise 50% kids' defeats (saver 10.2% → 12.4%, spender 25.7% → 30.3%). With × 0.8 they fall (9.7% / 22.6% with no spells; 8.6% saver free), and first-try boss wins are 0.91–0.93 (saver) and 0.61 (spender), against 0.84 and 0.65 in v3.5.
- **No regen, and Heal and Shield stay usable.** Removing regen alone moves defeats by less than 1 point, because the kid already goes back to the inn when MP is short for Heal. Heals per battle drop a little (50% saver 0.41 → 0.34). Free inns (50% spender 1.8 → 1.4 per run; 0–0.4 for everyone else) and the gold floor (lowest gold 14–33 by profile) don't move. So the MP pool, growth, inn and tea prices are unchanged.
- **Boss fights are longer.** In the campaign, boss battles take about 30 questions at 75% (v3.5: 19.7–21.4), 34–35 at 65%, 39–40 for a 50% saver and 23.5–24.3 at 90%. Playthrough hours rise by 0.2–0.5 h.
- **Question share goes up.** No profile, style or realm falls below 0.85; the lowest single realm is 0.905 (v3.5: 0.857). Boss-battle share is 0.95–0.98 for kids who cast (v3.5: 0.90–0.97). Casts are at most 15% of hero turns in normal fights and 11% in boss fights (v3.5: 18% and 24.5%).
- **Saving matters a bit more.** Without regen, savers reach bosses with 94% MP against 89% for free spenders at 75% (90%: 89% vs 74%) and cast 0.2–0.3 more spells per boss. Nothing in the game tells them to.
- **No MP hints** (removed in v3.6). The MP bar is the only cue.
- **Prices, tea prices and quests are unchanged.**

## 2. Rules

| rule | v3.6 |
|---|---|
| Shop | A magic shop 魔法店 in every town. Towns 2–9 sell 2 spells each. Town 1 sells Mana Tea only. Price = price_G × G(town), 45–130 × G (unchanged). |
| Ownership | Permanent. Spellbook 魔法书 tab inside ✨ 技能 Skills. No skill slot; the battle keeps its 4 commands. |
| Cast | **Free action:** uses the hero turn, **no question, no fizzle**. MP is always spent. The streak is unchanged. The enemies' block questions that round are asked as usual. |
| Cast limit | **None except MP** (v3.5). No per-battle cap, no unlock, back-to-back allowed. |
| MP regen | **None** (v3.6). MP comes back only at the inn (2 × G, full HP + MP), on waking after a defeat, or from map-only Mana Tea. |
| Bosses | **About 20 correct answers even with a full MP bar spent on spells** (v3.6). Boss HP × 2.0–2.7 (location) / × 1.05–1.85 (realm) by tier; boss ATK × 0.8. |
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
| 小火球术 Small Fireball | 2 | 720 | 60 | 324 | 33 | 31 | 78 |
| 泡泡术 Bubble Spell | 2 | 540 | 45 | 324 | 18 | 23 | 58 |
| 雪球术 Snowball Volley | 3 | 1080 | 60 | 504 | 32 | 25 | 74 |
| 小闪电术 Little Lightning | 3 | 1350 | 75 | 504 | 47 | 31 | 92 |
| 火球术 Fireball | 4 | 1890 | 70 | 756 | 42 | 24 | 77 |
| 旋风术 Whirlwind | 4 | 2295 | 85 | 756 | 57 | 29 | 93 |
| 雪花术 Snowflake Dance | 5 | 3240 | 90 | 1026 | 62 | 30 | 97 |
| 闪电术 Lightning Bolt | 5 | 2700 | 75 | 1026 | 46 | 25 | 81 |
| 阳光术 Sunbeam | 6 | 3600 | 80 | 1296 | 51 | 23 | 85 |
| 大火球术 Big Fireball | 6 | 4050 | 90 | 1296 | 61 | 26 | 96 |
| 暴风雪术 Blizzard | 7 | 5400 | 100 | 1566 | 71 | 29 | 109 |
| 龙卷风术 Tornado | 7 | 4590 | 85 | 1566 | 56 | 25 | 93 |
| 流星术 Meteor | 8 | 5670 | 90 | 1836 | 61 | 26 | 96 |
| 雷雨术 Thunderstorm | 8 | 6930 | 110 | 1836 | 81 | 32 | 118 |
| 超暴风雪术 Super Blizzard | 9 | 9360 | 130 | 2106 | 101 | 38 | 136 |
| 流星雨术 Meteor Shower | 9 | 8640 | 120 | 2106 | 91 | 35 | 125 |

(Kills = price ÷ G. Fights and minutes use the 75% saver's gold and minutes per fight in that realm.)


## 7. Sim results (v3.6)

**Model:**
- Same campaign sim: realms 1–9 in a row, 150 runs per row, gear tiers, skills, inns, the Blacksmith-first nudge, and the saver/spender gold profiles.
- New in v3.6: no MP regen, v3.6 boss HP and boss ATK × 0.8, no hints. "v3.5 … (replica)" rows run the same sim with v3.5 rules (regen +1, v3.5 boss stats) and reproduce the archived v3.5 run exactly.

**MP styles** (kid habits; nothing in the game suggests them):
- **free:** casts in every fight whenever a spell beats an attack.
- **save:** in normal fights, keeps MP for 2 casts of its strongest spell; casts freely in elite and boss fights; goes back to the inn before a boss if MP is under 60%.
- **save+tea:** like save, plus it keeps a Mana Tea in stock (Big Mana Tea from town 5) and drinks it at the boss gate.
- **free+tea:** like free, plus the tea.

**Other rows:** "far gate": the kid goes back to the inn before a boss only below 50% HP (default: below 80%).

### 7.1 Boss target: correct answers per boss, full-MP spells vs no spells

One boss fight from full HP and full MP at the recommended level, with full gear and the 2 strongest spells of towns t and t−1. "Full-MP spells" = every MP point spent on spells (no Heal reserve); "no spells" = attacks only. Won fights only; correct answers = hero + block answers. 600 fights per cell.

| tier | boss | HP v3.5 -> v3.6 (mult) | ATK v3.5 -> v3.6 | 75%: correct no spells / full-MP spells | 75%: casts | 75%: questions no spells / spells | 50%: correct no spells / spells | 50%: win no spells / spells | 90%: correct no spells / spells |
|---|---|---|---|---|---|---|---|---|---|
| 1 | location | 28 -> 56 (x2) | 5 -> 4 | 19.8 / 19.8 | 0.0 | 26.2 / 26.4 | 17.9 / 17.9 | 1.00 / 1.00 | 18.4 / 18.3 |
| 1 | realm | 38 -> 57 (x1.5) | 5 -> 4 | 20.1 / 20.0 | 0.0 | 27.0 / 26.7 | 17.8 / 17.9 | 1.00 / 1.00 | 18.5 / 18.6 |
| 2 | location | 45 -> 103 (x2.3) | 10 -> 8 | 21.9 / 19.7 | 1.5 | 29.1 / 26.4 | 20.0 / 17.7 | 1.00 / 1.00 | 20.0 / 19.1 |
| 2 | realm | 63 -> 104 (x1.65) | 10 -> 8 | 21.8 / 19.8 | 1.6 | 28.9 / 26.4 | 20.1 / 17.8 | 1.00 / 0.99 | 20.0 / 19.2 |
| 3 | location | 62 -> 164 (x2.65) | 14 -> 11 | 23.5 / 19.8 | 1.6 | 31.7 / 26.6 | 22.0 / 18.4 | 0.96 / 0.99 | 21.4 / 18.0 |
| 3 | realm | 88 -> 163 (x1.85) | 16 -> 13 | 23.6 / 19.6 | 1.6 | 31.3 / 26.1 | 22.5 / 18.7 | 0.90 / 0.96 | 21.2 / 17.9 |
| 4 | location | 80 -> 200 (x2.5) | 19 -> 15 | 21.5 / 19.8 | 1.6 | 28.6 / 26.6 | 20.5 / 18.2 | 0.97 / 0.95 | 19.4 / 18.3 |
| 4 | realm | 112 -> 118 (x1.05) | 21 -> 17 | 21.0 / 20.1 | 1.5 | 28.0 / 26.9 | 19.5 / 18.0 | 0.85 / 0.78 | 19.8 / 20.4 |
| 5 | location | 102 -> 270 (x2.65) | 24 -> 19 | 22.7 / 20.0 | 1.7 | 30.4 / 26.7 | 21.7 / 18.7 | 0.94 / 0.96 | 20.1 / 18.3 |
| 5 | realm | 144 -> 173 (x1.2) | 26 -> 21 | 22.6 / 19.7 | 1.5 | 30.0 / 26.5 | 21.3 / 18.3 | 0.78 / 0.80 | 20.6 / 18.5 |
| 6 | location | 120 -> 306 (x2.55) | 29 -> 23 | 21.5 / 19.8 | 1.5 | 28.8 / 26.4 | 20.2 / 18.5 | 0.95 / 0.95 | 19.2 / 18.6 |
| 6 | realm | 168 -> 185 (x1.1) | 31 -> 25 | 20.4 / 19.9 | 1.4 | 26.8 / 26.7 | 19.0 / 17.9 | 0.87 / 0.84 | 19.4 / 19.8 |
| 7 | location | 142 -> 355 (x2.5) | 34 -> 27 | 22.0 / 19.9 | 1.6 | 29.2 / 26.5 | 20.9 / 18.7 | 0.96 / 0.94 | 20.3 / 18.7 |
| 7 | realm | 200 -> 280 (x1.4) | 36 -> 29 | 23.9 / 19.7 | 1.4 | 31.9 / 26.1 | 22.5 / 18.0 | 0.70 / 0.92 | 22.2 / 18.6 |
| 8 | location | 160 -> 416 (x2.6) | 38 -> 30 | 22.6 / 19.8 | 1.6 | 30.2 / 26.2 | 21.5 / 18.6 | 0.96 / 0.97 | 20.2 / 18.4 |
| 8 | realm | 224 -> 246 (x1.1) | 42 -> 34 | 21.4 / 19.4 | 1.4 | 28.6 / 26.1 | 20.0 / 17.7 | 0.78 / 0.77 | 20.4 / 19.5 |
| 9 | location | 182 -> 491 (x2.7) | 43 -> 34 | 22.7 / 20.0 | 1.0 | 30.1 / 26.7 | 21.5 / 18.6 | 0.95 / 0.98 | 20.1 / 18.3 |
| 9 | realm | 256 -> 397 (x1.55) | 47 -> 38 | 24.9 / 19.8 | 1.0 | 33.1 / 26.4 | 24.3 / 18.4 | 0.62 / 0.88 | 22.8 / 18.2 |

The same numbers are in `data/boss_hp.csv` (spec §2.3). "50%: win" is a single fight with no retry; in the campaign, bosses also have the 50% checkpoint and retries.

### 7.2 Key comparison, v3.5 → v3.6

| kid, accuracy | playthrough h: v3.5 free → v3.6 none / free / save | defeat %: v3.5 free / save → v3.6 none / free / save | boss 1st-try: v3.5 free → v3.6 free / save | boss questions: v3.5 free → v3.6 none / free / save | q share n / e / b: v3.5 free → v3.6 free → v3.6 save | min by realm n / e / b (v3.6 free; save) | hero turns cast n / b: v3.5 free → v3.6 free → v3.6 save | MP at boss start: v3.5 free → v3.6 free / save / save+tea |
|---|---|---|---|---|---|---|---|---|
| saver 75% | 17.7 → 18.1 / 18.2 / 18.1 | 0.0 / 0.0 → 0.0 / 0.0 / 0.0 | 1.00 → 1.00 / 1.00 | 19.9 → 31.1 / 30.0 / 29.6 | 0.936 → 0.949 → 0.991 / 0.942 → 0.958 → 0.957 / 0.918 → 0.965 → 0.960 | 0.926 / 0.935 / 0.934; 0.988 / 0.935 / 0.923 | 16.9% → 13.1% → 0.0% / 18.6% → 7.1% → 8.5% | 92% → 89% / 94% / 97% |
| spender 75% | 12.4 → 13.1 / 12.8 / 13.0 | 0.1 / 0.3 → 0.1 / 0.1 / 0.1 | 1.00 → 1.00 / 1.00 | 21.4 → 30.8 / 30.4 / 30.3 | 0.965 → 0.971 → 0.991 / 0.972 → 0.975 → 0.974 / 0.968 → 0.982 → 0.981 | 0.941 / 0.954 / 0.958; 0.987 / 0.950 / 0.958 | 7.5% → 6.1% → 0.0% / 6.2% → 3.1% → 3.5% | 93% → 88% / 92% / 93% |
| saver 65% | 20.4 → 20.9 / 20.9 / 20.8 | 0.3 / 1.2 → 0.7 / 0.2 / 0.7 | 0.99 → 1.00 / 1.00 | 22.3 → 35.5 / 34.0 / 33.9 | 0.924 → 0.935 → 0.982 / 0.929 → 0.944 → 0.948 / 0.918 → 0.957 → 0.957 | 0.905 / 0.912 / 0.925; 0.975 / 0.923 / 0.923 | 18.3% → 15.1% → 0.0% / 16.4% → 6.8% → 7.0% | 96% → 94% / 97% / 98% |
| saver 50% | 27.0 → 27.1 / 27.2 / 27.1 | 10.2 / 11.7 → 9.7 / 8.6 / 9.5 | 0.84 → 0.92 / 0.91 | 26.3 → 40.1 / 39.2 / 39.2 | 0.944 → 0.958 → 0.972 / 0.942 → 0.956 → 0.958 / 0.950 → 0.966 → 0.966 | 0.920 / 0.927 / 0.940; 0.963 / 0.931 / 0.941 | 8.6% → 4.4% → 0.2% / 7.2% → 2.2% → 2.3% | 99% → 98% / 98% / 99% |
| spender 50% | 18.6 → 18.6 / 18.6 / 18.6 | 25.7 / 25.7 → 22.6 / 22.6 / 22.6 | 0.65 → 0.61 / 0.61 | 25.6 → 34.6 / 34.6 / 34.6 | 0.990 → 0.990 → 0.990 / 0.993 → 0.993 → 0.993 / 0.996 → 0.996 → 0.996 | 0.988 / 0.981 / 0.987; 0.988 / 0.981 / 0.987 | 0.0% → 0.0% → 0.0% / 0.0% → 0.0% → 0.0% | 99% → 99% / 99% / 99% |
| saver 90% | 14.8 → 15.0 / 15.1 / 15.0 | 0.0 / 0.0 → 0.0 / 0.0 / 0.0 | 1.00 → 1.00 / 1.00 | 16.6 → 24.3 / 23.7 / 23.5 | 0.954 → 0.972 → 0.999 / 0.955 → 0.979 → 0.973 / 0.920 → 0.969 → 0.958 | 0.960 / 0.963 / 0.946; 0.998 / 0.950 / 0.930 | 13.2% → 7.8% → 0.0% / 20.2% → 7.5% → 10.2% | 82% → 74% / 89% / 94% |
| spender 90% | 10.8 → 11.3 / 11.2 / 11.3 | 0.0 / 0.0 → 0.0 / 0.0 / 0.0 | 1.00 → 1.00 / 1.00 | 17.2 → 24.3 / 23.9 / 23.8 | 0.974 → 0.981 → 0.999 / 0.978 → 0.985 → 0.981 / 0.961 → 0.982 → 0.972 | 0.961 / 0.965 / 0.955; 0.997 / 0.963 / 0.928 | 7.3% → 5.3% → 0.0% / 9.8% → 4.2% → 6.7% | 82% → 69% / 86% / 89% |

### 7.3 Question share, cast share, hours and defeats by profile, v3.6 vs v3.5

| kid | style | v3.5 q share n / e / b | v3.6 q share n / e / b | v3.6 min by tier n / e / b | v3.5 hero turns cast n / b | v3.6 hero turns cast n / e / b | v3.6 casts per battle n / e / b | v3.5 / v3.6 h | v3.5 / v3.6 defeat % | v3.5 / v3.6 boss q | flag |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 50% saver | no spells | 0.972 / 0.968 / 0.976 | 0.973 / 0.968 / 0.975 | 0.966 / 0.961 / 0.970 | 0.0% / 0.0% | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 27.0 / 27.1 | 11.5% / 9.7% | 27.7 / 40.1 | - |
| 50% saver | free | 0.944 / 0.942 / 0.950 | 0.958 / 0.956 / 0.966 | 0.920 / 0.927 / 0.940 | 8.6% / 7.2% | 4.4% / 3.2% / 2.2% | 0.30 / 0.30 / 0.37 | 27.0 / 27.2 | 10.2% / 8.6% | 26.3 / 39.2 | - |
| 50% saver | save | 0.967 / 0.945 / 0.950 | 0.972 / 0.958 / 0.966 | 0.963 / 0.931 / 0.941 | 1.5% / 7.5% | 0.2% / 2.8% / 2.3% | 0.01 / 0.26 / 0.37 | 27.0 / 27.1 | 11.7% / 9.5% | 26.2 / 39.2 | - |
| 50% saver | save+tea | 0.967 / 0.945 / 0.950 | 0.972 / 0.958 / 0.966 | 0.963 / 0.931 / 0.940 | 1.5% / 7.6% | 0.2% / 2.9% / 2.3% | 0.01 / 0.27 / 0.38 | 27.0 / 27.1 | 12.0% / 9.5% | 26.1 / 39.2 | - |
| 50% spender | no spells | 0.990 / 0.993 / 0.996 | 0.990 / 0.993 / 0.996 | 0.988 / 0.981 / 0.987 | 0.0% / 0.0% | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 18.6 / 18.6 | 25.7% / 22.6% | 25.6 / 34.6 | - |
| 50% spender | free | 0.990 / 0.993 / 0.996 | 0.990 / 0.993 / 0.996 | 0.988 / 0.981 / 0.987 | 0.0% / 0.0% | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 18.6 / 18.6 | 25.7% / 22.6% | 25.6 / 34.6 | - |
| 50% spender | save | 0.990 / 0.993 / 0.996 | 0.990 / 0.993 / 0.996 | 0.988 / 0.981 / 0.987 | 0.0% / 0.0% | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 18.6 / 18.6 | 25.7% / 22.6% | 25.6 / 34.6 | - |
| 50% spender | save+tea | 0.990 / 0.993 / 0.996 | 0.990 / 0.993 / 0.996 | 0.988 / 0.981 / 0.987 | 0.0% / 0.0% | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 18.6 / 18.6 | 25.7% / 22.6% | 25.6 / 34.6 | - |
| 65% saver | no spells | 0.980 / 0.977 / 0.982 | 0.981 / 0.977 / 0.988 | 0.976 / 0.967 / 0.984 | 0.0% / 0.0% | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 20.4 / 20.9 | 1.3% / 0.7% | 25.4 / 35.5 | - |
| 65% saver | free | 0.924 / 0.929 / 0.918 | 0.935 / 0.944 / 0.957 | 0.905 / 0.912 / 0.925 | 18.3% / 16.4% | 15.1% / 9.7% / 6.8% | 0.88 / 0.80 / 1.00 | 20.4 / 20.9 | 0.3% / 0.2% | 22.3 / 34.0 | - |
| 65% saver | save | 0.980 / 0.923 / 0.916 | 0.982 / 0.948 / 0.957 | 0.975 / 0.923 / 0.923 | 0.5% / 17.0% | 0.0% / 7.8% / 7.0% | 0.00 / 0.64 / 1.03 | 20.3 / 20.8 | 1.2% / 0.7% | 22.3 / 33.9 | - |
| 65% saver | save+tea | 0.979 / 0.924 / 0.916 | 0.982 / 0.949 / 0.957 | 0.976 / 0.924 / 0.927 | 0.5% / 16.9% | 0.0% / 7.4% / 7.1% | 0.00 / 0.62 / 1.05 | 20.3 / 20.8 | 1.2% / 0.6% | 22.4 / 34.0 | - |
| 65% spender | no spells | 0.988 / 0.989 / 0.995 | 0.988 / 0.990 / 0.995 | 0.984 / 0.981 / 0.989 | 0.0% / 0.0% | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 14.2 / 14.5 | 4.7% / 3.5% | 24.7 / 34.9 | - |
| 65% spender | free | 0.979 / 0.982 / 0.986 | 0.984 / 0.986 / 0.992 | 0.976 / 0.978 / 0.985 | 2.7% / 1.9% | 1.2% / 0.9% / 0.6% | 0.07 / 0.08 / 0.10 | 14.0 / 14.4 | 4.1% / 3.1% | 24.4 / 34.7 | - |
| 65% spender | save | 0.988 / 0.982 / 0.986 | 0.988 / 0.986 / 0.992 | 0.984 / 0.979 / 0.986 | 0.0% / 2.1% | 0.0% / 0.8% / 0.7% | 0.00 / 0.07 / 0.10 | 14.2 / 14.5 | 4.7% / 3.3% | 24.3 / 34.8 | - |
| 65% spender | save+tea | 0.988 / 0.983 / 0.987 | 0.988 / 0.987 / 0.992 | 0.984 / 0.979 / 0.986 | 0.0% / 2.1% | 0.0% / 0.8% / 0.7% | 0.00 / 0.07 / 0.10 | 14.2 / 14.5 | 4.7% / 3.4% | 24.3 / 34.8 | - |
| 75% saver | no spells | 0.989 / 0.986 / 0.992 | 0.991 / 0.988 / 0.996 | 0.987 / 0.980 / 0.994 | 0.0% / 0.0% | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 17.7 / 18.1 | 0.1% / 0.0% | 22.3 / 31.1 | - |
| 75% saver | free | 0.936 / 0.942 / 0.918 | 0.949 / 0.958 / 0.965 | 0.926 / 0.935 / 0.934 | 16.9% / 18.6% | 13.1% / 8.6% / 7.1% | 0.70 / 0.65 / 0.93 | 17.7 / 18.2 | 0.0% / 0.0% | 19.9 / 30.0 | - |
| 75% saver | save | 0.989 / 0.921 / 0.913 | 0.991 / 0.957 / 0.960 | 0.988 / 0.935 / 0.923 | 0.2% / 20.0% | 0.0% / 8.1% / 8.5% | 0.00 / 0.61 / 1.09 | 17.6 / 18.1 | 0.0% / 0.0% | 19.7 / 29.6 | - |
| 75% saver | save+tea | 0.989 / 0.922 / 0.913 | 0.991 / 0.960 / 0.960 | 0.988 / 0.939 / 0.926 | 0.2% / 20.2% | 0.0% / 7.6% / 8.4% | 0.00 / 0.57 / 1.08 | 17.6 / 18.0 | 0.0% / 0.0% | 19.8 / 29.8 | - |
| 75% saver | free+tea | 0.936 / 0.940 / 0.916 | 0.949 / 0.959 / 0.962 | 0.926 / 0.936 / 0.924 | 16.8% / 19.4% | 12.9% / 8.1% / 7.9% | 0.69 / 0.61 / 1.02 | 17.7 / 18.2 | 0.0% / 0.0% | 19.9 / 29.7 | - |
| 75% spender | no spells | 0.989 / 0.988 / 0.995 | 0.990 / 0.988 / 0.996 | 0.987 / 0.983 / 0.994 | 0.0% / 0.0% | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 12.8 / 13.1 | 0.4% / 0.1% | 22.1 / 30.8 | - |
| 75% spender | free | 0.965 / 0.972 / 0.968 | 0.971 / 0.975 / 0.982 | 0.941 / 0.954 / 0.958 | 7.5% / 6.2% | 6.1% / 3.9% / 3.1% | 0.33 / 0.30 / 0.41 | 12.4 / 12.8 | 0.1% / 0.1% | 21.4 / 30.4 | - |
| 75% spender | save | 0.990 / 0.965 / 0.964 | 0.991 / 0.974 / 0.981 | 0.987 / 0.950 / 0.958 | 0.0% / 7.5% | 0.0% / 3.6% / 3.5% | 0.00 / 0.28 / 0.46 | 12.7 / 13.0 | 0.3% / 0.1% | 21.3 / 30.3 | - |
| 75% spender | save+tea | 0.989 / 0.966 / 0.966 | 0.990 / 0.975 / 0.982 | 0.987 / 0.950 / 0.961 | 0.0% / 7.1% | 0.0% / 3.5% / 3.3% | 0.00 / 0.27 / 0.43 | 12.7 / 13.0 | 0.3% / 0.1% | 21.4 / 30.5 | - |
| 75% spender | free+tea | 0.965 / 0.973 / 0.967 | 0.971 / 0.976 / 0.981 | 0.941 / 0.954 / 0.958 | 7.4% / 6.6% | 6.0% / 3.5% / 3.3% | 0.33 / 0.27 / 0.44 | 12.4 / 12.8 | 0.2% / 0.1% | 21.5 / 30.6 | - |
| 90% saver | no spells | 0.998 / 0.998 / 0.999 | 0.999 / 0.999 / 1.000 | 0.998 / 0.997 / 1.000 | 0.0% / 0.0% | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 14.7 / 15.0 | 0.0% / 0.0% | 17.9 / 24.3 | - |
| 90% saver | free | 0.954 / 0.955 / 0.920 | 0.972 / 0.979 / 0.969 | 0.960 / 0.963 / 0.946 | 13.2% / 20.2% | 7.8% / 5.4% / 7.5% | 0.36 / 0.34 / 0.76 | 14.8 / 15.1 | 0.0% / 0.0% | 16.6 / 23.7 | - |
| 90% saver | save | 0.998 / 0.925 / 0.908 | 0.999 / 0.973 / 0.958 | 0.998 / 0.950 / 0.930 | 0.1% / 23.4% | 0.0% / 7.1% / 10.2% | 0.00 / 0.45 / 1.04 | 14.7 / 15.0 | 0.0% / 0.0% | 16.4 / 23.5 | - |
| 90% saver | save+tea | 0.998 / 0.926 / 0.904 | 0.999 / 0.972 / 0.953 | 0.998 / 0.953 / 0.919 | 0.1% / 24.5% | 0.0% / 7.4% / 11.4% | 0.00 / 0.47 / 1.16 | 14.7 / 15.0 | 0.0% / 0.0% | 16.3 / 23.5 | - |
| 90% saver | free+tea | 0.952 / 0.956 / 0.906 | 0.972 / 0.979 / 0.957 | 0.959 / 0.964 / 0.920 | 13.5% / 24.2% | 7.9% / 5.5% / 10.2% | 0.36 / 0.34 / 1.05 | 14.8 / 15.1 | 0.0% / 0.0% | 16.6 / 23.7 | - |
| 90% spender | no spells | 0.998 / 0.998 / 0.999 | 0.999 / 0.999 / 1.000 | 0.997 / 0.997 / 0.999 | 0.0% / 0.0% | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 11.1 / 11.3 | 0.0% / 0.0% | 18.0 / 24.3 | - |
| 90% spender | free | 0.974 / 0.978 / 0.961 | 0.981 / 0.985 / 0.982 | 0.961 / 0.965 / 0.955 | 7.3% / 9.8% | 5.3% / 3.9% / 4.2% | 0.25 / 0.24 / 0.43 | 10.8 / 11.2 | 0.0% / 0.0% | 17.2 / 23.9 | - |
| 90% spender | save | 0.998 / 0.961 / 0.952 | 0.999 / 0.981 / 0.972 | 0.997 / 0.963 / 0.928 | 0.1% / 12.2% | 0.0% / 4.9% / 6.7% | 0.00 / 0.31 / 0.69 | 11.0 / 11.3 | 0.0% / 0.0% | 17.2 / 23.8 | - |
| 90% spender | save+tea | 0.998 / 0.963 / 0.949 | 0.999 / 0.984 / 0.974 | 0.997 / 0.961 / 0.944 | 0.1% / 13.1% | 0.0% / 4.0% / 6.2% | 0.00 / 0.25 / 0.63 | 11.0 / 11.3 | 0.0% / 0.0% | 17.3 / 23.9 | - |
| 90% spender | free+tea | 0.975 / 0.979 / 0.955 | 0.983 / 0.987 / 0.976 | 0.962 / 0.970 / 0.946 | 7.0% / 11.3% | 4.7% / 3.1% / 5.8% | 0.22 / 0.20 / 0.59 | 10.9 / 11.3 | 0.0% / 0.0% | 17.5 / 24.1 | - |

### 7.3b Does saving MP pay off?

| acc | kid | style | boss 1st-try | boss q | boss HP lost | MP at boss start | casts per boss battle | normal q | defeat % | tea gold per run | playthrough h |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 50% | saver | no spells | 0.910 | 40.6 | 60% | 98% | 0.00 | 20.9 | 9.7% | 0 | 27.1 |
| 50% | saver | v3.6 free | 0.903 | 39.6 | 62% | 98% | 0.42 | 20.5 | 8.6% | 0 | 27.2 |
| 50% | saver | v3.6 save | 0.896 | 39.6 | 63% | 98% | 0.43 | 20.9 | 9.5% | 0 | 27.1 |
| 50% | saver | v3.6 save+tea | 0.899 | 39.5 | 63% | 99% | 0.44 | 20.9 | 9.5% | 1490 | 27.1 |
| 50% | spender | no spells | 0.545 | 34.4 | 81% | 99% | 0.00 | 20.8 | 22.6% | 0 | 18.6 |
| 50% | spender | v3.6 free | 0.545 | 34.4 | 81% | 99% | 0.00 | 20.8 | 22.6% | 0 | 18.6 |
| 50% | spender | v3.6 save | 0.545 | 34.4 | 81% | 99% | 0.00 | 20.8 | 22.6% | 0 | 18.6 |
| 50% | spender | v3.6 save+tea | 0.545 | 34.4 | 81% | 99% | 0.00 | 20.8 | 22.6% | 0 | 18.6 |
| 65% | saver | no spells | 0.999 | 36.2 | 43% | 95% | 0.00 | 18.4 | 0.7% | 0 | 20.9 |
| 65% | saver | v3.6 free | 0.999 | 34.5 | 44% | 94% | 1.18 | 16.7 | 0.2% | 0 | 20.9 |
| 65% | saver | v3.6 save | 0.999 | 34.3 | 44% | 97% | 1.22 | 18.4 | 0.7% | 0 | 20.8 |
| 65% | saver | v3.6 save+tea | 0.998 | 34.5 | 44% | 98% | 1.23 | 18.4 | 0.6% | 3501 | 20.8 |
| 65% | spender | no spells | 0.949 | 35.5 | 51% | 95% | 0.00 | 18.6 | 3.5% | 0 | 14.5 |
| 65% | spender | v3.6 free | 0.955 | 35.3 | 51% | 95% | 0.11 | 18.3 | 3.1% | 0 | 14.4 |
| 65% | spender | v3.6 save | 0.953 | 35.3 | 51% | 95% | 0.11 | 18.5 | 3.3% | 0 | 14.5 |
| 65% | spender | v3.6 save+tea | 0.952 | 35.3 | 51% | 95% | 0.11 | 18.5 | 3.4% | 985 | 14.5 |
| 75% | saver | no spells | 1.000 | 31.7 | 34% | 90% | 0.00 | 16.5 | 0.0% | 0 | 18.1 |
| 75% | saver | v3.6 free | 1.000 | 30.3 | 34% | 89% | 1.09 | 15.4 | 0.0% | 0 | 18.2 |
| 75% | saver | v3.6 save | 1.000 | 29.9 | 35% | 94% | 1.29 | 16.5 | 0.0% | 0 | 18.1 |
| 75% | saver | v3.6 save+tea | 1.000 | 30.1 | 35% | 97% | 1.27 | 16.5 | 0.0% | 4470 | 18.0 |
| 75% | spender | no spells | 0.999 | 31.4 | 34% | 90% | 0.00 | 16.7 | 0.1% | 0 | 13.1 |
| 75% | spender | v3.6 free | 0.999 | 31.0 | 34% | 88% | 0.48 | 16.1 | 0.1% | 0 | 12.8 |
| 75% | spender | v3.6 save | 0.997 | 30.8 | 34% | 92% | 0.54 | 16.6 | 0.1% | 0 | 13.0 |
| 75% | spender | v3.6 save+tea | 0.998 | 31.0 | 34% | 93% | 0.50 | 16.7 | 0.1% | 4194 | 13.0 |
| 90% | saver | no spells | 1.000 | 24.8 | 12% | 72% | 0.00 | 13.9 | 0.0% | 0 | 15.0 |
| 90% | saver | v3.6 free | 1.000 | 24.1 | 12% | 74% | 0.89 | 13.5 | 0.0% | 0 | 15.1 |
| 90% | saver | v3.6 save | 1.000 | 23.8 | 12% | 89% | 1.22 | 13.9 | 0.0% | 0 | 15.0 |
| 90% | saver | v3.6 save+tea | 1.000 | 23.7 | 13% | 94% | 1.36 | 13.9 | 0.0% | 6050 | 15.0 |
| 90% | spender | no spells | 1.000 | 24.6 | 12% | 71% | 0.00 | 13.9 | 0.0% | 0 | 11.3 |
| 90% | spender | v3.6 free | 1.000 | 24.2 | 13% | 69% | 0.51 | 13.6 | 0.0% | 0 | 11.2 |
| 90% | spender | v3.6 save | 1.000 | 24.0 | 12% | 86% | 0.81 | 14.0 | 0.0% | 0 | 11.3 |
| 90% | spender | v3.6 save+tea | 1.000 | 24.2 | 12% | 89% | 0.75 | 14.0 | 0.0% | 5955 | 11.3 |
| 75% | saver | v3.6 free+tea | 1.000 | 30.0 | 34% | 94% | 1.20 | 15.4 | 0.0% | 4005 | 18.2 |
| 75% | spender | v3.6 free+tea | 0.999 | 31.1 | 34% | 93% | 0.52 | 16.1 | 0.1% | 4196 | 12.8 |
| 90% | saver | v3.6 free+tea | 1.000 | 24.1 | 13% | 91% | 1.24 | 13.5 | 0.0% | 6641 | 15.1 |
| 90% | spender | v3.6 free+tea | 1.000 | 24.5 | 12% | 89% | 0.70 | 13.8 | 0.0% | 6341 | 11.3 |
| 50% | saver | no spells (v3.5 replica) | 0.818 | 27.8 | 73% | 100% | 0.00 | 21.0 | 11.5% | 0 | 27.0 |
| 50% | saver | v3.5 free (replica) | 0.813 | 26.2 | 75% | 99% | 0.79 | 20.1 | 10.2% | 0 | 27.0 |
| 50% | saver | v3.5 save (replica) | 0.811 | 26.1 | 75% | 100% | 0.83 | 20.9 | 11.7% | 0 | 27.0 |
| 50% | spender | no spells (v3.5 replica) | 0.592 | 25.5 | 85% | 99% | 0.00 | 20.8 | 25.7% | 0 | 18.6 |
| 50% | spender | v3.5 free (replica) | 0.592 | 25.5 | 85% | 99% | 0.00 | 20.8 | 25.7% | 0 | 18.6 |
| 50% | spender | v3.5 save (replica) | 0.592 | 25.5 | 85% | 99% | 0.00 | 20.8 | 25.7% | 0 | 18.6 |
| 75% | saver | no spells (v3.5 replica) | 1.000 | 22.7 | 31% | 97% | 0.00 | 16.8 | 0.1% | 0 | 17.7 |
| 75% | saver | v3.5 free (replica) | 1.000 | 19.9 | 30% | 92% | 1.83 | 15.0 | 0.0% | 0 | 17.7 |
| 75% | saver | v3.5 save (replica) | 1.000 | 19.6 | 31% | 97% | 1.96 | 16.7 | 0.0% | 0 | 17.6 |
| 75% | spender | no spells (v3.5 replica) | 0.989 | 22.4 | 32% | 96% | 0.00 | 17.0 | 0.4% | 0 | 12.8 |
| 75% | spender | v3.5 free (replica) | 0.996 | 21.6 | 32% | 93% | 0.65 | 16.2 | 0.1% | 0 | 12.4 |
| 75% | spender | v3.5 save (replica) | 0.995 | 21.5 | 33% | 97% | 0.78 | 16.9 | 0.3% | 0 | 12.7 |
| 75% | saver | no spells, far gate | 0.999 | 31.7 | 24% | 69% | 0.00 | 16.5 | 0.0% | 0 | 18.1 |
| 75% | saver | v3.6 free, far gate | 1.000 | 30.3 | 30% | 81% | 0.91 | 15.4 | 0.0% | 0 | 18.2 |
| 75% | saver | v3.6 save, far gate | 0.999 | 30.5 | 28% | 88% | 1.14 | 16.5 | 0.0% | 0 | 18.1 |
| 75% | saver | v3.6 save+tea, far gate | 1.000 | 30.4 | 26% | 94% | 1.22 | 16.5 | 0.0% | 4216 | 18.1 |
| 50% | saver | no spells, far gate | 0.761 | 37.2 | 61% | 88% | 0.00 | 20.9 | 10.3% | 0 | 27.3 |
| 50% | saver | v3.6 free, far gate | 0.803 | 37.6 | 62% | 92% | 0.33 | 20.5 | 9.1% | 0 | 27.3 |
| 50% | saver | v3.6 save, far gate | 0.777 | 36.8 | 63% | 92% | 0.36 | 20.9 | 10.4% | 0 | 27.3 |
| 50% | saver | v3.6 save+tea, far gate | 0.775 | 36.8 | 63% | 94% | 0.40 | 20.9 | 10.3% | 1467 | 27.3 |

How to read it:
- **Saving gives** higher MP at the boss (75%: 94% vs 89%; 90%: 89% vs 74%) and 0.2–0.3 more casts per boss, but only 0.3–0.4 fewer boss questions, because a full bar is 1–2 casts against about 20 correct answers.
- **Saving doesn't change** first-try wins (≈1.00 at 65%+, about 0.90 for a 50% saver).
- **Free spenders aren't punished either.** They kill normal enemies faster and use the inn when MP runs low.
- **Removing regen alone** (v3.5 boss stats): 50% saver no spells 11.5% → 10.8% defeats, free 10.2% → 10.0%; 50% spender 25.7% → 25.5%; 75% kids ≤ 0.4% either way (`build/v3/sim/v36_regen_only.json`).
- **Boss ATK** with v3.6 boss HP, 50% free (defeats / first-try boss win): × 1.0 12.4% / 0.70 (saver), 30.3% / 0.36 (spender); × 0.9 9.4% / 0.86, 24.7% / 0.49; **× 0.8** 8.6% / 0.92, 22.6% / 0.61; v3.5: 10.2% / 0.84, 25.7% / 0.65 (`build/v3/sim/v36_atk_check.json`).

### 7.4 Whole campaign

| acc | speech | kid | mode | playthrough h | spells owned | defeat % | boss 1st-try | boss q | normal q | question share normal / elite / boss | hero turns cast normal / elite / boss | casts per battle normal / elite / boss | heals/b | full-gear share | free inns | gold=0 | MP at battle start | MP at boss start | boss HP lost | casts per boss battle | Mana Tea bought / drunk per run | tea gold per run | proficient at realm end |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 50% | on | saver | no spells | 27.1 | 0.0 | 9.7% | 0.93 | 40.1 | 20.9 | 0.973 / 0.968 / 0.975 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 0.34 | 0.95 | 0.0 | 0.00 | 85% | 98% | 60% | 0.00 | 0.0 / 0.0 | 0 | 23% |
| 50% | on | saver | v3.6 free | 27.2 | 0.6 | 8.6% | 0.92 | 39.2 | 20.5 | 0.958 / 0.956 / 0.966 | 4.4% / 3.2% / 2.2% | 0.30 / 0.30 / 0.37 | 0.29 | 0.96 | 0.0 | 0.00 | 85% | 98% | 62% | 0.37 | 0.0 / 1.4 | 0 | 23% |
| 50% | on | saver | v3.6 save | 27.1 | 0.6 | 9.5% | 0.91 | 39.2 | 20.9 | 0.972 / 0.958 / 0.966 | 0.2% / 2.8% / 2.3% | 0.01 / 0.26 / 0.37 | 0.33 | 0.96 | 0.0 | 0.00 | 85% | 98% | 63% | 0.37 | 0.0 / 1.1 | 0 | 23% |
| 50% | on | saver | v3.6 save+tea | 27.1 | 0.6 | 9.5% | 0.91 | 39.2 | 20.9 | 0.972 / 0.958 / 0.966 | 0.2% / 2.9% / 2.3% | 0.01 / 0.27 / 0.38 | 0.33 | 0.95 | 0.0 | 0.00 | 85% | 99% | 63% | 0.38 | 2.0 / 2.4 | 1490 | 23% |
| 50% | on | spender | no spells | 18.6 | 0.0 | 22.6% | 0.61 | 34.6 | 20.8 | 0.990 / 0.993 / 0.996 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 0.52 | 0.93 | 1.4 | 0.00 | 91% | 99% | 81% | 0.00 | 0.0 / 0.0 | 0 | 11% |
| 50% | on | spender | v3.6 free | 18.6 | 0.0 | 22.6% | 0.61 | 34.6 | 20.8 | 0.990 / 0.993 / 0.996 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 0.52 | 0.93 | 1.4 | 0.00 | 91% | 99% | 81% | 0.00 | 0.0 / 0.0 | 0 | 11% |
| 50% | on | spender | v3.6 save | 18.6 | 0.0 | 22.6% | 0.61 | 34.6 | 20.8 | 0.990 / 0.993 / 0.996 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 0.52 | 0.93 | 1.4 | 0.00 | 91% | 99% | 81% | 0.00 | 0.0 / 0.0 | 0 | 11% |
| 50% | on | spender | v3.6 save+tea | 18.6 | 0.0 | 22.6% | 0.61 | 34.6 | 20.8 | 0.990 / 0.993 / 0.996 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 0.52 | 0.93 | 1.4 | 0.00 | 91% | 99% | 81% | 0.00 | 0.0 / 0.0 | 0 | 11% |
| 65% | on | saver | no spells | 20.9 | 0.0 | 0.7% | 1.00 | 35.5 | 18.4 | 0.981 / 0.977 / 0.988 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 0.16 | 0.96 | 0.0 | 0.00 | 76% | 95% | 43% | 0.00 | 0.0 / 0.0 | 0 | 24% |
| 65% | on | saver | v3.6 free | 20.9 | 4.3 | 0.2% | 1.00 | 34.0 | 16.7 | 0.935 / 0.944 / 0.957 | 15.1% / 9.7% / 6.8% | 0.88 / 0.80 / 1.00 | 0.04 | 0.97 | 0.0 | 0.00 | 74% | 94% | 44% | 1.00 | 0.0 / 4.6 | 0 | 24% |
| 65% | on | saver | v3.6 save | 20.8 | 4.1 | 0.7% | 1.00 | 33.9 | 18.4 | 0.982 / 0.948 / 0.957 | 0.0% / 7.8% / 7.0% | 0.00 / 0.64 / 1.03 | 0.14 | 0.96 | 0.0 | 0.00 | 76% | 97% | 44% | 1.03 | 0.0 / 3.5 | 0 | 24% |
| 65% | on | saver | v3.6 save+tea | 20.8 | 3.7 | 0.6% | 1.00 | 34.0 | 18.4 | 0.982 / 0.949 / 0.957 | 0.0% / 7.4% / 7.1% | 0.00 / 0.62 / 1.05 | 0.14 | 0.96 | 0.0 | 0.00 | 76% | 98% | 44% | 1.05 | 4.9 / 6.7 | 3501 | 24% |
| 65% | on | spender | no spells | 14.5 | 0.0 | 3.5% | 0.96 | 34.9 | 18.6 | 0.988 / 0.990 / 0.995 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 0.23 | 0.96 | 0.1 | 0.00 | 79% | 95% | 51% | 0.00 | 0.0 / 0.0 | 0 | 12% |
| 65% | on | spender | v3.6 free | 14.4 | 0.7 | 3.1% | 0.96 | 34.7 | 18.3 | 0.984 / 0.986 / 0.992 | 1.2% / 0.9% / 0.6% | 0.07 / 0.08 / 0.10 | 0.21 | 0.96 | 0.2 | 0.00 | 79% | 95% | 51% | 0.10 | 0.0 / 0.5 | 0 | 12% |
| 65% | on | spender | v3.6 save | 14.5 | 0.7 | 3.3% | 0.96 | 34.8 | 18.5 | 0.988 / 0.986 / 0.992 | 0.0% / 0.8% / 0.7% | 0.00 / 0.07 / 0.10 | 0.23 | 0.96 | 0.3 | 0.00 | 79% | 95% | 51% | 0.10 | 0.0 / 0.5 | 0 | 12% |
| 65% | on | spender | v3.6 save+tea | 14.5 | 0.7 | 3.4% | 0.96 | 34.8 | 18.5 | 0.988 / 0.987 / 0.992 | 0.0% / 0.8% / 0.7% | 0.00 / 0.07 / 0.10 | 0.23 | 0.95 | 0.4 | 0.00 | 79% | 95% | 51% | 0.10 | 1.1 / 0.6 | 985 | 12% |
| 75% | on | saver | no spells | 18.1 | 0.0 | 0.0% | 1.00 | 31.1 | 16.5 | 0.991 / 0.988 / 0.996 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 0.07 | 0.96 | 0.0 | 0.00 | 70% | 90% | 34% | 0.00 | 0.0 / 0.0 | 0 | 24% |
| 75% | on | saver | v3.6 free | 18.2 | 5.1 | 0.0% | 1.00 | 30.0 | 15.4 | 0.949 / 0.958 / 0.965 | 13.1% / 8.6% / 7.1% | 0.70 / 0.65 / 0.93 | 0.01 | 0.97 | 0.0 | 0.00 | 62% | 89% | 34% | 0.93 | 0.0 / 6.7 | 0 | 24% |
| 75% | on | saver | v3.6 save | 18.1 | 5.2 | 0.0% | 1.00 | 29.6 | 16.5 | 0.991 / 0.957 / 0.960 | 0.0% / 8.1% / 8.5% | 0.00 / 0.61 / 1.09 | 0.06 | 0.96 | 0.0 | 0.00 | 70% | 94% | 35% | 1.09 | 0.0 / 4.6 | 0 | 24% |
| 75% | on | saver | v3.6 save+tea | 18.0 | 4.4 | 0.0% | 1.00 | 29.8 | 16.5 | 0.991 / 0.960 / 0.960 | 0.0% / 7.6% / 8.4% | 0.00 / 0.57 / 1.08 | 0.06 | 0.96 | 0.0 | 0.00 | 70% | 97% | 35% | 1.08 | 6.4 / 8.5 | 4470 | 24% |
| 75% | on | spender | no spells | 13.1 | 0.0 | 0.1% | 1.00 | 30.8 | 16.7 | 0.990 / 0.988 / 0.996 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 0.08 | 0.96 | 0.0 | 0.00 | 71% | 90% | 34% | 0.00 | 0.0 / 0.0 | 0 | 13% |
| 75% | on | spender | v3.6 free | 12.8 | 2.0 | 0.1% | 1.00 | 30.4 | 16.1 | 0.971 / 0.975 / 0.982 | 6.1% / 3.9% / 3.1% | 0.33 / 0.30 / 0.41 | 0.04 | 0.96 | 0.2 | 0.00 | 69% | 88% | 34% | 0.41 | 0.0 / 2.9 | 0 | 12% |
| 75% | on | spender | v3.6 save | 13.0 | 2.0 | 0.1% | 1.00 | 30.3 | 16.6 | 0.991 / 0.974 / 0.981 | 0.0% / 3.6% / 3.5% | 0.00 / 0.28 / 0.46 | 0.07 | 0.96 | 0.2 | 0.00 | 71% | 92% | 34% | 0.46 | 0.0 / 2.8 | 0 | 13% |
| 75% | on | spender | v3.6 save+tea | 13.0 | 1.4 | 0.1% | 1.00 | 30.5 | 16.7 | 0.990 / 0.975 / 0.982 | 0.0% / 3.5% / 3.3% | 0.00 / 0.27 / 0.43 | 0.07 | 0.96 | 0.3 | 0.00 | 71% | 93% | 34% | 0.43 | 5.2 / 4.9 | 4194 | 13% |
| 90% | on | saver | no spells | 15.0 | 0.0 | 0.0% | 1.00 | 24.3 | 13.9 | 0.999 / 0.999 / 1.000 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 0.00 | 0.96 | 0.0 | 0.00 | 54% | 72% | 12% | 0.00 | 0.0 / 0.0 | 0 | 24% |
| 90% | on | saver | v3.6 free | 15.1 | 6.3 | 0.0% | 1.00 | 23.7 | 13.5 | 0.972 / 0.979 / 0.969 | 7.8% / 5.4% / 7.5% | 0.36 / 0.34 / 0.76 | 0.00 | 0.96 | 0.0 | 0.00 | 40% | 74% | 12% | 0.76 | 0.0 / 8.5 | 0 | 24% |
| 90% | on | saver | v3.6 save | 15.0 | 6.3 | 0.0% | 1.00 | 23.5 | 13.9 | 0.999 / 0.973 / 0.958 | 0.0% / 7.1% / 10.2% | 0.00 / 0.45 / 1.04 | 0.00 | 0.96 | 0.0 | 0.00 | 54% | 89% | 12% | 1.04 | 0.0 / 7.8 | 0 | 24% |
| 90% | on | saver | v3.6 save+tea | 15.0 | 5.4 | 0.0% | 1.00 | 23.5 | 13.9 | 0.999 / 0.972 / 0.953 | 0.0% / 7.4% / 11.4% | 0.00 / 0.47 / 1.16 | 0.00 | 0.96 | 0.0 | 0.00 | 54% | 94% | 13% | 1.16 | 8.8 / 11.4 | 6050 | 24% |
| 90% | on | spender | no spells | 11.3 | 0.0 | 0.0% | 1.00 | 24.3 | 13.9 | 0.999 / 0.999 / 1.000 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 0.00 | 0.96 | 0.0 | 0.00 | 56% | 71% | 12% | 0.00 | 0.0 / 0.0 | 0 | 13% |
| 90% | on | spender | v3.6 free | 11.2 | 2.9 | 0.0% | 1.00 | 23.9 | 13.6 | 0.981 / 0.985 / 0.982 | 5.3% / 3.9% / 4.2% | 0.25 / 0.24 / 0.43 | 0.00 | 0.96 | 0.1 | 0.00 | 47% | 69% | 13% | 0.43 | 0.0 / 4.0 | 0 | 13% |
| 90% | on | spender | v3.6 save | 11.3 | 3.1 | 0.0% | 1.00 | 23.8 | 14.0 | 0.999 / 0.981 / 0.972 | 0.0% / 4.9% / 6.7% | 0.00 / 0.31 / 0.69 | 0.00 | 0.96 | 0.1 | 0.00 | 56% | 86% | 12% | 0.69 | 0.0 / 4.3 | 0 | 13% |
| 90% | on | spender | v3.6 save+tea | 11.3 | 2.0 | 0.0% | 1.00 | 23.9 | 14.0 | 0.999 / 0.984 / 0.974 | 0.0% / 4.0% / 6.2% | 0.00 / 0.25 / 0.63 | 0.00 | 0.96 | 0.1 | 0.00 | 57% | 89% | 12% | 0.63 | 7.8 / 8.5 | 5955 | 13% |
| 75% | on | saver | v3.6 free+tea | 18.2 | 4.4 | 0.0% | 1.00 | 29.7 | 15.4 | 0.949 / 0.959 / 0.962 | 12.9% / 8.1% / 7.9% | 0.69 / 0.61 / 1.02 | 0.01 | 0.96 | 0.0 | 0.00 | 63% | 94% | 34% | 1.02 | 5.6 / 7.2 | 4005 | 24% |
| 75% | on | spender | v3.6 free+tea | 12.8 | 1.1 | 0.1% | 1.00 | 30.6 | 16.1 | 0.971 / 0.976 / 0.981 | 6.0% / 3.5% / 3.3% | 0.33 / 0.27 / 0.44 | 0.04 | 0.95 | 0.4 | 0.00 | 69% | 93% | 34% | 0.44 | 5.4 / 4.7 | 4196 | 12% |
| 90% | on | saver | v3.6 free+tea | 15.1 | 5.1 | 0.0% | 1.00 | 23.7 | 13.5 | 0.972 / 0.979 / 0.957 | 7.9% / 5.5% / 10.2% | 0.36 / 0.34 / 1.05 | 0.00 | 0.96 | 0.0 | 0.00 | 42% | 91% | 13% | 1.05 | 9.9 / 11.9 | 6641 | 24% |
| 90% | on | spender | v3.6 free+tea | 11.3 | 1.8 | 0.0% | 1.00 | 24.1 | 13.8 | 0.983 / 0.987 / 0.976 | 4.7% / 3.1% / 5.8% | 0.22 / 0.20 / 0.59 | 0.00 | 0.96 | 0.1 | 0.00 | 49% | 89% | 12% | 0.59 | 8.6 / 8.8 | 6341 | 13% |
| 50% | on | saver | no spells (v3.5 replica) | 27.0 | 0.0 | 11.5% | 0.85 | 27.7 | 21.0 | 0.972 / 0.968 / 0.976 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 0.41 | 0.95 | 0.0 | 0.00 | 92% | 100% | 73% | 0.00 | 0.0 / 0.0 | 0 | 23% |
| 50% | on | saver | v3.5 free (replica) | 27.0 | 0.8 | 10.2% | 0.84 | 26.3 | 20.1 | 0.944 / 0.942 / 0.950 | 8.6% / 7.2% / 7.2% | 0.59 / 0.66 / 0.71 | 0.32 | 0.95 | 0.0 | 0.00 | 89% | 99% | 75% | 0.71 | 0.0 / 1.5 | 0 | 23% |
| 50% | on | saver | v3.5 save (replica) | 27.0 | 0.8 | 11.7% | 0.84 | 26.2 | 20.9 | 0.967 / 0.945 / 0.950 | 1.5% / 6.6% / 7.5% | 0.10 / 0.60 / 0.75 | 0.39 | 0.94 | 0.0 | 0.00 | 91% | 100% | 75% | 0.75 | 0.0 / 1.1 | 0 | 23% |
| 50% | on | spender | no spells (v3.5 replica) | 18.6 | 0.0 | 25.7% | 0.65 | 25.6 | 20.8 | 0.990 / 0.993 / 0.996 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 0.58 | 0.91 | 1.8 | 0.00 | 95% | 99% | 85% | 0.00 | 0.0 / 0.0 | 0 | 11% |
| 50% | on | spender | v3.5 free (replica) | 18.6 | 0.0 | 25.7% | 0.65 | 25.6 | 20.8 | 0.990 / 0.993 / 0.996 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 0.58 | 0.91 | 1.8 | 0.00 | 95% | 99% | 85% | 0.00 | 0.0 / 0.0 | 0 | 11% |
| 50% | on | spender | v3.5 save (replica) | 18.6 | 0.0 | 25.7% | 0.65 | 25.6 | 20.8 | 0.990 / 0.993 / 0.996 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 0.58 | 0.91 | 1.8 | 0.00 | 95% | 99% | 85% | 0.00 | 0.0 / 0.0 | 0 | 11% |
| 75% | on | saver | no spells (v3.5 replica) | 17.7 | 0.0 | 0.1% | 1.00 | 22.3 | 16.8 | 0.989 / 0.986 / 0.992 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 0.11 | 0.96 | 0.0 | 0.00 | 86% | 97% | 31% | 0.00 | 0.0 / 0.0 | 0 | 23% |
| 75% | on | saver | v3.5 free (replica) | 17.7 | 5.9 | 0.0% | 1.00 | 19.9 | 15.0 | 0.936 / 0.942 / 0.918 | 16.9% / 13.3% / 18.6% | 0.91 / 0.99 / 1.56 | 0.02 | 0.97 | 0.0 | 0.00 | 64% | 92% | 30% | 1.56 | 0.0 / 7.0 | 0 | 23% |
| 75% | on | saver | v3.5 save (replica) | 17.6 | 5.7 | 0.0% | 1.00 | 19.7 | 16.7 | 0.989 / 0.921 / 0.913 | 0.2% / 18.1% / 20.0% | 0.01 / 1.33 / 1.67 | 0.08 | 0.96 | 0.0 | 0.00 | 83% | 97% | 31% | 1.67 | 0.0 / 2.5 | 0 | 23% |
| 75% | on | spender | no spells (v3.5 replica) | 12.8 | 0.0 | 0.4% | 0.99 | 22.1 | 17.0 | 0.989 / 0.988 / 0.995 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 0.12 | 0.96 | 0.0 | 0.00 | 86% | 96% | 32% | 0.00 | 0.0 / 0.0 | 0 | 12% |
| 75% | on | spender | v3.5 free (replica) | 12.4 | 2.0 | 0.1% | 1.00 | 21.4 | 16.2 | 0.965 / 0.972 / 0.968 | 7.5% / 4.4% / 6.2% | 0.42 / 0.34 / 0.55 | 0.07 | 0.96 | 0.3 | 0.00 | 78% | 93% | 32% | 0.55 | 0.0 / 2.3 | 0 | 11% |
| 75% | on | spender | v3.5 save (replica) | 12.7 | 2.1 | 0.3% | 1.00 | 21.3 | 16.9 | 0.990 / 0.965 / 0.964 | 0.0% / 6.0% / 7.5% | 0.00 / 0.46 / 0.66 | 0.11 | 0.96 | 0.1 | 0.00 | 85% | 97% | 33% | 0.66 | 0.0 / 1.9 | 0 | 12% |
| 75% | on | saver | no spells, far gate | 18.1 | 0.0 | 0.0% | 1.00 | 31.2 | 16.5 | 0.991 / 0.988 / 0.989 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 0.07 | 0.96 | 0.0 | 0.00 | 69% | 69% | 24% | 0.00 | 0.0 / 0.0 | 0 | 24% |
| 75% | on | saver | v3.6 free, far gate | 18.2 | 5.1 | 0.0% | 1.00 | 30.0 | 15.4 | 0.948 / 0.957 / 0.968 | 13.1% / 8.7% / 6.0% | 0.70 / 0.65 / 0.78 | 0.01 | 0.97 | 0.0 | 0.00 | 62% | 81% | 30% | 0.78 | 0.0 / 6.4 | 0 | 24% |
| 75% | on | saver | v3.6 save, far gate | 18.1 | 5.3 | 0.0% | 1.00 | 30.1 | 16.5 | 0.991 / 0.958 / 0.959 | 0.0% / 8.1% / 7.4% | 0.00 / 0.61 / 0.97 | 0.06 | 0.96 | 0.0 | 0.00 | 70% | 88% | 28% | 0.97 | 0.0 / 4.7 | 0 | 24% |
| 75% | on | saver | v3.6 save+tea, far gate | 18.1 | 4.6 | 0.0% | 1.00 | 30.1 | 16.5 | 0.991 / 0.959 / 0.956 | 0.0% / 7.9% / 8.0% | 0.00 / 0.60 / 1.03 | 0.06 | 0.96 | 0.0 | 0.00 | 70% | 94% | 26% | 1.03 | 6.0 / 8.1 | 4216 | 24% |
| 50% | on | saver | no spells, far gate | 27.3 | 0.0 | 10.3% | 0.80 | 37.2 | 20.9 | 0.973 / 0.968 / 0.977 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 0.34 | 0.96 | 0.0 | 0.00 | 84% | 88% | 61% | 0.00 | 0.0 / 0.0 | 0 | 24% |
| 50% | on | saver | v3.6 free, far gate | 27.3 | 0.6 | 9.1% | 0.83 | 37.6 | 20.5 | 0.959 / 0.956 / 0.968 | 4.2% / 3.1% / 1.8% | 0.29 / 0.29 / 0.29 | 0.30 | 0.96 | 0.0 | 0.00 | 85% | 92% | 62% | 0.29 | 0.0 / 1.2 | 0 | 24% |
| 50% | on | saver | v3.6 save, far gate | 27.3 | 0.6 | 10.4% | 0.81 | 36.9 | 20.9 | 0.972 / 0.958 / 0.968 | 0.2% / 2.7% / 2.1% | 0.01 / 0.26 / 0.32 | 0.33 | 0.96 | 0.0 | 0.00 | 84% | 92% | 63% | 0.32 | 0.0 / 1.1 | 0 | 24% |
| 50% | on | saver | v3.6 save+tea, far gate | 27.3 | 0.6 | 10.3% | 0.81 | 36.9 | 20.9 | 0.972 / 0.958 / 0.967 | 0.2% / 2.7% / 2.3% | 0.01 / 0.25 / 0.35 | 0.33 | 0.95 | 0.0 | 0.00 | 85% | 94% | 63% | 0.35 | 1.9 / 2.4 | 1467 | 24% |
| 75% | off | saver | no spells | 11.6 | 0.0 | 0.0% | 1.00 | 27.4 | 15.1 | 0.995 / 0.995 / 0.999 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 0.02 | 0.94 | 0.0 | 0.00 | 65% | 83% | 23% | 0.00 | 0.0 / 0.0 | 0 | 52% |
| 75% | off | saver | v3.6 free | 11.6 | 2.3 | 0.0% | 1.00 | 27.2 | 14.7 | 0.975 / 0.980 / 0.982 | 6.3% / 4.1% / 3.9% | 0.31 / 0.29 / 0.46 | 0.01 | 0.94 | 0.0 | 0.00 | 60% | 85% | 23% | 0.46 | 0.0 / 6.2 | 0 | 52% |
| 75% | off | spender | no spells | 11.4 | 0.0 | 0.0% | 1.00 | 27.4 | 15.1 | 0.995 / 0.994 / 0.999 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 0.03 | 0.95 | 0.0 | 0.00 | 66% | 83% | 23% | 0.00 | 0.0 / 0.0 | 0 | 50% |
| 75% | off | spender | v3.6 free | 11.3 | 2.2 | 0.0% | 1.00 | 27.0 | 14.7 | 0.976 / 0.981 / 0.982 | 6.0% / 4.0% / 3.9% | 0.30 / 0.28 / 0.45 | 0.01 | 0.95 | 0.0 | 0.00 | 60% | 85% | 23% | 0.45 | 0.0 / 6.0 | 0 | 50% |

### 7.5 Per realm, 75% saver

| realm | mode | battles | defeat % | boss 1st-try | boss q | normal q | q share normal / elite / boss | casts/b normal / boss | min/location | MP at battle start | spell castable at start | heals/b | full gear | gold start | min gold | free inns | spell spend | gear spend | proficient at end |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | no spells | 52.7 | 0.0% | 1.00 | 28.1 | 11.7 | 0.999 / 0.995 / 1.000 | 0.00 / 0.00 | 42.3 | 100% | 0% | 0.00 | 0.91 | 24 | 30 | 0.00 | 0 | 35 | 27% |
| 1 | v3.6 free | 52.7 | 0.0% | 1.00 | 28.1 | 11.7 | 0.999 / 0.995 / 1.000 | 0.00 / 0.00 | 42.3 | 100% | 0% | 0.00 | 0.91 | 24 | 30 | 0.00 | 0 | 35 | 27% |
| 1 | v3.6 save | 52.7 | 0.0% | 1.00 | 28.1 | 11.7 | 0.999 / 0.995 / 1.000 | 0.00 / 0.00 | 42.3 | 100% | 0% | 0.00 | 0.91 | 24 | 30 | 0.00 | 0 | 35 | 27% |
| 1 | v3.6 save+tea | 52.7 | 0.0% | 1.00 | 28.1 | 11.7 | 0.999 / 0.995 / 1.000 | 0.00 / 0.00 | 42.3 | 100% | 0% | 0.00 | 0.91 | 24 | 30 | 0.00 | 0 | 35 | 27% |
| 2 | no spells | 39.0 | 0.0% | 1.00 | 30.7 | 12.3 | 0.996 / 0.996 / 0.999 | 0.00 / 0.00 | 49.4 | 58% | 0% | 0.01 | 0.97 | 777 | 503 | 0.00 | 0 | 288 | 24% |
| 2 | v3.6 free | 39.8 | 0.0% | 1.00 | 30.4 | 12.1 | 0.992 / 0.993 / 0.990 | 0.05 / 0.26 | 49.6 | 55% | 10% | 0.01 | 0.97 | 777 | 503 | 0.00 | 720 | 288 | 24% |
| 2 | v3.6 save | 39.1 | 0.0% | 1.00 | 29.9 | 12.3 | 0.996 / 0.991 / 0.986 | 0.00 / 0.40 | 49.4 | 58% | 12% | 0.01 | 0.97 | 777 | 503 | 0.00 | 720 | 288 | 24% |
| 2 | v3.6 save+tea | 39.1 | 0.0% | 1.00 | 30.0 | 12.3 | 0.996 / 0.991 / 0.986 | 0.00 / 0.40 | 49.4 | 58% | 12% | 0.01 | 0.97 | 777 | 503 | 0.00 | 720 | 288 | 24% |
| 3 | no spells | 36.3 | 0.0% | 1.00 | 33.4 | 15.4 | 0.996 / 0.992 / 0.996 | 0.00 / 0.00 | 54.5 | 74% | 0% | 0.01 | 0.97 | 1630 | 1150 | 0.00 | 0 | 528 | 24% |
| 3 | v3.6 free | 39.1 | 0.0% | 1.00 | 32.0 | 14.1 | 0.964 / 0.970 / 0.974 | 0.47 / 0.69 | 54.3 | 63% | 56% | 0.00 | 0.97 | 917 | 431 | 0.00 | 135 | 528 | 24% |
| 3 | v3.6 save | 36.7 | 0.0% | 1.00 | 32.2 | 15.3 | 0.996 / 0.967 / 0.971 | 0.00 / 0.77 | 54.7 | 73% | 82% | 0.00 | 0.97 | 904 | 424 | 0.00 | 180 | 528 | 24% |
| 3 | v3.6 save+tea | 36.7 | 0.0% | 1.00 | 32.0 | 15.3 | 0.996 / 0.968 / 0.964 | 0.00 / 0.99 | 54.7 | 73% | 82% | 0.00 | 0.97 | 909 | 426 | 0.00 | 72 | 528 | 24% |
| 4 | no spells | 46.9 | 0.0% | 1.00 | 30.4 | 16.8 | 0.987 / 0.988 / 0.996 | 0.00 / 0.00 | 50.4 | 73% | 0% | 0.03 | 0.98 | 2981 | 2170 | 0.00 | 0 | 912 | 24% |
| 4 | v3.6 free | 49.8 | 0.0% | 1.00 | 29.1 | 15.6 | 0.932 / 0.942 / 0.950 | 0.97 / 1.37 | 50.5 | 60% | 59% | 0.00 | 0.98 | 2088 | 1274 | 0.00 | 2234 | 912 | 24% |
| 4 | v3.6 save | 46.9 | 0.0% | 1.00 | 28.0 | 16.8 | 0.988 / 0.940 / 0.942 | 0.00 / 1.58 | 49.9 | 73% | 93% | 0.01 | 0.98 | 2058 | 1250 | 0.00 | 2231 | 912 | 24% |
| 4 | v3.6 save+tea | 46.6 | 0.0% | 1.00 | 28.4 | 16.8 | 0.988 / 0.939 / 0.940 | 0.00 / 1.65 | 49.8 | 73% | 93% | 0.01 | 0.98 | 2117 | 1312 | 0.00 | 2277 | 912 | 24% |
| 5 | no spells | 31.1 | 0.0% | 1.00 | 31.9 | 16.9 | 0.988 / 0.988 / 0.994 | 0.00 / 0.00 | 50.4 | 77% | 0% | 0.04 | 0.97 | 6233 | 4820 | 0.00 | 0 | 1560 | 25% |
| 5 | v3.6 free | 31.1 | 0.0% | 1.00 | 32.2 | 16.7 | 0.932 / 0.955 / 0.954 | 1.03 / 1.25 | 50.7 | 67% | 72% | 0.01 | 0.97 | 2818 | 1399 | 0.00 | 216 | 1560 | 25% |
| 5 | v3.6 save | 31.0 | 0.0% | 1.00 | 32.3 | 16.7 | 0.989 / 0.949 / 0.952 | 0.00 / 1.38 | 50.1 | 76% | 96% | 0.02 | 0.97 | 3031 | 1624 | 0.00 | 1512 | 1560 | 25% |
| 5 | v3.6 save+tea | 30.6 | 0.0% | 1.00 | 32.3 | 16.9 | 0.989 / 0.954 / 0.951 | 0.00 / 1.40 | 49.9 | 76% | 96% | 0.02 | 0.97 | 2949 | 1026 | 0.00 | 86 | 1560 | 25% |
| 6 | no spells | 31.4 | 0.0% | 1.00 | 30.2 | 19.1 | 0.987 / 0.983 / 0.996 | 0.00 / 0.00 | 57.6 | 78% | 0% | 0.08 | 0.97 | 8824 | 6924 | 0.00 | 0 | 2160 | 23% |
| 6 | v3.6 free | 35.0 | 0.0% | 1.00 | 28.4 | 16.9 | 0.926 / 0.946 / 0.963 | 1.16 / 0.91 | 57.9 | 62% | 63% | 0.01 | 0.97 | 4775 | 2794 | 0.00 | 3672 | 2160 | 22% |
| 6 | v3.6 save | 31.4 | 0.0% | 1.00 | 29.0 | 19.2 | 0.988 / 0.935 / 0.948 | 0.00 / 1.39 | 57.8 | 78% | 96% | 0.05 | 0.97 | 4064 | 2078 | 0.00 | 2295 | 2160 | 23% |
| 6 | v3.6 save+tea | 31.6 | 0.0% | 1.00 | 28.4 | 19.0 | 0.988 / 0.940 / 0.960 | 0.00 / 1.03 | 57.4 | 78% | 97% | 0.06 | 0.97 | 4485 | 2565 | 0.00 | 3618 | 2160 | 23% |
| 7 | no spells | 36.9 | 0.1% | 1.00 | 31.8 | 20.1 | 0.987 / 0.980 / 0.996 | 0.00 / 0.00 | 68.5 | 70% | 0% | 0.18 | 0.97 | 12549 | 10111 | 0.00 | 0 | 2760 | 22% |
| 7 | v3.6 free | 40.2 | 0.0% | 1.00 | 31.2 | 18.4 | 0.927 / 0.942 / 0.954 | 1.26 / 1.26 | 69.5 | 67% | 71% | 0.01 | 0.97 | 4716 | 2249 | 0.00 | 2484 | 2760 | 22% |
| 7 | v3.6 save | 37.1 | 0.0% | 1.00 | 29.8 | 20.2 | 0.988 / 0.939 / 0.950 | 0.00 / 1.42 | 68.8 | 70% | 96% | 0.19 | 0.97 | 5441 | 2880 | 0.00 | 4392 | 2760 | 22% |
| 7 | v3.6 save+tea | 37.1 | 0.0% | 1.00 | 30.5 | 20.0 | 0.989 / 0.947 / 0.949 | 0.00 / 1.44 | 68.5 | 70% | 97% | 0.18 | 0.97 | 4357 | 1878 | 0.00 | 1440 | 2760 | 22% |
| 8 | no spells | 34.7 | 0.1% | 1.00 | 31.6 | 20.1 | 0.988 / 0.984 / 0.994 | 0.00 / 0.00 | 63.8 | 64% | 0% | 0.19 | 0.97 | 17445 | 14414 | 0.00 | 0 | 3360 | 23% |
| 8 | v3.6 free | 40.2 | 0.0% | 1.00 | 28.5 | 17.2 | 0.926 / 0.935 / 0.934 | 1.19 / 1.87 | 64.3 | 65% | 66% | 0.01 | 0.98 | 6749 | 3242 | 0.00 | 3927 | 3360 | 23% |
| 8 | v3.6 save | 34.6 | 0.1% | 1.00 | 28.5 | 20.1 | 0.989 / 0.942 / 0.923 | 0.00 / 2.22 | 63.4 | 66% | 94% | 0.18 | 0.97 | 5800 | 2640 | 0.00 | 1663 | 3360 | 23% |
| 8 | v3.6 save+tea | 34.7 | 0.1% | 1.00 | 28.7 | 20.0 | 0.989 / 0.948 / 0.926 | 0.00 / 2.04 | 63.4 | 66% | 95% | 0.17 | 0.97 | 6824 | 3670 | 0.00 | 3650 | 3360 | 23% |
| 9 | no spells | 32.7 | 0.0% | 1.00 | 33.9 | 19.9 | 0.990 / 0.984 / 0.994 | 0.00 / 0.00 | 60.2 | 66% | 0% | 0.17 | 0.97 | 22702 | 19007 | 0.00 | 0 | 4080 | 23% |
| 9 | v3.6 free | 36.3 | 0.0% | 1.00 | 31.3 | 17.7 | 0.966 / 0.964 / 0.965 | 0.46 / 0.97 | 59.8 | 62% | 94% | 0.09 | 0.97 | 8083 | 754 | 0.00 | 9360 | 4080 | 23% |
| 9 | v3.6 save | 33.2 | 0.0% | 1.00 | 30.6 | 19.6 | 0.991 / 0.965 / 0.963 | 0.00 / 1.00 | 59.8 | 67% | 97% | 0.16 | 0.97 | 9190 | 763 | 0.00 | 9110 | 4080 | 23% |
| 9 | v3.6 save+tea | 33.1 | 0.0% | 1.00 | 31.0 | 19.7 | 0.991 / 0.962 / 0.963 | 0.00 / 1.05 | 59.7 | 68% | 98% | 0.16 | 0.97 | 7095 | 989 | 0.00 | 6365 | 4080 | 23% |

### 7.6 Per realm, 75% spender

| realm | mode | battles | defeat % | boss 1st-try | boss q | normal q | q share normal / elite / boss | casts/b normal / boss | min/location | MP at battle start | spell castable at start | heals/b | full gear | gold start | min gold | free inns | spell spend | gear spend | proficient at end |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | no spells | 33.0 | 0.0% | 1.00 | 27.6 | 11.7 | 0.999 / 0.995 / 1.000 | 0.00 / 0.00 | 30.5 | 100% | 0% | 0.00 | 0.95 | 24 | 14 | 0.01 | 0 | 35 | 14% |
| 1 | v3.6 free | 33.0 | 0.0% | 1.00 | 27.6 | 11.7 | 0.999 / 0.995 / 1.000 | 0.00 / 0.00 | 30.5 | 100% | 0% | 0.00 | 0.95 | 24 | 14 | 0.01 | 0 | 35 | 14% |
| 1 | v3.6 save | 33.0 | 0.0% | 1.00 | 27.6 | 11.7 | 0.999 / 0.995 / 1.000 | 0.00 / 0.00 | 30.5 | 100% | 0% | 0.00 | 0.95 | 24 | 14 | 0.01 | 0 | 35 | 14% |
| 1 | v3.6 save+tea | 33.0 | 0.0% | 1.00 | 27.6 | 11.7 | 0.999 / 0.995 / 1.000 | 0.00 / 0.00 | 30.5 | 100% | 0% | 0.00 | 0.95 | 24 | 14 | 0.01 | 0 | 35 | 14% |
| 2 | no spells | 22.0 | 0.0% | 1.00 | 30.7 | 12.4 | 0.992 / 0.995 / 0.999 | 0.00 / 0.00 | 33.5 | 59% | 0% | 0.01 | 0.95 | 587 | 319 | 0.00 | 0 | 288 | 11% |
| 2 | v3.6 free | 22.0 | 0.0% | 1.00 | 30.7 | 12.4 | 0.992 / 0.995 / 0.999 | 0.00 / 0.00 | 33.5 | 59% | 0% | 0.01 | 0.95 | 587 | 319 | 0.00 | 24 | 288 | 11% |
| 2 | v3.6 save | 22.0 | 0.0% | 1.00 | 30.7 | 12.4 | 0.992 / 0.995 / 0.999 | 0.00 / 0.00 | 33.5 | 59% | 0% | 0.01 | 0.95 | 587 | 319 | 0.00 | 24 | 288 | 11% |
| 2 | v3.6 save+tea | 22.0 | 0.0% | 1.00 | 30.7 | 12.4 | 0.992 / 0.995 / 0.999 | 0.00 / 0.00 | 33.5 | 59% | 0% | 0.01 | 0.95 | 587 | 319 | 0.00 | 24 | 288 | 11% |
| 3 | no spells | 22.0 | 0.0% | 1.00 | 33.1 | 15.5 | 0.995 / 0.994 / 0.996 | 0.00 / 0.00 | 37.8 | 75% | 0% | 0.01 | 0.95 | 1058 | 578 | 0.00 | 0 | 528 | 11% |
| 3 | v3.6 free | 22.0 | 0.0% | 1.00 | 33.0 | 15.4 | 0.994 / 0.994 / 0.995 | 0.02 / 0.01 | 37.7 | 75% | 2% | 0.01 | 0.95 | 1034 | 554 | 0.00 | 0 | 528 | 11% |
| 3 | v3.6 save | 22.0 | 0.0% | 1.00 | 33.0 | 15.5 | 0.995 / 0.994 / 0.995 | 0.00 / 0.02 | 37.7 | 75% | 3% | 0.01 | 0.95 | 1034 | 554 | 0.00 | 0 | 528 | 11% |
| 3 | v3.6 save+tea | 22.0 | 0.0% | 1.00 | 32.9 | 15.5 | 0.995 / 0.994 / 0.995 | 0.00 / 0.03 | 37.7 | 75% | 3% | 0.01 | 0.95 | 1034 | 554 | 0.00 | 0 | 528 | 11% |
| 4 | no spells | 33.0 | 0.1% | 1.00 | 30.3 | 16.8 | 0.987 / 0.987 / 0.996 | 0.00 / 0.00 | 38.4 | 74% | 0% | 0.03 | 0.97 | 1793 | 986 | 0.00 | 0 | 912 | 15% |
| 4 | v3.6 free | 33.0 | 0.1% | 1.00 | 30.0 | 16.8 | 0.985 / 0.985 / 0.992 | 0.04 / 0.13 | 38.3 | 73% | 4% | 0.03 | 0.97 | 1767 | 961 | 0.00 | 1714 | 912 | 14% |
| 4 | v3.6 save | 33.0 | 0.1% | 1.00 | 30.1 | 16.8 | 0.987 / 0.983 / 0.992 | 0.00 / 0.12 | 38.4 | 74% | 5% | 0.03 | 0.97 | 1772 | 966 | 0.00 | 1729 | 912 | 15% |
| 4 | v3.6 save+tea | 33.0 | 0.1% | 1.00 | 30.0 | 16.8 | 0.987 / 0.984 / 0.991 | 0.00 / 0.15 | 38.4 | 74% | 5% | 0.03 | 0.97 | 1771 | 965 | 0.00 | 1729 | 912 | 15% |
| 5 | no spells | 22.0 | 0.0% | 1.00 | 31.9 | 16.9 | 0.989 / 0.991 / 0.994 | 0.00 / 0.00 | 38.7 | 77% | 0% | 0.05 | 0.95 | 4234 | 2838 | 0.00 | 0 | 1560 | 15% |
| 5 | v3.6 free | 22.0 | 0.0% | 1.00 | 31.7 | 16.7 | 0.967 / 0.981 / 0.975 | 0.41 / 0.56 | 38.5 | 71% | 53% | 0.02 | 0.95 | 2475 | 1074 | 0.00 | 259 | 1560 | 15% |
| 5 | v3.6 save | 22.0 | 0.1% | 0.99 | 31.3 | 16.7 | 0.989 / 0.972 / 0.975 | 0.00 / 0.60 | 38.3 | 77% | 72% | 0.04 | 0.95 | 2476 | 1084 | 0.00 | 281 | 1560 | 15% |
| 5 | v3.6 save+tea | 22.0 | 0.1% | 0.99 | 31.4 | 16.7 | 0.989 / 0.973 / 0.975 | 0.00 / 0.60 | 38.4 | 77% | 72% | 0.04 | 0.95 | 2468 | 765 | 0.17 | 259 | 1560 | 15% |
| 6 | no spells | 22.0 | 0.1% | 1.00 | 29.3 | 19.3 | 0.987 / 0.984 / 0.998 | 0.00 / 0.00 | 44.0 | 78% | 0% | 0.10 | 0.95 | 5897 | 3992 | 0.00 | 0 | 2160 | 14% |
| 6 | v3.6 free | 22.0 | 0.0% | 1.00 | 28.9 | 17.4 | 0.941 / 0.954 / 0.966 | 0.88 / 0.89 | 41.5 | 66% | 56% | 0.03 | 0.95 | 3668 | 1725 | 0.00 | 648 | 2160 | 12% |
| 6 | v3.6 save | 22.0 | 0.1% | 1.00 | 28.3 | 19.0 | 0.987 / 0.950 / 0.963 | 0.00 / 0.97 | 43.6 | 78% | 81% | 0.07 | 0.95 | 3787 | 1864 | 0.00 | 783 | 2160 | 14% |
| 6 | v3.6 save+tea | 22.0 | 0.1% | 1.00 | 28.2 | 19.0 | 0.987 / 0.950 / 0.963 | 0.00 / 0.97 | 43.6 | 78% | 81% | 0.07 | 0.95 | 3097 | 1182 | 0.03 | 621 | 2160 | 14% |
| 7 | no spells | 22.1 | 0.3% | 1.00 | 32.5 | 20.2 | 0.988 / 0.983 / 0.995 | 0.00 / 0.00 | 45.9 | 71% | 0% | 0.20 | 0.95 | 8365 | 5914 | 0.00 | 0 | 2760 | 10% |
| 7 | v3.6 free | 22.0 | 0.0% | 1.00 | 31.1 | 18.5 | 0.952 / 0.962 / 0.970 | 0.74 / 0.75 | 43.3 | 71% | 68% | 0.03 | 0.95 | 4963 | 2481 | 0.00 | 0 | 2760 | 9% |
| 7 | v3.6 save | 22.1 | 0.3% | 0.99 | 31.4 | 20.1 | 0.989 / 0.961 / 0.967 | 0.00 / 0.87 | 45.7 | 71% | 86% | 0.19 | 0.95 | 5399 | 2945 | 0.00 | 144 | 2760 | 10% |
| 7 | v3.6 save+tea | 22.0 | 0.3% | 1.00 | 31.5 | 20.2 | 0.989 / 0.961 / 0.969 | 0.00 / 0.81 | 45.8 | 71% | 86% | 0.19 | 0.95 | 4571 | 2135 | 0.01 | 36 | 2760 | 10% |
| 8 | no spells | 22.1 | 0.4% | 0.99 | 30.5 | 20.2 | 0.988 / 0.985 / 0.996 | 0.00 / 0.00 | 44.4 | 66% | 0% | 0.20 | 0.95 | 10684 | 7661 | 0.00 | 0 | 3360 | 11% |
| 8 | v3.6 free | 22.0 | 0.2% | 1.00 | 30.5 | 18.8 | 0.942 / 0.954 / 0.958 | 0.93 / 1.13 | 42.7 | 67% | 72% | 0.06 | 0.95 | 6894 | 3862 | 0.00 | 92 | 3360 | 10% |
| 8 | v3.6 save | 22.0 | 0.2% | 1.00 | 29.7 | 20.1 | 0.989 / 0.961 / 0.958 | 0.00 / 1.15 | 44.3 | 67% | 88% | 0.18 | 0.95 | 7437 | 4422 | 0.00 | 832 | 3360 | 12% |
| 8 | v3.6 save+tea | 22.0 | 0.2% | 1.00 | 29.9 | 20.1 | 0.989 / 0.962 / 0.961 | 0.00 / 1.09 | 44.2 | 67% | 88% | 0.19 | 0.95 | 5836 | 2829 | 0.01 | 0 | 3360 | 12% |
| 9 | no spells | 22.0 | 0.2% | 1.00 | 33.6 | 20.0 | 0.990 / 0.985 / 0.995 | 0.00 / 0.00 | 43.9 | 67% | 0% | 0.17 | 0.95 | 13213 | 9543 | 0.00 | 0 | 4080 | 12% |
| 9 | v3.6 free | 22.0 | 0.2% | 1.00 | 32.1 | 18.9 | 0.974 / 0.971 / 0.977 | 0.32 / 0.56 | 42.2 | 66% | 81% | 0.15 | 0.95 | 8919 | 1334 | 0.23 | 8861 | 4080 | 11% |
| 9 | v3.6 save | 22.1 | 0.3% | 1.00 | 32.0 | 19.7 | 0.991 / 0.966 / 0.971 | 0.00 / 0.77 | 43.4 | 68% | 84% | 0.16 | 0.95 | 9158 | 1101 | 0.16 | 7675 | 4080 | 12% |
| 9 | v3.6 save+tea | 22.1 | 0.3% | 1.00 | 33.5 | 19.9 | 0.990 / 0.973 / 0.979 | 0.00 / 0.54 | 43.9 | 68% | 86% | 0.17 | 0.95 | 7276 | 2741 | 0.11 | 3432 | 4080 | 12% |

### 7.7 Per realm, 65% saver

| realm | mode | battles | defeat % | boss 1st-try | boss q | normal q | q share normal / elite / boss | casts/b normal / boss | min/location | MP at battle start | spell castable at start | heals/b | full gear | gold start | min gold | free inns | spell spend | gear spend | proficient at end |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | no spells | 56.3 | 0.0% | 1.00 | 31.5 | 13.0 | 0.996 / 0.991 / 1.000 | 0.00 / 0.00 | 48.6 | 100% | 0% | 0.00 | 0.92 | 24 | 29 | 0.00 | 0 | 35 | 26% |
| 1 | v3.6 free | 56.3 | 0.0% | 1.00 | 31.5 | 13.0 | 0.996 / 0.991 / 1.000 | 0.00 / 0.00 | 48.6 | 100% | 0% | 0.00 | 0.92 | 24 | 29 | 0.00 | 0 | 35 | 26% |
| 1 | v3.6 save | 56.3 | 0.0% | 1.00 | 31.5 | 13.0 | 0.996 / 0.991 / 1.000 | 0.00 / 0.00 | 48.6 | 100% | 0% | 0.00 | 0.92 | 24 | 29 | 0.00 | 0 | 35 | 26% |
| 1 | v3.6 save+tea | 56.3 | 0.0% | 1.00 | 31.5 | 13.0 | 0.996 / 0.991 / 1.000 | 0.00 / 0.00 | 48.6 | 100% | 0% | 0.00 | 0.92 | 24 | 29 | 0.00 | 0 | 35 | 26% |
| 2 | no spells | 42.2 | 0.0% | 1.00 | 34.6 | 13.5 | 0.993 / 0.992 / 0.994 | 0.00 / 0.00 | 56.7 | 65% | 0% | 0.00 | 0.98 | 772 | 495 | 0.00 | 0 | 288 | 24% |
| 2 | v3.6 free | 42.9 | 0.0% | 1.00 | 34.3 | 13.2 | 0.990 / 0.989 / 0.986 | 0.05 / 0.24 | 56.7 | 63% | 8% | 0.00 | 0.98 | 772 | 495 | 0.00 | 710 | 288 | 24% |
| 2 | v3.6 save | 42.2 | 0.0% | 1.00 | 34.0 | 13.5 | 0.993 / 0.989 / 0.985 | 0.00 / 0.31 | 56.5 | 65% | 10% | 0.00 | 0.98 | 772 | 495 | 0.00 | 710 | 288 | 24% |
| 2 | v3.6 save+tea | 42.2 | 0.0% | 1.00 | 34.0 | 13.5 | 0.993 / 0.989 / 0.985 | 0.00 / 0.31 | 56.5 | 65% | 10% | 0.00 | 0.98 | 772 | 495 | 0.00 | 710 | 288 | 24% |
| 3 | no spells | 38.0 | 0.0% | 1.00 | 38.8 | 17.3 | 0.990 / 0.984 / 0.987 | 0.00 / 0.00 | 62.7 | 81% | 0% | 0.04 | 0.97 | 1562 | 1079 | 0.00 | 0 | 528 | 24% |
| 3 | v3.6 free | 42.7 | 0.0% | 1.00 | 37.0 | 15.2 | 0.954 / 0.957 / 0.962 | 0.61 / 0.79 | 62.7 | 72% | 66% | 0.00 | 0.98 | 864 | 380 | 0.00 | 45 | 528 | 23% |
| 3 | v3.6 save | 38.3 | 0.1% | 1.00 | 36.8 | 17.2 | 0.991 / 0.959 / 0.961 | 0.00 / 0.87 | 62.6 | 81% | 92% | 0.02 | 0.97 | 847 | 362 | 0.00 | 27 | 528 | 24% |
| 3 | v3.6 save+tea | 38.3 | 0.1% | 1.00 | 36.5 | 17.2 | 0.991 / 0.959 / 0.958 | 0.00 / 0.99 | 62.6 | 81% | 92% | 0.02 | 0.97 | 851 | 365 | 0.00 | 27 | 528 | 23% |
| 4 | no spells | 49.8 | 0.7% | 1.00 | 35.0 | 18.6 | 0.976 / 0.978 / 0.986 | 0.00 / 0.00 | 57.8 | 78% | 0% | 0.07 | 0.98 | 2762 | 1929 | 0.00 | 0 | 912 | 25% |
| 4 | v3.6 free | 54.0 | 0.2% | 1.00 | 32.7 | 17.0 | 0.910 / 0.923 / 0.938 | 1.32 / 1.60 | 58.3 | 72% | 71% | 0.00 | 0.98 | 1993 | 1157 | 0.00 | 2096 | 912 | 24% |
| 4 | v3.6 save | 49.6 | 0.6% | 1.00 | 32.5 | 18.6 | 0.977 / 0.923 / 0.936 | 0.00 / 1.63 | 57.5 | 79% | 97% | 0.03 | 0.98 | 1998 | 1172 | 0.00 | 2218 | 912 | 24% |
| 4 | v3.6 save+tea | 49.6 | 0.6% | 1.00 | 32.4 | 18.6 | 0.977 / 0.924 / 0.935 | 0.00 / 1.73 | 57.4 | 79% | 97% | 0.03 | 0.98 | 1987 | 1157 | 0.00 | 2157 | 912 | 24% |
| 5 | no spells | 33.0 | 0.8% | 1.00 | 36.7 | 18.7 | 0.977 / 0.976 / 0.985 | 0.00 / 0.00 | 57.9 | 81% | 0% | 0.09 | 0.97 | 5557 | 4110 | 0.00 | 0 | 1560 | 25% |
| 5 | v3.6 free | 33.7 | 0.1% | 1.00 | 36.4 | 18.2 | 0.920 / 0.948 / 0.946 | 1.18 / 1.31 | 58.4 | 79% | 84% | 0.02 | 0.97 | 2415 | 971 | 0.00 | 194 | 1560 | 25% |
| 5 | v3.6 save | 32.7 | 0.9% | 0.99 | 36.4 | 18.8 | 0.977 / 0.944 / 0.945 | 0.00 / 1.34 | 57.6 | 82% | 99% | 0.07 | 0.97 | 2512 | 1079 | 0.00 | 65 | 1560 | 25% |
| 5 | v3.6 save+tea | 32.7 | 0.9% | 0.99 | 36.3 | 18.8 | 0.978 / 0.941 / 0.948 | 0.00 / 1.27 | 57.6 | 82% | 99% | 0.07 | 0.97 | 2493 | 598 | 0.00 | 86 | 1560 | 25% |
| 6 | no spells | 33.5 | 1.4% | 1.00 | 33.7 | 21.3 | 0.977 / 0.970 / 0.987 | 0.00 / 0.00 | 66.5 | 82% | 0% | 0.21 | 0.97 | 7678 | 5715 | 0.00 | 0 | 2160 | 23% |
| 6 | v3.6 free | 39.6 | 0.2% | 1.00 | 32.1 | 17.4 | 0.906 / 0.928 / 0.951 | 1.43 / 1.15 | 66.3 | 75% | 76% | 0.02 | 0.97 | 4033 | 2069 | 0.00 | 2322 | 2160 | 22% |
| 6 | v3.6 save | 33.8 | 1.2% | 1.00 | 32.3 | 21.1 | 0.978 / 0.929 / 0.954 | 0.00 / 1.07 | 66.4 | 83% | 98% | 0.18 | 0.97 | 4513 | 2567 | 0.00 | 3186 | 2160 | 22% |
| 6 | v3.6 save+tea | 33.7 | 1.1% | 1.00 | 31.8 | 21.2 | 0.977 / 0.931 / 0.954 | 0.00 / 1.14 | 66.4 | 83% | 98% | 0.17 | 0.97 | 3725 | 1803 | 0.00 | 1242 | 2160 | 22% |
| 7 | no spells | 38.7 | 1.8% | 1.00 | 36.8 | 22.6 | 0.976 / 0.967 / 0.984 | 0.00 / 0.00 | 79.2 | 74% | 0% | 0.37 | 0.97 | 10634 | 8073 | 0.00 | 0 | 2760 | 22% |
| 7 | v3.6 free | 43.8 | 0.4% | 0.99 | 36.0 | 19.9 | 0.914 / 0.928 / 0.948 | 1.45 / 1.24 | 80.5 | 83% | 87% | 0.04 | 0.98 | 4942 | 2308 | 0.00 | 2088 | 2760 | 22% |
| 7 | v3.6 save | 38.9 | 1.1% | 1.00 | 34.7 | 22.6 | 0.975 / 0.935 / 0.946 | 0.00 / 1.26 | 79.3 | 74% | 97% | 0.36 | 0.97 | 4355 | 1791 | 0.00 | 1080 | 2760 | 22% |
| 7 | v3.6 save+tea | 38.8 | 1.1% | 0.99 | 35.9 | 22.5 | 0.976 / 0.937 / 0.948 | 0.00 / 1.22 | 79.0 | 74% | 97% | 0.35 | 0.97 | 5457 | 2868 | 0.00 | 2556 | 2760 | 22% |
| 8 | no spells | 36.4 | 1.2% | 1.00 | 35.5 | 22.6 | 0.976 / 0.970 / 0.985 | 0.00 / 0.00 | 73.7 | 70% | 0% | 0.37 | 0.97 | 13945 | 10798 | 0.00 | 0 | 3360 | 23% |
| 8 | v3.6 free | 44.2 | 0.4% | 1.00 | 32.4 | 18.1 | 0.905 / 0.912 / 0.925 | 1.53 / 1.89 | 73.7 | 79% | 80% | 0.02 | 0.98 | 6447 | 3282 | 0.00 | 2772 | 3360 | 23% |
| 8 | v3.6 save | 36.4 | 1.4% | 1.00 | 32.7 | 22.5 | 0.977 / 0.924 / 0.923 | 0.00 / 2.04 | 73.1 | 72% | 97% | 0.36 | 0.97 | 7076 | 3934 | 0.00 | 2587 | 3360 | 23% |
| 8 | v3.6 save+tea | 36.6 | 1.0% | 1.00 | 33.1 | 22.5 | 0.977 / 0.928 / 0.927 | 0.00 / 1.96 | 73.5 | 71% | 97% | 0.36 | 0.97 | 5877 | 2800 | 0.00 | 1201 | 3360 | 23% |
| 9 | no spells | 34.5 | 1.4% | 1.00 | 39.4 | 22.5 | 0.979 / 0.970 / 0.984 | 0.00 / 0.00 | 70.1 | 75% | 0% | 0.38 | 0.97 | 17696 | 13854 | 0.00 | 0 | 4080 | 23% |
| 9 | v3.6 free | 38.8 | 0.6% | 1.00 | 35.8 | 19.6 | 0.952 / 0.946 / 0.958 | 0.60 / 1.01 | 69.3 | 73% | 98% | 0.26 | 0.97 | 8010 | 900 | 0.00 | 8424 | 4080 | 23% |
| 9 | v3.6 save | 34.5 | 1.2% | 1.00 | 36.3 | 22.1 | 0.980 / 0.949 / 0.957 | 0.00 / 1.01 | 68.9 | 75% | 99% | 0.36 | 0.97 | 8248 | 1031 | 0.00 | 6926 | 4080 | 23% |
| 9 | v3.6 save+tea | 34.5 | 0.9% | 1.00 | 36.6 | 22.4 | 0.980 / 0.946 / 0.956 | 0.00 / 1.01 | 69.5 | 76% | 99% | 0.37 | 0.97 | 7724 | 1522 | 0.00 | 6864 | 4080 | 23% |

### 7.8 Per realm, 50% saver

| realm | mode | battles | defeat % | boss 1st-try | boss q | normal q | q share normal / elite / boss | casts/b normal / boss | min/location | MP at battle start | spell castable at start | heals/b | full gear | gold start | min gold | free inns | spell spend | gear spend | proficient at end |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | no spells | 65.6 | 0.1% | 1.00 | 37.0 | 15.2 | 0.990 / 0.980 / 0.996 | 0.00 / 0.00 | 62.7 | 100% | 0% | 0.00 | 0.90 | 24 | 28 | 0.00 | 0 | 35 | 25% |
| 1 | v3.6 free | 65.6 | 0.1% | 1.00 | 37.0 | 15.2 | 0.990 / 0.980 / 0.996 | 0.00 / 0.00 | 62.7 | 100% | 0% | 0.00 | 0.90 | 24 | 28 | 0.00 | 0 | 35 | 25% |
| 1 | v3.6 save | 65.6 | 0.1% | 1.00 | 37.0 | 15.2 | 0.990 / 0.980 / 0.996 | 0.00 / 0.00 | 62.7 | 100% | 0% | 0.00 | 0.90 | 24 | 28 | 0.00 | 0 | 35 | 25% |
| 1 | v3.6 save+tea | 65.6 | 0.1% | 1.00 | 37.0 | 15.2 | 0.990 / 0.980 / 0.996 | 0.00 / 0.00 | 62.7 | 100% | 0% | 0.00 | 0.90 | 24 | 28 | 0.00 | 0 | 35 | 25% |
| 2 | no spells | 49.5 | 0.9% | 1.00 | 41.3 | 15.7 | 0.988 / 0.975 / 0.976 | 0.00 / 0.00 | 73.4 | 77% | 0% | 0.00 | 0.97 | 758 | 439 | 0.00 | 0 | 288 | 23% |
| 2 | v3.6 free | 49.6 | 0.9% | 1.00 | 41.2 | 15.7 | 0.988 / 0.975 / 0.975 | 0.00 / 0.03 | 73.4 | 77% | 1% | 0.00 | 0.97 | 758 | 439 | 0.00 | 394 | 288 | 23% |
| 2 | v3.6 save | 49.5 | 0.9% | 1.00 | 41.2 | 15.7 | 0.988 / 0.975 / 0.975 | 0.00 / 0.04 | 73.3 | 77% | 1% | 0.00 | 0.97 | 758 | 439 | 0.00 | 394 | 288 | 23% |
| 2 | v3.6 save+tea | 49.5 | 0.9% | 1.00 | 41.2 | 15.7 | 0.988 / 0.975 / 0.975 | 0.00 / 0.04 | 73.3 | 77% | 1% | 0.00 | 0.97 | 758 | 439 | 0.00 | 394 | 288 | 23% |
| 3 | no spells | 43.8 | 1.0% | 0.99 | 45.6 | 20.4 | 0.979 / 0.963 / 0.971 | 0.00 / 0.00 | 81.3 | 89% | 0% | 0.25 | 0.98 | 1332 | 814 | 0.00 | 0 | 528 | 23% |
| 3 | v3.6 free | 48.0 | 0.7% | 0.96 | 43.5 | 18.4 | 0.958 / 0.946 / 0.957 | 0.49 / 0.52 | 81.2 | 88% | 50% | 0.10 | 0.98 | 940 | 427 | 0.00 | 0 | 528 | 23% |
| 3 | v3.6 save | 43.8 | 1.0% | 0.97 | 43.8 | 20.3 | 0.979 / 0.947 / 0.957 | 0.00 / 0.54 | 80.9 | 89% | 53% | 0.21 | 0.97 | 938 | 425 | 0.00 | 0 | 528 | 23% |
| 3 | v3.6 save+tea | 43.8 | 0.9% | 0.97 | 43.7 | 20.3 | 0.979 / 0.948 / 0.957 | 0.00 / 0.55 | 80.8 | 89% | 53% | 0.21 | 0.97 | 939 | 426 | 0.00 | 0 | 528 | 23% |
| 4 | no spells | 59.6 | 9.2% | 0.95 | 40.0 | 20.9 | 0.966 / 0.971 / 0.970 | 0.00 / 0.00 | 74.8 | 87% | 0% | 0.27 | 0.96 | 2062 | 1061 | 0.00 | 0 | 912 | 24% |
| 4 | v3.6 free | 63.4 | 6.7% | 0.94 | 37.4 | 19.6 | 0.920 / 0.927 / 0.940 | 0.97 / 1.10 | 75.4 | 87% | 49% | 0.12 | 0.97 | 1720 | 737 | 0.00 | 61 | 912 | 24% |
| 4 | v3.6 save | 60.0 | 9.6% | 0.92 | 36.8 | 20.8 | 0.966 / 0.931 / 0.941 | 0.00 / 1.13 | 74.7 | 87% | 55% | 0.23 | 0.96 | 1680 | 710 | 0.00 | 61 | 912 | 24% |
| 4 | v3.6 save+tea | 60.0 | 9.5% | 0.92 | 36.6 | 20.8 | 0.966 / 0.931 / 0.940 | 0.00 / 1.16 | 74.6 | 87% | 55% | 0.22 | 0.97 | 1683 | 713 | 0.00 | 61 | 912 | 24% |
| 5 | no spells | 39.8 | 10.6% | 0.91 | 41.3 | 20.7 | 0.968 / 0.968 / 0.972 | 0.00 / 0.00 | 74.6 | 87% | 0% | 0.29 | 0.96 | 3219 | 1622 | 0.00 | 0 | 1560 | 24% |
| 5 | v3.6 free | 40.1 | 10.3% | 0.90 | 40.1 | 20.6 | 0.957 / 0.959 / 0.963 | 0.22 / 0.30 | 74.7 | 87% | 57% | 0.25 | 0.96 | 2831 | 1288 | 0.00 | 0 | 1560 | 24% |
| 5 | v3.6 save | 39.8 | 10.7% | 0.88 | 40.2 | 20.7 | 0.968 / 0.962 / 0.967 | 0.00 / 0.22 | 74.6 | 88% | 57% | 0.29 | 0.97 | 2853 | 1321 | 0.00 | 0 | 1560 | 24% |
| 5 | v3.6 save+tea | 39.9 | 10.6% | 0.89 | 40.2 | 20.8 | 0.968 / 0.963 / 0.966 | 0.00 / 0.24 | 74.9 | 88% | 57% | 0.29 | 0.97 | 2851 | 1052 | 0.00 | 0 | 1560 | 24% |
| 6 | no spells | 40.1 | 15.3% | 0.88 | 38.0 | 23.7 | 0.969 / 0.965 / 0.973 | 0.00 / 0.00 | 85.4 | 89% | 0% | 0.51 | 0.97 | 3932 | 1867 | 0.00 | 0 | 2160 | 22% |
| 6 | v3.6 free | 40.7 | 13.8% | 0.91 | 37.5 | 23.5 | 0.963 / 0.960 / 0.969 | 0.11 / 0.11 | 86.0 | 89% | 57% | 0.48 | 0.97 | 3633 | 1602 | 0.00 | 0 | 2160 | 22% |
| 6 | v3.6 save | 40.1 | 14.6% | 0.89 | 37.9 | 23.8 | 0.968 / 0.962 / 0.968 | 0.01 / 0.15 | 85.6 | 89% | 57% | 0.50 | 0.97 | 3706 | 1668 | 0.00 | 0 | 2160 | 22% |
| 6 | v3.6 save+tea | 40.1 | 14.6% | 0.89 | 37.7 | 23.8 | 0.968 / 0.961 / 0.968 | 0.01 / 0.16 | 85.6 | 89% | 57% | 0.51 | 0.97 | 3433 | 1400 | 0.00 | 0 | 2160 | 22% |
| 7 | no spells | 48.0 | 20.8% | 0.82 | 39.1 | 24.9 | 0.967 / 0.965 / 0.975 | 0.00 / 0.00 | 104.3 | 83% | 0% | 0.65 | 0.97 | 4730 | 1937 | 0.00 | 0 | 2760 | 22% |
| 7 | v3.6 free | 48.4 | 17.5% | 0.81 | 38.4 | 24.8 | 0.953 / 0.952 / 0.964 | 0.30 / 0.43 | 105.2 | 86% | 57% | 0.59 | 0.97 | 4647 | 1840 | 0.00 | 0 | 2760 | 22% |
| 7 | v3.6 save | 47.7 | 19.8% | 0.83 | 38.9 | 24.9 | 0.967 / 0.956 / 0.965 | 0.00 / 0.41 | 104.0 | 83% | 57% | 0.63 | 0.97 | 4660 | 1898 | 0.00 | 0 | 2760 | 22% |
| 7 | v3.6 save+tea | 47.7 | 19.3% | 0.83 | 39.2 | 24.9 | 0.967 / 0.954 / 0.965 | 0.00 / 0.40 | 103.8 | 83% | 57% | 0.62 | 0.97 | 4411 | 1678 | 0.00 | 0 | 2760 | 22% |
| 8 | no spells | 44.8 | 18.6% | 0.88 | 39.0 | 25.0 | 0.967 / 0.967 / 0.972 | 0.00 / 0.00 | 97.2 | 81% | 0% | 0.66 | 0.96 | 4734 | 1522 | 0.00 | 0 | 3360 | 23% |
| 8 | v3.6 free | 44.2 | 16.4% | 0.90 | 39.8 | 25.1 | 0.955 / 0.954 / 0.961 | 0.29 / 0.32 | 96.8 | 83% | 56% | 0.64 | 0.96 | 4757 | 1571 | 0.00 | 0 | 3360 | 23% |
| 8 | v3.6 save | 44.5 | 17.4% | 0.86 | 38.7 | 25.0 | 0.963 / 0.957 / 0.961 | 0.10 / 0.40 | 96.8 | 82% | 57% | 0.66 | 0.96 | 4773 | 1574 | 0.00 | 0 | 3360 | 23% |
| 8 | v3.6 save+tea | 44.5 | 17.7% | 0.87 | 38.7 | 25.1 | 0.963 / 0.956 / 0.961 | 0.10 / 0.41 | 97.1 | 82% | 57% | 0.67 | 0.95 | 4447 | 1349 | 0.00 | 0 | 3360 | 23% |
| 9 | no spells | 41.6 | 16.5% | 0.86 | 41.4 | 25.3 | 0.967 / 0.961 / 0.974 | 0.00 / 0.00 | 91.9 | 84% | 0% | 0.70 | 0.96 | 5438 | 1501 | 0.00 | 0 | 4080 | 23% |
| 9 | v3.6 free | 41.9 | 17.5% | 0.81 | 40.3 | 25.2 | 0.960 / 0.957 / 0.970 | 0.19 / 0.26 | 92.6 | 86% | 57% | 0.73 | 0.95 | 5475 | 1551 | 0.00 | 0 | 4080 | 23% |
| 9 | v3.6 save | 42.0 | 17.3% | 0.82 | 41.1 | 25.1 | 0.968 / 0.957 / 0.968 | 0.00 / 0.25 | 92.4 | 85% | 57% | 0.71 | 0.96 | 5454 | 1540 | 0.00 | 0 | 4080 | 23% |
| 9 | v3.6 save+tea | 41.8 | 17.4% | 0.83 | 40.9 | 25.2 | 0.967 / 0.956 / 0.968 | 0.00 / 0.23 | 92.3 | 85% | 57% | 0.70 | 0.93 | 5053 | 1287 | 0.00 | 0 | 4080 | 23% |

### 7.9 Per realm, 90% saver

| realm | mode | battles | defeat % | boss 1st-try | boss q | normal q | q share normal / elite / boss | casts/b normal / boss | min/location | MP at battle start | spell castable at start | heals/b | full gear | gold start | min gold | free inns | spell spend | gear spend | proficient at end |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | no spells | 50.0 | 0.0% | 1.00 | 21.8 | 9.9 | 1.000 / 1.000 / 1.000 | 0.00 / 0.00 | 35.4 | 100% | 0% | 0.00 | 0.92 | 24 | 33 | 0.00 | 0 | 35 | 27% |
| 1 | v3.6 free | 50.0 | 0.0% | 1.00 | 21.8 | 9.9 | 1.000 / 1.000 / 1.000 | 0.00 / 0.00 | 35.4 | 100% | 0% | 0.00 | 0.92 | 24 | 33 | 0.00 | 0 | 35 | 27% |
| 1 | v3.6 save | 50.0 | 0.0% | 1.00 | 21.8 | 9.9 | 1.000 / 1.000 / 1.000 | 0.00 / 0.00 | 35.4 | 100% | 0% | 0.00 | 0.92 | 24 | 33 | 0.00 | 0 | 35 | 27% |
| 1 | v3.6 save+tea | 50.0 | 0.0% | 1.00 | 21.8 | 9.9 | 1.000 / 1.000 / 1.000 | 0.00 / 0.00 | 35.4 | 100% | 0% | 0.00 | 0.92 | 24 | 33 | 0.00 | 0 | 35 | 27% |
| 2 | no spells | 36.6 | 0.0% | 1.00 | 24.7 | 10.5 | 0.998 / 1.000 / 1.000 | 0.00 / 0.00 | 41.5 | 48% | 0% | 0.01 | 0.97 | 808 | 536 | 0.00 | 0 | 288 | 24% |
| 2 | v3.6 free | 37.1 | 0.0% | 1.00 | 24.5 | 10.3 | 0.994 / 0.997 / 0.992 | 0.04 / 0.19 | 41.5 | 43% | 10% | 0.01 | 0.97 | 808 | 535 | 0.00 | 767 | 288 | 24% |
| 2 | v3.6 save | 36.7 | 0.0% | 1.00 | 24.2 | 10.5 | 0.998 / 0.994 / 0.985 | 0.00 / 0.37 | 41.5 | 48% | 14% | 0.01 | 0.97 | 808 | 535 | 0.00 | 742 | 288 | 24% |
| 2 | v3.6 save+tea | 36.7 | 0.0% | 1.00 | 24.2 | 10.5 | 0.998 / 0.994 / 0.985 | 0.00 / 0.37 | 41.5 | 48% | 14% | 0.01 | 0.97 | 808 | 535 | 0.00 | 745 | 288 | 24% |
| 3 | no spells | 34.4 | 0.0% | 1.00 | 26.4 | 13.0 | 0.999 / 1.000 / 1.000 | 0.00 / 0.00 | 45.3 | 60% | 0% | 0.00 | 0.97 | 1766 | 1288 | 0.00 | 0 | 528 | 24% |
| 3 | v3.6 free | 35.9 | 0.0% | 1.00 | 25.4 | 12.4 | 0.980 / 0.986 / 0.979 | 0.23 / 0.53 | 45.4 | 47% | 42% | 0.00 | 0.97 | 1008 | 527 | 0.00 | 1080 | 528 | 23% |
| 3 | v3.6 save | 34.7 | 0.0% | 1.00 | 24.5 | 13.0 | 0.999 / 0.982 / 0.971 | 0.00 / 0.74 | 45.3 | 58% | 58% | 0.00 | 0.97 | 1018 | 536 | 0.00 | 1080 | 528 | 23% |
| 3 | v3.6 save+tea | 34.7 | 0.0% | 1.00 | 24.4 | 13.0 | 0.999 / 0.982 / 0.962 | 0.00 / 0.96 | 45.3 | 59% | 58% | 0.00 | 0.97 | 1020 | 538 | 0.00 | 927 | 528 | 23% |
| 4 | no spells | 44.2 | 0.0% | 1.00 | 23.4 | 14.2 | 0.999 / 0.999 / 1.000 | 0.00 / 0.00 | 41.4 | 60% | 0% | 0.00 | 0.98 | 3314 | 2511 | 0.00 | 0 | 912 | 24% |
| 4 | v3.6 free | 45.7 | 0.0% | 1.00 | 22.7 | 13.6 | 0.963 / 0.972 / 0.958 | 0.49 / 0.98 | 41.5 | 35% | 34% | 0.00 | 0.98 | 1486 | 681 | 0.00 | 2302 | 912 | 24% |
| 4 | v3.6 save | 44.3 | 0.0% | 1.00 | 22.4 | 14.2 | 0.998 / 0.959 / 0.940 | 0.00 / 1.42 | 41.4 | 57% | 72% | 0.00 | 0.98 | 1470 | 669 | 0.00 | 2421 | 912 | 24% |
| 4 | v3.6 save+tea | 43.9 | 0.0% | 1.00 | 22.2 | 14.2 | 0.998 / 0.956 / 0.934 | 0.00 / 1.57 | 41.2 | 57% | 71% | 0.00 | 0.98 | 1572 | 770 | 0.00 | 2371 | 912 | 24% |
| 5 | no spells | 29.0 | 0.0% | 1.00 | 25.2 | 14.2 | 0.999 / 1.000 / 1.000 | 0.00 / 0.00 | 41.2 | 62% | 0% | 0.01 | 0.97 | 6851 | 5453 | 0.00 | 0 | 1560 | 25% |
| 5 | v3.6 free | 28.7 | 0.0% | 1.00 | 25.1 | 14.4 | 0.961 / 0.974 / 0.955 | 0.55 / 1.17 | 41.5 | 38% | 42% | 0.00 | 0.97 | 2654 | 1243 | 0.00 | 562 | 1560 | 25% |
| 5 | v3.6 save | 29.2 | 0.0% | 1.00 | 25.2 | 14.3 | 0.999 / 0.952 / 0.939 | 0.00 / 1.62 | 41.7 | 61% | 79% | 0.00 | 0.97 | 2579 | 1182 | 0.00 | 648 | 1560 | 25% |
| 5 | v3.6 save+tea | 29.4 | 0.0% | 1.00 | 25.3 | 14.2 | 0.999 / 0.954 / 0.939 | 0.00 / 1.65 | 41.7 | 62% | 80% | 0.00 | 0.97 | 2540 | 704 | 0.00 | 259 | 1560 | 25% |
| 6 | no spells | 29.6 | 0.0% | 1.00 | 23.4 | 16.2 | 0.999 / 0.999 / 1.000 | 0.00 / 0.00 | 48.0 | 64% | 0% | 0.00 | 0.97 | 9705 | 7821 | 0.00 | 0 | 2160 | 22% |
| 6 | v3.6 free | 30.2 | 0.0% | 1.00 | 23.5 | 15.8 | 0.960 / 0.966 / 0.959 | 0.62 / 1.01 | 48.1 | 38% | 41% | 0.00 | 0.97 | 4720 | 2725 | 0.00 | 3402 | 2160 | 23% |
| 6 | v3.6 save | 29.5 | 0.0% | 1.00 | 23.2 | 16.3 | 0.999 / 0.950 / 0.947 | 0.00 / 1.29 | 47.9 | 62% | 82% | 0.00 | 0.97 | 4709 | 2700 | 0.00 | 3456 | 2160 | 23% |
| 6 | v3.6 save+tea | 29.4 | 0.0% | 1.00 | 23.2 | 16.3 | 0.999 / 0.953 / 0.945 | 0.00 / 1.35 | 47.8 | 63% | 82% | 0.00 | 0.96 | 4007 | 2107 | 0.00 | 2808 | 2160 | 23% |
| 7 | no spells | 36.0 | 0.0% | 1.00 | 25.0 | 16.6 | 0.999 / 0.997 / 1.000 | 0.00 / 0.00 | 56.9 | 51% | 0% | 0.01 | 0.97 | 13793 | 11384 | 0.00 | 0 | 2760 | 22% |
| 7 | v3.6 free | 37.3 | 0.0% | 1.00 | 23.8 | 15.9 | 0.962 / 0.968 / 0.951 | 0.61 / 1.20 | 57.2 | 38% | 43% | 0.00 | 0.97 | 5124 | 2638 | 0.00 | 5112 | 2760 | 22% |
| 7 | v3.6 save | 36.0 | 0.0% | 1.00 | 23.3 | 16.5 | 0.999 / 0.962 / 0.937 | 0.00 / 1.55 | 56.7 | 51% | 79% | 0.00 | 0.97 | 5233 | 2741 | 0.00 | 5184 | 2760 | 22% |
| 7 | v3.6 save+tea | 36.0 | 0.0% | 1.00 | 24.3 | 16.5 | 0.999 / 0.958 / 0.932 | 0.00 / 1.76 | 56.7 | 51% | 80% | 0.01 | 0.97 | 4643 | 2107 | 0.00 | 2700 | 2760 | 22% |
| 8 | no spells | 33.8 | 0.0% | 1.00 | 24.7 | 16.5 | 0.999 / 0.998 / 1.000 | 0.00 / 0.00 | 52.7 | 45% | 0% | 0.01 | 0.97 | 19474 | 16483 | 0.00 | 0 | 3360 | 23% |
| 8 | v3.6 free | 35.6 | 0.0% | 1.00 | 23.2 | 15.7 | 0.960 / 0.963 / 0.946 | 0.62 / 1.32 | 53.2 | 39% | 43% | 0.00 | 0.97 | 5538 | 2479 | 0.00 | 2911 | 3360 | 23% |
| 8 | v3.6 save | 33.6 | 0.0% | 1.00 | 23.6 | 16.6 | 0.999 / 0.971 / 0.930 | 0.00 / 1.78 | 52.6 | 46% | 72% | 0.01 | 0.97 | 5602 | 2534 | 0.00 | 2633 | 3360 | 23% |
| 8 | v3.6 save+tea | 33.7 | 0.0% | 1.00 | 23.1 | 16.6 | 0.999 / 0.971 / 0.919 | 0.00 / 2.03 | 52.6 | 47% | 73% | 0.01 | 0.97 | 6318 | 3212 | 0.00 | 3557 | 3360 | 23% |
| 9 | no spells | 32.1 | 0.0% | 1.00 | 25.9 | 16.4 | 0.999 / 0.998 / 1.000 | 0.00 / 0.00 | 49.8 | 45% | 0% | 0.00 | 0.97 | 25492 | 21872 | 0.00 | 0 | 4080 | 23% |
| 9 | v3.6 free | 33.4 | 0.0% | 1.00 | 24.8 | 15.6 | 0.983 / 0.986 / 0.972 | 0.26 / 0.71 | 49.5 | 42% | 72% | 0.00 | 0.97 | 8675 | 826 | 0.00 | 9648 | 4080 | 23% |
| 9 | v3.6 save | 31.7 | 0.0% | 1.00 | 24.6 | 16.4 | 0.999 / 0.986 / 0.965 | 0.00 / 0.90 | 49.2 | 47% | 80% | 0.01 | 0.97 | 8933 | 833 | 0.00 | 9533 | 4080 | 23% |
| 9 | v3.6 save+tea | 31.7 | 0.0% | 1.00 | 24.0 | 16.3 | 0.999 / 0.982 / 0.955 | 0.00 / 1.12 | 49.0 | 47% | 81% | 0.01 | 0.97 | 7235 | 1044 | 0.00 | 8050 | 4080 | 23% |

### 7.10 Boss fights by realm

| realm | acc | no spells | free | save | save+tea | length target (q) |
|---|---|---|---|---|---|---|
| 1 | 75% | 1.00 / 28.1 / 0.00 / 20% | 1.00 / 28.1 / 0.00 / 20% | 1.00 / 28.1 / 0.00 / 20% | 1.00 / 28.1 / 0.00 / 20% | ~20 correct answers even with full-MP spells (v3.6) |
| 1 | 50% | 1.00 / 37.0 / 0.00 / 44% | 1.00 / 37.0 / 0.00 / 44% | 1.00 / 37.0 / 0.00 / 44% | 1.00 / 37.0 / 0.00 / 44% | ~20 correct answers even with full-MP spells (v3.6) |
| 2 | 75% | 1.00 / 30.7 / 0.00 / 29% | 1.00 / 30.4 / 0.26 / 30% | 1.00 / 29.9 / 0.40 / 30% | 1.00 / 30.0 / 0.40 / 29% | ~20 correct answers even with full-MP spells (v3.6) |
| 2 | 50% | 1.00 / 41.3 / 0.00 / 45% | 1.00 / 41.2 / 0.03 / 46% | 1.00 / 41.2 / 0.04 / 46% | 1.00 / 41.2 / 0.04 / 46% | ~20 correct answers even with full-MP spells (v3.6) |
| 3 | 75% | 1.00 / 33.4 / 0.00 / 34% | 1.00 / 32.0 / 0.69 / 34% | 1.00 / 32.2 / 0.77 / 35% | 1.00 / 32.0 / 0.99 / 36% | ~20 correct answers even with full-MP spells (v3.6) |
| 3 | 50% | 0.99 / 45.6 / 0.00 / 52% | 0.96 / 43.5 / 0.52 / 54% | 0.97 / 43.8 / 0.54 / 55% | 0.97 / 43.7 / 0.55 / 55% | ~20 correct answers even with full-MP spells (v3.6) |
| 4 | 75% | 1.00 / 30.4 / 0.00 / 32% | 1.00 / 29.1 / 1.37 / 34% | 1.00 / 28.0 / 1.58 / 33% | 1.00 / 28.4 / 1.65 / 34% | ~20 correct answers even with full-MP spells (v3.6) |
| 4 | 50% | 0.95 / 40.0 / 0.00 / 57% | 0.94 / 37.4 / 1.10 / 60% | 0.92 / 36.8 / 1.13 / 60% | 0.92 / 36.6 / 1.16 / 61% | ~20 correct answers even with full-MP spells (v3.6) |
| 5 | 75% | 1.00 / 31.9 / 0.00 / 35% | 1.00 / 32.2 / 1.25 / 37% | 1.00 / 32.3 / 1.38 / 38% | 1.00 / 32.3 / 1.40 / 38% | ~20 correct answers even with full-MP spells (v3.6) |
| 5 | 50% | 0.91 / 41.3 / 0.00 / 61% | 0.90 / 40.1 / 0.30 / 61% | 0.88 / 40.2 / 0.22 / 62% | 0.89 / 40.2 / 0.24 / 62% | ~20 correct answers even with full-MP spells (v3.6) |
| 6 | 75% | 1.00 / 30.2 / 0.00 / 34% | 1.00 / 28.4 / 0.91 / 32% | 1.00 / 29.0 / 1.39 / 36% | 1.00 / 28.4 / 1.03 / 33% | ~20 correct answers even with full-MP spells (v3.6) |
| 6 | 50% | 0.88 / 38.0 / 0.00 / 63% | 0.91 / 37.5 / 0.11 / 63% | 0.89 / 37.9 / 0.15 / 63% | 0.89 / 37.7 / 0.16 / 63% | ~20 correct answers even with full-MP spells (v3.6) |
| 7 | 75% | 1.00 / 31.8 / 0.00 / 36% | 1.00 / 31.2 / 1.26 / 37% | 1.00 / 29.8 / 1.42 / 35% | 1.00 / 30.5 / 1.44 / 37% | ~20 correct answers even with full-MP spells (v3.6) |
| 7 | 50% | 0.82 / 39.1 / 0.00 / 71% | 0.81 / 38.4 / 0.43 / 71% | 0.83 / 38.9 / 0.41 / 72% | 0.83 / 39.2 / 0.40 / 72% | ~20 correct answers even with full-MP spells (v3.6) |
| 8 | 75% | 1.00 / 31.6 / 0.00 / 36% | 1.00 / 28.5 / 1.87 / 35% | 1.00 / 28.5 / 2.22 / 36% | 1.00 / 28.7 / 2.04 / 37% | ~20 correct answers even with full-MP spells (v3.6) |
| 8 | 50% | 0.88 / 39.0 / 0.00 / 64% | 0.90 / 39.8 / 0.32 / 61% | 0.86 / 38.7 / 0.40 / 65% | 0.87 / 38.7 / 0.41 / 66% | ~20 correct answers even with full-MP spells (v3.6) |
| 9 | 75% | 1.00 / 33.9 / 0.00 / 37% | 1.00 / 31.3 / 0.97 / 33% | 1.00 / 30.6 / 1.00 / 35% | 1.00 / 31.0 / 1.05 / 35% | ~20 correct answers even with full-MP spells (v3.6) |
| 9 | 50% | 0.86 / 41.4 / 0.00 / 66% | 0.81 / 40.3 / 0.26 / 73% | 0.82 / 41.1 / 0.25 / 72% | 0.83 / 40.9 / 0.23 / 72% | ~20 correct answers even with full-MP spells (v3.6) |

### 7.11 Gold and MP timeline

| realm | no spells: gold at end | free: gold at end | save: gold at end | save+tea: gold at end | save: spells owned | free / save / save+tea: MP at battle start | free / save / save+tea: MP at boss start | save+tea: teas bought / drunk, tea gold | save: spell spend | save: gear spend |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 737 | 737 | 737 | 737 | 0.0 | 100% / 100% / 100% | 100% / 100% / 100% | 0.00 / 0.00, 0 | 0 | 35 |
| 2 | 1564 | 847 | 833 | 838 | 1.0 | 55% / 58% / 58% | 75% / 81% / 81% | 0.00 / 0.57, 0 | 720 | 288 |
| 3 | 2870 | 2066 | 2081 | 2059 | 1.1 | 63% / 73% / 73% | 91% / 89% / 97% | 0.39 / 1.22, 42 | 180 | 528 |
| 4 | 6085 | 2682 | 2910 | 2785 | 2.1 | 60% / 73% / 73% | 91% / 95% / 98% | 0.63 / 1.88, 102 | 2231 | 912 |
| 5 | 8580 | 4708 | 4121 | 4408 | 2.6 | 67% / 76% / 76% | 88% / 97% / 97% | 1.63 / 0.63, 882 | 1512 | 1560 |
| 6 | 12287 | 4344 | 5251 | 3926 | 3.1 | 62% / 78% / 78% | 89% / 97% / 98% | 0.34 / 0.77, 230 | 2295 | 2160 |
| 7 | 17109 | 7603 | 5094 | 7126 | 4.0 | 67% / 70% / 70% | 90% / 100% / 100% | 1.15 / 1.15, 934 | 4392 | 2760 |
| 8 | 22354 | 7352 | 9411 | 6327 | 4.2 | 65% / 66% / 66% | 92% / 99% / 100% | 1.19 / 1.19, 1121 | 1663 | 3360 |
| 9 | 27482 | 4063 | 5340 | 4074 | 5.2 | 62% / 67% / 68% | 94% / 98% / 100% | 1.07 / 1.13, 1159 | 9110 | 4080 |

Spell timelines (save style):

75% saver:

| spell | town | sold from (h) | first affordable (realm, h) | bought by % of runs | bought (realm, h, battle #) |
|---|---|---|---|---|---|
| 小火球术 Small Fireball | 2 | 2.1 | 2, 2.4 | 100% | 2, 3.5, 85 |
| 泡泡术 Bubble Spell | 2 | 2.1 | 2, 2.3 | 0% | - |
| 雪球术 Snowball Volley | 3 | 3.8 | 3, 4.7 | 0% | - |
| 小闪电术 Little Lightning | 3 | 3.8 | 3, 5.0 | 13% | 3, 5.6, 130 |
| 火球术 Fireball | 4 | 5.6 | 4, 5.8 | 1% | 4, 8.1, 183 |
| 旋风术 Whirlwind | 4 | 5.6 | 4, 6.5 | 97% | 4, 7.4, 161 |
| 雪花术 Snowflake Dance | 5 | 8.1 | 5, 9.0 | 47% | 5, 9.7, 207 |
| 闪电术 Lightning Bolt | 5 | 8.1 | 5, 8.3 | 0% | - |
| 阳光术 Sunbeam | 6 | 9.8 | 6, 10.3 | 0% | - |
| 大火球术 Big Fireball | 6 | 9.8 | 6, 10.3 | 57% | 6, 11.3, 230 |
| 暴风雪术 Blizzard | 7 | 11.7 | 7, 12.3 | 81% | 7, 13.7, 270 |
| 龙卷风术 Tornado | 7 | 11.7 | 7, 12.0 | 0% | - |
| 流星术 Meteor | 8 | 14.0 | 8, 15.0 | 0% | - |
| 雷雨术 Thunderstorm | 8 | 14.0 | 8, 15.4 | 24% | 8, 15.8, 304 |
| 超暴风雪术 Super Blizzard | 9 | 16.1 | 9, 16.5 | 97% | 9, 17.1, 326 |
| 流星雨术 Meteor Shower | 9 | 16.1 | 9, 16.4 | 0% | - |

75% spender:

| spell | town | sold from (h) | first affordable (realm, h) | bought by % of runs | bought (realm, h, battle #) |
|---|---|---|---|---|---|
| 小火球术 Small Fireball | 2 | 1.5 | 2, 2.5 | 3% | 2, 2.8, 55 |
| 泡泡术 Bubble Spell | 2 | 1.5 | 2, 1.7 | 0% | - |
| 雪球术 Snowball Volley | 3 | 2.6 | 3, 3.2 | 0% | - |
| 小闪电术 Little Lightning | 3 | 2.6 | 3, 3.7 | 0% | - |
| 火球术 Fireball | 4 | 3.9 | 4, 4.7 | 0% | - |
| 旋风术 Whirlwind | 4 | 3.9 | 4, 5.0 | 75% | 4, 5.8, 110 |
| 雪花术 Snowflake Dance | 5 | 5.8 | 5, 7.1 | 9% | 5, 7.1, 132 |
| 闪电术 Lightning Bolt | 5 | 5.8 | 5, 6.9 | 0% | - |
| 阳光术 Sunbeam | 6 | 7.1 | 6, 7.4 | 0% | - |
| 大火球术 Big Fireball | 6 | 7.1 | 6, 8.2 | 19% | 6, 8.5, 154 |
| 暴风雪术 Blizzard | 7 | 8.6 | 7, 8.9 | 3% | 7, 10.2, 176 |
| 龙卷风术 Tornado | 7 | 8.6 | 7, 8.8 | 0% | - |
| 流星术 Meteor | 8 | 10.1 | 8, 10.3 | 0% | - |
| 雷雨术 Thunderstorm | 8 | 10.1 | 8, 10.3 | 12% | 8, 11.6, 198 |
| 超暴风雪术 Super Blizzard | 9 | 11.5 | 9, 11.8 | 82% | 9, 12.4, 210 |
| 流星雨术 Meteor Shower | 9 | 11.5 | 9, 11.8 | 0% | - |

90% saver:

| spell | town | sold from (h) | first affordable (realm, h) | bought by % of runs | bought (realm, h, battle #) |
|---|---|---|---|---|---|
| 小火球术 Small Fireball | 2 | 1.8 | 2, 2.0 | 100% | 2, 2.8, 76 |
| 泡泡术 Bubble Spell | 2 | 1.8 | 2, 2.0 | 4% | 2, 3.2, 90 |
| 雪球术 Snowball Volley | 3 | 3.2 | 3, 3.7 | 0% | - |
| 小闪电术 Little Lightning | 3 | 3.2 | 3, 4.0 | 80% | 3, 4.6, 121 |
| 火球术 Fireball | 4 | 4.7 | 4, 5.6 | 7% | 4, 6.8, 163 |
| 旋风术 Whirlwind | 4 | 4.7 | 4, 5.8 | 100% | 4, 6.5, 160 |
| 雪花术 Snowflake Dance | 5 | 6.7 | 5, 7.7 | 20% | 5, 8.1, 195 |
| 闪电术 Lightning Bolt | 5 | 6.7 | 5, 7.5 | 0% | - |
| 阳光术 Sunbeam | 6 | 8.1 | 6, 8.4 | 0% | - |
| 大火球术 Big Fireball | 6 | 8.1 | 6, 8.4 | 85% | 6, 9.4, 218 |
| 暴风雪术 Blizzard | 7 | 9.7 | 7, 10.5 | 96% | 7, 11.4, 255 |
| 龙卷风术 Tornado | 7 | 9.7 | 7, 10.0 | 0% | - |
| 流星术 Meteor | 8 | 11.6 | 8, 12.4 | 0% | - |
| 雷雨术 Thunderstorm | 8 | 11.6 | 8, 12.8 | 38% | 8, 13.3, 294 |
| 超暴风雪术 Super Blizzard | 9 | 13.4 | 9, 13.7 | 100% | 9, 14.0, 307 |
| 流星雨术 Meteor Shower | 9 | 13.4 | 9, 13.7 | 2% | 9, 15.1, 330 |

65% saver:

| spell | town | sold from (h) | first affordable (realm, h) | bought by % of runs | bought (realm, h, battle #) |
|---|---|---|---|---|---|
| 小火球术 Small Fireball | 2 | 2.4 | 2, 2.7 | 99% | 2, 4.1, 94 |
| 泡泡术 Bubble Spell | 2 | 2.4 | 2, 2.6 | 0% | - |
| 雪球术 Snowball Volley | 3 | 4.3 | 3, 5.6 | 0% | - |
| 小闪电术 Little Lightning | 3 | 4.3 | 3, 5.9 | 2% | 3, 6.7, 130 |
| 火球术 Fireball | 4 | 6.4 | 4, 6.7 | 0% | - |
| 旋风术 Whirlwind | 4 | 6.4 | 4, 7.7 | 97% | 4, 8.9, 179 |
| 雪花术 Snowflake Dance | 5 | 9.3 | 5, 10.8 | 2% | 5, 10.8, 207 |
| 闪电术 Lightning Bolt | 5 | 9.3 | 5, 10.5 | 0% | - |
| 阳光术 Sunbeam | 6 | 11.2 | 6, 11.4 | 0% | - |
| 大火球术 Big Fireball | 6 | 11.2 | 6, 11.4 | 79% | 6, 13.3, 252 |
| 暴风雪术 Blizzard | 7 | 13.4 | 7, 15.3 | 20% | 7, 15.7, 286 |
| 龙卷风术 Tornado | 7 | 13.4 | 7, 15.1 | 0% | - |
| 流星术 Meteor | 8 | 16.0 | 8, 16.3 | 0% | - |
| 雷雨术 Thunderstorm | 8 | 16.0 | 8, 16.5 | 37% | 8, 18.4, 328 |
| 超暴风雪术 Super Blizzard | 9 | 18.5 | 9, 18.9 | 74% | 9, 19.9, 349 |
| 流星雨术 Meteor Shower | 9 | 18.5 | 9, 18.9 | 0% | - |

50% saver:

| spell | town | sold from (h) | first affordable (realm, h) | bought by % of runs | bought (realm, h, battle #) |
|---|---|---|---|---|---|
| 小火球术 Small Fireball | 2 | 3.1 | 2, 4.1 | 55% | 2, 5.5, 115 |
| 泡泡术 Bubble Spell | 2 | 3.1 | 2, 3.3 | 0% | - |
| 雪球术 Snowball Volley | 3 | 5.6 | 3, 7.4 | 0% | - |
| 小闪电术 Little Lightning | 3 | 5.6 | 3, 8.1 | 0% | - |
| 火球术 Fireball | 4 | 8.3 | 4, 10.4 | 0% | - |
| 旋风术 Whirlwind | 4 | 8.3 | 4, 11.2 | 3% | 4, 12.0, 220 |
| 雪花术 Snowflake Dance | 5 | 12.0 | 5, 14.4 | 0% | - |
| 闪电术 Lightning Bolt | 5 | 12.0 | 5, 12.6 | 0% | - |
| 阳光术 Sunbeam | 6 | 14.5 | 6, 16.2 | 0% | - |
| 大火球术 Big Fireball | 6 | 14.5 | 6, 17.1 | 0% | - |
| 暴风雪术 Blizzard | 7 | 17.4 | 8, 23.1 | 0% | - |
| 龙卷风术 Tornado | 7 | 17.4 | 7, 18.3 | 0% | - |
| 流星术 Meteor | 8 | 20.8 | 8, 23.8 | 0% | - |
| 雷雨术 Thunderstorm | 8 | 20.8 | 8, 23.9 | 0% | - |
| 超暴风雪术 Super Blizzard | 9 | 24.0 | - | 0% | - |
| 流星雨术 Meteor Shower | 9 | 24.0 | - | 0% | - |

| spell | town | price | = normal kills at that town | that town's quests pay | kills if all quests done | normal fights | minutes at realm pace |
|---|---|---|---|---|---|---|---|
| 小火球术 Small Fireball | 2 | 720 | 60 | 324 | 33 | 31 | 78 |
| 泡泡术 Bubble Spell | 2 | 540 | 45 | 324 | 18 | 23 | 58 |
| 雪球术 Snowball Volley | 3 | 1080 | 60 | 504 | 32 | 25 | 74 |
| 小闪电术 Little Lightning | 3 | 1350 | 75 | 504 | 47 | 31 | 92 |
| 火球术 Fireball | 4 | 1890 | 70 | 756 | 42 | 24 | 77 |
| 旋风术 Whirlwind | 4 | 2295 | 85 | 756 | 57 | 29 | 93 |
| 雪花术 Snowflake Dance | 5 | 3240 | 90 | 1026 | 62 | 30 | 97 |
| 闪电术 Lightning Bolt | 5 | 2700 | 75 | 1026 | 46 | 25 | 81 |
| 阳光术 Sunbeam | 6 | 3600 | 80 | 1296 | 51 | 23 | 85 |
| 大火球术 Big Fireball | 6 | 4050 | 90 | 1296 | 61 | 26 | 96 |
| 暴风雪术 Blizzard | 7 | 5400 | 100 | 1566 | 71 | 29 | 109 |
| 龙卷风术 Tornado | 7 | 4590 | 85 | 1566 | 56 | 25 | 93 |
| 流星术 Meteor | 8 | 5670 | 90 | 1836 | 61 | 26 | 96 |
| 雷雨术 Thunderstorm | 8 | 6930 | 110 | 1836 | 81 | 32 | 118 |
| 超暴风雪术 Super Blizzard | 9 | 9360 | 130 | 2106 | 101 | 38 | 136 |
| 流星雨术 Meteor Shower | 9 | 8640 | 120 | 2106 | 91 | 35 | 125 |

## 8. Open questions for Jack

1. **Location bosses are now as long as realm bosses** (about 30 questions at 75%, 28–34 by realm), because both have the same ~20-correct-answer target. Keep that, or give location bosses a lower target (e.g. 15)?
2. **50% kids' boss fights** take 37–46 questions (realm 3: 45.6), right at the boss Tired cap of 45. OK, or lower the target for them through the Tired rule?
3. **Boss ATK × 0.8** (Director default) keeps 50% defeats at or below v3.5. × 0.9 would make 50% spenders' first-try boss wins 0.49. OK?
4. **MP costs 1.25 × v3.4** (2 single-target casts from full) are unchanged. With no regen, they're the knob if playtests show spells too rare.
5. **Town names** are placeholders. **Town 1's shop** (Mana Tea only, or a teaser spell?). **Elements** (cosmetic, or weaknesses?).
6. **First-spell price:** realm-1 savings still cover 小火球术 on arrival in town 2.
7. **Quests:** one-time or repeatable? Should the words quest count earlier realms' words?

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
