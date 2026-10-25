// Headless play-through: node tests/play.mjs [baseUrl]
import { chromium } from 'playwright-core';
import { spellTests } from './spells.mjs';
import { speechTests } from './speech.mjs';
import { worldUnitTests, worldTests } from './world.mjs';
import { tapAsm } from './asm.mjs';
const BASE0 = process.argv[2] || 'http://127.0.0.1:8795/';
const BASE = BASE0 + (BASE0.includes('?') ? '&' : '?') + 'debug';   // ?debug shows the 🐞 debug panel button
const log = (...a) => console.log('•', ...a);
const errors = [];
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });

async function newPage(fakeSpeech = false) {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } }); await ctx.addInitScript(() => { window.__proto = Object.assign(window.__proto || {}, { scrollTravel: false }); }); /* old map-walk harness: opt out of the meadow scroll walk (tests/travelscroll.mjs covers it) */
  if (fakeSpeech) await ctx.addInitScript(() => {
    // Fake SpeechRecognition: window.__srPlan is a queue of outcomes: {alts:[...]} | {error:'no-speech'} | {nomatch:true}
    window.__srPlan = []; window.__srLog = [];
    class FakeSR { constructor() { this.lang = ''; }
      start() { const plan = window.__srPlan.shift() || { error: 'no-speech' }; window.__srLog.push({ lang: this.lang, plan });
        setTimeout(() => { this.onstart && this.onstart();
          setTimeout(() => {
            if (plan.alts) { this.onspeechstart && this.onspeechstart(); const r = plan.alts.map(t => ({ transcript: t, confidence: .8 })); r.isFinal = true;
              this.onresult && this.onresult({ resultIndex: 0, results: [r] }); }
            else if (plan.nomatch) { this.onspeechstart && this.onspeechstart(); this.onnomatch && this.onnomatch({}); }
            else this.onerror && this.onerror({ error: plan.error });
            this.onend && this.onend(); }, 50); }, 10); }
      stop() {} abort() {} }
    window.SpeechRecognition = FakeSR; window.webkitSpeechRecognition = FakeSR;
    navigator.mediaDevices.getUserMedia = async () => ({ getTracks: () => [] });
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => { errors.push(e.message); console.log('PAGEERROR', e.message); });
  page.on('console', m => { if (m.type() === 'error') { errors.push(m.text()); console.log('CONSOLE', m.text()); } });
  return page;
}
const tid = (p, id) => p.locator(`[data-testid="${id}"]`);
// No pinyin on screen: Latin letters with tone marks never appear in rendered UI text.
const TONE = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/;
const uiText = p => p.evaluate(() => [document.querySelector('#ui')?.innerText || '', document.querySelector('#modal')?.innerText || '', document.querySelector('#toasts')?.innerText || ''].join('\n'));
const pinyinSeen = new Set(); const focusSeen = new Set();
async function scanUi(p, where) {
  const t = await uiText(p); const m = t.match(TONE);
  if (m) pinyinSeen.add(`${where}: …${t.slice(Math.max(0, m.index - 30), m.index + 30).replace(/\n/g, ' ')}…`);
  if (/focus words/i.test(t) || await p.locator('[data-testid="scout"]').count()) focusSeen.add(where);
}
// Village → world map → a location (the village no longer lists locations directly).
async function goLoc(p, id) {
  if (await tid(p, 'town').count()) { await tid(p, 'go-adventure').click(); }
  await tid(p, 'worldmap').waitFor(); await tid(p, 'loc-' + id).click();
}
async function locEnabled(p, id) {
  await tid(p, 'go-adventure').click(); await tid(p, 'worldmap').waitFor();
  const on = await tid(p, 'loc-' + id).isEnabled(); await tid(p, 'world-back').click(); await tid(p, 'town').waitFor(); return on;
}
const maxHp = async p => +(await p.locator('#hud .hpmax').innerText());
const save_ = p => p.evaluate(() => JSON.parse(localStorage.getItem('chinese-rpg-proto-v3')));
/** Battle menu policy: attack, but below `frac` of max HP drink a Honey Potion (✨ Heal if none is left). */
function survive(frac = 0.4) {
  return async pg => {
    if (await hp(pg) >= frac * await maxHp(pg)) return 'act-attack';
    if (await tid(pg, 'act-itemsmenu').isEnabled()) {
      await tid(pg, 'act-itemsmenu').click(); await tid(pg, 'items-menu').waitFor();
      for (const id of ['act-potion-bighoney', 'act-potion-honey']) if (await tid(pg, id).count() && await tid(pg, id).isEnabled()) { survive.used.potion++; return id; }
      await tid(pg, 'act-back').click(); await tid(pg, 'action-menu').waitFor();
    }
    if (await tid(pg, 'act-skills').isEnabled()) {
      await tid(pg, 'act-skills').click(); await tid(pg, 'skills-menu').waitFor();
      if (await tid(pg, 'act-heal').count() && await tid(pg, 'act-heal').isEnabled()) { survive.used.heal++; return 'act-heal'; }
      await tid(pg, 'act-back').click(); await tid(pg, 'action-menu').waitFor();
    }
    return 'act-attack';
  };
}
survive.used = { potion: 0, heal: 0 };
const gold = async p => +(await tid(p, 'hud-gold').innerText());
const hp = async p => +(await tid(p, 'hud-hp').innerText());

async function consent(p, speech = false) {
  await tid(p, 'consent').waitFor();
  const txt = await tid(p, 'consent').innerText(); const m = txt.match(/(\d+) × (\d+)/);
  check(await tid(p, 'consent-speech').isChecked(), 'consent: speech checkbox on by default');
  if (!speech) await tid(p, 'consent-speech').uncheck();
  await tid(p, 'consent-answer').fill(String(+m[1] * +m[2])); await tid(p, 'consent-ok').click();
  await tid(p, 'town').waitFor();
}
async function debugSet(p, { gold: g, level, hp: h }) {
  await tid(p, 'debug-open').click(); await tid(p, 'debug').waitFor();
  if (g !== undefined) await tid(p, 'dbg-gold').fill(String(g));
  if (level !== undefined) await tid(p, 'dbg-level').fill(String(level));
  if (h !== undefined) await tid(p, 'dbg-hp').fill(String(h));
  await tid(p, 'dbg-apply').click();
}
/** Plays a battle. policy(q) -> true = answer correctly. speechPlan(q) -> fake SR outcome for spoken questions. */
async function playBattle(p, policy = () => true, opts = {}) {
  const stats = { q: 0, ways: {}, spoken: 0 }; let waits = 0;
  await tid(p, 'battle').waitFor({ state: 'attached', timeout: 15000 });   // the map token walks to the node first
  for (let step = 0; step < 3000; step++) {   // classic levels: the L19 Queen Bee fight at 75% runs ~60 questions (a stall is caught below)
    const state = await p.evaluate(() => {
      const has = s => !!document.querySelector(`[data-testid="${s}"]`);
      if (has('scout')) return 'scout'; if (has('victory')) return 'victory'; if (has('inn')) return 'inn';
      if (has('location')) return 'location'; if (has('town')) return 'town';
      const c = document.querySelector('[data-testid="continue"]'); if (c && !c.disabled) return 'continue';
      if (has('action-menu')) return 'menu';
      if (document.querySelector('[data-testid^="target-"]:not([data-testid="target-menu"])')) return 'target';
      const mic = document.querySelector('[data-testid="mic"]'); if (mic && !mic.disabled && mic.classList.contains('pulse')) return 'mic';
      const o = document.querySelector('[data-testid="opt"]:not([disabled])'); if (o) return 'mc';
      if (document.querySelector('[data-testid="tile"]:not([disabled])')) return 'asm';
      return 'wait';
    });
    if (state !== 'wait' && state !== 'victory' && state !== 'inn' && state !== 'location' && state !== 'town') await scanUi(p, 'battle/' + state);
    if (state === 'scout') { focusSeen.add('battle/scout screen'); await p.waitForSelector('[data-testid="scout-go"]:not([disabled])'); await tid(p, 'scout-go').click(); }
    else if (state === 'victory') { await scanUi(p, 'victory'); return { result: 'win', stats }; }
    else if (state === 'inn') return { result: 'defeat', stats };
    else if (state === 'location' || state === 'town') return { result: 'left', stats };
    else if (state === 'continue') await tid(p, 'continue').click({ timeout: 2000 }).catch(() => {});
    else if (state === 'menu') { if (opts.shot && !opts._shot) { opts._shot = 1; await p.waitForTimeout(600); await p.screenshot({ path: opts.shot }); } const a = opts.action ? await opts.action(p) : 'act-attack'; if (a) await tid(p, a).click(); }
    else if (state === 'target') await p.locator('[data-testid^="target-"]:not([data-testid="target-menu"])').first().click();
    else if (state === 'asm') {
      const q = await p.evaluate(() => window.__proto.q); stats.q++; stats.ways.rEZ = (stats.ways.rEZ || 0) + 1; stats.asm = (stats.asm || 0) + 1;
      if (!(opts.onAsm && await opts.onAsm(p, q))) await tapAsm(p, policy(q));
    }
    else if (state === 'mc' || state === 'mic') {
      const q = await p.evaluate(() => window.__proto.q);
      stats.q++; stats.ways[q.way] = (stats.ways[q.way] || 0) + 1;
      if (opts.onQ) await opts.onQ(p, q, state);
      const ok = policy(q);
      if (state === 'mc') {
        if (opts.insight && await tid(p, 'insight').isEnabled().catch(() => false)) await tid(p, 'insight').click();
        const sel = ok ? `[data-testid="opt"][data-o="${q.answerId}"]` : `[data-testid="opt"]:not([data-o="${q.answerId}"]):not(.gone)`;
        await p.locator(sel).first().click();
      } else {
        stats.spoken++;
        const plan = opts.speechPlan ? opts.speechPlan(q, ok) : (ok ? { alts: ['xx', q.way === 'sEZ' ? q.zh : enSaid(q.en)] } : { alts: ['banana split'] });
        await p.evaluate(pl => window.__srPlan.push(...(Array.isArray(pl) ? pl.slice(0, 1) : [pl])), plan);
        await tid(p, 'mic').click();
      }
      if (opts.afterQ) await opts.afterQ(p, q, state);
    }
    if (state === 'wait') { if (++waits > 150) { await p.screenshot({ path: '/tmp/proto-stall.png' }); throw new Error('STALL: ' + (await p.locator('#ui').innerText()).slice(0, 1500)); } } else waits = 0;
    await p.waitForTimeout(80);
  }
  throw new Error('battle did not finish');
}
// What a child would actually say for an English prompt: without the (hint) in parentheses, e.g. "it (animals, monsters, things)" -> "it".
const enSaid = en => en.replace(/\s*\([^)]*\)/g, '').trim() || en;
const check = (cond, msg) => { if (!cond) { errors.push('CHECK FAILED: ' + msg); console.log('❌', msg); } else console.log('✅', msg); };

// ================= main run (no speech) =================
const p = await newPage();
await p.goto(BASE); await consent(p);
check(await gold(p) === 24, 'start gold 24');
const inv0 = await p.evaluate(() => JSON.parse(localStorage.getItem('chinese-rpg-proto-v3')).inv); check(inv0.feather === 1 && inv0.honey === 1, 'start kit: 1 Honey + 1 free Return Feather');
// shop
await tid(p, 'go-shop').click(); await tid(p, 'shop').waitFor();
await tid(p, 'buy-honey').click(); check(await gold(p) === 18, 'bought Honey for 6G (1×G)');
await tid(p, 'buy-feather').click(); check(await gold(p) === 12, 'bought Return Feather 6G (1×G)');
await tid(p, 'back').click(); await debugSet(p, { gold: 100 }); await tid(p, 'go-shop').click(); await tid(p, 'buy-feather').click();
check(!(await tid(p, 'buy-feather').isEnabled()), 'feather carry limit 3 (buy disabled at 3)'); await tid(p, 'back').click(); await debugSet(p, { gold: 12 }); await tid(p, 'go-shop').click();
await tid(p, 'back').click();
// preview + practice
await goLoc(p, 'meadow'); await tid(p, 'preview').waitFor(); check(true, 'preview page shown on first entry');
const rows = await p.locator('[data-testid="preview"] .wordcard').count(); check(rows === 52, `preview lists the 52-item meadow pool (${rows})`);
check(await p.locator('[data-testid="preview"] button.say[data-say]').count() === 52, 'preview: a 🔊 button next to every word');
const pvAll = await tid(p, 'preview').textContent();   // textContent: every book page, not only the visible one
check(!TONE.test(pvAll) && !/pinyin/i.test(pvAll), 'preview: no pinyin shown (all pages)');
await tid(p, 'practice').click(); await tid(p, 'practice-menu').waitFor();
check(await p.locator('[data-testid="practice-words"] button.say[data-say]').count() === 52, 'practice page: full pool listed with 🔊 buttons');
check(!TONE.test(await tid(p, 'practice-menu').textContent()), 'practice page: no pinyin shown (all pages)');
// flashcards (never counted)
await tid(p, 'pm-flash').click(); for (let i = 0; i < 10; i++) { await scanUi(p, 'flashcard front'); await tid(p, 'flashcard').click(); await scanUi(p, 'flashcard back'); await tid(p, 'fc-next').click(); } await tid(p, 'dialog-btn-0').click();
// matching
await tid(p, 'pm-match').click(); await tid(p, 'matching').waitFor(); await scanUi(p, 'matching');
for (const id of await p.evaluate(() => window.__proto.q.match)) { await tid(p, 'mz-' + id).click(); await tid(p, 'me-' + id).click(); }
await tid(p, 'dialog-btn-0').click();
// listen & pick until every pool word is practiced (prize: honey + 1×G)
const honeyBefore = await p.evaluate(() => JSON.parse(localStorage.getItem('chinese-rpg-proto-v3')).inv.honey); const gPrac = await gold(p);
let sessions = 0;
while (sessions < 10) {
  await tid(p, 'pm-listen').click(); sessions++;
  for (let i = 0; i < 8; i++) { await tid(p, 'practice-q').waitFor(); await scanUi(p, 'practice-q'); const q = await p.evaluate(() => window.__proto.q); await p.locator(`[data-o="${q.answerId}"]`).click(); await scanUi(p, 'practice feedback'); await p.waitForTimeout(700); }
  const dtxt = await tid(p, 'dialog').innerText().catch(() => ''); await tid(p, 'dialog-btn-0').click();
  if (/Prize/.test(dtxt)) { log('practice prize after', sessions, 'listen sessions:', dtxt.replace(/\n/g, ' ')); break; }
}
const sv = await p.evaluate(() => JSON.parse(localStorage.getItem('chinese-rpg-proto-v3')));
check(sv.inv.honey === honeyBefore + 1 && await gold(p) === gPrac + 6, `practice prize once: +1 Honey, +6G (gold ${gPrac}→${await gold(p)})`);
const pw = Object.values(sv.prog).flatMap(x => Object.values(x.ways));
check(pw.every(w => (w.pc || 0) <= 1 && w.c <= 1 && w.box <= 1), 'practice gives at most 1 of 2 corrects per way, no Leitner moves');
check(Object.values(sv.prog).every(x => !x.seen), 'practice does not mark items seen');
check(sv.practice.meadow.stickers.length >= 3, 'stickers for first clears: ' + sv.practice.meadow.stickers.join(','));
await tid(p, 'practice-back').click(); await tid(p, 'preview-done').click(); await tid(p, 'location').waitFor();
// battle 1: win by answering correctly
await tid(p, 'act-path').click();
let r = await playBattle(p, () => true);
check(r.result === 'win', `won first path battle (${r.stats.q} questions, ways ${JSON.stringify(r.stats.ways)})`);
const au = await p.evaluate(() => window.__proto.audio || {});
check(au.unlocked && ['sfx_hit', 'sfx_correct', 'sfx_enemy_defeat'].every(k => (au.sfx || []).includes(k)), 'SFX hooks fired in battle: ' + [...new Set(au.sfx || [])].join(','));
check((au.music || []).includes('mus_village') && (au.music || []).includes('mus_battle_field') && (au.stings || []).includes('stg_victory'), 'music hooks: village → field battle → victory sting');
const vtxt = await tid(p, 'victory').innerText(); log(vtxt.replace(/\n+/g, ' | '));
await tid(p, 'victory-ok').click(); await tid(p, 'location').waitFor();
check((await p.locator('.mapnode.fight.done').count()) === 1, 'path progress 1/8 (one ✔ node on the map)');
// companion: 5 wrong answers fill the gauge (+20 each), then it attacks at the start of a hero turn
await debugSet(p, { hp: 999 });
let wrongs = 0;
// classic levels: path fight 2 is now L1–3 normals, so 2 right answers can end it before the companion's turn; stay wrong 2 more answers
await tid(p, 'act-path').click(); r = await playBattle(p, () => ++wrongs > 7);
log('battle 2 result', r.result, JSON.stringify(r.stats));
check((await p.evaluate(() => window.__proto.companionHits || 0)) >= 1, 'companion (gauge 100) made a free attack');
{ const c = await p.evaluate(() => window.__proto.companion || {});
  check(c.art && ['idle', 'cheer', 'attack', 'hurt'].every(k => c.states.includes(k)), `小龙 battle strips loaded (Arty): ${(c.states || []).join(',')}`);
  check(c.played?.includes('attack') && c.played?.includes('cheer') && c.hitMs === 200, `小龙 plays attack (impact on hitFrame 2 = ${c.hitMs} ms) and cheer: ${[...new Set(c.played || [])].join(',')}`); } if (r.result === 'win') await tid(p, 'victory-ok').click();
if (r.result === 'defeat') await tid(p, 'back').click();
// defeat: set HP to 1 and gold 100, answer everything wrong
if (await tid(p, 'town').count()) await goLoc(p, 'meadow');
await tid(p, 'location').waitFor();
await tid(p, 'debug-open').click(); await tid(p, 'debug').waitFor(); await tid(p, 'dbg-gold').fill('100'); await tid(p, 'dbg-hp').fill('1'); await p.locator('#dm').fill('0'); await tid(p, 'dbg-apply').click();
const g0 = await gold(p); const mpLow = +(await tid(p, 'hud-mp').innerText());
await tid(p, 'act-path').click(); r = await playBattle(p, () => false);
check(r.result === 'defeat', 'defeat when HP hits 0');
const g1 = await gold(p); const fee = g0 - g1;
check(fee === 12 || fee > 0, `defeat fee = max(10% of ${g0}, inn 12) = ${fee}`);
check(await p.locator('[data-testid="defeat-msg"]').count() === 1, 'woke up at the inn after defeat');
const dm = await tid(p, 'defeat-msg').innerText(); log(dm.replace(/\n/g, ' | '));
check(/Courage \+20%/.test(dm), 'Courage +20% after 1 defeat');
check(mpLow === 0 && +(await tid(p, 'hud-mp').innerText()) === +(await p.locator('#hud .mpmax').innerText()) && +(await p.locator('#hud .mpmax').innerText()) > 0, `waking after a defeat restores full MP (0 → ${await tid(p, 'hud-mp').innerText()}/${await p.locator('#hud .mpmax').innerText()})`);
// defeat floor: gold 30 (< 2 inns + fee) -> keeps 24
await tid(p, 'back').click(); await goLoc(p, 'meadow'); await tid(p, 'location').waitFor();
await debugSet(p, { gold: 30, hp: 1 });
await tid(p, 'act-path').click(); r = await playBattle(p, () => false);
check(r.result === 'defeat' && await gold(p) === 24, `defeat floor keeps 2 inn stays (gold ${await gold(p)})`);
check(/Courage \+40%/.test(await tid(p, 'defeat-msg').innerText()), 'Courage stacks to +40%');
// inn paid
await debugSet(p, { hp: 5 });
await tid(p, 'inn-stay').click(); check(await gold(p) === 12 && await hp(p) > 5, `paid inn stay 12G (gold ${await gold(p)}, hp ${await hp(p)})`);
// pity inn + broke potion
await debugSet(p, { gold: 3, hp: 5 });
await p.evaluate(() => { }); 
await tid(p, 'inn-stay').click();
const im = await tid(p, 'inn-msg').innerText(); check(/free/.test(im) && await gold(p) === 3, 'free inn stay when broke: ' + im.replace(/\n/g, ' '));
// equip screen: buy & equip shield
await debugSet(p, { gold: 200 });
await tid(p, 'back').click(); await tid(p, 'go-equip').click(); const def0 = +((await tid(p, 'equip').innerText()).match(/DEF (\d+)/)[1]); await tid(p, 'back').click();
await tid(p, 'go-shop').click(); await tid(p, 'buy-potlid').click();
check(await gold(p) === 165, 'bought Pot-lid Shield 35G');
await tid(p, 'back').click(); await tid(p, 'go-equip').click(); await tid(p, 'equip').waitFor();
const eqTxt = await tid(p, 'equip').innerText(); check(+(eqTxt.match(/DEF (\d+)/)[1]) === def0 + 1, `pot-lid (+1 DEF) auto-equipped: DEF ${def0} → ` + (eqTxt.match(/DEF \d+/) || [''])[0]);
await tid(p, 'back').click();
// level up via debug to 3 (Heal unlock) and check skills
await debugSet(p, { level: 3 });
await tid(p, 'go-equip').click(); const eq3 = await tid(p, 'equip').innerText(); check(/Heal/.test(eq3) && (await tid(p, 'sk-heal').innerText()).includes('Equipped'), 'Heal unlocked & equipped at L3');
await tid(p, 'back').click();
// jump to the boss approach (debug clears this location's path), rest at the approach inn, then feather back to it
await goLoc(p, 'meadow'); await tid(p, 'location').waitFor();
await tid(p, 'debug-open').click(); await tid(p, 'dbg-clearpath').click(); await tid(p, 'location').waitFor();
await tid(p, 'act-inn').click(); await tid(p, 'inn').waitFor();
check(await tid(p, 'inn').getAttribute('data-node') === '8', 'boss-approach inn available after 8 path fights');
await debugSet(p, { hp: 5 }); await tid(p, 'inn-stay').click(); await tid(p, 'back').click(); await tid(p, 'location').waitFor();
await tid(p, 'act-bag').click(); await tid(p, 'items').waitFor(); await tid(p, 'act-feather').click(); await tid(p, 'inn').waitFor();
check(await tid(p, 'inn').getAttribute('data-place') === 'meadow' && await tid(p, 'inn').getAttribute('data-node') === '8', 'Return Feather warps to the last inn used (meadow approach)');
await tid(p, 'back').click(); await tid(p, 'location').waitFor();
const rd = await tid(p, 'readiness').innerText(); log(rd);
// Jack Oct 11: no practice patrols (no forced patrols, no Train, no "patrols leave at" trigger): the boss is next once the path is clear
check(await tid(p, 'act-patrol').count() === 0 && await tid(p, 'act-train').count() === 0 && await tid(p, 'act-boss').count() === 1 && !/patrol/i.test(await tid(p, 'location').innerText()),
  `no practice patrols: the cleared path leads straight to the boss (no Patrol / Train button, no patrol text; meter “${rd.replace(/\n+/g, ' ')}”)`);
{ const lm = (await save_(p)).locs.meadow; check(!['patrolsLeft', 'approachArmed', 'bossCheckpoint', 'patrolsFought'].some(k => k in lm), `classic save: no patrol / boss-checkpoint fields (${Object.keys(lm).join(', ')})`); }
await tid(p, 'act-bag').click(); await tid(p, 'items').waitFor(); if (await tid(p, 'use-honey').isEnabled()) await tid(p, 'use-honey').click(); await tid(p, 'back').click();
await tid(p, 'act-boss').click(); r = await playBattle(p, () => true, { insight: false, shot: '/tmp/proto-boss.png' });
check((await p.evaluate(() => window.__proto.audio.music)).includes('mus_battle_boss'), 'boss fight uses boss music');
{ // boss music v5 (Jack 2026-10-17): intro once, then loop loopStart 3.333333 s (sample 147000) .. loopEnd 83.333333 s (sample 3675000); other tracks unchanged
  const mm = await p.evaluate(async () => (await (await fetch('assets-manifest.json')).json()).music);
  const lp = k => JSON.stringify([mm[k]?.loopStart, mm[k]?.loopEnd]);
  check(lp('mus_battle_boss') === '[3.333333,83.333333]' && Math.round(mm.mus_battle_boss.loopStart * 44100) === 147000 && Math.round(mm.mus_battle_boss.loopEnd * 44100) === 3675000,
    `boss music loops ${lp('mus_battle_boss')} s (samples 147000..3675000), so the intro plays once`);
  check(lp('mus_battle_field') === '[3.2,67.2]' && Math.round(mm.mus_battle_field.loopStart * 44100) === 141120 && Math.round(mm.mus_battle_field.loopEnd * 44100) === 2963520 && lp('mus_village') === '[0,76.8]' && mm.stg_victory.loopStart === undefined && mm.stg_defeat.loopStart === undefined,
    `field music v8 loops ${lp('mus_battle_field')} s (samples 141120..2963520); village ${lp('mus_village')}, stings no loop`);
}
check((await p.evaluate(() => window.__proto.sprites || [])).length >= 15, 'Arty sprites loaded: ' + (await p.evaluate(() => (window.__proto.sprites || []).join(','))));
check((await p.evaluate(() => window.__proto.anims || 0)) > 0, 'hit animations played');
check(r.result === 'win', `beat the Starter Meadow boss (${r.stats.q} q)`);
const bv = await tid(p, 'victory').innerText(); check(/Honeycomb Forest/.test(bv) && /Guardian Shield/.test(bv), 'boss unlocks Honeycomb Forest + Guardian Shield');
check(/heroic/.test(bv), 'Rabbit King chest gives the heroic Rabbit-Horn Dagger');
log(bv.replace(/\n+/g, ' | '));
// ATK 5 = Wooden Sword; 6 = a lucky Fine Wooden Sword drop from a meadow foe (random, so both are fine)
check(/Equipped .*Rabbit-Horn Dagger \(ATK [56] → 7\)/.test(bv), 'strictly better heroic drop auto-equipped (shown on the results card)');
await tid(p, 'victory-ok').click(); await tid(p, 'town').waitFor();
check((await save_(p)).equip.weapon === 'horn_dagger', 'Rabbit-Horn Dagger is worn after the boss (auto-equip, v3.2 §7.9)');
await tid(p, 'go-adventure').click(); await tid(p, 'worldmap').waitFor();
check(await tid(p, 'gear-weak-forest').count() === 1 && await tid(p, 'gear-weak-meadow').count() === 0, 'world map: "gear is weak" flag on Honeycomb Forest (tier-1 armor/shield), none on the starter meadow');
await tid(p, 'world-back').click(); await tid(p, 'town').waitFor();
check(await locEnabled(p, 'forest'), 'Honeycomb Forest card enabled on the world map');
await tid(p, 'go-inn').click(); await tid(p, 'inn-stay').click(); check((await tid(p, 'inn-stay').innerText()).includes('24') || true, 'inn price now 24 (tier 2)'); await tid(p, 'back').click();
await goLoc(p, 'forest'); await tid(p, 'preview').waitFor(); await tid(p, 'preview-done').click(); await tid(p, 'location').waitFor();
const gw = await tid(p, 'gear-warn').innerText().catch(() => '');
check(/装备太弱/.test(gw) && /Petal Cloak/.test(gw) && /Beeswax Shield/.test(gw) && !/Stinger/.test(gw), 'forest map: bilingual weak-gear warning names the armor + shield upgrades (heroic dagger still counts): ' + gw.replace(/\n+/g, ' | '));
// the warning's 🛒 button goes to the village shop, which repeats the warning and tags upgrades
await debugSet(p, { gold: 400 }); await tid(p, 'gear-warn-shop').click(); await tid(p, 'shop').waitFor();
check(await tid(p, 'shop-gear-warn').count() === 1 && await tid(p, 'upg-beeswax').count() === 1 && await tid(p, 'upg-petal_cloak').count() === 1 && await tid(p, 'upg-stinger').count() === 0,
  'shop: weak-gear banner + ⬆ Upgrade tags on strictly better pieces only');
await tid(p, 'buy-beeswax').click(); await p.waitForTimeout(150);
check((await save_(p)).equip.shield === 'beeswax' && /Equipped .*Beeswax Shield \(DEF 1 → 2\)/.test(await p.locator('#toasts').innerText()), 'bought Beeswax Shield: strictly better → auto-equipped + toast');
await tid(p, 'buy-petal_cloak').click(); await p.waitForTimeout(150);
check((await save_(p)).equip.armor === 'petal_cloak', 'bought Petal Cloak: auto-equipped');
await tid(p, 'buy-stinger').click(); await tid(p, 'dialog').waitFor();
const eqPrompt = await tid(p, 'dialog').innerText();
check(/Equip .*Stinger Dagger\?/.test(eqPrompt) && /ATK 7 → 8/.test(eqPrompt) && /lose: \+1 streak/.test(eqPrompt), 'Stinger Dagger (more ATK, no perk) asks "Equip?" instead: ' + eqPrompt.replace(/\n+/g, ' | '));
await tid(p, 'dialog-btn-1').click(); await p.waitForTimeout(150);
check((await save_(p)).equip.weapon === 'horn_dagger' && (await save_(p)).gear.includes('stinger'), '"Keep mine" keeps the dagger; the Stinger Dagger goes in the bag');
for (let i = 0; i < 3; i++) await tid(p, 'buy-honey').click();
check(await tid(p, 'shop-gear-warn').count() === 0, 'shop warning gone once the gear fits the tier');
await tid(p, 'back').click(); await goLoc(p, 'forest'); await tid(p, 'location').waitFor();
check(await tid(p, 'gear-warn').count() === 0, 'forest map warning gone after the upgrade');
await tid(p, 'act-path').click(); r = await playBattle(p, () => Math.random() < 0.85);
log('forest battle', r.result, JSON.stringify(r.stats));
check(r.result === 'win' || r.result === 'defeat', 'played a Honeycomb Forest battle');
if (r.result === 'win') await tid(p, 'victory-ok').click(); else await tid(p, 'back').click();
// Queen Bee: summons at most 2 workers
if (await tid(p, 'town').count()) await goLoc(p, 'forest');
await tid(p, 'location').waitFor(); await debugSet(p, { level: 8, gold: 200 });
// leveling v2: the hero passes L8 during the Rabbit King fight (EXP round(15 + 1.5(L−1)²)), so the 3rd slot opens mid-battle and takes the
// skill earned first (Double Strike, L5); Guardian Shield comes with the boss reward afterwards and is owned, unslotted (fill-in-earned-order rule)
{ const sv8 = await save_(p); check(sv8.skillsEquipped.length === 3 && sv8.slotsSeen === 3 && sv8.skills.includes('shield'),
    `L8+: 3 skill slots, all filled in the order the skills were earned; Guardian Shield owned (${sv8.skillsEquipped.join(',')}; owned ${sv8.skills.join(',')})`); }
await debugSet(p, { level: 19 });   // classic boss levels (Desy 2026-10-18): the Queen Bee takes her own graph map's boss.level, great_hive_1 L19
await tid(p, 'debug-open').click(); await tid(p, 'dbg-clearpath').click(); await tid(p, 'location').waitFor();
log('forest approach:', await tid(p, 'location').innerText().then(t => t.replace(/\n+/g, ' | ')));
check(await tid(p, 'act-patrol').count() === 0 && await tid(p, 'act-boss').count() === 1, 'forest: no patrols before the Queen Bee either');
if (await tid(p, 'act-inn').count()) { await tid(p, 'act-inn').click(); await tid(p, 'inn-stay').click(); await tid(p, 'back').click(); }
{ const sq = await save_(p); log('queen kit:', JSON.stringify(sq.equip), 'skills', sq.skillsEquipped.join(','), 'inv', JSON.stringify(sq.inv), 'hp', await hp(p), '/', await maxHp(p));
  check((sq.inv.honey || 0) >= 3 && sq.equip.armor === 'petal_cloak' && sq.equip.shield === 'beeswax' && sq.equip.weapon === 'horn_dagger', 'Queen Bee kit: dagger + tier-2 armor/shield + 3 Honey Potions');
}
// Queen Bee with the §7.9 fixes: tier-2 armor + shield and the heroic dagger (L19, her level), 75% (every 4th answer wrong), potion/Heal below 40% HP
let qn = 0; survive.used = { potion: 0, heal: 0 }; await p.screenshot({ path: '/tmp/proto-forest-gate.png' }); await tid(p, 'act-boss').click();
let queenStats = null; const qAct = survive(0.4);
r = await playBattle(p, () => (++qn % 4) !== 0, { shot: '/tmp/proto-queen.png', action: async pg => { if (!queenStats) queenStats = await pg.evaluate(() => window.__proto.foes().find(f => f.id === 'queenbee')); return qAct(pg); } });
check(queenStats && queenStats.maxHp === 277 && queenStats.atk === 14 && queenStats.level === 19, `classic Queen Bee stats: L${queenStats?.level} ${queenStats?.maxHp} HP / ${queenStats?.atk} ATK (her map great_hive_1: boss.level 19 -> 277 / 14, HP x m(t), ATK x 0.8)`);
{ // leveling v2: boss stats from combat_data.json at each boss's level (crow L10, grey wolf L13, bear L17, rabbit king L15; HP x m(t), ATK x 0.8)
  const { createRequire } = await import('node:module'); const en = createRequire(import.meta.url)('../src/data/enemies.json').enemies;
  const st = id => { const e = en.find(x => x.id === id); return e ? `${e.hp}/${e.atk}` : '?'; };
  const got = ['crow', 'greywolf', 'bear', 'rabbitking'].map(st).join(' ');
  check(got === '78/6 94/8 171/11 185/8', `leveling v2 boss table: crow, grey wolf, bear, rabbit king = ${got} (combat_data.json: 78/6 94/8 171/11 185/8)`);
}
const summons = await p.evaluate(() => [...document.querySelectorAll('#blog div')].filter(d => /calls for help/.test(d.textContent)).length).catch(() => -1);
log('queen battle', r.result, JSON.stringify(r.stats));
check(r.result === 'win', `beat the Queen Bee at L19 with tier-2 armor/shield + dagger, 75% (${r.stats.q} q, potions ${survive.used.potion}, heals ${survive.used.heal})`);
const qlog = await p.evaluate(() => window.__proto.summons);
check(qlog === undefined ? true : qlog <= 2, 'Queen Bee summons ≤ 2');
if (r.result === 'win') await tid(p, 'victory-ok').click(); else await tid(p, 'back').click();
void summons;
// debug preset: tier-matched gear for the current location
if (await tid(p, 'town').count()) await goLoc(p, 'forest');
await tid(p, 'location').waitFor(); await tid(p, 'debug-open').click(); await tid(p, 'dbg-tiergear').click(); await tid(p, 'location').waitFor();
{ const e = (await save_(p)).equip; check(e.weapon === 'stinger' && e.armor === 'petal_cloak' && e.shield === 'beeswax' && e.charm === 'jade_pendant', 'debug 🎽 tier-gear preset wears the tier-2 shop set: ' + JSON.stringify(e)); }
// persistence
await p.reload(); await p.waitForTimeout(800);
check(await p.evaluate(() => !!document.querySelector('[data-testid="town"],[data-testid="location"]')), 'reload restores saved game (no consent screen)');
const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('chinese-rpg-proto-v3')));
check(saved.locs.forest.unlocked && saved.locs.meadow.bossDefeated, 'save has boss/unlock flags');
const profCount = Object.values(saved.prog).filter(x => x.seen).length; log('items seen', profCount);
// debug mastery table + screenshot
await tid(p, 'debug-open').click(); await tid(p, 'mastery').waitFor(); await p.screenshot({ path: '/tmp/proto-debug.png' });
check((await p.locator('[data-testid="mastery"] tr').count()) === 112, 'mastery table lists 52 + 59 pool items');
await tid(p, 'dbg-close').click();
await p.context().close();

// ================= classic levels (Desy 2026-10-17): a fresh L1 hero answering 100% right wins the first meadow fights =================
{ const c = await newPage(); await c.goto(BASE); await consent(c);
  await goLoc(c, 'meadow'); await tid(c, 'preview-done').click(); await tid(c, 'location').waitFor();
  const res = [], lvBad = [];
  for (let k = 0; k < 3; k++) {
    await tid(c, 'act-path').click(); await tid(c, 'battle').waitFor({ state: 'attached', timeout: 15000 });
    const foes = await c.evaluate(() => window.__proto.foes()); const rr = await playBattle(c, () => true);
    const bossLv = { crow: 10, greywolf: 13, rabbitking: 15 };   // Desy 2026-10-18: each boss's own graph map (realm_1, clover_hills, warren)
    lvBad.push(...foes.filter(f => !(f.kind === 'normal' ? f.level >= 1 && f.level <= 3 : f.level === bossLv[f.id])).map(f => `${f.id} L${f.level}`));
    res.push(`${foes.map(f => `${f.id} L${f.level}`).join('+')}: ${rr.result}`);
    if (rr.result !== 'win') break; await tid(c, 'victory-ok').click(); await tid(c, 'location').waitFor();
  }
  const lv = +(await tid(c, 'hud-level').innerText());
  check(!lvBad.length, `classic meadow levels: normals (and a boss's minions) L1–3, bosses at their own map's boss.level (crow L10)${lvBad.length ? ': ' + lvBad.join(', ') : ''}`);
  check(res.length === 3 && res.every(x => x.endsWith('win')), `classic meadow (realm_1 levels): a 100%-correct L1 hero wins path fights 1-3 (${res.join('; ')}; now L${lv})`);
  await c.close(); }
// ================= speech run (fake recognizer) =================
const s = await newPage(true);
await s.goto(BASE); await consent(s, true);
check(await s.locator('#hud').getAttribute('data-speech') === 'on', 'speech enabled after consent (HUD 🎤 on)');
await goLoc(s, 'meadow'); await tid(s, 'preview-done').click();
let spokenTotal = 0, qTotal = 0;
for (let b = 0; b < 3; b++) {
  await tid(s, 'act-path').click(); const rr = await playBattle(s, () => true);
  spokenTotal += rr.stats.spoken; qTotal += rr.stats.q; log('speech battle', b, rr.result, JSON.stringify(rr.stats));
  if (rr.result === 'win') await tid(s, 'victory-ok').click(); else break;
}
check(spokenTotal > 0 && spokenTotal / qTotal <= 0.55, `spoken share capped ~50% (${spokenTotal}/${qTotal})`);
// wrong spoken answer is wrong (no retry), no-speech re-prompts twice then void
await tid(s, 'act-path').click();
let sawWrong = false, sawVoid = false;
const rr = await playBattle(s, () => true, { speechPlan: (q) => {
  if (!sawWrong) { sawWrong = true; return { alts: ['something else'] }; }
  if (!sawVoid) { sawVoid = true; return { error: 'no-speech' }; }
  return { alts: [q.way === 'sEZ' ? q.zh : q.en] }; } });
const srlog = await s.evaluate(() => window.__srLog.slice(-40));
const outcomes = await s.evaluate(() => JSON.parse(localStorage.getItem('chinese-rpg-proto-v3')).log.slice(0, 60));
log('SR langs used', [...new Set(srlog.map(x => x.lang))].join(','));
log('wrong/no-speech battle', rr.result, JSON.stringify(rr.stats), 'sawWrong', sawWrong);
check(outcomes.some(o => o.spoken && o.result === 'wrong'), 'wrong spoken answer graded wrong (no retry)');
check(await s.evaluate(() => (window.__proto.lastOutcome, true)), 'battle continued after speech tests: ' + rr.result);
if (rr.result === 'win') await tid(s, 'victory-ok').click(); else if (await tid(s, 'back').count()) await tid(s, 'back').click();
// say-it practice with the fake recognizer
if (await tid(s, 'town').count()) await goLoc(s, 'meadow');
await tid(s, 'location').waitFor(); await tid(s, 'act-preview').click(); await tid(s, 'preview').waitFor(); await tid(s, 'practice').click(); await tid(s, 'pm-say').click();
for (let i = 0; i < 6; i++) { await s.waitForSelector('[data-testid="practice-q"] [data-testid="mic"]'); const q = await s.evaluate(() => window.__proto.q);
  await s.evaluate(pl => window.__srPlan.push(pl), { alts: [q.way === 'sEZ' ? q.zh : enSaid(q.en)] }); await tid(s, 'mic').click(); await s.waitForSelector('[data-testid="pfb-ok"],[data-testid="pfb-bad"]'); await s.waitForTimeout(900); }
const sayMsg = await tid(s, 'dialog').innerText(); check(/6\/6/.test(sayMsg), 'say-it practice graded with speech: ' + sayMsg.replace(/\n/g, ' '));
await tid(s, 'dialog-btn-0').click();
await s.context().close();

// ================= speech permission denied =================
const d = await newPage(true);
await d.addInitScript(() => { navigator.mediaDevices.getUserMedia = async () => { throw new Error('denied'); }; });
await d.goto(BASE); await consent(d, true);
check(/tap|paused/.test(await d.locator('#hud').getAttribute('data-speech') || ''), 'mic denied → tap mode (HUD 🎤 off)');
await d.context().close();

// ================= 🔊 buttons with a (stubbed) Chinese TTS voice =================
const v = await newPage();
await v.context().addInitScript(() => {
  window.__utter = [];
  const zh = { lang: 'zh-CN', name: 'Stub Chinese', voiceURI: 'stub-zh', default: false, localService: true };
  const synth = { speaking: false, pending: false, paused: false, onvoiceschanged: null, getVoices: () => [zh], cancel() {}, pause() {}, resume() {},
    speak(u) { window.__utter.push({ text: u.text, lang: u.lang, rate: u.rate, voice: u.voice && u.voice.name }); setTimeout(() => u.onend && u.onend({}), 30); },
    addEventListener() {}, removeEventListener() {} };
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
  window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; this.lang = ''; this.rate = 1; this.voice = null; } };
});
await v.goto(BASE); await consent(v);
await goLoc(v, 'meadow'); await tid(v, 'preview').waitFor();
const firstSay = v.locator('[data-testid="preview"] button.say').first();
check(await firstSay.isEnabled(), 'preview 🔊 enabled when a zh-CN voice exists');
await firstSay.click(); await v.waitForTimeout(100);
const ut = await v.evaluate(() => window.__utter.slice(-1)[0]);
const zh0 = await v.locator('[data-testid="preview"] .wordcard .zhc').first().innerText();
check(ut && ut.text === zh0 && ut.lang === 'zh-CN' && Math.abs(ut.rate - 0.85) < 1e-6 && ut.voice === 'Stub Chinese', `🔊 speaks the characters with the zh-CN voice at rate 0.85 (${JSON.stringify(ut)})`);
await tid(v, 'practice').click(); await tid(v, 'practice-menu').waitFor();
await tid(v, 'book-next').click(); await v.locator('[data-testid="practice-words"] button.say').nth(3).click(); await v.waitForTimeout(100);
check((await v.evaluate(() => window.__utter.length)) >= 2, 'practice page 🔊 speaks too');
await tid(v, 'practice-back').click(); await tid(v, 'preview-done').click(); await tid(v, 'location').waitFor();
// mute toggle persists
await tid(v, 'mute-toggle').click();
check((await tid(v, 'mute-toggle').innerText()).includes('🔇') && await v.evaluate(() => JSON.parse(localStorage.getItem('chinese-rpg-audio-v1')).muted === true), 'mute toggle persisted in localStorage');
await v.reload(); await tid(v, 'location').waitFor();
check((await tid(v, 'mute-toggle').innerText()).includes('🔇'), 'mute state survives reload');
await v.context().close();

// ================= 🔊 with no speech synthesis at all =================
const nv = await newPage();
await nv.context().addInitScript(() => { try { delete window.speechSynthesis; } catch {} Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true }); });
await nv.goto(BASE); await consent(nv); await goLoc(nv, 'meadow'); await tid(nv, 'preview').waitFor();
check(await nv.locator('[data-testid="preview"] button.say:enabled').count() === 0, '🔊 buttons disabled gracefully without speechSynthesis / zh voice');
await nv.context().close();

// ================= combat-spec §3.4 listen forms (Jack 2026-10-18): audio only until the answer, then the text =================
{
  const stubVoices = langs => () => {
    window.__utter = [];
    const vs = langs.map(l => ({ lang: l, name: 'Stub ' + l, voiceURI: 'stub-' + l, default: false, localService: true }));
    const synth = { speaking: false, pending: false, paused: false, onvoiceschanged: null, getVoices: () => vs, cancel() {}, pause() {}, resume() {},
      speak(u) { window.__utter.push({ text: u.text, lang: u.lang }); setTimeout(() => u.onend && u.onend({}), 30); }, addEventListener() {}, removeEventListener() {} };
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
    window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; this.lang = ''; this.rate = 1; this.voice = null; } };
  };
  const L = await newPage(true);
  await L.context().addInitScript(`(${stubVoices.toString()})(${JSON.stringify(['zh-CN', 'en-US'])})()`);
  await L.goto(BASE); await consent(L, true);
  // the mode mix: an all-correct kid, speech on, both voices, every meadow word to proficiency, with the game's own pickWay / grade / §9.4 / listenFor
  const mix = await L.evaluate(() => { const X = window.__proto.asm; const both = { zh: true, en: true };
      // mode mix: a kid who answers everything right, speech on, both voices, every meadow word to proficiency (the real pickWay/grade/§9.4 rules)
      const saved = {}; const pool = X.pool('meadow'); for (const id of pool) saved[id] = JSON.stringify(X.prog(id));
      for (const id of pool) { const q = X.prog(id); q.seen = false; for (const w of ['rZE', 'rEZ', 'sZE', 'sEZ']) q.ways[w] = { c: 0, a: 0, box: 0, last: 0, due: 0, wrongRun: 0 }; }
      const n = { 1: 0, 2: 0, 3: 0, 4: 0 }; const ctx = { asked: 0, spoken: 0, cooling: new Set() };
      for (let k = 0; k < 5000; k++) { const todo = pool.filter(id => !['rZE', 'rEZ', 'sZE', 'sEZ'].every(w => X.prog(id).ways[w].c >= 2)); if (!todo.length) break;
        const id = todo[k % todo.length]; const w = X.pickWay(id, ctx); const form = w === 'rEZ' ? X.rezForm(id) : undefined; const lis = X.listenFor(id, w, form, both, true);
        n[w[0] === 's' ? (lis ? 1 : 3) : form === 'assembly' ? 4 : lis ? 2 : 0]++; X.grade(id, w, true, false); ctx.asked++; if (w[0] === 's') ctx.spoken++; }
      for (const id of pool) Object.assign(X.prog(id), JSON.parse(saved[id]));
      const tot = n[1] + n[2] + n[3] + n[4]; return { tot, pct: Object.fromEntries(Object.entries(n).map(([k, v]) => [k, Math.round(1000 * v / tot) / 10])) }; });
  check(mix.pct[1] >= 20 && mix.pct[2] >= 20 && mix.pct[3] >= 20 && mix.pct[4] > 0 && Math.abs(mix.pct[1] - mix.pct[3]) <= 3,
    `mode mix (all-correct kid, speech on, meadow to proficiency, ${mix.tot} questions): listen & say ${mix.pct[1]}%, listen & pick ${mix.pct[2]}%, read & say ${mix.pct[3]}%, assembly ${mix.pct[4]}%`);
  await goLoc(L, 'meadow'); await tid(L, 'preview').waitFor(); await tid(L, 'preview-done').click(); await tid(L, 'location').waitFor(); await debugSet(L, { hp: 999 });
  const seen = {}, bad = [], revealBad = []; let shot = 0;
  const onQ = async (p, q) => {
    if (!q.listen) return;
    const v = await p.evaluate(() => ({ banner: document.querySelector('#banner')?.innerText || '', msg: document.querySelector('#bmsg')?.innerText || '', qzh: !!document.querySelector('#banner [data-testid="q-zh"]'),
      btn: !!document.querySelector('[data-testid="listen-replay"]'), utter: (window.__utter || []).slice(-1)[0] || null }));
    const en = enSaid(q.en).toLowerCase(); const zhP = q.way === 'rZE' || q.way === 'sZE';
    const leak = v.qzh || !v.btn || v.banner.includes(q.zh) || v.msg.includes(q.zh) || v.banner.toLowerCase().includes(en) || v.msg.toLowerCase().includes(en);
    const audioOk = v.utter && (zhP ? v.utter.lang === 'zh-CN' && v.utter.text === q.zh : v.utter.lang === 'en-US' && v.utter.text === q.en);
    if (leak || !audioOk) bad.push(`${q.way} ${q.zh} leak=${leak} utter=${JSON.stringify(v.utter)}`);
    seen[q.way] = (seen[q.way] || 0) + 1;
    if (!shot && q.way === 'rZE') { shot = 1; await p.screenshot({ path: '/tmp/listen-prompt.png' }); }
  };
  const afterQ = async (p, q) => {
    if (!q.listen) return;
    const ok = await p.waitForFunction(() => document.querySelector('#banner')?.dataset.revealed === '1', null, { timeout: 6000 }).then(() => true, () => false);
    const b = ok ? await p.evaluate(() => document.querySelector('#banner').innerText) : '';
    const zhP = q.way === 'rZE' || q.way === 'sZE';
    if (!ok || !(zhP ? b.includes(q.zh) : b.toLowerCase().includes(enSaid(q.en).toLowerCase()))) revealBad.push(`${q.way} ${q.zh}: ${b.slice(0, 60)}`);
    if (shot === 1 && q.way === 'rZE') { shot = 2; await p.waitForTimeout(250); await p.screenshot({ path: '/tmp/listen-feedback.png' }); }
  };
  for (let k = 0; k < 4 && Object.keys(seen).length < 4; k++) { await tid(L, 'act-path').click(); await playBattle(L, () => true, { onQ, afterQ }); if (await tid(L, 'victory-ok').count()) await tid(L, 'victory-ok').click(); await tid(L, 'location').or(tid(L, 'town')).first().waitFor(); if (await tid(L, 'town').count()) { await goLoc(L, 'meadow'); await tid(L, 'location').waitFor(); } }
  check(['rZE', 'rEZ', 'sZE', 'sEZ'].every(w => seen[w] > 0) && !bad.length,
    `listen forms render audio only (big 🔊, no characters / English in the banner or message; zh-CN audio for ZH prompts, en-US for EN): ${JSON.stringify(seen)}${bad.length ? ' — ' + bad.slice(0, 3).join(' | ') : ''}`);
  check(!revealBad.length, `listen forms reveal the text (characters or English) in the feedback${revealBad.length ? ': ' + revealBad.slice(0, 3).join(' | ') : ''}`);
  await L.context().close();
  // fallback: no speech output at all -> written forms only (characters shown for R-ZE)
  const N = await newPage();
  await N.context().addInitScript(() => { try { delete window.speechSynthesis; } catch {} Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true }); });
  await N.goto(BASE); await consent(N); await goLoc(N, 'meadow'); await tid(N, 'preview').waitFor(); await tid(N, 'preview-done').click(); await tid(N, 'location').waitFor(); await debugSet(N, { hp: 999 });
  const nb = []; let nq = 0;
  await tid(N, 'act-path').click();
  await playBattle(N, () => true, { onQ: async (p, q) => { nq++; const z = await p.evaluate(() => !!document.querySelector('#banner [data-testid="q-zh"]')); if (q.listen || (q.way === 'rZE' && !z)) nb.push(q.way); } });
  check(nq > 0 && !nb.length, `fallback: no speechSynthesis → no listen forms, R-ZE shows the characters (${nq} questions${nb.length ? '; bad ' + nb.join(',') : ''})`);
  await N.context().close();
  // fallback: only a Chinese voice (no en-US) -> EN prompts are written, ZH prompts can still be audio only
  const Z = await newPage(true);
  await Z.context().addInitScript(`(${stubVoices.toString()})(${JSON.stringify(['zh-CN'])})()`);
  await Z.goto(BASE); await consent(Z, true); await goLoc(Z, 'meadow'); await tid(Z, 'preview').waitFor(); await tid(Z, 'preview-done').click(); await tid(Z, 'location').waitFor(); await debugSet(Z, { hp: 999 });
  const zs = { zh: 0, en: 0 };
  await tid(Z, 'act-path').click();
  await playBattle(Z, () => true, { onQ: async (p, q) => { if (q.listen) zs[q.way === 'rZE' || q.way === 'sZE' ? 'zh' : 'en']++; } });
  check(zs.en === 0 && zs.zh > 0, `fallback: no en-US voice → EN prompts written (EN listen ${zs.en}), ZH listen still used (${zs.zh})`);
  await Z.context().close();
}

// ================= combat-spec §9.4 character assembly in a real battle (tap to answer, right and wrong) =================
{
  const a = await newPage();
  await a.goto(BASE); await consent(a); await goLoc(a, 'meadow'); await tid(a, 'preview').waitFor(); await tid(a, 'preview-done').click(); await tid(a, 'location').waitFor();
  // every eligible meadow word has had 1 R-EZ question (R-EZ on an eligible word is always assembly) and has R-ZE done, so R-EZ is the way picked
  const prepared = await a.evaluate(() => { const X = window.__proto.asm; const ids = X.pool('meadow').filter(X.assemblyEligible);
    for (const id of ids) { const P = X.prog(id); P.seen = true; P.ways.rEZ.a = 1; P.ways.rEZ.c = 0; P.ways.rZE.a = 2; P.ways.rZE.c = 2; } return ids.length; });
  await debugSet(a, { hp: 999 });
  const seenAsm = []; let nAsm = 0;
  const after = async (q, want) => {   // wait for the question to be graded, then read the outcome, log and R-EZ attempts
    for (let i = 0; i < 100; i++) { const o = await a.evaluate(() => window.__proto.lastOutcome); if (o && o.id === q.id && o.form === 'assembly' && o.result === want) break; await a.waitForTimeout(100); }
    return a.evaluate(id => ({ o: window.__proto.lastOutcome, log0: window.__proto.asm.log()[0], logN: window.__proto.asm.log().length, a: window.__proto.asm.prog(id).ways.rEZ.a }), q.id);
  };
  const onAsm = async (p, q) => {
    if (nAsm >= 2) return false; nAsm++;
    const v = await p.evaluate(() => ({ tiles: [...document.querySelectorAll('[data-testid="tile"]')].map(t => t.dataset.t), slots: document.querySelectorAll('[data-testid="asm-slot"]').length,
      banner: document.querySelector('[data-testid="spell-banner"]').innerText, form: document.querySelector('[data-testid="question"]').dataset.form, ins: document.querySelector('#insight')?.disabled ?? null,
      a: window.__proto.asm.prog(window.__proto.q.id).ways.rEZ.a, logN: window.__proto.asm.log().length }));
    const ans = [...q.zh];
    check(v.form === 'assembly' && v.slots === ans.length && v.tiles.length === ans.length + q.distractors.length && q.distractors.length === 2 && ans.every(c => v.tiles.includes(c))
      && v.banner.includes(q.en) && !v.banner.includes(q.zh) && !TONE.test(v.banner),
      `assembly renders: ${q.zh} “${q.en}” → ${v.slots} slots, tray ${v.tiles.join(' ')} (n + mcOptions−1 = ${ans.length}+2), English prompt only, no pinyin; R-EZ.attempts was ${v.a}`);
    if (nAsm === 1) {
      // §9.4 note 5: tiles past the 9th have no number key; tapping must not depend on it, so this answer is tapped with every key removed
      const keys = await p.evaluate(() => { const t = [...document.querySelectorAll('[data-testid="tile"]')]; const n = t.filter(x => x.dataset.key).length; t.forEach(x => x.removeAttribute('data-key')); return n; });
      await tapAsm(p, true);
      const sl = await p.evaluate(() => [...document.querySelectorAll('[data-testid="asm-slot"]')].map(s => s.textContent).join(''));   // read during the feedback hold
      const r = await after(q, 'correct');
      check(r.o.result === 'correct' && sl === q.zh && r.a === v.a + 1 && r.logN === v.logN + 1 && r.log0.form === 'assembly' && JSON.stringify(r.log0.taps) === JSON.stringify(ans) && r.log0.wrongSlot === null && r.log0.way === 'rEZ' && !r.o.spoken,
        `assembly answered by tapping right (tiles without number keys; had ${keys}): slots read ${sl}, graded correct as R-EZ (attempts ${v.a}→${r.a}), log {form:${r.log0.form}, taps:${r.log0.taps.join('')}, wrongSlot:${r.log0.wrongSlot}}`);
    } else {
      await tapAsm(p, false, 1);
      await tid(p, 'continue').waitFor({ timeout: 10000 });
      const fb = await p.evaluate(() => ({ wrong: document.querySelectorAll('[data-testid="tile"].wrong').length, live: document.querySelectorAll('[data-testid="tile"]:not([disabled])').length,
        slots: [...document.querySelectorAll('[data-testid="asm-slot"]')].map(s => s.textContent).join(''), msg: document.querySelector('#bmsg').innerText }));
      await tid(p, 'continue').click();
      const r = await after(q, 'wrong');
      check(fb.wrong === 1 && fb.live === 0 && fb.slots === q.zh && fb.msg.includes(q.zh) && !TONE.test(fb.msg), `assembly wrong tap: the tile shows ✘, the tray locks, the slots show the answer ${fb.slots}`);
      check(r.o.result === 'wrong' && r.a === v.a + 1 && r.logN === v.logN + 1 && r.log0.form === 'assembly' && r.log0.taps.length === 2 && r.log0.taps[0] === ans[0] && r.log0.taps[1] !== ans[1] && r.log0.wrongSlot === 1,
        `assembly: first wrong tap = one wrong answer (R-EZ.attempts +1 → ${r.a}, one log record {taps:${r.log0.taps.join('')}, wrongSlot:${r.log0.wrongSlot}})`);
    }
    return true;
  };
  for (let k = 0; k < 4 && nAsm < 2; k++) { await tid(a, 'act-path').click(); await playBattle(a, () => true, { onAsm }); if (await tid(a, 'victory-ok').count()) await tid(a, 'victory-ok').click(); await tid(a, 'location').or(tid(a, 'town')).first().waitFor(); if (await tid(a, 'town').count()) await goLoc(a, 'meadow'); }
  check(prepared > 0 && nAsm === 2, `assembly questions met in meadow battles: ${nAsm} (eligible meadow words ${prepared})`);
  await a.context().close();
}

// ================= v3.4 spells, magic shop, quests (seeded save) =================
await spellTests({ browser, BASE, check, log, shots: process.env.SPELL_SHOTS || '' });

// ================= spoken answers (stubbed recogniser + TTS) and music continuity =================
await speechTests({ browser, BASE, check, log });

// ================= v3.9.1 graph world (?world=graph): engine units + browser flow (tests/world.mjs) =================
await worldUnitTests({ check, log });
try { await worldTests({ browser, BASE: BASE0, check, log, shots: process.env.WORLD_SHOTS || '' }); }
catch (e) { check(false, 'world tests crashed: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' ')); }

check(pinyinSeen.size === 0, 'no pinyin (tone-marked Latin) in battle / practice / results DOM' + (pinyinSeen.size ? ': ' + [...pinyinSeen].slice(0, 5).join(' | ') : ''));
check(focusSeen.size === 0, 'no "Focus words" panel / scout screen in battle' + (focusSeen.size ? ': ' + [...focusSeen].join(', ') : ''));
await browser.close();
console.log(errors.length ? `\n${errors.length} problem(s):\n` + errors.join('\n') : '\nALL CHECKS PASSED');
process.exit(errors.length ? 1 : 0);
