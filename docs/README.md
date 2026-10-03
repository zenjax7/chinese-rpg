# Chinese Quest: project docs

A browser-based, turn-based fantasy RPG (Phaser 4 + TypeScript + Vite) that teaches Mandarin reading, listening and speaking to kids aged about 10–12. Battles are won by answering vocabulary questions, typed or spoken.

- **Play the live prototype:** https://zenjax7.github.io/chinese-rpg/
- **Start here:** [design/plan.md](design/plan.md), the research summary, plan and early decisions.

This folder holds design docs, data tables, reference images and Desy's design tools. It is **not** part of the game build: Vite only bundles `src/` and copies `public/`, so nothing under `docs/` goes to GitHub Pages. The layout follows Desy's repo manifest. Docs are Markdown and tables are CSV (UTF-8; some CSVs have a BOM for Excel). JSON twins are kept for code. HTML and XLSX exports are left out because they are generated from the Markdown and CSV files.

## Source of truth

When documents disagree, use this order:

1. **[design/combat-spec.md](design/combat-spec.md) (spec v3.7)** and **[design/spells.md](design/spells.md) (v3.7)** for combat, progression, spells and quests.
2. **The CSV tables in [data/](#data-tables)**, which match spec v3.7. The game data in `src/data` is built from them.
3. [design/curriculum-notes.md](design/curriculum-notes.md) with [data/curriculum/curriculum.csv](data/curriculum/curriculum.csv) (v2) for vocabulary.
4. [design/plan.md](design/plan.md) and the research memos are background. Where they differ from the spec or data (numbers, mechanics), the spec and data win.

Everything in an `archive/` folder is superseded and kept for history only.

## Design docs ([design/](design/))

| File | What it is |
|---|---|
| [combat-spec.md](design/combat-spec.md) | **Source of truth.** Combat and progression spec, v3.7 (no MP regen; boss HP targets ~15 correct answers for location bosses and ~20 for realm bosses, even with full-MP spells; boss ATK × 0.8; no MP hints). |
| [spells.md](design/spells.md) | **Source of truth.** Magic spells and quests: design and sim results, v3.7 (no cast caps, MP only; MP costs 1.25 × v3.4). |
| [curriculum-notes.md](design/curriculum-notes.md) | Curriculum notes v2: how the vocabulary is levelled and split across realms and locations. |
| [enemies-art-brief.md](design/enemies-art-brief.md) | Enemy roster and art brief (50 enemies, with animation briefs for Arty). |
| [ui-layout-review.md](design/ui-layout-review.md) | UI layout and game-feel review. Its images are in [images/ui-review/](images/ui-review/). |
| [design-memo.md](design/design-memo.md) | Design findings memo: reference games (Prodigy, Miitopia), HSK levels, learning design. |
| [plan.md](design/plan.md) | Research summary, plan and early decisions. Older than the spec. |
| [research-tech-market.md](design/research-tech-market.md) | Technology, market and compliance research (engines, speech, COPPA). |
| [art-direction-memo.md](design/art-direction-memo.md) | Art direction findings: reference game styles and what appeals to 12-year-olds. |
| [ai-art-pipeline-proposal.md](design/ai-art-pipeline-proposal.md) | Proposal for the AI art and audio pipeline into Phaser. |

### Archive ([design/archive/](design/archive/))

| File | What it is |
|---|---|
| [combat-spec-v3.6.md](design/archive/combat-spec-v3.6.md) | Combat spec v3.6 (~20-answer target for all bosses). |
| [spells-v3.6.md](design/archive/spells-v3.6.md) | Spells and quests v3.6. |
| [combat-spec-v3.5.md](design/archive/combat-spec-v3.5.md) | Combat spec v3.5 (MP regen, MP hints, v3.5 boss stats). |
| [spells-v3.5.md](design/archive/spells-v3.5.md) | Spells and quests v3.5. |
| [combat-spec-v3.4.md](design/archive/combat-spec-v3.4.md) | Combat spec v3.4, with per-battle cast caps. |
| [spells-v3.4.md](design/archive/spells-v3.4.md) | Spells and quests v3.4, with cast caps and the 3-correct unlock. |
| [combat-spec-v3.3.md](design/archive/combat-spec-v3.3.md) | Combat spec v3.3, before the v3.4 free-cast spell change. |
| [spells-v3.3.md](design/archive/spells-v3.3.md) | Spells and quests v3.3, before the free-cast change. |
| [combat-spec-v2.md](design/archive/combat-spec-v2.md) | Combat spec v2. |
| [combat-spec-v1.md](design/archive/combat-spec-v1.md) | Combat spec v1. |
| [curriculum-notes-v1.md](design/archive/curriculum-notes-v1.md) | Curriculum notes v1. |

## Data tables

### Curriculum ([data/curriculum/](data/curriculum/))

| File | What it is |
|---|---|
| [curriculum.csv](data/curriculum/curriculum.csv) | Master word and phrase list, v2 (16 columns, UTF-8 with BOM) |
| [curriculum_location_pools.csv](data/curriculum/curriculum_location_pools.csv) | Curriculum items assigned to each location |
| [curriculum_locations.csv](data/curriculum/curriculum_locations.csv) | Location list |
| [curriculum_realm_summary.csv](data/curriculum/curriculum_realm_summary.csv) | Per-realm totals |
| [curriculum_slice.csv](data/curriculum/curriculum_slice.csv) | Prototype slice |
| [archive/curriculum-v1.csv](data/curriculum/archive/curriculum-v1.csv) | Curriculum v1 word list (superseded) |

### Enemies ([data/enemies/](data/enemies/))

| File | What it is |
|---|---|
| [enemies-art-roster.csv](data/enemies/enemies-art-roster.csv) | Art-brief roster: visuals, attacks, shouts (same stats as the combat table) |
| [enemies.csv](data/enemies/enemies.csv) | Combat table: stats, drops, specials. Use this for numbers. |
| [enemy_stat_bands.csv](data/enemies/enemy_stat_bands.csv) | Enemy stat bands by level and role |
| [boss_hp.csv](data/enemies/boss_hp.csv) | Boss HP multipliers and ATK × 0.8 by tier and boss type (v3.7: location ~15, realm ~20 correct answers; v3.6 values kept as columns) |

### Spells and quests ([data/spells/](data/spells/))

| File | What it is |
|---|---|
| [cast_rule.csv](data/spells/cast_rule.csv) | Spell cast rule (v3.6+: no cap, MP only, no regen, no hints) |
| [mp_potions.csv](data/spells/mp_potions.csv) | MP potion values (map only) |
| [quests.csv](data/spells/quests.csv) | Quest list |
| [spell_falloff.csv](data/spells/spell_falloff.csv) | Spell damage fall-off: reference only, not a game rule |
| [spell_mp_check.csv](data/spells/spell_mp_check.csv) | Spell MP sanity check (v3.5+ costs) |
| [spells.csv](data/spells/spells.csv) | Spell list: towns, prices, power, MP (v3.5+ costs = 1.25 × v3.4; the v3.4 MP is kept in `mp_cost_v34`) |

### Combat tables ([data/combat/](data/combat/))

These are the spec tables.

| File | What it is |
|---|---|
| [chest_contents.csv](data/combat/chest_contents.csv) | Treasure chest loot tables |
| [companion.csv](data/combat/companion.csv) | Companion stats and behavior |
| [consumables.csv](data/combat/consumables.csv) | Potions and other consumables |
| [drops.csv](data/combat/drops.csv) | Enemy drop tables |
| [economy_prices.csv](data/combat/economy_prices.csv) | Shop prices and gold economy |
| [gear.csv](data/combat/gear.csv) | Weapons and armor by tier |
| [gear_heroic_drops.csv](data/combat/gear_heroic_drops.csv) | Heroic gear drops from bosses and elites |
| [hero_stats.csv](data/combat/hero_stats.csv) | Hero stats by level |
| [mp_rules.csv](data/combat/mp_rules.csv) | MP rules (max MP, regen, heal limits) |
| [practice_modes.csv](data/combat/practice_modes.csv) | Practice mode definitions |
| [practice_rewards.csv](data/combat/practice_rewards.csv) | Rewards for practice modes |
| [proficiency_patrol_settings.csv](data/combat/proficiency_patrol_settings.csv) | Proficiency patrol settings |
| [realm_difficulty.csv](data/combat/realm_difficulty.csv) | Difficulty per realm |
| [realm_location_difficulty.csv](data/combat/realm_location_difficulty.csv) | Difficulty per location |
| [safety_nets.csv](data/combat/safety_nets.csv) | Safety nets for struggling players |
| [skills_mp.csv](data/combat/skills_mp.csv) | Skills and their MP costs |
| [special_mechanics.csv](data/combat/special_mechanics.csv) | Special enemy and boss mechanics |

### Simulation output ([data/sim/](data/sim/))

There are 28 CSV result tables behind the spec: realm pacing, economy, MP, companion, elites, specials, patrol minutes, spoken-answer cap, trigger tuning, and the spell sims by player profile (`50/65/75/90_saver`, `75_spender`), plus the v3.5–v3.7 tables [sim_spells_does_saving_mp_pay_off.csv](data/sim/sim_spells_does_saving_mp_pay_off.csv), [sim_spells_boss_target_check_correct_answers_to_win.csv](data/sim/sim_spells_boss_target_check_correct_answers_to_win.csv) and [sim_spells_question_share_cast_share_hours_and_defe.csv](data/sim/sim_spells_question_share_cast_share_hours_and_defe.csv). The full v3.7 sim text output is [combat_sim_out.txt](data/sim/combat_sim_out.txt).

### JSON twins ([data/json/](data/json/))

There are 30 JSON files for the game code. Each one matches the CSV of the same name; the art roster is `enemies-art-roster.json`. Three are bundles with no single CSV twin:
- [combat_data.json](data/json/combat_data.json) bundles all the spec tables.
- [spells_full.json](data/json/spells_full.json) adds the spell rules and tiers to the list.
- [quests_full.json](data/json/quests_full.json) adds the quest rules to the list.

The rules in these bundles are also written out in spells.md and combat-spec.md §6.7 and §7.11.

## Images ([images/](images/))

Final game sprites, backgrounds and audio are not here; they are under `public/` in the game.

### UI review mockups ([images/ui-review/](images/ui-review/))

| File | What it is |
|---|---|
| [battle-command.png](images/ui-review/battle-command.png) | Mockup A: battle, command state |
| [battle-feedback.png](images/ui-review/battle-feedback.png) | Mockup D: answer feedback and the hit |
| [battle-question-mc.png](images/ui-review/battle-question-mc.png) | Mockup B: question open (multiple choice) |
| [battle-question-speech.png](images/ui-review/battle-question-speech.png) | Mockup C: defense question, speech mode |
| [diagnosis.png](images/ui-review/diagnosis.png) | Annotated diagnosis of the old battle screen |
| [map.png](images/ui-review/map.png) | Mockup E: location map |
| [scaling.png](images/ui-review/scaling.png) | Scaling and letterboxing across devices |
| [village.png](images/ui-review/village.png) | Mockup F: village hub and world map |

The HTML/CSS mock sources are in [images/ui-review/src/](images/ui-review/src/) (re-render with `render.mjs`; they expect the prototype's `dist/` art). They are kept as sources only and are not part of the game build.

### Style anchors ([images/style-anchors/](images/style-anchors/))

| File | What it is |
|---|---|
| [APPROVED_style_bright_detailed_battle.png](images/style-anchors/APPROVED_style_bright_detailed_battle.png) | **Approved style** (bright, detailed battle scene) |
| [anchor_A_bright_classic.png](images/style-anchors/anchor_A_bright_classic.png) | Style option A: bright classic |
| [anchor_B_storybook_inkwash.png](images/style-anchors/anchor_B_storybook_inkwash.png) | Style option B: storybook ink-wash |
| [anchor_C_bold_graphic.png](images/style-anchors/anchor_C_bold_graphic.png) | Style option C: bold graphic |
| [battle_mockup_meadow.png](images/style-anchors/battle_mockup_meadow.png) | Meadow battle mockup |
| [hybrid_A_inkwash_Cmenace_battle.png](images/style-anchors/hybrid_A_inkwash_Cmenace_battle.png) | Hybrid: ink-wash with option C menace |

### Reference sheets ([images/refsheets/](images/refsheets/))

| File | What it is |
|---|---|
| [REJECTED_rabbit_as_buddy.png](images/refsheets/REJECTED_rabbit_as_buddy.png) | Rejected: rabbit drawn as a cute buddy (it must look like a pest monster) |
| [hero_v1.png](images/refsheets/hero_v1.png) | Hero reference sheet v1 |
| [horned_rabbit_enemy_v1.png](images/refsheets/horned_rabbit_enemy_v1.png) | Horned Rabbit enemy reference sheet v1 |

## Design tools ([tools/](tools/))

These are Desy's sim and data-generation scripts. **They live in `docs/tools/`, not the repo's top-level `tools/`.** The top-level `tools/` holds the game's own build scripts (for example `tools/build_data.py`, which builds `src/data`), and keeping the two apart stops them being mixed up. The scripts expect Desy's workspace layout (`/workspace/desy`), so they are kept here for reference and are not run from the repo.

| File | What it is |
|---|---|
| [combat_sim.py](tools/sim/combat_sim.py) | Battle sim |
| [sim_v3_runner.py](tools/sim/sim_v3_runner.py) | v3 sim runner |
| [spells_runner.py](tools/sim/spells_runner.py) | Campaign runner, v3.7 |
| [spells_sim.py](tools/sim/spells_sim.py) | Campaign sim (spells and quests) |
| [boss_harness.py](tools/sim/boss_harness.py) | v3.6 single boss fight harness (full MP, 2 strongest spells) |
| [boss_tune.py](tools/sim/boss_tune.py) | Boss HP multiplier tuning (v3.6, plus the v3.7 location retune) |
| [boss_tune_v37_loc.json](tools/sim/boss_tune_v37_loc.json) | v3.7 location boss HP tuning output (~15 correct answers) |
| [regen_only.py](tools/sim/regen_only.py) | v3.6 check: removing MP regen alone |
| [atk_check.py](tools/sim/atk_check.py) | v3.6 boss ATK multiplier check |
| [v37_boss_check_0.5.json](tools/sim/v37_boss_check_0.5.json), [0.75](tools/sim/v37_boss_check_0.75.json), [0.9](tools/sim/v37_boss_check_0.9.json) | v3.7 boss check output at 50 / 75 / 90 % accuracy |
| [assemble_spec.py](tools/data/assemble_spec.py) | Assembles combat-spec.md |
| [build_data.py](tools/data/build_data.py) | Generates the data CSV/JSON tables |
| [spec_new_sections.md](tools/data/spec_new_sections.md) | Spec source sections |
| [spells_data.py](tools/data/spells_data.py) | Spell and quest source data and design formulas |
| [spells_md_template.md](tools/data/spells_md_template.md) | spells.md template |
| [write_spells_md.py](tools/data/write_spells_md.py) | Generates spells.md |

## How to update

- Desy, Arty and Director hand updated files to GameDev, who copies them into `docs/` (Desy's `repo-manifest.md` maps each source file to its path here) and commits them. Or edit the files under `docs/` directly and commit.
- When a spec changes, copy the old version into the matching `archive/` folder with a version suffix (for example `combat-spec-v3.3.md`) and keep the current file name, so links stay valid.
- Docs are Markdown and sheets are CSV. Don't commit HTML or XLSX exports, third-party word lists (CC-CEDICT, HSK/YCT lists), or game assets (those go in `public/`). Keep files under 5 MB.
