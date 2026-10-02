# Proposal: AI Art and Audio Pipeline (v1, Phaser 4)

**To:** Director agent · **Date:** September 28, 2026 · **Supersedes:** §2, §5, and the budget sections of the earlier art-direction memo.

**Scope.** All art and music will be AI-generated for a private game played by Jack's 12-year-old daughter and her friends. v1 is a Phaser 4 web game. Simplified Chinese is the default, with traditional forms stored for a later toggle. Monsters are Western fantasy by default. **The style stays 2D chibi cel-shaded, with light ink-wash accents in the UI.** I found no strong reason to change it, and flat cel art is also the easiest style to keep consistent with AI tools and to cut out cleanly. Facts are linked to sources I opened. Anything marked **UNVERIFIED** came only from third-party summaries or pages I could not load.

---

## 1. Image tools (checked September 2026)

| Tool | Consistency features | Transparent PNG | Cost | Terms relevant to us | Age |
|---|---|---|---|---|---|
| **OpenAI GPT Image 2.5** (ChatGPT or API) | Image inputs and editing. OpenAI says it improves "precise editing and subject preservation" ([guide](https://developers.openai.com/api/docs/guides/image-prompting)). | **Yes, native** (`background="transparent"`, PNG/WebP) ([guide](https://developers.openai.com/api/docs/guides/image-prompting)) | API: $8 per 1M image-input tokens and $30 per 1M image-output tokens ([model page](https://developers.openai.com/api/docs/models/gpt-image-2.5-flare)). ChatGPT Free has "limited and slower image generation" ([pricing](https://chatgpt.com/pricing/)). The Plus price is **UNVERIFIED** (the page is rendered by JavaScript). | API use may require Organization Verification ([guide](https://developers.openai.com/api/docs/guides/image-generation)). | 13+, and users under 18 need a parent's permission ([ToS](https://openai.com/policies/terms-of-use/)) |
| **Google Gemini "Nano Banana 2"** (Gemini 3.1 Flash Image) | Google says it excels "at multiple reference image processing and consistency" ([docs](https://ai.google.dev/gemini-api/docs/generate-content/image-generation)). | No native option found, so backgrounds must be removed afterward. | $0.067 per 1K image and $0.101 per 2K image. The Pro model costs more. No free API tier ([pricing](https://ai.google.dev/gemini-api/docs/pricing)). | The API terms say the API must not power apps "likely to be accessed by individuals under the age of 18" ([terms](https://ai.google.dev/gemini-api/terms)). That clause is about calling the API at runtime; we only generate assets offline. | **API: 18+** ([terms](https://ai.google.dev/gemini-api/terms)) |
| **Midjourney V8.2** | Style reference (`--sref`), moodboards, and seeds. The new Edit Model accepts up to 4 reference images and replaces Omni/Character Reference ([announcement](https://updates.midjourney.com/edit-model-for-v8/); [Omni doc](https://docs.midjourney.com/hc/en-us/articles/36285124473997-Omni-Reference)). | No | $10, $30, $60, or $120 per month. Stealth (private) mode requires the Pro or Mega plan ([plans](https://docs.midjourney.com/hc/en-us/articles/27870484040333-Comparing-Midjourney-Plans)). | Images are public by default. Midjourney keeps a license to inputs and outputs ([ToS](https://docs.midjourney.com/hc/en-us/articles/32083055291277-Terms-of-Service)). | 13+ |
| **Adobe Firefly** | Reference images for style, custom models, and background removal ([FAQ and doc index](https://helpx.adobe.com/firefly/get-set-up/learn-the-basics/adobe-firefly-faq.html)) | Via the Remove Background tool | Plan prices are **UNVERIFIED**; a third-party summary lists $9.99 per month for 2,000 credits. | Trained on licensed and public-domain content. Outputs can be used commercially. | **UNVERIFIED** |
| **Leonardo.ai** | Character references from one or more images ([page](https://leonardo.ai/ai-character-generator)) | **Yes, native "Transparency"** at no extra token cost ([help](https://intercom.help/leonardo-ai/en/articles/9075772-transparency)) | Free plan gives 150 tokens a day. Paid tiers include $30 and $60 per month ([pricing](https://leonardo.ai/pricing)). | On the free plan, Leonardo holds rights to your images and grants you a license. Public images can be reused by others ([pricing FAQ](https://leonardo.ai/pricing)). | 13+, and users under 18 need consent ([ToS](https://leonardo.ai/terms-of-service/)) |
| **Recraft** | Strong at vectors and icons. Its style-reference features are **UNVERIFIED**. | Background removal is **UNVERIFIED** | Free plan available. The claim that paid plans start around $10 per month is **UNVERIFIED** (third-party). | Free-plan images are public and owned by Recraft; you get a personal-use license ([docs](https://www.recraft.ai/docs/trust-and-security/ownership)). | Not checked |
| **Scenario** | Train custom models on 10–30 images for a style or 5–15 for a character, and combine them with Multi-LoRA ([pricing](https://www.scenario.com/pricing)). | Outputs PNG and SVG; native transparency not confirmed | 50 free credits a day. Starter is $15 per month. Pro, which is needed for training, is $45 per month. | Free outputs are for personal or evaluation use only, and generations are private ([pricing](https://www.scenario.com/pricing)). | Not checked |
| **Layer.ai** | Trains custom style models (LoRAs) ([feature page](https://layer.ai/features/custom-model-training)) | Not checked | Plans start at $10 for 300 credits; one-time packs are $40 for 500 ([help](https://help.layer.ai/en/articles/12037310-guide-to-layer-s-subscriptions-pricing)). | Includes a commercial license | Not checked |
| **Local Flux / SDXL in ComfyUI** | LoRA training, image-edit models, and full control | Background removal with [rembg](https://github.com/danielgatis/rembg) (MIT, though each removal model has its own license). A native LayerDiffuse transparency option is **UNVERIFIED**. | Free apart from GPU hardware and setup time | FLUX.1 Kontext [dev] is released under a **Non-Commercial** license ([BFL](https://bfl.ai/blog/flux-1-kontext-dev)), which fits private use. | Not applicable |

**Recommendation.** **Primary tool: GPT Image 2.5**, run by Jack in ChatGPT for exploration and through the API for batches. It is the only mainstream tool I found with both native transparent output and strong editing that keeps a character recognizable across images. **Backup: Nano Banana 2** in the Gemini app or AI Studio. It handles multiple reference images well and is cheap per image, but backgrounds have to be removed afterward. If the art starts drifting after about 20 approved anchor images, consider **one month of Scenario Pro ($45)** to train a style LoRA. The kids never operate any of these tools; Jack or the team does.

---

## 2. Pipeline: from reference board to Phaser asset

1. **Reference board.** Use only CC0 or public-domain sources, such as [Art Institute of Chicago Open Access](https://www.artic.edu/open-access/open-access-images) (CC0) and CC0 packs on [OpenGameArt](https://opengameart.org/content/faq). These are for mood only and are never passed to a tool as a style to copy.
2. **Style anchors.** Generate 30–60 candidates from the master style block (§3) and pick **4–6 anchor images**: one hero, one tier-1 monster, one background, and one UI frame. Every later generation includes one or two anchors as reference images.
3. **Reference sheets** for each character and monster: a front / three-quarter / back turnaround, 4–6 expressions, and a palette strip with hex codes recorded in the sheet's metadata. This sheet becomes the "source of truth" reference image.
4. **Pose and state images.** Edit from the reference sheet, not from a blank prompt, to produce **idle, attack, hit, and defeated** poses (plus cast and victory for the hero). Keep the camera the same: a three-quarter view facing right.
5. **Cutout and cleanup.** Use native transparency where available, or rembg otherwise. Then do a manual pass: fix edge halos, remove stray pixels, correct palette drift to the recorded hex codes, and **delete any text or pseudo-letters**.
6. **Consistent scale.** Trim transparent borders and scale each sprite to its tier height (§4). Put the pivot at the feet (bottom-center).
7. **Texture atlases.** Pack with [free-tex-packer](https://github.com/odrick/free-tex-packer) (MIT) or [TexturePacker](https://www.codeandweb.com/texturepacker/download), exporting Phaser JSON at `@2x` and `@1x`, with pages of 2048×2048 or smaller (a judgment call for older devices).
8. **Animation.** See the table below.

| Approach | Consistency | Effort | Verdict |
|---|---|---|---|
| **Pose swap plus Phaser tweens** (breathing scale, squash-and-stretch, lunge, shake, flash, fade). Phaser tweens support ease, yoyo, repeat, and chaining ([docs](https://docs.phaser.io/phaser/concepts/tweens)). | Perfect, because every pose is an approved still | Low | **v1 default** |
| **Cut-out parts rigged in Spine or DragonBones** | High, but AI images must be split into parts and hidden areas painted in | Medium to high. Spine Professional costs $379 on sale ([Esoteric](https://esotericsoftware.com/spine-purchase)). [DragonBonesJS](https://github.com/DragonBones/DragonBonesJS) is MIT-licensed. Phaser 4 runtime support for both is **UNVERIFIED**. | Later, for bosses only |
| **Short AI-generated frame sequences** | Poor: faces, limbs, and outfits change from frame to frame | Medium, with heavy cleanup | Only for 2–4-frame effects (sparkles, poison puffs) |

**Naming convention:** `{type}_{realm|tier}_{name}_{state}_{nn}@{scale}.png`. Examples: `mon_t1_hornrabbit_attack_01@2x.png`, `chr_hero_base_idle_01@2x.png`, `bg_r4_swamp_battle@2x.png`, `ui_frame_scroll_9slice@2x.png`, `bgm_town_loop.ogg`, `sfx_hit_light_01.ogg`.

**Provenance log** (`provenance.csv`, one row per approved file): `asset_id, file, tool, model_version, date, prompt, avoid_list, seed (if exposed), reference_images, post_processing, approved_by`.

---

## 3. Prompt templates

The prompts never name artists, studios, games, or franchises; they describe visual traits only.

**Master style block (prepended to every prompt):**
> 2D chibi fantasy game art, cel-shaded with two tones (flat base color plus one hard-edged shadow), clean dark-colored outlines of even weight, soft rounded shapes, bright saturated but harmonious palette, simple readable silhouette, three-quarter view facing right, soft top-left key light, clean isolated subject, no text, no letters, no symbols.

**Character sheet:** `[STYLE] Character reference sheet of {name}: {age/role}, {2–2.5 heads tall}, {hair, eyes, outfit, props}. Front, three-quarter, and back views in a row, plus six small expression heads (happy, determined, surprised, hurt, sad, cheering). Palette: {hex list}. Plain light-grey background, even spacing.`

**Monster:** `[STYLE] {monster}, tier {1–5}. {Tier 1: round body, big shiny eyes, tiny nubs instead of fangs, pastel-bright colors, playful pose.} / {Tier 4–5: angular silhouette, spikes or horns, narrowed glowing eyes, darker palette with one vivid accent, strong rim light, imposing pose, still stylized and non-gory.} Pose: {idle/attack/hit/defeated}. Palette: {hex list}. Transparent background.`

**Background:** `[STYLE, no outlines on distant shapes] Side-view battle backdrop, {realm}, {time of day}, clear flat ground band in the lower third for characters, low detail in the center where the UI sits, soft depth haze, 16:9, no characters, no text.`

**UI element:** `[STYLE] Game UI {panel/button/frame}, parchment scroll with light ink-wash brush edges, subtle cloud motif corners, empty center, front-facing, symmetrical for 9-slice, transparent background, no text or glyphs.`

**Avoid list:** text, letters, Chinese characters, fake calligraphy, watermarks, signatures, logos, blood, gore, realistic horror, photorealism, extra limbs or fingers, cropped heads, busy backgrounds, drop shadows baked onto transparency, Japanese-specific motifs (torii, katana) in Chinese-coded areas, pentagrams or occult religious symbols.

**Filled example: horned rabbit (tier 1).**
> [STYLE] Horned rabbit, tier 1: plump round cream-white rabbit body, oversized floppy ears, one short blunt spiral horn on its forehead, big shiny black eyes, pink nose, tiny stubby paws, playful hop pose (idle). Palette #F6EFE3 fur, #E7B7C1 inner ear, #D9A441 horn, #3A2E3F outline. Transparent background. Avoid: [AVOID].

**Filled example: demon king (final boss).**
> [STYLE] Demon king, tier 5 final boss: tall triangular silhouette, heavy horned crown, flowing tattered cape, armored shoulders with angular spikes, narrowed glowing amber eyes, confident menacing grin with no visible gore, one clawed gauntlet raised casting dark-violet flame, dramatic crimson rim light. Stylized chibi proportions stretched to about 3.5 heads tall to feel imposing. Palette #1E1A2B armor, #7A1F2E cape, #C9A227 crown, #FFB347 eyes, #8E5BD6 magic. Transparent background. Avoid: [AVOID].

---

## 4. One-page style guide

| Rule | Specification |
|---|---|
| **Proportions** | Hero and NPCs are 2–2.5 heads tall (head-to-body about 1:1.2–1:1.5). Tier-1 monsters are "blob" shapes. Bosses are up to 3.5 heads tall and 2–3× the hero's height. |
| **Line weight (at 2×)** | Outer outline about 6 px; interior lines 3–4 px. Outlines are a dark hue of the local color, not pure black. Backgrounds use thin lines or none. |
| **Shading** | Two-tone cel: base color plus one hard shadow (cooler and darker), with an optional single rim highlight. No gradients on characters. |
| **Shape language** | Circles mean friendly or safe (heroes, towns, tier 1). Squares mean sturdy (goblins, armor). Triangles and spikes mean threat (late tiers, the demon king). |
| **Menace ladder** | **T1** (rabbit, bee): round, big eyes, no teeth. **T2**: small fangs, angled brows. **T3** (goblin, zombie): angular, visible teeth, muted palette. **T4** (hydra): asymmetry, spikes, glowing eyes, rim light. **T5** (demon king): triangular silhouette, dark palette with a vivid accent. Never use gore or realistic horror. |
| **Lighting** | Key light from the upper left; boss arenas add a colored rim light. |
| **Realm palettes (seed hex values)** | R1 Meadow Town `#8BD17C #F7E7A1 #6EC1E4`; R2 Honey Woods `#F2B84B #6B8E23 #FFF3C4`; R3 Goblin Crags `#8C7B6B #C98E4A #4F5D75`; R4 Hydra Marsh `#3E8E7E #A4D65E #2B3A42`; R5 Hollow Graves `#6C5B7B #9DB4C0 #2E2A3A`; R6 Demon Keep `#1E1A2B #7A1F2E #C9A227`. UI ink accents use `#2B2B2B` at low opacity. |
| **Resolution** | Base layout 1280×720, with art authored at 2× (2560×1440 backgrounds). At 1× the hero is about 200 px tall, tier 1–3 monsters 150–260 px, and bosses 400–560 px. Ship `@2x` and `@1x` atlases. |
| **Text** | **Never bake text into images.** All Chinese text, pinyin, and labels are rendered by the game using HTML and fonts, because image models garble hanzi. Leave empty space in UI art for text. |

---

## 5. Music and sound

| Tool | Loops and stems | Cost and free-tier terms |
|---|---|---|
| **Suno** | Downloads include stems (they count as one download) ([FAQ](https://help.suno.com/en/articles/13614785)). Seamless loops are not guaranteed. | Free accounts get **7 lifetime downloads**, for personal non-commercial use. Pro gets 20 per month and Premier 60 per month ([FAQ](https://help.suno.com/en/articles/13614785)). Plan prices are **UNVERIFIED**. |
| **Udio** | Downloads have reportedly been disabled since the October 2025 UMG settlement (**UNVERIFIED**, third-party reports). | Avoid for now. |
| **Google Lyria 3 Clip / 3.5** | Lyria 3 Clip is aimed at "short clips, loops, previews" of 30 seconds, output as MP3 ([docs](https://ai.google.dev/gemini-api/docs/music-generation)). | API pricing is **UNVERIFIED**. The Gemini API is 18+. |
| **ElevenLabs** (Music and Sound Effects) | Sound effects have a **seamless looping** option; clips run up to 30 seconds ([docs](https://elevenlabs.io/docs/overview/capabilities/sound-effects.mdx)). | The free plan has 10,000 credits per month; Starter is $6 per month ([pricing](https://elevenlabs.io/pricing)). Free output is non-commercial and must be attributed if published ([help](https://help.elevenlabs.io/hc/en-us/articles/13313564601361-Can-I-publish-the-content-I-generate-on-the-platform)). |
| **AIVA** | Composition-oriented; stem and MIDI export is **UNVERIFIED**. | On the free plan, use must be non-commercial, **AIVA owns the copyright**, and credit is required ([help](https://aiva.crisp.help/en/article/i-dont-understand-the-terms-of-license-1wqvh5v/)). |
| **Stable Audio** | Loops are claimed; not verified. | Pricing page failed to load: **UNVERIFIED**. |

**Recommendation.** For BGM (town, overworld, battle, boss, and a victory jingle), use **Suno**. The free plan's 7 lifetime downloads barely cover the six cues, so budget one month of Pro. Generate instrumental tracks and trim each one to a clean bar-aligned loop in an audio editor; don't expect a native loop. **Lyria 3 Clip** is the backup for short loops. For SFX (hits, UI clicks, spells, footsteps, ambient beds), use **ElevenLabs Sound Effects**, with the looping option for ambience.

**Mandarin TTS (pointer only, for the Desy/Director team to decide).** Options include Azure neural voices such as `zh-CN-XiaoxiaoNeural` ([Azure](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support)), Google Cloud `cmn-CN` Chirp 3 HD voices ([Google](https://docs.cloud.google.com/text-to-speech/docs/list-voices-and-types)), and ElevenLabs. Tone accuracy should be checked by a native speaker before any audio is used for teaching.

---

## 6. Risks and guardrails

- **Drift.** Always generate from the reference sheets and anchor images, never from blank prompts. Log every approved file. Re-anchor or train a LoRA if the art drifts.
- **Kid-appropriate content.** An adult reviews every asset before it enters the build. Keep zombies and the demon king cartoonish, with no occult symbols. The avoid list is mandatory.
- **Licensing.** The private scope keeps licensing a small concern, though restrictions such as Recraft's free-plan ownership and AIVA's free-plan copyright still apply. **If the game is ever shared publicly**, this changes: purely AI-generated works may not be copyrightable in the US ([USCO Part 2](https://www.copyright.gov/ai/Copyright-and-Artificial-Intelligence-Part-2-Copyrightability-Report.pdf)), free-tier outputs would need to be regenerated on paid plans, and platform AI-disclosure rules would apply. The provenance log makes that audit possible.
