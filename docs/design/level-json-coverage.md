# Level JSON: maps without realms, word pools, map states, guests, and the migration

Repo path: `docs/design/level-json-coverage.md` · Owner: Desy · Reworked 2026-10-11 (PT) for Jack's level-editor review (via the Director), against main `3ab6924` plus the pending `handoff_level2` and `handoff_sim`.
Companion to GameDev's schema doc `docs/tech/level-editor.md` (`level/0.1`). GameDev leads the schema. This doc checks that the map format covers everything in our world, quest and dialogue data, and records how today's 36 graphs were converted into **38 map files** (`docs/data/levels/<map_id>.json`, `level/0.2`).

> **Jack's decisions applied here (2026-10-11 PT, via the Director).** They override every earlier default; older text that disagreed has been removed.
> - **J1, no realms.** Everything is maps linked to other maps through portals, with no limit on the number of maps. There is no `realm` field anywhere. Progression comes only from **links** (portal, stairs and exit edges between maps), **bosses** and **conditions** (for example, a portal that opens when a boss on another map is defeated). Anything that was keyed on a realm or tier is now a per-map setting or a link condition (§2).
> - **J2, editable word pools.** Each map has its own word pool (`settings.words`), and Jack can add and remove words in the editor. Every pool is pre-populated from today's lists (the curriculum pool of the map's location, in curriculum order). The met rule works without realms (§3). The 3-new-words cap per battle stays.
> - **J3, map states, not append-only ids.** Maps are `draft`, `beta` or `golden`. A change to a beta map resets players' progress **on that map**. **Jack's decision (2026-10-11, correction):** that map's quests reset too: every quest given on that map goes back to not-started, whatever state it was in. `retired` is dropped (§5).
> - **J4, guests** get the graph world too (§6).
> - **J5, no boss retry mechanic.** The half-HP boss checkpoint and its resume rule are removed from the spec, the data, the maps and the sim. After a loss, a boss fight starts fresh, like any fight.
> - **J6, no random strong or elite enemies.** The 10% patrol elite chance, the scripted path elite (one per realm) and the location `elite` / `scriptedElite` fields are removed from the spec, the data, the map format and the sim. Fights placed on purpose (bosses, mini-bosses, quest fights) stay. The elite enemies themselves (`role = elite` in `enemies.csv`) stay in the roster. **Jack's decision (2026-10-11):** the 9 elite enemies stay only as fixed, placed mini-bosses, never random.
> - **J7, standing rule.** No mechanic, system or rule that Jack hasn't asked for. Anything we think is needed is listed as a question (§8). The rules we added earlier and Jack never decided are listed with their origin in §9, and are kept until he rules on them.
>
> **Superseded by these:** D1 (G derived from the tier), D2 (difficulty row read from the CSV), D10 (realm_1 fallback), the append-only / retired / renames rules, Q1, Q3, Q4, Q16 and Q17 of the 2026-10-10 version, and the zone-era tables of the old §3.9. Git history keeps the old text.
> **Still in force (2026-10-10, D3–D9):** D3 (`old_mine_1/npc_1` stays an inn with Miner Gao's giver variant), D4 (optional per-map encounter-odds override), D5 (quest scenes derived from the node variants), D6 (a quest lives in its giver's map), D7 (quest `zone` dropped), D8 (one dialogue format; banter is a scene), D9 (the DB is live and wins; GameDev's box commits published maps to `docs/data/levels/`; tools, CI and the sim read that folder).

**Ground rules:**
- The editor writes the same data the game runs today. Every editor concept maps onto an existing field, condition or action (§1).
- Balance numbers that are not per map stay global: boss HP and ATK, prices, the 3-new-words cap, the battle budget and pity, the encounter-rate defaults (§9 lists which of these Jack hasn't decided).
- Source of truth (D9): the DB holds live maps and wins. `docs/data/levels/` is the committed copy (history, CI and sim input). The v3.9.x files under `docs/data/world/` are the frozen conversion input.

---

## 1. Coverage checklist

### 1.0 Jack's editor words → our data

| Jack's word | In the map file (`level/0.2`) | Note |
|---|---|---|
| map | one file `docs/data/levels/<id>.json` = one graph | the game loads, saves and hashes RNG per map |
| portal | node `kind: portal` + a `portal` edge whose `to` is `{graph, node}` in another map, with an optional `cond` | the only way maps connect (with `stairs` and `exit`, also cross-map edges) |
| boss | `settings.boss {node, gateEdge, kind, enemy, reward?}` + the boss node | at most one per map |
| village / town | node `kind: village` / `town` (+ `town` number = shop tier) | unchanged |
| treasure | event outcome `treasure` with `openChest` | unchanged |
| NPC | node `kind: npc` + `npc` id; banter and lines are scenes | unchanged |
| quest battle | quest objective `kill` on a placed `fight` (mini-boss or quest fight) or an edge battle | placed fights stay (J6) |
| word pool | `settings.words` (ordered list of curriculum ids) | editable (J2) |
| enemies | `settings.roster` (enemy + weight), `packs`, `enemiesPerBattle` | no `elite`, no `scriptedElite` (J6) |
| state | top-level `state`: `draft` / `beta` / `golden` | J3 |

### 1.1 Map structure

| Field | Today (v3.9.x) | In `level/0.2` |
|---|---|---|
| `id`, `kind` (`world` / `overworld` / `dungeon_level` / `town`), `title`, `aspect`, `dungeon`, `level`, `levels`, `optional` | graph top level | same. **No `realm`**, no `status`, no `idxMax`/`edgeIdxMax`, no `retired` |
| `entry` | `index.json` / realms[] `entry` | top level: the node a portal without a node lands on, and the reset position (§5) |
| `state` | – | `draft` / `beta` / `golden` (§5). The 38 converted maps are `beta` (Q-J3a) |
| Nodes: `id`, `idx`, `kind`, `x`/`y` 0–1, `title`, `save`, `services`, `hub`, `town`, `shops`, `campfire`, `npc`, `fog`, `quests[]` (variants) | `nodes[]` | same. Node `zone` and node `boss` (a zone id) are gone |
| Edges: `id`, `idx`, `from`, `to`, `kind` (path, stairs, portal, exit, shortcut), `danger`, `steps`, `terrain`, `patrol`, `cond`, `opens`, `label` | `edges[]` | same. **No `scripted`** (J6: the 9 scripted path elites are not converted) |
| Cross-map edges: `to: {graph, node}`, listed on both sides | edge | same. The validator requires the return link; an `exit` edge is the one allowed one-way case (today's `warren/x_w_throne`, whose way back from `world/realm_1` lands in the village) |
| Encounter odds | `world_rules` | global defaults; per map only the optional `settings.encounters` (D4; `null` = global) |
| Safe edges, walked factor, budget, pity, turn back | `world_rules` | global (origins in §9) |

### 1.2 Events and outcomes

| Field | In `level/0.2` |
|---|---|
| Event `id` (`<node>.<n>`), `node`, `on`, `outcome`, `once`, `cooldown`, `cond`, `do[]`, `pick[]`, `tutorial` | map `events[]`, unchanged. Quest-gated events moved into node quest variants (§4) and keep their ids |
| 6 outcomes, at most one event per arrival in list order | unchanged; list order is data |
| Conditions: all, any, not, flag, questActive, questReady, questDone, questClaimed, bossDefeated, visited, wordsReady, readinessAtLeast, levelAtLeast, hasItem, shortcutOpen | unchanged. `bossDefeated` names the **map** that holds the boss (zone ids were renamed 1:1: `great_hive` → `great_hive_1`, ...) |
| Actions | unchanged, except `{dialogue: key}` → `{scene: id}` (inline dialogue became scenes, D8). `unlockGraph` stays an action |
| Realm-boss chest (3 × G gold + Honey Potion + heroic piece + skill unlock) | `settings.boss.reward` on the map with the `realmboss`; the chest rule itself is global, keyed on `boss.kind = realmboss` |
| Boss Feather (today realms 3, 6, 8) | the `on: clear` event on that boss node (`giveItem feather`), already in the data; `world_rules.realmBossFeather` is no longer needed |
| Seeded picks: key `saveSeed|mapId|nodeId|visit` | unchanged (`graphId` = map id) |

### 1.3 Map settings (was: realm, tier and zone)

| Setting | Was keyed on | Now |
|---|---|---|
| `title`, `emoji`, `background {map, battle}` | zone / location | per map |
| `words` (ordered curriculum ids) + `desyPool` (the source list, read-only provenance) | zone pool (location) | per map, editable (J2, §3) |
| `G` (gold unit) | realm tier | per map, copied from today's tier table (6, 12, 18, 27, 36, 45, 54, 63, 72) |
| `recLevel [min, max]` | realm tier | per map |
| `gearTier` | realm tier (`realm_difficulty.gear_tier`) | per map: the gear tier of chests and battle drops and of the recommended-gear check; the sim uses it as the map's tier |
| `difficulty {mcOptions, reviewSlots, pathFights}` | `realm_location_difficulty.csv` by location | per map, copied (replaces D2) |
| `maxHopsToInn` | realm (3 in realms 1–3, 5 later) | per map, copied; the validator checks it per map |
| `enemiesPerBattle`, `roster`, `packs` | zone | per map |
| `encounters` | – | optional override (D4); `null` = global |
| `boss {node, gateEdge, kind, enemy, reward?}` | zone `bossNode`/`gateEdge`/`bossKind`/`boss`, content `bossReward` | per map (one boss per map) |
| shop tier | town number | unchanged: node `town` number |
| unlock order | zone `unlockRequires`, realm order, `world.json realms[]` | **link conditions only** (§2) |
| `elite`, `scriptedElite` | zone | **removed** (J6) |


**Must be in GameDev's schema:** no `realm` field anywhere (map, node, scene, quest); `state`; `entry`; `settings.words` as an ordered id list; `settings.G`, `recLevel`, `gearTier`, `difficulty`, `maxHopsToInn` stored per map; no `elite`, `scriptedElite` or edge `scripted`; no `retired`, `idxMax` or `edgeIdxMax`.

---

## 2. Progression without realms: what replaced each realm-keyed thing

Simplest faithful mapping, no new mechanics. Each row was checked by running the sim on the converted maps (§7).

| Realm- or tier-keyed thing (v3.9.x) | Now | Why this mapping |
|---|---|---|
| `G` (gold per kill) by tier | `settings.G` per map | same number on every map of the old tier, so every price and reward that is a G multiple is unchanged |
| `recLevel` by tier/location | `settings.recLevel` per map | shown in the editor; used by EXP and the gear check as today |
| Difficulty row (`mcOptions`, `reviewSlots`, `pathFights`) by location | `settings.difficulty` per map | copied from `realm_location_difficulty.csv`; now editable with the map instead of hidden in a CSV |
| Shop tier | node `town` number (unchanged) | already per node |
| Realm-boss chest (3 × G + Honey + heroic + skill) | `settings.boss.reward` + `boss.kind: realmboss` on the map that holds the boss | the reward was already per boss; only the realm key goes |
| Realm 3/6/8 boss Feather | the existing `on: clear` `giveItem feather` event on those 3 boss nodes | already data; the realm list in `world_rules.realmBossFeather` is redundant |
| Unlock order (realm N opens after realm N−1's boss; zone `unlockRequires`) | **link conditions**: each cross-map edge that used to be gated carries `cond: {bossDefeated: <map>}` | the same gates open at the same moment; the order of maps is whatever the links and bosses make it (§2.1) |
| `world.json realms[]` (`unlock`, `realmBossZone`, `next`, `linkEdge`, `enterEdge`, `exitEdge`) | dropped. The `world` map is an ordinary map: 9 portal nodes `realm_1` … `realm_9`, portal edges `x_realm_N` with `cond: {bossDefeated: <previous realm boss map>}`, world paths `w12` … `w89` with the same cond | the world map was already a graph; only the side table goes |
| Exit edges (realm overworld → world node) | unchanged `exit` edges | they are links |
| `maxHopsToInn` 3/5 by realm | `settings.maxHopsToInn` per map | copied (the inn-distance check is still in `validate_world` on the seed; not ported to `validate_levels` yet) |
| Town density ramp by realm | an authoring check only, not a game rule; still in `validate_world` on the seed, not ported to maps | no realm to count nodes over; whether to keep a per-map form is Jack's call (§9) |
| The realm number in the HUD / quest log / saves | the map title; saves key on map ids already | – |
| Quest `realm`, `pool`, `zone`, `hook` | dropped; the quest lives in its giver's map (D6); kill scopes that said "anywhere in realm N" list the maps | – |
| Scene `realm`, `zone` | dropped; a scene lives in its trigger map | – |

### 2.1 Unlock order from the links (no realm order)

`world_loader.unlock_order()` walks the links from the start node (`index.json start`), treats every unbeaten boss node as a wall and every `bossDefeated` condition as closed until that boss falls, and beats the reachable bosses one at a time. On the converted maps it gives exactly today's order: realm_1, clover_hills, warren, realm_2, great_hive_1, realm_3, bazaar_cellars_1, goblin_caves_1 … demon_castle_5 (the `ci` mode checks this against `zones.json`). The same walk is the met rule's clock (§3) and the validator's reachability check.

### 2.2 The realm_1 split and the 9 doorways (converted; still Director defaults, not Jack's)

- `realm_1` held three locations with three bosses. It is now 3 maps: `realm_1` (village + Meadow, ids and idx unchanged), `clover_hills` and `warren`, joined by portal links (`c_gate`, `w_gate`) with `bossDefeated` conditions. Battles, pools and bosses are as today.
- The 9 one-node "doorways" (the portal or stairs node of the next location after a boss) moved with their approach edge into the next map, behind a new `entry_gate` node. That keeps the 5 realm-boss locations at 6.5–9.5 own-word battles before the boss (sim, §7).
- Both are the Director's working defaults from 2026-10-10. They are in the converted maps; Jack can still undo either in the editor (Q-J8).

---

## 3. Word pools and the met rule (J2)

- **Pre-populated:** `settings.words` = the curriculum pool of the map's location from `curriculum_location_pools.csv`, in curriculum order (47–60 ids). Maps that shared a location (dungeon floors) each get their own copy. `world` has an empty pool. `desyPool` stays as read-only provenance.
- **Editable:** Jack adds and removes ids in the editor. Ids come from the curriculum (`C001` …); the validator rejects unknown ids.
- **Per-battle cap:** at most 3 new words per battle, as today.
- **Battle state:** the per-pool battle state (readiness, the patrol trigger, the battle budget) is keyed by the map's pool as today. Maps whose word lists are identical share it, as dungeon floors share a location today (see §9 for the budget reset, which Jack hasn't decided).

**Met rule proposal (Desy):** a word is *met* when it is in the pool of a map the player can have reached by the time the scene can play. Concretely, with the unlock walk of §2.1 (round r = after r bosses):
- a scene in map M with trigger condition C can first play in the round when M is reachable **and** C can be true (a `bossDefeated: X` in C means "after X's round");
- the met words are the pools of every map reachable in that round.

This is "map order along links", not the player's actual history. Why: it is a property of the data, so the editor can check it on save and the validator can check it in CI, and it gives the same answer for every player. The player's actual progress would make the same line valid for one kid and invalid for another. On the converted data all 206 scenes pass (0 met-rule warnings).

**Edge cases:**
- Removing a word from a pool can make a scene fail the met rule; the editor shows the warning on the scene.
- A word added to an early map becomes met for every later scene.
- Quest `words` steps name a map (`map`, was `pool`) and count correct answers to that map's words.

---

## 4. Quest-state variants (unchanged from 2026-10-10, map ids instead of levels)

| Jack's state | Runtime state | Today's condition | What plays |
|---|---|---|---|
| pre-quest | available (`requires` met), not started | `not questActive`, `not questDone` | `offerQuest` → offer scene |
| in-quest | `active` (→ `ready` before turn-in) | `questActive` / `questReady` | at the giver: progress scene; at step nodes: the item, fight or line |
| post-quest | `completed` | `questDone` | turn-in scene + rewards once; later an ordinary line |

```json
{"id": "m_farm", "kind": "npc", "npc": "farmer_li",
 "quests": [{"quest": "q1_hoe", "role": "giver",
   "pre": {"scene": "sc_q1_hoe_offer"}, "in": {"scene": "sc_q1_hoe_wait"}, "post": {"scene": "sc_q1_hoe_thanks"}}]}
```

- `role`: `giver`, `turnIn` or `step`. A step's `in` holds an ordinary event body (`do`, `outcome`, `cond`) and keeps the old event id, so `eventsDone` keys don't change.
- The quest definition lives in the giver's map (`quests[]`); steps reference nodes as `{graph, node}`, in any map. The converted maps carry 50 quests and 144 variants; every step with a place has its variant (validated).
- The converted quests still carry quest/0.2 `scenes` so the engine runs unchanged; per D5 the editor derives them from the variants and doesn't show them twice.
- Kept as data, not new rules: steps are in order; the in-quest item is visible while the quest is active (the editor warns about steps placed out of order).

---

## 5. Map states, resets, saves, RNG and fog (J3)

| State | Who sees it | Edits | Effect on players |
|---|---|---|---|
| `draft` | Jack (editor preview) only | free, ids free | none; players can't enter. A link into a draft map stays closed for players |
| `beta` | everyone | free, ids may change | publishing a change **resets every player's progress on that map** |
| `golden` | everyone | ids and idx are frozen; text, weights, rewards and odds may change | no reset; saves keep working |

**What a reset clears** (everything keyed on that map, nothing else): `visited` / `walked` / `revealed` bitsets (fog of war) for the map; `eventsDone` / `eventLastFired` entries of its events (so its chests and once-events come back); its edge crossing and node visit counters; its shortcuts; `edgeProgress` on its edges; and **every quest given on that map, which goes back to not-started, whatever state it was in** (Jack's decision, 2026-10-11, correction). A player standing on the map moves to its `entry`; a `lastInn` on it moves to the map's entry if that is a save point, or else to the start. Not cleared: gold, gear, EXP, spells and other maps' progress. **Director's working defaults (2026-10-11, pending Jack, not locked):** (a) a completed quest's reward can be earned again after a reset; (b) quests given on another map are unaffected, even if they have steps on the reset map; (c) quest items the player holds are kept. Not ruled yet: the map's boss (Q-J3b).

**Saves:**
- A save records, per map it has progress on, the published **version** (or content hash) it last saw: `mapVersions {mapId: version}`. That field is needed by Jack's reset rule; it is the only save change.
- On load (and when a new version arrives mid-session, at the next map change), every beta map whose version differs is reset as above. Golden maps never reset; draft maps don't appear.
- Because beta resets clear the map's bitsets, `idx` values on a beta map may be renumbered freely, so `idxMax` / `edgeIdxMax` / `retired` are gone. On a golden map the editor locks ids and idx.
- `zonesDefeated` holds boss **map** ids; old saves migrate once with the 1:1 table (`great_hive` → `great_hive_1`, ...). The realm_1 split moves Clover Hills and Warren bits to their new maps once.

**RNG:** keys are `saveSeed|mapId|edgeId|crossing|step` and `saveSeed|mapId|nodeId|visit`, never idx or list positions. A reset sets the map's crossing and visit counters back to 0, so a reset map replays the same rolls as a fresh save (deterministic, as reloading is today). On a beta map a renamed edge gets a new roll stream; unchanged ids keep theirs. The 3 test vectors don't change.

**Fog of war:** stored per map, so a reset re-fogs only that map. Landmarks (`fog: landmark`) show again once the map is reachable.

---

## 6. Guests (J4)

- Guests play the graph world, from the same published maps as accounts (Vercel build, `GET /api/v1/levels/*`). The GitHub Pages build has no API, so a Pages guest still gets the bundled frozen seed until Pages is retired (Q13 of 2026-10-10 still stands).
- **Progress lives in local storage**, in the same `progress` shape as an account save, including `mapVersions`. The beta reset runs on load exactly as for accounts.
- Implications: clearing the browser, another device or private mode loses guest progress (true today for classic guests); progress is per browser profile; a guest save is small (bitsets for 38 maps are a few KB).
- Moving a guest save to a new account on sign-up is GameDev's existing import path (architecture D-rules), unchanged.
- Today a guest with a classic save keeps classic (level-editor.md §10.2). Whether existing classic guests are moved is Q-J4.

---

## 7. Conversion of today's data (done) and checks

- **Tool:** `docs/tech/tools/levels/convert_levels.py` (repo-relative; `--check` fails if `docs/data/levels` is out of date). Inputs: `docs/data/world/`, `docs/data/quests/quests.json`, `src/data/world/quests.json` (resolved positions), `docs/data/dialogue/`, the curriculum pools, `realm_difficulty.json`, `realm_location_difficulty.json`, `src/data/locations.json`.
- **Output:** 38 maps + `index.json` (`levels_index/0.1`: start position and the map list) in `docs/data/levels/`; schema `docs/data/levels/schemas/level.schema.json` (`level/0.2`).
- **Validator:** `docs/tech/tools/levels/validate_levels.py`: schema; unique ids; edge endpoints; entry; one boss and one patrol gate per boss map; every cross-map link resolves **both ways** (exit edges may be one-way); every `bossDefeated` names a boss map; every quest condition names a quest; every quest giver, turn-in and step position resolves, with a variant for each step; every enemy, word, scene and character id exists; scene ids unique; every map reachable from the start (warning); the met rule (§3). Result: **0 errors, 2 warnings** (the one-way `warren/x_w_throne` exit, and 148 quest scene ids referenced but not written yet, which the game skips today).
- **Faithfulness:** the sim on `docs/data/levels` equals the sim on today's data with the same graph surgery, bit for bit (`run_world_sim.py ci`), and the deltas against v3.9.1 are in the sim CSVs (`sim_world_maps.csv`).

What the converter changed on purpose (and nothing else): no `realm`/`zone` fields; zone ids → boss map ids in conditions; `world.json realms[]` → portal conditions; the realm_1 split and the 9 doorway moves; inline dialogue → scenes (`sc_<map>__<key>`, `{dialogue}` → `{scene}`); quest-gated events → node variants; per-map settings and pools; `state: beta`; and (J6) no `elite`, `scriptedElite` or scripted path elites.

**Left in the frozen seed** (`docs/data/world/`, not edited): the zone `elite` / `scriptedElite` fields, the 9 scripted edges, `progress.schema.json`'s `bossCheckpoint`, and the `scripted_elite_id` column of `realm_location_difficulty.csv`. CI requires Desy's world tools to reproduce that folder byte for byte, and the generator lays out each map's battle edges around the scripted elite, so removing them there would regenerate all 36 layouts and GameDev's `src/data/world`. The folder retires when GameDev seeds the DB from `docs/data/levels/`.

---

## 8. Questions for Jack (each with our default)

- **Q-J3a. Which state do the 38 converted maps start in?** *Default:* **beta** for all. They are playable today, and Jack is still changing them; golden would freeze ids before he has edited anything.
- **Q-J3b. Does a beta reset also un-defeat the map's boss?** *Default:* **no**, the boss stays defeated. Un-defeating it would close every portal gated on it and could strand a kid on a later map.
- **Q-J3c. What happens to the map's quests when it resets?** *Jack's decision (2026-10-11, correction):* every quest given on that map goes back to not-started, whatever state it was in.
- **Q-J3d. What can change on a golden map?** *Default:* **text, weights, rewards and encounter odds**; no id or idx changes, no node or edge deletes. A structural change means moving the map back to beta first, which resets it.
- **Q-J4. Should existing classic guests be moved to the graph world?** *Default:* **new guests start in graph**; a guest with a classic save keeps it and gets a one-time offer to start the graph world (GameDev's §10.2).
- **Q-J8. Keep the realm_1 split and the 9 doorway moves?** *Default:* **keep** (they keep the 3 realm-1 bosses and their pools, and keep the 5 realm-boss locations in the 6.5–9.5 battle band). Both are reversible in the editor.
- **Q-J9. Should the boss Feather (realms 3, 6, 8) stay?** It was the Director's default (v3.9.1), not Jack's. *Default:* **keep** until he rules; it is plain data (an `on: clear` event on 3 boss nodes).
- **Q-J10. Elites in mini-boss and quest fights.** *Jack's decision (2026-10-11):* the 9 elite enemies stay only as fixed, placed mini-bosses, never random.
- **Q-J11. Three boss specials say "at 50% HP (checkpoint)"** (Horned Rabbit King, Goblin King, Demon King). *Default:* keep the 50%-HP special and drop the word "checkpoint" from the text (a wording change in `enemies.csv`, done with the next world-tool run).
- **Q-J12. Rules we added that Jack never decided (§9).** *Default:* keep each until he rules; none was deleted except J5 and J6.


---

## 9. Audit: rules in the spec and this doc that Jack never decided

Checked 2026-10-11 against combat-spec.md, world-graph.md, quests.md, decisions.md and this doc. "Ours" = added by Desy, the Director or GameDev. The v3.8 world graph as a whole (battles on edges, maps as node graphs) was Jack's call on 2026-10-02; the numbers and sub-rules inside it were ours. Nothing in this table was deleted (J7), except the two rows marked **removed**.

| # | Rule | Where | Origin | Status |
|---|---|---|---|---|
| 1 | Boss half-HP checkpoint and resume after a loss | spec §2 flow, §2.3, safety net 7, §11; world-graph §12; progress `bossCheckpoint` | ours (v3, spec §2) | **removed** (J5) |
| 2 | Random elites: 10% elite in boss-approach patrols, one scripted path elite per realm, location `elite` / `scriptedElite`, the engine's `eliteReplaceChance` on edge battles, the gold glow on patrol elites | spec §2.3, §7.4 item 3, §7.8, §11; world-graph §4, §14; zones.json; balance.json | ours (roster brief, v3) | **removed** (J6) |
| 3 | Battle budget: after 8 fresh battles in a location, fresh steps roll ×0.1 | world_rules `zoneBattleBudget`, `budgetSpentMult`; spec §12 | ours (Desy, v3.8 tuning) | kept, pending Jack |
| 4 | Budget resets when the word pool changes (not per map) | this doc §3; Oct 10 Q18 | ours (Desy, Oct 10) | kept, pending Jack |
| 5 | Pity: after 2 empty fresh steps the next fresh step always fights ("guaranteed battle after misses") | world_rules `pityRolls`; spec §12 | ours (Desy, v3.8) | kept, pending Jack |
| 6 | Encounter rates by danger 0 / 0.60 / 0.85 / 0.95, +10% per dungeon level, max 0.95 | world_rules | ours (Desy, v3.8). Jack decided only that a map may override the odds (D4) | kept, pending Jack |
| 7 | Walked edges roll ×0.05 | world_rules `clearedStepMult` | ours (Desy, v3.8) | kept, pending Jack |
| 8 | Safe way back after a boss or mini-boss clear (20 hops or until the next inn rest) | world_rules `safe` | ours (Desy, v3.8) | kept, pending Jack |
| 9 | Safe edges next to towns, villages and inns, on the boss approach, stairs and portals | world_rules `safe` | ours (Desy, v3.8) | kept, pending Jack |
| 10 | Turn back mid-edge after a won battle at low HP | world-graph §4 | ours (Desy, v3.8) | kept, pending Jack |
| 11 | Repel item (`bell`): 6 hops without random battles | world_rules `repel` (proposed, not in the game) | ours (Desy, v3.8 proposal) | kept as a proposal; not in the maps |
| 12 | Practice patrols before a boss while proficiency is under the trigger (2 per trip, Train repeats) | spec §7.4, world-graph §4 | **Jack** | kept (J7 note) |
| 13 | Patrol trigger 20% (speech) / 40% (reading) | spec §7.7 | Director's call (v3.1) | kept, pending Jack |
| 14 | Patrols re-armed by resting at another inn; up to 2 more on the walk back after a boss loss; one wandering patrol left for farming after the trigger | spec §7.4, world-graph §4 | ours (prototype / v3.1) | kept, pending Jack |
| 15 | An approach inn next to every boss | validate_world | ours (Desy, v3.8) | kept, pending Jack |
| 16 | Every node ≤ 3 hops (realms 1–3) / 5 hops (realms 4–9) from an inn; now `settings.maxHopsToInn` | spec §12.1 | **Jack** (v3.9, Oct 2) | kept |
| 17 | Town and village density ramp (1 per 20 nodes early → 1 per 60 late) | spec §12.2 | Jack's ramp numbers, applied as a Director's default (v3.9.1) | kept; no per-map form yet |
| 18 | Feather destinations: exactly the last inn used plus every town or village ever entered; other inns never count; the current node is not offered | world-graph §12.1, `returnFeather.destinationRule` | ours (Desy, v3.9.2, Oct 3). Jack decided the Feather itself (2 × G, start 2, carry 3, no inn warp) | kept, pending Jack |
| 19 | Free Feather in the realm-boss chests of realms 3, 6, 8 | boss-node `on: clear` events | Director's default (v3.9.1) | kept (Q-J9) |
| 20 | Realm N+1 opens when realm N's boss falls | world.json realms[] → portal conditions | ours (Desy, v3.9.2); the exit edges were Jack's (Oct 3) | kept as link conditions |
| 21 | Beeline authoring target 6.5–9.5 random battles before each boss | validate_world | ours (Desy, from v3.7's 8 path fights) | kept as an authoring check |
| 22 | At most one arrival event per visit, first eligible in list order; weighted picks; cooldowns | world-graph §5 | ours (Desy, v3.8) | kept, pending Jack |
| 23 | Seeded RNG (FNV-1a → mulberry32, keys by map, edge, crossing, step) | world-graph §4.4 | ours (Desy, v3.9.2) | kept (technical) |
| 24 | Escorts never fail (can't be harmed, wait at the last inn); a dropped quest returns to its giver; `words` steps count battle answers only, n = 10 | quests.md §2a | ours (Desy, v3.9.2) | kept, pending Jack |
| 25 | Heroic gear from exactly one source (boss chest or quest); villages have no smith | decisions Oct 10 | ours (Desy, v3.9.5) | kept, pending Jack |
| 26 | Realm-boss chest contents (3 × G gold + Honey Potion + heroic piece + skill unlock) | spec §7.2, §6.3 | ours (v3 spec) | kept, pending Jack |
| 27 | Chest chances (10% normal, 25% elite, 100% boss) and the chest table | spec §7.2 | ours (v3 spec) | kept, pending Jack |
| 28 | realm_1 split into 3 maps; the 9 doorway paths moved into the next map | converted maps, §2.2 | Director's working defaults (Oct 10) | kept (Q-J8) |
| 29 | Met rule by map order along links | §3 | ours (Desy, Oct 11 proposal) | proposed |
| 30 | Every converted map starts `beta` | converted maps | ours (Oct 11) | Q-J3a |
| 31 | Mini-boss fights of 2–3 enemies with one elite | world-graph §5 | ours (Desy, v3.8); placed on purpose, so J6 keeps them | kept (Q-J10) |

Not in this table because Jack decided them: the 3-new-words cap and Tired at 30/45 (Sep 29), the safety nets and Courage (Sep 29), the companion (Sep 29), the spell rules (Oct 2), boss HP targets (~15 / ~20 correct, Oct 2), the Return Feather price and carry limit (Oct 2), fog of war (Oct 2), the editor decisions J1–J7.

---

## 10. What level-editor.md (`level/0.1`, main `3ab6924`) still has to change (for GameDev)

| # | level-editor.md | Change to match J1–J6 and `level/0.2` |
|---|---|---|
| 1 | `realm` on the level, scenes and quests; `world.json realms[]` in §2.4 / §2.11 | drop; progression = link conditions (§2) |
| 2 | §2.9 `idxMax` / `edgeIdxMax`, `retired`, append-only ids, "no renames after publish" | replace with `state` and the beta reset (§5); ids lock only on golden maps |
| 3 | §2.4 settings `elite`, `scriptedElite`; §2.3 edge `scripted`; §2.11 row copying them | drop (J6) |
| 4 | §2.4 `G` / `recLevel` derived from `tier` (D1), difficulty row read from the CSV (D2) | stored per map (§1.3) |
| 5 | §5.3 word-pool picker (one pool id) | ordered `settings.words`, add and remove single ids (J2) |
| 6 | §6.1 met rule "against the level's pool and earlier levels" | map order along links (§3) |
| 7 | §7.3–7.4 saves and deleted nodes | `mapVersions` + per-map reset (§5) |
| 8 | §10.2 guests | guests get graph (J4, §6) |
| 9 | Engine code GameDev owns: `src/engine/battle.ts` boss checkpoint, `balance.json eliteReplaceChance`, `src/data/locations.json elite`, progress `bossCheckpoint`, `graph.ts` scripted fights | remove (J5, J6); the sim already runs without them |
