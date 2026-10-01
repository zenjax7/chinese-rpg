// Screenshots of the built game: node tests/shots.mjs [baseUrl] [outPrefix] [WxH,WxH,...]
// e.g. node tests/shots.mjs http://127.0.0.1:8795/ /workspace/chinese-rpg/shots/2026-09-29-after- 1280x720,1440x900
// Stubs a zh-CN TTS voice (headless Chrome has none) so the 🔊 buttons render in their enabled state.
// Files: <outPrefix><W>x<H>-<name>.png. No ?debug, so the 🐞 button stays hidden; the boss is reached by editing the save.
import { chromium } from 'playwright-core';
const BASE = process.argv[2] || 'http://127.0.0.1:8795/';
const OUT = process.argv[3] || '/workspace/chinese-rpg/shots/2026-09-29-after-';
const VPS = (process.argv[4] || '1280x720,1440x900').split(',').map(v => v.split('x').map(Number));
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const KEY = 'chinese-rpg-proto-v3';
for (const [W, H] of VPS) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H } });
  await ctx.addInitScript(() => {
    const zh = { lang: 'zh-CN', name: 'Stub Chinese', voiceURI: 'stub', default: false, localService: true };
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { getVoices: () => [zh], speak(u) { setTimeout(() => u.onend && u.onend({}), 30); }, cancel() {}, onvoiceschanged: null } });
    window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
  });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const tid = id => p.locator(`[data-testid="${id}"]`);
  const shot = async (name, wait = 700) => { await p.waitForTimeout(wait); const f = `${OUT}${W}x${H}-${name}.png`; await p.screenshot({ path: f }); console.log('saved', f); };
  const q = () => p.evaluate(() => window.__proto.q);
  const waitQ = () => p.waitForSelector('[data-testid="opt"]:not([disabled]), [data-testid="mic"].pulse', { timeout: 20000 });
  await p.goto(BASE); await tid('consent').waitFor();
  const m = (await tid('consent').innerText()).match(/(\d+) × (\d+)/); await tid('consent-speech').uncheck();
  await tid('consent-answer').fill(String(+m[1] * +m[2])); await tid('consent-ok').click(); await tid('town').waitFor();
  await shot('village-hub', 1200);
  await tid('go-words').click(); await tid('preview').waitFor(); await shot('village-preview');
  await tid('practice').click(); await tid('practice-menu').waitFor(); await shot('practice-page');
  await tid('book-next').click(); await shot('practice-page-wordlist', 300);
  await tid('practice-back').click(); await tid('preview-done').click(); await tid('town').waitFor();
  await tid('go-adventure').click(); await tid('worldmap').waitFor(); await shot('world-map');
  await tid('loc-meadow').click(); await tid('location').waitFor(); await shot('map');
  await tid('act-path').click(); await tid('action-menu').waitFor(); await shot('battle-menu', 900);
  await tid('act-attack').click(); await waitQ(); await shot('battle-question', 400);
  let qq = await q(); await p.locator(`[data-testid="opt"]:not([data-o="${qq.answerId}"])`).first().click(); await shot('battle-wrong', 450);
  await tid('continue').click();
  // next question: answer right and catch the hit
  for (let i = 0; i < 30; i++) {
    if (await tid('action-menu').count()) { await tid('act-attack').click(); }
    if (await p.locator('[data-testid="opt"]:not([disabled])').count()) { qq = await q(); await p.locator(`[data-testid="opt"][data-o="${qq.answerId}"]`).click();
      if (qq.turn === 'attack') { await p.waitForTimeout(1050); await shot('battle-hit', 0); break; } }
    if (await tid('continue').count()) await tid('continue').click().catch(() => {});
    if (await tid('victory').count()) break;
    await p.waitForTimeout(250);
  }
  // boss: jump the save to the boss gate (path cleared, patrols gone), reload, enter the lair
  await p.evaluate(k => { const s = JSON.parse(localStorage.getItem(k)); const l = s.locs.meadow; l.pathCleared = 8; l.patrolsLeft = 0; l.approachArmed = false; l.previewSeen = true;
    s.where = 'meadow'; s.level = 3; s.hp = 40; localStorage.setItem(k, JSON.stringify(s)); }, KEY);
  await p.reload(); await tid('location').waitFor(); await shot('map-boss-gate', 1200);
  await tid('act-boss').click(); await tid('action-menu').waitFor({ timeout: 20000 }); await shot('boss-battle', 900);
  await tid('act-attack').click();
  if (await p.locator('[data-testid^="target-"]').count()) { await shot('boss-target', 300); await tid('target-0').click(); }
  await waitQ(); await shot('boss-question', 400);
  console.log(W, H, 'audio', JSON.stringify(await p.evaluate(() => window.__proto.audio?.sfx?.slice(-6))), 'bg', await p.evaluate(() => window.__proto.bg));
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no page errors');
  await ctx.close();
}
await browser.close();
