# mus_battle_boss: boss battle music (FINAL)

**Status: FINAL. Approved by Jack 2026-10-17.** This is battle music draft v5, boss theme, used unchanged.
Repo path for this note: `docs/art/arty/mus_battle_boss.md`.

| | |
|---|---|
| Game files | `audio/music/mus_battle_boss.ogg` (primary, loop-accurate), `audio/music/mus_battle_boss.mp3` (fallback) |
| Master | `audio/masters/music/mus_battle_boss.wav` (16-bit, 44.1 kHz, stereo) |
| Length | 83.333 s = 2-bar intro (3.333 s) + 48-bar loop (80.000 s), 3 675 000 samples |
| Loop points | **loopStart 3.333333 s (sample 147 000), loopEnd 83.333333 s (sample 3 675 000)** = end of file |
| Tempo / key | 144 bpm, 4/4, D minor |
| Loudness | −14.1 LUFS integrated (ogg; mp3 −14.3), true peak −1.4 dBTP ogg / −1.8 dBTP mp3, no clipping |
| Suggested volume | 0.5 |
| Previous version | `audio/music/_old/mus_battle_boss.ogg/.mp3` (procedural, 132 bpm, whole-file loop). Kept, not deleted. |

## Source
* **Piece:** Johann Sebastian Bach, *Toccata and Fugue in D minor*, **BWV 565**. The composition is public domain.
* **Score used:** Mutopia Project **Mutopia-2011/09/11-1780**, engraved from the Bach-Gesellschaft Ausgabe (1867).
  * The Mutopia entry is marked **Public Domain**.
  * The notes were written into the build script by hand. The Mutopia MIDI was only used to check the quotes note by
    note.
  * No recording of any performance was used or sampled.
* **Passages quoted, exactly as in the score:**
  * **Toccata m. 1–2:** the opening figure in its three statements (A–G–A … G F E D C# D, at 8va, at pitch and two
    octaves down), then the diminished 7th C#–E–G–Bb over the D pedal resolving to D major.
    * Written values are doubled. The two fermata notes are held, in tempo.
    * The ornament on the first A is played A–G–A.
  * **Toccata m. 4–5:** the *Prestissimo* triplet-16th figure (D E C# ×3 D E | F G E ×3 F G | A Bb G ×3 A).
  * **Fugue subject, m. 30–32:** 16th notes over the repeated A, starting on the 2nd 16th of beat 3.
  * **Fugue answer, m. 32–34:** the subject a 4th up, in G minor.

## Arrangement (original)
Everything except the quoted lines is newly written: harmony, countersubject, codetta, episode, bridge, bass, drums,
timpani, orchestration and mix.

| Bars (from loopStart) | Time | Section |
|---|---|---|
| intro | 0.000 s | Church organ + string tremolo chord, low D hit, timpani roll; chromatic rise A–Bb–B–C# into the loop |
| 1–8 | 3.333 s | **Toccata:** the opening figure ×3 (rock organ + distortion guitar, low statement on organ, guitar and trombone), diminished 7th → D major (trumpet accent), *Prestissimo* runs |
| 9–16 | 16.667 s | **Fugue exposition:** subject (organ), answer (distortion guitar) against an original organ countersubject, subject again (organ + guitar), original codetta |
| 17–24 | 30.000 s | Subject in the bass (bass, contrabass, rhythm guitar), answer on trombone/guitar/horns, original counter-line and 16th-note episode |
| 25–32 | 43.333 s | **Original bridge melody** on distortion guitar, horns in harmony, organ stabs |
| 33–40 | 56.667 s | Toccata return, bigger: church organ + horns added |
| 41–48 | 70.000 s | Subject, answer, countersubject, original finale run → C#dim7 → A7 → back to bar 1 |

* **Rhythm:** sampled timpani is the main driver, playing a 3+3+2 8th-note ostinato on root and fifth that follows the
  chords, with a quiet low-tom layer on the accents. On top of that: driving 8th/16th bass licks with anticipations,
  power-chord rhythm guitar, and a sparse kit (ride in the bridge).
* **Brass:** horns and trombone support. Trumpet appears only in the two D-major toccata hits and bars 46–47.
* **Checks at approval:**
  * Every quoted statement matches the Mutopia score in pitch and rhythm.
  * No lead note is out of key, no unresolved non-chord tones, and no sustained clashes between parts.
  * Organ tuning is within 1.3 cents.
  * Timpani muted vs on: −6.0 dB in the 60–200 Hz band.
  * Full report: `audio/drafts/battle_v5/src/verify_report.txt`.

## Production, samples and licences
* **Built by:** `audio/drafts/battle_v5/src/compose_battle_v5.py`.
  * GM parts are rendered with FluidSynth 2.4.4 (reverb/chorus off). VSCO parts use `src/vsco_sampler.py`.
  * Mix and master are numpy: compressor + 4× oversampled true-peak limiter, then normalised to −14 LUFS.
* **Samples:**
  * **VSCO 2 Community Edition** (Versilian Studios, github.com/sgossner/VSCO-2-CE, commit 4403009): **CC0 1.0**.
    Used for timpani, trumpet, French horns and trombone. The library readme asks for credit to Versilian Studios and
    no resale of the raw samples. Credit is optional under CC0, but suggested for the credits screen.
  * **FluidR3_GM.sf2** (Frank Wen): **MIT**. Used for rock and church organ, distortion and rhythm guitars, strings,
    tremolo strings, tuba, electric and contrabass, drums and the low-tom layer.
* **No recordings, no CC-BY-SA material, no unknown-licence files.**
* **The audio-pack README is now out of date.** `audio/README.md` still says "No CC0 or third-party samples are used".
  This track uses CC0 and MIT samples and needs its own provenance line.
* **Don't run `tools/build_all.sh` as it stands.** It re-renders the old procedural `mus_battle_boss` with
  `tools/make_music.py` and would overwrite this file. Its `check_audio.py` step also rewrites `music/manifest.json`
  with `loop_start_s = 0`. Remove `mus_battle_boss` from that script first.

## Looping in the game (Phaser 4)
The file has a 3.333 s intro. Play it once, then loop only loopStart → loopEnd:
```js
const boss = this.sound.add('mus_battle_boss', { volume: 0.5 });
boss.addMarker({ name: 'intro', start: 0, duration: 3.333333 });
boss.addMarker({ name: 'loop', start: 3.333333, duration: 80.0, config: { loop: true } });
boss.once('complete', () => boss.play('loop'));   // fires when the intro marker ends
boss.play('intro');
```
* Use the OGG first. MP3 encoder padding can shift the loop by a few ms in some browsers.
* If a marker switch ever leaves an audible gap, a plain whole-file `loop: true` also works musically. The A7 at the
  end leads into the D-minor intro hit, but the 3.3 s intro then plays again on every pass.
