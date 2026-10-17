# Level JSON: maps without realms, word pools, map states, guests, and the migration

Repo path: `docs/design/level-json-coverage.md` · Owner: Desy · Reworked 2026-10-11 (PT) for Jack's level-editor review (via the Director), against main `ec55b9b` (`handoff_maps` merged); this revision is `handoff_simplify` (Jack's §9 rulings J8, quest locks J9, map display J10, boss block and enemy ATK J11 (2026-10-12), and GameDev's level-editor.md §14 follow-ups, §10).
Companion to GameDev's schema doc `docs/tech/level-editor.md` (`level/0.1`). GameDev leads the schema. This doc checks that the map format covers everything in our world, quest and dialogue data, and records how today's 36 graphs were converted into **38 map files** (`docs/data/levels/<map_id>.json`, `level/0.2`).

> **Jack's decisions applied here (2026-10-11 PT, via the Director).** They override every earlier default; older text that disagreed has been removed.
> - **J1, no realms.** Everything is maps linked to other maps through portals, with no limit on the number of maps. There is no `realm` field anywhere. Progression comes only from **links** (portal, stairs and exit edges between maps). Anything that was keyed on a realm or tier is now a per-map setting (§2). (J8 removed the boss conditions J1 first allowed; J9 adds quest locks.)
> - **J2, editable word pools.** Each map has its own word pool (`settings.words`), and Jack can add and remove words in the editor. Every pool is pre-populated from today's lists (the curriculum pool of the map's location, in curriculum order). The met rule works without realms (§3). The 3-new-words cap per battle stays.
> - **J3, map states, not append-only ids.** Maps are `draft`, `beta` or `golden`. A change to a beta map resets players' progress **on that map**. **Jack's decision (2026-10-11, correction):** that map's quests reset too: every quest given on that map goes back to not-started, whatever state it was in. `retired` is dropped (§5).
> - **J4, guests** get the graph world too (§6).
> - **J5, no boss retry mechanic.** The half-HP boss checkpoint and its resume rule are removed from the spec, the data, the maps and the sim. After a loss, a boss fight starts fresh, like any fight.
> - **J6, no random strong or elite enemies.** The 10% patrol elite chance, the scripted path elite (one per realm) and the location `elite` / `scriptedElite` fields are removed from the spec, the data, the map format and the sim. Fights placed on purpose (bosses, mini-bosses, quest fights) stay. The elite enemies themselves (`role = elite` in `enemies.csv`) stay in the roster. **Jack's decision (2026-10-11):** the 9 elite enemies stay only as fixed, placed mini-bosses, never random.
> - **J7, standing rule.** No mechanic, system or rule that Jack hasn't asked for. Anything we think is needed is listed as a question (§8). The rules we added earlier and Jack never decided are listed with their origin in §9, and are kept until he rules on them.
> - **J8, Jack's rulings on §9 (2026-10-11).** (1) **No practice fights at all:** no battle budget (nor its reset when the pool changes), no boss-approach patrols, no 20% trigger, no re-arming at inns, no own-word battle targets (6.5–9.5, 8 path fights). (2) **No pity roll.** (3) **Walked edges roll at 50%** of the normal rate (was ×0.05). (4) **Nodes may have no event;** no one-event-per-arrival rule, no filler events. (5) **Progression is purely by map links:** beating a boss unlocks nothing, going around a boss node is fine, and no link carries a boss condition. Boss nodes stay fights. Nothing was added to make up for these.
> - **J10, map display (Jack's decision, 2026-10-11).** In game every unvisited node looks the same; a node's type and icon show only on arrival, on top of fog of war. No landmarks. The editor shows everything. The converted maps drop the 41 `fog: "landmark"` node fields.
> - **J11, Jack's decisions of 2026-10-12.** (1) **A boss node blocks passage:** the player can't move past it without beating its boss; fleeing returns them to the node they came from; "skippable" only means a map may have an alternate route that never goes through that node (§2.1). (2) **Normal (non-boss) enemy ATK ×1.1:** `round(1.21 × DEF_ref)`, was 1.1; boss and elite ATK unchanged (the enemy tables, the roster and the generated world content were updated).
> - **J9, quest locks (Jack's decision, 2026-10-11; his one exception to J8.5).** A node or edge may carry `lockedUntilQuest: <quest id>`: impassable until that quest is completed. An optional `lockedScene` plays when the player tries (e.g. the workers at the broken bridge); without one, one default blocked line. No keys, no partial progress, no boss gates (§2.3).
>
> **Superseded by these:** D1 (G derived from the tier), D2 (difficulty row read from the CSV), D10 (realm_1 fallback), the append-only / retired / renames rules, Q1, Q3, Q4, Q16 and Q17 of the 2026-10-10 version, and the zone-era tables of the old §3.9. Git history keeps the old text.
> **Still in force (2026-10-10, D3–D9):** D3 (`old_mine_1/npc_1` stays an inn with Miner Gao's giver variant), D4 (optional per-map encounter-odds override), D5 (quest scenes derived from the node variants), D6 (a quest lives in its giver's map), D7 (quest `zone` dropped), D8 (one dialogue format; banter is a scene), D9 (the DB is live and wins; GameDev's box commits published maps to `docs/data/levels/`; tools, CI and the sim read that folder).

**Ground rules:**
- The editor writes the same data the game runs today. Every editor concept maps onto an existing field, condition or action (§1).
- Balance numbers that are not per map stay global (`docs/data/levels/world_rules.json`): boss HP and ATK, prices, the 3-new-words cap, the encounter-rate defaults, the walked-edge factor (§9 lists which of these Jack hasn't decided).
- Source of truth (D9): the DB holds live maps and wins. `docs/data/levels/` is the committed copy (history, CI and sim input). The v3.9.x files under `docs/data/world/` are the frozen conversion input.

---

## 1. Coverage checklist

### 1.0 Jack's editor words → our data

| Jack's word | In the map file (`level/0.2`) | Note |
|---|---|---|
| map | one file `docs/data/levels/<id>.json` = one graph | the game loads, saves and hashes RNG per map |
| portal | node `kind: portal` + a `portal` edge whose `to` is `{graph, node}` in another map; never a boss condition (J8) | the only way maps connect (with `stairs` and `exit`, also cross-map edges) |
| boss | `settings.boss {node, gateEdge, kind, enemy, reward?}` + the boss node | at most one per map; a fight, it unlocks nothing (J8) |
| locked bridge / gate | `lockedUntilQuest` (+ optional `lockedScene`) on the node or edge | J9 (§2.3) |
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
| Nodes: `id`, `idx`, `kind`, `x`/`y` 0–1, `title`, `save`, `services`, `hub`, `town`, `shops`, `campfire`, `npc`, `fog`, `quests[]` (variants) | `nodes[]` | same, minus `fog` (J10: no landmarks), plus optional `lockedUntilQuest` / `lockedScene` (J9). Node `zone` and node `boss` (a zone id) are gone |
| Edges: `id`, `idx`, `from`, `to`, `kind` (path, stairs, portal, exit, shortcut), `danger`, `steps`, `terrain`, `patrol`, `cond`, `opens`, `label` | `edges[]` | same, plus optional `lockedUntilQuest` / `lockedScene` (J9). **No `scripted`** (J6). `patrol: true` only marks the boss's safe approach edge (no patrols, J8). `cond` never uses `bossDefeated` (J8; 0 edges carry a `cond` now) |
| Cross-map edges: `to: {graph, node}`, listed on both sides | edge | same. The validator requires the return link; an `exit` edge is the one allowed one-way case (today's `warren/x_w_throne`, whose way back from `world/realm_1` lands in the village) |
| Encounter odds | `world_rules` | global defaults; per map only the optional `settings.encounters` (D4; `null` = global) |
| Safe edges, walked factor (×0.5, J8), turn back | `world_rules` | global, `docs/data/levels/world_rules.json` (origins in §9). No budget, no pity (J8) |

### 1.2 Events and outcomes

| Field | In `level/0.2` |
|---|---|
| Event `id` (`<node>.<n>`), `node`, `on`, `outcome`, `once`, `cooldown`, `cond`, `do[]`, `pick[]`, `tutorial` | map `events[]`, unchanged. Quest-gated events moved into node quest variants (§4) and keep their ids |
| 6 outcomes; a node may have no event; every eligible event runs, in list order (J8; was: at most one per arrival) | the 153 converted no-op `nothing` fallbacks are dropped |
| Conditions: all, any, not, flag, questActive, questReady, questDone, questClaimed, bossDefeated, visited, wordsReady, readinessAtLeast, levelAtLeast, hasItem, shortcutOpen | unchanged. `bossDefeated` names the **map** that holds the boss (zone ids were renamed 1:1: `great_hive` → `great_hive_1`, ...). Not on links (J8); it remains in 17 quest `requires`, 2 events and 2 scenes (Q-J14) |
| Actions | unchanged, except `{dialogue: key}` → `{scene: id}` (inline dialogue became scenes, D8). `unlockGraph` stays an action |
| Realm-boss chest (3 × G gold + Honey Potion + heroic piece + skill unlock) | `settings.boss.reward` on the map with the `realmboss`; the chest rule itself is global, keyed on `boss.kind = realmboss` |
| Boss Feather (today realms 3, 6, 8) | `settings.boss.reward.feather` on that boss map (LE F4; was an `on: clear` node event); `world_rules.realmBossFeather` is dropped |
| Seeded picks: key `saveSeed|mapId|nodeId|visit` | unchanged (`graphId` = map id) |

### 1.3 Map settings (was: realm, tier and zone)

| Setting | Was keyed on | Now |
|---|---|---|
| `title`, `emoji`, `background {map, battle}` | zone / location | per map |
| `words` (ordered curriculum ids) + `desyPool` (the source list, read-only provenance) | zone pool (location) | per map, editable (J2, §3) |
| `G` (gold unit) | realm tier | per map, copied from today's tier table (6, 12, 18, 27, 36, 45, 54, 63, 72) |
| `recLevel [min, max]` | realm tier | per map |
| `gearTier` | realm tier (`realm_difficulty.gear_tier`) | per map: the gear tier of chests and battle drops and of the recommended-gear check; the sim uses it as the map's tier |
| `difficulty {mcOptions, reviewSlots}` | `realm_location_difficulty.csv` by location | per map, copied (replaces D2). No `pathFights` (J8) |
| `maxHopsToInn` | realm (3 in realms 1–3, 5 later) | per map, copied; the validator checks it per map |
| `enemiesPerBattle`, `roster`, `packs` | zone | per map |
| `encounters` | – | optional override (D4); `null` = global |
| `boss {node, gateEdge, kind, enemy, reward?}` | zone `bossNode`/`gateEdge`/`bossKind`/`boss`, content `bossReward` | per map (one boss per map) |
| shop tier | town number | unchanged: node `town` number |
| unlock order | zone `unlockRequires`, realm order, `world.json realms[]` | **none: the links are the progression** (J8); quest locks only (J9) |
| `elite`, `scriptedElite` | zone | **removed** (J6) |


**Must be in GameDev's schema:** no `realm` field anywhere (map, node, scene, quest); `state`; `entry`; `settings.words` as an ordered id list; `settings.G`, `recLevel`, `gearTier`, `difficulty`, `maxHopsToInn` stored per map; no `elite`, `scriptedElite` or edge `scripted`; no `retired`, `idxMax` or `edgeIdxMax`; no `pathFights`, no `unlockRequires`; `lockedUntilQuest` / `lockedScene` on nodes and edges (J9).

---

## 2. Progression without realms: what replaced each realm-keyed thing

Simplest faithful mapping, no new mechanics. Each row was checked by running the sim on the converted maps (§7).

| Realm- or tier-keyed thing (v3.9.x) | Now | Why this mapping |
|---|---|---|
| `G` (gold per kill) by tier | `settings.G` per map | same number on every map of the old tier, so every price and reward that is a G multiple is unchanged |
| `recLevel` by tier/location | `settings.recLevel` per map | shown in the editor; used by EXP and the gear check as today |
| Difficulty row (`mcOptions`, `reviewSlots`; `pathFights` dropped, J8) by location | `settings.difficulty` per map | copied from `realm_location_difficulty.csv`; now editable with the map instead of hidden in a CSV |
| Shop tier | node `town` number (unchanged) | already per node |
| Realm-boss chest (3 × G + Honey + heroic + skill) | `settings.boss.reward` + `boss.kind: realmboss` on the map that holds the boss | the reward was already per boss; only the realm key goes |
| Realm 3/6/8 boss Feather | `settings.boss.reward.feather` on those 3 boss maps (LE F4) | data; `world_rules.realmBossFeather` dropped |
| Unlock order (realm N opens after realm N−1's boss; zone `unlockRequires`) | **nothing** (J8): the 19 boss conditions on links (11 portal/exit links, 8 world paths) are dropped; every link is open | progression is purely by links (§2.1) |
| `world.json realms[]` (`unlock`, `realmBossZone`, `next`, `linkEdge`, `enterEdge`, `exitEdge`) | dropped. The `world` map is an ordinary map: 9 portal nodes `realm_1` … `realm_9`, portal edges `x_realm_N` and world paths `w12` … `w89`, all unconditional (J8) | the world map was already a graph; only the side table goes |
| Exit edges (realm overworld → world node) | unchanged `exit` edges | they are links |
| `maxHopsToInn` 3/5 by realm | `settings.maxHopsToInn` per map | copied (the inn-distance check is still in `validate_world` on the seed; not ported to `validate_levels` yet) |
| Town density ramp by realm | an authoring check only, not a game rule; still in `validate_world` on the seed, not ported to maps | no realm to count nodes over; whether to keep a per-map form is Jack's call (§9) |
| The realm number in the HUD / quest log / saves | the map title; saves key on map ids already | – |
| Quest `realm`, `pool`, `zone`, `hook` | dropped; the quest lives in its giver's map (D6); kill scopes that said "anywhere in realm N" list the maps | – |
| Scene `realm`, `zone` | dropped; a scene lives in its trigger map | – |

### 2.1 No unlock order (J8): what the links give

No link waits on a boss. From the start (`realm_1/village`) the village's exit leads to the world map and every world portal is open, so **every realm's overworld is reachable without beating a boss**. **A boss node blocks passage (Jack's decision, 2026-10-12):** the player can't move past it without beating its boss, and fleeing returns them to the node they came from, so a map that is only reachable through a boss node (e.g. `clover_hills` behind the Meadow boss's portal, each dungeon behind its doorway) needs that win. "Skippable" only means an alternate route that never goes through the node; **no boss on today's maps has one**. `docs/tech/tools/sim/boss_skips.py` lists it per boss (`docs/data/sim/sim_world_boss_skips.csv`): 11 of the 20 boss nodes still stand in front of maps (Meadow and Clover Hills in front of Clover Hills / Warren; the first boss of realms 2, 3, 5–8 in front of its dungeon; goblin_caves_1 and _2; demon_castle_2 in front of the Demon King's floors), and the 9 bosses at the end of a realm or dungeon (`warren`, `great_hive_1`, `bazaar_cellars_1`, `goblin_caves_3`, `hydra_lair_2`, `moonlit_crypt_2`, `griffin_spire_3`, `undercroft_3`, `demon_castle_5`) have nothing behind them, so a kid avoids them only by not going there (the final boss excepted, to finish). The shortest walk to the final boss now fights 2 bosses (`demon_castle_2`, `demon_castle_5`): 34 steps and about 16 expected random battles, against 422 steps and about 249 battles when every boss is beaten in order.

What depended on the boss gates, and what happened to it (J8 item 5; nothing new added):

| Item | Existed for gating? | Now |
|---|---|---|
| `bossDefeated` on 11 portal/exit links + 8 world paths; world.json `realms[].unlock`; "realm N+1 opens on boss N" | yes | **removed** |
| `world_loader.unlock_order` as the campaign order (and the ci check "unlock order = zones.json") | yes | a links-only walk (no link conditions, LE §14 F3) in which an unbeaten boss node is a wall (J11): beat the nearest reachable boss, repeat. The sim plays locations in `gearTier` order, then that order (ci checks that this is today's order) |
| Q-J3b (does a reset un-defeat the boss? the risk was stranding a kid behind a closed portal) | yes | moot for links; with J11 (boss nodes block passage) an un-defeated boss would again stand between a kid and the maps behind it until re-beaten (§8) |
| Safe way back after a boss clear (§9 #8) | no: a safety rule after any boss or mini-boss fight | kept |
| The boss's safe approach edge (`patrol: true`, `settings.boss.gateEdge`, §9 #9) | no: safe edge; it also hosted the patrols | kept as the safe-edge marker; no patrols run there |
| An approach inn next to every boss (§9 #15) | no (it served the patrol rule and boss retries) | kept, pending Jack |
| Quest `requires: {bossDefeated}` (17 quests), 2 event and 2 scene conditions on bosses | no: they gate quests and scenes, not links | kept; Q-J14 |
| The 9 doorway moves (§2.2) | partly: they kept the 6.5–9.5 band per boss | kept (Q-J8); their reason is gone |
| Met rule clock (§3) | yes: "round r = after r bosses" | kept: with boss nodes as walls (J11) the rounds come back; open portals still make most overworlds round 0 (Q-J13) |

### 2.3 Quest locks (J9, Jack's decision, 2026-10-11)

- **Fields:** `lockedUntilQuest: <quest id>` and optional `lockedScene: <scene id>` on a node or an edge (level.schema.json). No other field. No converted map uses them yet.
- **Rule:** until the quest is completed, the player can't enter the node or cross the edge (either way). Trying plays `lockedScene` if set, else one default blocked line ("The way is blocked." / 路不通。).
- **Not included:** keys, partial progress, boss gates.
- **Validator** (`validate_levels.py` 4b, fixtures in `docs/tech/tools/levels/fixtures/locks/`, `test_locks.py`): the quest exists; `lockedScene` is a scene of that map; the quest's giver, turn-in and every step are reachable from the start without crossing that lock or any lock whose quest depends on it; no circular locks.
- **Sim:** routes never cross a closed lock and open it once the quest is turned in (ci check on a lock placed in memory).

### 2.2 The realm_1 split and the 9 doorways (converted; still Director defaults, not Jack's)

- `realm_1` held three locations with three bosses. It is now 3 maps: `realm_1` (village + Meadow, ids and idx unchanged), `clover_hills` and `warren`, joined by portal links (`c_gate`, `w_gate`); since J8 those links have no condition, but they start at the Meadow and Clover Hills boss nodes, so the kid still wins those fights to walk through. Battles, pools and bosses are as today.
- The 9 one-node "doorways" (the portal or stairs node of the next location after a boss) moved with their approach edge into the next map, behind a new `entry_gate` node. Their reason was to keep the 5 realm-boss locations at 6.5–9.5 own-word battles before the boss; that target is gone (J8), so they now only keep each dungeon's content in its own map.
- Both are the Director's working defaults from 2026-10-10. They are in the converted maps; Jack can still undo either in the editor (Q-J8).

---

## 3. Word pools and the met rule (J2)

- **Pre-populated:** `settings.words` = the curriculum pool of the map's location from `curriculum_location_pools.csv`, in curriculum order (47–60 ids). Maps that shared a location (dungeon floors) each get their own copy. `world` has an empty pool. `desyPool` stays as read-only provenance.
- **Editable:** Jack adds and removes ids in the editor. Ids come from the curriculum (`C001` …); the validator rejects unknown ids.
- **Per-battle cap:** at most 3 new words per battle, as today.
- **Battle state:** readiness (shown, decides nothing) is keyed by the map's pool as today. There is no patrol trigger and no battle budget (J8), so nothing resets when the pool changes.

**Met rule proposal (Desy):** a word is *met* when it is in the pool of a map the player can have reached by the time the scene can play. Concretely, with the unlock walk of §2.1 (round r = after r bosses; an unbeaten boss node is a wall, J11):
- a scene in map M with trigger condition C can first play in the round when M is reachable **and** C can be true (a `bossDefeated: X` in C means "after X's round");
- the met words are the pools of every map reachable in that round.

**Since J8** every world portal is open, so every overworld is round 0 and its words count as met for every overworld scene; with boss nodes as walls again (J11) the dungeons behind a boss come in later rounds. The rule still passes all 206 scenes (Q-J13 has the numbers and two options for Jack). This is "map order along links", not the player's actual history. Why: it is a property of the data, so the editor can check it on save and the validator can check it in CI, and it gives the same answer for every player. The player's actual progress would make the same line valid for one kid and invalid for another. On the converted data all 206 scenes pass (0 met-rule warnings).

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

**What a reset clears** (everything keyed on that map, nothing else): `visited` / `walked` / `revealed` bitsets (fog of war) for the map; `eventsDone` / `eventLastFired` entries of its events (so its chests and once-events come back); its edge crossing and node visit counters; its shortcuts; `edgeProgress` on its edges; and **every quest given on that map, which goes back to not-started, whatever state it was in** (Jack's decision, 2026-10-11, correction). A player standing on the map moves to its `entry`; a `lastInn` on it moves to the map's entry if that is a save point, or else to the start. Not cleared: gold, gear, EXP, spells and other maps' progress. **Director's working defaults (2026-10-11, pending Jack, not locked):** (a) a completed quest's reward can be earned again after a reset; (b) quests given on another map are unaffected, even if they have steps on the reset map; (c) quest items the player holds are kept. Not ruled yet: the map's boss (Q-J3b, smaller since J8).

**Saves:**
- A save records, per map it has progress on, the published **version** (or content hash) it last saw: `mapVersions {mapId: version}`. That field is needed by Jack's reset rule; it is the only save change.
- On load (and when a new version arrives mid-session, at the next map change), every beta map whose version differs is reset as above. Golden maps never reset; draft maps don't appear.
- Because beta resets clear the map's bitsets, `idx` values on a beta map may be renumbered freely, so `idxMax` / `edgeIdxMax` / `retired` are gone. On a golden map the editor locks ids and idx.
- `zonesDefeated` holds boss **map** ids; old saves migrate once with the 1:1 table (`great_hive` → `great_hive_1`, ...). The realm_1 split moves Clover Hills and Warren bits to their new maps once.

**RNG:** keys are `saveSeed|mapId|edgeId|crossing|step` and `saveSeed|mapId|nodeId|visit`, never idx or list positions. A reset sets the map's crossing and visit counters back to 0, so a reset map replays the same rolls as a fresh save (deterministic, as reloading is today). On a beta map a renamed edge gets a new roll stream; unchanged ids keep theirs. The 3 test vectors don't change.

**Fog of war:** stored per map, so a reset re-fogs only that map. No landmarks: every unvisited node looks the same and shows its type on arrival (J10).

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
- **Validator:** `docs/tech/tools/levels/validate_levels.py`: schema; unique ids; edge endpoints; entry; one boss and its approach edge (`patrol: true`) per boss map; no `bossDefeated` on any link (J8); quest locks (J9, §2.3; the reachability walk treats an unbeaten boss node as a wall it beats on arrival, J11); no item-giving `on: clear` event on a boss node (the boss chest is `settings.boss.reward`, LE F4); every cross-map link resolves **both ways** (exit edges may be one-way); every `bossDefeated` names a boss map; every quest condition names a quest; every quest giver, turn-in and step position resolves, with a variant for each step; every enemy, word, scene and character id exists; scene ids unique; every map reachable from the start (warning); the met rule (§3). Result: **0 errors, 2 warnings** (the one-way `warren/x_w_throne` exit, and 148 quest scene ids referenced but not written yet, which the game skips today).
- **Faithfulness:** until J8 the sim on `docs/data/levels` equalled the sim on today's data with the same graph surgery, bit for bit (`sim_world_maps.csv`). J8 changes the rules on purpose, so that check is gone; `convert_levels.py --check` still guards drift, and the J8 run is `sim_world_maps_simplified.csv`.

What the converter changed on purpose (and nothing else): (LE §14, §10) `world.json` is an ordinary `overworld` map (no `world` kind), the Feather on the 3 boss maps is `settings.boss.reward.feather` (no boss-node `on: clear` chest event), the 9 `event: portal` quest steps are `event: nothing` + `objective: {type: reach}`, and quests don't store `scenes` (the giver's variants carry them); no `realm`/`zone` fields; zone ids → boss map ids in conditions; `world.json realms[]` → portal conditions; the realm_1 split and the 9 doorway moves; inline dialogue → scenes (`sc_<map>__<key>`, `{dialogue}` → `{scene}`); quest-gated events → node variants; per-map settings and pools; `state: beta`; (J6) no `elite`, `scriptedElite` or scripted path elites; and (J8) no `bossDefeated` on links, no no-op `nothing` fallbacks (153), no `pathFights`, and `docs/data/levels/world_rules.json` = the seed's rules without the budget, pity and beeline target, walked ×0.5, without the realm-keyed entries (per-map settings now). Kept as content: the dead-end pick 80% nothing / 20% honey (a small find, world-graph §5.1) and the path pick 70 / 15 / 15.

**Left in the frozen seed** (`docs/data/world/`, not edited): the zone `elite` / `scriptedElite` fields, the 9 scripted edges, `progress.schema.json`'s `bossCheckpoint`, and the `scripted_elite_id` column of `realm_location_difficulty.csv`. CI requires Desy's world tools to reproduce that folder byte for byte, and the generator lays out each map's battle edges around the scripted elite, so removing them there would regenerate all 36 layouts and GameDev's `src/data/world`. The folder retires when GameDev seeds the DB from `docs/data/levels/`.

---

## 8. Questions for Jack (each with our default)

- **Q-J3a. Which state do the 38 converted maps start in?** *Default:* **beta** for all. They are playable today, and Jack is still changing them; golden would freeze ids before he has edited anything.
- **Q-J3b. Does a beta reset also un-defeat the map's boss?** *Default:* **no**, the boss stays defeated. Since J8 no link waits on a boss, so the old reason (stranding a kid behind a closed portal) is moot. What is left: if it were un-defeated, the boss node would be a fight again and, since J11 (2026-10-12), would block passage until re-beaten, and the 17 quests / 2 events / 2 scenes that check `bossDefeated` would close again.
- **Q-J3c. What happens to the map's quests when it resets?** *Jack's decision (2026-10-11, correction):* every quest given on that map goes back to not-started, whatever state it was in.
- **Q-J3d. What can change on a golden map?** *Default:* **text, weights, rewards and encounter odds**; no id or idx changes, no node or edge deletes. A structural change means moving the map back to beta first, which resets it.
- **Q-J4. Should existing classic guests be moved to the graph world?** *Default:* **new guests start in graph**; a guest with a classic save keeps it and gets a one-time offer to start the graph world (GameDev's §10.2).
- **Q-J8. Keep the realm_1 split and the 9 doorway moves?** *Default:* **keep** (they keep the 3 realm-1 bosses and their pools; the 6.5–9.5 band they served is gone, J8). Both are reversible in the editor.
- **Q-J9. Should the boss Feather (realms 3, 6, 8) stay?** It was the Director's default (v3.9.1), not Jack's. *Default:* **keep** until he rules; it is plain data (`settings.boss.reward.feather` on 3 boss maps).
- **Q-J10. Elites in mini-boss and quest fights.** *Jack's decision (2026-10-11):* the 9 elite enemies stay only as fixed, placed mini-bosses, never random.
- **Q-J11. Three boss specials say "at 50% HP (checkpoint)"** (Horned Rabbit King, Goblin King, Demon King). *Default:* keep the 50%-HP special and drop the word "checkpoint" from the text (a wording change in `enemies.csv`, done with the next world-tool run).
- **Q-J12. Rules we added that Jack never decided (§9).** *Default:* keep each until he rules; deleted only where Jack ruled (J5, J6, J8).
- **Q-J13. The met rule with open links.** With every portal open, every overworld's words count as met everywhere (§3; boss walls, J11, only hold back the dungeons behind a boss), so the rule passes all 206 scenes. How much that hides, measured on the converted data for this handoff (an analysis, not a validator rule):
  - in curriculum order (`gearTier`, then link order; each map met = its own pool plus every earlier location's): **0 of 206 scenes, 8 of 50 quests** use later words (`q2_lost_panda`, `q3_slime_rainbow`, `q5_fog_bottle`, `q7_glacier_roses`, `q7_forecast`, `q8_fan_letters`, `q9_pact_beastfolk`, `q9_pipi_surrender`; 2–6 words each, mostly from the dungeon pools of the same tier);
  - along the shortest link route from the start (met = the pools of the maps that route walks through, e.g. `realm_1` → `world` → `realm_7`): **2 of 206 scenes** (`sc_r1_village_banter`, `sc_r7_wind_dragon_truth`) and **16 of 50 quests**.

  *Default:* keep the rule as written; no replacement added. **Questions for Jack:** (a) should the validator check scenes and quests in curriculum order per map along the intended portal route (the first count above: 8 quests would warn)? (b) or should the met rule become a warning only, or be dropped, since a kid can now reach any map without fighting?
- **Q-J14 (revised 2026-10-12 for J11, boss nodes block passage). Quests and scenes that wait on a boss** (17 quest `requires: {bossDefeated}`, 2 events, 2 scenes). They gate quests and story, not links, so J8 didn't remove them. *Default:* keep. All 17 still work: each is offered once its boss is beaten. Only `demon_castle_2` must be beaten to finish the game, so:
  - **giver behind the boss** (the kid meets the giver only after the fight, as before): `q1_carrot` (clover_hills), `q2_royal_jelly` (realm_2), `q4_free_classmates` (goblin_caves_1), `q7_griffin_feathers`, `q8_singer_escort`, `q8_bronze_medals` (realm_7 / realm_8);
  - **giver reachable without the boss, boss on the way to the end** (offered later in the same run): `q9_pipi_surrender`, `q9_pact_beastfolk` (demon_castle_2);
  - **giver reachable without the boss, boss optional** (re-checked under the boss block: none of these bosses is needed to finish and none stands on the way to the end, so all 9 can still be lost: a kid who never fights that boss never gets the quest, and sees the giver before it has the quest; skipping a realm boss also leaves its dungeon closed): `q2_lost_panda` (realm_2), `q3_slime_rainbow` (realm_3), `q4_homework`, `q4_school_bell` (goblin_caves_3), `q5_pocket_watches` (realm_5), `q6_hot_soup` (realm_6), `q7_glacier_roses`, `q7_forecast` (realm_7), `q8_fan_letters` (realm_8).
- **Q-J15. "Completed" for a quest lock.** *Default:* the quest is turned in (`questDone`), not merely all steps done (`questReady`).


---

## 9. Audit: rules in the spec and this doc that Jack never decided

Checked 2026-10-11 against combat-spec.md, world-graph.md, quests.md, decisions.md and this doc. "Ours" = added by Desy, the Director or GameDev. The v3.8 world graph as a whole (battles on edges, maps as node graphs) was Jack's call on 2026-10-02; the numbers and sub-rules inside it were ours. Nothing in this table was deleted (J7) except where Jack ruled: J5, J6 and his §9 rulings of 2026-10-11 (J8), marked in the Status column.

| # | Rule | Where | Origin | Status |
|---|---|---|---|---|
| 1 | Boss half-HP checkpoint and resume after a loss | spec §2 flow, §2.3, safety net 7, §11; world-graph §12; progress `bossCheckpoint` | ours (v3, spec §2) | **removed** (J5) |
| 2 | Random elites: 10% elite in boss-approach patrols, one scripted path elite per realm, location `elite` / `scriptedElite`, the engine's `eliteReplaceChance` on edge battles, the gold glow on patrol elites | spec §2.3, §7.4 item 3, §7.8, §11; world-graph §4, §14; zones.json; balance.json | ours (roster brief, v3) | **removed** (J6) |
| 3 | Battle budget: after 8 fresh battles in a location, fresh steps roll ×0.1 | world_rules `zoneBattleBudget`, `budgetSpentMult`; spec §12 | ours (Desy, v3.8 tuning) | **removed** (Jack, 2026-10-11: no practice fights) |
| 4 | Budget resets when the word pool changes (not per map) | this doc §3; Oct 10 Q18 | ours (Desy, Oct 10) | **removed** (Jack, 2026-10-11) |
| 5 | Pity: after 2 empty fresh steps the next fresh step always fights ("guaranteed battle after misses") | world_rules `pityRolls`; spec §12 | ours (Desy, v3.8) | **removed** (Jack, 2026-10-11: no pity) |
| 6 | Encounter rates by danger 0 / 0.60 / 0.85 / 0.95, +10% per dungeon level, max 0.95 | world_rules | ours (Desy, v3.8). Jack decided only that a map may override the odds (D4) | kept, pending Jack |
| 7 | Walked edges roll ×0.05 | world_rules `clearedStepMult` | ours (Desy, v3.8) | **changed by Jack (2026-10-11): ×0.5** (50% of the normal rate) |
| 8 | Safe way back after a boss or mini-boss clear (20 hops or until the next inn rest) | world_rules `safe` | ours (Desy, v3.8) | kept, pending Jack (not a gate, J8 check) |
| 9 | Safe edges next to towns, villages and inns, on the boss approach, stairs and portals | world_rules `safe` | ours (Desy, v3.8) | kept, pending Jack; the boss approach stays a safe edge, without patrols |
| 10 | Turn back mid-edge after a won battle at low HP | world-graph §4 | ours (Desy, v3.8) | kept, pending Jack |
| 11 | Repel item (`bell`): 6 hops without random battles | world_rules `repel` (proposed, not in the game) | ours (Desy, v3.8 proposal) | kept as a proposal; not in the maps |
| 12 | Practice patrols before a boss while proficiency is under the trigger (2 per trip, Train repeats) | spec §7.4, world-graph §4 | **Jack** | **removed** (Jack, 2026-10-11: no practice fights at all; reverses his earlier call) |
| 13 | Patrol trigger 20% (speech) / 40% (reading) | spec §7.7 | Director's call (v3.1) | **removed** (Jack, 2026-10-11) |
| 14 | Patrols re-armed by resting at another inn; up to 2 more on the walk back after a boss loss; one wandering patrol left for farming after the trigger | spec §7.4, world-graph §4 | ours (prototype / v3.1) | **removed** (Jack, 2026-10-11) |
| 15 | An approach inn next to every boss | validate_world | ours (Desy, v3.8) | kept, pending Jack (its patrol reason is gone) |
| 16 | Every node ≤ 3 hops (realms 1–3) / 5 hops (realms 4–9) from an inn; now `settings.maxHopsToInn` | spec §12.1 | **Jack** (v3.9, Oct 2) | kept |
| 17 | Town and village density ramp (1 per 20 nodes early → 1 per 60 late) | spec §12.2 | Jack's ramp numbers, applied as a Director's default (v3.9.1) | kept; no per-map form yet |
| 18 | Feather destinations: exactly the last inn used plus every town or village ever entered; other inns never count; the current node is not offered | world-graph §12.1, `returnFeather.destinationRule` | ours (Desy, v3.9.2, Oct 3). Jack decided the Feather itself (2 × G, start 2, carry 3, no inn warp) | kept, pending Jack |
| 19 | Free Feather in the realm-boss chests of realms 3, 6, 8 | `settings.boss.reward.feather` (was boss-node `on: clear` events) | Director's default (v3.9.1) | kept (Q-J9) |
| 20 | Realm N+1 opens when realm N's boss falls | world.json realms[] → portal conditions | ours (Desy, v3.9.2); the exit edges were Jack's (Oct 3) | **removed** (Jack, 2026-10-11: progression purely by links) |
| 21 | Beeline authoring target 6.5–9.5 random battles before each boss | validate_world | ours (Desy, from v3.7's 8 path fights) | **removed** (Jack, 2026-10-11: no own-word battle targets); validate_world only reports the number |
| 22 | At most one arrival event per visit, first eligible in list order; weighted picks; cooldowns | world-graph §5 | ours (Desy, v3.8) | **one-event rule removed** (Jack, 2026-10-11: nodes may have no event; all eligible events run in list order); weighted picks and cooldowns kept, pending Jack |
| 23 | Seeded RNG (FNV-1a → mulberry32, keys by map, edge, crossing, step) | world-graph §4.4 | ours (Desy, v3.9.2) | kept (technical) |
| 24 | Escorts never fail (can't be harmed, wait at the last inn); a dropped quest returns to its giver; `words` steps count battle answers only, n = 10 | quests.md §2a | ours (Desy, v3.9.2) | kept, pending Jack |
| 25 | Heroic gear from exactly one source (boss chest or quest); villages have no smith | decisions Oct 10 | ours (Desy, v3.9.5) | kept, pending Jack |
| 26 | Realm-boss chest contents (3 × G gold + Honey Potion + heroic piece + skill unlock) | spec §7.2, §6.3 | ours (v3 spec) | kept, pending Jack |
| 27 | Chest chances (10% normal, 25% elite, 100% boss) and the chest table | spec §7.2 | ours (v3 spec) | kept, pending Jack |
| 28 | realm_1 split into 3 maps; the 9 doorway paths moved into the next map | converted maps, §2.2 | Director's working defaults (Oct 10) | kept (Q-J8); the 6.5–9.5 reason is gone |
| 29 | Met rule by map order along links | §3 | ours (Desy, Oct 11 proposal) | proposed; permissive with open links (Q-J13) |
| 30 | Every converted map starts `beta` | converted maps | ours (Oct 11) | Q-J3a |
| 31 | Mini-boss fights of 2–3 enemies with one elite | world-graph §5 | ours (Desy, v3.8); placed on purpose, so J6 keeps them | kept (Q-J10) |

Not in this table because Jack decided them: the 3-new-words cap and Tired at 30/45 (Sep 29), the safety nets and Courage (Sep 29), the companion (Sep 29), the spell rules (Oct 2), boss HP targets (~15 / ~20 correct, Oct 2), the Return Feather price and carry limit (Oct 2), fog of war (Oct 2), the editor decisions J1–J10 (J8 = his rulings on this table, J9 = quest locks, J10 = map display).

---

## 10. GameDev's level-editor.md §14 follow-ups (main `ec55b9b`): done in this handoff

GameDev's numbering (level-editor.md §14) first; the Director's numbering of the same items in brackets.

| LE §14 | What | Done |
|---|---|---|
| F1 [F2] | Drop the `world` kind | `level/0.2` `kind` is `overworld` · `dungeon_level` · `town`; `world.json` is an ordinary `overworld` map of portals (the simplest: no portal folding). The sim finds the world map by its empty word pool, not its kind |
| F2 [F3] | `lockedUntilQuest` / `lockedScene` in the schema and the gate checks of §2.6.1 | schema (nodes and edges); `validate_levels.py`: quest exists, giver + turn-in + every step reachable without this gate or any gate depending on it, no circular locks, `lockedScene` exists; fixtures + `test_locks.py` (§2.3) |
| F3 [F1, F6] | Remove the 19 `bossDefeated` link conditions; `unlock_order` and the met walk links-only; re-run the sim | 0 link conditions (validator error if one comes back); `unlock_order` reads links only; **J11 (2026-10-12) supersedes "no boss walls"**: an unbeaten boss node is a wall in the walk, the met rule, the lock checks and the sim (§2.1); sim re-run at 100 seeds (`sim_world_maps_simplified.csv`) |
| F4 | Feather → `settings.boss.reward`; "boss chest is not a node event" check | `settings.boss.reward.feather: 1` on `bazaar_cellars_1`, `moonlit_crypt_2`, `undercroft_3`; events `boss_3.1`, `boss_6.1`, `boss_8.1` gone; validator error on any item-giving `on: clear` event on a boss node |
| F5 | 9 `event: portal` steps → `event: nothing` + `objective: {type: reach}`; stop storing quest `scenes` | done (`q4_lost_schoolbag`, `q4_school_bell`, `q5_fog_bottle`, `q7_glacier_roses`, `q8_lost_ball`, `q8_fan_letters`, `q8_caged_beasts`, `q9_pact_elves`, `q6_old_mine`); the schema rejects `event: portal` on a step and a stored quest `scenes` |
| F6 | Spec and sim: no budget, pity, practice patrols; walked ×0.5; blank nodes | combat-spec §12.5, world-graph banner, J8; new globals in `docs/data/levels/world_rules.json` (the frozen seed is untouched) |
| F7 | `validate_levels.py` in CI | added as check 7 of `tools/world/validate_all.py` (`npm run validate:world`, already in `deploy.yml`): `validate_levels` 0 errors, `test_locks`, `convert_levels --check` |

Still for GameDev (engine, not data): drop the budget, pity, practice patrols / Train / `approachArmed` and one-event-per-arrival in `src/world/`; walked ×0.5; the `src/data/v3.json` rows `boss_trigger_speech`, `boss_trigger_no_speech`, `forced_patrols_per_trip`, `path_fights`; read the Feather from `settings.boss.reward`; the default blocked line ("The way is blocked." / 路不通。).
