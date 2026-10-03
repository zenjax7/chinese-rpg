# World graph design (v3.8)

Repo path: `docs/design/world-graph.md` · Data: `docs/data/world/` · Tools: `docs/tools/world/` · Spec summary: combat-spec.md §12.
Written 2026-10-02 (PT) by Desy. It builds on GameDev's graph schema in `docs/architecture.md` §6 (`graph/0.2`) and publishes it as **`graph/0.3`**. GameDev's names stay wherever they work. §13 answers GameDev's 14 questions one by one.

## 0. Summary

- **Every map is a graph.** There is one world graph (9 realm nodes), one overworld graph per realm, and one graph per dungeon level. Towns and villages are nodes that open the existing town screens (`screens.ts`); a town interior is not a graph.
- **Random battles happen on edges.** Each edge has a `danger` (0–3) and `steps` (encounter rolls along it). Nodes are places: towns, inns, forks, chests, NPCs, story spots, mini-bosses, bosses, stairs and portals.
- **Arriving at a node runs at most one event.** There are 7 outcomes: quest offer (hook only), nothing, quest-linked mini-boss, quest item, portal, story, and treasure. Each event is fixed or weighted, and once, cooldown or repeatable. All randomness is seeded, so reloading never re-rolls.
- **Zone = location.** Each of the 20 locations (L1.1…L9.2) is a zone with its own word pool, roster and boss, placed on the graphs through `zones.json`. One zone can span several dungeon levels. All learning rules stay as they are: 7-item sets, at most 3 new items, the patrol rule (speech 20%, reading 40%), forced patrols and boss gates.
- **Safe edges:** no random battles on edges that touch a town or inn, on the boss-approach edge, or on stairs and portals. After a boss or mini-boss is cleared, the way you came back to the nearest inn stays safe for 20 hops or until the next inn rest. Walked edges drop to 5% of their rate, and each zone has a budget of 8 fresh battles. Encounter rates rise by 10% per dungeon level.
- **Size grows from 17 nodes in realm 1 to 200 in realm 9.** Later realms get more villages, deeper dungeons (up to 5 levels) with inns inside them, dead ends (about 30–38% of nodes) and optional treasure, story and mini-boss branches. Every node is at most 5 hops from an inn.
- **Sim results (100 seeds per profile):**
  - **Beeline** (straight to each boss): pacing stays close to v3.7. The 75% saver takes <!--H_BEE--> h (v3.7 17.96 h), with about 7.4 path battles per zone where v3.7 had 8. Patrols, readiness at the gate and gold barely move.
  - **Explorer** (visits every node): takes <!--H_EXP--> h, because of optional branches with about 4.7 extra battles per zone. That is optional content, not required time.
  - **Time:** beeline adds 1–12% to the time (+0.6 h for the 75% saver).
- **Cost:** 50% kids get about 9–11 more defeats over the campaign, because walking to an inn is no longer free.
- **Format:** one JSON file per graph, checked against JSON Schemas (`data/world/schemas/`). A validator (`validate_world.py`) checks references, two-way stairs, reachability, inn coverage and the battle budget. Realm 1 is authored by hand. Realms 2–9 are generated reference layouts (`status: "reference"`) for the writers to replace.

## 1. Map hierarchy

| Level | Graph `kind` | Count | Contents |
|---|---|---|---|
| World map | `world` | 1 (`world.json`) | 9 realm nodes (`portal`) linked in order. Realm *t*+1 opens when realm *t*'s realm boss falls (`cond: {bossDefeated: <zone>}`) |
| Realm overworld | `overworld` | 9 (`realm_1` … `realm_9`) | Main town (entry), villages, inns, the overworld zones, dungeon entrances |
| Dungeon level | `dungeon_level` | 26 levels in 12 dungeons | One graph per level, joined by `stairs` edges; an entrance `portal` edge joins level 1 to the overworld |
| Town screen | not a graph | one per town/village | `town` node with `hub` (screen id) and `town` (towns.json number, which sets prices). Villages use the same screen with fewer services |

**Zones** (`zones.json`) are the link to the curriculum. A zone is one location: word pool (`desyPool` L1.1…L9.2), roster, elite and boss. Its nodes carry `zone`, and its boss node and gate edge are referenced from the zone. Zones are ordered inside a realm (`order`, `unlockRequires`).

## 2. Node kinds

GameDev's kinds are kept. Changes: `fight`, `elite` and `gate` nodes become edge properties, since fights live on edges. `waypoint`, `miniboss` and `story` are new.

| `kind` | Meaning | Typical event | Save / rest | Notes |
|---|---|---|---|---|
| `town` | Main town of the realm | story on first visit | inn + save + all shops | `hub`, `town` (prices from towns.json G). One per realm, at the entry |
| `village` | Outpost in a big realm | story | inn + save + item shop | No magic shop or smith (use the inn warp). Realms 3–9 have 1–3 |
| `inn` | Inn or campfire (`campfire: true`) | story on first visit | rest + save | Every node is ≤ 5 hops from an inn or town. Each boss has an **approach inn** next to its gate edge |
| `waypoint` | Plain spot on a path | weighted (nothing / ambient / honey) | – | Replaces GameDev's `fight` node |
| `fork` | Waypoint with 3+ edges | weighted | – | Kind is cosmetic (map icon); the loader treats it like a waypoint |
| `chest` | Treasure spot (outcome 7) | `openChest` once | – | Often at the end of a dead-end branch; may hide a quest item |
| `npc` | Quest giver / helper | `offerQuest` once, then story | – | `npc` = id in the graph's `npcs` map |
| `story` | Lore or cut-scene spot | `dialogue` once | – | |
| `miniboss` | Optional strong fight | `fight {kind: miniboss}` once, quest-linked | – | Safe way home after the win (§4.3) |
| `boss` | Zone boss | `on: clear` events | – | `boss` = zone id. Reached only over its `patrol: true` edge |
| `lever` | Opens a shortcut | `openShortcut` | – | GameDev's lever kept (none in the reference layouts yet) |
| `stairs_up` / `stairs_down` | Level links | – | – | Edge kind `stairs` to the other level |
| `portal` | Dungeon mouth, realm node on the world map | – | – | Edge kind `portal` |
| `exit` | Leaves the realm | – | – | Realm 1 uses an `exit` edge on the realm boss node |
| `shop` | Stand-alone shop (optional) | – | – | Kept from §6; normally shops live in town/village `services` |

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
- `patrol: true` marks the boss-approach edge: no random battles, Train/patrol rule
- `scripted {enemies, fill, once, step}`: a fixed elite fight, e.g. the swift rabbit on realm 1's `e11`
- `cond` (blocks traversal while false), `opens` (shortcut id), `label`

## 4. Encounters on edges

### 4.1 Rate

Each step on an edge rolls `p = encounterRate[danger] × (1 + depthStep × (level − 1))`, capped at `maxRate`:

| danger | 0 | 1 | 2 | 3 |
|---|---|---|---|---|
| base rate per step | 0 | 0.60 | 0.85 | 0.95 |
| dungeon level 3 (+20%) | 0 | 0.72 | 0.95 (cap) | 0.95 |

- **Encounter size:** 1–3 enemies, taken from the zone's `enemiesPerBattle` and capped by balance.json `combat.maxEnemies` = 3. Enemies come from the zone `roster` (weights, `packs`). On an elite roll (balance.json `eliteReplaceChance`), one enemy becomes the zone `elite`.
- **Edges outside every zone:** they use the zone of their `to` node. A shared trunk uses the next undefeated zone.

### 4.2 Safe edges (no rolls)

1. **Next to a town, village or inn:** every edge touching one of these nodes.
2. **Boss approach:** the edge with `patrol: true` into each boss. Patrols happen there by choice (Train) or are forced (spec §7.4).
3. **Stairs and portals.**
4. **After a boss or mini-boss clear:** the way you came stays safe. That is the shortest route over edges you have already walked, from the cleared node back to the nearest inn or town. It lasts 20 hops or until the next inn rest, whichever comes first. The unexplored way forward is never made safe, because the next zone's battles must stay intact.
5. **Repel item** (`bell`, new consumable): no random battles for 6 hops on danger ≤ 2 edges. Scripted fights and patrols still happen.

### 4.3 Softeners

| Rule | Value | Why |
|---|---|---|
| Walked edge (`clearedStepMult`) | ×0.05 per step | Backtracking and inn trips stay cheap without being free |
| Zone budget (`zoneBattleBudget`, `budgetSpentMult`) | after 8 fresh battles in a zone, fresh steps roll ×0.1 | Explorers don't pay twice for every branch |
| Pity (`pityRolls`) | after 2 empty fresh steps the next fresh step always fights | Beeline battle counts stay close to the target |
| Turn back | after a won battle mid-edge, a low-HP hero may turn back; steps already walked count as walked | Keeps 50% kids from dying in the middle of long edges |

### 4.4 Determinism

Every roll is `mulberry32(hash(saveSeed | graphId | edgeId | crossing | step))`, where `crossing` counts how many times this save has walked that edge. The same goes for weighted events (`… | nodeId | visit`). Reloading or re-entering never re-rolls, and the sim uses the same rule.

### 4.5 Authoring target

Each zone's beeline route (previous boss → approach inn) should expect 6.5–9.5 battles (`beelineBattleRange`; target 8, which was v3.7's 8 path fights). The validator prints and checks this per zone.

## 5. Arrival events

### 5.1 The 7 outcomes

| `outcome` | What happens | Action(s) | Default repeat |
|---|---|---|---|
| `quest_offer` | An NPC offers a quest (hook only: `quests_world.json` holds placeholders until the quest system lands) | `offerQuest` | once |
| `nothing` | Nothing | – | repeatable (weighted) |
| `miniboss` | Quest-linked optional strong fight (2–3 enemies, one elite) | `fight {kind: miniboss}`, `giveGold`, `setFlag` | once |
| `item` | Quest item (`cond: questActive`) or a small find (honey, cooldown 4 visits) | `giveItem` | once / cooldown |
| `portal` | Travel to another graph or node | `teleport` (portal *edges* are the normal way; this is for scripted warps) | – |
| `story` | Lore, hints, boss intros | `dialogue` | once |
| `treasure` | Chest | `openChest`: `chest_normal` = normal chest, `chest_fine` = location boss chest, `chest_boss` = realm boss chest, using the desy `chest_contents` tables | once |

### 5.2 Event rules

- **Shape:** `{id, node, on, cond?, once?|cooldown?, outcome, do: [actions]}`, or `pick: [{weight, outcome, once?|cooldown?, cond?, do}]` for weighted events.
- **Triggers (`on`):** `enter` (every arrival), `firstEnter`, `clear` (boss/mini-boss won), `leave`, `rest` (inn). These are GameDev's triggers.
- **One event per arrival:** events on a node are tried in list order, and the first eligible one fires. Put specific events (quest item) before general ones (chest, ambient pick).
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
- **Actions** (GameDev's list plus 2): `dialogue`, `toast`, `fight`, `giveItem`, `giveGear`, `giveSkill`, `giveGold {G}` (gold in G units, × towns.json G of the realm), `startQuest`, **`offerQuest`** (new: the hook shows Accept/Later), `setFlag`, `openShortcut`, `defeatBoss`, `unlockGraph`, `heal`, `teleport`, **`openChest`** (new).
- **Dialogue:** GameDev's `dialogue` map in each graph file: `{id: [{speaker, zh, en, vo?}]}`. Speakers come from the graph's `npcs` map or the shared `speakers` (`panda`, `narrator`, `hero`). Events only reference dialogue ids.

## 6. Existing systems on the graph

| System (v3.7) | On the graph |
|---|---|
| Word pools: 7 items per battle, ≤ 3 new, 47–60 items per location | Per **zone**. Every random battle on an edge uses the zone of the edge, so the learning model is unchanged. Patrols and the boss use the same zone |
| Enemy tiers, elites | Zone `tier`, `roster`, `elite`; scripted elites on edges (`scripted`) replace prototype "fight 4 = elite" |
| Patrol rule (speech 20%, reading 40%; 2 forced patrols per trip) | At the **approach inn**: the boss edge has `patrol: true`. Train/patrol happens there (§13 Q8). Re-armed by resting at any *other* inn (save `graphState.approachArmed`, as in the prototype) |
| Boss gates and unlocks | A boss node blocks every edge through it until its zone is beaten. Next-zone edges carry `cond: {bossDefeated}`. Realm unlocks are on the world graph |
| Inns, midpoint inn, save points | `inn` nodes (`save: true`), ≤ 5 hops apart; campfires are inns. Inn price = towns.json G of the realm |
| Return Feather | Flies to the last inn used (`lastInn`). Carry limit 3 |
| Magic shop, gear smith | In towns. **Inn warp** (new, `world_rules.innWarp`): from any inn, warp to a visited town to shop and back to the same inn (20 s in the sim, only when buying). Without it, buying spells drops by more than half in the sim and 50% kids lose more often |
| Quests (q1–q9 board quests) | The board stays in towns (quests.json). NPC hooks (`offerQuest`) come on top. Quest items sit on chest/dead-end nodes with `cond: questActive` |
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
  - **Inn warp:** needed to keep spell buying at v3.7 levels.
  - **Turn back mid-edge:** cuts 50% defeats.
- **Main run:** 100 seeds per profile. "Battles/zone" splits into path (the shortest route to the boss), side (branches), back (walked again: inn trips, backtracking) and patrol.

<!--SIM_PROFILES-->

Reading the table:
- **Beeline vs v3.7:**
  - Time rises 3–6% for savers and reading kids (75% saver: 17.96 → 18.52 h) and 1–12% for spenders. The cost is walking time plus 0.3–1.3 back battles per zone.
  - Path battles are about 7.4 against v3.7's 8, so patrols make up the gap and readiness at the gate is unchanged.
  - Gold and inn stays are close. Savers now use Feathers (5–20 per campaign); spenders use 1.
- **50% kids:** about +9 to +11 defeats per campaign on beeline (49.6 vs 40.5 for savers). Inns are a walk away now instead of instant. Mitigations to consider: start with 2 Feathers, or make inns at most 3 hops apart in realms 1–3.
- **Explorers:**
  - Explorers pay +16 to +26% (savers) and +49 to +61% (spenders and reading kids, who barely patrol in v3.7).
  - In return they gain gold (2–3× at the end), more chests, quest rewards and readiness at the gate (0.15 vs 0.05).
  - Patrols drop by half, because exploring battles teach the same pool.

## 9. Converting the prototype

The prototype has 2 locations (`meadow` L1.1, `forest` L2.1). Each has 13 `mapNodes` in this order: inn, 4 fights, inn, 4 fights, inn, gate, boss. It also has `pathFights: 8` and `scripted` fights at positions 1/3/4/6.

| Prototype | v3.8 |
|---|---|
| `locations.json` `meadow` | Zone `meadow` in `zones.json` (`location: "meadow"`, `desyPool: "L1.1"`), placed on `realm_1` (boss node `m_crow`, gate edge `g1`). The authored realm 1 has all 3 realm-1 zones; to ship meadow only, set realm 1's `world` exit on `m_crow` (or mark zones 2–3 `inBuild: false`) |
| `forest` | Zone `forest` (L2.1) on `realm_2` (boss `boss_1`, gate edge `e5`), entry town = Honey Town (town 2) |
| `mapNodes` inn (0/4/8) | `inn` nodes; the last inn becomes the **approach inn** |
| `mapNodes` fight × 8, `pathFights: 8` | Removed. Battles come from `danger × steps` on edges (target about 8 per zone, §4.5) |
| `gate` node | `patrol: true` on the approach edge into the boss |
| `boss` node | `boss` node (`boss: <zone id>`); enemy, kind and reward stay in zones.json / locations.json `bossReward` |
| `scripted` fight 1 (first-ever rabbit) | Tutorial: the first `enter` event in the village (or keep the hard-coded tutorial) |
| `scripted` fights 3/6 (crow, grey wolf) | These are the L1.1/L1.2 bosses in v3.7, so they become boss nodes |
| `scripted` 4 / `elite` (swift rabbit, guard bee) | `scripted` on an edge (`e11` in realm 1, the edge after the first boss in realm 2) |
| `roster`, `packs`, `elite`, `enemiesPerBattle`, `unlockRequires` | Same fields in zones.json. Enemy ids are the desy ids (`horned_rabbit`…); `build_data.py` maps them with `desyId`, as for enemies.json |
| `mapNodes` x/y | Node `x`/`y` in the graph file (map pixels, 0,0 = top left) |
| `screens.ts` village (Little Hill Village, inn, shop, magic shop, 学堂, board, gate) | `town` node `village` with `hub: "village"`, `town: 1`; the gate = leaving the town node |
| balance.json `inns.nodes` | Obsolete (inns are nodes) |

GameDev said "meadow/forest become two 13-node overworld graphs from mapNodes". That is the minimal port, and it validates if the 8 fight nodes become `waypoint`s with `danger: 2, steps: 1` edges. The authored `realm_1.json` (17 nodes, 3 zones) is the recommended target.

## 10. Example: Realm 1, Starter Meadow (authored)

17 nodes, 18 edges, 3 zones:
- **meadow** (L1.1): boss Big-Beak Crow at `m_crow`.
- **clover_hills** (L1.2): Big Grey Wolf at `c_den`.
- **warren** (L1.3): Horned Rabbit King at `w_throne`, the realm boss.

Little Hill Village is the town node. Farmer Li offers the hoe hook, and the hoe is in the old well. A thief mini-boss guards the golden-carrot hook. The midpoint campfire inn sits in Clover Hills, and the boss-approach inn sits before the throne. The swift-rabbit elite is scripted on `e11`.

![Realm 1](../data/world/diagrams/realm_1.png)

```mermaid
<!--MMD:realm_1-->
```

**The village** (town node `village`, `hub: "village"`): it opens the existing screen with the Sleepy Panda Inn (rest/save), Grandma Wu's shop, the magic shop, the 学堂 (words), the quest board and the gate (back to the map). It is not a graph: the old `village_1/2` interior graphs were dropped. Its first `enter` event plays `meadow_intro`.

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
  - From §6: `pos {realm, graph, node, dungeon, level}`, `lastInn {graph, node}`, `shortcuts`, `bosses` (zone ids), `flags`, `eventsDone`, `graphState {patrolsLeft, approachArmed, bossCheckpoint}`, and `graph_progress` bitsets by node `idx`.
  - Added: `edgeCrossings` (for seeding) and `edgeProgress` (turn-back).
- **Defeat:** wake at `lastInn`, which can be on another level or in the town. Gold loss as in v3.7. Edges stay walked.
- **Feather:** to `lastInn`. **Inn warp:** inn ↔ visited towns.
- **Boss retry:** `bossCheckpoint` as in v3.7 (spec §7.4).

## 13. Answers to GameDev's 14 questions (architecture.md §17.2)

**1. Is a realm overworld one graph or several sections? Is there a top-level world map?**
One graph per realm overworld. A realm's 25–200 nodes are split between the overworld (5–93 nodes; the largest is realm 8) and its dungeon levels. Dungeons are separate graphs, one per level. If art needs it, a big overworld may split into sections joined by `portal` edges; the schema already supports that. There is a top-level world map, `world.json`, with 9 realm nodes and unlock conditions.

**2. Is the node type list right, and how do town and village differ?**
Mostly. Fights, elites and gates move to edges (`danger`/`steps`, `scripted`, `patrol`). `waypoint`, `miniboss` and `story` are added. `fight`/`elite`/`gate` node kinds are dropped, and `chest`, `npc`, `lever`, `fork`, `stairs_*`, `portal` and `exit` are kept (§2).
- **Town:** the realm's main hub, with the full screen (inn, item shop, magic shop, smith, 学堂, board) and towns.json prices.
- **Village:** a smaller outpost with inn, save and item shop only. Magic and gear come through the inn warp.

**3. Maze rules: dead ends, loops, one-way drops, backtracking, fog of war?**
- **Dead ends:** yes, 30–38% of nodes, usually ending in a chest, story spot, NPC or mini-boss.
- **Loops:** allowed (a few per realm).
- **One-way drops:** allowed only if an inn stays reachable; the validator checks for one-way traps.
- **Backtracking:** always allowed. Walked edges roll at ×0.05.
- **Fog of war:** visited nodes are shown, plus the neighbours of visited nodes as "?" (kind icon hidden until visited). Boss nodes are always shown once their zone is open.

**4. How do shortcuts open, and are they two-way after?**
By a `lever` node, an event action `openShortcut`, or a boss clear (`on: clear` → `openShortcut`). Before that the `shortcut` edge is closed (`cond: {shortcutOpen: id}`). After opening it is two-way and permanent (save `shortcuts`).

**5. Are stairs and portals always two-way, and can portals skip levels or cross realms?**
- Stairs and dungeon portals are always two-way, and both graphs list the link (validator). They are never dangerous.
- Portals may skip levels (for example an L1↔L3 return portal opened by beating the L3 boss) and may cross realms (world map ↔ realm, and post-game warps).
- Apart from these, travel goes by the inn warp: from any inn to any visited town.

**6. Where does a defeated hero respawn, especially on a dungeon level with no inn?**
At `lastInn`, the last inn rested at, with towns and villages counting as inns. If the current level has no inn, that is an inn on an earlier level or the town; the walk back is over walked edges (×0.05). The rule that every node is ≤ 5 hops from an inn (stairs count as 0) keeps this short. Big dungeons get an inn inside, such as Goblin Caves L2.

**7. Are the event triggers and actions enough, and what format for dialogue?**
Yes, with 2 actions added (`offerQuest`, `openChest`) and 3 event fields (`outcome`, `cooldown`, weighted `pick`). The conditions also gain `questDone`, `readinessAtLeast` and `visited`. Dialogue uses your `dialogue` map exactly as written: `{id: [{speaker, zh, en, vo}]}` per graph, with speakers from `npcs`.

**8. Does the patrol gate stay as a condition on the boss edge?**
No blocking condition. The boss edge carries `patrol: true` and is never blocked. Train/patrols happen at the approach inn per spec §7.4: forced patrols (2) when the pool is below the trigger (speech 20%, reading 40%), and `approachArmed` is re-armed by resting at any other inn. Keep your `graphState.patrolsLeft`/`approachArmed`.

**9. Where do node positions live, and does a 200-node level scroll or zoom?**
`x`/`y` live on each node in the graph file, in map pixels with 0,0 at the top left (the generator lays them out by BFS depth). Graphs of more than about 30 nodes scroll (drag or pan), with pinch zoom between 0.5× and 1.5×. The camera follows the hero, and fog of war keeps the view small. A single 200-node graph never happens: overworlds have at most 93 nodes and dungeon levels 4–55.

**10. Are word pools per graph, per dungeon or per node?**
Per **zone** (= location, `zones.json`). A zone can cover part of a graph, a whole graph or several dungeon levels, and every node carries `zone`. Your graph-level `pool` field is left out of graph files on purpose.

**11. Do we commit to IDs that are never reused, plus a renames map?**
Yes. Node `idx` is stable and never reused (`idxMax` grows), and save bitsets use it. String ids (graph, node, edge, zone, event) are stable too. `index.json` has `renames: {"old": "new"}` (`graph/node` keys) so old saves load. The validator checks that ids and idx are unique.

**12. Quests on town boards or from NPCs, and are kill counts level-specific?**
Both: the q1–q9 board quests stay on town boards, and NPC hooks come from `npc` nodes (`offerQuest`, placeholders in `quests_world.json`). Kill counts are realm-wide by default. A quest may narrow them with `scope: {graph}` or `{zone}`.

**13. Are chests nodes or events, and are there random encounters on paths?**
Chests are `chest` nodes that carry a `once` event (`openChest`, or a quest item first when `cond: questActive`). Random encounters happen on paths: per-step rolls on edges (§4). Battle chests stay as in v3.7.

**14. Authoring format: one JSON file per graph with JSON Schema, or CSV plus JSON?**
One JSON file per graph, plus JSON Schema (draft 2020-12, `data/world/schemas/`), plus `validate_world.py`. Tables that are naturally rows stay as JSON for now but could be CSV-generated: zones, quest hooks and rules. Realm 1 is hand-written through `make_world_data.py` (or direct JSON edits). Realms 2–9 are generated and marked `status: "reference"` until hand-authored.

## 14. Data format for GameDev

### 14.1 Files (`docs/data/world/`)

| File | Schema | Contents |
|---|---|---|
| `index.json` | `index.schema.json` | `schema: index/0.3`, `start {graph,node}`, file list, `graphs[]` (id, kind, realm, dungeon, level, status, nodes, file), `renames` |
| `world_rules.json` | `world_rules.schema.json` | Encounter and travel knobs (§4); may merge into balance.json as `world` |
| `zones.json` | `zones.schema.json` | 20 zones: id, realm, order, title, location, desyPool, pool, tier, bossNode, gateEdge, bossKind, boss, enemiesPerBattle, roster or fromRoster, packs, elite, scriptedElite, unlockRequires |
| `quests_world.json` | `quests_world.schema.json` | NPC quest hooks (giver/turnIn as `graph/node`), quest items, shared speakers |
| `graphs/<id>.json` | `graph.schema.json` | 36 graphs: `world`, `realm_1…9`, 26 dungeon levels |
| `layout_targets.json` | – | Generator targets per realm |
| `world_realm_table.csv` | – | The §7 table |
| `diagrams/*.png, *.mmd` | – | Rendered examples |
| `schemas/common.schema.json` | – | Shared `cond`, `action`, `text`, `nodeRef`, `edgeRef` |

### 14.2 Graph file (`graph/0.3`)

```json
{"schema": "graph/0.3", "id": "realm_1", "kind": "overworld", "realm": 1, "dungeon": null, "level": 0,
 "title": {"zh": "新手草原", "en": "Starter Meadow"}, "status": "authored", "entry": "village", "idxMax": 16,
 "background": {"map": "bg_map_realm_1", "battle": "bg_battle_r1"},
 "nodes": [{"id": "village", "idx": 0, "kind": "town", "x": 150, "y": 560, "zone": "meadow", "title": {"zh": "小山村", "en": "Little Hill Village"},
            "save": true, "services": ["inn", "save", "shop"], "hub": "village", "town": 1}, "..."],
 "edges": [{"id": "e1", "from": "village", "to": "m_fork", "kind": "path", "danger": 0, "steps": 1, "terrain": "road"},
           {"id": "g1", "from": "m_grass", "to": "m_crow", "kind": "path", "danger": 0, "steps": 1, "patrol": true, "terrain": "boss_approach"},
           {"id": "x_w_throne", "from": "w_throne", "kind": "exit", "to": {"graph": "world", "node": "realm_1"}, "cond": {"bossDefeated": "warren"}}, "..."],
 "events": [{"id": "m_well.1", "node": "m_well", "on": "enter", "once": true, "outcome": "item", "cond": {"questActive": "q1_hoe"},
             "do": [{"giveItem": "farmers_hoe", "qty": 1, "quest": "q1_hoe"}]},
            {"id": "m_fork.1", "node": "m_fork", "on": "enter", "pick": [{"weight": 70, "outcome": "nothing", "do": []},
              {"weight": 15, "outcome": "story", "do": [{"dialogue": "ambient"}]}, {"weight": 15, "outcome": "item", "cooldown": 4, "do": [{"giveItem": "honey", "qty": 1}]}]}],
 "dialogue": {"meadow_intro": [{"speaker": "panda", "zh": "这里是新手草原！", "en": "This is Starter Meadow! ..."}]},
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
| Event fields `outcome`, `cooldown`, `pick`; actions `offerQuest`, `openChest` | The 7 outcomes, weighted events |
| `roster` moved to zones.json | One roster per zone |
| Save: `edgeCrossings`, `edgeProgress` added | Seeding, turn-back |

### 14.4 IDs and references

- **Id format:** ids are lowercase snake_case. Node and edge ids are unique within their graph. Global references use `{graph, node}` or `"graph/node"`.
- **Enemy ids** are desy enemies.csv ids; `build_data.py` maps them to runtime ids with `desyId`.
- **Item ids** are runtime shop.json ids (`honey`, `feather`…) plus quest items and the proposed `bell`.
- **Quest ids:** quests.json (board) or quests_world.json (hooks).
- **`bossDefeated`** takes a zone id.

### 14.5 Validation (`docs/tools/world/validate_world.py`)

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

Run it with `python validate_world.py [data_dir] [-v]`; exit code 1 means errors. Current data: 36 graphs, 20 zones, 0 errors, 0 warnings.

## 15. Open questions

**For Jack**
- J1. Accept beeline +3–6% time for savers (75% saver +0.6 h, 18.5 h) and +9–11 defeats for 50% kids? Or should inns sit closer in realms 1–3, or should players start with 2 Feathers?
- J2. Explorer time is +16–26% for savers (75% saver 22.3 h) and +49–61% for spenders and reading kids. Keep the optional branches as they are, trim branches in realms 6–9, or move most of them into the 4 optional dungeons?
- J3. Is the inn warp OK? It is needed to keep spell buying and the economy at v3.7 levels.
- J4. Fog of war (visited nodes plus "?" neighbours): yes or no? Should the repel item (`bell`) go in the shop?
- J5. Realm 1 has 17 nodes and 3 zones in one overworld. Prototype mode ships meadow only. OK?

**For GameDev**
- G1. Is `graph/0.3` OK as the published format? It keeps your names, moves fights to edges, adds `zones.json`, and adds 2 actions and 3 event fields.
- G2. Node x/y space: pixels on a per-graph background, or normalised 0–1? The reference layouts use pixels and roughly 120 px per BFS layer.
- G3. Merge `world_rules.json` into balance.json as `world`, or keep a separate file?
- G4. Should build_data.py generate `src/data/world/*.json` (camelCase as here) from `docs/data/world/`, with the validator in CI?
- G5. Is the inn warp UI (inn menu → "Go to town") OK?
- G6. Keep the hard-coded first-battle tutorial, or move it to a village `firstEnter` event?
