# 小龙 Xiaolong — battle sprite strips

Battle animations for 小龙 (Xiaolong), the baby golden dragon companion. Same character, palette and
painted look as the `xiaolong_*.png` dialogue portraits, in the approved bright, detailed battle style
(`art/style-anchors/APPROVED_style_bright_detailed_battle.png`).

## Files

| File | What it is |
|---|---|
| `xiaolong_battle_idle.png` | idle loop, 4 frames (1024x256) |
| `xiaolong_battle_cheer.png` | cheer / victory jump, 4 frames (1024x256) |
| `xiaolong_battle_attack.png` | fire-puff attack, 4 frames (1024x256) |
| `xiaolong_battle_hurt.png` | hurt reaction, 2 frames (512x256) |
| `manifest.json` | frame size, anchor, facing, per-state file/frames/fps/loop/hitFrame |
| `preview.png`, `preview_<state>.gif` | review aids only, not loaded by the game |

All strips are transparent PNG, horizontal, **256x256 per frame**, character **facing right**.

## Size and anchor

- Drawn height: about **120 px** including horns and tail (idle pose = 120 px; other poses 80–123 px, because the crouch and landing poses are shorter).
  The on-screen size matches across all four states.
- Anchor: **(0.5, 1.0)**, the bottom centre of the frame. The bottom of the tail/feet sits on the last pixel row (y = 255),
  and the idle body is centred on x = 128. Frames are aligned on the lower body, so the dragon only moves where the motion is intended:
  - idle: vertical bob of 0 / −3 / −5 / −3 px. The four frames use the same pose.
  - cheer: crouch → jump → top of jump with sparkles → land. The crouch and landing frames sit on the baseline; the jump frames keep the heights painted in the source sheet.
  - attack: wind-up 0, lunge +10 px, fire puff +6 px (**hitFrame 2**), recover 0. The puff stays inside the frame, so no left shift was needed.
  - hurt: flinch −8 px and leaning back 6°, then dazed with stars −4 px.

## States

| State | Frames | fps | Loop | hitFrame |
|---|---|---|---|---|
| idle | 4 | 6 | yes | – |
| cheer | 4 | 8 | no | – |
| attack | 4 | 10 | no | 2 (fire puff, 0-based) |
| hurt | 2 | 6 | no | – |

## Phaser 4

```js
// preload
this.load.spritesheet('xiaolong_idle', 'art/companions/xiaolong_battle_idle.png', { frameWidth: 256, frameHeight: 256 });
// create (repeat for cheer/attack/hurt using manifest.json)
this.anims.create({ key: 'xiaolong_idle', frames: this.anims.generateFrameNumbers('xiaolong_idle'), frameRate: 6, repeat: -1 });
const xl = this.add.sprite(x, groundY, 'xiaolong_idle').setOrigin(0.5, 1).play('xiaolong_idle');
```

## Production notes

The source sheets are AI-painted pose sheets on a flat magenta background (about #D7016E). The build:

1. Measures the background colour from the corners.
2. Removes the background with a soft edge, using the portrait keyer, and removes the magenta tint from the edges.
3. Re-keys the cheer sparkles as warm gold light.
4. Removes the painted contact shadow under the crouch and landing poses.
5. Rescales the four sheets to a common size, because they were painted at different sizes.

Scripts: `tools/cut.py`, then `tools/build.py` (helper: `tools/key.py`).

Index entry: added to [docs/README.md](../../README.md) (Art section). In the game, the strips are synced to `public/companions/`; see [asset-hooks.md](../asset-hooks.md#battle-companion-小龙-oct-9).
