// Practice modes (spec v3 §8 / preview page). Practice never gives gold/EXP per question, never moves Leitner boxes,
// never marks an item "seen", and may supply at most 1 of the 2 correct answers per way (gradePractice).
import { B, ITEM, LOC, POOLS, CONS } from '../data';
import { S, save, speechOn, session, WayKey } from '../engine/state';
import { prog, progress, distractors, pickWay, WayCtx, gradePractice } from '../engine/learning';
import { listen } from '../engine/speech';
import { sayItem, sayBtn, wireSayButtons } from '../engine/voice';
import { playSfx, playMusic } from '../audio/audio';
import { matchZh, matchEn } from '../engine/match';
import { $, $$, esc, render, on, toast, dialog, sleep, hud } from './dom';

type Mode = 'flash' | 'listen' | 'say' | 'match' | 'quiz';
const MODES: { id: Mode; emoji: string; name: string; desc: string; graded: boolean; sticker: string }[] = [
  { id: 'flash', emoji: '🃏', name: 'Flashcards 闪卡', desc: 'Flip cards and listen. Never counted.', graded: false, sticker: '🌟' },
  { id: 'listen', emoji: '👂', name: 'Listen & pick 听一听', desc: 'Hear or read a word and tap the answer (reading ways).', graded: true, sticker: '🐝' },
  { id: 'say', emoji: '🎤', name: 'Say it 说一说', desc: 'Say the word out loud (speaking ways).', graded: true, sticker: '🦜' },
  { id: 'match', emoji: '🧩', name: 'Matching 连一连', desc: 'Match 6 Chinese words to their meanings.', graded: true, sticker: '🐸' },
  { id: 'quiz', emoji: '⚡', name: 'Quick quiz 小测验', desc: '10 questions picked for you, all ways.', graded: true, sticker: '🦊' },
];
const P = () => B.practice;
const pst = (loc: string) => (S.practice[loc] ||= { done: [], rewarded: false, stickers: [] });

/** Items for a session: not-yet-practiced first, then the weakest. */
function pickItems(loc: string, n: number, speakingOnly = false): string[] {
  const done = new Set(pst(loc).done);
  return POOLS[loc].filter(id => !speakingOnly || ITEM[id].speaking).map(id => ({ id, k: (done.has(id) ? 10 : 0) + progress(id) + Math.random() * 0.3 })).sort((a, b) => a.k - b.k).slice(0, n).map(x => x.id);
}
function markDone(loc: string, id: string) { const s = pst(loc); if (!s.done.includes(id)) s.done.push(id); }

export function practiceMenu(loc: string): Promise<void> {
  return new Promise(res => {
    playMusic('mus_village');
    const show = () => {
      const s = pst(loc); const pool = POOLS[loc];
      render(`<div class="panel" data-testid="practice-menu"><h1>🎯 Practice: ${LOC[loc].zh} ${LOC[loc].name}</h1>
        <p class="muted">Practice helps a little: it can give at most 1 of the 2 ✔ marks each way needs, and no gold or EXP per question.
          Words become Proficient in battle. Answer all ${pool.length} words in any graded mode once for a prize: 🍯 1 Honey Potion + ${LOC[loc].G} 🪙.</p>
        <p data-testid="practice-progress">Words practiced: <b>${s.done.length}/${pool.length}</b> ${s.rewarded ? '· 🎁 prize collected' : ''} · Stickers: ${s.stickers.map(m => `<span class="sticker">${MODES.find(x => x.id === m)!.sticker}</span>`).join('') || '<span class="muted">none yet</span>'}</p>
        <div class="grid">${MODES.map(m => { const off = m.id === 'say' && !speechOn();
          return `<div class="card"><div style="font-size:1.3rem">${m.emoji} ${m.name}</div><div class="muted">${m.desc}</div>
          <button data-m="${m.id}" data-testid="pm-${m.id}" ${off ? 'disabled title="Speech is off"' : ''}>${off ? '🔇 needs speech' : 'Start'}</button></div>`; }).join('')}</div>
        <h3 style="margin-top:12px">📚 All ${pool.length} words here <span class="muted">(tap 🔊 to listen)</span></h3>
        <div class="wordlist" data-testid="practice-words">${pool.map(id => `<div class="word" data-testid="pw-${id}"><span class="zhc">${ITEM[id].zh}</span>
          <span class="muted">${esc(ITEM[id].enPrimary)}</span>${sayBtn(id)}</div>`).join('')}</div>
        <div class="row"><button class="secondary" id="pback" data-testid="practice-back">⬅ Back</button></div></div>`);
      wireSayButtons($('[data-testid="practice-words"]'));
      on('[data-m]', async (_e, el) => { await runMode(loc, el.dataset.m as Mode); show(); });
      on('#pback', () => res());
    };
    show();
  });
}

async function runMode(loc: string, mode: Mode) {
  let finished = false; let right = 0, total = 0, credited = 0;
  if (mode === 'flash') finished = await flashcards(loc);
  else if (mode === 'match') { const r = await matching(loc); finished = r.finished; right = r.right; total = r.total; credited = r.credited; }
  else {
    const n = mode === 'listen' ? P().listenPickLength : mode === 'say' ? P().sayItLength : P().quickQuizLength;
    const ids = pickItems(loc, n, mode === 'say'); const ctx: WayCtx = { asked: 0, spoken: 0, cooling: new Set() };
    finished = true;
    for (let k = 0; k < ids.length; k++) {
      const id = ids[k];
      let way: WayKey = mode === 'listen' ? (k % 2 ? 'rEZ' : 'rZE') : mode === 'say' ? (k % 2 ? 'sZE' : 'sEZ') : pickWay(id, ctx);
      if (way[0] === 's' && !speechOn()) way = k % 2 ? 'rEZ' : 'rZE';
      const r = await question(loc, id, way, `${MODES.find(m => m.id === mode)!.emoji} ${k + 1}/${ids.length}`);
      if (r === 'quit') { finished = false; break; }
      if (r === 'skip') continue;
      ctx.asked++; if (way[0] === 's') ctx.spoken++;
      total++; if (r === 'correct') right++;
      if (gradePractice(id, way, r === 'correct')) credited++;
      markDone(loc, id); save();
    }
  }
  (window as any).__proto.q = null;
  const s = pst(loc); let msg = mode === 'flash' ? 'Nice review! (Flashcards never count.)' : `You got ${right}/${total} right.${credited ? ` ✔ ${credited} practice mark${credited > 1 ? 's' : ''} earned.` : ''}`;
  if (finished && !s.stickers.includes(mode)) { s.stickers.push(mode); msg += `<br>New sticker: <span class="sticker">${MODES.find(m => m.id === mode)!.sticker}</span>`; }
  if (!s.rewarded && POOLS[loc].every(id => s.done.includes(id))) {
    s.rewarded = true; S.inv[P().completeReward.item] = (S.inv[P().completeReward.item] || 0) + 1; const g = P().completeReward.goldG * LOC[loc].G; S.gold += g;
    msg += `<br>🎁 You practiced every word here! Prize: ${CONS[P().completeReward.item].emoji} ${CONS[P().completeReward.item].en} + ${g} 🪙`; toast('🎁 Practice prize!');
  }
  save(); hud();
  await dialog('🎯 Practice done', msg);
}

async function flashcards(loc: string): Promise<boolean> {
  const ids = pickItems(loc, P().flashcardsPerSession); let k = 0, flipped = false;
  return new Promise(res => {
    const show = () => {
      const it = ITEM[ids[k]];
      render(`<div class="panel flash" data-testid="flashcards"><h2>🃏 Flashcard ${k + 1}/${ids.length}</h2>
        <div class="card flashcard" id="fc" data-testid="flashcard">${flipped ? `<div style="font-size:1.6rem">${esc(it.en)}</div><div class="muted">${it.zh}</div>` : `<div class="zh-big">${it.zh}</div><div class="muted">(tap to flip)</div>`}</div>
        <div class="row"><button class="secondary" id="say">🔊</button><button class="secondary" id="prev" ${k ? '' : 'disabled'}>◀</button>
        <button id="next" data-testid="fc-next">${k === ids.length - 1 ? 'Done ✔' : 'Next ▶'}</button><button class="secondary" id="quit">Stop</button></div></div>`);
      if (!flipped) sayItem(ids[k]);
      on('#fc', () => { flipped = !flipped; show(); }); on('#say', () => sayItem(ids[k]));
      on('#prev', () => { k--; flipped = false; show(); });
      on('#next', () => { if (k === ids.length - 1) return res(true); k++; flipped = false; show(); });
      on('#quit', () => res(false));
    };
    show();
  });
}

async function matching(loc: string) {
  const ids = pickItems(loc, P().matchingPairs); const tried = new Set<string>(); const matched = new Set<string>();
  let right = 0, credited = 0; const en = [...ids].sort(() => Math.random() - 0.5);
  (window as any).__proto.q = { practice: true, match: ids };
  return new Promise<{ finished: boolean; right: number; total: number; credited: number }>(res => {
    let sel: string | null = null;
    const show = (msg = '') => {
      render(`<div class="panel" data-testid="matching"><h2>🧩 Match the pairs (${matched.size}/${ids.length})</h2><div class="muted">${msg || 'Tap a Chinese word, then its meaning.'}</div>
        <div class="match">${ids.map((z, i) => `<button class="${matched.has(z) ? 'done' : sel === z ? 'sel' : ''}" data-z="${z}" data-testid="mz-${z}" ${matched.has(z) ? 'disabled' : ''}>${ITEM[z].zh}</button>
          <button class="secondary ${matched.has(en[i]) ? 'done' : ''}" data-e="${en[i]}" data-testid="me-${en[i]}" ${matched.has(en[i]) ? 'disabled' : ''}>${esc(ITEM[en[i]].enPrimary)}</button>`).join('')}</div>
        <div class="row"><button class="secondary" id="quit">Stop</button></div></div>`);
      on('[data-z]', (_e, el) => { sel = el.dataset.z!; sayItem(sel); show(); });
      on('[data-e]', (_e, el) => {
        if (!sel) return show('First tap a Chinese word.');
        const z = sel, e = el.dataset.e!; sel = null;
        const first = !tried.has(z); tried.add(z);
        if (z === e) {
          matched.add(z); markDone(loc, z);
          playSfx('sfx_correct');
          if (first) { right++; if (gradePractice(z, 'rZE', true)) credited++; }   // rZE credit only on a first-try match
          save();
          if (matched.size === ids.length) return res({ finished: true, right, total: ids.length, credited });
          show(`✅ ${ITEM[z].zh} = ${esc(ITEM[z].enPrimary)}`);
        } else { playSfx('sfx_wrong'); show(`❌ Not a pair. Try again!`); }
      });
      on('#quit', () => res({ finished: false, right, total: tried.size, credited }));
    };
    show();
  });
}

type QR = 'correct' | 'wrong' | 'skip' | 'quit';
async function question(loc: string, id: string, way: WayKey, title: string): Promise<QR> {
  const it = ITEM[id];
  const shell = (inner: string) => render(`<div class="panel" data-testid="practice-q" data-way="${way}"><h2>🎯 ${title}</h2><div style="text-align:center">${inner}
    <div id="fb"></div><button class="secondary" id="quit" data-testid="practice-quit" style="margin-top:10px">Stop practice</button></div></div>`);
  let quitR: (v: QR) => void = () => {};
  const quitP = new Promise<QR>(r => quitR = r);
  if (way[0] === 'r') {
    const n = Math.max(B.learning.minOptions, LOC[loc].mcOptions);
    const opts = [id, ...distractors(id, n - 1)].sort(() => Math.random() - 0.5);
    const zhToEn = way === 'rZE';
    shell(`${zhToEn ? `<div class="zh-big">${it.zh}</div><button class="secondary" id="say">🔊</button>` : `<div class="prompt">Which one is <b>“${esc(it.enPrimary)}”</b>?</div>`}
      <div class="options">${opts.map(o => `<button data-o="${o}" data-testid="opt">${zhToEn ? esc(ITEM[o].enPrimary) : ITEM[o].zh}</button>`).join('')}</div>`);
    on('#quit', () => quitR('quit'));
    (window as any).__proto.q = { id, way, answerId: id, practice: true };
    if (zhToEn) { on('#say', () => sayItem(id)); sayItem(id); }
    const pick = await Promise.race([quitP, new Promise<string>(r => on('[data-o]', (_e, el) => r(el.dataset.o!)))]);
    if (pick === 'quit') return 'quit';
    $$('[data-o]').forEach(b => { (b as HTMLButtonElement).disabled = true; if (b.dataset.o === id) b.classList.add('right'); else if (b.dataset.o === pick) b.classList.add('wrong'); });
    const ok = pick === id; playSfx(ok ? 'sfx_correct' : 'sfx_wrong');
    $('#fb').innerHTML = `<div class="feedback ${ok ? 'ok' : 'bad'}" data-testid="${ok ? 'pfb-ok' : 'pfb-bad'}">${ok ? '✅' : '❌'} ${it.zh} = ${esc(it.en)}</div>`;
    if (!ok) sayItem(id);
    await sleep(ok ? 600 : 1500);
    return ok ? 'correct' : 'wrong';
  }
  const zhAns = way === 'sEZ';
  shell(`${zhAns ? `<div class="prompt">🎤 Say it in <b>Chinese</b>: <b>“${esc(it.enPrimary)}”</b></div>` : `<div class="prompt">🎤 Say what this means in <b>English</b>:</div><div class="zh-big">${it.zh}</div>`}
    <button id="mic" data-testid="mic">🎤</button><div id="micmsg" class="muted">Tap the mic, then speak.</div>`);
  on('#quit', () => quitR('quit'));
  (window as any).__proto.q = { id, way, answerId: id, zh: it.zh, en: it.enPrimary, practice: true, spoken: true };
  if (!zhAns) sayItem(id);
  for (let tries = 0; tries < 2; tries++) {
    const go = await Promise.race([quitP, new Promise<string>(r => ($('#mic') as HTMLButtonElement).onclick = () => r('go'))]);
    if (go === 'quit') return 'quit';
    const mic = $('#mic'); mic.classList.add('listening'); $('#micmsg').textContent = 'Listening… say it now!';
    const lr = await listen(zhAns ? 'zh-CN' : 'en-US', [...it.zh].length > B.speech.longAnswerSyllables);
    mic.classList.remove('listening');
    if (lr.kind === 'fatal') { session.speechBlocked = true; session.speechBlockReason = lr.code; toast('🔇 Speech is off for now.'); return 'skip'; }
    if (lr.kind === 'tech') { $('#micmsg').textContent = '🤫 I didn\'t hear anything. Tap and talk!'; continue; }
    const ok = lr.kind === 'result' && (zhAns ? matchZh(lr.alts, it) : matchEn(lr.alts, it)).ok;
    const heard = lr.kind === 'result' ? lr.alts.join(' / ') : '(could not understand)';
    playSfx(ok ? 'sfx_correct' : 'sfx_wrong');
    $('#fb').innerHTML = `<div class="feedback ${ok ? 'ok' : 'bad'}" data-testid="${ok ? 'pfb-ok' : 'pfb-bad'}">${ok ? '✅' : '❌'} ${it.zh} = ${esc(it.en)}<div class="muted">I heard: ${esc(heard)}</div></div>`;
    if (!ok) sayItem(id);
    await sleep(ok ? 700 : 1600);
    return ok ? 'correct' : 'wrong';
  }
  return 'skip';   // two silent tries: no credit, no penalty
}
void prog;
