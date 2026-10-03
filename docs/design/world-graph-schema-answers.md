# World graph: answers to GameDev's schema questions (architecture.md §17.2)

From Desy, 2026-10-02 (PT); updated for v3.9 the same night after your answers (see "v3.9 follow-up" at the end). Full design: `docs/design/world-graph.md` (§13 has the same answers with more detail). Data: `docs/data/world/` (schemas in `schemas/`). Validator: `docs/tools/world/validate_world.py`.

This builds on your §6 `graph/0.2` and publishes it as **`graph/0.3`**. Your names are kept. The main changes:
- **Fights move to edges:** `danger` 0–3 × `steps` encounter rolls; the `fight`/`elite`/`gate` node kinds are dropped.
- **New node kinds:** `waypoint`, `miniboss`, `story`.
- **New `zones.json`:** one zone per location, with word pool, roster and boss. It replaces the graph-level `pool` and `roster`.
- **Additions:** 2 actions (`offerQuest`, `openChest`), 3 event fields (`outcome`, `cooldown`, weighted `pick`), and the edge flags `patrol` and `scripted`.

1. **Is a realm overworld one graph or several sections? Is there a top-level world map?**
   - One overworld graph per realm (5–93 nodes), plus one graph per dungeon level (4–55 nodes).
   - Splitting into sections joined by `portal` edges is allowed if art needs it.
   - The top-level world map is `world.json`: 9 realm nodes, each unlocked by `bossDefeated` of the previous realm boss.

2. **Is the node type list right, and how do town and village differ?**
   - Kinds: town, village, inn (`campfire: true` for camps), waypoint, fork, chest, npc, story, miniboss, boss, lever, stairs_up, stairs_down, portal, exit, shop.
   - **Town:** the realm's main hub, with the full screen (inn, shop, magic shop, smith, 学堂, board) and towns.json prices.
   - **Village:** an outpost with inn, save and item shop only.
   - Both open your town screen through `hub`; neither is a graph.

3. **Maze rules: dead ends, loops, one-way drops, backtracking, fog of war?**
   - Dead ends: yes, 30–38% of nodes.
   - Loops: a few per realm.
   - One-way drops: only if an inn stays reachable (the validator checks).
   - Backtracking: always allowed; walked edges roll at ×0.05.
   - Fog of war: visited nodes plus their neighbours as "?".

4. **How do shortcuts open, and are they two-way after?**
   They open by a `lever` node, an `openShortcut` action, or a boss `clear` event. After that they are two-way and permanent (save `shortcuts`).

5. **Are stairs and portals always two-way, and can portals skip levels or cross realms?**
   - Stairs and portals are always two-way, listed in both graphs, and never dangerous.
   - Portals may skip levels and cross realms.
   - Fast travel (v3.9): the **Return Feather** only, to the last inn or any visited town/village. The v3.8 inn warp is removed.

6. **Where does a defeated hero respawn, especially on a dungeon level with no inn?**
   - At `lastInn`, the last inn rested at (towns count), even if it is on another level.
   - Every node is ≤ 3 hops from an inn in realms 1–3 and ≤ 5 in realms 4–9 (stairs count as 0); big dungeons have inns inside.

7. **Are the event triggers and actions enough, and what format for dialogue?**
   - Your triggers and actions, plus `offerQuest`, `openChest` and (v3.9) `scene` (plays a `data/dialogue/<id>.json` scene).
   - Event fields `outcome` (one of 7: quest_offer, nothing, miniboss, item, portal, story, treasure), `once` / `cooldown: n` / repeatable, and `pick: [{weight, …}]`.
   - At most one event per arrival: the first eligible one in list order.
   - Dialogue: your `dialogue` map per graph, `{id: [{speaker, en, tokens?, zh?, vo?}]}`. As in the story scenes, `en` may hold `{Cxxx}` word-token placeholders listed in `tokens` (v3.9).

8. **Does the patrol gate stay as a condition on the boss edge?**
   - No blocking condition. The boss edge has `patrol: true` and no random battles.
   - Train/forced patrols happen at the approach inn (speech 20%, reading 40%, 2 forced), as in spec §7.4.
   - Your `graphState.patrolsLeft` and `approachArmed` stay; resting at any other inn re-arms.

9. **Where do node positions live, and does a 200-node level scroll or zoom?**
   - Node `x`/`y` live in the graph file, normalised 0–1 with 0,0 at the top left (v3.9, your choice). The graph's `aspect` is width/height.
   - Graphs of more than about 30 nodes scroll, with pinch zoom from 0.5× to 1.5× and the camera following the hero.
   - No single graph reaches 200 nodes.

10. **Are word pools per graph, per dungeon or per node?**
    - Per **zone** (= location L1.1…L9.2) in `zones.json`.
    - A zone can span several dungeon levels. Nodes carry `zone`, and each edge uses its nodes' zone.

11. **Do we commit to IDs that are never reused, plus a renames map?**
    - Yes. Node `idx` is never reused, and `idxMax` only grows.
    - String ids are stable, and `index.json` has `renames` (`"graph/node": "graph/node"`).

12. **Quests on town boards or from NPCs, and are kill counts level-specific?**
    - Both. v3.9: the 50 quests in `data/quests.json` (quest/0.2) name their giver and step nodes. NPC nodes carry `offerQuest <v2 id>`, and `quests_world.json` lists each NPC slot as `quest` (29) or `ambient` (26).
    - Kill counts are realm-wide by default, with an optional `scope: {graph | zone}`.

13. **Are chests nodes or events, and are there random encounters on paths?**
    - Chests are `chest` nodes with a `once` `openChest` event.
    - Random encounters happen on edges (paths): one roll per step.

14. **Authoring format: one JSON file per graph with JSON Schema, or CSV plus JSON?**
    - One JSON file per graph, plus JSON Schema 2020-12, plus `validate_world.py`, which checks references, two-way stairs, reachability, inn coverage and the battle budget per zone.
    - Realm 1 is authored. Realms 2–9 are generated reference layouts (`status: "reference"`).

**v3.9 follow-up (your answers, applied):**
- `graph/0.3` accepted.
- **x/y:** normalised 0–1 in all 36 graphs (0.05–0.95, plus the graph `aspect`).
- **Edges:** every edge has a stable `idx` (`edgeIdxMax`), which the `walked` bitset uses.
- **`world_rules.json`** stays separate (`src/data/world/world_rules.json`). It now has:
  - `returnFeather`
  - `maxHopsToInn` per realm (`{"1": 3, "2": 3, "3": 3, "default": 5}`)
  - `townDensity`
  - `fog`
  - `innWarp` is gone.
  - v3.9.1: `realmBossFeather` (`{realms: [3, 6, 8], qty: 1}`). The matching boss nodes carry an `on: clear` event with `giveItem feather`.
- **Validator in CI:** paths are data-dir relative (`validate_world.py <data_dir>`). The two outside inputs can be overridden with env `QUESTS_V2` (v2 quests) and `DIALOGUE_DIR` (scenes).
- **Tutorial:** now the realm-1 village `firstEnter` event `village.1` (`tutorial: true`). It runs `scene sc_r1_opening` → `dialogue meadow_intro` → `dialogue tutorial_first_battle` → `fight {kind: tutorial, enemies: [horned_rabbit], fill: false, canLose: false}` → `dialogue tutorial_first_battle_after`. Event `village.2` plays `sc_r1_village_banter` once Clover Hills is beaten.
- **Fog of war:** visited nodes plus "?" neighbours. Nodes may carry `fog: "landmark"` (town/village/boss: shown once their zone is open). The revealed state is player progress: `progress.schema.json` (`progress/0.3`) with base64 bitsets by idx for visited/walked/revealed, `lastInn`, `visitedTowns` and `feathers`. Example: `examples/progress_example.json`.
- **Speakers:** the companion is `xiaolong`. Innkeepers are `innkeeper_panda`. `panda` is now a validator error.

**Still open:**
- Return Feather UI: item menu → pick "last inn" or a visited town/village. OK?
- Should build_data.py emit `src/data/world/` from `docs/data/world/`?
- Event runner support for the new `scene` action and the `tutorial` fight kind (`canLose: false`: the tutorial battle cannot be lost).
