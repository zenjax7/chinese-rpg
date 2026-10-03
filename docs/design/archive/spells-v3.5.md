# Magic spells and quests: design and sim (v3.5)

For Jack (via Director). Revised 2026-10-02 (PT).

Jack's v3.5 rules:
- **Casting is a free action** (from v3.4): it skips that turn's question and can't fizzle.
- **There are no cast caps.** MP is the only limit, and managing it is the kid's job.

Also folded in: the Magic Ward is removed, spell power is fixed, Super Blizzard's Freeze lasts 1 turn and doesn't affect bosses, and cast animations are 2–3 s and skippable.

The short spec version is in `combat-spec.md` §6.7 (Spells) and §7.11 (Quests). Earlier versions of this document are kept in `build/v3/archive_v3_3/spells_v3_3.md` and `build/v3/archive_v3_4/spells.md`.

Files:
- **Data:**
  - `data/spells.csv` / `.json` (16 spells)
  - `data/spell_falloff.csv`, `data/spell_mp_check.csv`, `data/mp_potions.csv`, `data/cast_rule.csv`
  - `data/spells_full.json`
  - `data/quests.csv` / `.json`, `data/quests_full.json`
  - All generated from `build/v3/spells_data.py`.
- **Sim:** `build/spells_sim.py` + `build/spells_runner.py` → `build/v3/sim/v3_spells.txt` and `data/sim/sim_spells_*.csv`.

## 1. Summary

- **No caps, MP only.** Kids can cast on any turn, including back to back, as long as they have the MP. There's no per-battle limit and no "3 correct answers first" unlock.
- **MP costs are raised to 1.25 × v3.4** so questions stay the main thing:
  - A spell costs 41–60% of the bar at the recommended level of its town.
  - A full bar holds **exactly 2 casts of a single-target spell** (1.7–1.8 of a crowd spell; Bubble Spell 2.6).
  - With the v3.4 costs and no caps, boss fights for 75–90% savers dropped to a per-realm question share of 0.83–0.85. At 1.25× no profile, MP style or realm falls below **0.857**.
- **Fixed spell power, unchanged.** Old spells still fade 2–3 realms after their town (§3.1).
- **Question share stays high.** Across the whole game, 90–99% of turns are questions in every profile and MP style (v3.4: 95.5–98.6%). Casts are at most 18% of hero turns in normal fights and 24.5% in boss fights (v3.4: at most 9.6%).
- **Saving MP for bosses works but pays off only a little:**
  - Savers reach bosses with 97% MP against 92% for free spenders (90% kids: 93% vs 82%) and cast about 0.1–0.2 more spells per boss.
  - If the boss gate is far from the inn, savers lose less HP (23% vs 27% per boss).
  - Win rates and boss length barely differ, because +1 MP per correct answer and HP-driven inn visits refill MP anyway.
  - Free spenders instead shorten normal fights by about 1.7 questions.
  - Options for a bigger payoff are in §8.
- **Bosses aren't trivialized:**
  - Full MP plus tea gives about 2 casts per boss.
  - Boss fights go from 22.3 to 19.7–19.9 questions at 75%. Realms 3–4 are the shortest, at about 17.5.
  - Tea adds almost nothing. MP potions stay map-only.
- **Learning is unaffected.** Playthrough hours are within ±0.4 h of the no-spell game, and the share of words proficient at realm end is unchanged.
- **MP hints:**
  - Inn and boss-gate tip: "Save your MP for the boss! 留着魔力打大怪！".
  - The boss gate shows how many casts are ready.
  - The Preview page shows the boss.
- **Prices, tea prices and quests are unchanged.**

## 2. Rules

| rule | v3.5 |
|---|---|
| Shop | A magic shop 魔法店 in every town. Towns 2–9 sell 2 spells each. Town 1 sells Mana Tea only. Price = price_G × G(town), 45–130 × G (unchanged). |
| Ownership | Permanent. Spellbook 魔法书 tab inside ✨ 技能 Skills. No skill slot; the battle keeps its 4 commands. |
| Cast | **Free action:** uses the hero turn, **no question, no fizzle**. MP is always spent. That turn gives no MP regen and leaves the streak unchanged. The enemies' block questions that round are asked as usual. |
| Cast limit | **None except MP** (v3.5). No per-battle cap, no unlock, back-to-back allowed. |
| Damage | `max(1, round(P × (Tired ? 1.5 : 1) − DEF_e))`. P is fixed (no magic stat; decided v3.5). **Full** enemy DEF is subtracted. No streak, spoken or gear bonus. |
| Design rule | `P = round(F × HP_normal(t) + DEF(t))`; `MP = round(K × MP_pool(t))`, with `MP_pool = 10 + 2 × L_rec(t)` and K = 1.25 × the v3.4 K (0.41–0.60). |
| Targets | single / same type (every enemy of the tapped enemy's kind; a boss is its own kind) / all on screen; always max 3. |
| Statuses | Soaked (next attack ×0.5); Dazed / Chilled (chance to skip the next attack; bosses half). **Frozen (Super Blizzard):** non-boss targets skip their next attack (1 turn); **bosses immune** (v3.5). |
| MP potions | Mana Tea 6 × G (+50% MP); Big Mana Tea 15 × G (full MP, town 5+). **Map only** (confirmed v3.5). |
| Magic Ward | **Removed** (v3.5). |
| Animation | About 2–3 s per cast; a tap skips it (sim: 2.5 s). |
| MP hints | Inn and boss-gate tip "Save your MP for the boss!"; the boss gate shows "casts ready"; the Preview page shows the boss's portrait and name. |
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

| town | spell (简 / 繁 / English) | price (G → gold) | power P | MP (v3.4 → v3.5) | casts from full MP | dmg vs normal enemy, own tier → t9 | target | element | status |
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

Painterly, kid-safe, no gore and no burning or injured bodies. Hits are puffs, sparkles and comic reactions. Keep flashes under the flash-safety limit (no more than 3 per second, no full-screen red). New in v3.5:
- **MP strip in the Spellbook:** each spell shows how many casts the current MP allows ("×2"); the boss gate shows the same for the strongest spell.
- **Cast animations:** about 2–3 s each, and a tap skips them (v3.5).

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
  - A kid who saves MP and also drinks tea at the boss gate reaches the boss at 98–99% MP, but gains only about 0.1 casts and no questions over saving alone.
  - In-battle potions would allow drink-cast-drink chains, which turn potion turns into question-free damage.
- **Cost of the tea habit:** 2,500–4,300 gold per run for a saver kid, about 1,400 at 50% accuracy, and up to 6,900 for a 90% kid who spends freely and refills with tea.

## 5. Cast limit, Ward, streak, and skills

**No cast caps (Jack, v3.5).**
- The cap is replaced by price: MP costs 1.25 × v3.4.
- Sensitivity (75% / 90% saver): with the v3.4 costs and no caps, boss fights fall to 18.8–19.1 / 15.8–16.2 questions, and the per-realm boss question share drops to 0.83–0.85 (flagged). At 1.25×: 19.7–19.9 / 16.3–16.6 questions, with a minimum share of 0.857.

**Magic Ward: removed (Jack, v3.5).**

**No streak bonus for spells:** kept. A cast has no answer, so it neither adds to nor breaks the streak.

**Freeze (v3.5):** Super Blizzard freezes non-boss targets for 1 turn, and bosses are immune. Freeze also skips the kid's block question for that enemy, so keeping it off bosses avoids long question-free stretches in boss fights.

| existing | interaction |
|---|---|
| Attack | Still most turns (≥ 75% of hero turns in every profile and battle type). |
| Insight 提示 | Unchanged (MC questions only). |
| Guardian Shield 守护盾 (8 MP, auto) | Unchanged. The kid model keeps 8 MP for it until it has fired. |
| Heal 治疗 (12 MP) | Unchanged. The kid model keeps 12 MP for Heal when HP is under 50%, so savers and spenders lose the same HP. |
| Frost 冰冻 / Sweep 横扫 | Attack modifiers that ask a question; they can't be combined with a spell on the same turn. |
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
| 小火球术 Small Fireball | 2 | 720 | 60 | 324 | 33 | 31 | 76 |
| 泡泡术 Bubble Spell | 2 | 540 | 45 | 324 | 18 | 23 | 57 |
| 雪球术 Snowball Volley | 3 | 1080 | 60 | 504 | 32 | 25 | 71 |
| 小闪电术 Little Lightning | 3 | 1350 | 75 | 504 | 47 | 31 | 88 |
| 火球术 Fireball | 4 | 1890 | 70 | 756 | 42 | 24 | 74 |
| 旋风术 Whirlwind | 4 | 2295 | 85 | 756 | 57 | 29 | 90 |
| 雪花术 Snowflake Dance | 5 | 3240 | 90 | 1026 | 62 | 30 | 96 |
| 闪电术 Lightning Bolt | 5 | 2700 | 75 | 1026 | 46 | 25 | 80 |
| 阳光术 Sunbeam | 6 | 3600 | 80 | 1296 | 51 | 23 | 84 |
| 大火球术 Big Fireball | 6 | 4050 | 90 | 1296 | 61 | 26 | 95 |
| 暴风雪术 Blizzard | 7 | 5400 | 100 | 1566 | 71 | 29 | 111 |
| 龙卷风术 Tornado | 7 | 4590 | 85 | 1566 | 56 | 25 | 94 |
| 流星术 Meteor | 8 | 5670 | 90 | 1836 | 61 | 26 | 95 |
| 雷雨术 Thunderstorm | 8 | 6930 | 110 | 1836 | 81 | 32 | 116 |
| 超暴风雪术 Super Blizzard | 9 | 9360 | 130 | 2106 | 101 | 38 | 136 |
| 流星雨术 Meteor Shower | 9 | 8640 | 120 | 2106 | 91 | 35 | 125 |

(Kills = price ÷ G. Fights and minutes use the 75% saver's gold and minutes per fight in that realm.)


## 7. Sim results (v3.5)

**Model:**
- Same campaign sim: realms 1–9 in a row, 150 runs per row, gear tiers, skills, inns, the Blacksmith-first nudge, and the saver/spender gold profiles.
- New in v3.5: no cast caps, MP costs 1.25×, Freeze 1 turn with bosses immune, 2.5 s per cast, and four MP styles.

**MP styles:**
- **free:** casts in every fight whenever a spell beats an attack.
- **save:** in normal fights, keeps MP for 2 casts of its strongest spell; casts freely in elite and boss fights.
- **save+tea:** like save, plus it keeps a Mana Tea in stock (Big Mana Tea from town 5) and drinks it at the boss gate.
- **free+tea:** like free, plus the tea.

**Other rows:**
- "far gate": the kid goes back to the inn before a boss only below 50% HP (default: below 80%).
- "v3.4 MP costs": a sensitivity run with the old costs and no caps.

### 7.1 Key comparison (none / v3.4 / v3.5 free / v3.5 save)

| kid, accuracy | playthrough h (none / v3.4 / free / save) | boss questions (none / v3.4 / free / save) | normal questions (none / v3.4 / free / save) | q share n / e / b: v3.4 → free → save | min by realm n / e / b (free; save) | hero turns cast n / b: v3.4 → free → save | MP at boss start (free / save / save+tea) |
|---|---|---|---|---|---|---|---|
| saver 75% | 17.7 / 17.8 / 17.7 / 17.6 | 22.3 / 21.0 / 19.9 / 19.7 | 16.8 / 15.9 / 15.0 / 16.7 | 0.959 → 0.936 → 0.989 / 0.964 → 0.942 → 0.921 / 0.959 → 0.918 → 0.913 | 0.909 / 0.914 / 0.874; 0.983 / 0.879 / 0.867 | 9.4% → 16.9% → 0.2% / – → 18.6% → 20.0% | 92% / 97% / 99% |
| spender 75% | 12.8 / 12.7 / 12.4 / 12.7 | 22.1 / 21.9 / 21.4 / 21.3 | 17.0 / 16.7 / 16.2 / 16.9 | 0.974 → 0.965 → 0.990 / 0.980 → 0.972 → 0.965 / 0.982 → 0.968 → 0.964 | 0.932 / 0.954 / 0.934; 0.985 / 0.928 / 0.930 | 4.8% → 7.5% → 0.0% / – → 6.2% → 7.5% | 93% / 97% / 98% |
| saver 65% | 20.4 / 20.5 / 20.4 / 20.3 | 25.4 / 24.0 / 22.3 / 22.3 | 18.7 / 17.8 / 16.2 / 18.5 | 0.956 → 0.924 → 0.980 / 0.959 → 0.929 → 0.923 / 0.956 → 0.918 → 0.916 | 0.889 / 0.891 / 0.868; 0.967 / 0.872 / 0.866 | 7.9% → 18.3% → 0.5% / – → 16.4% → 17.0% | 96% / 99% / 99% |
| saver 50% | 27.0 / 27.0 / 27.0 / 27.0 | 27.7 / 27.3 / 26.3 / 26.2 | 21.0 / 20.8 / 20.1 / 20.9 | 0.964 → 0.944 → 0.967 / 0.962 → 0.942 → 0.945 / 0.969 → 0.950 → 0.950 | 0.885 / 0.889 / 0.897; 0.954 / 0.894 / 0.899 | 2.5% → 8.6% → 1.5% / – → 7.2% → 7.5% | 99% / 100% / 100% |
| saver 90% | 14.7 / 14.9 / 14.8 / 14.7 | 17.9 / 17.1 / 16.6 / 16.4 | 14.0 / 13.6 / 13.3 / 13.9 | 0.967 → 0.954 → 0.998 / 0.973 → 0.955 → 0.925 / 0.961 → 0.920 → 0.908 | 0.926 / 0.927 / 0.877; 0.996 / 0.866 / 0.857 | 9.6% → 13.2% → 0.1% / – → 20.2% → 23.4% | 82% / 93% / 98% |
| spender 90% | 11.1 / 11.1 / 10.8 / 11.0 | 18.0 / 17.9 / 17.2 / 17.2 | 14.1 / 14.0 / 13.7 / 14.1 | 0.980 → 0.974 → 0.998 / 0.986 → 0.978 → 0.961 / 0.979 → 0.961 → 0.952 | 0.946 / 0.961 / 0.929; 0.996 / 0.912 / 0.909 | 5.4% → 7.3% → 0.1% / – → 9.8% → 12.2% | 82% / 94% / 98% |

### 7.2 Question share and cast share by profile, v3.5 vs v3.4

| kid | v3.4 q share n / e / b | v3.4 hero turns cast (normal) | v3.5 style | q share n / e / b | min by tier n / e / b | hero turns cast n / e / b | casts per battle n / e / b | flag |
|---|---|---|---|---|---|---|---|---|
| 50% saver | 0.964 / 0.962 / 0.969 | 2.5% | free | 0.944 / 0.942 / 0.950 | 0.885 / 0.889 / 0.897 | 8.6% / 7.2% / 7.2% | 0.59 / 0.66 / 0.71 | - |
| 50% saver | 0.964 / 0.962 / 0.969 | 2.5% | save | 0.967 / 0.945 / 0.950 | 0.954 / 0.894 / 0.899 | 1.5% / 6.6% / 7.5% | 0.10 / 0.60 / 0.75 | - |
| 50% saver | 0.964 / 0.962 / 0.969 | 2.5% | save+tea | 0.967 / 0.945 / 0.950 | 0.954 / 0.894 / 0.899 | 1.5% / 6.6% / 7.6% | 0.10 / 0.60 / 0.75 | - |
| 50% spender | 0.990 / 0.993 / 0.996 | 0.0% | free | 0.990 / 0.993 / 0.996 | 0.988 / 0.985 / 0.988 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | - |
| 50% spender | 0.990 / 0.993 / 0.996 | 0.0% | save | 0.990 / 0.993 / 0.996 | 0.988 / 0.985 / 0.988 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | - |
| 50% spender | 0.990 / 0.993 / 0.996 | 0.0% | save+tea | 0.990 / 0.993 / 0.996 | 0.988 / 0.985 / 0.988 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | - |
| 65% saver | 0.956 / 0.959 / 0.956 | 7.9% | free | 0.924 / 0.929 / 0.918 | 0.889 / 0.891 / 0.868 | 18.3% / 14.1% / 16.4% | 1.06 / 1.14 / 1.50 | - |
| 65% saver | 0.956 / 0.959 / 0.956 | 7.9% | save | 0.980 / 0.923 / 0.916 | 0.967 / 0.872 / 0.866 | 0.5% / 15.1% / 17.0% | 0.03 / 1.20 / 1.57 | - |
| 65% saver | 0.956 / 0.959 / 0.956 | 7.9% | save+tea | 0.979 / 0.924 / 0.916 | 0.967 / 0.871 / 0.866 | 0.5% / 14.8% / 16.9% | 0.03 / 1.19 / 1.56 | - |
| 65% spender | 0.984 / 0.986 / 0.991 | 1.3% | free | 0.979 / 0.982 / 0.986 | 0.967 / 0.974 / 0.976 | 2.7% / 1.8% / 1.9% | 0.17 / 0.15 / 0.19 | - |
| 65% spender | 0.984 / 0.986 / 0.991 | 1.3% | save | 0.988 / 0.982 / 0.986 | 0.985 / 0.975 / 0.977 | 0.0% / 1.8% / 2.1% | 0.00 / 0.15 / 0.21 | - |
| 65% spender | 0.984 / 0.986 / 0.991 | 1.3% | save+tea | 0.988 / 0.983 / 0.987 | 0.985 / 0.976 / 0.977 | 0.0% / 1.7% / 2.1% | 0.00 / 0.14 / 0.20 | - |
| 75% saver | 0.959 / 0.964 / 0.959 | 9.4% | free | 0.936 / 0.942 / 0.918 | 0.909 / 0.914 / 0.874 | 16.9% / 13.3% / 18.6% | 0.91 / 0.99 / 1.56 | - |
| 75% saver | 0.959 / 0.964 / 0.959 | 9.4% | save | 0.989 / 0.921 / 0.913 | 0.983 / 0.879 / 0.867 | 0.2% / 18.1% / 20.0% | 0.01 / 1.33 / 1.67 | - |
| 75% saver | 0.959 / 0.964 / 0.959 | 9.4% | save+tea | 0.989 / 0.922 / 0.913 | 0.982 / 0.877 / 0.867 | 0.2% / 17.9% / 20.2% | 0.01 / 1.31 / 1.68 | - |
| 75% saver | 0.959 / 0.964 / 0.959 | 9.4% | free+tea | 0.936 / 0.940 / 0.916 | 0.908 / 0.913 / 0.872 | 16.8% / 13.7% / 19.4% | 0.91 / 1.03 / 1.63 | - |
| 75% spender | 0.974 / 0.980 / 0.982 | 4.8% | free | 0.965 / 0.972 / 0.968 | 0.932 / 0.954 / 0.934 | 7.5% / 4.4% / 6.2% | 0.42 / 0.34 / 0.55 | - |
| 75% spender | 0.974 / 0.980 / 0.982 | 4.8% | save | 0.990 / 0.965 / 0.964 | 0.985 / 0.928 / 0.930 | 0.0% / 6.0% / 7.5% | 0.00 / 0.46 / 0.66 | - |
| 75% spender | 0.974 / 0.980 / 0.982 | 4.8% | save+tea | 0.989 / 0.966 / 0.966 | 0.985 / 0.928 / 0.931 | 0.0% / 5.7% / 7.1% | 0.00 / 0.44 / 0.63 | - |
| 75% spender | 0.974 / 0.980 / 0.982 | 4.8% | free+tea | 0.965 / 0.973 / 0.967 | 0.931 / 0.953 / 0.930 | 7.4% / 4.2% / 6.6% | 0.41 / 0.33 / 0.58 | - |
| 90% saver | 0.967 / 0.973 / 0.961 | 9.6% | free | 0.954 / 0.955 / 0.920 | 0.926 / 0.927 / 0.877 | 13.2% / 11.9% / 20.2% | 0.62 / 0.76 / 1.43 | - |
| 90% saver | 0.967 / 0.973 / 0.961 | 9.6% | save | 0.998 / 0.925 / 0.908 | 0.996 / 0.866 / 0.857 | 0.1% / 20.4% / 23.4% | 0.00 / 1.27 / 1.64 | - |
| 90% saver | 0.967 / 0.973 / 0.961 | 9.6% | save+tea | 0.998 / 0.926 / 0.904 | 0.996 / 0.864 / 0.857 | 0.1% / 20.3% / 24.5% | 0.00 / 1.27 / 1.71 | - |
| 90% saver | 0.967 / 0.973 / 0.961 | 9.6% | free+tea | 0.952 / 0.956 / 0.906 | 0.925 / 0.928 / 0.865 | 13.5% / 11.6% / 24.2% | 0.64 / 0.74 / 1.70 | - |
| 90% spender | 0.980 / 0.986 / 0.979 | 5.4% | free | 0.974 / 0.978 / 0.961 | 0.946 / 0.961 / 0.929 | 7.3% / 5.6% / 9.8% | 0.34 / 0.36 / 0.68 | - |
| 90% spender | 0.980 / 0.986 / 0.979 | 5.4% | save | 0.998 / 0.961 / 0.952 | 0.996 / 0.912 / 0.909 | 0.1% / 10.1% / 12.2% | 0.00 / 0.64 / 0.85 | - |
| 90% spender | 0.980 / 0.986 / 0.979 | 5.4% | save+tea | 0.998 / 0.963 / 0.949 | 0.996 / 0.916 / 0.907 | 0.1% / 9.6% / 13.1% | 0.00 / 0.61 / 0.92 | - |
| 90% spender | 0.980 / 0.986 / 0.979 | 5.4% | free+tea | 0.975 / 0.979 / 0.955 | 0.945 / 0.962 / 0.924 | 7.0% / 5.3% / 11.3% | 0.33 / 0.34 / 0.80 | - |

### 7.3 Does saving MP pay off?

| acc | kid | style | boss 1st-try | boss q | boss HP lost | MP at boss start | casts per boss battle | normal q | defeat % | tea gold per run | playthrough h |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 50% | saver | no spells | 0.818 | 27.8 | 73% | 100% | 0.00 | 21.0 | 11.5% | 0 | 27.0 |
| 50% | saver | v3.5 free | 0.813 | 26.2 | 75% | 99% | 0.79 | 20.1 | 10.2% | 0 | 27.0 |
| 50% | saver | v3.5 save | 0.811 | 26.1 | 75% | 100% | 0.83 | 20.9 | 11.7% | 0 | 27.0 |
| 50% | saver | v3.5 save+tea | 0.807 | 26.0 | 75% | 100% | 0.83 | 20.9 | 12.0% | 1439 | 27.0 |
| 50% | spender | no spells | 0.592 | 25.5 | 85% | 99% | 0.00 | 20.8 | 25.7% | 0 | 18.6 |
| 50% | spender | v3.5 free | 0.592 | 25.5 | 85% | 99% | 0.00 | 20.8 | 25.7% | 0 | 18.6 |
| 50% | spender | v3.5 save | 0.592 | 25.5 | 85% | 99% | 0.00 | 20.8 | 25.7% | 0 | 18.6 |
| 50% | spender | v3.5 save+tea | 0.592 | 25.5 | 85% | 99% | 0.00 | 20.8 | 25.7% | 0 | 18.6 |
| 65% | saver | no spells | 0.990 | 25.9 | 43% | 99% | 0.00 | 18.7 | 1.3% | 0 | 20.4 |
| 65% | saver | v3.5 free | 0.994 | 22.2 | 41% | 96% | 1.76 | 16.2 | 0.3% | 0 | 20.4 |
| 65% | saver | v3.5 save | 0.985 | 22.3 | 43% | 99% | 1.84 | 18.5 | 1.2% | 0 | 20.3 |
| 65% | saver | v3.5 save+tea | 0.988 | 22.4 | 43% | 99% | 1.83 | 18.5 | 1.2% | 2540 | 20.3 |
| 65% | spender | no spells | 0.891 | 25.1 | 53% | 98% | 0.00 | 18.8 | 4.7% | 0 | 14.2 |
| 65% | spender | v3.5 free | 0.903 | 24.8 | 52% | 98% | 0.22 | 18.4 | 4.1% | 0 | 14.0 |
| 65% | spender | v3.5 save | 0.894 | 24.6 | 53% | 98% | 0.24 | 18.8 | 4.7% | 0 | 14.2 |
| 65% | spender | v3.5 save+tea | 0.895 | 24.6 | 53% | 98% | 0.23 | 18.8 | 4.7% | 828 | 14.2 |
| 75% | saver | no spells | 1.000 | 22.7 | 31% | 97% | 0.00 | 16.8 | 0.1% | 0 | 17.7 |
| 75% | saver | v3.5 free | 1.000 | 19.9 | 30% | 92% | 1.83 | 15.0 | 0.0% | 0 | 17.7 |
| 75% | saver | v3.5 save | 1.000 | 19.6 | 31% | 97% | 1.96 | 16.7 | 0.0% | 0 | 17.6 |
| 75% | saver | v3.5 save+tea | 1.000 | 19.7 | 31% | 99% | 1.98 | 16.7 | 0.0% | 2927 | 17.6 |
| 75% | spender | no spells | 0.989 | 22.4 | 32% | 96% | 0.00 | 17.0 | 0.4% | 0 | 12.8 |
| 75% | spender | v3.5 free | 0.996 | 21.6 | 32% | 93% | 0.65 | 16.2 | 0.1% | 0 | 12.4 |
| 75% | spender | v3.5 save | 0.995 | 21.5 | 33% | 97% | 0.78 | 16.9 | 0.3% | 0 | 12.7 |
| 75% | spender | v3.5 save+tea | 0.994 | 21.6 | 33% | 98% | 0.74 | 17.0 | 0.3% | 2762 | 12.7 |
| 90% | saver | no spells | 1.000 | 18.1 | 13% | 90% | 0.00 | 14.0 | 0.0% | 0 | 14.7 |
| 90% | saver | v3.5 free | 1.000 | 16.6 | 13% | 82% | 1.68 | 13.3 | 0.0% | 0 | 14.8 |
| 90% | saver | v3.5 save | 1.000 | 16.3 | 13% | 93% | 1.93 | 13.9 | 0.0% | 0 | 14.7 |
| 90% | saver | v3.5 save+tea | 1.000 | 16.3 | 13% | 98% | 2.01 | 13.9 | 0.0% | 4262 | 14.7 |
| 90% | spender | no spells | 1.000 | 18.2 | 13% | 90% | 0.00 | 14.1 | 0.0% | 0 | 11.1 |
| 90% | spender | v3.5 free | 1.000 | 17.2 | 13% | 82% | 0.80 | 13.7 | 0.0% | 0 | 10.8 |
| 90% | spender | v3.5 save | 1.000 | 17.3 | 13% | 94% | 1.00 | 14.1 | 0.0% | 0 | 11.0 |
| 90% | spender | v3.5 save+tea | 1.000 | 17.3 | 13% | 98% | 1.08 | 14.1 | 0.0% | 4137 | 11.0 |
| 75% | saver | v3.5 free+tea | 1.000 | 19.9 | 31% | 97% | 1.92 | 15.1 | 0.0% | 4226 | 17.7 |
| 75% | spender | v3.5 free+tea | 0.996 | 21.7 | 32% | 99% | 0.69 | 16.3 | 0.2% | 4125 | 12.4 |
| 90% | saver | v3.5 free+tea | 1.000 | 16.5 | 14% | 96% | 2.01 | 13.3 | 0.0% | 6929 | 14.8 |
| 90% | spender | v3.5 free+tea | 1.000 | 17.6 | 13% | 98% | 0.95 | 13.8 | 0.0% | 6303 | 10.9 |
| 75% | saver | v3.5 free, v3.4 MP costs | 1.000 | 18.9 | 31% | 91% | 2.26 | 14.6 | 0.0% | 0 | 17.7 |
| 75% | saver | v3.5 save, v3.4 MP costs | 1.000 | 18.6 | 30% | 97% | 2.45 | 16.5 | 0.1% | 0 | 17.6 |
| 90% | saver | v3.5 free, v3.4 MP costs | 1.000 | 16.1 | 14% | 79% | 2.08 | 13.1 | 0.0% | 0 | 14.8 |
| 90% | saver | v3.5 save, v3.4 MP costs | 1.000 | 15.7 | 13% | 92% | 2.37 | 13.8 | 0.0% | 0 | 14.7 |
| 75% | saver | no spells, far gate | 0.990 | 23.0 | 21% | 86% | 0.00 | 16.8 | 0.1% | 0 | 17.7 |
| 75% | saver | v3.5 free, far gate | 1.000 | 20.3 | 27% | 84% | 1.67 | 15.0 | 0.0% | 0 | 17.7 |
| 75% | saver | v3.5 save, far gate | 0.993 | 20.2 | 23% | 91% | 1.78 | 16.6 | 0.1% | 0 | 17.7 |
| 75% | saver | v3.5 save+tea, far gate | 0.995 | 19.9 | 22% | 97% | 1.89 | 16.7 | 0.1% | 2858 | 17.6 |
| 50% | saver | no spells, far gate | 0.708 | 26.6 | 71% | 96% | 0.00 | 21.0 | 12.5% | 0 | 27.1 |
| 50% | saver | v3.5 free, far gate | 0.741 | 25.6 | 73% | 97% | 0.72 | 20.0 | 10.8% | 0 | 27.2 |
| 50% | saver | v3.5 save, far gate | 0.719 | 25.1 | 73% | 96% | 0.74 | 20.9 | 12.7% | 0 | 27.2 |
| 50% | saver | v3.5 save+tea, far gate | 0.725 | 25.3 | 73% | 98% | 0.79 | 20.9 | 12.7% | 1457 | 27.2 |

How to read it:
- **Saving gives:**
  - higher MP at the boss (97% vs 92% at 75%; 93% vs 82% at 90%);
  - about 0.1–0.2 more casts per boss;
  - 0.2–0.3 fewer boss questions;
  - with a far gate, less HP lost (23% vs 27%).
- **Saving doesn't change** first-try wins (≈1.00 at 75%+, about 0.81 at 50%).
- **Why the payoff is small:** a normal battle refills about 12 MP from correct answers, and kids visit the inn whenever HP is low, which also refills MP.
- **Free spenders aren't punished either.** They use their quest teas and kill normal enemies faster (fewer defeats at 50–65%).

### 7.4 Whole campaign

| acc | speech | kid | mode | playthrough h | spells owned | defeat % | boss 1st-try | boss q | normal q | question share normal / elite / boss | hero turns cast normal / elite / boss | casts per battle normal / elite / boss | heals/b | full-gear share | free inns | gold=0 | MP at battle start | MP at boss start | boss HP lost | casts per boss battle | Mana Tea bought / drunk per run | tea gold per run | proficient at realm end |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 50% | on | saver | no spells | 27.0 | 0.0 | 11.5% | 0.85 | 27.7 | 21.0 | 0.972 / 0.968 / 0.976 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 0.41 | 0.95 | 0.0 | 0.00 | 92% | 100% | 73% | 0.00 | 0.0 / 0.0 | 0 | 23% |
| 50% | on | saver | v3.5 free | 27.0 | 0.8 | 10.2% | 0.84 | 26.3 | 20.1 | 0.944 / 0.942 / 0.950 | 8.6% / 7.2% / 7.2% | 0.59 / 0.66 / 0.71 | 0.32 | 0.95 | 0.0 | 0.00 | 89% | 99% | 75% | 0.71 | 0.0 / 1.5 | 0 | 23% |
| 50% | on | saver | v3.5 save | 27.0 | 0.8 | 11.7% | 0.84 | 26.2 | 20.9 | 0.967 / 0.945 / 0.950 | 1.5% / 6.6% / 7.5% | 0.10 / 0.60 / 0.75 | 0.39 | 0.94 | 0.0 | 0.00 | 91% | 100% | 75% | 0.75 | 0.0 / 1.1 | 0 | 23% |
| 50% | on | saver | v3.5 save+tea | 27.0 | 0.8 | 12.0% | 0.84 | 26.1 | 20.9 | 0.967 / 0.945 / 0.950 | 1.5% / 6.6% / 7.6% | 0.10 / 0.60 / 0.75 | 0.39 | 0.93 | 0.0 | 0.00 | 91% | 100% | 75% | 0.75 | 1.9 / 2.0 | 1439 | 23% |
| 50% | on | spender | no spells | 18.6 | 0.0 | 25.7% | 0.65 | 25.6 | 20.8 | 0.990 / 0.993 / 0.996 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 0.58 | 0.91 | 1.8 | 0.00 | 95% | 99% | 85% | 0.00 | 0.0 / 0.0 | 0 | 11% |
| 50% | on | spender | v3.5 free | 18.6 | 0.0 | 25.7% | 0.65 | 25.6 | 20.8 | 0.990 / 0.993 / 0.996 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 0.58 | 0.91 | 1.8 | 0.00 | 95% | 99% | 85% | 0.00 | 0.0 / 0.0 | 0 | 11% |
| 50% | on | spender | v3.5 save | 18.6 | 0.0 | 25.7% | 0.65 | 25.6 | 20.8 | 0.990 / 0.993 / 0.996 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 0.58 | 0.91 | 1.8 | 0.00 | 95% | 99% | 85% | 0.00 | 0.0 / 0.0 | 0 | 11% |
| 50% | on | spender | v3.5 save+tea | 18.6 | 0.0 | 25.7% | 0.65 | 25.6 | 20.8 | 0.990 / 0.993 / 0.996 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 0.58 | 0.91 | 1.8 | 0.00 | 95% | 99% | 85% | 0.00 | 0.0 / 0.0 | 0 | 11% |
| 65% | on | saver | no spells | 20.4 | 0.0 | 1.3% | 0.99 | 25.4 | 18.7 | 0.980 / 0.977 / 0.982 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 0.21 | 0.96 | 0.0 | 0.00 | 87% | 99% | 43% | 0.00 | 0.0 / 0.0 | 0 | 23% |
| 65% | on | saver | v3.5 free | 20.4 | 4.8 | 0.3% | 0.99 | 22.3 | 16.2 | 0.924 / 0.929 / 0.918 | 18.3% / 14.1% / 16.4% | 1.06 / 1.14 / 1.50 | 0.04 | 0.97 | 0.0 | 0.00 | 76% | 96% | 41% | 1.50 | 0.0 / 5.1 | 0 | 23% |
| 65% | on | saver | v3.5 save | 20.3 | 4.1 | 1.2% | 0.99 | 22.3 | 18.5 | 0.980 / 0.923 / 0.916 | 0.5% / 15.1% / 17.0% | 0.03 / 1.20 / 1.57 | 0.17 | 0.96 | 0.0 | 0.00 | 86% | 99% | 43% | 1.57 | 0.0 / 1.9 | 0 | 23% |
| 65% | on | saver | v3.5 save+tea | 20.3 | 3.9 | 1.2% | 0.99 | 22.4 | 18.5 | 0.979 / 0.924 / 0.916 | 0.5% / 14.8% / 16.9% | 0.03 / 1.19 / 1.56 | 0.18 | 0.96 | 0.0 | 0.00 | 86% | 99% | 43% | 1.56 | 3.2 / 3.8 | 2540 | 23% |
| 65% | on | spender | no spells | 14.2 | 0.0 | 4.7% | 0.91 | 24.7 | 18.8 | 0.988 / 0.989 / 0.995 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 0.28 | 0.96 | 0.1 | 0.00 | 89% | 98% | 53% | 0.00 | 0.0 / 0.0 | 0 | 11% |
| 65% | on | spender | v3.5 free | 14.0 | 0.6 | 4.1% | 0.92 | 24.4 | 18.4 | 0.979 / 0.982 / 0.986 | 2.7% / 1.8% / 1.9% | 0.17 / 0.15 / 0.19 | 0.25 | 0.96 | 0.2 | 0.00 | 88% | 98% | 52% | 0.19 | 0.0 / 0.5 | 0 | 11% |
| 65% | on | spender | v3.5 save | 14.2 | 0.6 | 4.7% | 0.91 | 24.3 | 18.8 | 0.988 / 0.982 / 0.986 | 0.0% / 1.8% / 2.1% | 0.00 / 0.15 / 0.21 | 0.27 | 0.96 | 0.1 | 0.00 | 89% | 98% | 53% | 0.21 | 0.0 / 0.4 | 0 | 11% |
| 65% | on | spender | v3.5 save+tea | 14.2 | 0.5 | 4.7% | 0.91 | 24.3 | 18.8 | 0.988 / 0.983 / 0.987 | 0.0% / 1.7% / 2.1% | 0.00 / 0.14 / 0.20 | 0.27 | 0.95 | 0.2 | 0.00 | 89% | 98% | 53% | 0.20 | 1.0 / 0.8 | 828 | 11% |
| 75% | on | saver | no spells | 17.7 | 0.0 | 0.1% | 1.00 | 22.3 | 16.8 | 0.989 / 0.986 / 0.992 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 0.11 | 0.96 | 0.0 | 0.00 | 86% | 97% | 31% | 0.00 | 0.0 / 0.0 | 0 | 23% |
| 75% | on | saver | v3.5 free | 17.7 | 5.9 | 0.0% | 1.00 | 19.9 | 15.0 | 0.936 / 0.942 / 0.918 | 16.9% / 13.3% / 18.6% | 0.91 / 0.99 / 1.56 | 0.02 | 0.97 | 0.0 | 0.00 | 64% | 92% | 30% | 1.56 | 0.0 / 7.0 | 0 | 23% |
| 75% | on | saver | v3.5 save | 17.6 | 5.7 | 0.0% | 1.00 | 19.7 | 16.7 | 0.989 / 0.921 / 0.913 | 0.2% / 18.1% / 20.0% | 0.01 / 1.33 / 1.67 | 0.08 | 0.96 | 0.0 | 0.00 | 83% | 97% | 31% | 1.67 | 0.0 / 2.5 | 0 | 23% |
| 75% | on | saver | v3.5 save+tea | 17.6 | 5.2 | 0.0% | 1.00 | 19.8 | 16.7 | 0.989 / 0.922 / 0.913 | 0.2% / 17.9% / 20.2% | 0.01 / 1.31 / 1.68 | 0.08 | 0.96 | 0.0 | 0.00 | 83% | 99% | 31% | 1.68 | 3.6 / 4.2 | 2927 | 23% |
| 75% | on | spender | no spells | 12.8 | 0.0 | 0.4% | 0.99 | 22.1 | 17.0 | 0.989 / 0.988 / 0.995 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 0.12 | 0.96 | 0.0 | 0.00 | 86% | 96% | 32% | 0.00 | 0.0 / 0.0 | 0 | 12% |
| 75% | on | spender | v3.5 free | 12.4 | 2.0 | 0.1% | 1.00 | 21.4 | 16.2 | 0.965 / 0.972 / 0.968 | 7.5% / 4.4% / 6.2% | 0.42 / 0.34 / 0.55 | 0.07 | 0.96 | 0.3 | 0.00 | 78% | 93% | 32% | 0.55 | 0.0 / 2.3 | 0 | 11% |
| 75% | on | spender | v3.5 save | 12.7 | 2.1 | 0.3% | 1.00 | 21.3 | 16.9 | 0.990 / 0.965 / 0.964 | 0.0% / 6.0% / 7.5% | 0.00 / 0.46 / 0.66 | 0.11 | 0.96 | 0.1 | 0.00 | 85% | 97% | 33% | 0.66 | 0.0 / 1.9 | 0 | 12% |
| 75% | on | spender | v3.5 save+tea | 12.7 | 1.8 | 0.3% | 0.99 | 21.4 | 17.0 | 0.989 / 0.966 / 0.966 | 0.0% / 5.7% / 7.1% | 0.00 / 0.44 / 0.63 | 0.11 | 0.96 | 0.3 | 0.00 | 85% | 98% | 33% | 0.63 | 3.4 / 3.4 | 2762 | 12% |
| 90% | on | saver | no spells | 14.7 | 0.0 | 0.0% | 1.00 | 17.9 | 14.0 | 0.998 / 0.998 / 0.999 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 0.02 | 0.96 | 0.0 | 0.00 | 80% | 90% | 13% | 0.00 | 0.0 / 0.0 | 0 | 23% |
| 90% | on | saver | v3.5 free | 14.8 | 7.0 | 0.0% | 1.00 | 16.6 | 13.3 | 0.954 / 0.955 / 0.920 | 13.2% / 11.9% / 20.2% | 0.62 / 0.76 / 1.43 | 0.00 | 0.96 | 0.0 | 0.00 | 48% | 82% | 13% | 1.43 | 0.0 / 8.6 | 0 | 23% |
| 90% | on | saver | v3.5 save | 14.7 | 6.9 | 0.0% | 1.00 | 16.4 | 13.9 | 0.998 / 0.925 / 0.908 | 0.1% / 20.4% / 23.4% | 0.00 / 1.27 / 1.64 | 0.01 | 0.96 | 0.0 | 0.00 | 74% | 93% | 13% | 1.64 | 0.0 / 4.0 | 0 | 23% |
| 90% | on | saver | v3.5 save+tea | 14.7 | 6.2 | 0.0% | 1.00 | 16.3 | 13.9 | 0.998 / 0.926 / 0.904 | 0.1% / 20.3% / 24.5% | 0.00 / 1.27 / 1.71 | 0.01 | 0.96 | 0.0 | 0.00 | 75% | 98% | 13% | 1.71 | 5.1 / 5.7 | 4262 | 23% |
| 90% | on | spender | no spells | 11.1 | 0.0 | 0.0% | 1.00 | 18.0 | 14.1 | 0.998 / 0.998 / 0.999 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 0.02 | 0.96 | 0.0 | 0.00 | 81% | 90% | 13% | 0.00 | 0.0 / 0.0 | 0 | 13% |
| 90% | on | spender | v3.5 free | 10.8 | 3.1 | 0.0% | 1.00 | 17.2 | 13.7 | 0.974 / 0.978 / 0.961 | 7.3% / 5.6% / 9.8% | 0.34 / 0.36 / 0.68 | 0.01 | 0.96 | 0.1 | 0.00 | 63% | 82% | 13% | 0.68 | 0.0 / 3.3 | 0 | 12% |
| 90% | on | spender | v3.5 save | 11.0 | 3.1 | 0.0% | 1.00 | 17.2 | 14.1 | 0.998 / 0.961 / 0.952 | 0.1% / 10.1% / 12.2% | 0.00 / 0.64 / 0.85 | 0.02 | 0.96 | 0.1 | 0.00 | 78% | 94% | 13% | 0.85 | 0.0 / 2.9 | 0 | 13% |
| 90% | on | spender | v3.5 save+tea | 11.0 | 2.4 | 0.0% | 1.00 | 17.3 | 14.1 | 0.998 / 0.963 / 0.949 | 0.1% / 9.6% / 13.1% | 0.00 / 0.61 / 0.92 | 0.02 | 0.96 | 0.1 | 0.00 | 78% | 98% | 13% | 0.92 | 4.9 / 5.0 | 4137 | 13% |
| 75% | on | saver | v3.5 free+tea | 17.7 | 5.0 | 0.0% | 1.00 | 19.9 | 15.1 | 0.936 / 0.940 / 0.916 | 16.8% / 13.7% / 19.4% | 0.91 / 1.03 / 1.63 | 0.02 | 0.97 | 0.0 | 0.00 | 65% | 97% | 31% | 1.63 | 6.3 / 8.0 | 4226 | 23% |
| 75% | on | spender | v3.5 free+tea | 12.4 | 1.2 | 0.2% | 1.00 | 21.5 | 16.3 | 0.965 / 0.973 / 0.967 | 7.4% / 4.2% / 6.6% | 0.41 / 0.33 / 0.58 | 0.08 | 0.95 | 0.3 | 0.00 | 78% | 99% | 32% | 0.58 | 5.6 / 5.2 | 4125 | 11% |
| 90% | on | saver | v3.5 free+tea | 14.8 | 5.8 | 0.0% | 1.00 | 16.6 | 13.3 | 0.952 / 0.956 / 0.906 | 13.5% / 11.6% / 24.2% | 0.64 / 0.74 / 1.70 | 0.00 | 0.96 | 0.0 | 0.00 | 49% | 96% | 14% | 1.70 | 10.4 / 12.6 | 6929 | 23% |
| 90% | on | spender | v3.5 free+tea | 10.9 | 1.8 | 0.0% | 1.00 | 17.5 | 13.8 | 0.975 / 0.979 / 0.955 | 7.0% / 5.3% / 11.3% | 0.33 / 0.34 / 0.80 | 0.01 | 0.96 | 0.1 | 0.00 | 66% | 98% | 13% | 0.80 | 8.4 / 9.0 | 6303 | 12% |
| 75% | on | saver | v3.5 free, v3.4 MP costs | 17.7 | 6.1 | 0.0% | 1.00 | 19.1 | 14.6 | 0.919 / 0.924 / 0.900 | 21.9% / 18.3% / 23.5% | 1.16 / 1.35 / 1.92 | 0.02 | 0.97 | 0.0 | 0.00 | 64% | 91% | 31% | 1.92 | 0.0 / 7.1 | 0 | 23% |
| 75% | on | saver | v3.5 save, v3.4 MP costs | 17.6 | 5.8 | 0.1% | 1.00 | 18.8 | 16.5 | 0.982 / 0.906 / 0.893 | 2.3% / 22.5% / 25.6% | 0.13 / 1.62 / 2.08 | 0.08 | 0.96 | 0.0 | 0.00 | 80% | 97% | 30% | 2.08 | 0.0 / 2.4 | 0 | 23% |
| 90% | on | saver | v3.5 free, v3.4 MP costs | 14.8 | 7.1 | 0.0% | 1.00 | 16.2 | 13.1 | 0.941 / 0.947 / 0.900 | 16.7% / 14.0% / 25.2% | 0.79 / 0.89 / 1.77 | 0.00 | 0.97 | 0.0 | 0.00 | 47% | 79% | 14% | 1.77 | 0.0 / 8.7 | 0 | 23% |
| 90% | on | saver | v3.5 save, v3.4 MP costs | 14.7 | 6.9 | 0.0% | 1.00 | 15.8 | 13.8 | 0.992 / 0.908 / 0.886 | 1.9% / 25.4% / 28.9% | 0.09 / 1.57 / 2.02 | 0.01 | 0.96 | 0.0 | 0.00 | 72% | 92% | 13% | 2.02 | 0.0 / 3.9 | 0 | 23% |
| 75% | on | saver | no spells, far gate | 17.7 | 0.0 | 0.1% | 0.99 | 22.6 | 16.8 | 0.989 / 0.987 / 0.982 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 0.11 | 0.96 | 0.0 | 0.00 | 85% | 86% | 21% | 0.00 | 0.0 / 0.0 | 0 | 23% |
| 75% | on | saver | v3.5 free, far gate | 17.7 | 6.0 | 0.0% | 1.00 | 20.3 | 15.0 | 0.935 / 0.942 / 0.922 | 17.1% / 13.3% / 16.7% | 0.92 / 1.00 / 1.42 | 0.02 | 0.97 | 0.0 | 0.00 | 64% | 84% | 27% | 1.42 | 0.0 / 6.6 | 0 | 23% |
| 75% | on | saver | v3.5 save, far gate | 17.7 | 5.9 | 0.1% | 0.99 | 20.3 | 16.6 | 0.989 / 0.921 / 0.913 | 0.2% / 18.0% / 18.0% | 0.01 / 1.32 / 1.51 | 0.09 | 0.96 | 0.0 | 0.00 | 83% | 91% | 23% | 1.51 | 0.0 / 2.4 | 0 | 23% |
| 75% | on | saver | v3.5 save+tea, far gate | 17.6 | 5.4 | 0.1% | 1.00 | 20.0 | 16.7 | 0.989 / 0.922 / 0.909 | 0.2% / 17.7% / 19.4% | 0.01 / 1.31 / 1.60 | 0.09 | 0.96 | 0.0 | 0.00 | 84% | 97% | 22% | 1.60 | 3.5 / 4.1 | 2858 | 23% |
| 50% | on | saver | no spells, far gate | 27.1 | 0.0 | 12.5% | 0.75 | 26.6 | 21.0 | 0.973 / 0.969 / 0.977 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 0.41 | 0.95 | 0.0 | 0.00 | 91% | 96% | 71% | 0.00 | 0.0 / 0.0 | 0 | 23% |
| 50% | on | saver | v3.5 free, far gate | 27.2 | 0.8 | 10.8% | 0.78 | 25.7 | 20.0 | 0.944 / 0.942 / 0.952 | 8.7% / 7.4% / 6.8% | 0.60 / 0.68 / 0.66 | 0.32 | 0.95 | 0.0 | 0.00 | 89% | 97% | 73% | 0.66 | 0.0 / 1.6 | 0 | 23% |
| 50% | on | saver | v3.5 save, far gate | 27.2 | 0.8 | 12.7% | 0.76 | 25.3 | 20.9 | 0.967 / 0.943 / 0.952 | 1.5% / 7.0% / 7.2% | 0.10 / 0.64 / 0.68 | 0.39 | 0.94 | 0.0 | 0.00 | 90% | 96% | 73% | 0.68 | 0.0 / 1.1 | 0 | 23% |
| 50% | on | saver | v3.5 save+tea, far gate | 27.2 | 0.8 | 12.7% | 0.76 | 25.4 | 20.9 | 0.967 / 0.942 / 0.950 | 1.5% / 7.2% / 7.6% | 0.11 / 0.65 / 0.73 | 0.39 | 0.93 | 0.0 | 0.00 | 91% | 98% | 73% | 0.73 | 1.9 / 2.1 | 1457 | 23% |
| 75% | off | saver | no spells | 11.3 | 0.0 | 0.0% | 1.00 | 20.0 | 15.3 | 0.994 / 0.992 / 0.997 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 0.06 | 0.94 | 0.0 | 0.00 | 85% | 95% | 22% | 0.00 | 0.0 / 0.0 | 0 | 50% |
| 75% | off | saver | v3.5 free | 11.2 | 2.8 | 0.0% | 1.00 | 19.1 | 14.6 | 0.961 / 0.966 / 0.949 | 10.2% / 7.5% / 12.2% | 0.52 / 0.53 / 0.96 | 0.03 | 0.94 | 0.0 | 0.00 | 69% | 92% | 23% | 0.96 | 0.0 / 6.8 | 0 | 50% |
| 75% | off | spender | no spells | 11.1 | 0.0 | 0.0% | 1.00 | 20.0 | 15.3 | 0.994 / 0.992 / 0.997 | 0.0% / 0.0% / 0.0% | 0.00 / 0.00 / 0.00 | 0.06 | 0.95 | 0.0 | 0.00 | 85% | 95% | 22% | 0.00 | 0.0 / 0.0 | 0 | 49% |
| 75% | off | spender | v3.5 free | 11.0 | 2.8 | 0.0% | 1.00 | 19.0 | 14.6 | 0.964 / 0.967 / 0.953 | 9.3% / 7.2% / 11.1% | 0.47 / 0.51 / 0.87 | 0.03 | 0.95 | 0.2 | 0.00 | 70% | 93% | 22% | 0.87 | 0.0 / 6.2 | 0 | 48% |

### 7.5 Per realm, 75% saver

| realm | mode | battles | defeat % | boss 1st-try | boss q | normal q | q share normal / elite / boss | casts/b normal / boss | min/location | MP at battle start | spell castable at start | heals/b | full gear | gold start | min gold | free inns | spell spend | gear spend | proficient at end |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | no spells | 52.7 | 0.0% | 1.00 | 20.4 | 11.7 | 0.999 / 0.996 / 1.000 | 0.00 / 0.00 | 41.2 | 100% | 0% | 0.00 | 0.91 | 24 | 30 | 0.00 | 0 | 35 | 25% |
| 1 | v3.5 free | 52.7 | 0.0% | 1.00 | 20.4 | 11.7 | 0.999 / 0.996 / 1.000 | 0.00 / 0.00 | 41.2 | 100% | 0% | 0.00 | 0.91 | 24 | 30 | 0.00 | 0 | 35 | 25% |
| 1 | v3.5 save | 52.7 | 0.0% | 1.00 | 20.4 | 11.7 | 0.999 / 0.996 / 1.000 | 0.00 / 0.00 | 41.2 | 100% | 0% | 0.00 | 0.91 | 24 | 30 | 0.00 | 0 | 35 | 25% |
| 1 | v3.5 save+tea | 52.7 | 0.0% | 1.00 | 20.4 | 11.7 | 0.999 / 0.996 / 1.000 | 0.00 / 0.00 | 41.2 | 100% | 0% | 0.00 | 0.91 | 24 | 30 | 0.00 | 0 | 35 | 25% |
| 2 | no spells | 38.6 | 0.0% | 1.00 | 21.5 | 12.5 | 0.995 / 0.995 / 0.998 | 0.00 / 0.00 | 48.2 | 88% | 0% | 0.05 | 0.97 | 782 | 518 | 0.00 | 0 | 288 | 23% |
| 2 | v3.5 free | 40.4 | 0.0% | 1.00 | 19.4 | 11.9 | 0.981 / 0.981 / 0.955 | 0.16 / 0.88 | 47.9 | 80% | 17% | 0.04 | 0.98 | 782 | 517 | 0.00 | 752 | 288 | 22% |
| 2 | v3.5 save | 38.9 | 0.0% | 1.00 | 19.3 | 12.4 | 0.995 / 0.973 / 0.952 | 0.00 / 0.94 | 47.9 | 87% | 24% | 0.05 | 0.97 | 782 | 517 | 0.00 | 734 | 288 | 22% |
| 2 | v3.5 save+tea | 38.9 | 0.0% | 1.00 | 19.2 | 12.4 | 0.995 / 0.973 / 0.950 | 0.00 / 0.98 | 47.8 | 87% | 24% | 0.05 | 0.97 | 782 | 517 | 0.00 | 734 | 288 | 22% |
| 3 | no spells | 35.9 | 0.0% | 1.00 | 21.8 | 15.6 | 0.993 / 0.988 / 0.993 | 0.00 / 0.00 | 52.8 | 93% | 0% | 0.10 | 0.97 | 1733 | 1260 | 0.00 | 0 | 528 | 23% |
| 3 | v3.5 free | 41.3 | 0.0% | 1.00 | 17.5 | 13.2 | 0.924 / 0.931 / 0.889 | 1.03 / 2.06 | 52.3 | 58% | 58% | 0.00 | 0.98 | 1001 | 519 | 0.00 | 819 | 528 | 22% |
| 3 | v3.5 save | 37.0 | 0.0% | 1.00 | 17.3 | 15.3 | 0.996 / 0.882 / 0.880 | 0.00 / 2.24 | 52.9 | 89% | 95% | 0.08 | 0.97 | 992 | 520 | 0.00 | 873 | 528 | 22% |
| 3 | v3.5 save+tea | 36.9 | 0.0% | 1.00 | 17.3 | 15.3 | 0.996 / 0.881 / 0.880 | 0.00 / 2.26 | 52.8 | 89% | 95% | 0.09 | 0.97 | 991 | 521 | 0.00 | 810 | 528 | 22% |
| 4 | no spells | 46.3 | 0.1% | 1.00 | 22.0 | 17.0 | 0.985 / 0.987 / 0.993 | 0.00 / 0.00 | 48.9 | 93% | 0% | 0.11 | 0.98 | 3256 | 2462 | 0.00 | 0 | 912 | 24% |
| 4 | v3.5 free | 52.1 | 0.0% | 1.00 | 18.1 | 14.8 | 0.909 / 0.914 / 0.874 | 1.34 / 2.39 | 49.0 | 60% | 64% | 0.01 | 0.98 | 1646 | 838 | 0.00 | 2302 | 912 | 23% |
| 4 | v3.5 save | 46.9 | 0.0% | 1.00 | 17.7 | 16.7 | 0.983 / 0.879 / 0.867 | 0.07 / 2.51 | 48.3 | 88% | 96% | 0.05 | 0.98 | 1604 | 823 | 0.00 | 2340 | 912 | 23% |
| 4 | v3.5 save+tea | 46.7 | 0.0% | 1.00 | 17.7 | 16.7 | 0.982 / 0.877 / 0.867 | 0.07 / 2.51 | 48.3 | 88% | 97% | 0.05 | 0.98 | 1655 | 872 | 0.00 | 2350 | 912 | 23% |
| 5 | no spells | 30.8 | 0.1% | 1.00 | 23.6 | 17.1 | 0.986 / 0.985 / 0.988 | 0.00 / 0.00 | 49.1 | 94% | 0% | 0.13 | 0.97 | 6691 | 5307 | 0.00 | 0 | 1560 | 24% |
| 5 | v3.5 free | 33.1 | 0.0% | 1.00 | 22.4 | 15.6 | 0.912 / 0.928 / 0.890 | 1.36 / 2.36 | 49.4 | 64% | 75% | 0.02 | 0.97 | 2659 | 1230 | 0.00 | 583 | 1560 | 24% |
| 5 | v3.5 save | 30.9 | 0.0% | 1.00 | 21.8 | 17.0 | 0.985 / 0.884 / 0.882 | 0.00 / 2.52 | 49.2 | 90% | 97% | 0.09 | 0.97 | 2667 | 1275 | 0.00 | 972 | 1560 | 24% |
| 5 | v3.5 save+tea | 31.1 | 0.0% | 1.00 | 21.8 | 17.0 | 0.985 / 0.885 / 0.885 | 0.01 / 2.47 | 49.3 | 90% | 97% | 0.09 | 0.97 | 2700 | 809 | 0.00 | 324 | 1560 | 24% |
| 6 | no spells | 31.2 | 0.2% | 1.00 | 22.5 | 19.4 | 0.985 / 0.981 / 0.989 | 0.00 / 0.00 | 56.8 | 96% | 0% | 0.17 | 0.97 | 9460 | 7557 | 0.00 | 0 | 2160 | 22% |
| 6 | v3.5 free | 35.0 | 0.0% | 1.00 | 21.3 | 16.9 | 0.918 / 0.929 / 0.908 | 1.34 / 1.86 | 56.9 | 63% | 82% | 0.03 | 0.97 | 4545 | 2572 | 0.00 | 3402 | 2160 | 22% |
| 6 | v3.5 save | 31.2 | 0.1% | 1.00 | 21.4 | 19.3 | 0.987 / 0.890 / 0.901 | 0.00 / 2.04 | 56.6 | 93% | 99% | 0.13 | 0.97 | 4382 | 2412 | 0.00 | 3024 | 2160 | 22% |
| 6 | v3.5 save+tea | 31.1 | 0.1% | 1.00 | 21.8 | 19.2 | 0.987 / 0.891 / 0.906 | 0.00 / 1.86 | 56.4 | 93% | 99% | 0.13 | 0.97 | 4467 | 2530 | 0.00 | 3564 | 2160 | 22% |
| 7 | no spells | 35.1 | 0.4% | 1.00 | 23.7 | 21.2 | 0.983 / 0.978 / 0.988 | 0.00 / 0.00 | 67.4 | 74% | 0% | 0.22 | 0.97 | 13269 | 10788 | 0.00 | 0 | 2760 | 22% |
| 7 | v3.5 free | 41.7 | 0.0% | 1.00 | 20.5 | 17.7 | 0.923 / 0.928 / 0.899 | 1.29 / 1.99 | 68.1 | 64% | 83% | 0.04 | 0.98 | 4926 | 2401 | 0.00 | 3888 | 2760 | 22% |
| 7 | v3.5 save | 35.9 | 0.3% | 1.00 | 20.2 | 21.0 | 0.984 / 0.917 / 0.894 | 0.00 / 2.11 | 67.6 | 72% | 97% | 0.19 | 0.97 | 5089 | 2572 | 0.00 | 3420 | 2760 | 22% |
| 7 | v3.5 save+tea | 35.6 | 0.2% | 1.00 | 20.5 | 21.0 | 0.984 / 0.917 / 0.890 | 0.00 / 2.22 | 67.2 | 73% | 97% | 0.19 | 0.97 | 4578 | 2080 | 0.00 | 1872 | 2760 | 22% |
| 8 | no spells | 34.3 | 0.1% | 1.00 | 23.6 | 20.4 | 0.987 / 0.985 / 0.986 | 0.00 / 0.00 | 62.9 | 70% | 0% | 0.11 | 0.97 | 17738 | 14713 | 0.00 | 0 | 3360 | 23% |
| 8 | v3.5 free | 40.3 | 0.0% | 1.00 | 20.3 | 17.1 | 0.922 / 0.930 / 0.898 | 1.30 / 1.94 | 63.2 | 65% | 71% | 0.01 | 0.98 | 6197 | 2885 | 0.00 | 3049 | 3360 | 23% |
| 8 | v3.5 save | 34.4 | 0.0% | 1.00 | 19.9 | 20.3 | 0.989 / 0.923 / 0.892 | 0.00 / 2.07 | 62.3 | 70% | 93% | 0.10 | 0.97 | 6345 | 2988 | 0.00 | 2911 | 3360 | 23% |
| 8 | v3.5 save+tea | 34.4 | 0.0% | 1.00 | 20.6 | 20.3 | 0.988 / 0.928 / 0.894 | 0.00 / 2.12 | 62.4 | 70% | 93% | 0.10 | 0.97 | 6740 | 3520 | 0.00 | 3419 | 3360 | 23% |
| 9 | no spells | 32.1 | 0.1% | 1.00 | 23.1 | 20.4 | 0.990 / 0.984 / 0.987 | 0.00 / 0.00 | 58.8 | 73% | 0% | 0.15 | 0.97 | 22655 | 18976 | 0.00 | 0 | 4080 | 23% |
| 9 | v3.5 free | 36.4 | 0.1% | 1.00 | 20.4 | 17.6 | 0.959 / 0.962 / 0.945 | 0.61 / 0.92 | 58.1 | 64% | 86% | 0.03 | 0.97 | 8536 | 722 | 0.00 | 9360 | 4080 | 22% |
| 9 | v3.5 save | 32.5 | 0.0% | 1.00 | 19.8 | 20.1 | 0.991 / 0.954 / 0.942 | 0.00 / 1.01 | 58.2 | 73% | 95% | 0.13 | 0.97 | 8189 | 876 | 0.00 | 8861 | 4080 | 22% |
| 9 | v3.5 save+tea | 32.6 | 0.0% | 1.00 | 19.7 | 20.2 | 0.991 / 0.955 / 0.936 | 0.00 / 1.12 | 58.6 | 73% | 95% | 0.13 | 0.97 | 7238 | 1131 | 0.00 | 6739 | 4080 | 22% |

### 7.6 Per realm, 75% spender

| realm | mode | battles | defeat % | boss 1st-try | boss q | normal q | q share normal / elite / boss | casts/b normal / boss | min/location | MP at battle start | spell castable at start | heals/b | full gear | gold start | min gold | free inns | spell spend | gear spend | proficient at end |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | no spells | 33.0 | 0.0% | 1.00 | 20.5 | 11.7 | 0.998 / 0.996 / 1.000 | 0.00 / 0.00 | 29.4 | 100% | 0% | 0.00 | 0.95 | 24 | 14 | 0.01 | 0 | 35 | 13% |
| 1 | v3.5 free | 33.0 | 0.0% | 1.00 | 20.5 | 11.7 | 0.998 / 0.996 / 1.000 | 0.00 / 0.00 | 29.4 | 100% | 0% | 0.00 | 0.95 | 24 | 14 | 0.01 | 0 | 35 | 13% |
| 1 | v3.5 save | 33.0 | 0.0% | 1.00 | 20.5 | 11.7 | 0.998 / 0.996 / 1.000 | 0.00 / 0.00 | 29.4 | 100% | 0% | 0.00 | 0.95 | 24 | 14 | 0.01 | 0 | 35 | 13% |
| 1 | v3.5 save+tea | 33.0 | 0.0% | 1.00 | 20.5 | 11.7 | 0.998 / 0.996 / 1.000 | 0.00 / 0.00 | 29.4 | 100% | 0% | 0.00 | 0.95 | 24 | 14 | 0.01 | 0 | 35 | 13% |
| 2 | no spells | 22.0 | 0.0% | 1.00 | 21.2 | 12.5 | 0.993 / 0.995 / 0.999 | 0.00 / 0.00 | 32.2 | 87% | 0% | 0.05 | 0.95 | 584 | 317 | 0.00 | 0 | 288 | 9% |
| 2 | v3.5 free | 22.0 | 0.0% | 1.00 | 21.2 | 12.5 | 0.993 / 0.995 / 0.999 | 0.00 / 0.00 | 32.2 | 87% | 0% | 0.05 | 0.95 | 584 | 317 | 0.00 | 10 | 288 | 9% |
| 2 | v3.5 save | 22.0 | 0.0% | 1.00 | 21.2 | 12.5 | 0.993 / 0.995 / 0.999 | 0.00 / 0.00 | 32.2 | 87% | 0% | 0.05 | 0.95 | 584 | 317 | 0.00 | 10 | 288 | 9% |
| 2 | v3.5 save+tea | 22.0 | 0.0% | 1.00 | 21.2 | 12.5 | 0.993 / 0.995 / 0.999 | 0.00 / 0.00 | 32.2 | 87% | 0% | 0.05 | 0.95 | 584 | 317 | 0.00 | 10 | 288 | 9% |
| 3 | no spells | 22.0 | 0.0% | 1.00 | 21.1 | 15.6 | 0.992 / 0.987 / 0.995 | 0.00 / 0.00 | 36.1 | 94% | 0% | 0.10 | 0.95 | 1070 | 601 | 0.00 | 0 | 528 | 10% |
| 3 | v3.5 free | 22.0 | 0.0% | 1.00 | 21.1 | 15.6 | 0.991 / 0.986 / 0.993 | 0.02 / 0.03 | 36.0 | 93% | 1% | 0.10 | 0.95 | 1060 | 592 | 0.00 | 0 | 528 | 10% |
| 3 | v3.5 save | 22.0 | 0.0% | 1.00 | 21.1 | 15.6 | 0.992 / 0.986 / 0.993 | 0.00 / 0.03 | 36.1 | 94% | 1% | 0.10 | 0.95 | 1060 | 592 | 0.00 | 0 | 528 | 10% |
| 3 | v3.5 save+tea | 22.0 | 0.0% | 1.00 | 21.1 | 15.6 | 0.992 / 0.986 / 0.993 | 0.00 / 0.03 | 36.1 | 94% | 1% | 0.10 | 0.95 | 1060 | 592 | 0.00 | 0 | 528 | 10% |
| 4 | no spells | 33.1 | 0.3% | 0.98 | 21.7 | 17.1 | 0.985 / 0.986 / 0.994 | 0.00 / 0.00 | 37.5 | 93% | 0% | 0.14 | 0.97 | 1898 | 1111 | 0.00 | 0 | 912 | 14% |
| 4 | v3.5 free | 33.0 | 0.1% | 1.00 | 20.9 | 16.9 | 0.982 / 0.982 / 0.976 | 0.06 / 0.37 | 37.2 | 92% | 6% | 0.13 | 0.97 | 1883 | 1095 | 0.00 | 2203 | 912 | 13% |
| 4 | v3.5 save | 33.1 | 0.2% | 0.99 | 21.0 | 17.0 | 0.985 / 0.980 / 0.976 | 0.00 / 0.37 | 37.3 | 93% | 7% | 0.13 | 0.97 | 1886 | 1099 | 0.00 | 2218 | 912 | 13% |
| 4 | v3.5 save+tea | 33.1 | 0.2% | 0.99 | 21.0 | 17.0 | 0.985 / 0.980 / 0.976 | 0.00 / 0.38 | 37.3 | 93% | 7% | 0.14 | 0.97 | 1886 | 1099 | 0.00 | 2218 | 912 | 13% |
| 5 | no spells | 22.1 | 0.4% | 0.99 | 24.0 | 17.1 | 0.986 / 0.986 / 0.991 | 0.00 / 0.00 | 37.8 | 94% | 0% | 0.15 | 0.95 | 4472 | 3070 | 0.00 | 0 | 1560 | 14% |
| 5 | v3.5 free | 22.0 | 0.2% | 0.99 | 22.5 | 16.1 | 0.941 / 0.960 / 0.938 | 0.81 / 1.23 | 36.5 | 68% | 67% | 0.07 | 0.95 | 2235 | 823 | 0.00 | 65 | 1560 | 13% |
| 5 | v3.5 save | 22.1 | 0.4% | 0.99 | 22.5 | 17.1 | 0.986 / 0.942 / 0.934 | 0.00 / 1.37 | 37.7 | 90% | 94% | 0.13 | 0.95 | 2240 | 852 | 0.00 | 65 | 1560 | 14% |
| 5 | v3.5 save+tea | 22.1 | 0.3% | 0.99 | 22.4 | 17.1 | 0.986 / 0.942 / 0.933 | 0.00 / 1.38 | 37.7 | 90% | 94% | 0.13 | 0.95 | 2239 | 377 | 0.09 | 65 | 1560 | 14% |
| 6 | no spells | 22.1 | 0.5% | 0.99 | 22.1 | 19.5 | 0.986 / 0.984 / 0.994 | 0.00 / 0.00 | 43.4 | 96% | 0% | 0.18 | 0.95 | 6202 | 4315 | 0.00 | 0 | 2160 | 13% |
| 6 | v3.5 free | 22.0 | 0.1% | 1.00 | 20.5 | 17.2 | 0.932 / 0.954 / 0.934 | 1.05 / 1.27 | 40.1 | 66% | 64% | 0.07 | 0.95 | 3682 | 1766 | 0.00 | 27 | 2160 | 11% |
| 6 | v3.5 save | 22.0 | 0.3% | 1.00 | 20.4 | 19.3 | 0.988 / 0.928 / 0.930 | 0.00 / 1.38 | 42.8 | 91% | 97% | 0.16 | 0.95 | 3848 | 1950 | 0.00 | 513 | 2160 | 13% |
| 6 | v3.5 save+tea | 22.0 | 0.3% | 1.00 | 20.5 | 19.3 | 0.988 / 0.928 / 0.931 | 0.00 / 1.37 | 42.9 | 92% | 97% | 0.16 | 0.95 | 3255 | 1359 | 0.00 | 81 | 2160 | 13% |
| 7 | no spells | 22.3 | 1.8% | 0.97 | 24.0 | 21.1 | 0.987 / 0.986 / 0.995 | 0.00 / 0.00 | 46.4 | 77% | 0% | 0.26 | 0.95 | 8682 | 6226 | 0.00 | 0 | 2760 | 10% |
| 7 | v3.5 free | 22.0 | 0.3% | 0.99 | 22.9 | 19.6 | 0.944 / 0.954 / 0.946 | 0.87 / 1.10 | 43.9 | 68% | 70% | 0.09 | 0.95 | 5631 | 3169 | 0.00 | 144 | 2760 | 9% |
| 7 | v3.5 save | 22.2 | 1.3% | 0.99 | 22.9 | 21.2 | 0.987 / 0.952 / 0.941 | 0.00 / 1.30 | 46.3 | 74% | 87% | 0.24 | 0.95 | 5803 | 3351 | 0.00 | 684 | 2760 | 10% |
| 7 | v3.5 save+tea | 22.2 | 1.3% | 0.98 | 23.1 | 21.2 | 0.987 / 0.955 / 0.945 | 0.00 / 1.20 | 46.3 | 74% | 88% | 0.24 | 0.95 | 5586 | 3139 | 0.00 | 288 | 2760 | 10% |
| 8 | no spells | 22.1 | 0.6% | 0.99 | 22.8 | 20.5 | 0.990 / 0.986 / 0.991 | 0.00 / 0.00 | 43.8 | 72% | 0% | 0.13 | 0.95 | 10842 | 7789 | 0.00 | 0 | 3360 | 11% |
| 8 | v3.5 free | 22.1 | 0.4% | 0.99 | 22.7 | 19.3 | 0.944 / 0.963 / 0.955 | 0.95 / 0.78 | 42.2 | 70% | 71% | 0.06 | 0.95 | 7522 | 4500 | 0.00 | 92 | 3360 | 10% |
| 8 | v3.5 save | 22.1 | 0.8% | 0.99 | 21.9 | 20.4 | 0.989 / 0.958 / 0.943 | 0.00 / 1.14 | 43.6 | 71% | 88% | 0.11 | 0.95 | 7352 | 4330 | 0.00 | 416 | 3360 | 11% |
| 8 | v3.5 save+tea | 22.1 | 0.7% | 1.00 | 22.1 | 20.5 | 0.989 / 0.960 / 0.948 | 0.00 / 1.03 | 43.7 | 72% | 88% | 0.10 | 0.95 | 6966 | 3953 | 0.01 | 139 | 3360 | 11% |
| 9 | no spells | 22.1 | 0.5% | 0.99 | 22.6 | 20.3 | 0.991 / 0.986 / 0.991 | 0.00 / 0.00 | 42.9 | 74% | 0% | 0.15 | 0.95 | 13082 | 9396 | 0.00 | 0 | 4080 | 12% |
| 9 | v3.5 free | 22.0 | 0.2% | 1.00 | 21.1 | 19.2 | 0.971 / 0.970 / 0.965 | 0.40 / 0.53 | 40.9 | 69% | 80% | 0.07 | 0.95 | 9482 | 812 | 0.25 | 8736 | 4080 | 10% |
| 9 | v3.5 save | 22.1 | 0.3% | 1.00 | 20.9 | 20.2 | 0.991 / 0.961 / 0.954 | 0.00 / 0.80 | 42.5 | 74% | 90% | 0.14 | 0.95 | 9211 | 1139 | 0.12 | 7363 | 4080 | 11% |
| 9 | v3.5 save+tea | 22.1 | 0.5% | 0.99 | 21.5 | 20.2 | 0.990 / 0.970 / 0.959 | 0.00 / 0.69 | 42.5 | 74% | 90% | 0.14 | 0.95 | 8343 | 2309 | 0.21 | 6614 | 4080 | 11% |

### 7.7 Per realm, 65% saver

| realm | mode | battles | defeat % | boss 1st-try | boss q | normal q | q share normal / elite / boss | casts/b normal / boss | min/location | MP at battle start | spell castable at start | heals/b | full gear | gold start | min gold | free inns | spell spend | gear spend | proficient at end |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | no spells | 56.3 | 0.0% | 1.00 | 22.9 | 13.0 | 0.996 / 0.990 / 0.999 | 0.00 / 0.00 | 47.2 | 100% | 0% | 0.00 | 0.92 | 24 | 29 | 0.00 | 0 | 35 | 25% |
| 1 | v3.5 free | 56.3 | 0.0% | 1.00 | 22.9 | 13.0 | 0.996 / 0.990 / 0.999 | 0.00 / 0.00 | 47.2 | 100% | 0% | 0.00 | 0.92 | 24 | 29 | 0.00 | 0 | 35 | 25% |
| 1 | v3.5 save | 56.3 | 0.0% | 1.00 | 22.9 | 13.0 | 0.996 / 0.990 / 0.999 | 0.00 / 0.00 | 47.2 | 100% | 0% | 0.00 | 0.92 | 24 | 29 | 0.00 | 0 | 35 | 25% |
| 1 | v3.5 save+tea | 56.3 | 0.0% | 1.00 | 22.9 | 13.0 | 0.996 / 0.990 / 0.999 | 0.00 / 0.00 | 47.2 | 100% | 0% | 0.00 | 0.92 | 24 | 29 | 0.00 | 0 | 35 | 25% |
| 2 | no spells | 41.5 | 0.0% | 1.00 | 24.2 | 13.7 | 0.991 / 0.987 / 0.996 | 0.00 / 0.00 | 54.9 | 87% | 0% | 0.09 | 0.98 | 773 | 503 | 0.00 | 0 | 288 | 23% |
| 2 | v3.5 free | 43.0 | 0.0% | 1.00 | 22.0 | 13.1 | 0.982 / 0.976 / 0.960 | 0.13 / 0.79 | 54.6 | 80% | 14% | 0.07 | 0.98 | 773 | 502 | 0.00 | 734 | 288 | 22% |
| 2 | v3.5 save | 41.8 | 0.0% | 1.00 | 21.8 | 13.5 | 0.992 / 0.973 / 0.958 | 0.00 / 0.86 | 54.6 | 86% | 19% | 0.08 | 0.98 | 773 | 503 | 0.00 | 724 | 288 | 22% |
| 2 | v3.5 save+tea | 41.8 | 0.0% | 1.00 | 21.7 | 13.5 | 0.992 / 0.973 / 0.957 | 0.00 / 0.89 | 54.5 | 86% | 19% | 0.08 | 0.98 | 773 | 503 | 0.00 | 724 | 288 | 22% |
| 3 | no spells | 37.9 | 0.2% | 1.00 | 25.3 | 17.7 | 0.987 / 0.979 / 0.980 | 0.00 / 0.00 | 61.5 | 94% | 0% | 0.22 | 0.97 | 1656 | 1185 | 0.00 | 0 | 528 | 23% |
| 3 | v3.5 free | 46.2 | 0.0% | 1.00 | 19.7 | 14.1 | 0.913 / 0.922 / 0.886 | 1.23 / 2.12 | 60.9 | 68% | 66% | 0.00 | 0.98 | 938 | 451 | 0.00 | 189 | 528 | 23% |
| 3 | v3.5 save | 38.9 | 0.1% | 1.00 | 19.9 | 17.2 | 0.989 / 0.882 / 0.881 | 0.00 / 2.18 | 60.9 | 92% | 97% | 0.19 | 0.97 | 927 | 455 | 0.00 | 261 | 528 | 23% |
| 3 | v3.5 save+tea | 38.8 | 0.1% | 1.00 | 19.8 | 17.2 | 0.989 / 0.882 / 0.880 | 0.00 / 2.18 | 60.6 | 92% | 97% | 0.19 | 0.97 | 926 | 454 | 0.00 | 270 | 528 | 22% |
| 4 | no spells | 49.4 | 1.7% | 1.00 | 25.2 | 18.9 | 0.976 / 0.979 / 0.982 | 0.00 / 0.00 | 56.6 | 94% | 0% | 0.21 | 0.98 | 3001 | 2148 | 0.00 | 0 | 912 | 24% |
| 4 | v3.5 free | 56.2 | 0.2% | 1.00 | 20.1 | 16.3 | 0.889 / 0.891 / 0.868 | 1.72 / 2.57 | 56.7 | 73% | 76% | 0.01 | 0.98 | 2055 | 1231 | 0.00 | 2249 | 912 | 23% |
| 4 | v3.5 save | 50.5 | 1.2% | 0.99 | 20.0 | 18.4 | 0.967 / 0.872 / 0.866 | 0.19 / 2.64 | 56.1 | 89% | 98% | 0.11 | 0.98 | 1990 | 1172 | 0.00 | 1989 | 912 | 23% |
| 4 | v3.5 save+tea | 50.5 | 1.1% | 0.99 | 20.1 | 18.4 | 0.967 / 0.871 / 0.866 | 0.19 / 2.65 | 56.0 | 89% | 98% | 0.11 | 0.98 | 1974 | 1160 | 0.00 | 2020 | 912 | 23% |
| 5 | no spells | 32.6 | 2.0% | 0.98 | 27.6 | 18.9 | 0.977 / 0.977 / 0.976 | 0.00 / 0.00 | 56.4 | 94% | 0% | 0.23 | 0.97 | 5762 | 4296 | 0.00 | 0 | 1560 | 24% |
| 5 | v3.5 free | 34.7 | 0.4% | 0.99 | 25.7 | 17.5 | 0.903 / 0.934 / 0.906 | 1.47 / 1.86 | 56.8 | 78% | 88% | 0.06 | 0.97 | 2631 | 1188 | 0.00 | 65 | 1560 | 24% |
| 5 | v3.5 save | 33.1 | 2.0% | 0.96 | 25.9 | 18.7 | 0.976 / 0.922 / 0.904 | 0.04 / 1.96 | 56.6 | 92% | 99% | 0.20 | 0.97 | 2843 | 1433 | 0.00 | 497 | 1560 | 24% |
| 5 | v3.5 save+tea | 32.9 | 1.9% | 0.97 | 25.7 | 18.8 | 0.976 / 0.922 / 0.903 | 0.04 / 1.95 | 56.5 | 92% | 99% | 0.20 | 0.97 | 2816 | 913 | 0.00 | 130 | 1560 | 24% |
| 6 | no spells | 33.4 | 2.3% | 0.99 | 26.4 | 21.4 | 0.977 / 0.973 / 0.974 | 0.00 / 0.00 | 65.7 | 96% | 0% | 0.31 | 0.97 | 7794 | 5850 | 0.00 | 0 | 2160 | 22% |
| 6 | v3.5 free | 39.2 | 0.4% | 0.99 | 24.1 | 17.7 | 0.908 / 0.921 / 0.917 | 1.44 / 1.44 | 65.4 | 76% | 93% | 0.08 | 0.97 | 4590 | 2616 | 0.00 | 3672 | 2160 | 22% |
| 6 | v3.5 save | 33.3 | 2.2% | 0.98 | 23.3 | 21.2 | 0.977 / 0.901 / 0.912 | 0.01 / 1.64 | 64.5 | 94% | 100% | 0.26 | 0.97 | 4544 | 2571 | 0.00 | 2970 | 2160 | 22% |
| 6 | v3.5 save+tea | 33.3 | 2.0% | 0.99 | 23.5 | 21.1 | 0.976 / 0.905 / 0.915 | 0.03 / 1.53 | 64.5 | 93% | 100% | 0.26 | 0.97 | 4350 | 2423 | 0.00 | 2592 | 2160 | 22% |
| 7 | no spells | 37.7 | 3.3% | 0.98 | 26.5 | 23.4 | 0.974 / 0.968 / 0.975 | 0.00 / 0.00 | 78.1 | 79% | 0% | 0.38 | 0.97 | 10651 | 7975 | 0.00 | 0 | 2760 | 22% |
| 7 | v3.5 free | 44.9 | 0.8% | 0.99 | 23.0 | 19.3 | 0.907 / 0.913 / 0.892 | 1.53 / 2.03 | 78.4 | 77% | 91% | 0.07 | 0.98 | 4361 | 1808 | 0.00 | 828 | 2760 | 22% |
| 7 | v3.5 save | 38.1 | 3.0% | 0.98 | 22.8 | 23.2 | 0.974 / 0.909 / 0.893 | 0.00 / 2.03 | 77.8 | 78% | 99% | 0.35 | 0.97 | 4597 | 2035 | 0.00 | 576 | 2760 | 22% |
| 7 | v3.5 save+tea | 38.1 | 3.7% | 0.99 | 23.4 | 23.2 | 0.974 / 0.915 / 0.899 | 0.00 / 1.93 | 77.9 | 78% | 99% | 0.35 | 0.97 | 4737 | 2149 | 0.00 | 1260 | 2760 | 22% |
| 8 | no spells | 36.2 | 1.5% | 0.99 | 25.9 | 22.8 | 0.975 / 0.973 / 0.974 | 0.00 / 0.00 | 72.4 | 75% | 0% | 0.26 | 0.97 | 13228 | 10055 | 0.00 | 0 | 3360 | 23% |
| 8 | v3.5 free | 45.7 | 0.2% | 1.00 | 22.3 | 17.7 | 0.906 / 0.906 / 0.892 | 1.53 / 1.90 | 72.9 | 79% | 81% | 0.01 | 0.98 | 7489 | 4060 | 0.00 | 5221 | 3360 | 23% |
| 8 | v3.5 save | 36.3 | 1.5% | 0.97 | 23.2 | 22.8 | 0.976 / 0.915 / 0.897 | 0.00 / 1.95 | 72.4 | 76% | 96% | 0.23 | 0.97 | 7244 | 4034 | 0.00 | 2310 | 3360 | 23% |
| 8 | v3.5 save+tea | 36.4 | 1.7% | 0.97 | 23.1 | 22.7 | 0.976 / 0.917 / 0.896 | 0.00 / 1.95 | 72.3 | 75% | 96% | 0.24 | 0.97 | 6204 | 3109 | 0.00 | 601 | 3360 | 23% |
| 9 | no spells | 33.7 | 1.7% | 0.99 | 26.3 | 22.9 | 0.978 / 0.969 / 0.975 | 0.00 / 0.00 | 67.6 | 79% | 0% | 0.31 | 0.97 | 16540 | 12682 | 0.00 | 0 | 4080 | 22% |
| 9 | v3.5 free | 39.9 | 0.4% | 0.99 | 21.8 | 19.0 | 0.947 / 0.943 / 0.934 | 0.69 / 1.00 | 67.2 | 76% | 95% | 0.08 | 0.97 | 7005 | 1003 | 0.00 | 7800 | 4080 | 22% |
| 9 | v3.5 save | 34.3 | 1.5% | 1.00 | 22.2 | 22.5 | 0.978 / 0.945 / 0.933 | 0.00 / 1.03 | 67.3 | 79% | 98% | 0.29 | 0.97 | 8448 | 1011 | 0.00 | 6989 | 4080 | 22% |
| 9 | v3.5 save+tea | 34.0 | 1.5% | 0.99 | 22.6 | 22.6 | 0.979 / 0.944 / 0.927 | 0.00 / 1.14 | 67.2 | 79% | 98% | 0.30 | 0.97 | 8484 | 1348 | 0.00 | 7238 | 4080 | 22% |

### 7.8 Per realm, 50% saver

| realm | mode | battles | defeat % | boss 1st-try | boss q | normal q | q share normal / elite / boss | casts/b normal / boss | min/location | MP at battle start | spell castable at start | heals/b | full gear | gold start | min gold | free inns | spell spend | gear spend | proficient at end |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | no spells | 65.9 | 0.1% | 1.00 | 26.9 | 15.2 | 0.990 / 0.980 / 0.992 | 0.00 / 0.00 | 61.4 | 100% | 0% | 0.00 | 0.90 | 24 | 28 | 0.00 | 0 | 35 | 24% |
| 1 | v3.5 free | 65.9 | 0.1% | 1.00 | 26.9 | 15.2 | 0.990 / 0.980 / 0.992 | 0.00 / 0.00 | 61.4 | 100% | 0% | 0.00 | 0.90 | 24 | 28 | 0.00 | 0 | 35 | 24% |
| 1 | v3.5 save | 65.9 | 0.1% | 1.00 | 26.9 | 15.2 | 0.990 / 0.980 / 0.992 | 0.00 / 0.00 | 61.4 | 100% | 0% | 0.00 | 0.90 | 24 | 28 | 0.00 | 0 | 35 | 24% |
| 1 | v3.5 save+tea | 65.9 | 0.1% | 1.00 | 26.9 | 15.2 | 0.990 / 0.980 / 0.992 | 0.00 / 0.00 | 61.4 | 100% | 0% | 0.00 | 0.90 | 24 | 28 | 0.00 | 0 | 35 | 24% |
| 2 | no spells | 48.9 | 0.8% | 1.00 | 27.9 | 15.9 | 0.986 / 0.976 / 0.978 | 0.00 / 0.00 | 71.5 | 87% | 0% | 0.20 | 0.97 | 757 | 448 | 0.00 | 0 | 288 | 22% |
| 2 | v3.5 free | 49.3 | 0.8% | 1.00 | 27.2 | 15.8 | 0.984 / 0.974 / 0.967 | 0.02 / 0.27 | 71.2 | 87% | 3% | 0.19 | 0.97 | 757 | 448 | 0.00 | 566 | 288 | 22% |
| 2 | v3.5 save | 49.0 | 0.8% | 1.00 | 27.1 | 15.9 | 0.986 / 0.973 / 0.967 | 0.00 / 0.29 | 71.3 | 87% | 4% | 0.19 | 0.97 | 757 | 448 | 0.00 | 566 | 288 | 22% |
| 2 | v3.5 save+tea | 49.0 | 0.8% | 1.00 | 27.0 | 15.9 | 0.986 / 0.973 / 0.967 | 0.00 / 0.29 | 71.3 | 87% | 4% | 0.19 | 0.97 | 757 | 448 | 0.00 | 566 | 288 | 22% |
| 3 | no spells | 43.2 | 2.6% | 0.93 | 28.6 | 20.7 | 0.977 / 0.965 / 0.962 | 0.00 / 0.00 | 78.9 | 95% | 0% | 0.44 | 0.98 | 1439 | 926 | 0.00 | 0 | 528 | 22% |
| 3 | v3.5 free | 53.3 | 0.6% | 0.98 | 23.2 | 16.1 | 0.913 / 0.911 / 0.897 | 1.24 / 1.57 | 77.1 | 85% | 68% | 0.08 | 0.98 | 881 | 378 | 0.00 | 9 | 528 | 22% |
| 3 | v3.5 save | 44.1 | 1.7% | 0.98 | 23.5 | 20.3 | 0.978 / 0.904 / 0.899 | 0.00 / 1.63 | 78.3 | 95% | 78% | 0.39 | 0.98 | 874 | 364 | 0.00 | 9 | 528 | 22% |
| 3 | v3.5 save+tea | 44.0 | 1.7% | 0.98 | 23.5 | 20.3 | 0.978 / 0.903 / 0.899 | 0.00 / 1.62 | 78.2 | 95% | 78% | 0.39 | 0.98 | 874 | 364 | 0.00 | 9 | 528 | 22% |
| 4 | no spells | 61.7 | 13.0% | 0.82 | 27.5 | 20.8 | 0.967 / 0.968 / 0.979 | 0.00 / 0.00 | 75.1 | 96% | 0% | 0.38 | 0.97 | 2193 | 1147 | 0.00 | 0 | 912 | 24% |
| 4 | v3.5 free | 67.5 | 6.6% | 0.85 | 23.4 | 18.6 | 0.885 / 0.889 / 0.899 | 1.71 / 1.97 | 75.1 | 90% | 72% | 0.09 | 0.97 | 1801 | 840 | 0.00 | 31 | 912 | 24% |
| 4 | v3.5 save | 62.6 | 12.9% | 0.82 | 23.1 | 20.5 | 0.956 / 0.894 / 0.902 | 0.23 / 1.97 | 74.6 | 93% | 79% | 0.28 | 0.97 | 1707 | 742 | 0.00 | 15 | 912 | 24% |
| 4 | v3.5 save+tea | 62.8 | 13.1% | 0.82 | 23.1 | 20.5 | 0.956 / 0.894 / 0.902 | 0.23 / 1.98 | 74.8 | 93% | 80% | 0.28 | 0.97 | 1706 | 737 | 0.00 | 15 | 912 | 24% |
| 5 | no spells | 40.3 | 13.7% | 0.78 | 28.6 | 21.1 | 0.969 / 0.970 / 0.973 | 0.00 / 0.00 | 74.9 | 96% | 0% | 0.42 | 0.96 | 2952 | 1392 | 0.00 | 0 | 1560 | 24% |
| 5 | v3.5 free | 41.4 | 14.2% | 0.78 | 28.1 | 20.5 | 0.951 / 0.955 / 0.957 | 0.38 / 0.48 | 75.3 | 92% | 80% | 0.39 | 0.96 | 2827 | 1250 | 0.00 | 0 | 1560 | 24% |
| 5 | v3.5 save | 41.1 | 14.3% | 0.77 | 27.8 | 20.7 | 0.962 / 0.954 / 0.958 | 0.15 / 0.48 | 75.3 | 92% | 80% | 0.42 | 0.96 | 2600 | 1105 | 0.00 | 0 | 1560 | 24% |
| 5 | v3.5 save+tea | 41.1 | 14.5% | 0.76 | 27.8 | 20.7 | 0.962 / 0.954 / 0.957 | 0.15 / 0.49 | 75.0 | 92% | 80% | 0.42 | 0.96 | 2582 | 767 | 0.00 | 0 | 1560 | 24% |
| 6 | no spells | 41.1 | 16.1% | 0.82 | 27.6 | 23.8 | 0.969 / 0.965 / 0.971 | 0.00 / 0.00 | 85.8 | 97% | 0% | 0.55 | 0.97 | 3566 | 1543 | 0.00 | 0 | 2160 | 22% |
| 6 | v3.5 free | 41.7 | 15.9% | 0.80 | 27.1 | 23.4 | 0.962 / 0.953 / 0.960 | 0.14 / 0.35 | 85.9 | 95% | 80% | 0.55 | 0.97 | 3421 | 1412 | 0.00 | 0 | 2160 | 22% |
| 6 | v3.5 save | 41.2 | 15.8% | 0.80 | 27.5 | 23.6 | 0.966 / 0.954 / 0.958 | 0.06 / 0.34 | 85.6 | 95% | 80% | 0.55 | 0.96 | 3369 | 1345 | 0.00 | 0 | 2160 | 22% |
| 6 | v3.5 save+tea | 41.4 | 16.2% | 0.79 | 27.3 | 23.6 | 0.966 / 0.954 / 0.959 | 0.06 / 0.34 | 86.0 | 95% | 80% | 0.55 | 0.95 | 3056 | 1095 | 0.00 | 0 | 2160 | 22% |
| 7 | no spells | 49.4 | 24.9% | 0.70 | 27.3 | 25.1 | 0.967 / 0.966 / 0.978 | 0.00 / 0.00 | 105.8 | 88% | 0% | 0.67 | 0.97 | 4406 | 1624 | 0.00 | 0 | 2760 | 23% |
| 7 | v3.5 free | 49.9 | 23.3% | 0.69 | 26.3 | 25.1 | 0.943 / 0.943 / 0.958 | 0.58 / 0.58 | 106.7 | 89% | 78% | 0.65 | 0.97 | 4390 | 1609 | 0.00 | 0 | 2760 | 23% |
| 7 | v3.5 save | 50.3 | 25.1% | 0.72 | 26.5 | 24.9 | 0.958 / 0.947 / 0.955 | 0.23 / 0.65 | 106.6 | 87% | 79% | 0.65 | 0.97 | 4355 | 1566 | 0.00 | 0 | 2760 | 23% |
| 7 | v3.5 save+tea | 50.4 | 25.8% | 0.71 | 26.4 | 24.9 | 0.958 / 0.947 / 0.954 | 0.23 / 0.68 | 106.7 | 87% | 79% | 0.64 | 0.97 | 4109 | 1343 | 0.00 | 0 | 2760 | 23% |
| 8 | no spells | 45.1 | 17.9% | 0.75 | 27.0 | 25.4 | 0.965 / 0.964 / 0.975 | 0.00 / 0.00 | 96.9 | 87% | 0% | 0.59 | 0.93 | 3981 | 955 | 0.00 | 0 | 3360 | 23% |
| 8 | v3.5 free | 45.2 | 18.2% | 0.71 | 27.1 | 25.6 | 0.945 / 0.944 / 0.960 | 0.52 / 0.49 | 98.2 | 89% | 78% | 0.60 | 0.91 | 3842 | 901 | 0.00 | 0 | 3360 | 24% |
| 8 | v3.5 save | 45.5 | 19.3% | 0.68 | 26.4 | 25.6 | 0.954 / 0.943 / 0.960 | 0.28 / 0.52 | 98.4 | 88% | 79% | 0.62 | 0.92 | 3955 | 971 | 0.00 | 0 | 3360 | 24% |
| 8 | v3.5 save+tea | 45.3 | 19.0% | 0.70 | 26.5 | 25.5 | 0.954 / 0.944 / 0.961 | 0.28 / 0.48 | 98.0 | 88% | 79% | 0.62 | 0.89 | 3601 | 784 | 0.00 | 0 | 3360 | 24% |
| 9 | no spells | 42.4 | 19.6% | 0.74 | 28.2 | 25.2 | 0.967 / 0.963 / 0.972 | 0.00 / 0.00 | 90.8 | 87% | 0% | 0.64 | 0.92 | 4587 | 965 | 0.00 | 0 | 4080 | 23% |
| 9 | v3.5 free | 42.7 | 21.6% | 0.70 | 27.3 | 25.2 | 0.954 / 0.949 / 0.963 | 0.31 / 0.39 | 91.6 | 88% | 79% | 0.66 | 0.88 | 4254 | 865 | 0.00 | 0 | 4080 | 23% |
| 9 | v3.5 save | 42.8 | 20.4% | 0.71 | 27.7 | 25.2 | 0.966 / 0.951 / 0.963 | 0.00 / 0.35 | 91.6 | 87% | 79% | 0.64 | 0.89 | 4276 | 864 | 0.00 | 0 | 4080 | 23% |
| 9 | v3.5 save+tea | 42.9 | 21.8% | 0.68 | 27.2 | 25.2 | 0.966 / 0.954 / 0.964 | 0.00 / 0.36 | 91.8 | 87% | 80% | 0.63 | 0.84 | 3899 | 704 | 0.00 | 0 | 4080 | 23% |

### 7.9 Per realm, 90% saver

| realm | mode | battles | defeat % | boss 1st-try | boss q | normal q | q share normal / elite / boss | casts/b normal / boss | min/location | MP at battle start | spell castable at start | heals/b | full gear | gold start | min gold | free inns | spell spend | gear spend | proficient at end |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | no spells | 50.3 | 0.0% | 1.00 | 16.7 | 9.8 | 1.000 / 0.999 / 1.000 | 0.00 / 0.00 | 34.7 | 100% | 0% | 0.00 | 0.92 | 24 | 33 | 0.00 | 0 | 35 | 25% |
| 1 | v3.5 free | 50.3 | 0.0% | 1.00 | 16.7 | 9.8 | 1.000 / 0.999 / 1.000 | 0.00 / 0.00 | 34.7 | 100% | 0% | 0.00 | 0.92 | 24 | 33 | 0.00 | 0 | 35 | 25% |
| 1 | v3.5 save | 50.3 | 0.0% | 1.00 | 16.7 | 9.8 | 1.000 / 0.999 / 1.000 | 0.00 / 0.00 | 34.7 | 100% | 0% | 0.00 | 0.92 | 24 | 33 | 0.00 | 0 | 35 | 25% |
| 1 | v3.5 save+tea | 50.3 | 0.0% | 1.00 | 16.7 | 9.8 | 1.000 / 0.999 / 1.000 | 0.00 / 0.00 | 34.7 | 100% | 0% | 0.00 | 0.92 | 24 | 33 | 0.00 | 0 | 35 | 25% |
| 2 | no spells | 36.9 | 0.0% | 1.00 | 17.3 | 10.4 | 0.998 / 1.000 / 1.000 | 0.00 / 0.00 | 40.3 | 92% | 0% | 0.01 | 0.97 | 810 | 547 | 0.00 | 0 | 288 | 23% |
| 2 | v3.5 free | 38.7 | 0.0% | 1.00 | 16.1 | 9.9 | 0.979 / 0.973 / 0.948 | 0.19 / 0.89 | 40.4 | 81% | 21% | 0.01 | 0.97 | 810 | 546 | 0.00 | 904 | 288 | 23% |
| 2 | v3.5 save | 37.2 | 0.0% | 1.00 | 16.2 | 10.3 | 0.998 / 0.967 / 0.942 | 0.00 / 0.99 | 40.2 | 91% | 29% | 0.01 | 0.97 | 810 | 546 | 0.00 | 839 | 288 | 23% |
| 2 | v3.5 save+tea | 37.2 | 0.0% | 1.00 | 16.1 | 10.3 | 0.998 / 0.967 / 0.941 | 0.00 / 1.00 | 40.2 | 91% | 29% | 0.01 | 0.97 | 810 | 546 | 0.00 | 839 | 288 | 23% |
| 3 | no spells | 34.6 | 0.0% | 1.00 | 17.3 | 13.1 | 0.999 / 0.998 / 1.000 | 0.00 / 0.00 | 44.3 | 94% | 0% | 0.02 | 0.97 | 1829 | 1366 | 0.00 | 0 | 528 | 23% |
| 3 | v3.5 free | 37.4 | 0.0% | 1.00 | 14.7 | 11.9 | 0.930 / 0.928 / 0.884 | 0.87 / 1.91 | 44.3 | 48% | 62% | 0.00 | 0.97 | 962 | 489 | 0.00 | 1008 | 528 | 22% |
| 3 | v3.5 save | 34.8 | 0.0% | 1.00 | 14.4 | 12.9 | 0.999 / 0.875 / 0.870 | 0.00 / 2.15 | 43.6 | 86% | 94% | 0.01 | 0.97 | 995 | 526 | 0.00 | 1107 | 528 | 23% |
| 3 | v3.5 save+tea | 34.8 | 0.0% | 1.00 | 14.3 | 12.9 | 0.999 / 0.876 / 0.869 | 0.00 / 2.16 | 43.7 | 86% | 94% | 0.01 | 0.97 | 995 | 525 | 0.00 | 1098 | 528 | 23% |
| 4 | no spells | 43.8 | 0.0% | 1.00 | 17.3 | 14.3 | 0.997 / 0.998 / 0.999 | 0.00 / 0.00 | 40.4 | 94% | 0% | 0.03 | 0.98 | 3497 | 2716 | 0.00 | 0 | 912 | 24% |
| 4 | v3.5 free | 46.2 | 0.0% | 1.00 | 15.2 | 13.4 | 0.926 / 0.927 / 0.877 | 1.03 / 2.11 | 40.5 | 44% | 62% | 0.00 | 0.98 | 1657 | 845 | 0.00 | 2446 | 912 | 23% |
| 4 | v3.5 save | 44.2 | 0.0% | 1.00 | 14.6 | 14.2 | 0.996 / 0.881 / 0.857 | 0.02 / 2.41 | 40.2 | 84% | 95% | 0.02 | 0.98 | 1541 | 751 | 0.00 | 2509 | 912 | 23% |
| 4 | v3.5 save+tea | 44.1 | 0.0% | 1.00 | 14.4 | 14.2 | 0.996 / 0.881 / 0.857 | 0.03 / 2.40 | 40.2 | 84% | 95% | 0.02 | 0.98 | 1551 | 760 | 0.00 | 2484 | 912 | 24% |
| 5 | no spells | 29.1 | 0.0% | 1.00 | 19.0 | 14.3 | 0.998 / 0.999 / 0.999 | 0.00 / 0.00 | 40.4 | 95% | 0% | 0.03 | 0.97 | 7239 | 5862 | 0.00 | 0 | 1560 | 24% |
| 5 | v3.5 free | 30.3 | 0.0% | 1.00 | 18.3 | 13.7 | 0.929 / 0.936 / 0.892 | 1.01 / 2.21 | 41.0 | 44% | 69% | 0.00 | 0.97 | 2889 | 1485 | 0.00 | 1814 | 1560 | 24% |
| 5 | v3.5 save | 29.2 | 0.0% | 1.00 | 18.0 | 14.3 | 0.998 / 0.866 / 0.868 | 0.00 / 2.70 | 40.7 | 84% | 95% | 0.02 | 0.97 | 2740 | 1367 | 0.00 | 1598 | 1560 | 24% |
| 5 | v3.5 save+tea | 29.1 | 0.0% | 1.00 | 18.2 | 14.4 | 0.998 / 0.864 / 0.869 | 0.00 / 2.73 | 40.7 | 84% | 95% | 0.02 | 0.97 | 2794 | 903 | 0.00 | 389 | 1560 | 24% |
| 6 | no spells | 29.7 | 0.0% | 1.00 | 18.2 | 16.3 | 0.998 / 0.997 / 1.000 | 0.00 / 0.00 | 47.4 | 97% | 0% | 0.03 | 0.97 | 10222 | 8353 | 0.00 | 0 | 2160 | 22% |
| 6 | v3.5 free | 30.4 | 0.0% | 1.00 | 17.9 | 15.8 | 0.935 / 0.939 / 0.903 | 1.07 / 1.91 | 47.9 | 43% | 70% | 0.01 | 0.97 | 3958 | 1975 | 0.00 | 2592 | 2160 | 22% |
| 6 | v3.5 save | 29.2 | 0.0% | 1.00 | 17.2 | 16.4 | 0.998 / 0.883 / 0.887 | 0.01 / 2.16 | 47.0 | 86% | 97% | 0.03 | 0.97 | 4115 | 2148 | 0.00 | 2538 | 2160 | 22% |
| 6 | v3.5 save+tea | 29.4 | 0.0% | 1.00 | 17.8 | 16.3 | 0.998 / 0.880 / 0.900 | 0.01 / 1.96 | 47.2 | 88% | 98% | 0.02 | 0.97 | 4677 | 2717 | 0.00 | 3591 | 2160 | 22% |
| 7 | no spells | 34.7 | 0.0% | 1.00 | 19.3 | 17.2 | 0.998 / 0.998 / 0.999 | 0.00 / 0.00 | 56.0 | 65% | 0% | 0.03 | 0.97 | 14445 | 12040 | 0.00 | 0 | 2760 | 22% |
| 7 | v3.5 free | 37.1 | 0.0% | 1.00 | 17.4 | 16.1 | 0.952 / 0.953 / 0.904 | 0.78 / 1.84 | 56.5 | 42% | 74% | 0.01 | 0.97 | 5428 | 2863 | 0.00 | 5101 | 2760 | 22% |
| 7 | v3.5 save | 35.0 | 0.0% | 1.00 | 17.0 | 17.1 | 0.998 / 0.931 / 0.893 | 0.00 / 2.03 | 55.9 | 59% | 94% | 0.03 | 0.97 | 5687 | 3130 | 0.00 | 4896 | 2760 | 22% |
| 7 | v3.5 save+tea | 34.8 | 0.0% | 1.00 | 16.7 | 17.1 | 0.998 / 0.934 / 0.880 | 0.00 / 2.24 | 55.7 | 59% | 93% | 0.03 | 0.97 | 5085 | 2605 | 0.00 | 4428 | 2760 | 22% |
| 8 | no spells | 33.7 | 0.0% | 1.00 | 18.4 | 16.6 | 0.999 / 0.999 / 0.998 | 0.00 / 0.00 | 51.8 | 50% | 0% | 0.01 | 0.97 | 20053 | 17066 | 0.00 | 0 | 3360 | 23% |
| 8 | v3.5 free | 36.0 | 0.0% | 1.00 | 17.1 | 15.4 | 0.962 / 0.961 / 0.914 | 0.59 / 1.57 | 51.9 | 38% | 60% | 0.00 | 0.97 | 6183 | 3108 | 0.00 | 4528 | 3360 | 23% |
| 8 | v3.5 save | 33.9 | 0.0% | 1.00 | 17.2 | 16.5 | 0.999 / 0.951 / 0.900 | 0.00 / 1.88 | 51.9 | 49% | 76% | 0.00 | 0.97 | 6360 | 3268 | 0.00 | 4712 | 3360 | 23% |
| 8 | v3.5 save+tea | 34.0 | 0.0% | 1.00 | 17.3 | 16.5 | 0.999 / 0.948 / 0.888 | 0.00 / 2.16 | 52.0 | 50% | 75% | 0.00 | 0.97 | 5371 | 2267 | 0.00 | 1940 | 3360 | 23% |
| 9 | no spells | 31.5 | 0.0% | 1.00 | 18.3 | 16.6 | 0.999 / 0.999 / 0.999 | 0.00 / 0.00 | 48.6 | 51% | 0% | 0.01 | 0.97 | 26046 | 22390 | 0.00 | 0 | 4080 | 23% |
| 9 | v3.5 free | 33.5 | 0.0% | 1.00 | 16.9 | 15.5 | 0.980 / 0.981 / 0.955 | 0.31 / 0.79 | 48.2 | 41% | 69% | 0.00 | 0.97 | 7919 | 809 | 0.00 | 9533 | 4080 | 22% |
| 9 | v3.5 save | 31.6 | 0.0% | 1.00 | 17.1 | 16.5 | 1.000 / 0.973 / 0.948 | 0.00 / 0.91 | 48.2 | 50% | 78% | 0.01 | 0.97 | 7582 | 857 | 0.00 | 9360 | 4080 | 23% |
| 9 | v3.5 save+tea | 31.5 | 0.0% | 1.00 | 16.0 | 16.6 | 0.999 / 0.977 / 0.927 | 0.00 / 1.26 | 48.2 | 51% | 78% | 0.01 | 0.97 | 8139 | 859 | 0.00 | 8549 | 4080 | 22% |

### 7.10 Boss fights by realm

| realm | acc | no spells | free | save | save+tea | length target (q) |
|---|---|---|---|---|---|---|
| 1 | 75% | 1.00 / 20.4 / 0.00 / 21% | 1.00 / 20.4 / 0.00 / 21% | 1.00 / 20.4 / 0.00 / 21% | 1.00 / 20.4 / 0.00 / 21% | 18-25 (location), 22-30 (realm) |
| 1 | 50% | 1.00 / 26.9 / 0.00 / 44% | 1.00 / 26.9 / 0.00 / 44% | 1.00 / 26.9 / 0.00 / 44% | 1.00 / 26.9 / 0.00 / 44% | 18-25 (location), 22-30 (realm) |
| 2 | 75% | 1.00 / 21.5 / 0.00 / 23% | 1.00 / 19.4 / 0.88 / 24% | 1.00 / 19.3 / 0.94 / 24% | 1.00 / 19.2 / 0.98 / 24% | 18-25 (location), 22-30 (realm) |
| 2 | 50% | 1.00 / 27.9 / 0.00 / 48% | 1.00 / 27.2 / 0.27 / 48% | 1.00 / 27.1 / 0.29 / 48% | 1.00 / 27.0 / 0.29 / 48% | 18-25 (location), 22-30 (realm) |
| 3 | 75% | 1.00 / 21.8 / 0.00 / 32% | 1.00 / 17.5 / 2.06 / 31% | 1.00 / 17.3 / 2.24 / 32% | 1.00 / 17.3 / 2.26 / 31% | 18-25 (location), 22-30 (realm) |
| 3 | 50% | 0.93 / 28.6 / 0.00 / 56% | 0.98 / 23.2 / 1.57 / 51% | 0.98 / 23.5 / 1.63 / 53% | 0.98 / 23.5 / 1.62 / 53% | 18-25 (location), 22-30 (realm) |
| 4 | 75% | 1.00 / 22.0 / 0.00 / 30% | 1.00 / 18.1 / 2.39 / 29% | 1.00 / 17.7 / 2.51 / 29% | 1.00 / 17.7 / 2.51 / 29% | 18-25 (location), 22-30 (realm) |
| 4 | 50% | 0.82 / 27.5 / 0.00 / 74% | 0.85 / 23.4 / 1.97 / 74% | 0.82 / 23.1 / 1.97 / 78% | 0.82 / 23.1 / 1.98 / 78% | 18-25 (location), 22-30 (realm) |
| 5 | 75% | 1.00 / 23.6 / 0.00 / 32% | 1.00 / 22.4 / 2.36 / 33% | 1.00 / 21.8 / 2.52 / 34% | 1.00 / 21.8 / 2.47 / 35% | 18-25 (location), 22-30 (realm) |
| 5 | 50% | 0.78 / 28.6 / 0.00 / 75% | 0.78 / 28.1 / 0.48 / 76% | 0.77 / 27.8 / 0.48 / 75% | 0.76 / 27.8 / 0.49 / 75% | 18-25 (location), 22-30 (realm) |
| 6 | 75% | 1.00 / 22.5 / 0.00 / 33% | 1.00 / 21.3 / 1.86 / 32% | 1.00 / 21.4 / 2.04 / 35% | 1.00 / 21.8 / 1.86 / 33% | 18-25 (location), 22-30 (realm) |
| 6 | 50% | 0.82 / 27.6 / 0.00 / 72% | 0.80 / 27.1 / 0.35 / 73% | 0.80 / 27.5 / 0.34 / 71% | 0.79 / 27.3 / 0.34 / 72% | 18-25 (location), 22-30 (realm) |
| 7 | 75% | 1.00 / 23.7 / 0.00 / 34% | 1.00 / 20.5 / 1.99 / 31% | 1.00 / 20.2 / 2.11 / 33% | 1.00 / 20.5 / 2.22 / 34% | 18-25 (location), 22-30 (realm) |
| 7 | 50% | 0.70 / 27.3 / 0.00 / 82% | 0.69 / 26.3 / 0.58 / 85% | 0.72 / 26.5 / 0.65 / 83% | 0.71 / 26.4 / 0.68 / 84% | 18-25 (location), 22-30 (realm) |
| 8 | 75% | 1.00 / 23.6 / 0.00 / 34% | 1.00 / 20.3 / 1.94 / 33% | 1.00 / 19.9 / 2.07 / 33% | 1.00 / 20.6 / 2.12 / 34% | 18-25 (location), 22-30 (realm) |
| 8 | 50% | 0.75 / 27.0 / 0.00 / 78% | 0.71 / 27.1 / 0.49 / 82% | 0.68 / 26.4 / 0.52 / 83% | 0.70 / 26.5 / 0.48 / 82% | 18-25 (location), 22-30 (realm) |
| 9 | 75% | 1.00 / 23.1 / 0.00 / 33% | 1.00 / 20.4 / 0.92 / 30% | 1.00 / 19.8 / 1.01 / 31% | 1.00 / 19.7 / 1.12 / 28% | 18-25 (location), 22-30 (realm) |
| 9 | 50% | 0.74 / 28.2 / 0.00 / 77% | 0.70 / 27.3 / 0.39 / 82% | 0.71 / 27.7 / 0.35 / 81% | 0.68 / 27.2 / 0.36 / 82% | 18-25 (location), 22-30 (realm) |

### 7.11 Gold and MP timeline

| realm | no spells: gold at end | free: gold at end | save: gold at end | save+tea: gold at end | save: spells owned | free / save / save+tea: MP at battle start | free / save / save+tea: MP at boss start | save+tea: teas bought / drunk, tea gold | save: spell spend | save: gear spend |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 745 | 745 | 745 | 745 | 0.0 | 100% / 100% / 100% | 100% / 100% / 100% | 0.00 / 0.00, 0 | 0 | 35 |
| 2 | 1656 | 939 | 928 | 931 | 1.0 | 80% / 87% / 87% | 90% / 94% / 97% | 0.00 / 0.31, 0 | 734 | 288 |
| 3 | 3138 | 1237 | 1198 | 1235 | 1.7 | 58% / 89% / 89% | 91% / 98% / 99% | 0.05 / 0.25, 5 | 873 | 528 |
| 4 | 6533 | 2382 | 2314 | 2356 | 2.7 | 60% / 88% / 88% | 91% / 98% / 98% | 0.01 / 0.31, 1 | 2340 | 912 |
| 5 | 9286 | 4570 | 4519 | 4315 | 3.0 | 64% / 90% / 90% | 92% / 99% / 100% | 1.12 / 0.21, 605 | 972 | 1560 |
| 6 | 12985 | 4451 | 4645 | 4093 | 3.7 | 63% / 93% / 93% | 95% / 100% / 100% | 0.09 / 0.14, 63 | 3024 | 2160 |
| 7 | 17532 | 5383 | 5497 | 7104 | 4.4 | 64% / 72% / 73% | 93% / 98% / 100% | 0.71 / 1.04, 572 | 3420 | 2760 |
| 8 | 22320 | 8431 | 8158 | 6812 | 4.8 | 65% / 70% / 70% | 93% / 96% / 100% | 0.89 / 0.97, 838 | 2911 | 3360 |
| 9 | 26984 | 4494 | 3955 | 3564 | 5.7 | 64% / 73% / 73% | 91% / 95% / 100% | 0.78 / 0.97, 842 | 8861 | 4080 |

Spell timelines (save style):

75% saver:

| spell | town | sold from (h) | first affordable (realm, h) | bought by % of runs | bought (realm, h, battle #) |
|---|---|---|---|---|---|
| 小火球术 Small Fireball | 2 | 2.1 | 2, 2.3 | 100% | 2, 3.3, 82 |
| 泡泡术 Bubble Spell | 2 | 2.1 | 2, 2.3 | 3% | 2, 3.7, 94 |
| 雪球术 Snowball Volley | 3 | 3.7 | 3, 4.4 | 0% | - |
| 小闪电术 Little Lightning | 3 | 3.7 | 3, 4.7 | 65% | 3, 5.4, 128 |
| 火球术 Fireball | 4 | 5.4 | 4, 6.5 | 4% | 4, 7.9, 178 |
| 旋风术 Whirlwind | 4 | 5.4 | 4, 6.6 | 99% | 4, 7.5, 168 |
| 雪花术 Snowflake Dance | 5 | 7.8 | 5, 9.0 | 30% | 5, 9.4, 206 |
| 闪电术 Lightning Bolt | 5 | 7.8 | 5, 8.7 | 0% | - |
| 阳光术 Sunbeam | 6 | 9.5 | 6, 9.8 | 0% | - |
| 大火球术 Big Fireball | 6 | 9.5 | 6, 9.8 | 75% | 6, 11.0, 232 |
| 暴风雪术 Blizzard | 7 | 11.4 | 7, 12.6 | 63% | 7, 13.5, 271 |
| 龙卷风术 Tornado | 7 | 11.4 | 7, 11.8 | 0% | - |
| 流星术 Meteor | 8 | 13.6 | 8, 14.1 | 0% | - |
| 雷雨术 Thunderstorm | 8 | 13.6 | 8, 15.0 | 42% | 8, 15.4, 301 |
| 超暴风雪术 Super Blizzard | 9 | 15.7 | 9, 17.0 | 95% | 9, 17.0, 329 |
| 流星雨术 Meteor Shower | 9 | 15.7 | 9, 16.6 | 0% | - |

75% spender:

| spell | town | sold from (h) | first affordable (realm, h) | bought by % of runs | bought (realm, h, battle #) |
|---|---|---|---|---|---|
| 小火球术 Small Fireball | 2 | 1.5 | 2, 2.4 | 1% | 2, 2.7, 55 |
| 泡泡术 Bubble Spell | 2 | 1.5 | 2, 1.7 | 0% | - |
| 雪球术 Snowball Volley | 3 | 2.5 | 3, 2.9 | 0% | - |
| 小闪电术 Little Lightning | 3 | 2.5 | 3, 3.5 | 0% | - |
| 火球术 Fireball | 4 | 3.7 | 4, 4.1 | 0% | - |
| 旋风术 Whirlwind | 4 | 3.7 | 4, 4.7 | 97% | 4, 5.5, 108 |
| 雪花术 Snowflake Dance | 5 | 5.6 | 5, 6.8 | 2% | 5, 6.8, 132 |
| 闪电术 Lightning Bolt | 5 | 5.6 | 5, 6.6 | 0% | - |
| 阳光术 Sunbeam | 6 | 6.9 | 6, 7.1 | 0% | - |
| 大火球术 Big Fireball | 6 | 6.9 | 6, 7.7 | 13% | 6, 8.4, 154 |
| 暴风雪术 Blizzard | 7 | 8.3 | 7, 8.5 | 13% | 7, 9.9, 176 |
| 龙卷风术 Tornado | 7 | 8.3 | 7, 8.5 | 0% | - |
| 流星术 Meteor | 8 | 9.8 | 8, 10.1 | 0% | - |
| 雷雨术 Thunderstorm | 8 | 9.8 | 8, 10.1 | 6% | 8, 11.2, 198 |
| 超暴风雪术 Super Blizzard | 9 | 11.3 | 9, 11.5 | 79% | 9, 12.1, 210 |
| 流星雨术 Meteor Shower | 9 | 11.3 | 9, 11.5 | 0% | - |

90% saver:

| spell | town | sold from (h) | first affordable (realm, h) | bought by % of runs | bought (realm, h, battle #) |
|---|---|---|---|---|---|
| 小火球术 Small Fireball | 2 | 1.7 | 2, 1.9 | 100% | 2, 2.8, 76 |
| 泡泡术 Bubble Spell | 2 | 1.7 | 2, 1.9 | 22% | 2, 3.1, 89 |
| 雪球术 Snowball Volley | 3 | 3.1 | 3, 3.6 | 0% | - |
| 小闪电术 Little Lightning | 3 | 3.1 | 3, 3.9 | 82% | 3, 4.5, 120 |
| 火球术 Fireball | 4 | 4.5 | 4, 5.4 | 11% | 4, 6.5, 167 |
| 旋风术 Whirlwind | 4 | 4.5 | 4, 5.5 | 100% | 4, 6.2, 157 |
| 雪花术 Snowflake Dance | 5 | 6.5 | 5, 7.4 | 49% | 5, 7.9, 196 |
| 闪电术 Lightning Bolt | 5 | 6.5 | 5, 6.9 | 0% | - |
| 阳光术 Sunbeam | 6 | 7.9 | 6, 8.4 | 0% | - |
| 大火球术 Big Fireball | 6 | 7.9 | 6, 8.4 | 63% | 6, 9.1, 217 |
| 暴风雪术 Blizzard | 7 | 9.5 | 7, 9.8 | 91% | 7, 11.0, 251 |
| 龙卷风术 Tornado | 7 | 9.5 | 7, 9.7 | 0% | - |
| 流星术 Meteor | 8 | 11.3 | 8, 11.7 | 0% | - |
| 雷雨术 Thunderstorm | 8 | 11.3 | 8, 12.2 | 68% | 8, 12.9, 291 |
| 超暴风雪术 Super Blizzard | 9 | 13.0 | 9, 14.3 | 100% | 9, 14.3, 317 |
| 流星雨术 Meteor Shower | 9 | 13.0 | 9, 14.2 | 0% | - |

65% saver:

| spell | town | sold from (h) | first affordable (realm, h) | bought by % of runs | bought (realm, h, battle #) |
|---|---|---|---|---|---|
| 小火球术 Small Fireball | 2 | 2.4 | 2, 2.7 | 100% | 2, 3.9, 89 |
| 泡泡术 Bubble Spell | 2 | 2.4 | 2, 2.6 | 1% | 2, 4.2, 96 |
| 雪球术 Snowball Volley | 3 | 4.2 | 3, 5.2 | 0% | - |
| 小闪电术 Little Lightning | 3 | 4.2 | 3, 5.6 | 19% | 3, 6.3, 138 |
| 火球术 Fireball | 4 | 6.2 | 4, 6.5 | 0% | - |
| 旋风术 Whirlwind | 4 | 6.2 | 4, 7.3 | 87% | 4, 8.4, 175 |
| 雪花术 Snowflake Dance | 5 | 9.0 | 5, 10.3 | 15% | 5, 10.9, 222 |
| 闪电术 Lightning Bolt | 5 | 9.0 | 5, 9.5 | 0% | - |
| 阳光术 Sunbeam | 6 | 10.9 | 6, 11.2 | 0% | - |
| 大火球术 Big Fireball | 6 | 10.9 | 6, 11.2 | 73% | 6, 12.8, 252 |
| 暴风雪术 Blizzard | 7 | 13.0 | 7, 14.9 | 11% | 7, 15.4, 288 |
| 龙卷风术 Tornado | 7 | 13.0 | 7, 14.5 | 0% | - |
| 流星术 Meteor | 8 | 15.6 | 8, 15.9 | 0% | - |
| 雷雨术 Thunderstorm | 8 | 15.6 | 8, 16.0 | 33% | 8, 18.1, 329 |
| 超暴风雪术 Super Blizzard | 9 | 18.1 | 9, 18.4 | 75% | 9, 19.4, 347 |
| 流星雨术 Meteor Shower | 9 | 18.1 | 9, 18.5 | 0% | - |

50% saver:

| spell | town | sold from (h) | first affordable (realm, h) | bought by % of runs | bought (realm, h, battle #) |
|---|---|---|---|---|---|
| 小火球术 Small Fireball | 2 | 3.1 | 2, 4.0 | 79% | 2, 5.3, 113 |
| 泡泡术 Bubble Spell | 2 | 3.1 | 2, 3.3 | 0% | - |
| 雪球术 Snowball Volley | 3 | 5.4 | 3, 7.4 | 0% | - |
| 小闪电术 Little Lightning | 3 | 5.4 | 3, 7.9 | 1% | 3, 8.0, 155 |
| 火球术 Fireball | 4 | 8.0 | 4, 10.0 | 0% | - |
| 旋风术 Whirlwind | 4 | 8.0 | 4, 10.5 | 1% | 4, 11.5, 212 |
| 雪花术 Snowflake Dance | 5 | 11.8 | 6, 14.5 | 0% | - |
| 闪电术 Lightning Bolt | 5 | 11.8 | 5, 13.5 | 0% | - |
| 阳光术 Sunbeam | 6 | 14.3 | 6, 16.4 | 0% | - |
| 大火球术 Big Fireball | 6 | 14.3 | 6, 17.0 | 0% | - |
| 暴风雪术 Blizzard | 7 | 17.2 | 8, 23.3 | 0% | - |
| 龙卷风术 Tornado | 7 | 17.2 | 7, 19.2 | 0% | - |
| 流星术 Meteor | 8 | 20.7 | 9, 23.8 | 0% | - |
| 雷雨术 Thunderstorm | 8 | 20.7 | 9, 26.1 | 0% | - |
| 超暴风雪术 Super Blizzard | 9 | 24.0 | - | 0% | - |
| 流星雨术 Meteor Shower | 9 | 24.0 | - | 0% | - |

| spell | town | price | = normal kills at that town | that town's quests pay | kills if all quests done | normal fights | minutes at realm pace |
|---|---|---|---|---|---|---|---|
| 小火球术 Small Fireball | 2 | 720 | 60 | 324 | 33 | 31 | 76 |
| 泡泡术 Bubble Spell | 2 | 540 | 45 | 324 | 18 | 23 | 57 |
| 雪球术 Snowball Volley | 3 | 1080 | 60 | 504 | 32 | 25 | 71 |
| 小闪电术 Little Lightning | 3 | 1350 | 75 | 504 | 47 | 31 | 88 |
| 火球术 Fireball | 4 | 1890 | 70 | 756 | 42 | 24 | 74 |
| 旋风术 Whirlwind | 4 | 2295 | 85 | 756 | 57 | 29 | 90 |
| 雪花术 Snowflake Dance | 5 | 3240 | 90 | 1026 | 62 | 30 | 96 |
| 闪电术 Lightning Bolt | 5 | 2700 | 75 | 1026 | 46 | 25 | 80 |
| 阳光术 Sunbeam | 6 | 3600 | 80 | 1296 | 51 | 23 | 84 |
| 大火球术 Big Fireball | 6 | 4050 | 90 | 1296 | 61 | 26 | 95 |
| 暴风雪术 Blizzard | 7 | 5400 | 100 | 1566 | 71 | 29 | 111 |
| 龙卷风术 Tornado | 7 | 4590 | 85 | 1566 | 56 | 25 | 94 |
| 流星术 Meteor | 8 | 5670 | 90 | 1836 | 61 | 26 | 95 |
| 雷雨术 Thunderstorm | 8 | 6930 | 110 | 1836 | 81 | 32 | 116 |
| 超暴风雪术 Super Blizzard | 9 | 9360 | 130 | 2106 | 101 | 38 | 136 |
| 流星雨术 Meteor Shower | 9 | 8640 | 120 | 2106 | 91 | 35 | 125 |

## 8. Open questions for Jack

1. **Saving payoff:** in the sim, saving MP helps only a little, because answers and inn visits refill MP. Is that enough? Options for a bigger payoff without caps:
   - (a) put boss gates far from the inn (savers then lose 23% vs 27% HP per boss);
   - (b) a "Full MP charge": start an elite or boss battle at full MP and your first spell hits ×1.5 (not yet simulated; it would shorten bosses by about 1 more question);
   - (c) answer regen stops at half the MP bar (tested: little effect early, because Heal + Shield need 20 MP).
2. **MP costs 1.25 × v3.4** (2 single-target casts from full): OK? It's the knob if playtests show bosses too short (realms 3–4 are at about 17.5 questions) or spells too rare.
3. **Town names** are placeholders. **Town 1's shop** (Mana Tea only, or a teaser spell?). **Elements** (cosmetic, or weaknesses?).
4. **First-spell price:** realm-1 savings still cover 小火球术 on arrival in town 2.
5. **Quests:** one-time or repeatable? Should the words quest count earlier realms' words?

**Closed in v3.5:**
- the Magic Ward (removed);
- the cast cap and unlock (removed);
- a magic stat (none);
- MP costs and tea prices (tea unchanged; costs ×1.25 because the caps are gone);
- Super Blizzard's Freeze (1 turn, not bosses);
- cast animation (2–3 s, skippable).
