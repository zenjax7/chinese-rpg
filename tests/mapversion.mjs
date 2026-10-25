// Oct 24 (Jack's realm_1 report): a fresh save that walks to m_fork and reloads is still at m_fork. The first session used to load the
// start graph before S.world existed, so its published hash was never recorded and the next load reset realm_1 (beta) via the
// bundled-hash fallback. Run from tests/world.mjs (static build: bundled realm_1) and tests/editor.mjs (cloud build: the index is
// rewritten so realm_1's published hash differs from the bundled one and the game plays /api/v1/levels/realm_1).
export async function firstSessionReloadTest({ browser, url, check, label, published = false }) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } }); const p = await ctx.newPage();
  const fetched = [];
  // battles faked from the very first one (the village's tutorial fight runs on the first arrival)
  await p.addInitScript(() => { const t = setInterval(() => { const x = window.__proto; if (x) { x.fakeBattle = 'win'; x.sceneInstant = true; x.walkMs = 50; } }, 20); setTimeout(() => clearInterval(t), 120000); });
  if (published) await p.route('**/api/v1/levels/index', async r => { const res = await r.fetch(); const j = await res.json();
    if (j.maps?.realm_1) j.maps.realm_1.hash = 'test-' + j.maps.realm_1.hash; await r.fulfill({ response: res, json: j }); });
  p.on('request', r => { if (r.url().includes('/api/v1/levels/realm_1')) fetched.push(r.url()); });
  const tid = id => p.locator(`[data-testid="${id}"]`);
  const settle = async (max = 200) => { for (let i = 0, idle = 0; i < max; i++) { await p.waitForTimeout(150);
    if (await tid('scene').count()) { idle = 0; await tid('scene-skip').click().catch(() => {}); continue; }
    if (await tid('dialog').count()) { idle = 0; await tid('dialog-btn-0').click().catch(() => {}); continue; }
    if (await tid('title-screen').count() && await tid('play-guest').count()) { idle = 0; await tid('play-guest').click().catch(() => {}); continue; }
    const up = await p.evaluate(() => !!document.querySelector('[data-testid=graph],[data-testid=town]') && !window.__proto?.walking);
    if (up && ++idle >= 3) return true; } return false; };
  try {
    await p.goto(url); await settle(40);
    await tid('consent').waitFor({ timeout: 15000 });
    const m = (await tid('consent').innerText()).match(/(\d+) × (\d+)/); await tid('consent-speech').uncheck();
    await tid('consent-answer').fill(String(+m[1] * +m[2])); await tid('consent-ok').click();
    if (await tid('name-input').waitFor({ timeout: 5000 }).then(() => true, () => false)) { await tid('name-input').fill('Lin'); await tid('name-ok').click(); }
    await settle();
    await p.evaluate(() => { window.__proto.fakeBattle = 'win'; window.__proto.sceneInstant = true; window.__proto.walkMs = 50; });
    const toMap = async () => { for (let i = 0; i < 30; i++) { await settle(); if (await tid('graph').count()) return;
      if (await tid('go-adventure').count()) await tid('go-adventure').click({ timeout: 3000 }).catch(() => {}); } };
    await toMap();
    if (!(await tid('graph').count())) { await p.screenshot({ path: `/tmp/mapversion-${label}.png` });
      const ids = await p.evaluate(() => [...document.querySelectorAll('[data-testid]')].map(e => e.dataset.testid).slice(0, 30).join(','));
      return check(false, `map version (${label}): no map after the first start (${ids})`); }
    const forkIdx = await p.evaluate(() => window.__proto.world.W.graphs.realm_1.nodes.find(n => n.id === 'm_fork').idx);
    if (!(await p.locator(`[data-testid="graph-svg"] .gn.next[data-idx="${forkIdx}"]`).click({ timeout: 10000 }).then(() => true, () => false))) { await p.screenshot({ path: `/tmp/mapversion-${label}.png` }); return check(false, `map version (${label}): m_fork not tappable from the start`); }
    await settle();
    const before = await p.evaluate(() => window.__proto.world.P().pos.node);
    await p.reload(); await settle();
    await p.evaluate(() => { window.__proto.fakeBattle = 'win'; window.__proto.sceneInstant = true; });
    await toMap();
    const after = await p.evaluate(() => { const w = window.__proto.world; const P = w.P(); return { node: P.pos.node, mv: JSON.parse(localStorage.getItem('chinese-rpg-proto-v4')).mapVersions?.realm_1 ?? null }; });
    check(before === 'm_fork' && after.node === 'm_fork' && (!published || (fetched.length > 0 && after.mv?.startsWith('test-'))),
      `map version (${label}): fresh guest → m_fork → reload → still at m_fork (before ${before}, after ${after.node}, recorded ${after.mv ? after.mv.slice(0, 12) : 'none'}, realm_1 fetched ${fetched.length})`);
  } finally { await ctx.close(); }
}
