## 12. World graph (v3.8, updated v3.9–v3.9.3)

v3.8, 2026-10-02 (PT), Jack. Full design in `world-graph.md` (repo `docs/design/world-graph.md`); data in `data/world/` (repo `docs/data/world/`); sim in `build/world/`. This section summarises it and replaces the linear path of §7.10 (inn, 4 fights, inn, 4 fights, inn, gate, boss) as the map model. The battle, learning and economy rules of §2–§7 are unchanged.

**Model.**
- **Graphs:**
  - 1 world graph and 9 realm overworld graphs. The world graph links the realms in order; realm *N* opens when realm *N*−1's realm boss is defeated, and each realm has a danger-0 exit edge back to the world map (v3.9.2, §12.3).
  - 26 dungeon levels in 12 dungeons, one graph per level, joined by two-way stairs or portals.
  - Towns and villages are nodes that open the town screen.
- **Zones:** each of the 20 locations is a **zone** (`data/world/zones.json`): word pool, roster, elite and boss. Zones are placed on the graphs, and one zone can span several levels.
- **Battles on edges:** random battles happen on edges, with `danger` 0–3 and `steps` encounter rolls per edge.
- **Arrival events:** arriving at a node runs at most one event, the first eligible one in list order. There are 6 outcomes: quest offer (hook), nothing, quest-linked mini-boss, quest item, story and treasure (v3.8–v3.9.1 also listed `portal`; dropped in v3.9.2 because portals are edges). Events are fixed or weighted, and once, cooldown or repeatable. All randomness is seeded by save, graph, edge, crossing and step (FNV-1a 32-bit → mulberry32, §12.3), so reloading never re-rolls.

**Encounter rules** (`data/world/world_rules.json`):

| rule | value |
|---|---|
| rate per step by danger 0/1/2/3 | 0 / 0.60 / 0.85 / 0.95; × (1 + 0.1 × (dungeon level − 1)), max 0.95 |
| enemies per encounter | zone `enemiesPerBattle`, max 3 (balance.json `combat.maxEnemies`) |
| safe edges (no rolls) | touching a town, village or inn; the boss-approach edge (`patrol: true`); stairs and portals; after a boss or mini-boss clear, the way you came back to the nearest inn, for 20 hops or until the next inn rest |
| walked edge | × 0.05 per step |
| zone budget | after 8 fresh battles in a zone, fresh steps × 0.1 |
| pity | after 2 empty fresh steps the next fresh step fights |
| turn back | after a won battle mid-edge, a low-HP hero may turn back (walked steps stay walked) |
| repel (`bell`, proposed) | 6 hops without random battles on danger ≤ 2 |
| inns | every node ≤ `maxHopsToInn` hops from an inn or town (v3.9: 3 in realms 1–3, 5 in realms 4–9; stairs count 0); an approach inn next to every boss |
| ~~inn warp~~ | v3.8 only; removed in v3.9 (§12.1). Return Feather instead |
| towns + villages (v3.9.1) | max(1, ceil(nodes / (20 + 5(t−1)))), counting the main town: 1,1,2,2,2,3,3,3,4 (v3.9: round, 1,1,1,2,2,2,3,3,3) |
| fog of war (v3.9) | visited nodes + "?" neighbours; towns, villages and bosses are landmarks; state in player progress (`progress.schema.json`) |
| authoring target | each zone's shortest route expects 6.5–9.5 battles (v3.7: 8 path fights) |

**Unchanged:** the patrol rule (speech 20%, reading 40%, 2 forced patrols, re-armed by resting at another inn) now runs at the approach inn. Defeat wakes you at the last inn. (v3.9: the Return Feather also flies to visited towns and villages; §12.1, §12.3.)

**Size.** Realm 1 has 17 nodes (authored, 3 zones). Later realms have 25 / 40 / 60 / 80 / 105 / 130 / 165 / 200 nodes, with 28–35% dead ends, 0–2 villages (v3.9), 2–21 inns and up to 5 dungeon levels. Realms 2–9 are generated reference layouts for the writers to replace. The per-realm table is `data/world/world_realm_table.csv`.

**Sim** (100 runs per profile, speech on unless noted; `data/sim/sim_world_v38.csv`):
- **Beeline** (straight to each boss) against the v3.7 loop: savers take +3–6% (75% saver 17.96 → 18.52 h), spenders +1–12%, reading kids +5–6%.
  - Path battles per zone: 7.4 (v3.7: 8). Patrols, readiness at the gate, gold and inn stays are about the same.
  - 50% kids have +9 to +11 defeats per campaign (saver 40.5 → 49.6).
- **Explorer** (every node): +16–26% for savers (75% saver 22.3 h) and +49–61% for spenders and reading kids. That is optional content, worth 2–3× the gold, more chests and better readiness.

**Data format.** One JSON file per graph (`graph/0.3`, building on GameDev's `graph/0.2` in architecture.md §6), JSON Schemas in `data/world/schemas/`, and `build/world/validate_world.py`. Answers to GameDev's 14 questions are in world-graph.md §13 and `world-graph-schema-answers.md`.

**v3.9 sim** (100 runs per profile, `data/sim/sim_world_v39.csv` (v3.9.1: `sim_world_v391.csv`, §12.2), no warp, Feathers bought, new density). Kids keep 1 Feather in reserve for the trip to a shop; without that reserve the 75% saver bought 3.9 spells instead of 4.9.

| profile (beeline) | hours v3.8 → v3.9 | defeats v3.8 → v3.9 | spells | Feathers bought (% of income) |
|---|---|---|---|---|
| 75% saver, no spells | 18.52 → 18.50 | 0.0 → 0.1 | – | 5.5 (1.2%) |
| 75% saver, buys spells | 18.64 → 18.66 | 0.0 → 0.0 | 4.9 → 4.8 | 15.2 (3.2%) |
| 50% saver, buys spells | 27.92 → 28.02 | 47.8 → 51.6 | 0.3 → 0.2 | 8.3 (1.5%) |
| 50% saver, no spells | 27.93 → 27.97 | 49.6 → 52.2 | – | 7.6 (1.4%) |
| 50% spender | 20.47 → 20.50 | 70.8 → 71.1 | 0 | 0.1 (0%) |

- **Explorers:** within ±0.6% of v3.8 on time; they buy 12–25 Feathers (3–5.5% of income).
- **Possible fixes if the 50%-saver defeats (+5–8%) matter:**
  - inns ≤ 3 hops in realms 4–6 too;
  - a "keep one Feather" shop nudge;
  - a Feather in the realm-boss chests of realms 3, 6 and 8.
  - A village magic shop did not help, because beeline kids never pass the villages.

### 12.1 v3.9 changes (Jack 2026-10-02 PT)

- **Return Feather** (`world_rules.returnFeather`):
  - Costs 2 × G: 12, 24, 36, 54, 72, 90, 108, 126, 144 gold in realms 1–9, which is 2 kills at every tier.
  - Destinations: the last inn used or any visited town/village (exact wording in §12.3). Usable anywhere outside battle and the boss room.
  - Sold in town and village item shops (not inns). Carry 3, start 2.
  - A typical beeline kid buys 1–2 per realm; a no-spell saver buys 0.5–1.
  - The 2 free Feathers are a small conflict with budgeting: one free round trip, which delays the first purchase by about one realm.
- **Density and inns:** towns + villages 1,1,1,2,2,2,3,3,3 (v3.8: 1,1,2,2,2,3,3,4,4); `maxHopsToInn` 3/3/3 then 5.
- **Fog of war:** visited plus "?" neighbours; landmarks (`fog: "landmark"`); bitsets in `progress.schema.json`.
- **Format (GameDev's answers):**
  - x/y normalised 0–1 with `aspect`; edges get a stable `idx`.
  - `world_rules.json` stays its own file.
  - The tutorial is the realm-1 village `firstEnter` event: scene `sc_r1_opening` → `meadow_intro` → tutorial battle (`canLose: false`) → after-line.
  - New action `scene`.
- **Story alignment:**
  - Companion speaker `xiaolong` (小龙); pandas are innkeepers (`innkeeper_panda`).
  - Realm-1 lines follow D1: English with at most one `{Cxxx}` word token per line, tokens in ≤ 30% of lines.
  - `quests_world.json` lists 55 NPC slots: 29 used by `data/quests.json` (v2), 26 ambient.

### 12.2 v3.9.1 changes (Director's defaults, 2026-10-02 23:15 PT)

- **Realm-boss Feather:** the realm-boss chests of realms 3, 6 and 8 hold 1 free Return Feather (`world_rules.realmBossFeather`; an `on: clear` event on the boss node). There is no shop nudge or tip.
- **Density ramp:** nodes per settlement ramp 20, 25, 30 … 60 across realms 1–9, and target = max(1, ceil(nodes / ramp)).

| realm | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|---|---|---|---|---|---|---|---|---|---|
| nodes | 17 | 25 | 41 | 60 | 80 | 106 | 130 | 165 | 201 |
| ramp | 20 | 25 | 30 | 35 | 40 | 45 | 50 | 55 | 60 |
| target = actual towns + villages | 1 | 1 | 2 | 2 | 2 | 3 | 3 | 3 | 4 |
| actual nodes per settlement | 17 | 25 | 20.5 | 30 | 40 | 35.3 | 43.3 | 55 | 50.2 |

- **New villages:** 3, one each in realms 3, 6 and 9. Each is a new leaf node with one safe road edge off the main route; no existing id, kind or idx changed. Inns stay within 3 hops in realms 1–3 and 5 in realms 4–9.
- **Sim vs v3.9 (100 runs):**
  - Time: within ±0.6%; spender explorers +1.6–2.0%.
  - Defeats: 50% savers on beeline −0.1 to −0.5 (51.5 / 51.7), spenders −0.2.
  - Spells on beeline unchanged (75% saver 4.9). Explorers +0.6–0.7 spells.
  - Feathers bought fall by about 2–2.5 per campaign, because the boss Feathers replace purchases.

### 12.3 v3.9.2 changes (Jack 2026-10-03 PT)

- **Realm links and unlocks** (`world.json` `realms[]`, one entry per realm: `realm, node, graph, entry, enterEdge, exitEdge, linkEdge, unlock, realmBossZone, next`):
  - Realm 1 is open from the start (`unlock: null`, no link edge).
  - Realm *N* (2–9) opens when realm *N*−1's realm-boss zone is defeated: `unlock: {bossDefeated: <zone>}`. The same condition sits on the world path `w{N−1}{N}` (danger 0). The zones are `warren`, `great_hive`, `night_bazaar`, `goblin_school`, `hydra_s_lair`, `moonlit_graveyard`, `griffin_summit` and `grand_colosseum` (unlocking realms 2–9); realm 9's realm boss is `throne_hall`.
  - The world portal `x_realm_N` leads from the realm node to the realm's entry (`realm_1/village`, `realm_N/entry_town`).
- **Exit edges to the world map:** each realm overworld has one `exit` edge from its entry settlement to its world node, danger 0, so leaving never rolls a battle: `exit_village` in realm 1 and `exit_entry_town` in realms 2–9. Each one is the graph's last edge `idx`, so no saved bitset moved. Realm 1 keeps `x_w_throne` (open once `warren` is beaten).
- **Seed hash** (`world_rules.seed`, matching `src/world/engine.ts`):
  - roll = first output of mulberry32 seeded with FNV-1a 32-bit of the key (offset 0x811c9dc5, prime 0x01000193, XOR each UTF-16 code unit then multiply mod 2^32), as uint32 / 2^32.
  - Edge key `saveSeed|graphId|edgeId|crossing|step` (`crossing` = earlier crossings of that edge, from 0; `step` from 0). A battle starts when roll < chance.
  - Event key `saveSeed|graphId|nodeId|visit` (`visit` counts this arrival, from 1); weighted pick = roll × total weight, walked down the eligible options in order.
  - Test vectors: `12345|realm_1|e1|0|0` → 199679387, 0.09237345564179122; `12345|realm_2|e3|1|2` → 1855283427, 0.2770371865481138; `12345|realm_1|village|0` → 4123396911, 0.5738876694813371. The game, the data and the validator agree on all three.
- **Feather destinations** (`returnFeather.destinationRule`): exactly two kinds. The **last inn used** is the one node where the kid last rested (a standalone or campfire inn, or a town's or village's inn); it changes at every rest. **Visited towns and villages** are every town or village node ever entered, in any realm. **Other inns never count**, even if visited. The node you stand on is not offered.
- **Arrival outcomes:** 6; `portal` is gone (no event used it).
- **Realm 3–9 content:** `docs/data/world/content/realm_3.json` … `realm_9.json` (schema `realm_content/0.1`, listed in `index.json` `content`) hold enemies, locations (one per zone), word pools and items in the same shapes as GameDev's realm 1–2 tables. Boss HP/ATK come from `data/enemies/boss_hp.csv`, MC options and review slots from `data/balance/realm_location_difficulty.csv`, at most 3 new words per battle. Every zone has an explicit roster. Details in `world-graph.md` §14.6.
- **Escort and words quest steps:** runtime rules are in `docs/story/quests.md` §2a (escortees follow the party, are never in battle, can't be harmed and wait at the last inn after a defeat; `words` counts correct battle answers from a pool, n defaults to 10).
- No balance numbers changed, so the v3.9.1 sim stands.

### 12.4 v3.9.3 changes (2026-10-09 PT)

- **Dead ends** are a shape, not a node kind: a node with one edge. The generated `deadend_k` spots are waypoints (a few are inns or mini-bosses) and do exactly what their events say; a dead end with no event is an empty end, and the game adds nothing at run time (`world-graph.md` §2).
- **q9_second_wind step 2** is the `treasure` event at `demon_castle_2/treasure_1`.
- **Gear for tiers 1–9** is listed in `docs/data/items/gear_items.csv` (same prices and stats as `gear.csv`; no re-price, no sim rerun).
- **Answer options** are unchanged: §5 and `realm_difficulty.csv` (e.g. 4 options in realm 3, with 1 fewer on a word's first-ever ask, §3.4).
