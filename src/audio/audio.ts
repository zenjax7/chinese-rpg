// Game audio: SFX, looping music with crossfade, one-shot stings, persisted volume/mute.
// Plays through Phaser's sound manager (audio keys are loaded by src/phaser/view.ts from assets-manifest.json as [ogg, mp3] pairs).
// Anything not delivered yet is simply silent. Music waits for the first user gesture (browser autoplay policy);
// the consent screen's Start button is the natural unlock point on first launch, any click/key after a reload.
import type Phaser from 'phaser';
import { assets } from '../assets';

export type SfxKey = 'sfx_hit' | 'sfx_miss' | 'sfx_block' | 'sfx_block_break' | 'sfx_hurt' | 'sfx_enemy_defeat' | 'sfx_correct' | 'sfx_wrong'
  | 'sfx_level_up' | 'sfx_gold' | 'sfx_chest' | 'sfx_potion' | 'sfx_ui_click';
export type MusicKey = 'mus_village' | 'mus_battle_field' | 'mus_battle_boss';
export type StingKey = 'stg_victory' | 'stg_defeat';

const LS = 'chinese-rpg-audio-v1';
export interface AudioSettings { master: number; music: number; sfx: number; muted: boolean; }
const DEFAULTS: AudioSettings = { master: 0.8, music: 0.6, sfx: 0.9, muted: false };
function load(): AudioSettings { try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(LS) || '{}') }; } catch { return { ...DEFAULTS }; } }
const cfg: AudioSettings = load();
const listeners: (() => void)[] = [];
export const audioSettings = (): Readonly<AudioSettings> => cfg;
export function onAudioSettings(f: () => void) { listeners.push(f); }
export function setAudio(p: Partial<AudioSettings>) {
  Object.assign(cfg, p);
  for (const k of ['master', 'music', 'sfx'] as const) cfg[k] = Math.max(0, Math.min(1, +cfg[k] || 0));
  try { localStorage.setItem(LS, JSON.stringify(cfg)); } catch { /* private mode */ }
  applyVolumes(); listeners.forEach(f => f());
}
export const toggleMute = () => setAudio({ muted: !cfg.muted });

let mgr: Phaser.Sound.BaseSoundManager | null = null;
let scene: Phaser.Scene | null = null;
let unlocked = false;
let want: MusicKey | null = null;           // music the current screen asked for
let cur: { key: MusicKey; snd: Phaser.Sound.BaseSound } | null = null;
let sting: Phaser.Sound.BaseSound | null = null;
const dbg = () => ((window as any).__proto = (window as any).__proto || {}, (window as any).__proto.audio = (window as any).__proto.audio || { sfx: [], music: [], stings: [] });

const musicVol = (key: string) => (cfg.muted ? 0 : cfg.master * cfg.music * (assets().music[key]?.volume ?? 1));
const sfxVol = (key: string) => (cfg.muted ? 0 : cfg.master * cfg.sfx * (assets().sfx[key]?.volume ?? 1));
const loaded = (key: string) => !!scene && scene.cache.audio.exists(key);

/** Called by the Phaser scene once audio files are loaded. */
export function attachSound(s: Phaser.Scene) { scene = s; mgr = s.sound; if (unlocked) startWanted(); }
/** Call from a user-gesture handler (consent Start button, or the first click/key). Safe to call repeatedly. */
export function unlockAudio() {
  if (unlocked) return; unlocked = true; dbg().unlocked = true;
  const m: any = mgr;
  if (m?.locked) m.once('unlocked', startWanted); else startWanted();
}
if (typeof document !== 'undefined') {
  const once = () => { unlockAudio(); document.removeEventListener('pointerdown', once, true); document.removeEventListener('keydown', once, true); };
  document.addEventListener('pointerdown', once, true); document.addEventListener('keydown', once, true);
}

export function playSfx(key: SfxKey) {
  dbg().sfx.push(key); if (dbg().sfx.length > 50) dbg().sfx.shift();
  if (!mgr || !unlocked || !loaded(key) || cfg.muted) return;
  try { mgr.play(key, { volume: sfxVol(key) }); (dbg().played ||= []).push(key); } catch { /* ignore */ }
}

// Volume tweens go through a proxy object so a tween can never write to a sound that was already destroyed
// (Phaser's volume setter throws once the gain node is gone, which would break the game loop).
const alive = (snd: any) => !!snd && !snd.pendingRemove && !!snd.manager;
function setVol(snd: any, v: number) { if (alive(snd)) try { snd.volume = v; } catch { /* destroyed */ } }
const fades = new Map<any, Phaser.Tweens.Tween>();
function fade(snd: any, to: number, ms: number, done?: () => void) {
  fades.get(snd)?.stop(); fades.delete(snd);
  if (!scene || ms <= 0 || !alive(snd)) { setVol(snd, to); done?.(); return; }
  const o = { v: alive(snd) ? snd.volume : 0 };
  const tw = scene.tweens.add({ targets: o, v: to, duration: ms, onUpdate: () => setVol(snd, o.v),
    onComplete: () => { fades.delete(snd); setVol(snd, to); done?.(); }, onStop: () => fades.delete(snd) });
  fades.set(snd, tw);
}
function startTrack(key: MusicKey, fadeMs: number) {
  if (!mgr || !loaded(key)) return;
  const e = assets().music[key]; const snd: any = mgr.add(key, { volume: 0 });
  const ls = e?.loopStart, le = e?.loopEnd;
  const dur = snd.duration || snd.totalDuration || 0;
  const whole = typeof ls !== 'number' || typeof le !== 'number' || le <= ls || (ls <= 0.05 && (!dur || le >= dur - 0.05));
  if (!whole) {
    // intro (0..loopStart) once, then loopStart..loopEnd seamlessly
    const end = dur ? Math.min(le!, dur) : le!;
    snd.addMarker({ name: 'loop', start: ls, duration: end - ls!, config: { loop: true } });
    if (ls > 0.05) { snd.addMarker({ name: 'intro', start: 0, duration: ls }); snd.once('complete', () => { if (cur?.snd === snd && alive(snd)) snd.play('loop', { volume: snd.volume }); }); snd.play('intro'); }
    else snd.play('loop');
  } else snd.play({ loop: true });
  cur = { key, snd }; fade(snd, musicVol(key), fadeMs); dbg().playing = key;
}
function startWanted() {
  if (!unlocked || sting) return;
  if (want && cur?.key !== want) { stopMusic(600); startTrack(want, 900); }
}

/** Loop the given track; crossfades from whatever is playing. No-op if it's already playing. */
export function playMusic(key: MusicKey, fadeMs = 900) {
  want = key; dbg().music.push(key); dbg().current = key;
  if (!mgr || !unlocked || sting) return;          // started on unlock / after the sting
  if (cur?.key === key) return;
  stopMusic(fadeMs); startTrack(key, fadeMs);
}
export function stopMusic(fadeMs = 600) {
  if (!cur) return; const old: any = cur.snd; cur = null; dbg().playing = null;
  fade(old, 0, fadeMs, () => { try { old.stop(); old.destroy(); } catch { /* */ } });
}
/** Battle-end sting: fades the music out, plays the one-shot, and holds any playMusic() request until it finishes. */
export function playSting(key: StingKey) {
  dbg().stings.push(key); want = null; dbg().current = null;
  stopMusic(300);
  if (!mgr || !unlocked || !loaded(key)) return;
  try {
    const s: any = mgr.add(key, { volume: musicVol(key) }); sting = s;
    const end = () => { if (sting === s) { sting = null; try { s.destroy(); } catch { /* */ } startWanted(); } };
    s.once('complete', end); s.play(); dbg().stingPlayed = key;
    setTimeout(end, Math.max(1000, (s.duration || 6) * 1000 + 500));   // safety net
  } catch { sting = null; }
}
function applyVolumes() {
  if (cur) { fades.get(cur.snd)?.stop(); setVol(cur.snd, musicVol(cur.key)); }
  if (sting) setVol(sting, musicVol((sting as any).key));
}
