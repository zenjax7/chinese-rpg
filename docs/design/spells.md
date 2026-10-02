# Magic spells and quests: design and sim (v3.4)

For Jack (via Director). Revised 2026-10-02 (PT) for Jack's new rule: **casting a spell is a free action**. It skips that turn's question and can't fizzle. The short spec version is in `combat-spec.md` §6.7 (Spells) and §7.11 (Quests). The v3.3 version of this document (cast = question) is kept as `build/v3/archive_v3_3/spells_v3_3.md`.

Files:
- **Data:**
  - `data/spells.csv` / `.json` (16 spells)
  - `data/spell_falloff.csv`, `data/spell_mp_check.csv`, `data/mp_potions.csv`, `data/cast_rule.csv`
  - `data/spells_full.json` (rules, tiers, HSK notes)
  - `data/quests.csv` / `.json`, `data/quests_full.json`
  - All generated from `build/v3/spells_data.py`.
- **Sim:** `build/spells_sim.py` + `build/spells_runner.py` → `build/v3/sim/v3_spells.txt` and `data/sim/sim_spells_*.csv`.

## 1. Summary

- **Free casts, fixed power.** A spell uses the hero's turn but asks no question. Its damage is a fixed power number minus the enemy's full DEF; it doesn't grow with ATK, gear or level. Normal-enemy HP grows from 27 (realm 2) to 73 (realm 9), so every spell starts at 1.5–2× a plain attack in its own realm and drops to or below a plain attack 2–3 realms later. 小火球术 does 67% of a normal enemy's HP in realm 2 and 15% in realm 9.
- **Significant MP.** Each spell costs 33–48% of the MP pool at the recommended level of the realm where it's sold. From a full bar that's **2.1–3.0 casts**, or about 1–1.7 if the kid keeps 12 MP for Heal. MP growth (10 + 2 × level) is unchanged; it already fits.
- **Cast rule (anti-dodge):**
  - **1 cast per normal or elite battle, 2 per boss battle** (the 2nd at least 12 questions after the 1st).
  - The Spellbook **unlocks only after 3 correct answers in that battle.**
  - In the sim, 92.5–100% of all turns are still questions in every realm, profile and battle type (95.5–98.6% across the game), and at most 9.6% of hero turns are casts.
- **Expensive MP potions, map-only.** Mana Tea 魔力茶 (+50% MP) costs 6 × G = 6 normal kills (was 1 × G). Big Mana Tea 大魔力茶 (full MP, from town 5) costs 15 × G = 15 kills. Neither can be drunk in battle, so they never replace a question.
- **Magic Ward: drop it. Streak bonus: keep it off.** Reasons in §5.
- **Learning is unaffected.** Total play time, minutes per location and words proficient at realm end match the no-spell game (savers +0.1 h; spenders ±2 min per location, where v3.3 cut them by up to 6 min). Defeat and boss first-try win rates don't change.
- **Prices and quests are unchanged.** The words quest's Mana Tea reward is now worth 6 × G.

## 2. Rules

| rule | v3.4 |
|---|---|
| Shop | A magic shop 魔法店 in every town. Towns 2–9 sell 2 spells each. Town 1 sells Mana Tea only. Price = price_G × G(town), 45–130 × G (unchanged). |
| Ownership | Permanent. Spellbook 魔法书 tab inside ✨ 技能 Skills. No skill slot; the battle keeps its 4 commands. |
| Cast | **Free action:** uses the hero turn, **no question, no fizzle**. MP is always spent. That turn gives no MP regen and leaves the streak unchanged (no +1, no reset). The enemies' block questions that round are asked as usual. |
| Cast rule | **1 per normal or elite battle; 2 per boss battle** (the 2nd needs at least 12 more questions after the 1st). The Spellbook **unlocks after 3 correct answers in that battle** (a "magic charge" meter fills with each correct answer). No back-to-back casts follow automatically. |
| Damage | `max(1, round(P × (Tired ? 1.5 : 1) − DEF_e))`. P is the spell's fixed power. **Full** enemy DEF is subtracted (attacks subtract 0.5 × DEF). No streak, spoken or gear bonus. |
| Design rule | `P = round(F × HP_normal(t) + DEF(t))`, where F is the share of a normal enemy's HP the spell removes in its own realm t. `MP = round(K × MP_pool(t))`, with `MP_pool = 10 + 2 × L_rec(t)`. |
| Targets | single / same type (every enemy of the tapped enemy's kind; a boss is its own kind) / all on screen; always max 3. |
| Statuses | Soaked (next attack ×0.5); Dazed / Chilled (chance to skip the next attack); Frozen (skips it). Bosses get half the chance. |
| MP potions | Mana Tea 6 × G (+50% MP); Big Mana Tea 15 × G (full MP, town 5+). **Map only.** |
| Magic Ward | **Dropped** (was ×0.5 spell damage in boss battles). |
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

| town | spell (简 / 繁 / English) | price (G → gold) | power P | MP | casts from full MP | dmg vs normal enemy, own tier → t9 | target | element | status |
|---|---|---|---|---|---|---|---|---|---|
| 2 蜂蜜镇 | **小火球术** / 小火球術 / Small Fireball | 60 G → 720 | 20 | 7 | 2.6 | 67% → 15% | single | fire | – |
| 2 蜂蜜镇 | **泡泡术** / 泡泡術 / Bubble Spell | 45 G → 540 | 11 | 6 | 3.0 | 33% → 3% | single | water | Soaked: the target's next attack does half damage |
| 3 十字路口集市 | **雪球术** / 雪球術 / Snowball Volley | 60 G → 1,080 | 15 | 9 | 2.4 | 39% → 8% | same type | ice | – |
| 3 十字路口集市 | **小闪电术** / 小閃電術 / Little Lightning | 75 G → 1,350 | 25 | 9 | 2.4 | 71% → 22% | single | thunder | Dazed: 25% chance the target skips its next attack (bosses 12.5%) |
| 4 矿工营地 | **火球术** / 火球術 / Fireball | 70 G → 1,890 | 31 | 11 | 2.5 | 75% → 30% | single | fire | – |
| 4 矿工营地 | **旋风术** / 旋風術 / Whirlwind | 85 G → 2,295 | 20 | 13 | 2.2 | 44% → 15% | same type | wind | – |
| 5 芦苇村 | **雪花术** / 雪花術 / Snowflake Dance | 90 G → 3,240 | 21 | 15 | 2.3 | 35% → 16% | all (max 3) | ice | – |
| 5 芦苇村 | **闪电术** / 閃電術 / Lightning Bolt | 75 G → 2,700 | 40 | 14 | 2.4 | 76% → 42% | single | thunder | Dazed: 30% chance the target skips its next attack (bosses 15%) |
| 6 晨光小镇 | **阳光术** / 陽光術 / Sunbeam | 80 G → 3,600 | 30 | 18 | 2.2 | 50% → 29% | same type | light | – |
| 6 晨光小镇 | **大火球术** / 大火球術 / Big Fireball | 90 G → 4,050 | 47 | 16 | 2.5 | 85% → 52% | single | fire | – |
| 7 云岭镇 | **暴风雪术** / 暴風雪術 / Blizzard | 100 G → 5,400 | 30 | 21 | 2.2 | 40% → 29% | all (max 3) | ice | Chilled: each target 30% chance to skip its next attack (bosses 15%) |
| 7 云岭镇 | **龙卷风术** / 龍捲風術 / Tornado | 85 G → 4,590 | 38 | 21 | 2.2 | 54% → 40% | same type | wind | – |
| 8 角斗场镇 | **流星术** / 流星術 / Meteor | 90 G → 5,670 | 69 | 21 | 2.5 | 95% → 82% | single | star | – |
| 8 角斗场镇 | **雷雨术** / 雷雨術 / Thunderstorm | 110 G → 6,930 | 37 | 23 | 2.3 | 45% → 38% | all (max 3) | thunder | Dazed: each target 30% chance to skip its next attack (bosses 15%) |
| 9 灯火营地 | **超暴风雪术** / 超暴風雪術 / Super Blizzard | 130 G → 9,360 | 42 | 28 | 2.1 | 45% → 45% | all (max 3) | ice | Frozen: every target skips its next attack (bosses 50% chance) |
| 9 灯火营地 | **流星雨术** / 流星雨術 / Meteor Shower | 120 G → 8,640 | 49 | 28 | 2.1 | 55% → 55% | all (max 3) | star | – |

How F (damage share) and K (MP share) were set:
- **Single target:** F 0.65 → 0.95 over the game (Bubble Spell 0.35, plus Soaked).
- **Same type:** F 0.40 → 0.55.
- **All on screen:** F 0.35 → 0.55.
- **MP:** K = 0.40 for single target, 0.45 for crowd spells, 0.48 for the two realm-9 spells, and 0.33 for Bubble Spell.

The crowd spells deal less per target but hit up to 3 enemies, so one cast is worth about 1.0–1.6 normal enemies.

### 3.1 Fall-off: damage as % of a typical normal enemy's HP

At the recommended level and gear for each tier. The "plain attack" row is the hero's attack with no streak; with a streak it goes up to ×2.0.

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

**Reading the table:**
- Every spell starts well above a plain attack in its own realm.
- It falls to about a plain attack 2–3 realms later. For example, 小火球术 is 67% in realm 2 and 44% in realm 4, while a plain attack there is 44%.
- By realm 9, the early spells do 3–22%.
- Fall-off comes from two things: enemy HP grows 2.7× from realm 2 to 9, and spells subtract full DEF.
- Gear raises ATK, so plain attacks keep up while old spells don't. Spells don't use gear, which also makes them a little more useful when a kid is a tier behind on gear.
- Against bosses, the strongest owned spell does 11–14% of a realm boss's HP from tier 3 on (29% at tier 2).

### 3.2 MP check per tier

| tier | rec_level | mp_pool | spells_sold_mp | casts_from_full | casts_keeping_heal_12 | casts_at_level_plus_3 | top_spell_pct_of_realm_boss_hp |
|---|---|---|---|---|---|---|---|
| 1 | 2 | 14 | – | – | – | – | – |
| 2 | 4 | 18 | 小火球术 7, 泡泡术 6 | 2.6 | 0.9 | 3.4 | 29% |
| 3 | 6 | 22 | 雪球术 9, 小闪电术 9 | 2.4 | 1.1 | 3.1 | 14% |
| 4 | 9 | 28 | 火球术 11, 旋风术 13 | 2.2 | 1.2 | 2.6 | 14% |
| 5 | 12 | 34 | 雪花术 15, 闪电术 14 | 2.3 | 1.5 | 2.7 | 11% |
| 6 | 15 | 40 | 阳光术 18, 大火球术 16 | 2.2 | 1.6 | 2.6 | 14% |
| 7 | 18 | 46 | 暴风雪术 21, 龙卷风术 21 | 2.2 | 1.6 | 2.5 | 12% |
| 8 | 21 | 52 | 流星术 21, 雷雨术 23 | 2.3 | 1.7 | 2.5 | 13% |
| 9 | 24 | 58 | 超暴风雪术 28, 流星雨术 28 | 2.1 | 1.6 | 2.3 | 13% |

- **From full MP: 2.1–3.0 casts** of that town's spells at the recommended level. A kid 3 levels over still gets only 2.3–3.4, so **MP growth stays at 10 + 2L**; no change needed.
- **Keeping Heal's 12 MP** leaves room for only 1–1.7 casts.
- **Regen (+1 per correct answer) still feeds spells.** At 75% accuracy, a normal battle gives about 9–15 MP back. With the 1-cast cap, that's why kids still start most battles at 62–82% MP (86% without spells).
- **MP matters most in boss fights and runs of fights in realms 7–9** (64–68% MP at battle start; Mana Tea gets drunk before bosses).
- If Jack wants MP to bite harder, the simplest knob is K = 0.5 (exactly 2 casts from full).

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

Painterly, kid-safe, no gore and no burning or injured bodies. Hits are puffs, sparkles and comic reactions. Keep flashes under the flash-safety limit (no more than 3 per second, no full-screen red). New in v3.4:
- **"Magic charge" meter:** a small star by the ✨ button fills with each correct answer and glows after 3.
- **"Used" state:** the Spellbook shows a gentle "used" state after the battle's cast.

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

## 4. MP potions (expensive)

| item_id | name_zh | name_en | effect | price | price_in_normal_kills | from_town | battle_use |
|---|---|---|---|---|---|---|---|
| mana_tea | 魔力茶 | Mana Tea | +50% max MP | 6 × G | 6 | 1 | no (map only) |
| big_mana_tea | 大魔力茶 | Big Mana Tea | refills MP to full | 15 × G | 15 | 5 | no (map only) |

- **In kills:** Mana Tea = 6 normal kills at the town where it's bought; Big Mana Tea = 15.
- **Inn as comparison:** a full HP + MP refill costs 2 × G (2 kills). Add a Return Feather (1 × G) and walking back to the inn costs 3 × G.
- **So tea is the price of convenience:** you pay double to stay in the dungeon or top up before a boss.
- **Map-only:** this stops "drink, cast, drink, cast" chains and means a potion never replaces a question turn.
- **In the sim:** the 75% saver drinks about 4.6 teas per game, mostly from the words-quest rewards and before bosses, and buys almost none (0.1). Spells didn't turn tea into a must-buy.

## 5. Ward, streak, and skills

**Magic Ward: drop it (recommended).**
- In v3.3 it existed because questioned casts with ATK-scaled damage shortened boss fights by 3–5 questions. In v3.4, fixed power plus the cast cap already keep spells small against bosses.
- Without the Ward, boss fights are about 1 question shorter on average than without spells (75% saver: 21.0 vs 22.3 questions; realm by realm, 0 to −2.2). First-try wins are unchanged.
- With the Ward, kids would cast half as often on bosses (0.37 vs 0.74 casts per boss battle). A free spell doing half damage "feels broken" and is one more rule to explain.
- If realm bosses run short in playtests, lower the boss cap to 1 rather than bring back the Ward.

**No streak bonus: keep it (recommended).**
- A cast has no answer, so it can't earn the streak or spoken bonus.
- Spells don't touch the streak either way, so a cast never breaks a kid's streak.
- This keeps answering questions as the way to hit hardest: with a ×1.5–2.0 streak, a plain attack beats most spells one realm after purchase.

**Other skills:**

| existing | interaction |
|---|---|
| Attack | Still the default and most turns. Casts are 2.5–9.6% of hero turns in the sim. |
| Insight 提示 | Unchanged (MC questions only). Spells don't ask a question, so there's nothing to hint. |
| Double Strike 连击 | Attacks only. |
| Guardian Shield 守护盾 (8 MP, auto) | Unchanged. The kid model keeps 8 MP for it until it has fired. |
| Heal 治疗 (12 MP) | Still a question-type skill (answer to heal). Heals per battle fall (0.11 → 0.05 at 75%) because fights are shorter and MP goes to spells; defeat rates don't change. The Spellbook shows "MP left after the cast". |
| Frost 冰冻 / Sweep 横扫 | Attack modifiers that ask a question. They can't be combined with a spell on the same turn. Sweep (12 MP, 0.6 × ATK on all) stays the cheap crowd option once early crowd spells fall off. |
| Second Wind 再起 | Unchanged. The kid model keeps 20 MP for it in realm 9. |
| Companion team attack | Unchanged. It's also a free action, but it's earned by wrong answers (a different purpose). |
| 50% spoken cap / 4-way selection | Unchanged. Casts aren't questions, so they don't count toward either. The engine picks items and ways for all the other turns as usual. |

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
| 小火球术 Small Fireball | 2 | 720 | 60 | 324 | 33 | 31 | 74 |
| 泡泡术 Bubble Spell | 2 | 540 | 45 | 324 | 18 | 23 | 56 |
| 雪球术 Snowball Volley | 3 | 1080 | 60 | 504 | 32 | 25 | 69 |
| 小闪电术 Little Lightning | 3 | 1350 | 75 | 504 | 47 | 31 | 86 |
| 火球术 Fireball | 4 | 1890 | 70 | 756 | 42 | 24 | 73 |
| 旋风术 Whirlwind | 4 | 2295 | 85 | 756 | 57 | 29 | 89 |
| 雪花术 Snowflake Dance | 5 | 3240 | 90 | 1026 | 62 | 30 | 97 |
| 闪电术 Lightning Bolt | 5 | 2700 | 75 | 1026 | 46 | 25 | 81 |
| 阳光术 Sunbeam | 6 | 3600 | 80 | 1296 | 51 | 23 | 87 |
| 大火球术 Big Fireball | 6 | 4050 | 90 | 1296 | 61 | 26 | 98 |
| 暴风雪术 Blizzard | 7 | 5400 | 100 | 1566 | 71 | 29 | 107 |
| 龙卷风术 Tornado | 7 | 4590 | 85 | 1566 | 56 | 25 | 91 |
| 流星术 Meteor | 8 | 5670 | 90 | 1836 | 61 | 26 | 89 |
| 雷雨术 Thunderstorm | 8 | 6930 | 110 | 1836 | 81 | 32 | 109 |
| 超暴风雪术 Super Blizzard | 9 | 9360 | 130 | 2106 | 101 | 38 | 123 |
| 流星雨术 Meteor Shower | 9 | 8640 | 120 | 2106 | 91 | 35 | 114 |

(Kills = price ÷ G. Fights and minutes use the 75% saver's gold and minutes per fight in that realm.)

## 7. Sim results (v3.4)

**Model.** Same campaign sim as v3.3: realms 1–9 in a row, 150 runs per row, v3.2 learning model, gear tiers, skills, inns, potions, the Blacksmith-first nudge, and the saver/spender profiles. New in v3.4:
- free casts with the cast rule;
- fixed-power damage;
- Mana Tea at 6 × G, drunk only before bosses;
- 5 s of animation per cast in the time model.

**Rows:**
- "no spells": v3.2 rules.
- "v3.3 spells": the archived v3.3 rules (cast = question, fizzle spends MP, Ward, ATK-scaled damage).
- "v3.4 spells": the defaults.
- "v3.4 + Ward": the defaults plus the Ward.
- Cast-rule alternatives and the spell-first stress test at 75%.

**Question share** = questions ÷ (questions + casts + potion turns), so it also counts potion turns. In v3.3, casts asked a question, so its share only drops for potions.

### 7.1 Whole campaign

| acc | speech | kid | mode | playthrough h | spells owned | defeat % | boss 1st-try | boss q | normal q | question share normal / elite / boss | hero turns cast (normal) | casts per battle normal / elite / boss | heals/b | full-gear share | free inns | gold=0 | MP at battle start | Mana Tea bought / drunk per run | proficient at realm end |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 50% | on | saver | no spells | 27.0 | 0.0 | 11.5% | 0.85 | 27.7 | 21.0 | 0.972 / 0.968 / 0.976 | 0.0% | 0.00 / 0.00 / 0.00 | 0.41 | 0.95 | 0.0 | 0.00 | 92% | 0.0 / 0.0 | 23% |
| 50% | on | saver | v3.3 spells | 26.9 | 0.8 | 12.0% | 0.84 | 27.9 | 20.3 | 0.972 / 0.968 / 0.975 | 0.0% | 1.73 / 1.90 / 0.29 | 0.29 | 0.94 | 0.0 | 0.00 | 89% | 80.7 / 87.2 | 23% |
| 50% | on | saver | v3.4 spells | 27.0 | 0.8 | 11.3% | 0.84 | 27.3 | 20.8 | 0.964 / 0.962 / 0.969 | 2.5% | 0.17 / 0.18 / 0.21 | 0.38 | 0.95 | 0.0 | 0.00 | 91% | 0.0 / 0.9 | 23% |
| 50% | on | saver | v3.4 + Ward | 27.0 | 0.8 | 11.4% | 0.85 | 27.8 | 20.7 | 0.964 / 0.961 / 0.973 | 2.5% | 0.17 / 0.19 / 0.07 | 0.39 | 0.95 | 0.0 | 0.00 | 91% | 0.0 / 0.9 | 23% |
| 50% | on | spender | no spells | 18.6 | 0.0 | 25.7% | 0.65 | 25.6 | 20.8 | 0.990 / 0.993 / 0.996 | 0.0% | 0.00 / 0.00 / 0.00 | 0.58 | 0.91 | 1.8 | 0.00 | 95% | 0.0 / 0.0 | 11% |
| 50% | on | spender | v3.3 spells | 18.6 | 0.0 | 25.7% | 0.65 | 25.6 | 20.8 | 0.990 / 0.993 / 0.996 | 0.0% | 0.00 / 0.00 / 0.00 | 0.58 | 0.91 | 1.8 | 0.00 | 95% | 0.0 / 0.0 | 11% |
| 50% | on | spender | v3.4 spells | 18.6 | 0.0 | 25.7% | 0.65 | 25.6 | 20.8 | 0.990 / 0.993 / 0.996 | 0.0% | 0.00 / 0.00 / 0.00 | 0.58 | 0.91 | 1.8 | 0.00 | 95% | 0.0 / 0.0 | 11% |
| 50% | on | spender | v3.4 + Ward | 18.6 | 0.0 | 25.7% | 0.65 | 25.6 | 20.8 | 0.990 / 0.993 / 0.996 | 0.0% | 0.00 / 0.00 / 0.00 | 0.58 | 0.91 | 1.8 | 0.00 | 95% | 0.0 / 0.0 | 11% |
| 65% | on | saver | no spells | 20.4 | 0.0 | 1.3% | 0.99 | 25.4 | 18.7 | 0.980 / 0.977 / 0.982 | 0.0% | 0.00 / 0.00 / 0.00 | 0.21 | 0.96 | 0.0 | 0.00 | 87% | 0.0 / 0.0 | 23% |
| 65% | on | saver | v3.3 spells | 20.3 | 3.9 | 1.3% | 0.99 | 25.7 | 16.5 | 0.981 / 0.975 / 0.980 | 0.0% | 1.58 / 1.94 / 0.80 | 0.08 | 0.97 | 0.0 | 0.00 | 81% | 168.0 / 176.4 | 23% |
| 65% | on | saver | v3.4 spells | 20.5 | 4.2 | 0.9% | 0.99 | 24.0 | 17.8 | 0.956 / 0.959 / 0.956 | 7.9% | 0.48 / 0.44 / 0.64 | 0.13 | 0.97 | 0.0 | 0.00 | 82% | 0.0 / 2.5 | 23% |
| 65% | on | saver | v3.4 + Ward | 20.6 | 4.2 | 1.0% | 0.99 | 25.3 | 17.9 | 0.955 / 0.958 / 0.970 | 7.9% | 0.48 / 0.45 / 0.29 | 0.14 | 0.96 | 0.0 | 0.00 | 82% | 0.0 / 2.6 | 23% |
| 65% | on | spender | no spells | 14.2 | 0.0 | 4.7% | 0.91 | 24.7 | 18.8 | 0.988 / 0.989 / 0.995 | 0.0% | 0.00 / 0.00 / 0.00 | 0.28 | 0.96 | 0.1 | 0.00 | 89% | 0.0 / 0.0 | 11% |
| 65% | on | spender | v3.3 spells | 13.9 | 0.6 | 4.1% | 0.91 | 24.8 | 18.2 | 0.988 / 0.987 / 0.994 | 0.0% | 0.22 / 0.26 / 0.17 | 0.23 | 0.96 | 0.2 | 0.00 | 87% | 0.0 / 0.9 | 11% |
| 65% | on | spender | v3.4 spells | 14.2 | 0.6 | 4.6% | 0.91 | 24.6 | 18.7 | 0.984 / 0.986 / 0.991 | 1.3% | 0.08 / 0.07 / 0.09 | 0.27 | 0.96 | 0.2 | 0.00 | 89% | 0.0 / 0.6 | 11% |
| 65% | on | spender | v3.4 + Ward | 14.2 | 0.6 | 4.5% | 0.91 | 24.8 | 18.7 | 0.984 / 0.986 / 0.994 | 1.4% | 0.09 / 0.07 / 0.03 | 0.27 | 0.96 | 0.2 | 0.00 | 89% | 0.0 / 0.6 | 11% |
| 75% | on | saver | no spells | 17.7 | 0.0 | 0.1% | 1.00 | 22.3 | 16.8 | 0.989 / 0.986 / 0.992 | 0.0% | 0.00 / 0.00 / 0.00 | 0.11 | 0.96 | 0.0 | 0.00 | 86% | 0.0 / 0.0 | 23% |
| 75% | on | saver | v3.3 spells | 17.6 | 5.2 | 0.1% | 1.00 | 22.8 | 14.6 | 0.989 / 0.985 / 0.990 | 0.0% | 1.46 / 1.80 / 0.94 | 0.04 | 0.97 | 0.0 | 0.00 | 78% | 186.5 / 195.2 | 23% |
| 75% | on | saver | v3.4 spells | 17.8 | 5.8 | 0.0% | 1.00 | 21.0 | 15.9 | 0.959 / 0.964 / 0.959 | 9.4% | 0.50 / 0.50 / 0.74 | 0.05 | 0.96 | 0.0 | 0.00 | 74% | 0.1 / 4.6 | 23% |
| 75% | on | saver | v3.4 + Ward | 17.9 | 5.8 | 0.0% | 1.00 | 22.3 | 15.9 | 0.959 / 0.964 / 0.975 | 9.4% | 0.50 / 0.49 / 0.37 | 0.05 | 0.96 | 0.0 | 0.00 | 74% | 0.1 / 4.4 | 23% |
| 75% | on | spender | no spells | 12.8 | 0.0 | 0.4% | 0.99 | 22.1 | 17.0 | 0.989 / 0.988 / 0.995 | 0.0% | 0.00 / 0.00 / 0.00 | 0.12 | 0.96 | 0.0 | 0.00 | 86% | 0.0 / 0.0 | 12% |
| 75% | on | spender | v3.3 spells | 11.9 | 2.0 | 0.1% | 1.00 | 22.4 | 15.4 | 0.991 / 0.989 / 0.992 | 0.0% | 0.58 / 0.65 / 0.39 | 0.05 | 0.96 | 0.2 | 0.00 | 74% | 0.0 / 2.2 | 10% |
| 75% | on | spender | v3.4 spells | 12.7 | 2.1 | 0.3% | 0.99 | 21.9 | 16.7 | 0.974 / 0.980 / 0.982 | 4.8% | 0.27 / 0.18 / 0.27 | 0.10 | 0.96 | 0.2 | 0.00 | 82% | 0.0 / 2.4 | 12% |
| 75% | on | spender | v3.4 + Ward | 12.7 | 2.1 | 0.2% | 1.00 | 22.2 | 16.7 | 0.973 / 0.978 / 0.990 | 4.8% | 0.27 / 0.19 / 0.09 | 0.10 | 0.96 | 0.2 | 0.00 | 82% | 0.0 / 2.4 | 12% |
| 90% | on | saver | no spells | 14.7 | 0.0 | 0.0% | 1.00 | 17.9 | 14.0 | 0.998 / 0.998 / 0.999 | 0.0% | 0.00 / 0.00 / 0.00 | 0.02 | 0.96 | 0.0 | 0.00 | 80% | 0.0 / 0.0 | 23% |
| 90% | on | saver | v3.3 spells | 14.6 | 6.6 | 0.0% | 1.00 | 18.7 | 12.1 | 0.998 / 0.998 / 0.999 | 0.0% | 1.34 / 1.66 / 1.08 | 0.01 | 0.97 | 0.0 | 0.00 | 73% | 189.9 / 198.8 | 23% |
| 90% | on | saver | v3.4 spells | 14.9 | 7.0 | 0.0% | 1.00 | 17.1 | 13.6 | 0.967 / 0.973 / 0.961 | 9.6% | 0.44 / 0.44 / 0.70 | 0.01 | 0.96 | 0.0 | 0.00 | 62% | 0.3 / 6.9 | 23% |
| 90% | on | saver | v3.4 + Ward | 14.9 | 7.0 | 0.0% | 1.00 | 18.1 | 13.5 | 0.967 / 0.972 / 0.978 | 9.7% | 0.44 / 0.45 / 0.40 | 0.01 | 0.96 | 0.0 | 0.00 | 63% | 0.4 / 7.1 | 23% |
| 90% | on | spender | no spells | 11.1 | 0.0 | 0.0% | 1.00 | 18.0 | 14.1 | 0.998 / 0.998 / 0.999 | 0.0% | 0.00 / 0.00 / 0.00 | 0.02 | 0.96 | 0.0 | 0.00 | 81% | 0.0 / 0.0 | 13% |
| 90% | on | spender | v3.3 spells | 10.6 | 3.1 | 0.0% | 1.00 | 18.0 | 13.3 | 0.999 / 0.999 / 0.999 | 0.0% | 0.42 / 0.51 / 0.43 | 0.01 | 0.96 | 0.1 | 0.00 | 63% | 0.0 / 2.8 | 11% |
| 90% | on | spender | v3.4 spells | 11.1 | 3.1 | 0.0% | 1.00 | 17.9 | 14.0 | 0.980 / 0.986 / 0.979 | 5.4% | 0.25 / 0.22 / 0.37 | 0.02 | 0.96 | 0.1 | 0.00 | 72% | 0.0 / 3.5 | 12% |
| 90% | on | spender | v3.4 + Ward | 11.1 | 3.1 | 0.0% | 1.00 | 18.1 | 14.0 | 0.980 / 0.986 / 0.989 | 5.5% | 0.26 / 0.20 / 0.20 | 0.02 | 0.96 | 0.2 | 0.00 | 72% | 0.0 / 3.6 | 13% |
| 75% | on | saver | v3.4, 1 cast/battle, no charge | 17.8 | 6.0 | 0.0% | 1.00 | 20.7 | 15.5 | 0.953 / 0.961 / 0.960 | 10.8% | 0.58 / 0.56 / 0.70 | 0.05 | 0.97 | 0.0 | 0.00 | 74% | 0.1 / 4.0 | 23% |
| 75% | on | saver | v3.4, no cap (no back-to-back) | 17.9 | 6.2 | 0.0% | 1.00 | 19.7 | 14.9 | 0.940 / 0.948 / 0.929 | 15.4% | 0.80 / 0.83 / 1.32 | 0.03 | 0.97 | 0.0 | 0.00 | 68% | 0.7 / 6.7 | 23% |
| 75% | on | saver | v3.4, no nudge, spell-first | 18.1 | 8.4 | 1.7% | 0.96 | 23.3 | 17.3 | 0.944 / 0.944 / 0.932 | 10.7% | 0.63 / 0.64 / 1.01 | 0.14 | 0.15 | 0.0 | 0.00 | 76% | 0.0 / 3.7 | 23% |
| 75% | off | saver | no spells | 11.3 | 0.0 | 0.0% | 1.00 | 20.0 | 15.3 | 0.994 / 0.992 / 0.997 | 0.0% | 0.00 / 0.00 / 0.00 | 0.06 | 0.94 | 0.0 | 0.00 | 85% | 0.0 / 0.0 | 50% |
| 75% | off | saver | v3.4 spells | 11.3 | 2.9 | 0.0% | 1.00 | 19.6 | 15.0 | 0.974 / 0.979 / 0.977 | 6.2% | 0.31 / 0.26 / 0.40 | 0.04 | 0.94 | 0.0 | 0.00 | 77% | 0.0 / 4.0 | 50% |
| 75% | on | spender | v3.4, 1 cast/battle, no charge | 12.7 | 2.1 | 0.3% | 0.99 | 21.8 | 16.7 | 0.972 / 0.980 / 0.981 | 5.3% | 0.30 / 0.20 / 0.29 | 0.10 | 0.96 | 0.3 | 0.00 | 82% | 0.0 / 2.5 | 12% |
| 75% | on | spender | v3.4, no cap (no back-to-back) | 12.5 | 2.0 | 0.3% | 0.99 | 21.5 | 16.3 | 0.967 / 0.977 / 0.977 | 6.7% | 0.37 / 0.21 / 0.36 | 0.08 | 0.96 | 0.3 | 0.00 | 79% | 0.0 / 2.4 | 11% |
| 75% | on | spender | v3.4, no nudge, spell-first | 14.1 | 6.0 | 7.8% | 0.80 | 22.4 | 17.7 | 0.956 / 0.962 / 0.958 | 9.7% | 0.59 / 0.60 / 0.83 | 0.26 | 0.13 | 1.7 | 0.00 | 81% | 0.0 / 3.3 | 14% |
| 75% | off | spender | no spells | 11.1 | 0.0 | 0.0% | 1.00 | 20.0 | 15.3 | 0.994 / 0.992 / 0.997 | 0.0% | 0.00 / 0.00 / 0.00 | 0.06 | 0.95 | 0.0 | 0.00 | 85% | 0.0 / 0.0 | 49% |
| 75% | off | spender | v3.4 spells | 11.1 | 2.9 | 0.0% | 1.00 | 19.6 | 15.1 | 0.975 / 0.979 / 0.978 | 5.9% | 0.30 / 0.26 / 0.38 | 0.04 | 0.95 | 0.1 | 0.00 | 77% | 0.0 / 3.9 | 49% |

How to read it:
- **Question share:**
  - v3.4 keeps **95.5–98.6%** of turns as questions across the game (v3.3: 97–99.9%, no spells: 97–99.9%).
  - The lowest single value is 92.5% (50% saver, realm 3 normal battles).
  - At most 9.6% of hero turns are casts (90% saver).
- **Time and learning:**
  - Playthrough hours stay within +0.2 h of no spells for every profile. Spenders lost up to 0.9 h in v3.3; in v3.4 they don't.
  - Words proficient at realm end are identical (23% savers, 11–12% spenders).
  - Normal fights are about 0.9 questions shorter (v3.3: 2.2 shorter).
- **Win rates:** defeats and boss first-try wins are unchanged within noise.
- **Rejected cast rules:**
  - Without the 3-correct charge, casts rise to 10.8% of hero turns.
  - With no cap, they reach 15.4% and boss fights lose 2.6 questions.
- **Safety nets:** gold never hit 0, free inns match the no-spell game, and the full-gear share is 0.96 with the nudge (0.13–0.15 if kids buy spells first).

### 7.2 Per realm, 75% saver

| realm | mode | battles | defeat % | boss 1st-try | boss q | normal q | q share normal / elite / boss | casts/b normal / boss | min/location | MP at battle start | spell castable at start | heals/b | full gear | gold start | min gold | free inns | spell spend | gear spend | proficient at end |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | no spells | 52.7 | 0.0% | 1.00 | 20.4 | 11.7 | 0.999 / 0.996 / 1.000 | 0.00 / 0.00 | 41.2 | 100% | 0% | 0.00 | 0.91 | 24 | 30 | 0.00 | 0 | 35 | 25% |
| 1 | v3.3 spells | 52.7 | 0.0% | 1.00 | 20.4 | 11.7 | 0.999 / 0.996 / 1.000 | 0.00 / 0.00 | 41.2 | 100% | 0% | 0.00 | 0.91 | 24 | 30 | 0.00 | 0 | 35 | 25% |
| 1 | v3.4 spells | 52.7 | 0.0% | 1.00 | 20.4 | 11.7 | 0.999 / 0.996 / 1.000 | 0.00 / 0.00 | 41.2 | 100% | 0% | 0.00 | 0.91 | 24 | 30 | 0.00 | 0 | 35 | 25% |
| 2 | no spells | 38.6 | 0.0% | 1.00 | 21.5 | 12.5 | 0.995 / 0.995 / 0.998 | 0.00 / 0.00 | 48.2 | 88% | 0% | 0.05 | 0.97 | 782 | 518 | 0.00 | 0 | 288 | 23% |
| 2 | v3.3 spells | 39.2 | 0.0% | 1.00 | 21.5 | 12.3 | 0.994 / 0.995 / 0.999 | 0.23 / 0.05 | 48.1 | 85% | 26% | 0.04 | 0.97 | 782 | 517 | 0.00 | 724 | 288 | 23% |
| 2 | v3.4 spells | 40.1 | 0.0% | 1.00 | 19.8 | 12.0 | 0.984 / 0.980 / 0.963 | 0.13 / 0.72 | 48.1 | 82% | 23% | 0.04 | 0.98 | 782 | 517 | 0.00 | 770 | 288 | 23% |
| 3 | no spells | 35.9 | 0.0% | 1.00 | 21.8 | 15.6 | 0.993 / 0.988 / 0.993 | 0.00 / 0.00 | 52.8 | 93% | 0% | 0.10 | 0.97 | 1733 | 1260 | 0.00 | 0 | 528 | 23% |
| 3 | v3.3 spells | 40.4 | 0.0% | 1.00 | 22.7 | 13.6 | 0.994 / 0.991 / 0.991 | 1.43 / 1.17 | 52.6 | 79% | 100% | 0.02 | 0.98 | 982 | 515 | 0.00 | 216 | 528 | 23% |
| 3 | v3.4 spells | 39.3 | 0.0% | 1.00 | 19.7 | 14.2 | 0.938 / 0.944 / 0.939 | 0.87 / 1.18 | 54.0 | 76% | 97% | 0.02 | 0.97 | 985 | 512 | 0.00 | 711 | 528 | 22% |
| 4 | no spells | 46.3 | 0.1% | 1.00 | 22.0 | 17.0 | 0.985 / 0.987 / 0.993 | 0.00 / 0.00 | 48.9 | 93% | 0% | 0.11 | 0.98 | 3256 | 2462 | 0.00 | 0 | 912 | 24% |
| 4 | v3.3 spells | 48.6 | 0.1% | 1.00 | 22.8 | 16.1 | 0.985 / 0.983 / 0.990 | 2.06 / 0.88 | 48.9 | 78% | 100% | 0.03 | 0.98 | 2065 | 1285 | 0.00 | 2050 | 912 | 24% |
| 4 | v3.4 spells | 49.3 | 0.0% | 1.00 | 21.1 | 15.9 | 0.947 / 0.959 / 0.953 | 0.66 / 0.88 | 49.7 | 79% | 98% | 0.06 | 0.98 | 1716 | 923 | 0.00 | 2421 | 912 | 23% |
| 5 | no spells | 30.8 | 0.1% | 1.00 | 23.6 | 17.1 | 0.986 / 0.985 / 0.988 | 0.00 / 0.00 | 49.1 | 94% | 0% | 0.13 | 0.97 | 6691 | 5307 | 0.00 | 0 | 1560 | 24% |
| 5 | v3.3 spells | 35.1 | 0.1% | 1.00 | 25.0 | 14.7 | 0.987 / 0.982 / 0.988 | 1.94 / 0.51 | 49.0 | 76% | 100% | 0.02 | 0.97 | 2806 | 1408 | 0.00 | 583 | 1560 | 24% |
| 5 | v3.4 spells | 30.6 | 0.1% | 1.00 | 23.8 | 16.8 | 0.950 / 0.970 / 0.964 | 0.62 / 0.60 | 49.2 | 79% | 100% | 0.09 | 0.97 | 2797 | 1388 | 0.00 | 1037 | 1560 | 24% |
| 6 | no spells | 31.2 | 0.2% | 1.00 | 22.5 | 19.4 | 0.985 / 0.981 / 0.989 | 0.00 / 0.00 | 56.8 | 96% | 0% | 0.17 | 0.97 | 9460 | 7557 | 0.00 | 0 | 2160 | 22% |
| 6 | v3.3 spells | 36.8 | 0.1% | 1.00 | 23.7 | 15.9 | 0.986 / 0.980 / 0.987 | 2.06 / 1.17 | 56.1 | 77% | 100% | 0.04 | 0.97 | 4609 | 2640 | 0.00 | 3321 | 2160 | 22% |
| 6 | v3.4 spells | 30.2 | 0.1% | 1.00 | 21.4 | 19.9 | 0.944 / 0.951 / 0.952 | 0.85 / 0.86 | 57.2 | 78% | 100% | 0.14 | 0.97 | 4390 | 2381 | 0.00 | 2754 | 2160 | 22% |
| 7 | no spells | 35.1 | 0.4% | 1.00 | 23.7 | 21.2 | 0.983 / 0.978 / 0.988 | 0.00 / 0.00 | 67.4 | 74% | 0% | 0.22 | 0.97 | 13269 | 10788 | 0.00 | 0 | 2760 | 22% |
| 7 | v3.3 spells | 44.9 | 0.2% | 1.00 | 24.7 | 16.2 | 0.985 / 0.982 / 0.985 | 2.35 / 1.98 | 67.1 | 76% | 100% | 0.05 | 0.98 | 5019 | 2527 | 0.00 | 4212 | 2760 | 22% |
| 7 | v3.4 spells | 37.3 | 0.1% | 1.00 | 22.1 | 19.8 | 0.956 / 0.956 / 0.945 | 0.61 / 1.04 | 67.7 | 68% | 98% | 0.08 | 0.97 | 5165 | 2638 | 0.00 | 3276 | 2760 | 22% |
| 8 | no spells | 34.3 | 0.1% | 1.00 | 23.6 | 20.4 | 0.987 / 0.985 / 0.986 | 0.00 / 0.00 | 62.9 | 70% | 0% | 0.11 | 0.97 | 17738 | 14713 | 0.00 | 0 | 3360 | 23% |
| 8 | v3.3 spells | 44.5 | 0.2% | 1.00 | 23.4 | 15.4 | 0.985 / 0.980 / 0.983 | 2.10 / 2.11 | 62.3 | 72% | 100% | 0.03 | 0.98 | 5793 | 2616 | 0.00 | 2495 | 3360 | 23% |
| 8 | v3.4 spells | 37.2 | 0.0% | 1.00 | 20.8 | 18.5 | 0.961 / 0.962 / 0.945 | 0.57 / 0.94 | 62.7 | 66% | 91% | 0.04 | 0.97 | 6513 | 3129 | 0.00 | 3511 | 3360 | 23% |
| 9 | no spells | 32.1 | 0.1% | 1.00 | 23.1 | 20.4 | 0.990 / 0.984 / 0.987 | 0.00 / 0.00 | 58.8 | 73% | 0% | 0.15 | 0.97 | 22655 | 18976 | 0.00 | 0 | 4080 | 23% |
| 9 | v3.3 spells | 39.4 | 0.1% | 1.00 | 21.7 | 16.3 | 0.989 / 0.981 / 0.985 | 1.22 / 1.12 | 58.1 | 78% | 100% | 0.13 | 0.97 | 8879 | 739 | 0.00 | 9168 | 4080 | 22% |
| 9 | v3.4 spells | 36.7 | 0.1% | 1.00 | 20.7 | 17.7 | 0.963 / 0.962 / 0.952 | 0.50 / 0.76 | 59.1 | 64% | 92% | 0.03 | 0.97 | 8072 | 799 | 0.00 | 9235 | 4080 | 22% |

### 7.3 Per realm, 75% spender

| realm | mode | battles | defeat % | boss 1st-try | boss q | normal q | q share normal / elite / boss | casts/b normal / boss | min/location | MP at battle start | spell castable at start | heals/b | full gear | gold start | min gold | free inns | spell spend | gear spend | proficient at end |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | no spells | 33.0 | 0.0% | 1.00 | 20.5 | 11.7 | 0.998 / 0.996 / 1.000 | 0.00 / 0.00 | 29.4 | 100% | 0% | 0.00 | 0.95 | 24 | 14 | 0.01 | 0 | 35 | 13% |
| 1 | v3.3 spells | 33.0 | 0.0% | 1.00 | 20.5 | 11.7 | 0.998 / 0.996 / 1.000 | 0.00 / 0.00 | 29.4 | 100% | 0% | 0.00 | 0.95 | 24 | 14 | 0.01 | 0 | 35 | 13% |
| 1 | v3.4 spells | 33.0 | 0.0% | 1.00 | 20.5 | 11.7 | 0.998 / 0.996 / 1.000 | 0.00 / 0.00 | 29.4 | 100% | 0% | 0.00 | 0.95 | 24 | 14 | 0.01 | 0 | 35 | 13% |
| 2 | no spells | 22.0 | 0.0% | 1.00 | 21.2 | 12.5 | 0.993 / 0.995 / 0.999 | 0.00 / 0.00 | 32.2 | 87% | 0% | 0.05 | 0.95 | 584 | 317 | 0.00 | 0 | 288 | 9% |
| 2 | v3.3 spells | 22.0 | 0.0% | 1.00 | 21.2 | 12.5 | 0.993 / 0.995 / 0.999 | 0.00 / 0.00 | 32.2 | 87% | 0% | 0.05 | 0.95 | 584 | 317 | 0.00 | 10 | 288 | 9% |
| 2 | v3.4 spells | 22.0 | 0.0% | 1.00 | 21.2 | 12.5 | 0.993 / 0.995 / 0.999 | 0.00 / 0.00 | 32.2 | 87% | 0% | 0.05 | 0.95 | 584 | 317 | 0.00 | 10 | 288 | 9% |
| 3 | no spells | 22.0 | 0.0% | 1.00 | 21.1 | 15.6 | 0.992 / 0.987 / 0.995 | 0.00 / 0.00 | 36.1 | 94% | 0% | 0.10 | 0.95 | 1070 | 601 | 0.00 | 0 | 528 | 10% |
| 3 | v3.3 spells | 22.0 | 0.0% | 1.00 | 21.2 | 15.6 | 0.992 / 0.988 / 0.994 | 0.02 / 0.01 | 36.1 | 93% | 1% | 0.10 | 0.95 | 1060 | 592 | 0.00 | 0 | 528 | 10% |
| 3 | v3.4 spells | 22.0 | 0.0% | 1.00 | 21.1 | 15.6 | 0.991 / 0.987 / 0.994 | 0.01 / 0.02 | 36.1 | 93% | 1% | 0.10 | 0.95 | 1060 | 592 | 0.00 | 0 | 528 | 10% |
| 4 | no spells | 33.1 | 0.3% | 0.98 | 21.7 | 17.1 | 0.985 / 0.986 / 0.994 | 0.00 / 0.00 | 37.5 | 93% | 0% | 0.14 | 0.97 | 1898 | 1111 | 0.00 | 0 | 912 | 14% |
| 4 | v3.3 spells | 33.0 | 0.1% | 1.00 | 21.9 | 16.9 | 0.985 / 0.986 / 0.994 | 0.07 / 0.28 | 37.3 | 92% | 7% | 0.13 | 0.97 | 1886 | 1099 | 0.00 | 2203 | 912 | 13% |
| 4 | v3.4 spells | 33.0 | 0.1% | 1.00 | 21.4 | 17.0 | 0.983 / 0.984 / 0.984 | 0.03 / 0.21 | 37.3 | 92% | 7% | 0.13 | 0.97 | 1886 | 1100 | 0.00 | 2234 | 912 | 13% |
| 5 | no spells | 22.1 | 0.4% | 0.99 | 24.0 | 17.1 | 0.986 / 0.986 / 0.991 | 0.00 / 0.00 | 37.8 | 94% | 0% | 0.15 | 0.95 | 4472 | 3070 | 0.00 | 0 | 1560 | 14% |
| 5 | v3.3 spells | 22.1 | 0.2% | 0.99 | 24.9 | 15.0 | 0.990 / 0.993 / 0.990 | 0.98 / 0.37 | 34.8 | 64% | 66% | 0.05 | 0.95 | 2266 | 882 | 0.00 | 65 | 1560 | 12% |
| 5 | v3.4 spells | 22.1 | 0.5% | 0.99 | 23.9 | 17.0 | 0.955 / 0.973 / 0.973 | 0.57 / 0.46 | 38.1 | 81% | 95% | 0.12 | 0.95 | 2237 | 849 | 0.00 | 65 | 1560 | 14% |
| 6 | no spells | 22.1 | 0.5% | 0.99 | 22.1 | 19.5 | 0.986 / 0.984 / 0.994 | 0.00 / 0.00 | 43.4 | 96% | 0% | 0.18 | 0.95 | 6202 | 4315 | 0.00 | 0 | 2160 | 13% |
| 6 | v3.3 spells | 22.0 | 0.1% | 1.00 | 23.3 | 16.4 | 0.991 / 0.986 / 0.990 | 1.20 / 0.86 | 38.7 | 62% | 69% | 0.04 | 0.95 | 3727 | 1817 | 0.00 | 81 | 2160 | 10% |
| 6 | v3.4 spells | 22.1 | 0.5% | 0.99 | 22.9 | 20.2 | 0.952 / 0.976 / 0.986 | 0.71 / 0.19 | 45.2 | 83% | 98% | 0.20 | 0.95 | 3856 | 1957 | 0.00 | 459 | 2160 | 14% |
| 7 | no spells | 22.3 | 1.8% | 0.97 | 24.0 | 21.1 | 0.987 / 0.986 / 0.995 | 0.00 / 0.00 | 46.4 | 77% | 0% | 0.26 | 0.95 | 8682 | 6226 | 0.00 | 0 | 2760 | 10% |
| 7 | v3.3 spells | 22.0 | 0.1% | 1.00 | 23.9 | 17.3 | 0.988 / 0.987 / 0.989 | 1.26 / 0.74 | 40.0 | 60% | 68% | 0.04 | 0.95 | 5731 | 3259 | 0.00 | 180 | 2760 | 7% |
| 7 | v3.4 spells | 22.2 | 0.9% | 0.99 | 23.0 | 19.9 | 0.963 / 0.969 / 0.968 | 0.50 / 0.62 | 44.5 | 72% | 94% | 0.15 | 0.95 | 5876 | 3421 | 0.00 | 756 | 2760 | 9% |
| 8 | no spells | 22.1 | 0.6% | 0.99 | 22.8 | 20.5 | 0.990 / 0.986 / 0.991 | 0.00 / 0.00 | 43.8 | 72% | 0% | 0.13 | 0.95 | 10842 | 7789 | 0.00 | 0 | 3360 | 11% |
| 8 | v3.3 spells | 22.0 | 0.1% | 0.99 | 23.4 | 16.8 | 0.992 / 0.988 / 0.986 | 1.50 / 0.90 | 38.0 | 60% | 61% | 0.02 | 0.95 | 7799 | 4784 | 0.00 | 462 | 3360 | 8% |
| 8 | v3.4 spells | 22.1 | 0.4% | 0.99 | 22.0 | 19.7 | 0.966 / 0.975 / 0.966 | 0.47 / 0.55 | 42.8 | 71% | 87% | 0.08 | 0.95 | 7299 | 4259 | 0.00 | 323 | 3360 | 10% |
| 9 | no spells | 22.1 | 0.5% | 0.99 | 22.6 | 20.3 | 0.991 / 0.986 / 0.991 | 0.00 / 0.00 | 42.9 | 74% | 0% | 0.15 | 0.95 | 13082 | 9396 | 0.00 | 0 | 4080 | 12% |
| 9 | v3.3 spells | 22.0 | 0.0% | 1.00 | 22.4 | 17.4 | 0.990 / 0.988 / 0.985 | 0.81 / 0.62 | 38.2 | 64% | 82% | 0.03 | 0.95 | 9698 | 677 | 0.17 | 8486 | 4080 | 9% |
| 9 | v3.4 spells | 22.0 | 0.2% | 0.99 | 21.7 | 19.4 | 0.971 / 0.971 / 0.966 | 0.39 / 0.53 | 41.5 | 69% | 87% | 0.09 | 0.95 | 9173 | 1177 | 0.22 | 7301 | 4080 | 11% |

### 7.4 Per realm, 65% saver

| realm | mode | battles | defeat % | boss 1st-try | boss q | normal q | q share normal / elite / boss | casts/b normal / boss | min/location | MP at battle start | spell castable at start | heals/b | full gear | gold start | min gold | free inns | spell spend | gear spend | proficient at end |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | no spells | 56.3 | 0.0% | 1.00 | 22.9 | 13.0 | 0.996 / 0.990 / 0.999 | 0.00 / 0.00 | 47.2 | 100% | 0% | 0.00 | 0.92 | 24 | 29 | 0.00 | 0 | 35 | 25% |
| 1 | v3.3 spells | 56.3 | 0.0% | 1.00 | 22.9 | 13.0 | 0.996 / 0.990 / 0.999 | 0.00 / 0.00 | 47.2 | 100% | 0% | 0.00 | 0.92 | 24 | 29 | 0.00 | 0 | 35 | 25% |
| 1 | v3.4 spells | 56.3 | 0.0% | 1.00 | 22.9 | 13.0 | 0.996 / 0.990 / 0.999 | 0.00 / 0.00 | 47.2 | 100% | 0% | 0.00 | 0.92 | 24 | 29 | 0.00 | 0 | 35 | 25% |
| 2 | no spells | 41.5 | 0.0% | 1.00 | 24.2 | 13.7 | 0.991 / 0.987 / 0.996 | 0.00 / 0.00 | 54.9 | 87% | 0% | 0.09 | 0.98 | 773 | 503 | 0.00 | 0 | 288 | 23% |
| 2 | v3.3 spells | 41.9 | 0.0% | 1.00 | 24.5 | 13.5 | 0.991 / 0.986 / 0.995 | 0.19 / 0.05 | 55.0 | 85% | 21% | 0.08 | 0.98 | 773 | 503 | 0.00 | 720 | 288 | 23% |
| 2 | v3.4 spells | 42.7 | 0.0% | 1.00 | 22.2 | 13.2 | 0.983 / 0.978 / 0.966 | 0.11 / 0.70 | 54.7 | 82% | 18% | 0.07 | 0.98 | 773 | 503 | 0.00 | 724 | 288 | 22% |
| 3 | no spells | 37.9 | 0.2% | 1.00 | 25.3 | 17.7 | 0.987 / 0.979 / 0.980 | 0.00 / 0.00 | 61.5 | 94% | 0% | 0.22 | 0.97 | 1656 | 1185 | 0.00 | 0 | 528 | 23% |
| 3 | v3.3 spells | 42.7 | 0.0% | 1.00 | 25.4 | 15.3 | 0.987 / 0.980 / 0.977 | 1.49 / 1.09 | 60.5 | 82% | 100% | 0.02 | 0.98 | 905 | 432 | 0.00 | 18 | 528 | 23% |
| 3 | v3.4 spells | 41.7 | 0.0% | 1.00 | 21.5 | 15.7 | 0.936 / 0.937 / 0.930 | 0.89 / 1.23 | 61.6 | 82% | 99% | 0.06 | 0.98 | 938 | 463 | 0.00 | 225 | 528 | 22% |
| 4 | no spells | 49.4 | 1.7% | 1.00 | 25.2 | 18.9 | 0.976 / 0.979 / 0.982 | 0.00 / 0.00 | 56.6 | 94% | 0% | 0.21 | 0.98 | 3001 | 2148 | 0.00 | 0 | 912 | 24% |
| 4 | v3.3 spells | 52.2 | 1.9% | 0.98 | 26.0 | 17.8 | 0.975 / 0.972 / 0.980 | 2.21 / 0.55 | 56.8 | 82% | 100% | 0.07 | 0.98 | 2039 | 1198 | 0.00 | 1637 | 912 | 24% |
| 4 | v3.4 spells | 51.0 | 0.8% | 0.99 | 24.1 | 18.1 | 0.953 / 0.964 / 0.958 | 0.44 / 0.59 | 56.7 | 87% | 100% | 0.15 | 0.98 | 2060 | 1249 | 0.00 | 2218 | 912 | 23% |
| 5 | no spells | 32.6 | 2.0% | 0.98 | 27.6 | 18.9 | 0.977 / 0.977 / 0.976 | 0.00 / 0.00 | 56.4 | 94% | 0% | 0.23 | 0.97 | 5762 | 4296 | 0.00 | 0 | 1560 | 24% |
| 5 | v3.3 spells | 36.6 | 1.7% | 0.99 | 27.8 | 16.5 | 0.978 / 0.971 / 0.975 | 2.13 / 0.38 | 55.9 | 80% | 100% | 0.06 | 0.97 | 2627 | 1187 | 0.00 | 389 | 1560 | 24% |
| 5 | v3.4 spells | 33.0 | 1.6% | 0.98 | 27.4 | 18.7 | 0.947 / 0.966 / 0.956 | 0.56 / 0.54 | 57.2 | 83% | 100% | 0.19 | 0.97 | 2850 | 1408 | 0.00 | 259 | 1560 | 24% |
| 6 | no spells | 33.4 | 2.3% | 0.99 | 26.4 | 21.4 | 0.977 / 0.973 / 0.974 | 0.00 / 0.00 | 65.7 | 96% | 0% | 0.31 | 0.97 | 7794 | 5850 | 0.00 | 0 | 2160 | 22% |
| 6 | v3.3 spells | 38.3 | 1.9% | 0.98 | 27.2 | 18.2 | 0.977 / 0.967 / 0.974 | 2.27 / 1.00 | 64.8 | 81% | 100% | 0.09 | 0.97 | 4175 | 2242 | 0.00 | 2160 | 2160 | 22% |
| 6 | v3.4 spells | 32.3 | 2.4% | 0.99 | 24.9 | 22.1 | 0.946 / 0.963 / 0.957 | 0.70 / 0.56 | 66.1 | 86% | 100% | 0.30 | 0.97 | 4759 | 2731 | 0.00 | 2430 | 2160 | 22% |
| 7 | no spells | 37.7 | 3.3% | 0.98 | 26.5 | 23.4 | 0.974 / 0.968 / 0.975 | 0.00 / 0.00 | 78.1 | 79% | 0% | 0.38 | 0.97 | 10651 | 7975 | 0.00 | 0 | 2760 | 22% |
| 7 | v3.3 spells | 47.2 | 2.3% | 0.99 | 27.3 | 18.4 | 0.974 / 0.971 / 0.971 | 2.49 / 1.68 | 77.7 | 80% | 100% | 0.10 | 0.98 | 4951 | 2306 | 0.00 | 1728 | 2760 | 22% |
| 7 | v3.4 spells | 40.7 | 2.4% | 0.99 | 25.2 | 21.7 | 0.947 / 0.944 / 0.937 | 0.64 / 0.97 | 79.0 | 76% | 100% | 0.19 | 0.97 | 5046 | 2388 | 0.00 | 1584 | 2760 | 22% |
| 8 | no spells | 36.2 | 1.5% | 0.99 | 25.9 | 22.8 | 0.975 / 0.973 / 0.974 | 0.00 / 0.00 | 72.4 | 75% | 0% | 0.26 | 0.97 | 13228 | 10055 | 0.00 | 0 | 3360 | 23% |
| 8 | v3.3 spells | 45.7 | 2.2% | 0.98 | 26.7 | 17.7 | 0.975 / 0.970 / 0.972 | 2.43 / 1.88 | 72.1 | 77% | 100% | 0.05 | 0.98 | 6962 | 3636 | 0.00 | 2911 | 3360 | 23% |
| 8 | v3.4 spells | 38.8 | 1.0% | 0.97 | 24.8 | 21.2 | 0.951 / 0.947 / 0.941 | 0.64 / 0.81 | 73.3 | 78% | 96% | 0.16 | 0.97 | 6801 | 3608 | 0.00 | 1525 | 3360 | 23% |
| 9 | no spells | 33.7 | 1.7% | 0.99 | 26.3 | 22.9 | 0.978 / 0.969 / 0.975 | 0.00 / 0.00 | 67.6 | 79% | 0% | 0.31 | 0.97 | 16540 | 12682 | 0.00 | 0 | 4080 | 22% |
| 9 | v3.3 spells | 40.6 | 2.2% | 0.97 | 24.8 | 18.7 | 0.979 / 0.970 / 0.973 | 1.30 / 1.10 | 67.4 | 82% | 100% | 0.27 | 0.97 | 8216 | 1047 | 0.00 | 6864 | 4080 | 22% |
| 9 | v3.4 spells | 37.2 | 1.2% | 0.98 | 23.9 | 20.5 | 0.952 / 0.948 / 0.945 | 0.60 / 0.73 | 67.9 | 77% | 97% | 0.16 | 0.97 | 9006 | 887 | 0.00 | 8237 | 4080 | 22% |

### 7.5 Per realm, 50% saver

| realm | mode | battles | defeat % | boss 1st-try | boss q | normal q | q share normal / elite / boss | casts/b normal / boss | min/location | MP at battle start | spell castable at start | heals/b | full gear | gold start | min gold | free inns | spell spend | gear spend | proficient at end |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | no spells | 65.9 | 0.1% | 1.00 | 26.9 | 15.2 | 0.990 / 0.980 / 0.992 | 0.00 / 0.00 | 61.4 | 100% | 0% | 0.00 | 0.90 | 24 | 28 | 0.00 | 0 | 35 | 24% |
| 1 | v3.3 spells | 65.9 | 0.1% | 1.00 | 26.9 | 15.2 | 0.990 / 0.980 / 0.992 | 0.00 / 0.00 | 61.4 | 100% | 0% | 0.00 | 0.90 | 24 | 28 | 0.00 | 0 | 35 | 24% |
| 1 | v3.4 spells | 65.9 | 0.1% | 1.00 | 26.9 | 15.2 | 0.990 / 0.980 / 0.992 | 0.00 / 0.00 | 61.4 | 100% | 0% | 0.00 | 0.90 | 24 | 28 | 0.00 | 0 | 35 | 24% |
| 2 | no spells | 48.9 | 0.8% | 1.00 | 27.9 | 15.9 | 0.986 / 0.976 / 0.978 | 0.00 / 0.00 | 71.5 | 87% | 0% | 0.20 | 0.97 | 757 | 448 | 0.00 | 0 | 288 | 22% |
| 2 | v3.3 spells | 49.0 | 0.8% | 1.00 | 28.2 | 15.9 | 0.986 / 0.976 / 0.976 | 0.03 / 0.03 | 71.4 | 87% | 4% | 0.19 | 0.97 | 757 | 448 | 0.00 | 566 | 288 | 22% |
| 2 | v3.4 spells | 49.2 | 0.8% | 1.00 | 27.2 | 15.8 | 0.984 / 0.975 / 0.968 | 0.02 / 0.24 | 71.2 | 87% | 4% | 0.19 | 0.97 | 757 | 448 | 0.00 | 566 | 288 | 22% |
| 3 | no spells | 43.2 | 2.6% | 0.93 | 28.6 | 20.7 | 0.977 / 0.965 / 0.962 | 0.00 / 0.00 | 78.9 | 95% | 0% | 0.44 | 0.98 | 1439 | 926 | 0.00 | 0 | 528 | 22% |
| 3 | v3.3 spells | 47.1 | 3.2% | 0.95 | 29.0 | 18.6 | 0.976 / 0.963 / 0.959 | 1.27 / 0.75 | 77.9 | 89% | 81% | 0.12 | 0.98 | 874 | 365 | 0.00 | 9 | 528 | 22% |
| 3 | v3.4 spells | 47.9 | 1.2% | 0.97 | 25.4 | 18.5 | 0.942 / 0.935 / 0.925 | 0.70 / 1.02 | 79.4 | 89% | 81% | 0.22 | 0.98 | 879 | 375 | 0.00 | 9 | 528 | 22% |
| 4 | no spells | 61.7 | 13.0% | 0.82 | 27.5 | 20.8 | 0.967 / 0.968 / 0.979 | 0.00 / 0.00 | 75.1 | 96% | 0% | 0.38 | 0.97 | 2193 | 1147 | 0.00 | 0 | 912 | 24% |
| 4 | v3.3 spells | 63.5 | 11.9% | 0.83 | 27.6 | 19.8 | 0.966 / 0.965 / 0.977 | 1.82 / 0.13 | 74.1 | 89% | 80% | 0.16 | 0.97 | 1549 | 602 | 0.00 | 0 | 912 | 24% |
| 4 | v3.4 spells | 61.2 | 12.0% | 0.84 | 27.3 | 20.8 | 0.961 / 0.965 / 0.974 | 0.12 / 0.13 | 74.8 | 94% | 79% | 0.37 | 0.97 | 1772 | 811 | 0.00 | 0 | 912 | 24% |
| 5 | no spells | 40.3 | 13.7% | 0.78 | 28.6 | 21.1 | 0.969 / 0.970 / 0.973 | 0.00 / 0.00 | 74.9 | 96% | 0% | 0.42 | 0.96 | 2952 | 1392 | 0.00 | 0 | 1560 | 24% |
| 5 | v3.3 spells | 42.6 | 13.7% | 0.80 | 28.7 | 19.9 | 0.968 / 0.965 / 0.972 | 2.17 / 0.12 | 75.0 | 89% | 80% | 0.18 | 0.97 | 2429 | 926 | 0.00 | 0 | 1560 | 24% |
| 5 | v3.4 spells | 40.5 | 14.4% | 0.78 | 29.0 | 21.0 | 0.963 / 0.965 / 0.968 | 0.11 / 0.13 | 75.5 | 95% | 79% | 0.41 | 0.96 | 2832 | 1234 | 0.00 | 0 | 1560 | 25% |
| 6 | no spells | 41.1 | 16.1% | 0.82 | 27.6 | 23.8 | 0.969 / 0.965 / 0.971 | 0.00 / 0.00 | 85.8 | 97% | 0% | 0.55 | 0.97 | 3566 | 1543 | 0.00 | 0 | 2160 | 22% |
| 6 | v3.3 spells | 40.9 | 17.3% | 0.79 | 28.1 | 23.8 | 0.968 / 0.965 / 0.970 | 2.83 / 0.01 | 85.6 | 92% | 79% | 0.33 | 0.96 | 2994 | 999 | 0.00 | 0 | 2160 | 22% |
| 6 | v3.4 spells | 40.8 | 15.8% | 0.80 | 28.0 | 23.9 | 0.968 / 0.966 / 0.971 | 0.02 / 0.01 | 85.5 | 97% | 79% | 0.55 | 0.96 | 3420 | 1418 | 0.00 | 0 | 2160 | 22% |
| 7 | no spells | 49.4 | 24.9% | 0.70 | 27.3 | 25.1 | 0.967 / 0.966 / 0.978 | 0.00 / 0.00 | 105.8 | 88% | 0% | 0.67 | 0.97 | 4406 | 1624 | 0.00 | 0 | 2760 | 23% |
| 7 | v3.3 spells | 50.6 | 22.5% | 0.74 | 27.8 | 24.3 | 0.966 / 0.965 / 0.975 | 2.96 / 0.47 | 105.1 | 90% | 79% | 0.53 | 0.96 | 3646 | 1018 | 0.00 | 0 | 2760 | 23% |
| 7 | v3.4 spells | 49.7 | 24.7% | 0.70 | 26.9 | 25.0 | 0.958 / 0.960 / 0.969 | 0.22 / 0.22 | 106.0 | 88% | 79% | 0.66 | 0.97 | 4384 | 1641 | 0.00 | 0 | 2760 | 23% |
| 8 | no spells | 45.1 | 17.9% | 0.75 | 27.0 | 25.4 | 0.965 / 0.964 / 0.975 | 0.00 / 0.00 | 96.9 | 87% | 0% | 0.59 | 0.93 | 3981 | 955 | 0.00 | 0 | 3360 | 23% |
| 8 | v3.3 spells | 46.9 | 20.8% | 0.70 | 27.6 | 24.5 | 0.967 / 0.967 / 0.977 | 3.10 / 0.58 | 97.8 | 89% | 80% | 0.59 | 0.92 | 3676 | 767 | 0.00 | 0 | 3360 | 24% |
| 8 | v3.4 spells | 45.2 | 18.9% | 0.73 | 26.9 | 25.4 | 0.957 / 0.955 / 0.969 | 0.22 / 0.23 | 97.4 | 87% | 79% | 0.61 | 0.92 | 3974 | 985 | 0.00 | 0 | 3360 | 23% |
| 9 | no spells | 42.4 | 19.6% | 0.74 | 28.2 | 25.2 | 0.967 / 0.963 / 0.972 | 0.00 / 0.00 | 90.8 | 87% | 0% | 0.64 | 0.92 | 4587 | 965 | 0.00 | 0 | 4080 | 23% |
| 9 | v3.3 spells | 44.2 | 23.6% | 0.71 | 28.0 | 24.2 | 0.968 / 0.965 / 0.976 | 2.46 / 0.46 | 91.3 | 90% | 80% | 0.72 | 0.88 | 4123 | 727 | 0.00 | 0 | 4080 | 23% |
| 9 | v3.4 spells | 42.3 | 20.0% | 0.72 | 27.9 | 25.3 | 0.958 / 0.956 / 0.968 | 0.18 / 0.20 | 91.1 | 87% | 79% | 0.65 | 0.89 | 4403 | 921 | 0.00 | 0 | 4080 | 23% |

### 7.6 Per realm, 90% saver

| realm | mode | battles | defeat % | boss 1st-try | boss q | normal q | q share normal / elite / boss | casts/b normal / boss | min/location | MP at battle start | spell castable at start | heals/b | full gear | gold start | min gold | free inns | spell spend | gear spend | proficient at end |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | no spells | 50.3 | 0.0% | 1.00 | 16.7 | 9.8 | 1.000 / 0.999 / 1.000 | 0.00 / 0.00 | 34.7 | 100% | 0% | 0.00 | 0.92 | 24 | 33 | 0.00 | 0 | 35 | 25% |
| 1 | v3.3 spells | 50.3 | 0.0% | 1.00 | 16.7 | 9.8 | 1.000 / 0.999 / 1.000 | 0.00 / 0.00 | 34.7 | 100% | 0% | 0.00 | 0.92 | 24 | 33 | 0.00 | 0 | 35 | 25% |
| 1 | v3.4 spells | 50.3 | 0.0% | 1.00 | 16.7 | 9.8 | 1.000 / 0.999 / 1.000 | 0.00 / 0.00 | 34.7 | 100% | 0% | 0.00 | 0.92 | 24 | 33 | 0.00 | 0 | 35 | 25% |
| 2 | no spells | 36.9 | 0.0% | 1.00 | 17.3 | 10.4 | 0.998 / 1.000 / 1.000 | 0.00 / 0.00 | 40.3 | 92% | 0% | 0.01 | 0.97 | 810 | 547 | 0.00 | 0 | 288 | 23% |
| 2 | v3.3 spells | 37.6 | 0.0% | 1.00 | 17.2 | 10.2 | 0.998 / 1.000 / 1.000 | 0.26 / 0.06 | 40.3 | 88% | 31% | 0.01 | 0.97 | 810 | 546 | 0.00 | 781 | 288 | 23% |
| 2 | v3.4 spells | 38.5 | 0.0% | 1.00 | 16.5 | 10.0 | 0.982 / 0.977 / 0.963 | 0.16 / 0.63 | 40.6 | 86% | 29% | 0.01 | 0.97 | 810 | 546 | 0.00 | 911 | 288 | 23% |
| 3 | no spells | 34.6 | 0.0% | 1.00 | 17.3 | 13.1 | 0.999 / 0.998 / 1.000 | 0.00 / 0.00 | 44.3 | 94% | 0% | 0.02 | 0.97 | 1829 | 1366 | 0.00 | 0 | 528 | 23% |
| 3 | v3.3 spells | 38.2 | 0.0% | 1.00 | 18.9 | 11.5 | 0.999 / 0.998 / 0.999 | 1.32 / 1.30 | 43.7 | 74% | 100% | 0.00 | 0.97 | 1041 | 574 | 0.00 | 1098 | 528 | 23% |
| 3 | v3.4 spells | 35.7 | 0.0% | 1.00 | 16.2 | 12.5 | 0.938 / 0.947 / 0.941 | 0.81 / 1.01 | 44.9 | 69% | 95% | 0.00 | 0.97 | 948 | 479 | 0.00 | 981 | 528 | 23% |
| 4 | no spells | 43.8 | 0.0% | 1.00 | 17.3 | 14.3 | 0.997 / 0.998 / 0.999 | 0.00 / 0.00 | 40.4 | 94% | 0% | 0.03 | 0.98 | 3497 | 2716 | 0.00 | 0 | 912 | 24% |
| 4 | v3.3 spells | 44.4 | 0.0% | 1.00 | 18.6 | 13.9 | 0.997 / 0.997 / 0.999 | 1.81 / 0.86 | 40.3 | 72% | 100% | 0.01 | 0.98 | 1502 | 717 | 0.00 | 2200 | 912 | 24% |
| 4 | v3.4 spells | 45.8 | 0.0% | 1.00 | 16.4 | 13.6 | 0.949 / 0.960 / 0.955 | 0.69 / 0.78 | 41.2 | 72% | 97% | 0.02 | 0.98 | 1622 | 826 | 0.00 | 2610 | 912 | 24% |
| 5 | no spells | 29.1 | 0.0% | 1.00 | 19.0 | 14.3 | 0.998 / 0.999 / 0.999 | 0.00 / 0.00 | 40.4 | 95% | 0% | 0.03 | 0.97 | 7239 | 5862 | 0.00 | 0 | 1560 | 24% |
| 5 | v3.3 spells | 31.6 | 0.0% | 1.00 | 19.6 | 13.0 | 0.998 / 0.999 / 0.999 | 1.76 / 0.87 | 40.4 | 69% | 100% | 0.01 | 0.97 | 2420 | 1024 | 0.00 | 410 | 1560 | 24% |
| 5 | v3.4 spells | 29.8 | 0.0% | 1.00 | 18.6 | 14.0 | 0.956 / 0.974 / 0.968 | 0.60 / 0.59 | 41.1 | 75% | 99% | 0.02 | 0.97 | 2813 | 1419 | 0.00 | 1771 | 1560 | 24% |
| 6 | no spells | 29.7 | 0.0% | 1.00 | 18.2 | 16.3 | 0.998 / 0.997 / 1.000 | 0.00 / 0.00 | 47.4 | 97% | 0% | 0.03 | 0.97 | 10222 | 8353 | 0.00 | 0 | 2160 | 22% |
| 6 | v3.3 spells | 36.1 | 0.0% | 1.00 | 20.0 | 12.9 | 0.998 / 0.997 / 0.999 | 1.91 / 1.40 | 46.7 | 70% | 100% | 0.01 | 0.97 | 4624 | 2688 | 0.00 | 3645 | 2160 | 22% |
| 6 | v3.4 spells | 29.5 | 0.0% | 1.00 | 17.7 | 16.4 | 0.945 / 0.956 / 0.952 | 0.91 / 0.88 | 48.5 | 64% | 98% | 0.02 | 0.97 | 4037 | 2076 | 0.00 | 2673 | 2160 | 22% |
| 7 | no spells | 34.7 | 0.0% | 1.00 | 19.3 | 17.2 | 0.998 / 0.998 / 0.999 | 0.00 / 0.00 | 56.0 | 65% | 0% | 0.03 | 0.97 | 14445 | 12040 | 0.00 | 0 | 2760 | 22% |
| 7 | v3.3 spells | 45.5 | 0.0% | 1.00 | 20.3 | 12.9 | 0.998 / 0.998 / 0.999 | 2.16 / 2.14 | 56.0 | 71% | 100% | 0.01 | 0.98 | 5120 | 2652 | 0.00 | 5220 | 2760 | 22% |
| 7 | v3.4 spells | 35.1 | 0.0% | 1.00 | 18.1 | 17.0 | 0.971 / 0.977 / 0.947 | 0.47 / 1.01 | 56.5 | 48% | 92% | 0.02 | 0.97 | 5429 | 2881 | 0.00 | 4423 | 2760 | 22% |
| 8 | no spells | 33.7 | 0.0% | 1.00 | 18.4 | 16.6 | 0.999 / 0.999 / 0.998 | 0.00 / 0.00 | 51.8 | 50% | 0% | 0.01 | 0.97 | 20053 | 17066 | 0.00 | 0 | 3360 | 23% |
| 8 | v3.3 spells | 45.4 | 0.0% | 1.00 | 19.9 | 11.9 | 0.998 / 0.998 / 0.998 | 1.75 / 2.40 | 51.4 | 69% | 100% | 0.01 | 0.98 | 5741 | 2683 | 0.00 | 4620 | 3360 | 23% |
| 8 | v3.4 spells | 35.0 | 0.0% | 1.00 | 17.3 | 15.9 | 0.980 / 0.982 / 0.946 | 0.31 / 0.98 | 52.1 | 41% | 79% | 0.00 | 0.97 | 6483 | 3279 | 0.00 | 5174 | 3360 | 23% |
| 9 | no spells | 31.5 | 0.0% | 1.00 | 18.3 | 16.6 | 0.999 / 0.999 / 0.999 | 0.00 / 0.00 | 48.6 | 51% | 0% | 0.01 | 0.97 | 26046 | 22390 | 0.00 | 0 | 4080 | 23% |
| 9 | v3.3 spells | 38.6 | 0.0% | 1.00 | 17.6 | 13.2 | 0.999 / 0.998 / 0.999 | 1.26 / 1.39 | 47.9 | 74% | 100% | 0.02 | 0.97 | 7570 | 785 | 0.00 | 9590 | 4080 | 22% |
| 9 | v3.4 spells | 33.2 | 0.0% | 1.00 | 17.4 | 15.6 | 0.985 / 0.985 / 0.961 | 0.23 / 0.70 | 48.5 | 40% | 81% | 0.00 | 0.97 | 7394 | 825 | 0.00 | 9355 | 4080 | 23% |

### 7.7 Boss fights by realm

First-try win / questions per boss battle / casts per boss battle (75% and 50% savers):

| realm | acc | no spells | v3.3 (Ward) | v3.4 (no Ward) | v3.4 + Ward | length target (q) |
|---|---|---|---|---|---|---|
| 1 | 75% | 1.00 / 20.4 / 0.00 | 1.00 / 20.4 / 0.00 | 1.00 / 20.4 / 0.00 | 1.00 / 20.4 / 0.00 | 18-25 (location), 22-30 (realm) |
| 1 | 50% | 1.00 / 26.9 / 0.00 | 1.00 / 26.9 / 0.00 | 1.00 / 26.9 / 0.00 | 1.00 / 26.9 / 0.00 | 18-25 (location), 22-30 (realm) |
| 2 | 75% | 1.00 / 21.5 / 0.00 | 1.00 / 21.5 / 0.05 | 1.00 / 19.8 / 0.72 | 1.00 / 21.5 / 0.29 | 18-25 (location), 22-30 (realm) |
| 2 | 50% | 1.00 / 27.9 / 0.00 | 1.00 / 28.2 / 0.03 | 1.00 / 27.2 / 0.24 | 1.00 / 28.2 / 0.09 | 18-25 (location), 22-30 (realm) |
| 3 | 75% | 1.00 / 21.8 / 0.00 | 1.00 / 22.7 / 1.17 | 1.00 / 19.7 / 1.18 | 1.00 / 21.9 / 0.72 | 18-25 (location), 22-30 (realm) |
| 3 | 50% | 0.93 / 28.6 / 0.00 | 0.95 / 29.0 / 0.75 | 0.97 / 25.4 / 1.02 | 0.94 / 28.0 / 0.47 | 18-25 (location), 22-30 (realm) |
| 4 | 75% | 1.00 / 22.0 / 0.00 | 1.00 / 22.8 / 0.88 | 1.00 / 21.1 / 0.88 | 1.00 / 22.0 / 0.33 | 18-25 (location), 22-30 (realm) |
| 4 | 50% | 0.82 / 27.5 / 0.00 | 0.83 / 27.6 / 0.13 | 0.84 / 27.3 / 0.13 | 0.83 / 27.5 / 0.09 | 18-25 (location), 22-30 (realm) |
| 5 | 75% | 1.00 / 23.6 / 0.00 | 1.00 / 25.0 / 0.51 | 1.00 / 23.8 / 0.60 | 1.00 / 24.2 / 0.29 | 18-25 (location), 22-30 (realm) |
| 5 | 50% | 0.78 / 28.6 / 0.00 | 0.80 / 28.7 / 0.12 | 0.78 / 29.0 / 0.13 | 0.78 / 28.9 / 0.10 | 18-25 (location), 22-30 (realm) |
| 6 | 75% | 1.00 / 22.5 / 0.00 | 1.00 / 23.7 / 1.17 | 1.00 / 21.4 / 0.86 | 1.00 / 22.9 / 0.03 | 18-25 (location), 22-30 (realm) |
| 6 | 50% | 0.82 / 27.6 / 0.00 | 0.79 / 28.1 / 0.01 | 0.80 / 28.0 / 0.01 | 0.79 / 27.8 / 0.00 | 18-25 (location), 22-30 (realm) |
| 7 | 75% | 1.00 / 23.7 / 0.00 | 1.00 / 24.7 / 1.98 | 1.00 / 22.1 / 1.04 | 1.00 / 23.8 / 0.57 | 18-25 (location), 22-30 (realm) |
| 7 | 50% | 0.70 / 27.3 / 0.00 | 0.74 / 27.8 / 0.47 | 0.70 / 26.9 / 0.22 | 0.73 / 27.4 / 0.01 | 18-25 (location), 22-30 (realm) |
| 8 | 75% | 1.00 / 23.6 / 0.00 | 1.00 / 23.4 / 2.11 | 1.00 / 20.8 / 0.94 | 1.00 / 22.5 / 0.72 | 18-25 (location), 22-30 (realm) |
| 8 | 50% | 0.75 / 27.0 / 0.00 | 0.70 / 27.6 / 0.58 | 0.73 / 26.9 / 0.23 | 0.78 / 27.5 / 0.00 | 18-25 (location), 22-30 (realm) |
| 9 | 75% | 1.00 / 23.1 / 0.00 | 1.00 / 21.7 / 1.12 | 1.00 / 20.7 / 0.76 | 1.00 / 22.4 / 0.57 | 18-25 (location), 22-30 (realm) |
| 9 | 50% | 0.74 / 28.2 / 0.00 | 0.71 / 28.0 / 0.46 | 0.72 / 27.9 / 0.20 | 0.74 / 28.0 / 0.00 | 18-25 (location), 22-30 (realm) |

### 7.8 Gold and MP timeline

| realm | no spells: gold at end | v3.3: gold at end | v3.4: gold at end | v3.4 spells owned | v3.4 MP at battle start | v3.4 spell castable at start | v3.4 Mana Tea bought / drunk | v3.4 spell spend | v3.4 gear spend |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 745 | 745 | 745 | 0.0 | 100% | 0% | 0.00 / 0.00 | 0 | 35 |
| 2 | 1656 | 902 | 930 | 1.1 | 82% | 23% | 0.00 / 0.31 | 770 | 288 |
| 3 | 3138 | 2092 | 1333 | 1.6 | 76% | 97% | 0.07 / 0.30 | 711 | 528 |
| 4 | 6533 | 2590 | 2541 | 2.7 | 79% | 98% | 0.03 / 0.43 | 2421 | 912 |
| 5 | 9286 | 4756 | 4633 | 3.0 | 79% | 100% | 0.00 / 0.28 | 1037 | 1560 |
| 6 | 12985 | 4613 | 4691 | 3.7 | 78% | 100% | 0.00 / 0.39 | 2754 | 2160 |
| 7 | 17532 | 4875 | 5751 | 4.3 | 68% | 98% | 0.00 / 0.91 | 3276 | 2760 |
| 8 | 22320 | 9217 | 7478 | 4.8 | 66% | 91% | 0.00 / 0.91 | 3511 | 3360 |
| 9 | 26984 | 5290 | 4075 | 5.8 | 64% | 92% | 0.01 / 1.06 | 9235 | 4080 |

Spell timelines (median hour of play when a spell first becomes affordable and when the kid buys it; the kid saves for the stronger spell of each town):

75% saver:

| spell | town | sold from (h) | first affordable (realm, h) | bought by % of runs | bought (realm, h, battle #) |
|---|---|---|---|---|---|
| 小火球术 Small Fireball | 2 | 2.1 | 2, 2.3 | 100% | 2, 3.3, 82 |
| 泡泡术 Bubble Spell | 2 | 2.1 | 2, 2.3 | 9% | 2, 3.7, 96 |
| 雪球术 Snowball Volley | 3 | 3.7 | 3, 4.4 | 0% | - |
| 小闪电术 Little Lightning | 3 | 3.7 | 3, 4.8 | 53% | 3, 5.5, 132 |
| 火球术 Fireball | 4 | 5.5 | 4, 6.4 | 7% | 4, 7.9, 180 |
| 旋风术 Whirlwind | 4 | 5.5 | 4, 6.6 | 100% | 4, 7.5, 171 |
| 雪花术 Snowflake Dance | 5 | 7.9 | 5, 9.0 | 32% | 5, 9.5, 210 |
| 闪电术 Lightning Bolt | 5 | 7.9 | 5, 8.7 | 0% | - |
| 阳光术 Sunbeam | 6 | 9.6 | 6, 9.9 | 0% | - |
| 大火球术 Big Fireball | 6 | 9.6 | 6, 9.9 | 68% | 6, 11.2, 237 |
| 暴风雪术 Blizzard | 7 | 11.5 | 7, 12.7 | 61% | 7, 13.5, 275 |
| 龙卷风术 Tornado | 7 | 11.5 | 7, 11.9 | 0% | - |
| 流星术 Meteor | 8 | 13.7 | 8, 14.2 | 0% | - |
| 雷雨术 Thunderstorm | 8 | 13.7 | 8, 14.9 | 51% | 8, 15.5, 308 |
| 超暴风雪术 Super Blizzard | 9 | 15.8 | 9, 17.2 | 99% | 9, 17.2, 341 |
| 流星雨术 Meteor Shower | 9 | 15.8 | 9, 17.0 | 0% | - |

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
| 阳光术 Sunbeam | 6 | 6.9 | 6, 7.2 | 0% | - |
| 大火球术 Big Fireball | 6 | 6.9 | 6, 7.9 | 11% | 6, 8.4, 154 |
| 暴风雪术 Blizzard | 7 | 8.4 | 7, 8.6 | 14% | 7, 9.9, 176 |
| 龙卷风术 Tornado | 7 | 8.4 | 7, 8.6 | 0% | - |
| 流星术 Meteor | 8 | 9.9 | 8, 10.1 | 0% | - |
| 雷雨术 Thunderstorm | 8 | 9.9 | 8, 10.1 | 5% | 8, 11.5, 198 |
| 超暴风雪术 Super Blizzard | 9 | 11.3 | 9, 11.5 | 78% | 9, 12.2, 210 |
| 流星雨术 Meteor Shower | 9 | 11.3 | 9, 11.5 | 0% | - |

90% saver:

| spell | town | sold from (h) | first affordable (realm, h) | bought by % of runs | bought (realm, h, battle #) |
|---|---|---|---|---|---|
| 小火球术 Small Fireball | 2 | 1.7 | 2, 1.9 | 100% | 2, 2.8, 76 |
| 泡泡术 Bubble Spell | 2 | 1.7 | 2, 1.9 | 35% | 2, 3.1, 90 |
| 雪球术 Snowball Volley | 3 | 3.1 | 3, 3.7 | 0% | - |
| 小闪电术 Little Lightning | 3 | 3.1 | 3, 3.9 | 73% | 3, 4.5, 122 |
| 火球术 Fireball | 4 | 4.6 | 4, 5.4 | 17% | 4, 6.7, 172 |
| 旋风术 Whirlwind | 4 | 4.6 | 4, 5.6 | 100% | 4, 6.2, 159 |
| 雪花术 Snowflake Dance | 5 | 6.6 | 5, 7.4 | 55% | 5, 8.0, 198 |
| 闪电术 Lightning Bolt | 5 | 6.6 | 5, 7.0 | 0% | - |
| 阳光术 Sunbeam | 6 | 8.0 | 6, 8.8 | 0% | - |
| 大火球术 Big Fireball | 6 | 8.0 | 6, 8.9 | 66% | 6, 9.4, 225 |
| 暴风雪术 Blizzard | 7 | 9.6 | 7, 10.1 | 81% | 7, 11.1, 258 |
| 龙卷风术 Tornado | 7 | 9.6 | 7, 9.9 | 1% | 7, 11.7, 267 |
| 流星术 Meteor | 8 | 11.5 | 8, 11.8 | 0% | - |
| 雷雨术 Thunderstorm | 8 | 11.5 | 8, 12.4 | 75% | 8, 13.1, 296 |
| 超暴风雪术 Super Blizzard | 9 | 13.2 | 9, 14.5 | 99% | 9, 14.5, 323 |
| 流星雨术 Meteor Shower | 9 | 13.2 | 9, 14.4 | 1% | 9, 15.2, 340 |

65% saver:

| spell | town | sold from (h) | first affordable (realm, h) | bought by % of runs | bought (realm, h, battle #) |
|---|---|---|---|---|---|
| 小火球术 Small Fireball | 2 | 2.4 | 2, 2.7 | 100% | 2, 3.9, 89 |
| 泡泡术 Bubble Spell | 2 | 2.4 | 2, 2.6 | 1% | 2, 4.1, 109 |
| 雪球术 Snowball Volley | 3 | 4.2 | 3, 5.1 | 0% | - |
| 小闪电术 Little Lightning | 3 | 4.2 | 3, 5.6 | 17% | 3, 6.3, 141 |
| 火球术 Fireball | 4 | 6.3 | 4, 6.5 | 0% | - |
| 旋风术 Whirlwind | 4 | 6.3 | 4, 7.2 | 97% | 4, 8.4, 177 |
| 雪花术 Snowflake Dance | 5 | 9.1 | 5, 10.3 | 8% | 5, 10.9, 225 |
| 闪电术 Lightning Bolt | 5 | 9.1 | 5, 9.4 | 0% | - |
| 阳光术 Sunbeam | 6 | 11.0 | 6, 11.2 | 0% | - |
| 大火球术 Big Fireball | 6 | 11.0 | 6, 11.2 | 60% | 6, 12.9, 252 |
| 暴风雪术 Blizzard | 7 | 13.2 | 7, 14.9 | 29% | 7, 15.5, 294 |
| 龙卷风术 Tornado | 7 | 13.2 | 7, 14.4 | 0% | - |
| 流星术 Meteor | 8 | 15.8 | 8, 16.1 | 0% | - |
| 雷雨术 Thunderstorm | 8 | 15.8 | 8, 17.0 | 22% | 8, 18.1, 333 |
| 超暴风雪术 Super Blizzard | 9 | 18.3 | 9, 18.7 | 88% | 9, 19.6, 357 |
| 流星雨术 Meteor Shower | 9 | 18.3 | 9, 18.6 | 0% | - |

50% saver:

| spell | town | sold from (h) | first affordable (realm, h) | bought by % of runs | bought (realm, h, battle #) |
|---|---|---|---|---|---|
| 小火球术 Small Fireball | 2 | 3.1 | 2, 4.0 | 79% | 2, 5.3, 113 |
| 泡泡术 Bubble Spell | 2 | 3.1 | 2, 3.3 | 0% | - |
| 雪球术 Snowball Volley | 3 | 5.4 | 3, 7.3 | 0% | - |
| 小闪电术 Little Lightning | 3 | 5.4 | 3, 7.8 | 1% | 3, 8.0, 155 |
| 火球术 Fireball | 4 | 8.1 | 4, 9.9 | 0% | - |
| 旋风术 Whirlwind | 4 | 8.1 | 4, 10.4 | 0% | - |
| 雪花术 Snowflake Dance | 5 | 11.8 | 6, 14.4 | 0% | - |
| 闪电术 Lightning Bolt | 5 | 11.8 | 5, 13.3 | 0% | - |
| 阳光术 Sunbeam | 6 | 14.3 | 6, 16.3 | 0% | - |
| 大火球术 Big Fireball | 6 | 14.3 | 6, 17.1 | 0% | - |
| 暴风雪术 Blizzard | 7 | 17.2 | 8, 22.9 | 0% | - |
| 龙卷风术 Tornado | 7 | 17.2 | 7, 19.9 | 0% | - |
| 流星术 Meteor | 8 | 20.7 | 8, 23.8 | 0% | - |
| 雷雨术 Thunderstorm | 8 | 20.7 | 9, 26.0 | 0% | - |
| 超暴风雪术 Super Blizzard | 9 | 24.0 | - | 0% | - |
| 流星雨术 Meteor Shower | 9 | 24.0 | - | 0% | - |

- **75% saver:** buys 小火球术 about 1.2 h into realm 2, then about one spell per realm (旋风术 100%, 超暴风雪术 99%, the rest 32–68% of runs), ending with 5.8 spells.
- **75% spender:** gets about 2 spells: 旋风术 in realm 4 and 超暴风雪术 in realm 9.
- **50% saver:** about 1 spell (小火球术).
- **Gold:** a 75% saver still ends with about 4,100 gold, against 27,000 hoarded without spells.

## 8. Open questions for Jack

1. **Cast rule:** OK with 1 cast per normal or elite battle and 2 per boss, unlocked after 3 correct answers? Or "1 per N questions" instead? (The sim's no-cap version reached 15% of hero turns cast.)
2. **Magic Ward:** OK to drop it? If realm bosses run short in playtests, lower the boss cap to 1 instead.
3. **MP bite:** should regen still refill spell MP? Kids start most battles at 62–82% MP. Options: K = 0.5 (exactly 2 casts from full), or regen that doesn't count toward spells.
4. **MP potions:** OK with Mana Tea at 6 × G and Big Mana Tea at 15 × G, both map-only?
5. **Fall-off:** OK with fixed spell power (old spells fade)? Or should spells grow a little with level (a "magic" stat or wand gear)? That would weaken the fall-off Jack asked for.
6. **Town names** are placeholders; **town 1's shop** (Mana Tea only, or a teaser spell?); **elements** (cosmetic, or weaknesses?).
7. **First-spell price:** realm 1 savings still cover 小火球术 on arrival in town 2. Raise the town-2 prices to about 90 × G, or add a town-1 gold sink?
8. **Quests:** one-time or repeatable? Should the words quest count earlier realms' words too (spenders rarely finish it)?
