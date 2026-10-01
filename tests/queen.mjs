// Queen Bee win-rate check (spec v3.2 §7.9): node tests/queen.mjs [baseUrl] [kit] [runs] [acc]
// kit: t1 (tier-1 gear, attack only, Insight only) | t1s (tier-1 gear, potions/Heal/Shield) | dagger (dagger + tier-1 armor/shield, potions/Heal) | t2 (tier-2 shop set, potions/Heal) | test (dagger + tier-2 armor/shield, potions/Heal)
import { chromium } from 'playwright-core';
const [BASE0 = 'http://127.0.0.1:8795/', KIT = 'test', RUNS = '5', ACC = '0.75'] = process.argv.slice(2);
const BASE = BASE0 + '?debug';
const KITS = {
  t1: { equip: { weapon: 'wood_sword', armor: 'cloth_tunic', shield: 'potlid', charm: null }, survive: false },
  t1s: { equip: { weapon: 'wood_sword', armor: 'cloth_tunic', shield: 'potlid', charm: null }, survive: true },
  dagger: { equip: { weapon: 'horn_dagger', armor: 'cloth_tunic', shield: 'potlid', charm: null }, survive: true },
  t2: { equip: { weapon: 'stinger', armor: 'petal_cloak', shield: 'beeswax', charm: null }, survive: true },
  test: { equip: { weapon: 'horn_dagger', armor: 'petal_cloak', shield: 'beeswax', charm: null }, survive: true },
};
const kit = KITS[KIT];
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const tid = (p, id) => p.locator(`[data-testid="${id}"]`);
const results = [];
for (let run = 0; run < +RUNS; run++) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } }); const p = await ctx.newPage();
  await p.goto(BASE); await tid(p, 'consent').waitFor();
  const m = (await tid(p, 'consent').innerText()).match(/(\d+) × (\d+)/); await tid(p, 'consent-speech').uncheck();
  await tid(p, 'consent-answer').fill(String(+m[1] * +m[2])); await tid(p, 'consent-ok').click(); await tid(p, 'town').waitFor();
  await p.evaluate(k => { const s = JSON.parse(localStorage.getItem('chinese-rpg-proto-v3'));
    s.level = 8; s.locs.meadow.bossDefeated = true; s.locs.meadow.pathCleared = 8; s.locs.forest.unlocked = true; s.locs.forest.previewSeen = true;
    Object.assign(s.locs.forest, { pathCleared: 8, patrolsLeft: 0, approachArmed: false });
    s.gear = [...new Set([...s.gear, ...Object.values(k.equip).filter(Boolean)])]; s.equip = k.equip; s.inv.honey = k.survive ? 3 : 0;
    localStorage.setItem('chinese-rpg-proto-v3', JSON.stringify(s)); }, kit);
  await p.reload(); await tid(p, 'town').waitFor();
  await tid(p, 'debug-open').click(); await tid(p, 'dbg-level').fill('8'); await tid(p, 'dbg-hp').fill('999'); await p.locator('#dm').fill('999'); await tid(p, 'dbg-apply').click();
  if (!kit.survive) await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('chinese-rpg-proto-v3')); s.skillsEquipped = s.skillsEquipped.filter(x => x === 'insight'); localStorage.setItem('chinese-rpg-proto-v3', JSON.stringify(s)); });
  if (!kit.survive) { await p.reload(); await tid(p, 'town').waitFor(); }
  await tid(p, 'go-adventure').click(); await tid(p, 'loc-forest').click(); await tid(p, 'location').waitFor();
  // walking in from the village re-arms the approach patrols; skip them (this script measures the boss fight only)
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('chinese-rpg-proto-v3')); Object.assign(s.locs.forest, { patrolsLeft: 0, approachArmed: false }); localStorage.setItem('chinese-rpg-proto-v3', JSON.stringify(s)); });
  await p.reload(); await tid(p, 'location').waitFor(); await tid(p, 'act-boss').click({ timeout: 8000 }).catch(async e => { await p.screenshot({ path: '/tmp/queen-fail.png' }); console.log(await p.locator('#ui').innerText()); throw e; });
  await tid(p, 'battle').waitFor({ state: 'attached' });
  const used = { potion: 0, heal: 0 }; let q = 0, waits = 0, out = '';
  for (let step = 0; step < 3000 && !out; step++) {
    const st = await p.evaluate(() => { const has = s => !!document.querySelector(`[data-testid="${s}"]`);
      if (has('victory')) return 'win'; if (has('inn')) return 'defeat'; if (has('town') || has('location')) return 'left';
      const c = document.querySelector('[data-testid="continue"]'); if (c && !c.disabled) return 'continue';
      if (has('action-menu')) return 'menu'; if (document.querySelector('[data-testid^="target-"]:not([data-testid="target-menu"])')) return 'target';
      if (document.querySelector('[data-testid="opt"]:not([disabled])')) return 'mc'; return 'wait'; });
    if (st === 'win' || st === 'defeat' || st === 'left') { out = st; break; }
    if (st === 'continue') await tid(p, 'continue').click({ timeout: 2000 }).catch(() => {});
    else if (st === 'menu') {
      let a = 'act-attack';
      const hp = +(await tid(p, 'hud-hp').innerText()), mx = +(await p.locator('#hud .hpmax').innerText());
      if (kit.survive && hp < 0.4 * mx) {
        if (await tid(p, 'act-itemsmenu').isEnabled()) { await tid(p, 'act-itemsmenu').click(); await tid(p, 'items-menu').waitFor();
          if (await tid(p, 'act-potion-honey').count() && await tid(p, 'act-potion-honey').isEnabled()) { a = 'act-potion-honey'; used.potion++; } else { await tid(p, 'act-back').click(); await tid(p, 'action-menu').waitFor(); } }
        if (a === 'act-attack' && await tid(p, 'act-skills').isEnabled()) { await tid(p, 'act-skills').click(); await tid(p, 'skills-menu').waitFor();
          if (await tid(p, 'act-heal').count() && await tid(p, 'act-heal').isEnabled()) { a = 'act-heal'; used.heal++; } else { await tid(p, 'act-back').click(); await tid(p, 'action-menu').waitFor(); } }
      }
      await tid(p, a).click();
    } else if (st === 'target') await p.locator('[data-testid^="target-"]:not([data-testid="target-menu"])').first().click();
    else if (st === 'mc') { const qq = await p.evaluate(() => window.__proto.q); q++;
      const ok = Math.random() < +ACC;
      await p.locator(ok ? `[data-testid="opt"][data-o="${qq.answerId}"]` : `[data-testid="opt"]:not([data-o="${qq.answerId}"]):not(.gone)`).first().click(); }
    if (st === 'wait') { if (++waits > 200) { out = 'stall'; break; } } else waits = 0;
    await p.waitForTimeout(80);
  }
  const summons = await p.evaluate(() => window.__proto.summons);
  results.push({ run, out, q, ...used, summons }); console.log(KIT, JSON.stringify(results.at(-1)));
  await ctx.close();
}
const wins = results.filter(r => r.out === 'win').length;
console.log(`RESULT kit=${KIT} acc=${ACC}: ${wins}/${results.length} wins, avg ${Math.round(results.reduce((a, r) => a + r.q, 0) / results.length)} questions`);
await browser.close();
