# Chinese Quest: project docs

A browser-based, turn-based fantasy RPG (Phaser 4 + TypeScript + Vite) that teaches Mandarin reading, listening and speaking to kids aged about 10–12. Live prototype: https://zenjax7.github.io/chinese-rpg/

## Rules

- **GitHub is the only source of truth.** This `docs/` folder in [zenjax7/chinese-rpg](https://github.com/zenjax7/chinese-rpg) is the one primary copy of every design doc and table. Copies elsewhere (Google Drive, `/workspace/desy`, `/workspace/art`) are working drafts, not sources.
- **Tables are CSV, docs are Markdown.** JSON only where the data is structured (world graphs, quests, dialogue, schemas). No `.xlsx`, `.html` exports or Google Docs/Sheets copies are kept or maintained.
- **Owners commit here.** Desy, Arty, GameDev and the Director commit future docs and tables directly to this folder (or hand them to GameDev to commit), and in the same commit **update this index** (one line per file) and, for any decision by Jack, **add a line to [decisions.md](decisions.md)**.
- **Edit in place; git is the version control.** Don't add `-v2`/`archive` copies. To see an old version: `git log --follow -- docs/<path>` then `git show <commit>:<path>`. Files from before the 2026-10-09 reorganization keep their history across the move (`git log --follow`); for example `git log --follow -- docs/design/combat-spec.md`, or `git show 09abe41:docs/design/archive/combat-spec-v3.8.md` for a dropped archive copy.
- **Game data is built from here.** `tools/build_data.py` and `tools/world/build_world.py` read `docs/data/`; rebuild and commit `src/data/` and `public/world/` after a data change ([tech/deploy.md](tech/deploy.md)). `docs/` itself is not part of the Pages build.

## Which doc wins

1. [decisions.md](decisions.md) (Jack's locked decisions), then [design/combat-spec.md](design/combat-spec.md) (v3.9.3), [design/spells.md](design/spells.md) (v3.7) and [design/world-graph.md](design/world-graph.md) (v3.9.3).
2. The tables in [data/](data/), which match those specs; `src/data` is built from them.
3. [design/curriculum-notes.md](design/curriculum-notes.md) with [data/curriculum/curriculum.csv](data/curriculum/curriculum.csv) for vocabulary; [story/](story/) for story and quests.
4. [design/plan.md](design/plan.md) and the research memos are background.

The v3.9.2 world and quest data (realm 3–9 content files, `realms[]` links and exit edges, FNV-1a seeds, escort and words steps) is merged into [data/world/](data/world/) and [data/quests/](data/quests/), and the game reads it (graph mode, `?world=graph`). The spec text covers it: combat-spec §12.3–§12.4 and world-graph §0.00, §1.1, §4.4, §12.1, §14.6.

v3.9.5 (Oct 10) is in the game too: villages have no smith (no gear for sale), heroic gear has exactly one source per piece (realm-boss chests, with charms for realms 4–8, and quest `q5_fog_bottle`; the other 24 heroic pieces are named but not placed), and `q9_second_wind` step 2 plays the scene `sc_q9_second_wind_badge`. See [decisions.md](decisions.md) (Oct 10).

## Layout

| folder | what | owner |
|---|---|---|
| [design/](design/) | Game rules: combat, spells, world graph, economy, curriculum notes, UI layout, plan | Desy |
| [story/](story/) | Story, characters, quests | Desy |
| [data/](data/) | CSV and JSON tables: curriculum, enemies, spells, items, balance, quests, dialogue, world, sim, json | Desy |
| [art/](art/) | Art and audio specs, Arty's READMEs, asset hooks, reference images | Arty |
| [tech/](tech/) | Architecture, deploy, research, and Desy's design tools | GameDev |

## Index (one line per file: path — contents · **owner** · when to read)

### Index and decisions

- [README.md](README.md) — This index and the docs rules · **all** · first
- [decisions.md](decisions.md) — Dated log of Jack's locked decisions, one line each · **Director (all append)** · before any design or tech change

### Design (docs/design/)

- [design/README.md](design/README.md) — What design/ holds · **Desy** · browsing
- [design/combat-spec.md](design/combat-spec.md) — Source of truth: combat and progression spec v3.9.3 (battle rules, stats, economy, spells summary §6.7, quests §7.11, world graph §12; v3.9.2 realm links, seeds, Feather and content §12.3) · **Desy** · before any combat, balance or progression change
- [design/spells.md](design/spells.md) — Source of truth for spells and v1 board quests: design and sim, v3.7 (no cast caps, no MP regen, boss targets) · **Desy** · when touching spells, MP or bosses
- [design/world-graph.md](design/world-graph.md) — Source of truth for the world: graph design v3.9.3 (nodes, edges, encounters, events, realm links and exits, seed hash with test vectors, Feather, fog, data format, realm 3–9 content files) · **Desy** · before world/map work
- [design/level-json-coverage.md](design/level-json-coverage.md) — Level editor data: coverage checklist of every world, quest and dialogue field against the per-level JSON, quest-state variants (pre/in/post), per-level settings that replace zones (one level = one graph = its own zone) with the zone → level migration map (36 graphs, realm-1 split, bosses, unlocks, quest references, zone-dependent code, encounter re-run), the DB/GitHub source-of-truth split for levels, the one-time migration seed, save/publish, versions and rollback (`level_revisions`), the export endpoint, and questions for Jack · **Desy** · before changing the level JSON schema or the migration
- [design/world-graph-schema-answers.md](design/world-graph-schema-answers.md) — Desy's answers to GameDev's 14 world-graph schema questions · **Desy** · when implementing graph data
- [design/curriculum-notes.md](design/curriculum-notes.md) — Curriculum notes v2: how 1,051 items are levelled and split across realms and locations · **Desy** · when touching vocabulary
- [design/ui-layout-review.md](design/ui-layout-review.md) — UI layout and game-feel review: 1280×720 frame, sizes, battle and map screens (correct repo version with fixed links) · **Desy** · before UI or layout work
- [design/design-memo.md](design/design-memo.md) — Design findings memo: reference games, HSK/YCT, learning design (background, Sep 28) · **Desy** · for background
- [design/plan.md](design/plan.md) — Research summary, plan and early decisions 1–15 (Sep 28; the spec wins where they differ) · **Director** · onboarding

### Story (docs/story/)

- [story/README.md](story/README.md) — What story/ holds · **Desy** · browsing
- [story/story.md](story/story.md) — Story bible v1.1 (v3.9.2 escort wording): premise, cast, arc per realm, event placement, Chinese density, scene/0.2 format · **Desy** · before writing story, scenes or dialogue
- [story/quests.md](story/quests.md) — Quests v2 (v3.9.2 text): 50 NPC/story quests, quest/0.2 schema, §2a escort/words runtime rules, rewards, hooks · **Desy** · before quest work
- [story/characters.md](story/characters.md) — Portrait brief: key cast, named NPCs, 26 generic bases, portrait spec · **Desy / Arty** · when drawing or wiring portraits

### Data: curriculum

- [data/README.md](data/README.md) — What data/ holds, folder by folder, and which tools read it · **Desy** · browsing data
- [data/curriculum/curriculum.csv](data/curriculum/curriculum.csv) — Master word and phrase list, v2 (16 columns, UTF-8 with BOM) · **Desy** · when changing these numbers
- [data/curriculum/curriculum_location_pools.csv](data/curriculum/curriculum_location_pools.csv) — Curriculum items assigned to each location · **Desy** · when changing these numbers
- [data/curriculum/curriculum_locations.csv](data/curriculum/curriculum_locations.csv) — Location list · **Desy** · when changing these numbers
- [data/curriculum/curriculum_realm_summary.csv](data/curriculum/curriculum_realm_summary.csv) — Per-realm totals · **Desy** · when changing these numbers
- [data/curriculum/curriculum_slice.csv](data/curriculum/curriculum_slice.csv) — Prototype slice · **Desy** · when changing these numbers

### Data: enemies

- [data/enemies/boss_hp.csv](data/enemies/boss_hp.csv) — Boss HP multipliers and ATK × 0.8 by tier and boss type (v3.7: location ~15, realm ~20 correct answers; v3.6 values kept as columns) · **Desy** · when changing these numbers
- [data/enemies/enemies-art-roster.csv](data/enemies/enemies-art-roster.csv) — Art-brief roster: visuals, attacks, shouts (same stats as the combat table) · **Desy** · when changing these numbers
- [data/enemies/enemies.csv](data/enemies/enemies.csv) — Combat table: stats, drops, specials. Use this for numbers. · **Desy** · when changing these numbers
- [data/enemies/enemy_stat_bands.csv](data/enemies/enemy_stat_bands.csv) — Enemy stat bands by level and role · **Desy** · when changing these numbers

### Data: spells

- [data/spells/cast_rule.csv](data/spells/cast_rule.csv) — Spell cast rule (v3.6+: no cap, MP only, no regen, no hints) · **Desy** · when changing these numbers
- [data/spells/mp_potions.csv](data/spells/mp_potions.csv) — MP potion values (map only) · **Desy** · when changing these numbers
- [data/spells/spell_falloff.csv](data/spells/spell_falloff.csv) — Spell damage fall-off: reference only, not a game rule · **Desy** · when changing these numbers
- [data/spells/spell_mp_check.csv](data/spells/spell_mp_check.csv) — Spell MP sanity check (v3.5+ costs) · **Desy** · when changing these numbers
- [data/spells/spells.csv](data/spells/spells.csv) — Spell list: towns, prices, power, MP (v3.5+ costs = 1.25 × v3.4; the v3.4 MP is kept in `mp_cost_v34`) · **Desy** · when changing these numbers

### Data: items

- [data/items/chest_contents.csv](data/items/chest_contents.csv) — Treasure chest loot tables (combat-spec table) · **Desy** · when changing these numbers
- [data/items/consumables.csv](data/items/consumables.csv) — Potions and other consumables (combat-spec table) · **Desy** · when changing these numbers
- [data/items/drops.csv](data/items/drops.csv) — Enemy drop tables (combat-spec table) · **Desy** · when changing these numbers
- [data/items/economy_prices.csv](data/items/economy_prices.csv) — Shop prices and gold economy (combat-spec table) · **Desy** · when changing these numbers
- [data/items/gear.csv](data/items/gear.csv) — Weapons and armor by tier (combat-spec table) · **Desy** · when changing these numbers
- [data/items/gear_heroic_drops.csv](data/items/gear_heroic_drops.csv) — Heroic gear drops from bosses and elites (combat-spec table) · **Desy** · when changing these numbers
- [data/items/gear_items.csv](data/items/gear_items.csv) — Game-ready gear catalogue, tiers 1–9: one row per piece (weapon/armor/shield × common/fine/heroic) with ids (`<slot>_t<tier>_<rarity>`, prototype ids for tiers 1–2), stat, shop price, price in G and in battles of gold, source and perk. Every heroic piece has a bilingual name; only the 3 the spec places have a source (realm-boss chests of realms 1 and 3, quest q5_fog_bottle), the other 24 say 'none in the spec'. Derived from gear.csv (§6.2) with no new numbers · **Desy** · when adding gear for realms 3–9 to the game (regenerate after a gear.csv change)

### Data: balance

- [data/balance/companion.csv](data/balance/companion.csv) — Companion stats and behavior (combat-spec table) · **Desy** · when changing these numbers
- [data/balance/hero_stats.csv](data/balance/hero_stats.csv) — Hero stats by level (combat-spec table) · **Desy** · when changing these numbers
- [data/balance/mp_rules.csv](data/balance/mp_rules.csv) — MP rules (max MP, regen, heal limits) (combat-spec table) · **Desy** · when changing these numbers
- [data/balance/practice_modes.csv](data/balance/practice_modes.csv) — Practice mode definitions (combat-spec table) · **Desy** · when changing these numbers
- [data/balance/practice_rewards.csv](data/balance/practice_rewards.csv) — Rewards for practice modes (combat-spec table) · **Desy** · when changing these numbers
- [data/balance/proficiency_patrol_settings.csv](data/balance/proficiency_patrol_settings.csv) — Proficiency patrol settings (combat-spec table) · **Desy** · when changing these numbers
- [data/balance/realm_difficulty.csv](data/balance/realm_difficulty.csv) — Difficulty per realm (combat-spec table) · **Desy** · when changing these numbers
- [data/balance/realm_location_difficulty.csv](data/balance/realm_location_difficulty.csv) — Difficulty per location (combat-spec table) · **Desy** · when changing these numbers
- [data/balance/safety_nets.csv](data/balance/safety_nets.csv) — Safety nets for struggling players (combat-spec table) · **Desy** · when changing these numbers
- [data/balance/skills_mp.csv](data/balance/skills_mp.csv) — Skills and their MP costs (combat-spec table) · **Desy** · when changing these numbers
- [data/balance/special_mechanics.csv](data/balance/special_mechanics.csv) — Special enemy and boss mechanics (combat-spec table) · **Desy** · when changing these numbers

### Data: quests

- [data/quests/quests.csv](data/quests/quests.csv) — Quests v2 as a sheet (one row per quest) · **Desy** · when editing quests (then rebuild)
- [data/quests/quests.json](data/quests/quests.json) — Quests v2 (quest/0.2): 50 NPC and story quests; givers are positions (`entry_town`, `outpost_k`, `village_k`) resolved against the realm graph · **Desy** · when editing quests (then rebuild)
- [data/quests/quests.schema.json](data/quests/quests.schema.json) — JSON Schema for quest/0.2 · **Desy** · when editing quests (then rebuild)
- [data/quests/quests_full.json](data/quests/quests_full.json) — v1 quest rules + list (bundle). Still read by tools/build_data.py for the classic-mode boards · **Desy** · when editing quests (then rebuild)
- [data/quests/quests_v1.csv](data/quests/quests_v1.csv) — v1 town-board quests (36). Superseded in design by quests v2, but still the input for the classic-mode boards (tools/build_data.py) · **Desy** · when editing quests (then rebuild)
- [data/quests/quests_v1.json](data/quests/quests_v1.json) — v1 town-board quests (36). Superseded in design by quests v2, but still the input for the classic-mode boards (tools/build_data.py) · **Desy** · when editing quests (then rebuild)

### Data: dialogue

- [data/dialogue/sc_q1_hoe_offer.json](data/dialogue/sc_q1_hoe_offer.json) — Sample scene (scene/0.2) · **Desy** · when writing scenes
- [data/dialogue/sc_q1_hoe_thanks.json](data/dialogue/sc_q1_hoe_thanks.json) — Sample scene (scene/0.2) · **Desy** · when writing scenes
- [data/dialogue/sc_q9_second_wind_badge.json](data/dialogue/sc_q9_second_wind_badge.json) — q9_second_wind step 2 scene: Granny Bai's old badge, plays at demon_castle_2/treasure_1 (scene/0.2) · **Desy** · when writing scenes
- [data/dialogue/sc_r1_opening.json](data/dialogue/sc_r1_opening.json) — Sample scene (scene/0.2) · **Desy** · when writing scenes
- [data/dialogue/sc_r1_village_banter.json](data/dialogue/sc_r1_village_banter.json) — Sample scene (scene/0.2) · **Desy** · when writing scenes
- [data/dialogue/sc_r7_wind_dragon_truth.json](data/dialogue/sc_r7_wind_dragon_truth.json) — Sample scene (scene/0.2) · **Desy** · when writing scenes
- [data/dialogue/sc_r9_before_demon_king.json](data/dialogue/sc_r9_before_demon_king.json) — Sample scene (scene/0.2) · **Desy** · when writing scenes
- [data/dialogue/scene.schema.json](data/dialogue/scene.schema.json) — JSON Schema for scene/0.2 (extends GameDev scene/0.1) · **Desy** · when writing scenes

### Data: world (v3.9.2)

- [data/world/index.json](data/world/index.json) — Index of every file the loader reads: the graphs (id, kind, realm, dungeon level, file), the rule/zone/quest files, the realm 3–9 content files and the start position · **Desy** · when editing world data (then rebuild)
- [data/world/layout_targets.json](data/world/layout_targets.json) — Size and shape targets per realm (nodes, dead ends, inn distance) · **Desy** · when editing world data (then rebuild)
- [data/world/quests_world.json](data/world/quests_world.json) — Quest hooks placed on the graphs (`offerQuest` targets), quest items and speakers · **Desy** · when editing world data (then rebuild)
- [data/world/world_realm_table.csv](data/world/world_realm_table.csv) — Per-realm table: graph size and shape, towns, inns, dungeons, zones, and sim battles and minutes (beeline, explorer, v3.7) · **Desy** · when editing world data (then rebuild)
- [data/world/world_rules.json](data/world/world_rules.json) — Encounter rate per danger, depth step, safe-edge rules, softeners (walked edges, zone battle budget, pity rolls), walk times, Return Feather destinations (last inn + visited towns and villages) and the seed rule (FNV-1a 32-bit → mulberry32, with test vectors) · **Desy** · when editing world data (then rebuild)
- [data/world/zones.json](data/world/zones.json) — The 20 zones (one per location): word pool, roster, elite, boss, order and unlock rules · **Desy** · when editing world data (then rebuild)
- [data/world/content/realm_3.json](data/world/content/realm_3.json) — Realm 3 content (realm_content/0.1): enemies, zone locations, word pools and items for Crossroads Highway and Night Bazaar. The game fetches it in graph mode (pinyin stripped) · **Desy** · when editing world data (then rebuild)
- [data/world/content/realm_4.json](data/world/content/realm_4.json) — Realm 4 content (realm_content/0.1): enemies, zone locations, word pools and items · **Desy** · when editing world data (then rebuild)
- [data/world/content/realm_5.json](data/world/content/realm_5.json) — Realm 5 content (realm_content/0.1): enemies, zone locations, word pools and items · **Desy** · when editing world data (then rebuild)
- [data/world/content/realm_6.json](data/world/content/realm_6.json) — Realm 6 content (realm_content/0.1): enemies, zone locations, word pools and items · **Desy** · when editing world data (then rebuild)
- [data/world/content/realm_7.json](data/world/content/realm_7.json) — Realm 7 content (realm_content/0.1): enemies, zone locations, word pools and items · **Desy** · when editing world data (then rebuild)
- [data/world/content/realm_8.json](data/world/content/realm_8.json) — Realm 8 content (realm_content/0.1): enemies, zone locations, word pools and items · **Desy** · when editing world data (then rebuild)
- [data/world/content/realm_9.json](data/world/content/realm_9.json) — Realm 9 content (realm_content/0.1): enemies, zone locations, word pools and items · **Desy** · when editing world data (then rebuild)
- [data/world/diagrams/goblin_caves.png](data/world/diagrams/goblin_caves.png) — v3.8 diagram (PNG) · **Desy** · when editing world data (then rebuild)
- [data/world/diagrams/goblin_caves_1.mmd](data/world/diagrams/goblin_caves_1.mmd) — v3.8 diagram (mermaid) · **Desy** · when editing world data (then rebuild)
- [data/world/diagrams/goblin_caves_2.mmd](data/world/diagrams/goblin_caves_2.mmd) — v3.8 diagram (mermaid) · **Desy** · when editing world data (then rebuild)
- [data/world/diagrams/goblin_caves_3.mmd](data/world/diagrams/goblin_caves_3.mmd) — v3.8 diagram (mermaid) · **Desy** · when editing world data (then rebuild)
- [data/world/diagrams/realm_1.mmd](data/world/diagrams/realm_1.mmd) — v3.8 diagram (mermaid) · **Desy** · when editing world data (then rebuild)
- [data/world/diagrams/realm_1.png](data/world/diagrams/realm_1.png) — v3.8 diagram (PNG) · **Desy** · when editing world data (then rebuild)
- [data/world/diagrams/realm_4.mmd](data/world/diagrams/realm_4.mmd) — v3.8 diagram (mermaid) · **Desy** · when editing world data (then rebuild)
- [data/world/diagrams/realm_8.png](data/world/diagrams/realm_8.png) — v3.8 diagram (PNG) · **Desy** · when editing world data (then rebuild)
- [data/world/examples/progress_example.json](data/world/examples/progress_example.json) — v3.9 progress example (checked by the validator) · **Desy** · when editing world data (then rebuild)
- [data/world/graphs/bazaar_cellars_1.json](data/world/graphs/bazaar_cellars_1.json) — v3.9.2 graph (graph/0.3), generated reference layout · **Desy** · when editing world data (then rebuild)
- [data/world/graphs/beast_pens_1.json](data/world/graphs/beast_pens_1.json) — v3.9.2 graph (graph/0.3), generated reference layout · **Desy** · when editing world data (then rebuild)
- [data/world/graphs/beast_pens_2.json](data/world/graphs/beast_pens_2.json) — v3.9.2 graph (graph/0.3), generated reference layout · **Desy** · when editing world data (then rebuild)
- [data/world/graphs/cloud_caves_1.json](data/world/graphs/cloud_caves_1.json) — v3.9.2 graph (graph/0.3), generated reference layout · **Desy** · when editing world data (then rebuild)
- [data/world/graphs/demon_castle_1.json](data/world/graphs/demon_castle_1.json) — v3.9.2 graph (graph/0.3), generated reference layout · **Desy** · when editing world data (then rebuild)
- [data/world/graphs/demon_castle_2.json](data/world/graphs/demon_castle_2.json) — v3.9.2 graph (graph/0.3), generated reference layout · **Desy** · when editing world data (then rebuild)
- [data/world/graphs/demon_castle_3.json](data/world/graphs/demon_castle_3.json) — v3.9.2 graph (graph/0.3), generated reference layout · **Desy** · when editing world data (then rebuild)
- [data/world/graphs/demon_castle_4.json](data/world/graphs/demon_castle_4.json) — v3.9.2 graph (graph/0.3), generated reference layout · **Desy** · when editing world data (then rebuild)
- [data/world/graphs/demon_castle_5.json](data/world/graphs/demon_castle_5.json) — v3.9.2 graph (graph/0.3), generated reference layout · **Desy** · when editing world data (then rebuild)
- [data/world/graphs/goblin_caves_1.json](data/world/graphs/goblin_caves_1.json) — v3.9.2 graph (graph/0.3), generated reference layout · **Desy** · when editing world data (then rebuild)
- [data/world/graphs/goblin_caves_2.json](data/world/graphs/goblin_caves_2.json) — v3.9.2 graph (graph/0.3), generated reference layout · **Desy** · when editing world data (then rebuild)
- [data/world/graphs/goblin_caves_3.json](data/world/graphs/goblin_caves_3.json) — v3.9.2 graph (graph/0.3), generated reference layout · **Desy** · when editing world data (then rebuild)
- [data/world/graphs/great_hive_1.json](data/world/graphs/great_hive_1.json) — v3.9.2 graph (graph/0.3), generated reference layout · **Desy** · when editing world data (then rebuild)
- [data/world/graphs/griffin_spire_1.json](data/world/graphs/griffin_spire_1.json) — v3.9.2 graph (graph/0.3), generated reference layout · **Desy** · when editing world data (then rebuild)
- [data/world/graphs/griffin_spire_2.json](data/world/graphs/griffin_spire_2.json) — v3.9.2 graph (graph/0.3), generated reference layout · **Desy** · when editing world data (then rebuild)
- [data/world/graphs/griffin_spire_3.json](data/world/graphs/griffin_spire_3.json) — v3.9.2 graph (graph/0.3), generated reference layout · **Desy** · when editing world data (then rebuild)
- [data/world/graphs/hydra_lair_1.json](data/world/graphs/hydra_lair_1.json) — v3.9.2 graph (graph/0.3), generated reference layout · **Desy** · when editing world data (then rebuild)
- [data/world/graphs/hydra_lair_2.json](data/world/graphs/hydra_lair_2.json) — v3.9.2 graph (graph/0.3), generated reference layout · **Desy** · when editing world data (then rebuild)
- [data/world/graphs/moonlit_crypt_1.json](data/world/graphs/moonlit_crypt_1.json) — v3.9.2 graph (graph/0.3), generated reference layout · **Desy** · when editing world data (then rebuild)
- [data/world/graphs/moonlit_crypt_2.json](data/world/graphs/moonlit_crypt_2.json) — v3.9.2 graph (graph/0.3), generated reference layout · **Desy** · when editing world data (then rebuild)
- [data/world/graphs/old_mine_1.json](data/world/graphs/old_mine_1.json) — v3.9.2 graph (graph/0.3), generated reference layout · **Desy** · when editing world data (then rebuild)
- [data/world/graphs/realm_1.json](data/world/graphs/realm_1.json) — v3.8 graph (graph/0.3), authored · **Desy** · when editing world data (then rebuild)
- [data/world/graphs/realm_2.json](data/world/graphs/realm_2.json) — v3.9.2 graph (graph/0.3), generated reference layout · **Desy** · when editing world data (then rebuild)
- [data/world/graphs/realm_3.json](data/world/graphs/realm_3.json) — v3.9.2 graph (graph/0.3), generated reference layout · **Desy** · when editing world data (then rebuild)
- [data/world/graphs/realm_4.json](data/world/graphs/realm_4.json) — v3.9.2 graph (graph/0.3), generated reference layout · **Desy** · when editing world data (then rebuild)
- [data/world/graphs/realm_5.json](data/world/graphs/realm_5.json) — v3.9.2 graph (graph/0.3), generated reference layout · **Desy** · when editing world data (then rebuild)
- [data/world/graphs/realm_6.json](data/world/graphs/realm_6.json) — v3.9.2 graph (graph/0.3), generated reference layout · **Desy** · when editing world data (then rebuild)
- [data/world/graphs/realm_7.json](data/world/graphs/realm_7.json) — v3.9.2 graph (graph/0.3), generated reference layout · **Desy** · when editing world data (then rebuild)
- [data/world/graphs/realm_8.json](data/world/graphs/realm_8.json) — v3.9.2 graph (graph/0.3), generated reference layout · **Desy** · when editing world data (then rebuild)
- [data/world/graphs/realm_9.json](data/world/graphs/realm_9.json) — v3.9.2 graph (graph/0.3), generated reference layout · **Desy** · when editing world data (then rebuild)
- [data/world/graphs/shadow_vault_1.json](data/world/graphs/shadow_vault_1.json) — v3.9.2 graph (graph/0.3), generated reference layout · **Desy** · when editing world data (then rebuild)
- [data/world/graphs/shadow_vault_2.json](data/world/graphs/shadow_vault_2.json) — v3.9.2 graph (graph/0.3), generated reference layout · **Desy** · when editing world data (then rebuild)
- [data/world/graphs/undercroft_1.json](data/world/graphs/undercroft_1.json) — v3.9.2 graph (graph/0.3), generated reference layout · **Desy** · when editing world data (then rebuild)
- [data/world/graphs/undercroft_2.json](data/world/graphs/undercroft_2.json) — v3.9.2 graph (graph/0.3), generated reference layout · **Desy** · when editing world data (then rebuild)
- [data/world/graphs/undercroft_3.json](data/world/graphs/undercroft_3.json) — v3.9.2 graph (graph/0.3), generated reference layout · **Desy** · when editing world data (then rebuild)
- [data/world/graphs/world.json](data/world/graphs/world.json) — v3.9.2 graph (graph/0.3), authored; realms[] links and unlock conditions · **Desy** · when editing world data (then rebuild)
- [data/world/schemas/common.schema.json](data/world/schemas/common.schema.json) — v3.9.2 JSON Schema (2020-12) · **Desy** · when editing world data (then rebuild)
- [data/world/schemas/graph.schema.json](data/world/schemas/graph.schema.json) — v3.9.2 JSON Schema (2020-12) · **Desy** · when editing world data (then rebuild)
- [data/world/schemas/index.schema.json](data/world/schemas/index.schema.json) — v3.9.2 JSON Schema (2020-12) · **Desy** · when editing world data (then rebuild)
- [data/world/schemas/progress.schema.json](data/world/schemas/progress.schema.json) — v3.9.2 player progress schema (progress/0.3: fog bitsets, lastInn, visitedTowns = towns and villages, feathers) · **Desy** · when editing world data (then rebuild)
- [data/world/schemas/quests_world.schema.json](data/world/schemas/quests_world.schema.json) — v3.9.2 JSON Schema (2020-12) · **Desy** · when editing world data (then rebuild)
- [data/world/schemas/realm_content.schema.json](data/world/schemas/realm_content.schema.json) — v3.9.2 JSON Schema for the realm content files (realm_content/0.1) · **Desy** · when editing world data (then rebuild)
- [data/world/schemas/world_rules.schema.json](data/world/schemas/world_rules.schema.json) — v3.9.2 JSON Schema (2020-12) · **Desy** · when editing world data (then rebuild)
- [data/world/schemas/zones.schema.json](data/world/schemas/zones.schema.json) — v3.9.2 JSON Schema (2020-12) · **Desy** · when editing world data (then rebuild)

### Data: sim output

- [data/sim/combat_sim_out.txt](data/sim/combat_sim_out.txt) — Full sim text output, v3.7 (optional) · **Desy** · when checking balance numbers
- [data/sim/sim_companion.csv](data/sim/sim_companion.csv) — Sim output table · **Desy** · when checking balance numbers
- [data/sim/sim_companion_variants.csv](data/sim/sim_companion_variants.csv) — Sim output table · **Desy** · when checking balance numbers
- [data/sim/sim_economy.csv](data/sim/sim_economy.csv) — Sim output table · **Desy** · when checking balance numbers
- [data/sim/sim_elites.csv](data/sim/sim_elites.csv) — Sim output table · **Desy** · when checking balance numbers
- [data/sim/sim_elites_2.csv](data/sim/sim_elites_2.csv) — Sim output table · **Desy** · when checking balance numbers
- [data/sim/sim_mp.csv](data/sim/sim_mp.csv) — Sim output table · **Desy** · when checking balance numbers
- [data/sim/sim_patrols_minutes.csv](data/sim/sim_patrols_minutes.csv) — Sim output table · **Desy** · when checking balance numbers
- [data/sim/sim_realms.csv](data/sim/sim_realms.csv) — Sim output table · **Desy** · when checking balance numbers
- [data/sim/sim_specials.csv](data/sim/sim_specials.csv) — Sim output table (rerun with v3.7 boss stats) · **Desy** · when checking balance numbers
- [data/sim/sim_spells_boss_fights_by_realm.csv](data/sim/sim_spells_boss_fights_by_realm.csv) — Sim output table · **Desy** · when checking balance numbers
- [data/sim/sim_spells_boss_target_check_correct_answers_to_win.csv](data/sim/sim_spells_boss_target_check_correct_answers_to_win.csv) — Sim output table (v3.7) · **Desy** · when checking balance numbers
- [data/sim/sim_spells_does_saving_mp_pay_off.csv](data/sim/sim_spells_does_saving_mp_pay_off.csv) — Sim output table (v3.7) · **Desy** · when checking balance numbers
- [data/sim/sim_spells_gold_and_mp_timeline.csv](data/sim/sim_spells_gold_and_mp_timeline.csv) — Sim output table · **Desy** · when checking balance numbers
- [data/sim/sim_spells_per_realm_50_saver.csv](data/sim/sim_spells_per_realm_50_saver.csv) — Sim output table · **Desy** · when checking balance numbers
- [data/sim/sim_spells_per_realm_65_saver.csv](data/sim/sim_spells_per_realm_65_saver.csv) — Sim output table · **Desy** · when checking balance numbers
- [data/sim/sim_spells_per_realm_75_saver.csv](data/sim/sim_spells_per_realm_75_saver.csv) — Sim output table · **Desy** · when checking balance numbers
- [data/sim/sim_spells_per_realm_75_spender.csv](data/sim/sim_spells_per_realm_75_spender.csv) — Sim output table · **Desy** · when checking balance numbers
- [data/sim/sim_spells_per_realm_90_saver.csv](data/sim/sim_spells_per_realm_90_saver.csv) — Sim output table · **Desy** · when checking balance numbers
- [data/sim/sim_spells_question_share_cast_share_hours_and_defe.csv](data/sim/sim_spells_question_share_cast_share_hours_and_defe.csv) — Sim output table (v3.7 vs v3.6; replaces sim_spells_question_share_and_cast_share_v3_5_vs_v3.csv) · **Desy** · when checking balance numbers
- [data/sim/sim_spells_spell_price_in_effort.csv](data/sim/sim_spells_spell_price_in_effort.csv) — Sim output table · **Desy** · when checking balance numbers
- [data/sim/sim_spells_spell_timeline_50_saver.csv](data/sim/sim_spells_spell_timeline_50_saver.csv) — Sim output table · **Desy** · when checking balance numbers
- [data/sim/sim_spells_spell_timeline_65_saver.csv](data/sim/sim_spells_spell_timeline_65_saver.csv) — Sim output table · **Desy** · when checking balance numbers
- [data/sim/sim_spells_spell_timeline_75_saver.csv](data/sim/sim_spells_spell_timeline_75_saver.csv) — Sim output table · **Desy** · when checking balance numbers
- [data/sim/sim_spells_spell_timeline_75_spender.csv](data/sim/sim_spells_spell_timeline_75_spender.csv) — Sim output table · **Desy** · when checking balance numbers
- [data/sim/sim_spells_spell_timeline_90_saver.csv](data/sim/sim_spells_spell_timeline_90_saver.csv) — Sim output table · **Desy** · when checking balance numbers
- [data/sim/sim_spells_whole_campaign.csv](data/sim/sim_spells_whole_campaign.csv) — Sim output table · **Desy** · when checking balance numbers
- [data/sim/sim_spoken_cap.csv](data/sim/sim_spoken_cap.csv) — Sim output table · **Desy** · when checking balance numbers
- [data/sim/sim_trigger_tuning.csv](data/sim/sim_trigger_tuning.csv) — Sim output table · **Desy** · when checking balance numbers
- [data/sim/sim_world_v38.csv](data/sim/sim_world_v38.csv) — v3.8 sim (kept for the v3.8 → v3.9 comparison) · **Desy** · when checking balance numbers
- [data/sim/sim_world_v39.csv](data/sim/sim_world_v39.csv) — v3.9 sim: v3.7 loop vs beeline vs explorer (no warp, Feathers bought) · **Desy** · when checking balance numbers
- [data/sim/sim_world_v391.csv](data/sim/sim_world_v391.csv) — v3.9.1 sim (current): realm-boss Feathers, density ramp · **Desy** · when checking balance numbers

### Data: JSON twins and bundles

- [data/json/boss_hp.json](data/json/boss_hp.json) — JSON twin of the CSV (v3.7) · **Desy** · read by tools/build_data.py; regenerate with the CSV
- [data/json/cast_rule.json](data/json/cast_rule.json) — JSON twin of the CSV · **Desy** · read by tools/build_data.py; regenerate with the CSV
- [data/json/chest_contents.json](data/json/chest_contents.json) — JSON twin of the CSV · **Desy** · read by tools/build_data.py; regenerate with the CSV
- [data/json/combat_data.json](data/json/combat_data.json) — Bundle of all spec tables (each also a CSV) · **Desy** · read by tools/build_data.py; regenerate with the CSV
- [data/json/companion.json](data/json/companion.json) — JSON twin of the CSV · **Desy** · read by tools/build_data.py; regenerate with the CSV
- [data/json/consumables.json](data/json/consumables.json) — JSON twin of the CSV · **Desy** · read by tools/build_data.py; regenerate with the CSV
- [data/json/drops.json](data/json/drops.json) — JSON twin of the CSV · **Desy** · read by tools/build_data.py; regenerate with the CSV
- [data/json/economy_prices.json](data/json/economy_prices.json) — JSON twin of the CSV · **Desy** · read by tools/build_data.py; regenerate with the CSV
- [data/json/enemies-art-roster.json](data/json/enemies-art-roster.json) — JSON twin of enemies/enemies-art-roster.csv (flavor text read by tools/build_data.py) · **Desy** · read by tools/build_data.py; regenerate with the CSV
- [data/json/enemies.json](data/json/enemies.json) — JSON twin of the CSV · **Desy** · read by tools/build_data.py; regenerate with the CSV
- [data/json/enemy_stat_bands.json](data/json/enemy_stat_bands.json) — JSON twin of the CSV · **Desy** · read by tools/build_data.py; regenerate with the CSV
- [data/json/gear.json](data/json/gear.json) — JSON twin of the CSV · **Desy** · read by tools/build_data.py; regenerate with the CSV
- [data/json/gear_heroic_drops.json](data/json/gear_heroic_drops.json) — JSON twin of the CSV · **Desy** · read by tools/build_data.py; regenerate with the CSV
- [data/json/hero_stats.json](data/json/hero_stats.json) — JSON twin of the CSV · **Desy** · read by tools/build_data.py; regenerate with the CSV
- [data/json/mp_potions.json](data/json/mp_potions.json) — JSON twin of the CSV · **Desy** · read by tools/build_data.py; regenerate with the CSV
- [data/json/mp_rules.json](data/json/mp_rules.json) — JSON twin of the CSV · **Desy** · read by tools/build_data.py; regenerate with the CSV
- [data/json/practice_modes.json](data/json/practice_modes.json) — JSON twin of the CSV · **Desy** · read by tools/build_data.py; regenerate with the CSV
- [data/json/practice_rewards.json](data/json/practice_rewards.json) — JSON twin of the CSV · **Desy** · read by tools/build_data.py; regenerate with the CSV
- [data/json/proficiency_patrol_settings.json](data/json/proficiency_patrol_settings.json) — JSON twin of the CSV · **Desy** · read by tools/build_data.py; regenerate with the CSV
- [data/json/realm_difficulty.json](data/json/realm_difficulty.json) — JSON twin of the CSV · **Desy** · read by tools/build_data.py; regenerate with the CSV
- [data/json/realm_location_difficulty.json](data/json/realm_location_difficulty.json) — JSON twin of the CSV · **Desy** · read by tools/build_data.py; regenerate with the CSV
- [data/json/safety_nets.json](data/json/safety_nets.json) — JSON twin of the CSV · **Desy** · read by tools/build_data.py; regenerate with the CSV
- [data/json/skills_mp.json](data/json/skills_mp.json) — JSON twin of the CSV · **Desy** · read by tools/build_data.py; regenerate with the CSV
- [data/json/special_mechanics.json](data/json/special_mechanics.json) — JSON twin of the CSV · **Desy** · read by tools/build_data.py; regenerate with the CSV
- [data/json/spell_falloff.json](data/json/spell_falloff.json) — JSON twin of the CSV · **Desy** · read by tools/build_data.py; regenerate with the CSV
- [data/json/spell_mp_check.json](data/json/spell_mp_check.json) — JSON twin of the CSV · **Desy** · read by tools/build_data.py; regenerate with the CSV
- [data/json/spells.json](data/json/spells.json) — JSON twin of the CSV · **Desy** · read by tools/build_data.py; regenerate with the CSV
- [data/json/spells_full.json](data/json/spells_full.json) — Spell rules + tiers + list (rules are also in spells.md / §6.7) · **Desy** · read by tools/build_data.py; regenerate with the CSV

### Art and audio (docs/art/)

- [art/README.md](art/README.md) — What art/ holds · **Arty** · browsing
- [art/enemies-art-brief.md](art/enemies-art-brief.md) — Enemy roster (50) and art/animation brief · **Desy / Arty** · when drawing enemies
- [art/art-direction-memo.md](art/art-direction-memo.md) — Art direction findings: reference styles, what appeals to 10–12-year-olds, sourcing · **Arty** · before new art
- [art/ai-art-pipeline-proposal.md](art/ai-art-pipeline-proposal.md) — AI art and audio pipeline proposal into Phaser · **Arty** · when changing the art pipeline
- [art/asset-hooks.md](art/asset-hooks.md) — Where delivered backgrounds, SFX, music, spell art and word audio go, and how the game picks them up (was ASSETS.md) · **GameDev / Arty** · when delivering assets
- [art/audio.md](art/audio.md) — Arty's audio pack README: SFX, music loops and stings, sources, licences · **Arty** · when adding audio
- [art/arty/sprites.md](art/arty/sprites.md) — Arty's battle sprites README (batch 1 sheets, manifest) · **Arty** · when adding sprites
- [art/arty/xiaolong_battle.md](art/arty/xiaolong_battle.md) — Xiaolong battle sprites: 小龙 companion idle/cheer/attack/hurt strips, 256x256 frames, anchor bottom-centre, facing right · **Arty** · when changing the battle companion
- [art/arty/spells.md](art/arty/spells.md) — Arty's spell art README: icons, fx textures, recipes · **Arty** · when adding spell art
- [art/arty/portraits.md](art/arty/portraits.md) — Arty's dialogue portraits README · **Arty** · when adding portraits
- [art/arty/backgrounds.md](art/arty/backgrounds.md) — Arty's backgrounds README (realms 1–2) · **Arty** · when adding backgrounds
- [art/arty/ui.md](art/arty/ui.md) — Arty's dialogue UI README (panel, nameplate, arrow) · **Arty** · when changing dialogue UI art
- [art/arty/batch1-prompts.md](art/arty/batch1-prompts.md) — Arty's batch 1 image prompts and references · **Arty** · when regenerating batch 1 art
- [art/refsheets/REJECTED_rabbit_as_buddy.png](art/refsheets/REJECTED_rabbit_as_buddy.png) — Rejected: rabbit drawn as a cute buddy (it must look like a pest monster) · **Arty** · for art reference
- [art/refsheets/hero_v1.png](art/refsheets/hero_v1.png) — Hero reference sheet v1 · **Arty** · for art reference
- [art/refsheets/horned_rabbit_enemy_v1.png](art/refsheets/horned_rabbit_enemy_v1.png) — Horned Rabbit enemy reference sheet v1 · **Arty** · for art reference
- [art/style-anchors/APPROVED_style_bright_detailed_battle.png](art/style-anchors/APPROVED_style_bright_detailed_battle.png) — Approved style (bright, detailed battle scene) · **Arty** · for art reference
- [art/style-anchors/anchor_A_bright_classic.png](art/style-anchors/anchor_A_bright_classic.png) — Style option A: bright classic · **Arty** · for art reference
- [art/style-anchors/anchor_B_storybook_inkwash.png](art/style-anchors/anchor_B_storybook_inkwash.png) — Style option B: storybook ink-wash · **Arty** · for art reference
- [art/style-anchors/anchor_C_bold_graphic.png](art/style-anchors/anchor_C_bold_graphic.png) — Style option C: bold graphic · **Arty** · for art reference
- [art/style-anchors/battle_mockup_meadow.png](art/style-anchors/battle_mockup_meadow.png) — Meadow battle mockup · **Arty** · for art reference
- [art/style-anchors/hybrid_A_inkwash_Cmenace_battle.png](art/style-anchors/hybrid_A_inkwash_Cmenace_battle.png) — Hybrid: ink-wash with option C menace · **Arty** · for art reference
- [art/ui-review/battle-command.png](art/ui-review/battle-command.png) — Mockup A: battle, command state · **Desy** · with ui-layout-review.md
- [art/ui-review/battle-feedback.png](art/ui-review/battle-feedback.png) — Mockup D: answer feedback and the hit · **Desy** · with ui-layout-review.md
- [art/ui-review/battle-question-mc.png](art/ui-review/battle-question-mc.png) — Mockup B: question open (multiple choice) · **Desy** · with ui-layout-review.md
- [art/ui-review/battle-question-speech.png](art/ui-review/battle-question-speech.png) — Mockup C: defense question, speech mode · **Desy** · with ui-layout-review.md
- [art/ui-review/diagnosis.png](art/ui-review/diagnosis.png) — Annotated diagnosis of the old battle screen · **Desy** · with ui-layout-review.md
- [art/ui-review/map.png](art/ui-review/map.png) — Mockup E: location map · **Desy** · with ui-layout-review.md
- [art/ui-review/scaling.png](art/ui-review/scaling.png) — Scaling and letterboxing across devices · **Desy** · with ui-layout-review.md
- [art/ui-review/src/battle-command.html](art/ui-review/src/battle-command.html) — HTML/CSS mock source for the PNGs · **Desy** · with ui-layout-review.md
- [art/ui-review/src/battle-feedback.html](art/ui-review/src/battle-feedback.html) — HTML/CSS mock source for the PNGs · **Desy** · with ui-layout-review.md
- [art/ui-review/src/battle-question-mc.html](art/ui-review/src/battle-question-mc.html) — HTML/CSS mock source for the PNGs · **Desy** · with ui-layout-review.md
- [art/ui-review/src/battle-question-speech.html](art/ui-review/src/battle-question-speech.html) — HTML/CSS mock source for the PNGs · **Desy** · with ui-layout-review.md
- [art/ui-review/src/diagnosis.html](art/ui-review/src/diagnosis.html) — HTML/CSS mock source for the PNGs · **Desy** · with ui-layout-review.md
- [art/ui-review/src/map.html](art/ui-review/src/map.html) — HTML/CSS mock source for the PNGs · **Desy** · with ui-layout-review.md
- [art/ui-review/src/mock.css](art/ui-review/src/mock.css) — HTML/CSS mock source for the PNGs · **Desy** · with ui-layout-review.md
- [art/ui-review/src/mock.js](art/ui-review/src/mock.js) — HTML/CSS mock source for the PNGs · **Desy** · with ui-layout-review.md
- [art/ui-review/src/render.mjs](art/ui-review/src/render.mjs) — HTML/CSS mock source for the PNGs · **Desy** · with ui-layout-review.md
- [art/ui-review/src/scaling.html](art/ui-review/src/scaling.html) — HTML/CSS mock source for the PNGs · **Desy** · with ui-layout-review.md
- [art/ui-review/src/village.html](art/ui-review/src/village.html) — HTML/CSS mock source for the PNGs · **Desy** · with ui-layout-review.md
- [art/ui-review/village.png](art/ui-review/village.png) — Mockup F: village hub and world map · **Desy** · with ui-layout-review.md

### Tech (docs/tech/)

- [tech/README.md](tech/README.md) — What tech/ holds · **GameDev** · browsing
- [tech/architecture.md](tech/architecture.md) — Approved architecture: accounts, cloud saves, COPPA, $0 hosting (Vercel + Neon + Auth.js), graph world, decision log D1–D18 · **GameDev** · before backend, save or hosting work
- [tech/api.md](tech/api.md) — As-built note for the accounts and cloud-save API (/api/v1, Auth.js, DAL, migrations, client outbox), how to test it, and its deviations from architecture.md · **GameDev** · before backend or cloud-save work
- [tech/api.md#account-screens-client](tech/api.md#account-screens-client) — Account screens (accounts build only, `VITE_CLOUD_SAVE=1`): launch, Google sign-in, consent, parent PIN, parent area, "Who's playing?", guest-save import, offline banner; `npm run build:cloud` + `npm run test:account` · **GameDev** · before UI work on accounts
- [tech/level-editor.md](tech/level-editor.md) — **Proposed (pending Jack):** design doc for the `/editor` level and script editor: the factual answer on what guests see on Vercel, the `level/0.1` schema (one level = one graph = its own zone, settings block, quest-state variants, scenes), DB tables, editor auth, React Flow in a separate bundle, save/validate/publish/rollback, the runtime load path, migration, DB-live + GameDev repo export to `docs/data/levels/`, rollout, and questions for Jack and Desy · **GameDev** · before any editor, level-loading or level-data work
- [tech/deploy.md](tech/deploy.md) — How deploy works: GitHub Pages workflow, build:ci, validate:world, asset sync, tests · **GameDev** · before pushing to main
- [tech/research-tech-market.md](tech/research-tech-market.md) — Technology, market and compliance research (engines, speech, COPPA) · **GameDev** · for background

### Design tools (docs/tech/tools/)

- [tech/tools/desy_paths.json](tech/tools/desy_paths.json) — Map from Desy's /workspace/desy paths to repo paths (used by the story tools) · **Desy** · when a doc or table moves
- [tech/tools/sync_check.py](tech/tools/sync_check.py) — Manifest sync check plus the world validator · **Desy** · when re-running Desy's sims or generators
- [tech/tools/story/_paths.py](tech/tools/story/_paths.py) — Path resolver: runs the story tools on the repo layout (DESY_ROOT=… for Desy's tree) · **Desy** · when rebuilding quests/scenes
- [tech/tools/world/sim/world_summary.json](tech/tools/world/sim/world_summary.json) — v3.9.1 main world sim output (100 runs per profile) · **Desy** · when re-running the world sim
- [tech/tools/data/assemble_spec.py](tech/tools/data/assemble_spec.py) — Assembles combat-spec.md · **Desy** · when re-running Desy's sims or generators
- [tech/tools/data/build_data.py](tech/tools/data/build_data.py) — Generates the data CSV/JSON tables · **Desy** · when re-running Desy's sims or generators
- [tech/tools/data/make_gear_items.py](tech/tools/data/make_gear_items.py) — Writes data/items/gear_items.csv from gear.csv, economy_prices.csv and realm_difficulty.csv (run from the repo root) · **Desy** · after a gear or price change
- [tech/tools/data/spec_new_sections.md](tech/tools/data/spec_new_sections.md) — Spec source sections · **Desy** · when re-running Desy's sims or generators
- [tech/tools/data/spells_data.py](tech/tools/data/spells_data.py) — Spell and quest source data and design formulas · **Desy** · when re-running Desy's sims or generators
- [tech/tools/data/spells_md_template.md](tech/tools/data/spells_md_template.md) — spells.md template · **Desy** · when re-running Desy's sims or generators
- [tech/tools/data/write_html.py](tech/tools/data/write_html.py) — Renders combat-spec-v3.html from combat-spec.md · **Desy** · when re-running Desy's sims or generators
- [tech/tools/data/write_spells_md.py](tech/tools/data/write_spells_md.py) — Generates spells.md · **Desy** · when re-running Desy's sims or generators
- [tech/tools/sim/atk_check.py](tech/tools/sim/atk_check.py) — v3.6 boss ATK multiplier check · **Desy** · when re-running Desy's sims or generators
- [tech/tools/sim/boss_harness.py](tech/tools/sim/boss_harness.py) — v3.6 single boss fight harness (full MP, 2 strongest spells) · **Desy** · when re-running Desy's sims or generators
- [tech/tools/sim/boss_tune.py](tech/tools/sim/boss_tune.py) — Boss HP multiplier tuning (v3.6, plus the v3.7 location retune) · **Desy** · when re-running Desy's sims or generators
- [tech/tools/sim/boss_tune_v37_loc.json](tech/tools/sim/boss_tune_v37_loc.json) — v3.7 location boss HP tuning output (~15 correct answers) · **Desy** · when re-running Desy's sims or generators
- [tech/tools/sim/combat_sim.py](tech/tools/sim/combat_sim.py) — Battle sim · **Desy** · when re-running Desy's sims or generators
- [tech/tools/sim/regen_only.py](tech/tools/sim/regen_only.py) — v3.6 check: removing MP regen alone · **Desy** · when re-running Desy's sims or generators
- [tech/tools/sim/sim_v3_runner.py](tech/tools/sim/sim_v3_runner.py) — v3 sim runner · **Desy** · when re-running Desy's sims or generators
- [tech/tools/sim/spells_runner.py](tech/tools/sim/spells_runner.py) — Campaign runner, v3.7 · **Desy** · when re-running Desy's sims or generators
- [tech/tools/sim/spells_sim.py](tech/tools/sim/spells_sim.py) — Campaign sim (spells and quests) · **Desy** · when re-running Desy's sims or generators
- [tech/tools/sim/v37_boss_check_0.5.json](tech/tools/sim/v37_boss_check_0.5.json) — v3.7 boss check output at 50 / 75 / 90 % accuracy · **Desy** · when re-running Desy's sims or generators
- [tech/tools/sim/v37_boss_check_0.75.json](tech/tools/sim/v37_boss_check_0.75.json) — Boss check output (read by build_data.py for boss_hp) · **Desy** · when re-running Desy's sims or generators
- [tech/tools/sim/v37_boss_check_0.9.json](tech/tools/sim/v37_boss_check_0.9.json) — Boss check output · **Desy** · when re-running Desy's sims or generators
- [tech/tools/story/build_quests.py](tech/tools/story/build_quests.py) — Builds and checks data/quests/quests.json and .csv (positions, hooks, words) · **Desy** · when rebuilding quests/scenes
- [tech/tools/story/make_dialogue.py](tech/tools/story/make_dialogue.py) — Writes the data/dialogue scenes · **Desy** · when rebuilding quests/scenes
- [tech/tools/story/quests_def.py](tech/tools/story/quests_def.py) — The 50 quest definitions · **Desy** · when rebuilding quests/scenes
- [tech/tools/story/validate_dialogue.py](tech/tools/story/validate_dialogue.py) — Checks the scenes: schema, word tokens, met-word rule, density, gotos · **Desy** · when rebuilding quests/scenes
- [tech/tools/world/build_world_sim.py](tech/tools/world/build_world_sim.py) — Builds world_sim.py from spells_sim.py plus the loop · **Desy** · when re-running Desy's sims or generators
- [tech/tools/world/doc/spec12.md](tech/tools/world/doc/spec12.md) — The text of combat-spec §12 · **Desy** · when re-running Desy's sims or generators
- [tech/tools/world/doc/world-graph.src.md](tech/tools/world/doc/world-graph.src.md) — world-graph.md source with placeholders (its image links resolve only in the built doc in design/) · **Desy** · when re-running Desy's sims or generators
- [tech/tools/world/_paths.py](tech/tools/world/_paths.py) — Repo paths for the world tools (inputs in docs/ and src/data, output docs/data/world; `WORLD_OUT`, `DESY_ROOT`, `ART_SPRITES` overrides) · **Desy** · when re-running Desy's sims or generators, or moving data files
- [tech/tools/world/make_realm_content.py](tech/tools/world/make_realm_content.py) — Writes the realm 3–9 content files (data/world/content/realm_N.json) from combat_data, boss_hp, the curriculum pools and zones.json; world_gen.py runs it · **Desy** · when re-running Desy's generators or changing realm 3–9 enemies, pools or locations
- [tech/tools/world/make_schemas.py](tech/tools/world/make_schemas.py) — Writes the JSON Schemas in data/world/schemas (v3.9.2, incl. realm_content) · **Desy** · when re-running Desy's sims or generators
- [tech/tools/world/make_world_data.py](tech/tools/world/make_world_data.py) — Hand-authored data: realm 1, the world map, rules, zones and quest hooks · **Desy** · when re-running Desy's sims or generators
- [tech/tools/world/render_world.py](tech/tools/world/render_world.py) — Draws the diagrams (PNG and mermaid) · **Desy** · when re-running Desy's sims or generators
- [tech/tools/world/sim/world_summary_v38.json](tech/tools/world/sim/world_summary_v38.json) — v3.8 main sim output (baseline for v3.9 tables) · **Desy** · when re-running Desy's sims or generators
- [tech/tools/world/sim/world_summary_v39.json](tech/tools/world/sim/world_summary_v39.json) — v3.9 main sim output (baseline for the v3.9.1 table) · **Desy** · when re-running Desy's sims or generators
- [tech/tools/world/tables.py](tech/tools/world/tables.py) — Writes the tables for world-graph.md and the CSVs · **Desy** · when re-running Desy's sims or generators
- [tech/tools/world/v03.py](tech/tools/world/v03.py) — Converts the internal format to `graph/0.3` · **Desy** · when re-running Desy's sims or generators
- [tech/tools/world/validate_world.py](tech/tools/world/validate_world.py) — World data validator: wrapper for the CI copy tools/world/validate_world.py (v3.9.2 checks) · **Desy** · when re-running Desy's sims or generators
- [tech/tools/world/world_gen.py](tech/tools/world/world_gen.py) — Generates the reference realms 2–9, zones, world.json realms[], exit edges and the index, then the realm 3–9 content files · **Desy** · when re-running Desy's sims or generators
- [tech/tools/world/world_graph.py](tech/tools/world/world_graph.py) — Loader (a realm is an overworld plus its dungeon levels) · **Desy** · when re-running Desy's sims or generators
- [tech/tools/world/world_loop.py.txt](tech/tools/world/world_loop.py.txt) — The sim's graph loop, spliced into world_sim.py · **Desy** · when re-running Desy's sims or generators
- [tech/tools/world/world_runner.py](tech/tools/world/world_runner.py) — v3.8 sim runner (main run and sweep) · **Desy** · when re-running Desy's sims or generators
- [tech/tools/world/write_world_doc.py](tech/tools/world/write_world_doc.py) — Builds world-graph.md from the source below · **Desy** · when re-running Desy's sims or generators
