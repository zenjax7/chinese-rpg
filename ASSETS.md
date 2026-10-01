# Asset hooks (backgrounds, SFX, music, word audio)

Everything is optional. Missing files keep the current placeholder look (sky, grass and emoji scene) and stay silent.
The game only requests files listed in `public/assets-manifest.json`, so nothing 404s.

## Where to put files

| Kind | Drop into | File names |
|---|---|---|
| Backgrounds | `/workspace/art/backgrounds/` | `bg_village.png`, `bg_inn.png` (optional), `bg_map_r1_starter_meadow.png`, `bg_map_r2_honeycomb_forest.png`, `bg_battle_r1_starter_meadow.png`, `bg_battle_r2_honeycomb_forest.png`, optional boss variants `bg_battle_<realm>_boss.png` |
| SFX | `/workspace/audio/sfx/` | `sfx_hit`, `sfx_miss`, `sfx_block`, `sfx_block_break`, `sfx_hurt`, `sfx_enemy_defeat`, `sfx_correct`, `sfx_wrong`, `sfx_level_up`, `sfx_gold`, `sfx_chest`, `sfx_potion`, `sfx_ui_click`, each as `.ogg` + `.mp3` |
| Music | `/workspace/audio/music/` | loops `mus_village`, `mus_battle_field`, `mus_battle_boss`; one-shot stings `stg_victory`, `stg_defeat`, each as `.ogg` + `.mp3` |
| Word audio (optional) | `/workspace/audio/vo/` | `<itemId>.mp3` and/or `.ogg` (for example `C001.mp3`). This overrides browser TTS for that word. |

- **Backgrounds:** authored at 1920x1080, opaque. The game is one 1280x720 frame (logical coordinates), rendered at 1920x1080 with camera zoom 1.5, so a 1920x1080 background is drawn 1:1 and exactly fills the frame (2/3 in frame units). The frame is scaled as a whole to fit the window, with near-black letterbox bars. The battle feet line is `BASE_Y` = 420/720 (630/1080 in the art). It sits above the fixed bottom command dock (y ≥ 464), so keep a walkable ground band around y≈560–700 of the 1080 art. Other sizes still work because they're cover-scaled around the centre.
- **Sprites:** on-screen heights are `SIZE` in `src/phaser/view.ts` (hero 230, normal 185, boss 290 frame px). Sprite sheets and file names are unchanged.
- **Map nodes:** the path on each location map is `mapNodes` in `src/data/locations.json`: 1280x720 frame coordinates, in order, `kind` = `inn` | `fight` | `gate` | `boss`, one `fight` node per path fight. If you swap a map background, move the nodes onto its painted path.
- **Fonts:** `src/fonts/*.woff2` are subsets (Noto Sans SC, Nunito, Fredoka) built by `tools/build_fonts.py`. Re-run it (needs fonttools + brotli) after adding new Chinese UI text or words, or new characters fall back to the system font.
- **Realm slug:** `r<tier>_<location name in snake_case>`, so `r1_starter_meadow` and `r2_honeycomb_forest`. A location can override it with an optional `"realm"` field in `src/data/locations.json`. Code: `realmSlug()` / `BG` in `src/assets.ts`.
- **Short names:** unprefixed audio names are accepted as aliases (`hit.ogg` becomes `sfx_hit`, `village.ogg` becomes `mus_village`, `victory.ogg` becomes `stg_victory`). If both exist, the exact name wins.
- **Loop points and volume:** add an optional `manifest.json` in `sfx/` or `music/`. Two formats are read:
  - the simple one: `{"mus_village": {"loopStart": 2.5, "loopEnd": 64.0, "volume": 0.9}}`
  - the audio team's existing one: `{"files": [{"key", "loop": true, "loop_start_s", "loop_end_s", "suggested_volume"}]}`

  With loop points set, the part from 0 to loopStart plays once as an intro, then loopStart to loopEnd loops. If there are no loop points, or they cover the whole file, the whole file loops. `volume` scales that key on top of the player's Master × Music/Effects settings.

## Rebuild

```
cd /workspace/chinese-rpg/prototype
npm run build        # prebuild: tools/sync_sprites.sh && tools/sync_assets.sh, then tsc + vite build
```

`tools/sync_assets.py` does three things:
1. It wipes and re-copies `public/bg/` and `public/audio/{sfx,music,vo}/`.
2. It writes `public/assets-manifest.json`.
3. It prints which known keys are still missing.

`npm run dev` runs the same sync (`predev`). To test with scratch files, override the source folders: `ART_BG=/tmp/x/bg AUDIO_DIR=/tmp/x/audio sh tools/sync_assets.sh`.

The dev copy on port 8795 serves `dist/`, so a rebuild updates it.

## How it's wired

- **`src/phaser/view.ts`**
  - `preload()` loads the manifest. It then loads each `bg` as an image and each sfx/music entry as `load.audio(key, [ogg, mp3])`.
  - `view.mode(mode, color, bgKeys)` shows the first background key that loaded. If none loaded, it draws the old procedural scene.
  - Phaser audio is enabled (the old `noAudio` setting is gone).
- **Backgrounds per screen:**

  | Screen | Background |
  |---|---|
  | Village hub | `bg_village` |
  | Village inn | `bg_inn`, falling back to `bg_village` |
  | Location map, word preview, practice | `bg_map_<realm>` |
  | Battle | `bg_battle_<realm>` |
  | Boss battle | `bg_battle_<realm>_boss`, falling back to `bg_battle_<realm>` |

- **`src/audio/audio.ts`** provides:
  - `playSfx(key)`
  - `playMusic(key)`, which crossfades (about 0.9 s)
  - `stopMusic()`
  - `playSting(key)`, which fades the music out and holds the next `playMusic()` until the sting ends
  - `setAudio({master, music, sfx, muted})` and `toggleMute()`, saved in localStorage under `chinese-rpg-audio-v1`

  Audio starts only after the first user gesture. On first launch that's the consent screen's Start button; after a reload it's any click or key. The 🔊/🔇 button (top right) mutes everything. Parent settings has Master/Music/Effects sliders.
- **Music:**
  - `mus_village`: village, inn, location map, word preview, practice
  - `mus_battle_field`: normal and elite battles
  - `mus_battle_boss`: boss battles
  - `stg_victory` / `stg_defeat`: end of battle (none on flee)
- **SFX events:**

  | Event | Sound |
  |---|---|
  | Your hit, including a companion hit | `sfx_hit` |
  | Missed spell (wrong answer on attack) | `sfx_miss` |
  | Enemy attack blocked | `sfx_block`, plus `sfx_hurt` if damage got through |
  | Block broken | `sfx_block_break` + `sfx_hurt` |
  | Enemy defeated | `sfx_enemy_defeat`, plus `sfx_gold` if it dropped gold |
  | Answer feedback in battle and practice | `sfx_correct` / `sfx_wrong` |
  | Level up | `sfx_level_up` |
  | Chest | `sfx_chest` |
  | Potion used (battle or items screen) | `sfx_potion` |
  | Shop purchase | `sfx_gold` |
  | Any other button | `sfx_ui_click` (answer buttons, mic and 🔊 excluded) |

- **`src/engine/voice.ts`:** `sayItem(itemId)` plays `vo/<itemId>` if the manifest lists it. Otherwise it uses browser TTS (`speechSynthesis`, zh-CN voice, rate 0.85, from `src/engine/speech.ts`). `sayBtn(id)` + `wireSayButtons(root)` render the 🔊 buttons. A button is disabled when there's no clip and no Chinese voice.
- **Debug:** `window.__proto.assets` (what the manifest listed), `window.__proto.bg` (current background key), `window.__proto.audio` (sfx/music/sting calls, unlocked flag).
