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

{{TOWNS}}

## 3. Spell list

{{SPELLS}}

How F (damage share) and K (MP share) were set:
- **Single target:** F 0.65 → 0.95 over the game (Bubble Spell 0.35, plus Soaked).
- **Same type:** F 0.40 → 0.55.
- **All on screen:** F 0.35 → 0.55.
- **MP:** K = 0.40 for single target, 0.45 for crowd spells, 0.48 for the two realm-9 spells, and 0.33 for Bubble Spell.

The crowd spells deal less per target but hit up to 3 enemies, so one cast is worth about 1.0–1.6 normal enemies.

### 3.1 Fall-off: damage as % of a typical normal enemy's HP

At the recommended level and gear for each tier. The "plain attack" row is the hero's attack with no streak; with a streak it goes up to ×2.0.

{{FALLOFF}}

**Reading the table:**
- Every spell starts well above a plain attack in its own realm.
- It falls to about a plain attack 2–3 realms later. For example, 小火球术 is 67% in realm 2 and 44% in realm 4, while a plain attack there is 44%.
- By realm 9, the early spells do 3–22%.
- Fall-off comes from two things: enemy HP grows 2.7× from realm 2 to 9, and spells subtract full DEF.
- Gear raises ATK, so plain attacks keep up while old spells don't. Spells don't use gear, which also makes them a little more useful when a kid is a tier behind on gear.
- Against bosses, the strongest owned spell does 11–14% of a realm boss's HP from tier 3 on (29% at tier 2).

### 3.2 MP check per tier

{{MPCHECK}}

- **From full MP: 2.1–3.0 casts** of that town's spells at the recommended level. A kid 3 levels over still gets only 2.3–3.4, so **MP growth stays at 10 + 2L**; no change needed.
- **Keeping Heal's 12 MP** leaves room for only 1–1.7 casts.
- **Regen (+1 per correct answer) still feeds spells.** At 75% accuracy, a normal battle gives about 9–15 MP back. With the 1-cast cap, that's why kids still start most battles at 62–82% MP (86% without spells).
- **MP matters most in boss fights and runs of fights in realms 7–9** (64–68% MP at battle start; Mana Tea gets drunk before bosses).
- If Jack wants MP to bite harder, the simplest knob is K = 0.5 (exactly 2 casts from full).

Chinese names: every name is "X + 术" (术 = magic art, the usual kid-fantasy word: 火球术 is what Chinese kids' games call a fireball). They build on curriculum words wherever possible: 雪, 风, 雨, 闪电, 太阳, 星星, 打雷 (雷), 大/小, and 火 (known from 火车). So reading the spell name is itself practice. 阳光, 流星 and 泡泡 aren't in the curriculum, but they're transparent compounds of known characters, or very common kid words. 超 and 暴 are the hardest characters. 超暴风雪术 is Jack's own example.

{{HSK}}

### Visual briefs for Arty

Painterly, kid-safe, no gore and no burning or injured bodies. Hits are puffs, sparkles and comic reactions. Keep flashes under the flash-safety limit (no more than 3 per second, no full-screen red). New in v3.4:
- **"Magic charge" meter:** a small star by the ✨ button fills with each correct answer and glows after 3.
- **"Used" state:** the Spellbook shows a gentle "used" state after the battle's cast.

{{VISUAL}}

## 4. MP potions (expensive)

{{POTIONS}}

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

{{QUESTS}}

{{EFFORT}}

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

{{SUMMARY}}

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

{{REALM75}}

### 7.3 Per realm, 75% spender

{{REALM75SP}}

### 7.4 Per realm, 65% saver

{{REALM65}}

### 7.5 Per realm, 50% saver

{{REALM50}}

### 7.6 Per realm, 90% saver

{{REALM90}}

### 7.7 Boss fights by realm

First-try win / questions per boss battle / casts per boss battle (75% and 50% savers):

{{BOSS}}

### 7.8 Gold and MP timeline

{{GOLD}}

Spell timelines (median hour of play when a spell first becomes affordable and when the kid buys it; the kid saves for the stronger spell of each town):

75% saver:

{{TL75}}

75% spender:

{{TL75SP}}

90% saver:

{{TL90}}

65% saver:

{{TL65}}

50% saver:

{{TL50}}

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
