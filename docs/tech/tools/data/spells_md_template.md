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

{{TOWNS}}

## 3. Spell list

{{SPELLS}}

**How F and K were set:**
- **F (damage share at the spell's own tier):** single target 0.65 → 0.95 over the game (Bubble Spell 0.35, plus Soaked); same type 0.40 → 0.55; all on screen 0.35 → 0.55.
- **K (MP share of the bar), v3.5:** 0.50 for single target, about 0.56 for crowd spells, 0.60 for the two realm-9 spells, and 0.41 for Bubble Spell.

### 3.1 Fall-off: damage as % of a typical normal enemy's HP

{{FALLOFF}}

Every spell starts well above a plain attack in its own realm and falls to about a plain attack 2–3 realms later. Gear raises ATK, but spells don't use it.

### 3.2 MP check per tier

{{MPCHECK}}

Chinese names: every name is "X + 术" (术 = magic art, the usual kid-fantasy word: 火球术 is what Chinese kids' games call a fireball). They build on curriculum words wherever possible: 雪, 风, 雨, 闪电, 太阳, 星星, 打雷 (雷), 大/小, and 火 (known from 火车). So reading the spell name is itself practice. 阳光, 流星 and 泡泡 aren't in the curriculum, but they're transparent compounds of known characters, or very common kid words. 超 and 暴 are the hardest characters. 超暴风雪术 is Jack's own example.

{{HSK}}

### Visual briefs for Arty

Painterly, kid-safe, no gore and no burning or injured bodies. Hits are puffs, sparkles and comic reactions. Keep flashes under the flash-safety limit (no more than 3 per second, no full-screen red).
- **Cast animations:** about 2–3 s each, and a tap skips them (v3.5).
- **No casts-ready count** (v3.6): the Spellbook shows each spell's MP cost and the MP bar, but not "×2", and the boss gate shows nothing about MP.

{{VISUAL}}

## 4. MP potions (expensive, map-only)

{{POTIONS}}

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

{{QUESTS}}

{{EFFORT}}

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

{{BOSSCHECK}}

The same numbers are in `data/boss_hp.csv` (spec §2.3). "50%: win" is a single fight with no retry; in the campaign, bosses also have the 50% checkpoint and retries.

### 7.2 Key comparison, v3.6 → v3.7

{{SIMTABLE}}

### 7.3 Question share, cast share, hours and defeats by profile, v3.7 vs v3.6

{{COMPARE}}

### 7.3b Does saving MP pay off?

{{PAYOFF}}

How to read it:
- **Saving gives** higher MP at the boss (75%: 94% vs 89%; 90%: 89% vs 74%) and 0.2–0.3 more casts per boss, but only 0.1–0.4 fewer boss questions, because a full bar is 1–2 casts against about 15–20 correct answers.
- **Saving doesn't change** first-try wins (≈1.00 at 65%+, about 0.90–0.91 for a 50% saver).
- **Free spenders aren't punished either.** They kill normal enemies faster and use the inn when MP runs low.
- **Removing regen alone** (v3.6 check, v3.5 boss stats): 50% saver no spells 11.5% → 10.8% defeats, free 10.2% → 10.0%; 50% spender 25.7% → 25.5%; 75% kids ≤ 0.4% either way (`build/v3/sim/v36_regen_only.json`).
- **Boss ATK** (v3.6 check) with v3.6 boss HP, 50% free (defeats / first-try boss win): × 1.0 12.4% / 0.70 (saver), 30.3% / 0.36 (spender); × 0.9 9.4% / 0.86, 24.7% / 0.49; **× 0.8** 8.6% / 0.92, 22.6% / 0.61; v3.5: 10.2% / 0.84, 25.7% / 0.65 (`build/v3/sim/v36_atk_check.json`).

### 7.4 Whole campaign

{{SUMMARY}}

### 7.5 Per realm, 75% saver

{{REALM75}}

### 7.6 Per realm, 75% spender

{{REALM75SP}}

### 7.7 Per realm, 65% saver

{{REALM65}}

### 7.8 Per realm, 50% saver

{{REALM50}}

### 7.9 Per realm, 90% saver

{{REALM90}}

### 7.10 Boss fights by realm

{{BOSS}}

### 7.11 Gold and MP timeline

{{GOLD}}

Spell timelines (save style):

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

{{EFFORT}}

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
