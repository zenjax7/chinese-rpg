// Mid-cast screenshots of Arty's spell recipes (public/spells/spells_fx.json) in a forest battle.
//   node tests/spellfxshots.mjs [baseUrl] [outPrefix] [spell@ms ...]   e.g. lightning@1080 blizzard@1500 super_blizzard@2000
import { chromium } from 'playwright-core';
const KEY = 'chinese-rpg-proto-v3';
const [BASE = 'http://127.0.0.1:8795/', OUT = '/tmp/spellfx-', ...want0] = process.argv.slice(2);
const want = (want0.length ? want0 : ['lightning@1080', 'blizzard@1500']).map(x => { const [id, ms] = x.split('@'); return { id, ms: +ms || 1000 }; });
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
const tid = id => p.locator(`[data-testid="${id}"]`);
const edit = fn => p.evaluate(([k, src]) => { const s = JSON.parse(localStorage.getItem(k)); (0, eval)(src)(s); localStorage.setItem(k, JSON.stringify(s)); }, [KEY, fn.toString()]);
await p.goto(BASE + (BASE.includes('?') ? '&' : '?') + 'debug'); await tid('consent').waitFor();
const m = (await tid('consent').innerText()).match(/(\d+) × (\d+)/); await tid('consent-speech').uncheck();
await tid('consent-answer').fill(String(+m[1] * +m[2])); await tid('consent-ok').click(); await tid('town').waitFor();
const ids = want.map(w => w.id);
for (const w of want) {
  await p.evaluate(([k, ids, lv, loc]) => { const s = JSON.parse(localStorage.getItem(k)); s.level = lv; s.hp = 999; s.mp = 999; s.spells = [...new Set([...(s.spells || []), ...ids])];
    s.locs.meadow.bossDefeated = true; s.locs.meadow.pathCleared = 8; s.locs.forest.unlocked = true; s.locs.forest.previewSeen = true; s.where = loc; localStorage.setItem(k, JSON.stringify(s)); }, [KEY, ids, +(process.env.LV || 30), process.env.LOC || 'forest']);
  await p.reload(); await tid('location').waitFor({ timeout: 10000 });
  await tid('act-path').click(); await tid('battle').waitFor({ state: 'attached', timeout: 15000 });
  await tid('action-menu').waitFor({ timeout: 15000 });
  await tid('act-skills').click(); await tid('tab-spells').waitFor(); if (!(await tid('spellbook').count())) await tid('tab-spells').click();
  if (process.env.LUCKY) await p.evaluate(() => { Math.random = () => 0.01; });   // statuses always land (layout check)
  await tid('spell-' + w.id).click();
  const tg = p.locator('[data-testid^="target-"]:not([data-testid="target-menu"])'); if (await tg.count()) await tg.first().click();
  await tid('fx-skip').waitFor({ state: 'attached', timeout: 5000 }); await p.waitForTimeout(w.ms);
  if (process.env.BURST) for (let i = 0; i < +process.env.BURST; i++) { await p.screenshot({ path: `${OUT}${w.id}-b${i}.png` }); }
  const path = `${OUT}${w.id}.png`; await p.screenshot({ path }); console.log('saved', path, JSON.stringify(await p.evaluate(() => (window.__proto.spellAnims || []).slice(-1)[0])));
  await p.waitForFunction(() => window.__proto.lastSpell?.done, null, { timeout: 8000 }).catch(() => {});
  await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}${w.id}-after.png` });
  await edit(s => { s.where = 'forest'; });
}
console.log(errs.length ? 'page errors: ' + errs.join(' | ') : 'no page errors'); await browser.close();
