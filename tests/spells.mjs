// v3.4 spells, magic shop and quests (seeded saves). Used by tests/play.mjs; standalone: node tests/spells.mjs [baseUrl] [shotPrefix]
// shotPrefix (optional) saves the magic shop / Spellbook / cast mid-animation / quest board screenshots.
import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';

const KEY = 'chinese-rpg-proto-v3';
export async function spellTests({ browser, BASE, check, log = console.log, shots = '' }) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const tid = id => p.locator(`[data-testid="${id}"]`);
  const sv = () => p.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
  const seed = async patch => { await p.evaluate(([k, patch]) => { const s = JSON.parse(localStorage.getItem(k)); patch(s); localStorage.setItem(k, JSON.stringify(s)); }, [KEY, patch]); };
  const edit = fn => p.evaluate(([k, src]) => { const s = JSON.parse(localStorage.getItem(k)); (0, eval)(src)(s); localStorage.setItem(k, JSON.stringify(s)); }, [KEY, fn.toString()]);
  const shot = async name => { if (!shots) return; await p.waitForTimeout(350); await p.screenshot({ path: shots + name + '.png' }); log('saved', shots + name + '.png'); };
  /** refill HP (and optionally set MP) at the current screen, then reload it */
  const rest = async (mp) => { const mx = +(await p.locator('#hud .hpmax').innerText().catch(() => '78')) || 78;
    await p.evaluate(([k, mx, mp]) => { const s = JSON.parse(localStorage.getItem(k)); s.hp = mx; if (mp !== undefined) s.mp = mp; localStorage.setItem(k, JSON.stringify(s)); }, [KEY, mx, mp]); await p.reload(); };
  const goldNow = async () => +(await tid('hud-gold').innerText());

  await p.goto(BASE); await tid('consent').waitFor();
  const m = (await tid('consent').innerText()).match(/(\d+) × (\d+)/); await tid('consent-speech').uncheck();
  await tid('consent-answer').fill(String(+m[1] * +m[2])); await tid('consent-ok').click(); await tid('town').waitFor();
  // an older (v3.2) save without spells / quests still loads
  await edit(s => { delete s.spells; delete s.quests; s.level = 8; s.gold = 2000; s.mp = 26; s.hp = 78; s.inv.manatea = 0;
    s.locs.meadow.bossDefeated = true; s.locs.meadow.pathCleared = 8; s.locs.forest.unlocked = true; s.locs.forest.previewSeen = true;
    s.gear = ['wood_sword', 'cloth_tunic', 'potlid', 'horn_dagger']; s.equip = { weapon: 'horn_dagger', armor: 'cloth_tunic', shield: 'potlid', charm: null }; });
  await p.reload(); await tid('town').waitFor();
  const s0 = await sv(); check(Array.isArray(s0.spells) && typeof s0.quests === 'object', 'spells: an old save without spells/quests loads (spells [] / quests {})');
  const rules = await p.evaluate(() => window.__proto.spellRules);
  check(rules.castRequiresAnswer === false && !('castLimit' in rules) && !('bossMagicWard' in rules) && !('wardMult' in rules) && rules.statusBossMultBy?.freeze === 0,
    'spells: rules loaded (free cast, no cast cap / unlock, no Magic Ward, freeze never on bosses)');
  const hintFree = async where => { const t = await p.evaluate(() => document.body.innerText); check(!/留着魔力|Save your MP|casts? ready/i.test(t) && !(await p.locator('[data-testid*="mp-tip"],[data-testid="boss-gate-tip"],[data-testid="casts-ready"],[data-testid="preview-boss"],[data-testid^="casts-"]').count()), `v3.6+: no MP hint / cast counter on the ${where}`); };

  // ---- general shop: no MP potions (they live in the magic shop) ----
  await tid('go-shop').click(); await tid('shop').waitFor();
  check(!(await tid('buy-manatea').count()) && !(await tid('buy-bigmanatea').count()), 'shop: MP potions are not in the general shop');
  const G = +(await tid('buy-honey').innerText()).match(/\d+/)[0];   // Honey Potion = 1×G
  await tid('back').click();
  // ---- magic shop ----
  await tid('go-magic').click(); await tid('magic-shop').waitFor();
  check(await tid('magic-pot-manatea').count() === 1 && await tid('magic-pot-bigmanatea').count() === 0, 'magic shop: Mana Tea (town 1) on sale, Big Mana Tea (town 5+) not yet');
  check(/魔力茶/.test(await tid('magic-pot-manatea').innerText()), 'magic shop: bilingual Mana Tea label');
  let g = await goldNow(); await tid('magic-buy-manatea').click();
  const teaP = g - await goldNow(); check(teaP === 6 * G && (await sv()).inv.manatea === 1, `magic shop: bought Mana Tea for 6×G (${teaP} = 6 × ${G})`);
  const card = await tid('spellcard-small_fireball').innerText();
  check(/小火球/.test(card) && /Small Fireball/i.test(card) && /🔷 9 MP/.test(card) && /💥 20/.test(card), 'magic shop: spell card bilingual, 9 MP (v3.5+: 1.25 × v3.4), power 20');
  await shot('magic-shop');
  g = await goldNow(); await tid('buy-spell-small_fireball').click();
  if (await tid('blacksmith-first').count()) await tid('dialog-btn-0').click();
  await tid('owned-small_fireball').waitFor();
  check((await sv()).spells.includes('small_fireball') && g - await goldNow() === 720, `magic shop: bought Small Fireball for 720 🪙 (spell kept in the save)`);
  await tid('buy-spell-bubble_spell').click(); if (await tid('blacksmith-first').count()) await tid('dialog-btn-0').click(); await tid('owned-bubble_spell').waitFor();
  await tid('back').click();

  // ---- quest board: accept → progress → claim ----
  await tid('go-quests').click(); await tid('quest-board').waitFor();
  if (await tid('board-town-2').count()) await tid('board-town-2').click();
  await tid('quest-accept-q2_bounty').click(); await tid('quest-board').waitFor();
  check(await tid('quest-q2_bounty').getAttribute('data-status') === 'active' && (await sv()).quests.q2_bounty?.s === 'active', 'quests: accepted the Giant Bee bounty (saved)');
  await shot('quest-board');
  await tid('back').click();

  // ---- battle helper ----
  const state = () => p.evaluate(() => { const has = s => !!document.querySelector(`[data-testid="${s}"]`);
    if (has('victory')) return 'victory'; if (has('inn')) return 'inn'; if (has('location') || has('town')) return 'left';
    const c = document.querySelector('[data-testid="continue"]'); if (c && !c.disabled) return 'continue';
    if (has('action-menu')) return 'menu'; if (document.querySelector('[data-testid^="target-"]:not([data-testid="target-menu"])')) return 'target';
    if (document.querySelector('[data-testid="opt"]:not([disabled])')) return 'mc'; return 'wait'; });
  const cs = () => p.evaluate(() => window.__proto.castState());
  async function openBook() { await tid('act-skills').click(); await tid('tab-spells').waitFor(); if (!(await tid('spellbook').count())) await tid('tab-spells').click(); await tid('spellbook').waitFor(); }
  async function closeBook() { await tid('act-back').click(); await tid('action-menu').waitFor(); }
  /** onMenu(n) returns true when it already chose an action. answer(q) → true = right. */
  async function battle(onMenu, answer = () => true) {
    let menus = 0, waits = 0;
    for (let i = 0; i < 2500; i++) {
      const st = await state();
      if (st === 'victory' || st === 'inn' || st === 'left') return st;
      if (st === 'continue') await tid('continue').click({ timeout: 2000 }).catch(() => {});
      else if (st === 'menu') { if (!(await onMenu(menus++))) await tid('act-attack').click(); }
      else if (st === 'target') await p.locator('[data-testid^="target-"]:not([data-testid="target-menu"])').first().click();
      else if (st === 'mc') { const q = await p.evaluate(() => window.__proto.q); const ok = answer(q);
        await p.locator(ok ? `[data-testid="opt"][data-o="${q.answerId}"]` : `[data-testid="opt"]:not([data-o="${q.answerId}"]):not(.gone)`).first().click(); }
      if (st === 'wait') { if (++waits > 400) throw new Error('spells: battle stalled'); } else waits = 0;
      await p.waitForTimeout(60);
    }
    throw new Error('spells: battle did not finish');
  }
  /** Cast `id` from the open Spellbook; returns lastSpell after the animation. skip = click the tap-to-skip layer. */
  async function cast(id, { skip = false, midShot = '' } = {}) {
    const before = await cs(); const mp0 = +(await tid('hud-mp').innerText());
    await tid('spell-' + id).click();
    if (await p.locator('[data-testid^="target-"]:not([data-testid="target-menu"])').count()) await p.locator('[data-testid^="target-"]:not([data-testid="target-menu"])').first().click();
    await tid('fx-skip').waitFor({ state: 'attached', timeout: 5000 });
    const asked = await p.locator('[data-testid="opt"]:not([disabled])').count();
    if (midShot) { await p.waitForTimeout(900); await p.screenshot({ path: midShot }); log('saved', midShot); }
    if (skip) { await p.waitForTimeout(150); await p.evaluate(() => document.querySelector('[data-testid="fx-skip"]')?.click()); }
    await p.waitForFunction(() => window.__proto.lastSpell?.done, null, { timeout: 8000 });
    return { ls: await p.evaluate(() => window.__proto.lastSpell), total: await p.evaluate(() => (window.__proto.spellAnims || []).slice(-1)[0]?.totalMs), before, mp0, asked };
  }
  
  // ---- forest path battles: cast on turn 1, back to back, MP the only limit; tap skips; MP potions not in battle ----
  await tid('go-adventure').click(); await tid('loc-forest').click(); await tid('location').waitFor();
  await tid('act-preview').click(); await tid('preview').waitFor(); await hintFree('Preview page'); await tid('preview-done').click(); await tid('location').waitFor();
  const potsBefore = (await sv()).inv.manatea;
  const casts = []; let gateChecked = false, itemsChecked = false, sawRound1 = null;
  const done = () => casts.length >= 3 && gateChecked;
  for (let b = 0; b < 6 && !done(); b++) {
    await rest(b === 0 ? 26 : 8); await tid('location').waitFor();   // later battles start low so the MP gate is reached before the enemies fall
    await tid('act-path').click(); await tid('battle').waitFor({ state: 'attached', timeout: 15000 });
    let inBattle = 0;
    await battle(async () => {
      if (done()) return false;
      const c = await cs();
      if (!itemsChecked) { itemsChecked = true;   // MP potions never usable in battle
        await tid('act-itemsmenu').click().catch(() => {});
        check(!(await tid('act-potion-manatea').count()) && !(await tid('act-potion-bigmanatea').count()), `battle items: Mana Tea not offered in battle (have ${potsBefore})`);
        if (await tid('act-back').count()) await tid('act-back').click(); await tid('action-menu').waitFor(); }
      await openBook(); const mp = +(await tid('hud-mp').innerText());
      if (!casts.length) {
        sawRound1 = c;
        check(c.correct === 0 && await tid('spell-small_fireball').isEnabled(), `spellbook: open and castable on turn 1 (round ${c.round}, ${c.correct} right answers)`);
        const bookTxt = await tid('spellbook').innerText(); check(!/×\s*\d/.test(bookTxt) && !(await p.locator('[data-testid^="casts-"]').count()), 'spellbook: no ×N cast counts (v3.6+)');
        await shot('spellbook');
      }
      if (await tid('spell-small_fireball').isEnabled()) { casts.push({ b, k: inBattle++, ...(await cast('small_fireball', { skip: casts.length > 0, midShot: !casts.length && shots ? shots + 'spell-cast.png' : '' })) }); return true; }
      if (!gateChecked) { gateChecked = true;
        check(await tid('spell-small_fireball').getAttribute('data-block') === 'mp' && /needs 9 MP/.test(await tid('spell-small_fireball').innerText()),
          `MP gate: with ${mp} MP Small Fireball (9) is disabled and shows "needs 9 MP"`); }
      if (await tid('spell-bubble_spell').isEnabled()) { casts.push({ b, k: inBattle++, ...(await cast('bubble_spell', { skip: true })) }); return true; }
      check(true, `MP gate: with ${mp} MP every spell is disabled`); await closeBook(); return false;
    }, q => q.turn !== 'attack' || done());   // miss attack questions until the casts are done so the enemies stay around
    if (await tid('victory-ok').count()) await tid('victory-ok').click();
    await tid('location').waitFor({ timeout: 8000 }).catch(async () => { await p.screenshot({ path: '/tmp/sp-stall.png' }); log('STALL UI', (await p.locator('#ui').innerText()).slice(0, 400)); });
  }
  const [first, second] = casts; const same = casts.filter(x => x.b === casts[casts.length - 1].b);
  check(gateChecked, 'MP gate reached after casting until MP ran out');
  check(same.length >= 3 || casts.length >= 3, `casts: ${casts.length} casts (${same.length} in one battle), no per-battle cap`);
  check(casts.slice(1).some((x, i) => x.b === casts[i].b && x.ls.round === casts[i].ls.round + 1), 'casts: back to back on consecutive turns');
  check(!!first, 'spells: cast happened in a forest battle');
  if (first) {
    const { ls, before, mp0, asked } = first; const h = ls.hits[0];
    const want = Math.max(1, Math.round(ls.power * (ls.tired ? 1.5 : 1) - h.def));
    check(!ls.asked && asked === 0, 'cast: instant, no question asked');
    check(h.dmg === want || h.wax, `cast: damage = max(1, round(P ${ls.power}${ls.tired ? ' × 1.5' : ''} − DEF ${h.def})) = ${want} (got ${h.dmg})`);
    check(ls.mpEnd === mp0 - ls.mpCost && ls.mpBefore === mp0 && ls.mpCost === 9, `cast: MP spent ${mp0} → ${ls.mpEnd} (−${ls.mpCost}), no regen`);
    check(ls.streakAfter === ls.streakBefore && ls.streakBefore === before.streak, `cast: streak unchanged (${ls.streakBefore} → ${ls.streakAfter})`);
    check(ls.qAfter === ls.qBefore, 'cast: no question counted for the cast turn');
    check(first.total >= 2000 && first.total <= 3000 && ls.animMs >= 1950, `cast: animation timeline 2–3 s (${first.total} ms planned, ${ls.animMs} ms wall incl. the screenshot)`);
  }
  check(second && second.ls.skippedAt != null && second.ls.animMs - second.ls.skippedAt < 400 && second.ls.animMs < second.total - 50, `cast: tap skips the animation (tap at ${second?.ls.skippedAt} ms, ended at ${second?.ls.animMs} of ${second?.total} ms)`);
  await tid('act-inn').click().catch(() => {}); if (await tid('inn').count()) { await hintFree('inn'); await tid('back').click(); await tid('location').waitFor(); }
  // Mana Tea works on the map (bag)
  await rest(3); await tid('location').waitFor(); const mpA = (await sv()).mp; const teaA = (await sv()).inv.manatea;   // chests can drop Mana Tea too
  await tid('act-bag').click(); await tid('items').waitFor({ timeout: 4000 }).catch(() => {});
  if (await tid('use-manatea').count()) { await tid('use-manatea').click(); await p.waitForTimeout(200); const sB = await sv(); check(sB.mp > mpA && sB.inv.manatea === teaA - 1, `map: Mana Tea restores MP from the bag (${mpA} → ${sB.mp})`); await tid('back').click().catch(() => {}); }
  else check(false, 'map: bag with Mana Tea reachable from the location');

  // ---- quest progress + claim ----
  for (let extra = 0; extra < 4 && !(await sv()).quests.q2_bounty.n; extra++) {   // Giant Bees are random in the forest
    await rest(); await tid('location').waitFor(); await tid('act-path').click(); await tid('battle').waitFor({ state: 'attached', timeout: 15000 });
    await battle(async () => false); if (await tid('victory-ok').count()) await tid('victory-ok').click(); await tid('location').waitFor(); }
  const qn = (await sv()).quests.q2_bounty.n; check(qn > 0, `quests: Giant Bee bounty progressed from kills (${qn}/8)`);
  await edit(s => { s.quests.q2_bounty.n = 8; s.where = 'town'; }); await p.reload(); await tid('town').waitFor({ timeout: 10000 });
  await tid('go-inn').click(); await tid('inn').waitFor(); await hintFree('village inn'); await tid('back').click(); await tid('town').waitFor();
  await tid('go-quests').click(); await tid('quest-board').waitFor(); if (await tid('board-town-2').count()) await tid('board-town-2').click();
  g = await goldNow(); await tid('quest-claim-q2_bounty').click(); await tid('quest-claimed-q2_bounty').waitFor();
  const sC = await sv(); check(sC.quests.q2_bounty.s === 'claimed' && await goldNow() > g, `quests: claimed the bounty (+${await goldNow() - g} 🪙)`);
  await tid('back').click();

  // ---- boss battle: cast on turn 1, back to back ----
  await edit(s => { s.level = 12; s.where = 'forest'; s.locs.forest.pathCleared = 8; s.locs.forest.patrolsLeft = 0; s.locs.forest.approachArmed = false; s.locs.forest.bossCheckpoint = false; });
  await p.reload(); await tid('location').waitFor(); await rest(34); await tid('location').waitFor();
  if (await tid('act-boss').count()) {
    await hintFree('boss gate');
    const bc = []; const mpSeen = [];
    await tid('act-boss').click(); await tid('battle').waitFor({ state: 'attached', timeout: 15000 });
    await battle(async () => { const c = await cs(); if (c.kind !== 'boss') return false;
      if (bc.length >= 2) { mpSeen.push({ mp: +(await tid('hud-mp').innerText()), correct: c.correct }); if (mpSeen.length === 1) await shot('queen-battle'); return false; }
      await openBook(); if (await tid('spell-small_fireball').isDisabled()) { await closeBook(); return false; }
      bc.push({ c, r: await cast('small_fireball', { skip: true }) }); return true; });
    check(bc.length === 2 && bc[0].c.correct === 0 && bc[1].r.ls.round === bc[0].r.ls.round + 1, `boss: cast on turn 1 and again right after (${bc.length} casts, ${bc[0]?.c.correct} right answers before)`);
    check(bc.every(x => x.r.ls.hits.every(h => !h.status || h.status !== 'frozen')), 'boss: no freeze on bosses');
    const qb = bc[0]?.r.ls.hits.find(h => h.boss); log('boss hit', JSON.stringify(qb));
    check(mpSeen.length >= 3 && mpSeen.every(x => x.mp === mpSeen[0].mp) && mpSeen[mpSeen.length - 1].correct > mpSeen[0].correct, `v3.6+: no MP regen on right answers (MP stays ${mpSeen[0]?.mp} over ${mpSeen.length} turns, ${mpSeen[0]?.correct} → ${mpSeen[mpSeen.length - 1]?.correct} right)`);
  } else check(false, 'boss: forest boss reachable');
  check(errs.length === 0, 'spells: no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await ctx.close();
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [BASE0 = 'http://127.0.0.1:8795/', shots = ''] = process.argv.slice(2);
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  let bad = 0; const check = (c, m) => { if (!c) bad++; console.log(c ? '✅' : '❌', m); };
  try { await spellTests({ browser, BASE: BASE0 + (BASE0.includes('?') ? '&' : '?') + 'debug', check, shots }); } catch (e) { bad++; console.log('ERROR', e.message); }
  await browser.close(); console.log(bad ? `${bad} failed` : 'ALL SPELL CHECKS PASSED'); process.exit(bad ? 1 : 0);
}
