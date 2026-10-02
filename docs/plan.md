# Chinese Learning RPG: Research Summary, Plan & Early Decisions

*Prepared for Jack Song, September 28, 2026. This plan summarizes three memos: the tech, market and compliance research, Desy's game design memo, and Arty's art direction memo. All figures come from those memos, and their “estimate” and “unverified” labels are carried over. Nothing here is legal advice.*

## 1. Vision and market gap

We are building a browser-based, turn-based fantasy RPG that teaches Mandarin (reading, listening and speaking) to American kids around age 12. The hero travels from town to town and through kingdoms and realms, helps people, and fights horned rabbits, jumbo bees, goblins, hydras and zombies on the way to defeating a demon king who wants to rule all races by force. Combat follows Prodigy's “answer to cast” structure with Miitopia's charm, and every attack is built on a Chinese question, such as “How do you say ‘I am scared’ in Chinese?” or “What does 吃饭 mean?”. The first version is a web game for Jack's daughter and her friends to play. Only if it proves fun will we consider porting it to a Nintendo-compatible engine, so Nintendo is not a v1 goal. The research found a clear gap: no product is a Prodigy-style, browser-based, classroom-friendly Chinese RPG for ages 10 to 13. Kids' apps skew toward preschoolers (Miaomiao's Chinese, Dinolingo) or passive viewing (Little Fox Chinese). Duolingo and HelloChinese are lesson drills with no game world. The Chinese RPGs that exist (WonderLang Mandarin, Terra Alia) are PC/Steam games that are not made for kids and have no parent or teacher tools.

## 2. Big decisions to make now

This is the most important section. Each decision gives the question, the options, the team's recommendation, why it matters now, and who weighs in. Jack decided Decisions 1, 2, 9, 11 and 12 on 2026-09-28, and updated the audio, team and budget, and audience scope (Decisions 13-15). The rest are still open.

| Decision | Recommendation or status | Who weighs in |
|---|---|---|
| 1. Script default | **DECIDED (2026-09-28):** Simplified by default. Traditional stored for every item so a toggle can come later | Jack (decided) |
| 2. Curriculum anchor | **DECIDED (2026-09-28):** YCT 1-4 for themes and scope, every item tagged with its HSK 3.0 level | Jack (decided) |
| 3. Pinyin and tone colors | Pinyin with tone marks that fade with mastery. Tone colors optional, never the only cue | Desy, Arty |
| 4. Combat and learning | The answer is the attack, not a quiz between fights | Desy, Director |
| 5. Wrong answers | Never lose progress. Fizzle, teach, ask again later | Desy |
| 6. Speaking in v1 | Optional bonus only. Test Azure vs SpeechSuper later. Exclude iFlytek | Jack, Director, counsel |
| 7. Privacy / COPPA | No accounts, local saves. Legal review before any voice upload | Jack, counsel |
| 8. Business model | Free slice. No member upsell to kids. Later a parent-bought unlock and/or free for schools | Jack |
| 9. Platform and engine | **DECIDED (2026-09-28):** Phaser 4 + TypeScript web game, engine-neutral content so a later port (Godot etc.) only rewrites the client | Jack (decided) |
| 10. Art style | 2D chibi, cel-shaded, ink-wash accents. 2D not 3D. Animation tool TBD | Arty, Jack |
| 11. Culture blend | **DECIDED (2026-09-28):** Western fantasy monsters by default. Asian creatures only when an episode or story arc calls for them | Jack (decided) |
| 12. Art sourcing / AI | **DECIDED (2026-09-28):** all art AI-generated, using CC0/public-domain images as style references, never copying a living artist | Jack (decided) |
| 13. Audio | **Updated (2026-09-28):** all music AI-generated. Voices: neural TTS checked by native speakers, plus native recordings for core items | Desy, Director |
| 14. Team and budget | **Updated (2026-09-28):** AI coding agents write the code and Jack reviews it. AI art and music. Budget is mainly AI tool subscriptions and API costs | Jack, Director |
| 15. Audience scope | **Set by Jack (2026-09-28):** first players are his daughter and her friends, a small private playtest group. School and classroom tools deferred | Jack |

### Decision 1: Script default — DECIDED (2026-09-28)

**Decision.** The game teaches **Simplified characters** by default, with Hanyu Pinyin. **Traditional is stored for every item** from day one (converted with OpenCC, with a person checking conversions that are not one-to-one) so a Traditional toggle can ship later without rework. Audio uses Mainland Mandarin (zh-CN) voices.

**Why.** HSK and YCT use Simplified, it has fewer strokes, and it matches Arty's font pipeline (Noto Sans SC) and the tech research's recommendation. The tech research's claim that most US K-12 programs use Simplified has no citation and is still **unverified**. AP Chinese accepts either script, so neither choice hurts students there.

**Dissent on record.** Desy recommended Traditional + TOCFL, citing the project's original 吃飯 example, TOCFL's official Traditional word list, and Taiwan-heritage families.

**What this unlocks.** The Phase 0 word list, Noto Sans SC font subsets, zh-CN voice selection, and on-screen text in the art can all proceed.

### Decision 2: Curriculum anchor — DECIDED (2026-09-28)

**Decision.** Use **YCT 1-4** for scope and kid-friendly themes (YCT1 80 words, YCT2 150, YCT3 300, YCT4 600, plus a separate speaking test), and **tag every item with its HSK 3.0 level** (HSK1 300, HSK2 500, HSK3 1,000 words) for credibility with parents and teachers. Suggested mapping from the tech research: early realms YCT 1-2 / HSK 1, mid-game YCT 3-4 / HSK 2, late game and Demon King HSK 3. The vertical slice sits inside YCT 1-2 / HSK 1.

**Notes.** The HSK 3.0 syllabus (published November 2025, exams reported to open worldwide December 13, 2026) comes from secondary sources, so confirm it against the official syllabus before claiming alignment publicly. Official lists are copyrighted, so we write our own definitions and sentences. Desy had proposed TOCFL Novice as the base to go with Traditional; TOCFL tags can still be added later if a Traditional toggle ships. **Owner.** Desy owns the word list.

### Decision 3: Pinyin and tone-color policy

**Agreed.** Hanyu Pinyin with tone marks, shown over each character with HTML `<ruby>`, always on first exposure, then faded per word as the child masters it, with a free “tap to reveal.” Bosses can be the “no pinyin” test. Zhuyin can come later as an option.

**Open point: tone colors.** Desy wants always-on colors tied to the Tone Element attacks (1 blue, 2 green, 3 orange, 4 red). Arty notes that research summarized by Hacking Chinese found color did worse than tone marks and added no significant benefit, and that red carries cultural meaning. **Recommendation:** tone marks always, tone color as an optional helper with a color-blind-safe palette, and an icon alongside any color. **Why now.** It shapes the Phase 1 question panels. **Who.** Desy and Arty.

### Decision 4: How combat integrates learning

**Options.** A quiz gate followed by a normal attack, or the answer *is* the attack and the question type is the tactical choice. **Recommendation: the answer is the attack.** In Habgood and Ainsworth's 2011 study, kids learned more when the math was the combat than with the same quizzes between levels, and chose to play 7 times longer. Desy's ideas: Tone Elements (the four tones as elements, with enemy tone weaknesses), monsters calmed by words from their own topic, and a town Forge for building characters. **Why now.** It is the core of the game and what Phase 1 tests. **Who.** Desy, approved by the Director.

### Decision 5: Wrong-answer policy

**Recommendation: never lose progress.** The companion shows the right answer with audio, pinyin and a short memory hint. The attack fizzles and the enemy takes its turn. Misses fill a Friendship gauge that powers a team attack. At 0 HP the party retreats to the inn keeping all XP and items, and missed words go into review. No instant retries, since that turns multiple choice into elimination. Hint tokens are earned, never sold. **Why now.** It sets the tone for a 12-year-old and shapes the prototype. **Who.** Desy, validated in playtests.

### Decision 6: Speaking in v1, and a scoring vendor later

**Options.** No speaking, an optional bonus, or required speaking. **Recommendation: optional “Shout Spell.”** After a correct tap answer, the child can say the word for bonus damage. Failure still gives base damage, speaking never blocks progress, and a “Can't talk now” setting is always there. Tones are not graded in v1, because the browser's Web Speech API returns characters, not tones, and works reliably only in Chrome.

**Later vendor.** Test Azure Pronunciation Assessment and SpeechSuper side by side (the tech memo suggests 50 kid recordings). Azure is the safer compliance choice but has no documented tone score. SpeechSuper claims tone scoring (vendor claim, untested). **Exclude iFlytek.** The tech memo's uncited claim that iFlytek is on the US Entity List is now **verified**: Federal Register notice 84 FR 54002 added IFLYTEK on October 9, 2019, and no removal was found. Confirm current status with the Commerce Department (BIS) before any procurement. **Why now.** It sets v1 scope and privacy posture. **Who.** Jack and the Director, with counsel before any voice feature reaches under-13s.

### Decision 7: Privacy and COPPA posture

**Options.** No accounts; parent accounts with verifiable parental consent (VPC); school accounts. **Recommendation: no accounts in v1.** Saves live in the browser with export codes, the site is static, and no voice audio leaves the device until counsel approves. The amended COPPA Rule has required full compliance since April 22, 2026, counts voiceprints as personal information, and carries penalties up to $53,088 per violation. A narrow exception allows voice audio used only to answer the child and deleted immediately, but whether sending it to Chrome's cloud or a vendor counts as “disclosure” is a question for counsel. No free-text chat, no behavioral ads, self-hosted fonts. **Why now.** It sets the architecture and is cheapest to get right early. **Who.** Jack and counsel. Consider a safe-harbor program (PRIVO, kidSAFE, iKeepSafe) before accounts.

### Decision 8: Business model

**Options.** Free, one-time or parent-bought unlock, Prodigy-style membership, or school licenses. **Recommendation.** Free vertical slice. No member upsell shown to kids. Later, a parent-bought unlock and/or free for schools. In 2021, 22 advocacy groups filed an FTC complaint saying Prodigy pressured kids with member-only rewards (no public FTC action found). Note the split: the tech research proposed a parent membership around $8-10/month or $60/year (a proposal, not market data), while Desy advises against membership. This recommendation keeps learning content equal for all and never upsells in school accounts, which the FTC's school-consent guidance requires anyway. **Why now.** The slice needs no store or accounts. **Who.** Jack.

### Decision 9: Target platform and engine — DECIDED (2026-09-28)

**Decision.** v1 is a **web game built with Phaser 4 + TypeScript**, with an HTML overlay (React or similar) for all Chinese text and menus, Vite, and static hosting. All content (vocabulary, questions, audio references, dialog) lives in **engine-neutral JSON**, so a later port to Godot or another Nintendo-compatible engine only rewrites the client. Nintendo is not a v1 goal: a port is considered only if the web game proves fun (see Later phases).

**Why.** Phaser's full build is about 345 KB gzipped versus about 5 MB for a stock Godot 4.3 web export, and it behaves best on iOS Safari and Chromebooks. Phaser has no direct path to Switch, but the tech research notes Godot can reach Switch through W4 Consoles or a community port, which is why the content stays engine-neutral. Target Chrome first, with everything except the Shout Spell working in Safari and Firefox. The code is written by AI coding agents, with Jack reviewing it.

### Decision 10: Art style

**Recommendation.** 2D chibi, cel-shaded characters and monsters, with Chinese ink-wash accents on UI frames, the world map, realm transitions and boss intros. 2D, not 3D: simpler, lighter, and better with Chinese text. Animation approach (for example Spine skeletal animation with skins for a Mii-style avatar, no photo upload) to be confirmed with Arty's AI-pipeline tool choices. Pixel art only for a throwaway prototype, because small characters are hard for beginners to read. **Why now.** The style guide gates all art, and it doubles as the base for the AI art pipeline (Decision 12). **Who.** Arty proposes, Jack approves.

### Decision 11: Culture blend — DECIDED (2026-09-28)

**Decision.** Monsters are **Western fantasy by default** (horned rabbits, jumbo bees, goblins, hydras, zombies). Asian creatures appear **only when an episode or story arc makes sense**, for example a Chinese-mythology arc. Xiangliu (相柳), the nine-headed serpent from the Shan Hai Jing, is no longer the default hydra; it stays on the list as an optional arc-specific idea, along with the Four Symbols as guardians. When Asian creatures do appear, follow Arty's guidance: Chinese dragons stay benevolent, no mixing in Japanese motifs, no chop-suey fonts or stereotypes, and a cultural review of that arc. Two rules apply everywhere: never show the player's name in red, and use orange or gray plus an icon for “incorrect.” A native-speaker reviewer still checks all Chinese text, audio and pinyin.

### Decision 12: Art sourcing and AI policy — DECIDED (2026-09-28)

**Decision.** **All art is AI-generated.** Style and mood references come only from free-licensed CC0 or public-domain images, and prompts never ask to copy a specific living artist. **Why.** This is a private game for family and friends, so copyright and commercial concerns are lower than for a commercial release. **Risk kept on record.** If the game ever goes public, AI-generated art has limited copyright protection: the US Copyright Office says AI output without enough human authorship is not protected. Revisit this decision before any public release. **Pipeline.** See Section 5 (style guide, fixed prompt templates, character reference sheets). Arty is drafting the tool choices (TBD).

### Decision 13: Audio approach — updated (2026-09-28)

**Recommendation: hybrid.** **All music is AI-generated (updated 2026-09-28).** For voices, pre-generate all audio with zh-CN (Mainland Mandarin) neural TTS voices, such as Azure's child-like voice Xiaoyou, with native speakers checking every clip, because TTS sometimes gets tone changes (一, 不) and multi-reading characters (行, 了) wrong. Record native speakers for tone minimal pairs, the roughly 50 core words, and boss lines. No live browser TTS for graded items. Pre-generating costs a few dollars for a 3,000-item bank at about $16 per million characters (a third-party price Desy could not confirm with Microsoft). **Why now.** Phase 2 needs the pipeline. **Who.** Desy and the Director, with the native reviewer.

### Decision 14: Team and budget — updated (2026-09-28)

**Team.** Code is written by **AI coding agents, with Jack reviewing** it. Art and music are AI-generated (Decisions 12 and 13). Desy owns design and content, Arty owns art direction and the AI art pipeline, and the Director coordinates. Native-speaker review of Chinese text and audio stays human.

**Budget.** There are no commissioned-art costs. The budget is now mainly **AI tool subscriptions and API costs** (image, music, TTS and coding tools), plus native-speaker review. No figures yet: they depend on the tools Arty picks (TBD). **Who.** Jack and the Director.

### Decision 15: Audience scope — set by Jack (2026-09-28)

**Decision.** The first players are **Jack's daughter and her friends**, a small private playtest group. School and classroom tools (class codes, teacher dashboards, Google Classroom/Clever sign-in, district privacy agreements) are **deferred** until the game proves fun. **Implications.** Keep v1 simple: no accounts, local saves, and feedback gathered directly from the kids and their parents. Two notes for later: the Student Privacy Pledge was retired in April 2025, and school accounts can never show upsells. **Who.** Jack.

## 3. Story and world outline (DRAFT)

*A first draft from the premise and the memos, to be revised in the Phase 0 story bible. Monsters are Western fantasy by default (Decision 11).*

**Premise.** The hero, a custom avatar, leaves a small village when word comes that a Demon King is forcing every race (humans, goblins, beast-folk and other peoples) to bow to him. The hero helps people town by town and gathers companions. The Demon King's power grows wherever people stop understanding each other, so each new word helps a town, calms a monster, or wins a friend.

**The Demon King.** He believes the races can only live together if one ruler forces them. His final fight mixes every question type, and in the last phase the hero must understand his speech and answer with the right phrase: force versus friendship (朋友).

**Realm progression (draft).** Based on Desy's curriculum map, with Western monsters per Decision 11. Sample words are shown in Simplified, per Decision 1.

| Realm | Monsters | Topic | Sample words |
|---|---|---|---|
| Starter Meadow (Village of 小山) | Horned rabbits | Greetings, numbers 1-10, yes/no, tone basics | 你好、谢谢、再见、是、不是 |
| Honeycomb Forest | Jumbo bees; Queen Bee boss | Food and eating (我要… / 我想吃…) | 吃、喝、饭、水、我饿了 |
| Goblin Caves | Goblins | Feelings and body | 我很怕、高兴、累、头、手 |
| River Market Town | Mischief sprites (quests) | Money, shopping, measure words | 多少钱、块、个、买、卖 |
| Misty Marsh | Hydras; a great hydra boss, each head asks a question | Time and daily routine | 今天、明天、现在、马上 |
| Ruined Town | Zombies, cured by kind words | Family, helping, requests, apologies | 妈妈、朋友、帮忙、请、对不起 |
| Races' Capital | Demon King's lieutenants | Places and directions | 去、在、哪里、左、右 |
| Demon King's Keep | Demon King | Cumulative review | Mixed |

**Optional arc ideas (only if a story arc calls for them).** A Chinese-mythology episode could feature Xiangliu (相柳), the nine-headed serpent who poisoned the land with swamps, or the Four Symbols (青龙 Azure Dragon, 朱雀 Vermilion Bird, 白虎 White Tiger, 玄武 Black Turtle-Snake) as guardians, which would also teach directions and colors.

**Companions (draft).** As in Miitopia, the player controls only the hero and companions act by personality. The slice has one “Kind” companion who helps after a miss (“It's 饿, hungry! The 饣 side is food!”). Later companions could include a reformed goblin or a friendly creature met in a later realm. Bonds grow at inns and unlock team skills.

## 4. Game design summary

**Core loop.** Meet NPCs in town who use new words in context, take a quest, walk a short path with a branch or two, fight battles that act as retrieval practice, and rest at the inn, where companions bond and a 2-minute “Dream Review” covers due words. Target sessions are 10-15 minutes (a design target to playtest, not a research figure).

**Combat.** Turn-based. Each correct answer powers an attack, and the question type is the attack choice. Tone Elements map tones to wind, fire, earth and lightning.

| Question type | Example | In the slice? |
|---|---|---|
| Meaning pick | “What does 吃饭 mean?” (4 options) | Yes |
| Reverse pick | “Which one means ‘I'm scared’?” | Yes |
| Audio pick | Hear chīfàn, pick 吃饭 or a picture | Yes |
| Tone pick | Hear mā/má/mǎ/mà, pick the tone | Yes |
| Match pairs | Drag 5 characters to 5 meanings | Yes (boss) |
| Word ordering | Order the characters of 马上 | Yes (light) |
| Fill in the blank, sentence ordering | 我___饭。/ put 我, 马上, 到 in order | Later |
| Speak it | Say 你好 for bonus damage | Optional bonus |

**Anti-guessing.** Options unlock after the audio plays or after about a second. Damage never depends on speed. Distractors come from look-alike and sound-alike words (饿/我, 饭/饮). Streak bonuses reward accuracy and drop one tier on a miss. Missed items return 2-4 questions later.

**Progression.** Each word climbs a mastery ladder per skill: introduce, recognize (3 options with pinyin), harden after 2 correct (4 options, no pinyin, then audio only), produce, and drop back a step after a miss. Aim for success that feels good but not trivial; the common ~80% figure is a heuristic, **not verified research**.

**Spaced repetition.** Leitner boxes in v1, visible to kids (“your word moved to the Gold Box!”). Log every attempt from day one to allow a later move to FSRS. Due words show up in random encounters anywhere.

## 5. Art direction summary

- **Look.** 2D chibi and cel-shaded, with rounded shapes and ink-wash accents on UI frames, map and transitions.
- **Not babyish.** Cute heroes, increasingly menacing monsters, richer later realms. Kids reject content aimed even one grade younger (Nielsen Norman Group).
- **AI art pipeline.** All art is AI-generated (Decision 12). Consistency comes from three things: (1) a written **style guide** (shape language, palette, line and shading rules, ink-wash accent rules); (2) **fixed prompt templates** for each asset type (characters, monsters, backgrounds, UI, props); and (3) **character reference sheets** (front, side and back views plus expressions) reused as references for every new image of that character. Style references are CC0 or public-domain images only, and prompts never name a living artist. Keep a simple log of prompts and references per asset. **Tools: TBD** (Arty is drafting the choices).
- **Avatar.** Mii-style modular avatar (face parts, hair, colors, outfits), with the animation approach to be confirmed alongside the tool choices.
- **Chinese text.** All learning text in the HTML overlay, never baked into generated images. Noto Sans SC for questions (a TC subset is added if the Traditional toggle ships), LXGW WenKai for story, ZCOOL KuaiLe for titles only, self-hosted as subsets. Tested characters at least 32 px, pinyin at least 12-14 px (Arty's judgment, to validate), WCAG AA contrast on solid panels.
- **Layout.** 16:9 at 1280x720, art drawn at 2x.

## 6. Tech architecture summary

| Layer | Choice |
|---|---|
| Client | Phaser 4 + TypeScript, Vite |
| Code | Written by AI coding agents, reviewed by Jack |
| Art and music | AI-generated via the Section 5 pipeline. Tools TBD |
| Text and UI | HTML overlay (React or similar), `<ruby>` pinyin |
| Content | Engine-neutral JSON built from a spreadsheet: Simplified (default) and Traditional forms, pinyin, English, audio, YCT and HSK 3.0 level tags |
| Audio | Pre-generated MP3/Opus per item, loaded per region |
| Save | Browser storage (IndexedDB) with export codes. No server in v1 |
| Speech | Feature-detected. Shout Spell hidden where unsupported |
| Hosting | Static site (Netlify, Vercel, GitHub Pages or Cloudflare Pages), shared privately with the playtest group |
| Feedback | Jack collects feedback from the kids and their parents directly (quick chats or a short parent-filled form). No personal data collected in the game |
| Data | CC-CEDICT (CC BY-SA), Tatoeba (CC BY), Hanzi Writer, OpenCC. Tone Perfect audio needs permission for commercial use |

## 7. Milestones

*The memos give no durations, so none are listed here. The Director should add estimates, labeled as such, after Phase 0. The first milestone that matters is a fun web build that Jack's daughter and her friends actually want to play.*

**Phase 0: Decisions and pre-production.** *Goals:* settle the remaining Section 2 decisions and write the foundation documents. *Deliverables:* decision log, art style guide, slice word list (~40 words, YCT 1-2 / HSK 1) plus a first pass for all realms tagged by YCT and HSK 3.0 level, story bible with bestiary, privacy note for counsel, AI art pipeline starter kit (prompt templates, first character reference sheets). *Owners:* Jack (decisions, code review), Director (log, schedule), Desy (word list, story bible), Arty (style guide, AI art pipeline and tool choices). *Exit:* documents approved (script, anchor, art sourcing and culture blend already decided on 2026-09-28), art tools chosen, native reviewer engaged.

**Phase 1: Paper and greybox combat prototype.** *Goals:* prove “the answer is the attack” is fun and teaches, before final art. *Deliverables:* a paper battle, then a Phaser greybox battle with the HTML overlay, four question types, streaks, re-ask, the fizzle-and-teach flow, attempt logging and placeholder TTS. *Owners:* Desy (design), AI coding agents with Jack reviewing (engineering), Arty (UI layout, text size), Director (test plan). *Exit:* guessing doesn't win, text is readable on a Chromebook, and the team agrees the loop works.

**Phase 2: Vertical slice.** *Goals:* a fun web build that Jack's daughter and her friends play, plus a simple feedback loop. *Scope:* Village of 小山, Starter Meadow to Honeycomb Forest in 3-4 stages, a custom hero and one companion, three monsters (Horned Rabbit, Jumbo Bee, Goblin Scout) plus the 3-phase Queen Bee boss, about 40 words, six question types, optional Shout Spell with no uploads, Leitner boxes and local save. *Playtesting* with the private group (Jack's daughter and friends): pre/post quiz on the 40 words, who chooses to play again, per-item accuracy, guess rate, and a short feedback round after each session. *Owners:* AI coding agents with Jack reviewing (engineering), Desy (content, playtests), Arty (AI art and music production), Director (scope, logistics). *Exit:* measurable learning gains, kids want to keep playing, no data leaves the device.

**Phase 3: Alpha.** *Goals:* grow the web build to 2-3 realms that the same friends keep playing, iterating on their feedback. *Deliverables:* Goblin Caves and River Market Town (possibly Misty Marsh), full audio (AI music, TTS voices with native QA), a parent progress view (waiting on counsel and VPC if it needs accounts), pinyin and tone-color settings, and the optional Traditional toggle if wanted. *Owners:* Desy, Arty, Jack, Director. *Exit:* the friends keep coming back, parents find the view useful, counsel signs off on any data. This is also the point to decide whether a Nintendo port is worth pursuing.

**Phase 4: Beta and wider web release.** *Goals:* if the private playtest shows it is fun, open the web game to more families. *Deliverables:* a review of the AI-art decision before going public (Decision 12), remaining realms or a defined launch set, low-end device performance, privacy and retention policies, a parent-bought unlock if chosen. *Owners:* Jack (launch call), Director (release), Desy (balance), Arty (polish). *Exit:* counsel and native-speaker sign-off, stable on target devices.

**Later phases.** *Nintendo port (conditional):* only if the web game proves fun, port the client to Godot or another Nintendo-compatible engine, reusing the engine-neutral content (options in the tech research include W4 Consoles or a porting partner). *Also later:* speaking scoring (Azure vs SpeechSuper, parent-consented, zero-retention contracts), parent accounts and cloud save with VPC, classroom tools (deferred per Decision 15), native mobile apps via a Capacitor wrapper, and FSRS-based adaptivity.

## 8. Risks and open questions

| Risk | Mitigation |
|---|---|
| Traditional-using families and schools feel left out | Traditional stored for every item, so a toggle can ship later |
| Learning feels bolted on | Answer-as-attack, tested in Phase 1 before final art |
| COPPA exposure | No accounts or uploads in v1; counsel before changes |
| Upsell backlash like Prodigy's | No kid-facing upsell; equal learning content |
| Cultural missteps in an Asian-creature arc | Follow Arty's cultural guidance and review that arc before release |
| Speech is Chrome-only and tone-blind | Speaking stays optional |
| AI art looks inconsistent across assets | Style guide, fixed prompt templates, character reference sheets |
| Game goes public later | AI-generated art has limited copyright protection; revisit Decision 12 before any public release |
| AI-written code has bugs or security gaps | Jack reviews all agent code; no accounts or server in v1 |
| AI tool costs creep up | Track subscriptions and API spend once tools are chosen |
| A later Nintendo port needs a new engine | Engine-neutral content, so only the client is rewritten |
| A small playtest group gives a narrow signal | Treat results as early signal; widen testing in Phase 4 |

**Unverified claims and open questions.**

- *Tech memo:* iFlytek Entity List claim was uncited, now **verified** (84 FR 54002, 2019; confirm current status). “Most US K-12 programs use Simplified” is **unverified** (Decision 1 does not depend on it alone). Prices should be rechecked before committing, and the $8-10/month membership is a proposal. Whether streaming voice to a vendor fits COPPA's exception needs counsel.
- *Desy's memo:* the ~80% success target is a heuristic. “Traditional-first learners read Simplified more easily” has no study. Azure TTS price is third-party. Azure's tone sensitivity is undocumented. SpeechSuper's tone scoring is a vendor claim and Desy marked its pricing unverified. Web Speech support on Edge and Safari is disputed. HSK 3.0 details come from secondary sources. Prodigy's placement schedule was not confirmed.
- *Arty's memo:* the commissioned-art cost estimates (vendor-sourced) no longer apply after Decision 12. Unverified: Legends of Learning's 1024x576 spec, Firefly indemnification terms, the Noto Serif SC license, the formal hanzi-size study, the 1366x768 Chromebook norm, and consultant and reviewer rates. Arty did not research COPPA.
- *Design:* the AI art and music tool choices are TBD (Arty drafting). The tone-color palette and use of red are open. Which races appear in the story is open.

## 9. Sources

Full memos on the shared machine: /workspace/chinese-rpg/research-tech-market.md (tech, market, compliance), /workspace/desy/chinese-rpg-design-memo.md (design, Desy), /workspace/art-direction-memo.md (art, Arty). Each has a complete source list.

- Phaser 4 release: https://github.com/phaserjs/phaser/releases/tag/v4.0.0
- MDN Web Speech API: https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition
- Azure Pronunciation Assessment: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-pronunciation-assessment
- SpeechSuper pricing: https://speechsuper.com/pricing.html
- iFlytek Entity List listing: https://www.federalregister.gov/documents/2019/10/09/2019-22210/addition-of-certain-entities-to-the-entity-list
- COPPA Rule amendments: https://www.federalregister.gov/documents/2025/04/22/2025-05904/childrens-online-privacy-protection-rule
- FTC COPPA FAQ: https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions
- Fairplay complaint about Prodigy: https://fairplayforkids.org/feb-19-2021-advocates-to-ftc-prodigy-math-game-preys-on-kids-and-families/
- Habgood & Ainsworth (2011): https://www.tandfonline.com/doi/abs/10.1080/10508406.2010.508029
- HSK 3.0 overview: https://hskstory.com/guides/what-is-hsk-30
- W4 Consoles (Godot console ports): https://www.w4games.com/w4consoles
- YCT (Youth Chinese Test): https://www.mandarin.ac.cn/tests/yct-youth-chinese-test.html
- TOCFL word lists: https://tocfl.edu.tw/tocfl/index.php/exam/download
- Hacking Chinese on tone colors: https://www.hackingchinese.com/does-using-colour-to-represent-mandarin-tones-make-them-easier-to-learn/
- Pixune art price guide: https://pixune.com/blog/game-art-outsourcing-price/
- Xiangliu: https://en.wikipedia.org/wiki/Xiangliu
- US Copyright Office on AI: https://copyright.gov/newsnet/2025/1060.html
