// Screenshots of the built game: node tests/shots.mjs [baseUrl] [outPrefix]
// Stubs a zh-CN TTS voice (headless Chrome has none) so the 🔊 buttons render in their enabled state.
import { chromium } from 'playwright-core';
const BASE = process.argv[2] || 'http://127.0.0.1:8795/';
const OUT = process.argv[3] || '/workspace/chinese-rpg/shots/2026-09-28-';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.addInitScript(() => {
  const zh = { lang: 'zh-CN', name: 'Stub Chinese', voiceURI: 'stub', default: false, localService: true };
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { getVoices: () => [zh], speak(u) { setTimeout(() => u.onend && u.onend({}), 30); }, cancel() {}, onvoiceschanged: null } });
  window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
});
const p = await ctx.newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const tid = id => p.locator(`[data-testid="${id}"]`);
const shot = async name => { await p.waitForTimeout(700); await p.screenshot({ path: OUT + name + '.png' }); console.log('saved', OUT + name + '.png'); };
await p.goto(BASE); await tid('consent').waitFor();
const m = (await tid('consent').innerText()).match(/(\d+) × (\d+)/); await tid('consent-speech').uncheck();
await tid('consent-answer').fill(String(+m[1] * +m[2])); await tid('consent-ok').click(); await tid('town').waitFor();
await shot('village-hub');
await tid('loc-meadow').click(); await tid('preview').waitFor(); await shot('village-preview');
await tid('practice').click(); await tid('practice-menu').waitFor();
await shot('practice-page');
await p.evaluate(() => document.querySelector('[data-testid="practice-words"]').scrollIntoView({ block: 'start' })); await shot('practice-page-wordlist');
await tid('practice-back').click(); await tid('preview-done').click(); await tid('location').waitFor(); await shot('map-meadow');
await tid('act-path').click(); await tid('action-menu').waitFor(); await shot('battle-menu');
await tid('act-attack').click(); await p.waitForSelector('[data-testid="opt"]:not([disabled])', { timeout: 15000 }); await shot('battle-question');
const q = await p.evaluate(() => window.__proto.q); await p.locator(`[data-testid="opt"][data-o="${q.answerId}"]`).click(); await shot('battle-hit');
console.log('audio debug', JSON.stringify(await p.evaluate(() => window.__proto.audio)), 'bg', await p.evaluate(() => window.__proto.bg));
console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no page errors');
await browser.close();
