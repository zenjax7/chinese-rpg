# Batch 1 battle sprites

Frames per sheet (horizontal strip, 7 frames): 0-1 idle, 2-4 attack (wind-up, strike, recover), 5-6 hurt (pose, flash).
Hero/normal enemies 256x256, bosses (rabbitking, queenbee) 384x384. Origin (0.5, 0.92) = feet baseline; flyers hover with body center at 55%.
Enemies face LEFT, hero faces RIGHT.

## Phaser 4 loading

```js
// preload()
this.load.json('spriteManifest', 'art/sprites/manifest.json');
this.load.once('filecomplete-json-spriteManifest', (key, type, m) => {
  for (const [id, s] of Object.entries(m)) {
    this.load.spritesheet(id, `art/sprites/${s.file}`, { frameWidth: s.frameWidth, frameHeight: s.frameHeight });
  }
});

// create()
const m = this.cache.json.get('spriteManifest');
for (const [id, s] of Object.entries(m)) {
  for (const [anim, a] of Object.entries(s.animations)) {
    this.anims.create({ key: `${id}_${anim}`, frames: this.anims.generateFrameNumbers(id, { start: a.start, end: a.end }),
                        frameRate: a.frameRate, repeat: a.repeat });
  }
}
const hero = this.add.sprite(200, 400, 'hero').setOrigin(m.hero.origin.x, m.hero.origin.y).play('hero_idle');
hero.play('hero_attack'); hero.once('animationcomplete', () => hero.play('hero_idle'));
```

## Provenance

### hero
- `src_sheets/hero.png` — tool: built-in image generator (GenerateImage), date: 2026-09-28, attempt 1, refs: style-anchors/APPROVED_style_bright_detailed_battle.png, refsheets/hero_v1.png
  - prompt: 5-pose animation sheet (idle, attack wind-up, strike, recover, hurt) of the same character on a flat chroma background, generated from the single idle base (src/hero/_single_idle_base.png), which itself was generated from the approved style anchor. Full prompts are in tools/BATCH1_PROMPTS.md (sheet variant).
  - notes: Frames sliced with tools/slice_sheets.py; idle frame 2 = programmatic breathing squash; hurt frame 2 = flash tint.
- programmatic (PIL): idle2 breathing squash if no generated idle2; hurt_flash = hurt + 55% white tint; chroma key + despill; alignment/scale.

### rabbit
- `src_sheets/rabbit.png` — tool: built-in image generator (GenerateImage), date: 2026-09-28, attempt 1, refs: style-anchors/APPROVED_style_bright_detailed_battle.png
  - prompt: 5-pose animation sheet (idle, attack wind-up, strike, recover, hurt) of the same character on a flat chroma background, generated from the single idle base (src/rabbit/_single_idle_base.png), which itself was generated from the approved style anchor. Full prompts are in tools/BATCH1_PROMPTS.md (sheet variant).
  - notes: Frames sliced with tools/slice_sheets.py; idle frame 2 = programmatic breathing squash; hurt frame 2 = flash tint.
- programmatic (PIL): idle2 breathing squash if no generated idle2; hurt_flash = hurt + 55% white tint; chroma key + despill; alignment/scale.

### mushroom
- `src_sheets/mushroom.png` — tool: built-in image generator (GenerateImage), date: 2026-09-28, attempt 1, refs: style-anchors/APPROVED_style_bright_detailed_battle.png
  - prompt: 5-pose animation sheet (idle, attack wind-up, strike, recover, hurt) of the same character on a flat chroma background, generated from the single idle base (src/mushroom/_single_idle_base.png), which itself was generated from the approved style anchor. Full prompts are in tools/BATCH1_PROMPTS.md (sheet variant).
  - notes: Frames sliced with tools/slice_sheets.py; idle frame 2 = programmatic breathing squash; hurt frame 2 = flash tint.
- programmatic (PIL): idle2 breathing squash if no generated idle2; hurt_flash = hurt + 55% white tint; chroma key + despill; alignment/scale.

### rabbitking
- `src_sheets/rabbitking.png` — tool: built-in image generator (GenerateImage), date: 2026-09-28, attempt 2, refs: style-anchors/APPROVED_style_bright_detailed_battle.png
  - prompt: 5-pose animation sheet (idle, attack wind-up, strike, recover, hurt) of the same character on a flat chroma background, generated from the single idle base (src/rabbitking/_single_idle_base.png), which itself was generated from the approved style anchor. Full prompts are in tools/BATCH1_PROMPTS.md (sheet variant).
  - notes: Frames sliced with tools/slice_sheets.py; idle frame 2 = programmatic breathing squash; hurt frame 2 = flash tint.
- programmatic (PIL): idle2 breathing squash if no generated idle2; hurt_flash = hurt + 55% white tint; chroma key + despill; alignment/scale.

### bee
- `src_sheets/bee.png` — tool: built-in image generator (GenerateImage), date: 2026-09-28, attempt 1, refs: style-anchors/APPROVED_style_bright_detailed_battle.png
  - prompt: 5-pose animation sheet (idle, attack wind-up, strike, recover, hurt) of the same character on a flat chroma background, generated from the single idle base (src/bee/_single_idle_base.png), which itself was generated from the approved style anchor. Full prompts are in tools/BATCH1_PROMPTS.md (sheet variant).
  - notes: Frames sliced with tools/slice_sheets.py; idle frame 2 = programmatic breathing squash; hurt frame 2 = flash tint.
- programmatic (PIL): idle2 breathing squash if no generated idle2; hurt_flash = hurt + 55% white tint; chroma key + despill; alignment/scale.

### spider
- `src_sheets/spider.png` — tool: built-in image generator (GenerateImage), date: 2026-09-28, attempt 1, refs: style-anchors/APPROVED_style_bright_detailed_battle.png
  - prompt: 5-pose animation sheet (idle, attack wind-up, strike, recover, hurt) of the same character on a flat chroma background, generated from the single idle base (src/spider/_single_idle_base.png), which itself was generated from the approved style anchor. Full prompts are in tools/BATCH1_PROMPTS.md (sheet variant).
  - notes: Frames sliced with tools/slice_sheets.py; idle frame 2 = programmatic breathing squash; hurt frame 2 = flash tint.
- programmatic (PIL): idle2 breathing squash if no generated idle2; hurt_flash = hurt + 55% white tint; chroma key + despill; alignment/scale.

### queenbee
- `src_sheets/queenbee.png` — tool: built-in image generator (GenerateImage), date: 2026-09-28, attempt 1, refs: style-anchors/APPROVED_style_bright_detailed_battle.png
  - prompt: 5-pose animation sheet (idle, attack wind-up, strike, recover, hurt) of the same character on a flat chroma background, generated from the single idle base (src/queenbee/_single_idle_base.png), which itself was generated from the approved style anchor. Full prompts are in tools/BATCH1_PROMPTS.md (sheet variant).
  - notes: Frames sliced with tools/slice_sheets.py; idle frame 2 = programmatic breathing squash; hurt frame 2 = flash tint.
- programmatic (PIL): idle2 breathing squash if no generated idle2; hurt_flash = hurt + 55% white tint; chroma key + despill; alignment/scale.

### wolf_pup
- `src_sheets/wolf_pup.png` — tool: built-in image generator (GenerateImage), date: 2026-09-28, attempt 1, refs: style-anchors/APPROVED_style_bright_detailed_battle.png
  - prompt: 5-pose animation sheet (idle, wind-up, strike, recover, hurt) of wolf_pup from Desy's art_brief, adapted to Jack's middle-ground tone (fun details, clearly hostile), flat chroma background.
  - notes: Sliced with tools/slice_sheets.py.
- programmatic (PIL): idle2 breathing squash if no generated idle2; hurt_flash = hurt + 55% white tint; chroma key + despill; alignment/scale.

### swift_horned_rabbit
- `src_sheets/swift_horned_rabbit.png` — tool: built-in image generator (GenerateImage), date: 2026-09-28, attempt 1, refs: style-anchors/APPROVED_style_bright_detailed_battle.png
  - prompt: 5-pose animation sheet (idle, wind-up, strike, recover, hurt) of swift_horned_rabbit from Desy's art_brief, adapted to Jack's middle-ground tone (fun details, clearly hostile), flat chroma background.
  - notes: Sliced with tools/slice_sheets.py.
- programmatic (PIL): idle2 breathing squash if no generated idle2; hurt_flash = hurt + 55% white tint; chroma key + despill; alignment/scale.

### big_beak_crow
- `src_sheets/big_beak_crow.png` — tool: built-in image generator (GenerateImage), date: 2026-09-28, attempt 1, refs: style-anchors/APPROVED_style_bright_detailed_battle.png
  - prompt: 5-pose animation sheet (idle, wind-up, strike, recover, hurt) of big_beak_crow from Desy's art_brief, adapted to Jack's middle-ground tone (fun details, clearly hostile), flat chroma background.
  - notes: Sliced with tools/slice_sheets.py.
- programmatic (PIL): idle2 breathing squash if no generated idle2; hurt_flash = hurt + 55% white tint; chroma key + despill; alignment/scale.

### big_grey_wolf
- `src_sheets/big_grey_wolf.png` — tool: built-in image generator (GenerateImage), date: 2026-09-28, attempt 1, refs: style-anchors/APPROVED_style_bright_detailed_battle.png
  - prompt: 5-pose animation sheet (idle, wind-up, strike, recover, hurt) of big_grey_wolf from Desy's art_brief, adapted to Jack's middle-ground tone (fun details, clearly hostile), flat chroma background.
  - notes: Sliced with tools/slice_sheets.py.
- programmatic (PIL): idle2 breathing squash if no generated idle2; hurt_flash = hurt + 55% white tint; chroma key + despill; alignment/scale.

### sapling_sprite
- `src_sheets/sapling_sprite.png` — tool: built-in image generator (GenerateImage), date: 2026-09-28, attempt 1, refs: style-anchors/APPROVED_style_bright_detailed_battle.png
  - prompt: 5-pose animation sheet (idle, wind-up, strike, recover, hurt) of sapling_sprite from Desy's art_brief, adapted to Jack's middle-ground tone (fun details, clearly hostile), flat chroma background.
  - notes: Sliced with tools/slice_sheets.py.
- programmatic (PIL): idle2 breathing squash if no generated idle2; hurt_flash = hurt + 55% white tint; chroma key + despill; alignment/scale.

### royal_guard_bee
- `src_sheets/royal_guard_bee.png` — tool: built-in image generator (GenerateImage), date: 2026-09-28, attempt 1, refs: style-anchors/APPROVED_style_bright_detailed_battle.png
  - prompt: 5-pose animation sheet (idle, wind-up, strike, recover, hurt) of royal_guard_bee from Desy's art_brief, adapted to Jack's middle-ground tone (fun details, clearly hostile), flat chroma background.
  - notes: Sliced with tools/slice_sheets.py.
- programmatic (PIL): idle2 breathing squash if no generated idle2; hurt_flash = hurt + 55% white tint; chroma key + despill; alignment/scale.

### greedy_bear
- `src_sheets/greedy_bear.png` — tool: built-in image generator (GenerateImage), date: 2026-09-28, attempt 1, refs: style-anchors/APPROVED_style_bright_detailed_battle.png
  - prompt: 5-pose animation sheet (idle, wind-up, strike, recover, hurt) of greedy_bear from Desy's art_brief, adapted to Jack's middle-ground tone (fun details, clearly hostile), flat chroma background.
  - notes: Sliced with tools/slice_sheets.py.
- programmatic (PIL): idle2 breathing squash if no generated idle2; hurt_flash = hurt + 55% white tint; chroma key + despill; alignment/scale.

### worker_bee
- `src_sheets/worker_bee.png` — tool: built-in image generator (GenerateImage), date: 2026-09-28, attempt 2, refs: style-anchors/APPROVED_style_bright_detailed_battle.png
  - prompt: 5-pose animation sheet (idle, wind-up, strike, recover, hurt) of worker_bee from Desy's art_brief, adapted to Jack's middle-ground tone (fun details, clearly hostile), flat chroma background.
  - notes: Sliced with tools/slice_sheets.py.
- programmatic (PIL): idle2 breathing squash if no generated idle2; hurt_flash = hurt + 55% white tint; chroma key + despill; alignment/scale.
