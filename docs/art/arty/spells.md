# Spell art: icons, fx textures, recipes, demo

Game-ready art for the 16 spells of the Chinese-learning RPG (Phaser 4). Everything in this folder is built
from four AI-painted source sheets in `src/` by the scripts in `tools/`. Rebuild everything with one command:

```bash
bash tools/build_all.sh              # icons, fx, manifest, recipes, previews, demo video
SKIP_DEMO=1 bash tools/build_all.sh  # same without the demo video (it takes ~1-2 min)
```

`build_all.sh` creates `.venv` (Pillow, numpy, scipy) if it is missing. The demo also needs `ffmpeg` and
the Noto Sans CJK font (`/usr/share/fonts/opentype/noto/`).

## Reference frame (read this first)

* **Game frame: 1280x720.** The hero is about 230 px tall, origin bottom-centre, feet on y=420. The enemies
  stand on the same ground line at about x = 62 / 74 / 86 % of the width. The default wand tip is the hero's
  right edge, 40 % down from the top of the hero's visible body.
* **Textures are stored at 2x their size on a 960x540 frame.** `fx/manifest.json` says `displayScale: 0.5`
  (the 960x540 value) and `displayScaleByCanvas: {"960x540": 0.5, "1280x720": 0.6667}`.
  **On the 1280x720 frame draw every fx texture at `setScale(0.6667 * recipeScale)`.**
  `displayWidth`/`displayHeight` in the manifest are 960-frame pixels; multiply them by 4/3 for 1280.
* `spells_fx.json` is written for the 1280x720 frame. Wherever possible, positions are given **relative to the
  target** (anchor + offset as a fraction of the target's height, keys ending in `Rel`) or as **fractions of the
  screen** (keys ending in `Frac`). Speeds, gravity and spawn radii are px/s, px/s² and px on the 1280x720
  frame; scale them by `width / 1280` if the canvas ever changes.

## Contents

| path | what |
|---|---|
| `icons/spell_<id>.png` | 16 spell badges, 128x128 RGBA, transparent outside the gold frame |
| `icons/64/spell_<id>.png` | the same at 64x64 (LANCZOS from the source + light unsharp mask) |
| `icons/spell_locked.png`, `icons/64/spell_locked.png` | generic locked badge (desaturated frame, dimmed, no symbol) |
| `icons/preview_icons.png` | contact sheet, both sizes on navy `#0d1b3d` |
| `fx/<name>.png` | fx textures with real alpha (work with NORMAL blend) |
| `fx/add/<name>.png` | glow textures on a black background, for ADD blend |
| `fx/frozen_front.png`, `fx/frozen_back.png` | the two layers of the "frozen" ice cube (front goes over the enemy, back goes behind it) |
| `fx/dazed_ring.png` | 6-frame strip (180x84 per frame): 3 stars circling a head |
| `fx/soaked_cloud.png`, `fx/drip.png` | soaked status: small rain cloud and one drip particle |
| `fx/ember_1..4.png` | single embers cut from the ember cluster (particle textures) |
| `fx/manifest.json` | every texture: file, add_file, size, displayScale, blendMode, origin, frames; plus the `status` section |
| `fx/preview_fx.png` | every texture on a dark checker, a light checker, and (ADD files) black / (alpha files) green |
| `spells_fx.json` | one visual recipe per spell id (schema below) |
| `demo/spells_demo.mp4` | 1280x720, 30 fps, H.264 + silent AAC track, ~39 s: 11 spells played from the recipes |
| `demo/contact.png` | key frames from the demo |
| `tools/` | `build_icons.py`, `build_fx.py`, `preview_fx.py`, `build_recipes.py`, `render_demo.py`, `common.py`, `build_all.sh` |
| `src/` | the four painted source sheets (inputs, never modified) |

### fx textures (stored size; draw at 0.6667 on 1280x720)

Glow sheet (ADD recommended, both versions exist): `fireball_small`, `fireball`, `fireball_big`, `fire_impact`,
`embers`, `ember_1..4`, `bolt_small`, `bolt_tall`, `starburst`, `shooting_star`, `star_small`, `sunbeam_shaft`,
`ward_ring` (optional, see below).

Magenta sheet (NORMAL): `bubble`, `bubble_big`, `snowball`, `snow_puff`, `snowflake_small`, `snowflake_big`,
`ice_cube`, `snow_hat`, `rain_cloud`, `storm_cloud`, `grey_cloud`, `whirlwind_gust`, `leaf`, `feather`,
`tornado`, `puddle`, `drip`.

Derived: `frozen_front`, `frozen_back`, `dazed_ring` (strip), `soaked_cloud`.

Origins: projectiles use their hot core (`fireball_small`, `fireball`) or the star head (`shooting_star`).
Bolts use the strike tip at the bottom (`bolt_small`, `bolt_tall`). `sunbeam_shaft` and `tornado` use
bottom-centre, `snow_hat` uses (0.5, 0.8), and everything else uses the centre.

### Status overlays (`fx/manifest.json` → `status`)

| key | look | layer |
|---|---|---|
| `soaked` | `soaked_cloud` over the head, `drip` particles falling | front, NORMAL |
| `dazed` | `dazed_ring` strip at the head, 10 fps loop | front, NORMAL |
| `chilled` | `snow_hat` on the head + tiny `snowflake_small` drifting off | front, NORMAL |
| `frozen` | `front: frozen_front` over the enemy, `back: frozen_back` behind it, same position/scale/origin (centre); fit to 1.1x enemy height | back behind, front in front |
| `ward` | **optional**: `ward_ring` lying flat under the enemy, alpha pulse, ADD. The Magic Ward will probably be dropped, and no recipe requires it. | behind |

## ADD vs NORMAL

* `fx/add/<name>.png` keeps the black background: draw it with `setBlendMode(Phaser.BlendModes.ADD)`.
  This is the classic glow look and is best for flashes, sparks, bolts, starbursts, embers and the sunbeam,
  and on dark or tinted scenes (meteor_shower turns the sky violet).
* `fx/<name>.png` for the glow sheet was made with alpha = max(R,G,B) and colour = rgb / alpha (clamped), so it
  works with NORMAL blend too. On the **bright daytime battle backgrounds**, ADD washes solid-looking bodies
  out to white (the smiling face on `fireball_big` disappears). For that reason the recipes draw the
  *projectile bodies* (`fireball_small`, `fireball`, `fireball_big`, `shooting_star`) with NORMAL and keep ADD
  for glows and particles. The `blendMode` in a recipe overrides the manifest's general recommendation.
* Magenta-sheet textures are NORMAL only. They were soft-keyed: alpha comes from the distance to the measured
  key colour, the colour is unmixed, the key's chroma is projected out (despill), and edge colours are bled
  from opaque neighbours. Bubbles and the ice cube keep partial alpha. Checked on dark and light backgrounds:
  no pink fringe (the residual key chroma at edges is < 1 %).

## Phaser 4 loading snippet

```js
// preload()
const SPELL_IDS = ['small_fireball','bubble_spell','snowball_volley','little_lightning','fireball','whirlwind',
  'snowflake_dance','lightning','sunbeam','big_fireball','blizzard','tornado','meteor','thunderstorm',
  'super_blizzard','meteor_shower'];
const ART = 'assets/spells/';
this.load.json('fxManifest', ART + 'fx/manifest.json');
this.load.json('spellsFx', ART + 'spells_fx.json');
for (const id of SPELL_IDS) {
  this.load.image(`spell_${id}`, ART + `icons/spell_${id}.png`);        // 128 px
  this.load.image(`spell_${id}_64`, ART + `icons/64/spell_${id}.png`);  // 64 px
}
this.load.image('spell_locked', ART + 'icons/spell_locked.png');
this.load.once('filecomplete-json-fxManifest', (key, type, man) => {
  for (const [name, t] of Object.entries(man.textures)) {
    if (t.frames) {
      this.load.spritesheet(name, ART + t.file, { frameWidth: t.frameWidth, frameHeight: t.frameHeight });
    } else {
      this.load.image(name, ART + t.file);                       // alpha version (NORMAL)
      if (t.add_file) this.load.image(name + '_add', ART + t.add_file);  // black-bg version (ADD)
    }
  }
});

// create()
const man = this.cache.json.get('fxManifest');
const FX_SCALE = man.displayScaleByCanvas['1280x720'];           // 0.6667
const fx = (name, x, y, scale = 1, blend = man.textures[name].blendMode) => {
  const t = man.textures[name];
  const key = blend === 'ADD' && t.add_file ? name + '_add' : name;
  return this.add.image(x, y, key).setOrigin(t.origin.x, t.origin.y).setScale(FX_SCALE * scale)
    .setBlendMode(blend === 'ADD' ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL);
};
this.anims.create({ key: 'dazed_spin', frames: this.anims.generateFrameNumbers('dazed_ring'), frameRate: 10, repeat: -1 });
// frozen: draw the back layer first, then the enemy, then the front layer
// const back = fx('frozen_back', e.x, e.cy); back.setDepth(e.depth - 1);
// const front = fx('frozen_front', e.x, e.cy); front.setDepth(e.depth + 1);
```

Particles: every emitter in a recipe maps to `this.add.particles(x, y, textureKey, { speed: {min: speedMin,
max: speedMax}, angle: {min: angleMin, max: angleMax}, lifespan: lifespanMs, gravityY, scale: {start:
scaleStart * FX_SCALE, end: scaleEnd * FX_SCALE}, alpha: {start: alphaStart, end: alphaEnd}, rotate: {...}
from spinDegPerSec, blendMode, emitting: false })`, followed by `explode(count)` (if `emitOverMs` is 0) or a
frequency of `emitOverMs / count`.

## Recipe schema (`spells_fx.json`)

Top level: `about`, `referenceFrame` (1280x720, textureScale 0.6667, heroHeightPx 230, groundY 420, heroX/enemyX
fractions), `anchors`, `paths`, `reactions` (plain-text definitions), `flashRule`, `fizzle` ("none"), and
`spells` (16 recipes, in the order of `desy/data/spells_full.json`).

Per spell:

| field | meaning |
|---|---|
| `id`, `zh`, `en`, `element`, `town`, `tier` | from spells_full.json; tier = early (towns 2-3) / mid / finale |
| `brief` | short paraphrase of Desy's visual brief (desy/spells.md "Visual briefs for Arty") |
| `icon` | `{key, file, file64, locked}` |
| `targeting` | `{target: single / same_type / all, maxTargets, order: left_to_right, staggerMs, impactDelayMs, impactTiming}`. Target *i* (0-based, left to right) is offset by *i* x `staggerMs` |
| `cast` | `{at: wand_tip / above_hero, offsetYRel, durationMs, heroAnim, glow: {texture, scaleFrom, scaleTo, alpha, blendMode}, particles: [emitter]}` |
| `projectile` | `{texture, path: straight / arc / falls_from_sky / sweep / none, from, to, travelMs, spinDegPerSec, scaleFrom, scale, count, intervalMs, arcHeightRel, wobbleRel, impactEach, trail: emitter or null, blendMode, tint?}`. With `count` > 1 the projectiles leave `intervalMs` apart. `impactEach` = every projectile triggers the impact (otherwise only the first). `sweep` = a single ground-level traveller passing through every target (tornado) |
| `impact` | per target: `{texture or null, at: target_center / target_head / target_feet, offsetYRel, anchor (origin or bolt_tip), fitTargetHeight, scaleFrom, scaleTo, growMs, holdMs, fadeMs, alpha, spinDegPerSec, blendMode, glow, wobble, particles: [emitter], enemyReaction: {type, durationMs, hurtFrame: 5, ...}, spanFromCloud?, overlay?, popOut?}` |
| `particles` | flat index of all emitters in the recipe (phase, texture, count, blend, lifespan), for preloading and pool sizing |
| `ambient` | list of screen or scene effects, each with a `type` (below) |
| `statusOverlay` | `{key, applyAt, removeAt, manifest, textures}` or null; `status` repeats just the key |
| `flash` / `cameraFlash` | null, or `{color: "#ffffff", alpha, durationMs (< 100), count: 1, atImpact}`. Only `lightning` has one |
| `totalMs`, `totalMsFor`, `budgetMs` | length of the whole cast (computed by the script) and the budget it was checked against |
| `sound`, `notes` | optional hints |

**Emitter**: `{texture, count, speedMin, speedMax, angleMin, angleMax (deg, 0 = right, 90 = down), lifespanMs,
gravityY, scaleStart, scaleEnd, alphaStart, alphaEnd, blendMode, spinDegPerSec, emitOverMs (0 = burst),
spawnRadius, tint?}`.

**Scale**: always multiplies the texture's on-screen size at 1280x720 (stored px x 0.6667). `fitTargetHeight: k`
means "scale so the texture is k x target height", and the scale tween then multiplies that.
`spanFromCloud: true` (bolts) means "stretch the bolt so it reaches from the cloud centre to the anchor"; the
tip (origin) sits on the anchor.

**Anchors**: `wand_tip`, `above_hero` (hero top-centre + `offsetYRel` x hero height), `target_center`,
`target_head` (top of the visible body), `target_feet` (sprite origin), `air_near_target` (0.6 target heights
left of and above the target centre), `sky_upper_left_of_target` (above the screen top, 0.25 screen widths
left of the target), `hero_front_ground`.

**Ambient types**:
`tint {color, alpha, startMs, inMs, holdMs, outMs}` ·
`cloud_above_target {texture, scale, offsetYRel (from the target's top, x target height), inMs, holdMs, outMs, startMs, rain?: emitter}` ·
`puddle_under_target {texture, scale, ...envelope}` ·
`swirl_emitter {texture, count, scaleMin/Max, durationMs, fromXFrac, toXFrac, yMinFrac, yMaxFrac, swirlAmpRel (x hero height), swirlPeriodMs, spinDegPerSec}` ·
`sideways_emitter {textures[], count, direction, speedMin/Max, scaleMin/Max, yMinFrac/yMaxFrac, driftY, swirlAmpRel?, durationMs, startMs}` ·
`emblem {texture, xFrac, yFrac, scaleFrom, scaleTo, inMs, holdMs, outMs, startMs, spinDegPerSec, glow?}` ·
`cloud_bank {texture, count, scale, yFrac, fromXFrac, spreadFrac, parting, ...envelope}` ·
`twinkle_emitter {texture, count, scaleMin/Max, yMinFrac/yMaxFrac, durationMs}` ·
`background_stars {texture, count, scale, durationMs}`.

**Enemy reactions**: `hurt_shake` (hurt frame 5 + decaying shake), `shiver`, `lift_spin` (`liftRel`, `turns`,
`plopSquash`; spin like a top with scaleX = cos), `bounce`, `hop` (`hops`, `heightRel`), `freeze` (hold
`faceFrame` under the frozen overlay).

**Timing**: t = 0 is the start of the cast. Impacts happen at `cast.durationMs + impactDelayMs + travelMs
(+ k x intervalMs) + i x staggerMs`. Statuses appear when the impact ends. Casting is a free action, so the
budgets are: early spells about 1.5-2 s, mid spells 2-3 s, super_blizzard 4.2 s and meteor_shower 4.0 s
(limit 5 s). There is no fizzle effect.

**Flash safety**: there is at most one camera flash per cast. It is white only, 70 ms, never red, and only
`lightning` has one. Little Lightning and Thunderstorm use local glows instead. Thunderstorm's bolts are
420 ms apart (under 3 per second). The build script asserts these rules.

## Provenance

The four source sheets in `src/` (`icons_sheet.jpg`, `icons_fix.jpg`, `fx_glow_sheet.jpg`, `fx_alpha_sheet.jpg`)
are **AI-generated paintings**. All game files are **derived from them by script** (`tools/`): connected-
component cropping per grid cell with padding, black-to-alpha for the glow sheet, a soft chroma key for the
magenta sheet, premultiplied LANCZOS scaling, and compositing for the derived overlays. No other image
sources were used. The demo composites the existing hero, rabbit and mushroom sprites (`../sprites/`) on
`../backgrounds/bg_battle_r1_starter_meadow.png`.

Notes on the sources: the sheets are actually 1280x720 (not 1024x576). The magenta key is #F901B7, not pure
#FF00FF; the script measures it from the sheet. Badge #1 and #15 come from `icons_fix.jpg` (square badges, drawn
at 94 % so their visual weight matches the wide ones).
