# Combat and Progression Spec (v2)

Project: kids' Chinese-learning browser RPG (Phaser 4). Revised 2026-09-28 (PT) after Jack's review.
Previous version: `combat-spec-v1.md` (kept unchanged for reference).
Inputs: Jack's battle rules and review decisions (fixed), `core-curriculum.csv` (585 items, 9 realms, 40-item slice), and `chinese-rpg-design-memo.md`.

All numbers come from the updated simulator, `desy/build/combat_sim.py`:
- Full output: `combat_sim_out.txt`. It uses 200 simulated realm playthroughs per row.
- Price sensitivity: `combat_sim_sensitivity.py` / `_out.txt`.
- The v1 simulator and its output are kept as `combat_sim_v1.py` / `combat_sim_v1_out.txt`.

## What changed from v1 (Jack's decisions)

| # | Decision | Where |
|---|---|---|
| 1 | The question type is **not** tied to attack/defense. The learning engine picks item **and** way for every question, choosing the item's weakest of 4 ways (reading EN→ZH, reading ZH→EN, spoken EN→ZH, spoken ZH→EN). | §1.3, §3 |
| 2 | **No auto-heal.** HP/MP come back only from a paid inn or bought potions. The v1 boss checkpoint heal is removed; the checkpoint now only saves progress. | §1, §2, §7 |
| 3 | **No retry after a wrong spoken answer, no fallback to MC.** Wrong is wrong. Only technical failures (no speech at all, device or permission errors) re-prompt. | §8.1 |
| 4 | Max 3 enemies on screen (unchanged). | §1 |
| 5 | **No percentage unlock gates.** Beating a location's boss unlocks the next location. | §7 |
| 6 | Defeated enemies (HP 0) drop EXP and gold, and sometimes a chest (rates and contents set). | §7.2 |
| 7 | **Boss-approach patrols** spawn while the boss pool is under-learned. They add encounters but **never block the boss**. | §7.4 |
| 8 | **Proficient = 2 correct answers in each of the 4 ways** (2 reading ways for kids without speech), counted in total, not in a row. Proficient items still come back for review. Leitner boxes stay underneath for scheduling. | §3 |
| – | Modeled defaults until Jack decides: 0 HP means back to the inn, lose about 10% of gold, keep items and EXP. MP costs are proposed. | §6, §7.5 |
| – | New: death-spiral analysis, early prices, safety nets, and a speech accuracy model. | §7.5–7.7 |

Removed from v1: Learned/Mastered gates, location stars as gates, the attack=EN→ZH / defense=ZH→EN bias, speech retry and MC fallback, and the boss checkpoint heal. The elite gatekeeper is replaced by the location boss.

---

## 0. Glossary

| Term | Meaning |
|---|---|
| Item | One curriculum entry (word or phrase). |
| Way | One of 4 ways to answer: **R-ZE** reading ZH→EN (see or hear Chinese, tap the English meaning), **R-EZ** reading EN→ZH (see English, tap the Chinese), **S-ZE** spoken ZH→EN (hear or see Chinese, say the English), **S-EZ** spoken EN→ZH (see English, say the Chinese). "Reading" = multiple choice. |
| Active ways | 4 if speech is enabled for the kid, otherwise 2 (R-ZE and R-EZ). |
| Proficient | 2 correct answers (in total) in every active way. |
| Location | A village, dungeon or stage with a local pool of about 30 items. It **ends in a boss**. The realm's last location has the realm boss. |
| Boss pool | The current location's items plus up to 20 not-yet-proficient items carried over from earlier locations (oldest first). |
| Tier `t` | Numeric difficulty: realm 1 = 1 … realm 9 = 9, open-ended. All stats are formulas of `t`. |
| Restore | A full HP+MP refill: a paid inn stay, a free (pity) inn stay, or waking at the inn after a defeat. |

---

## 1. Battle flow

### 1.1 Turn order (unchanged)

A **round** = 1 hero turn + 1 enemy turn per living enemy on screen (max 3).

```
Round:
  1. Hero turn   -> Attack | Skill | Potion | Flee
                    Attack and question-type skills => 1 question
  2. Enemy phase -> for each living enemy, left to right: wind-up => 1 question => resolve block
  3. End of round -> tick cooldowns, spawn reinforcements (tier 10+), check end
```

- **Defense questions per round = living enemies on screen (≤ 3).** A 3-enemy round is 1 attack question + 3 defense questions. Extra enemies (tier 10+) wait as reinforcements.
- Potions and Flee use the hero turn **without** a question. Potions are capped at 3 per battle.
- **HP and MP carry over between battles.** Nothing refills them except an inn stay, a potion, a Heal skill (which costs MP), or waking at the inn after a defeat.

### 1.2 State machine

```
BATTLE_INIT (HP/MP carried over from the map)
  -> SCOUT            (the 7 focus items; new items get a teach card; skippable after 1 s)
  -> ROUND_START
  -> HERO_ACTION_SELECT
       Attack/Skill -> TARGET_SELECT -> ASK
       Potion       -> APPLY_POTION -> ENEMY_PHASE
       Flee         -> END_FLEE
  ASK:
       ENGINE_PICK           (item + way, §3.4)
    -> PROMPT_PLAY           (audio/text; options or mic locked)
    -> INPUT_UNLOCKED        (after the audio ends, or 800 ms for text-only prompts)
    -> AWAIT_ANSWER          MC tap | SPEECH_LISTEN -> SPEECH_RESULT
         SPEECH_RESULT = TECH_FAIL (no speech at all / device / permission / network error)
                           -> re-prompt the SAME question (max 2), then VOID (§8.1)
                       = TRANSCRIPT (any recognized text, or 'nomatch') -> graded, no retry
    -> GRADE                 (correct/wrong; update proficiency, Leitner, streak; log)
    -> FEEDBACK              (wrong: show the correct answer + audio + pinyin, 1.5 s min)
  -> RESOLVE_ATTACK / RESOLVE_BLOCK -> CHECK_END
  -> ENEMY_PHASE ... -> ROUND_END -> ROUND_START ...

On each enemy reaching HP 0: DROP (EXP + gold now; chest roll, §7.2)
CHECK_END:  all enemies dead (or boss dead: remaining minions flee)  -> VICTORY
            hero HP <= 0                                              -> DEFEAT
            boss HP <= 50% (first time)                               -> BOSS_CHECKPOINT (save only, NO heal)
VICTORY  -> REWARDS (EXP, gold, chest contents, proficiency summary) -> MAP (HP/MP as they are)
DEFEAT   -> INN: full HP/MP, lose gold per §7.5 (keep items, EXP and drops already collected);
            boss: next attempt starts at 50% boss HP if the checkpoint was reached
END_FLEE -> MAP (no loss; answers so far still count)
```

### 1.3 Question type is chosen by the learning engine, not by the turn

- Every question, attack or defense, is `(item, way)` chosen by §3.4. An attack can be R-ZE, and a defense can be S-EZ.
- The presentation adapts to the turn without changing the way. On a defense, the prompt is framed as the enemy's incoming spell ("Block it! What does 现在 mean?"). On an attack, it's the hero's spell ("Cast 'banana'!"). The way (input format) is the engine's choice.
- For spoken ways the mic button pulses. Tap to talk (push-to-talk).

### 1.4 Anti-guess-spam (kept)

- Options unlock after the prompt plays.
- Distractors come from the same topic and POS.
- Damage never depends on speed. Answers faster than 600 ms after unlock, on items that aren't proficient, don't raise the streak.
- Two fast wrong answers in a row trigger the companion's "Focus!" line and a 1.5 s unlock delay next time.
- Proficiency only counts graded, unhinted answers.

---

## 2. Damage model

### 2.1 Hero stats

```
HP_h  = 30 + 6*L          MP_h = 10 + 2*L
ATK_h = weaponATK + floor(L/2) + bonuses
DEF_h = armorDEF + shieldDEF + floor(L/3) + bonuses
Gear at tier g (common): weaponATK = 3g+2, armorDEF = 2g+1, shieldDEF = g
```

### 2.2 Formulas (unchanged from v1)

Rounding is `Math.round` (half up).

```
Hero attack:   wrong -> miss (0)
               right -> max(1, round(ATK_h * streakMult * (spoken ? 1.25 : 1) - 0.5*DEF_e))
Enemy attack:  right (block)  -> max(0, ATK_e - 1.25*DEF_h)                       // leak
               wrong (broken) -> max(ceil(0.5*ATK_e), ATK_e - 0.5*DEF_h)
```

`streakMult` counts consecutive correct answers (attack and defense) within a battle: ×1.0 for 0–2, ×1.25 for 3–5, ×1.5 for 6–9, ×2.0 for 10+. A wrong answer drops one tier. A spoken correct answer adds +1 extra streak.

### 2.3 Enemy stats by tier

`L_rec(t)` = 2, 4, 6, 9, 12, 15, 18, 21, 24 for t = 1..9, then `24 + 3(t−9)`. `ATK_ref`/`DEF_ref` are the stats of a hero at `L_rec(t)` with tier-t gear.

| Kind | HP | ATK | DEF | Adds |
|---|---|---|---|---|
| Normal (path fights and patrols) | `round(H(t) × (ATK_ref − 0.5t))` | `round(1.1 × DEF_ref)` | t | – |
| Location boss (every location except the realm's last) | `round(5 × (ATK_ref − 0.5t))` | `round(1.2 × DEF_ref)` | t | 1 minion |
| Realm boss (last location) | `round(7 × (ATK_ref − 0.5t))` | `round(1.3 × DEF_ref)` | t | 1 minion (t ≤ 3) or 2 minions; checkpoint at 50% HP (save only) |

`H(t)` = 3, 3, 2.5, 2.25, 2.25, 2, 2, 2, 2 (t ≥ 10: 2). Realm-boss ATK went from 1.35 to 1.3 × DEF_ref because the checkpoint heal is gone.

### 2.4 Worked examples

The normal-enemy numbers are unchanged from v1. The boss numbers use v2 stats.

| Location | Hero (HP / ATK / DEF) | Enemy (HP / ATK / DEF) | Hit (streak 0) | Correct block | Broken block |
|---|---|---|---|---|---|
| Starter Meadow (t1), horned rabbit | 42 / 6 / 4 | 16 / 4 / 1 | 6 − 0.5 = 5.5 → **6** (3 hits) | 4 − 5 → **0** | max(2, 4 − 2) = **2** |
| Starter Meadow location boss | 42 / 6 / 4 | 28 / 5 / 1 | 6 (5 hits) | 5 − 5 → **0** | max(3, 3) = **3** |
| Queen Bee 蜂后 (t2 realm boss) | 54 / 10 / 8 | 63 / 10 / 2 | 10 − 1 = **9** (7 hits) | 10 − 10 → **0** | max(5, 10 − 4) = **6** |
| Hydra Swamp (t5), bog lizard | 102 / 23 / 20 | 46 / 22 / 5 | 20.5 → **21** (3 hits; 2 on a streak) | 22 − 25 → **0** | max(11, 12) = **12** |
| Hydra 九头蛇 (t5 realm boss) | 102 / 23 / 20 | 144 / 26 / 5 | 21 (7 hits) | 26 − 25 = **1** (leak) | max(13, 16) = **16** |
| Hydra Swamp, **under-geared** (tier-3 gear, L9) vs bog lizard | 84 / 15 / 13 | 46 / 22 / 5 | 12.5 → **13** (4 hits) | 22 − 16.25 = 5.75 → **6** | 22 − 6.5 = 15.5 → **16** |
| Demon King's Castle (t9), demon knight | 174 / 41 / 36 | 73 / 40 / 9 | 36.5 → **37** (2 hits) | 40 − 45 → **0** | max(20, 22) = **22** |
| Demon King 魔王 (t9 realm boss) | 174 / 41 / 36 | 256 / 47 / 9 | 37 (7 hits) | 47 − 45 = **2** | max(24, 29) = **29** |
| Demon King, under-geared (tier-7 gear, L21) | 156 / 33 / 29 | 256 / 47 / 9 | 33 − 4.5 = 28.5 → **29** (9 hits) | 47 − 36.25 = 10.75 → **11** | 47 − 14.5 = 32.5 → **33** |

Because HP now carries over, a broken block costs more than one fight's worth: it's HP the kid has to pay to get back (inn or potion).

### 2.5 Length targets

These are about the same as v1 at about 8–10 s per question.

| Battle | Rounds | Questions | Time |
|---|---|---|---|
| Normal, tiers 1–3 | 5–7 | 11–15 | 1.5–2.5 min |
| Normal, tiers 4–9 | 6–8 | 15–22 | 2.5–3.5 min |
| Location boss | 7–10 | 18–25 | 3–4 min |
| Realm boss | 9–12 | 22–30 | 4–6 min |

A soft cap at 30 questions (location boss 40, realm boss 45) makes enemies "Tired" (ATK −30%, hero damage +50%). Its firing rate is logged.

---

## 3. Proficiency model (reworked)

### 3.1 Definition

Per item, the engine tracks each **way** separately:

```
WayStat { correct: int; attempts: int; runLen: int /* current correct run */;
          box: 0..6; lastSeen; lastPromo; dueAt /* Leitner, scheduling only */ }
Item progress = { R-ZE, R-EZ, S-ZE, S-EZ : WayStat }
```

- `activeWays` = all 4 if the kid has speech enabled and working, else `[R-ZE, R-EZ]`. This is the modeled default for kids without speech (§10.3 Q).
- **Proficient(item)** = every active way has `correct ≥ 2`. It counts **in total, not in a row** (Jack's default).
- **Way progress** = `min(correct, 2)`. **Item progress** = the sum over active ways ÷ (2 × active ways), from 0 to 1. The HUD shows it as up to 8 pips (4 without speech).
- **Hints:** a correct answer given after the Insight hint doesn't add to `correct`.
- **Speech turned on later:** items proficient under 2 ways drop back to "reading-proficient". They regain Proficient after 2 spoken correct answers in each spoken way. The boss pool's carry-over cap (20 items) stops this from flooding patrols (§7.4).

**Variant "twice in a row"** (flagged for Jack): a way counts once it has a run of 2 consecutive correct answers. It stays satisfied afterwards. Sim cost vs "twice total", with the diligent kid and a 50% trigger:

| Kid | Patrols per location (total → in a row) |
|---|---|
| Tier 1, no speech | 5.5–6.2 → 6.8–9.9 (+10–80%; the worst hit is at 50% accuracy) |
| Tier 1, speech on | 17.6–18.9 → 20.7–28.5 (+10–60%) |
| Tier 5, speech on | 11–17 → 18–20 |

"In a row" mostly punishes low-accuracy kids, whose runs keep breaking. The final share of proficient items barely moves (82% vs 79–81%). **Recommendation: keep "twice total".**

### 3.2 Leitner underneath (scheduling only)

Each way keeps a Leitner box that decides **when** it comes back. Proficiency decides **what counts as learned**.

| Event (per way) | Box | Proficiency counter |
|---|---|---|
| Correct, unhinted, and (due or box ≤ 1) | +1 | `correct += 1` |
| Correct but not due (box ≥ 2) | no change | `correct += 1` (still counts toward the 2) |
| Correct with hint | no change | no change |
| Wrong | −2 (floor 0) | no change. Proficiency is **sticky**; see "rusty" below. |

`INTERVAL[box]` = 0, 10 min, 1 d, 3 d, 7 d, 16 d, 35 d.

**Proficient items in review:** their selection weight is 0.15 unless a way is **due**. A due way raises the weight by `1.5 × min(overdueRatio, 2)`, so proficient items come back on the Leitner schedule, on average every few battles, and more often right after a miss.

**Rusty (proposed, not simulated):** if a proficient item gets the same way wrong in 2 consecutive reviews, that way's `correct` resets to 1, so the item needs one more correct answer to be proficient again. This keeps "proficient" honest without wiping progress. Flagged for Jack.

### 3.3 Choosing the 7 (battle set)

This is the same as v1 with two changes: weights use proficiency, and there's a **working set**.

```python
SET_SIZE = 7; NEW_CAP = 4; WORKING_SET = 10     # max seen-but-not-proficient local items

def choose_battle_set(location, kid):
    carried = kid.not_proficient(earlier_items)[:20]            # carry-over "debt", oldest first
    review  = kid.unlocked_items_before(location)
    s  = weighted_sample(review, w_review, location.review_slots)   # 0..3 slots by tier (§5)
    unseen = [i for i in location.items if not kid.seen(i)]
    active = [i for i in location.items if kid.seen(i) and not kid.proficient(i)]
    new_quota = min(NEW_CAP, len(unseen), max(0, WORKING_SET - len(active)))
    if len(active) + len(s) < SET_SIZE - new_quota:                 # early in a location: fill with new
        new_quota = min(len(unseen), SET_SIZE - len(s) - len(active))
    s += unseen[:new_quota]                                         # authored order
    s += weighted_sample([i for i in location.items + carried if kid.seen(i) and i not in s],
                         w_local, SET_SIZE - len(s))
    return sorted(s, key=lambda i: kid.progress(i) + uniform(0, 0.08))   # weakest first

def w_local(i):
    if kid.proficient(i): return 0.15 + 1.5*min(kid.max_overdue(i), 2)
    return 1.0 + 2.0*(1 - kid.progress(i)) + 0.8*kid.recent_misses(i)

def w_review(i):  # earlier locations
    return (0.15 if kid.proficient(i) else 1.0 + 2.0*(1 - kid.progress(i))) + 1.5*min(kid.max_overdue(i), 2)
```

Why a working set: with "weakest first" and no cap, progress spreads evenly over all 30 items, so no item is proficient for a long time. The HUD would show "0 of 30 ready" for many battles. In the sim, a working set of 10 cut patrols by about 10% and made the proficient count rise steadily. It doesn't change the total learning required.

### 3.4 Picking the way for each question

```python
def pick_way(item):
    ways = kid.active_ways()
    todo = [w for w in ways if item[w].correct < 2]                 # the weakest ways first
    if todo:
        return min(todo, key=lambda w: (item[w].correct,             # fewest corrects
                                        est_acc(item[w]),            # then lowest (c+1)/(a+2)
                                        random()))
    return max(ways, key=lambda w: (overdue(item[w]), -est_acc(item[w]), random()))   # proficient: most overdue way
```

- Consequence: speech-on kids get about **55%** spoken questions, and spoken EN→ZH (the hardest) is picked most often. This is intended, but it lowers their in-battle accuracy (§7.6).
- Presentation per way:
  - **R-ZE:** characters (or pinyin + audio if `reading = N`), audio, English options.
  - **R-EZ:** English prompt; Chinese options with pinyin until R-ZE has 2 correct.
  - **S-ZE:** Chinese audio + characters; the kid says the English meaning (`en-US` recognizer).
  - **S-EZ:** English prompt plus a picture if available; the kid says the Chinese (`zh-CN` recognizer).
- The first-ever question on an item uses one fewer MC option (minimum 2).

---

## 4. When all 7 have been asked (unchanged rule)

**Re-ask missed items first (gap ≥ 2 questions), then cycle the weakest of the 7. Max 4 asks per item per battle. No new items mid-battle.**

- A re-ask of a missed item uses the **same way**, with options reshuffled and one distractor swapped.
- A re-ask after a correct answer goes to the item's next-weakest way.
- The soft cap (§2.5) ends pathological fights.

The justification is unchanged. Battles always outlast the 7 items, and re-asking just-missed items is the most valuable repetition. Mid-battle bonus items would dilute the 7-item focus.

---

## 5. Difficulty by location (updated)

Every location = 6 scripted path fights + a boss-approach zone (patrols while under-learned, §7.4) + the location boss. There are 20 locations in total (3/2/2/3/2/2/2/2/2 per realm).

| # | Realm | Locs | Enemies / fight | MC options | Local pool | Review slots of 7 | Normal HP / ATK / DEF | Location boss HP / ATK | Realm boss HP / ATK | Rec. level | Gear tier | Hero at rec (HP / MP / ATK / DEF) | Gold per normal enemy | Inn | Honey Potion |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Starter Meadow | 3 | 1–2 | 3 | ~30 | 0 (loc 1), 1 | 16 / 4 / 1 | 28 / 5 | 38 / 5 (角兔王) | 1–3 | 1 | 42 / 14 / 6 / 4 | 6 | 12 | 6 |
| 2 | Honeycomb Forest | 2 | 1–2 | 3 | ~35 | 1 | 27 / 9 / 2 | 45 / 10 | 63 / 10 (蜂后) | 3–5 | 2 | 54 / 18 / 10 / 8 | 12 | 24 | 12 |
| 3 | Crossroads Market | 2 | 2 | 4 | ~25 | 2 | 31 / 13 / 3 | 62 / 14 | 88 / 16 | 5–7 | 3 | 66 / 22 / 14 / 12 | 18 | 36 | 18 |
| 4 | Goblin Caves | 3 | 2–3 | 4 | ~30 | 2 | 36 / 18 / 4 | 80 / 19 | 112 / 21 | 7–10 | 4 | 84 / 28 / 18 / 16 | 27 | 54 | 27 |
| 5 | Hydra Swamp | 2 | 2–3 | 4 | ~30 | 2 | 46 / 22 / 5 | 102 / 24 | 144 / 26 (九头蛇) | 10–13 | 5 | 102 / 34 / 23 / 20 | 36 | 72 | 36 |
| 6 | Zombie Lands | 2 | 3 | 5 | ~34 | 2 | 48 / 26 / 6 | 120 / 29 | 168 / 31 | 13–16 | 6 | 120 / 40 / 27 / 24 | 45 | 90 | 45 |
| 7 | Griffin Peaks | 2 | 3 | 5 | ~32 | 3 | 57 / 31 / 7 | 142 / 34 | 200 / 36 | 16–19 | 7 | 138 / 46 / 32 / 28 | 54 | 108 | 54 |
| 8 | Ogre Colosseum | 2 | 3 | 6 | ~26 | 3 | 64 / 35 / 8 | 160 / 38 | 224 / 42 | 19–22 | 8 | 156 / 52 / 36 / 32 | 63 | 126 | 63 |
| 9 | Demon King's Castle | 2 | 3 | 6 | ~24 + review | 3 (boss: 4) | 73 / 40 / 9 | 182 / 43 | 256 / 47 (魔王) | 22–25 | 9 | 174 / 58 / 41 / 36 | 72 | 144 | 72 |

**Boss-approach trigger:** patrols spawn while fewer than **40%** of the boss pool's items are proficient, or **25%** for speech-on kids (§7.4). This is the same in every realm.

**Past realm 9, by formula:**
- Stats: §2.3 with `L_rec = 24 + 3(t−9)`.
- Enemies: 3 on screen, plus `floor((t−9)/2)` reinforcements (max 6 total).
- MC options capped at 6.
- Review share: `min(0.5, 3/7 + 0.03(t−9))`.
- Prices: gold per normal enemy = 3 × L_rec(t); inn = 2× that; Honey Potion = 1× that.
- Prompt hardening: pinyin hidden at t ≥ 10; confusable distractors at t ≥ 12.

---

## 6. Equipment, skills and MP

### 6.1 Slots (unchanged)

| Slot | Unlock |
|---|---|
| Weapon, Armor, Shield | start |
| Charm | L3 |
| Skill slots | 2 (L1), 3 (L8), 4 (L16), 5 (L24) |
| Potion belt | 3 uses per battle |

### 6.2 Stat ranges by tier and rarity

Common = formula value. Fine = +15% plus a minor perk. Heroic = +30% plus a named perk, from bosses and quests only.

| Tier | Weapon ATK (common–heroic) | Armor DEF | Shield DEF | Shop price (weapon / armor / shield) |
|---|---|---|---|---|
| 1 | 5–7 | 3–4 | 1–2 | 60 / 50 / 35 |
| 2 | 8–10 | 5–7 | 2–3 | 120 / 95 / 70 |
| 3 | 11–14 | 7–9 | 3–4 | 220 / 175 / 130 |
| 4 | 14–18 | 9–12 | 4–5 | 380 / 300 / 230 |
| 5 | 17–22 | 11–14 | 5–7 | 650 / 520 / 390 |
| 6 | 20–26 | 13–17 | 6–8 | 900 / 720 / 540 |
| 7 | 23–30 | 15–20 | 7–9 | 1150 / 920 / 690 |
| 8 | 26–34 | 17–22 | 8–10 | 1400 / 1120 / 840 |
| 9 | 29–38 | 19–25 | 9–12 | 1700 / 1360 / 1020 |
| t | 3t+2 … ×1.3 | 2t+1 … ×1.3 | t … ×1.3 | ≈ 190t (t ≥ 5) |

### 6.3 Example gear (names double as vocabulary exposure)

| Tier | Weapon | Armor | Shield | Heroic drop (boss) |
|---|---|---|---|---|
| 1 | 木剑 Wooden Sword | 布衣 Cloth Tunic | 锅盖盾 Pot-lid Shield | 角兔角 Rabbit-Horn Dagger (+1 streak at battle start) |
| 2 | 蜂刺短剑 Stinger Dagger | 花瓣斗篷 Petal Cloak | 蜂蜡盾 Beeswax Shield | 蜂后之冠 Queen's Crown (charm: +6 max MP) |
| 3 | 铁剑 Iron Sword | 皮甲 Leather Armor | 圆盾 Round Shield | 宝箱盾 Mimic Shield (Thorns 25%) |
| 4 | 弯刀 Scimitar | 矿工护甲 Miner's Plate | 石盾 Stone Shield | 哥布林王冠 Goblin Crown (+10% gold) |
| 5 | 蛇牙矛 Hydra-fang Spear | 鳞甲 Scale Mail | 沼泽盾 Bog Shield | 九头蛇鳞 Hydra Scale (first broken block per battle −50%) |
| 6 | 圣光锤 Holy Mace | 医者长袍 Healer's Robe | 银盾 Silver Shield | 解药瓶 Cure Flask (Heal +10%) |
| 7 | 狮鹫羽弓 Griffin Bow | 风之甲 Wind Mail | 云盾 Cloud Shield | 狮鹫羽 Griffin Feather (Frost costs 3 MP instead of 5) |
| 8 | 冠军大剑 Champion Blade | 角斗士铠甲 Gladiator Plate | 塔盾 Tower Shield | 冠军腰带 Champion Belt (streak 10 tier = ×2.25) |
| 9 | 勇者之剑 Hero's Sword | 龙鳞甲 Dragon-scale Mail | 精灵盾 Elven Shield | (the Demon King drops cosmetics and a title; the game is won) |

### 6.4 Skills with MP costs (new)

MP is restored **only** by an inn stay, waking at the inn after a defeat, or a Mana Tea. There's no regeneration. `MP_h = 10 + 2L`, which gives 14 at L2, 34 at L12 and 58 at L24.

| Skill | Effect | MP | Limit | Earned |
|---|---|---|---|---|
| **Insight 提示** | Removes 1 distractor from the current MC question. Correct still counts in combat but not for proficiency. | 3 | 2 per battle | start |
| **Guardian Shield 守护盾** | The first wrong block in a battle becomes a correct block (leak still applies). Auto-fires if equipped and MP ≥ 5. | 5 | 1 per battle (rank 2: 2) | Starter Meadow realm boss |
| **Double Strike 连击** | At streak ≥3, a correct attack hits twice (2nd hit 50%) | 4 | every 3 rounds | L5 |
| **Heal 治疗** | Replaces the attack: answer one question. Correct heals 35% max HP; wrong fizzles. **MP is spent either way.** | 6 | 2 per battle | Honeycomb quest |
| **Frost Word 冰冻** | A correct attack also freezes the target, which skips its next attack | 5 | every 3 rounds | Griffin Peaks boss |
| **Sweep 横扫** | A correct attack hits all enemies at 60% | 8 | every 4 rounds | Zombie Lands boss |
| **Second Wind 再起** | At 0 HP, revive at 30% (auto) | 12 | 1 per battle | Castle quest |
| Thorns 反击 / Echo Voice 回音 / Rally 鼓舞 | Passives, as in v1 | 0 | – | as in v1 |

Budget check: at L4 a kid has 18 MP, enough for one Guardian Shield plus two Heals (17). The simulator equips Heal and Guardian Shield from tier 2. MP running dry is a common reason to visit the inn in mid-game.

**Consumables** (the shop price scales with tier; `G` = gold per normal enemy):

| Item | Effect | Price | From |
|---|---|---|---|
| Honey Potion 蜂蜜药水 | +40% max HP (in battle: uses the turn, no question) | 1 × G (t1: 6) | shop, chests; 1 free at the start |
| Big Honey 大蜂蜜 | +70% max HP | 2 × G | shop from tier 5, chests |
| Mana Tea 魔力茶 | +50% max MP | 1 × G | shop, chests |

### 6.5 How gear is earned (no pay-to-win)

There's no real money and no premium currency. Gear comes from:
- **Shop:** common gear, priced at about 8 at-level battles of gold.
- **Chests:** see §7.2.
- **Location bosses:** a guaranteed fine piece.
- **Realm bosses:** a guaranteed heroic piece plus a skill.
- **Quests:** fine and heroic pieces, and skills.
- **Proficiency milestones:** rank-ups for skills, e.g. 40 and 120 proficient items.

---

## 7. Progression, economy and safety nets

### 7.1 Unlocks: beat the boss (no percentage gates)

- The next location unlocks when the kid **beats the current location's boss**. The next realm unlocks when the realm boss is beaten.
- No proficiency, Learned or level gate is ever required. Levels remain a recommendation, shown as a warning if the kid is 2+ levels under.
- Why this is safe for learning: every later pool folds in earlier items (review slots plus carried-over non-proficient items), and the boss approach adds practice when the pool is under-learned (§7.4).

### 7.2 Drops (EXP, gold, chests)

When an enemy's HP hits 0, its drops are collected **immediately**. They're kept even if the hero is defeated later in the same fight.

| Enemy | EXP | Gold | Chest chance |
|---|---|---|---|
| Normal (path or patrol) | 6 × L_rec(t) | 3 × L_rec(t) × U(0.8, 1.2): **never below 80% of base** | 10% |
| Location boss | 20 × L_rec(t) | 5 × base | 100% |
| Realm boss | 50 × L_rec(t) | 10 × base | 100% |

Gold per normal enemy (`G`): t1 6, t2 12, t3 18, t4 27, t5 36, t6 45, t7 54, t8 63, t9 72.

Chest contents:

| Chest | Contents |
|---|---|
| Normal enemy chest | 40%: gold = 3 × G. 40%: 1 Honey Potion. 10%: 1 Mana Tea. 10%: 1 fine gear piece of the location tier. |
| Location boss chest | 3 × G gold + 1 Honey Potion + a guaranteed fine gear piece. |
| Realm boss chest | 3 × G gold + 1 Honey Potion + a guaranteed heroic piece + a skill unlock. |

EXP from proficiency (never damped): +10 per way completed (2nd correct in a way) and +30 when an item becomes Proficient.

EXP damping: enemy EXP ×0.25 if the hero is 3+ levels above the location's recommended maximum.

The level curve is unchanged: 100 × L EXP from L to L+1.

### 7.3 Inn

- **Price = 2 × G** (t1 12 gold … t9 144 gold). A stay gives full HP and MP.
- Every village has an inn. Every location map has an inn or campfire-inn at its entrance and one at the boss approach.
- The simulator assumes the kid can reach an inn between any two fights. If maps get long, add a cheap "Return Feather" warp (1 × G).
- Starting gold is 24 (2 inn stays), plus 1 free Honey Potion.

### 7.4 Boss-approach patrols (extra encounters)

**What:** the zone just before each location boss. While **boss readiness** is below the trigger, **patrols** (normal enemies of the location's roster) walk the approach path.

**Boss readiness** = proficient items ÷ items in the boss pool. The boss pool is the location's ~30 items plus up to 20 not-yet-proficient earlier items. The HUD shows it at the approach gate: "Ready words: 9 / 30 (need 12)".

**Default trigger (tuned):** **40%** of the boss pool proficient for kids without speech, and **25%** for speech-on kids. Jack's proposal was 50% for everyone. The sim justification is in §7.7.

**How it plays:**

1. Walking from the last path fight to the boss gate while below the trigger, the kid meets **2 patrols** ("each approach trip"). They can't be sneaked past. This is the only forced cost.
2. After those 2, the **boss gate is always open**. The kid chooses **Enter** (fight the boss now) or **Train**, which spawns another patrol right away and is repeatable.
3. When readiness reaches the trigger, patrols disappear (one optional wandering patrol stays for farming), and the gate glows "Ready!".
4. If the kid loses to the boss, they wake at the inn. Walking back to the gate triggers up to 2 more patrols if still below the trigger, so failing the boss automatically means a bit more practice.
5. Patrol fights use the normal 7-item selection, which already favors the least-proficient items. So patrols target exactly what's missing.

**It never blocks the boss.** It adds 2 encounters per approach trip plus any optional training. That keeps Jack's "beat the boss to unlock" rule intact.


### 7.5 Defeat, the 0-HP rule, and safety nets (recommended)

At 0 HP the kid wakes at the inn with full HP and MP and keeps all items, EXP and drops. **Gold loss follows the default rule plus nets 2–3:**

| # | Safety net | Rule | Sim evidence (realm runs; "none" vs the recommended nets) |
|---|---|---|---|
| 1 | **Pity inn** | If gold < inn price, the inn stay is free ("Rest, little hero, pay me later!"). | Without it, a spend-everything kid hits "HP < 50%, can't afford the inn, no potion" **0.4–6.7 times per realm** (worst at tier 1: 1.5–6.7). With it, **0**. Used 0.2–5.4 times per realm. |
| 2 | **Gold-loss floor** | A defeat never takes gold below 2 × inn price. | Runs where gold hit 0 at some point: up to **9–10%** without nets (tiers 1–2, 45% effective accuracy), down to **≤1%**. |
| 3 | **Defeat fee = max(10% of gold, 1 inn price)**, applied only to gold above the floor | Waking at the inn after a defeat should never be cheaper than paying for the inn. | With a flat 10%, dying costs less than the inn whenever gold < 10 inn prices, which covers almost every kid: spender median gold is 1–4 inn prices. A kid could learn "die to heal". Cost of the fix: at 50% accuracy, tier 5+, gold lost to defeats rises about 40% (e.g. t5 speech-on 572 → 789 per realm). |
| 4 | **Free starter potion + broke potion** | 1 Honey Potion at the start. After a defeat or pity stay with 0 potions and gold < inn, get 1 free. | Small effect. It guarantees an emergency heal in the first boss fight. |
| 5 | **Courage** | After each consecutive defeat, +20% DEF (max +60%), shown as a buff icon. Resets on a win. | At 50% accuracy, defeat rate per battle drops 5–9 points (t5 speech-on 57% → 48%; t9 66% → 60%; saver 46% → 40%). Negligible at ≥ 75%. |
| 6 | **Minimum payout** | Enemy gold never below 80% of base; every defeated enemy pays. | Built into the drop roll. It's why income stays positive even at 50% accuracy. |
| 7 | **Boss checkpoint (save only)** | After the boss drops below 50% HP, retries start there. | Keeps boss retries from repeating the easy half. |

The sim label **"nets"** in `combat_sim_out.txt` = nets 1, 2 and 4. **"nets+"** (recommended) = all of 1–7.

### 7.6 Death-spiral analysis (multi-battle sessions)

**Model.** One full realm playthrough per run: every location's 6 path fights, the boss approach, and bosses with retries.
- HP and MP carry over, inns cost gold, and potions are bought.
- Hero at the recommended level and gear, with Heal and Guardian Shield from tier 2.
- 200 runs per row.

**Two kid profiles:**
- **Spender:** spends every coin on gear or cosmetics after each fight (a sink priced as in §6.2, then cosmetics at 1.5 × inn), keeps no potions, and rushes the boss after the 2 forced patrols. This is the death-spiral stress test.
- **Saver:** keeps 2 inn stays in reserve, keeps 2 potions, and trains until the trigger clears.

Both rest when HP < 50%, or < 80% before a boss.

**Speech accuracy assumption.** "MC acc" is the kid's accuracy on a new item in reading ZH→EN. Other ways:

| Way | Accuracy |
|---|---|
| Reading EN→ZH | acc − 3 pts |
| Spoken ZH→EN | acc × 0.95 (en-US recognizer rejects about 5% of correct kid answers) |
| Spoken EN→ZH | (acc − 10 pts) × 0.85 (production is harder; zh-CN recognizer rejects about 15% of correct kid Mandarin) |

Each prior correct answer in a way adds +4 pts (cap 97%). With the engine choosing weakest ways, **effective in-battle accuracy for speech-on kids is 6–8 pts below MC accuracy** (e.g. 65% → 59–60%). The ASR rates are assumptions: there's no published false-reject rate for children's Mandarin in Chrome's recognizer. Measure them in the playtest (§10.2).

**Results: spender (stress case), no nets → recommended nets**
| Tier | MC acc | Speech | Effective acc | Battles/realm | Battles between restores | Defeats per battle (none → nets) | Stuck events/realm (none → nets) | Runs where gold hit 0 (none → nets) | Gold lost to defeats/realm (none → nets) | Inn+potion share of income | Gold spent on gear/realm |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 50% | off | 51% | 26 | 2.7 | 7% → 0% | 6.6 → 0.0 | 4% → 1% | 2.4 → 0.3 | 13% | 391 |
| 1 | 65% | off | 66% | 26 | 4.2 | 1% → 0% | 5.1 → 0.0 | 1% → 0% | 0.2 → 0.0 | 8% | 412 |
| 1 | 75% | off | 76% | 26 | 6.0 | 0% → 0% | 3.5 → 0.0 | 0% → 0% | 0.0 → 0.0 | 5% | 428 |
| 1 | 90% | off | 90% | 27 | 13.5 | 0% → 0% | 1.5 → 0.0 | 0% → 0% | 0.0 → 0.0 | 2% | 443 |
| 1 | 50% | on | 45% | 28 | 2.3 | 12% → 2% | 6.7 → 0.0 | 9% → 1% | 4.9 → 2.1 | 16% | 386 |
| 1 | 65% | on | 59% | 27 | 3.5 | 3% → 0% | 5.7 → 0.0 | 3% → 0% | 0.9 → 0.1 | 10% | 415 |
| 1 | 75% | on | 69% | 27 | 4.7 | 0% → 0% | 4.6 → 0.0 | 0% → 0% | 0.1 → 0.0 | 7% | 427 |
| 1 | 90% | on | 83% | 27 | 8.6 | 0% → 0% | 2.6 → 0.0 | 0% → 0% | 0.0 → 0.0 | 4% | 439 |
| 2 | 50% | off | 51% | 18.8 | 2.0 | 14% → 5% | 3.4 → 0.0 | 5% → 0% | 11.2 → 13.7 | 22% | 497 |
| 2 | 65% | off | 66% | 18.0 | 3.0 | 2% → 0% | 3.4 → 0.0 | 1% → 0% | 0.9 → 0.2 | 13% | 562 |
| 2 | 75% | off | 76% | 18.0 | 4.5 | 0% → 0% | 3.1 → 0.0 | 0% → 0% | 0.1 → 0.0 | 7% | 597 |
| 2 | 90% | off | 90% | 18.0 | 11.8 | 0% → 0% | 1.1 → 0.0 | 0% → 0% | 0.0 → 0.0 | 2% | 623 |
| 2 | 50% | on | 45% | 20 | 1.7 | 24% → 15% | 2.8 → 0.0 | 10% → 1% | 24 → 35 | 26% | 459 |
| 2 | 65% | on | 59% | 18.1 | 2.5 | 7% → 1% | 3.9 → 0.0 | 2% → 0% | 4.3 → 1.8 | 16% | 534 |
| 2 | 75% | on | 69% | 18.0 | 3.4 | 2% → 0% | 3.5 → 0.0 | 0% → 0% | 0.8 → 0.0 | 11% | 578 |
| 2 | 90% | on | 83% | 18.0 | 6.6 | 0% → 0% | 1.9 → 0.0 | 0% → 0% | 0.0 → 0.0 | 5% | 613 |
| 5 | 50% | off | 52% | 22 | 1.4 | 32% → 28% | 1.1 → 0.0 | 1% → 0% | 208 → 369 | 26% | 1436 |
| 5 | 65% | off | 67% | 18.4 | 2.4 | 7% → 4% | 2.0 → 0.0 | 1% → 0% | 27 → 37 | 15% | 2193 |
| 5 | 75% | off | 76% | 18.0 | 3.6 | 2% → 0% | 2.2 → 0.0 | 0% → 0% | 3.4 → 1.1 | 9% | 2372 |
| 5 | 90% | off | 91% | 18.0 | 9.7 | 0% → 0% | 1.1 → 0.0 | 0% → 0% | 0.0 → 0.0 | 3% | 2506 |
| 5 | 50% | on | 46% | 31 | 1.2 | 57% → 48% | 0.8 → 0.0 | 1% → 0% | 572 → 789 | 27% | 1075 |
| 5 | 65% | on | 60% | 19.8 | 1.8 | 17% → 12% | 2.1 → 0.0 | 0% → 1% | 85 → 123 | 19% | 2007 |
| 5 | 75% | on | 69% | 18.3 | 2.7 | 6% → 2% | 2.1 → 0.0 | 1% → 0% | 19.3 → 17.9 | 13% | 2240 |
| 5 | 90% | on | 83% | 18.0 | 5.3 | 0% → 0% | 1.8 → 0.0 | 0% → 0% | 1.2 → 0.0 | 6% | 2462 |
| 9 | 50% | off | 54% | 23 | 1.4 | 40% → 36% | 0.4 → 0.0 | 2% → 0% | 684 → 989 | 20% | 2902 |
| 9 | 65% | off | 68% | 18.3 | 2.2 | 8% → 5% | 1.2 → 0.0 | 0% → 0% | 107 → 119 | 16% | 4717 |
| 9 | 75% | off | 77% | 18.0 | 3.1 | 1% → 0% | 1.4 → 0.0 | 0% → 0% | 9.9 → 9.0 | 11% | 5179 |
| 9 | 90% | off | 91% | 18.0 | 8.5 | 0% → 0% | 0.8 → 0.0 | 0% → 0% | 0.0 → 0.0 | 3% | 5713 |
| 9 | 50% | on | 47% | 37 | 1.2 | 66% → 60% | 0.4 → 0.0 | 0% → 0% | 2039 → 2525 | 22% | 1287 |
| 9 | 65% | on | 60% | 21 | 1.7 | 21% → 17% | 1.1 → 0.0 | 0% → 0% | 313 → 458 | 18% | 4197 |
| 9 | 75% | on | 69% | 18.4 | 2.3 | 6% → 3% | 1.4 → 0.0 | 0% → 0% | 70 → 72 | 15% | 4909 |
| 9 | 90% | on | 83% | 18.0 | 4.4 | 0% → 0% | 1.4 → 0.0 | 0% → 0% | 0.7 → 0.0 | 7% | 5404 |

"Battles between restores" = fights per restore (paid inn, pity inn or waking after a defeat). "Stuck event" = after a fight, HP < 50%, gold < inn price, and no potion.

**Results: saver with recommended nets (the realistic, diligent kid)**
| Tier | MC acc | Speech | Effective acc | Battles/realm | Patrols/location | Battles between restores | Defeats per battle | Paid inn stays/realm | Potions used/realm | Min gold after battle 5 (median) | Gold at battle 10 / 20 (median) | Inn+potion share of income | Gold spent on gear/realm |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 50% | off | 51% | 34 | 4.5 | 2.9 | 0% | 11.5 | 7.7 | 21 | 47 / 33 | 32% | 347 |
| 1 | 65% | off | 66% | 35 | 4.6 | 4.5 | 0% | 7.6 | 1.9 | 23 | 40 / 33 | 19% | 417 |
| 1 | 75% | off | 76% | 35 | 4.7 | 6.6 | 0% | 5.1 | 0.4 | 26 | 41 / 32 | 12% | 445 |
| 1 | 90% | off | 90% | 37 | 5.3 | 15.6 | 0% | 2.1 | 0.0 | 31 | 39 / 34 | 5% | 504 |
| 1 | 50% | on | 45% | 53 | 10.6 | 2.7 | 1% | 19.1 | 15.3 | 18.9 | 52 / 36 | 41% | 405 |
| 1 | 65% | on | 59% | 54 | 10.9 | 3.9 | 0% | 13.4 | 6.0 | 20 | 42 / 33 | 25% | 530 |
| 1 | 75% | on | 69% | 56 | 11.5 | 5.4 | 0% | 10.0 | 2.1 | 21 | 44 / 33 | 17% | 592 |
| 1 | 90% | on | 83% | 58 | 12.4 | 10.6 | 0% | 5.3 | 0.2 | 24 | 47 / 34 | 9% | 673 |
| 2 | 50% | off | 51% | 28 | 7.0 | 2.1 | 1% | 12.9 | 9.7 | 45 | 106 / 79 | 49% | 403 |
| 2 | 65% | off | 66% | 29 | 7.3 | 3.3 | 0% | 8.5 | 2.1 | 47 | 98 / 65 | 27% | 593 |
| 2 | 75% | off | 76% | 30 | 7.9 | 4.8 | 0% | 5.8 | 0.4 | 50 | 83 / 65 | 18% | 677 |
| 2 | 90% | off | 90% | 31 | 8.4 | 13.3 | 0% | 1.9 | 0.0 | 59 | 98 / 64 | 6% | 807 |
| 2 | 50% | on | 45% | 41 | 13.0 | 1.9 | 6% | 19.2 | 18.7 | 39 | 87 / 79 | 62% | 360 |
| 2 | 65% | on | 59% | 42 | 14.0 | 2.7 | 0% | 15.3 | 6.7 | 40 | 122 / 71 | 38% | 666 |
| 2 | 75% | on | 69% | 44 | 14.9 | 3.8 | 0% | 11.3 | 2.0 | 43 | 85 / 69 | 26% | 821 |
| 2 | 90% | on | 83% | 46 | 15.9 | 7.6 | 0% | 5.7 | 0.1 | 48 | 96 / 65 | 12% | 1007 |
| 5 | 50% | off | 52% | 23 | 2.3 | 1.6 | 22% | 8.7 | 15.2 | 188 | 422 / 382 | 42% | 1012 |
| 5 | 65% | off | 67% | 21 | 3.3 | 2.8 | 2% | 6.8 | 9.3 | 218 | 328 / 212 | 26% | 1989 |
| 5 | 75% | off | 77% | 22 | 3.9 | 4.0 | 0% | 5.1 | 3.9 | 208 | 345 / 206 | 16% | 2399 |
| 5 | 90% | off | 91% | 24 | 4.8 | 11.0 | 0% | 1.8 | 0.1 | 221 | 429 / 192 | 4% | 2925 |
| 5 | 50% | on | 46% | 36 | 5.7 | 1.4 | 40% | 11.7 | 21 | 144 | 246 / 485 | 48% | 593 |
| 5 | 65% | on | 60% | 30 | 7.5 | 2.2 | 7% | 11.2 | 16.4 | 169 | 558 / 327 | 35% | 2147 |
| 5 | 75% | on | 69% | 31 | 8.5 | 3.1 | 2% | 9.3 | 10.9 | 168 | 333 / 212 | 24% | 2820 |
| 5 | 90% | on | 83% | 35 | 10.5 | 6.2 | 0% | 5.4 | 2.2 | 189 | 372 / 201 | 10% | 3750 |
| 9 | 50% | off | 54% | 22 | 1.0 | 1.5 | 28% | 7.5 | 14.6 | 469 | 1031 / 1199 | 36% | 1909 |
| 9 | 65% | off | 68% | 19.0 | 2.2 | 2.3 | 4% | 7.1 | 9.1 | 571 | 777 / 437 | 26% | 3874 |
| 9 | 75% | off | 77% | 19.8 | 2.9 | 3.2 | 0% | 5.9 | 3.9 | 526 | 826 / 369 | 17% | 5003 |
| 9 | 90% | off | 91% | 22 | 3.8 | 9.3 | 0% | 1.9 | 0.0 | 524 | 1022 / 396 | 4% | 6197 |
| 9 | 50% | on | 47% | 35 | 2.4 | 1.3 | 53% | 8.8 | 17.8 | 288 | 503 / 944 | 40% | 581 |
| 9 | 65% | on | 60% | 26 | 4.8 | 2.0 | 13% | 9.4 | 15.9 | 447 | 1512 / 900 | 32% | 3969 |
| 9 | 75% | on | 70% | 26 | 5.8 | 2.5 | 2% | 9.4 | 10.6 | 420 | 1093 / 771 | 25% | 5492 |
| 9 | 90% | on | 83% | 30 | 7.9 | 4.8 | 0% | 5.9 | 1.8 | 421 | 762 / 401 | 11% | 7482 |

**Conclusions**

1. **There is no gold death spiral, even without nets.** Two things prevent it. A defeat is itself a full restore (minus gold), so HP can't stay low forever. And every defeated enemy pays, so income is positive at every accuracy. Across all rows, runs where gold ever hit 0 were ≤10% without nets and ≤1% with them.
2. **The real risk is a defeat loop at low accuracy from tier 4 up, much worse with speech on.** Defeats per battle:

   | MC accuracy | Speech off (t5–t9) | Speech on (t5–t9) | Tiers 1–2 |
   |---|---|---|---|
   | 50% | 22–40% | 40–66% | ≤24% (≤15% with nets) |
   | 65% | 2–8% | 7–21% | – |
   | 75%+ | ≤2% | ≤6% | – |

   Kids at 50% still make progress, because bosses are beaten eventually with the checkpoint and Courage, but it will *feel* bad. Speech-on kids suffer about twice the defeats, because the engine steers them to spoken EN→ZH, where ASR misfires count as wrong (Jack's no-retry rule).
3. **Battles between restores:** at tier 1 it's 2.7 / 4.2 / 6.0 / 13.5 fights at 50 / 65 / 75 / 90% (speech off), and 2.3 / 3.5 / 4.7 / 8.6 with speech on. From tier 5 it drops to 1.4 / 2.4 / 3.6 / 9.7 (off) and 1.2 / 1.8 / 2.7 / 5.3 (on). At ≤ 65% accuracy, kids walk to an inn after almost every fight in mid-game, which is a pacing cost to watch.
4. **Gold over time:** the spender hovers near the protected floor (2 inns) and converts everything into gear. The saver holds about 2–4 inn stays in reserve, and inn plus potions take 4–62% of income (at ≥ 75% accuracy: ≤18% without speech, ≤26% with). Gear money per realm at ≥ 65% accuracy (t5: about 2,000–3,750; t9: about 3,900–7,500) covers a next-tier set (t6: 2,160; t9: 4,080) for most kids. At 50% accuracy it doesn't: about 600–1,450 at t5. Those kids fall behind on gear. **That gear lag isn't modeled** (the sim fixes gear at the recommended tier), so real low-accuracy kids will do somewhat worse than shown.
5. **Price sensitivity** (`combat_sim_sensitivity_out.txt`, spender, t1/t5 at 50%/65%): raising the inn from 2× to 3× or 4× G (potion 1.5× or 2×) pushes upkeep at 50% accuracy, t5, from about 25% to 37–40% or 49–53% of income and cuts gear money by 6–32%. Defeat rates barely change. **Keep inn = 2 × G, potion = 1 × G.**

### 7.7 Boss-approach tuning (proficiency cost)

Diligent kid (trains until the trigger clears), recommended nets, working set 10. "Questions per location" includes path fights, patrols and the boss.
| Speech | Tier | Rule | Trigger (patrols spawn while below) | Patrols/location @50% | @65% | @75% | @90% | Items proficient at end (@75%) | Questions per location (@75%) |
|---|---|---|---|---|---|---|---|---|---|
| off | 1 | twice total | 50% items proficient (Jack's proposal) | 5.5 | 5.6 | 5.7 | 6.2 | 82% | 164 |
| off | 1 | twice in a row | 50% items proficient | 9.9 | 7.8 | 7.2 | 6.8 | 81% | 179 |
| off | 1 | twice total | 40% items proficient **(recommended)** | 4.5 | 4.4 | 4.7 | 5.3 | 73% | 152 |
| off | 1 | twice total | 25% items proficient | 2.4 | 2.5 | 2.6 | 3.3 | 56% | 127 |
| off | 1 | twice total | 50% readiness points | 2.7 | 2.6 | 2.5 | 3.0 | 58% | 128 |
| off | 1 | twice total | 40% items, spoken ways need 1 correct | 4.5 | 4.4 | 4.7 | 5.3 | 73% | 152 |
| on | 1 | twice total | 50% items proficient (Jack's proposal) | 17.6 | 17.6 | 17.9 | 18.9 | 77% | 348 |
| on | 1 | twice in a row | 50% items proficient | 28.5 | 24.1 | 22.3 | 20.7 | 76% | 401 |
| on | 1 | twice total | 40% items proficient | 15.4 | 15.6 | 16.0 | 16.9 | 67% | 322 |
| on | 1 | twice total | 25% items proficient **(recommended)** | 10.7 | 10.9 | 11.4 | 12.2 | 49% | 261 |
| on | 1 | twice total | 50% readiness points | 10.3 | 10.2 | 10.3 | 10.9 | 46% | 249 |
| on | 1 | twice total | 40% items, spoken ways need 1 correct | 13.9 | 13.8 | 14.3 | 15.0 | 60% | 297 |
| off | 5 | twice total | 50% items proficient (Jack's proposal) | 3.4 | 4.5 | 5.1 | 6.0 | 83% | 230 |
| off | 5 | twice in a row | 50% items proficient | 6.6 | 6.3 | 6.3 | 6.4 | 81% | 251 |
| off | 5 | twice total | 40% items proficient **(recommended)** | 2.3 | 3.4 | 3.9 | 4.9 | 74% | 210 |
| off | 5 | twice total | 25% items proficient | 0.5 | 1.3 | 1.8 | 2.5 | 58% | 174 |
| off | 5 | twice total | 50% readiness points | 0.7 | 1.4 | 1.8 | 2.4 | 57% | 172 |
| off | 5 | twice total | 40% items, spoken ways need 1 correct | 2.3 | 3.4 | 3.9 | 4.9 | 74% | 210 |
| on | 5 | twice total | 50% items proficient (Jack's proposal) | 11.2 | 13.0 | 14.3 | 16.6 | 78% | 473 |
| on | 5 | twice in a row | 50% items proficient | 20.4 | 18.3 | 17.9 | 18.3 | 77% | 542 |
| on | 5 | twice total | 40% items proficient | 9.7 | 11.4 | 12.5 | 14.7 | 69% | 434 |
| on | 5 | twice total | 25% items proficient **(recommended)** | 5.7 | 7.2 | 8.6 | 10.4 | 51% | 352 |
| on | 5 | twice total | 50% readiness points | 4.3 | 6.2 | 7.0 | 8.4 | 45% | 320 |
| on | 5 | twice total | 40% items, spoken ways need 1 correct | 8.2 | 9.9 | 11.0 | 12.9 | 62% | 400 |

**What the numbers say**

- **Jack's 50% proposal:**

  | Kid | Patrols per location | Time per location | Items proficient at the end |
  |---|---|---|---|
  | No speech | 3.4–6.2 | ~25–35 min | 82–83% |
  | Speech on | 11–19 (on top of 6 path fights) | ~50–70 min | 77–78% |

  Speech-on kids need 8 correct answers per item instead of 4, and their spoken answers are less accurate.
- **The thresholds barely matter below 50%.** Patrols are mostly the time it takes for items to *start* becoming proficient, so 40% vs 50% saves only about 1 patrol per location. Better-accurate kids see slightly *more* patrols, because their fights end faster (fewer questions per fight).
- **Recommended defaults:**

  | Kid | Trigger | Patrols per location | Items proficient at the end | Questions per location |
  |---|---|---|---|---|
  | No speech | 40% | ~2–5 | ~73% | ~150 (tier 1) / ~210 (tier 5), about 23–32 min at 9 s per question |
  | Speech on | 25% | ~6–12 | ~50% | ~260 (tier 1) / ~350 (tier 5), about 40–53 min |

  Speech-on kids still practice about 1.7× longer per location, which is the inherent cost of 4-way proficiency.
- **Alternatives (for Jack):** "readiness points" (partial credit toward the 8 pips) at 50% gives similar patrol counts to items at 25%. It's smoother for the HUD but lets a kid reach the boss with fewer fully proficient items. "Spoken ways need only 1 correct for the boss check" at 40% sits between the two.
- Not simulated: the "rusty" rule, forgetting over days, and speech being turned on mid-game.

---

## 8. Answer modes

### 8.1 Speech: no retry for wrong answers; re-prompt only on technical failure

Setup (unchanged from v1): `SpeechRecognition || webkitSpeechRecognition`, `continuous = false`, `interimResults = false`, `maxAlternatives = 5`. `lang = 'zh-CN'` for S-EZ answers and `'en-US'` for S-ZE answers. **Push-to-talk**: the kid taps the mic, and it's never always-on. A parent must enable speech in settings (§10.3 Q13).

| Parameter | Default |
|---|---|
| Max listen window | 6 s; 8 s if the answer is longer than 4 syllables |
| No-speech timeout | 4 s with nothing detected (this is a technical failure, not a wrong answer) |
| Start | After the prompt audio ends and the kid taps the mic, with a beep cue |

**Jack's rule:** a spoken answer that's recognized and doesn't match is **wrong**. It's graded once, with the normal miss or broken block. There's no "try again" and no MC fallback. The model audio plays *after* grading as feedback.

**Proposed split between "wrong" and "technical failure"** (⚠ open question Q2):

| Recognizer outcome | Classification | What happens |
|---|---|---|
| `result` with any transcript (even an unrelated word) | **Graded** | Matching per §8.2. A mismatch is wrong. |
| `nomatch` event (the engine heard speech but produced no usable text) | **Graded as wrong** (default) | The kid spoke, so this counts as an answer. ⚠ Jack may prefer to treat it as technical. The sim assumes it's wrong. |
| `error: no-speech` (no audio energy at all), or the 4 s timeout with no speech-start | Technical | "I didn't hear anything, tap and talk!" Same question re-prompted. |
| `error: audio-capture` (mic busy or glitch), `aborted` (interrupted by the app or OS) | Technical | Same re-prompt |
| `error: network` | Technical, re-prompted once | If it happens a second time, speech pauses for the battle |
| `error: not-allowed`, `service-not-allowed`, `language-not-supported`, API missing (Safari/Firefox) | Device or permission | **Speech is disabled for the session** with a friendly banner. The kid switches to 2-way proficiency (§3.1) until it's fixed. No question is graded. |

Limits that stop this from becoming a retry loophole:

- **At most 2 technical re-prompts per question.** After a 3rd technical failure the question is **VOID**: no damage either way, no proficiency or Leitner change, and the turn passes. On defense, a void means the enemy's attack is *skipped* (not taken and not blocked), so voiding never costs HP. The engine then marks the item's spoken way "cooling" for the battle and picks a reading way for that item next time (this isn't a retry of the same answer; it's the next scheduled question).
- **3 voided questions in a session → speech pauses for the rest of the session** ("Your microphone seems sleepy. We'll use tapping for now."). It's logged so Jack can see flaky devices.
- A re-prompt is only possible when the recognizer reported *no transcript at all*. Anything the kid actually said is graded. Kids can't game this by mumbling, because a mumble either produces a transcript (graded) or `nomatch` (graded wrong).
- Push-to-talk and the beep cue keep `no-speech` rare. The sim doesn't model technical failures: under this rule they cost only time, never HP or proficiency.

**ASR false rejects** are the real cost of the no-retry rule. A correct answer sometimes gets transcribed wrong, especially short Chinese words said by kids. The sim models spoken accuracy below MC (§7.6). Mitigations that don't bend the rule: the homophone rule (§8.2), contained-match, `maxAlternatives = 5`, a per-item "speech match rate" KPI (items under 40% get extra `alt_answers` or `speaking = N`), and optionally a cap on the spoken share of each battle (Q3).

Spoken correct: correct, ×1.25 damage on attack, +1 extra streak, and it counts toward that spoken way's `correct` for proficiency.

Privacy: log transcript text only, never audio.

### 8.2 Matching rules (unchanged from v1)

Normalization, applied to both the transcript alternatives and the accepted answers:

1. NFKC normalization, which converts full-width forms to half-width.
2. Strip all punctuation and whitespace, both CJK (，。！？、…) and ASCII.
3. Convert Traditional to Simplified with OpenCC `t2s` (opencc-js).
4. Convert digits to Chinese numerals (10 → 十, 12岁 → 十二岁, 2 → 二/两; both accepted).
5. Strip a trailing 儿 (erhua) on both sides.
6. Strip leading and trailing fillers 啊 呃 嗯 那个, unless the answer contains them.
7. English: lowercase; strip articles and "to"; keep letters, digits and apostrophes; light stemming (s/es/ed/ing).

Accept a ZH answer if **any** alternative satisfies **any** of these:

| Rule | Detail |
|---|---|
| Exact | `norm(alt) == norm(ans)` for the answer or any `alt_answers_zh` |
| Contained | `norm(ans)` is a substring of `norm(alt)` and the extra characters ≤ max(2, len(ans)) |
| Homophone | Toneless pinyin of alt == toneless pinyin of ans (handles 他/她/它 and recognizer character choice). Tones aren't checked (Q12). |
| Fuzzy (≥4 syllables only) | Syllable Levenshtein similarity ≥ **0.8** on toneless pinyin; lenient pairs (zh~z, ch~c, sh~s, -ng~-n, l~n) cost 0.5 |
| ≤3 syllables | Exact or homophone only |

Accept an EN answer if any normalized alternative equals a gloss sense (split on `;` `,` `/`, parentheticals removed) or an `alt_answers_en`; or has token-set ratio ≥ **0.8** with a sense; or contains the head word of a 1–2-word sense.

Because a mismatch is now final, these rules should lean **lenient**. Before the playtest, run the matcher on real recordings of the kids saying the first 40 items, and add alt answers wherever it rejects a correct answer.

### 8.3 Distractor generation (core and parent items)

Candidates come from all items the engine knows: core items plus the kid's parent sets. The kid's seen items are preferred so that distractors are familiar.

```python
def distractors(target, direction, k, location_tier):
    C = [c for c in all_items if c.id != target.id]
    C = [c for c in C if not is_excluded(c, target, direction)]
    for c in C:
        c.score = (3 if c.topic == target.topic else 0)
                + (2 if c.type == target.type and c.pos == target.pos else 0)
                + (1 if abs(c.char_len - target.char_len) <= 1 else 0)
                + (1 if 0.6 <= len(c.en_primary)/len(target.en_primary) <= 1.6 else 0)
                + (1 if abs(eff_level(c) - eff_level(target)) <= 1 else 0)
                + (1 if kid.seen(c) else 0)
                - (2 if c.id in last_distractors_for(target) else 0)   # rotate, defeat position/set memory
                + (1 if location_tier >= 12 and shares_char(c, target) else 0)
    top = sorted(C, key=score, reverse=True)[:2*k]
    return random.sample(top, k)

def is_excluded(c, t, direction):
    return (norm_zh(c.simplified) in t.accepted_zh or norm_zh(c.traditional) in t.accepted_zh   # same answer
         or synonym(c, t)                                                   # see below
         or (direction == 'ZH→EN' and prompt_is_audio(t) and toneless(c) == toneless(t))   # homophone ambiguity
         or (direction == 'EN→ZH' and en_overlap(c, t))                     # both could fit the English prompt
         or (t.type in ('phrase', 'exclamation') and c.type not in ('phrase', 'exclamation'))   # form match
         or (location_tier < 12 and shares_char(c, t) and c.char_len <= 2)) # too confusable early

def synonym(c, t):
    return (content_tokens(c.english) & content_tokens(t.english))          # "happy" vs "happy; glad"
        or same_manual_group(c, t)      # curated groups: 高兴/开心/快乐, 怕/害怕, 帮/帮忙/帮助, 看/看见,
                                        # 二/两, 哪儿/哪里, 这儿/这里, 但是/可是/不过, 很/非常, 家/房子 ...
        or cedict_gloss_overlap(c, t) >= 0.5
```

- Fallback: if fewer than k candidates survive, relax the rules in this order: level, then length, then topic. Never relax the synonym, answer or homophone rules. If the options still fall short, show fewer options.
- Option display: EN→ZH options show characters, plus pinyin until the item has 2 correct answers in reading ZH→EN, or always when `reading = N`. ZH→EN options show the **primary English sense only**, in a consistent format.
- Quality loop: if one distractor draws more than 40% of an item's wrong answers across ≥20 attempts, flag the pair for review (it may be an unlisted synonym).


## 9. Parent editor data model

### 9.1 Entities

```ts
WordSet {
  id: uuid; name: string; ownerParentId: string; childIds: string[];
  placement: { mode: 'new_location' | 'attach_to_location'; locationId?: string };  // default new_location
  tierMode: 'kid_frontier' | 'fixed'; tier?: number;        // default kid_frontier (rewards scale with progress)
  monsterSkin?: EnemyRosterId;                             // default auto (pick an unlocked roster)
  items: CustomItem[]; createdAt; updatedAt; version: number; status: 'draft' | 'ready';
}

CustomItem {
  // ---- parent-entered (the only required fields) ----
  english: string;              // required, 1–60 chars; ';' separates alternative senses: "happy; glad"
  chinese: string;              // required, Simplified or Traditional, 1–12 CJK chars, may include "……"
  // ---- optional parent fields ----
  topic?: string;               // dropdown of core topics + free text; default 'Custom'
  altAnswersZh?: string[];      // e.g. 天啊 for 天哪
  altAnswersEn?: string[];
  note?: string;                // shown on the feedback card
  // ---- generated (parents may edit pinyin/topic/flags; engine re-validates) ----
  id: uuid; itemKey: string;    // itemKey = sha1(simplified + '|' + primaryEnglishLower); shared with core for dedupe
  inputScript: 'simplified' | 'traditional' | 'mixed';
  simplified: string; traditional: string;          // OpenCC t2s / s2tw
  pinyin: string;               // tone marks, via pinyin-pro in phrase mode
  pinyinCandidates?: string[];  // when a polyphone was detected (还, 长, 只, 行, 了 ...)
  pinyinConfidence: 'high' | 'needs_review';
  toneless: string; syllables: number; charLen: number;
  type: string; pos: string;    // CC-CEDICT lookup; else heuristic ('phrase' if >4 chars or has a space/…)
  hsk3Level: string; yctLevel: string;             // exact lookup; else 'none' + component levels
  listening: 'Y'; speaking: 'Y' | 'N'; reading: 'Y' | 'N';   // same rules as the core curriculum
  audio: { source: 'browser_tts' | 'cloud_tts' | 'recorded'; voice?: string; url?: string; checked: boolean };
  synonymGroup?: string; englishSenses: string[]; enPrimary: string;
  duplicateOfCore?: string;     // core id if the same item already exists (mastery is shared)
  status: 'ready' | 'needs_review' | 'error'; issues: Issue[];
}
```

### 9.2 Validation

| Check | Level | Rule |
|---|---|---|
| Required | error | Both english and chinese are non-empty |
| Chinese charset | error | Only CJK Unified Ideographs, plus `……`, and `·` for names. No Latin letters, digits or pinyin in the chinese field. |
| Length | error / warn | Chinese 1–12 chars (warn above 8: hard to say); English ≤ 60 |
| Pinyin | error | Every generated syllable is a valid Mandarin syllable, and the syllable count equals the Hanzi count (erhua exempt) |
| Polyphone | warn (needs_review) | Show the candidates, e.g. 还 hái / huán; the parent taps one. Default is the phrase-mode best guess. |
| Duplicate in set | error | Same simplified form twice in a set (unless the english senses differ, as with 只 zhī/zhǐ) |
| Duplicate of core | info | Link to the core item and share its mastery; the parent's English is added as an alt answer |
| Ambiguous English | warn | Two items in the set with the same primary English sense make ZH→EN ambiguous. Suggest adding a hint, e.g. "happy (高兴)". |
| Mixed script | warn | Mixed Simplified/Traditional input is auto-converted; show both |
| Content filter | error | Profanity/slur lists in both languages |
| Set size | error / warn | Minimum 7 items per set, or 4 with top-up from core same-topic items; recommended 20–40; maximum 300 (split into 30-item locations automatically) |
| Audio | warn | If no zh-CN TTS voice is available on the device, flag it (see open question Q7) |

### 9.3 Scaling to many locations (data-driven)

```ts
Realm    { id; name; themeText; tierBase: number; locationIds: string[]; bossLocationId: string }
Location { id; realmId; name; tier: number; itemIds: string[];            // ~30
           enemiesPerBattle: [min, max]; mcOptions: number; reviewShare: number;
           enemyRoster: { enemyId; weight }[]; bossId;   // every location ends in a boss
           unlock: { requires: string[] /* previous location ids whose boss must be beaten */ };
           bossApproach: { trigger: number /* default 0.40, speech-on 0.25 */; patrolsPerTrip: 2; roster: EnemyRef[] } }
Enemy    { id; nameZh; nameEn; art; kind: 'normal' | 'locboss' | 'realmboss'; statsFromTier: true; overrides? }
```

- Every difficulty value defaults from `tier` using the §2.3/§5/§7 formulas, so a new realm is just JSON plus art.
- A parent WordSet compiles into `ceil(n/30)` Locations under a "Guild Quests" realm at the kid's frontier tier, reusing unlocked enemy rosters.
- Progress (4 WayStats) is keyed by `itemKey`, so the same word learned in a parent set and in the core curriculum shares one record.
- Performance: a pool of 10k items is fine. Selection is O(n) per battle, and distractor scoring can be precomputed per topic bucket.

---


### 9.4 Progress storage (new in v2)

Progress is kept per `itemKey` (core id or parent item id) as **4 WayStats** records: `{way: 'R-ZE'|'R-EZ'|'S-ZE'|'S-EZ', correct, wrong, lastSeen, box, dueAt}`, plus derived `proficient` and `readingProficient` flags (§3.1). Editing a parent item's Chinese text resets all 4 WayStats. Editing only the English or alt answers keeps them. Location records hold `bossDefeated` (the unlock flag) instead of gate percentages.


## 10. Tuning knobs, analytics, open questions

### 10.1 Knobs (defaults)

| Knob | Default | Notes |
|---|---|---|
| SET_SIZE / WORKING_SET / NEW_CAP | 7 / 10 / 4 per battle | §3.3 |
| Proficiency | 2 correct (total) in each of 4 ways; 2 reading ways without speech | §3.1 |
| Proficient-item review weight | 0.15, raised by 1.5 × min(overdue, 2) when a way is Leitner-due | §3.2 |
| Boss-approach trigger | **40%** of pool proficient (no speech), **25%** (speech on) | Jack's default of 50% is in §7.7 |
| Patrols per boss attempt | 2, re-armed each time the kid walks toward the boss | Never blocks the boss |
| Carry-over cap | 20 earlier items | §3.3 |
| K_BLOCK / K_BROKEN / BROKEN_FLOOR | 1.25 / 0.5 / 0.5 | unchanged |
| Enemy ATK normal / location boss / realm boss | 1.1 / 1.2 / 1.3 × DEF_ref | |
| H(t) hits-to-kill | 3, 3, 2.5, 2.25, 2.25, 2, 2, 2, 2 | |
| Boss hits / minions / checkpoint | 5 (location) or 7 (realm) / 1 / 50% save point, **no heal** | |
| Streak tiers | 3 / 6 / 10 → ×1.25 / 1.5 / 2.0 | |
| Spoken bonus | ×1.25 dmg, +1 streak | |
| Soft cap | 30 questions (40 location boss, 45 realm boss) | |
| Gold per normal enemy G(t) | 6, 12, 18, 27, 36, 45, 54, 63, 72 (±20%) | Boss: 5×G (location), 10×G (realm) |
| EXP | 6 / 20 / 50 × L_rec | XP curve 100 × L |
| Inn / Honey Potion / Big Honey / Mana Tea | 2×G / 1×G / 2×G / 1×G | §7.3 |
| Start kit | 24 gold + 1 free Honey Potion | §7.5 |
| Chest rate | 10% normal, 100% boss | §7.2 |
| MP | 10 + 2L; costs: Insight 3, Double Strike 4, Guardian Shield 5, Frost 5, Heal 6, Sweep 8, Second Wind 12 | No MP regen outside the inn and Mana Tea |
| Defeat fee | max(10% of gold, inn price), never taking gold below 2 × inn; free inn stay when gold < inn | §7.5 |
| Courage | +20% DEF per consecutive defeat, capped at +60%, cleared by a win | §7.5 |
| Speech | 2 technical re-prompts, then VOID; 3 voids → speech paused for the session; 6/8 s listen; 4 s no-speech | §8.1 |
| Leitner intervals | 0, 10 min, 1 d, 3 d, 7 d, 16 d, 35 d; wrong = −2 boxes | Scheduling only |

### 10.2 Analytics to log

Local-first (IndexedDB plus a JSON export). No third-party analytics.

- **Per question:** ts, ids, itemKey, **way** (R-ZE / R-EZ / S-ZE / S-EZ) and **why it was picked** (weakest way / review / new), turnKind, options and distractors, latency, answer, correct, hint used, fast flag; speech {alternatives, outcome: graded-match / graded-mismatch / nomatch / technical(code) / void, re-prompt count}; WayStats before and after; damage dealt and taken.
- **Per battle:** result, questions, spoken share, HP and MP at start and end, skills and potions used, voids, soft cap fired.
- **Economy:** gold earned by source (drops, chests, boss), spent on inn / potions / gear, defeat fees, free-inn uses, Courage level at each fight, gold at each inn visit, **battles between restores**, defeat streak length.
- **Progress:** pool proficiency % at each boss attempt, patrols fought per location, the kid choosing "go to the boss anyway", time per location.
- **Speech health:** error codes by device, void rate, sessions where speech was paused, and **measured false rejects** (Jack or a parent tags a sample of graded-mismatch transcripts as "actually correct"). This replaces the sim's ASR assumptions with real numbers.

KPIs: accuracy 75–85% per realm; normal-battle defeat rate < 10%; boss first-try win rate 60–85%; free-inn uses < 1 per realm after tier 1; a kid's spoken accuracy within 10 points of their reading accuracy (a bigger gap means ASR trouble); time per location < 35 min.

### 10.3 Open questions for Jack

1. **Boss-approach trigger:** the spec recommends **40%** (no speech) and **25%** (speech on) instead of 50%, because 50% with 4-way proficiency adds 11–19 patrols per location for speech-on kids (about 50–70 min per location). Alternatives: keep 50% but count "readiness points" (partial credit per way), or count a spoken way after 1 correct answer. Which metric do you want? (§7.7)
2. **Technical failure vs wrong:** is the §8.1 split OK: re-prompt only on no-speech, audio-capture, aborted or network (max 2, then void with no damage either way)? And should `nomatch` count as wrong (the default) or as technical?
3. **Spoken share cap:** speech-on kids get about 55% spoken questions, and the harder way raises their defeat rate (e.g. 7–21% vs 2–8% per battle at 65% accuracy). Cap spoken questions at ~50% of each battle, or trust the weakest-way rule?
4. **Defeat fee:** a flat 10% of gold lets a rich kid "die to heal" more cheaply than the inn. The recommended fee is max(10%, inn price) with a 2-inn floor. OK?
5. **Courage buff** (+20% DEF per consecutive defeat, cap 60%): it cuts defeats at 50% accuracy by about 5–9 points. Is that acceptable, or does it feel like a handout?
6. **"Rusty" rule** (2 wrong answers in a row in a way of a proficient item → that way needs 1 more correct answer). Adopt it or keep proficiency permanent?
7. **Turning on speech mid-game:** items drop to reading-proficient and the carry-over cap is 20. OK?
8. **"Twice":** the spec uses twice in total. "In a row" adds 10–80% more patrols, hurting low-accuracy kids most. Confirm total?
9. **Inn access:** the sim assumes an inn is reachable between any two fights. With long maps, add a Return Feather (1×G warp)?
10. **MP regen:** none by rule (inn and Mana Tea only). Do you want +1 MP per correct answer or none?
11. **Companion team attack:** still out of scope?
12. **Tones:** not checked (Web Speech returns characters). Is that OK for the playtest?
13. **Consent:** Chrome sends mic audio to Google. Should speech default to off, with each parent's OK?
14. **Parent-item audio:** browser TTS or pre-generated cloud TTS?
15. **Devices:** speech only on Chrome/Chromebook; iPad/Safari kids play with the 2 reading ways. OK?
16. **Timers:** still none?

### 10.4 Risks

- **Defeat loops for low-accuracy speech-on kids:** at 50% MC accuracy they lose 40–66% of battles at tiers 5–9. The nets stop the gold spiral, but the experience is still bad. Keep an eye on the spoken-share cap (Q3) and on content difficulty (accuracy under 70% means the content is too hard).
- **Frequent inn walks at ≤ 65% accuracy:** 1.2–2.4 battles between restores at t5. Inns must be close to the fights, or the Return Feather is needed.
- **Gear lag isn't modeled:** the sim gives each tier's gear on arrival. A kid who doesn't buy gear sees the v1 under-gearing cliff (ATK_e > 1.25·DEF_h). Show the "upgrade your shield" warning.
- **ASR rates are assumptions:** the sim's spoken penalty (6–8 points lower effective accuracy) is a guess. Measure real false rejects in week 1 and retune the §7.7 trigger.
- **Location length with speech on:** about 40–53 min at the recommended trigger, split across sessions. Save points make this OK, but it's long.
- **Parent-entered errors and Web Speech drift:** unchanged from v1. Keep the reading ways first-class.
