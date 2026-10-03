// 🔊 word audio. Priority: a pre-recorded clip listed in assets-manifest.json "vo" (public/audio/vo/<itemId>.mp3|.ogg,
// delivered to /workspace/audio/vo/), else browser TTS (speechSynthesis, zh-CN voice, rate 0.85 via speech.ts).
// Buttons are disabled when neither is available (no speechSynthesis or no Chinese voice on the device).
import { ITEM } from '../data';
import { assets, onAssets } from '../assets';
import { speak, hasZhVoice, onVoices, synth, onQuietForMic } from './speech';
import { audioSettings, duck } from '../audio/audio';

const ttsOk = () => !!synth() && hasZhVoice();
const canOgg = typeof Audio !== 'undefined' && !!new Audio().canPlayType?.('audio/ogg; codecs="vorbis"');
const clip = (id: string) => assets().vo[id]?.find(u => (u.endsWith('.ogg') ? canOgg : true));
export const canSayItem = (id: string) => !!clip(id) || ttsOk();

let playing: HTMLAudioElement | null = null;
/** Stops a VO clip that is still playing (called before the mic opens). */
export function stopVoice() { try { playing?.pause(); } catch { /* */ } playing = null; }
onQuietForMic(stopVoice);
/** Count of word-audio plays (TTS or clip) per item, for the tests: a question's audio must play once, not again after a right answer. */
const countSay = (id: string) => { const w: any = window; const c = ((w.__proto = w.__proto || {}).sayCount = w.__proto.sayCount || {}); c[id] = (c[id] || 0) + 1; };
/** Speaks an item (by id). Resolves when done or after maxMs. */
export function sayItem(id: string, maxMs?: number): Promise<void> {
  countSay(id); duck(true); let un = false; const undo = () => { if (!un) { un = true; duck(false); } };
  return sayRaw(id, maxMs).then(undo, undo);
}
function sayRaw(id: string, maxMs?: number): Promise<void> {
  const url = clip(id); const it = ITEM[id];
  (window as any).__proto = (window as any).__proto || {}; (window as any).__proto.said = [...((window as any).__proto.said || []).slice(-20), id];
  if (url) {
    return new Promise(res => {
      try { playing?.pause(); } catch { /* */ }
      const a = new Audio(url); playing = a; (window as any).__proto.voClip = url; const s = audioSettings(); a.volume = s.muted ? 0 : Math.min(1, s.master);
      let done = false; const fin = () => { if (!done) { done = true; res(); } };
      // TTS fallback only while this clip is still the one we want: a late error after the timeout, or after the clip was stopped
      // for the mic, must not start a second (duplicate) utterance
      const fallback = () => { if (done || playing !== a) return; done = true; speak(it?.zh || '', 'zh-CN', maxMs).then(res); };
      a.onended = fin; a.onerror = fallback;
      a.play().catch(fallback);
      setTimeout(fin, maxMs ?? 4000);
    });
  }
  return speak(it?.zh || '', 'zh-CN', maxMs);
}

/** Markup for a speaker button. Wire it with wireSayButtons(). */
export const sayBtn = (id: string, extra = '') =>
  `<button type="button" class="secondary say" data-say="${id}" data-testid="say-${id}" aria-label="Play audio" title="Play audio" ${extra}>🔊</button>`;
function refresh(root: ParentNode = document) {
  root.querySelectorAll<HTMLButtonElement>('button.say[data-say]').forEach(b => {
    const ok = canSayItem(b.dataset.say!); b.disabled = !ok; b.title = ok ? 'Play audio' : 'No Chinese voice on this device';
  });
}
export function wireSayButtons(root: ParentNode = document) {
  root.querySelectorAll<HTMLButtonElement>('button.say[data-say]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); sayItem(b.dataset.say!); }));
  refresh(root);
}
onVoices(() => refresh());
onAssets(() => refresh());
