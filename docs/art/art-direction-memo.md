# Art Direction Findings Memo: Chinese-Learning Browser RPG

**To:** Director agent
**From:** Art direction research (executor)
**Date:** September 28, 2026
**Project:** Browser-based, turn-based fantasy RPG that teaches Mandarin Chinese (reading, speaking, listening) to American kids around age 12. Reference feel: Miitopia and Prodigy.

> **How to read this memo.** I opened every source linked here. Cost figures are **estimates** assembled from published rate guides, and I name the source of each rate. Items I could not verify are labeled **UNVERIFIED** and are also listed in §7. Anything labeled "judgment" or "recommendation" is my reasoning, not a sourced fact.

---

## 1. Visual styles of the reference games, and what appeals to 12-year-olds

### 1.1 Reference games

| Game | What defines the look | Lesson for us |
|---|---|---|
| **Miitopia** (Nintendo) | Nintendo EPD developed it, with Good-Feel helping on backgrounds, weapons, and clothing. Critics called the art diverse, bold, and colorful ([Wikipedia](https://en.wikipedia.org/wiki/Miitopia)). Nintendo Life described it as "punchy and colourful, with an arts-and-crafts style interface" that has the "feel of a pop-up book," and said the enemies recalled Dragon Quest VIII ([Nintendo Life](https://www.nintendolife.com/reviews/3ds/miitopia)). The core concept was to "make Miis feel alive" through expressive faces and small reactions. Auto-battle was chosen so that each character's personality would show ([Inside Games](https://www.inside-games.jp/article/2016/12/15/104186.html)). Customization grew during development: hair colors went from 8 to 32 and eye colors from 6 to 30 ([Famitsu](https://www.famitsu.com/news/201611/25121408.html)). | Expressive faces and self-made avatars carry most of the charm. The world art can stay simple and crafty. |
| **Prodigy Math / English** | Prodigy's art was overhauled away from a "visually dated" pixel-art look. The new style came with an art bible and covers hundreds of thousands of assets. The portfolio reports a 47% engagement increase at the launch of the new pet designs ([Natalia Thomson portfolio](https://www.nataliathomson.com/prodigy)). The 2020 rebrand added bright colors, custom fonts, and 3D illustration for marketing, while the game kept its look ([Prodigy blog](https://www.prodigygame.com/main-en/blog/prodigy-education-next-chapter); [PR Newswire](https://www.prnewswire.com/news-releases/prodigy-education-unveils-new-brand-301109046.html)). Prodigy English justifies avatar customization by citing research that links avatar identification to motivation (Trepte & Reinecke, 2010) ([Prodigy English research page](https://www.prodigygame.com/main-en/blog/prodigy-english-research-based-design)). Common Sense Media said the "graphics are nothing special but should appeal to kids." It also called the questions "standard dry math drill" and flagged heavy subscription pushes ([Common Sense Media](https://www.commonsensemedia.org/app-reviews/prodigy-kids-math-game)). | Collectible creatures and avatar identity drive engagement more than rendering quality does. We should avoid Prodigy's weak spots: questions that feel bolted on, and upsell pressure. |
| **Wizard101** | Common Sense Media rates it 11+ (ESRB E10+). Violence is cartoonish with no blood, and defeated enemies disappear. Combat is turn-based and card-driven. The game had a complete graphic overhaul in 2018 and offers full character customization ([Common Sense Media](https://www.commonsensemedia.org/game-reviews/wizard-101)). | This is the closest benchmark for tone: turn-based magic combat that reads as "big-kid" without gore. |
| **Dragon Quest** | Akira Toriyama turned Yuji Horii's gooey sketch of the Slime into a teardrop built from a few primitive shapes. The Slime serves as both "cannon fodder and cheerful party companion" ([Polygon](https://www.polygon.com/gaming/24094509/akira-toriyama-dragon-quest-slime/)). | Our early monsters (horned rabbits, jumbo bees) can use simple, iconic shapes that are cute and still worth fighting. |
| **Pokémon** | Ken Sugimori describes "keeping the balance": he adds something uncool to designs that are too cool and something cheerful to designs that are too serious, because a design that is "too cool" is less memorable ([PokémonBlog](https://pokemonblog.com/2018/09/14/ken-sugimori-explains-balancing-pokemon-designs-to-make-sure-they-dont-look-too-cute-or-too-cool/)). | This principle is how we avoid looking babyish without tipping into edgy. |
| **Paper Mario** | The team spent about 1.5 years experimenting and rejected polygons as too close to N64 Zelda. They aimed for a picture-book and *kamishibai* feel. Elementary schoolers were the primary target, but the team wanted the game to work for all ages. Text effects replaced voice acting ([shmuplations interview translation](https://shmuplations.com/papermario/)). | A flat, papercraft-style 2D look can be a deliberate premium choice. Animated text effects suit a game where text is the gameplay. |
| **Duolingo** | Shapes are built from rounded rectangles, circles, and rounded triangles, with no pointy shapes. Duolingo moved to a brighter, rounder style in 2018 and calls it "minimalistic, playful… quick to produce" ([Duolingo blog](https://blog.duolingo.com/shape-language-duolingos-art-style/)). Characters are built from one or two basic shapes with customizable parts ([Duolingo design guide](https://design.duolingo.com/illustration/characters)). | A strict shape language makes a large cast cheap to produce and on-model, which matters for a small team. |
| **Kingdom Rush** | A UI review praises its clear, memorable circular icons, fonts that are legible at a glance with no cursive in gameplay, and charming, detailed animation ([Emily M. UI review](https://emilym.space/thumbelina-hurts-mobile-ui-blog/2018/6/26/kingdom-rush-a-tower-defense-trilogy-with-ui-design-approaching-perfection-and-entertainment-worth-missing-bedtime-for)). | Keep decorative lettering out of gameplay text. Readability comes first. |
| **Legends of Learning** | Developers keep creative freedom but must follow content and technical specifications ([LoL developer page](https://gamedevelopers.legendsoflearning.com/developers/)). A 1024×576 (16:9) viewport requirement appeared in search results, but I could not open the spec, so that figure is **UNVERIFIED**. | If we ever want classroom distribution through platforms like this, 16:9 layouts are a sensible default. |

### 1.2 What appeals to 12-year-olds without feeling babyish

- **Age banding matters a great deal.** Nielsen Norman Group tested 125 children. Their conclusion is that designers must separate the 3–5, 6–8, and 9–12 bands, because kids react negatively to content aimed even one grade below them. One 6-year-old dismissed a site as "for babies… because of the cartoons and trains." The researchers recommend about 12-point body text for older children versus 14-point for younger ones, and report that kids like animation and sound but struggle to tell ads from content ([NN/g](https://www.nngroup.com/articles/childrens-websites-usability-issues/)).
- **Older kids want "cool, not for babies."** UXmatters says kids aged roughly 7–14 expect more detailed and immersive designs, respond to high-chroma color and sharp contrast, still appreciate minimalism, and value customization and group belonging. It also warns against sensory overload ([UXmatters](https://www.uxmatters.com/mt/archives/2011/12/effective-use-of-color-and-graphics-in-applications-for-children-part-ii-kids-7-to-14-years-of-age.php)).
- **Developmental aesthetics.** De Droog's framework reports that the desire for fidelity and realism grows after age 8 and especially between 11 and 16. Thrill and identity exploration both peak at 11–16, and social competition becomes engaging around age 11. The urge to nurture cute things peaks much earlier, at ages 3–5 ([Game Developer](https://www.gamedeveloper.com/business/children-and-their-desired-game-experiences-a-developmental-look-at-game-aesthetics)).
- **Time budget.** Tweens aged 8–12 averaged 1 hour 27 minutes of gaming per day in 2021, and 43% played mobile games every day ([Common Sense Census 2021 fact sheet](https://www.commonsensemedia.org/sites/default/files/research/report/2021-8-18-census-fact-sheet-gaming_0.pdf)).

**Implications (judgment, drawn from the sources above):**
1. Chibi proportions are fine; Miitopia, Wizard101, and Dragon Quest all use them. The babyish signals to avoid are pastel-only palettes, lisping "cute" copy, trains-and-toys iconography, and oversized rounded UI with no edge.
2. Monsters should carry real menace that rises as the player advances: angrier eyes, sharper silhouettes, and dramatic boss intros. This follows Sugimori's balance principle and de Droog's thrill finding.
3. The detail level should climb from realm to realm. Starter towns can be simple, and later realms (the hydra swamp, the demon king's domain) should feel richer and more "epic." That addresses the fidelity preference.
4. Avatar identity and customization should be a headline feature, supported by Miitopia's design goals and the research Prodigy cites.
5. The UI should never look like an ad, and the game should avoid aggressive upsell visuals (NN/g; Common Sense Media's critique of Prodigy).

---

## 2. Candidate art directions

### 2.1 The three candidates

**A. Chibi 2D vector/cel with a light painterly finish (recommended).** Characters are two to three heads tall with big expressive faces and a strict, mostly rounded shape language, as in Duolingo and Miitopia. Monsters get sharper accents. Parts are drawn as separate layers and animated with Spine. Backgrounds are painted with flat or cel shading and soft texture.

**B. Pixel art (the alternative for a cheap MVP).** This is the classic Dragon Quest and early-Prodigy look, with 32–64 px sprites and tilesets.

**C. Painterly with Chinese ink-wash (shuimo) influence.** Brush-textured characters and backgrounds with rice-paper textures, ink bleeds, and generous negative space. Black Myth: Wukong's "Unfinished" finale is a recent reference: the team explored ink wash and then chose the *lianhuanhua* (picture-story comic) style, drawing on Li Gonglin's *baimiao* line drawing and the Dunhuang murals ([China Daily](http://www.chinadaily.com.cn/a/202410/30/WS67218152a310f1265a1ca595.html)).

### 2.2 Comparison

| | **A. Chibi vector/cel** | **B. Pixel art** | **C. Painterly shuimo** |
|---|---|---|---|
| **Pros** | Matches the Miitopia and Prodigy references. Faces are expressive, and modular avatars are easy. A strict shape language keeps a big cast cheap and on-model ([Duolingo](https://blog.duolingo.com/shape-language-duolingos-art-style/)). Scales cleanly to any resolution. | Cheapest per asset. Many marketplace packs exist. A retro look appeals to some tweens. Tiny file sizes. | Most distinctive. Carries Chinese cultural identity naturally and looks premium and "not babyish." |
| **Cons** | A crowded look, so it needs a strong hook (the shuimo accents) to stand out. | Prodigy abandoned pixel art as "visually dated" ([Natalia Thomson](https://www.nataliathomson.com/prodigy)). Hanzi clash with low-resolution text: 12 px Chinese pixel fonts exist, such as the OFL-licensed [Fusion Pixel Font](https://github.com/TakWolf/fusion-pixel-font) in 8/10/12 px, but beginners reading at that size struggle (see §3.3). Mii-style customization at low resolution loses facial expression. | Hard to keep consistent across hundreds of assets. Expensive per asset. Ink wash can read as muted or "grown-up," which works against UXmatters' high-chroma finding. Expressive, readable combat animation is harder. |
| **Web fit (file size, performance)** | Good. Characters become small part atlases plus JSON skeleton data. PixiJS recommends spritesheets and texture batching, and `@0.5x` textures for weak devices ([PixiJS performance tips](https://pixijs.com/8.x/guides/concepts/performance-tips)). | Excellent. Tiny PNGs. | Fair to poor. Large painted textures cost download size and GPU memory, and aggressive compression muddies soft gradients (judgment). |
| **Spine / skeletal fit** | Excellent. Spine stores only bone data, so it needs "much fewer art assets" than frame-by-frame animation ([Esoteric: Spine in depth](http://esotericsoftware.com/spine-in-depth)). Skins let one skeleton serve many looks ([Spine purchase/features](https://esotericsoftware.com/spine-purchase)). | Poor to fair. Pixel art is usually animated frame by frame, because rotating and scaling pixel sprites breaks the pixel grid (practitioner judgment, not sourced). | Good for cut-out painted parts. Brushy edges need careful part separation, and mesh deformation is useful here (Spine Professional). |
| **Animation cost** | Low to medium: rig once, reuse animations across enemies with the same skeleton. | Medium: every frame is hand-drawn, but frames are small. | Medium to high. |
| **Estimated unit costs** (see §2.3) | 2D character $250–1,500. 2D rig $200–800. Animation $100–300 per cycle ([Pixune](https://pixune.com/blog/game-art-outsourcing-price/)). | Character sprite $150–500. Tileset of 32 tiles $300–800 ([Game Art Services](https://gameartservices.com/blog/game-art-cost-guide)). | Toward the top of the ranges: 2D environment $600–2,500 ([Pixune](https://pixune.com/blog/game-art-outsourcing-price/)); background $400–1,500 ([Game Art Services](https://gameartservices.com/blog/game-art-cost-guide)). I found no sourced premium for painterly work specifically, so placing it at the top of the range is **judgment**. |
| **Verdict** | **Primary.** | Fallback for a throwaway prototype only. | **Use as an accent layer** on top of A, not as the base style. |

**Recommended hybrid:** use A for characters, monsters, and combat. Use C's shuimo treatment for UI frames, scroll-style dialog boxes, world-map and realm-transition screens, loading screens, and boss introductions. For example, the Xiangliu boss could appear as an ink painting that "comes alive" into the cel-shaded battle sprite. This gives cultural identity and premium feel without forcing hundreds of assets into the hardest style.

### 2.3 Tools and rough production cost (ESTIMATES)

**Tools.** Spine Essential is $69 on sale (list $99). Spine Professional, which adds meshes, IK, and physics, is $379 on sale (list $449). Each named user needs a license, and Enterprise ($379 per user per year) is required once annual revenue reaches $500K ([Esoteric Software](https://esotericsoftware.com/spine-purchase)). Official Spine runtimes exist for both Phaser and PixiJS ([spine-phaser](http://esotericsoftware.com/spine-phaser)).

**Rate sources.** Both cost guides come from outsourcing vendors, which have an incentive to shape these ranges, so treat the numbers as indicative only.
- [Pixune (updated Sept 6, 2026)](https://pixune.com/blog/game-art-outsourcing-price/): 2D art $25–80/hr. 2D character $250–1,500. 2D environment $600–2,500. Prop $200–900. UI $100–500 per page. 2D rig $200–800. 2D animation $100–300 per cycle. Regional hourly rates: North America / Western Europe $60–150+, Eastern Europe $30–80, Southeast Asia $20–60, Latin America $30–90.
- [Game Art Services](https://gameartservices.com/blog/game-art-cost-guide): final character concept with three views $400–1,200. Creature design $500–1,500. Animated character with 4–6 animations $500–2,000. Background $400–1,500. Senior artists $50–120/hr in the West and $25–60/hr in Eastern Europe and Asia. A 30–50% deposit is standard. Art is typically 10–20% of a game's budget, and a 15–20% buffer is advised. Stylized art is often cheaper than realistic art.
- Fiverr gig prices (bot challenge) and Upwork rate pages (timed out) could not be opened: **UNVERIFIED**. I could not extract figures from the Mellow 2025 freelancer survey.

**Sample vertical slice (Direction A plus shuimo accents): one realm, one town, one boss. All figures are ESTIMATES.**

| Item | Quantity | Unit range (source) | Estimated subtotal |
|---|---|---|---|
| Style exploration and final concepts (hero, two monsters) | 3 | $400–1,200 (GAS, final concept) | $1,200–3,600 |
| Modular hero paper-doll: art | 1 | $250–1,500 (Pixune, 2D character) | $250–1,500 |
| Hero rig | 1 | $200–800 (Pixune, 2D rig) | $200–800 |
| Hero animations (idle, walk, attack, cast, hit, victory) | 6 | $100–300 (Pixune, per cycle) | $600–1,800 |
| Monsters, animated (horned rabbit, jumbo bee, goblin, zombie, mini-boss, Xiangliu) | 6 | $500–2,000 (GAS, animated character with 4–6 animations) | $3,000–12,000 |
| Battle and town backgrounds, including one shuimo transition | 3 | $400–1,500 (GAS, background) | $1,200–4,500 |
| UI screens (battle HUD, question panel, map, inventory, avatar creator) | 5 | $100–500 (Pixune, per page) | $500–2,500 |
| Key props | 5 | $200–900 (Pixune, prop) | $1,000–4,500 |
| Spine Professional seats | 2 | $379 sale / $449 list (Esoteric) | $758–898 |
| **Subtotal** | | | **≈ $8,700–32,100** |
| Buffer (15–20%, per GAS) | | | ≈ $1,300–6,400 |
| **Total estimate** | | | **≈ $10,000–38,500** |

The cost of a cultural consultant and a native-speaker language reviewer is **not included**, because I found no rate source I could verify. It needs its own line item; see §4.4.

---

## 3. Displaying Chinese text legibly

### 3.1 Fonts and licenses

| Font | License (verified) | Role | Notes |
|---|---|---|---|
| **Noto Sans SC** / **Source Han Sans SC** | SIL OFL 1.1. You may embed and bundle it but not sell it on its own ([Google Fonts license](https://fonts.google.com/noto/specimen/Noto+Sans+SC/license); [Adobe repo](https://github.com/adobe-fonts/source-han-sans)) | **Primary UI, question, and answer font** | Pan-CJK with region-specific SC/TC/HK/JP/KR builds. Using the SC build ensures mainland glyph forms. The full files are huge: I measured the SC variable WOFF2 at about **14.3 MB** and the variable OTF at about **31.7 MB** ([repo](https://github.com/adobe-fonts/source-han-sans)). |
| **Noto Serif SC** | Expected to be OFL, like the rest of the Noto family. I did not open its license page, so this is **UNVERIFIED**. | Optional for formal or story text | A Song/Ming style. Thin strokes are riskier at small sizes (see WCAG below). |
| **LXGW WenKai (霞鹜文楷)** | SIL OFL 1.1, with an extra permission to keep the reserved name in WOFF/WOFF2 web subsets ([GitHub](https://github.com/lxgw/LxgwWenKai)) | **Story, dialog, and "handwritten" flavor text** | Derived from Fontworks' Klee One, a textbook-style *kaishu* design, so stroke forms suit learners. The author says it suits medium-length text rather than long passages. About 4,000 glyphs in the full version were machine-generated with zi2zi and are rougher, so a subset drawn from common characters is safer. Lite, GB, and TC variants exist. |
| **ZCOOL KuaiLe (站酷快乐体)** | SIL OFL 1.1 ([Google Fonts](https://fonts.google.com/specimen/ZCOOL+KuaiLe/license)) | **Titles and logo only** | Playful display face. Do not use it for learning text, because stylized strokes can mislead beginners about character structure (judgment). |
| **Fusion Pixel Font** | OFL 1.1 ([GitHub](https://github.com/TakWolf/fusion-pixel-font)) | Only if Direction B is chosen | 8, 10, and 12 px CJK pixel font. |

**Never** use fake "Chinese-looking" Latin fonts (chop-suey lettering); see §4.3.

### 3.2 Simplified vs. traditional

The AP Chinese exam lets students toggle reading text between traditional and simplified, and it accepts typing in Pinyin (simplified or traditional) or Bopomofo ([AP Chinese exam overview PDF](https://apcentral.collegeboard.org/media/pdf/ap-chinese-exam-overview.pdf)). Pleco likewise offers a traditional/simplified choice and a "both sets" mode ([Pleco manual](https://android.pleco.com/manual/310/settings.html)).
**Recommendation:** ship **simplified by default** with Hanyu Pinyin. Design the content pipeline, including the fonts, the subset build, and a string table that stores both forms, so that a **traditional toggle** can be added later without rework.

### 3.3 Minimum on-screen size for hanzi

I could not find a formal study I could open; the ScienceDirect font-size study was blocked and is **UNVERIFIED**. The best source I opened is a Chinese StackExchange discussion, which is practitioner opinion. It says about 8×8 px is the minimum recognizable for native readers, 12×12 px is "moderate," and one answer cites 11×12 as a commercial minimum. A beginner said anything below 16×16 was hard to read and suggested 24×24 or more for newcomers ([Chinese StackExchange](https://chinese.stackexchange.com/questions/16669/lowest-pixel-resolution-needed-to-support-chinese)). NN/g's guidance that older children need about 12-point text for Latin script points the same direction ([NN/g](https://www.nngroup.com/articles/childrens-websites-usability-issues/)).

**Recommendation (judgment):** these sizes are in CSS pixels at the 1280×720 base layout.
- The hanzi being tested in battle: **at least 32 px**, ideally 40–48 px.
- Answer buttons: at least 28 px.
- UI and dialog text: at least 20–24 px.
- Pinyin ruby: about 50–60% of the hanzi size, and never below 12–14 px.
- Nothing learning-critical below 16 px.
- Playtest with actual beginners on 11-inch Chromebooks. Budget education Chromebooks are commonly 1366×768, but I could not open a spec sheet to confirm this, so it is **UNVERIFIED**.

### 3.4 Pinyin, tone marks, and tone colors

- **Pinyin with tone marks** (ā á ǎ à) should be the default. Pleco offers tone marks, tone numbers, Zhuyin, and ruby Zhuyin ([Pleco manual](https://android.pleco.com/manual/310/settings.html)).
- **Tone colors.** Pleco lets users color pinyin and characters by tone, with separate day and night palettes ([Pleco manual](https://android.pleco.com/manual/310/settings.html)). Pleco's developer said the defaults are red, green, blue, and purple for tones 1–4, and that the light green was darkened later ([Pleco forums](http://www.plecoforums.com/threads/color-schemes-ui-tones.2101/)). The evidence for color as a learning aid is weak, however. Hacking Chinese summarizes Godfroid, Lin & Ryu (2017), who found that color did worse than tone marks or numbers, and that adding color to marks gave no significant benefit. There is also no standard mapping. The article recommends picking one scheme and sticking with it, or making the colors user-configurable ([Hacking Chinese](https://www.hackingchinese.com/does-using-colour-to-represent-mandarin-tones-make-them-easier-to-learn/)).
- **Recommendation:** tone marks are always shown. Tone color is an **optional, user-configurable** setting, off by default or offered as a "helper" mode. Use one consistent default palette in the Pleco style, adjusted for color-blind safety and contrast, and never let color be the only carrier of tone information. That rule is also a WCAG principle.
- **Pinyin fading (pedagogy judgment):** show ruby pinyin over new characters, then fade it out as the player masters each character, for example showing it on tap or hover only. Boss battles could be the "no pinyin" test.

### 3.5 HTML ruby/rt approach

`<ruby>`, with `<rt>` for the annotation and `<rp>` for fallback parentheses, has been "Baseline widely available since July 2015" ([MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/ruby)). A per-character example:

```html
<ruby>你<rp>(</rp><rt>nǐ</rt><rp>)</rp></ruby><ruby>好<rp>(</rp><rt>hǎo</rt><rp>)</rp></ruby>
```

Annotating per character rather than per word lets the game color, hide, or animate individual syllables. Canvas renderers have no ruby support. That is the main reason to render Chinese text in a **DOM overlay**: Phaser's DOM Element places HTML over the canvas and is suggested for "high resolution text display and UI," with the caveat that it cannot interleave with sprites ([Phaser docs](https://docs.phaser.io/phaser/concepts/gameobjects/dom-element)). Where text must live inside the canvas, such as floating damage numbers or short labels, PixiJS notes that `Text` is expensive to change every frame and that `BitmapText` is faster ([PixiJS performance tips](https://pixijs.com/8.x/guides/concepts/performance-tips)). A bitmap font generated from the curriculum's character subset solves this.

### 3.6 Web font subsetting

- Google Fonts serves Noto Sans SC as many `unicode-range` slices (I counted **101** in its CSS), and its `text=` parameter can cut file size "by up to 90%" ([Google Fonts docs](https://developers.google.com/fonts/docs/getting_started)). Google's research on machine-learned slicing notes that CJK fonts can be "tens of megabytes" ([Google MLFont](https://google.github.io/speaker-id/publications/MLFont/)).
- **Recommendation:** **self-host subsetted WOFF2 files** built with fontTools `pyftsubset`, which supports `--text-file`, `--flavor=woff2`, and `--no-hinting` (the docs say up to 30% smaller), plus `--layout-features` ([fontTools docs](https://fonttools.readthedocs.io/en/latest/subset/index.html)). Generate the character list automatically from the curriculum and string tables in CI. A reasonable split is a base subset (UI plus early levels, loaded first) and per-realm subsets loaded lazily; add a traditional subset when the toggle ships.
- Self-hosting instead of loading from the Google CDN is my recommendation for a children's product, because it limits third-party requests. This is an **inference**; I did not research COPPA or other privacy law, and legal review is advised.

### 3.7 Contrast and accessibility

WCAG 1.4.3 requires 4.5:1 contrast for normal text and 3:1 for large text (about 24 px regular or about 18.5 px bold). The definition of "large scale" includes equivalent sizes for CJK, and the guidance notes that thin fonts render fainter ([W3C Understanding 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)).
**Recommendation:**
- Meet AA (4.5:1) for all Chinese learning text regardless of size, because hanzi strokes are fine.
- Use Regular or Medium weight rather than Light.
- Place text on solid or semi-opaque panels, never directly on painted backgrounds or shuimo textures.
- Provide audio for every prompt, which serves the listening goal and helps accessibility.
- Keep DOM text selectable by screen readers, marked with `lang="zh-Hans"`.

---

## 4. Cultural touches: blending Western fantasy with Chinese mythology

### 4.1 Source material worth using

- **Shan Hai Jing (Classic of Mountains and Seas).** A compilation of mythic geography and beasts, with the earliest parts dating to about the 4th century BCE, describing more than 550 mountains ([Wikipedia](https://en.wikipedia.org/wiki/Classic_of_Mountains_and_Seas)). It can supply a region-by-region bestiary, and it also gives natural vocabulary content: creature names, mountains, and directions.
- **Xiangliu (相柳) as the hydra.** A venomous nine-headed snake, minister to the water god Gonggong, who poisoned the land with bitter swamps and was killed by Yu the Great. Modern depictions look like the hydra, while old woodcuts show the heads clustered together ([Wikipedia](https://en.wikipedia.org/wiki/Xiangliu)). It is an ideal realm boss: a poisoned swamp realm, a "tame the flood" story arc, and a battle mechanic where each head asks a question.
- **Four Symbols (四象) as realm guardians.** Azure Dragon (East), Vermilion Bird (South), White Tiger (West), and Black Turtle-Snake (North), with the Yellow Dragon at the center ([Wikipedia](https://en.wikipedia.org/wiki/Four_Symbols)). They map neatly to four realms plus a central finale, and they teach direction and color words.
- **Dragons should be benevolent.** The Chinese dragon is auspicious and controls water and weather, unlike the aggressive European dragon. China reportedly dropped the dragon as its 2008 Olympic mascot because of those negative connotations abroad ([Wikipedia](https://en.wikipedia.org/wiki/Chinese_dragon)). A Chinese dragon should be an ally or guardian, not a monster to slay. If a fire-breathing Western dragon appears, it should be visually and verbally distinct (called 西方龙, "Western dragon," or given another name).
- **Western monsters can stay Western.** Horned rabbits, jumbo bees, goblins, and zombies are fine. A mixed world ("the hero's realm meets the Mountains and Seas") is a legitimate premise. The risk is careless mashing, not mixing itself (see Gnome Stew below). Note one overlap: the Chinese *jiangshi* (hopping vampire) could be a culturally specific zombie variant, but it should be researched with the consultant first.

### 4.2 Precedent for a respectful stylized treatment

Black Myth: Wukong's team researched Li Gonglin's *baimiao* line drawing and the Dunhuang murals for its "Unfinished" sequence ([China Daily](http://www.chinadaily.com.cn/a/202410/30/WS67218152a310f1265a1ca595.html)). Naming specific historical references like these, rather than a generic "Oriental" look, is the model for our shuimo accents.

### 4.3 Pitfalls to avoid

| Pitfall | Why it matters | Mitigation |
|---|---|---|
| **Chop-suey / "wonton" fonts** | Traced to the Cleveland Type Foundry's "Mandarin" typeface of 1883 and criticized as racist. CD Projekt drew criticism over Cyberpunk 2077. Monotype's Tom Rickner points to real multilingual typography as the way forward ([CNN](https://www.cnn.com/style/article/chop-suey-fonts-hyphenated)). | Use real CJK fonts (§3.1) paired with a neutral, friendly Latin font. |
| **Mixing Japanese and Chinese motifs** | "Oriental Adventures"–style settings flatten Chinese and Japanese culture into one. Better settings focus on specific eras and places ([Gnome Stew, Lucia Tang](https://gnomestew.com/what-games-with-asian-settings-get-wrong-and-why-theyre-important-anyway/)). The Four Symbols, for example, also have Japanese names (Seiryū, Suzaku, Byakko, Genbu) ([Wikipedia](https://en.wikipedia.org/wiki/Four_Symbols)). | Use Mandarin names only (青龙, 朱雀, 白虎, 玄武). Avoid torii gates, katana, kimono, sakura-as-China, and anime-specific tropes in Chinese-coded areas. |
| **Number connotations** | 6 and 8 are lucky. 4 is unlucky because it sounds like "death" ([Wikipedia](https://en.wikipedia.org/wiki/Numbers_in_Chinese_culture)). | A "Floor 4" haunted dungeon is fine as intentional flavor. Avoid accidental 4s on rewards and prizes, and use 8 for jackpots. |
| **Color connotations** | Red means luck and celebration. Writing someone's name in red ink is taboo. White is the color of mourning and is associated with ghosts ([Wikipedia](https://en.wikipedia.org/wiki/Color_in_Chinese_culture)). | **Never render the player's name in red.** Do not use red for "wrong answer" on the player's name or on hanzi the player types. Use red for rewards and festivals, and treat white as funereal in context. Note the conflict with Western UI convention (red = error): consider orange or grey plus an icon for "incorrect." |
| **Misused or sacred symbols** | Culturalization problems cost real markets: Fallout 3's two-headed Brahman bull cost the game its India release, and map issues got Hearts of Iron banned in China. Fixes are cheap if made early ([GamesIndustry.biz, Kate Edwards](https://www.gamesindustry.biz/why-culturalisation-matters-as-much-as-localisation)). | Review religious iconography (Buddhist and Daoist deities, temples), maps, and political symbols with the consultant before production art begins. |
| **Stereotyped characters** | Same flattening risk as above. | No caricatured eyes or accents. Chinese-coded NPCs should be as varied and competent as everyone else. |

### 4.4 Cultural consultants and sensitivity readers

Gnome Stew cites cultural consultants and sensitivity readers as good practice ([Gnome Stew](https://gnomestew.com/what-games-with-asian-settings-get-wrong-and-why-theyre-important-anyway/)). Kate Edwards stresses starting culturalization early, when fixes are cheap ([GamesIndustry.biz](https://www.gamesindustry.biz/why-culturalisation-matters-as-much-as-localisation)).
**Recommendation:** retain (a) a paid **cultural/mythology consultant** during pre-production for the bestiary and style guide, and (b) a **native-speaker Mandarin language reviewer**, ideally with K-12 teaching experience, for all on-screen text, audio, and pinyin. Rates are **unverified**, so budget them as a separate line item.

---

## 5. Where the art can come from

### 5.1 Commissioned freelancers and studios

Commission the core identity work: the style guide, hero and avatar system, key monsters, and bosses. See §2.3 for rate ranges (ESTIMATES from vendor guides). Contracts should include a **written assignment of copyright** (work for hire or assignment) and delivery of layered source files and Spine projects. They should also include a clause stating whether generative AI may be used, which ties into §5.3. The typical 30–50% deposit is noted by [Game Art Services](https://gameartservices.com/blog/game-art-cost-guide).

### 5.2 Asset stores: license terms relevant to a web game

| Source | Key terms (verified) | Web-game notes |
|---|---|---|
| **Unity Asset Store** | Assets may be used in other engines under the EULA, but must not be redistributed or made extractable by end users. "Restricted Assets" carry separate terms ([Unity support](https://support.unity.com/hc/en-us/articles/34387186019988-Can-I-use-assets-from-the-Asset-Store-with-other-engines)). | Usable in Phaser/Pixi. See the extraction caveat below. |
| **CraftPix** | Royalty-free use in unlimited free and commercial projects. No resale of source files. Your product must not let users export the art. Free assets need no attribution. Using the assets for AI training is banned ([CraftPix license](https://craftpix.net/file-licenses/)). | Good for UI filler, VFX, and props. |
| **GameDev Market** | Perpetual, non-exclusive, unlimited projects, monetization allowed, no use in logos, and users must not be able to extract assets. **Clause 7.2: intellectual property in Derivative Works is owned by the Seller**, and the buyer assigns those rights ([GDM terms](https://www.gamedevmarket.net/terms-conditions/)). | **Do not use GDM assets as the basis for core characters or IP,** because modifications would belong to the seller. |
| **itch.io** | There is no universal license; each creator sets terms, and if none are stated the terms are unknown ([itch.io forum, moderator](https://itch.io/t/364148/asset-licenses)). Asset creators must fill in a generative-AI disclosure field, and untagged AI assets are de-indexed ([itch.io announcement, Nov 20, 2024](https://itch.io/t/4309690/generative-ai-disclosure-tagging)). | Check each pack's license and AI tag, and archive a copy of the license with the purchase. |
| **OpenGameArt** | Licenses include CC0; CC-BY (credit required, and DRM not allowed); CC-BY-SA (derivatives must use the same license); OGA-BY (DRM allowed); and GPL. Preview images are not covered by the license ([OGA FAQ](https://opengameart.org/content/faq)). | Prefer CC0 or OGA-BY. Keep a credits screen. Avoid CC-BY-SA and GPL for core art unless you accept share-alike. |

**Extraction caveat (my interpretation, not legal advice):** anything shipped in a browser can be pulled out through developer tools, so "no extraction" clauses carry some residual risk for every web game. Reasonable mitigations are packing assets into atlases, never offering downloads or "view art" galleries of third-party assets, and keeping purchase records. Confirm with counsel.

### 5.3 AI-assisted art

- **Copyright.** The US Copyright Office's AI report, Part 2 (January 29, 2025), says AI outputs are protected only where a human determined sufficient expressive elements. Prompts alone are not enough. Human creative arrangement or modification can be protected, and using AI as an assistive tool does not bar copyright ([USCO NewsNet](https://copyright.gov/newsnet/2025/1060.html); [report PDF](https://www.copyright.gov/ai/Copyright-and-Artificial-Intelligence-Part-2-Copyrightability-Report.pdf)). **Implication:** shipped characters generated by AI may be unprotectable, which is a problem for a game whose value is its characters.
- **Steam disclosure.** This matters if we ever ship on Steam. As of January 2026, Steam's disclosure covers pre-generated AI content that "ships with your game and is consumed by players," plus marketing, and excludes behind-the-scenes efficiency tools. Live-generated AI content requires disclosure of guardrails, and players get an overlay report button ([PC Gamer](https://www.pcgamer.com/software/ai/steam-updates-ai-disclosure-form-to-specify-that-its-focused-on-ai-generated-content-that-is-consumed-by-players-not-efficiency-tools-used-behind-the-scenes/)).
- **Training-data and litigation risk.** Disney, Universal, and others sued Midjourney (C.D. Cal. 2:25-cv-05275, filed June 11, 2025), and Warner Bros. filed a separate suit. The case was still active as of a Midjourney filing on July 21, 2026 ([CourtListener docket filing](https://storage.courtlistener.com/recap/gov.uscourts.cacd.973999/gov.uscourts.cacd.973999.139.0.pdf)). In the UK, Getty v. Stability AI (November 4, 2025) went largely for Stability on secondary copyright ("a model that does not store or reproduce works is not an infringing copy"), but some trademark and watermark infringement was found, and Getty had dropped its primary training claim ([The Guardian](https://www.theguardian.com/media/2025/nov/04/stabilty-ai-high-court-getty-images-copyright)). The law is unsettled.
- **Tool terms:**
  - **Midjourney** (ToS effective May 27, 2026): you own assets "to the fullest extent possible," but companies with more than $1M in revenue need a Pro or Mega plan. Midjourney gets a perpetual license to your inputs and outputs. Content is public and remixable by default unless you use Stealth mode on Pro or Mega. Users must be 13 or older ([Midjourney ToS](https://docs.midjourney.com/hc/en-us/articles/32083055291277-Terms-of-Service)).
  - **Adobe Firefly** (FAQ updated May 13, 2026): trained on licensed content such as Adobe Stock plus public-domain content. Outputs from non-beta features may be used commercially. Content Credentials are attached. Adobe itself advises consulting a lawyer ([Adobe Firefly FAQ](https://helpx.adobe.com/firefly/get-set-up/learn-the-basics/adobe-firefly-faq.html)). Search results claimed that IP indemnification requires a qualifying enterprise plan and is capped per output, but I could not open the terms, so those details are **UNVERIFIED**.
  - Other tools (Stable Diffusion variants, OpenAI and Google image models) were **not reviewed** for this memo. Check their terms before any use.
- **Audience and optics (judgment).** Parents, teachers, and districts are sensitive to AI content in children's products, and a human-made art style is a trust signal.

**Practical recommendation:** use AI **for internal ideation only**: mood boards, silhouette exploration, and color-script thumbnails, preferably with Firefly because of its licensed training data. **Do not ship AI-generated art** in the game or marketing. Require freelancers to disclose any AI use in writing, and keep a simple provenance log for each asset. Revisit this policy once the USCO guidance and the pending cases settle.

---

## 6. Art decisions the team needs to make now

| # | Decision | Options | Recommendation | Basis |
|---|---|---|---|---|
| 1 | **Overall style** | Chibi vector/cel; pixel; painterly shuimo; hybrid | **Hybrid: chibi 2D cel for characters and combat, shuimo accents for UI, transitions, and boss intros** | §1–2 |
| 2 | **Anti-babyish guardrails** | Pure cute; cute plus menace; realistic | **Cute heroes, escalating monster menace, richer later realms**, following Sugimori's balance principle | NN/g, UXmatters, de Droog, Sugimori |
| 3 | **2D vs. 3D** | 2D; 3D; 2.5D | **2D.** Cheaper, lighter downloads, better CJK text integration, and matches Paper Mario and Miitopia-style flatness | §2; 3D characters cost $1,000–6,000 each per [Pixune](https://pixune.com/blog/game-art-outsourcing-price/) (estimate) |
| 4 | **Rendering tech** | Phaser 4; PixiJS; pure DOM/CSS; hybrid | **Phaser 4 (or PixiJS) canvas/WebGL for the world and battle, plus an HTML/DOM overlay for all Chinese learning text.** Phaser 4.0 shipped April 10, 2026, and the current release is 4.2.1 (July 9, 2026) ([Phaser](https://phaser.io/download/phaser4)). Use BitmapText subsets for in-canvas labels. | §3.5 |
| 5 | **Character customization** | Fixed hero; class skins; Mii-style modular avatar | **Mii-style modular paper-doll avatar using Spine skins** (face parts, hair, colors, outfits). Also let players cast Miis-style NPCs from friends or classmates later. | Miitopia, Prodigy English, [Spine skins](https://esotericsoftware.com/spine-purchase) |
| 6 | **Animation approach** | Frame-by-frame; Spine skeletal; CSS/tween only | **Spine skeletal for all characters and monsters (Professional seats); frame-by-frame or particles for VFX; ink-bleed shader or sprite sequences for shuimo transitions** | [Spine in depth](http://esotericsoftware.com/spine-in-depth) |
| 7 | **Simplified vs. traditional** | Simplified only; traditional only; toggle | **Simplified default, with the pipeline built for a later traditional toggle** | AP Chinese, Pleco |
| 8 | **Pinyin policy** | Always on; never; adaptive | **Hanyu Pinyin with tone marks via `<ruby>`, fading by mastery; tone colors optional and configurable, never the only cue** | Pleco, Hacking Chinese, MDN |
| 9 | **Fonts** | See §3.1 | **Noto Sans SC / Source Han Sans SC (UI and questions); LXGW WenKai (story and flavor); ZCOOL KuaiLe (titles only); self-hosted, subsetted WOFF2** | §3.1, §3.6 |
| 10 | **Text size and contrast** | — | **Tested hanzi ≥32 px, UI ≥20–24 px, pinyin ≥12–14 px; WCAG AA 4.5:1 for all learning text; text on solid panels.** Sizes are judgment; validate in playtests. | §3.3, §3.7 |
| 11 | **Resolution and aspect ratio** | 4:3; 16:9 fixed; responsive | **16:9 base layout at 1280×720 logical px; author art at 2× (2560×1440 for backgrounds) and ship `@1x`/`@0.5x` atlases; letterbox or scale-to-fit, with the DOM text layer scaled to match.** Target school Chromebooks and tablets. This is judgment; the LoL 1024×576 spec and the Chromebook 1366×768 norm are **UNVERIFIED**. | PixiJS `@0.5x` guidance |
| 12 | **Sourcing mix** | All commissioned; all marketplace; AI-heavy; mix | **Commission the lead/concept artist and the Spine animator for all core IP. Use marketplace assets (CraftPix, CC0 or OGA-BY on OGA, license-checked itch.io packs) only for props, VFX, and UI filler, and avoid GameDev Market for anything core. AI for internal ideation only; no shipped AI art.** | §5 |
| 13 | **Cultural review** | None; post-hoc; embedded early | **Paid cultural consultant plus a native-speaker language reviewer from pre-production onward** | Edwards, Gnome Stew |
| 14 | **Art budget split** | — | **ESTIMATE / judgment:** concept and art direction 15%, characters and monsters (incl. avatar parts) 35%, environments 20%, UI/UX art 10%, animation and VFX 15%, cultural and language review 5%, **plus a 15–20% contingency** (the contingency figure is from [Game Art Services](https://gameartservices.com/blog/game-art-cost-guide)). A vertical slice is estimated at roughly **$10k–38.5k** (§2.3). | §2.3 |

---

## 7. Unverified items and open questions

- **Fiverr** gig prices (blocked by a bot challenge) and **Upwork** rate data (timed out): not verified. The Mellow 2025 survey figures could not be extracted.
- **Legends of Learning** 1024×576 viewport spec: seen only in search results, not verified.
- **Adobe Firefly indemnification** terms (enterprise-plan requirement and per-output cap): not verified.
- **Noto Serif SC** license page: not opened. OFL is expected but not confirmed.
- **ScienceDirect** Chinese font-size legibility study: blocked. The minimum-size guidance in §3.3 rests on a StackExchange discussion plus judgment.
- **School Chromebook resolution** (1366×768 common on 11.6-inch education models): seen only in search results; the spec sheets I tried did not load.
- **Cultural consultant and language reviewer rates:** no source found.
- **COPPA and children's privacy law** (and how it bears on third-party font CDNs and analytics): not researched.
- The cost guides come from **outsourcing vendors**, so all cost figures are indicative estimates only.

---

## References

1. Miitopia, Wikipedia. https://en.wikipedia.org/wiki/Miitopia
2. Nintendo Life, Miitopia review. https://www.nintendolife.com/reviews/3ds/miitopia
3. Inside Games, Miitopia developer interview (Dec 2016). https://www.inside-games.jp/article/2016/12/15/104186.html
4. Famitsu, Miitopia interview (Nov 2016). https://www.famitsu.com/news/201611/25121408.html
5. Natalia Thomson, Prodigy portfolio. https://www.nataliathomson.com/prodigy
6. Prodigy Education, "Next chapter" rebrand post. https://www.prodigygame.com/main-en/blog/prodigy-education-next-chapter
7. PR Newswire, Prodigy Education unveils new brand. https://www.prnewswire.com/news-releases/prodigy-education-unveils-new-brand-301109046.html
8. Prodigy English research-based design. https://www.prodigygame.com/main-en/blog/prodigy-english-research-based-design
9. Common Sense Media, Prodigy review. https://www.commonsensemedia.org/app-reviews/prodigy-kids-math-game
10. Common Sense Media, Wizard101 review. https://www.commonsensemedia.org/game-reviews/wizard-101
11. Duolingo blog, Shape language. https://blog.duolingo.com/shape-language-duolingos-art-style/
12. Duolingo design guide, Characters. https://design.duolingo.com/illustration/characters
13. Polygon, Akira Toriyama and the Dragon Quest Slime. https://www.polygon.com/gaming/24094509/akira-toriyama-dragon-quest-slime/
14. PokémonBlog, Ken Sugimori on balancing designs. https://pokemonblog.com/2018/09/14/ken-sugimori-explains-balancing-pokemon-designs-to-make-sure-they-dont-look-too-cute-or-too-cool/
15. shmuplations, Paper Mario 2000 developer interviews. https://shmuplations.com/papermario/
16. Emily M., Kingdom Rush UI review. https://emilym.space/thumbelina-hurts-mobile-ui-blog/2018/6/26/kingdom-rush-a-tower-defense-trilogy-with-ui-design-approaching-perfection-and-entertainment-worth-missing-bedtime-for
17. Legends of Learning, Developers. https://gamedevelopers.legendsoflearning.com/developers/
18. Nielsen Norman Group, Children's websites usability issues. https://www.nngroup.com/articles/childrens-websites-usability-issues/
19. UXmatters, Color and graphics for kids 7–14. https://www.uxmatters.com/mt/archives/2011/12/effective-use-of-color-and-graphics-in-applications-for-children-part-ii-kids-7-to-14-years-of-age.php
20. Game Developer, Children and their desired game experiences (de Droog). https://www.gamedeveloper.com/business/children-and-their-desired-game-experiences-a-developmental-look-at-game-aesthetics
21. Common Sense Census 2021, gaming fact sheet. https://www.commonsensemedia.org/sites/default/files/research/report/2021-8-18-census-fact-sheet-gaming_0.pdf
22. Esoteric Software, Spine purchase. https://esotericsoftware.com/spine-purchase
23. Esoteric Software, Spine in depth. http://esotericsoftware.com/spine-in-depth
24. Esoteric Software, spine-phaser runtime. http://esotericsoftware.com/spine-phaser
25. Pixune, Game art outsourcing price guide. https://pixune.com/blog/game-art-outsourcing-price/
26. Game Art Services, Game art cost guide. https://gameartservices.com/blog/game-art-cost-guide
27. PixiJS v8, Performance tips. https://pixijs.com/8.x/guides/concepts/performance-tips
28. Phaser 4 download page. https://phaser.io/download/phaser4
29. Phaser docs, DOM Element. https://docs.phaser.io/phaser/concepts/gameobjects/dom-element
30. China Daily, Black Myth: Wukong "Unfinished" art. http://www.chinadaily.com.cn/a/202410/30/WS67218152a310f1265a1ca595.html
31. Google Fonts, Noto Sans SC license. https://fonts.google.com/noto/specimen/Noto+Sans+SC/license
32. Adobe Fonts, Source Han Sans (GitHub). https://github.com/adobe-fonts/source-han-sans
33. LXGW WenKai (GitHub). https://github.com/lxgw/LxgwWenKai
34. Google Fonts, ZCOOL KuaiLe license. https://fonts.google.com/specimen/ZCOOL+KuaiLe/license
35. Fusion Pixel Font (GitHub). https://github.com/TakWolf/fusion-pixel-font
36. Google Fonts developer docs, Getting started. https://developers.google.com/fonts/docs/getting_started
37. Google, ML-based font slicing (MLFont). https://google.github.io/speaker-id/publications/MLFont/
38. fontTools subset documentation. https://fonttools.readthedocs.io/en/latest/subset/index.html
39. MDN, `<ruby>` element. https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/ruby
40. W3C, Understanding WCAG 1.4.3 Contrast (Minimum). https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
41. Chinese StackExchange, Lowest pixel resolution needed to support Chinese. https://chinese.stackexchange.com/questions/16669/lowest-pixel-resolution-needed-to-support-chinese
42. Pleco Android manual, Settings. https://android.pleco.com/manual/310/settings.html
43. Pleco Forums, Color schemes / UI tones. http://www.plecoforums.com/threads/color-schemes-ui-tones.2101/
44. Hacking Chinese, Does using colour to represent tones help? https://www.hackingchinese.com/does-using-colour-to-represent-mandarin-tones-make-them-easier-to-learn/
45. College Board, AP Chinese exam overview (PDF). https://apcentral.collegeboard.org/media/pdf/ap-chinese-exam-overview.pdf
46. Xiangliu, Wikipedia. https://en.wikipedia.org/wiki/Xiangliu
47. Classic of Mountains and Seas, Wikipedia. https://en.wikipedia.org/wiki/Classic_of_Mountains_and_Seas
48. Four Symbols, Wikipedia. https://en.wikipedia.org/wiki/Four_Symbols
49. Chinese dragon, Wikipedia. https://en.wikipedia.org/wiki/Chinese_dragon
50. Numbers in Chinese culture, Wikipedia. https://en.wikipedia.org/wiki/Numbers_in_Chinese_culture
51. Color in Chinese culture, Wikipedia. https://en.wikipedia.org/wiki/Color_in_Chinese_culture
52. CNN, Chop-suey fonts. https://www.cnn.com/style/article/chop-suey-fonts-hyphenated
53. Gnome Stew (Lucia Tang), What games with Asian settings get wrong. https://gnomestew.com/what-games-with-asian-settings-get-wrong-and-why-theyre-important-anyway/
54. GamesIndustry.biz (Kate Edwards), Why culturalisation matters. https://www.gamesindustry.biz/why-culturalisation-matters-as-much-as-localisation
55. Unity support, Asset Store assets in other engines. https://support.unity.com/hc/en-us/articles/34387186019988-Can-I-use-assets-from-the-Asset-Store-with-other-engines
56. CraftPix, File licenses. https://craftpix.net/file-licenses/
57. GameDev Market, Terms and conditions. https://www.gamedevmarket.net/terms-conditions/
58. itch.io forum, Asset licenses. https://itch.io/t/364148/asset-licenses
59. itch.io, Generative AI disclosure tagging. https://itch.io/t/4309690/generative-ai-disclosure-tagging
60. OpenGameArt FAQ. https://opengameart.org/content/faq
61. US Copyright Office, NewsNet on AI Part 2. https://copyright.gov/newsnet/2025/1060.html
62. US Copyright Office, Copyright and AI Part 2: Copyrightability (PDF). https://www.copyright.gov/ai/Copyright-and-Artificial-Intelligence-Part-2-Copyrightability-Report.pdf
63. PC Gamer, Steam updates AI disclosure form (Jan 2026). https://www.pcgamer.com/software/ai/steam-updates-ai-disclosure-form-to-specify-that-its-focused-on-ai-generated-content-that-is-consumed-by-players-not-efficiency-tools-used-behind-the-scenes/
64. Midjourney, Terms of Service. https://docs.midjourney.com/hc/en-us/articles/32083055291277-Terms-of-Service
65. Adobe, Firefly FAQ. https://helpx.adobe.com/firefly/get-set-up/learn-the-basics/adobe-firefly-faq.html
66. CourtListener, Disney et al. v. Midjourney filing (C.D. Cal. 2:25-cv-05275). https://storage.courtlistener.com/recap/gov.uscourts.cacd.973999/gov.uscourts.cacd.973999.139.0.pdf
67. The Guardian, Getty v Stability AI ruling (Nov 4, 2025). https://www.theguardian.com/media/2025/nov/04/stabilty-ai-high-court-getty-images-copyright

---

## Recommended direction

Build a **2D chibi, cel-shaded world** in the spirit of Miitopia and Prodigy. Its signature layer is **Chinese ink-wash (shuimo) accents** on UI frames, map and realm transitions, and boss reveals. Monsters grow more menacing as the player advances, so the game reads as "cool" to 12-year-olds rather than babyish. Heroes are **Mii-style modular avatars animated in Spine**, rendered in **Phaser 4 or PixiJS**, with all Chinese learning text in a crisp **HTML/DOM overlay**. That overlay supports `<ruby>` pinyin with tone marks that fade with mastery and optional tone colors. Use **simplified characters by default** (with a traditional toggle later), **Noto Sans SC plus LXGW WenKai**, self-hosted as subsetted WOFF2, at large sizes with WCAG AA contrast. Draw monsters from the **Shan Hai Jing and the Four Symbols**, with **Xiangliu as the hydra boss** and dragons kept benevolent. Vet everything with a **paid cultural consultant and a native-speaker reviewer**. **Commission all core art from humans**, use license-checked marketplace assets only for filler, and keep AI to internal ideation. A vertical slice is estimated at roughly **$10k–38.5k**, based on vendor rate guides, with a 15–20% buffer.
