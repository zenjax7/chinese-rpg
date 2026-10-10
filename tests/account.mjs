// Family-account screens (src/ui/account.ts) against a mocked /api/v1 + /api/auth (playwright page.route; no server, no database).
//   node tests/account.mjs [pagesBase] [cloudBase]
// pagesBase (default :8795) serves dist/ (the GitHub Pages build); cloudBase (default :8796) serves dist-cloud/ (npm run build:cloud).
// If nothing answers on the cloud port, this script starts `python3 -m http.server` on it for dist-cloud/ and stops it at the end.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGES = process.argv[2] || 'http://127.0.0.1:8795/';
const CLOUD = process.argv[3] || 'http://127.0.0.1:8796/';
const SHOTS = process.env.ACCOUNT_SHOTS || '';   // e.g. /workspace/chinese-rpg/shots/2026-10-09-account
const errors = []; let passed = 0;
const check = (c, msg) => { if (!c) { errors.push('CHECK FAILED: ' + msg); console.log('❌', msg); } else { passed++; console.log('✅', msg); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

let server = null;
async function up(u) { try { const r = await fetch(u); return r.ok; } catch { return false; } }
if (!existsSync(path.join(ROOT, 'dist-cloud/index.html'))) { console.error('dist-cloud/ missing: run npm run build:cloud first'); process.exit(2); }
if (!(await up(CLOUD))) {
  const port = new URL(CLOUD).port;
  server = spawn('python3', ['-m', 'http.server', port, '--bind', '127.0.0.1', '--directory', path.join(ROOT, 'dist-cloud')], { stdio: 'ignore' });
  for (let i = 0; i < 50 && !(await up(CLOUD)); i++) await sleep(100);
}
if (!(await up(PAGES))) { console.error(`Pages build not served at ${PAGES} (python3 -m http.server 8795 --bind 127.0.0.1 --directory dist)`); process.exit(2); }

const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const tid = (p, id) => p.locator(`[data-testid="${id}"]`);
const shot = async (p, name) => { if (!SHOTS) return; mkdirSync(path.dirname(SHOTS), { recursive: true }); await p.screenshot({ path: `${SHOTS}-${name}.png` }); };
const uuid = () => crypto.randomUUID();

/** In-memory stand-in for server/router.ts: same routes, status codes and error bodies (pin_required, wrong_pin, pin_locked,
 *  child_limit, consent_required), the §5.2 header rules, and switches for "offline" (connection refused) and "down" (503). */
function mockApi(o = {}) {
  const st = { signedIn: false, email: 'jack.parent@gmail.com', consent: 'none', pin: null, fails: 0, lockedUntil: 0, unlocked: false,
    children: [], saves: {}, net: 'ok', calls: [], headerFaults: [], authPosts: [], ...o };
  const j = (route, status, body, headers = {}) => route.fulfill({ status, contentType: 'application/json', headers, body: JSON.stringify(body) });
  const checkPin = pin => {
    if (st.lockedUntil > Date.now()) return [423, { error: 'pin_locked', message: 'Too many wrong PINs. Try again later.', until: new Date(st.lockedUntil).toISOString() }];
    if (pin === st.pin) { st.fails = 0; return null; }
    st.fails++;
    if (st.fails >= 5) { st.fails = 0; st.lockedUntil = Date.now() + 15 * 60e3; return [423, { error: 'pin_locked', message: 'Too many wrong PINs. Try again later.', until: new Date(st.lockedUntil).toISOString() }]; }
    return [403, { error: 'wrong_pin', message: 'Wrong PIN.', attemptsLeft: 5 - st.fails }];
  };
  const handler = async route => {
    const req = route.request(), url = new URL(req.url()), m = req.method(), p = url.pathname;
    if (p.startsWith('/api/auth/')) {
      if (st.net === 'offline') return route.abort('connectionrefused');
      if (p === '/api/auth/csrf') return j(route, 200, { csrfToken: 'csrf-tok-123' });
      const form = Object.fromEntries(new URLSearchParams(req.postData() || ''));
      st.authPosts.push({ path: p, form });
      if (p === '/api/auth/signin/google') { st.signedIn = true; return route.fulfill({ status: 302, headers: { location: form.callbackUrl || '/' } }); }
      if (p === '/api/auth/signout') { st.signedIn = false; st.unlocked = false; return route.fulfill({ status: 302, headers: { location: form.callbackUrl || '/' } }); }
      return j(route, 404, { error: 'not_found' });
    }
    const sub = p.replace(/^.*\/api\/v1/, ''), body = m === 'GET' ? {} : JSON.parse(req.postData() || '{}');
    st.calls.push({ m, p: sub, body });
    if (st.net === 'offline') return route.abort('connectionrefused');
    if (st.net === 'down') return j(route, 503, { error: 'unavailable', message: 'Cloud saving is paused. Progress is safe on this device.' }, { 'retry-after': '60' });
    if (m !== 'GET') { const h = req.headers(); if (h['x-app-request'] !== '1' || !/^application\/json/.test(h['content-type'] || '')) st.headerFaults.push(`${m} ${sub}`); }
    if (!st.signedIn) return j(route, 401, { error: 'unauthorized', message: 'Sign in first.' });
    const live = st.consent === 'granted' || st.consent === 'confirmed';
    const pinGate = () => (st.unlocked ? null : [403, { error: 'pin_required', message: 'Enter the parent PIN first.' }]);
    let r; const child = sub.match(/^\/children\/([0-9a-f-]{36})(\/.*)?$/);
    if (m === 'GET' && sub === '/me') return j(route, 200, { email: st.email, consentStatus: st.consent, noticeVersion: 'v1', needsConsent: !live, needsConfirmation: false, unlocked: st.unlocked, role: 'parent', children: st.children });
    if (m === 'POST' && sub === '/consent') {
      if (body.noticeVersion !== 'v1' || body.attest !== true || !/^\d{4,6}$/.test(body.pin || '')) return j(route, 400, { error: 'bad_request', message: 'Invalid request.' });
      if (st.pin && (r = checkPin(body.pin))) return j(route, ...r);
      st.pin ??= body.pin; st.consent = 'granted';
      return j(route, 200, { receipt: { id: '17', kind: 'vpc_onscreen', noticeVersion: 'v1', at: new Date().toISOString(), grantedAt: new Date().toISOString() } });
    }
    if (!live) return j(route, 403, { error: 'consent_required', message: 'Parental consent is needed first.' });
    if (m === 'POST' && sub === '/parent/unlock') { if ((r = checkPin(body.pin))) return j(route, ...r); st.unlocked = true; return j(route, 200, { unlockedUntil: new Date(Date.now() + 600e3).toISOString() }); }
    if (m === 'POST' && sub === '/children') {
      if ((r = pinGate())) return j(route, ...r);
      if (st.children.length >= 6) return j(route, 409, { error: 'child_limit', message: 'A family can have at most 6 child profiles.' });
      if (!body.nickname || /@|\d{7,}|https?:/.test(body.nickname)) return j(route, 400, { error: 'bad_request', message: 'Invalid request.', issues: [{ path: 'nickname', message: 'Nicknames cannot contain emails, phone numbers or links.' }] });
      const c = { id: uuid(), nickname: body.nickname, avatar: body.avatar, speechMode: 'off', sort: st.children.length, lastPlayed: null }; st.children.push(c); return j(route, 200, c);
    }
    if (child && !st.children.find(c => c.id === child[1])) return j(route, 404, { error: 'not_found', message: 'Not found.' });
    if (child && !child[2] && m === 'PATCH') { if ((r = pinGate())) return j(route, ...r); const c = st.children.find(c => c.id === child[1]); Object.assign(c, body); return j(route, 200, c); }
    if (child && !child[2] && m === 'DELETE') { if ((r = pinGate()) || (r = checkPin(body.pin))) return j(route, ...r); st.children = st.children.filter(c => c.id !== child[1]); return j(route, 200, { ok: true }); }
    if (child && child[2] === '/save' && m === 'GET') return j(route, 200, st.saves[child[1]] || { version: 0, contentVersion: null, state: null, updatedAt: null, flags: [], graphs: [], mastery: [] });
    if (child && child[2] === '/save' && m === 'PUT') {
      const s = st.saves[child[1]] ||= { version: 0, contentVersion: 'graph', state: null, graphs: [], mastery: [] };
      s.version++; if (body.state) s.state = body.state; return j(route, 200, { ok: true, version: s.version, conflict: false });
    }
    if (child && child[2] === '/import' && m === 'POST') {
      const { prog, log, ...rest } = body.save;
      st.saves[child[1]] = { version: 1, contentVersion: body.contentVersion, state: rest, graphs: [],
        mastery: Object.entries(prog || {}).map(([item, ip]) => ({ item, seen: ip.seen, recentMiss: ip.recentMiss, ways: ip.ways })) };
      return j(route, 200, { ok: true, version: 1 });
    }
    if (m === 'GET' && sub === '/export') { if ((r = pinGate())) return j(route, ...r); return j(route, 200, { exportedAt: new Date().toISOString(), parent: { email: st.email }, children: st.children }); }
    if (m === 'DELETE' && sub === '/account') { if ((r = pinGate()) || (r = checkPin(body.pin))) return j(route, ...r); st.signedIn = false; st.children = []; st.consent = 'none'; return j(route, 200, { ok: true, signedOut: true }); }
    return j(route, 404, { error: 'not_found', message: 'Not found.' });
  };
  return { st, handler };
}
async function newPage(mock, viewport = { width: 1280, height: 720 }) {
  const ctx = await browser.newContext({ viewport, acceptDownloads: true });
  if (mock) await ctx.route('**/api/**', mock.handler);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errors.push('PAGEERROR ' + e.message); console.log('PAGEERROR', e.message); });
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR_|status of 40[13]|status of 50[03]|status of 409|status of 423/.test(m.text())) { errors.push('CONSOLE ' + m.text()); console.log('CONSOLE', m.text()); } });
  return page;
}
const ls = (p, k) => p.evaluate(k => localStorage.getItem(k), k);
async function typePin(p, pin) { for (const d of pin) await tid(p, `pin-key-${d}`).click(); await tid(p, 'pin-ok').click(); }
async function guestConsent(p) {
  await tid(p, 'consent').waitFor();
  const m = (await tid(p, 'consent').innerText()).match(/(\d+) × (\d+)/);
  await tid(p, 'consent-answer').fill(String(+m[1] * +m[2])); await tid(p, 'consent-speech').uncheck(); await tid(p, 'consent-ok').click();
}
/** A signed-in parent who consented, with PIN 2468, unlocked (as if right after consent), and the given children. */
const family = (kids = [], extra = {}) => mockApi({ signedIn: true, consent: 'granted', pin: '2468', unlocked: false,
  children: kids.map((n, i) => ({ id: uuid(), nickname: n, avatar: ['panda', 'tiger', 'rabbit', 'dragon', 'cat', 'fox'][i % 6], speechMode: 'off', sort: i, lastPlayed: null })), ...extra });
const guestV3 = (level = 4) => ({ version: 3, consent: { given: true, speech: false, at: 1 }, level, exp: 5, hp: 30, mp: 10, gold: 77, inv: { honey: 2 }, gear: [], equip: { weapon: null, armor: null, shield: null, charm: null },
  skills: [], skillsEquipped: [], courage: 0, lastDefeatLoc: null, where: 'town', lastInn: null, practice: {}, locs: {},
  prog: { C001: { seen: true, recentMiss: 0, ways: { rZE: { a: 6, c: 5, box: 2, due: 0, last: 1, wrongRun: 0 } } } },
  stats: { battles: 3, wins: 3, defeats: 0, flees: 0, freeInn: 0, paidInn: 0, questions: 6, correct: 5, spoken: 0, voids: 0 }, log: [{ t: 1 }], spells: [], quests: {} });

try {
  // ============ 1. the Pages build (no VITE_CLOUD_SAVE) shows none of the account screens and calls no API ============
  {
    const dist = path.join(ROOT, 'dist/assets'); const js = readdirSync(dist).filter(f => f.endsWith('.js')).map(f => readFileSync(path.join(dist, f), 'utf8')).join('\n');
    check(!/parent-signin|child-picker|account-consent|chinese-rpg-import|pause-switch/.test(js) && !readdirSync(dist).some(f => /^account/.test(f)), 'Pages dist/: no account chunk and none of the account screens in the bundle');
    const mock = mockApi(); const p = await newPage(mock);
    await p.goto(PAGES + '?debug'); await tid(p, 'consent').waitFor(); await sleep(400);
    check(await tid(p, 'title-screen').count() === 0 && await tid(p, 'offline-banner').count() === 0, 'Pages build: straight to the guest consent screen, no launch screen or banner');
    check(mock.st.calls.length === 0 && mock.st.authPosts.length === 0, 'Pages build: no /api requests at all');
    await guestConsent(p); await tid(p, 'town').waitFor();
    await tid(p, 'pause').click(); await tid(p, 'pause-menu').waitFor();
    check(await tid(p, 'pause-switch').count() === 0, 'Pages build: no "switch player" in the game menu');
    await p.context().close();
  }

  // ============ 2. accounts build, signed out: launch screen; guest play unchanged ============
  {
    const mock = mockApi(); const p = await newPage(mock);
    await p.goto(CLOUD); await tid(p, 'title-screen').waitFor();
    check(await tid(p, 'play-guest').isVisible() && await tid(p, 'parent-signin').isVisible(), 'launch screen: "Play as guest" and "Parent sign-in with Google"');
    check(/游客/.test(await tid(p, 'play-guest').innerText()) && /Sign in|sign-in/i.test(await tid(p, 'parent-signin').innerText()), 'launch buttons are bilingual (中文 + English)');
    check(await tid(p, 'offline-banner').count() === 0, 'launch: no offline banner when the API answers (401)');
    await shot(p, 'title');
    await tid(p, 'play-guest').click(); await guestConsent(p); await tid(p, 'town').waitFor();
    const sv = JSON.parse(await ls(p, 'chinese-rpg-proto-v3'));
    check(sv?.consent?.given === true && !(await ls(p, 'chinese-rpg-cloud')), 'guest: classic town, v3 local save, no cloud child');
    check(!mock.st.calls.some(c => c.m !== 'GET'), 'guest: no writes to the API');
    await tid(p, 'pause').click(); await tid(p, 'pause-menu').waitFor();
    check(await tid(p, 'pause-switch').count() === 1, 'accounts build: "switch player" in the game menu');
    await shot(p, 'pause-menu'); await tid(p, 'pause-resume').click();
    await p.reload(); await tid(p, 'title-screen').waitFor(); await tid(p, 'play-guest').click(); await tid(p, 'town').waitFor();
    check(await tid(p, 'consent').count() === 0, 'guest: second launch goes straight back to the saved village');
    await p.context().close();
  }

  // ============ 3. sign-in redirect → consent → PIN set → receipt → parent area → add children → picker → play ============
  let fam;
  {
    const mock = mockApi(); const p = await newPage(mock); fam = mock;
    await p.goto(CLOUD); await tid(p, 'parent-signin').click();
    await tid(p, 'account-consent').waitFor();
    const post = mock.st.authPosts.find(a => a.path === '/api/auth/signin/google');
    check(!!post && post.form.csrfToken === 'csrf-tok-123' && post.form.callbackUrl === CLOUD, 'sign-in: form POST to /api/auth/signin/google with the Auth.js csrfToken and callbackUrl');
    check((await tid(p, 'notice-version').innerText()) === 'v1' && (await tid(p, 'consent-email').innerText()) === 'j•••@gmail.com', 'consent: notice version v1 and the masked Google email');
    check(await tid(p, 'consent-agree').isDisabled(), 'consent: Agree is disabled until the box is ticked');
    await shot(p, 'consent');
    await tid(p, 'consent-check').check(); await tid(p, 'consent-agree').click();
    await tid(p, 'pin-set').waitFor();
    await tid(p, 'pin-key-1').click(); await tid(p, 'pin-key-2').click(); await tid(p, 'pin-key-3').click();
    check(await tid(p, 'pin-ok').isDisabled(), 'PIN keypad: OK needs at least 4 digits');
    for (const d of '456789') await tid(p, `pin-key-${d}`).click();
    check(await p.locator('.pindots i.on').count() === 6, 'PIN keypad: at most 6 digits');
    await tid(p, 'pin-del').click(); await tid(p, 'pin-del').click(); await tid(p, 'pin-ok').click();   // 1234
    await shot(p, 'pin-set');
    await typePin(p, '9999');
    check(/match/i.test(await tid(p, 'pin-msg').innerText()), 'PIN set: a different second entry is rejected');
    check(!mock.st.calls.some(c => c.p === '/consent'), 'consent not posted before the PIN is confirmed');
    await typePin(p, '2468'); await typePin(p, '2468');
    await tid(p, 'consent-receipt').waitFor();
    const cp = mock.st.calls.find(c => c.p === '/consent');
    check(cp && cp.body.noticeVersion === 'v1' && cp.body.pin === '2468' && cp.body.attest === true, 'consent: POST /consent {noticeVersion: v1, pin, attest: true}');
    await shot(p, 'consent-receipt');
    await tid(p, 'receipt-continue').click(); await tid(p, 'parent-area').waitFor();
    check(mock.st.calls.some(c => c.p === '/parent/unlock' && c.body.pin === '2468'), 'after consent the parent area opens without asking for the PIN again');
    check(await tid(p, 'pa-done').isDisabled(), 'parent area: "Who\'s playing" waits for the first child');
    // add children: a bad nickname is refused with the API message, then six good ones; the 7th is blocked
    await tid(p, 'pa-add').click(); await tid(p, 'child-form').waitFor();
    await tid(p, 'child-nickname').fill('mia@example.com'); await tid(p, 'child-save').click();
    await p.waitForFunction(() => /links/.test(document.querySelector('[data-testid="child-err"]')?.textContent || ''));
    check(true, 'add child: a nickname with an email is refused with the API message');
    await tid(p, 'child-nickname').fill('Mia'); await tid(p, 'avatar-panda').click();
    await shot(p, 'child-form');
    await tid(p, 'child-save').click();
    await p.waitForFunction(() => document.querySelectorAll('[data-testid="pa-child"]').length === 1);
    check(mock.st.children[0]?.nickname === 'Mia' && mock.st.children[0]?.avatar === 'panda', 'add child: POST /children {nickname, avatar}');
    for (const n of ['Leo', 'Ava', 'Max', 'Zoe', 'Kai']) {
      await tid(p, 'pa-add').click(); await tid(p, 'child-nickname').fill(n); await tid(p, 'child-save').click();
      await p.waitForFunction(k => document.querySelectorAll('[data-testid="pa-child"]').length === k, mock.st.children.length);
    }
    check(await tid(p, 'pa-add').isDisabled() && await tid(p, 'pa-cap').isVisible() && (await tid(p, 'pa-count').innerText()) === '6 / 6', 'cap: with 6 children "Add" is disabled and the limit is explained');
    await shot(p, 'parent-area-cap');
    // rename + delete (with a confirmation and the PIN again)
    await tid(p, 'pa-rename').nth(1).click(); await tid(p, 'child-nickname').fill('Leon'); await tid(p, 'child-save').click();
    await p.waitForFunction(() => [...document.querySelectorAll('[data-testid="pa-child"] .nick')].some(e => e.textContent === 'Leon'));
    check(mock.st.calls.some(c => c.m === 'PATCH' && c.body.nickname === 'Leon'), 'rename: PATCH /children/:id');
    await tid(p, 'pa-delete').nth(5).click(); await tid(p, 'delete-child-confirm').waitFor();
    await shot(p, 'delete-child-confirm');
    await tid(p, 'delete-child-cancel').click();
    check(mock.st.children.length === 6, 'delete child: "Keep" deletes nothing');
    await tid(p, 'pa-delete').nth(5).click(); await tid(p, 'delete-child-yes').click(); await tid(p, 'pin-enter').waitFor(); await typePin(p, '2468');
    await p.waitForFunction(() => document.querySelectorAll('[data-testid="pa-child"]').length === 5);
    check(mock.st.children.length === 5 && mock.st.calls.some(c => c.m === 'DELETE' && c.body.pin === '2468'), 'delete child: confirmation, then DELETE with the PIN');
    check(await tid(p, 'pa-add').isEnabled(), 'cap: "Add" is back after a delete');
    // server-side cap (another device added a 6th meanwhile): the 409 is shown
    mock.st.children.push({ id: uuid(), nickname: 'Other', avatar: 'fox', speechMode: 'off', sort: 9, lastPlayed: null });
    await tid(p, 'pa-add').click(); await tid(p, 'child-nickname').fill('Seven'); await tid(p, 'child-save').click();
    await p.waitForFunction(() => /6/.test(document.querySelector('[data-testid="child-err"]')?.textContent || ''));
    check(mock.st.children.length === 6, 'cap: the API\'s 409 child_limit is shown, no 7th child');
    await tid(p, 'child-cancel').click(); mock.st.children.pop();
    // export
    const dl = p.waitForEvent('download'); await tid(p, 'pa-export').click(); const d = await dl;
    check(/^chinese-quest-export-\d{4}-\d\d-\d\d\.json$/.test(d.suggestedFilename()), 'export: downloads the JSON from GET /export');
    // picker → pick Mia → her cloud save loads through CloudSaveStore
    const mia = mock.st.children[0];
    mock.st.saves[mia.id] = { version: 3, contentVersion: 'graph', state: { ...guestV3(7), prog: undefined, log: undefined, gold: 321, consent: { given: false, speech: false, at: 0 } }, graphs: [],
      mastery: [{ item: 'C001', seen: true, recentMiss: 0, ways: { rZE: { a: 9, c: 8, box: 3, due: 0, last: 1, wrongRun: 0 } } }] };
    delete mock.st.saves[mia.id].state.prog; delete mock.st.saves[mia.id].state.log;
    await tid(p, 'pa-done').click(); await tid(p, 'child-picker').waitFor();
    check(await tid(p, 'pick-child').count() === 5, 'picker: one avatar tile per child');
    await shot(p, 'picker');
    await tid(p, 'pick-child').first().click();
    await p.waitForFunction(() => document.body.dataset.world === 'graph' && !!document.querySelector('[data-testid="hud-level"]')?.textContent, null, { timeout: 20000 });
    await p.waitForFunction(() => document.querySelector('[data-testid="hud-level"]').textContent === '7', null, { timeout: 10000 });
    const cloud = JSON.parse(await ls(p, 'chinese-rpg-cloud'));
    const mirror = JSON.parse(await ls(p, `chinese-rpg-proto-v4:child:${mia.id}`));
    check(cloud?.childId === mia.id, 'pick: one tap selects the child on this device');
    check(mock.st.calls.some(c => c.m === 'GET' && c.p === `/children/${mia.id}/save`), 'pick: GET /children/:id/save');
    check(+(await tid(p, 'hud-gold').innerText()) === 321 && mirror?.prog?.C001?.ways?.rZE?.a === 9, 'pick: the cloud save (level 7, 321 gold, word counters) is what the game plays');
    check(!(await ls(p, 'chinese-rpg-proto-v3')) && !(await ls(p, 'chinese-rpg-proto-v4')), 'pick: guest saves are untouched (none created)');
    check((await tid(p, 'player-chip').innerText()).includes('Mia'), 'in game: a chip shows who is playing');
    const ob = JSON.parse(await ls(p, `chinese-rpg-outbox-v1:${mia.id}`));
    check(ob?.version === 3 && ob?.sentAc?.['C001|rZE']?.[0] === 9, 'pick: the outbox adopts the server version and counters (no double counting)');
    await p.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    await p.waitForFunction(() => true); await sleep(800);
    const put = mock.st.calls.find(c => c.m === 'PUT' && c.p === `/children/${mia.id}/save`);
    check(put && put.body.baseVersion === 3 && put.body.state && !('prog' in put.body.state) && !('log' in put.body.state) && put.body.state.world, 'play: CloudSaveStore pushes PUT /save (base version 3, graph world, no prog/log)');
    check(!put?.body.mastery?.some(m => m.item === 'C001'), 'play: no mastery delta for words the server already has');
    await shot(p, 'playing-child');
    // switch player: game menu → picker → Leon
    await tid(p, 'pause').click(); await tid(p, 'pause-switch').click();
    await tid(p, 'child-picker').waitFor({ timeout: 15000 });
    check(!(await ls(p, 'chinese-rpg-cloud')), 'switch player: back to "Who\'s playing?"');
    const leon = mock.st.children[1];
    await p.locator(`[data-pick="${leon.id}"]`).click();
    await p.waitForFunction(() => document.body.dataset.world === 'graph' && document.querySelector('[data-testid="player-chip"]'), null, { timeout: 20000 });
    check(JSON.parse(await ls(p, 'chinese-rpg-cloud'))?.childId === leon.id && (await tid(p, 'player-chip').innerText()).includes('Leon'), 'switch player: one tap on another tile plays as them');
    check(!!(await ls(p, `chinese-rpg-proto-v4:child:${mia.id}`)), 'switch player: the first child\'s local copy stays on the device');
    check(mock.st.headerFaults.length === 0, 'every write carried X-App-Request: 1 and JSON (CSRF rules)' + (mock.st.headerFaults.length ? ': ' + mock.st.headerFaults.join(', ') : ''));
    await p.context().close();
  }

  // ============ 4. PIN entry and lockout (the API's message) ============
  {
    const mock = family(['Mia']); const p = await newPage(mock);
    await p.goto(CLOUD); await tid(p, 'child-picker').waitFor();
    await tid(p, 'picker-parent').click(); await tid(p, 'pin-enter').waitFor();
    await typePin(p, '1111');
    check(/Wrong PIN.*4 tries left/.test(await tid(p, 'pin-msg').innerText()), 'PIN entry: wrong PIN shows the tries left');
    for (let i = 0; i < 3; i++) await typePin(p, '1111');
    check(/1 try left/.test(await tid(p, 'pin-msg').innerText()), 'PIN entry: counts down to 1 try left');
    await typePin(p, '1111');
    await p.waitForFunction(() => /Too many wrong PINs/.test(document.querySelector('[data-testid="pin-msg"]')?.textContent || ''));
    check(/Too many wrong PINs\. Try again later\./.test(await tid(p, 'pin-msg').innerText()) && /try again after/i.test(await tid(p, 'pin-msg').innerText()), 'lockout: the API message and the time to try again');
    check(await tid(p, 'pin-key-2').isDisabled() && await tid(p, 'pin-ok').isDisabled(), 'lockout: the keypad is disabled');
    await shot(p, 'pin-lockout');
    await tid(p, 'pin-cancel').click();
    mock.st.lockedUntil = 0;
    await tid(p, 'picker-parent').click(); await typePin(p, '2468'); await tid(p, 'parent-area').waitFor();
    check(mock.st.unlocked, 'PIN entry: the right PIN opens the parent area (POST /parent/unlock)');
    // the 10-minute unlock ran out: the next parent action asks for the PIN, then carries on
    mock.st.unlocked = false;
    await tid(p, 'pa-add').click(); await tid(p, 'child-nickname').fill('Leo'); await tid(p, 'child-save').click();
    await tid(p, 'pin-enter').waitFor(); await typePin(p, '2468');
    await p.waitForFunction(() => document.querySelectorAll('[data-testid="pa-child"]').length === 2);
    check(mock.st.children.length === 2, 'unlock expired: PIN asked again, then the child is added');
    // delete account: type DELETE + PIN
    await tid(p, 'pa-delete-account').click(); await tid(p, 'delete-account-confirm').waitFor();
    check(await tid(p, 'delete-account-yes').isDisabled(), 'delete account: needs DELETE typed');
    await tid(p, 'delete-account-type').fill('DELETE'); await shot(p, 'delete-account');
    await tid(p, 'delete-account-yes').click(); await tid(p, 'pin-enter').waitFor(); await typePin(p, '2468');
    await tid(p, 'title-screen').waitFor({ timeout: 15000 });
    check(mock.st.calls.some(c => c.m === 'DELETE' && c.p === '/account' && c.body.confirm === 'DELETE' && c.body.pin === '2468'), 'delete account: DELETE /account {confirm, pin}, back to the launch screen');
    await p.context().close();
  }

  // ============ 5. sign out ============
  {
    const mock = family(['Mia']); mock.st.unlocked = true; const p = await newPage(mock);
    await p.goto(CLOUD); await tid(p, 'child-picker').waitFor(); await tid(p, 'picker-parent').click(); await typePin(p, '2468');
    await tid(p, 'pa-signout').click(); await tid(p, 'title-screen').waitFor();
    check(mock.st.authPosts.some(a => a.path === '/api/auth/signout' && a.form.csrfToken === 'csrf-tok-123'), 'sign out: Auth.js POST /api/auth/signout with the csrfToken, back to the launch screen');
    await p.context().close();
  }

  // ============ 6. first sign-in with a guest save on the device: the import prompt ============
  for (const how of ['existing', 'new', 'later']) {
    const mock = mockApi(); const p = await newPage(mock);
    await p.goto(CLOUD); await tid(p, 'title-screen').waitFor();
    await p.evaluate(s => localStorage.setItem('chinese-rpg-proto-v3', JSON.stringify(s)), guestV3(4));
    await tid(p, 'parent-signin').click(); await tid(p, 'account-consent').waitFor();
    await tid(p, 'consent-check').check(); await tid(p, 'consent-agree').click(); await typePin(p, '2468'); await typePin(p, '2468');
    await tid(p, 'receipt-continue').click(); await tid(p, 'parent-area').waitFor();
    await tid(p, 'pa-add').click(); await tid(p, 'child-nickname').fill('Mia'); await tid(p, 'child-save').click();
    await tid(p, 'import-prompt').waitFor();
    if (how === 'existing') {
      check(/Lv 4/.test(await tid(p, 'import-prompt').innerText()), 'import: after the first child, the prompt offers this device\'s Lv 4 guest save');
      await shot(p, 'import-prompt');
      await tid(p, 'import-to').first().click(); await tid(p, 'parent-area').waitFor();
      const imp = mock.st.calls.find(c => c.p.endsWith('/import'));
      check(imp && imp.p === `/children/${mock.st.children[0].id}/import` && imp.body.save.level === 4 && imp.body.save.version === 3, 'import: POST /children/:id/import with the raw v3 save');
      const keys = await p.evaluate(() => Object.keys(localStorage));
      check(!keys.includes('chinese-rpg-proto-v3') && keys.some(k => /^chinese-rpg-proto-v3\.imported-\d{4}-\d\d-\d\d$/.test(k)) && JSON.parse(await ls(p, 'chinese-rpg-import')).importedTo === mock.st.children[0].id,
        'import: the local save is kept as .imported-<date> and the prompt won\'t come back');
      check(await tid(p, 'pa-import').count() === 0, 'import: no import button once imported');
    } else if (how === 'new') {
      await tid(p, 'import-new').click(); await tid(p, 'child-nickname').fill('Leo'); await tid(p, 'child-save').click();
      await p.waitForFunction(() => !document.querySelector('[data-testid="child-form"]'));
      await sleep(400);
      const imp = mock.st.calls.find(c => c.p.endsWith('/import'));
      check(mock.st.children.length === 2 && imp?.p === `/children/${mock.st.children[1].id}/import`, 'import: "New player" creates a child and imports into it');
    } else {
      await tid(p, 'import-later').click(); await tid(p, 'parent-area').waitFor();
      check(!mock.st.calls.some(c => c.p.endsWith('/import')) && !!(await ls(p, 'chinese-rpg-proto-v3')) && await tid(p, 'pa-import').count() === 0, 'import: "Not now" imports nothing, keeps the guest save and stops asking');
    }
    await p.context().close();
  }

  // ============ 7. offline: API unreachable or Neon paused (503) ============
  {
    const mock = mockApi({ net: 'offline' }); const p = await newPage(mock);
    await p.goto(CLOUD); await tid(p, 'title-screen').waitFor(); await tid(p, 'offline-banner').waitFor();
    check(await tid(p, 'offline-banner').isVisible(), 'offline (connection refused): launch screen shows the small offline banner');
    await tid(p, 'play-guest').click(); await guestConsent(p); await tid(p, 'town').waitFor();
    check(true, 'offline: guest play still starts');
    await p.context().close();
  }
  {
    const mock = family(['Mia']); const kid = mock.st.children[0]; const p = await newPage(mock);
    mock.st.saves[kid.id] = { version: 2, contentVersion: 'graph', state: { ...guestV3(5) }, graphs: [], mastery: [] }; delete mock.st.saves[kid.id].state.prog; delete mock.st.saves[kid.id].state.log;
    await p.goto(CLOUD); await tid(p, 'pick-child').click();
    await p.waitForFunction(() => document.querySelector('[data-testid="hud-level"]')?.textContent === '5', null, { timeout: 20000 });
    mock.st.net = 'down';   // Neon paused: the API answers 503
    await p.reload();
    await p.waitForFunction(() => document.querySelector('[data-testid="hud-level"]')?.textContent === '5', null, { timeout: 20000 });
    await tid(p, 'offline-banner').waitFor();
    check(await tid(p, 'offline-banner').isVisible() && /Offline/.test(await tid(p, 'offline-banner').innerText()), 'Neon paused (503): the game starts on the local save with the offline banner');
    await p.evaluate(() => window.dispatchEvent(new Event('pagehide'))); await sleep(800);
    const ob = JSON.parse(await ls(p, `chinese-rpg-outbox-v1:${kid.id}`));
    check(!!(ob?.inflight || ob?.pending), 'offline: the save waits in the outbox');
    await shot(p, 'offline-banner');
    mock.st.net = 'ok';
    await p.evaluate(() => window.dispatchEvent(new Event('online')));
    await p.waitForFunction(() => !document.querySelector('[data-testid="offline-banner"]'), null, { timeout: 15000 });
    await p.waitForFunction(k => { const o = JSON.parse(localStorage.getItem(k) || '{}'); return !o.inflight && !o.pending; }, `chinese-rpg-outbox-v1:${kid.id}`, { timeout: 10000 }).catch(() => {});
    const ob2 = JSON.parse(await ls(p, `chinese-rpg-outbox-v1:${kid.id}`));
    check(!ob2.inflight && !ob2.pending && mock.st.saves[kid.id].version >= 3, 'back online: the outbox syncs and the banner goes away'
      + (ob2.inflight || ob2.pending ? ` (outbox ${JSON.stringify({ inflight: !!ob2.inflight, pending: !!ob2.pending, v: mock.st.saves[kid.id].version, puts: mock.st.calls.filter(c => c.m === 'PUT').length })})` : ''));
    await p.context().close();
  }
} catch (e) { check(false, 'account tests crashed: ' + (e.stack || e.message).split('\n').slice(0, 4).join(' ')); }

await browser.close();
if (server) server.kill();
console.log(`\n${passed} passed, ${errors.length} problem(s)` + (errors.length ? ':\n' + errors.join('\n') : '\nALL ACCOUNT CHECKS PASSED'));
process.exit(errors.length ? 1 : 0);
