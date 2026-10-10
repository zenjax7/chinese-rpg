# Dialogue portraits (Fire Emblem style)

9 characters x 5 expressions, cut from the painted sheets in `src_sheets/` (1280x720 each, 5 busts per row:
neutral, happy, sad, angry, surprised). No repainting was done. Everything comes from the source sheets.

## Files
- `<id>/<expression>.png`: 512x512 RGBA. Expressions: `neutral | happy | sad | angry | surprised`.
- `<id>/sheet.png`: 2560x512 strip of 5 frames of 512x512 in the order above. Load it as a spritesheet with frameWidth/frameHeight 512.
- `manifest.json`: characters, names (zh/en), expressions, frame size, facing, files, content bbox, and the suggested display size.
- `preview_all.png`: every character and expression on navy `#0d1b3d`.
- `tools/`: the full pipeline (`tools/run_all.sh`). Intermediates go to `_work/`, which you can delete.

Ids: hero, elder, merchant, guard, kid, bandit, villager, innkeeper, granny.

## Facing and mirroring
**Every portrait faces RIGHT** (three-quarter view), so the left-side speaker uses it as is.
**Right-side speakers are mirrored in-engine with `setFlipX(true)`.** Mirrored PNGs are not shipped.

## Placement rules
- Origin is **bottom-centre** (`setOrigin(0.5, 1)`). The chest cut is flat and flush with the canvas bottom edge (row 511 is opaque).
- All 5 expressions of a character use **one** transform (registered to neutral and cut at a shared bottom line), so swapping expressions doesn't make the bust jump. Head position varies by about 2-4 px between expressions, which is how the art was painted.
- The scale differs per character, so the head (top of skull or hair mass to chin) is about **205 px** in every 512 canvas. Buns, topknots, helmets and the spear stick up above that. The kid is a child, so the kid's body is smaller.
- Suggested display: draw the canvas at **360x360** (scale 0.703). Visible busts are then about 280-335 px tall (target about 300) in the 1280x720 frame. Tuck the bottom about 8 px behind the dialogue box's top border.
- Non-speaker: darken it (the mockup uses brightness x0.55 and saturation x0.75; `setTint(0x8c8c8c)` comes close).

## Processing
The chroma key uses green-excess (or magenta-excess for the innkeeper) with smoothstep soft edges. Despill runs only within a few px of the edge and is guided by the nearest interior colour, so the jade hairpin and the teal cloaks keep their colour. Dark green-tinted outline pixels are pulled back to brown. Edge pixel colour is bled from the interior.
Busts that touch at the shoulders (elder, merchant, innkeeper) are separated along a min-cost seam that follows the dark outline between them. Then the largest component is kept, plus strands within 20 px.
Upscaling uses LANCZOS (x1.15-1.33) followed by a light unsharp mask (r1.4, 55%).
