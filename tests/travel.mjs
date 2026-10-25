// Graph travel tests (Director Oct 17, after Jack's playtest): at most one battle per edge crossing and per arrival, free travel on walked
// edges after a fled encounter, the party sprite walking an edge to its target, an encounter firing mid-walk, and the skippable map → battle
// transition. Run from tests/world.mjs (so also from tests/play.mjs). Battles are faked with window.__proto.fakeBattle ('win' | 'flee'):
// the game still rolls, counts and places them (window.__proto.battles) but does not play them.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tapAsm } from './asm.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const J = f => JSON.parse(readFileSync(path.join(ROOT, f), 'utf8'));

/** A small synthetic map: ta —tab (1 step, safe)— tb (two fight events, like Desy's miniboss_1.1 quest fight + miniboss_1.2) —tbc (3 steps, danger 2)— tc. */
export const TRAVEL_GRAPH = { id: 'synthetic_travel', kind: 'overworld', realm: 1, title: { zh: '路', en: 'Travel test' },
  nodes: [{ id: 'ta', idx: 0, kind: 'waypoint', x: 0.1, y: 0.5, zone: 'meadow' }, { id: 'tb', idx: 1, kind: 'miniboss', x: 0.45, y: 0.5, zone: 'meadow' },
    { id: 'tc', idx: 2, kind: 'waypoint', x: 0.9, y: 0.5, zone: 'meadow' }],
  edges: [{ id: 'tab', idx: 0, from: 'ta', to: 'tb', kind: 'path', danger: 0, steps: 1 }, { id: 'tbc', idx: 1, from: 'tb', to: 'tc', kind: 'path', danger: 2, steps: 3 }],
  events: [{ id: 'tb.1', node: 'tb', on: 'enter', once: true, outcome: 'miniboss', cond: { flag: 'tt_quest' }, do: [{ fight: { enemies: ['horned_rabbit'], kind: 'miniboss' } }] },
    { id: 'tb.2', node: 'tb', on: 'enter', once: true, outcome: 'miniboss', do: [{ fight: { enemies: ['horned_rabbit'], kind: 'miniboss' } }, { setFlag: 'tt_plain' }] }] };

/** Seeds for the browser checks, found with the real engine and rules. */
export async function travelSeeds() {
  const E = await import(path.join(ROOT, 'src/world/engine.ts'));
  const rules = J('src/data/world/index.json').rules; const g1 = J('public/world/graphs/realm_1.json'); const tg = TRAVEL_GRAPH;
  const e6 = g1.edges.find(e => e.id === 'e6'); const tbc = tg.edges.find(e => e.id === 'tbc');
  const P = (seed, walked = false, crossing = 0) => { const p = E.newProgress(seed, { graph: 'realm_1', node: 'village' }); const gp = E.gp(p, tg.id);
    if (walked) gp.walked = E.bitSet('', tbc.idx); gp.crossings[tbc.idx] = crossing; return p; };
  const hits = (g, e, p) => Array.from({ length: e.steps }, (_, s) => E.rollStep(g, e, s, p, rules));
  const find = ok => { for (let s = 1; s < 200000; s++) if (ok(s)) return s; return null; };
  return {
    // Jack's repro: realm_1 e6 (m_field → m_grass, 4 steps, danger 2) with a seed whose rolls hit on all 4 steps
    allHitE6: find(s => hits(g1, e6, E.newProgress(s, { graph: 'realm_1', node: 'village' })).every(Boolean)),
    // mid-walk: on the fresh tbc the first hit is step 1 (of 0..2)
    midTbc: find(s => { const h = hits(tg, tbc, P(s)); return !h[0] && h[1]; }),
    // free travel: the walked tbc (crossed once) hits on crossing 1, and crossing 2 has no hit at all
    fleeThenFree: find(s => hits(tg, tbc, P(s, true, 1)).some(Boolean) && !hits(tg, tbc, P(s, true, 2)).some(Boolean)),
    E, rules };
}

export async function travelUnitTests({ check }) {
  const { E, rules } = await travelSeeds(); const tg = TRAVEL_GRAPH; const tbc = tg.edges[1];
  const g1 = J('public/world/graphs/realm_1.json'); const e6 = g1.edges.find(e => e.id === 'e6');
  let worst = 0;
  for (let seed = 1; seed <= 400; seed++) { const P = E.newProgress(seed, { graph: 'realm_1', node: 'village' });
    const plan = E.edgeEncounter(g1, e6, 0, P, rules); worst = Math.max(worst, plan < 0 ? 0 : 1);
    if (!(plan === -1 || (Number.isInteger(plan) && plan >= 0 && plan < e6.steps && E.rollStep(g1, e6, plan, P, rules) && Array.from({ length: plan }, (_, s) => E.rollStep(g1, e6, s, P, rules)).every(x => !x)))) { worst = 99; break; } }
  check(worst === 1, `travel: an edge crossing plans at most one encounter, at the first step whose existing roll hits (realm_1 e6, 400 seeds; worst ${worst})`);
  const P = E.newProgress(7, { graph: 'realm_1', node: 'village' }); const gp = E.gp(P, tg.id); gp.edgeProgress[tbc.idx] = 2; const c0 = gp.crossings[tbc.idx] || 0;
  E.abandonEdge(P, tg, tbc);
  check(gp.crossings[tbc.idx] === c0 + 1 && !(tbc.idx in gp.edgeProgress) && !E.bitGet(gp.walked, tbc.idx),
    'travel: a turned-back crossing (flee / defeat) counts as a crossing, so the next try is a fresh roll, and starts again from step 0');
  const Pw = E.newProgress(7, { graph: 'realm_1', node: 'village' }); E.gp(Pw, tg.id).walked = E.bitSet('', tbc.idx);
  check(Math.abs(E.stepRate(tg, tbc, Pw, rules).p - rules.encounterRate['2'] * rules.clearedStepMult) < 1e-9, 'travel: walked edges keep the ×0.5 encounter chance');
}

export async function travelTests({ browser, BASE, check, log = console.log }) {
  const seeds = await travelSeeds(); log('travel seeds', JSON.stringify({ allHitE6: seeds.allHitE6, midTbc: seeds.midTbc, fleeThenFree: seeds.fleeThenFree }));
  const B = BASE + (BASE.includes('?') ? '&' : '?') + 'world=graph&debug';
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } }); await ctx.addInitScript(() => { window.__proto = Object.assign(window.__proto || {}, { scrollTravel: false }); }); /* old map-walk harness: opt out of the meadow scroll walk (tests/travelscroll.mjs covers it) */ const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const tid = id => p.locator(`[data-testid="${id}"]`);
  const pos = () => p.evaluate(() => window.__proto.world.P().pos.node);
  const battles = () => p.evaluate(() => window.__proto.battles || []);
  /** Skip scenes, answer dialogs ("Later" / OK) and wait until the map or a town is up and no walk is running. */
  const settle = async (max = 120) => { for (let i = 0, idle = 0; i < max; i++) { await p.waitForTimeout(150);
    if (await tid('scene').count()) { idle = 0; await tid('scene-skip').click().catch(() => {}); continue; }
    if (await tid('dialog').count()) { idle = 0; await (await tid('dialog-btn-1').count() ? tid('dialog-btn-1') : tid('dialog-btn-0')).click().catch(() => {}); continue; }
    const up = await p.evaluate(() => !!document.querySelector('[data-testid=graph],[data-testid=town]') && !window.__proto.walking);
    if (up && ++idle >= 3) return true; } return false; };
  const tap = idx => p.locator(`[data-testid="graph-svg"] .gn.next[data-idx="${idx}"]`).click({ timeout: 5000 }).then(() => true, () => false);
  const xy = id => p.evaluate(id => window.__proto.world.xy(id), id).catch(() => null);
  try {
    await p.goto(B); await tid('consent').waitFor();
    await p.evaluate(() => { window.__proto.fakeBattle = 'win'; window.__proto.sceneInstant = true; window.__proto.battles = []; });
    const m = (await tid('consent').innerText()).match(/(\d+) × (\d+)/); await tid('consent-speech').uncheck();
    await tid('consent-answer').fill(String(+m[1] * +m[2])); await tid('consent-ok').click();
    await tid('name-input').waitFor(); await tid('name-input').fill('Tao'); await tid('name-ok').click();
    await settle(200);

    { // a save without Xiaolong shows only the Hero
      await p.evaluate(() => { const k = 'chinese-rpg-proto-v4'; const s = JSON.parse(localStorage.getItem(k)); s.party = []; localStorage.setItem(k, JSON.stringify(s)); });
      await p.reload(); await settle(200); if (await tid('go-adventure').count()) await tid('go-adventure').click(); await tid('graph').waitFor({ timeout: 15000 });
      const solo = await p.evaluate(() => ({ hero: !!document.querySelector('[data-testid="party-hero"]'), xl: !!document.querySelector('[data-testid="party-xiaolong"]') }));
      check(solo.hero && !solo.xl, `map party: no Xiaolong yet → only the Hero (${JSON.stringify(solo)})`);
      await p.evaluate(() => { const k = 'chinese-rpg-proto-v4'; const s = JSON.parse(localStorage.getItem(k)); s.party = ['xiaolong']; localStorage.setItem(k, JSON.stringify(s)); });
      await p.reload(); await settle(200); await p.evaluate(() => { window.__proto.fakeBattle = 'win'; window.__proto.sceneInstant = true; window.__proto.battles = []; }); }

    // ---- bug 1 repro: realm_1 m_field → m_grass over e6 (4 steps, danger 2); the seed's rolls hit on all 4 steps ----
    await p.evaluate(async seed => { const w = window.__proto.world; await w.goto('realm_1', 'm_field'); w.P().seed = seed; window.__proto.battles = []; }, seeds.allHitE6);
    await settle();
    const grassIdx = J('public/world/graphs/realm_1.json').nodes.find(n => n.id === 'm_grass').idx;
    const t1 = await tap(grassIdx); await settle(200);
    const b1 = (await battles()).filter(b => b.edge === 'e6');
    check(t1 && (await pos()) === 'm_grass' && b1.length === 1, `one battle per edge: realm_1 e6 (4 steps, danger 2, seed ${seeds.allHitE6} hits on every step) gave ${b1.length} battle(s), want 1 (at ${await pos()})`);

    // ---- one battle per arrival: tb has two eligible fight events (quest-gated + plain); the second waits for the next visit ----
    await p.evaluate(async g => { const w = window.__proto.world; w.W.graphs[g.id] = g; w.E.registerGraph(g); const P = w.P(); if (!P.flags.includes('tt_quest')) P.flags.push('tt_quest');
      await w.goto(g.id, 'ta'); window.__proto.battles = []; }, TRAVEL_GRAPH);
    await settle();
    const sprite = await p.evaluate(() => { const s = document.querySelector('[data-testid="party-sprite"]'); return s ? { href: s.querySelector('[data-testid="party-hero"] image')?.getAttribute('href') || '', txt: s.textContent } : null; });
    check(!!sprite && (/hero/.test(sprite.href) || sprite.txt.length > 0), `party sprite on the map (${JSON.stringify(sprite)})`);
    // ---- Arty's map sprites (approved 2026-10-18): keys, sizes, Xiaolong's place; on a node the Hero idles while Xiaolong keeps flying ----
    const pstate = () => p.evaluate(() => { const g = document.querySelector('[data-testid="party-sprite"]'); const one = id => { const e = g?.querySelector(`[data-testid="party-${id}"]`);
      return e && { key: e.dataset.key, anim: e.dataset.anim, href: e.querySelector('image')?.getAttribute('href'), x: +e.getAttribute('x'), y: +e.getAttribute('y'), w: +e.getAttribute('width') }; };
      return { facing: g?.querySelector('.pflip')?.dataset.facing, hero: one('hero'), xl: one('xiaolong'), walking: !!window.__proto.walking }; });
    { const st = await pstate();
      check(st.hero?.key === 'hero_map_walk' && /map_sprites\/hero_map_walk\.png$/.test(st.hero.href || '') && st.xl?.key === 'xiaolong_map_fly' && /map_sprites\/xiaolong_map_fly\.png$/.test(st.xl.href || ''),
        `map sprites: hero_map_walk + xiaolong_map_fly from public/map_sprites (${st.hero?.href}, ${st.xl?.href})`);
      check(st.hero.w === 64 && Math.abs(st.xl.w - 0.6 * 64) < 0.01 && Math.abs((st.xl.x + st.xl.w / 2) - (st.hero.x + st.hero.w / 2) + 0.35 * 64) < 0.01 && Math.abs((st.xl.y + st.xl.w * 0.92) - (st.hero.y + st.hero.w * 0.97) + 0.15 * 64) < 0.01,
        `map sprites: Hero 64 px, Xiaolong 0.6×, anchor −0.35 / −0.15 hero sizes (behind and above, trailing side) (${JSON.stringify({ hero: st.hero, xl: st.xl })})`);
      check(st.hero.anim === 'idle' && st.xl.anim === 'fly' && st.facing === 'right', `map sprites on a node: Hero idle, Xiaolong flying, facing right (${st.hero.anim}, ${st.xl.anim}, ${st.facing})`); }
    await tap(1); await settle();
    const P2 = await p.evaluate(() => window.__proto.world.P());
    const atTb = (await battles()).filter(b => b.node === 'tb' && !b.edge);
    check((await pos()) === 'tb' && atTb.length === 1 && P2.eventsDone.includes('synthetic_travel/tb.1') && !P2.eventsDone.includes('synthetic_travel/tb.2'),
      `one battle per arrival: two eligible fight events on tb gave ${atTb.length} battle(s), want 1; the second one waits (done ${P2.eventsDone.filter(k => k.startsWith('synthetic_travel'))})`);

    // ---- the walk: the party sprite moves slowly along the edge and ends on the target node ----
    const A = await xy('tb'), Bxy = await xy('ta');
    await p.evaluate(() => { window.__proto.battles = []; }); await tap(0);
    const samples = []; for (let i = 0; i < 40; i++) { const s = { ...(await p.evaluate(() => ({ party: window.__proto.party, walking: !!window.__proto.walking }))), st: await pstate() }; samples.push(s); if (!s.walking && i > 2) break; await p.waitForTimeout(60); }
    await settle();
    const fin = await p.evaluate(() => window.__proto.party); const lw = await p.evaluate(() => window.__proto.lastWalk);
    const between = A && Bxy ? samples.filter(s => s.walking && s.party && s.party.x < A.x - 2 && s.party.x > Bxy.x + 2).length : 0;
    check((await pos()) === 'ta' && between >= 2 && fin && Bxy && Math.abs(fin.x - Bxy.x) < 1 && Math.abs(fin.y - Bxy.y) < 1 && lw?.ms >= 1000,
      `walk: the party walks along tab and stops on ta (${between} mid-edge samples, end ${JSON.stringify(fin)} vs ${JSON.stringify(Bxy)}, ${lw?.ms} ms)`);
    { const onEdge = samples.filter(x => x.walking && x.st.hero?.anim === 'walk'); const end = await pstate();
      check(onEdge.length >= 2 && onEdge.every(x => x.st.xl?.anim === 'fly' && x.st.facing === 'left') && end.hero.anim === 'idle' && end.xl.anim === 'fly',
        `map sprites on an edge: walk + fly while walking, mirrored walking left (tb → ta); idle on arrival (${onEdge.length} walk samples, facing ${[...new Set(onEdge.map(x => x.st.facing))]}; end ${end.hero.anim})`); }
    await tap(1);
    { const r = []; for (let i = 0; i < 40; i++) { const st = await pstate(); r.push(st); if (!st.walking && i > 2) break; await p.waitForTimeout(60); }
      const w = r.filter(x => x.walking && x.hero?.anim === 'walk');
      check(w.length >= 2 && w.every(x => x.facing === 'right'), `map sprites: walking right (ta → tb) is not mirrored (${w.length} walk samples, facing ${[...new Set(w.map(x => x.facing))]})`); }
    await settle();
    const atTb2 = (await battles()).filter(b => b.node === 'tb' && !b.edge);
    check((await pos()) === 'tb' && atTb2.length === 1 && (await p.evaluate(() => window.__proto.world.P().flags.includes('tt_plain'))), `one battle per arrival: the waiting fight event runs on the next visit (${atTb2.length})`);

    // ---- an encounter mid-walk: the existing roll fires at its step, the party stops there, then walks on after the win ----
    await p.evaluate(seed => { window.__proto.world.P().seed = seed; window.__proto.battles = []; }, seeds.midTbc);
    const C = await xy('tc'), Bb = await xy('tb');
    await tap(2); await settle(200);
    const bm = (await battles()).filter(b => b.edge === 'tbc');
    const want = Bb && C ? Bb.x + (C.x - Bb.x) * 1.5 / 3 : NaN;
    check(bm.length === 1 && bm[0].step === 1 && bm[0].party && Math.abs(bm[0].party.x - want) < 2 && (await pos()) === 'tc',
      `encounter mid-walk: tbc's roll hits on step 1 of 3; the party stops at x ${bm[0]?.party?.x?.toFixed(1)} (want ${want.toFixed(1)}), fights once, then walks on to tc (at ${await pos()})`);

    // ---- free travel on a walked edge: a fled encounter sends the party back, and the next try is a fresh ×0.5 roll ----
    await p.evaluate(seed => { window.__proto.world.P().seed = seed; window.__proto.battles = []; window.__proto.fakeBattle = 'flee'; }, seeds.fleeThenFree);
    await tap(1); await settle(200);
    const back1 = await pos(); const nb1 = (await battles()).length;
    await tap(1); await settle(200);
    const nb2 = (await battles()).length - nb1;
    check(back1 === 'tc' && nb1 === 1 && nb2 === 0 && (await pos()) === 'tb',
      `free travel on a walked edge: fled once (back at ${back1}), the next try is a new roll and gets through (${nb2} battle(s) on try 2; at ${await pos()})`);
    await p.evaluate(() => { window.__proto.fakeBattle = 'win'; });

    // ---- the map → battle transition: about 1 s, skippable by key or tap ----
    const trans = async how => { await p.evaluate(() => { window.__proto.lastTransition = null; window.__tDone = false; window.__proto.world.fight().then(() => { window.__tDone = true; }); });
      const shown = await tid('battle-transition').waitFor({ state: 'attached', timeout: 3000 }).then(() => true, () => false);
      if (how === 'key') await p.keyboard.press(' '); else if (how === 'tap') await p.mouse.click(640, 360);
      await p.waitForFunction(() => window.__tDone, null, { timeout: 8000 }).catch(() => {});
      return { shown, ...(await p.evaluate(() => window.__proto.lastTransition)) || {} }; };
    const tk = await trans('key'), tt = await trans('tap'), tn = await trans('none');
    check(tk.shown && tk.skipped && tk.ms < 800 && tt.shown && tt.skipped && tt.ms < 800 && tn.shown && !tn.skipped && tn.ms >= 900 && tn.ms < 2000,
      `map → battle transition: shown; Space skips it (${tk.ms} ms), a tap skips it (${tt.ms} ms), untouched it lasts about 1 s (${tn.ms} ms)`);

    // ---- regression (battle.ts chooseTarget): a target prompt resolved by a tap left its Enter listener behind, so Enter on the next
    // prompt ran the stale one first, which cleared the new prompt's target buttons (the battle then waited with no targets) ----
    await p.evaluate(() => { window.__proto.fakeBattle = null; });
    const has = sel => p.evaluate(sel => !!document.querySelector(sel), sel);
    const until = async (fn, ms = 20000) => { for (let t = 0; t < ms; t += 100) { if (await fn()) return true; await p.waitForTimeout(100); } return false; };
    const answer = async (ok = true) => { const q = await p.evaluate(() => window.__proto.q); if (await has('[data-testid="tile"]:not([disabled])')) await tapAsm(p, ok).catch(() => {});
      else if (q) await p.locator(ok ? `[data-testid="opt"][data-o="${q.answerId}"]` : `[data-testid="opt"]:not([data-o="${q.answerId}"])`).first().click().catch(() => {}); };
    const live = () => p.evaluate(() => (window.__proto.foes?.() || []).filter(f => f.alive).length);
    const toMenu = async (ok = true) => until(async () => { if (await has('[data-testid="action-menu"]')) return true; if (await has('[data-testid="victory"]') || await has('[data-testid="graph"]')) return true;
      if (await has('[data-testid="continue"]:not([disabled])')) await tid('continue').click().catch(() => {}); else if (await has('[data-testid="opt"]:not([disabled]),[data-testid="tile"]:not([disabled])')) await answer(ok); return false; });
    let leak = null;
    for (let tries = 0; tries < 12 && !leak; tries++) {
      await p.evaluate(() => { window.__fd = false; window.__proto.world.fight().then(() => { window.__fd = true; }); });
      await until(async () => !(await has('[data-testid="graph"]')) || await p.evaluate(() => window.__fd), 8000);   // the battle opens after the ~1 s transition
      await toMenu();
      if (await has('[data-testid="action-menu"]') && await live() >= 2) {
        await tid('act-attack').click(); const tapped = await tid('target-1').click({ timeout: 5000 }).then(() => true, () => false);   // prompt 1: resolved by a tap (no prompt: try another battle)
        if (tapped) await toMenu(false);   // a wrong answer: no damage, so both foes are still up for prompt 2
        if (tapped && await has('[data-testid="action-menu"]') && await live() >= 2) {
          await tid('act-attack').click(); await tid('target-0').waitFor({ timeout: 5000 });
          await p.keyboard.press('Enter');   // prompt 2: Enter picks the marked target
          const asked = await until(() => has('[data-testid="opt"],[data-testid="tile"]'), 4000);
          leak = { asked, tgts: await p.locator('#tgts .tgt').count(), menu: await has('[data-testid="target-menu"]') };
        }
      }
      // leave the battle: ◀ Back out of a target prompt, then flee (or close the victory screen)
      if (await has('[data-testid="act-back"]')) await tid('act-back').click().catch(() => {});
      await toMenu(); if (await has('[data-testid="action-menu"]')) await tid('act-flee').click().catch(() => {});
      await until(async () => { if (await has('[data-testid="victory-ok"]')) await tid('victory-ok').click().catch(() => {}); return p.evaluate(() => window.__fd); });
      await settle(); await p.evaluate(() => { window.__proto.battles = []; });
    }
    check(!!leak && leak.asked, `battle: after a target prompt answered by a tap, Enter on the next prompt still picks a target (${JSON.stringify(leak)})`);
    check(!errs.length, `travel: no page errors (${errs.slice(0, 3).join(' | ')})`);
  } catch (e) { check(false, 'travel tests crashed: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' ')); }
  await ctx.close();
}
