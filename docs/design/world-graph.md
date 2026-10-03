# World graph design (v3.9.1)

Repo path: `docs/design/world-graph.md` · Data: `docs/data/world/` · Tools: `docs/tools/world/` · Spec summary: combat-spec.md §12.
Written 2026-10-02 (PT) by Desy; v3.9 update the same night (§0.1). It builds on GameDev's graph schema in `docs/architecture.md` §6 (`graph/0.2`) and publishes it as **`graph/0.3`**. GameDev's names stay wherever they work. §13 answers GameDev's 14 questions one by one.

## 0.0 What changed in v3.9.1 (Director's defaults, 2026-10-02 23:15 PT)

- **Free Return Feather in the realm-boss chests of realms 3, 6 and 8** (`world_rules.realmBossFeather`; an `on: clear` event `giveItem feather` on boss nodes `bazaar_cellars_1/boss_3`, `moonlit_crypt_2/boss_6` and `undercroft_3/boss_8`). There is no shop nudge or tip.
- **Density follows Jack's ramp:** nodes per settlement ramp 20, 25, 30 … 60 across realms 1–9. Target = `max(1, ceil(nodes / ramp))`, so no settlement serves more than the ramp. That gives 1, 1, 2, 2, 2, 3, 3, 3, 4 (v3.9: 1, 1, 1, 2, 2, 2, 3, 3, 3).
  - 3 villages were added (`realm_3/village_1x`, `realm_6/village_2x`, `realm_9/village_3x`). Each is a new leaf node with one safe road edge (`v1x`, `v2x`, `v3x`) off a main-route waypoint.
  - All existing node, edge and hook ids, node kinds and idx are unchanged. The validator now requires the exact target (+1 is a warning).
- **Inn-hop rule re-checked:** max hops to an inn are 3, 3, 3 in realms 1–3 and 5 in realms 4–9. The new villages are inns too, so coverage only improves.
- **q8_caged_beasts:** the pen-keeper fight is now a quest-gated `fight` on `beast_pens_1/deadend_3`. `beast_pens_1/miniboss_1` stays a campfire inn with no quest event. The cage step on `beast_pens_2/deadend_1` is a quest-gated story step. In general, kill steps in `data/quests.json` that list enemies become quest-gated fights.

| Realm | Nodes | Ramp (nodes per settlement) | Target = ceil(nodes / ramp) | Actual towns + villages | Actual nodes per settlement | v3.9 count |
|---|---|---|---|---|---|---|
| 1 | 17 | 20 | 1 (17/20 = 0.85) | 1 | 17.0 | 1 |
| 2 | 25 | 25 | 1 (25/25 = 1.00) | 1 | 25.0 | 1 |
| 3 | 41 | 30 | 2 (40/30 = 1.33) | 2 | 20.5 | 1 |
| 4 | 60 | 35 | 2 (60/35 = 1.71) | 2 | 30.0 | 2 |
| 5 | 80 | 40 | 2 (80/40 = 2.00) | 2 | 40.0 | 2 |
| 6 | 106 | 45 | 3 (105/45 = 2.33) | 3 | 35.3 | 2 |
| 7 | 130 | 50 | 3 (130/50 = 2.60) | 3 | 43.3 | 3 |
| 8 | 165 | 55 | 3 (165/55 = 3.00) | 3 | 55.0 | 3 |
| 9 | 201 | 60 | 4 (200/60 = 3.33) | 4 | 50.2 | 3 |

Sim, v3.9 → v3.9.1 (100 seeds per profile):

| Profile | Mode | Hours v3.9 → v3.9.1 | Defeats v3.9 → v3.9.1 | Spells v3.9 → v3.9.1 | Feathers bought v3.9 → v3.9.1 | Feathers used v3.9 → v3.9.1 |
|---|---|---|---|---|---|---|
| 75% saver no spells | beeline | 18.50 → 18.50 (+0.0%) | 0.1 → 0.1 (-0.0) | 0.0 → 0.0 | 5.5 → 3.6 | 6.5 → 7.6 |
| 75% saver no spells | explore | 22.25 → 22.36 (+0.5%) | 0.0 → 0.0 (+0.0) | 0.0 → 0.0 | 11.8 → 9.4 | 13.8 → 14.3 |
| 75% saver free | beeline | 18.66 → 18.64 (-0.1%) | 0.0 → 0.0 (+0.0) | 4.8 → 4.9 | 15.2 → 12.6 | 16.6 → 16.9 |
| 75% saver free | explore | 22.12 → 22.23 (+0.5%) | 0.1 → 0.0 (-0.0) | 8.0 → 8.6 | 25.3 → 23.9 | 27.5 → 29.1 |
| 50% saver free | beeline | 28.02 → 28.02 (-0.0%) | 51.6 → 51.5 (-0.1) | 0.2 → 0.2 | 8.3 → 5.9 | 9.3 → 10.0 |
| 50% saver free | explore | 31.24 → 31.28 (+0.1%) | 14.1 → 13.6 (-0.5) | 4.8 → 5.5 | 24.2 → 22.9 | 26.4 → 28.0 |
| 50% saver no spells | beeline | 27.97 → 27.97 (+0.0%) | 52.2 → 51.7 (-0.5) | 0.0 → 0.0 | 7.6 → 5.5 | 8.7 → 9.5 |
| 50% saver no spells | explore | 31.37 → 31.56 (+0.6%) | 25.0 → 25.5 (+0.5) | 0.0 → 0.0 | 14.6 → 11.9 | 16.6 → 16.9 |
| 50% spender free | beeline | 20.50 → 20.46 (-0.2%) | 71.1 → 70.9 (-0.2) | 0.0 → 0.0 | 0.1 → 0.1 | 1.1 → 4.2 |
| 50% spender free | explore | 25.92 → 26.34 (+1.6%) | 30.0 → 29.3 (-0.7) | 3.2 → 3.8 | 4.9 → 4.4 | 7.3 → 9.8 |

- **Time:** within ±0.6% for savers; spender explorers +1.6–2.0% (more villages to visit).
- **Defeats:** −0.1 to −0.5 for 50% savers on beeline. The boss Feathers replace about 2–2.5 bought Feathers (5.9 vs 8.3 for 50% savers) rather than adding many extra flights. The +3–4 defeats vs v3.8 (§8.1) mostly remain.
- **Spells:** unchanged on beeline (75% saver 4.9). Explorers buy a little more (75% saver 8.0 → 8.6; 50% saver 4.8 → 5.5).

## 0.1 What changed in v3.9

- **No free inn warp.** The Return Feather (`world_rules.returnFeather`) is the only fast way back to a town. It costs **2×G** (2 normal kills at every tier; 12 gold in realm 1 → 144 in realm 9). It flies to the **last inn used or any visited town or village**, and works anywhere on the map outside battle and the boss room. Carry limit 3. Sold in town and village item shops, **not at inns**. Kids start with 2 (§12.1).
- **Town/village density:** towns + villages = `max(1, round(nodes / (20 + 5(t−1))))` in v3.9, which gave 1, 1, 1, 2, 2, 2, 3, 3, 3 (v3.8 had 1, 1, 2, 2, 2, 3, 3, 4, 4). **v3.9.1 uses `ceil` → 1, 1, 2, 2, 2, 3, 3, 3, 4 (§0.0).** Extra settlements are villages (inn + save + item shop with Feathers).
- **Inn rule per realm:** `maxHopsToInn` is 3 in realms 1–3 and 5 in realms 4–9. Standalone campfire inns fill the gaps (realm 3 now has 8 inns, realm 9 has 21).
- **Fog of war (approved):** visited nodes plus "?" for nodes one open edge away. Towns, villages and bosses are landmarks (`fog: "landmark"`): shown once their zone is open. Revealed state lives in player progress (`progress.schema.json`), never in the graph file.
- **graph/0.3 accepted by GameDev.** Node `x`/`y` are now normalised 0–1 per graph (0.05–0.95, with the graph's `aspect` = width/height). Edges carry a stable `idx` (`edgeIdxMax`) for the `walked` bitset. `world_rules.json` stays its own file.
- **Tutorial as data:** the realm-1 village `firstEnter` event plays scene `sc_r1_opening` (data/dialogue), then `meadow_intro`, then the tutorial battle (`fight {kind: tutorial, canLose: false}`, one horned rabbit), then the after-line. A later `enter` event plays `sc_r1_village_banter` once Clover Hills is beaten. New action `scene`.
- **Story alignment:** the companion speaker is `xiaolong` (小龙, the baby dragon). Pandas are the innkeepers (`innkeeper_panda`, "every inn's panda is a cousin"). Realm-1 lines follow story density D1 (English lines with at most one `{Cxxx}` word token, tokens in at most 30% of lines); the validator checks it.
- **Quest hooks reconciled with `data/quests.json` (quest/0.2):** 55 NPC slots in `quests_world.json`; 29 are `status: "quest"` (giver or step of a v2 quest; givers carry `offerQuest <v2 id>`), 26 are `status: "ambient"` (repeatable one-line banter).
- **Sim:** with no warp, the time and spell numbers match v3.8 within 1% once kids keep 1 Feather in reserve for the shop trip. 50% savers on beeline take +2.5 to +3.8 defeats over the campaign (§8.1).

## 0. Summary

- **Every map is a graph.** There is one world graph (9 realm nodes), one overworld graph per realm, and one graph per dungeon level. Towns and villages are nodes that open the existing town screens (`screens.ts`); a town interior is not a graph.
- **Random battles happen on edges.** Each edge has a `danger` (0–3) and `steps` (encounter rolls along it). Nodes are places: towns, inns, forks, chests, NPCs, story spots, mini-bosses, bosses, stairs and portals.
- **Arriving at a node runs at most one event.** There are 7 outcomes: quest offer (hook only), nothing, quest-linked mini-boss, quest item, portal, story, and treasure. Each event is fixed or weighted, and once, cooldown or repeatable. All randomness is seeded, so reloading never re-rolls.
- **Zone = location.** Each of the 20 locations (L1.1…L9.2) is a zone with its own word pool, roster and boss, placed on the graphs through `zones.json`. One zone can span several dungeon levels. All learning rules stay as they are: 7-item sets, at most 3 new items, the patrol rule (speech 20%, reading 40%), forced patrols and boss gates.
- **Safe edges:** no random battles on edges that touch a town or inn, on the boss-approach edge, or on stairs and portals. After a boss or mini-boss is cleared, the way you came back to the nearest inn stays safe for 20 hops or until the next inn rest. Walked edges drop to 5% of their rate, and each zone has a budget of 8 fresh battles. Encounter rates rise by 10% per dungeon level.
- **Size grows from 17 nodes in realm 1 to 200 in realm 9.** Later realms get more villages, deeper dungeons (up to 5 levels) with inns inside them, dead ends (about 30–38% of nodes) and optional treasure, story and mini-boss branches. Every node is at most 3 hops from an inn in realms 1–3 and 5 hops in realms 4–9.
- **Sim results (100 seeds per profile):**
  - **Beeline** (straight to each boss): pacing stays close to v3.7. The 75% saver takes 18.5 h (v3.7 17.96 h), with about 7.4 path battles per zone where v3.7 had 8. Patrols, readiness at the gate and gold barely move.
  - **Explorer** (visits every node): takes 22.4 h, because of optional branches with about 4.7 extra battles per zone. That is optional content, not required time.
  - **Time:** beeline adds 1–12% to the time (+0.6 h for the 75% saver).
- **Cost:** 50% kids get about 11–15 more defeats over the campaign than v3.7 (v3.8: 9–11), because walking to an inn is no longer free and v3.9 has no warp.
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
| `village` | Outpost in a big realm | story | inn + save + item shop (sells Return Feathers) | No magic shop or smith: fly to a town with a Feather. Density rule (v3.9.1): 1 village in realms 3–5, 2 in realms 6–8, 3 in realm 9 |
| `inn` | Inn or campfire (`campfire: true`) | story on first visit | rest + save | Every node is ≤ `maxHopsToInn` hops from an inn or town (3 in realms 1–3, 5 in 4–9). No Feathers for sale. Each boss has an **approach inn** next to its gate edge |
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
- **Actions** (GameDev's list plus 3): **`scene`** (v3.9: play a `data/dialogue/<id>.json` scene), `dialogue`, `toast`, `fight`, `giveItem`, `giveGear`, `giveSkill`, `giveGold {G}` (gold in G units, × towns.json G of the realm), `startQuest`, **`offerQuest`** (new: the hook shows Accept/Later), `setFlag`, `openShortcut`, `defeatBoss`, `unlockGraph`, `heal`, `teleport`, **`openChest`** (new).
- **Dialogue:** GameDev's `dialogue` map in each graph file: `{id: [{speaker, en, tokens?, zh?, vo?}]}`. As in the story scenes, `en` may hold `{Cxxx}` word-token placeholders listed in `tokens`; `zh` is optional. Speakers come from the graph's `npcs` map or the shared `speakers` (`xiaolong`, `innkeeper_panda`, `narrator`, `hero`…). Events only reference dialogue ids; longer story beats are `scene` actions.

## 6. Existing systems on the graph

| System (v3.7) | On the graph |
|---|---|
| Word pools: 7 items per battle, ≤ 3 new, 47–60 items per location | Per **zone**. Every random battle on an edge uses the zone of the edge, so the learning model is unchanged. Patrols and the boss use the same zone |
| Enemy tiers, elites | Zone `tier`, `roster`, `elite`; scripted elites on edges (`scripted`) replace prototype "fight 4 = elite" |
| Patrol rule (speech 20%, reading 40%; 2 forced patrols per trip) | At the **approach inn**: the boss edge has `patrol: true`. Train/patrol happens there (§13 Q8). Re-armed by resting at any *other* inn (save `graphState.approachArmed`, as in the prototype) |
| Boss gates and unlocks | A boss node blocks every edge through it until its zone is beaten. Next-zone edges carry `cond: {bossDefeated}`. Realm unlocks are on the world graph |
| Inns, midpoint inn, save points | `inn` nodes (`save: true`), ≤ 3 hops away in realms 1–3 and ≤ 5 in realms 4–9; campfires are inns. Inn price = towns.json G of the realm |
| Return Feather | v3.9: flies to the last inn used or any visited town/village; usable anywhere outside battle and the boss room. 2×G, carry 3, start with 2. Town/village item shops only |
| Magic shop, gear smith | In towns only. v3.9: the v3.8 inn warp is **removed**. To shop from deep in a dungeon, walk (≤ 6 hops) or fly to a town with a Feather and fly (or walk) back to the last inn |
| Quests | v3.9: the 50 v2 quests live in `data/quests.json` (quest/0.2). Their givers and steps point at graph nodes; `quests_world.json` lists the NPC slots (29 quest, 26 ambient). Quest items sit on chest/dead-end nodes with `cond: questActive` |
| Chests from battles | Unchanged; `chest` nodes are extra (`openChest`) |

## 7. Size and shape per realm

**Targets** (Jack, 9:48 PM): about 15 nodes in realm 1, growing to about 200 in realm 9; maze-like with dead ends and branches; multi-level dungeons; more towns and villages later; inns inside dungeons.

Realm 1 is authored. Realms 2–9 come from `world_gen.py` (seeded), driven by the targets in `layout_targets.json`. **Battles per zone and minutes per zone** are from the 75% saver, no spells, 100 seeds:

| Realm | Graphs (levels) | Nodes | Edges | Edges/node | Branch nodes | Dead-end share | Loops | Town + villages | Inns | Dungeons | Zones (bosses) | Mini-bosses | Chests | Story/NPC | Max hops to inn | Beeline battles/zone (expected) | Battles/zone beeline · explore | Min/zone beeline · explore |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 1 (0) | 17 | 18 | 1.06 | 6 | 29% | 2 | 1 + 0 | 2 | 0 | 3 | 1 | 2 | 0/1 | ≤3 | 7.7/7.7/6.8 | 18.1 · 18.0 (v3.7 17.5) | 44.2 · 44.9 (v3.7 41.6) |
| 2 | 2 (1) | 25 | 23 | 0.92 | 4 | 32% | 0 | 1 + 0 | 3 | 1 | 2 | 1 | 3 | 1/1 | ≤3 | 7.7/6.8 | 19.9 · 19.5 (v3.7 19.7) | 50.5 · 51.9 (v3.7 48.9) |
| 3 | 2 (1) | 41 | 40 | 0.98 | 7 | 29% | 1 | 1 + 1 | 8 | 1 | 2 | 2 | 5 | 4/1 | ≤3 | 7.7/6.8 | 18.5 · 18.0 (v3.7 18.4) | 56.5 · 58.7 (v3.7 54.6) |
| 4 | 4 (3) | 60 | 57 | 0.95 | 12 | 30% | 1 | 1 + 1 | 7 | 1 | 3 | 3 | 10 | 4/1 | ≤5 | 7.6/7.1/8.5 | 15.6 · 15.8 (v3.7 15.5) | 50.6 · 55.0 (v3.7 49.6) |
| 5 | 3 (2) | 80 | 79 | 0.99 | 20 | 30% | 2 | 1 + 1 | 9 | 1 | 2 | 3 | 14 | 1/4 | ≤5 | 6.8/7.9 | 15.5 · 16.2 (v3.7 15.5) | 50.7 · 60.5 (v3.7 49.6) |
| 6 | 4 (3) | 106 | 110 | 1.04 | 26 | 30% | 8 | 1 + 2 | 13 | 2 | 2 | 6 | 13 | 12/4 | ≤5 | 7.6/7.1 | 15.7 · 17.9 (v3.7 15.8) | 58.5 · 76.2 (v3.7 57.6) |
| 7 | 5 (4) | 130 | 130 | 1.0 | 36 | 35% | 5 | 1 + 2 | 14 | 2 | 2 | 4 | 19 | 12/11 | ≤5 | 7.0/8.0 | 18.6 · 19.7 (v3.7 18.4) | 69.8 · 86.3 (v3.7 68.4) |
| 8 | 6 (5) | 165 | 163 | 0.99 | 38 | 35% | 4 | 1 + 2 | 18 | 2 | 2 | 4 | 22 | 18/12 | ≤5 | 7.6/8.0 | 17.4 · 19.2 (v3.7 17.4) | 64.7 · 86.5 (v3.7 63.4) |
| 9 | 8 (7) | 201 | 198 | 0.99 | 59 | 35% | 5 | 1 + 3 | 21 | 2 | 2 | 6 | 37 | 23/16 | ≤5 | 7.0/8.5 | 16.5 · 22.1 (v3.7 16.4) | 62.0 · 101.0 (v3.7 59.7) |

Notes:
- **Shape:** edges per node is about 1.0, so the layouts are tree-like mazes with a few loops. Dead ends are 30–38% of nodes. Branch nodes (3+ edges) grow from 6 to 52.
- **Dungeons:**
  - The dungeons and their levels are great_hive 1, bazaar_cellars 1, goblin_caves 3, hydra_lair 2, moonlit_crypt 2, old_mine 1, griffin_spire 3, cloud_caves 1, undercroft 3, beast_pens 2, demon_castle 5 and shadow_vault 2.
  - old_mine, cloud_caves, beast_pens and shadow_vault are `optional: true` treasure dungeons.
- **Explorer time:**
  - Explorer minutes per zone grow with the graph (realm 9: 101 min against 62 beeline).
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

| Profile | Mode | Hours | Δ vs v3.7 | Battles/zone (path · side · back · patrol) | Defeats (campaign) | Ready at gate | Inn stays | Feathers | Gold at end | Lowest gold |
|---|---|---|---|---|---|---|---|---|---|---|
| 50% saver no spells | v3.7 | 26.9 | +0.0% | 21.6 (8.0 · 0.0 · 0.0 · 11.5) | 40.5 | 0.04 | 225+0 | 0 | 5727 | 28 |
| 50% saver no spells | beeline | 27.97 | +4.0% | 22.2 (7.6 · 0.0 · 1.3 · 12.2) | 51.7 | 0.03 | 201+0 | 9.5 | 5593 | 28 |
| 50% saver no spells | explore | 31.56 | +17.3% | 22.1 (7.0 · 5.0 · 2.7 · 6.4) | 25.5 | 0.13 | 222+0 | 16.9 | 18418 | 29 |
| 50% saver free | v3.7 | 26.92 | +0.0% | 22.1 (8.0 · 0.0 · 0.0 · 12.0) | 36.7 | 0.03 | 255+0 | 0 | 5405 | 28 |
| 50% saver free | beeline | 28.02 | +4.1% | 22.4 (7.6 · 0.0 · 1.3 · 12.4) | 51.5 | 0.03 | 210+0 | 10.0 | 5576 | 28 |
| 50% saver free | explore | 31.28 | +16.2% | 24.1 (6.7 · 5.2 · 3.1 · 8.1) | 13.6 | 0.11 | 319+0 | 28.0 | 6543 | 29 |
| 50% spender no spells | v3.7 | 18.27 | +0.0% | 13.6 (8.0 · 0.0 · 0.0 · 2.0) | 59.7 | 0.05 | 139+1 | 0 | 3834 | 12 |
| 50% spender no spells | beeline | 20.46 | +12.0% | 15.1 (7.8 · 0.0 · 1.4 · 4.4) | 70.9 | 0.03 | 116+1 | 4.2 | 4579 | 20 |
| 50% spender no spells | explore | 27.53 | +50.7% | 18.0 (7.1 · 5.0 · 2.7 · 2.0) | 40.4 | 0.13 | 176+0 | 5 | 15454 | 20 |
| 65% saver no spells | v3.7 | 20.65 | +0.0% | 18.1 (8.0 · 0.0 · 0.0 · 9.0) | 2.7 | 0.05 | 161+0 | 0 | 20877 | 29 |
| 65% saver no spells | beeline | 21.39 | +3.6% | 18.3 (7.4 · 0.0 · 0.8 · 9.1) | 3.3 | 0.05 | 154+0 | 8.7 | 21258 | 30 |
| 65% saver no spells | explore | 25.31 | +22.5% | 19.2 (6.7 · 4.9 · 2.2 · 4.4) | 0.9 | 0.16 | 164+0 | 15.8 | 43082 | 31 |
| 65% saver free | v3.7 | 20.76 | +0.0% | 19.8 (8.0 · 0.0 · 0.0 · 10.8) | 0.8 | 0.03 | 237+0 | 0 | 4123 | 29 |
| 65% saver free | beeline | 21.57 | +3.9% | 19.8 (7.4 · 0.0 · 1.0 · 10.4) | 1.2 | 0.04 | 217+0 | 16.6 | 5181 | 30 |
| 65% saver free | explore | 25.14 | +21.1% | 20.6 (6.6 · 5.0 · 2.7 · 5.3) | 0.5 | 0.14 | 231+0 | 29.9 | 5160 | 31 |
| 65% spender no spells | v3.7 | 14.29 | +0.0% | 11.3 (8.0 · 0.0 · 0.0 · 2.0) | 7.7 | 0.05 | 106+0 | 0 | 9785 | 14 |
| 65% spender no spells | beeline | 15.24 | +6.6% | 11.7 (7.5 · 0.0 · 0.8 · 2.4) | 8.0 | 0.05 | 95+0 | 4 | 11087 | 25 |
| 65% spender no spells | explore | 23.09 | +61.5% | 16.4 (6.7 · 4.9 · 2.2 · 1.6) | 2.1 | 0.16 | 143+0 | 5 | 41099 | 25 |
| 75% saver no spells | v3.7 | 17.96 | +0.0% | 17.1 (8.0 · 0.0 · 0.0 · 8.1) | 0.1 | 0.06 | 120+0 | 0 | 27386 | 30 |
| 75% saver no spells | beeline | 18.5 | +3.0% | 17.2 (7.4 · 0.0 · 0.5 · 8.3) | 0.1 | 0.05 | 116+0 | 7.6 | 27882 | 32 |
| 75% saver no spells | explore | 22.36 | +24.5% | 18.3 (6.8 · 4.7 · 1.9 · 3.9) | 0.0 | 0.17 | 126+0 | 14.3 | 47419 | 32 |
| 75% saver free | v3.7 | 17.96 | +0.0% | 18.2 (8.0 · 0.0 · 0.0 · 9.2) | 0.0 | 0.05 | 170+0 | 0 | 4665 | 30 |
| 75% saver free | beeline | 18.64 | +3.8% | 18.3 (7.4 · 0.0 · 0.7 · 9.3) | 0.0 | 0.05 | 161+0 | 16.9 | 4196 | 32 |
| 75% saver free | explore | 22.23 | +23.8% | 19.3 (6.7 · 4.9 · 2.2 · 4.5) | 0.0 | 0.15 | 171+0 | 29.1 | 4783 | 32 |
| 75% spender no spells | v3.7 | 12.86 | +0.0% | 11.0 (8.0 · 0.0 · 0.0 · 2.0) | 0.3 | 0.06 | 81+0 | 0 | 15213 | 14 |
| 75% spender no spells | beeline | 13.4 | +4.2% | 11.1 (7.4 · 0.0 · 0.5 · 2.2) | 0.2 | 0.05 | 74+0 | 4 | 15964 | 31 |
| 75% spender no spells | explore | 20.76 | +61.4% | 16.0 (6.8 · 4.8 · 2.0 · 1.5) | 0.1 | 0.17 | 114+0 | 5 | 46643 | 31 |
| 90% saver no spells | v3.7 | 14.86 | +0.0% | 16.2 (8.0 · 0.0 · 0.0 · 7.2) | 0 | 0.07 | 58+0 | 0 | 31248 | 33 |
| 90% saver no spells | beeline | 15.26 | +2.7% | 16.3 (7.4 · 0.0 · 0.2 · 7.7) | 0 | 0.06 | 56+0 | 5.0 | 31488 | 35 |
| 90% saver no spells | explore | 18.78 | +26.3% | 17.5 (6.9 · 4.7 · 1.5 · 3.4) | 0 | 0.17 | 62+0 | 9.3 | 51582 | 35 |
| 90% saver free | v3.7 | 14.86 | +0.0% | 16.6 (8.0 · 0.0 · 0.0 · 7.6) | 0 | 0.06 | 79+0 | 0 | 5556 | 33 |
| 90% saver free | beeline | 15.35 | +3.3% | 16.8 (7.5 · 0.0 · 0.3 · 8.0) | 0 | 0.06 | 76+0 | 15.0 | 6929 | 35 |
| 90% saver free | explore | 18.86 | +26.9% | 18.0 (6.8 · 4.7 · 1.8 · 3.7) | 0 | 0.17 | 83+0 | 24.7 | 5231 | 35 |
| 90% spender no spells | v3.7 | 11.18 | +0.0% | 11.0 (8.0 · 0.0 · 0.0 · 2.0) | 0 | 0.06 | 41+0 | 0 | 18785 | 17 |
| 90% spender no spells | beeline | 11.34 | +1.4% | 10.8 (7.4 · 0.0 · 0.2 · 2.1) | 0 | 0.05 | 39+0 | 3.8 | 18312 | 35 |
| 90% spender no spells | explore | 17.55 | +57.0% | 15.5 (6.9 · 4.6 · 1.5 · 1.5) | 0 | 0.17 | 57+0 | 4.8 | 50504 | 35 |
| 75% saver reading | v3.7 | 11.48 | +0.0% | 10.5 (8.0 · 0.0 · 0.0 · 1.5) | 0 | 0.36 | 60+0 | 0 | 17560 | 32 |
| 75% saver reading | beeline | 12.18 | +6.1% | 10.9 (7.4 · 0.0 · 0.4 · 2.1) | 0 | 0.35 | 59+0 | 7.0 | 18493 | 33 |
| 75% saver reading | explore | 18.24 | +58.8% | 14.9 (6.9 · 4.7 · 1.7 · 0.6) | 0 | 0.62 | 83+0 | 12.1 | 46349 | 33 |
| 75% spender reading | v3.7 | 11.25 | +0.0% | 10.2 (8.0 · 0.0 · 0.0 · 1.2) | 0 | 0.36 | 59+0 | 0 | 17324 | 17 |
| 75% spender reading | beeline | 11.8 | +4.8% | 10.3 (7.4 · 0.0 · 0.4 · 1.5) | 0 | 0.34 | 57+0 | 4.0 | 18160 | 33 |
| 75% spender reading | explore | 18.18 | +61.6% | 14.8 (6.8 · 4.7 · 1.8 · 0.4) | 0 | 0.62 | 83+0 | 5.0 | 47119 | 33 |

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

| Profile | Mode | Hours v3.8 → v3.9.1 | Defeats v3.8 → v3.9.1 | Spells owned at end | Feathers bought (per realm 1–9) | Feathers used | Feather gold (% of income) | Gold at end v3.8 → v3.9.1 |
|---|---|---|---|---|---|---|---|---|
| 75% saver no spells | beeline | 18.52 → 18.50 (-0.1%) | 0.0 → 0.1 (+0.0) | 0.0 → 0.0 | 3.6 (0.0 · 0.4 · 0.7 · 0.1 · 1.0 · 0.6 · 0.0 · 0.8 · 0.1) | 11.2 → 7.6 | 269 (0.7%) | 27795 → 27882 |
| 75% saver no spells | explore | 22.30 → 22.36 (+0.3%) | 0.0 → 0.0 (+0.0) | 0.0 → 0.0 | 9.4 (0.1 · 0.0 · 0.4 · 0.9 · 1.0 · 0.8 · 1.3 · 1.6 · 3.2) | 23.4 → 14.3 | 1012 (2.4%) | 45292 → 47419 |
| 75% saver free | beeline | 18.64 → 18.64 (-0.0%) | 0.0 → 0.0 (+0.0) | 4.9 → 4.9 | 12.6 (0.0 · 1.8 · 1.1 · 2.2 · 1.0 · 2.3 · 0.3 · 2.2 · 1.6) | 15.6 → 16.9 | 1024 (2.5%) | 4370 → 4196 |
| 75% saver free | explore | 22.08 → 22.23 (+0.7%) | 0.0 → 0.0 (+0.0) | 8.1 → 8.6 | 23.9 (0.1 · 1.1 · 1.9 · 3.1 · 2.3 · 3.3 · 3.5 · 3.3 · 5.2) | 29.7 → 29.1 | 2280 (5.1%) | 4439 → 4783 |
| 50% saver free | beeline | 27.92 → 28.02 (+0.3%) | 47.8 → 51.5 (+3.7) | 0.3 → 0.2 | 5.9 (0.4 · 0.9 · 1.0 · 0.7 · 0.9 · 0.7 · 0.0 · 0.9 · 0.4) | 19.6 → 10.0 | 406 (0.9%) | 5531 → 5576 |
| 50% saver free | explore | 31.14 → 31.28 (+0.5%) | 13.0 → 13.6 (+0.6) | 4.9 → 5.5 | 22.9 (0.4 · 1.9 · 1.0 · 3.2 · 1.7 · 2.8 · 3.3 · 3.2 · 5.4) | 47.5 → 28.0 | 2166 (4.0%) | 6496 → 6543 |
| 50% saver no spells | beeline | 27.93 → 27.97 (+0.2%) | 49.6 → 51.7 (+2.0) | 0.0 → 0.0 | 5.5 (0.4 · 0.5 · 1.0 · 0.6 · 0.9 · 0.6 · 0.0 · 1.0 · 0.5) | 18.5 → 9.5 | 394 (0.9%) | 5570 → 5593 |
| 50% saver no spells | explore | 31.42 → 31.56 (+0.4%) | 24.1 → 25.5 (+1.4) | 0.0 → 0.0 | 11.9 (0.4 · 0.1 · 0.9 · 1.4 · 1.0 · 0.8 · 1.4 · 1.8 · 4.0) | 35.1 → 16.9 | 1223 (2.6%) | 17747 → 18418 |
| 50% spender free | beeline | 20.47 → 20.46 (-0.0%) | 70.8 → 70.9 (+0.0) | 0.0 → 0.0 | 0.1 (0.0 · 0.0 · 0.0 · 0.0 · 0.0 · 0.0 · 0.0 · 0.0 · 0.1) | 1.0 → 4.2 | 16 (0.1%) | 4415 → 4579 |
| 50% spender free | explore | 26.08 → 26.34 (+1.0%) | 30.4 → 29.3 (-1.1) | 3.2 → 3.8 | 4.4 (0.0 · 0.2 · 0.2 · 0.3 · 0.6 · 1.0 · 0.3 · 0.7 · 1.0) | 2.0 → 9.8 | 434 (1.0%) | 6369 → 5810 |

Feather price per tier (G = gold for 1 normal kill; Feather = 2×G = 2 kills at every tier):

| Realm (tier) | G = 1 normal kill | Return Feather (2×G) | = kills | Potion | Inn night |
|---|---|---|---|---|---|
| 1 | 6 | 12 | 2 | 6 | 12 |
| 2 | 12 | 24 | 2 | 12 | 24 |
| 3 | 18 | 36 | 2 | 18 | 36 |
| 4 | 27 | 54 | 2 | 27 | 54 |
| 5 | 36 | 72 | 2 | 36 | 72 |
| 6 | 45 | 90 | 2 | 45 | 90 |
| 7 | 54 | 108 | 2 | 54 | 108 |
| 8 | 63 | 126 | 2 | 63 | 126 |
| 9 | 72 | 144 | 2 | 72 | 144 |

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
- **Feather (v3.9):** to `lastInn` or any visited town/village, from anywhere outside battle and the boss room. No inn warp.
- **Fog of war:** player progress keeps `visited`, `walked` and `revealed` bitsets per graph (node `idx` / edge `idx`). The UI shows visited nodes, "?" for nodes one open edge away, and landmark nodes (`fog: "landmark"`) once their zone is open. Schema: `progress.schema.json`, example `examples/progress_example.json`.
- **Boss retry:** `bossCheckpoint` as in v3.7 (spec §7.4).

### 12.1 Return Feather rules (v3.9)

| Field (`world_rules.returnFeather`) | Value |
|---|---|
| Price | 2×G (2 normal kills at every tier): 12, 24, 36, 54, 72, 90, 108, 126, 144 gold in realms 1–9 |
| Destinations | The last inn used, or any visited town/village (the player picks) |
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
- **Backtracking:** always allowed. Walked edges roll at ×0.05.
- **Fog of war (approved in v3.9):** visited nodes are shown, plus the neighbours of visited nodes as "?" (kind icon hidden until visited). Towns, villages and bosses (`fog: "landmark"`) are always shown once their zone is open. The revealed state is player progress, not graph data.

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
| `index.json` | `index.schema.json` | `schema: index/0.3`, `start {graph,node}`, file list, `graphs[]` (id, kind, realm, dungeon, level, status, nodes, file), `renames` |
| `world_rules.json` | `world_rules.schema.json` | Encounter and travel knobs (§4); may merge into balance.json as `world` |
| `zones.json` | `zones.schema.json` | 20 zones: id, realm, order, title, location, desyPool, pool, tier, bossNode, gateEdge, bossKind, boss, enemiesPerBattle, roster or fromRoster, packs, elite, scriptedElite, unlockRequires |
| `quests_world.json` | `quests_world.schema.json` | NPC slots (id, giver/turnIn `graph/node`, `status` quest/ambient, `quests`, `offers`, `banter`), quest items, shared speakers |
| `examples/progress_example.json` | `progress.schema.json` | Player progress example (`progress/0.3`): pos, lastInn, visitedTowns, per-graph visited/walked/revealed bitsets, eventsDone, feathers |
| `graphs/<id>.json` | `graph.schema.json` | 36 graphs: `world`, `realm_1…9`, 26 dungeon levels |
| `layout_targets.json` | – | Generator targets per realm |
| `world_realm_table.csv` | – | The §7 table |
| `diagrams/*.png, *.mmd` | – | Rendered examples |
| `schemas/common.schema.json` | – | Shared `cond`, `action`, `text`, `nodeRef`, `edgeRef` |

### 14.2 Graph file (`graph/0.3`)

```json
{"schema": "graph/0.3", "id": "realm_1", "kind": "overworld", "realm": 1, "dungeon": null, "level": 0,
 "title": {"zh": "新手草原", "en": "Starter Meadow"}, "status": "authored", "entry": "village", "idxMax": 16, "edgeIdxMax": 18, "aspect": 1.61,
 "background": {"map": "bg_map_realm_1", "battle": "bg_battle_r1"},
 "nodes": [{"id": "village", "idx": 0, "kind": "town", "x": 0.05, "y": 0.8127, "fog": "landmark", "zone": "meadow", "title": {"zh": "小山村", "en": "Little Hill Village"},
            "save": true, "services": ["inn", "save", "shop"], "hub": "village", "town": 1}, "..."],
 "edges": [{"id": "e1", "from": "village", "to": "m_fork", "kind": "path", "danger": 0, "steps": 1, "terrain": "road", "idx": 1},
           {"id": "g1", "from": "m_grass", "to": "m_crow", "kind": "path", "danger": 0, "steps": 1, "patrol": true, "terrain": "boss_approach"},
           {"id": "x_w_throne", "from": "w_throne", "kind": "exit", "to": {"graph": "world", "node": "realm_1"}, "cond": {"bossDefeated": "warren"}}, "..."],
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
| Event fields `outcome`, `cooldown`, `pick`; actions `offerQuest`, `openChest` | The 7 outcomes, weighted events |
| `roster` moved to zones.json | One roster per zone |
| Save: `edgeCrossings`, `edgeProgress` added | Seeding, turn-back |
| v3.9: x/y normalised 0–1 + `aspect`; edge `idx` + `edgeIdxMax`; node `fog`; action `scene`; fight kind `tutorial` + `canLose`; event `tutorial`; dialogue `tokens` | GameDev's answers, story alignment |

### 14.4 IDs and references

- **Id format:** ids are lowercase snake_case. Node and edge ids are unique within their graph. Global references use `{graph, node}` or `"graph/node"`.
- **Enemy ids** are desy enemies.csv ids; `build_data.py` maps them to runtime ids with `desyId`.
- **Item ids** are runtime shop.json ids (`honey`, `feather`…) plus quest items and the proposed `bell`.
- **Quest ids:** `data/quests.json` (v2, quest/0.2) ids; also accepted: the prototype board quests.json and quests_world.json hook ids.
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
   - Towns + villages match the density rule (±1 is a warning).
7. **v3.9:**
   - Edge `idx` unique and ≤ `edgeIdxMax`. `scene` actions exist in `data/dialogue/`.
   - Speaker `panda` is an error (use `xiaolong` or `innkeeper_panda`).
   - Realm-1 lines follow D1, and `{Cxxx}` placeholders match `tokens`.
   - Every hook's giver exists. `quest` hooks list v2 ids, and their `offers` have an `offerQuest` on the node.
   - Every v2 quest's hook, giver and step nodes exist, and every giver node offers its quest.
   - The progress example validates.

Run it with `python validate_world.py [data_dir] [-v]`; exit code 1 means errors. Current data: 36 graphs, 20 zones, 55 hooks (29 quest, 26 ambient), 0 errors, 0 warnings. GameDev is porting it to CI with repo-relative paths (`QUESTS_V2`, `DIALOGUE_DIR` env vars override the data paths).

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
