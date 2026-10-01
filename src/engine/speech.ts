// Web Speech wrappers. Recognition code adapted from chinese-rpg/speech-demo/index.html
// (SpeechRecognition || webkitSpeechRecognition, continuous=false, maxAlternatives=5, error-code handling).
import { B } from '../data';

export type ListenResult =
  | { kind: 'result'; alts: string[] }
  | { kind: 'nomatch' }
  | { kind: 'tech'; code: string }       // re-prompt the same question (max 2), then void
  | { kind: 'fatal'; code: string };     // speech off for the session

const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
export const speechSupported = () => !!SR;

let current: any = null;
export function abortListening() { try { current?.abort(); } catch { /* */ } }

export function listen(lang: 'zh-CN' | 'en-US', long: boolean, onStart?: () => void): Promise<ListenResult> {
  const cfg = B.speech;
  return new Promise(resolve => {
    if (!SR) { resolve({ kind: 'fatal', code: 'unsupported' }); return; }
    let done = false, heard = false, got: ListenResult | null = null, err: string | null = null;
    const finish = (r: ListenResult) => { if (done) return; done = true; clearTimeout(t1); clearTimeout(t2); current = null; resolve(r); };
    const rec = new SR(); current = rec;
    rec.lang = lang; rec.continuous = false; rec.interimResults = false; rec.maxAlternatives = cfg.maxAlternatives;
    rec.onstart = () => onStart?.();
    rec.onspeechstart = () => { heard = true; };
    rec.onresult = (e: any) => {
      const alts: string[] = [];
      for (let i = e.resultIndex; i < e.results.length; i++) { const r = e.results[i]; if (r.isFinal !== false) for (let j = 0; j < r.length; j++) alts.push(r[j].transcript); }
      got = alts.some(a => a && a.trim()) ? { kind: 'result', alts } : { kind: 'nomatch' };
    };
    rec.onnomatch = () => { if (!got) got = { kind: 'nomatch' }; };
    rec.onerror = (e: any) => { err = e.error || 'unknown'; };
    rec.onend = () => {
      if (got) return finish(got);
      const c = err || (heard ? 'nomatch' : 'no-speech');
      if (c === 'nomatch') return finish({ kind: 'nomatch' });
      if (['not-allowed', 'service-not-allowed', 'language-not-supported'].includes(c)) return finish({ kind: 'fatal', code: c });
      finish({ kind: 'tech', code: c });        // no-speech, audio-capture, aborted, network, timeout
    };
    // 4 s with no speech detected => technical failure; hard stop at 6/8 s
    const t1 = setTimeout(() => { if (!heard && !got) { err = err || 'no-speech'; try { rec.abort(); } catch { /* */ } setTimeout(() => finish({ kind: 'tech', code: 'no-speech' }), 300); } }, cfg.noSpeechMs);
    const t2 = setTimeout(() => { try { rec.stop(); } catch { /* */ } setTimeout(() => finish(got || { kind: 'tech', code: 'timeout' }), 1200); }, long ? cfg.listenMsLong : cfg.listenMs);
    try { rec.start(); } catch (e: any) { finish({ kind: 'tech', code: 'start-failed' }); }
  });
}

/** Asks for mic permission up front (used on the consent screen). */
export async function requestMic(): Promise<boolean> {
  try { const s = await navigator.mediaDevices.getUserMedia({ audio: true }); s.getTracks().forEach(t => t.stop()); return true; } catch { return false; }
}

// ---------------- TTS (browser zh-CN voice) ----------------
let zhVoice: SpeechSynthesisVoice | null = null;
/** speechSynthesis if the browser really has it (some embedded/privacy browsers expose a stub or nothing). */
export const synth = (): SpeechSynthesis | null => { try { const s = (window as any).speechSynthesis; return s && typeof s.speak === 'function' ? s : null; } catch { return null; } };
function pickVoice() {
  if (!synth()) return;
  let vs: SpeechSynthesisVoice[] = []; try { vs = synth()!.getVoices() || []; } catch { /* */ }
  zhVoice = vs.find(v => /zh[-_]CN/i.test(v.lang)) || vs.find(v => /^zh/i.test(v.lang) && !/HK|TW/i.test(v.lang)) || vs.find(v => /^zh/i.test(v.lang)) || null;
}
const voiceListeners: (() => void)[] = [];
/** Voices load asynchronously in most browsers; UI can re-check 🔊 availability when they arrive. */
export function onVoices(f: () => void) { voiceListeners.push(f); }
if (synth()) { pickVoice(); try { synth()!.onvoiceschanged = () => { pickVoice(); voiceListeners.forEach(f => f()); }; } catch { /* */ } }
export const hasZhVoice = () => !!zhVoice;
/** Speaks text; resolves when finished or after maxMs (headless browsers may never fire onend). */
export function speak(text: string, lang = 'zh-CN', maxMs = B.combat.audioUnlockMaxMs): Promise<void> {
  return new Promise(res => {
    const sy = synth(); if (!sy) { res(); return; }
    let done = false; const fin = () => { if (!done) { done = true; res(); } };
    try {
      sy.cancel();
      const u = new SpeechSynthesisUtterance(text); u.lang = lang; u.rate = 0.85;
      if (lang.startsWith('zh') && zhVoice) u.voice = zhVoice;
      u.onend = fin; u.onerror = fin; sy.speak(u);
    } catch { fin(); }
    setTimeout(fin, maxMs);
  });
}
