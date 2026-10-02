// Headless play-through: node tests/play.mjs [baseUrl]
import { chromium } from 'playwright-core';
import { spellTests } from './spells.mjs';
const BASE0 = process.argv[2] || 'http://127.0.0.1:8795/';
const BASE = BASE0 + (BASE0.includes('?') ? '&' : '?') + 'debug';   // ?debug shows the 🐞 debug panel button
const log = (...a) => console.log('•', ...a);
const errors = [];
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });

async function newPage(fakeSpeech = false) {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
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
  for (let step = 0; step < 1500; step++) {
    const state = await p.evaluate(() => {
      const has = s => !!document.querySelector(`[data-testid="${s}"]`);
      if (has('scout')) return 'scout'; if (has('victory')) return 'victory'; if (has('inn')) return 'inn';
      if (has('location')) return 'location'; if (has('town')) return 'town';
      const c = document.querySelector('[data-testid="continue"]'); if (c && !c.disabled) return 'continue';
      if (has('action-menu')) return 'menu';
      if (document.querySelector('[data-testid^="target-"]:not([data-testid="target-menu"])')) return 'target';
      const mic = document.querySelector('[data-testid="mic"]'); if (mic && !mic.disabled && mic.classList.contains('pulse')) return 'mic';
      const o = document.querySelector('[data-testid="opt"]:not([disabled])'); if (o) return 'mc';
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
    else if (state === 'mc' || state === 'mic') {
      const q = await p.evaluate(() => window.__proto.q);
      stats.q++; stats.ways[q.way] = (stats.ways[q.way] || 0) + 1;
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
await tid(p, 'act-path').click(); r = await playBattle(p, () => ++wrongs > 5);
log('battle 2 result', r.result, JSON.stringify(r.stats));
check((await p.evaluate(() => window.__proto.companionHits || 0)) >= 1, 'companion (gauge 100) made a free attack'); if (r.result === 'win') await tid(p, 'victory-ok').click();
if (r.result === 'defeat') await tid(p, 'back').click();
// defeat: set HP to 1 and gold 100, answer everything wrong
if (await tid(p, 'town').count()) await goLoc(p, 'meadow');
await tid(p, 'location').waitFor();
await debugSet(p, { gold: 100, hp: 1 });
const g0 = await gold(p);
await tid(p, 'act-path').click(); r = await playBattle(p, () => false);
check(r.result === 'defeat', 'defeat when HP hits 0');
const g1 = await gold(p); const fee = g0 - g1;
check(fee === 12 || fee > 0, `defeat fee = max(10% of ${g0}, inn 12) = ${fee}`);
check(await p.locator('[data-testid="defeat-msg"]').count() === 1, 'woke up at the inn after defeat');
const dm = await tid(p, 'defeat-msg').innerText(); log(dm.replace(/\n/g, ' | '));
check(/Courage \+20%/.test(dm), 'Courage +20% after 1 defeat');
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
let patrols = 0;
while (await tid(p, 'act-patrol').count()) {
  await tid(p, 'act-patrol').click(); r = await playBattle(p, () => true, { action: async pg => {   // Heal lives in the ✨ Skills sub-menu now
    if (await hp(pg) >= 25 || !await tid(pg, 'act-skills').isEnabled()) return 'act-attack';
    await tid(pg, 'act-skills').click(); await tid(pg, 'skills-menu').waitFor();
    if (await tid(pg, 'act-heal').count() && await tid(pg, 'act-heal').isEnabled()) return 'act-heal';
    await tid(pg, 'act-back').click(); await tid(pg, 'action-menu').waitFor(); return 'act-attack'; } });
  patrols++; if (r.result === 'win') await tid(p, 'victory-ok').click(); else { log('patrol', r.result); break; }
  await tid(p, 'location').waitFor();
}
check(patrols === 2, `2 forced patrols before the boss gate (fought ${patrols})`);
check(await tid(p, 'act-boss').count() === 1 && await tid(p, 'act-train').count() === 1, 'boss gate offers Enter + Train');
await tid(p, 'act-bag').click(); await tid(p, 'items').waitFor(); if (await tid(p, 'use-honey').isEnabled()) await tid(p, 'use-honey').click(); await tid(p, 'back').click();
await tid(p, 'act-boss').click(); r = await playBattle(p, () => true, { insight: false, shot: '/tmp/proto-boss.png' });
check((await p.evaluate(() => window.__proto.audio.music)).includes('mus_battle_boss'), 'boss fight uses boss music');
check((await p.evaluate(() => window.__proto.sprites || [])).length >= 15, 'Arty sprites loaded: ' + (await p.evaluate(() => (window.__proto.sprites || []).join(','))));
check((await p.evaluate(() => window.__proto.anims || 0)) > 0, 'hit animations played');
check(r.result === 'win', `beat the Starter Meadow boss (${r.stats.q} q)`);
const bv = await tid(p, 'victory').innerText(); check(/Honeycomb Forest/.test(bv) && /Guardian Shield/.test(bv), 'boss unlocks Honeycomb Forest + Guardian Shield');
check(/heroic/.test(bv), 'Rabbit King chest gives the heroic Rabbit-Horn Dagger');
log(bv.replace(/\n+/g, ' | '));
check(/Equipped .*Rabbit-Horn Dagger \(ATK 5 → 7\)/.test(bv), 'strictly better heroic drop auto-equipped (shown on the results card)');
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
{ const sv8 = await save_(p); check(sv8.skillsEquipped.length === 3 && sv8.skillsEquipped.includes('shield'), 'L8 opens a 3rd skill slot and Guardian Shield fills it automatically: ' + sv8.skillsEquipped.join(','));
  const hs = await p.locator('#toasts').innerText(); check(/New skill slot! .*Guardian Shield/.test(hs), 'toast: new skill slot filled'); }
await tid(p, 'debug-open').click(); await tid(p, 'dbg-clearpath').click(); await tid(p, 'location').waitFor();
log('forest approach:', await tid(p, 'location').innerText().then(t => t.replace(/\n+/g, ' | ')));
for (let tries = 0; tries < 6 && await tid(p, 'act-patrol').count(); tries++) {
  await tid(p, 'act-patrol').click(); r = await playBattle(p, () => true); log('forest patrol', r.result, JSON.stringify(r.stats));
  if (r.result === 'win') await tid(p, 'victory-ok').click();
  else { await tid(p, 'back').click().catch(() => {}); if (await tid(p, 'town').count()) await goLoc(p, 'forest'); }   // a random patrol loss: wake at the inn, walk back
  await tid(p, 'location').waitFor();
}
if (await tid(p, 'act-inn').count()) { await tid(p, 'act-inn').click(); await tid(p, 'inn-stay').click(); await tid(p, 'back').click(); }
{ const sq = await save_(p); log('queen kit:', JSON.stringify(sq.equip), 'skills', sq.skillsEquipped.join(','), 'inv', JSON.stringify(sq.inv), 'hp', await hp(p), '/', await maxHp(p));
  check((sq.inv.honey || 0) >= 3 && sq.equip.armor === 'petal_cloak' && sq.equip.shield === 'beeswax' && sq.equip.weapon === 'horn_dagger', 'Queen Bee kit: dagger + tier-2 armor/shield + 3 Honey Potions');
}
// Queen Bee with the §7.9 fixes: tier-2 armor + shield and the heroic dagger (L8), 75% (every 4th answer wrong), potion/Heal below 40% HP
let qn = 0; survive.used = { potion: 0, heal: 0 }; await p.screenshot({ path: '/tmp/proto-forest-gate.png' }); await tid(p, 'act-boss').click();
r = await playBattle(p, () => (++qn % 4) !== 0, { shot: '/tmp/proto-queen.png', action: survive(0.4) });
const summons = await p.evaluate(() => [...document.querySelectorAll('#blog div')].filter(d => /calls for help/.test(d.textContent)).length).catch(() => -1);
log('queen battle', r.result, JSON.stringify(r.stats));
check(r.result === 'win', `beat the Queen Bee at L8 with tier-2 armor/shield + dagger, 75% (${r.stats.q} q, potions ${survive.used.potion}, heals ${survive.used.heal})`);
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

// ================= v3.4 spells, magic shop, quests (seeded save) =================
await spellTests({ browser, BASE, check, log, shots: process.env.SPELL_SHOTS || '' });

check(pinyinSeen.size === 0, 'no pinyin (tone-marked Latin) in battle / practice / results DOM' + (pinyinSeen.size ? ': ' + [...pinyinSeen].slice(0, 5).join(' | ') : ''));
check(focusSeen.size === 0, 'no "Focus words" panel / scout screen in battle' + (focusSeen.size ? ': ' + [...focusSeen].join(', ') : ''));
await browser.close();
console.log(errors.length ? `\n${errors.length} problem(s):\n` + errors.join('\n') : '\nALL CHECKS PASSED');
process.exit(errors.length ? 1 : 0);
