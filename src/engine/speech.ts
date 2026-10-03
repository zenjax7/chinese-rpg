// Web Speech wrappers. Recognition code adapted from chinese-rpg/speech-demo/index.html
// (SpeechRecognition || webkitSpeechRecognition, continuous=false, interimResults=true, maxAlternatives=5, error-code handling).
import { B } from '../data';

export type ListenResult =
  | { kind: 'result'; alts: string[] }
  | { kind: 'nomatch' }
  | { kind: 'tech'; code: string }       // re-prompt the same question (max 2), then void
  | { kind: 'fatal'; code: string };     // speech off for the session

const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
export const speechSupported = () => !!SR;

let current: any = null;
let busy: Promise<void> = Promise.resolve();      // listen() calls are serialized: a new start() never overlaps a running one
export function abortListening() { try { current?.abort(); } catch { /* */ } }

/** Debug log of every recognition attempt (raw transcripts, alternatives, confidence, events); shown in the ?debug panel. */
export interface SrLogEntry { t: number; lang: string; ms: number; events: string[]; finals: { text: string; conf: number | null }[][]; interims: string[]; error?: string; kind?: string; restarts: number }
export const srLog: SrLogEntry[] = [];
const pushLog = (e: SrLogEntry) => { srLog.unshift(e); srLog.length = Math.min(srLog.length, 30); const w: any = window; (w.__proto = w.__proto || {}).srLog = srLog; };

/** Battle/practice note which alternative (if any) was graded right, on the newest log entry. */
export function noteGrade(target: string, m: { ok: boolean; rule?: string; alt?: string }) {
  const e: any = srLog[0]; if (e) { e.target = target; e.ok = m.ok; e.rule = m.rule; e.alt = m.alt; }
}
const escH = (x: string) => String(x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as any)[c]);
/** ?debug: raw transcripts with confidence for the newest attempts. */
export function srDebugHtml(n = 1): string {
  return srLog.slice(0, n).map((e: any) => `<div class="srdbg" data-testid="sr-debug" style="font-size:13px;text-align:left;opacity:.85">🐞 ${escH(e.lang)} ${e.ms} ms ${escH(e.kind || '')}${e.restarts ? ' (restarted)' : ''}${e.error ? ' err ' + escH(e.error) : ''}`
    + `${e.target ? ` · target ${escH(e.target)} → ${e.ok ? '✔ ' + escH(e.rule || '') + ' “' + escH(e.alt || '') + '”' : '✘'}` : ''}<br>`
    + e.finals.map((row: any[]) => 'final: ' + row.map(a => `“${escH(a.text)}” ${a.conf === null ? 'n/a' : Math.round(a.conf * 100) + '%'}`).join(' · ')).join('<br>')
    + (e.interims.length ? `<br>interim: ${e.interims.map((t: string) => '“' + escH(t) + '”').join(' → ')}` : '') + `<br><span style="opacity:.7">${escH(e.events.join(' '))}</span></div>`).join('');
}

/** Silence our own audio before the mic opens: cancel TTS and wait until it has really stopped (its onend), stop VO clips.
 *  Starting recognition while speechSynthesis is still talking makes Chrome end recognition early or hear the TTS. */
const quieters: (() => void)[] = [];
export function onQuietForMic(f: () => void) { quieters.push(f); }
export async function quietForMic(maxMs = 800): Promise<void> {
  quieters.forEach(f => { try { f(); } catch { /* */ } });
  const sy = synth(); if (!sy) return;
  const was = sy.speaking || sy.pending;
  try { sy.cancel(); } catch { /* */ }
  if (!was) return;
  const t0 = performance.now();
  while ((sy.speaking || sy.pending) && performance.now() - t0 < maxMs) await new Promise(r => setTimeout(r, 40));
  await new Promise(r => setTimeout(r, 150));   // let the output device settle before the mic opens
}

/** One recognition attempt. Modelled on speech-demo/index.html (which worked for Jack): interimResults on, maxAlternatives 5,
 *  no early abort: the browser ends the utterance itself; our timers only stop() (which keeps the results), never abort(). */
export function listen(lang: 'zh-CN' | 'en-US', long: boolean, onStart?: () => void): Promise<ListenResult> {
  const run = busy.then(() => listenOnce(lang, long, onStart));
  busy = run.then(() => undefined, () => undefined);
  return run;
}
function listenOnce(lang: 'zh-CN' | 'en-US', long: boolean, onStart?: () => void): Promise<ListenResult> {
  const cfg = B.speech;
  return new Promise(resolve => {
    if (!SR) { resolve({ kind: 'fatal', code: 'unsupported' }); return; }
    const L: SrLogEntry = { t: Date.now(), lang, ms: 0, events: [], finals: [], interims: [], restarts: 0 };
    const t0 = performance.now(); const ev = (e: string) => L.events.push(`${e}@${Math.round(performance.now() - t0)}`);
    let done = false, heard = false, spoke = false, err: string | null = null, startedAt = 0;
    const finals: string[] = []; let interim = '';
    let t1: any = 0, t2: any = 0, t3: any = 0;
    const finish = (r: ListenResult) => {
      if (done) return; done = true; clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); current = null;
      L.ms = Math.round(performance.now() - t0); L.kind = r.kind + ('code' in r ? ':' + r.code : ''); if (err) L.error = err; pushLog(L); resolve(r);
    };
    const outcome = (): ListenResult | null => {
      const alts = [...finals, ...(interim ? [interim] : []), ...L.interims.slice().reverse()].filter((a, i, all) => a && a.trim() && all.indexOf(a) === i);
      return alts.length ? { kind: 'result', alts } : null;
    };
    const begin = () => {
      const rec = new SR(); current = rec;
      rec.lang = lang; rec.continuous = false; rec.interimResults = true; rec.maxAlternatives = cfg.maxAlternatives || 5;
      rec.onstart = () => { ev('start'); startedAt = performance.now(); if (!L.restarts) onStart?.(); armTimers(rec); };
      rec.onaudiostart = () => ev('audiostart');
      rec.onsoundstart = () => { ev('soundstart'); heard = true; };
      rec.onspeechstart = () => { ev('speechstart'); heard = true; spoke = true; };
      rec.onspeechend = () => ev('speechend');
      rec.onresult = (e: any) => {
        heard = true; spoke = true; interim = '';
        for (let i = e.resultIndex ?? 0; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal !== false) {
            const row: { text: string; conf: number | null }[] = [];
            for (let j = 0; j < r.length; j++) { const t = r[j].transcript || ''; row.push({ text: t, conf: typeof r[j].confidence === 'number' ? r[j].confidence : null }); if (t.trim()) finals.push(t); }
            L.finals.push(row); ev('final');
          } else { interim += r[0]?.transcript || ''; }
        }
        if (interim && L.interims[L.interims.length - 1] !== interim) { L.interims.push(interim); ev('interim'); }
      };
      rec.onnomatch = () => { ev('nomatch'); spoke = true; };
      rec.onerror = (e: any) => { err = e.error || 'unknown'; ev('error:' + err); };
      rec.onend = () => {
        ev('end'); clearTimeout(t1); clearTimeout(t2);
        const o = outcome(); if (o) return finish(o);   // any final or interim transcript is graded (no confidence cut-off)
        // Chrome sometimes ends a session right after it starts (device still busy from TTS): restart once instead of failing
        if (!err && !heard && L.restarts < 1 && startedAt && performance.now() - startedAt < 1000) { L.restarts++; ev('restart'); err = null; setTimeout(begin, 250); return; }
        const c = err || (spoke ? 'nomatch' : 'no-speech');   // noise alone (soundstart) is not an answer: re-prompt
        if (c === 'nomatch') return finish({ kind: 'nomatch' });
        if (['not-allowed', 'service-not-allowed', 'language-not-supported'].includes(c)) return finish({ kind: 'fatal', code: c });
        finish({ kind: 'tech', code: c });        // no-speech, audio-capture, aborted, network, timeout
      };
      try { rec.start(); ev('start()'); } catch (e: any) { ev('start-failed'); finish({ kind: 'tech', code: 'start-failed' }); }
    };
    const armTimers = (rec: any) => {
      clearTimeout(t1); clearTimeout(t2);
      // nothing at all heard for noSpeechMs after the mic opened => stop (keeps any late result); the browser's own no-speech also ends it
      t1 = setTimeout(() => { if (!heard && !finals.length) { ev('t-nospeech'); try { rec.stop(); } catch { /* */ } } }, cfg.noSpeechMs);
      // hard cap measured from the mic opening (not from creation): stop() so the recogniser returns what it has
      t2 = setTimeout(() => { ev('t-cap'); try { rec.stop(); } catch { /* */ } }, long ? cfg.listenMsLong : cfg.listenMs);
    };
    // safety net if the browser never fires onend
    t3 = setTimeout(() => { ev('t-safety'); try { current?.abort(); } catch { /* */ } finish(outcome() || { kind: 'tech', code: 'timeout' }); }, (long ? cfg.listenMsLong : cfg.listenMs) + 4000);
    begin();
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
