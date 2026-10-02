# Design Findings Memo: Chinese-Learning Browser RPG (working title TBD)

**For:** Game Director / Project Plan  **Prepared for:** Jack Song  **Date:** Sep 28, 2026
**Target:** American kids around 12, Mandarin reading/listening/speaking, Miitopia charm + Prodigy structure, browser-based.

> How to read this: every factual claim has an inline source. Where I couldn't verify something, I say so. Design recommendations are my judgment and are labeled as such. Numbers like "30–60 words" and "10–15 minutes" are design targets, not research findings.

---

## 0. TL;DR recommendations

| Decision | Recommendation |
|---|---|
| Core fantasy | Miitopia-style party & personality charm on top of a Prodigy-style "answer to cast" battle loop, but with the language tied into *which* attack you pick (intrinsic integration), not just quiz gates. |
| Script | **Traditional characters first** (matches 吃飯 example; TOCFL publishes an official Traditional word list), and store Simplified for every item so a toggle can ship later. |
| Romanization | **Hanyu Pinyin with tone marks**, shown by default at first and faded out per word as mastery grows. Zhuyin as an optional setting later. |
| Speaking in v1 | **Optional bonus only** ("Shout Spell"). Chromium-only, never required to progress, always has a tap fallback. |
| Audio | **Pre-generated neural TTS files (zh-TW voice) for v1**, with native-speaker recordings for the ~50 core words plus the boss lines once budget allows. Don't depend on browser live TTS. |
| Wrong answers | Never lose progress. The attack fizzles, a companion teaches the correct answer, and the item comes back later in the same battle and in spaced review. |
| Anti-guessing | Answer options unlock after the prompt/audio has played, distractors are shuffled and plausible, damage scales with an accuracy streak, and super-fast answers get no bonus. |
| Adaptivity | Per-word mastery model: in-battle re-ask plus a Leitner-style box system in v1, with FSRS-ready data logging for later. |
| Monetization | **None in the vertical slice.** If you monetize later, use a one-time purchase or a parent-facing purchase with **no member-only items shown to kids** (see the Prodigy criticism below). |
| Accounts/COPPA | v1: **no accounts, no personal info, local save only**. Add parent-created accounts with verifiable parental consent only when cloud save is needed. |
| Tech | Phaser 4 for world and battle scenes, HTML/DOM overlay for the question UI (clean CJK text, accessibility), static hosting. |

---

## 1. Reference games: Prodigy Math and Miitopia

### 1.1 Prodigy Math

**Core loop.** The kid is a student wizard on Prodigy Island exploring zones, doing quests, and battling. Story: the Puppet Master scatters five elemental keystones, and you collect them and defeat him ([Prodigy](https://www.prodigygame.com/main-en/blog/what-is-prodigy-math-game)). **Combat:** "Each question players answer correctly grants them a spell to cast during the battle," against monsters or other players. Winning boosts stats and earns rewards. Prodigy says it has "more than 50,000 math questions from 1st–8th grade" ([Prodigy](https://www.prodigygame.com/main-en/blog/what-is-prodigy-math-game)).

**Adaptivity.** Prodigy describes an adaptive algorithm that keeps kids in their "zone of proximal development." It drops back to prerequisite skills when a student struggles, shows the correct answer after a mistake, then serves more questions to re-place the student. It also uses "spiral review" of earlier content ([Prodigy: Is Prodigy adaptive?](https://www.prodigygame.com/main-en/blog/is-prodigy-math-adaptive)). A placement test runs when kids first play, and teachers can assign content through a dashboard (per the same Prodigy material, summarized in search results; I didn't independently confirm the placement schedule).

**Monetization.** Education content is free. Memberships sell game advantages and cosmetics. Current US pricing on Prodigy's site: **Core $9.95/mo or $58.95/yr, Plus $14.95/mo or $88.95/yr, Ultra $19.95/mo or $118.95/yr.** Benefits include monthly "Magicoin," member-locked gear, "Mythical Epic" pets, seasonal member chests, and parent goal/reward tools ([Prodigy memberships](https://www.prodigygame.com/Memberships/math/?defaultplanid=monthly); [Which membership](https://www.prodigygame.com/main-en/blog/choosing-prodigy-membership)).

**Criticism.** In Feb 2021, 22 advocacy groups led by the Campaign for a Commercial-Free Childhood (now Fairplay) filed an FTC complaint. They alleged that Prodigy markets itself to teachers as free while "aggressively marketing to children a Premium membership," and that kids are teased with rewards available only if the family pays. They also argued that member perks carry over into school play and so create "two classes of students" ([Fairplay press release](https://fairplayforkids.org/feb-19-2021-advocates-to-ftc-prodigy-math-game-preys-on-kids-and-families/); [complaint PDF](https://fairplayforkids.org/wp-content/uploads/2021/02/Prodigy_Complaint_Feb21.pdf)). NBC reported that CCFC counted 16 unique membership ads and 4 math problems in 19 minutes of play ([NBC News](https://www.nbcnews.com/tech/tech-news/child-protection-nonprofit-alleges-manipulative-upselling-math-game-prodigy-n1258294)). The complaint also said Prodigy lacked substantiation for its learning claims. Prodigy responded that all educational content is free and that memberships are optional ([Axios](https://www.axios.com/2021/02/19/prodigy-math-game-ftc-complaint); [EdWeek](https://www.edweek.org/technology/popular-interactive-math-game-prodigy-is-target-of-complaint-to-federal-trade-commission/2021/02)). I found no public record of FTC action. FTC investigations are nonpublic (EdWeek).

**What works for kids:** a familiar RPG fantasy, pets and collection, visible customization, battles as the payoff for answering, and invisible adaptivity. **What to avoid:** pay-gated cosmetics shown to kids, faster leveling for paying members, and a ratio where the learning gets crowded out by upsell or battle animation.

### 1.2 Miitopia (Nintendo, Switch 2021)

**Core loop.** You cast Mii characters (friends, family, anyone) as heroes, villagers, and the Dark Lord. Pick a stage on a world map, and the party auto-walks with occasional path/chest choices and random battles. At the end of each stage you stop at an inn to feed, equip, and pair up roommates ([VGC](https://www.videogameschronicle.com/review/miitopia/); [Nintendo World Report](http://www.nintendoworldreport.com/review/43890/miitopia-3ds-review)).

**Combat.** Turn-based. **You control only the hero**, and the AI controls allies based on their job and personality ([Nintendo Life](https://www.nintendolife.com/reviews/nintendo-switch/miitopia)). Personality "quirks" (Kind, Stubborn, Cool, etc.) fire automatically, sometimes helpfully and sometimes comically. There are 7 personalities with about 3+ quirks each ([Miitopia wiki](https://miitopia.wikitide.org/wiki/Personality)). A "Safe Spot" lets you pull an ally out of battle to heal. **Relationships** grow at inns and on "outings" (beach, cinema) and unlock team skills like combo attacks, warnings, and consoling ([Nintendo Life](https://www.nintendolife.com/reviews/nintendo-switch/miitopia)).

**Monetization.** Buy-once. Launched on Switch May 21, 2021 at a suggested $49.99, with a free demo whose save carries over ([Nintendo press release via Games Press](https://www.gamespress.com/The-Comedy-Filled-Miitopia-Game-and-the-Blue-Nintendo-Switch-Lite-Syst)).

**What works / critiques.** Reviewers consistently credit the charm, humor, and personalization and fault the shallow, low-agency combat and repetitive skits. GameSpot called the combat and exploration "simplistic to a fault" ([GameSpot](https://www.gamespot.com/reviews/miitopia-review-eyes-without-a-face/1900-6417683/)).

**Design takeaway (recommendation).** Borrow Miitopia's *social* layer (custom faces, personality quirks, companion relationships, inn scenes) as the reward and delight system. Replace its low-agency combat with Prodigy-style active answering. Conveniently, the Miitopia "friend helps you" mechanic maps directly onto kind handling of wrong answers (§2.4).

---

## 2. Combat that ties answering questions to fighting

### 2.1 Research anchors

- **Intrinsic integration (Habgood & Ainsworth, 2011).** In *Zombie Division*, children learned more from the version where the math *was* the combat (choosing the divisor attack) than from a version with identical multiple-choice quizzes placed between levels. In free-choice play they spent **7× longer** in the intrinsic version ([JLS abstract](https://www.tandfonline.com/doi/abs/10.1080/10508406.2010.508029); [author PDF](https://shura.shu.ac.uk/3556/1/Habgood_Ainsworth_final.pdf)). *Implication:* a question pop-up that simply lets you "attack" is the weaker, extrinsic design. Make the language choice *be* the tactical choice.
- **Retrieval practice.** Testing yourself produces better long-term retention than restudying ([Roediger & Karpicke 2006](https://journals.sagepub.com/doi/10.1111/j.1467-9280.2006.01693.x); [Karpicke review](https://learninglab.psych.purdue.edu/downloads/2017/2017_Karpicke_Retrieval_Based_Learning_Review.pdf)). Battles are retrieval practice, so favor recall (audio→meaning, build-the-word) over recognition where kids can handle it.
- **Spacing.** Cepeda et al.'s meta-analysis found spaced study beats massed study, and the best gap grows with how long you need to remember ([Cepeda et al. 2006](https://pubmed.ncbi.nlm.nih.gov/16719566/)).
- **Desirable difficulties.** Conditions that slow initial learning (testing, spacing, interleaving) can improve long-term retention and transfer ([Bjork & Bjork](https://sites.lifesci.ucla.edu/psych-bjorklab/wp-content/uploads/sites/13/2016/11/Making-Things-Hard-on-Yourself-but-in-a-Good-Way-20111.pdf)). *Implication:* mix word categories within a battle (interleave) once kids have the basics, rather than drilling one category at a time.

### 2.2 Question types (the "spellbook")

| Type | Example | Skill | Difficulty | v1? |
|---|---|---|---|---|
| Meaning pick (MC) | "What does 吃飯 mean?" → 4 English options | Reading | ★ | ✅ |
| Reverse pick | "Which one means 'I'm scared'?" → 我很怕 / 我很餓 / … | Reading | ★★ | ✅ |
| Audio pick | Hear *chīfàn* → pick 吃飯 or its picture | Listening | ★★ | ✅ |
| Tone pick | Hear *mā/má/mǎ/mà* → pick the tone | Listening/tones | ★★ | ✅ (as a special "element" attack) |
| Match pairs | Drag 5 characters to 5 meanings | Reading | ★★ | ✅ (boss phase / combo) |
| Character build | Assemble 飯 from 飠 + 反, or order the characters of 馬上 | Reading/writing | ★★★ | ✅ light version (word ordering) |
| Fill-in-blank | 我___飯。(吃/喝/看) | Grammar/reading | ★★★ | ✅ a few |
| Sentence ordering | Put 我/馬上/到 into order | Grammar | ★★★ | Stretch |
| Speak-it | Say "你好" to charm a villager / bonus damage | Speaking | ★★★ | Optional bonus only (§3) |

**Intrinsic integration ideas (recommendation):**
- **Tone Elements.** The four tones are four elemental attacks (1 = wind, flat; 2 = fire, rising; 3 = earth, dipping; 4 = lightning, falling). Enemies have a tone weakness shown by an icon, and you "hit" by identifying the tone of a heard word. Tone perception *is* the tactic.
- **Word-weakness monsters.** Each monster family is "fed," "calmed," or "defeated" by its own topic. A hungry jumbo bee is pacified with the correct food word, which makes the question read as game logic instead of a quiz.
- **Forge.** In town, kids "forge" a weapon by building characters from components, so character building lives in the progression loop, not only in battle.

### 2.3 Difficulty scaling and adaptivity

Recommended model (per word × skill, e.g., 吃飯 × {reading, listening, tone}):
1. **Introduce** a new word in a town dialogue (NPC uses it in context, with audio + pinyin + picture).
2. **Recognize.** First battle encounters use 3-option meaning pick with pinyin shown.
3. **Harden** after 2 consecutive correct answers: 4 options, harder same-category distractors, pinyin hidden, then audio-only.
4. **Produce.** Build/fill-in/speak variants unlock at higher mastery.
5. **Drop back** a step after a miss (Prodigy describes the same "drop back to prerequisite" behavior; [Prodigy](https://www.prodigygame.com/main-en/blog/is-prodigy-math-adaptive)).

Target a success rate that feels good but not trivial. The ~80% band is a common design heuristic, **not a verified research number**. Tune it through playtesting.

### 2.4 Preventing guess-spam

| Technique | Implementation |
|---|---|
| Answer-time gating | Options appear (or unlock) only after the audio finishes / the prompt has been visible ~1s. For audio items, the "replay" button is always free. |
| No reward for speed | Damage never depends on raw speed. Answers under a floor (e.g., <700 ms on a new item) earn no crit or streak bonus. Two fast wrong answers in a row trigger a gentle "Focus!" prompt from the companion, not a penalty. |
| Shuffled, plausible distractors | Randomize positions every time. Draw distractors from the same semantic category and similar-looking or similar-sounding items (餓/我, 飯/飲) so elimination by oddness fails. |
| Accuracy-streak damage | Streak multiplier (×1.0 → ×1.5 → ×2) builds on consecutive correct answers and **resets softly** (drops one tier) on a miss. Streaks reward accuracy, not clicking. |
| Re-ask | Any missed item reappears 2–4 questions later in the same battle, and a correct answer then earns a "Comeback" bonus. Guessing past an item gains nothing because it comes back. |
| Confidence-free scoring | Don't let kids retry the same question instantly until it's right (that turns MC into elimination). Show the answer and move on, and the re-ask handles retrieval. |

### 2.5 Handling wrong answers without punishing kids

- **Show the correct answer immediately**, with audio, pinyin, and a one-line mnemonic, delivered by a companion in character (Miitopia-style personality: the Kind friend says "It's 餓, hungry! The 食 side is food!"). Prodigy also shows the correct answer after a mistake ([Prodigy](https://www.prodigygame.com/main-en/blog/is-prodigy-math-adaptive)).
- **Partial effect, not zero.** A miss produces a "fizzle" (small chip damage or none) rather than a self-hit. The enemy still takes its normal turn, which is the natural stake.
- **Companion assist meter.** Misses fill a "Friendship" gauge, and when it's full an ally performs a free team attack. Mistakes feed the relationship system instead of shaming the player.
- **No hard fail state.** At 0 HP the party "retreats to the inn" with all XP and items kept, and the missed words get queued for review. Bosses get a checkpoint between phases.
- **Hint tokens.** Remove one wrong option. They're earned through play and never sold.

---

## 3. Listening and speaking tech

### 3.1 Audio prompts (TTS vs. recorded)

| Option | Pros | Cons | Notes |
|---|---|---|---|
| Browser `speechSynthesis` | Free, zero pipeline | Voice availability varies by OS/browser. Quality and tone accuracy are unpredictable, and you can't QA every device | Chrome exposes voices like "Google 國語（臺灣）" and "Google 普通话（中国大陆）," loaded asynchronously via `voiceschanged` ([iThome example](https://ithelp.ithome.com.tw/articles/10254162); [gist](https://gist.github.com/gilbert0571/a4a89abfbab4b7593af28a52e6b0f434)) |
| Cloud neural TTS, **pre-generated to files** | Consistent, QA-able, cheap for small vocab, has zh-TW voices | Tones in isolated single syllables can sound off, so every clip needs a listen-check | Azure has Taiwanese Mandarin voices (e.g., `zh-TW-HsiaoChenNeural`) ([voice listing](https://json2video.com/ai-voices/azure/voices/zh-tw-hsiaochenneural/); [Azure language support](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support)). Azure counts **each Chinese character as two characters** for billing ([Azure TTS overview](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/text-to-speech)). A third-party summary reports $16 per 1M characters with a 500K/month free tier ([TextToLab](https://texttolab.com/blog/azure-text-to-speech-pricing)). I couldn't load Microsoft's pricing page to confirm, so check [Azure pricing](https://azure.microsoft.com/en-us/pricing/details/speech/). Google Cloud TTS lists `cmn-TW` and `cmn-CN` voices ([Google voices](https://cloud.google.com/text-to-speech/docs/voices)) |
| Native-speaker recordings | Best tone fidelity and emotion, kid-appealing character voices | Cost and scheduling, re-records when content changes | Best for the core vocabulary and tone-pick items, where tone accuracy is the point |

**Recommendation:** pre-generate zh-TW neural TTS to static audio files for all items (with a human listen pass), and record a native Taiwan-Mandarin speaker for tone-pick minimal pairs, the core 50 words, and boss/NPC signature lines. Never synthesize live in the browser for graded items.

### 3.2 Speech recognition in the browser (Web Speech API)

- **Support is Chromium-centric.** MDN marks `SpeechRecognition` as "Limited availability / not Baseline" ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)). caniuse shows Chrome "partial" (25+), Safari/iOS Safari "partial" (14.1+/14.5+, prefixed), Firefox "disabled by default," and Edge "not supported" ([caniuse](https://caniuse.com/speech-recognition)). The web-features explorer lists the standard API in Chrome/Edge 139 (Aug 2025) with Firefox and Safari unsupported ([web-features](https://web-platform-dx.github.io/web-features-explorer/features/speech-recognition/)). *The sources disagree on Edge and Safari, so test on real devices.* Plan for **Chrome as the only reliable target**, which matters because many school Chromebooks run Chrome.
- **Language codes:** `recognition.lang = "zh-TW"` or `"zh-CN"` (BCP-47). The `lang` property defaults to the page/user language ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)).
- **Privacy:** "On some browsers, like Chrome… your audio is sent to a web service for recognition processing" ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)). A newer, experimental `processLocally = true` requires on-device recognition, plus `available()`/`install()` for language packs ([MDN processLocally](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/processLocally)). I couldn't verify which languages have on-device packs, including whether zh-TW does.
- **Tones:** the API returns ordinary characters, not pinyin or tone labels, and has no tone parameter. A kid who says the wrong tone may still get the "right" characters thanks to the language model, or a homophone. So **Web Speech can check "was the word recognizable," not "were the tones right."** (This is an inference from the API surface in MDN. I found no official statement on tone tolerance.)

### 3.3 Pronunciation assessment services

| Service | Mandarin | Tones? | Notes |
|---|---|---|---|
| **Azure Pronunciation Assessment** | Supports `zh-CN` and `zh-TW` (and `zh-HK` Cantonese) ([Microsoft docs source](https://raw.githubusercontent.com/MicrosoftDocs/azure-ai-docs/main/articles/ai-services/speech-service/includes/language-support/pronunciation-assessment.md)) | **No documented tone score.** Accuracy/fluency/completeness scores are provided. Prosody assessment is **en-US only**, and phoneme names (SAPI) are available for `zh-CN` ([Azure how-to](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-pronunciation-assessment)) | Tone errors may lower phoneme/accuracy scores, but I couldn't verify that Microsoft reports tones separately. A competitor claims it doesn't ([TonePerfect comparison, vendor source](https://api.toneperfect.app/compare/azure-pronunciation-assessment/)) |
| **SpeechSuper** | Mandarin character/word/sentence assessment | **Yes, per the vendor:** "scores of initial sounds, onset sounds, and tones" plus mispronunciation detection ([SpeechSuper blog](http://blog.speechsuper.com/2022/05/speechsuper-api-now-supports-mandarin.html)) | Vendor claims only, not independently tested. Pricing not verified |
| Custom pitch-contour tone classifier | Any | Yes (research approaches exist, e.g., [pitch-aware RNN-T](https://arxiv.org/html/2406.04595)) | R&D cost, better as a later-phase project |

### 3.4 Kids/COPPA and voice

- The amended COPPA Rule was published Apr 22, 2025, with compliance required by Apr 22, 2026 ([Federal Register](https://www.federalregister.gov/documents/2025/04/22/2025-05904/childrens-online-privacy-protection-rule)). It requires verifiable parental consent before collecting personal information from kids under 13, including separate consent for third-party disclosure unless integral ([16 CFR 312.5](https://www.law.cornell.edu/cfr/text/16/312.5)).
- **Voice exception:** §312.5(c)(9) allows collecting "an audio file containing a child's voice, and no other personal information," to respond to the child's request, if it's not used for anything else, **not disclosed, and deleted immediately**, with notice in the privacy policy ([16 CFR 312.5](https://www.law.cornell.edu/cfr/text/16/312.5); background: [FTC 2017 policy statement](https://www.federalregister.gov/documents/2017/12/08/2017-26509/enforcement-policy-statement-regarding-the-applicability-of-the-coppa-rule-to-the-collection-and-use)). Open question for counsel: does sending audio to Google (via Chrome) or to Azure/SpeechSuper count as "disclosure"? **Get a legal review before shipping any speaking feature to under-13s.**

### 3.5 Recommendation: fitting speaking in without letting recognition failures block progress

1. **v1: "Shout Spell" bonus.** After a correct tap answer, an optional mic button offers "Say it for +50% damage!" Success gives bonus damage and a cheer. Failure or no mic gives the base damage anyway, and the companion says "Close! Listen: …" and plays the model audio. **Never** gate a quest, boss, or item on recognition.
2. **Always offer "Can't talk now"** as a persistent settings toggle (Duolingo's in-lesson "Can't speak now" is a precedent, though users report it's inconsistently available: [Language Learning SE](https://languagelearning.stackexchange.com/questions/6126/looking-for-language-learning-app-to-use-on-subway-while-walking); [r/duolingo](https://www.reddit.com/r/duolingo/comments/1hee5nv/why_cant_i_disable_speaking_exercises_abymore_i/)).
3. **Lenient matching.** Accept any recognition alternative that contains the target characters, or a homophone of them. Tones aren't graded in v1.
4. **Listen-and-compare self-check** as a no-tech fallback: record locally (never uploaded), play it back next to the model, and let the kid self-rate. That also feeds Leitner.
5. **Phase 2:** evaluate SpeechSuper vs Azure `zh-TW` for tone feedback in a parent-consented mode.

---

## 4. Curriculum

### 4.1 Frameworks

| Framework | Script | Levels & vocabulary | Source |
|---|---|---|---|
| **HSK 3.0** | Simplified | 3 stages / 9 levels. Final syllabus cumulative entries: HSK1 **300**, HSK2 500, HSK3 1,000, HSK4 2,000, HSK5 3,600, HSK6 5,400, HSK7–9 11,000 (shared band). One exam covers 7–9 | [HSKStory](https://hskstory.com/guides/hsk-30-vocabulary-complete); [LTL](https://ltl-school.com/new-hsk/) |
| HSK 3.0 timeline | | 2021 standard (draft list) → final exam syllabus published Nov 2025, effective July 2026. HSK 3.0 exams reported to open worldwide 13 Dec 2026 | [HSKStory](https://hskstory.com/guides/hsk-30-vocabulary-complete) (secondary source, not verified against the CLEC primary) |
| 2021 draft note | | Earlier summaries of the 2021 standard list ~11,092 words with 500 at level 1. I **couldn't verify** that against the primary document, and it differs from the final 300 | [Dot Languages](https://www.dotlanguages.com/hsk-2021/) |
| **Old HSK (2.0)** | Simplified | 6 levels: 150 / 300 / 600 / 1,200 / 2,500 / 5,000 words | [LTL](https://ltl-school.com/new-hsk/) |
| **TOCFL** (Taiwan) | **Traditional** | 4 bands, 8 levels: Novice (≈300 words), A1 500, A2 1,000, B1 2,500, B2 5,000, C1 8,000, C2 8,000+. Official 8,000-word list downloadable | [Taiwan Mandarin Ed. Resources Center](https://lmit.edu.tw/lc/tocfl); [SC-TOP downloads](https://tocfl.edu.tw/tocfl/index.php/exam/download) |

**Recommendation:** base the word list on **TOCFL Novice/Band A (Traditional)** and cross-tag each item with its HSK 3.0 level, so the game can also claim HSK alignment. The vertical slice sits inside TOCFL Novice / HSK 1.

### 4.2 Traditional vs Simplified for American kids

- **For Traditional:** it matches the project's own example (吃飯), Taiwan-Mandarin content and voices, and the heritage families who use it. Kids who learn Traditional first can read Simplified more easily than the reverse (a widely held view among teachers that I couldn't source to a study). TOCFL provides an official Traditional list.
- **For Simplified:** more common in US school programs and textbooks (my impression; I found no national statistic), it's what HSK uses, and it has fewer strokes.
- **Neutral fact:** the AP Chinese exam lets students view prompts in either script and type in Pinyin (Simplified or Traditional) or Bopomofo, and the choice doesn't affect the score ([College Board](https://apcentral.collegeboard.org/help-center/do-students-have-choice-written-expression-ap-chinese-language-and-culture-exam-such)).
- **Recommendation:** Traditional by default, with both forms stored per item (convert with a tool like OpenCC and have a human review, since conversions aren't always 1:1) and a Simplified toggle in settings. Decide *now*, because it drives art, fonts, and audio voice (zh-TW vs zh-CN accent).

### 4.3 Pinyin vs Zhuyin and tone marks

- Taiwan adopted Hanyu Pinyin as its official romanization in 2009, but Taiwanese schools still teach Zhuyin (Bopomofo) ([Taipei Times 2008](https://www.taipeitimes.com/News/taiwan/archives/2008/09/18/2003423528); [Taipei Times 2018](https://www.taipeitimes.com/News/editorials/archives/2018/03/10/2003688996)).
- **Recommendation:** Pinyin with **diacritic tone marks** (chī fàn), which uses the Latin letters American kids already read. Color-code tones consistently (e.g., 1 blue, 2 green, 3 orange, 4 red, neutral gray) and match the colors to the Tone Element attacks. **Fade pinyin** per word: always shown on first exposure, hidden after mastery step 3, and revealable with a tap that doesn't count against the kid. Zhuyin as an optional overlay later (useful for Taiwan-heritage families).

### 4.4 Spaced repetition

| Algorithm | How it works | Fit |
|---|---|---|
| **Leitner** | Cards move up numbered boxes when correct and drop back to box 1 when missed. Higher boxes are reviewed less often ([Repeatica](https://www.repeatica.com/library/memory/leitner-system)) | Simple, transparent, kid-visible ("your word moved to the Gold Box!"). **v1** |
| **SM-2** | Classic SuperMemo/Anki interval + ease-factor formula ([SuperMemo](https://super-memory.com/english/ol/sm2.htm)) | Needs a self-grade (again/hard/good/easy), which is awkward for kids. Skip |
| **FSRS** | ML memory model (stability/difficulty/retrievability). Open benchmarks show it outperforming SM-2 on prediction ([open-spaced-repetition benchmark](https://github.com/open-spaced-repetition/srs-benchmark)) | **v2+**, once there's review-log data. It can infer grades from correctness + latency |

**Game integration (recommendation):** "due" words populate random encounters in *any* region (old monsters come back carrying old words), the inn offers a 2-minute "Dream Review," and bosses draw from the whole unit. Log every attempt (item, skill, correct, latency, question type) from day one so you can move to FSRS later.

### 4.5 Curriculum → world map (proposal)

| Region (realm) | Monster | Unit / topic | Sample Traditional vocab | Grammar/skill focus |
|---|---|---|---|---|
| **Starter Meadow** (Village of 小山) | Horned rabbits (角兔) | Greetings, numbers 1–10, yes/no | 你好、謝謝、再見、一…十、是、不是 | Tone basics, Tone Element intro |
| **Honeycomb Forest** | Jumbo bees (大蜜蜂) | Food & eating | 吃、喝、飯、水、麵、我餓了、好吃 | 我要… / 我想吃… |
| **Goblin Caves** | Goblins | Feelings & body | 我很怕、高興、難過、累、生氣、頭、手 | 很 + adjective, 我覺得… |
| **River Market Town** | Mischief sprites (non-combat quests) | Money, shopping, measure words | 多少錢、塊、個、買、賣 | Numbers 11–100, 個 |
| **Misty Marsh** | Hydras (each head = a word in a sentence) | Time & daily routine | 今天、明天、現在、早上、馬上、幾點 | Sentence order; time-before-verb |
| **Ruined Town** | Zombies | Family, people, helping | 爸爸、媽媽、朋友、幫忙、請、對不起 | Requests and apologies (zombies are "cured" by kind words) |
| **Races' Capital** | Demon King's lieutenants | Places, directions, travel | 去、在、哪裡、左、右、學校 | 在 + place, 去 + place |
| **Demon King's Keep** | Demon King | Cumulative review + persuasion ("rule all races by force" vs. 朋友) | Mixed | Multi-phase boss mixing all question types. The final phase is listening/understanding his speech and answering with the right phrase |

---

## 5. First playable vertical slice

### 5.1 Scope

| Element | Scope |
|---|---|
| Town | **Village of 小山**: 4–5 NPCs, an inn (party/companion scene), a shop (earned coins only), a quest board |
| Region | **Starter Meadow → Honeycomb Forest edge**: 3–4 short linear stages (Miitopia-style path with 1–2 branch choices) |
| Party | Custom hero (simple face/color editor, no photos) + 1 companion with a personality (e.g., Kind) whose quirk triggers help on misses |
| Monsters | **Horned Rabbit** (greetings/numbers), **Jumbo Bee** (food), **Goblin Scout** (feelings, as a teaser for the next area) |
| Boss | **Queen Bee** (大蜂后): 3 phases (meaning pick → audio pick/tone → match-pairs "honeycomb" puzzle) |
| Vocabulary | **~40 words** (in the 30–60 range): ~15 greetings/politeness + numbers 1–10, ~15 food/eating, ~8 feelings, plus 3 sentence frames (我要…, 我很…, 你好嗎？) |
| Question types | Meaning pick, reverse pick, audio pick, tone pick, match pairs, light word-ordering. Optional Shout Spell on Chrome |
| Systems | Leitner boxes, in-battle re-ask, streak multiplier, companion assist, hint tokens, retreat-without-loss, attempt logging |
| Session length | **Design target 10–15 minutes** per sitting (one stage + inn), with a natural stopping point at every inn. This is a target to playtest, not a researched figure |
| Success metrics | Pre/post 40-word quiz (reading + listening), % of kids who voluntarily play a second session, per-item accuracy curves, guess-rate (answers < floor latency) |

### 5.2 Tech stack (recommendation)

- **Phaser 4** for map, stage walk, and battle scenes. Phaser 4.0.0 shipped Apr 10, 2026 with a rebuilt WebGL renderer ([GitHub release](https://github.com/phaserjs/phaser/releases/tag/v4.0.0)), and search results report 4.2.1 as the current version ([Phaser downloads](https://phaser.io/download/phaser4)). **Alternative:** plain TypeScript + DOM/CSS (or Svelte/React). A turn-based, menu-heavy game works fine without an engine, and that's the lighter option if the art is mostly static.
- **Question UI as an HTML overlay** on the canvas, for crisp CJK rendering at any zoom, screen-reader and keyboard support, and easier localization. Web font: Noto Sans TC / Noto Serif TC, subset to the words in use to keep downloads small.
- **Content as data:** JSON/YAML item bank (`id, trad, simp, pinyin, zhuyin, english, audio, tags, tocfl, hsk3`), authored in a spreadsheet and compiled in the build.
- **Audio:** pre-generated MP3/OGG (or Opus) per item, lazy-loaded per region. Howler.js or Phaser's audio.
- **Save:** IndexedDB/localStorage (no server) in v1, with export/import codes for moving between devices.
- **Speech:** feature-detect `SpeechRecognition || webkitSpeechRecognition`, hide the Shout button if it's missing, and set `processLocally` where supported.
- **Hosting:** static site (Netlify/Vercel/GitHub Pages/Cloudflare Pages). No backend in v1 means no COPPA data collection and simpler compliance (still get counsel to confirm).

---

## 6. Key design decisions to make now

| # | Decision | Options | Recommendation & why |
|---|---|---|---|
| 1 | **Script** | A) Traditional only; B) Simplified only; C) Traditional default + Simplified toggle | **C.** Matches the vision and TOCFL; the toggle hedges for US classrooms. Store both from day one |
| 2 | **Romanization** | A) Pinyin w/ tone marks; B) Zhuyin; C) Both, switchable | **A**, with a fading scaffold. Add C later for Taiwan-heritage families |
| 3 | **Speaking in v1** | A) None; B) Optional bonus (Shout Spell); C) Required speak-it battles | **B.** Adds delight and practice without the Chrome-only/tone-blind/COPPA risks of C |
| 4 | **Audio source** | A) Browser live TTS; B) Pre-generated cloud neural TTS; C) All native recordings | **B now, move toward C** for core and tone items. A is unpredictable across devices |
| 5 | **Pronunciation scoring** | A) None; B) Azure PA zh-TW; C) SpeechSuper (tone scores claimed) | **A in v1.** Prototype B vs C in phase 2 behind parental consent and after legal review |
| 6 | **Monetization** | A) Free / grant-funded; B) One-time purchase or parent-purchased unlock (whole game, no kid-facing upsell); C) Prodigy-style membership with member cosmetics | **A for the slice, B later.** Avoid C: it's the exact pattern in the FTC complaint and it undermines trust with teachers |
| 7 | **Accounts/COPPA** | A) No accounts, local save; B) Parent-created accounts with VPC; C) Teacher/school accounts (school-authorized) | **A for v1.** B when cloud save or progress reports are needed. C if you pursue classrooms (needs a separate privacy review) |
| 8 | **Art style** | A) Chibi 2D (Miitopia-lite, custom faces); B) Pixel art; C) Painterly/vector cartoon | **A or C.** Customizable faces are the Miitopia magic, and a simple parts-based face editor (no photo upload, for COPPA) is cheap. Pixel art makes CJK text in-world harder to read |
| 9 | **Combat integration** | A) Quiz gate then generic attack (extrinsic); B) Question = attack, and question *type* = attack choice (Tone Elements, word-weakness) | **B**, per Habgood & Ainsworth |
| 10 | **Adaptive difficulty** | A) Fixed per-region difficulty; B) Per-word mastery ladder + Leitner; C) FSRS/IRT model | **B in v1**, log data to enable **C** in v2 |
| 11 | **Failure model** | A) Game over / lose coins; B) Retreat to inn, keep everything, review missed words | **B.** Low anxiety for a 12-year-old. The stake is time and pride, not loss |
| 12 | **Accent / voice** | A) Taiwan Mandarin (zh-TW); B) Mainland (zh-CN) | **A**, consistent with Traditional. Revisit if you switch the default script |
| 13 | **Platform target** | A) Chrome/Chromebook first; B) All browsers equal; C) Mobile-first | **A, with graceful degradation.** Everything except Shout Spell works in Safari/Firefox, and the layout stays touch-friendly for iPad |

---

## 7. Open questions / unverified items

- Exact current Azure TTS and SpeechSuper pricing (Azure's official page didn't load; the $16/1M figure comes from a third party).
- Whether Azure Pronunciation Assessment's zh-TW/zh-CN accuracy scores meaningfully reflect tone errors (not documented).
- Web Speech support on Edge and Safari (caniuse and web-features disagree), and zh-TW recognition quality for child voices (no source found).
- Whether routing audio through Chrome's or a vendor's cloud ASR counts as COPPA "disclosure." Needs counsel.
- US K-12 prevalence of Traditional vs Simplified instruction (no authoritative statistic found).
- The HSK 3.0 final-syllabus details come from secondary sources; confirm against CLEC/Chinese Testing International before claiming alignment publicly.

---

## Sources

1. Fairplay (CCFC), "Advocates to FTC: Prodigy Math Game Preys On Kids and Families," Feb 19, 2021. https://fairplayforkids.org/feb-19-2021-advocates-to-ftc-prodigy-math-game-preys-on-kids-and-families/
2. CCFC FTC complaint (PDF). https://fairplayforkids.org/wp-content/uploads/2021/02/Prodigy_Complaint_Feb21.pdf
3. NBC News on the Prodigy complaint. https://www.nbcnews.com/tech/tech-news/child-protection-nonprofit-alleges-manipulative-upselling-math-game-prodigy-n1258294
4. Axios on the Prodigy complaint. https://www.axios.com/2021/02/19/prodigy-math-game-ftc-complaint
5. EdWeek on the Prodigy complaint. https://www.edweek.org/technology/popular-interactive-math-game-prodigy-is-target-of-complaint-to-federal-trade-commission/2021/02
6. Prodigy memberships page. https://www.prodigygame.com/Memberships/math/?defaultplanid=monthly
7. Prodigy, "Which Membership Should You Choose?" https://www.prodigygame.com/main-en/blog/choosing-prodigy-membership
8. Prodigy, "What is Prodigy Math?" https://www.prodigygame.com/main-en/blog/what-is-prodigy-math-game
9. Prodigy, "Is Prodigy Math Game Adaptive?" https://www.prodigygame.com/main-en/blog/is-prodigy-math-adaptive
10. Nintendo Life, Miitopia review. https://www.nintendolife.com/reviews/nintendo-switch/miitopia
11. GameSpot, Miitopia review. https://www.gamespot.com/reviews/miitopia-review-eyes-without-a-face/1900-6417683/
12. VGC, Miitopia review. https://www.videogameschronicle.com/review/miitopia/
13. Nintendo World Report, Miitopia review. http://www.nintendoworldreport.com/review/43890/miitopia-3ds-review
14. Miitopia Central wiki, Personality. https://miitopia.wikitide.org/wiki/Personality
15. Nintendo press release via Games Press (Miitopia launch, $49.99). https://www.gamespress.com/The-Comedy-Filled-Miitopia-Game-and-the-Blue-Nintendo-Switch-Lite-Syst
16. Habgood & Ainsworth (2011), JLS abstract. https://www.tandfonline.com/doi/abs/10.1080/10508406.2010.508029 ; author PDF: https://shura.shu.ac.uk/3556/1/Habgood_Ainsworth_final.pdf
17. Roediger & Karpicke (2006), Test-Enhanced Learning. https://journals.sagepub.com/doi/10.1111/j.1467-9280.2006.01693.x
18. Karpicke (2017), Retrieval-Based Learning review. https://learninglab.psych.purdue.edu/downloads/2017/2017_Karpicke_Retrieval_Based_Learning_Review.pdf
19. Cepeda et al. (2006), Distributed practice meta-analysis. https://pubmed.ncbi.nlm.nih.gov/16719566/
20. Bjork & Bjork, "Making Things Hard on Yourself, But in a Good Way." https://sites.lifesci.ucla.edu/psych-bjorklab/wp-content/uploads/sites/13/2016/11/Making-Things-Hard-on-Yourself-but-in-a-Good-Way-20111.pdf
21. MDN, SpeechRecognition. https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition
22. MDN, SpeechRecognition.processLocally. https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/processLocally
23. caniuse, Speech Recognition API. https://caniuse.com/speech-recognition
24. Web features explorer, Speech recognition. https://web-platform-dx.github.io/web-features-explorer/features/speech-recognition/
25. iThome (Chrome zh-TW voices example). https://ithelp.ithome.com.tw/articles/10254162 ; gist: https://gist.github.com/gilbert0571/a4a89abfbab4b7593af28a52e6b0f434
26. Microsoft Learn, Azure Speech language support. https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support
27. Microsoft Docs source, Pronunciation assessment locales. https://raw.githubusercontent.com/MicrosoftDocs/azure-ai-docs/main/articles/ai-services/speech-service/includes/language-support/pronunciation-assessment.md
28. Microsoft Learn, Use pronunciation assessment. https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-pronunciation-assessment
29. Microsoft Learn, Text to speech overview (billing: Chinese char = 2). https://learn.microsoft.com/en-us/azure/ai-services/speech-service/text-to-speech
30. Azure Speech pricing (official; didn't load during research). https://azure.microsoft.com/en-us/pricing/details/speech/
31. TextToLab, Azure TTS pricing summary (third party). https://texttolab.com/blog/azure-text-to-speech-pricing
32. json2video, zh-TW-HsiaoChenNeural listing. https://json2video.com/ai-voices/azure/voices/zh-tw-hsiaochenneural/
33. Google Cloud TTS supported voices. https://cloud.google.com/text-to-speech/docs/voices
34. TonePerfect vs Azure comparison (vendor source). https://api.toneperfect.app/compare/azure-pronunciation-assessment/
35. SpeechSuper, Mandarin mispronunciation detection (vendor). http://blog.speechsuper.com/2022/05/speechsuper-api-now-supports-mandarin.html
36. Pitch-aware RNN-T for Mandarin MDD (arXiv). https://arxiv.org/html/2406.04595
37. Federal Register, COPPA Rule amendments (Apr 22, 2025). https://www.federalregister.gov/documents/2025/04/22/2025-05904/childrens-online-privacy-protection-rule
38. 16 CFR §312.5 (LII). https://www.law.cornell.edu/cfr/text/16/312.5
39. FTC 2017 voice-recording enforcement policy statement. https://www.federalregister.gov/documents/2017/12/08/2017-26509/enforcement-policy-statement-regarding-the-applicability-of-the-coppa-rule-to-the-collection-and-use
40. Language Learning SE (Duolingo "Can't speak now"). https://languagelearning.stackexchange.com/questions/6126/looking-for-language-learning-app-to-use-on-subway-while-walking ; r/duolingo: https://www.reddit.com/r/duolingo/comments/1hee5nv/why_cant_i_disable_speaking_exercises_abymore_i/
41. HSKStory, Complete HSK 3.0 vocabulary list. https://hskstory.com/guides/hsk-30-vocabulary-complete
42. LTL Mandarin School, New HSK 3.0 guide. https://ltl-school.com/new-hsk/
43. Dot Languages, HSK 3.0 (2021 framework). https://www.dotlanguages.com/hsk-2021/
44. Taiwan Mandarin Educational Resources Center, TOCFL. https://lmit.edu.tw/lc/tocfl
45. SC-TOP TOCFL downloads (8,000-word list). https://tocfl.edu.tw/tocfl/index.php/exam/download
46. College Board, AP Chinese script/input choice. https://apcentral.collegeboard.org/help-center/do-students-have-choice-written-expression-ap-chinese-language-and-culture-exam-such
47. Taipei Times, Hanyu Pinyin standard in 2009. https://www.taipeitimes.com/News/taiwan/archives/2008/09/18/2003423528 ; Bopomofo editorial: https://www.taipeitimes.com/News/editorials/archives/2018/03/10/2003688996
48. Repeatica, Leitner system. https://www.repeatica.com/library/memory/leitner-system
49. SuperMemo, SM-2 algorithm. https://super-memory.com/english/ol/sm2.htm
50. open-spaced-repetition, SRS benchmark. https://github.com/open-spaced-repetition/srs-benchmark
51. Phaser v4.0.0 release (GitHub). https://github.com/phaserjs/phaser/releases/tag/v4.0.0 ; downloads: https://phaser.io/download/phaser4
