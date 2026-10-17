// Level editor smoke test (docs/tech/level-editor.md §5, §6, §7.1): node tests/editor.mjs [distDir]
// Runs the REAL API (server/router.ts) on PGlite, seeded from docs/data/levels (tests/editor-server.ts), serves the accounts build,
// then: sign in at /editor → open a map → add a node and a link, rename a node, add a dialogue line and a word → autosave → publish as
// beta (the reset notice) → the game loads that beta version from /api/v1/levels and the player's progress on the map is reset.
// Build first: npm run build:cloud (the editor entry is only in the accounts build).
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEditorServer } from './editor-serve.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = process.argv[2] || 'dist-cloud';
const PORT = +(process.env.EDITOR_PORT || 8840);
const MAP = 'old_mine_1';
if (!existsSync(path.resolve(ROOT, DIST, 'editor.html'))) { console.error(`${DIST}/editor.html missing: run npm run build:cloud first`); process.exit(2); }

const errors = []; let passed = 0;
const check = (c, msg) => { if (!c) { errors.push('CHECK FAILED: ' + msg); console.log('❌', msg); } else { passed++; console.log('✅', msg); } };
const { startEditorServer } = await loadEditorServer();
const srv = await startEditorServer(ROOT, PORT, DIST);
const B = srv.origin;
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  // ============ a guest player who already walked old_mine_1 at the bundled v1 ============
  const g = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const gErrors = []; g.on('pageerror', e => gErrors.push(e.message));
  const fetched = []; g.on('request', r => { if (r.url().includes('/api/v1/levels/')) fetched.push(new URL(r.url()).pathname + new URL(r.url()).search); });
  const gt = id => g.locator(`[data-testid="${id}"]`);
  const gsave = () => g.evaluate(() => JSON.parse(localStorage.getItem('chinese-rpg-proto-v4')));
  await g.goto(B + '/?world=graph&debug');
  await gt('title-screen').waitFor({ timeout: 15000 }); await gt('play-guest').click();
  await gt('consent').waitFor({ timeout: 15000 });
  const m = (await gt('consent').innerText()).match(/(\d+) × (\d+)/); await gt('consent-speech').uncheck();
  await gt('consent-answer').fill(String(+m[1] * +m[2])); await gt('consent-ok').click();
  await gt('name-input').waitFor(); await gt('name-input').fill('Mia'); await gt('name-ok').click();
  await g.waitForFunction(() => !!window.__proto?.world, null, { timeout: 15000 });
  const v1 = await g.evaluate(async map => { const w = window.__proto.world; await w.goto(map, 'path_2'); return { nodes: w.W.graphs[map].nodes.map(n => n.id), pos: w.P().pos }; }, MAP);
  const s1 = await gsave();
  check(!v1.nodes.includes('smoke_hall') && v1.pos.node === 'path_2' && s1.world.graphs[MAP] && !fetched.some(f => f.startsWith(`/api/v1/levels/${MAP}`)),
    `game before publish: v1 is the bundled copy (no fetch of the map), player stands on ${MAP}/path_2`);

  // ============ editor ============
  const p = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const pageErrors = []; p.on('pageerror', e => pageErrors.push(e.message));
  const tid = id => p.locator(`[data-testid="${id}"]`);
  const commit = async (loc, v) => { await loc.fill(v); await loc.press('Enter'); };
  const saved = async () => { await p.waitForFunction(() => /saved/.test(document.querySelector('[data-testid=ed-save-status]')?.textContent || '') && !/unsaved/.test(document.querySelector('[data-testid=ed-save-status]')?.textContent || ''), null, { timeout: 15000 }); };
  const draft = async () => (await srv.db.query(`select draft, draft_rev from levels where id = $1`, [MAP])).rows[0];

  const edRes = await p.goto(B + '/editor');
  const csp = edRes.headers()['content-security-policy'] || '';
  check(/script-src 'self'/.test(csp) && !/unsafe-eval/.test(csp), `/editor is served with production's CSP from vercel.json, no 'unsafe-eval' (${csp.slice(0, 60)}…)`);
  await tid('ed-signin').waitFor({ timeout: 10000 });
  check(await tid('ed-maps').count() === 0, 'signed out: /editor shows only "Sign in with Google", no maps');
  await tid('ed-signin').locator('button').click();
  await tid(`ed-map-${MAP}`).waitFor({ timeout: 10000 });
  check(await p.locator('[data-testid^="ed-map-"]:not([data-testid="ed-map-search"])').count() === 38, 'signed in as the owner: the map list has all 38 seeded maps');
  await tid(`ed-map-${MAP}`).click();
  await p.waitForSelector('.react-flow__node', { timeout: 10000 });
  const n0 = await p.locator('.react-flow__node-map').count();
  check(n0 === 13, `the map graph shows the map's nodes (${n0})`);

  // nodes: + node, then a link from the entry to it (via the inspector-free path: the API of the page is the UI, so drag the handle)
  await tid('ed-add-node').click();
  await tid('ed-node-title').waitFor();
  await commit(tid('ed-node-title'), 'Smoke Test Hall');
  await commit(tid('ed-node-id'), 'smoke_hall');
  await p.waitForSelector('[data-id="smoke_hall"]');
  check(await p.locator('.react-flow__node-map').count() === n0 + 1, '"+ node" adds a node; id and title edit in the inspector');
  const src = p.locator('[data-id="stairs_1"] .react-flow__handle.source'), dst = p.locator('[data-id="smoke_hall"] .react-flow__handle.target');
  await src.hover(); await p.mouse.down(); const bb = await dst.boundingBox(); await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2, { steps: 8 }); await p.mouse.up();
  await tid('ed-edge-danger').waitFor({ timeout: 5000 }).catch(() => {});
  check(await tid('ed-edge-danger').count() === 1, 'dragging from a node handle to another node adds a link and selects it');
  await commit(tid('ed-edge-danger'), '0');

  // dialogue: add a line to the first scene
  await tid('ed-tab-dialogue').click();
  const lines0 = await tid('ed-line').count();
  await tid('ed-line-add').click();
  const lastEn = tid('ed-line-en').last(); await commit(lastEn, 'Smoke test line.');
  await commit(tid('ed-line-zh').last(), '你好');
  check(await tid('ed-line').count() === lines0 + 1, `dialogue: "+ line" adds a line (${lines0} → ${lines0 + 1})`);

  // map settings: leveling v2 enemy levels (Jack 2026-10-17)
  await tid('ed-tab-settings').click();
  check(await tid('ed-enemy-level-min').inputValue() === '40' && await tid('ed-enemy-level-max').inputValue() === '42' && await tid('ed-elite-level').inputValue() === '42',
    'settings: enemy level min / max and elite level show the map\'s values (40 / 42 / 42)');
  await tid('ed-enemy-level-max').fill('43');
  await tid('ed-roster-level-0').fill('41');

  // word pool: search and add a word
  await tid('ed-tab-words').click();
  const words0 = await tid('ed-word').count();
  await tid('ed-word-search').fill('water');
  const cand = await p.locator('[data-testid="ed-word-add"]').first().innerText();
  await p.locator('[data-testid="ed-word-add"]').first().click();
  check(await tid('ed-word').count() === words0 + 1, `word pool: search + add (${cand.trim()})`);

  await saved();
  const d1 = await draft();
  const hall = d1.draft.nodes.find(n => n.id === 'smoke_hall');
  check(hall?.title?.en === 'Smoke Test Hall' && d1.draft.edges.some(e => e.from === 'stairs_1' && e.to === 'smoke_hall' && e.danger === 0) &&
    Object.values(d1.draft.scenes || {}).some(s => s.lines.some(l => l.en === 'Smoke test line.' && l.zh === '你好')) && d1.draft.settings.words.length === words0 + 1,
    `autosave: the server draft has the node, the link, the line and the word (draft_rev ${d1.draft_rev})`);
  check(JSON.stringify(d1.draft.settings.enemyLevel) === '[40,43]' && d1.draft.settings.roster[0].level === 41, `autosave: enemy level max 43 and a roster level 41 (${JSON.stringify(d1.draft.settings.enemyLevel)}, ${d1.draft.settings.roster[0].level})`);
  await p.reload(); await tid(`ed-map-${MAP}`).click(); await p.waitForSelector('[data-id="smoke_hall"]', { timeout: 10000 });
  check(true, 'reload: the saved draft comes back');

  // publish as beta
  await tid('ed-publish').click(); await tid('ed-publish-dialog').waitFor();
  const notice = await tid('ed-beta-notice').innerText().catch(() => '');
  check(/resets every player’s progress on this map/.test(notice), `publish dialog: the beta reset notice (“${notice.slice(0, 80)}…”)`);
  await tid('ed-publish-go').click();
  await p.waitForFunction(() => /Published as beta: version 2/.test(document.querySelector('[data-testid=ed-publish-msg]')?.textContent || ''), null, { timeout: 10000 });
  const idx = await (await fetch(`${B}/api/v1/levels/index`)).json();
  check(idx.maps[MAP].v === 2 && idx.release === 2, `published: the public index has ${MAP} v${idx.maps[MAP].v}, release ${idx.release}`);
  check(pageErrors.length === 0, `editor: no page errors (${pageErrors.slice(0, 2)})`);

  // ============ the game picks up the beta version; the player's progress on that map resets (§7.1) ============
  await fetch(`${B}/api/auth/signout`, { method: 'POST', redirect: 'manual' });   // the stub sign-in is shared: back to a guest
  // the index is cached up to 60 s (§7.1: max-age=60, a publish reaches players within ~5 min); clearing the cache = a minute later
  const cdp = await g.context().newCDPSession(g); await cdp.send('Network.clearBrowserCache');
  fetched.length = 0;
  await g.reload(); await gt('title-screen').waitFor({ timeout: 15000 }); await gt('play-guest').click();
  await g.waitForFunction(() => !!window.__proto?.world, null, { timeout: 15000 });
  await g.waitForFunction(([map, h]) => JSON.parse(localStorage.getItem('chinese-rpg-proto-v4'))?.mapVersions?.[map] === h, [MAP, idx.maps[MAP].hash], { timeout: 15000 }).catch(() => {});
  const s2 = await gsave();
  check(fetched.includes('/api/v1/levels/index') && fetched.some(f => f.startsWith(`/api/v1/levels/${MAP}?v=2`)), `game: reads the release index and fetches ${MAP} v2 from the API (${fetched.join(', ')})`);
  check(s2.mapVersions?.[MAP] === idx.maps[MAP].hash, `game: the save records the map version it played (${String(s2.mapVersions?.[MAP]).slice(0, 12)}…)`);
  check(s2.world.pos.graph === MAP && s2.world.pos.node === 'stairs_1' && !(s2.world.graphs[MAP]?.visited || '').length,
    `beta reset: the player is moved to the map's entry and its fog/progress is cleared (pos ${s2.world.pos.graph}/${s2.world.pos.node})`);
  const now = await g.evaluate(async map => { const w = window.__proto.world; const gg = w.W.graphs[map] || (await w.goto(map, 'stairs_1'), w.W.graphs[map]);
    return { nodes: gg.nodes.map(n => n.id), title: gg.nodes.find(n => n.id === 'smoke_hall')?.title?.en, state: gg.levelState }; }, MAP);
  check(now.nodes.includes('smoke_hall') && now.title === 'Smoke Test Hall' && now.state === 'beta', `game: plays the beta map as published (smoke_hall “${now.title}”, state ${now.state})`);
  check(gErrors.length === 0, `game: no page errors (${gErrors.slice(0, 2)})`);
} finally {
  await browser.close(); await srv.close();
}
console.log(errors.length ? `\n${errors.length} FAILED, ${passed} passed` : `\nALL CHECKS PASSED (${passed})`);
process.exit(errors.length ? 1 : 0);
