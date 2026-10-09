# Dialogue UI (deep navy + thin gold)

All pieces are drawn in code (`tools/make_ui.py`, 4x supersampled then LANCZOS-downscaled),
so you can re-tune colours and sizes and regenerate them. `src/dialogue_mockup_ai_reference.jpg` was used
for the look only. Its characters are off-model and nothing was taken from it.

| file | size | use |
|---|---|---|
| `dialogue_panel.png` | 96x96 | 9-slice text box. Insets **24/24/24/24**. Navy `#0d1b3d` fill at 92% opacity with a soft vertical gradient and inner vignette, a 2.5 px gold `#d4a84a` border, a 1 px darker inner line, a faint inner gold hairline, concave notched corners, and 4-petal corner flourishes |
| `dialogue_nameplate.png` | 176x46 | 9-slice name tab. Insets **L30 R30 T12 B12**. Pointed ogee ends with petal studs. Stretch the width, keep the height |
| `dialogue_next_arrow.png` | 32x32 | gold "next" arrow |
| `dialogue_next_arrow_bob.png` | 64x32 | 2-frame bob strip (frame 1 is 3 px lower) |
| `dialogue_mockup.png` | 1280x720 | hero speaking (left, lit), elder listening (right, mirrored, dimmed) |
| `dialogue_mockup_speaker_right.png` | 1280x720 | elder speaking (lit, nameplate 村长 on the right), hero dimmed |

## Phaser 4 sketch
```js
const box = this.add.nineslice(50, 510, 'dialogue_panel', undefined, 1180, 190, 24, 24, 24, 24).setOrigin(0);
const plate = this.add.nineslice(80, 476, 'dialogue_nameplate', undefined, 176, 46, 30, 30, 12, 12).setOrigin(0);
// portraits: 512x512 canvases, origin bottom-centre, drawn at 360x360, bottom tucked 8 px behind the box
const left  = this.add.image(250, 518, 'hero_happy').setOrigin(0.5, 1).setDisplaySize(360, 360);
const right = this.add.image(1030, 518, 'elder_neutral').setOrigin(0.5, 1).setDisplaySize(360, 360).setFlipX(true);
right.setTint(0x8c8c8c);           // non-speaker
// add the portraits BEFORE the box so the box covers their bottom edge
this.anims.create({ key: 'next_bob', frames: this.anims.generateFrameNumbers('dialogue_next_arrow_bob'), frameRate: 3, repeat: -1 });
```
Text in the mockups: Noto Sans CJK SC. Main line 30 px white with a soft blurred shadow, pinyin 21 px pale gold,
English 18 px light grey. Name: Noto Serif CJK SC Bold 28 px. Fonts on this box are at
`/usr/share/fonts/opentype/noto/NotoSansCJK-*.ttc` and `NotoSerifCJK-*.ttc` (use face index 2 = SC).

Rebuild: `/workspace/art/portraits/.venv/bin/python tools/make_ui.py && /workspace/art/portraits/.venv/bin/python tools/make_mockup.py`
