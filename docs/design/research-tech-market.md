# Chinese-Learning RPG (web, ages ~12): Technology, Market & Compliance Research

*Prepared 2026-09-28. Scope: tech stack, speech, competitors and business model, kids' privacy compliance, content standards. Game design and art are covered elsewhere. Prices are list prices seen on the dates cited. Check them again before committing.*

---

## 1. Web game engines and stacks (2D turn-based RPG, small team)

| | **Phaser 4** (JS/TS) | **PixiJS v8** (JS/TS) | **Godot 4 HTML5 export** | **Unity 6 Web** |
|---|---|---|---|---|
| What it is | Full 2D game framework (scenes, input, tweens, tilemaps, audio, loader) | 2D *renderer* only. You build or assemble the game layer yourself | Full engine and editor (GDScript/C#) | Full engine and editor (C#) |
| Learning curve | Low for web devs. Large tutorial base | Low to render, high to build a whole RPG on it | Moderate. Editor is friendly, but it's a new tool and language for web devs | High. Heavy editor and C# |
| Engine download | `phaser.min.js` is 1.29 MB raw / **~345 KB gzip**. Custom builds are smaller ([GitHub](https://github.com/phaserjs/phaser)) | Tree-shakeable v8 imports, usually the smallest ([PixiJS v8](https://pixijs.com/blog/pixi-v8-launches)) | Stock 4.3 wasm is ~40 MB raw / **~5 MB Brotli** ([Godot](https://godotengine.org/article/progress-report-web-export-in-4-3/)). Custom templates get to ~3 MB ([devlog](https://jion.in/devlog/godot-web-minification)) | Several MB+. Needs Brotli, LTO, stripping, Addressables ([Unity](https://docs.unity3d.com/6000.7/Documentation/Manual/web-optimization-mobile.html)) |
| Mobile browsers | Strong. Phaser 4 (Apr 2026) has a new renderer, mobile-friendly batching, GPU tilemap layers and a compact atlas format ([Phaser 4 release](https://github.com/phaserjs/phaser/releases/tag/v4.0.0), [v3 vs v4](https://phaser.io/news/2026/05/phaser-3-vs-phaser-4)) | Strong (WebGL/WebGPU) | Works with caveats. Single-threaded export (4.3+) fixes most iOS/macOS problems, but Safari WebGL2 has issues and native always performs better ([Godot docs](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html)) | Officially supports iOS Safari 15+ and Android Chrome 58+ ([Unity](https://docs.unity3d.com/6000.6/Documentation/Manual/webgl-browsercompatibility.html)). Heavy on low-end phones |
| Native iOS/Android later | Wrap in Capacitor/WebView (same code) | Same as Phaser | Native exports built in (much better performance) | Native exports built in |
| Nintendo Switch later | **No direct path.** HTML5 isn't supported for production on Switch, so it means a rewrite or a porting studio ([search summary](https://nixiefx.com/mobile-game-stack/)) | Same as Phaser | **Yes**, via W4 Consoles (Switch and Switch 2 beta) or a free community port on Nintendo's dev portal ([W4](https://www.w4games.com/w4consoles), [RAWRLAB](https://www.rawrlab.com/godot_nintendo_switch_free_port.html)) | **Yes**, first-party console support (needs Nintendo dev approval) |

**React for UI.** A turn-based RPG with quiz answers is mostly menus, dialog boxes, answer buttons and a parent/teacher dashboard. A common pattern is to render the world and battle scenes in Phaser and put React (DOM) on top for the quiz, inventory and settings. DOM text also handles CJK font rendering, IME input and accessibility better than canvas text. Phaser ships an official React template ([phaserjs/template-react](https://github.com/phaserjs/template-react)). The parent/teacher dashboard should be a normal React web app that shares the same backend.

**Takeaway.** For a small team targeting the browser first, Phaser 4 + TypeScript + React gives the fastest iteration, the smallest download and the best iOS Safari behavior. If Switch is a real goal within about 2 years, Godot is the strongest option. It costs more in web load size and Safari quirks, but Switch becomes a port instead of a rewrite. Keep content (vocab, questions, audio, dialog) in engine-agnostic JSON either way, so switching engines later only means rewriting the client.

---

## 2. Speech: recognition, pronunciation/tone scoring, TTS

### 2a. Web Speech API (browser-native recognition)
- **Chrome/Edge (desktop and Android):** supported. Chrome 139+ adds **on-device** recognition (`processLocally`, `SpeechRecognition.available()` / `install()` language packs). After a one-time pack download it works **offline** ([MDN guide](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API), [processLocally](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/processLocally), [web-features](https://web-platform-dx.github.io/web-features-explorer/features/speech-recognition/)). By default (processLocally=false) Chrome may send audio to Google servers, which matters for COPPA.
- **Safari (macOS/iOS):** prefixed `webkitSpeechRecognition` only ("partial" on [caniuse](https://caniuse.com/speech-recognition)). Audio goes to Apple's servers. Developers report it as unreliable ([micdrop](https://micdrop.dev/blog/web-speech-api), [Apple forum](https://discussions.apple.com/thread/255492924)). No on-device API.
- **Firefox:** disabled by default ([caniuse](https://caniuse.com/speech-recognition)).
- **zh-CN / zh-TW:** accepted as `lang` values where the API exists. Neither transcripts nor confidence scores measure **tones**. A child can say the wrong tone and still get the right characters because of language-model context. The API is fine for "did they say roughly the right words" but **not for pronunciation grading**, and it misses about half of iPad/Chromebook-Safari/Firefox users. It can only ever be an optional extra.

### 2b. Cloud pronunciation assessment (with tone awareness)
| Vendor | Mandarin support | Pricing (list) | Notes |
|---|---|---|---|
| **Azure AI Speech: Pronunciation Assessment** | zh-CN (phoneme-level; SAPI phoneme names for en-US and zh-CN), zh-TW phoneme accuracy ([MS Learn](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-pronunciation-assessment), [language support](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support)) | Same price as STT: **~$1.32/hr real-time or $0.66/hr short-audio**, billed per second. A 3-second answer costs about $0.0006–0.0011 ([MS Q&A](https://learn.microsoft.com/en-us/answers/questions/5608069/pricing-and-usage-of-pronunciation-assessment-feat)). **Prosody** score costs extra, and prosody/content scoring is **en-US only** ([tool doc](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/pronunciation-assessment-tool)) | Enterprise-grade, US data residency, easy DPA. No explicit per-syllable *tone* score, but tone errors lower phoneme/accuracy scores |
| **SpeechSuper** | Mandarin char/word/sentence/paragraph with **explicit tone scoring and tone prediction** ([demo](https://www.speechsuper.com/demo/mandarin-chinese/sentence-evaluation.html), [tone feature](https://medium.com/@speechsuper1024/unveiling-speechsupers-tone-prediction-feature-for-improved-mandarin-chinese-pronunciation-2b6c2e30e3cb)) | Per request: about **$0.004/word, $0.006/sentence, $0.008/paragraph**, $20/month minimum, prepay discounts ([pricing](https://speechsuper.com/pricing.html)) | Built for language learning. Best "you said tone 2, target tone 3" feedback. Smaller vendor, so check data location and DPA terms for COPPA |
| **iFlytek ISE (global platform)** | Chinese and English. Characters, words, sentences, passages with accuracy, fluency, integrity, tone ([product](https://global.xfyun.cn/products/ise), [API](https://global.xfyun.cn/doc/voiceservice/ise/API.html)) | **~$0.003/call**. Packages from $150 per 100k calls to $1,300 per 1M. Free trial quota ([pricing](https://global.xfyun.cn/doc/platform/pricing.html)) | Gold standard in China (Putonghua test scoring). But iFlytek is on the US Commerce Entity List, and sending US children's voice data to a PRC vendor is a serious procurement, reputational and COPPA risk for school sales. **Not recommended for the US kids' market.** |
| **Google Cloud STT** | Mandarin transcription only | STT pricing | **No native pronunciation assessment** ([supported languages](https://docs.cloud.google.com/speech-to-text/docs/speech-to-text-supported-languages)). You'd have to build your own scoring |

**Cost sense check.** A kid doing 20 speaking questions a day × 30 days = 600 calls/month. That's about $0.40–0.70 on Azure short-audio, ~$3.60 on SpeechSuper (sentence level) or ~$1.80 on iFlytek. All of these are well within a ~$10/month membership.

### 2c. Text-to-speech and pre-recorded audio
- **Azure Neural TTS:** ~$16/1M characters (HD ~$22), 500K free characters per month ([TextToLab](https://texttolab.com/blog/azure-text-to-speech-pricing)). It has many zh-CN voices, including a **child-like voice `zh-CN-XiaoyouNeural`**, plus zh-TW voices such as `HsiaoChenNeural` ([voice list](https://json2video.com/ai-voices/azure/languages/chinese/), [HD voices](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/high-definition-voices)).
- **Google Chirp 3 HD:** ~$30/1M characters with a larger free tier. Includes cmn-CN voices ([Google pricing](https://cloud.google.com/text-to-speech/pricing), [comparison](https://www.versusref.com/tts/azure-speech-vs-google-tts/)).
- **Browser `speechSynthesis`:** free, but voice quality and availability depend on the OS. Unsuitable as the main voice.
- **Tradeoffs:**
  - **Pre-render TTS at build time** (store MP3/Opus on a CDN). This is cheap: a 3,000-item bank costs a few dollars. Audio is consistent, works offline and on every browser, and child audio never leaves the device.
  - **Human voice actors** are best for tones and character personality (battle barks, NPCs) but cost more per line and are slow to update.
  - **Runtime TTS** is only needed for dynamic content.
  - For tone teaching, check TTS output with a native-speaker QA pass. TTS sometimes gets tone sandhi (一/不, 3-3) and polyphones (行, 长, 了) wrong.

---

## 3. Market: existing products and gaps

| Product | What it is | Price / model | Gap vs. our concept |
|---|---|---|---|
| **Duolingo (Chinese)** | Free gamified general course, streaks | Freemium + Super | Adult-oriented. Shallow on pronunciation correction and tones, weak on conversation ([Ivy Mandarin review](https://www.theivymandarin.com/blogs/news/is-duolingo-good-for-learning-chinese)) |
| **HelloChinese** | Strong beginner app with speech recognition and character writing ([LingoAce roundup](https://www.lingoace.com/guides/collection/best-chinese-learning-apps-for-kids/)) | Freemium subscription | Lesson-drill format with no game world or story |
| **Little Fox Chinese** | Animated story library for kids | ~$4.99/month in app ([App Store](https://apps.apple.com/us/app/little-fox-chinese/id1083758354), [membership](https://chinese.littlefox.com/en/service/fee)) | Passive watching and listening. Little speaking or gameplay |
| **Miaomiao's Chinese** | Cartoon vocab app for young kids | $2.99 paid app ([App Store](https://apps.apple.com/us/app/miaomiaos-chinese-for-kids/id1149520865)) | Aimed at ages ~3–7. Too young for 12-year-olds |
| **Dinolingo** | 50-language kids' platform, ages 2–14 | $19/month or $199/year family ([Dinolingo](https://dinolingo.com/learn-chinese-for-kids/)) | Generic across languages. Younger feel, not Chinese-specific |
| **WonderLang Mandarin** (Steam) | RPG-ish with spaced-repetition combat, HSK vocab ([Steam](https://store.steampowered.com/app/4028830/WonderLang_Mandarin_Chinese/)) | Paid PC game | PC/Steam, not browser. Not kid-targeted, no school or parent tools |
| **Terra Alia** (Steam) | Language-discovery RPG, vocab used as spells ([Steam](https://store.steampowered.com/app/1183580/Terra_Alia_The_Language_Discovery_RPG/)) | Paid PC game | Not browser, not a kids' or classroom product |

**Whitespace:** There's no **Prodigy-style, browser-based, classroom-friendly Chinese RPG for ages 10–13** that combines combat, speaking with tone feedback, a parent dashboard and teacher tools aligned to YCT/HSK. Existing kids' products skew preschool (Miaomiao, Dinolingo) or passive (Little Fox). Existing RPGs are PC and adult-oriented.

**Prodigy's business model (the template):**
- **Free for schools and teachers** (standards-aligned math/English). Revenue comes from **optional parent memberships** that unlock cosmetics, pets, extra areas, more rewards and parent reports ([Prodigy teachers](https://webflow.prodigygame.com/main-en/teachers)).
- Current tiers (Math): **Core / Plus / Ultra at $9.95 / $14.95 / $19.95 per month**, or about **$58.95 / $88.95 / $118.95 per year** ("save 50%", Ultra ≈ $9.91/month billed annually). Higher tiers add Science and English and more currency, "Mythical Epics" and parent insights ([Prodigy memberships](https://www.prodigygame.com/Memberships/math/?defaultplanid=monthly)). Prodigy uses iKeepSafe for FERPA/COPPA/SOPIPA certification.
- **Caution:** In 2021 advocacy groups filed an FTC complaint alleging Prodigy's in-game upsells pressure kids and create classroom inequity ([EdWeek](https://www.edweek.org/technology/popular-interactive-math-game-prodigy-is-target-of-complaint-to-federal-trade-commission/2021/02)). Keep learning content equal for free and paid players, sell cosmetics and convenience only, and never pitch upgrades to kids during school play.

---

## 4. Kids' compliance

### COPPA (under 13). This product is "directed to children"
- **2025 amended Rule**: published 2025-04-22, effective 2025-06-23, **full compliance required by 2026-04-22** (already in force) ([Federal Register](https://www.federalregister.gov/documents/2025/04/22/2025-05904/childrens-online-privacy-protection-rule), [eCFR Part 312](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-312)). Key changes ([Loeb](https://www.loeb.com/en/insights/publications/2025/05/childrens-online-privacy-in-2025-the-amended-coppa-rule), [Fenwick](https://whatstrending.fenwick.com/post/coppas-coming-of-age-key-compliance-changes-in-ftcs-final-rule)):
  - "Personal information" now includes **biometric identifiers, including voiceprints**.
  - **Separate verifiable parental consent (VPC) for disclosing data to third parties** (e.g. ads, or sale) unless the disclosure is integral to the service.
  - **Written data-retention policy**. Indefinite retention is banned.
  - **Written information-security program**.
  - More detailed privacy-notice disclosures. Safe-harbor changes.
- **Voice recordings:** an audio file of a child's voice **is personal information** ([FTC FAQ §F.6](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions)). The 2025 Rule codified the old enforcement policy as an exception at **16 CFR 312.5(c)(9)**. You may collect audio **without VPC** only if (1) no other personal information is collected, (2) it's used *solely* to respond to the child's request (as a replacement for typing), (3) it isn't used for anything else or disclosed, (4) it's **deleted immediately**, and (5) the privacy policy explains this ([eCFR 312.5](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-312/section-312.5), [Hunton](https://www.hunton.com/privacy-and-cybersecurity-law-blog/ftc-publishes-final-coppa-rule-amendments)).
  - Implication: speaking a quiz answer and scoring it on the spot can plausibly fit the exception **if** audio is streamed to the scorer, never stored, never used for model training, and the vendor contract forbids retention.
  - Keeping recordings for a parent "listen to your child" feature, for training data or for teacher review **requires VPC**.
  - Always get legal review. A COPPA safe harbor (PRIVO, kidSAFE, iKeepSafe) is worth considering.
- **Other must-haves:**
  - Persistent identifiers only for "internal operations" (no behavioral ads).
  - No free-text chat (use preset phrases, like Prodigy).
  - VPC before accounts store personal info. Email-plus is OK for internal-only use; payment by card also works as VPC.
  - Parents can review and delete data.
  - Penalties are up to **$53,088 per violation** ([FTC FAQ](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions)).

### Parent dashboard (also a COPPA feature)
Consent management. View/export/delete the child's data. Voice-feature toggle (off by default until VPC). Progress by skill (listening, reading, speaking, tones) and by HSK/YCT level. Weekly email digest. Time limits. Subscription billing. This mirrors Prodigy's parent app ([Prodigy](https://www.prodigygame.com/Memberships/math/?defaultplanid=monthly)).

### Schools and teachers
- **COPPA in schools:** a school can consent in place of parents **only** when data is used for the school's educational benefit, with no commercial use such as ads or profiling ([FTC 2020 guidance](https://www.ftc.gov/business-guidance/blog/2020/04/coppa-guidance-ed-tech-companies-schools-during-coronavirus), [FTC EdTech policy statement](https://search.ftc.gov/system/files/ftc_gov/pdf/Policy%20Statement%20of%20the%20Federal%20Trade%20Commission%20on%20Education%20Technology.pdf)). So don't upsell memberships to school-consented student accounts. Parents must opt in separately.
- **FERPA:** the vendor acts as a "school official" under the school's direct control, uses education records only for the contracted purpose and doesn't redisclose them ([overview](https://blog.promise.legal/ferpa-edtech-vendors-compliance-gaps/)). **40+ states** have student-privacy laws (e.g. CA SOPIPA) and many districts require a signed data-privacy agreement ([FPF](https://fpf.org/student-privacy-pledge/)).
- **Student Privacy Pledge:** created by FPF and SIIA in 2014. Voluntary but FTC-enforceable commitments: no selling student data, no behavioral ads, limited retention, security. ~500 signatories. **FPF retired it on 2025-04-25**, so it's no longer an option. FPF now points vendors to the **CISA K-12 Secure by Design Pledge**, the **Student Data Privacy Consortium National Data Privacy Agreement (NDPA)** and PRIVO's student privacy program ([FPF](https://fpf.org/student-privacy-pledge/)). Still use the Pledge's commitments as a product baseline.
- **Teacher features:** rostering via Google Classroom/Clever, class codes with no student email, assignments by HSK/YCT unit, and class reports.

---

## 5. Content standards and open data

### Curriculum anchors
- **HSK 3.0:** three stages and nine levels (1–3 elementary, 4–6 intermediate, 7–9 advanced). New syllabus published Nov 2025. Cumulative vocab: **HSK1 300, HSK2 500, HSK3 1,000, HSK4 2,000, HSK5 3,600, HSK6 5,400, HSK7–9 11,000**. Speaking is part of the framework. Pilots ran Jan and Sep 2026, and **HSK 3.0 exams open worldwide 2026-12-13** ([HSKStory](https://hskstory.com/guides/what-is-hsk-30), [FLTRP](https://www.fltrp.com/c/2025-11-20/540070.shtml)). The syllabus also defines characters, grammar, topics and tasks, which are useful for tagging content.
- **YCT (Youth Chinese Test):** for primary and secondary students (roughly ≤15). Four written levels: **YCT1 80 words, YCT2 150, YCT3 300, YCT4 600**, plus a separate speaking test ([YCT Standard Course](https://www.yctstandardcourse.com/about-youth-chinese-test-yct-%e4%b8%ad%e5%b0%8f%e5%ad%a6%e7%94%9f%e6%b1%89%e8%af%ad%e6%b0%b4%e5%b9%b3%e8%80%83%e8%af%95/), [mandarin.ac.cn](https://www.mandarin.ac.cn/tests/yct-youth-chinese-test.html)). Its vocabulary and themes (family, food, school, animals) are age-appropriate, which fits a 12-year-old audience.
- **Suggested mapping:** each realm maps to a level band. Early realms follow YCT 1–2 / HSK 1. The mid-game follows YCT 3–4 / HSK 2. The late game and demon king follow HSK 3. Tag every item with both HSK 3.0 and YCT level.

### Traditional vs. Simplified
- Most US K-12 programs and textbooks, HSK and YCT use **Simplified characters + pinyin**. Taiwan-heritage families and some weekend schools use **Traditional** (and sometimes Zhuyin/Bopomofo).
- **AP Chinese lets students choose** Traditional or Simplified display and Pinyin or Bopomofo input ([College Board](https://apcentral.collegeboard.org/help-center/do-students-have-choice-written-expression-ap-chinese-language-and-culture-exam-such)).
- Recommendation: author in Simplified, store both forms per item, and offer a Traditional setting. Convert with **OpenCC** (Apache-2.0; JS port MIT) and have a person review the one-to-many conversion cases. Accent is a separate question: zh-CN voices vs. zh-TW voices.

### Open datasets and licenses
| Dataset | Content | License | Commercial use notes |
|---|---|---|---|
| **CC-CEDICT** | ~120k-entry Chinese-English dictionary, Traditional + Simplified + pinyin | **CC BY-SA 4.0** ([CC-CEDICT](https://cc-cedict.org/editor/editor.php?handler=Download)) | Allowed with attribution. Share-alike applies to the dictionary data you redistribute (keep it as a separate data file) |
| **Tatoeba** | Example sentences with translations | Sentences **CC BY 2.0 FR** (some CC0). **Audio license varies per contributor** ([Tatoeba downloads](https://tatoeba.org/en/downloads)) | Filter audio by license. Review sentences for kid-appropriateness |
| **Mozilla Common Voice zh-CN / zh-TW** | Crowd-sourced speech | **CC0** ([Mozilla Data Collective](https://mozilladatacollective.com/datasets/cmqim47x700tunq074za20dq1)) | Adult, varied quality. Good for testing ASR, not for teaching audio |
| **Tone Perfect (MSU)** | 9,840 clips: 410 syllables × 4 tones × 6 native speakers | CC BY-type, but bulk access limited to **non-commercial/educational** use ([Tone Perfect](https://tone.lib.msu.edu/), [project paper](https://ideah.pubpub.org/pub/hh90jpsu)) | Great for tone drills. **Get written permission** before commercial use |
| **Hanzi Writer / Make Me a Hanzi** | Stroke-order animation and quizzes | Code **MIT**. Stroke data under the **Arphic Public License** ([license](https://hanziwriter.org/license.html)) | Usable. Include the APL text and share modifications to the data |
| **HSK 3.0 / YCT word lists** | Level vocab | Official syllabi are copyrighted, but community lists exist | Use them for tagging only. Write your own definitions and sentences |

---

## Early decisions (options → recommendation)

1. **Game engine / client stack**
   - Options: Phaser 4 + TS + React · PixiJS + custom engine · Godot 4 (web export) · Unity 6 Web.
   - **Recommendation: Phaser 4 + TypeScript, React for quiz UI and dashboards, Vite build.** It has the smallest download and the best iOS Safari and Chromebook support, and it's the fastest for web devs. Keep all content in engine-agnostic JSON. Go back to Godot only if Switch becomes a committed near-term goal.
2. **Path to native and console**
   - Options: web only · Capacitor wrapper for iOS/Android · engine rewrite or port for Switch.
   - **Recommendation:** web first (PWA). Wrap in Capacitor for app stores. Treat Switch as a separate future project, porting to Godot/Unity or hiring a porting partner.
3. **Speaking assessment vendor**
   - Options: Web Speech API only · Azure Pronunciation Assessment · SpeechSuper · iFlytek · build on open models.
   - **Recommendation: prototype Azure (zh-CN) and SpeechSuper side by side on 50 kid recordings.** Azure is the safer compliance/enterprise default. SpeechSuper has explicit tone feedback. **Exclude iFlytek** for the US kids and school market. Use the Web Speech API only as an optional Chrome enhancement, never as the scorer.
4. **Voice-data policy (COPPA)**
   - Options: no voice features for kids · ephemeral scoring under 312.5(c)(9) · stored recordings with VPC.
   - **Recommendation:** by default, stream audio → score → delete immediately. No storage, no training, and vendor DPAs with zero retention. Voice stays opt-in until parent consent is on file. Recording playback for parents or teachers is a later feature that needs VPC. Get counsel sign-off and consider a COPPA safe harbor.
5. **Audio production**
   - Options: runtime TTS · pre-rendered TTS · human voice actors · hybrid.
   - **Recommendation: hybrid.** Pre-render all vocab and sentence audio with Azure neural voices (including the child voice Xiaoyou), with a native-speaker QA pass for tones, sandhi and polyphones. Use voice actors for key characters and boss or story lines. No runtime TTS in the MVP.
6. **Script and phonetics**
   - Options: Simplified only · Traditional only · both.
   - **Recommendation:** Simplified + pinyin by default, with an optional Traditional display toggle (OpenCC + human review). Consider Zhuyin and zh-TW audio later for Taiwan-heritage families.
7. **Curriculum anchor**
   - Options: HSK 3.0 · YCT · custom.
   - **Recommendation:** use **YCT 1–4 for the kid-friendly scope and themes**, tag every item with its **HSK 3.0 level (1–3)** for credibility with parents and teachers, and use CC-CEDICT/Tatoeba as source material with human rewriting for age-appropriateness.
8. **Business model**
   - Options: paid upfront · subscription only · Prodigy-style freemium (free core, paid membership) · school/district licenses.
   - **Recommendation:** Prodigy-style freemium. The full curriculum is free, with a parent membership around **$8–10/month or $60/year** for cosmetics, pets, extra realms, detailed reports and speaking-feedback depth. Don't upsell inside school-consented accounts. Add paid teacher/district tiers later.
9. **School readiness**
   - Options: consumer only at launch · school-ready at launch.
   - **Recommendation:** launch consumer-first but design for schools from day 1: class codes with no student email, a data-deletion API, NDPA-ready privacy terms, CISA Secure-by-Design practices, and Google Classroom/Clever SSO by the time of a school pilot.
