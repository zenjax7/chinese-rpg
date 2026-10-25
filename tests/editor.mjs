// Level editor smoke test (docs/tech/level-editor.md §5, §6, §7.1): node tests/editor.mjs [distDir]
// Runs the REAL API (server/router.ts) on PGlite, seeded from docs/data/levels (tests/editor-server.ts), serves the accounts build,
// then: sign in at /editor → open a map → add a node and a link, rename a node, add a dialogue line and a word → autosave → publish as
// beta (the reset notice) → the game loads that beta version from /api/v1/levels and the player's progress on the map is reset.
// Build first: npm run build:cloud (the editor entry is only in the accounts build).
import { chromium, devices } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEditorServer } from './editor-serve.mjs';
import { firstSessionReloadTest } from './mapversion.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = process.argv[2] || 'dist-cloud';
const PORT = +(process.env.EDITOR_PORT || 8840);
const MAP = 'old_mine_1';
const SHOTS = process.env.EDITOR_SHOTS || '';   // set to a folder to save the iPad screenshots (editor-ipad-*.png)
// the game's map frame (src/shared/level/map-view.ts): node x / y (0..1) -> 1280x720 frame point
const nodeXY = n => ({ x: 60 + n.x * 1160, y: 130 + n.y * 410 });
const frameToNode = p => ({ x: (p.x - 60) / 1160, y: (p.y - 130) / 410 });
/** Screen point of a frame point in the editor: the map frame element's box is the 1280x720 frame on screen. */
async function frameToScreen(page, fx, fy) {
  const r = await page.locator('[data-testid=ed-map-frame]').boundingBox();
  return { x: r.x + fx * r.width / 1280, y: r.y + fy * r.height / 720 };
}
/** A frame point inside the node area, as far as possible from every node, where the empty map (the pane) is on screen
 *  (not under the minimap or the zoom buttons). */
async function emptySpot(page, level) {
  const cand = [];
  for (let i = 1; i < 12; i++) for (let j = 1; j < 6; j++) {
    const q = { x: 60 + i * 1160 / 12, y: 130 + j * 410 / 6 };
    cand.push({ ...q, d: Math.min(...level.nodes.map(n => { const r = nodeXY(n); return Math.hypot(r.x - q.x, r.y - q.y); })) });
  }
  cand.sort((a, b) => b.d - a.d);
  for (const c of cand) { const sc = await frameToScreen(page, c.x, c.y);
    if (await page.evaluate(([x, y]) => !!document.elementFromPoint(x, y)?.classList.contains('react-flow__pane'), [sc.x, sc.y])) return c; }
  throw new Error('no empty spot on screen');
}
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
  const spot0 = await emptySpot(p, (await draft()).draft); const sp0 = await frameToScreen(p, spot0.x, spot0.y);
  await p.mouse.click(sp0.x, sp0.y);
  await tid('ed-node-title').waitFor();
  await commit(tid('ed-node-title'), 'Smoke Test Hall');
  await commit(tid('ed-node-id'), 'smoke_hall');
  await p.waitForSelector('[data-id="smoke_hall"]');
  check(await p.locator('.react-flow__node-map').count() === n0 + 1, '"＋ Add node" then a click on the map adds a node there; id and title edit in the inspector');
  const src = p.locator('[data-id="stairs_1"] .react-flow__handle.h-mouse'), dst = p.locator('[data-id="smoke_hall"] .react-flow__handle.target');
  await src.hover(); await p.mouse.down(); const bb = await dst.boundingBox(); await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2, { steps: 8 }); await p.mouse.up();
  await tid('ed-edge-danger').waitFor({ timeout: 5000 }).catch(() => {});
  check(await tid('ed-edge-danger').count() === 1, 'dragging from a node handle to another node adds a link and selects it');
  await commit(tid('ed-edge-danger'), '0');

  // dialogue: add a line to the first scene
  await tid('ed-tab-dialogue').click();
  if (!(await tid('ed-scene').inputValue())) await tid('ed-scene').selectOption({ index: 1 });   // the new node has no scene: pick the first
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

  // ============ iPad (touch only): background, in-game placement, Connect / move / add / delete by touch ============
  if (SHOTS) mkdirSync(SHOTS, { recursive: true });
  const shot = async (pg, name) => { if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, `editor-ipad-${name}.png`) }); };
  const ictx = await browser.newContext({ ...devices['iPad Pro 11 landscape'] }); await ictx.addInitScript(() => { window.__proto = Object.assign(window.__proto || {}, { scrollTravel: false }); }); /* old map-walk harness: opt out of the meadow scroll walk (tests/travelscroll.mjs covers it) */
  // a stand-in window.visualViewport: the real values, unless the test sets __kb = { h, top } (the WebKit on-screen keyboard shrinks
  // only the visual viewport; desktop Chromium has no keyboard to open)
  await ictx.addInitScript(() => {
    const real = window.visualViewport; const fake = new EventTarget(); window.__kb = null;
    for (const k of ['width', 'offsetLeft', 'pageLeft', 'pageTop', 'scale']) Object.defineProperty(fake, k, { get: () => real[k] });
    Object.defineProperty(fake, 'height', { get: () => window.__kb ? window.__kb.h : real.height });
    Object.defineProperty(fake, 'offsetTop', { get: () => window.__kb ? window.__kb.top : real.offsetTop });
    real.addEventListener('resize', () => fake.dispatchEvent(new Event('resize'))); real.addEventListener('scroll', () => fake.dispatchEvent(new Event('scroll')));
    Object.defineProperty(window, 'visualViewport', { get: () => fake });
    window.__setKb = kb => { window.__kb = kb; fake.dispatchEvent(new Event('resize')); };
  });
  const shot2 = async (pg, name) => { if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, `editor-ipad2-${name}.png`) }); };
  const ip = await ictx.newPage(); const ipErrors = []; ip.on('pageerror', e => ipErrors.push(e.message));
  const it = id => ip.locator(`[data-testid="${id}"]`);
  const cdp2 = await ictx.newCDPSession(ip);
  const touch = (type, pts) => cdp2.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((q, i) => ({ x: q.x, y: q.y, id: i, radiusX: 4, radiusY: 4, force: 1 })) });
  const swipe = async (a, b, steps = 12) => { await touch('touchStart', [a]); for (let k = 1; k <= steps; k++) { await touch('touchMove', [{ x: a.x + (b.x - a.x) * k / steps, y: a.y + (b.y - a.y) * k / steps }]); await ip.waitForTimeout(16); } await touch('touchEnd', []); };
  const isaved = async () => { await ip.waitForFunction(() => { const t = document.querySelector('[data-testid=ed-save-status]')?.textContent || ''; return /saved/.test(t) && !/unsaved/.test(t); }, null, { timeout: 15000 }); };
  const draftOf = async id => (await srv.db.query(`select draft from levels where id = $1`, [id])).rows[0].draft;
  const nodeCenter = async id => { const b = await ip.locator(`.react-flow__node[data-id="${id}"] .dot`).boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
  const openMap = async id => { await ip.goto(`${B}/editor?map=${id}`); await ip.locator('.react-flow__node-map').first().waitFor({ timeout: 15000 });
    await ip.waitForFunction(() => document.querySelector('[data-testid=ed-map-frame]')?.dataset.bg !== undefined && !document.querySelector('.instruction.loading'), null, { timeout: 10000 });
    await ip.waitForTimeout(400); };
  const frameInfo = () => ip.evaluate(() => { const f = document.querySelector('[data-testid=ed-map-frame]'); const cs = getComputedStyle(f);
    return { bg: f.dataset.bg, image: cs.backgroundImage, size: cs.backgroundSize, pos: cs.backgroundPosition, w: f.offsetWidth, h: f.offsetHeight, note: document.querySelector('[data-testid=ed-bg-note]')?.textContent || '' }; });

  await openMap('realm_1');
  await ip.waitForFunction(() => !!document.querySelector('[data-testid=ed-map-frame]')?.dataset.bg, null, { timeout: 10000 }).catch(() => {});
  const f1 = await frameInfo();
  const bgOk = (await fetch(`${B}/bg/bg_map_r1_starter_meadow.png`)).status === 200;
  check(f1.bg === 'bg_map_r1_starter_meadow' && /bg_map_r1_starter_meadow\.png/.test(f1.image) && f1.size === 'cover' && f1.w === 1280 && f1.h === 720 && !f1.note && bgOk,
    `background: realm_1 (Starter Meadow) shows bg_map_r1_starter_meadow, cover-scaled in a 1280x720 frame like the game (${f1.bg}, ${f1.size}, ${f1.w}x${f1.h})`);
  await shot(ip, '1-starter-meadow');
  await openMap('realm_2'); await ip.waitForFunction(() => !!document.querySelector('[data-testid=ed-map-frame]')?.dataset.bg, null, { timeout: 10000 }).catch(() => {});
  const f2 = await frameInfo();
  await openMap('realm_3'); await it('ed-bg-note').waitFor({ timeout: 10000 }).catch(() => {});
  const f3 = await frameInfo();
  check(f2.bg === 'bg_map_r2_honeycomb_forest' && /bg_map_r2_honeycomb_forest\.png/.test(f2.image) && f3.bg === '' && f3.image === 'none' && f3.w === 1280 && /No map background/.test(f3.note),
    `background per map: realm_2 → ${f2.bg}; realm_3 has no delivered art → plain 1280x720 canvas + note (“${f3.note.slice(0, 50)}…”)`);
  await shot(ip, '2-no-background-realm_3');

  // in-game placement: every realm_1 node, measured on screen against the background frame (compared with the game below)
  await openMap('realm_1');
  const r1 = await draftOf('realm_1');
  const edPos = {};
  for (const n of r1.nodes) { const c = await nodeCenter(n.id); const fr = await ip.locator('[data-testid=ed-map-frame]').boundingBox();
    edPos[n.id] = { x: (c.x - fr.x) * 1280 / fr.width, y: (c.y - fr.y) * 720 / fr.height }; }
  const offE = r1.nodes.map(n => Math.hypot(edPos[n.id].x - nodeXY(n).x, edPos[n.id].y - nodeXY(n).y));
  check(Math.max(...offE) < 1.5, `editor placement: each realm_1 node is drawn at the game's frame point 60+x·1160, 130+y·410 over the background (max off ${Math.max(...offE).toFixed(2)} px)`);

  // touch targets ≥ 44 px
  const sizes = [];
  for (const id of ['ed-connect', 'ed-add-node', 'ed-publish']) sizes.push((await it(id).boundingBox()).height);
  for (const n of r1.nodes.slice(0, 3)) { const b = await ip.locator(`.react-flow__node[data-id="${n.id}"]`).boundingBox(); sizes.push(Math.min(b.width, b.height)); }
  check(Math.min(...sizes) >= 44, `touch targets: toolbar buttons and nodes are ≥ 44 px on screen (min ${Math.min(...sizes).toFixed(0)} px)`);

  const ios = await ip.evaluate(() => { const c = getComputedStyle(document.querySelector('[data-testid=ed-canvas]')); return { ta: c.touchAction, us: c.userSelect || c.webkitUserSelect,
    ob: getComputedStyle(document.body).overscrollBehaviorY, meta: document.querySelector('meta[name=viewport]').content }; });
  check(ios.ta === 'none' && ios.us === 'none' && ios.ob === 'none' && /maximum-scale=1/.test(ios.meta) && /user-scalable=no/.test(ios.meta),
    `iOS gestures go to the editor: canvas touch-action none, no text selection, no page bounce, no page zoom (${ios.meta})`);
  // Connect mode: tap A, tap B (touch); the mode stays on for a second link
  const linked = (a, b, l) => l.edges.some(e => (e.from === a && e.to === b) || (e.from === b && e.to === a));
  const pairs = []; for (const a of r1.nodes) for (const b of r1.nodes) if (a.id < b.id && !linked(a.id, b.id, r1)) pairs.push([a.id, b.id]);
  const [[A1, B1], [A2, B2]] = [pairs[0], pairs.find(q => q[0] !== pairs[0][0] || q[1] !== pairs[0][1])];
  const e0 = await ip.locator('.react-flow__edge').count();
  await it('ed-connect').tap();
  const ins0 = await it('ed-instruction').innerText().catch(() => '');
  await ip.locator(`.react-flow__node[data-id="${A1}"]`).tap();
  const ins1 = await it('ed-instruction').innerText().catch(() => '');
  const hl = await ip.locator(`.react-flow__node[data-id="${A1}"] .mapnode.src`).count();
  await shot(ip, '3-connect-mode-A-selected');
  await ip.locator(`.react-flow__node[data-id="${B1}"]`).tap();
  await ip.waitForFunction(n => document.querySelectorAll('.react-flow__edge').length === n, e0 + 1, { timeout: 5000 }).catch(() => {});
  const stillOn = await it('ed-connect').getAttribute('aria-pressed');
  await ip.locator(`.react-flow__node[data-id="${A2}"]`).tap(); await ip.locator(`.react-flow__node[data-id="${B2}"]`).tap();
  await ip.waitForFunction(n => document.querySelectorAll('.react-flow__edge').length === n, e0 + 2, { timeout: 5000 }).catch(() => {});
  await shot(ip, '4-connect-mode-two-links');
  await isaved(); const r1b = await draftOf('realm_1');
  check(/tap the first node/i.test(ins0) && /Tap the node to connect to/.test(ins1) && hl === 1 && stillOn === 'true' && linked(A1, B1, r1b) && linked(A2, B2, r1b),
    `Connect by touch: tap ${A1} (highlighted, “${ins1.slice(0, 27)}”), tap ${B1} → link saved; mode stays on, ${A2} → ${B2} too`);
  await it('ed-connect').tap();

  // one-finger drag on a node moves it and saves the new x / y in the game's frame
  const mv = r1.nodes.find(n => n.id !== A1 && n.id !== B1) || r1.nodes[0];
  const fr0 = await ip.locator('[data-testid=ed-map-frame]').boundingBox(); const k = fr0.width / 1280;
  const c0 = await nodeCenter(mv.id); const tgtF = { x: nodeXY(mv).x + (nodeXY(mv).x > 640 ? -90 : 90), y: nodeXY(mv).y + (nodeXY(mv).y > 335 ? -50 : 50) };
  const c1 = { x: fr0.x + tgtF.x * k, y: fr0.y + tgtF.y * k };
  await swipe(c0, c1, 15); await ip.waitForTimeout(300); await isaved();
  // the node follows the finger once the drag starts (a few px of touch slop); what is saved must be where it is drawn now
  const c2 = await nodeCenter(mv.id); const fr2 = await ip.locator('[data-testid=ed-map-frame]').boundingBox();
  const drawn = frameToNode({ x: (c2.x - fr2.x) * 1280 / fr2.width, y: (c2.y - fr2.y) * 720 / fr2.height });
  const r1c = await draftOf('realm_1'); const moved = r1c.nodes.find(n => n.id === mv.id);
  const dist = Math.hypot((moved.x - mv.x) * 1160, (moved.y - mv.y) * 410);
  check(Math.abs(moved.x - drawn.x) < 0.002 && Math.abs(moved.y - drawn.y) < 0.004 && dist > 60 && r1c.nodes.length === r1.nodes.length,
    `drag by touch: ${mv.id} moved ${dist.toFixed(0)} frame px; saved x/y ${moved.x}, ${moved.y} = where it is drawn over the background (${drawn.x.toFixed(4)}, ${drawn.y.toFixed(4)})`);

  // one-finger drag on empty space pans (nodes stay put in the data), pinch zooms; the background moves with the nodes
  const vp = () => ip.evaluate(() => getComputedStyle(document.querySelector('.react-flow__viewport')).transform);
  const spotE = await emptySpot(ip, r1c); const se = await frameToScreen(ip, spotE.x, spotE.y);
  const vp0 = await vp(); await swipe(se, { x: se.x + 80, y: se.y + 40 }); await ip.waitForTimeout(200); const vp1 = await vp();
  const relBefore = edPos[A1];
  const mid = await frameToScreen(ip, 640, 335);
  await touch('touchStart', [{ x: mid.x - 60, y: mid.y }, { x: mid.x + 60, y: mid.y }]);
  for (let s2 = 1; s2 <= 10; s2++) { await touch('touchMove', [{ x: mid.x - 60 - s2 * 12, y: mid.y }, { x: mid.x + 60 + s2 * 12, y: mid.y }]); await ip.waitForTimeout(16); }
  await touch('touchEnd', []); await ip.waitForTimeout(250);
  const vp2 = await vp();
  const zoomOf = t => +(t.match(/matrix\(([^,]+)/)?.[1] ?? 1);
  const cA = await nodeCenter(A1); const frA = await ip.locator('[data-testid=ed-map-frame]').boundingBox();
  const relAfter = { x: (cA.x - frA.x) * 1280 / frA.width, y: (cA.y - frA.y) * 720 / frA.height };
  const r1d = await draftOf('realm_1');
  check(vp1 !== vp0 && zoomOf(vp2) > zoomOf(vp1) * 1.3 && Math.hypot(relAfter.x - relBefore.x, relAfter.y - relBefore.y) < 1.5 && JSON.stringify(r1d.nodes) === JSON.stringify(r1c.nodes),
    `pan + pinch: one finger on empty space pans, pinch zooms ×${(zoomOf(vp2) / zoomOf(vp1)).toFixed(2)}; nodes stay on the same background spot and their data is unchanged`);
  await ip.locator('.react-flow__controls-fitview').tap(); await ip.waitForTimeout(300);

  // tap-to-add: "＋ Add node", then tap the spot
  const spotA = await emptySpot(ip, r1d); const sa = await frameToScreen(ip, spotA.x, spotA.y);
  await it('ed-add-node').tap(); const insA = await it('ed-instruction').innerText().catch(() => '');
  await ip.touchscreen.tap(sa.x, sa.y);
  await it('ed-node-delete').waitFor({ timeout: 5000 }).catch(() => {});
  await isaved(); const r1e = await draftOf('realm_1');
  const added = r1e.nodes.find(n => !r1d.nodes.some(m => m.id === n.id)); const wantA = frameToNode(spotA);
  check(/Tap the spot/.test(insA) && added && Math.abs(added.x - wantA.x) < 0.005 && Math.abs(added.y - wantA.y) < 0.01 && await it('ed-add-node').getAttribute('aria-pressed') === 'false',
    `tap-to-add: “＋ Add node” then a tap on the map adds ${added?.id} at x/y ${added?.x}, ${added?.y} (tap ≈ ${wantA.x.toFixed(4)}, ${wantA.y.toFixed(4)}) and opens its panel`);
  await shot(ip, '5-added-node-panel');

  // selecting a node selects its main scene in the dialogue editor (level-edit mainScene); no scene → empty state + create control
  const nsc = async () => ({ val: await it('ed-scene').inputValue(), note: await it('ed-node-scene').innerText().catch(() => ''), tab: await it('ed-tab-dialogue').getAttribute('class'),
    add: await it('ed-scene-add').count(), lines: await it('ed-line').count() });
  const sNew = await nsc();
  await shot2(ip, '1-node-without-scene');
  await it('ed-tab-words').tap();
  await ip.locator('.react-flow__node[data-id="village"]').tap(); await ip.waitForTimeout(300); const sVil = await nsc();
  await shot2(ip, '2-village-main-scene');
  await ip.locator('.react-flow__node[data-id="m_farm"]').tap(); await ip.waitForTimeout(300); const sFarm = await nsc();
  check(sNew.val === '' && /has no scene/.test(sNew.note) && sNew.add === 1 && sNew.lines === 0 &&
    sVil.tab === 'on' && sVil.val === 'sc_r1_opening' && /first arrival event/.test(sVil.note) && sVil.lines > 0 && sFarm.val === 'sc_realm_1__farmer_thanks',
    `node → main scene: ${added?.id} (no scene) shows the empty state with “+ scene”; village → ${sVil.val} (its firstEnter event, from the Word pool tab back to Dialogue); m_farm → ${sFarm.val}`);

  // iPad keyboard: a focused dialogue field and its panel stay above the keyboard (visualViewport), landscape and portrait; then back to normal
  const kbBoxes = () => ip.evaluate(() => { const a = document.activeElement, pn = document.querySelector('.panel'), vv = window.visualViewport;
    const r = a.getBoundingClientRect(), q = pn.getBoundingClientRect(); const top = vv.offsetTop, bot = vv.offsetTop + vv.height;
    return { field: a.dataset.testid, fIn: r.top >= top - 0.5 && r.bottom <= bot + 0.5 && r.height > 0, pIn: q.top >= top - 0.5 && q.bottom <= bot + 0.5 && q.height > 60,
      cls: document.documentElement.className, top, bot, fr: [Math.round(r.top), Math.round(r.bottom)], pr: [Math.round(q.top), Math.round(q.bottom)],
      edH: document.querySelector('.editor').getBoundingClientRect().height, ih: innerHeight, work: getComputedStyle(document.querySelector('.work')).visibility }; });
  const kbCase = async (name, kb) => {
    await it('ed-line-en').last().tap();
    await ip.evaluate(k => window.__setKb(k), kb); await ip.waitForTimeout(400);
    const o = await kbBoxes(); await shot2(ip, name);
    await ip.evaluate(() => window.__setKb(null)); await ip.waitForTimeout(150);
    await ip.evaluate(() => document.activeElement.blur()); await ip.waitForTimeout(300);
    return { o, c: await kbBoxes().catch(async () => ip.evaluate(() => ({ cls: document.documentElement.className, edH: document.querySelector('.editor').getBoundingClientRect().height, ih: innerHeight, work: getComputedStyle(document.querySelector('.work')).visibility }))) };
  };
  const L = await kbCase('3-keyboard-landscape', { h: 834 - 398, top: 0 });
  await ip.setViewportSize({ width: 834, height: 1194 }); await ip.waitForTimeout(300);
  const P = await kbCase('4-keyboard-portrait', { h: 1194 - 470, top: 90 });
  await ip.setViewportSize({ width: 1194, height: 834 }); await ip.waitForTimeout(300);
  const back = c => !/kb-/.test(c.cls) && Math.abs(c.edH - c.ih) < 1 && c.work === 'visible';
  check(L.o.fIn && L.o.pIn && /kb-panel/.test(L.o.cls) && P.o.fIn && P.o.pIn && back(L.c) && back(P.c),
    `keyboard: ${L.o.field} and the dialogue panel stay inside the visible viewport — landscape field ${L.o.fr} panel ${L.o.pr} within [${L.o.top}, ${L.o.bot}]; portrait field ${P.o.fr} panel ${P.o.pr} within [${P.o.top}, ${P.o.bot}]; layout back to normal after it closes`);
  await shot2(ip, '5-keyboard-closed');

  // Jack 21:26, "still jumps when I switch between dialog forms": on the iPad a line's side / expr <select> opens a popover and HIDES the
  // keyboard, then the next text field brings it back. The bottom area must not drop back under the map in between.
  const selectCase = async (name, kbh) => {
    const Af = it('ed-line-en').last(), Sel = ip.locator('[data-testid=ed-line] select').last(), Bf = it('ed-line-zh').last();
    await Af.tap(); await ip.evaluate(h => window.__setKb({ h, top: 0 }), kbh); await ip.waitForTimeout(300);
    const pTop0 = await ip.evaluate(() => Math.round(document.querySelector('.panel').getBoundingClientRect().top));
    const r = await ip.evaluate(async ([kbh]) => {
      const seen = [], tops = []; const raf = () => new Promise(res => requestAnimationFrame(() => res()));
      const look = () => { seen.push(document.documentElement.className); tops.push(Math.round(document.querySelector('.panel').getBoundingClientRect().top)); };
      const sel = [...document.querySelectorAll('[data-testid=ed-line] select')].pop(), zh = [...document.querySelectorAll('[data-testid=ed-line-zh]')].pop();
      sel.focus(); for (let i = 0; i < 2; i++) { await raf(); look(); }
      window.__setKb(null);                                    // the select's popover replaces the keyboard
      for (let i = 0; i < 6; i++) { await raf(); look(); }
      zh.focus(); for (let i = 0; i < 3; i++) { await raf(); look(); }   // the next text field: focus first ...
      window.__setKb({ h: kbh, top: 0 });                      // ... then the keyboard comes back
      for (let i = 0; i < 4; i++) { await raf(); look(); }
      return { seen, tops };
    }, [kbh]);
    await ip.waitForTimeout(200);
    const o = await kbBoxes(); await shot2(ip, name);
    await ip.evaluate(() => window.__setKb(null)); await ip.waitForTimeout(150); await ip.evaluate(() => document.activeElement.blur()); await ip.waitForTimeout(950);
    const c = await ip.evaluate(() => ({ cls: document.documentElement.className, edH: document.querySelector('.editor').getBoundingClientRect().height, ih: innerHeight, work: getComputedStyle(document.querySelector('.work')).visibility }));
    return { o, c, held: r.seen.every(x => /kb-panel/.test(x)), still: r.tops.every(t => Math.abs(t - pTop0) < 1), pTop0, tops: [...new Set(r.tops)] };
  };
  const XL = await selectCase('8-select-then-field-landscape', 834 - 398);
  await ip.setViewportSize({ width: 834, height: 1194 }); await ip.waitForTimeout(300);
  const XP = await selectCase('9-select-then-field-portrait', 1194 - 470);
  await ip.setViewportSize({ width: 1194, height: 834 }); await ip.waitForTimeout(300);
  check(XL.held && XL.still && XP.held && XP.still && XL.o.field === 'ed-line-zh' && XL.o.fIn && XL.o.pIn && XP.o.field === 'ed-line-zh' && XP.o.fIn && XP.o.pIn && back(XL.c) && back(XP.c),
    `keyboard, text → select (keyboard hides) → text: the bottom area stays put in every frame (panel top landscape ${XL.tops} / portrait ${XP.tops}), the next field is inside the visible viewport, normal layout after editing ends`);

  // Jack's iPad bug (91a0387): with the keyboard open, tapping ANOTHER dialogue field snapped the layout back. iOS order: blur /
  // focusout on field A, a gap (the keyboard stays open), iOS scrolls the window, then focus on field B. The bottom area must stay in
  // keyboard mode the whole time, and B must end up inside the visible viewport.
  const frames = n => ip.evaluate(n2 => new Promise(r => { let k = 0; const f = () => (++k >= n2 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  const switchCase = async (name, kb, kb2) => {
    const A = ip.locator('.slots input').first(), Bf = it('ed-line-en').last();
    await A.tap(); await ip.evaluate(k => window.__setKb(k), kb); await ip.waitForTimeout(300);
    const before = await ip.evaluate(() => document.documentElement.className);
    const gap = await ip.evaluate(async kb2 => {
      const seen = [];
      const watch = new MutationObserver(() => seen.push(document.documentElement.className)); watch.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      const raf = () => new Promise(r => requestAnimationFrame(() => r()));
      document.activeElement.blur();                                  // blur + focusout on A; nothing focused for a moment
      for (let i = 0; i < 3; i++) { await raf(); seen.push(document.documentElement.className); }
      const pad = document.createElement('div'); pad.style.height = '3000px'; document.documentElement.appendChild(pad);   // give the page room to scroll, as on iOS
      window.scrollTo(0, 140); const scrolledTo = window.scrollY; window.__kb = kb2;   // iOS scrolls the window to reveal the next input
      window.dispatchEvent(new Event('scroll')); window.visualViewport.dispatchEvent(new Event('scroll')); window.visualViewport.dispatchEvent(new Event('resize'));
      for (let i = 0; i < 2; i++) { await raf(); seen.push(document.documentElement.className); }
      document.querySelectorAll('[data-testid=ed-line-en]')[document.querySelectorAll('[data-testid=ed-line-en]').length - 1].focus();
      for (let i = 0; i < 3; i++) { await raf(); seen.push(document.documentElement.className); }
      watch.disconnect(); const y = window.scrollY; pad.remove(); return { seen, scrolledTo, scrollY: y };
    }, kb2);
    await frames(4); await ip.waitForTimeout(200);
    const o = await kbBoxes(); await shot2(ip, name);
    await ip.evaluate(() => window.__setKb(null)); await ip.waitForTimeout(150); await ip.evaluate(() => document.activeElement.blur()); await ip.waitForTimeout(300);
    const c = await ip.evaluate(() => ({ cls: document.documentElement.className, edH: document.querySelector('.editor').getBoundingClientRect().height, ih: innerHeight, work: getComputedStyle(document.querySelector('.work')).visibility }));
    return { before, gap, o, c, held: /kb-panel/.test(before) && gap.seen.every(x => /kb-panel/.test(x)) && gap.scrolledTo > 0 && gap.scrollY === 0 };
  };
  const SL = await switchCase('6-switch-field-landscape', { h: 834 - 398, top: 0 }, { h: 834 - 398, top: 0 });
  await ip.setViewportSize({ width: 834, height: 1194 }); await ip.waitForTimeout(300);
  const SP = await switchCase('7-switch-field-portrait', { h: 1194 - 470, top: 0 }, { h: 1194 - 470, top: 90 });
  await ip.setViewportSize({ width: 1194, height: 834 }); await ip.waitForTimeout(300);
  check(SL.held && SP.held && SL.o.field === 'ed-line-en' && SL.o.fIn && SL.o.pIn && SP.o.field === 'ed-line-en' && SP.o.fIn && SP.o.pIn && back(SL.c) && back(SP.c),
    `keyboard, field A → field B (blur, gap, window scroll, focus): keyboard mode held in every frame and the window scroll (${SL.gap.scrolledTo} px) undone (landscape ${SL.held}, portrait ${SP.held}; gap classes ${[...new Set([...SL.gap.seen, ...SP.gap.seen])].join(' / ') || '—'}); B inside the visible viewport — landscape ${SL.o.fr} in [${SL.o.top}, ${SL.o.bot}], portrait ${SP.o.fr} in [${SP.o.top}, ${SP.o.bot}]; normal layout after close`);
  await ip.locator('[data-testid=ed-fit]').tap(); await ip.waitForTimeout(300);
  await ip.locator(`.react-flow__node[data-id="${added?.id}"]`).tap(); await it('ed-node-delete').waitFor({ timeout: 5000 });

  // delete always confirms: Cancel keeps it, Delete removes it; the same for a link picked by tapping it
  await it('ed-node-delete').tap(); await it('ed-confirm').waitFor({ timeout: 3000 });
  const cText = await it('ed-confirm-text').innerText();
  await shot(ip, '6-delete-confirm');
  await it('ed-confirm-no').tap(); await ip.waitForTimeout(300);
  const keptAfterCancel = await ip.locator(`.react-flow__node[data-id="${added?.id}"]`).count();
  await it('ed-node-delete').tap(); await it('ed-confirm-yes').tap();
  await ip.waitForFunction(id => !document.querySelector(`.react-flow__node[data-id="${id}"]`), added?.id, { timeout: 5000 }).catch(() => {});
  const pa = await nodeCenter(A1), pb = await nodeCenter(B1);
  await ip.touchscreen.tap((pa.x + pb.x) / 2, (pa.y + pb.y) / 2);
  await it('ed-edge-delete').waitFor({ timeout: 5000 }).catch(() => {});
  const edgeSel = await it('ed-edge-delete').count();
  await it('ed-edge-delete').tap(); await it('ed-confirm-yes').tap(); await ip.waitForTimeout(300);
  await isaved(); const r1f = await draftOf('realm_1');
  check(/Delete node/.test(cText) && keptAfterCancel === 1 && !r1f.nodes.some(n => n.id === added?.id) && edgeSel === 1 && !linked(A1, B1, r1f) && linked(A2, B2, r1f),
    `delete confirms: Cancel keeps ${added?.id}, Delete removes it; tapping the ${A1}–${B1} link opens its panel and its Delete (confirmed) removes it`);
  await ip.setViewportSize({ width: 834, height: 1194 }); await ip.waitForTimeout(300);
  await ip.locator('.react-flow__controls-fitview').tap(); await ip.waitForTimeout(300);
  await it('ed-connect').tap(); await ip.locator(`.react-flow__node[data-id="${A2}"]`).tap();
  await shot(ip, '7-portrait-connect'); await it('ed-connect').tap();
  check(ipErrors.length === 0, `iPad editor: no page errors (${ipErrors.slice(0, 2)})`);
  await ictx.close();

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

  // ============ Oct 24: realm_1 published (hash ≠ bundled), first session's hash is recorded, a reload keeps progress ============
  await firstSessionReloadTest({ browser, url: B + '/?world=graph&debug', check, label: 'published', published: true });

  // ============ coordinate round trip: the game draws realm_1's nodes where the editor did, over the same background ============
  const g2c = await browser.newContext({ viewport: { width: 1280, height: 720 } }); await g2c.addInitScript(() => { window.__proto = Object.assign(window.__proto || {}, { scrollTravel: false }); }); /* old map-walk harness: opt out of the meadow scroll walk (tests/travelscroll.mjs covers it) */ const g2 = await g2c.newPage();
  const g2t = id => g2.locator(`[data-testid="${id}"]`);
  await g2.goto(B + '/?world=graph&debug'); await g2t('title-screen').waitFor({ timeout: 15000 }); await g2t('play-guest').click();
  await g2t('consent').waitFor({ timeout: 15000 });
  const m2 = (await g2t('consent').innerText()).match(/(\d+) × (\d+)/); await g2t('consent-speech').uncheck();
  await g2t('consent-answer').fill(String(+m2[1] * +m2[2])); await g2t('consent-ok').click();
  await g2t('name-input').waitFor(); await g2t('name-input').fill('Ana'); await g2t('name-ok').click();
  await g2.waitForFunction(() => !!window.__proto?.world, null, { timeout: 15000 });
  const gamePos = {}; let gameBg = null;
  for (const n of r1.nodes) {
    await g2.evaluate(async ([map, id]) => { await window.__proto.world.goto(map, id); }, ['realm_1', n.id]);
    await g2.waitForSelector(`[data-testid="graph"][data-node="${n.id}"]`, { timeout: 5000 }).catch(() => {});
    const q = await g2.evaluate(id => { const svg = document.querySelector('[data-testid=graph-svg]'); const el = document.querySelector(`.gn.here circle`); if (!svg || !el) return null;
      const r = svg.getBoundingClientRect(), c = el.getBoundingClientRect(); return { here: document.querySelector('[data-testid=graph]').dataset.node, x: (c.x + c.width / 2 - r.x) * 1280 / r.width, y: (c.y + c.height / 2 - r.y) * 720 / r.height, bg: window.__proto.bg }; }, n.id);
    if (q && q.here === n.id) { gamePos[n.id] = q; gameBg = q.bg; }
  }
  const offs = r1.nodes.map(n => gamePos[n.id] ? Math.hypot(gamePos[n.id].x - edPos[n.id].x, gamePos[n.id].y - edPos[n.id].y) : Infinity);
  check(Object.keys(gamePos).length === r1.nodes.length && Math.max(...offs) < 1.5 && gameBg === f1.bg,
    `round trip realm_1: all ${r1.nodes.length} nodes land on the same frame point in the game as in the editor (max off ${Math.max(...offs).toFixed(2)} px), same background (${gameBg})`);
  await g2c.close();
} finally {
  await browser.close(); await srv.close();
}
console.log(errors.length ? `\n${errors.length} FAILED, ${passed} passed` : `\nALL CHECKS PASSED (${passed})`);
process.exit(errors.length ? 1 : 0);
