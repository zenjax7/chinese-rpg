# World graph design (v3.9.3)

Repo path: `docs/design/world-graph.md` · Data: `docs/data/world/` · Tools: `docs/tech/tools/world/` · Spec summary: combat-spec.md §12.
Written 2026-10-02 (PT) by Desy; v3.9 update the same night (§0.1). It builds on GameDev's graph schema in `docs/tech/architecture.md` §6 (`graph/0.2`) and publishes it as **`graph/0.3`**. GameDev's names stay wherever they work. §13 answers GameDev's 14 questions one by one.

## 0.000 Jack's rulings, 2026-10-11 PT (level/0.2 maps)

This document describes the v3.9.x seed (`docs/data/world`, frozen). For the level/0.2 maps (`docs/data/levels`, rules in `docs/data/levels/world_rules.json`) Jack, 2026-10-11 ruled (combat-spec §12.5, level-json-coverage.md §9):
- **No practice fights:** no zone battle budget (§4.3), no boss-approach patrols, trigger, Train or re-arming (§4.2, §6), no beeline battle target (§4.5).
- **No pity roll** (§4.3). **Walked edges roll at 50%** of the normal rate (was ×0.05, §4.3).
- **Nodes may have no event;** every eligible arrival event runs, in list order; no filler `nothing` events (§5.2).
- **Progression purely by links:** no `bossDefeated` conditions on links; realms and dungeons are open (§1, §6). Boss nodes stay fights; going around one is fine.
- **Quest locks** (his one exception): `lockedUntilQuest` / `lockedScene` on a node or edge (combat-spec §12.5).
- **Map display (Jack's decision, 2026-10-11):** every unvisited node looks the same in game; a node's type and icon show only on arrival, on top of fog of war. No landmarks (§0, §12, §13 below describe the seed's landmarks). The editor shows everything; renderer plan in [tech/level-editor.md §11](../tech/level-editor.md#11-game-graph-renderer-hidden-nodes-and-fog).
The rest of this document is unchanged and still describes the seed.

## 0.00 What changed in v3.9.2 and v3.9.3 (Jack 2026-10-03 PT; text brought up to date 2026-10-09 PT)

- **Realm links (§1, §14.1):** `world.json` carries `realms[]`, one entry per realm: `{realm, node, graph, entry, enterEdge, exitEdge, linkEdge, unlock, realmBossZone, next}`. Realm *N* (N ≥ 2) opens when realm *N*−1's realm-boss zone is defeated: `unlock = {bossDefeated: <zone>}`, and the same condition is on the world path `linkEdge` `w{N-1}{N}` (danger 0). Realm 1 has no unlock and no link edge. The game's `realmOpen()` reads `realms[].unlock`.
- **Exit edges to the world map (§3):** every realm overworld has one `exit` edge from its entry settlement to its world node, danger 0 (no battles): `exit_village` in realm 1 (edge idx 19), `exit_entry_town` in realms 2–9. Realm 1 also keeps `x_w_throne` (from the warren boss area, open once `warren` is defeated). The world node's portal `x_realm_N` leads back into the realm's entry.
- **Seed hash (§4.4):** FNV-1a 32-bit of the key string → mulberry32, with 3 test vectors in `world_rules.seed.testVectors` that the game and the validator both reproduce.
- **Feather destinations (§12.1):** exactly the last inn used plus every town or village ever entered. Other inns never count (`world_rules.returnFeather.destinationRule`).
- **Arrival outcomes:** 6, the `portal` outcome is gone (§5.1).
- **Realm 3–9 game content (§14.1):** `content/realm_3.json` … `realm_9.json` (schema `realm_content/0.1`), listed in `index.json` `content`. Every zone has an explicit `roster` (no more `fromRoster`).
- **Quest steps:** `escort` and `words` steps follow `docs/story/quests.md` §2a (runtime rules for GameDev); the world graph only places their nodes.
- **v3.9.3:** dead ends are a shape, not a node kind (§2); `q9_second_wind` step 2 is at `demon_castle_2/treasure_1`.
- **Tools:** the v3.9.2 world tools are back in `docs/tech/tools/world/` with repo paths (`_paths.py`); `make_realm_content.py` writes the content files (§14.6).

## 0.0 What changed in v3.9.1 (Director's defaults, 2026-10-02 23:15 PT)

- **Free Return Feather in the realm-boss chests of realms 3, 6 and 8** (`world_rules.realmBossFeather`; an `on: clear` event `giveItem feather` on boss nodes `bazaar_cellars_1/boss_3`, `moonlit_crypt_2/boss_6` and `undercroft_3/boss_8`). There is no shop nudge or tip.
- **Density follows Jack's ramp:** nodes per settlement ramp 20, 25, 30 … 60 across realms 1–9. Target = `max(1, ceil(nodes / ramp))`, so no settlement serves more than the ramp. That gives 1, 1, 2, 2, 2, 3, 3, 3, 4 (v3.9: 1, 1, 1, 2, 2, 2, 3, 3, 3).
  - 3 villages were added (`realm_3/village_1x`, `realm_6/village_2x`, `realm_9/village_3x`). Each is a new leaf node with one safe road edge (`v1x`, `v2x`, `v3x`) off a main-route waypoint.
  - All existing node, edge and hook ids, node kinds and idx are unchanged. The validator now requires the exact target (+1 is a warning).
- **Inn-hop rule re-checked:** max hops to an inn are 3, 3, 3 in realms 1–3 and 5 in realms 4–9. The new villages are inns too, so coverage only improves.
- **q8_caged_beasts:** the pen-keeper fight is now a quest-gated `fight` on `beast_pens_1/deadend_3`. `beast_pens_1/miniboss_1` stays a campfire inn with no quest event. The cage step on `beast_pens_2/deadend_1` is a quest-gated story step. In general, kill steps in `data/quests.json` that list enemies become quest-gated fights.

<!--DENSITY-->

Sim, v3.9 → v3.9.1 (100 seeds per profile):

<!--SIM_V391-->

- **Time:** within ±0.6% for savers; spender explorers +1.6–2.0% (more villages to visit).
- **Defeats:** −0.1 to −0.5 for 50% savers on beeline. The boss Feathers replace about 2–2.5 bought Feathers (5.9 vs 8.3 for 50% savers) rather than adding many extra flights. The +3–4 defeats vs v3.8 (§8.1) mostly remain.
- **Spells:** unchanged on beeline (75% saver 4.9). Explorers buy a little more (75% saver 8.0 → 8.6; 50% saver 4.8 → 5.5).

## 0.1 What changed in v3.9

- **No free inn warp.** The Return Feather (`world_rules.returnFeather`) is the only fast way back to a town. It costs **2×G** (2 normal kills at every tier; 12 gold in realm 1 → 144 in realm 9). It flies to the **last inn used or any visited town or village**, and works anywhere on the map outside battle and the boss room. Carry limit 3. Sold in town and village item shops, **not at inns**. Kids start with 2 (§12.1).
- **Town/village density:** towns + villages = `max(1, round(nodes / (20 + 5(t−1))))` in v3.9, which gave 1, 1, 1, 2, 2, 2, 3, 3, 3 (v3.8 had 1, 1, 2, 2, 2, 3, 3, 4, 4). **v3.9.1 uses `ceil` → 1, 1, 2, 2, 2, 3, 3, 3, 4 (§0.0).** Extra settlements are villages (inn + save + item shop with Feathers).
- **Inn rule per realm:** `maxHopsToInn` is 3 in realms 1–3 and 5 in realms 4–9. Standalone campfire inns fill the gaps (realm 3 now has 8 inns, realm 9 has 21).
- **Fog of war (approved):** visited nodes plus "?" for nodes one open edge away. Towns, villages and bosses were landmarks (`fog: "landmark"`), shown once their zone was open; **not in the maps** (Jack's decision, 2026-10-11: types show only on arrival). Revealed state lives in player progress (`progress.schema.json`), never in the graph file.
- **graph/0.3 accepted by GameDev.** Node `x`/`y` are now normalised 0–1 per graph (0.05–0.95, with the graph's `aspect` = width/height). Edges carry a stable `idx` (`edgeIdxMax`) for the `walked` bitset. `world_rules.json` stays its own file.
- **Tutorial as data:** the realm-1 village `firstEnter` event plays scene `sc_r1_opening` (data/dialogue), then `meadow_intro`, then the tutorial battle (`fight {kind: tutorial, canLose: false}`, one horned rabbit), then the after-line. A later `enter` event plays `sc_r1_village_banter` once Clover Hills is beaten. New action `scene`.
- **Story alignment:** the companion speaker is `xiaolong` (小龙, the baby dragon). Pandas are the innkeepers (`innkeeper_panda`, "every inn's panda is a cousin"). Realm-1 lines follow story density D1 (English lines with at most one `{Cxxx}` word token, tokens in at most 30% of lines); the validator checks it.
- **Quest hooks reconciled with `data/quests.json` (quest/0.2):** 55 NPC slots in `quests_world.json`; 29 are `status: "quest"` (giver or step of a v2 quest; givers carry `offerQuest <v2 id>`), 26 are `status: "ambient"` (repeatable one-line banter).
- **Sim:** with no warp, the time and spell numbers match v3.8 within 1% once kids keep 1 Feather in reserve for the shop trip. 50% savers on beeline take +2.5 to +3.8 defeats over the campaign (§8.1).

## 0. Summary

- **Every map is a graph.** There is one world graph (9 realm nodes), one overworld graph per realm, and one graph per dungeon level. Towns and villages are nodes that open the existing town screens (`screens.ts`); a town interior is not a graph.
- **Random battles happen on edges.** Each edge has a `danger` (0–3) and `steps` (encounter rolls along it). Nodes are places: towns, inns, forks, chests, NPCs, story spots, mini-bosses, bosses, stairs and portals.
- **Arriving at a node runs at most one event.** There are 6 outcomes: quest offer (hook only), nothing, quest-linked mini-boss, quest item, story, and treasure (v3.9.2: no `portal` outcome; portals are edges). Each event is fixed or weighted, and once, cooldown or repeatable. All randomness is seeded, so reloading never re-rolls.
- **Zone = location.** Each of the 20 locations (L1.1…L9.2) is a zone with its own word pool, roster and boss, placed on the graphs through `zones.json`. One zone can span several dungeon levels. All learning rules stay as they are: 7-item sets, at most 3 new items, the patrol rule (speech 20%, reading 40%), forced patrols and boss gates.
- **Safe edges:** no random battles on edges that touch a town or inn, on the boss-approach edge, or on stairs and portals. After a boss or mini-boss is cleared, the way you came back to the nearest inn stays safe for 20 hops or until the next inn rest. Walked edges drop to 5% of their rate, and each zone has a budget of 8 fresh battles. Encounter rates rise by 10% per dungeon level.
- **Size grows from 17 nodes in realm 1 to 200 in realm 9.** Later realms get more villages, deeper dungeons (up to 5 levels) with inns inside them, dead ends (about 30–38% of nodes) and optional treasure, story and mini-boss branches. Every node is at most 3 hops from an inn in realms 1–3 and 5 hops in realms 4–9.
- **Sim results (100 seeds per profile):**
  - **Beeline** (straight to each boss): pacing stays close to v3.7. The 75% saver takes <!--H_BEE--> h (v3.7 17.96 h), with about 7.4 path battles per zone where v3.7 had 8. Patrols, readiness at the gate and gold barely move.
  - **Explorer** (visits every node): takes <!--H_EXP--> h, because of optional branches with about 4.7 extra battles per zone. That is optional content, not required time.
  - **Time:** beeline adds 1–12% to the time (+0.6 h for the 75% saver).
- **Cost:** 50% kids get about 11–15 more defeats over the campaign than v3.7 (v3.8: 9–11), because walking to an inn is no longer free and v3.9 has no warp.
- **Format:** one JSON file per graph, checked against JSON Schemas (`data/world/schemas/`). A validator (`validate_world.py`) checks references, two-way stairs, reachability, inn coverage and the battle budget. Realm 1 is authored by hand. Realms 2–9 are generated reference layouts (`status: "reference"`) for the writers to replace.

## 1. Map hierarchy

| Level | Graph `kind` | Count | Contents |
|---|---|---|---|
| World map | `world` | 1 (`world.json`) | 9 realm nodes (`portal`) linked in order by danger-0 `path` edges `w12` … `w89`. Realm *t*+1 opens when realm *t*'s realm boss falls (`cond: {bossDefeated: <zone>}` on the link edge and in `realms[].unlock`, v3.9.2). Each realm node has a portal `x_realm_N` into the realm's entry, and each realm overworld has an `exit` edge back (§1.1) |
| Realm overworld | `overworld` | 9 (`realm_1` … `realm_9`) | Main town (entry), villages, inns, the overworld zones, dungeon entrances |
| Dungeon level | `dungeon_level` | 26 levels in 12 dungeons | One graph per level, joined by `stairs` edges; an entrance `portal` edge joins level 1 to the overworld |
| Town screen | not a graph | one per town/village | `town` node with `hub` (screen id) and `town` (towns.json number, which sets prices). Villages use the same screen with fewer services |

### 1.1 Realm links and exits (v3.9.2)

`world.json` `realms[]` is the one place the game reads realm order, unlocks and the way in and out:

| Realm | World node | Enter (world portal → entry) | Exit (overworld → world, danger 0) | Link edge from previous realm | Unlock | Realm-boss zone |
|---|---|---|---|---|---|---|
| 1 | `realm_1` | `x_realm_1` → `realm_1/village` | `exit_village` (idx 19); also `x_w_throne` once `warren` is beaten | – | none (start) | `warren` |
| 2 | `realm_2` | `x_realm_2` → `realm_2/entry_town` | `exit_entry_town` | `w12` | `bossDefeated: warren` | `great_hive` |
| 3 | `realm_3` | `x_realm_3` → `entry_town` | `exit_entry_town` | `w23` | `bossDefeated: great_hive` | `night_bazaar` |
| 4 | `realm_4` | `x_realm_4` → `entry_town` | `exit_entry_town` | `w34` | `bossDefeated: night_bazaar` | `goblin_school` |
| 5 | `realm_5` | `x_realm_5` → `entry_town` | `exit_entry_town` | `w45` | `bossDefeated: goblin_school` | `hydra_s_lair` |
| 6 | `realm_6` | `x_realm_6` → `entry_town` | `exit_entry_town` | `w56` | `bossDefeated: hydra_s_lair` | `moonlit_graveyard` |
| 7 | `realm_7` | `x_realm_7` → `entry_town` | `exit_entry_town` | `w67` | `bossDefeated: moonlit_graveyard` | `griffin_summit` |
| 8 | `realm_8` | `x_realm_8` → `entry_town` | `exit_entry_town` | `w78` | `bossDefeated: griffin_summit` | `grand_colosseum` |
| 9 | `realm_9` | `x_realm_9` → `entry_town` | `exit_entry_town` | `w89` | `bossDefeated: grand_colosseum` | `throne_hall` |

Rules: the unlock of realm *N* is always `{bossDefeated: <realm N−1 realmBossZone>}` and equals the `cond` on `linkEdge`; the link and exit edges are danger 0, so walking between realms never rolls a battle. The exit edge is appended after the generated edges, so it has the overworld's highest `idx` and no existing idx moved. `next` is the following realm (null for realm 9). A realm whose zones have no game content yet stays locked in the build even when its unlock holds (`index.json` `inBuild` in GameDev's runtime copy).

**Zones** (`zones.json`) are the link to the curriculum. A zone is one location: word pool (`desyPool` L1.1…L9.2), roster, elite and boss. Its nodes carry `zone`, and its boss node and gate edge are referenced from the zone. Zones are ordered inside a realm (`order`, `unlockRequires`).

## 2. Node kinds

GameDev's kinds are kept. Changes: `fight`, `elite` and `gate` nodes become edge properties, since fights live on edges. `waypoint`, `miniboss` and `story` are new.

| `kind` | Meaning | Typical event | Save / rest | Notes |
|---|---|---|---|---|
| `town` | Main town of the realm | story on first visit | inn + save + all shops | `hub`, `town` (prices from towns.json G). One per realm, at the entry |
| `village` | Outpost in a big realm | story | inn + save + item shop (sells Return Feathers) | No magic shop or smith, so no gear or spells for sale: fly to a town with a Feather. Density rule (v3.9.1): 1 village in realms 3–5, 2 in realms 6–8, 3 in realm 9 |
| `inn` | Inn or campfire (`campfire: true`) | story on first visit | rest + save | Every node is ≤ `maxHopsToInn` hops from an inn or town (3 in realms 1–3, 5 in 4–9). No Feathers for sale. Each boss has an **approach inn** next to its gate edge |
| `waypoint` | Plain spot on a path | weighted (nothing / ambient / honey) | – | Replaces GameDev's `fight` node |
| `fork` | Waypoint with 3+ edges | weighted | – | Kind is cosmetic (map icon); the loader treats it like a waypoint |
| `chest` | Treasure spot (outcome `treasure`) | `openChest` once | – | Often at the end of a dead-end branch; may hide a quest item |
| `npc` | Quest giver / helper | `offerQuest` once, then story | – | `npc` = id in the graph's `npcs` map |
| `story` | Lore or cut-scene spot | `dialogue` once | – | |
| `miniboss` | Optional strong fight | `fight {kind: miniboss}` once, quest-linked | – | Safe way home after the win (§4.3) |
| `boss` | Zone boss | `on: clear` events | – | `boss` = zone id. Reached only over its `patrol: true` edge |
| `lever` | Opens a shortcut | `openShortcut` | – | GameDev's lever kept (none in the reference layouts yet) |
| `stairs_up` / `stairs_down` | Level links | – | – | Edge kind `stairs` to the other level |
| `portal` | Dungeon mouth, realm node on the world map | – | – | Edge kind `portal` |
| `exit` | Leaves the realm | – | – | Realm 1 uses an `exit` edge on the realm boss node |
| `shop` | Stand-alone shop (optional) | – | – | Kept from §6; normally shops live in town/village `services` |

**Dead ends (v3.9.3).** A dead end is a shape, not a node kind: a node with one edge. The generator's dead-end spots (ids `deadend_k`) are exported as `waypoint` (a few as `inn` or `miniboss`), and quests call them `nodeKind: deadend`. A dead end does exactly what its kind and its events say (§5.2: the first eligible event fires). Today every `deadend_k` waypoint carries the waypoint pick (80% nothing / 20% honey, cooldown 4), and some also carry quest steps (fights, pickups). **A dead end with no event is just an empty end:** arriving does nothing (no battle, no item, no ambient line) and the player walks back. The game adds nothing at run time; if a spot needs flavor, give it an event in the data.

## 3. Edge kinds and fields

| `kind` | Two-way? | Random battles | Use |
|---|---|---|---|
| `path` | yes | by `danger` × `steps` (unless safe) | Normal road, grass, tunnel (`terrain` is cosmetic) |
| `oneway` | no (`from` → `to`) | yes | Drops and slides; the validator checks you can still reach an inn |
| `shortcut` | yes once opened | yes | Closed until `shortcutOpen` / `openShortcut` (lever, event or boss clear) |
| `stairs` | yes (both levels list the link) | no | Dungeon levels; counts as 0 hops for inn coverage |
| `portal` | yes | no | Dungeon entrance, world ↔ realm, optional skip portals |
| `exit` | – | no | Realm → world map |

Edge fields:
- `id`, `from`, `to` (a node id, or `{graph, node}` for cross-graph kinds), `kind`
- `danger` 0–3 and `steps` 1–8 (required on in-graph edges)
- `terrain`
- `patrol: true` marks the boss-approach edge: no random battles (the Train/patrol rule is gone, Jack, 2026-10-11)
- `scripted {enemies, fill, once, step}`: the scripted path elite, e.g. the swift rabbit on realm 1's `e11`. **Removed (Jack, 2026-10-11: no random or scripted elites).** The 9 legacy edges are not converted to docs/data/levels.
- `cond` (blocks traversal while false; never `bossDefeated` in the maps, Jack, 2026-10-11), `opens` (shortcut id), `label`; maps also allow `lockedUntilQuest` / `lockedScene` (Jack, 2026-10-11)

## 4. Encounters on edges

### 4.1 Rate

Each step on an edge rolls `p = encounterRate[danger] × (1 + depthStep × (level − 1))`, capped at `maxRate`:

| danger | 0 | 1 | 2 | 3 |
|---|---|---|---|---|
| base rate per step | 0 | 0.60 | 0.85 | 0.95 |
| dungeon level 3 (+20%) | 0 | 0.72 | 0.95 (cap) | 0.95 |

- **Encounter size:** 1–3 enemies, taken from the zone's `enemiesPerBattle` and capped by balance.json `combat.maxEnemies` = 3. Enemies come from the zone `roster` (weights, `packs`). There is no elite roll (Jack, 2026-10-11: no random elites; balance.json `eliteReplaceChance` and the zone `elite` are dropped).
- **Edges outside every zone:** they use the zone of their `to` node. A shared trunk uses the next undefeated zone.

### 4.2 Safe edges (no rolls)

1. **Next to a town, village or inn:** every edge touching one of these nodes.
2. **Boss approach:** the edge with `patrol: true` into each boss. (Patrols, by choice or forced, were removed: Jack, 2026-10-11.)
3. **Stairs and portals.**
4. **After a boss or mini-boss clear:** the way you came stays safe. That is the shortest route over edges you have already walked, from the cleared node back to the nearest inn or town. It lasts 20 hops or until the next inn rest, whichever comes first. The unexplored way forward is never made safe, because the next zone's battles must stay intact.
5. **Repel item** (`bell`, new consumable): no random battles for 6 hops on danger ≤ 2 edges. Placed fights still happen.

### 4.3 Softeners

| Rule | Value | Why |
|---|---|---|
| Walked edge (`clearedStepMult`) | ×0.5 per step (Jack, 2026-10-11; seed ×0.05) | Backtracking and inn trips stay cheap without being free |
| ~~Zone budget (`zoneBattleBudget`, `budgetSpentMult`)~~ | removed (Jack, 2026-10-11); seed: after 8 fresh battles in a zone, fresh steps roll ×0.1 | – |
| ~~Pity (`pityRolls`)~~ | removed (Jack, 2026-10-11); seed: after 2 empty fresh steps the next fresh step always fights | – |
| Turn back | after a won battle mid-edge, a low-HP hero may turn back; steps already walked count as walked | Keeps 50% kids from dying in the middle of long edges |

### 4.4 Determinism

Every roll is `mulberry32(fnv1a32(key))`, the first output of mulberry32 seeded with the FNV-1a 32-bit hash of a key string (v3.9.2, `world_rules.seed`; the game's `src/world/engine.ts` `fnv1a`/`mulberry32`/`roll`):

- **Edge key:** `saveSeed|graphId|edgeId|crossing|step`. `saveSeed` is the save's uint32 seed (decimal), `crossing` is how many times this save had already crossed that edge before (0 on the first crossing), and `step` is the 0-based encounter step on the edge. A battle starts when `roll < chance` (§4.1).
- **Event key:** `saveSeed|graphId|nodeId|visit` for weighted events, where `visit` counts arrivals at the node including this one. Pick: `r = roll × total weight`, then subtract each eligible option's weight in list order and take the first that takes `r` below 0.
- **FNV-1a 32-bit:** `h = 0x811c9dc5`; for each UTF-16 code unit `c` (keys are ASCII, so bytes): `h ^= c; h = (h × 0x01000193) mod 2^32`.
- **mulberry32:** the standard 32-bit generator; the roll is the first output as uint32 / 2^32, in [0, 1).

| Test vector key | fnv1a32 | roll |
|---|---|---|
| `12345|realm_1|e1|0|0` | 199679387 | 0.09237345564179122 |
| `12345|realm_2|e3|1|2` | 1855283427 | 0.2770371865481138 |
| `12345|realm_1|village|0` | 4123396911 | 0.5738876694813371 |

The game, `world_rules.seed.testVectors` and the validator agree on all three. Reloading or re-entering never re-rolls, because each roll depends only on the save seed and the counters.

### 4.5 Authoring target

Removed (Jack, 2026-10-11: no own-word battle targets). The seed's `beelineBattleRange` 6.5–9.5 is no longer checked; the validator only prints the expected battles per zone.

## 5. Arrival events

### 5.1 The 6 outcomes

| `outcome` | What happens | Action(s) | Default repeat |
|---|---|---|---|
| `quest_offer` | An NPC offers a quest (hook only: `quests_world.json` holds placeholders until the quest system lands) | `offerQuest` | once |
| `nothing` | Nothing | – | repeatable (weighted) |
| `miniboss` | Quest-linked optional strong fight (2–3 enemies, one elite) | `fight {kind: miniboss}`, `giveGold`, `setFlag` | once |
| `item` | Quest item (`cond: questActive`) or a small find (honey, cooldown 4 visits) | `giveItem` | once / cooldown |
| `story` | Lore, hints, boss intros | `dialogue` | once |
| `treasure` | Chest | `openChest`: `chest_normal` = normal chest, `chest_fine` = location boss chest, `chest_boss` = realm boss chest, using the desy `chest_contents` tables | once |

v3.9.2: the `portal` outcome is gone (no event used it). Portals are edges (§3); the `teleport` action stays for scripted warps.

### 5.2 Event rules

- **Shape:** `{id, node, on, cond?, once?|cooldown?, outcome, do: [actions]}`, or `pick: [{weight, outcome, once?|cooldown?, cond?, do}]` for weighted events.
- **Triggers (`on`):** `enter` (every arrival), `firstEnter`, `clear` (boss/mini-boss won), `leave`, `rest` (inn). These are GameDev's triggers.
- **Arrival:** a node may have no event. Every eligible event runs, in list order (Jack, 2026-10-11; the seed: one event per arrival, the first eligible one, with `nothing` fallbacks).
- **Repeat:**
  - `once`: never again on this save.
  - `cooldown: n`: needs n more visits to this node first.
  - Neither: repeatable on every arrival.
  - Inside a `pick`, each option has its own once/cooldown. Spent options drop out and the weights renormalise.
- **Revisits:**
  - Once-events don't come back.
  - Chests stay open (`eventsDone`).
  - Mini-bosses stay beaten.
  - Weighted spots keep rolling, seeded by the visit count.
- **Conditions** (GameDev §6 names): `all / any / not`, `flag`, `questActive`, `questClaimed` (also `questDone`), `bossDefeated: <zone id>`, `wordsReady {pool, n}`, `readinessAtLeast`, `levelAtLeast`, `hasItem`, `shortcutOpen`, `visited`.
- **Actions** (GameDev's list plus 3): **`scene`** (v3.9: play a `data/dialogue/<id>.json` scene), `dialogue`, `toast`, `fight`, `giveItem`, `giveGear`, `giveSkill`, `giveGold {G}` (gold in G units, × towns.json G of the realm), `startQuest`, **`offerQuest`** (new: the hook shows Accept/Later), `setFlag`, `openShortcut`, `defeatBoss`, `unlockGraph`, `heal`, `teleport`, **`openChest`** (new).
- **Dialogue:** GameDev's `dialogue` map in each graph file: `{id: [{speaker, en, tokens?, zh?, vo?}]}`. As in the story scenes, `en` may hold `{Cxxx}` word-token placeholders listed in `tokens`; `zh` is optional. Speakers come from the graph's `npcs` map or the shared `speakers` (`xiaolong`, `innkeeper_panda`, `narrator`, `hero`…). Events only reference dialogue ids; longer story beats are `scene` actions.

## 6. Existing systems on the graph

| System (v3.7) | On the graph |
|---|---|
| Word pools: 7 items per battle, ≤ 3 new, 47–60 items per location | Per **zone**. Every random battle on an edge uses the zone of the edge, so the learning model is unchanged. Patrols and the boss use the same zone |
| Enemy tiers, elites | Zone `tier`, `roster`. No random or scripted elites (Jack, 2026-10-11); elites only in hand-placed mini-boss and quest fights |
| ~~Patrol rule~~ (speech 20%, reading 40%; 2 forced patrols per trip) | Removed (Jack, 2026-10-11). The boss edge keeps `patrol: true` as the safe-approach marker only |
| Boss gates and unlocks | Maps (Jack, 2026-10-11): no unlocks; a boss node is a fight you win to walk through it, and going around it is fine. Seed: next-zone edges and realm links carry `cond: {bossDefeated}` |
| Inns, midpoint inn, save points | `inn` nodes (`save: true`), ≤ 3 hops away in realms 1–3 and ≤ 5 in realms 4–9; campfires are inns. Inn price = towns.json G of the realm |
| Return Feather | v3.9: flies to the last inn used or any visited town/village; usable anywhere outside battle and the boss room. 2×G, carry 3, start with 2. Town/village item shops only |
| Magic shop, gear smith | In towns only. v3.9: the v3.8 inn warp is **removed**. To shop from deep in a dungeon, walk (≤ 6 hops) or fly to a town with a Feather and fly (or walk) back to the last inn |
| Quests | v3.9: the 50 v2 quests live in `data/quests.json` (quest/0.2). Their givers and steps point at graph nodes; `quests_world.json` lists the NPC slots (29 quest, 26 ambient). Quest items sit on chest/dead-end nodes with `cond: questActive` |
| Chests from battles | Unchanged; `chest` nodes are extra (`openChest`) |

## 7. Size and shape per realm

**Targets** (Jack, 9:48 PM): about 15 nodes in realm 1, growing to about 200 in realm 9; maze-like with dead ends and branches; multi-level dungeons; more towns and villages later; inns inside dungeons.

Realm 1 is authored. Realms 2–9 come from `world_gen.py` (seeded), driven by the targets in `layout_targets.json`. **Battles per zone and minutes per zone** are from the 75% saver, no spells, 100 seeds:

<!--SIM_REALM-->

Notes:
- **Shape:** edges per node is about 1.0, so the layouts are tree-like mazes with a few loops. Dead ends are 30–38% of nodes. Branch nodes (3+ edges) grow from 6 to 52.
- **Dungeons:**
  - The dungeons and their levels are great_hive 1, bazaar_cellars 1, goblin_caves 3, hydra_lair 2, moonlit_crypt 2, old_mine 1, griffin_spire 3, cloud_caves 1, undercroft 3, beast_pens 2, demon_castle 5 and shadow_vault 2.
  - old_mine, cloud_caves, beast_pens and shadow_vault are `optional: true` treasure dungeons.
- **Explorer time:**
  - Explorer minutes per zone grow with the graph (realm 9: <!--R9_EXP--> min against <!--R9_BEE--> beeline).
  - Big realms hold optional content, not required time. If the 75% saver should stay near 18 h for explorers too, cut side branches in realms 6–9 or move them into the optional dungeons (§15 J2).

## 8. Encounter tuning and sim

- **Sim:**
  - `world_sim.py` is `spells_sim.py` (v3.7 battle model, unchanged) plus the graph loop (`world_loop.py.txt`). `world=None` reproduces v3.7 exactly.
  - Beeline: walks each zone's shortest route, rests when HP or MP is low (it picks the least risky route to the cheapest inn, or uses a Feather when far), then patrols and fights the boss.
  - Explorer: visits every zone node first, nearest unvisited first, and accepts every quest.
- **Tuning sweep (8 seeds):**
  - Budgets of 10, 8 and 6 battles and cleared-edge rates of ×0.1 and ×0.05 were tried.
  - Chosen: budget 8, ×0.1 after the budget, ×0.05 on walked edges. That cut explorer time from 25.0 h to 22.3 h with beeline unchanged (18.4 h; 8 seeds, before the inn warp).
- **Fixes found while simming:**
  - **Post-clear safety:** "path home" must mean the way you came. As first written, it made the next zone's route safe and cut beeline battles to about 4.6 per zone.
  - **Inn warp (v3.8):** was needed to keep spell buying at v3.7 levels. v3.9 removes it; see §8.1 for what replaces it.
  - **Turn back mid-edge:** cuts 50% defeats.
- **Main run:** 100 seeds per profile. "Battles/zone" splits into path (the shortest route to the boss), side (branches), back (walked again: inn trips, backtracking) and patrol.

<!--SIM_PROFILES-->

Reading the table (v3.9 data; the v3.8 → v3.9 comparison is in §8.1):
- **Beeline vs v3.7:**
  - Time rises 3–6% for savers and reading kids (75% saver: 17.96 → 18.52 h) and 1–12% for spenders. The cost is walking time plus 0.3–1.3 back battles per zone.
  - Path battles are about 7.4 against v3.7's 8, so patrols make up the gap and readiness at the gate is unchanged.
  - Gold and inn stays are close. Savers now use Feathers (5–20 per campaign); spenders use 1.
- **50% kids:** about +11 to +15 defeats per campaign on beeline vs v3.7 (52.2 vs 40.5 for savers without spells). Inns are a walk away instead of instant. v3.9 already starts kids with 2 Feathers and keeps inns ≤ 3 hops in realms 1–3.
- **Explorers:**
  - Explorers pay +16 to +26% (savers) and +49 to +61% (spenders and reading kids, who barely patrol in v3.7).
  - In return they gain gold (2–3× at the end), more chests, quest rewards and readiness at the gate (0.15 vs 0.05).
  - Patrols drop by half, because exploring battles teach the same pool.

### 8.1 v3.9 run: no warp, Feathers bought, new density (100 seeds)

Kid policy in the sim:
- Feathers are bought in town and village shops up to 2 (savers) or 1 (spenders). Kids start with 2.
- After a rest at a non-town inn, and after each zone boss, the kid shops if it can afford missing gear or the next spell.
  - Walk if a town is ≤ 6 hops away.
  - Otherwise fly there with a Feather and fly (or walk) back to the last inn.
- Kids keep 1 Feather in reserve for that trip. They only spend a Feather to fly back to an inn for rest when they hold 2 or more.
  - Without the reserve, spell buying for the 75% saver fell from 4.9 to 3.9 and gold piled up (10.7k unspent at the end). The Feathers had gone on rest trips, so there was none left to reach a town.
  - With the reserve, spell buying returns to v3.8 levels.
- Tried and rejected:
  - A Feather price of 1×G changed nothing: price is not the limit, carrying one is.
  - Keeping 3 Feathers gave 4.6 spells.
  - Walking up to 10 hops changed nothing.
  - A magic shop in villages (`village_magic`) changed nothing, because beeline kids never pass the villages (they sit on branch ends).

<!--SIM_V39-->

Feather price per tier (G = gold for 1 normal kill; Feather = 2×G = 2 kills at every tier):

<!--SIM_FEATHER-->

Reading it:
- **Time:** within ±0.6% of v3.8 for every profile, on both beeline and explore.
- **Spells bought:**
  - 75% saver: 4.8 beeline (4.9 in v3.8), 8.0 explore (8.1).
  - 50% saver: 0.2 beeline (0.3), 4.8 explore (4.9).
- **Feathers as a budget:**
  - The 75% saver on beeline buys about 15 Feathers per campaign (≈ 1.7 per realm, 3.2 in realm 4) when buying spells. That is 3.2% of income.
  - A no-spell saver buys 5.5 (1.2%). Explorers buy 12–25 (3–5.5%).
  - Spenders on beeline buy almost none: they walk.
  - So a Feather is a real but small choice: 2 kills each, about 1–2 per realm.
- **Defeats:**
  - 50% savers on beeline: +3.8 (with spells) and +2.5 (no spells) over the whole campaign, about +5–8%. They fly back to inns about half as often as with the free warp.
  - 50% spenders: +0.3.
  - Explorers: −0.4 to +1.1.
- **Possible fixes if the +3–4 defeats matter** (no free warp; v3.9.1 applied fix 3 only, which moved defeats by −0.1 to −0.5, §0.0):
  1. `maxHopsToInn` 3 in realms 4–6 too. More campfires; regenerating changes node kinds, so it needs the quest team's ids re-checked.
  2. A "keep one Feather" nudge in the shop UI (the sim's reserve policy).
  3. 1 Feather in the realm-boss chest of realms 3, 6 and 8.

## 9. Converting the prototype

The prototype has 2 locations (`meadow` L1.1, `forest` L2.1). Each has 13 `mapNodes` in this order: inn, 4 fights, inn, 4 fights, inn, gate, boss. It also has `pathFights: 8` and `scripted` fights at positions 1/3/4/6.

| Prototype | v3.9 |
|---|---|
| `locations.json` `meadow` | Zone `meadow` in `zones.json` (`location: "meadow"`, `desyPool: "L1.1"`), placed on `realm_1` (boss node `m_crow`, gate edge `g1`). The authored realm 1 has all 3 realm-1 zones; to ship meadow only, set realm 1's `world` exit on `m_crow` (or mark zones 2–3 `inBuild: false`) |
| `forest` | Zone `forest` (L2.1) on `realm_2` (boss `boss_1`, gate edge `e5`), entry town = Honey Town (town 2) |
| `mapNodes` inn (0/4/8) | `inn` nodes; the last inn becomes the **approach inn** |
| `mapNodes` fight × 8, `pathFights: 8` | Removed. Battles come from `danger × steps` on edges (target about 8 per zone, §4.5) |
| `gate` node | `patrol: true` on the approach edge into the boss |
| `boss` node | `boss` node (`boss: <zone id>`); enemy, kind and reward stay in zones.json / locations.json `bossReward` |
| `scripted` fight 1 (first-ever rabbit) | v3.9 (GameDev agreed): data-driven village `firstEnter` event `village.1` (`tutorial: true`): `scene sc_r1_opening` → `dialogue meadow_intro` → `dialogue tutorial_first_battle` → `fight {kind: tutorial, enemies: [horned_rabbit], fill: false, canLose: false}` → `dialogue tutorial_first_battle_after` |
| `scripted` fights 3/6 (crow, grey wolf) | These are the L1.1/L1.2 bosses in v3.7, so they become boss nodes |
| `scripted` 4 / `elite` (swift rabbit, guard bee) | `scripted` on an edge (`e11` in realm 1, the edge after the first boss in realm 2) |
| `roster`, `packs`, `elite`, `enemiesPerBattle`, `unlockRequires` | Same fields in zones.json. Enemy ids are the desy ids (`horned_rabbit`…); `build_data.py` maps them with `desyId`, as for enemies.json |
| `mapNodes` x/y | Node `x`/`y` in the graph file, normalised 0–1 (0,0 = top left; graph `aspect` = width/height). Divide the prototype's pixel x/y by the background size |
| `screens.ts` village (Little Hill Village, inn, shop, magic shop, 学堂, board, gate) | `town` node `village` with `hub: "village"`, `town: 1`; the gate = leaving the town node |
| balance.json `inns.nodes` | Obsolete (inns are nodes) |

GameDev said "meadow/forest become two 13-node overworld graphs from mapNodes". That is the minimal port, and it validates if the 8 fight nodes become `waypoint`s with `danger: 2, steps: 1` edges. The authored `realm_1.json` (17 nodes, 3 zones) is the recommended target.

## 10. Example: Realm 1, Starter Meadow (authored)

17 nodes, 18 edges, 3 zones:
- **meadow** (L1.1): boss Big-Beak Crow at `m_crow`.
- **clover_hills** (L1.2): Big Grey Wolf at `c_den`.
- **warren** (L1.3): Horned Rabbit King at `w_throne`, the realm boss.

Little Hill Village is the town node. Farmer Li offers the hoe hook, and the hoe is in the old well. A thief mini-boss guards the golden-carrot hook. The midpoint campfire inn sits in Clover Hills, and the boss-approach inn sits before the throne. (The swift-rabbit elite scripted on `e11` was removed, Jack, 2026-10-11.)

![Realm 1](../data/world/diagrams/realm_1.png)

```mermaid
<!--MMD:realm_1-->
```

**The village** (town node `village`, `hub: "village"`): it opens the existing screen with the Sleepy Panda Inn (rest/save), Grandma Wu's shop, the magic shop, the 学堂 (words), the quest board and the gate (back to the map). It is not a graph: the old `village_1/2` interior graphs were dropped. Its `firstEnter` event plays the opening scene `sc_r1_opening`, then `meadow_intro` and the tutorial battle; a second event plays `sc_r1_village_banter` after Clover Hills. The Sleepy Panda Inn's panda is the first `innkeeper_panda` (the campfire at `c_camp` is run by a cousin).

## 11. Example: Goblin Caves (realm 4, 3 levels, inn inside)

The realm 4 overworld (town, cave-mouth path) has a `portal` into `goblin_caves_1`:
- **Level 1:** zone `cave_mouth`, boss Giant Echo Bat.
- **Level 2:** zone `crystal_tunnels`, boss Goblin Warden, with a **midpoint campfire inn** plus a campfire inn on a side branch.
- **Level 3:** zone `goblin_school`, realm boss Goblin King.

Stairs join L1↔L2↔L3, and each staircase is listed on both levels. The boss of each level stands before its stairs down. Encounter rates are +10% on L2 and +20% on L3.

![Goblin Caves](../data/world/diagrams/goblin_caves.png)

Level 1:
```mermaid
<!--MMD:goblin_caves_1-->
```
Level 2:
```mermaid
<!--MMD:goblin_caves_2-->
```
Level 3:
```mermaid
<!--MMD:goblin_caves_3-->
```

The biggest single graph (the realm 8 overworld, 93 nodes) is in `data/world/diagrams/realm_8.png`.

## 12. Respawn, saving and fast travel

- **Save:** GameDev's save state as written, plus a few fields.
  - From §6: `pos {realm, graph, node, dungeon, level}`, `lastInn {graph, node}`, `shortcuts`, `bosses` (zone ids), `flags`, `eventsDone`, `graphState {patrolsLeft, approachArmed}`, and `graph_progress` bitsets by node `idx`.
  - Added: `edgeCrossings` (for seeding) and `edgeProgress` (turn-back).
- **Defeat:** wake at `lastInn`, which can be on another level or in the town. Gold loss as in v3.7. Edges stay walked.
- **Feather (v3.9, wording v3.9.2):** to `lastInn` (the one place last rested) or any town or village ever entered (`visitedTowns`), from anywhere outside battle and the boss room. Other inns don't count. No inn warp. Rules in §12.1.
- **Fog of war:** player progress keeps `visited`, `walked` and `revealed` bitsets per graph (node `idx` / edge `idx`). The UI shows visited nodes and "?" for nodes one open edge away; every unvisited node looks the same, and its type shows on arrival (Jack's decision, 2026-10-11; the seed's `fog: "landmark"` nodes are not shown early). Schema: `progress.schema.json`, example `examples/progress_example.json`.
- **Boss retry:** none (Jack, 2026-10-11). A lost boss fight restarts at full boss HP like any fight. `graphState.bossCheckpoint` is dropped.

### 12.1 Return Feather rules (v3.9)

| Field (`world_rules.returnFeather`) | Value |
|---|---|
| Price | 2×G (2 normal kills at every tier): 12, 24, 36, 54, 72, 90, 108, 126, 144 gold in realms 1–9 |
| Destinations (v3.9.2 `destinationRule`) | Exactly two kinds; the player picks one. **Last inn used** (`lastInn`): the one node where the player last rested (a standalone or campfire inn, or the inn of a town or village); it is replaced at every rest. **Visited towns and villages** (`visitedTowns`): every node of kind `town` or `village` ever entered, in any realm. **Other inns never count**, even if visited or rested at earlier. The node the player is standing on is not offered |
| Usable | Anywhere on the map outside battle and the boss room (dungeon levels included) |
| Sold | Town and village item shops. Not at inns |
| Carry | 3 |
| Start | 2 (from the tutorial) |
| Other sources | 5% of chests; quest rewards (e.g. q1_carrot); v3.9.1: 1 free in the realm-boss chest of realms 3, 6 and 8 |

**Start with 2 vs Feathers as a budget:** there is a small conflict. 2 free Feathers are one free round trip, worth 4 kills (24 gold) in realm 1. In the sim, realm-1 kids use 0.4–1.1 of them and carry the rest into realm 2. That delays the first purchase by about one realm. After that, the budgeting choice is intact: every later Feather is bought. Starting with 1 would make the first purchase come sooner. I kept 2 (Jack's call).

## 13. Answers to GameDev's 14 questions (architecture.md §17.2)

**1. Is a realm overworld one graph or several sections? Is there a top-level world map?**
One graph per realm overworld. A realm's 25–200 nodes are split between the overworld (5–93 nodes; the largest is realm 8) and its dungeon levels. Dungeons are separate graphs, one per level. If art needs it, a big overworld may split into sections joined by `portal` edges; the schema already supports that. There is a top-level world map, `world.json`, with 9 realm nodes and unlock conditions.

**2. Is the node type list right, and how do town and village differ?**
Mostly. Fights, elites and gates move to edges (`danger`/`steps`, `scripted`, `patrol`). `waypoint`, `miniboss` and `story` are added. `fight`/`elite`/`gate` node kinds are dropped, and `chest`, `npc`, `lever`, `fork`, `stairs_*`, `portal` and `exit` are kept (§2).
- **Town:** the realm's main hub, with the full screen (inn, item shop, magic shop, smith, 学堂, board) and towns.json prices.
- **Village:** a smaller outpost with inn, save and item shop only (Return Feathers on sale). For magic and gear, fly to a town with a Feather (v3.9; the inn warp is gone).

**3. Maze rules: dead ends, loops, one-way drops, backtracking, fog of war?**
- **Dead ends:** yes, 30–38% of nodes, usually ending in a chest, story spot, NPC or mini-boss.
- **Loops:** allowed (a few per realm).
- **One-way drops:** allowed only if an inn stays reachable; the validator checks for one-way traps.
- **Backtracking:** always allowed. Walked edges roll at ×0.5 (Jack, 2026-10-11; seed ×0.05).
- **Fog of war (approved in v3.9):** visited nodes are shown, plus the neighbours of visited nodes as "?" (kind icon hidden until visited). (Seed only: towns, villages and bosses, `fog: "landmark"`, were always shown once their zone was open. Maps: no landmarks, Jack's decision, 2026-10-11.) The revealed state is player progress, not graph data.

**4. How do shortcuts open, and are they two-way after?**
By a `lever` node, an event action `openShortcut`, or a boss clear (`on: clear` → `openShortcut`). Before that the `shortcut` edge is closed (`cond: {shortcutOpen: id}`). After opening it is two-way and permanent (save `shortcuts`).

**5. Are stairs and portals always two-way, and can portals skip levels or cross realms?**
- Stairs and dungeon portals are always two-way, and both graphs list the link (validator). They are never dangerous.
- Portals may skip levels (for example an L1↔L3 return portal opened by beating the L3 boss) and may cross realms (world map ↔ realm, and post-game warps).
- Apart from these, fast travel is the Return Feather (v3.9): to the last inn or any visited town/village.

**6. Where does a defeated hero respawn, especially on a dungeon level with no inn?**
At `lastInn`, the last inn rested at, with towns and villages counting as inns. If the current level has no inn, that is an inn on an earlier level or the town; the walk back is over walked edges (×0.05). The rule that every node is ≤ 3 hops (realms 1–3) or ≤ 5 hops (realms 4–9) from an inn (stairs count as 0) keeps this short. Big dungeons get an inn inside, such as Goblin Caves L2.

**7. Are the event triggers and actions enough, and what format for dialogue?**
Yes, with 2 actions added (`offerQuest`, `openChest`) and 3 event fields (`outcome`, `cooldown`, weighted `pick`). The conditions also gain `questDone`, `readinessAtLeast` and `visited`. Dialogue uses your `dialogue` map exactly as written: `{id: [{speaker, zh, en, vo}]}` per graph, with speakers from `npcs`.

**8. Does the patrol gate stay as a condition on the boss edge?**
No blocking condition. The boss edge carries `patrol: true` and is never blocked. Train/patrols happen at the approach inn per spec §7.4: forced patrols (2) when the pool is below the trigger (speech 20%, reading 40%), and `approachArmed` is re-armed by resting at any other inn. Keep your `graphState.patrolsLeft`/`approachArmed`.

**9. Where do node positions live, and does a 200-node level scroll or zoom?**
`x`/`y` live on each node in the graph file, normalised 0–1 with 0,0 at the top left (v3.9, GameDev's choice; the graph's `aspect` gives width/height, and the generator lays nodes out by BFS depth). Graphs of more than about 30 nodes scroll (drag or pan), with pinch zoom between 0.5× and 1.5×. The camera follows the hero, and fog of war keeps the view small. A single 200-node graph never happens: overworlds have at most 93 nodes and dungeon levels 4–55.

**10. Are word pools per graph, per dungeon or per node?**
Per **zone** (= location, `zones.json`). A zone can cover part of a graph, a whole graph or several dungeon levels, and every node carries `zone`. Your graph-level `pool` field is left out of graph files on purpose.

**11. Do we commit to IDs that are never reused, plus a renames map?**
Yes. Node `idx` is stable and never reused (`idxMax` grows), and save bitsets use it. String ids (graph, node, edge, zone, event) are stable too. `index.json` has `renames: {"old": "new"}` (`graph/node` keys) so old saves load. The validator checks that ids and idx are unique.

**12. Quests on town boards or from NPCs, and are kill counts level-specific?**
Both. v3.9: the 50 quests in `data/quests.json` (quest/0.2) name their giver and step nodes; NPC nodes carry `offerQuest <v2 id>`, and `quests_world.json` lists each NPC slot as `quest` or `ambient`. Kill counts are realm-wide by default. A quest may narrow them with `scope: {graph}` or `{zone}`.

**13. Are chests nodes or events, and are there random encounters on paths?**
Chests are `chest` nodes that carry a `once` event (`openChest`, or a quest item first when `cond: questActive`). Random encounters happen on paths: per-step rolls on edges (§4). Battle chests stay as in v3.7.

**14. Authoring format: one JSON file per graph with JSON Schema, or CSV plus JSON?**
One JSON file per graph, plus JSON Schema (draft 2020-12, `data/world/schemas/`), plus `validate_world.py`. Tables that are naturally rows stay as JSON for now but could be CSV-generated: zones, quest hooks and rules. Realm 1 is hand-written through `make_world_data.py` (or direct JSON edits). Realms 2–9 are generated and marked `status: "reference"` until hand-authored.

## 14. Data format for GameDev

### 14.1 Files (`docs/data/world/`)

| File | Schema | Contents |
|---|---|---|
| `index.json` | `index.schema.json` | `schema: index/0.3`, `start {graph,node}`, file list, `graphs[]` (id, kind, realm, dungeon, level, status, nodes, file), `content` (v3.9.2: realm → content file, realms 3–9), `renames` |
| `world_rules.json` | `world_rules.schema.json` | Encounter and travel knobs (§4); may merge into balance.json as `world` |
| `zones.json` | `zones.schema.json` | 20 zones: id, realm, order, title, location, desyPool, pool, tier, bossNode, gateEdge, bossKind, boss, enemiesPerBattle, roster (explicit in every zone since v3.9.2), packs, elite, scriptedElite, unlockRequires |
| `quests_world.json` | `quests_world.schema.json` | NPC slots (id, giver/turnIn `graph/node`, `status` quest/ambient, `quests`, `offers`, `banter`), quest items, shared speakers |
| `examples/progress_example.json` | `progress.schema.json` | Player progress example (`progress/0.3`): pos, lastInn, visitedTowns, per-graph visited/walked/revealed bitsets, eventsDone, feathers |
| `graphs/<id>.json` | `graph.schema.json` | 36 graphs: `world` (with `realms[]`, §1.1), `realm_1…9` (each with its `exit` edge), 26 dungeon levels |
| `content/realm_3.json` … `realm_9.json` | `realm_content.schema.json` | v3.9.2 game content per realm (§14.6): enemies, locations (= zones), word pools, items |
| `layout_targets.json` | – | Generator targets per realm |
| `world_realm_table.csv` | – | The §7 table |
| `diagrams/*.png, *.mmd` | – | Rendered examples |
| `schemas/common.schema.json` | – | Shared `cond`, `action`, `text`, `nodeRef`, `edgeRef` |

### 14.2 Graph file (`graph/0.3`)

```json
{"schema": "graph/0.3", "id": "realm_1", "kind": "overworld", "realm": 1, "dungeon": null, "level": 0,
 "title": {"zh": "新手草原", "en": "Starter Meadow"}, "status": "authored", "entry": "village", "idxMax": 16, "edgeIdxMax": 19, "aspect": 1.61,
 "background": {"map": "bg_map_realm_1", "battle": "bg_battle_r1"},
 "nodes": [{"id": "village", "idx": 0, "kind": "town", "x": 0.05, "y": 0.8127, "fog": "landmark", "zone": "meadow", "title": {"zh": "小山村", "en": "Little Hill Village"},
            "save": true, "services": ["inn", "save", "shop"], "hub": "village", "town": 1}, "..."],
 "edges": [{"id": "e1", "from": "village", "to": "m_fork", "kind": "path", "danger": 0, "steps": 1, "terrain": "road", "idx": 1},
           {"id": "g1", "from": "m_grass", "to": "m_crow", "kind": "path", "danger": 0, "steps": 1, "patrol": true, "terrain": "boss_approach"},
           {"id": "x_w_throne", "from": "w_throne", "kind": "exit", "to": {"graph": "world", "node": "realm_1"}, "cond": {"bossDefeated": "warren"}},
           {"id": "exit_village", "from": "village", "to": {"graph": "world", "node": "realm_1"}, "kind": "exit", "danger": 0, "idx": 19}, "..."],
 "events": [{"id": "m_well.1", "node": "m_well", "on": "enter", "once": true, "outcome": "item", "cond": {"questActive": "q1_hoe"},
             "do": [{"giveItem": "farmers_hoe", "qty": 1, "quest": "q1_hoe"}]},
            {"id": "m_fork.1", "node": "m_fork", "on": "enter", "pick": [{"weight": 70, "outcome": "nothing", "do": []},
              {"weight": 15, "outcome": "story", "do": [{"dialogue": "ambient"}]}, {"weight": 15, "outcome": "item", "cooldown": 4, "do": [{"giveItem": "honey", "qty": 1}]}]}],
 "dialogue": {"meadow_intro": [{"speaker": "xiaolong", "en": "This is Starter Meadow! Tap a place to walk there. ..."}],
              "farmer_thanks": [{"speaker": "farmer_li", "en": "{C007}, little hero!", "tokens": ["C007"]}]},
 "npcs": {"farmer_li": {"name": {"zh": "李农夫", "en": "Farmer Li"}}}}
```

### 14.3 Changes from `graph/0.2`

| Change | Why |
|---|---|
| `kind` values kept (`world`, `overworld`, `dungeon_level`); `levels` and `optional` added for dungeons | Dungeon metadata |
| Graph `pool`, `recLevel`, `unlock` moved to zones.json / world graph | Pools are per zone, which can span graphs |
| Node kinds: `fight`/`elite`/`gate` dropped; `waypoint`, `miniboss`, `story` added | Fights live on edges |
| Node fields `zone`, `title`, `save`, `services`, `hub`, `town`, `campfire`, `boss`, `npc` | Town/inn behaviour, zone link |
| Edge fields `danger`, `steps`, `terrain`, `patrol`, `scripted` | Encounters |
| Event fields `outcome`, `cooldown`, `pick`; actions `offerQuest`, `openChest` | The 6 outcomes, weighted events |
| `roster` moved to zones.json | One roster per zone |
| Save: `edgeCrossings`, `edgeProgress` added | Seeding, turn-back |
| v3.9: x/y normalised 0–1 + `aspect`; edge `idx` + `edgeIdxMax`; node `fog`; action `scene`; fight kind `tutorial` + `canLose`; event `tutorial`; dialogue `tokens` | GameDev's answers, story alignment |
| v3.9.2: world `realms[]`; `exit` edge per realm overworld; outcome `portal` dropped; `world_rules.seed` hash + test vectors; `returnFeather.destinationRule`; index `content`; zone `roster` required (`fromRoster` dropped) | Realm links, exits, matching RNG in game and sim, Feather wording, realm 3–9 content |

### 14.4 IDs and references

- **Id format:** ids are lowercase snake_case. Node and edge ids are unique within their graph. Global references use `{graph, node}` or `"graph/node"`.
- **Enemy ids** are desy enemies.csv ids; `build_data.py` maps them to runtime ids with `desyId`.
- **Item ids** are runtime shop.json ids (`honey`, `feather`…) plus quest items and the proposed `bell`.
- **Quest ids:** `data/quests.json` (v2, quest/0.2) ids; also accepted: the prototype board quests.json and quests_world.json hook ids.
- **`bossDefeated`** takes a zone id.

### 14.5 Validation (`docs/tech/tools/world/validate_world.py`)

1. **JSON Schema:** every file, with `$ref` to common.
2. **Unique values:** node ids, idx (≤ idxMax), edge ids and event ids are unique. Every file is listed in index.json.
3. **References:**
   - Edge endpoints and cross-graph targets exist.
   - Stairs and portals between levels are listed on both sides.
4. **Events:**
   - Node, dialogue, quest, item and enemy references exist.
   - Every chest has `openChest`/`giveItem`, and every mini-boss has `fight`.
5. **Zones:**
   - `desyPool` is in curriculum_locations.csv. Boss, roster and elite are in enemies.csv.
   - The boss node is `kind: boss` with exactly 1 `patrol` edge, which is the zone's gate edge.
   - Every boss node belongs to exactly one zone.
6. **Per realm** (overworld plus its dungeon levels):
   - Every node is reachable from the entry.
   - No one-way traps.
   - Every node is ≤ `maxHopsToInn` from an inn or town (stairs count as 0).
   - Each zone's beeline route expects battles within `beelineBattleRange`.
   - Towns + villages match the density rule (±1 is a warning).
7. **v3.9:**
   - Edge `idx` unique and ≤ `edgeIdxMax`. `scene` actions exist in `data/dialogue/`.
   - Speaker `panda` is an error (use `xiaolong` or `innkeeper_panda`).
   - Realm-1 lines follow D1, and `{Cxxx}` placeholders match `tokens`.
   - Every hook's giver exists. `quest` hooks list v2 ids, and their `offers` have an `offerQuest` on the node.
   - Every v2 quest's hook, giver and step nodes exist, and every giver node offers its quest.
   - The progress example validates.
8. **v3.9.2:**
   - `world.json` has `realms[]`. Each enter edge leads from the realm node to the graph's entry; each exit edge is kind `exit`, danger 0, entry → `world/<node>`; `realmBossZone` is that realm's realm-boss zone.
   - Realm 1 has no unlock or link edge; every later realm's unlock is `bossDefeated` of the previous realm-boss zone and equals the `cond` on its danger-0 link edge.
   - No `portal` outcome anywhere.
   - `world_rules.seed.testVectors` reproduce with FNV-1a 32-bit → mulberry32.
   - Every content file in `index.json` `content` exists and validates; ids equal `desyId` and are in enemies.csv; every zone of the realm has a location and a word pool; every pool item is in `items`.

Run it with `python3 tools/world/validate_world.py [data_dir] [-v]` (the CI copy; `docs/tech/tools/world/validate_world.py` is a wrapper for it since v3.9.4); exit code 1 means errors. The full gate is `CI=1 python3 tools/world/validate_all.py`. Current data: 36 graphs, 20 zones, 55 hooks (29 quest, 26 ambient), 0 errors, 0 warnings.

### 14.6 Realm 3–9 content files and the world tools (v3.9.2)

- **Content files:** `docs/data/world/content/realm_N.json` for N = 3…9 (`schema: realm_content/0.1`), listed in `index.json` `content` (`{"3": "content/realm_3.json", …}`). Realms 1–2 stay in GameDev's `src/data` tables (`tools/build_data.py`). Each file has `realm`, `title`, `G`, `maxNewPerBattle` (3), and the same row shapes as `src/data`:
  - `enemies[]`: `enemies.json` rows. Stats from `data/json/combat_data.json`, boss HP/ATK from `data/enemies/boss_hp.csv`, attack names from `data/json/enemies-art-roster.json`. `id` = `desyId` (the roster id the graphs and quests use).
  - `locations[]`: `locations.json` rows, one per zone of the realm; `id` = zone id; `mcOptions`, `reviewSlots`, `pathFights` from `data/balance/realm_location_difficulty.csv`; `bossReward` on the realm-boss zone: its combat-spec §6.3 heroic piece, which the realm-boss chest gives (combat-spec §7.2). `bossReward.heroic` is the game's gear id when the piece is in `data/items/gear_items.csv` (realm 3: `shield_t3_heroic`, Mimic Shield); the charm-type drops of realms 4–8 keep name ids (`goblin_crown` …), like `queens_crown`; realm 9 has none.
  - `pools{}`: zone id → curriculum ids, from `data/curriculum/curriculum_location_pools.csv` in authored order.
  - `items[]`: `items.json` rows for every pool item (`data/curriculum/curriculum.csv`).
  - GameDev-owned placeholders: emoji, color, bg, `headAnchor` 0.1, `sprite` (the id when no sheet exists, i.e. emoji fallback), `mech` `{}`, roster weights 1, `altZh`/`altEn` `[]`.
- **Tools** (`docs/tech/tools/world/`, run from the repo root; `WORLD_OUT=dir` writes elsewhere, `DESY_ROOT` runs on Desy's old tree):
  1. `make_world_data.py`: realm 1, world_rules, layout targets, hand-authored events.
  2. `world_gen.py`: realms 2–9 and dungeons, zones, `world.json` `realms[]`, exit edges (`v03.py`), index; it then runs `make_realm_content.py`.
  3. `make_schemas.py`: `schemas/*.schema.json`, including `realm_content.schema.json`.
  4. `tools/world/build_world.py` (GameDev): runtime copy in `src/data/world/` and `public/world/graphs/`.
  Re-running 1–3 reproduces `docs/data/world/` byte for byte.
- **Quest steps on the graphs:** `escort` and `words` steps have runtime rules in `docs/story/quests.md` §2a (escortees follow, can't be harmed and wait at the last inn after a defeat; `words` counts correct battle answers from a pool). The graphs only hold their nodes and hooks.

## 15. Open questions

**For Jack**
- J1. Accept beeline +3–6% time for savers (75% saver +0.6 h, 18.5 h) and +9–11 defeats for 50% kids? Or should inns sit closer in realms 1–3, or should players start with 2 Feathers?
- J2. Explorer time is +16–26% for savers (75% saver 22.3 h) and +49–61% for spenders and reading kids. Keep the optional branches as they are, trim branches in realms 6–9, or move most of them into the 4 optional dungeons?
- J3. ~~Inn warp~~ removed in v3.9. Feather at 2×G with kids keeping 1 in reserve keeps spell buying at v3.8 levels. Accept +2.5 to +3.8 defeats for 50% savers on beeline, or apply a §8.1 fix?
- J4. Fog of war: approved (v3.9). Still open: should the repel item (`bell`) go in the shop?
- J5. Realm 1 keeps all 3 zones and all branches; the prototype ships meadow only (approved). Start with 2 Feathers (approved; see §12.1 for the small conflict).

**For GameDev**
- G1. ~~graph/0.3~~ accepted.
- G2. ~~x/y~~ normalised 0–1 (done in v3.9, with `aspect`).
- G3. ~~world_rules~~ stays its own file (`src/data/world/world_rules.json`).
- G4. Should build_data.py generate `src/data/world/*.json` (camelCase as here) from `docs/data/world/`, with the validator in CI?
- G5. Return Feather UI: item menu → pick "last inn" or a visited town/village from a list. OK?
- G6. ~~Tutorial~~ moved to the village `firstEnter` event (v3.9). New action `scene` plays `data/dialogue` scenes; please support it in the event runner.
