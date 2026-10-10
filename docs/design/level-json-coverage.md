# Level JSON: coverage checklist, quest-state variants, migration and save/publish plan

Repo path: `docs/design/level-json-coverage.md` · Owner: Desy · Written 2026-10-10 (PT) against main `e4e6a4a`; updated the same morning for the Director's answers, Jack's newer storage decision (the DB is the only source of truth for levels, §3.0) and Jack's decision to **drop zones**: one level = one graph = its own zone (§3.9).
Companion to GameDev's schema doc `docs/tech/level-editor.md`. GameDev leads the schema; this doc checks that it covers everything in our world, quest and dialogue data, and plans the migration.

**Status of GameDev's draft:** `docs/tech/level-editor.md` is **still pending**. It is not in main `e4e6a4a` or on any remote branch (re-checked `origin/*` on 2026-10-10 09:33 PT). The names `level_revisions` and the export endpoint come from GameDev's proposal as relayed by the Director; everything else uses the names in today's code (`server/dal/*`, `migrations/*.sql`, `/api/v1`). The "Draft" column below therefore reads **"no draft yet"** everywhere; GameDev can tick it off as the draft lands. Each section ends with **"Must be in the draft"**: the minimum the schema needs to cover.

> **Note from GameDev (2026-10-10 PT), added without changing Desy's text:** GameDev's draft has landed: [tech/level-editor.md](../tech/level-editor.md). Two later decisions by Jack change parts of this doc. (1) **Repo export:** the editor and backend still have no GitHub write access, but GameDev now exports published levels from its own box into `docs/data/levels/` (git history, backup, seed, CI and sim input; the DB wins). That supersedes "no copies of levels in GitHub" in §3.0, the temp-folder output in §3.4 step 1, the end of Q6, and "kept in Vercel and local env files" in Q15 (the export token lives only on GameDev's box). See [level-editor.md §9](../tech/level-editor.md#9-source-of-truth-db-live-repo-export-by-gamedev). (2) **Encounter odds:** Jack's spec lists them as a per-level setting; level-editor.md §2.4 proposes an optional clamped override, with `null` = global (question D4 there). The realm_1 split (§3.9.2 A, Q16) is treated there as **proposed, pending Jack**.

**Ground rules (from the existing spec, no new mechanics):**
- The editor writes the same data the game runs today. Every editor concept maps onto an existing field, condition or action; where a Jack word differs from ours, the mapping is in §1.0.
- **Source-of-truth split (§3.0):** GitHub `zenjax7/chinese-rpg` holds docs, schemas, validators, tools and a one-time migration seed. The **DB** holds levels and is the only source of truth for level content. Nothing in the editor or backend gets GitHub write access.
- Balance numbers stay global and are not editable per level: encounter rates, boss HP and ATK, prices, the 3-new-words cap.
- **No zones (Jack, via the Director, 2026-10-10 PT):** one level = one graph = its own zone. Everything a zone did is a **per-level setting** (§1.3). The migration from today's 20 zones is in §3.9.

Abbreviations: **L-JSON** = the proposed per-level JSON object; **G** = stays global (shared file, referenced by id).

---

## 1. Coverage checklist

### 1.0 Jack's editor words → our data

| Jack's word | Our data today | Note |
|---|---|---|
| map / level | one graph file (`graph/0.3`) | Jack: 1 level = 1 graph = its own zone (§3.1) |
| village | node `kind: village` (inn + save + item shop, no smith, no magic shop) | world-graph §2 |
| town | node `kind: town` + `town` number (sets shop tier) | |
| portal | node `kind: portal` + `portal` edge to another graph | v3.9.2: a portal is a node and an edge, **not** an event outcome |
| treasure | event outcome `treasure` with `openChest` | |
| NPC | node `kind: npc` with `npc` id, events with `dialogue`/`scene` | |
| quest battle | quest objective `kill` on an event `fight` (outcome `miniboss`) or an edge battle (`edge_battle`) | |
| word pool / enemies / bosses | today a zone (`zones.json`); after the migration **level settings**: `desyPool`, `roster`, `elite`, `boss` | one level = its own zone (§1.3, §3.9) |

### 1.1 Graph structure

| Field / concept | Today | In L-JSON or global | Draft |
|---|---|---|---|
| Level id, kind (`world` / `overworld` / `dungeon_level`), realm, title zh/en, status, background, music | graph top level | L-JSON top level | no draft yet |
| Nodes: `id`, `idx`, `kind`, `x`/`y` (normalised 0–1, 0.05–0.95) + graph `aspect` | `nodes[]` | L-JSON `nodes[]`; the editor canvas converts to and from 0–1 | no draft yet |
| Node kinds: town, village, inn, boss, miniboss, chest, story, npc, fork, waypoint, stairs_up, stairs_down, portal, exit, lever, shop | `kind` enum | L-JSON; the kind palette in the editor = this enum | no draft yet |
| Node fields `title`, `save`, `services`, `hub`, `town`, `shops`, `campfire`, `npc`, `fog`, `inBuild` | node | L-JSON | no draft yet |
| Node fields `zone` and `boss` (a zone id) | node | **dropped**: every node is in its level's zone. A `boss` node's fight is the level's boss record (§1.3) | no draft yet |
| Dead ends | a shape (a node with one edge), not a kind (v3.9.3) | nothing to store; the editor can highlight them | no draft yet |
| Edges: `id`, `idx`, `from`, `to`, `kind` (path, stairs, portal, exit, shortcut), `danger` 0–3, `steps`, `terrain`, `patrol`, `scripted {enemies, fill, once, step}`, `cond`, `opens`, `label` | `edges[]` | L-JSON `edges[]` | no draft yet |
| Cross-level edges (stairs, portals, exits): `to: {graph, node}`, listed on **both** sides | edge `to` object | L-JSON, both levels; the editor must create and delete the pair together | no draft yet |
| Multi-level dungeons: `dungeon`, `level`, `levels`, `optional` | graph top level | L-JSON top level; a dungeon = several levels sharing `dungeon` | no draft yet |
| `idxMax`, `edgeIdxMax` | graph top level | L-JSON; **append-only** (§3.3) | no draft yet |
| Safe-edge rules (town/inn adjacent, boss approach, portals, after a boss clear: 20 hops or until an inn rest) | `world_rules.safe` | G (computed by the game from the graph; the editor only shows them) | no draft yet |
| Encounter odds per danger 0/0.6/0.85/0.95, depth step +10%/level, max 0.95, walked × 0.05, battle budget 8, pity 2 | `world_rules` | G, not editable per level. Per level: only `danger` and `steps` on its edges and the graph `level` (depth). The budget resets when the word pool changes (§3.9.3) | no draft yet |
| Boss approach edge: `patrol: true`, exactly 1 per boss node | edge + zone `gateEdge` | L-JSON (edge flag). The level's boss record names it (`boss.gateEdge`) | no draft yet |
| Inns within `maxHopsToInn` (3 in realms 1–3, 5 later), an approach inn next to each boss | validator rule | G rule; the editor shows a warning live | no draft yet |
| Town/village density `ceil(nodes / (20 + 5(t−1)))` | validator rule | G rule; warning in the editor | no draft yet |

**Must be in the draft:** every node and edge field above, with the same names; cross-level edges as `{graph, node}`; `idx`/`edgeIdxMax`.

### 1.2 Events and outcomes

| Field / concept | Today | In L-JSON or global | Draft |
|---|---|---|---|
| Event: `id`, `node`, `on` (enter, firstEnter, clear, leave, rest, talk), `outcome`, `once`, `cooldown`, `cond`, `do[]`, `pick[]` (weighted: `weight`, `outcome`, `once`, `cooldown`, `cond`, `do`), `tutorial` | `events[]` | L-JSON `events[]` (or nested under each node; either works if ids stay `<node>.<n>`) | no draft yet |
| 6 outcomes: nothing, quest_offer, miniboss, item, story, treasure | `common.outcome` | G enum | no draft yet |
| Eligibility: at most one event per arrival, the first eligible one in list order | engine rule (world-graph §5.2) | G rule; **list order is data** and the editor must keep and show it | no draft yet |
| Conditions: all, any, not, flag, questActive, questClaimed, questDone, bossDefeated, visited, wordsReady, readinessAtLeast, levelAtLeast, hasItem, shortcutOpen | `common.cond` | G definitions; used in L-JSON. Note: the engine also reads `questReady`, which the schema lacks (gap, §1.6) | no draft yet |
| Actions: dialogue, toast, offerQuest, scene, startQuest, giveItem, giveGear, giveSkill, giveGold, openChest, fight, setFlag, openShortcut, unlockGraph, heal, teleport, defeatBoss | `common.action` | G definitions; used in L-JSON | no draft yet |
| Treasure: `openChest` `chest_normal` / boss chests; contents from `chest_contents.csv` (40/35/5/10/10) | event + global table | event in L-JSON; contents G | no draft yet |
| Realm-boss chest: 3 × G gold + Honey Potion + the realm's heroic piece (`bossReward.heroic`, combat-spec §6.3 and §7.2) + skill unlock | battle code + content `locations[].bossReward` | per level, in the boss record of the level that holds the realm-boss node (`boss.reward`); **not** a node event, or it would be given twice | no draft yet |
| Realm-boss Feather in realms 3, 6 and 8 | `world_rules.realmBossFeather` + an `on: clear` event on the boss node | G rule; the boss-node event in L-JSON | no draft yet |
| Seeded picks: event key `saveSeed|graphId|nodeId|visit` | `world_rules.seed` | G; depends on level, node and edge **ids** (§3.3) | no draft yet |

**Must be in the draft:** ordered events per node, `pick` with weights, the shared `cond`/`action` vocabulary, and no `portal` outcome.

### 1.3 Level settings: word pool, enemies and bosses (was: zones)

There is no zone record any more. Each level carries one `settings` block; the seed copies it from the zone(s) its nodes had (§3.9).

| Setting (per level) | From today | Note | Draft |
|---|---|---|---|
| `title` zh/en, `emoji`, `background` (`bg`), `music` | zone `title`, content `locations[]` `name`/`zh`/`emoji`/`bg`; music = today's default | the level's own title stays on the graph; this is the location name shown in battle | no draft yet |
| Word pool: `desyPool` (L1.1…L9.2) and `pool` (location pool name, e.g. `clover_hills`) | zone | picked by id (Q4). `pool` keeps today's key for the location's battle state (`S.locs`) and the review order, so saves don't change | no draft yet |
| Tier, `G`, `recLevel` | zone `tier`, content `locations[]` | G tables decide the values; the level shows them | no draft yet |
| Difficulty row: `mcOptions`, `reviewSlots`, `pathFights`, `maxNewPerBattle` | `realm_location_difficulty.csv` by `desyPool` | G, read-only in the editor (decision 17) | no draft yet |
| Enemies: `enemiesPerBattle`, `roster` (enemy + weight), `packs`, `elite`, `scriptedElite` | zone | enemy **ids** only (Q5) | no draft yet |
| Encounter odds | edge `danger`/`steps`, graph `level` | rates stay G (`world_rules`) | no draft yet |
| Boss record (only in a level that holds a boss node): `boss.node`, `boss.gateEdge`, `boss.kind` (locboss/realmboss), `boss.enemy`, `boss.reward` (realm boss: `bossReward`) | zone `bossNode`, `gateEdge`, `bossKind`, `boss`; content `bossReward` | at most one boss node per level (true for all 38 levels after §3.9.2) | no draft yet |
| Unlock order (`unlockRequires`) | zone | the previous boss **level** id; the gating itself stays on edges (`cond bossDefeated`, §3.9.4) | no draft yet |

- Word pool contents (47–60 items per location, authored order, `curriculum_location_pools.csv`), the 3-new cap, Tired caps, enemy stats (`combat_data.json`, `enemies.csv`) and boss HP targets (`boss_hp.csv`) stay **G**, as before. The editor warns if a boss of another tier or type is picked.
- Realm 3–9 content (`content/realm_N.json`) is generated by the server at publish from the level settings plus the global tables (§3.6). `locations[]` there = one row per distinct `pool`.

**Must be in the draft:** a per-level `settings` block with the fields above; pool and enemies as **ids**, never copied stats; no zone records and no node `zone` field.

### 1.4 World, progress and RNG

| Field / concept | Today | In L-JSON or global | Draft |
|---|---|---|---|
| Realm links: `realms[]` (realm, node, graph, entry, enterEdge, exitEdge, linkEdge, unlock, `realmBossZone` → **`realmBossLevel`**, next) | `world.json` | L-JSON of the `world` level | no draft yet |
| Unlocks: realm N needs `bossDefeated` of realm N−1's realm-boss **level**; edges `cond bossDefeated` name the boss level | world.json + edges | world level + edges; mapping in §3.9.4 | no draft yet |
| Exit edges: one `exit` edge per realm overworld, entry settlement → world node, danger 0, last `idx` | overworld edges | L-JSON (overworld) | no draft yet |
| Fog: node `fog: "landmark"`; visited/walked/revealed bitsets by `idx` | node field + `progress/0.3` | node field in L-JSON; progress G (save format) | no draft yet |
| Progress: pos, lastInn, visitedTowns, eventsDone (event ids), eventLastFired, shortcuts, zonesDefeated (→ boss **level** ids), the battle budget `zone {id, freshBattles, pity}` (id = the level's `pool`), flags, feathers | `progress.schema.json` | G; keys are level, node, edge and event **ids** and **idx** values, so these must stay stable. One-time save migration in §3.9.4 | no draft yet |
| Seed: `mulberry32(fnv1a32(key))`, edge key `saveSeed|graphId|edgeId|crossing|step`, 3 test vectors | `world_rules.seed` | G | no draft yet |
| Start position `{graph: realm_1, node: village}`, `renames` | `index.json` | G; the server generates the index from the published levels (§3.6). Note: the game does **not** apply `renames` today (§3.7) | no draft yet |

**Must be in the draft:** the world level's `realms[]`; and that ids and idx values are save keys (§3.3).

### 1.5 Quests

| Field / concept | Today | In L-JSON or global | Draft |
|---|---|---|---|
| Quest: id, realm, zone (→ **level**, §3.9.5), pool, story (main/side), type, title, `requires`, `order` (all `sequence`), `repeatable: false`, `words`, `summary` | `quests.json` (quest/0.2, 50 quests) | Quest definition owned by the **giver's** level (`quests[]`), see §2 | no draft yet |
| Giver `{npc, graph/node | zone+nodeKind+position, ref}` (after the seed: `graph/node` only); `turnIn` giver / auto / other NPC; `returnToGiver` | quest | resolved to `graph/node` in the L-JSON (positions are resolved by `build_world.py` today) | no draft yet |
| Steps (`objectives[]`): `id`, `event`, `objective.type` (kill, collect, reach, talk, words, deliver, escort), `where` | quest | quest definition; each step's node gets a variant (§2) in its own level | no draft yet |
| Jack's step kinds: fight = `kill` (miniboss event or edge battle), pickup = `collect` (`source: nodeItem`), escort, words, story/scene = `reach`/`talk` + scene | `desyType` keeps the old verb | same | no draft yet |
| Escort `{npc, to}`: follows, never in battle, can't be harmed, waits at the last inn after a defeat, goes back to the giver if dropped | quests.md §2a | G rule; data = `npc`, `to` | no draft yet |
| Words `{pool, n}`: correct battle answers to pool items, practice and Preview don't count, n defaults to 10 | quests.md §2a | G rule; data = `pool`, `n` | no draft yet |
| Rewards: gold (`G` multiple), exp (`L` multiple), items, gear, spells, skills, flags | quest `rewards` | quest definition; values stay multiples of G/L | no draft yet |
| Scenes: `offer`, `progress`, `turnIn` | quest `scenes` | the node variants in §2 | no draft yet |
| Hooks: 55 NPC slots (29 quest, 26 ambient banter) | `quests_world.json` | per node in L-JSON (giver/turn-in nodes); `speakers` and `questItems` stay G | no draft yet |
| Cross-level quests: at least 13 of 50 quests have a giver and steps in different graphs (counting only positions that already carry a ref) | quest `where` | §2.4 | no draft yet |

**Must be in the draft:** quest ids, step ids and every step type above; giver, turn-in and step positions as resolved `graph/node`; rewards as G/L multiples.

### 1.6 Dialogue

| Field / concept | Today | In L-JSON or global | Draft |
|---|---|---|---|
| Scene/0.2: `id` `sc_*`, realm, zone (→ the trigger node's **level**), `density` D1–D6, `trigger {on, graph/node, cond, replaces}`, background, music, once, `slots` L1/L2/R1/R2 `{char, expr}`, `words`, `teaches` (≤ 3), `onEnd` | `data/dialogue/sc_*.json` (7 files) | L-JSON `scenes{}`, in the level of the trigger node | no draft yet |
| Lines: `id`, `speaker`, `portrait`, `side` (incl. `none` for the narrator), `expr`, `en` with `{Cxxx}` tokens, optional `zh` (D3+ full sentence), `zhTrad`, `zhId`, `tokens`, `vo`, `if`/`else`, `setFlags`/`clearFlags`, `goto`, `end`, `swap` | scene lines | L-JSON | no draft yet |
| Choices: `id`, `en`, `tokens`, `goto`, `setFlags`, `correct` | line `choices` | L-JSON | no draft yet |
| Inline graph dialogue (197 keys, `{speaker, en, tokens}` lines) | graph `dialogue{}` | converted to scene/0.2 in the same L-JSON (§3.4), so there is **one** dialogue format | no draft yet |
| Met rule: a line uses only items from the scene's location pool or earlier ones; density limits per tier | `validate_dialogue.py` | G rule; the server runs it on save and publish; CI runs it on the seed | no draft yet |
| Traditional stored: `zhTrad` generated by OpenCC s2tw | scene lines | stored in the L-JSON, generated on save (not typed) | no draft yet |
| No pinyin in the game UI (decision 18); pinyin lives only in the curriculum | rule | the schema has **no pinyin field**; the editor shows none | no draft yet |
| Speakers and portraits: `npcs{}` in graphs, `speakers` in quests_world, characters.md, 7 expressions | several places | G registry (one `characters` table), referenced by id | no draft yet |
| `{hero}` placeholder | lines | G rule | no draft yet |

**Must be in the draft:** scene/0.2 as is (no new line format); `zhTrad` stored; no pinyin field; speakers by id.

### 1.7 Gaps in today's data to fix during the migration (not new mechanics)

- `quest/0.2` objective `event` still allows `portal`, and 9 steps use it (q4_lost_schoolbag s2, q4_school_bell s2, q5_fog_bottle s2, q6_old_mine s1, q7_glacier_roses s3, q8_lost_ball s2, q8_fan_letters s2, q8_caged_beasts s2, q9_pact_elves s2). The outcome was dropped in v3.9.2. These steps become `reach` steps at the portal **node**.
- `common.cond` lacks `questReady`, which the engine reads. Add it to the schema.
- `questDone` and `questClaimed` mean the same thing in the engine (`completed`). Keep one name in the editor UI.
- The 150 quest scene references (`offer`/`progress`/`turnIn`, 150 distinct ids) include 148 with no scene file (only `sc_q1_hoe_offer` and `sc_q1_hoe_thanks` exist). The game falls back to a default line. The editor should list these as "to write" and not count them as errors.
- 117 positions (28 givers, 89 steps) are still `zone + nodeKind + position` with no `ref`, and are resolved at build time. Migration writes the resolved `graph/node`. With zones gone this is required, not optional: all 259 giver, turn-in, step and escort positions resolve today (checked 2026-10-10 against `e4e6a4a`), so the seed freezes them (§3.9.5).

---

## 2. Quest-state variants

### 2.1 The three states are the runtime states we already have

| Jack's state | Runtime state (engine) | Condition today | What plays today |
|---|---|---|---|
| pre-quest | not started and available (`requires` met) | `not questActive`, `not questDone` | `offerQuest` → scene `offer` |
| in-quest | `active`; becomes `ready` when the last step before turn-in is done | `questActive` (`questReady`) | at the giver: scene `progress`; at step nodes: the item, fight or line gated by `questActive` |
| post-quest | `completed` | `questDone` | at turn-in: scene `turnIn` plus the quest's rewards, once; later visits: an ordinary story line |

"The giver repeats the quest and asks if you're done" is the existing `progress` scene; "are you done?" is the existing turn-in check (`ready` → `turnIn` scene → rewards). Nothing new is needed.

### 2.2 Proposed shape (on the node, in the node's own level)

```json
{"id": "m_farm", "kind": "npc", "npc": "farmer_li",
 "quests": [
  {"quest": "q1_hoe", "role": "giver",
   "pre":  {"scene": "sc_q1_hoe_offer"},
   "in":   {"scene": "sc_q1_hoe_wait"},
   "post": {"scene": "sc_q1_hoe_thanks", "after": "sc_q1_hoe_after"}}]}

{"id": "m_well", "kind": "waypoint",
 "quests": [
  {"quest": "q1_hoe", "role": "step", "step": "s3",
   "in": {"do": [{"giveItem": "farmers_hoe", "qty": 1}], "outcome": "item"}}]}
```

- `role`: `giver`, `turnIn` (a different NPC hands in) or `step`.
- `pre` (giver only): the offer scene; the server adds `offerQuest` when it compiles the level.
- `in`:
  - giver: the progress scene;
  - step: what appears at that node while the quest is active, as an ordinary event body (`do` + `outcome`: the item, the `fight` for a quest battle, a `scene`). An escort target or words step needs no node variant.
- `post`:
  - giver/turnIn: the turn-in scene. Rewards are **not** repeated here; they come from the quest definition, so there is one source.
  - `after` (optional): the closing line on later visits (today a plain `story` event, e.g. `farmer_thanks`).
- Variants are **compiled to what the game runs today** (events with `cond questActive`/`questDone`, `quest.scenes`), so the engine doesn't change. The editor shows the three tabs; the data stays the same.

### 2.3 Multi-step quests

- Steps stay in the quest definition, in order (`order: sequence`): only the current step listens, and counters start when it becomes current (quests.md §2a).
- Each step with a place gets one `role: step` variant on its node, keyed by `step` id. Several steps can share a node (q1_hoe s2 and s3 are both at `m_well`).
- The `in` variant is visible while the quest is active (today's `questActive` gating). The editor warns when a step's node is reachable before that step is current (for example, an item step placed before the "reach" step that leads to it), rather than adding a new "current step" condition.

### 2.4 Cross-level quests

- The quest **definition** (steps, rewards, `requires`) lives in the giver's level (`quests[]`).
- Step variants live on their nodes in **their** levels and reference the quest by id: `{"quest": "q6_old_mine", "role": "step", "step": "s2"}`.
- Steps reference nodes as `graph/node`, exactly as the cross-graph quests do today (e.g. q6_old_mine, q8_singer_escort).
- At publish the server assembles the runtime quest list (quest/0.2) from all published levels, and the validator checks both directions: every step has a variant on its node; every variant points at a real quest and step.
- The editor shows a quest view (giver, steps, turn-in across levels) that jumps between levels.

---

## 3. Storage, migration and save/publish

### 3.0 Source-of-truth split (Jack's decision, relayed 2026-10-10 PT)

| Where | Holds | Is the truth for |
|---|---|---|
| GitHub `zenjax7/chinese-rpg` | docs, JSON Schemas (`level/0.1` and the shared `common`, `progress`, `scene`, `quest`), validators, tools, the global tables (curriculum and pools, enemies, boss HP, economy, items, gear, spells, towns, `world_rules`), and a **one-time migration seed** of the v3.9.x data | docs and tables (the Oct 9 rule still holds for them) |
| DB (Neon, behind `/api/v1`) | levels: drafts, published versions and the full history in `level_revisions` | **level content**, the only copy after cutover |
| Sim and Desy's tools | nothing of their own | they read current levels from the read-only export endpoint (§3.8) |

Rules:
- **No copies of levels in GitHub.** There is no `docs/data/levels/`, no auto-export and no pull request. Nothing in the editor or backend has GitHub write access.
- After cutover, levels are edited **only in the editor**. The v3.9.x files under `docs/data/world/graphs/`, `zones.json`, `quests_world.json`, `quests.json` and `dialogue/` become the frozen seed. They are not edited again, and they are not the game's source.
- History and rollback come from `level_revisions` (§3.7). For an offline copy, the editor has a manual **Download JSON** button.

Proposed wording for docs/README.md "Which doc wins" (for the Director and GameDev to adopt; not in decisions.md):
> GitHub is the source of truth for docs, schemas, tools and tables. Level content (maps, events, quests and dialogue per level) lives only in the editor's database: the DB holds drafts, the published versions and their history (`level_revisions`). The v3.9.x level files in the repo are a frozen migration seed used for tests. Tools and the sim read current levels from the export endpoint.

### 3.1 What a level is

- **Decided (Jack, 2026-10-10): 1 level = 1 graph = its own zone.** Today's data has 36 graphs:
  - `world`;
  - 9 realm overworlds;
  - 26 dungeon levels in 12 dungeons.

  After the zone migration there are **38 levels**: `realm_1` becomes three levels (`realm_1`, `clover_hills`, `warren`; §3.9.2, Q16).
- A graph is what Jack draws, and it is the unit the game loads, the save keys on and the RNG hashes.
- There are no zone records. A zone that spans several graphs is copied into each of those levels' settings; a graph that held 2–3 zones is handled in §3.9.2.
- Multi-level dungeons stay separate levels joined by stairs. The editor groups them by `dungeon` and edits the stairs pair together.

### 3.2 Per-level JSON contents

`{schema: "level/0.1", id, version, graph fields…, settings{} (§1.3, incl. the boss record), nodes[] (with quests[] variants, no `zone`), edges[], events[], quests[] (given here), scenes{}, npcs (refs)}`.

Global files stay in the repo and are referenced by id: `world_rules.json`, curriculum and pools, enemies, combat data and boss HP, economy, items, gear, spells and towns, the characters registry, and `progress.schema.json`. The server bundles them at deploy, because the validators and the compile step need them.

### 3.3 Id stability (append-only)

- Saves key on level ids, node, edge and event ids and `idx` values: `eventsDone`, visited/walked bitsets, `lastInn`, `visitedTowns`, `zonesDefeated` (boss level ids after §3.9.4). The RNG also hashes them.
- The seed keeps **every id and idx exactly**, except the realm_1 split (§3.9.2): its 10 Clover Hills and Warren nodes keep their ids but move to two new levels with new `idx` values, and old saves are migrated once.
- New nodes and edges get the next `idx` (append-only; `idxMax`/`edgeIdxMax` only grow). Event ids (`<node>.<n>`) are append-only too. A deleted id is retired, never reused, and the server remembers retired ids per level so the editor can't hand them out again.
- Ids can't be edited once a level has been published (Q3). Before the first publish they are free.

### 3.4 One-time migration seed

1. **`tools/level/split_levels.py`** (new, in the repo) reads the v3.9.x files:
   - `docs/data/world/graphs/*.json`, `zones.json` (read once to fill level settings), `content/realm_N.json`, `quests_world.json`;
   - `docs/data/quests/quests.json`;
   - `docs/data/dialogue/sc_*.json`.

   It writes 38 `level/0.1` objects (to a temp folder or stdout, **not** into the repo):
   - each level's `settings` are copied from its zone (§3.9.1); the boss record goes to the level holding the boss node; node `zone` fields are dropped;
   - `realm_1` is split into `realm_1`, `clover_hills` and `warren` (§3.9.2);
   - `bossDefeated` conditions, `realms[].realmBossZone` and the quests' zone references become level ids (§3.9.4, §3.9.5);
   - quests go to their giver level;
   - scenes go to their trigger node's level, with quest scenes on the giver's or step node's level;
   - inline `dialogue{}` becomes scene/0.2;
   - hooks become node `quests[]` variants;
   - positions are resolved to `graph/node` using `build_world.resolve_pos`;
   - the 9 `portal` steps become `reach` (§1.7).
2. **`tools/level/join_levels.py`** rebuilds the v3.9.x files from those levels.
3. **Round trip (CI):** `join(split(seed))` must equal the seed **byte for byte**, except for a listed set of intended changes (the 9 portal steps, resolved positions, inline dialogue converted to scene/0.2, and the zone → level changes of §3.9: no `zones.json`, the realm_1 split, level ids in conditions and quests). Each intended change must be in the list. This test, and the full `validate_all.py` on the seed, keep running in CI as regression tests for the converters and validators. Split and join are used only for the seed and for tests; they never touch live levels.
4. **Seeding the DB:** a one-time server script (`server/seed-levels.mjs`, next to `server/migrate.mjs`) runs after `npm run db:migrate`:
   - it runs `split_levels` on the seed;
   - it validates each level server-side (§3.5);
   - it inserts each level as **published version 1**, with an identical draft, in one transaction;
   - it writes one `level_revisions` row per level (`version 1`, `note: "v3.9.x seed"`, content hash).

   It refuses to run if the levels table isn't empty. **Check:** `GET` export of all 38 levels, then `join_levels`, must reproduce the seed with the same listed differences. Only then is cutover declared.
5. **After cutover:** Desy's world generators (`world_gen.py`, `make_world_data.py`) are no longer used for levels. `build_world.py` and `make_realm_content.py` run on the server's compile step (§3.6), or are ported there.

### 3.5 Validators (server-side)

- **Ported to TypeScript** in `server/` and run on every save and publish. They cover:
  - JSON Schema checks with ajv (as `server/progress.ts` already does);
  - the graph rules from `tools/world/validate_world.py`: references, two-way stairs, reachability, inn distance, beeline battle range, density, realms[] and exit edges, seed vectors, heroic sources. The per-zone checks become per-level: a level's settings name an existing pool and enemies; a level with a boss node has exactly one boss record and one patrol gate edge; a level without one has no boss record;
  - the quest checks from `build_quests.py` and `build_world.py`: positions resolve, variant ↔ step both ways (§2.4);
  - the dialogue met and density rules from `validate_dialogue.py`.
- **Scope:** every check runs on the level being saved **plus the other levels as currently published**. Cross-level rules (stairs pairs, realm links, cross-level quests) therefore see the whole world.
- **Parity:** the Python validators stay in the repo for CI on the seed. A CI parity test runs both the Python and the TypeScript validators on the seed and on a set of known-bad fixtures, and requires the same errors and warnings.
- **On save:** all checks run, and the result is stored with the draft and shown in the editor. Warnings never block. For errors, see Q11 (working default: the draft is still saved and flagged, so Jack never loses work).
- **On publish:** hard errors block publish; warnings are shown and allowed.

### 3.6 Save, publish and how the game loads levels

- **Editor:** `/editor` on Vercel, behind Google sign-in limited to Jack (Q10). The routes sit under `/api/v1/editor/*` in `server/router.ts` (zod-parsed, DAL in `server/dal/levels.ts`, no SQL in handlers), the same pattern as the existing API.
- **Save:** writes the draft (`levels.draft`, `draft_rev`) and the validation result. A save uses a `draft_rev` check, so two tabs can't overwrite each other silently.
- **Publish:**
  - validates (§3.5);
  - bumps `levels.published_version` by 1;
  - writes the full JSON into a new `level_revisions` row (level id, version, JSON, content hash, published at, published by, note);
  - recompiles the runtime data (index, quest list, realm content);
  - all in one transaction.

  A cross-level change (e.g. a stairs pair, or a quest whose steps are in another level) can be published **as a set**: several levels validated together and committed in one transaction (Q12).
- **Game:** loads the published levels from the API (a public, read-only, cacheable route for published versions only, e.g. `GET /api/v1/levels/index` and `GET /api/v1/levels/:id`), and reports the version it loaded. This needs a decision for the GitHub Pages build (Q13).

### 3.7 Versions, saves, RNG and rollback

- **Version per level:** `published_version` is an integer that only grows. The runtime index lists `{id, version, hash}` per level, and a save records the versions it last played (a field next to `progress.dataVersion`, GameDev's schema).
- **Effect on saves of an edit after publish:**
  - added nodes, edges and events: new ids and idx values, so old bitsets, `eventsDone` and `lastInn` stay valid;
  - changed content under an existing id (text, a pick weight, a reward): the save keeps working. A `once` event already in `eventsDone` stays done; to make it fire again, it needs a new id;
  - deleted node: a save standing on it moves to the start position (today's code, `src/ui/graph.ts:462`). Today's code does **not** yet handle a deleted `lastInn` or `visitedTowns` entry (`progress.ts` only checks the id format, and the Feather list keeps nodes it can't find). GameDev should add the same load-time cleanup: `lastInn` falls back to the start, and missing towns are dropped. That is a robustness fix, not a game rule. Publish **warns** when a delete hits a town, village, inn or quest node (Q14);
  - `index.json` `renames` exists in the data but the game doesn't apply it today, so "rename after publish" isn't available unless GameDev implements it. Ids stay fixed (Q3).
- **Effect on the RNG:** keys hash `graphId`, `edgeId`/`nodeId` and the crossing and visit counters, never `idx` or list positions. Unchanged edges keep their exact rolls. An edited edge (new `danger` or `steps`) re-uses the same rolls with the new chance. A new edge gets new rolls and moves no others. The 3 test vectors don't change.
- **Rollback:** pick an older `level_revisions` row and publish it again as a **new** version (version N+1 with vM's content). It goes through the same publish validation, and history is never rewritten. Ids added after vM disappear, so saves that used them follow the "deleted" rules above. A rollback of a set is a set publish.
- **Manual download:** the editor's **Download JSON** gives the draft or any revision as one file per level (or a zip of all 38), for offline copies and bug reports.

### 3.8 Export endpoint for tools and the sim

- GameDev's proposal: a **read-only, editor-authenticated** endpoint, e.g. `GET /api/v1/editor/export?state=published|draft[&level=…]`, returning `level/0.1` objects plus the published versions.
- **Desy's tools and the sim** pull from it. `join_levels.py` turns the export into the v3.9.x file shapes the existing Python (world_graph loader, sim, validators) already reads, so nothing else has to be ported.
- **Auth for scripts:** the tools need a credential that isn't Jack's Google session, e.g. a read-only export token scoped to this route, stored outside the repo (Q15).
- **No path writes back:** the endpoint is GET-only, and the tools never write to the DB.

### 3.9 Dropping zones: migration from today's data

Jack's decision (via the Director, 2026-10-10 PT): **drop zones as a separate concept. One level = one graph = its own zone.** Everything a zone did becomes a level setting (§1.3). This section maps today's 20 zones onto the levels, checked against main `e4e6a4a`. Helper scripts and raw outputs are in the handoff folder (`work/`); they are not for the repo.

#### 3.9.1 Every graph → its settings

- 25 of the 36 graphs hold exactly one zone; they copy it.
- 9 graphs hold their own zone plus **one stray exit node** from the next zone (§3.9.2 B).
- `realm_1` holds three real zones (§3.9.2 A).
- `world` has no zone and no battles.
- A zone that spans several graphs (14 of 20, 2–5 graphs each) is **copied** into each of them, so every floor of a dungeon keeps today's pool, roster and difficulty row.
- The **boss record** goes only to the level holding the boss node. Each of the 20 boss nodes is in exactly one graph, and after the realm_1 split no level holds more than one.

| # | Level (graph) | Realm | Kind | Nodes | Zone(s) today (nodes) | Settings copied from | Boss record |
|---|---|---|---|---|---|---|---|
| 1 | `world` | — | world | 9 | — | — (world map, no battles) | — |
| 2 | `realm_1` | 1 | overworld | 17 | meadow (7), warren (6), clover_hills (4) | split into 3 levels (§3.9.2) | meadow locboss `m_crow`; clover_hills locboss `c_den`; warren realmboss `w_throne` |
| 3 | `realm_2` | 2 | overworld | 12 | forest (11), great_hive (1) | `forest` (L2.1) | forest locboss `boss_1` |
| 4 | `great_hive_1` | 2 | dungeon_level | 13 | great_hive (13) | `great_hive` (L2.2) | great_hive realmboss `boss_2` |
| 5 | `realm_3` | 3 | overworld | 27 | crossroads_highway (26), night_bazaar (1) | `crossroads_highway` (L3.1) | crossroads_highway locboss `boss_1` |
| 6 | `bazaar_cellars_1` | 3 | dungeon_level | 14 | night_bazaar (14) | `night_bazaar` (L3.2) | night_bazaar realmboss `boss_3` |
| 7 | `realm_4` | 4 | overworld | 5 | cave_mouth (5) | `cave_mouth` (L4.1) | — |
| 8 | `goblin_caves_1` | 4 | dungeon_level | 21 | cave_mouth (20), crystal_tunnels (1) | `cave_mouth` (L4.1) | cave_mouth locboss `boss_1` |
| 9 | `goblin_caves_2` | 4 | dungeon_level | 15 | crystal_tunnels (14), goblin_school (1) | `crystal_tunnels` (L4.2) | crystal_tunnels locboss `boss_1` |
| 10 | `goblin_caves_3` | 4 | dungeon_level | 19 | goblin_school (19) | `goblin_school` (L4.3) | goblin_school realmboss `boss_4` |
| 11 | `realm_5` | 5 | overworld | 34 | misty_marsh (33), hydra_s_lair (1) | `misty_marsh` (L5.1) | misty_marsh locboss `boss_1` |
| 12 | `hydra_lair_1` | 5 | dungeon_level | 33 | hydra_s_lair (33) | `hydra_s_lair` (L5.2) | — |
| 13 | `hydra_lair_2` | 5 | dungeon_level | 13 | hydra_s_lair (13) | `hydra_s_lair` (L5.2) | hydra_s_lair realmboss `boss_5` |
| 14 | `realm_6` | 6 | overworld | 37 | gloomy_village (36), moonlit_graveyard (1) | `gloomy_village` (L6.1) | gloomy_village locboss `boss_1` |
| 15 | `moonlit_crypt_1` | 6 | dungeon_level | 11 | moonlit_graveyard (11) | `moonlit_graveyard` (L6.2) | — |
| 16 | `moonlit_crypt_2` | 6 | dungeon_level | 45 | moonlit_graveyard (45) | `moonlit_graveyard` (L6.2) | moonlit_graveyard realmboss `boss_6` |
| 17 | `old_mine_1` | 6 | dungeon_level | 13 | gloomy_village (13) | `gloomy_village` (L6.1) | — |
| 18 | `realm_7` | 7 | overworld | 75 | windy_cliffs (74), griffin_summit (1) | `windy_cliffs` (L7.1) | windy_cliffs locboss `boss_1` |
| 19 | `cloud_caves_1` | 7 | dungeon_level | 23 | windy_cliffs (23) | `windy_cliffs` (L7.1) | — |
| 20 | `griffin_spire_1` | 7 | dungeon_level | 10 | griffin_summit (10) | `griffin_summit` (L7.2) | — |
| 21 | `griffin_spire_2` | 7 | dungeon_level | 15 | griffin_summit (15) | `griffin_summit` (L7.2) | — |
| 22 | `griffin_spire_3` | 7 | dungeon_level | 7 | griffin_summit (7) | `griffin_summit` (L7.2) | griffin_summit realmboss `boss_7` |
| 23 | `realm_8` | 8 | overworld | 91 | training_pits (90), grand_colosseum (1) | `training_pits` (L8.1) | training_pits locboss `boss_1` |
| 24 | `beast_pens_1` | 8 | dungeon_level | 20 | training_pits (20) | `training_pits` (L8.1) | — |
| 25 | `beast_pens_2` | 8 | dungeon_level | 4 | training_pits (4) | `training_pits` (L8.1) | — |
| 26 | `undercroft_1` | 8 | dungeon_level | 16 | grand_colosseum (16) | `grand_colosseum` (L8.2) | — |
| 27 | `undercroft_2` | 8 | dungeon_level | 17 | grand_colosseum (17) | `grand_colosseum` (L8.2) | — |
| 28 | `undercroft_3` | 8 | dungeon_level | 17 | grand_colosseum (17) | `grand_colosseum` (L8.2) | grand_colosseum realmboss `boss_8` |
| 29 | `realm_9` | 9 | overworld | 48 | demon_king_s_gate (48) | `demon_king_s_gate` (L9.1) | — |
| 30 | `demon_castle_1` | 9 | dungeon_level | 41 | demon_king_s_gate (41) | `demon_king_s_gate` (L9.1) | — |
| 31 | `demon_castle_2` | 9 | dungeon_level | 25 | demon_king_s_gate (24), throne_hall (1) | `demon_king_s_gate` (L9.1) | demon_king_s_gate locboss `boss_1` |
| 32 | `demon_castle_3` | 9 | dungeon_level | 26 | throne_hall (26) | `throne_hall` (L9.2) | — |
| 33 | `demon_castle_4` | 9 | dungeon_level | 12 | throne_hall (12) | `throne_hall` (L9.2) | — |
| 34 | `demon_castle_5` | 9 | dungeon_level | 9 | throne_hall (9) | `throne_hall` (L9.2) | throne_hall realmboss `boss_9` |
| 35 | `shadow_vault_1` | 9 | dungeon_level | 21 | demon_king_s_gate (21) | `demon_king_s_gate` (L9.1) | — |
| 36 | `shadow_vault_2` | 9 | dungeon_level | 19 | demon_king_s_gate (19) | `demon_king_s_gate` (L9.1) | — |

#### 3.9.2 Graphs that held 2–3 zones

**A. `realm_1` (Meadow, Clover Hills, Warren, each with its own boss): recommend (a), a split into 3 levels.**

| Option | What happens | Verdict |
|---|---|---|
| (a) Split | `realm_1` keeps the village and the 7 Meadow nodes (ids **and idx unchanged**). New levels `clover_hills` (4 nodes) and `warren` (6 nodes) keep their node, edge and event ids. | **Recommended.** Only option that keeps L1.1/L1.2/L1.3, the 3 bosses and the 3 patrol gates exactly. |
| (b) One setting for the whole graph | Meadow's L1.1 pool and roster everywhere. | Breaks the curriculum: the 98 L1.2 + L1.3 pool items (47 + 51) are never taught in graph mode. Big Grey Wolf and the Rabbit King would fight in the L1.1 pool. Two patrol gates would check the wrong pool. |
| (c) Union pool (L1.1 + L1.2 + L1.3) | One level, one pool of 150 items. | Not faithful. The approach-inn patrol rule measures readiness on the **location pool**, so the 3 gates would trigger differently. |

How the split works with no new mechanics:
- A path edge with steps can't cross levels. Only stairs, portal and exit links do, and they are safe and step-free.
- The two boundary edges therefore move into the **destination** level with one new entry node each:
  - `realm_1/m_crow` —`portal` link (cond `bossDefeated: realm_1`)→ `clover_hills/c_gate` —`e7` (danger 2, 5 steps, unchanged)→ `c_hills`;
  - `clover_hills/c_den` —`portal` link (cond `bossDefeated: clover_hills`)→ `warren/w_gate` —`e11` (danger 2, 4 steps)→ `w_path`.
- Links are two-way pairs, like `world/x_realm_1`, a `portal` edge between two non-dungeon graphs today.
- Battles are **identical** to today: same edges, same steps, same pool per edge, same budget resets (§3.9.3, realm 1 delta 0.00).
- The exit `x_w_throne` moves to `warren`. The world map's realm-1 link stays `world/realm_1 → realm_1/village`.
- **Save migration (one time):** the realm_1 bits for node idx 7–16 and edge idx 8–18 move to the new levels' idx. The same goes for `pos`, `lastInn` (`c_camp`, `w_camp`) and `visitedTowns`. `eventsDone` keys are event ids and don't change.
- **RNG:** moved edges get new roll streams (the key includes the graph id). A save in the middle of `e7` or `e11` restarts that edge, as after any load.
- `tests/world.mjs` and the classic quick-start mapping (`graph.ts:59–61`) name realm 1 zones and need the new ids.

**B. 9 graphs with one stray exit node of the next zone: recommend (c), the stray node joins its own graph's level.**

| Level | Stray node (old zone) | Approach edge from the boss | Steps (danger 2) |
|---|---|---|---|
| `realm_2` | `portal_1` (great_hive) | `e6` | 2 |
| `realm_3` | `portal_1` (night_bazaar) | `e6` | 2 |
| `goblin_caves_1` | `stairs_2` (crystal_tunnels) | `e6` (tunnel) | 4 |
| `goblin_caves_2` | `stairs_2` (goblin_school) | `e6` | 3 |
| `realm_5` | `portal_1` (hydra_s_lair, event `portal_1.1`) | `e9` | 2 |
| `realm_6` | `portal_1` (moonlit_graveyard) | `e11` | 1 |
| `realm_7` | `portal_1` (griffin_summit) | `e11` | 1 |
| `realm_8` | `portal_1` (grand_colosseum, event `portal_1.1`) | `e11` | 1 |
| `demon_castle_2` | `stairs_2` (throne_hall) | `e7` | 1 |

- **Why (c):**
  - no ids, idx values, edges or saves change;
  - the node is only the doorway;
  - the `portal_1.1` events are quest lines (q5_fog_bottle, q8_fan_letters) gated by `questActive`, not by zone.
- **Option (a)**, a split, would mean moving each approach edge into the next level with a new entry node, as in realm_1. That changes 9 maps and 9 boss nodes and needs a save migration, all for 17 steps.
- **Option (b)** is what (c) does here.
- **Effect:** only the 9 approach edges change (17 danger-2 steps in total):
  - they now roll with the level just cleared: its pool, roster and elite, under that level's budget;
  - before, they used the next location's pool and roster with a fresh budget;
  - tier and `enemiesPerBattle` are the same on both sides in all 9 cases.
- The next location's battles now start one edge later, inside its own level.
- The approach edge starts at the boss node, so it is only walked after the boss is beaten.

#### 3.9.3 Battle budget and the encounter re-run

- **Battle budget (`zoneBattleBudget` 8, `pityRolls` 2):** today it resets when you walk onto an edge of a different zone. Floors of one dungeon share it.
- **Recommendation:** reset it when the **level's word pool** changes. Pool and zone are 1:1 today (20 pools, 20 zones), so this is today's rule with the zone taken out.
- Keying it on the **level id** instead would be a large unintended change: explorers would get **+7 to +41 battles per realm** in realms 5–9, because every dungeon floor would get a fresh 8.
- **Re-run:** the recommendation changes encounters on the 9 approach edges, so I re-ran the encounters with the same rules as `stepRate`/`rollStep`:
  - 4,000 Monte Carlo runs per realm;
  - **beeline**: the `validate_world` routes, previous boss → next approach;
  - **explorer**: every danger edge of the realm walked once, zone by zone.
- Encounters don't depend on accuracy or spending, so these counts are the same for the 50% saver, the 50% spender and the 75% saver.
- **The full profile sim** (time, defeats, Feathers) **could not be re-run.** `world_sim.py` and the spells chain are not on the box or in the repo. The effects below are small (at most 2 battles per realm on beeline, about 0 for explorers), so I expect time and defeats to move by about 1% or less. A full re-run is pending once the sim reads the export endpoint.

| Realm | Beeline today | Budget per level id | **Recommended** (per level pool) | Δ | Battles moved to the cleared pool | Explorer today → recommended (per level id) |
|---|---|---|---|---|---|---|
| 1 | 21.77 | 21.77 | **21.77** | +0.00 | 0.00 | 23.77 → 23.77 (23.77) |
| 2 | 14.31 | 13.21 | **13.21** | -1.10 | 0.61 | 16.52 → 16.46 (16.46) |
| 3 | 14.31 | 13.21 | **13.21** | -1.10 | 0.61 | 17.13 → 17.09 (17.09) |
| 4 | 22.60 | 20.56 | **20.56** | -2.04 | 3.63 | 26.24 → 26.25 (26.79) |
| 5 | 14.46 | 14.09 | **14.09** | -0.37 | 1.04 | 19.47 → 19.48 (26.61) |
| 6 | 14.63 | 14.16 | **14.17** | -0.46 | 0.40 | 20.91 → 20.91 (33.46) |
| 7 | 14.79 | 14.79 | **14.80** | +0.00 | 0.55 | 21.88 → 21.88 (37.64) |
| 8 | 15.20 | 15.05 | **15.05** | -0.15 | 0.39 | 23.42 → 23.42 (48.70) |
| 9 | 14.97 | 15.53 | **15.26** | +0.29 | 0.66 | 25.49 → 25.49 (66.08) |

Per location on the beeline (random battles before that location's boss, in its own pool), today → recommended:

| Location | Today | Recommended | Location | Today | Recommended |
|---|---|---|---|---|---|
| forest | 7.49 | 8.08 | great_hive | 6.80 | **5.13** |
| crossroads_highway | 7.49 | 8.08 | night_bazaar | 6.80 | **5.13** |
| cave_mouth | 7.47 | 8.31 | crystal_tunnels | 7.16 | 6.55 |
| crystal_tunnels | (above) | | goblin_school | 7.96 | **5.71** |
| misty_marsh | 6.84 | 7.87 | hydra_s_lair | 7.64 | **6.22** |
| gloomy_village | 7.49 | 7.87 | moonlit_graveyard | 7.14 | **6.30** |
| windy_cliffs | 7.08 | 7.62 | griffin_summit | 7.72 | 7.20 |
| training_pits | 7.48 | 7.87 | grand_colosseum | 7.71 | 7.18 |
| demon_king_s_gate | 7.00 | 7.65 | throne_hall | 7.98 | 7.62 |
| realm 1 (3 locations) | 7.47 / 7.47 / 6.81 | same | | | |

**Balance impact:**
- Beeline kids fight between **2.0 fewer and 0.3 more random battles per realm** (−2.04 to +0.29). Realm 4 is the largest at −2.0 of 22.6.
- **0.4 to 3.6 battles per realm move** from the new location's pool to the one just cleared, which is review instead of new words. Realm 4 accounts for 3.6, because its 2 stray edges are long (4 and 3 steps).
- Five realm-boss locations drop below the 6.5-battle beeline band before their boss: great_hive, night_bazaar, goblin_school, hydra_s_lair, moonlit_graveyard (5.1–6.3).
- The approach-inn patrol rule still catches kids who aren't ready: it checks the location pool, which is unchanged.
- `validate_world`'s beeline check sums p × steps along the route regardless of zone, so it still passes. It doesn't see the pool shift.
- Explorers: no change (±0.06).
- If Jack wants the 5 locations back in the band with no new rule, the data-only fix is option (a) for those 9 edges (Q17).

#### 3.9.4 Bosses, unlocks, realm links and progress keyed on levels

- **Location boss → level:**

  | zone | boss level | zone | boss level |
  |---|---|---|---|
  | meadow | `realm_1` | moonlit_graveyard | `moonlit_crypt_2` |
  | clover_hills | `clover_hills` | windy_cliffs | `realm_7` |
  | warren | `warren` | griffin_summit | `griffin_spire_3` |
  | forest | `realm_2` | training_pits | `realm_8` |
  | great_hive | `great_hive_1` | grand_colosseum | `undercroft_3` |
  | crossroads_highway | `realm_3` | demon_king_s_gate | `demon_castle_2` |
  | night_bazaar | `bazaar_cellars_1` | throne_hall | `demon_castle_5` |
  | cave_mouth | `goblin_caves_1` | misty_marsh | `realm_5` |
  | crystal_tunnels | `goblin_caves_2` | hydra_s_lair | `hydra_lair_2` |
  | goblin_school | `goblin_caves_3` | gloomy_village | `realm_6` |
- **Conditions:** every `bossDefeated: <zone>` becomes `bossDefeated: <boss level>` using this table:
  - 5 in `realm_1`, 16 in `world.json`, 17 in `quests.json`;
  - the 21 `unlockRequires` entries.

  It's a 1:1 rename, so every gate opens at exactly the same moment as today.
- **Realm links:** `realms[].realmBossZone` → `realmBossLevel`:
  - warren → `warren`; great_hive → `great_hive_1`; night_bazaar → `bazaar_cellars_1`;
  - goblin_school → `goblin_caves_3`; hydra_s_lair → `hydra_lair_2`; moonlit_graveyard → `moonlit_crypt_2`;
  - griffin_summit → `griffin_spire_3`; grand_colosseum → `undercroft_3`; throne_hall → `demon_castle_5`.

  `realms[].unlock` uses the same ids. `realmOpen`'s fallback (realm boss by `bossKind`) reads the boss record's `kind`.
- **Progress:**
  - `zonesDefeated` holds boss level ids. The one-time save migration uses the table above; it is 1:1, so the "bosses beaten" count in `server/progress.ts` doesn't change.
  - The budget `zone.id` holds the level's `pool`, the same strings as today, so no migration is needed.
  - Bitsets, `pos`, `lastInn`, `visitedTowns` and the RNG are already keyed by graph id + idx. Only the realm_1 split touches them (§3.9.2 A).
- **Location battle state** (`S.locs`, patrol counters, `pathCleared`) stays keyed by the level's `pool` name. Levels that share a pool share it, as floors of a zone do today.

#### 3.9.5 Quest zone references → levels

- Today `quests.json` has 305 zone references:
  - 50 quest `zone`, 47 giver, 7 turn-in, 190 step `where`, 7 escort `to`;
  - 3 kill `scope.zone`, 1 boss `objective.zone`.
- **All 259 positions resolve today**, so the seed freezes each one to `graph/node`, and the zone + `nodeKind` + `position` form goes away.
- `nodeKind: path` "area" steps list the levels with that pool.
- `scope.zone` becomes the same level list. The engine counts kills by realm only, today and after.
- Quest `zone` (metadata, shown in the editor) → the boss level of that zone.
- Scenes' `zone` → the level of their trigger node.
- 33 of 50 quests touch more than one level, counting area steps; §2.4 covers them.

| Quest | `zone` → level (home: the boss level of that zone) | Giver, turn-in and steps → level |
|---|---|---|
| `q1_bounty` | meadow → `realm_1` | giver → realm_1; s1 → realm_1; s2 → realm_1 (edges); s3 → realm_1 |
| `q1_hoe` | meadow → `realm_1` | giver → realm_1; s1 → realm_1; s2 → realm_1; s3 → realm_1; s4 → realm_1 |
| `q1_carrot` | warren → `warren` | giver → warren; turnIn → realm_1; s1 → warren; s2 → warren; s3 → warren; s4 → realm_1 |
| `q2_lost_panda` | forest → `realm_2` | giver → realm_2; s1 → realm_2; s2 → realm_2; s3 → realm_2; s4 → realm_2 |
| `q2_spider_silk` | forest → `realm_2` | giver → realm_2; s1 → realm_2; s2 → area:realm_2; s3 → realm_2 |
| `q2_bubble_lesson` | forest → `realm_2` | giver → realm_2; s1 → realm_2; s2 → realm_2; s3 → realm_2; s4 → realm_2 |
| `q2_royal_jelly` | great_hive → `great_hive_1` | giver → great_hive_1; s1 → great_hive_1; s2 → great_hive_1; s3 → great_hive_1; s4 → great_hive_1; s4.obj.zone=great_hive → great_hive_1; s5 → great_hive_1 |
| `q3_rescue_fei` | crossroads_highway → `realm_3` | giver → realm_3; s1 → realm_3; s2 → realm_3; s3 → realm_3; s4 → realm_3; s5 → realm_3 |
| `q3_stolen_hats` | crossroads_highway → `realm_3` | giver → realm_3; s1 → realm_3; s2 → area:realm_3; s3 → realm_3 |
| `q3_caravan` | crossroads_highway → `realm_3` | giver → realm_3; turnIn → realm_3; s1 → realm_3; s2 → area:realm_3; s3 → realm_3; s4 → realm_3 |
| `q3_lost_wallet` | night_bazaar → `bazaar_cellars_1` | giver → bazaar_cellars_1; s1 → bazaar_cellars_1; s2 → bazaar_cellars_1; s3 → bazaar_cellars_1; s4 → bazaar_cellars_1; s5 → bazaar_cellars_1 |
| `q3_slime_rainbow` | night_bazaar → `bazaar_cellars_1` | giver → realm_3; s1 → realm_3; s2 → area:bazaar_cellars_1; s3 → realm_3 |
| `q4_lost_schoolbag` | cave_mouth → `goblin_caves_1` | giver → realm_4; s1 → realm_4; s2 → realm_4; s3 → goblin_caves_1; s4 → realm_4 |
| `q4_glow_moss` | cave_mouth → `goblin_caves_1` | giver → goblin_caves_1; s1 → goblin_caves_1; s2 → area:goblin_caves_1/realm_4; s3 → goblin_caves_1 |
| `q4_free_classmates` | crystal_tunnels → `goblin_caves_2` | giver → goblin_caves_2; turnIn → realm_4; s1 → goblin_caves_2; s2 → goblin_caves_2; s3 → goblin_caves_2; s4 → goblin_caves_2; s5 → realm_4 |
| `q4_homework` | goblin_school → `goblin_caves_3` | giver → goblin_caves_3; s1 → goblin_caves_3; s2 → area:goblin_caves_3; s3 → goblin_caves_3 |
| `q4_school_bell` | goblin_school → `goblin_caves_3` | giver → realm_4; turnIn → goblin_caves_3; s1 → realm_4; s2 → realm_4; s3 → goblin_caves_3 |
| `q5_invitations` | misty_marsh → `realm_5` | giver → realm_5; s1 → realm_5; s2 → realm_5; s3 → realm_5; s4 → hydra_lair_1; s5 → realm_5 |
| `q5_muddy_road` | misty_marsh → `realm_5` | giver → realm_5; s1 → realm_5; s2 → area:realm_5; s3 → realm_5 |
| `q5_escort_xiaohe` | misty_marsh → `realm_5` | giver → realm_5; turnIn → realm_5; s1 → realm_5; s2 → area:realm_5; s3 → area:realm_5; s4 → realm_5 |
| `q5_pocket_watches` | hydra_s_lair → `hydra_lair_2` | giver → realm_5; s1 → realm_5; s2 → area:hydra_lair_1/hydra_lair_2; s3 → realm_5 |
| `q5_lost_fishers` | hydra_s_lair → `hydra_lair_2` | giver → hydra_lair_1; s1 → hydra_lair_1; s2 → hydra_lair_1; s3 → hydra_lair_1; s4 → hydra_lair_1; s5 → hydra_lair_1 |
| `q5_fog_bottle` | hydra_s_lair → `hydra_lair_2` | giver → realm_5; s1 → realm_5; s2 → realm_5; s3 → hydra_lair_2; s4 → hydra_lair_2; s5 → realm_5 |
| `q6_medicine_herbs` | gloomy_village → `realm_6` | giver → realm_6; s1 → realm_6; s2 → realm_6; s3 → realm_6; s4 → realm_6 |
| `q6_hot_soup` | gloomy_village → `realm_6` | giver → realm_6; s1 → realm_6; s2 → realm_6; s3 → realm_6; s4 → realm_6; s5 → realm_6 |
| `q6_old_mine` | gloomy_village → `realm_6` | giver → old_mine_1; s1 → realm_6; s2 → old_mine_1; s3 → old_mine_1; s4 → old_mine_1; s5 → old_mine_1 |
| `q6_lost_dog` | moonlit_graveyard → `moonlit_crypt_2` | giver → moonlit_crypt_1; s1 → moonlit_crypt_1; s2 → moonlit_crypt_1; s3 → moonlit_crypt_1; s4 → moonlit_crypt_1 |
| `q6_rattle_bones` | moonlit_graveyard → `moonlit_crypt_2` | giver → moonlit_crypt_1; s1 → moonlit_crypt_1; s2 → area:moonlit_crypt_1/moonlit_crypt_2; s3 → moonlit_crypt_1 |
| `q6_knight_dad` | moonlit_graveyard → `moonlit_crypt_2` | giver → moonlit_crypt_2; s1 → moonlit_crypt_2; s2 → moonlit_crypt_2; s3 → moonlit_crypt_2; s4 → moonlit_crypt_2 |
| `q7_glacier_roses` | windy_cliffs → `realm_7` | giver → realm_7; s1 → realm_7; s2 → realm_7; s3 → realm_7; s4 → cloud_caves_1; s5 → cloud_caves_1; s6 → cloud_caves_1; s7 → realm_7 |
| `q7_lost_mapmaker` | windy_cliffs → `realm_7` | giver → realm_7; turnIn → realm_7; s1 → realm_7; s2 → realm_7; s3 → area:cloud_caves_1/realm_7; s4 → realm_7 |
| `q7_harpy_socks` | windy_cliffs → `realm_7` | giver → realm_7; s1 → realm_7; s2 → area:cloud_caves_1/realm_7; s3 → realm_7 |
| `q7_golem_sign` | windy_cliffs → `realm_7` | giver → realm_7; s1 → realm_7; s2 → realm_7; s3 → realm_7; s4 → realm_7 |
| `q7_griffin_feathers` | griffin_summit → `griffin_spire_3` | giver → griffin_spire_1; s1 → griffin_spire_1; s2 → griffin_spire_1; s3 → griffin_spire_1 |
| `q7_griffin_chick` | griffin_summit → `griffin_spire_3` | giver → griffin_spire_2; turnIn → griffin_spire_3; s1 → griffin_spire_2; s2 → griffin_spire_2; s3 → area:griffin_spire_1/griffin_spire_2/griffin_spire_3; s4 → griffin_spire_3 |
| `q7_forecast` | griffin_summit → `griffin_spire_3` | giver → realm_7; s1 → realm_7; s2 → realm_7; s3 → realm_7; s4 → realm_7 |
| `q8_fire_demon` | training_pits → `realm_8` | giver → realm_8; s1 → realm_8; s2 → realm_8; s3 → realm_8; s4 → realm_8 |
| `q8_lost_ball` | training_pits → `realm_8` | giver → realm_8; s1 → realm_8; s2 → realm_8; s3 → beast_pens_1; s4 → realm_8 |
| `q8_training` | training_pits → `realm_8` | giver → realm_8; s1 → realm_8; s2 → area:beast_pens_1/beast_pens_2/realm_8; s3 → realm_8 |
| `q8_bronze_medals` | grand_colosseum → `undercroft_3` | giver → undercroft_2; s1 → undercroft_2; s2 → area:undercroft_1/undercroft_2/undercroft_3; s3 → undercroft_2 |
| `q8_fan_letters` | grand_colosseum → `undercroft_3` | giver → realm_8; s1 → realm_8; s2 → realm_8; s3 → undercroft_3; s4 → realm_8 |
| `q8_singer_escort` | grand_colosseum → `undercroft_3` | giver → undercroft_1; s1 → undercroft_1; s2 → undercroft_2; s3 → area:undercroft_1/undercroft_2/undercroft_3; s4 → undercroft_3 |
| `q8_caged_beasts` | training_pits → `realm_8` | giver → realm_8; s1 → realm_8; s2 → realm_8; s3 → beast_pens_1; s4 → beast_pens_2; s5 → realm_8 |
| `q9_pact_elves` | demon_king_s_gate → `demon_castle_2` | giver → realm_9; s1 → realm_9; s2 → realm_9; s3 → shadow_vault_2; s4 → shadow_vault_2; s5 → realm_9 |
| `q9_pact_dwarves` | demon_king_s_gate → `demon_castle_2` | giver → realm_9; s1 → realm_9; s2 → area:demon_castle_1/demon_castle_2/realm_9/shadow_vault_1/shadow_vault_2; s3 → realm_9 |
| `q9_pact_beastfolk` | throne_hall → `demon_castle_5` | giver → realm_9; s1 → realm_9; s2 → area:demon_castle_3/demon_castle_4/demon_castle_5; s3 → demon_castle_3; s4 → realm_9 |
| `q9_dragonlings` | demon_king_s_gate → `demon_castle_2` | giver → realm_9; s1 → realm_9; s2 → demon_castle_1; s3 → demon_castle_1; s4 → demon_castle_1; s5 → demon_castle_2; s6 → realm_9 |
| `q9_second_wind` | demon_king_s_gate → `demon_castle_2` | giver → realm_9; s1 → realm_9; s2 → demon_castle_2; s3 → realm_9; s4 → realm_9 |
| `q9_pipi_surrender` | throne_hall → `demon_castle_5` | giver → demon_castle_2; turnIn → realm_9; s1 → demon_castle_2; s2 → area:demon_castle_1/demon_castle_2/realm_9/shadow_vault_1/shadow_vault_2; s3 → realm_9 |
| `q9_lanterns` | demon_king_s_gate → `demon_castle_2` | giver → realm_9; s1 → realm_9; s2 → realm_9; s3 → realm_9; s4 → realm_9; s5 → realm_9 |

Positions that fail to resolve: 0 of 259.

#### 3.9.6 Code that depends on zones today (for GameDev)

Found with `grep -rn zone` on `e4e6a4a`, excluding generated `src/data/`:

| Where | What uses zones | After |
|---|---|---|
| `docs/data/world/zones.json`, `schemas/zones.schema.json`, `index.schema.json` `zones`, `common.schema.json` (zone id), `graph.schema.json` node `zone` / `realmBossZone` | the zone records and refs | seed only; `level/0.1` `settings` replaces them |
| `src/world/engine.ts` 18, 20 (`Zone`, `WorldIndex.zones`), 26 (`realmBossZone`), 100 (`bossDefeated` → `zonesDefeated`), 118–121 (`realmOpen` fallback), 158–168 (`P.zone` budget/pity), 172–175 (`edgeZone`) | types, unlocks, budget, which zone an edge fights in | the level's settings; `edgeZone` → the current level; budget id = level `pool` |
| `src/ui/graph.ts` 20–21, 32 (`W.zones`), 57 (start zone), 59–61 (classic → `zonesDefeated`), 80, 84, 115–119 (`zoneOf`, `battleLoc(z.location)`), 155, 254, 282 (budget reset), 302–318 (boss fight, `bossCleared`, realm-boss mapping), 350 (`zone.approachArmed`), 361, 374, 393 | battles, bosses, budget, inns | read `level.settings`; boss = the level's boss record |
| `src/world/content.ts` 16–27, `src/data.ts` 19, 39 | `LOC` keyed by location (= zone) id; review order by zone | keyed by level `pool`; review order by `desyPool` |
| `src/world/progress.ts` 46–53, `progress.schema.json` 122, 135 | `zonesDefeated`, `zone` budget | `zonesDefeated` holds boss level ids (+ one-time migration) |
| `src/engine/battle.ts` 18 | "zone roster override" | the level roster |
| `server/progress.ts` 26, 49, `server/dal/saves.ts` 145, `tests/api/*` | `zonesDefeated` count as bosses | unchanged count; fixtures use level ids |
| `tests/world.mjs` (24 lines: realmOpen chain, boss chests by zone, realm-1 clear, `W.zones`) | tests | level ids |
| `tools/world/build_world.py` (`resolve_pos` by zone, content per zone), `validate_world.py` (one boss node + one patrol gate per zone, beeline per zone), `world_graph.py` (`ZONES`), `build_data.py` (Desy's off-repo `make_realm_content.py` and `world_gen.py` too), `validate_all.py`, `.github/workflows/deploy.yml` (comment) | tools and CI on the seed | kept for the seed (CI), plus a level-settings path for the export endpoint |

---

## 4. Questions for Jack (with recommended defaults)

Status:
- Q1 and Q6 were decided by Jack.
- Q2–5 and Q7–10 use the **Director's working defaults (2026-10-10)**. Jack may still override them; they are not locked and are not in decisions.md.
- Q11–15 are **Director-approved defaults (2026-10-10)**.
- Q16–18 are new, from dropping zones.

1. **Is a level one graph or one zone?** *Decided (Jack, 2026-10-10):* **one level = one graph = its own zone.** Zones are dropped and their fields become level settings (§1.3, §3.9). That gives 38 levels after the realm_1 split (Q16).
2. **Where do cross-level quests live?** *Working default:* the quest definition sits in the **giver's level**; each step's variant sits on its node in its own level; the editor has a quest view that spans levels.
3. **Can the editor change ids?** *Working default:* **no**, once a level has been published (save and RNG keys). New items get generated ids that Jack can edit until first publish.
4. **Can Jack edit word pool contents, or only pick a pool?** *Working default:* **pick only** (L1.1…L9.2). Pool contents stay in the curriculum (repo), because they drive the met rule and the 3-new cap.
5. **Can Jack edit enemy and boss stats?** *Working default:* **no**. He picks enemies and bosses by id; HP and ATK come from the tuned tables (~15/~20 correct answers per boss).
6. **How do saves reach the game?** *Decided (Jack):* **Save** writes a draft to the DB, and **Publish** makes it live. The game loads published levels from the DB through the API. History is in `level_revisions`, plus a manual JSON download. There are no copies in GitHub and no GitHub write access (§3.0, §3.6).
7. **May the editor lay out generated realms 2–9 freely?** *Working default:* **yes**. They are reference layouts (`status: "reference"`); a level Jack edits becomes `status: "authored"`.
8. **Quest dialogue: does every quest need its own offer/progress/turn-in scenes?** *Working default:* **optional**. A missing scene falls back to today's default line, and the editor lists missing scenes as "to write".
9. **Should the in-quest item or enemy appear only during its own step?** *Working default:* **no change**. It appears while the quest is active (today's rule), and the editor warns about steps placed out of order.
10. **Who can log in?** *Working default:* **only Jack's Google account**, using the Auth.js Google provider already in the API (`api/auth`); GameDev decides the allow-list mechanism.
11. **can a draft with errors be saved?** *Director-approved default:* **yes, saved and flagged in red**, so no work is lost. Only publish blocks on errors. Warnings never block.
12. **may several levels be published together?** *Director-approved default:* **yes**, as one validated set in one transaction. Cross-level edits (stairs pairs, cross-level quests, realm links) can't pass validation one level at a time.
13. **what does the GitHub Pages game build do, now that levels live in the DB?** Today the Pages build is static, makes no API calls, and the API sends no CORS headers (`docs/tech/api.md`). *Director-approved default:* the game that reads levels from the DB is the **Vercel-hosted** build (same origin as `/api/v1`). The Pages build keeps bundling the frozen v3.9.x seed until GameDev retires it. The alternative is a public CORS-enabled read route.
14. **may Jack delete a node that's already published?** *Director-approved default:* **yes, with a publish warning** when it's a town, village, inn or quest node. Saves standing there wake at the start position, as the code does today. No tombstones and no new mechanic.
15. **how do the sim and Desy's tools authenticate to the export endpoint?** *Director-approved default:* a **read-only export token** scoped to the export route, kept in Vercel and local env files (never in the repo), revocable at any time.
16. **Realm 1 held three locations in one graph. Split it?** *Default:* **yes, 3 levels**: `realm_1` (village + Meadow, ids and idx unchanged), `clover_hills` and `warren`. Each joins the next through a portal link plus one new entry node, so battles, pools and bosses stay exactly as today. Old saves get a one-time realm-1 migration (§3.9.2 A). The alternative, one level with the Meadow pool, drops the L1.2 and L1.3 words from graph mode.
17. **The 9 one-node "doorways" of the next location (portal or stairs-down nodes after a location boss): which level are they in?** *Default:* **the level they stand in** (no map or id change). The approach edge (1–4 steps) then fights in the location just cleared. Beeline: −2.0 to +0.3 battles per realm. Five realm-boss locations fall to 5.1–6.3 own-pool battles before their boss (band 6.5–9.5); the patrol rule still covers readiness (§3.9.3). The alternative is to move those 9 edges into the next level, as in Q16: no balance change, but 9 maps change and more saves need migrating.
18. **When does the 8-battle budget reset now that zones are gone?** *Default:* **when the level's word pool changes.** This is today's rule (pool = zone), so dungeon floors keep sharing one budget. Resetting per level id would add up to 41 battles per realm for explorers (§3.9.3).
