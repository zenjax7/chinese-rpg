# Audio pack – Chinese-learning RPG (Phaser 4)

All 18 sounds were **procedurally synthesized with original code** in `tools/`, using Python, numpy/scipy and ffmpeg.
No samples, no downloaded music, no online services. **The boss music uses VSCO 2 CE (CC0).** None of the melodies
imitate existing game themes; every melody and chord progression was written for this pack.

| folder | files | format |
|---|---|---|
| `sfx/` | `sfx_hit, sfx_miss, sfx_block, sfx_block_break, sfx_hurt, sfx_enemy_defeat, sfx_correct, sfx_wrong, sfx_level_up, sfx_gold, sfx_chest, sfx_potion, sfx_ui_click` | .ogg (Vorbis q6) + .mp3 128k, 44.1 kHz mono, 0.12–1.45 s, no leading silence, about −13 LUFS, true peak ≤ −1.4 dBTP |
| `music/` | `mus_village` (76.8 s), `mus_battle_field` (54.86 s), `mus_battle_boss` (58.18 s): seamless loops | .ogg + .mp3 192k, 44.1 kHz stereo, about −16 LUFS, true peak ≤ −1.5 dBTP |
| `music/` | `stg_victory` (4.6 s), `stg_defeat` (4.8 s): one-shots | same |

Manifests: `sfx/manifest.json`, `music/manifest.json`, and a combined `manifest.json`. Each entry has key, path (ogg),
path_mp3, type (`sfx`/`music`/`sting`), duration_s, samples, loop, loop_start_s/loop_end_s (music), suggested_volume,
description, and the measured LUFS/true peak. `preview.png` is a spectrogram and waveform contact sheet.

## Looping: use OGG
* The loops are **sample-accurate**. Each one is rendered 3× and the middle pass is kept, so reverb, delay and note tails
  from the end of the loop carry over into its start, exactly as they do when the loop repeats. There are no fades.
  The difference between the file's end→start wrap and a continuous render is under 1e-12.
  `loop_start_s = 0` and `loop_end_s = duration`, which is the whole file.
* **OGG Vorbis is the loop-accurate primary format.** MP3 encoding adds encoder delay and padding. ffmpeg honours the LAME
  gapless header, but many browser decoders don't, so an MP3 loop can have a tiny gap or click at the seam. The MP3s are
  only a fallback for browsers without Vorbis support (older Safari/iOS). Keep the ogg first in the URL list.

## Phaser 4 usage
```js
// preload()
const SFX = ['sfx_hit','sfx_miss','sfx_block','sfx_block_break','sfx_hurt','sfx_enemy_defeat','sfx_correct',
             'sfx_wrong','sfx_level_up','sfx_gold','sfx_chest','sfx_potion','sfx_ui_click'];
SFX.forEach(k => this.load.audio(k, [`audio/sfx/${k}.ogg`, `audio/sfx/${k}.mp3`]));
['mus_village','mus_battle_field','mus_battle_boss','stg_victory','stg_defeat']
  .forEach(k => this.load.audio(k, [`audio/music/${k}.ogg`, `audio/music/${k}.mp3`]));
// or load audio/sfx/manifest.json + audio/music/manifest.json and loop over files[] (key, path, path_mp3, suggested_volume)

// create()
this.sound.play('sfx_hit', { volume: 0.9 });          // one-shot SFX
this.sound.play('sfx_correct', { volume: 0.7 });

// music: loop the whole file
this.music?.stop();
this.music = this.sound.add('mus_village', { loop: true, volume: 0.55 });
this.music.play();

// battle -> victory sting
this.music.stop();
this.sound.play('stg_victory', { volume: 0.6 });      // one-shot, no loop
this.sound.once('complete', () => { /* back to the village music */ });
```
Suggested volumes are listed in the manifests: SFX 0.5–0.9, music 0.5–0.55, stings 0.55–0.6. Browsers block audio until
the first user input, so start music after a click or tap (Phaser unlocks the audio context automatically on that input).

## Provenance
* **Procedurally synthesized with original code:** `tools/dsp.py` (oscillators, ADSR, filters, Karplus-Strong, FM,
  convolution reverb, ping-pong delay, true-peak limiter, loudness), `tools/make_sfx.py` (all SFX),
  `tools/music_engine.py` (multi-track sequencer + instruments: guzheng-like plucked string, dizi-like flute, pads, strings,
  brass, choir, FM e-piano/glockenspiel, synth basses, square lead, and synthesized kick/snare/hat/clap/toms/taiko/woodblock/
  shaker/crash/gong), `tools/make_music.py` (the compositions), `tools/check_audio.py` (ffprobe/ffmpeg verification,
  manifests, preview).
* Third-party / CC0 samples: **none**.
* Tools: numpy, scipy, pyloudnorm, and matplotlib (for the preview only) in `/workspace/audio/.venv`. Encoding uses ffmpeg
  (libvorbis, libmp3lame).

## Re-rendering / tweaking
```bash
cd /workspace/audio/tools && ./build_all.sh          # everything (~1.5 min)
../.venv/bin/python make_sfx.py hit gold             # individual SFX (names without the sfx_ prefix)
../.venv/bin/python make_music.py mus_village        # individual track
../.venv/bin/python check_audio.py                   # re-verify, rewrite manifests + preview.png
```
Melodies are plain text in `make_music.py`, e.g. `"F#5:1 E5:.5 D5:.5 ..."` (note:beats), so they are easy to change.
Track gains, pans and reverb/delay sends are set in each `s.track(...)` line.
Loudness: SFX use a two-pass loop. The encoded ogg and mp3 are measured with ffmpeg `loudnorm` (0.5 s of silence appended so
sub-400 ms clips can be measured), a linear gain correction and a true-peak limiter are applied, and the loop repeats until
−13 ±0.5 LUFS and < −1.2 dBTP. For music, the gain is set to −16 LUFS with a circular (loop-aware) true-peak limiter at
−2 dBTP, and the result is verified with ffmpeg afterwards. 16-bit WAV masters are kept in `masters/`.
