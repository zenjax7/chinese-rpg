# data/

Every design table, as CSV (UTF-8; some with a BOM for Excel), plus JSON where the data is structured (world graphs, quests, dialogue, schemas). Owner: Desy, except where [../README.md](../README.md) says otherwise.

| folder | contents |
|---|---|
| [curriculum/](curriculum/) | Word list (1,051 items) and its per-location pools, locations, realm summary, slice |
| [enemies/](enemies/) | Enemy combat table, art roster, stat bands, boss HP |
| [spells/](spells/) | Spells, fall-off, MP check, MP potions, cast rule |
| [items/](items/) | Gear, heroic drops, consumables, chests, drops, prices |
| [balance/](balance/) | Hero stats, MP rules, skills, companion, difficulty, practice, patrols, safety nets, special mechanics |
| [quests/](quests/) | Quests v2 (quest/0.2), plus the v1 board quests the classic mode still builds from |
| [dialogue/](dialogue/) | Dialogue scenes (scene/0.2) and schema |
| [world/](world/) | World graph v3.9.1: graphs, zones, rules, quest hooks, schemas, diagrams |
| [sim/](sim/) | Sim output tables |
| [json/](json/) | JSON twins of the CSVs and the combined bundles the build reads |

The game build reads these files: `tools/build_data.py` (classic tables) and `tools/world/build_world.py` (graph world). Rebuild and commit `src/data/` and `public/world/` after a change (see [../tech/deploy.md](../tech/deploy.md)).
