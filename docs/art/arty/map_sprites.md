# Map walking sprites: Hero and Xiaolong

Final, approved by Jack 2026-10-18 (draft v3, wingbeat as is). Used on the graph map (`src/ui/graph.ts`) instead of the scaled-down battle idle frame.

| key | file | frames | animation | facing |
|---|---|---|---|---|
| `hero_map_walk` | `hero_map_walk.png` (512x128) | 4 x 128x128 | `walk` 0-3 @ 8 fps, loop; `idle` = frame 1 | right (flip for left) |
| `xiaolong_map_fly` | `xiaolong_map_fly.png` (512x128) | 4 x 128x128 | `fly` 0-3 @ 8 fps, loop | right (flip for left) |

* **Hero:** big stride, high-knee pass, mirrored stride, pass, with the body bob drawn in. The feet sit on the baseline at y=124 (origin 0.5, 0.97).
* **Xiaolong:** gold, matching the portrait and battle art. The wings change a little between frames, and a body bob of 0/-5/-10/-5 px is baked into the frames. Body bottom is at y=118 in frame 0 (origin 0.5, 0.92).
* **Display size:** the hero at 64 px (48 px on dense maps). Xiaolong at about 0.6x the hero's size, drawn behind and above him on the trailing side. Frames are authored at 2x so they stay sharp at 2x zoom.
* **Files:** both strips and `manifest.json` (Phaser spritesheet fields) are in `/workspace/art/map_sprites/`. `preview_map_sprites.gif` shows them at 64 px, 48 px and 128 px.
* **Provenance:** AI-generated original art, made from the project's own hero and Xiaolong references on a magenta chroma background, then keyed and sliced. No third-party references.
