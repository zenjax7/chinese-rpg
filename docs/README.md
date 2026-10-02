# Chinese Quest: project docs

A browser-based, turn-based fantasy RPG (Phaser 4 + TypeScript + Vite) that teaches Mandarin reading, listening and speaking to kids aged about 10–12. Battles are won by answering vocabulary questions, typed or spoken.

- **Play the live prototype:** https://zenjax7.github.io/chinese-rpg/
- **Start here:** [plan.md](plan.md), the research summary, plan and early decisions.

This folder holds design docs, data tables and art references. It is **not** part of the game build: Vite only bundles `src/` and copies `public/`, so nothing under `docs/` is deployed to GitHub Pages.

## Source of truth

When documents disagree, use this order:

1. **[combat-spec.md](combat-spec.md) (v3, with the v3.2/v3.3 updates)** and **[spells.md](spells.md) (v3.3)** for combat, progression, spells and quests.
2. **The data tables in [data/](#data-tables)**, which match spec v3.3. The game data in `src/data` is built from them.
3. [core-curriculum.md](core-curriculum.md) with [data/core-curriculum.csv](data/core-curriculum.csv) (v2) for vocabulary.
4. [plan.md](plan.md) and the research memos are background. Where they differ from the spec or data (numbers, mechanics), the spec and data win.

Everything in [archive/](archive/) is superseded and kept for history only.

## Design docs

| File | What it is |
|---|---|
| [plan.md](plan.md) | Research summary, plan and early decisions (vision, market gap, scope). Older than the spec. |
| [combat-spec.md](combat-spec.md) | **Source of truth.** Combat and progression spec v3 (v3.2 caps, v3.3 spells and quests). |
| [spells.md](spells.md) | **Source of truth.** Magic spells and quests: design and sim results (v3.3). |
| [core-curriculum.md](core-curriculum.md) | Core curriculum v2: how the vocabulary is levelled and split across realms and locations. |
| [enemies-art-brief.md](enemies-art-brief.md) | Art brief for all 50 enemies, by realm and priority. |
| [ui-layout-review.md](ui-layout-review.md) | UI layout and game-feel review, with the mockups in [art/mockups/](art/mockups/). |
| [chinese-rpg-design-memo.md](chinese-rpg-design-memo.md) | Design findings memo: reference games (Prodigy, Miitopia), HSK levels, learning design. |
| [research-tech-market.md](research-tech-market.md) | Technology, market and compliance research (engines, speech, COPPA). |
| [art-direction-memo.md](art-direction-memo.md) | Art direction findings: reference game styles and what appeals to 12-year-olds. |
| [ai-art-pipeline-proposal.md](ai-art-pipeline-proposal.md) | Proposal for the AI art and audio pipeline into Phaser. |

### Archive (superseded)

| File | What it is |
|---|---|
| [archive/combat-spec-v1.md](archive/combat-spec-v1.md) | Combat spec v1. |
| [archive/combat-spec-v2.md](archive/combat-spec-v2.md) | Combat spec v2. |
| [archive/combat-spec-v2.html](archive/combat-spec-v2.html) | HTML export of combat spec v2. |
| [archive/combat-spec-v3.html](archive/combat-spec-v3.html) | HTML export of combat spec v3 (snapshot; the .md is current). |
| [archive/core-curriculum-v1.md](archive/core-curriculum-v1.md) | Core curriculum v1 write-up. |
| [archive/core-curriculum-v1.csv](archive/core-curriculum-v1.csv) | Curriculum v1 data. |
| [archive/core-curriculum-v1.xlsx](archive/core-curriculum-v1.xlsx) | Curriculum v1 spreadsheet. |
| [archive/core-curriculum-v2.html](archive/core-curriculum-v2.html) | HTML export of curriculum v2 (snapshot; the .md is current). |

## Data tables

All tables are in [data/](data/). The CSV and JSON versions hold the same data.

| Table | Files |
|---|---|
| Core curriculum v2 (every word and phrase, 16 columns) | [csv](data/core-curriculum.csv) · [xlsx](data/core-curriculum.xlsx) |
| Enemy roster for art and content (names, shouts, art brief, animations) | [csv](data/enemies-roster.csv) · [json](data/enemies-roster.json) |
| Spell cast rule (when a spell fires vs fizzles) | [csv](data/cast_rule.csv) · [json](data/cast_rule.json) |
| Treasure chest loot tables | [csv](data/chest_contents.csv) · [json](data/chest_contents.json) |
| Combined combat data bundle (all tables in one JSON) | [json](data/combat_data.json) |
| Companion stats and behavior | [csv](data/companion.csv) · [json](data/companion.json) |
| Potions and other consumable items | [csv](data/consumables.csv) · [json](data/consumables.json) |
| Curriculum items assigned to each location | [csv](data/curriculum_location_pools.csv) |
| Location list for the curriculum | [csv](data/curriculum_locations.csv) |
| Per-realm curriculum totals | [csv](data/curriculum_realm_summary.csv) |
| Prototype slice of the curriculum | [csv](data/curriculum_slice.csv) |
| Enemy drop tables | [csv](data/drops.csv) · [json](data/drops.json) |
| Shop prices and gold economy | [csv](data/economy_prices.csv) · [json](data/economy_prices.json) |
| Enemy combat stats (spec v3 balance table) | [csv](data/enemies.csv) · [json](data/enemies.json) |
| Enemy stat bands per level/role | [csv](data/enemy_stat_bands.csv) · [json](data/enemy_stat_bands.json) |
| Weapons and armor by tier | [csv](data/gear.csv) · [json](data/gear.json) |
| Heroic gear drops from bosses/elites | [csv](data/gear_heroic_drops.csv) · [json](data/gear_heroic_drops.json) |
| Hero stats by level | [csv](data/hero_stats.csv) · [json](data/hero_stats.json) |
| MP potion values | [csv](data/mp_potions.csv) · [json](data/mp_potions.json) |
| MP rules (max MP, regen, heal limits) | [csv](data/mp_rules.csv) · [json](data/mp_rules.json) |
| Practice mode definitions | [csv](data/practice_modes.csv) · [json](data/practice_modes.json) |
| Rewards for practice modes | [csv](data/practice_rewards.csv) · [json](data/practice_rewards.json) |
| Proficiency patrol settings | [csv](data/proficiency_patrol_settings.csv) · [json](data/proficiency_patrol_settings.json) |
| Quest list | [csv](data/quests.csv) · [json](data/quests.json) |
| Quests with full text and steps | [json](data/quests_full.json) |
| Difficulty per realm | [csv](data/realm_difficulty.csv) · [json](data/realm_difficulty.json) |
| Difficulty per location | [csv](data/realm_location_difficulty.csv) · [json](data/realm_location_difficulty.json) |
| Safety nets for struggling players | [csv](data/safety_nets.csv) · [json](data/safety_nets.json) |
| Skills and their MP costs | [csv](data/skills_mp.csv) · [json](data/skills_mp.json) |
| Special enemy/boss mechanics | [csv](data/special_mechanics.csv) · [json](data/special_mechanics.json) |
| Spell damage falloff | [csv](data/spell_falloff.csv) · [json](data/spell_falloff.json) |
| Spell MP sanity check | [csv](data/spell_mp_check.csv) · [json](data/spell_mp_check.json) |
| Spell list (shop, cost, effect) | [csv](data/spells.csv) · [json](data/spells.json) |
| Spells with full text | [json](data/spells_full.json) |

`enemies-roster.*` is the full roster that goes with the enemy art brief. `enemies.*` is the slimmer balance table from spec v3. Both use the same enemy ids; use `enemies.*` for numbers.

### Simulation output

[data/sim/](data/sim/) holds the balance-sim results behind the spec (25 CSVs): realm pacing, economy, MP, companion, elites, specials, patrol minutes, spoken-answer cap, trigger tuning, and the spell sims by player profile (`50/65/75/90_saver`, `75_spender`).

## Art references

Final game sprites, backgrounds and audio are not here; they are under `public/` in the game.

| Folder | What it is |
|---|---|
| [art/mockups/](art/mockups/) | UI mockups from the layout review: battle command, battle question (multiple choice and speech), battle feedback, diagnosis, map, village, scaling. The HTML/CSS sources and render script are in [art/mockups/src/](art/mockups/src/). |
| [art/style-anchors/](art/style-anchors/) | Style exploration. `APPROVED_style_bright_detailed_battle.png` is the chosen style; anchors A (bright classic), B (storybook ink-wash), C (bold graphic), a hybrid, and a meadow battle mockup are the options it was picked from. |
| [art/refsheets/](art/refsheets/) | Character reference sheets: `hero_v1.png`, `horned_rabbit_enemy_v1.png`, and `REJECTED_rabbit_as_buddy.png` (kept to show what to avoid: the rabbit must look like a pest monster, not a pet). |

## How to update

- Desy (design), Arty (art) and Director hand updated files to GameDev, who copies them into `docs/` and commits them. Or edit the files under `docs/` directly and commit.
- When a spec changes, move the old version to `archive/` with a `-vN` suffix and keep the current file name, so links stay valid.
- Keep the data tables in step with the spec. Do not put game assets here; they belong in `public/`. Keep files under 25 MB.
