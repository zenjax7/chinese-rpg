// Spoken answers + music continuity (stubbed SpeechRecognition / speechSynthesis). Used by tests/play.mjs;
// standalone: node tests/speech.mjs [baseUrl]
import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';

const KEY = 'chinese-rpg-proto-v3';
export async function speechTests({ browser, BASE, check, log = console.log }) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.addInitScript(() => {
    // speechSynthesis stub that really "speaks" for 700 ms (speaking = true), so we can see whether the mic opens during TTS
    window.__utter = []; window.__ttsLive = 0;
    let cur = null;
    const synth = { speaking: false, pending: false, paused: false, onvoiceschanged: null,
      getVoices: () => [{ lang: 'zh-CN', name: 'Stub Chinese', voiceURI: 'stub-zh', default: false, localService: true }],
      cancel() { if (cur) { const u = cur; cur = null; synth.speaking = false; clearTimeout(u.__t); u.onend && u.onend({}); } }, pause() {}, resume() {},
      speak(u) { synth.cancel(); window.__utter.push({ text: u.text, at: performance.now() }); cur = u; synth.speaking = true;
        u.__t = setTimeout(() => { if (cur === u) { cur = null; synth.speaking = false; u.onend && u.onend({}); } }, 700); },
      addEventListener() {}, removeEventListener() {} };
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
    // Fake recogniser. window.__srPlan: queue of { finals: [[text, conf], ...], interims: [...], earlyEnd, error, delay }
    window.__srPlan = []; window.__srLog = []; let active = 0;
    class FakeSR {
      constructor() { this.lang = ''; this.interimResults = false; this.maxAlternatives = 1; this.continuous = true; }
      start() {
        const plan = window.__srPlan.shift() || { error: 'no-speech' };
        const ms = window.__proto?.musicState?.();
        window.__srLog.push({ lang: this.lang, interim: this.interimResults, maxAlt: this.maxAlternatives, continuous: this.continuous, plan,
          overlap: active > 0, ttsSpeaking: window.speechSynthesis.speaking, micHold: ms?.micHold, musicVol: ms?.live?.find(x => x.key === ms.cur)?.vol });
        active++; let ended = false; const end = () => { if (ended) return; ended = true; active--; this.onend && this.onend(); };
        this.__end = end;
        setTimeout(() => { this.onstart && this.onstart();
          if (plan.earlyEnd) { setTimeout(end, 40); return; }
          setTimeout(() => {
            if (plan.interims || plan.finals) { this.onsoundstart && this.onsoundstart(); this.onspeechstart && this.onspeechstart(); }
            for (const t of plan.interims || []) { const r = [{ transcript: t, confidence: 0 }]; r.isFinal = false; this.onresult && this.onresult({ resultIndex: 0, results: [r] }); }
            if (plan.finals) { const r = plan.finals.map(([t, c]) => ({ transcript: t, confidence: c })); r.isFinal = true; this.onresult && this.onresult({ resultIndex: 0, results: [r] }); }
            if (plan.error) this.onerror && this.onerror({ error: plan.error });
            end(); }, plan.delay ?? 60); }, 10);
      }
      stop() { setTimeout(() => this.__end && this.__end(), 20); } abort() { this.onerror && this.onerror({ error: 'aborted' }); setTimeout(() => this.__end && this.__end(), 5); }
    }
    window.SpeechRecognition = FakeSR; window.webkitSpeechRecognition = FakeSR;
    navigator.mediaDevices.getUserMedia = async () => ({ getTracks: () => [] });
    // snapshot the word-audio counters whenever a new question appears, so "plays before the mic" is per question
    // (a MutationObserver runs before the battle code reaches its sayItem(), which comes after an await)
    new MutationObserver(recs => { for (const r of recs) for (const n of r.addedNodes) if (n.nodeType === 1 && (n.matches?.('[data-testid="question"]') || n.querySelector?.('[data-testid="question"]')))
      window.__qSay = { ...(window.__proto?.sayCount || {}) }; }).observe(document, { childList: true, subtree: true });
  });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const tid = id => p.locator(`[data-testid="${id}"]`);
  await p.goto(BASE); await tid('consent').waitFor();
  const m = (await tid('consent').innerText()).match(/(\d+) × (\d+)/);
  await tid('consent-answer').fill(String(+m[1] * +m[2])); await tid('consent-ok').click(); await tid('town').waitFor();

  // ---- grading (the game's own matcher, exposed in ?debug) ----
  const G = (alts, zhWord) => p.evaluate(([a, z]) => window.__proto.gradeZh(a, window.__proto.findItem(z)), [alts, zhWord]);
  const cases = [
    [['谢谢'], '谢谢', true, 'exact'], [['謝謝'], '谢谢', true, 'traditional → simplified'], [['谢 谢！'], '谢谢', true, 'whitespace + full-width punctuation'],
    [['ｘｘ', '谢谢。'], '谢谢', true, '2nd alternative'], [['嗯，我想说谢谢啊老师'], '谢谢', true, 'containment in a longer transcript'],
    [['對不起'], '对不起', true, 'traditional (對)'], [['沒關係'], '没关系', true, 'traditional (沒關係)'], [['再見！'], '再见', true, 'traditional + full-width !'],
    [['香蕉'], '谢谢', false, 'wrong word stays wrong'], [['你好'], '再见', false, 'other greeting stays wrong'],
  ];
  for (const [alts, w, want, what] of cases) { const r = await G(alts, w); check(!!r.ok === want, `grading: ${JSON.stringify(alts)} for ${w} → ${r.ok ? 'right (' + r.rule + ')' : 'wrong'} [${what}]`); }
  check(await p.evaluate(() => window.__proto.normZh('ＡＢ，你好！ ')) === 'AB你好', 'grading: NFKC full-width → half-width, punctuation/whitespace stripped');

  // ---- a speech battle: every spoken question answered via the stub, in tricky ways ----
  await p.evaluate(k => { const s = JSON.parse(localStorage.getItem(k)); s.hp = 999; s.level = 6; s.locs.meadow.previewSeen = true; localStorage.setItem(k, JSON.stringify(s)); }, KEY);
  await p.reload(); await tid('town').waitFor();
  await tid('go-adventure').click(); await tid('worldmap').waitFor(); await tid('loc-meadow').click();
  if (await tid('preview-done').count()) await tid('preview-done').click();
  const musicSamples = [], perBattle = []; let spokenQ = 0, spokenOk = 0, replayed = [], qAudio = [], dbgShown = 0;
  const styles = ['interimOnly', 'lowConf', 'earlyEnd', 'altSecond', 'contained', 'slowFinal'];
  const sayFor = q => q.way === 'sEZ' ? q.zh : q.en.replace(/\s*\([^)]*\)/g, '').trim();
  for (let b = 0; b < 4 && spokenQ < 8; b++) {
    await tid('act-path').click(); await tid('battle').waitFor({ state: 'attached', timeout: 15000 });
    let blurDone = false; const starts0 = await p.evaluate(() => (window.__proto.audio.starts || []).length);
    for (let i = 0; i < 1500; i++) {
      const st = await p.evaluate(() => { const has = s => !!document.querySelector(`[data-testid="${s}"]`);
        if (has('victory')) return 'victory'; if (has('inn')) return 'inn'; if (has('location')) return 'location';
        const c = document.querySelector('[data-testid="continue"]'); if (c && !c.disabled) return 'continue';
        if (has('action-menu')) return 'menu'; if (document.querySelector('[data-testid^="target-"]:not([data-testid="target-menu"])')) return 'target';
        const mic = document.querySelector('[data-testid="mic"]'); if (mic && !mic.disabled && mic.classList.contains('pulse')) return 'mic';
        if (document.querySelector('[data-testid="opt"]:not([disabled])')) return 'mc'; return 'wait'; });
      if (i % 5 === 0) musicSamples.push(await p.evaluate(() => window.__proto.musicState?.()));
      if (st === 'victory') { perBattle.push(await p.evaluate(n => (window.__proto.audio.starts || []).slice(n).filter(k => k.startsWith('mus_battle')).length, starts0)); await tid('victory-ok').click(); break; }
      if (st === 'inn' || st === 'location') break;
      if (st === 'continue') await tid('continue').click({ timeout: 2000 }).catch(() => {});
      else if (st === 'menu') {
        if (!blurDone) { blurDone = true; await p.evaluate(() => { window.dispatchEvent(new Event('blur')); }); await p.waitForTimeout(150);
          musicSamples.push({ ...(await p.evaluate(() => window.__proto.musicState?.())), afterBlur: true }); await p.evaluate(() => window.dispatchEvent(new Event('focus'))); }
        await tid('act-attack').click();
      }
      else if (st === 'target') await p.locator('[data-testid^="target-"]:not([data-testid="target-menu"])').first().click();
      else if (st === 'mc') { const q = await p.evaluate(() => window.__proto.q); await p.locator(`[data-testid="opt"][data-o="${q.answerId}"]`).first().click(); }
      else if (st === 'mic') {
        const q = await p.evaluate(() => window.__proto.q); const say = sayFor(q); const style = styles[spokenQ % styles.length];
        const plan = style === 'interimOnly' ? [{ interims: [say.slice(0, 1), say] }]                               // no final result at all
          : style === 'lowConf' ? [{ finals: [[say, 0.05]] }]                                                    // very low confidence
          : style === 'earlyEnd' ? [{ earlyEnd: true }, { finals: [[say, 0.9]] }]                                // Chrome ends right after start → one restart
          : style === 'altSecond' ? [{ finals: [['banana', 0.9], [say, 0.4]] }]                                  // right answer only in alternative 2
          : style === 'contained' ? [{ finals: [[q.way === 'sEZ' ? '嗯' + say + '。' : 'um ' + say, 0.7]] }]
          : [{ interims: [say], finals: [[say, 0.8]], delay: 1500 }];                                            // slow final
        const before = await p.evaluate(id => (window.__proto.sayCount || {})[id] || 0, q.id); const atQ = await p.evaluate(id => (window.__qSay || {})[id] || 0, q.id);
        await p.evaluate(pl => window.__srPlan.push(...pl), plan);
        const n0 = await p.evaluate(() => window.__utter.length);
        await tid('mic').click();
        await p.waitForSelector('[data-testid="fb-ok"],[data-testid="fb-bad"]', { timeout: 15000 });
        if (await p.locator('#micmsg [data-testid="sr-debug"]').count()) dbgShown++;
        const ok = await tid('fb-ok').count(); spokenQ++; if (ok) spokenOk++;
        await p.waitForTimeout(1200);
        const after = await p.evaluate(id => (window.__proto.sayCount || {})[id] || 0, q.id); const n1 = await p.evaluate(() => window.__utter.length);
        replayed.push({ id: q.id, way: q.way, style, ok: !!ok, sayAfterMic: after - before, tts: n1 - n0 });
        qAudio.push({ way: q.way, beforeMic: before - atQ });
      }
      await p.waitForTimeout(60);
    }
  }
  const srlog = await p.evaluate(() => window.__srLog);
  log('speech answers', JSON.stringify(replayed));
  check(spokenQ >= 4, `speech battle asked spoken questions (${spokenQ})`);
  check(spokenOk === spokenQ, `every right spoken answer registered (${spokenOk}/${spokenQ}: interim-only, confidence 0.05, early end + restart, 2nd alternative, containment, slow final)`);
  check(srlog.every(r => r.interim === true && r.maxAlt === 5 && r.continuous === false), 'recogniser: interimResults on, maxAlternatives 5, continuous off');
  check(srlog.filter(r => r.plan.finals || r.plan.interims).every(r => r.lang === 'zh-CN' || r.lang === 'en-US') && srlog.some(r => r.lang === 'zh-CN'), 'recogniser: lang zh-CN for Chinese answers');
  check(srlog.every(r => !r.overlap), 'no overlapping recognition start() calls');
  check(srlog.every(r => !r.ttsSpeaking), 'mic never opens while TTS is still speaking (cancelled + waited for onend)');
  check(srlog.every(r => r.micHold === true), 'music held at volume 0 while the mic listens');
  check(replayed.filter(r => r.ok).every(r => r.sayAfterMic === 0 && r.tts === 0), 'no question audio / TTS replay after a right spoken answer: ' + JSON.stringify(replayed.map(r => r.tts)));
  check(qAudio.filter(q => q.way === 'sZE').every(q => q.beforeMic === 1) && qAudio.filter(q => q.way === 'sEZ').every(q => q.beforeMic === 0), 'spoken question audio plays exactly once (sZE) / never (sEZ) before the mic: ' + JSON.stringify(qAudio));
  check(dbgShown === spokenQ, `?debug shows raw transcripts + confidence under "I heard" (${dbgShown}/${spokenQ})`);
  // music: one track, never restarted inside a battle, AudioContext not suspended on window blur
  const live = musicSamples.filter(Boolean);
  const audible = live.map(s => (s.live || []).filter(x => x.playing && x.vol > 0.02).length);
  check(live.length > 10 && Math.max(...audible) <= 2 && live.filter(s => (s.live || []).filter(x => x.playing).length > 2).length === 0, `music: never more than one track (+ one fading) playing (max audible ${Math.max(...audible)})`);
  const blurS = live.find(s => s.afterBlur); check(blurS && blurS.ctx !== 'suspended', `music: AudioContext stays running on window blur (${blurS?.ctx})`);
  const starts = await p.evaluate(() => window.__proto.audio.starts || []);
  const music = await p.evaluate(() => window.__proto.audio.music || []);
  log('music starts', starts.join(' '), '| requests', music.join(' '));
  check(perBattle.length >= 2 && perBattle.every(n => n <= 1), `music: battle track starts at most once per battle, never restarted while it plays (${perBattle.join(', ')})`);
  // debug panel lists the recognition log
  await tid('debug-open').click(); await tid('dbg-srlog').waitFor();
  check((await p.locator('[data-testid="dbg-srlog"] [data-testid="sr-debug"]').count()) >= 4 && /final: “/.test(await tid('dbg-srlog').innerText()), '?debug panel: speech log with raw transcripts, alternatives, confidence');
  await tid('dbg-close').click();
  check(errs.length === 0, 'speech tests: no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await ctx.close();
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const BASE0 = process.argv[2] || 'http://127.0.0.1:8795/'; const BASE = BASE0 + (BASE0.includes('?') ? '&' : '?') + 'debug';
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  let bad = 0; const check = (c, m) => { if (!c) bad++; console.log(c ? '✅' : '❌', m); };
  try { await speechTests({ browser, BASE, check, log: (...a) => console.log('•', ...a) }); } catch (e) { bad++; console.log('❌', e.stack || e); }
  await browser.close(); console.log(bad ? `${bad} SPEECH CHECK(S) FAILED` : 'ALL SPEECH CHECKS PASSED'); process.exit(bad ? 1 : 0);
}
