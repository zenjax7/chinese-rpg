# Backgrounds (realms 1-2)
Bright painterly style, AI-generated (built-in image generator) with the approved style anchor as reference. Masters in `src/` (1280x720 PNG).

Game files: `<key>.png`, 1920x1080 opaque (2x the 960x540 canvas), 256-color quantized, each under 1.5 MB. JPG copies at 1280/960 are in `extra_jpg/`. See `manifest.json`.

| key | use |
|---|---|
| bg_village | village hub. Inn at left, weapon shop, item shop, temple/school at back right, gate to fields at right edge |
| bg_inn | inn / rest screen |
| bg_map_r1_starter_meadow, bg_map_r2_honeycomb_forest | road/map screens. Painted clearings along the path are where fight markers go |
| bg_battle_r1_starter_meadow, bg_battle_r2_honeycomb_forest | normal battles |
| bg_battle_r1_starter_meadow_boss, bg_battle_r2_honeycomb_forest_boss | boss battles (Rabbit King lair, Queen Bee throne room) |

Battle stages: flat floor from ~0.60 to 1.0 of the height; feet at 0.70 (prototype BASE_Y 380/540). Checked with real sprites in `preview_battle_fit_final.jpg`.

```ts
this.load.image('bg_battle_r1_starter_meadow', 'backgrounds/bg_battle_r1_starter_meadow.png');
this.add.image(W/2, H/2, 'bg_battle_r1_starter_meadow').setDisplaySize(W, H).setDepth(-10);
```
No text is baked in, so labels, markers and shop names stay in the UI layer.
