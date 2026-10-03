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
  - **Beeline** (straight to each boss): pacing stays close to v3.7. The 75% saver takes 18.5 h (v3.7 17.96 h), with about 7.4 path battles per zone where v3.7 had 8. Patrols, readiness at the gate and gold barely move.
  - **Explorer** (visits every node): takes 22.3 h, because of optional branches with about 4.7 extra battles per zone. That is optional content, not required time.
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

| Realm | Graphs (levels) | Nodes | Edges | Edges/node | Branch nodes | Dead-end share | Loops | Town + villages | Inns | Dungeons | Zones (bosses) | Mini-bosses | Chests | Story/NPC | Max hops to inn | Beeline battles/zone (expected) | Battles/zone beeline · explore | Min/zone beeline · explore |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 1 (0) | 17 | 18 | 1.06 | 6 | 29% | 2 | 1 + 0 | 2 | 0 | 3 | 1 | 2 | 0/1 | ≤5 | 7.7/7.7/6.8 | 18.1 · 18.0 (v3.7 17.5) | 44.3 · 45.0 (v3.7 41.6) |
| 2 | 2 (1) | 25 | 23 | 0.92 | 4 | 32% | 0 | 1 + 0 | 3 | 1 | 2 | 1 | 3 | 1/1 | ≤5 | 7.7/6.8 | 19.9 · 19.7 (v3.7 19.7) | 50.5 · 52.0 (v3.7 48.9) |
| 3 | 2 (1) | 40 | 38 | 0.95 | 7 | 38% | 0 | 1 + 1 | 5 | 1 | 2 | 2 | 9 | 4/1 | ≤5 | 7.7/6.8 | 18.4 · 17.9 (v3.7 18.4) | 55.9 · 58.8 (v3.7 54.6) |
| 4 | 4 (3) | 60 | 57 | 0.95 | 12 | 30% | 1 | 1 + 1 | 7 | 1 | 3 | 3 | 10 | 4/1 | ≤5 | 7.6/7.1/8.5 | 15.7 · 15.9 (v3.7 15.5) | 50.8 · 55.2 (v3.7 49.6) |
| 5 | 3 (2) | 80 | 79 | 0.99 | 20 | 30% | 2 | 1 + 1 | 9 | 1 | 2 | 3 | 14 | 1/4 | ≤5 | 6.8/7.9 | 15.6 · 16.0 (v3.7 15.5) | 51.2 · 59.6 (v3.7 49.6) |
| 6 | 4 (3) | 105 | 107 | 1.02 | 28 | 31% | 6 | 1 + 2 | 11 | 2 | 2 | 4 | 11 | 14/7 | ≤5 | 7.6/7.1 | 15.7 · 16.9 (v3.7 15.8) | 58.7 · 72.8 (v3.7 57.6) |
| 7 | 5 (4) | 130 | 130 | 1.0 | 36 | 35% | 5 | 1 + 2 | 14 | 2 | 2 | 4 | 19 | 12/11 | ≤5 | 7.0/8.0 | 18.6 · 19.7 (v3.7 18.4) | 69.9 · 86.0 (v3.7 68.4) |
| 8 | 6 (5) | 165 | 163 | 0.99 | 34 | 36% | 4 | 1 + 3 | 15 | 2 | 2 | 4 | 25 | 17/10 | ≤5 | 7.6/8.0 | 17.6 · 19.6 (v3.7 17.4) | 65.3 · 87.6 (v3.7 63.4) |
| 9 | 8 (7) | 200 | 199 | 0.99 | 52 | 32% | 7 | 1 + 3 | 22 | 2 | 2 | 6 | 29 | 20/13 | ≤5 | 7.0/8.5 | 16.4 · 22.9 (v3.7 16.4) | 61.4 · 101.9 (v3.7 59.7) |

Notes:
- **Shape:** edges per node is about 1.0, so the layouts are tree-like mazes with a few loops. Dead ends are 30–38% of nodes. Branch nodes (3+ edges) grow from 6 to 52.
- **Dungeons:**
  - The dungeons and their levels are great_hive 1, bazaar_cellars 1, goblin_caves 3, hydra_lair 2, moonlit_crypt 2, old_mine 1, griffin_spire 3, cloud_caves 1, undercroft 3, beast_pens 2, demon_castle 5 and shadow_vault 2.
  - old_mine, cloud_caves, beast_pens and shadow_vault are `optional: true` treasure dungeons.
- **Explorer time:**
  - Explorer minutes per zone grow with the graph (realm 9: 102 min against 61 beeline).
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

| Profile | Mode | Hours | Δ vs v3.7 | Battles/zone (path · side · back · patrol) | Defeats (campaign) | Ready at gate | Inn stays | Feathers | Gold at end | Lowest gold |
|---|---|---|---|---|---|---|---|---|---|---|
| 50% saver no spells | v3.7 | 26.9 | +0.0% | 21.6 (8.0 · 0.0 · 0.0 · 11.5) | 40.5 | 0.04 | 225+0 | 0 | 5727 | 28 |
| 50% saver no spells | beeline | 27.93 | +3.8% | 22.2 (7.7 · 0.0 · 1.1 · 12.3) | 49.6 | 0.03 | 204+0 | 18.5 | 5570 | 28 |
| 50% saver no spells | explore | 31.42 | +16.8% | 22.1 (6.9 · 4.8 · 2.6 · 6.7) | 24.1 | 0.12 | 223+0 | 35.1 | 17747 | 29 |
| 50% saver free | v3.7 | 26.92 | +0.0% | 22.1 (8.0 · 0.0 · 0.0 · 12.0) | 36.7 | 0.03 | 255+0 | 0 | 5405 | 28 |
| 50% saver free | beeline | 27.92 | +3.7% | 22.4 (7.7 · 0.0 · 1.1 · 12.5) | 47.8 | 0.03 | 216+0 | 19.6 | 5531 | 28 |
| 50% saver free | explore | 31.14 | +15.6% | 24.1 (6.6 · 5.1 · 2.9 · 8.4) | 13 | 0.1 | 320+0 | 47.5 | 6496 | 29 |
| 50% spender no spells | v3.7 | 18.27 | +0.0% | 13.6 (8.0 · 0.0 · 0.0 · 2.0) | 59.7 | 0.05 | 139+1 | 0 | 3834 | 12 |
| 50% spender no spells | beeline | 20.47 | +12.0% | 15.2 (7.8 · 0.0 · 1.3 · 4.5) | 70.8 | 0.03 | 116+1 | 1 | 4415 | 20 |
| 50% spender no spells | explore | 27.28 | +49.3% | 17.8 (7.1 · 4.8 · 2.7 · 2.0) | 40.2 | 0.12 | 173+0 | 2 | 15275 | 20 |
| 65% saver no spells | v3.7 | 20.65 | +0.0% | 18.1 (8.0 · 0.0 · 0.0 · 9.0) | 2.7 | 0.05 | 161+0 | 0 | 20877 | 29 |
| 65% saver no spells | beeline | 21.33 | +3.3% | 18.3 (7.4 · 0.0 · 0.7 · 9.2) | 3.1 | 0.05 | 155+0 | 15.2 | 21242 | 30 |
| 65% saver no spells | explore | 25.17 | +21.9% | 19.2 (6.7 · 4.7 · 2.2 · 4.5) | 0.8 | 0.15 | 165+0 | 29.4 | 41647 | 31 |
| 65% saver free | v3.7 | 20.76 | +0.0% | 19.8 (8.0 · 0.0 · 0.0 · 10.8) | 0.8 | 0.03 | 237+0 | 0 | 4123 | 29 |
| 65% saver free | beeline | 21.48 | +3.5% | 19.8 (7.4 · 0.0 · 0.8 · 10.5) | 1.1 | 0.04 | 218+0 | 20.2 | 5782 | 30 |
| 65% saver free | explore | 24.96 | +20.2% | 20.6 (6.6 · 4.8 · 2.5 · 5.8) | 0.2 | 0.13 | 232+0 | 40.0 | 4488 | 31 |
| 65% spender no spells | v3.7 | 14.29 | +0.0% | 11.3 (8.0 · 0.0 · 0.0 · 2.0) | 7.7 | 0.05 | 106+0 | 0 | 9785 | 14 |
| 65% spender no spells | beeline | 15.19 | +6.3% | 11.7 (7.5 · 0.0 · 0.8 · 2.4) | 8.0 | 0.05 | 95+0 | 1 | 11193 | 25 |
| 65% spender no spells | explore | 22.98 | +60.8% | 16.4 (6.7 · 4.7 · 2.3 · 1.7) | 1.6 | 0.15 | 143+0 | 2 | 40461 | 25 |
| 75% saver no spells | v3.7 | 17.96 | +0.0% | 17.1 (8.0 · 0.0 · 0.0 · 8.1) | 0.1 | 0.06 | 120+0 | 0 | 27386 | 30 |
| 75% saver no spells | beeline | 18.52 | +3.1% | 17.3 (7.4 · 0.0 · 0.4 · 8.4) | 0.0 | 0.05 | 117+0 | 11.2 | 27795 | 32 |
| 75% saver no spells | explore | 22.3 | +24.1% | 18.4 (6.8 · 4.7 · 2.0 · 4.0) | 0.0 | 0.16 | 126+0 | 23.4 | 45292 | 32 |
| 75% saver free | v3.7 | 17.96 | +0.0% | 18.2 (8.0 · 0.0 · 0.0 · 9.2) | 0.0 | 0.05 | 170+0 | 0 | 4665 | 30 |
| 75% saver free | beeline | 18.64 | +3.8% | 18.3 (7.4 · 0.0 · 0.6 · 9.3) | 0.0 | 0.05 | 163+0 | 15.6 | 4370 | 32 |
| 75% saver free | explore | 22.08 | +22.9% | 19.2 (6.7 · 4.7 · 2.2 · 4.7) | 0.0 | 0.15 | 171+0 | 29.7 | 4439 | 32 |
| 75% spender no spells | v3.7 | 12.86 | +0.0% | 11.0 (8.0 · 0.0 · 0.0 · 2.0) | 0.3 | 0.06 | 81+0 | 0 | 15213 | 14 |
| 75% spender no spells | beeline | 13.4 | +4.2% | 11.1 (7.4 · 0.0 · 0.5 · 2.2) | 0.2 | 0.05 | 75+0 | 1 | 15967 | 31 |
| 75% spender no spells | explore | 20.62 | +60.3% | 16.0 (6.8 · 4.6 · 2.0 · 1.6) | 0.1 | 0.16 | 112+0 | 2 | 44926 | 31 |
| 90% saver no spells | v3.7 | 14.86 | +0.0% | 16.2 (8.0 · 0.0 · 0.0 · 7.2) | 0 | 0.07 | 58+0 | 0 | 31248 | 33 |
| 90% saver no spells | beeline | 15.28 | +2.8% | 16.4 (7.4 · 0.0 · 0.2 · 7.7) | 0 | 0.06 | 56+0 | 5.3 | 31404 | 35 |
| 90% saver no spells | explore | 18.68 | +25.7% | 17.5 (6.9 · 4.5 · 1.6 · 3.5) | 0 | 0.17 | 61+0 | 11.3 | 49787 | 35 |
| 90% saver free | v3.7 | 14.86 | +0.0% | 16.6 (8.0 · 0.0 · 0.0 · 7.6) | 0 | 0.06 | 79+0 | 0 | 5556 | 33 |
| 90% saver free | beeline | 15.38 | +3.5% | 16.8 (7.4 · 0.0 · 0.3 · 8.1) | 0 | 0.05 | 76+0 | 7.2 | 6613 | 35 |
| 90% saver free | explore | 18.76 | +26.3% | 17.9 (6.8 · 4.6 · 1.7 · 3.8) | 0 | 0.16 | 83+0 | 14.9 | 5105 | 35 |
| 90% spender no spells | v3.7 | 11.18 | +0.0% | 11.0 (8.0 · 0.0 · 0.0 · 2.0) | 0 | 0.06 | 41+0 | 0 | 18785 | 17 |
| 90% spender no spells | beeline | 11.34 | +1.4% | 10.8 (7.4 · 0.0 · 0.3 · 2.2) | 0 | 0.05 | 39+0 | 1 | 18208 | 35 |
| 90% spender no spells | explore | 17.44 | +55.9% | 15.4 (6.9 · 4.5 · 1.6 · 1.5) | 0 | 0.17 | 57+0 | 2 | 48407 | 35 |
| 75% saver reading | v3.7 | 11.48 | +0.0% | 10.5 (8.0 · 0.0 · 0.0 · 1.5) | 0 | 0.36 | 60+0 | 0 | 17560 | 32 |
| 75% saver reading | beeline | 12.14 | +5.8% | 10.9 (7.4 · 0.0 · 0.4 · 2.1) | 0 | 0.34 | 59+0 | 9.1 | 18295 | 33 |
| 75% saver reading | explore | 17.97 | +56.5% | 14.7 (6.8 · 4.6 · 1.7 · 0.6) | 0 | 0.6 | 82+0 | 17.7 | 43759 | 33 |
| 75% spender reading | v3.7 | 11.25 | +0.0% | 10.2 (8.0 · 0.0 · 0.0 · 1.2) | 0 | 0.36 | 59+0 | 0 | 17324 | 17 |
| 75% spender reading | beeline | 11.82 | +5.0% | 10.3 (7.4 · 0.0 · 0.4 · 1.5) | 0.0 | 0.35 | 57+0 | 1 | 18005 | 33 |
| 75% spender reading | explore | 17.96 | +59.6% | 14.6 (6.8 · 4.5 · 1.8 · 0.5) | 0 | 0.6 | 81+0 | 2 | 44768 | 33 |

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
flowchart LR
  village[["Little Hill Village<br/><i>town</i>"]]
  m_fork["Meadow crossroads<br/><i>fork</i>"]
  m_farm(["Farmer Li's field<br/><i>npc</i>"])
  m_well[/"Old well<br/><i>chest</i>"/]
  m_field["Long grass<br/><i>waypoint</i>"]
  m_grass["Hill road<br/><i>waypoint</i>"]
  m_crow{{"Crow's tree<br/><i>boss</i>"}}
  c_hills["Clover Hills<br/><i>waypoint</i>"]
  c_camp[("Midpoint campfire inn<br/><i>inn</i>")]
  c_ridge["Windy ridge<br/><i>waypoint</i>"]
  c_den{{"Wolf den<br/><i>boss</i>"}}
  w_path["Burrow path<br/><i>waypoint</i>"]
  w_lake[/"Clover lake<br/><i>chest</i>"/]
  w_tunnel["Warren tunnels<br/><i>fork</i>"]
  w_nest{{"Thief's nest<br/><i>miniboss</i>"}}
  w_camp[("Boss-approach inn<br/><i>inn</i>")]
  w_throne{{"Rabbit King's throne<br/><i>boss</i>"}}
  w_throne -. "exit" .-> X_world["→ world/realm_1"]
  village ---|"safe"| m_fork
  m_fork ---|"d1×1"| m_farm
  m_fork ---|"d1×2"| m_well
  m_fork ---|"d2×5"| m_field
  m_farm ---|"d1×2"| m_field
  m_field ---|"d2×4"| m_grass
  m_grass -.-|"boss approach"| m_crow
  m_crow ---|"d2×5"| c_hills
  c_hills ---|"safe"| c_camp
  c_hills ---|"d2×4"| c_ridge
  c_camp ---|"safe"| c_ridge
  c_ridge -.-|"boss approach"| c_den
  c_den ---|"d2×4 +elite"| w_path
  w_path ---|"d1×1"| w_lake
  w_path ---|"d2×4"| w_tunnel
  w_tunnel ---|"d2×2"| w_nest
  w_tunnel ---|"safe"| w_camp
  w_camp -.-|"boss approach"| w_throne
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
flowchart LR
  stairs_1[\"Dungeon mouth<br/><i>stairs_up</i>"/]
  path_1["Cave Mouth path<br/><i>fork</i>"]
  path_2["Cave Mouth path<br/><i>waypoint</i>"]
  path_3["Cave Mouth path<br/><i>fork</i>"]
  inn_1[("Boss-approach inn<br/><i>inn</i>")]
  boss_1{{"Giant Echo Bat<br/><i>boss</i>"}}
  stairs_2[/"Stairs down<br/><i>stairs_down</i>"\]
  path_4["Winding path<br/><i>fork</i>"]
  story_1>"Story spot<br/><i>story</i>"]
  path_5["Winding path<br/><i>waypoint</i>"]
  path_6["Winding path<br/><i>waypoint</i>"]
  npc_1(["Traveller<br/><i>npc</i>"])
  path_7["Winding path<br/><i>waypoint</i>"]
  deadend_1["Dead end<br/><i>waypoint</i>"]
  deadend_2["Dead end<br/><i>waypoint</i>"]
  treasure_1[/"Treasure spot<br/><i>chest</i>"/]
  deadend_3["Dead end<br/><i>waypoint</i>"]
  story_2>"Story spot<br/><i>story</i>"]
  treasure_2[/"Treasure spot<br/><i>chest</i>"/]
  miniboss_1{{"Mini-boss lair<br/><i>miniboss</i>"}}
  treasure_3[/"Treasure spot<br/><i>chest</i>"/]
  stairs_1 -. "stairs" .-> X_realm_4["→ realm_4/portal_1"]
  stairs_2 -. "stairs" .-> X_goblin_caves_2["→ goblin_caves_2/stairs_1"]
  stairs_1 ---|"d2×3"| path_1
  path_1 ---|"d2×3"| path_2
  path_2 ---|"d2×3"| path_3
  path_3 ---|"safe"| inn_1
  inn_1 -.-|"boss approach"| boss_1
  boss_1 ---|"d2×4 +elite"| stairs_2
  path_3 ---|"d1×1"| path_4
  path_4 ---|"d1×1"| story_1
  story_1 ---|"d1×1"| path_1
  path_4 ---|"d1×2"| path_5
  path_5 ---|"d1×1"| path_6
  path_6 ---|"d1×1"| npc_1
  path_1 ---|"d1×1"| path_7
  path_7 ---|"d1×1"| deadend_1
  path_3 ---|"d1×1"| deadend_2
  path_2 ---|"d1×1"| treasure_1
  path_4 ---|"d1×1"| deadend_3
  deadend_1 ---|"d1×1"| story_2
  treasure_1 ---|"d1×1"| treasure_2
  deadend_3 ---|"d2×1"| miniboss_1
  path_7 ---|"d1×1"| treasure_3
```
Level 2:
```mermaid
flowchart LR
  stairs_1[\"Stairs up<br/><i>stairs_up</i>"/]
  path_1["Crystal Tunnels path<br/><i>fork</i>"]
  campfire_1[("Midpoint campfire inn<br/><i>inn</i>")]
  path_2["Crystal Tunnels path<br/><i>waypoint</i>"]
  inn_1[("Boss-approach inn<br/><i>inn</i>")]
  boss_1{{"Goblin Warden<br/><i>boss</i>"}}
  stairs_2[/"Stairs down<br/><i>stairs_down</i>"\]
  deadend_1{{"Mini-boss lair<br/><i>miniboss</i>"}}
  path_3["Winding path<br/><i>waypoint</i>"]
  miniboss_1{{"Mini-boss lair<br/><i>miniboss</i>"}}
  story_1>"Story spot<br/><i>story</i>"]
  treasure_1[/"Treasure spot<br/><i>chest</i>"/]
  path_4["Winding path<br/><i>waypoint</i>"]
  path_5[("Campfire inn<br/><i>inn</i>")]
  treasure_2[/"Treasure spot<br/><i>chest</i>"/]
  stairs_1 -. "stairs" .-> X_goblin_caves_1["→ goblin_caves_1/stairs_2"]
  stairs_2 -. "stairs" .-> X_goblin_caves_3["→ goblin_caves_3/stairs_1"]
  stairs_1 ---|"d2×4"| path_1
  path_1 ---|"safe"| campfire_1
  campfire_1 ---|"safe"| path_2
  path_2 ---|"safe"| inn_1
  inn_1 -.-|"boss approach"| boss_1
  boss_1 ---|"d2×3"| stairs_2
  path_1 ---|"d1×1"| deadend_1
  path_1 ---|"d1×1"| path_3
  path_3 ---|"d2×1"| miniboss_1
  deadend_1 ---|"d1×1"| story_1
  path_3 ---|"d1×1"| treasure_1
  treasure_1 ---|"d1×2"| path_4
  path_4 ---|"safe"| path_5
  path_5 ---|"safe"| treasure_2
```
Level 3:
```mermaid
flowchart LR
  stairs_1[\"Stairs up<br/><i>stairs_up</i>"/]
  path_1["Goblin 'School' path<br/><i>fork</i>"]
  path_2["Goblin 'School' path<br/><i>waypoint</i>"]
  path_3["Goblin 'School' path<br/><i>waypoint</i>"]
  inn_1[("Boss-approach inn<br/><i>inn</i>")]
  boss_4{{"Goblin King (the 'Headmaster')<br/><i>boss</i>"}}
  treasure_1[/"Treasure spot<br/><i>chest</i>"/]
  path_4["Winding path<br/><i>fork</i>"]
  deadend_1["Dead end<br/><i>waypoint</i>"]
  story_1>"Story spot<br/><i>story</i>"]
  path_5["Winding path<br/><i>waypoint</i>"]
  deadend_2[("Campfire inn<br/><i>inn</i>")]
  treasure_2[/"Treasure spot<br/><i>chest</i>"/]
  path_6["Winding path<br/><i>waypoint</i>"]
  treasure_3[/"Treasure spot<br/><i>chest</i>"/]
  path_7["Winding path<br/><i>waypoint</i>"]
  treasure_4[/"Treasure spot<br/><i>chest</i>"/]
  treasure_5[("Campfire inn<br/><i>inn</i>")]
  treasure_6[/"Treasure spot<br/><i>chest</i>"/]
  stairs_1 -. "stairs" .-> X_goblin_caves_2["→ goblin_caves_2/stairs_2"]
  stairs_1 ---|"d2×2"| path_1
  path_1 ---|"d2×2"| path_2
  path_2 ---|"d2×2"| path_3
  path_3 ---|"safe"| inn_1
  inn_1 -.-|"boss approach"| boss_4
  path_1 ---|"d1×1"| treasure_1
  path_3 ---|"d1×1"| path_4
  path_4 ---|"d1×1"| deadend_1
  deadend_1 ---|"d1×1"| story_1
  treasure_1 ---|"d1×1"| path_5
  path_5 ---|"safe"| deadend_2
  path_4 ---|"d1×1"| treasure_2
  path_1 ---|"d1×1"| path_6
  path_6 ---|"d1×1"| treasure_3
  deadend_1 ---|"d1×1"| path_7
  path_7 ---|"d1×1"| treasure_4
  treasure_3 ---|"safe"| treasure_5
  path_4 ---|"d1×1"| treasure_6
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
