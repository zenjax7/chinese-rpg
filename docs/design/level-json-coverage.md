# Level JSON: coverage checklist, quest-state variants, migration and save/publish plan

Repo path: `docs/design/level-json-coverage.md` · Owner: Desy · Written 2026-10-10 (PT) against main `e4e6a4a`; updated the same morning for the Director's answers and Jack's newer storage decision (the DB is the only source of truth for levels, §3.0).
Companion to GameDev's schema doc `docs/tech/level-editor.md`. GameDev leads the schema; this doc checks that it covers everything in our world, quest and dialogue data, and plans the migration.

**Status of GameDev's draft:** `docs/tech/level-editor.md` is **still pending**. It is not in main `e4e6a4a` or on any remote branch (re-checked `origin/*` on 2026-10-10 09:27 PT). The names `level_revisions` and the export endpoint come from GameDev's proposal as relayed by the Director; everything else uses the names in today's code (`server/dal/*`, `migrations/*.sql`, `/api/v1`). The "Draft" column below therefore reads **"no draft yet"** everywhere; GameDev can tick it off as the draft lands. Each section ends with **"Must be in the draft"**: the minimum the schema needs to cover.

**Ground rules (from the existing spec, no new mechanics):**
- The editor writes the same data the game runs today. Every editor concept maps onto an existing field, condition or action; where a Jack word differs from ours, the mapping is in §1.0.
- **Source-of-truth split (§3.0):** GitHub `zenjax7/chinese-rpg` holds docs, schemas, validators, tools and a one-time migration seed. The **DB** holds levels and is the only source of truth for level content. Nothing in the editor or backend gets GitHub write access.
- Balance numbers stay global and are not editable per level: encounter rates, boss HP and ATK, prices, the 3-new-words cap.

Abbreviations: **L-JSON** = the proposed per-level JSON object; **G** = stays global (shared file, referenced by id).

---

## 1. Coverage checklist

### 1.0 Jack's editor words → our data

| Jack's word | Our data today | Note |
|---|---|---|
| map / level | one graph file (`graph/0.3`) | §3.1 recommends 1 level = 1 graph |
| village | node `kind: village` (inn + save + item shop, no smith, no magic shop) | world-graph §2 |
| town | node `kind: town` + `town` number (sets shop tier) | |
| portal | node `kind: portal` + `portal` edge to another graph | v3.9.2: a portal is a node and an edge, **not** an event outcome |
| treasure | event outcome `treasure` with `openChest` | |
| NPC | node `kind: npc` with `npc` id, events with `dialogue`/`scene` | |
| quest battle | quest objective `kill` on an event `fight` (outcome `miniboss`) or an edge battle (`edge_battle`) | |
| word pool / enemies / bosses | zone (`zones.json`): `desyPool`, `roster`, `elite`, `boss` | a zone can span several graphs (§3.1) |

### 1.1 Graph structure

| Field / concept | Today | In L-JSON or global | Draft |
|---|---|---|---|
| Level id, kind (`world` / `overworld` / `dungeon_level`), realm, title zh/en, status, background, music | graph top level | L-JSON top level | no draft yet |
| Nodes: `id`, `idx`, `kind`, `x`/`y` (normalised 0–1, 0.05–0.95) + graph `aspect` | `nodes[]` | L-JSON `nodes[]`; the editor canvas converts to and from 0–1 | no draft yet |
| Node kinds: town, village, inn, boss, miniboss, chest, story, npc, fork, waypoint, stairs_up, stairs_down, portal, exit, lever, shop | `kind` enum | L-JSON; the kind palette in the editor = this enum | no draft yet |
| Node fields `zone`, `title`, `save`, `services`, `hub`, `town`, `shops`, `campfire`, `boss`, `npc`, `fog`, `inBuild` | node | L-JSON | no draft yet |
| Dead ends | a shape (a node with one edge), not a kind (v3.9.3) | nothing to store; the editor can highlight them | no draft yet |
| Edges: `id`, `idx`, `from`, `to`, `kind` (path, stairs, portal, exit, shortcut), `danger` 0–3, `steps`, `terrain`, `patrol`, `scripted {enemies, fill, once, step}`, `cond`, `opens`, `label` | `edges[]` | L-JSON `edges[]` | no draft yet |
| Cross-level edges (stairs, portals, exits): `to: {graph, node}`, listed on **both** sides | edge `to` object | L-JSON, both levels; the editor must create and delete the pair together | no draft yet |
| Multi-level dungeons: `dungeon`, `level`, `levels`, `optional` | graph top level | L-JSON top level; a dungeon = several levels sharing `dungeon` | no draft yet |
| `idxMax`, `edgeIdxMax` | graph top level | L-JSON; **append-only** (§3.3) | no draft yet |
| Safe-edge rules (town/inn adjacent, boss approach, portals, after a boss clear: 20 hops or until an inn rest) | `world_rules.safe` | G (computed by the game from the graph; the editor only shows them) | no draft yet |
| Encounter odds per danger 0/0.6/0.85/0.95, depth step +10%/level, max 0.95, walked × 0.05, zone budget 8, pity 2 | `world_rules` | G, not editable per level | no draft yet |
| Boss approach edge: `patrol: true`, = the zone's `gateEdge`, exactly 1 per boss node | edge + zone | L-JSON (edge flag); the zone references it | no draft yet |
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
| Realm-boss chest: 3 × G gold + Honey Potion + the realm's heroic piece (`bossReward.heroic`, combat-spec §6.3 and §7.2) + skill unlock | battle code + content `locations[].bossReward` | G (per zone, in the zone record); **not** a node event, or it would be given twice | no draft yet |
| Realm-boss Feather in realms 3, 6 and 8 | `world_rules.realmBossFeather` + an `on: clear` event on the boss node | G rule; the boss-node event in L-JSON | no draft yet |
| Seeded picks: event key `saveSeed|graphId|nodeId|visit` | `world_rules.seed` | G; depends on level, node and edge **ids** (§3.3) | no draft yet |

**Must be in the draft:** ordered events per node, `pick` with weights, the shared `cond`/`action` vocabulary, and no `portal` outcome.

### 1.3 Zones, word pools, enemies and bosses

| Field / concept | Today | In L-JSON or global | Draft |
|---|---|---|---|
| Zone: `id`, realm, `order`, title, `location`, `desyPool` (L1.1…L9.2), `pool`, tier, `bossNode`, `gateEdge`, `bossKind` (locboss/realmboss), `boss`, `enemiesPerBattle`, `roster` (explicit since v3.9.2), `packs`, `elite`, `scriptedElite`, `unlockRequires` | `zones.json` (20 zones) | L-JSON `zones[]` in the level that holds the zone's **boss node** (one owner); other levels just tag nodes with `zone` | no draft yet |
| Word pool contents (47–60 items per location, authored order) | `curriculum_location_pools.csv` | G (curriculum). The level **picks** a pool id; editing pool contents is a curriculum change | no draft yet |
| Max 3 new words per battle; Tired caps; MC options and review slots per location | combat-spec decision 17, `realm_location_difficulty.csv` | G, not editable | no draft yet |
| Enemy stats (HP, ATK, DEF, EXP, gold, chest rate, minions, specials) | `combat_data.json`, `enemies.csv` | G. The level picks enemy **ids** for roster, elite and boss | no draft yet |
| Boss HP targets (location ~15, realm ~20 correct answers with a full MP bar spent; ATK × 0.8) | `boss_hp.csv` by tier and type | G. The editor warns if a boss of another tier or type is picked | no draft yet |
| Realm 3–9 content (enemies, locations, pools, items) | `content/realm_N.json`, generated | Generated by the server at publish from the levels plus the global tables, not edited (§3.6) | no draft yet |

**Must be in the draft:** a zone block with the fields above, or a reference to a global zone table; pool and enemies as **ids**, never copied stats.

### 1.4 World, progress and RNG

| Field / concept | Today | In L-JSON or global | Draft |
|---|---|---|---|
| Realm links: `realms[]` (realm, node, graph, entry, enterEdge, exitEdge, linkEdge, unlock, realmBossZone, next) | `world.json` | L-JSON of the `world` level | no draft yet |
| Unlocks: realm N needs `bossDefeated` of realm N−1's realm-boss zone; zone `unlockRequires` | world.json + zones | world level + zone records | no draft yet |
| Exit edges: one `exit` edge per realm overworld, entry settlement → world node, danger 0, last `idx` | overworld edges | L-JSON (overworld) | no draft yet |
| Fog: node `fog: "landmark"`; visited/walked/revealed bitsets by `idx` | node field + `progress/0.3` | node field in L-JSON; progress G (save format) | no draft yet |
| Progress: pos, lastInn, visitedTowns, eventsDone (event ids), eventLastFired, shortcuts, zonesDefeated, flags, feathers | `progress.schema.json` | G; keys are level, node, edge, event and zone **ids** and **idx** values, so these must stay stable | no draft yet |
| Seed: `mulberry32(fnv1a32(key))`, edge key `saveSeed|graphId|edgeId|crossing|step`, 3 test vectors | `world_rules.seed` | G | no draft yet |
| Start position `{graph: realm_1, node: village}`, `renames` | `index.json` | G; the server generates the index from the published levels (§3.6). Note: the game does **not** apply `renames` today (§3.7) | no draft yet |

**Must be in the draft:** the world level's `realms[]`; and that ids and idx values are save keys (§3.3).

### 1.5 Quests

| Field / concept | Today | In L-JSON or global | Draft |
|---|---|---|---|
| Quest: id, realm, zone, pool, story (main/side), type, title, `requires`, `order` (all `sequence`), `repeatable: false`, `words`, `summary` | `quests.json` (quest/0.2, 50 quests) | Quest definition owned by the **giver's** level (`quests[]`), see §2 | no draft yet |
| Giver `{npc, graph/node | zone+nodeKind+position, ref}`; `turnIn` giver / auto / other NPC; `returnToGiver` | quest | resolved to `graph/node` in the L-JSON (positions are resolved by `build_world.py` today) | no draft yet |
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
| Scene/0.2: `id` `sc_*`, realm, zone, `density` D1–D6, `trigger {on, graph/node, cond, replaces}`, background, music, once, `slots` L1/L2/R1/R2 `{char, expr}`, `words`, `teaches` (≤ 3), `onEnd` | `data/dialogue/sc_*.json` (7 files) | L-JSON `scenes{}`, in the level of the trigger node | no draft yet |
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
- 117 positions (28 givers, 89 steps) are still `zone + nodeKind + position` with no `ref`, and are resolved at build time. Migration writes the resolved `graph/node`.

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

- **Working default (Q1): 1 level = 1 graph.** That gives 36 levels:
  - `world`;
  - 9 realm overworlds;
  - 26 dungeon levels in 12 dungeons.
- A graph is what Jack draws, and it is the unit the game loads, the save keys on and the RNG hashes.
- Zones don't fit as levels: 14 of 20 zones span 2–5 graphs, and 10 graphs hold 2–3 zones. A zone is therefore a **record owned by the level holding its boss node**; other levels tag nodes with `zone`.
- Multi-level dungeons stay separate levels joined by stairs. The editor groups them by `dungeon` and edits the stairs pair together.

### 3.2 Per-level JSON contents

`{schema: "level/0.1", id, version, graph fields…, nodes[] (with quests[] variants), edges[], events[], zones[] (owned), quests[] (given here), scenes{}, npcs (refs)}`.

Global files stay in the repo and are referenced by id: `world_rules.json`, curriculum and pools, enemies, combat data and boss HP, economy, items, gear, spells and towns, the characters registry, and `progress.schema.json`. The server bundles them at deploy, because the validators and the compile step need them.

### 3.3 Id stability (append-only)

- Saves key on level ids, node, edge and event ids, `idx` values and zone ids: `eventsDone`, visited/walked bitsets, `lastInn`, `visitedTowns`, `zonesDefeated`. The RNG also hashes them.
- The seed keeps **every id and idx exactly**.
- New nodes and edges get the next `idx` (append-only; `idxMax`/`edgeIdxMax` only grow). Event ids (`<node>.<n>`) are append-only too. A deleted id is retired, never reused, and the server remembers retired ids per level so the editor can't hand them out again.
- Ids can't be edited once a level has been published (Q3). Before the first publish they are free.

### 3.4 One-time migration seed

1. **`tools/level/split_levels.py`** (new, in the repo) reads the v3.9.x files:
   - `docs/data/world/graphs/*.json`, `zones.json`, `quests_world.json`;
   - `docs/data/quests/quests.json`;
   - `docs/data/dialogue/sc_*.json`.

   It writes 36 `level/0.1` objects (to a temp folder or stdout, **not** into the repo):
   - zones go to their boss-node level and quests to their giver level;
   - scenes go to their trigger node's level, with quest scenes on the giver's or step node's level;
   - inline `dialogue{}` becomes scene/0.2;
   - hooks become node `quests[]` variants;
   - positions are resolved to `graph/node` using `build_world.resolve_pos`;
   - the 9 `portal` steps become `reach` (§1.7).
2. **`tools/level/join_levels.py`** rebuilds the v3.9.x files from those levels.
3. **Round trip (CI):** `join(split(seed))` must equal the seed **byte for byte**, except for a listed set of intended changes (the 9 portal steps, resolved positions, inline dialogue converted to scene/0.2). Each intended change must be in the list. This test, and the full `validate_all.py` on the seed, keep running in CI as regression tests for the converters and validators. Split and join are used only for the seed and for tests; they never touch live levels.
4. **Seeding the DB:** a one-time server script (`server/seed-levels.mjs`, next to `server/migrate.mjs`) runs after `npm run db:migrate`:
   - it runs `split_levels` on the seed;
   - it validates each level server-side (§3.5);
   - it inserts each level as **published version 1**, with an identical draft, in one transaction;
   - it writes one `level_revisions` row per level (`version 1`, `note: "v3.9.x seed"`, content hash).

   It refuses to run if the levels table isn't empty. **Check:** `GET` export of all 36 levels, then `join_levels`, must reproduce the seed with the same listed differences. Only then is cutover declared.
5. **After cutover:** Desy's world generators (`world_gen.py`, `make_world_data.py`) are no longer used for levels. `build_world.py` and `make_realm_content.py` run on the server's compile step (§3.6), or are ported there.

### 3.5 Validators (server-side)

- **Ported to TypeScript** in `server/` and run on every save and publish. They cover:
  - JSON Schema checks with ajv (as `server/progress.ts` already does);
  - the graph rules from `tools/world/validate_world.py`: references, two-way stairs, reachability, inn distance, beeline battle range, density, realms[] and exit edges, seed vectors, heroic sources;
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
- **Manual download:** the editor's **Download JSON** gives the draft or any revision as one file per level (or a zip of all 36), for offline copies and bug reports.

### 3.8 Export endpoint for tools and the sim

- GameDev's proposal: a **read-only, editor-authenticated** endpoint, e.g. `GET /api/v1/editor/export?state=published|draft[&level=…]`, returning `level/0.1` objects plus the published versions.
- **Desy's tools and the sim** pull from it. `join_levels.py` turns the export into the v3.9.x file shapes the existing Python (world_graph loader, sim, validators) already reads, so nothing else has to be ported.
- **Auth for scripts:** the tools need a credential that isn't Jack's Google session, e.g. a read-only export token scoped to this route, stored outside the repo (Q15).
- **No path writes back:** the endpoint is GET-only, and the tools never write to the DB.

---

## 4. Questions for Jack (with recommended defaults)

Status: Q1–5 and Q7–10 use the **Director's working defaults (2026-10-10)**. Jack may still override them; they are not locked and are not in decisions.md. Q6 was answered by Jack (DB storage), and his newer decision replaced the repo export. Q11–15 are new.

1. **Is a level one graph or one zone?** *Working default:* **one graph** (36 levels). Zones are records inside the level that holds their boss.
2. **Where do cross-level quests live?** *Working default:* the quest definition sits in the **giver's level**; each step's variant sits on its node in its own level; the editor has a quest view that spans levels.
3. **Can the editor change ids?** *Working default:* **no**, once a level has been published (save and RNG keys). New items get generated ids that Jack can edit until first publish.
4. **Can Jack edit word pool contents, or only pick a pool?** *Working default:* **pick only** (L1.1…L9.2). Pool contents stay in the curriculum (repo), because they drive the met rule and the 3-new cap.
5. **Can Jack edit enemy and boss stats?** *Working default:* **no**. He picks enemies and bosses by id; HP and ATK come from the tuned tables (~15/~20 correct answers per boss).
6. **How do saves reach the game?** *Decided (Jack):* **Save** writes a draft to the DB, and **Publish** makes it live. The game loads published levels from the DB through the API. History is in `level_revisions`, plus a manual JSON download. There are no copies in GitHub and no GitHub write access (§3.0, §3.6).
7. **May the editor lay out generated realms 2–9 freely?** *Working default:* **yes**. They are reference layouts (`status: "reference"`); a level Jack edits becomes `status: "authored"`.
8. **Quest dialogue: does every quest need its own offer/progress/turn-in scenes?** *Working default:* **optional**. A missing scene falls back to today's default line, and the editor lists missing scenes as "to write".
9. **Should the in-quest item or enemy appear only during its own step?** *Working default:* **no change**. It appears while the quest is active (today's rule), and the editor warns about steps placed out of order.
10. **Who can log in?** *Working default:* **only Jack's Google account**, using the Auth.js Google provider already in the API (`api/auth`); GameDev decides the allow-list mechanism.
11. **New: can a draft with errors be saved?** *Default:* **yes, saved and flagged in red**, so no work is lost. Only publish blocks on errors. Warnings never block.
12. **New: may several levels be published together?** *Default:* **yes**, as one validated set in one transaction. Cross-level edits (stairs pairs, cross-level quests, realm links) can't pass validation one level at a time.
13. **New: what does the GitHub Pages game build do, now that levels live in the DB?** Today the Pages build is static, makes no API calls, and the API sends no CORS headers (`docs/tech/api.md`). *Default:* the game that reads levels from the DB is the **Vercel-hosted** build (same origin as `/api/v1`). The Pages build keeps bundling the frozen v3.9.x seed until GameDev retires it. The alternative is a public CORS-enabled read route.
14. **New: may Jack delete a node that's already published?** *Default:* **yes, with a publish warning** when it's a town, village, inn or quest node. Saves standing there wake at the start position, as the code does today. No tombstones and no new mechanic.
15. **New: how do the sim and Desy's tools authenticate to the export endpoint?** *Default:* a **read-only export token** scoped to the export route, kept in Vercel and local env files (never in the repo), revocable at any time.
