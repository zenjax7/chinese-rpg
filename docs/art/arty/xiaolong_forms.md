# 小龙 Xiaolong — fledgling and grown forms

Jack approved the design drafts (`draft_fledgling_v2.png`, `draft_grown_v2.png`) and the battle
scale in `compare_forms_v1.jpg` on 2026-11-20. These are the full production sets, matching the
hatchling's layout, palette, facing, and paint style. The hatchling set remains the R1–R3 form.

GameDev swaps portrait + battle + map fly from a story flag:

| Form | When it is used |
|---|---|
| Hatchling (`xiaolong_*`) | Realms 1–3 |
| Fledgling (`xiaolong_fledgling_*`) | From R4 (Goblin Caves) until his mother is freed |
| Grown (`xiaolong_grown_*`) | After his mother is freed in R9, **and** in the ending where he flies the hero home |

The Friendship team attack does not change with the form.

## Dialogue portraits

512×768 RGBA PNG, plus WebP. `mirror: true`, `anchorY`: 230, default expression `neutral`.
Name in the json: 小龙 / Little Dragon.

Expressions (9): neutral, happy, sad, surprised, angry, worried, thinking, hungry, brave.

- `/workspace/art/portraits/xiaolong_fledgling.portrait.json`
- `/workspace/art/portraits/xiaolong_fledgling_{neutral,happy,sad,surprised,angry,worried,thinking,hungry,brave}.png` (and `.webp`)
- `/workspace/art/portraits/xiaolong_grown.portrait.json`
- `/workspace/art/portraits/xiaolong_grown_{...}.png` (and `.webp`)

## Battle strips

Transparent PNG, 256×256 frames, origin (0.5, 1.0), facing right (engine flips for left).
On-screen body height is locked to the approved scale vs the hero's 206 px opaque idle height:

- Fledgling: **0.66×** ≈ **136 px**
- Grown: **0.72×** ≈ **148 px**

Feet / tail sit on the last pixel row (y = 255). Idle body is centred on x = 128.

| State | File | Frames | Size | fps | Loop | Notes |
|---|---|---|---|---|---|---|
| idle | `xiaolong_<form>_battle_idle.png` | 4 | 1024×256 | 6 | yes | vertical bob 0 / −3 / −5 / −3, same pose |
| cheer | `xiaolong_<form>_battle_cheer.png` | 4 | 1024×256 | 8 | no | crouch → jump → sparkles at the top → land |
| attack | `xiaolong_<form>_battle_attack.png` | 4 | 1024×256 | 10 | no | wind-up, lunge, fire puff, recover. **hitFrame 2** (0-based). Puff stays inside the frame. Offsets 0 / +10 / +6 / 0 px. |
| hurt | `xiaolong_<form>_battle_hurt.png` | 2 | 512×256 | 6 | no | flinch (lean back), then dazed with stars |

Files live in `/workspace/art/companions/`. See `manifest.json` keys `xiaolong_fledgling` and `xiaolong_grown`.

## Map fly

`xiaolong_<form>_map_fly.png` in `/workspace/art/map_sprites/` — 512×128 = 4 × 128×128, `fly` 0–3 @ 8 fps, loop, right-facing (flip for left).
Wings change between frames. Body bob 0 / −5 / −10 / −5 px is baked in. Body bottom at y=118 in frame 0 (origin 0.5, 0.92).
Authored at 2× for sharp 2× zoom. Grown is slightly larger than the hatchling; both stay in the 0.60–0.75× hero band on the map (the 128 px frame plus the −10 px bob caps how tall they can be — about 0.63× fledgling, 0.66× grown). There is no grounded walk cycle.

## Previews (review only, not loaded by the game)

`/workspace/art/companions/xiaolong_forms_drafts/preview/` — portrait grids, strip sheets, and GIFs of idle / cheer / attack / hurt / map fly.

## Provenance

AI-painted original sheets on flat magenta chroma (~#D7016E), from the approved form drafts and the existing hatchling portraits, battle strips, and map fly. Keyed, sliced, scaled, and aligned with the same pipeline as the hatchling. No third-party references and no living-artist prompts.
