// Travel-scroll prototype (Jack Oct 25): on realm_1 (default since Oct 25 follow-up; __proto.scrollTravel=false opts out) a tap on a next node cuts to a battle-layout
// walk: the party walks in place at the centre while the meadow battle background scrolls; the edge's encounter roll may start a battle
// (party hops to its spots, the monsters slide in), after it the walk goes on and the map opens at the destination. Skip jumps ahead.
// Run from tests/world.mjs. Battles are faked (__proto.fakeBattle = 'win'); __proto.travelForce ('fight' | 'none') fixes the roll.
export async function travelScrollTests({ browser, url, check }) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { const t = setInterval(() => { const x = window.__proto; if (x) { x.fakeBattle = 'win'; x.sceneInstant = true; } }, 20); setTimeout(() => clearInterval(t), 60000); });
  const tid = id => p.locator(`[data-testid="${id}"]`);
  const settle = async (max = 300) => { for (let i = 0, idle = 0; i < max; i++) { await p.waitForTimeout(150);
    if (await tid('title-screen').count() && await tid('play-guest').count()) { idle = 0; await tid('play-guest').click().catch(() => {}); continue; }
    if (await tid('consent').count()) { idle = 0; const m = (await tid('consent').innerText()).match(/(\d+) × (\d+)/); await tid('consent-speech').uncheck();
      await tid('consent-answer').fill(String(+m[1] * +m[2])); await tid('consent-ok').click(); continue; }
    if (await tid('name-input').count()) { idle = 0; await tid('name-input').fill('Jack'); await tid('name-ok').click(); continue; }
    if (await tid('scene').count()) { idle = 0; await tid('scene-skip').click().catch(() => {}); continue; }
    if (await tid('dialog').count()) { idle = 0; await tid('dialog-btn-0').click().catch(() => {}); continue; }
    if (await tid('town').count() && await tid('go-adventure').count()) { idle = 0; await tid('go-adventure').click().catch(() => {}); continue; }
    if (await tid('graph').count() && !(await p.evaluate(() => window.__proto?.walking)) && ++idle >= 8) return true; } return false; };
  const st = () => p.evaluate(() => ({ pos: window.__proto.world.P().pos.node, tr: window.__proto.travel, tv: window.__proto.travelView, battles: (window.__proto.battles || []).length,
    scroll: !!document.querySelector('[data-testid="travel-scroll"]'), graph: !!document.querySelector('[data-testid="graph"]') }));
  const tap = id => p.evaluate(id => window.__proto.world.W.graphs.realm_1.nodes.find(n => n.id === id).idx, id).then(i => p.locator(`[data-testid="graph-svg"] .gn.next[data-idx="${i}"]`).click({ timeout: 8000 }));
  try {
    await p.goto(url); await settle();
    // off by default: no ?scroll, the old map walk
    await p.evaluate(() => { window.__proto.walkMs = 50; window.__proto.noEncounters = true; window.__proto.scrollTravel = false; });
    await tap('m_fork'); let sawScroll = false; for (let i = 0; i < 20; i++) { await p.waitForTimeout(100); sawScroll ||= (await st()).scroll; } await settle();
    const off = await st(); check(off.pos === 'm_fork' && !sawScroll, `travel scroll: opt-out (scrollTravel=false) keeps the map walk (map walk to ${off.pos}, scroll screen ${sawScroll})`);
    // happy path: walk → battle → walk on → map at the destination
    await p.evaluate(() => { window.__proto.noEncounters = false; delete window.__proto.scrollTravel; delete window.__proto.walkMs; window.__proto.travelForce = 'fight'; window.__proto.travelMs = 2400; window.__proto.battles = []; });
    await tap('m_farm'); await p.waitForTimeout(400);
    const w1 = await st();
    check(w1.scroll && w1.tv?.scrolling && w1.tv.hero === 700 && w1.tv.comp === 560 && !!w1.tv.bg && w1.tr.phase === 'scroll' && w1.pos === 'm_fork',
      `travel scroll: meadow default (no ?scroll) — tap → the scroll walk (party at centre ${w1.tv?.hero}/${w1.tv?.comp}, bg ${w1.tv?.bg}, phase ${w1.tr?.phase})`);
    const x0 = w1.tv?.scrollX ?? 0; await p.waitForTimeout(300); const x1 = (await st()).tv?.scrollX ?? 0;
    check(x1 > x0, `travel scroll: the background scrolls (${x0} → ${x1})`);
    const L = (await st()).tv?.layers || []; check(L.length === 3 && L[0] < L[1] && L[1] < L[2], `travel scroll: 3 parallax layers, far slowest → near fastest (${L})`);
    const steps = await p.evaluate(() => window.__proto.world.W.graphs.realm_1.edges.find(e => e.id === window.__proto.travel.edge)?.steps || 1);
    const dur = await p.evaluate(() => { const g = window.__proto.world.W.graphs.realm_1; const m = Math.max(...g.edges.map(e => e.steps || 1)); return { m }; });
    check(w1.tr.total === 2400 * (1 + 0.25 * (steps - 1)) && dur.m > 1, `travel scroll: duration scales with steps (edge ${steps} step(s) → ${w1.tr.total} ms of base 2400; 1 step = base, longest edge ${dur.m} steps = ×${1 + 0.25 * (dur.m - 1)})`);
    await p.waitForFunction(() => (window.__proto.battles || []).length === 1, null, { timeout: 8000 }).catch(() => {});
    const b1 = await st(); check(b1.battles === 1 && b1.tr.battles === 1, `travel scroll: the encounter starts one battle mid-walk (${b1.battles})`);
    await p.waitForFunction(() => window.__proto.travel?.phase === 'scroll' && window.__proto.travel.t > 0.5, null, { timeout: 5000 }).catch(() => {});
    const w2 = await st(); check(w2.scroll && w2.tv?.scrolling && w2.tv.hero === 700, `travel scroll: after the win the walk goes on from the centre (t ${w2.tr?.t?.toFixed?.(2)})`);
    await settle(); const a1 = await st();
    check(a1.pos === 'm_farm' && a1.graph && !a1.scroll && a1.tr.phase === 'done' && a1.battles === 1, `travel scroll: arrives on the map at m_farm (${a1.pos}, battles ${a1.battles})`);
    // skip: a 20 s walk with no battle, Skip → arrival at once
    await p.evaluate(() => { window.__proto.travelForce = 'none'; window.__proto.travelMs = 20000; window.__proto.battles = []; });
    const t0 = Date.now(); await tap('m_fork'); await tid('travel-skip').click({ timeout: 3000 }); await settle(); const a2 = await st();
    check(a2.pos === 'm_fork' && a2.graph && a2.tr.skipped === 1 && a2.battles === 0 && Date.now() - t0 < 12000, `travel scroll: Skip ends a 20 s walk early (${a2.pos}, ${Date.now() - t0} ms)`);
    // skip with a battle ahead: Skip jumps to the battle, a second Skip to the arrival
    await p.evaluate(() => { window.__proto.travelForce = 'fight'; window.__proto.battles = []; });
    await tap('m_farm'); await tid('travel-skip').click({ timeout: 3000 });
    await p.waitForFunction(() => (window.__proto.battles || []).length === 1 && window.__proto.travel?.phase === 'scroll', null, { timeout: 8000 }).catch(() => {});
    await tid('travel-skip').click({ timeout: 3000 }).catch(() => {}); await settle(); const a3 = await st();
    check(a3.pos === 'm_farm' && a3.battles === 1 && a3.tr.skipped === 2, `travel scroll: Skip → the battle, Skip → the arrival (${a3.pos}, battles ${a3.battles}, skips ${a3.tr?.skipped})`);
    check(errs.length === 0, `travel scroll: no page errors (${errs.slice(0, 2)})`);
  } finally { await ctx.close(); }
}
