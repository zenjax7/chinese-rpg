## 12. World graph (v3.8)

v3.8, 2026-10-02 (PT), Jack. Full design in `world-graph.md` (repo `docs/design/world-graph.md`); data in `data/world/` (repo `docs/data/world/`); sim in `build/world/`. This section summarises it and replaces the linear path of §7.10 (inn, 4 fights, inn, 4 fights, inn, gate, boss) as the map model. The battle, learning and economy rules of §2–§7 are unchanged.

**Model.**
- **Graphs:**
  - 1 world graph and 9 realm overworld graphs.
  - 26 dungeon levels in 12 dungeons, one graph per level, joined by two-way stairs or portals.
  - Towns and villages are nodes that open the town screen.
- **Zones:** each of the 20 locations is a **zone** (`data/world/zones.json`): word pool, roster, elite and boss. Zones are placed on the graphs, and one zone can span several levels.
- **Battles on edges:** random battles happen on edges, with `danger` 0–3 and `steps` encounter rolls per edge.
- **Arrival events:** arriving at a node runs at most one event, the first eligible one in list order. There are 7 outcomes: quest offer (hook), nothing, quest-linked mini-boss, quest item, portal, story and treasure. Events are fixed or weighted, and once, cooldown or repeatable. All randomness is seeded by save, edge, crossing and step, so reloading never re-rolls.

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
| inns | every node ≤ 5 hops from an inn or town (stairs count 0); an approach inn next to every boss |
| inn warp (new) | from any inn to a visited town to shop, then back to the same inn |
| authoring target | each zone's shortest route expects 6.5–9.5 battles (v3.7: 8 path fights) |

**Unchanged:** the patrol rule (speech 20%, reading 40%, 2 forced patrols, re-armed by resting at another inn) now runs at the approach inn. The Return Feather flies to the last inn. Defeat wakes you at the last inn.

**Size.** Realm 1 has 17 nodes (authored, 3 zones). Later realms have 25 / 40 / 60 / 80 / 105 / 130 / 165 / 200 nodes, with 30–38% dead ends, 1–3 villages, 2–22 inns and up to 5 dungeon levels. Realms 2–9 are generated reference layouts for the writers to replace. The per-realm table is `data/world/world_realm_table.csv`.

**Sim** (100 runs per profile, speech on unless noted; `data/sim/sim_world_v38.csv`):
- **Beeline** (straight to each boss) against the v3.7 loop: savers take +3–6% (75% saver 17.96 → 18.52 h), spenders +1–12%, reading kids +5–6%.
  - Path battles per zone: 7.4 (v3.7: 8). Patrols, readiness at the gate, gold and inn stays are about the same.
  - 50% kids have +9 to +11 defeats per campaign (saver 40.5 → 49.6).
- **Explorer** (every node): +16–26% for savers (75% saver 22.3 h) and +49–61% for spenders and reading kids. That is optional content, worth 2–3× the gold, more chests and better readiness.

**Data format.** One JSON file per graph (`graph/0.3`, building on GameDev's `graph/0.2` in architecture.md §6), JSON Schemas in `data/world/schemas/`, and `build/world/validate_world.py`. Answers to GameDev's 14 questions are in world-graph.md §13 and `world-graph-schema-answers.md`.
