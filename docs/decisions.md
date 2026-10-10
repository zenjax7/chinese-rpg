# Decisions log (Jack's locked decisions)

One line per decision, newest last within each date. Jack Song (chief designer) has the final say; the Director relays his calls. Each line links to the section with the detail. Director defaults and calls still "pending Jack" are marked as such. To add one: append a dated line here in the same commit as the doc change (see [README.md](README.md)).

Dates are 2026, Pacific time.

## Platform, product and process

- **Sep 28** — Web game: Phaser 4 + TypeScript + Vite, static hosting; all content in engine-neutral JSON so a later port only rewrites the client. [plan.md: Decision 9](design/plan.md#decision-9-target-platform-and-engine--decided-2026-09-28)
- **Sep 28** — Simplified characters by default; Traditional stored for every item; zh-CN audio. [plan.md: Decision 1](design/plan.md#decision-1-script-default--decided-2026-09-28)
- **Sep 28** — Curriculum anchor: YCT 1–4 for scope, every item tagged with its HSK 3.0 level. [plan.md: Decision 2](design/plan.md#decision-2-curriculum-anchor--decided-2026-09-28)
- **Sep 28** — Monsters are Western fantasy by default; Asian creatures only when a story arc calls for them. [plan.md: Decision 11](design/plan.md#decision-11-culture-blend--decided-2026-09-28)
- **Sep 28** — All art and music are AI-generated; references only from CC0 / public-domain images. [plan.md: Decision 12](design/plan.md#decision-12-art-sourcing-and-ai-policy--decided-2026-09-28)
- **Sep 28** — Team: AI coding agents write the code, Jack reviews; Desy designs, Arty does art, Director coordinates. [plan.md: Decision 14](design/plan.md#decision-14-team-and-budget--updated-2026-09-28)
- **Sep 28** — First players are Jack's daughter and friends (private playtest); school tools deferred. [plan.md: Decision 15](design/plan.md#decision-15-audience-scope--set-by-jack-2026-09-28)
- **Sep 28** — Local saves only for now (no accounts in v1). [plan.md: Decision 15](design/plan.md#decision-15-audience-scope--set-by-jack-2026-09-28)
- **Sep 28** — Speech is on by default, behind a consent screen at first launch that must be accepted. [combat-spec.md: What changed from v2](design/combat-spec.md#what-changed-from-v2-jacks-decisions) (row 1)
- **Sep 29** — No pinyin anywhere in the game UI (it stays in the data only). [combat-spec.md: What changed from v2](design/combat-spec.md#what-changed-from-v2-jacks-decisions) (row 18)
- **Sep 29** — Wrong answers give audio feedback only: correct characters + English + zh-CN audio, no pinyin. [combat-spec.md: What changed from v2](design/combat-spec.md#what-changed-from-v2-jacks-decisions) (row 18), [ui-layout-review.md §4.4](design/ui-layout-review.md#44-feedback-and-the-hit)
- **Sep 29** — Bilingual labels: battle commands 攻击 Attack · 技能 Skills · 道具 Items · 逃跑 Run. [combat-spec.md: What changed from v2](design/combat-spec.md#what-changed-from-v2-jacks-decisions) (row 19)
- **Sep 29** — One 1280×720 game frame, scaled as a whole with letterbox bars (rendered at 1920×1080). [ui-layout-review.md §2.](design/ui-layout-review.md#2-the-frame-one-169-stage-scaled-as-a-whole)
- **Sep 30** — Deploy on GitHub Pages at https://zenjax7.github.io/chinese-rpg/ (push to `main` runs `npm run build:ci`). [deploy.md: Deploy](tech/deploy.md#deploy-github-pages)

## Battle, spells and balance

- **Sep 29** — At most 3 new words per battle; Tired at 30 questions (normal) and 45 (boss). [combat-spec.md: What changed from v2](design/combat-spec.md#what-changed-from-v2-jacks-decisions) (row 17)
- **Sep 29** — Spoken questions capped at 50% of each battle; `nomatch` counts as wrong; no tone checking, no timers. [combat-spec.md: What changed from v2](design/combat-spec.md#what-changed-from-v2-jacks-decisions) (rows 3, 4, 9)
- **Sep 29** — Companion team attack (Friendship gauge), all safety nets plus Courage; defeat fee = max(10% gold, 1 inn price). [combat-spec.md: What changed from v2](design/combat-spec.md#what-changed-from-v2-jacks-decisions) (rows 8, 10)
- **Oct 2** — Spells v3.4: casting is a free action (no question, no fizzle); fixed power − full DEF. [combat-spec.md: What changed from v2](design/combat-spec.md#what-changed-from-v2-jacks-decisions) (row 21)
- **Oct 2** — Spells v3.5: no cast caps and no 3-correct unlock; MP is the only limit. [spells.md §5.](design/spells.md#5-cast-limit-ward-streak-and-skills)
- **Oct 2** — Spells v3.5: Magic Ward removed. [combat-spec.md: What changed from v2](design/combat-spec.md#what-changed-from-v2-jacks-decisions) (row 23)
- **Oct 2** — Spells v3.5: Super Blizzard's Freeze lasts 1 turn and never affects bosses. [combat-spec.md: What changed from v2](design/combat-spec.md#what-changed-from-v2-jacks-decisions) (row 24)
- **Oct 2** — Spells v3.5: MP potions (Mana Tea, Big Mana Tea) are map-only. [spells.md §4.](design/spells.md#4-mp-potions-expensive-map-only)
- **Oct 2** — v3.6: no MP regen on correct answers (MP only from inn, waking, potions). [combat-spec.md: What changed from v2](design/combat-spec.md#what-changed-from-v2-jacks-decisions) (row 26)
- **Oct 2** — v3.6: no MP tips or hints (no "save your MP", no casts-ready count). [combat-spec.md: What changed from v2](design/combat-spec.md#what-changed-from-v2-jacks-decisions) (row 29)
- **Oct 2** — v3.5 (kept in v3.6/v3.7): spell MP costs are 1.25× the v3.4 costs. [combat-spec.md: What changed from v2](design/combat-spec.md#what-changed-from-v2-jacks-decisions) (row 22)
- **Oct 2** — v3.6: boss ATK × 0.8 (Director's default, adopted). [combat-spec.md: What changed from v2](design/combat-spec.md#what-changed-from-v2-jacks-decisions) (row 28)
- **Oct 2** — v3.7: location bosses need about 15 correct answers, realm bosses about 20 (even after spending full MP). [combat-spec.md: What changed from v2](design/combat-spec.md#what-changed-from-v2-jacks-decisions) (row 30)

## World, travel and quests

- **Oct 2** — World graph v3.8: every map is a node graph; battles on edges; locations become zones. [world-graph.md §0.](design/world-graph.md#0-summary)
- **Oct 2** — No free inn warp; the Return Feather is the only fast travel: 2 × G, start with 2, carry 3. [combat-spec.md §12.1](design/combat-spec.md#121-v39-changes-jack-2026-10-02-pt)
- **Oct 2** — Town density ramps from about 1 settlement per 20 nodes early to about 1 per 60 late. [combat-spec.md §12.2](design/combat-spec.md#122-v391-changes-directors-defaults-2026-10-02-2315-pt)
- **Oct 2** — Fog of war approved (visited nodes plus "?" neighbours, landmarks shown). [combat-spec.md §12.1](design/combat-spec.md#121-v39-changes-jack-2026-10-02-pt)
- **Oct 2** — Realm-boss chests in realms 3, 6 and 8 hold a free Return Feather (Director's default). [combat-spec.md §12.2](design/combat-spec.md#122-v391-changes-directors-defaults-2026-10-02-2315-pt)
- **Oct 2** — Quest gold target counts gold only (≈ 30 × G per realm); free Bubble Spell reward; companion is 小龙 (Director's calls, pending Jack). [quests.md §0.](story/quests.md#0-decisions-directors-calls-2026-10-02-2249-pt-pending-jack)
- **Oct 2** — Ending: the Demon King shrinks and goes to Teacher Zhang's school with Pipi (Director's call, pending Jack). [story.md §0.](story/story.md#0-decisions-directors-calls-2026-10-02-2249-pt-pending-jack)
- **Oct 3** — v3.9.2 (Desy): realm N+1 unlocks when the realm N boss falls. [world-graph.md §1.](design/world-graph.md#1-map-hierarchy) (v3.9.2 data not yet merged, see README)
- **Oct 3** — v3.9.2 (Desy): rolls use FNV-1a 32-bit of the event key into mulberry32. [world-graph.md §4.4](design/world-graph.md#44-determinism) (v3.9.2 data not yet merged)
- **Oct 3** — v3.9.2 (Desy): Feather destinations are the last inn used plus every visited town and village. [world-graph.md §12.1](design/world-graph.md#121-return-feather-rules-v39)
- **Oct 3** — v3.9.2 (Desy): escorts never fail (escortee can't be harmed; waits at the last inn used). [quests.md: 2a. Runtime rules](story/quests.md#2a-runtime-rules-for-escort-and-words-for-gamedev)

## Accounts, saves and hosting (architecture D1–D18)

- **Oct 2** — Budget is $0 until ads are integrated; every piece fits a free tier (D4). [architecture.md §1.2](tech/architecture.md#12-decision-log)
- **Oct 2** — Stack approved and final: Vercel Hobby + Neon Postgres (Free) + Auth.js with Google sign-in only (D6, D12, D16). [architecture.md §1.2](tech/architecture.md#12-decision-log)
- **Oct 2** — Art, audio and graph/content JSON ship as static CDN assets; the DB holds player data only (D5, D15). [architecture.md §1.2](tech/architecture.md#12-decision-log)
- **Oct 2** — Parent account keyed by Google email, with child profiles (no child email); at most 6 children per parent (D1, D11). [architecture.md §1.2](tech/architecture.md#12-decision-log)
- **Oct 2** — A child's own email link at 13+ is designed, not built (D2). [architecture.md §1.2](tech/architecture.md#12-decision-log)
- **Oct 2** — Parent area behind a PIN, hashed with lockout (D10). [architecture.md §1.2](tech/architecture.md#12-decision-log)
- **Oct 2** — Guest mode is kept (D9). [architecture.md §1.2](tech/architecture.md#12-decision-log)
- **Oct 2** — Save conflict: the save with more progress wins; the other is kept as a backup copy (D13). [architecture.md §1.2](tech/architecture.md#12-decision-log)
- **Oct 2** — Non-commercial on Vercel Hobby; no custom domain, so no email sending (D7, D8). [architecture.md §1.2](tech/architecture.md#12-decision-log)
- **Oct 2** — Monetization deferred until the game is complete; future ads must be COPPA-compliant contextual only (D7, D17). [architecture.md §1.2](tech/architecture.md#12-decision-log)
- **Oct 2** — Legal review deferred until public launch; COPPA design principles stay (D14). [architecture.md §1.2](tech/architecture.md#12-decision-log)
- **Oct 2** — Graph scale ~15 to ~200 nodes, one graph per dungeon level; graph data is static build content (D3, D15). [architecture.md §1.2](tech/architecture.md#12-decision-log)
- **Oct 2** — Dialogue-scene and quest data hooks designed; Desy owns story/dialogue/quests, Arty owns portraits (D18). [architecture.md §1.2](tech/architecture.md#12-decision-log)

## Docs and process

- **Oct 9** — GitHub (this repo) is the only primary source for all design docs and tables: tables are CSV, docs are Markdown, git is the version control, and no Google Docs or Sheets copies are maintained. [README.md: Rules](README.md#rules)
