// 🔊 word audio. Priority: a pre-recorded clip listed in assets-manifest.json "vo" (public/audio/vo/<itemId>.mp3|.ogg,
// delivered to /workspace/audio/vo/), else browser TTS (speechSynthesis, zh-CN voice, rate 0.85 via speech.ts).
// Buttons are disabled when neither is available (no speechSynthesis or no Chinese voice on the device).
import { ITEM } from '../data';
import { assets, onAssets } from '../assets';
import { speak, hasZhVoice, onVoices, synth } from './speech';
import { audioSettings, duck } from '../audio/audio';

const ttsOk = () => !!synth() && hasZhVoice();
const canOgg = typeof Audio !== 'undefined' && !!new Audio().canPlayType?.('audio/ogg; codecs="vorbis"');
const clip = (id: string) => assets().vo[id]?.find(u => (u.endsWith('.ogg') ? canOgg : true));
export const canSayItem = (id: string) => !!clip(id) || ttsOk();

let playing: HTMLAudioElement | null = null;
/** Speaks an item (by id). Resolves when done or after maxMs. */
export function sayItem(id: string, maxMs?: number): Promise<void> {
  duck(true); let un = false; const undo = () => { if (!un) { un = true; duck(false); } };
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
      a.onended = fin; a.onerror = () => { done = true; speak(it?.zh || '', 'zh-CN', maxMs).then(res); };
      a.play().catch(() => { if (!done) { done = true; speak(it?.zh || '', 'zh-CN', maxMs).then(res); } });
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
