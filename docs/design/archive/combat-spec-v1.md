# Combat and Progression Spec (v1)

Project: kids' Chinese-learning browser RPG (Phaser 4). Drafted 2026-09-28 (PT).
Inputs: Jack's battle rules (fixed), `core-curriculum.csv` (585 items, 9 realms, 40-item slice), and `chinese-rpg-design-memo.md` (kind failure, anti-guess-spam, Leitner). Where the memo conflicts with Jack's rules, Jack's rules win. For example, a wrong attack answer is a **miss**, not a softened hit.

All numbers were checked with a Monte Carlo sim: `desy/build/combat_sim.py`, output in `desy/build/combat_sim_out.txt`, 3,000 battles per cell. The sim includes streaks and the boss checkpoint heal, and **excludes skills, potions and the companion**, so real win rates will be somewhat higher.

---

## 0. Glossary and fixed rules

| Term | Meaning |
|---|---|
| Item | One curriculum entry (word or phrase), e.g. 现在 xiànzài "now". |
| Track | Mastery state for one item in one **direction**: `EN→ZH` ("How do you say banana?") or `ZH→EN` ("What does 现在 mean?"). |
| Mode | How the kid answers: `MC` (multiple choice, tap) or `SPEECH` (Web Speech API, words only, no tone check). |
| Battle set | The 7 items a battle focuses on. |
| Location | A village, dungeon or stage with a local pool of about 30 items. A realm has 2–3 locations. |
| Tier `t` | Numeric difficulty of a location (realm 1 = 1 … realm 9 = 9; open-ended). All stats are formulas of `t`. |

Jack's rules as implemented:

1. Turn-based. There is **one question before every hero attack** and **one question on every enemy attack**.
2. A wrong attack answer means **miss** (0 damage).
3. A wrong defense answer means **broken block** (big damage). A correct block can still **leak** damage when enemy ATK far exceeds hero DEF.
4. Each battle has 7 focus items, chosen adaptively: weakest first, mastered items less often.
5. Difficulty is set by location: more enemies, more MC options, and larger pools that fold in earlier locations.
6. Two question directions × two answer modes.
7. Hero ATK/DEF come only from equipment, skills and level, all chosen before the battle.
8. Parents can add custom sets with only English + Chinese. Everything else is generated. The engine must scale to unlimited items and locations.

---

## 1. Battle flow

### 1.1 Turn order

A **round** = 1 hero turn + 1 enemy turn per living enemy on screen.

```
Round:
  1. Hero turn   -> choose action (Attack | Skill | Potion | Flee)
                    Attack / attack-type Skill => 1 question (attack question)
  2. Enemy phase -> for each living enemy, left to right:
                    wind-up animation => 1 question (defense question) => resolve block
  3. End of round -> tick cooldowns, spawn reinforcements (if any), check end
```

- **Defense questions per round = the number of living enemies on screen** (max 3 on screen). A 3-enemy round is 1 attack question + 3 defense questions. Killing enemies quickly is how the kid shortens the battle, which makes the attack side matter.
- Enemies beyond 3 wait off-screen as **reinforcements** and step in when a slot frees up (used from tier 10+; see §5).
- Potions and Flee cost the hero turn **without** a question: they aren't attacks. Potion use is capped per battle (§6.4).
- The optional companion "team attack" (memo §2.4, filled by misses) is a free action at the start of the hero turn. It asks no question, because the hero isn't attacking.

### 1.2 State machine

```
BATTLE_INIT
  -> SCOUT            (show the 7 items: art + audio; new items get a teach card; skippable after 1 s)
  -> ROUND_START
  -> HERO_ACTION_SELECT
       Attack/Skill -> TARGET_SELECT -> ASK(attack)
       Potion       -> APPLY_POTION -> ENEMY_PHASE
       Flee         -> END_FLEE
  ASK(kind):
       PROMPT_PLAY          (audio/text prompt; options locked)
    -> OPTIONS_UNLOCKED     (after audio ends, or 800 ms for text-only prompts)
    -> AWAIT_ANSWER         (MC tap | mic button -> SPEECH_LISTEN -> SPEECH_MATCH)
         SPEECH fail rules (§8.1) may -> FALLBACK_MC (same question, no penalty)
    -> GRADE                (correct/wrong, update mastery + streak, log event)
    -> FEEDBACK             (correct: short cheer; wrong: show answer + audio + pinyin, 1.5 s min)
  -> RESOLVE_ATTACK (hit/miss) -> CHECK_END
  -> ENEMY_PHASE: for e in livingEnemies: ENEMY_WINDUP(e) -> ASK(defense) -> RESOLVE_BLOCK(e) -> CHECK_KO
  -> ROUND_END (cooldowns, reinforcements, boss phase check)
  -> ROUND_START ...

CHECK_END:  all enemies dead            -> VICTORY
            hero HP <= 0                -> RETREAT
            boss HP <= 50% (first time) -> BOSS_CHECKPOINT (heal 40% max HP, save checkpoint) -> continue
VICTORY  -> REWARDS (XP, gold, drops, mastery summary "3 words moved up!") -> MAP
RETREAT  -> INN (keep all XP, gold, items; missed items flagged for review; boss: "Retry from checkpoint?")
END_FLEE -> MAP (no loss; answers given so far still count for mastery)
```

### 1.3 Which direction each question uses

- An **attack question prefers EN→ZH** (70%): the hero "casts" the Chinese word. It is eligible for SPEECH.
- A **defense question prefers ZH→EN** (70%): the enemy "shouts" a Chinese word (audio, plus characters or pinyin), and the kid picks the meaning to block.
- Override: if one direction's box for the chosen item is ≥2 lower than the other, ask the weaker direction.
- The kid can always answer by SPEECH or MC. SPEECH is offered only when the mic is enabled and working. ZH→EN speech uses `en-US` recognition.

### 1.4 Anti-guess-spam (from the memo, kept)

- Options unlock only after the prompt has finished playing.
- Distractors come from the same topic/POS (§8.2).
- Damage never depends on speed. An answer given <600 ms after unlock on a non-mastered item still counts, but **doesn't raise the streak**.
- Two fast wrong answers in a row trigger the companion's "Focus!" line, and the next unlock delay becomes 1.5 s. This isn't a penalty.
- Mastery only moves up on graded, unhinted answers (§3). Guessing can win a realm-1 fight, but it doesn't advance learning or unlock gates.

---

## 2. Damage model

### 2.1 Hero stats (from level + gear; see §6)

```
HP_h  = 30 + 6*L
ATK_h = weaponATK + floor(L/2) + skill/charm bonuses
DEF_h = armorDEF + shieldDEF + floor(L/3) + skill/charm bonuses
Gear at tier g: weaponATK = 3g+2, armorDEF = 2g+1, shieldDEF = g   (common rarity)
```

### 2.2 Formulas (defaults)

All rounding uses `Math.round` (half up). Constants appear in **bold** and are tuning knobs.

**Hero attack**

```
if answer wrong:  damage = 0                        // MISS (Jack's rule)
else:
  mult   = streakMult(streak) * (spoken ? 1.25 : 1.0)
  damage = max(1, round(ATK_h * mult - 0.5 * DEF_e))
```

`streakMult`: counts consecutive correct answers (attack **and** defense) within the battle.

| Streak | 0–2 | 3–5 | 6–9 | 10+ |
|---|---|---|---|---|
| Multiplier | ×1.0 | ×1.25 | ×1.5 | ×2.0 |

A wrong answer drops the streak **one tier** (e.g. 7 → 3), not to zero. A spoken correct answer adds +1 extra streak.

**Enemy attack (defense question)**

```
if answer correct:   damage = max(0, ATK_e - K_BLOCK * DEF_h)                              // K_BLOCK = 1.25  (leak)
if answer wrong:     damage = max(ceil(BROKEN_FLOOR * ATK_e), ATK_e - K_BROKEN * DEF_h)    // K_BROKEN = 0.5, BROKEN_FLOOR = 0.5
```

- **Leak (Jack's gap rule):** a correct block is perfect while `ATK_e ≤ 1.25·DEF_h`. Beyond that, the excess leaks through. Normal enemies are tuned to `ATK_e ≈ 1.1·DEF_rec`, so an at-level, correctly geared kid takes **0** on correct blocks. Bosses (`≈1.35·DEF_rec`) leak a little, and under-geared kids leak a lot.
- **Broken block:** armor helps only half as much, with a floor of 50% of ATK, so a broken block always hurts.

### 2.3 Enemy stats by tier (formulas)

`L_rec(t)` = recommended hero level: 2, 4, 6, 9, 12, 15, 18, 21, 24 for t = 1..9, then `24 + 3(t−9)`. `ATK_ref`/`DEF_ref` = the stats of a hero at `L_rec(t)` with tier-t gear.

| Enemy kind | HP | ATK | DEF |
|---|---|---|---|
| Normal | `round(H(t) * (ATK_ref − 0.5t))` | `round(1.1 * DEF_ref)` | `t` |
| Elite (location gatekeeper) | 2 × normal HP | `round(1.2 * DEF_ref)` | `t` |
| Boss | `round(7 * (ATK_ref − 0.5t))` | `round(1.35 * DEF_ref)` | `t` |

`H(t)` = base hits to kill a normal enemy: 3, 3, 2.5, 2.25, 2.25, 2, 2, 2, 2 (t ≥ 10: 2).

Boss battles start with 1 minion (t ≤ 3) or 2 minions (t ≥ 4) and have a checkpoint at 50% boss HP.

### 2.4 Worked examples

**Early: Starter Meadow (t=1), hero L2, tier-1 gear** → HP 42, ATK 6, DEF 4. Horned rabbit 角兔: HP 16, ATK 4, DEF 1.

| Event | Calculation | Result |
|---|---|---|
| Correct attack, streak 0 | 6×1.0 − 0.5 = 5.5 → 6 | 6 dmg, rabbit dies in 3 hits |
| Correct attack, streak 3 | 6×1.25 − 0.5 = 7 | 7 dmg |
| Correct attack, spoken, streak 3 | 6×1.25×1.25 − 0.5 = 8.9 → 9 | 9 dmg |
| Wrong attack | miss | 0 |
| Correct block | max(0, 4 − 1.25×4 = −1) | 0 |
| Broken block | max(ceil(2), 4 − 2) | 2 (the hero can absorb about 20 broken blocks) |
| Queen Bee boss (t=2, hero L4: HP 54, ATK 10, DEF 8; boss HP 63, ATK 11) | block: 11 − 10 = 1; broken: max(6, 11 − 4 = 7) | leak 1, broken 7; hits for 9, so 7 hits at streak 0 |

**Middle: Hydra Swamp (t=5), hero L12, tier-5 gear** → HP 102, ATK 23, DEF 20. Bog lizard: HP 46, ATK 22, DEF 5.

| Event | Calculation | Result |
|---|---|---|
| Correct attack, streak 0 | 23 − 2.5 = 20.5 → 21 | 21; 3 hits, or 2 hits if the 2nd is on a ×1.25 streak (26) |
| Correct block | 22 − 25 < 0 | 0 |
| Broken block | max(11, 22 − 10 = 12) | 12 (about 8.5 broken blocks to KO) |
| Hydra boss (HP 144, ATK 27) | block 27 − 25 = 2; broken max(14, 17) | leak 2, broken 17 |
| **Under-geared** (tier-3 gear, L9: HP 84, ATK 15, DEF 13) vs bog lizard | block 22 − 16.25 = 5.75 → 6; broken 22 − 6.5 = 15.5 → 16; attack 15 − 2.5 = 12.5 → 13 | Every correct block costs 6, broken blocks cost 16, and each lizard takes 4 hits. The sim shows about 19% wins at 75% accuracy, which is the signal to gear up. |

**Late: Demon King's Castle (t=9), hero L24, tier-9 gear** → HP 174, ATK 41, DEF 36. Demon knight: HP 73, ATK 40, DEF 9.

| Event | Calculation | Result |
|---|---|---|
| Correct attack, streak 0 | 41 − 4.5 = 36.5 → 37 | 37; 2 hits |
| Correct block | 40 − 45 < 0 | 0 |
| Broken block | max(20, 40 − 18 = 22) | 22 (about 8 broken blocks to KO) |
| Demon King 魔王 (HP 256, ATK 49) | block 49 − 45 = 4; broken max(25, 31) | leak 4, broken 31; 7 base hits, about 5 with streaks |
| Under-geared (tier-7 gear, L21: DEF 29) vs Demon King | block 49 − 36.25 = 12.75 → 13; broken 49 − 14.5 = 34.5 → 35 | Correct blocks now cost 13 each. |

### 2.5 Length targets and sim results

Target pacing is about 8–10 s per question: prompt audio 1–2 s, answer about 3 s, animation 2–3 s, plus 1.5 s feedback on a miss.

| Battle | Target rounds | Target questions | Target time |
|---|---|---|---|
| Normal, early (1–2 enemies) | 5–7 | 10–15 | 1.5–2.5 min |
| Normal, mid/late (2–3 enemies) | 6–8 | 15–22 | 2.5–3.5 min |
| Boss | 9–12 | 22–30 | 4–6 min (checkpoint at 50%) |

A 10–15 min session is therefore about 3–5 battles plus an inn stop.

Sim results (at-level hero, no skills or potions). Each cell shows win % / median questions.

| Tier | Normal @90% acc | Normal @75% | Normal @60% | Boss @90% | Boss @75% | Boss @60% |
|---|---|---|---|---|---|---|
| 1 Starter | 100 / 11 | 100 / 11 | 100 / 15 | 100 / 18 | 100 / 25 | 100 / 33 |
| 2 Honeycomb | 100 / 11 | 100 / 11 | 98 / 15 | 100 / 18 | 99 / 25 | 72 / 30 |
| 3 Market | 100 / 11 | 100 / 15 | 96 / 21 | 100 / 17 | 98 / 25 | 59 / 29 |
| 4 Goblin | 100 / 15 | 98 / 18 | 73 / 23 | 100 / 23 | 72 / 29 | 11 / 24 |
| 5 Hydra | 100 / 15 | 98 / 18 | 75 / 23 | 100 / 23 | 76 / 30 | 15 / 24 |
| 6 Zombie | 100 / 15 | 99 / 19 | 75 / 24 | 100 / 22 | 88 / 29 | 23 / 26 |
| 7 Griffin | 100 / 16 | 97 / 23 | 54 / 27 | 100 / 23 | 74 / 29 | 12 / 24 |
| 8 Colosseum | 100 / 15 | 99 / 20 | 75 / 24 | 100 / 21 | 84 / 29 | 21 / 25 |
| 9 Castle | 100 / 16 | 94 / 22 | 41 / 25 | 100 / 23 | 72 / 29 | 12 / 23 |

Reading the table: realms 1–3 are nearly unloseable, which is right for onboarding. From realm 4 on, a kid at about 75% accuracy wins normal fights about 95%+ of the time and bosses about 70–90% on the first try, before skills and potions (Guardian Shield plus Heal add roughly 10–20 points). A kid at 60% is pushed to review or gear up, and retreating costs nothing. Dips at tiers 7 and 9 come from `floor(L/3)` rounding. Adjust with the `H(t)` knob if playtests feel uneven.

---

## 3. Mastery and item selection

### 3.1 Model: Leitner boxes with an FSRS-lite recall estimate

Leitner is transparent and kid-visible ("your word reached the Gold box!"). A retrievability term makes selection prefer overdue items. Every attempt is logged, so FSRS proper can replace this in v2.

Per **track** `(itemKey, direction)`:

```
box        0..6
lastSeen   timestamp
lastPromo  timestamp
dueAt      = lastPromo + INTERVAL[box]
lapses     count of wrong answers after reaching box >= 2
spokenOk   count of spoken-correct answers on distinct days (EN→ZH only)
recent     ring buffer of the last 5 results (correct / wrong / hinted)
```

`INTERVAL` = [0, 10 min, 1 d, 3 d, 7 d, 16 d, 35 d] for boxes 0..6.

Update rules, applied per graded answer:

| Event | Effect |
|---|---|
| Correct, not hinted, and (`now ≥ dueAt` or box ≤ 1) | `box += 1`, `lastPromo = now` |
| Correct but not yet due (box ≥ 2) | No box change. Stops cramming inflation. Counts toward `recent`. |
| Correct with Hint skill used | No box change (combat still counts it as correct) |
| Wrong | `box = max(0, box − 2)`; if the old box was ≥ 2, `lapses += 1` |
| Re-ask inside the same battle after a miss | Can take box 0 → 1 only |
| EN→ZH ceiling | While speech is **enabled and working**, EN→ZH can't pass box 4 until `spokenOk ≥ 1`, and can't pass box 5 until `spokenOk ≥ 2` (for items with `speaking = Y`). If speech is off or unsupported, there's no ceiling: kids aren't penalized for hardware. |

Derived values:

```
R(track)         = 0.9 ^ ( max(0, now - lastPromo) / max(INTERVAL[box], 10min) )   // retrievability, 1.0 fresh, 0.9 at due
m(track)         = (box / 6) * R(track)
M(item)          = 0.5 * m(EN→ZH) + 0.5 * m(ZH→EN)
overdue(track)   = max(0, (now - dueAt) / max(INTERVAL[box], 10min))
Learned(item)    = box(ZH→EN) >= 2  AND box(EN→ZH) >= 1
Mastered(item)   = box(ZH→EN) >= 4  AND box(EN→ZH) >= 4
Spoken badge     = spokenOk >= 2    (shown as a mic star; required for "Gold" mastery on speaking=Y items)
Leech            = lapses >= 3      (the companion offers a mnemonic card; the item gets +1 weight)
```

Mode tracking: MC and SPEECH update the **same** track (a correct answer is a correct answer), but SPEECH also feeds `spokenOk`. For `reading = N` items, ZH→EN prompts show audio + pinyin instead of characters. Once `reading = Y` items reach ZH→EN box ≥ 3, their pinyin fades (tap to reveal, no penalty).

### 3.2 Choosing the 7 (battle set)

Knobs per location (§5): `SET_SIZE = 7`, `reviewSlots = round(7 * reviewShare)`, `NEW_CAP` (max unseen items per battle, default 3). The first 2 tutorial battles use a fixed 4-item set.

```python
def choose_battle_set(location, kid, now):
    local  = location.item_ids                     # ~30 items at this location
    review = kid.unlocked_items_before(location)   # all earlier locations, any realm
    n_rev  = min(location.review_slots, len(review))
    set_ = []

    # 1) Review slots: due/weak items from earlier locations
    rev_w = {i: w_review(i) for i in review}
    set_ += weighted_sample(rev_w, n_rev)          # no replacement

    # 2) Local slots
    seen   = [i for i in local if kid.seen(i)]
    unseen = [i for i in local if not kid.seen(i)]
    new_quota = min(NEW_CAP, len(unseen))
    need_local = SET_SIZE - len(set_)
    if len(seen) < need_local - new_quota:          # early in a location: fill with more new items
        new_quota = min(len(unseen), need_local - len(seen))
    set_ += first_n_in_curriculum_order(unseen, new_quota)   # new items arrive in authored order
    loc_w = {i: w_local(i) for i in seen if i not in set_}
    set_ += weighted_sample(loc_w, SET_SIZE - len(set_))

    # 3) Top-up if the pool is small (e.g. a tiny parent set): pull weakest review, then same-topic core items
    set_ += top_up(SET_SIZE - len(set_))
    set_ = drop_mutual_synonyms(set_)               # don't put 高兴 and 开心 in the same 7; refill if dropped
    return order_weakest_first(set_)                # Jack: weakest first (new items count as weakest)

def w_local(i):
    M = kid.M(i); od = max(kid.overdue(t) for t in tracks(i))
    if kid.mastered(i) and od == 0: return 0.1       # mastered & not due: rarely
    return 0.2 + 2.0*(1-M) + 1.5*min(od, 2) + 0.8*kid.recent_misses(i) + (0.7 if kid.leech(i) else 0)

def w_review(i):
    od = max(kid.overdue(t) for t in tracks(i))
    return 0.1 + 2.0*min(od, 2) + 1.0*(1-kid.M(i)) + (0.7 if kid.leech(i) else 0)

def weighted_sample(weights, k):                   # Efraimidis-Spirakis A-Res
    keyed = sorted(weights, key=lambda i: random()**(1/weights[i]), reverse=True)
    return keyed[:k]

def order_weakest_first(items):
    return sorted(items, key=lambda i: kid.M(i) + uniform(0, 0.08))   # small jitter
```

**Boss battles** still use 7 items but draw from the whole realm, with `reviewSlots + 1`.

The first question on an unseen item uses one fewer MC option (minimum 2), and the SCOUT screen teaches the item before the fight.

### 3.3 Question sequencing inside the battle (see §4)

```python
def next_question(battle, turn_kind):          # turn_kind: 'attack' | 'defense'
    item = pick_item(battle)
    dir_ = pick_direction(item, turn_kind)     # §1.3
    mode = 'SPEECH_OFFERED' if speech_ok() else 'MC'
    opts = mc_options(location.mc_options - (1 if first_ask_ever(item) else 0))
    return Question(item, dir_, mode, distractors(item, dir_, opts - 1))
```

---

## 4. When all 7 have been asked: chosen rule

**Choice: "re-ask missed first, then cycle the weakest of the 7", with a soft length cap.** No new items are pulled mid-battle.

Why:

- Battles run 11–30 questions and the set is 7, so every battle outlasts the set. This is the normal case, not an edge case.
- Repeating a small set with spacing is the learning goal. Pulling bonus items would dilute the 7 and break Jack's "each battle focuses on 7" rule.
- A just-missed item comes back after a short gap of 2–4 questions. That is the most valuable retrieval moment, and it matches the memo's "the item comes back later in the same battle".
- Finisher mechanics change combat balance and teach nothing. A soft cap covers the pathological case (very low accuracy) without adding a new system.

```python
def pick_item(battle):
    # Pass 1: each of the 7 once, weakest first
    if battle.unasked: return battle.unasked.pop(0)
    # Pass 2+: missed items first, but not within 2 questions of their last ask
    missed = [i for i in battle.missed_queue if battle.gap_since(i) >= 2]
    if missed:
        i = missed[0]; battle.missed_queue.remove(i); return i
    # Otherwise the weakest in-battle item, excluding the last 2 asked and any item asked 4+ times
    pool = [i for i in battle.set if battle.gap_since(i) >= 2 and battle.ask_count(i) < 4] or battle.set
    return min(pool, key=lambda i: battle.in_battle_score(i) + uniform(0, 0.1))
    # in_battle_score = M(i) + 0.15*correct_this_battle(i) - 0.3*wrong_this_battle(i)

on_wrong(item): battle.missed_queue.append(item)   # re-ask; reshuffle options, swap 1 distractor
```

- A re-ask after a correct answer flips the direction, so both directions get practice. A re-ask after a miss keeps the same direction.
- **Soft cap:** if a normal battle reaches 30 questions (boss: 45), enemies become "Tired": their ATK drops 30% and the hero's damage rises 50%. This ends pathological fights. Log it as a tuning signal: it should almost never fire at ≥60% accuracy.

---

## 5. Difficulty by location

Location counts follow the curriculum: about 30 items each, giving 20 locations. The last location in a realm holds the realm boss, and every location has an elite gatekeeper.

| # | Realm | Locs | Items (cum.) | Enemies / battle | Max defense Q / round | MC options | Local pool | Review slots of 7 | Normal enemy HP / ATK / DEF | Boss HP / ATK / DEF | Rec. level | Gear tier | Hero at rec (HP / ATK / DEF) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Starter Meadow | 3 | 92 (92) | 1–2 | 2 | 3 | ~30 | 0 (loc 1), 1 (loc 2–3) | 16 / 4 / 1 | 38 / 5 / 1 角兔王 | 1–3 | 1 | 42 / 6 / 4 |
| 2 | Honeycomb Forest | 2 | 69 (161) | 1–2 | 2 | 3 | ~35 | 1 | 27 / 9 / 2 | 63 / 11 / 2 Queen Bee 蜂后 | 3–5 | 2 | 54 / 10 / 8 |
| 3 | Crossroads Market | 2 | 51 (212) | 2 | 2 | 4 | ~25 | 2 | 31 / 13 / 3 | 88 / 16 / 3 Mimic King | 5–7 | 3 | 66 / 14 / 12 |
| 4 | Goblin Caves | 3 | 87 (299) | 2–3 | 3 | 4 | ~30 | 2 | 36 / 18 / 4 | 112 / 22 / 4 Goblin Chief | 7–10 | 4 | 84 / 18 / 16 |
| 5 | Hydra Swamp | 2 | 57 (356) | 2–3 | 3 | 4 | ~30 | 2 | 46 / 22 / 5 | 144 / 27 / 5 Hydra 九头蛇 | 10–13 | 5 | 102 / 23 / 20 |
| 6 | Zombie Lands | 2 | 68 (424) | 3 | 3 | 5 | ~34 | 2 | 48 / 26 / 6 | 168 / 32 / 6 Zombie Lord | 13–16 | 6 | 120 / 27 / 24 |
| 7 | Griffin Peaks | 2 | 63 (487) | 3 | 3 | 5 | ~32 | 3 | 57 / 31 / 7 | 200 / 38 / 7 Griffin Queen | 16–19 | 7 | 138 / 32 / 28 |
| 8 | Ogre Colosseum | 2 | 51 (538) | 3 | 3 | 6 | ~26 | 3 | 64 / 35 / 8 | 224 / 43 / 8 Ogre Champion | 19–22 | 8 | 156 / 36 / 32 |
| 9 | Demon King's Castle | 2 | 47 (585) | 3 | 3 | 6 | ~24 (+ whole-game review) | 3 (boss: 4) | 73 / 40 / 9 | 256 / 49 / 9 Demon King 魔王 | 22–25 | 9 | 174 / 41 / 36 |

- "Local pool" is new items. The **eligible review pool** is every earlier item (the cumulative column), sampled by due-ness. Nothing is ever retired; mastered items just get weight 0.1.
- Within a realm, later locations use the same tier stats. The elite (2× HP, 1.2× DEF_ref ATK) and the boss provide the spike.

**Past realm 9 (tier t ≥ 10), all by formula:**

| Lever | Rule |
|---|---|
| Stats | §2.3 formulas with `L_rec = 24 + 3(t−9)`, gear tier = t. The sim at t = 10–12 matches t = 8–9 balance. |
| Enemies | 3 on screen; `total = 3 + floor((t−9)/2)`, capped at 6. Extra enemies are reinforcements. Set `H(t) = 1.75` when total ≥ 5 to hold about 22 questions (untested; sim before shipping). |
| MC options | Capped at 6 (screen and readability). Difficulty then comes from the levers below. |
| Review share | `min(0.5, 3/7 + 0.03(t−9))` → up to 50% review |
| Prompt hardening | t ≥ 10: pinyin hidden by default on ZH→EN for Learned items; t ≥ 12: one distractor may share a character with the answer (早饭 vs 晚饭); t ≥ 14: ZH→EN defense prompts become audio-only for `listening = Y` items |
| Content | New realms are data files (§9.3). Parent sets slot in at the kid's frontier tier. |

---

## 6. Equipment and skills

### 6.1 Slots

| Slot | Stat | Unlock |
|---|---|---|
| Weapon | ATK | start |
| Armor | DEF (+ HP on fine/heroic) | start |
| Shield | DEF | start |
| Charm | special perk (one) | L3 |
| Skill slots | 2 (L1), 3 (L8), 4 (L16), 5 (L24) | level |
| Potion belt | 3 potions max per battle | start |

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
| 2 | 蜂刺短剑 Stinger Dagger | 花瓣斗篷 Petal Cloak | 蜂蜡盾 Beeswax Shield | 蜂后之冠 Queen's Crown (charm: +1 Heal charge) |
| 3 | 铁剑 Iron Sword | 皮甲 Leather Armor | 圆盾 Round Shield | 宝箱盾 Mimic Shield (Thorns 25%) |
| 4 | 弯刀 Scimitar | 矿工护甲 Miner's Plate | 石盾 Stone Shield | 哥布林王冠 Goblin Crown (+10% gold) |
| 5 | 蛇牙矛 Hydra-fang Spear | 鳞甲 Scale Mail | 沼泽盾 Bog Shield | 九头蛇鳞 Hydra Scale (first broken block per battle −50%) |
| 6 | 圣光锤 Holy Mace | 医者长袍 Healer's Robe | 银盾 Silver Shield | 解药瓶 Cure Flask (Heal +10%) |
| 7 | 狮鹫羽弓 Griffin Bow | 风之甲 Wind Mail | 云盾 Cloud Shield | 狮鹫羽 Griffin Feather (Frost cooldown −1) |
| 8 | 冠军大剑 Champion Blade | 角斗士铠甲 Gladiator Plate | 塔盾 Tower Shield | 冠军腰带 Champion Belt (streak 10 tier = ×2.25) |
| 9 | 勇者之剑 Hero's Sword | 龙鳞甲 Dragon-scale Mail | 精灵盾 Elven Shield | (the Demon King drops cosmetics and a title; the game is won) |

### 6.4 Skills (equip before battle; charges reset each battle)

| Skill | Effect | Charges / cooldown | How earned |
|---|---|---|---|
| **Guardian Shield 守护盾** | The first wrong block is treated as a correct block (leak still applies) | 1 per battle (rank 2: 2) | Starter Meadow boss |
| **Insight 提示** (hint) | Removes 1 distractor from the current MC question. The answer counts in combat, but mastery doesn't move up. | 2 per battle (rank 2: 3) | Start |
| **Double Strike 连击** | At streak ≥3, a correct attack hits twice (2nd hit at 50%) | Every 3 rounds | L5 |
| **Heal 治疗** | Replaces the attack: answer one question; correct heals 35% max HP; wrong fizzles | 1 per battle (rank 2: 2) | Honeycomb quest (honey!) |
| **Thorns 反击** | Passive: a correct block reflects 50% of the enemy's ATK as damage | passive | Goblin Caves quest |
| **Frost Word 冰冻** | A correct attack also freezes the target, which skips its next attack (one fewer defense question) | Every 3 rounds | Griffin Peaks elite |
| **Sweep 横扫** | A correct attack hits all enemies at 60% | Every 4 rounds | Zombie Lands boss |
| **Echo Voice 回音** | Passive: spoken correct answers deal ×1.5 (instead of ×1.25) and add +2 streak | passive | Speak 20 different items correctly |
| **Rally 鼓舞** | Start the battle at streak 3 | passive | Colosseum |
| **Second Wind 再起** | Once per battle, at 0 HP revive at 30% | 1 per battle | Castle quest |

Skill ranks go up through **mastery milestones**, not grinding: rank 2 when the kid has Mastered 40 items, rank 3 at 120.

Potions: Honey Potion (heal 30%, 20 gold) and Big Honey (heal 60%, 60 gold, tier 5+). Using one costs the hero turn and needs no question. Max 3 per battle.

### 6.5 How gear is earned (no pay-to-win)

- **No real money anywhere in v1.** There's no premium currency and no ads. Cosmetics are also earned.
- **Shop:** common gear is priced at about 8 at-level battles of gold.
- **Chests:** each location has 2–3 map chests, containing a fine-rarity piece at the location's tier or potions.
- **Elites:** 50% chance of a fine piece; first kill is guaranteed.
- **Bosses:** a guaranteed heroic piece plus a skill unlock.
- **Quests:** NPC requests that use the realm's vocabulary (e.g. "Bring me 3 苹果"). They give fine or heroic gear and skills.
- **Mastery rewards:** 1 star per location (60% Learned) gives a potion bundle; 2 stars (90% Learned) gives a fine piece; 3 stars (60% Mastered) gives a cosmetic.

---

## 7. Progression

### 7.1 XP and levels

```
XP to go from L to L+1 = 100 * L
Enemy XP:  normal 6 * L_rec(t)   elite 15 * L_rec(t)   boss 50 * L_rec(t)
Mastery XP (never damped): +10 when a track reaches box 2, +25 at box 4, +40 for a Spoken badge
Out-level damping: enemy XP x0.25 if heroLevel >= maxRecLevel(t) + 3
Retreat: keep all XP earned during the fight
```

At about 20 battles per realm, this yields about 3 levels per realm, matching the recommended level ranges. Mastery XP means learning, not grinding, is the fastest way to level. Damping makes farming old zones slow for XP, but review there still earns mastery XP.

### 7.2 Gold

Enemy gold: normal `3 × L_rec(t)`, elite ×3, boss ×10. There's +10% for a no-hint victory. Gold is spent on gear, potions and cosmetics.

### 7.3 Unlocks are gated by mastery, not only level

| Unlock | Requirement |
|---|---|
| Next location in the realm | Beat this location's elite gatekeeper **AND** ≥ 60% of this location's items Learned |
| Realm boss fight | ≥ 70% of the realm's items Learned (the level recommendation is a soft warning only) |
| Next realm | Realm boss defeated |
| Location stars (rewards, not gates) | ★ 60% Learned, ★★ 90% Learned, ★★★ 60% Mastered |

- Learned = box(ZH→EN) ≥ 2 and box(EN→ZH) ≥ 1. It is reachable within one session because box 2 needs a correct answer at least 10 min after the first.
- Mastered needs multi-day spacing, so it's used only for rewards, never for gates. A kid binge-playing on a Saturday isn't blocked by the calendar.
- If a kid is stuck on a gate, the **Training Grounds** (at every inn) run gate-pool battles with no damage, and a parent override exists (§9).

---

## 8. Answer modes

### 8.1 Speech recognition (Web Speech API, v1)

Setup:

- `SpeechRecognition || webkitSpeechRecognition`, `continuous = false`, `interimResults = false`, `maxAlternatives = 5`.
- `lang = 'zh-CN'` for EN→ZH answers; `lang = 'en-US'` for ZH→EN answers.
- **Push-to-talk**: the kid taps the mic, and it is never always-on.
- A parent must enable speech in settings (Chrome sends audio to Google; see §10).

Timing:

| Parameter | Default |
|---|---|
| Max listen window | 6 s; 8 s if the answer has more than 4 syllables |
| No-speech timeout | 4 s with no speech detected → counts as a technical failure |
| Start | After the prompt audio ends and the kid taps the mic, with a beep cue |

Normalization, applied to both the transcript alternatives and the accepted answers:

1. NFKC normalization, which converts full-width forms to half-width.
2. Strip all punctuation and whitespace, both CJK (，。！？、…) and ASCII.
3. Convert Traditional to Simplified with OpenCC `t2s` (opencc-js), so either script matches.
4. Convert digits to Chinese numerals (10 → 十, 12岁 → 十二岁, 2 → 二/两; both accepted).
5. Strip a trailing 儿 (erhua) on both sides: 哪儿 ≈ 哪, 一点儿 ≈ 一点.
6. Strip leading and trailing fillers 啊 呃 嗯 那个, unless the answer itself contains them.
7. English: lowercase; strip articles and "to"; keep only letters, digits and apostrophes; light stemming (s/es/ed/ing).

Accept (ZH answer) if **any** alternative satisfies **any** of:

| Rule | Detail |
|---|---|
| Exact | `norm(alt) == norm(ans)` for the answer or any `alt_answers_zh` |
| Contained | `norm(ans)` is a substring of `norm(alt)` and the extra characters ≤ max(2, len(ans)), e.g. "苹果吧" or "我要苹果" for 苹果 |
| Homophone | Toneless pinyin of alt == toneless pinyin of ans (pinyin-pro). Handles 他/她/它, 在/再, and recognizer character-choice errors. Tones aren't checked in v1, by design. |
| Fuzzy (≥4 syllables only) | Syllable-level Levenshtein similarity ≥ **0.8** on toneless pinyin, with lenient pairs (zh~z, ch~c, sh~s, -ng~-n, l~n) each costing 0.5 |
| ≤3 syllables | Exact or homophone only. Fuzzy is too permissive for short words (我饿了 vs 我喝了). |

Accept (EN answer) if any alternative, normalized, equals any gloss sense (the english field split on `;` `,` `/`, parentheticals removed) or any `alt_answers_en`; or has token-set ratio ≥ **0.8** with a sense; or contains the sense's head word for 1–2-word senses.

Failure handling. The kid-safe default is that **speech never directly causes a miss** (open question Q1):

| Situation | Result |
|---|---|
| Mic permission denied, API missing (Safari/Firefox), or a `network`/`not-allowed` error | Speech is disabled for the session with a friendly banner. MC only. |
| Technical failure (`no-speech`, `aborted`, empty result) | 1st: "I didn't hear you, try again!" 2nd: **auto-fallback to MC** for this question, no penalty. |
| Recognized but no match | 1st: "Close! Try once more" (the model audio plays). 2nd: auto-fallback to MC for the same question. The MC answer decides hit/miss or block. |
| Spoken correct | Correct, ×1.25 damage on attack, +1 extra streak, `spokenOk++` (distinct days) |

Privacy: store only the transcript text in logs, never audio.

### 8.2 Distractor generation (core and parent items)

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
- Option display: EN→ZH options show characters, plus pinyin while the item is not yet ZH→EN box ≥3 or when `reading = N`. ZH→EN options show the **primary English sense only**, in a consistent format.
- Quality loop: if one distractor draws more than 40% of an item's wrong answers across ≥20 attempts, flag the pair for review (it may be an unlisted synonym).

---

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
           enemyRoster: { enemyId; weight }[]; eliteId; bossId?;
           unlock: { requires: string[]; minLearnedPct: 0.6; gatekeeper: true } }
Enemy    { id; nameZh; nameEn; art; kind: 'normal' | 'elite' | 'boss'; statsFromTier: true; overrides? }
```

- Every difficulty value defaults from `tier` using the §2.3/§5 formulas, so a new realm is just JSON plus art.
- A parent WordSet compiles into `ceil(n/30)` Locations under a "Guild Quests" realm at the kid's frontier tier, reusing unlocked enemy rosters.
- Mastery is keyed by `itemKey`, so the same word learned in a parent set and in the core curriculum shares one record.
- Performance: a pool of 10k items is fine. Selection is O(n) per battle, and distractor scoring can be precomputed per topic bucket.

---

## 10. Tuning knobs, analytics, open questions

### 10.1 Knobs (defaults)

| Knob | Default | Notes |
|---|---|---|
| SET_SIZE | 7 (tutorial 4) | Jack's rule |
| NEW_CAP | 3 per battle | Early-location fill rule in §3.2 |
| K_BLOCK / K_BROKEN / BROKEN_FLOOR | 1.25 / 0.5 / 0.5 | Leak and broken-block severity |
| Enemy ATK factor normal / elite / boss | 1.1 / 1.2 / 1.35 × DEF_ref | >1.25 means correct blocks leak at level |
| H(t) hits-to-kill | 3, 3, 2.5, 2.25, 2.25, 2, 2, 2, 2 | Main battle-length lever |
| Boss hits / minions / checkpoint heal | 7 / 1–2 / 40% | |
| Streak tiers | 3 / 6 / 10 → ×1.25 / 1.5 / 2.0 | A miss drops one tier |
| Spoken bonus | ×1.25 dmg, +1 streak | |
| Fast-answer floor | 600 ms | No streak gain below it |
| Options unlock delay | end of audio, or 800 ms | |
| Leitner intervals | 0, 10 min, 1 d, 3 d, 7 d, 16 d, 35 d | |
| Wrong answer drop | −2 boxes | |
| Gates | 60% Learned (location), 70% (boss) | |
| Soft cap | 30 questions (boss 45) | "Tired" enemies |
| Speech fuzzy threshold | 0.8, ≥4 syllables | |
| Speech timeouts | 6 s / 8 s listen, 4 s no-speech | |
| HP between battles | full heal after every battle | See Q2 |
| XP curve | 100 × L; enemy XP 6 / 15 / 50 × L_rec | |

### 10.2 Analytics to log

Keep analytics local-first: IndexedDB, with a JSON export button for Jack. No third-party analytics (COPPA).

- **Per question:** ts, session/battle/location ids, itemId, direction, mode, turnKind (attack/defense), optionsShown and distractorIds, promptPlayMs, latencyMs (from unlock), answerGiven, correct, hintUsed, fastAnswer flag, speech {alternatives text, outcome: match / mismatch / no-speech / error / fallback}, boxBefore/After, streakBefore, damage dealt/taken, leak amount.
- **Per battle:** result (win / retreat / flee), rounds, questions, HP% left, softCapFired, skills and potions used, gear tier vs location tier, duration.
- **Per session:** length, battles, mid-battle quits (frustration signal), inn visits.

KPIs and targets:

| KPI | Target |
|---|---|
| Accuracy per realm | 75–85% (below 70%: content too hard; above 92%: too easy) |
| Normal battle loss rate | < 10% |
| Boss first-try win rate | 60–85% |
| Median battle length | Within §2.5 targets |
| Soft cap firing rate | < 1% |
| Speech match rate by item | Items below 40% need alt answers or a speaking=N flag |
| Distractor draw share | Flag any distractor drawing > 40% of an item's wrong answers |
| Leech count | Tracked |
| Time to each gate | Tracked |
| Items per day moving to Learned / Mastered | Tracked |

### 10.3 Open questions for Jack

1. **Speech mismatch = miss?** The spec defaults to "no penalty: retry once, then fall back to MC", because browser ASR on kids' voices is unreliable. Do you want spoken-wrong to count as a miss?
2. **HP between battles:** full heal after every battle (the default, simplest and kindest), or HP carries over until an inn or potion (more tension and more gear/potion value)?
3. **Companion:** keep the memo's companion "team attack" filled by misses (free action, no question)? It softens failure but adds a system to build.
4. **Enemy cap:** is 3 on screen (so at most 3 defense questions per round) okay? Late rounds are about 75% defense questions.
5. **Gate strictness:** are 60% Learned per location and 70% for the boss right? Should parents get an override switch?
6. **Tones:** v1 can't check tones (Web Speech returns characters). Is that acceptable for the playtest, with a paid tone-scoring API (SpeechSuper/Azure) as a later option?
7. **Parent-item audio:** browser TTS (free; zh-CN voice quality varies by device, and some devices have none) or pre-generated cloud TTS (consistent, but needs a small server and API key)?
8. **Timers:** the spec has none. Do you want a gentle, visible defense timer for tension (e.g. 15 s, then an auto-"hint" rather than an auto-fail)?
9. **Devices:** Chrome/Chromebook is the only reliable speech target. Is MC-only acceptable on iPad/Safari for friends' devices?
10. **Consent:** Chrome sends mic audio to Google. For under-13 friends in the playtest, get each parent's OK before enabling speech. Should speech default to off?

### 10.4 Risks

- **Guessing wins early:** at 3 options, the sim wins realm-1 fights even at 45% accuracy. That is fine for onboarding, since gates need Learned items, but watch for it.
- **Battle length:** late normal fights run about 20–23 questions (3.5 min). If the playtest shows fatigue, lower `H(t)` to 1.75 or use Frost/Sweep. Seven items asked about 3× each can feel repetitive, so vary prompt art and voice lines.
- **Under-gearing hits hard:** 2 tiers under-geared drops the 75%-accuracy win rate to about 0–20% at tiers 3–6 (about 48% at tier 9). The UI must show a clear "Enemies too strong: upgrade your shield!" warning when `ATK_e > 1.25·DEF_h`.
- **Parent-entered errors:** wrong pinyin on polyphones and English synonyms that make ZH→EN ambiguous. The validation flags help, but a parent still has to review.
- **Web Speech drift:** browser support shifts between versions. Keep MC as a first-class path, never a degraded one.
