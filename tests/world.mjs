// v3.9.1 graph world tests (?world=graph): node tests/world.mjs [baseUrl]   (also run from tests/play.mjs)
// Engine unit checks import src/world/engine.ts directly (node 22 strips the types). Browser checks drive the built game.
// Saves are validated against docs/data/world/schemas/progress.schema.json with tools/world/validate_save.py (needs jsonschema:
// WORLD_PY=/path/to/python, default /workspace/desy/.venv/bin/python if present, else python3).
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PY = process.env.WORLD_PY || (existsSync('/workspace/desy/.venv/bin/python') ? '/workspace/desy/.venv/bin/python' : 'python3');
const KEY4 = 'chinese-rpg-proto-v4', KEY3 = 'chinese-rpg-proto-v3';

function validateSave(obj, label) {
  const f = path.join(mkdtempSync(path.join(tmpdir(), 'save-')), 'save.json'); writeFileSync(f, JSON.stringify(obj));
  try { execFileSync(PY, [path.join(ROOT, 'tools/world/validate_save.py'), f], { encoding: 'utf8' }); return { ok: true, errors: [] }; }
  catch (e) { const out = String(e.stdout || e.message); try { return { ok: false, errors: JSON.parse(out.trim().split('\n').pop()).errors }; } catch { return { ok: false, errors: [out.slice(0, 300)] }; } }
}

export async function worldUnitTests({ check, log = console.log }) {
  const E = await import(path.join(ROOT, 'src/world/engine.ts'));
  const J = f => JSON.parse(readFileSync(path.join(ROOT, f.startsWith('graphs/') ? 'public/world' : 'src/data/world', f), 'utf8'));
  const PG = await import(path.join(ROOT, 'src/world/progress.ts'));
  const SCH = J('progress.schema.json'), COM = J('common.schema.json');
  const idx = J('index.json'); const rules = idx.rules; const quests = J('quests.json').quests;
  const g1 = J('graphs/realm_1.json'); E.registerGraph(g1);
  // bitsets
  let b = ''; for (const i of [0, 3, 9, 17]) b = E.bitSet(b, i);
  check(/^[A-Za-z0-9+/]*={0,2}$/.test(b) && JSON.stringify(E.bitList(b)) === '[0,3,9,17]' && E.bitGet(b, 9) && !E.bitGet(b, 8), `world: base64 bitsets by idx (${b})`);
  // deterministic encounters: same seed + same crossing = same rolls; another seed differs
  const e2 = g1.edges.find(e => e.kind === 'path' && e.danger >= 1 && !E.edgeSafe(g1, e, E.newProgress(1, idx.start), rules));
  const rollsFor = seed => { const P = E.newProgress(seed, idx.start); return Array.from({ length: 12 }, (_, s) => E.rollStep(g1, e2, s % (e2.steps || 1), P, rules)); };
  const a1 = rollsFor(12345), a2 = rollsFor(12345);
  const raw = seed => Array.from({ length: 6 }, (_, k) => E.roll(`${seed}|realm_1|${e2.id}|0|${k}`).toFixed(4)).join(',');
  check(JSON.stringify(a1) === JSON.stringify(a2) && raw(12345) === raw(12345) && raw(12345) !== raw(999), `world: same seed → same encounter rolls on ${e2.id} (${a1.map(Number).join('')}; raw ${raw(12345)} vs seed 999 ${raw(999)})`);
  const P0 = E.newProgress(1, idx.start); P0.zone.pity = rules.pityRolls;
  check(E.stepRate(g1, e2, P0, rules).p === 1, 'world: pity → the next fresh step always fights');
  const Pw = E.newProgress(1, idx.start); E.finishEdge(Pw, g1, e2);
  check(Math.abs(E.stepRate(g1, e2, Pw, rules).p - rules.encounterRate[String(e2.danger)] * rules.clearedStepMult) < 1e-9, 'world: walked edge rolls × clearedStepMult');
  const safeE = g1.edges.find(e => e.from === 'village' || e.to === 'village');
  check(E.edgeSafe(g1, safeE, P0, rules), `world: edges next to a town are safe (${safeE.id})`);
  // weighted events: same seed + node + visit -> same pick; the pick key is saveSeed|graph|node|visit (world-graph §4)
  const pickEv = g1.events.find(e => e.pick && e.node !== 'village');
  if (pickEv) { const picks = seed => Array.from({ length: 8 }, (_, v) => { const P = E.newProgress(seed, idx.start); const n = g1.nodes.find(n => n.id === pickEv.node); E.gp(P, 'realm_1').visits[n.idx] = v; return E.pickEvent(g1, pickEv.node, 'enter', { P, quests: {} }, false)?.outcome; }).join(',');
    check(picks(5) === picks(5) && picks(5).split(',').length === 8, `events: weighted pick on ${pickEv.node} is seeded per save + node + visit (${picks(5)})`); }
  const outs = new Set(); for (const f of idx.graphs.map(g => g.id)) for (const ev of J(`graphs/${f}.json`).events || []) { if (ev.outcome) outs.add(ev.outcome); for (const o of ev.pick || []) outs.add(o.outcome); }
  check(['nothing', 'story', 'item', 'treasure', 'miniboss', 'quest_offer'].every(o => outs.has(o)), `events: outcomes seen in the data (${[...outs].join(', ')}); portal = a node kind + edge`);
  // world map: realm t+1 opens when realm t's realm boss falls
  const Pr = E.newProgress(1, idx.start);
  check(E.realmOpen(1, Pr, idx.zones) && !E.realmOpen(2, Pr, idx.zones), 'world map: realm 1 open, realm 2 locked at the start');
  Pr.zonesDefeated.push('warren'); check(E.realmOpen(2, Pr, idx.zones) && !E.realmOpen(3, Pr, idx.zones), 'world map: the realm 1 realm boss (warren) opens realm 2 only');
  // fog
  const Pf = E.newProgress(7, idx.start); E.markVisited(Pf, g1, 'village');
  const x = { P: Pf, quests: {} }; const fog = E.fog(g1, Pf, x, rules.fog.landmarkKinds);
  const nb = E.edgesAt(g1, 'village').map(e => E.otherEnd(e, 'village')).filter(o => typeof o === 'string');
  check(fog.village === 'visited' && nb.every(n => fog[n] === 'seen') && g1.nodes.filter(n => n.kind === 'boss').every(n => fog[n.id] === 'landmark')
    && Object.values(fog).includes('hidden'), `world: fog = visited + '?' neighbours (${nb.join(',')}) + landmarks; the rest hidden`);
  // feathers
  check(E.addFeathers(2, 1, 3) === 1 && E.addFeathers(3, 1, 3) === 0 && E.addFeathers(1, 5, 3) === 2, 'world: Return Feather carry cap 3');
  Pf.visitedTowns.push({ graph: 'realm_2', node: 'entry_town' }); Pf.lastInn = { graph: 'realm_1', node: 'm_inn' }; Pf.pos.node = 'm_fork';
  const dests = E.featherDestinations(Pf, r => r.node);
  check(dests[0].kind === 'inn' && dests[0].ref.node === 'm_inn' && dests.some(d => d.ref.node === 'village') && dests.some(d => d.ref.graph === 'realm_2'), `world: Feather destinations = last inn + visited towns/villages (${dests.map(d => d.ref.node).join(', ')})`);
  check(rules.returnFeather.priceG === 2 && rules.returnFeather.start === 2 && rules.returnFeather.carry === 3 && JSON.stringify(rules.realmBossFeather.realms) === '[3,6,8]', 'world: v3.9.1 Feather rules (2×G, start 2, carry 3, free on realm bosses 3/6/8)');
  // quests: q1_hoe accept → reach the well (the hoe lies there too) → ready → turn in
  const q = quests.find(q => q.id === 'q1_hoe'); const Pq = E.newProgress(3, idx.start); const xq = { P: Pq, quests: {}, inv: {} };
  check(E.questStatus(q, xq) === 'available', 'quest: q1_hoe available');
  E.accept(q, xq); check(xq.quests.q1_hoe.s === 'active' && E.currentStep(q, xq.quests.q1_hoe).objective.type === 'reach', 'quest: accept → active, first objective = reach the well');
  E.questEvent(quests, xq, { type: 'arrive', graph: 'realm_1', node: 'm_well' });
  check(xq.quests.q1_hoe.s === 'ready', `quest: reaching the well also picks up the hoe there → ready for the giver (${xq.quests.q1_hoe.s})`);
  E.turnIn(xq.quests.q1_hoe); check(xq.quests.q1_hoe.s === 'completed' && xq.quests.q1_hoe.done > 0, 'quest: turn in → completed');
  const auto = quests.find(q => q.turnIn === 'auto' || q.returnToGiver === false);
  check(!!auto && E.autoTurnIn(auto), `quest: auto quests skip ready (${auto?.id})`);
  const qc = quests.find(q => q.id === 'q1_carrot'); check(E.questStatus(qc, xq) === 'locked', 'quest: requires bossDefeated clover_hills → locked');
  // quest positions resolved at build time
  const unresolved = quests.filter(q => !q.giverAt).map(q => q.id);
  const cb = quests.find(q => q.id === 'q8_caged_beasts');
  check(!unresolved.length && cb.giverAt.graph === 'realm_8' && cb.objectives.find(s => s.objective.type === 'kill').at.node === 'deadend_3', `quest: every giver position resolves (q8_caged_beasts giver ${cb.giverAt.graph}/${cb.giverAt.node}, fight at beast_pens_1/deadend_3)`);
  const bp = J('graphs/beast_pens_1.json'); check(bp.nodes.find(n => n.id === 'miniboss_1').kind === 'inn', 'quest: beast_pens_1/miniboss_1 is a campfire inn now');
  const Pc = E.newProgress(4, idx.start); const xc = { P: Pc, quests: {} };
  check(!E.questFightAt(quests, xc, 'beast_pens_1', 'deadend_3'), 'quest-gated fight: none while q8_caged_beasts is not active');
  E.accept(cb, xc); E.questEvent(quests, xc, { type: 'arrive', graph: 'realm_8', node: 'portal_2' });
  const qf = E.questFightAt(quests, xc, 'beast_pens_1', 'deadend_3');
  check(qf?.quest.id === 'q8_caged_beasts' && qf.enemies.includes('ogre_gladiator'), 'quest-gated fight: q8_caged_beasts active at the kill step → fight on beast_pens_1/deadend_3');
  E.questEvent(quests, xc, { type: 'fightWon', graph: 'beast_pens_1', node: 'deadend_3' });
  check(E.currentStep(cb, xc.quests.q8_caged_beasts).objective.type === 'reach', 'quest-gated fight: winning it advances the quest');
  // new leaf villages load generically
  for (const [gid, nid] of [['realm_3', 'village_1x'], ['realm_6', 'village_2x'], ['realm_9', 'village_3x']]) {
    const g = J(`graphs/${gid}.json`); check(!!g.nodes.find(n => n.id === nid && n.kind === 'village'), `world: new leaf village ${gid}/${nid}`);
  }
  // runtime validator (src/world/progress.ts) agrees with the JSON Schema; old saves migrate
  const fresh = E.newProgress(42, idx.start, idx.dataVersion, 2, 'meadow');
  check(PG.validateProgress(fresh, SCH, COM).length === 0, 'save schema (runtime): a new progress validates');
  const old = { schema: 'progress/0.2', seed: 9, pos: { graph: 'realm_1', node: 'm_fork', edge: 'e2', step: 1 }, lastInn: { graph: 'realm_1', node: 'village' },
    graphs: { realm_1: { visited: 'Aw==', cleared: 'AQ==', junk: 1 } }, bosses: ['meadow'], flags: ['met_xiaolong', 'met_xiaolong'], feathers: 5, oldField: true };
  const errs = PG.validateProgress(old, SCH, COM);
  const mig = PG.migrateProgress(old, idx.start, 3); const v1 = PG.validateProgress(mig, SCH, COM); const v1py = validateSave(mig, 'migrated');
  check(errs.length >= 3 && v1.length === 0 && v1py.ok && mig.graphs.realm_1.visited === 'Aw==' && mig.graphs.realm_1.walked === 'AQ==' && mig.zonesDefeated[0] === 'meadow' && mig.feathers === 3 && mig.flags.length === 1 && mig.pos.edge === null,
    `save migration: a progress/0.2 save (${errs.length} schema errors) migrates to a valid progress/0.3, keeping bitsets, bosses and flags` + (v1.length ? ': ' + v1.join('; ') : ''));
  // a fresh progress object is schema-valid
  const v0 = validateSave(E.newProgress(42, idx.start, idx.dataVersion, 2, 'meadow'), 'new');
  check(v0.ok, 'save schema: a new progress/0.3 object validates' + (v0.ok ? '' : ': ' + v0.errors.join('; ')));
  const bad = validateSave({ ...E.newProgress(42, idx.start), feathers: 4, extra: 1 }, 'bad');
  check(!bad.ok, 'save schema: the validator rejects feathers 4 / unknown keys');
}

export async function worldTests({ browser, BASE, check, log = console.log, shots = '' }) {
  const B = BASE + (BASE.includes('?') ? '&' : '?') + 'world=graph';
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const tid = id => p.locator(`[data-testid="${id}"]`);
  const sv = () => p.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY4);
  const edit = fn => p.evaluate(([k, src]) => { const s = JSON.parse(localStorage.getItem(k)); (0, eval)(src)(s); localStorage.setItem(k, JSON.stringify(s)); }, [KEY4, fn.toString()]);
  const shot = async name => { if (!shots) return; await p.waitForTimeout(400); await p.screenshot({ path: shots + name + '.png' }); log('saved', shots + name + '.png'); };
  const saves = [];
  /** Run an async window.__proto.world call that may play scenes or dialogues; skip / OK them until it resolves. */
  const bgCall = async (src, max = 40) => { await p.evaluate(src => { window.__bgDone = false; (0, eval)(src)().finally(() => { window.__bgDone = true; }); }, src);
    for (let i = 0; i < max; i++) { if (await p.evaluate(() => window.__bgDone)) return true; await p.waitForTimeout(200);
      if (await tid('scene').count()) await tid('scene-skip').click().catch(() => {}); else if (await tid('dialog').count()) await tid('dialog-btn-0').click().catch(() => {}); }
    return false; };
  const keep = async label => { saves.push([label, await sv()]); };
  const scene = () => p.evaluate(() => { const s = document.querySelector('[data-testid=scene]'); if (!s) return null;
    const pd = side => { const e = s.querySelector(`[data-side=${side}]`); return e && e.style.display !== 'none' ? { char: e.dataset.char, expr: e.dataset.expr, dim: e.classList.contains('dim'), lit: e.classList.contains('lit'), flip: e.classList.contains('flip'), img: e.querySelector('img')?.getAttribute('src') } : null; };
    return { id: s.dataset.scene, line: s.dataset.line, main: s.querySelector('.sc-main').innerText, gloss: s.querySelector('.sc-gloss').innerText, name: s.querySelector('.sc-name:not(.hidden)')?.innerText || '', L: pd('L'), R: pd('R') }; });
  const skipScenes = async (max = 8) => { for (let i = 0; i < max; i++) { await p.waitForTimeout(250); if (!(await tid('scene').count())) { await p.waitForTimeout(400); if (!(await tid('scene').count())) return; } await tid('scene-skip').click().catch(() => {}); } };
  const state = () => p.evaluate(() => { const has = s => !!document.querySelector(`[data-testid="${s}"]`);
    if (has('victory')) return 'victory'; if (has('scene')) return 'scene'; if (has('dialog')) return 'dialog'; if (has('graph') || has('town') || has('inn')) return 'left';
    const c = document.querySelector('[data-testid="continue"]'); if (c && !c.disabled) return 'continue';
    if (has('action-menu')) return 'menu'; if (document.querySelector('[data-testid^="target-"]:not([data-testid="target-menu"])')) return 'target';
    if (document.querySelector('[data-testid="opt"]:not([disabled])')) return 'mc'; return 'wait'; });
  async function battle() {
    for (let i = 0, waits = 0; i < 3000; i++) {
      const st = await state();
      if (st === 'victory') { await tid('victory-ok').click(); return 'win'; }
      if (st === 'left' || st === 'scene' || st === 'dialog') return st;
      if (st === 'continue') await tid('continue').click({ timeout: 2000 }).catch(() => {});
      else if (st === 'menu') await tid('act-attack').click().catch(() => {});
      else if (st === 'target') await p.locator('[data-testid^="target-"]:not([data-testid="target-menu"])').first().click().catch(() => {});
      else if (st === 'mc') { const q = await p.evaluate(() => window.__proto.q); if (q) await p.locator(`[data-testid="opt"][data-o="${q.answerId}"]`).first().click().catch(() => {}); }
      if (st === 'wait') { if (++waits > 500) throw new Error('world: battle stalled'); } else waits = 0;
      await p.waitForTimeout(50);
    }
    throw new Error('world: battle did not finish');
  }

  // ---- first entry: consent, name, the realm 1 village tutorial (scene → dialogues → tutorial fight → dialogue) ----
  await p.goto(B + '&debug'); await tid('consent').waitFor();
  const m = (await tid('consent').innerText()).match(/(\d+) × (\d+)/); await tid('consent-speech').uncheck();
  await tid('consent-answer').fill(String(+m[1] * +m[2])); await tid('consent-ok').click();
  await tid('name-input').waitFor(); await tid('name-input').fill('Mia'); await tid('name-ok').click();
  await tid('scene').waitFor({ timeout: 15000 });
  let sc = await scene();
  check(sc.id === 'sc_r1_opening' && sc.line === 'l1' && sc.main.includes('Mia') && !sc.main.includes('{hero}'), `scene: the tutorial plays sc_r1_opening with {hero} → the player's name (“${sc.main}”)`);
  await p.waitForTimeout(1100); await p.keyboard.press('Enter'); await p.waitForTimeout(250);
  sc = await scene();
  check(sc.line === 'l2' && sc.name.includes('白奶奶') && sc.R?.char === 'granny_bai' && sc.R.flip && sc.R.lit && sc.L?.char === 'hero' && sc.L.dim && !sc.L.flip && /portraits\/granny_bai_happy\.webp$/.test(sc.R.img || ''),
    `scene: Enter advances; speaker lit + listener dimmed, right portrait mirrored, nameplate 白奶奶 (${JSON.stringify({ line: sc.line, name: sc.name, L: sc.L, R: sc.R })})`);
  await p.mouse.click(640, 600); await p.waitForTimeout(80); await p.mouse.click(640, 600); await p.waitForTimeout(250);   // tap: finish typing, then advance
  sc = await scene(); check(sc.line === 'l3' && sc.name === '' && sc.L?.dim && sc.R?.dim, `scene: tap advances; narrator line → no nameplate, everyone dimmed (${sc.line})`);
  await p.keyboard.press(' '); await p.waitForTimeout(80); await p.keyboard.press(' '); await p.waitForTimeout(300);
  sc = await scene(); check(sc.line === 'l4' && /小龙/.test(sc.name) && sc.main.includes('你好') && /hello/i.test(sc.gloss), `scene: Space advances; {C001} shows the Chinese word + English gloss (“${sc.main}” / “${sc.gloss}”)`);
  check(!/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/.test(sc.main + sc.gloss + sc.name), 'scene: no pinyin');
  await shot('2026-10-03-graph-dialogue-scene');
  for (let i = 0; i < 20 && !(await tid('scene-choice-0').count()); i++) { await p.keyboard.press('Enter'); await p.waitForTimeout(150); }
  check(await tid('scene-choice-0').count() === 1 && (await tid('scene-choice-0').innerText()).includes('你好'), 'scene: a choice line shows bilingual choice buttons');
  await shot('2026-10-03-graph-dialogue-choice');
  await tid('scene-choice-0').click(); await p.waitForTimeout(300);
  await tid('scene-skip').click(); await p.waitForTimeout(500);
  let s = await sv();
  check(s.scenesSeen?.includes('sc_r1_opening') && s.world.flags.includes('r1_said_hello') && s.world.flags.includes('met_xiaolong') && s.party?.includes('xiaolong'),
    `scene: skip ends it; seen scene, choice flag, onEnd flags + joinParty saved (${JSON.stringify({ seen: s.scenesSeen, flags: s.world.flags, party: s.party })})`);
  await skipScenes(4);   // meadow_intro, tutorial_first_battle
  await tid('battle').waitFor({ state: 'attached', timeout: 15000 });
  const foes = await p.evaluate(() => window.__proto.foes());
  check(foes.length === 1 && foes[0].id === 'rabbit', `tutorial fight: one horned rabbit, no fill (${foes.map(f => f.id)})`);
  const r = await battle(); check(r === 'win', 'tutorial fight won');
  await skipScenes(4);   // tutorial_first_battle_after
  await tid('town').waitFor({ timeout: 10000 });
  s = await sv(); await keep('after tutorial');
  check(s.world.eventsDone.includes('realm_1/village.1') && s.inv.feather === 2 && s.world.feathers === 2, `tutorial event done once; the player starts with 2 Feathers (${s.inv.feather})`);

  // ---- Feather shop: 2 × G, carry cap 3 ----
  await tid('go-shop').click(); await tid('shop').waitFor({ timeout: 5000 }).catch(() => {});
  const goldA = +(await tid('hud-gold').innerText()); const priceTxt = await tid('buy-feather').innerText();
  await edit(s => { s.gold = 500; }); await p.reload(); await tid('town').waitFor(); await tid('go-shop').click();
  const g0 = +(await tid('hud-gold').innerText()); await tid('buy-feather').click(); const g1 = +(await tid('hud-gold').innerText());
  check(g0 - g1 === 12, `Feather costs 2 × G = 12 in realm 1 (paid ${g0 - g1}; label “${priceTxt.replace(/\s+/g, ' ')}”, gold before ${goldA})`);
  check(!(await tid('buy-feather').isEnabled()) && (await sv()).inv.feather === 3, 'Feather carry cap 3: buying stops at 3');
  await tid('back').click(); await tid('town').waitFor();

  // ---- the graph with fog; move; fog persists over reload ----
  await p.evaluate(() => { window.__proto.noEncounters = true; });
  await tid('go-adventure').click(); await tid('graph').waitFor();
  const fogOf = () => p.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-testid^="gnode-"]')].map(e => [e.dataset.node, e.dataset.fog])));
  let f0 = await fogOf();
  check(f0.village === 'visited' && f0.m_fork === 'seen' && f0.m_crow === 'landmark' && !('m_well' in f0), `fog: village visited, m_fork '?', bosses as landmarks, far nodes hidden (${JSON.stringify(f0)})`);
  await shot('2026-10-03-graph-fog-start');
  await tid('gnode-m_fork').click(); await p.waitForFunction(() => document.querySelector('[data-testid=graph]')?.dataset.node === 'm_fork', null, { timeout: 15000 });
  await skipScenes(3);
  const f1 = await fogOf(); s = await sv(); await keep('after a move');
  check(f1.m_fork === 'visited' && Object.values(f1).filter(v => v === 'seen').length >= 1 && s.world.pos.node === 'm_fork' && s.world.hops >= 1, `move: walked to m_fork; new '?' neighbours revealed (${Object.entries(f1).filter(([, v]) => v === 'seen').map(([k]) => k)})`);
  await p.reload(); await tid('graph').waitFor({ timeout: 15000 }); await p.evaluate(() => { window.__proto.noEncounters = true; });
  const f2 = await fogOf(); check(JSON.stringify(f2) === JSON.stringify(f1), 'fog: persists over a reload (progress.graphs bitsets)');
  // walk on a bit for the fog screenshot
  const settle = async () => { for (let k = 0; k < 40; k++) { await p.waitForTimeout(250); const st = await state();
      if (st === 'scene') await tid('scene-skip').click().catch(() => {}); else if (st === 'dialog') await tid('dialog-btn-1').click().catch(() => {});
      else if (['menu', 'mc', 'continue', 'target', 'victory', 'wait'].includes(st) && await tid('battle').count()) await battle(); else if (st === 'left' && k > 2) return; } };
  for (const n of ['m_field', 'm_farm']) { if (await p.locator(`[data-testid="gnode-${n}"].next`).count()) { await tid('gnode-' + n).click(); await settle(); } }
  if (!(await tid('graph').count()) && await tid('town').count()) await tid('go-adventure').click();
  await tid('graph').waitFor({ timeout: 10000 }).catch(() => {});
  await shot('2026-10-03-graph-realm-fog');

  // ---- Feather use on the map: picker → fly → consumed ----
  const fBefore = (await sv()).inv.feather;
  await tid('go-items').click(); await tid('items').waitFor(); await tid('act-feather').click(); await tid('feather-picker').waitFor();
  const opts = await p.evaluate(() => [...document.querySelectorAll('[data-testid^="feather-to-"]')].map(e => e.dataset.testid));
  check(opts.includes('feather-to-realm_1-village'), `Feather picker lists the last inn + visited towns/villages (${opts})`);
  await shot('2026-10-03-graph-feather-picker');
  await tid('feather-to-realm_1-village').click(); await tid('town').waitFor({ timeout: 10000 });
  s = await sv(); check(s.inv.feather === fBefore - 1 && s.world.pos.node === 'village', `Feather used: flew to the village, ${fBefore} → ${s.inv.feather}`);
  const cf = await p.evaluate(() => window.__proto.world.cloud());
  check(cf.kind === 'cloud' && cf.pushes.some(x => x.trigger === 'feather') && cf.triggers.some(x => x.trigger === 'nodeChange') ,
    `SaveStore: the Feather pushes right away; node changes are recorded as (20 s debounced) triggers (${[...new Set(cf.pushes.map(x => x.trigger))].join(', ')})`);
  await keep('after feather');

  // ---- free Feather on realm-boss clears in realms 3 / 6 / 8 only (no tip) ----
  await edit(s => { s.inv.feather = 2; }); await p.reload(); await tid('town').waitFor();
  await bgCall("() => window.__proto.world.clearBoss('realm_1', 'w_throne')"); let fz = (await sv()).inv.feather;
  check(fz === 2, `realm 1 boss: no free Feather (${fz})`);
  await bgCall("() => window.__proto.world.clearBoss('bazaar_cellars_1', 'boss_3')"); fz = (await sv()).inv.feather;
  check(fz === 3, `realm 3 boss clear gives 1 free Feather (2 → ${fz})`);
  await bgCall("() => window.__proto.world.clearBoss('moonlit_crypt_2', 'boss_6')"); fz = (await sv()).inv.feather;
  check(fz === 3, `realm 6 boss at the carry cap: still 3 (${fz})`);
  s = await sv(); check(s.world.zonesDefeated.includes('warren') && s.locs.meadow.bossDefeated && s.locs.forest.unlocked, 'realm 1 boss clear maps onto the classic meadow boss (towns / skills keep working)');
  const cl = await p.evaluate(() => window.__proto.world.cloud());
  check(cl.kind === 'cloud' && cl.pushes.some(x => x.trigger === 'bossDefeated'), `SaveStore: CloudSaveStore stub pushes when a boss falls (${[...new Set(cl.pushes.map(x => x.trigger))].join(', ')})`);
  await keep('after boss clears');

  // ---- quests: q1_hoe offer (scene) → accept → the well → turn in (scene) ----
  await edit(s => { s.world.zonesDefeated = []; s.storyQuests = {}; }); await p.reload(); await tid('town').waitFor();
  await p.evaluate(() => { window.__proto.noEncounters = true; window.__proto.sceneInstant = true; });
  await p.evaluate(() => { window.__proto.world.goto('realm_1', 'm_farm', true); });
  // m_farm's once-events (q1_hoe offer, then q1_bounty) may have fired on the earlier walk; Farmer Li offers q1_hoe again as its giver
  for (let i = 0; i < 40 && !(await tid('scene').count()); i++) { await p.waitForTimeout(250); if (await tid('dialog-btn-1').count()) await tid('dialog-btn-1').click().catch(() => {}); else if (await tid('dialog-btn-0').count()) await tid('dialog-btn-0').click().catch(() => {}); }
  await tid('scene').waitFor({ timeout: 5000 });
  sc = await scene(); check(sc.id === 'sc_q1_hoe_offer', `quest offer: Farmer Li's offer scene (${sc.id})`);
  for (let i = 0; i < 20 && !(await tid('scene-choice-0').count()); i++) { await p.keyboard.press('Enter'); await p.waitForTimeout(120); }
  await tid('scene-choice-0').click(); await skipScenes(6);
  for (let k = 0; k < 3 && await tid('dialog').count(); k++) await tid('dialog-btn-1').click();   // decline the second offer (q1_bounty) for now
  s = await sv(); check(s.storyQuests?.q1_hoe?.s === 'active' && s.world.flags.includes('accept_q1_hoe'), `quest accepted via the offer scene choice (${JSON.stringify(s.storyQuests?.q1_hoe)})`);
  check((await p.evaluate(() => window.__proto.world.cloud())).pushes.some(x => x.trigger === 'questGiven' && x.detail === 'q1_hoe'), 'SaveStore: accepting a quest pushes right away (§9.1 quest given)');
  await keep('quest active');
  await p.evaluate(() => { window.__proto.world.goto('realm_1', 'm_well', true); }); await p.waitForTimeout(800); await skipScenes(6);
  s = await sv(); check(s.storyQuests.q1_hoe.s === 'ready' && s.inv.farmers_hoe === 1, `quest progress: reached the well, got the hoe → ready (${s.storyQuests.q1_hoe.s})`);
  await tid('go-quests').click().catch(() => {}); await tid('questlog').waitFor({ timeout: 4000 }).catch(() => {});
  check(await p.locator('[data-testid="qlog-q1_hoe"][data-state="ready"]').count() === 1, 'quest log shows q1_hoe ready');
  await tid('back').click().catch(() => {});
  const goldQ = (await sv()).gold;
  await p.evaluate(() => { window.__proto.world.goto('realm_1', 'm_farm', true); }); await p.waitForTimeout(600);
  let sawThanks = false; for (let i = 0; i < 8; i++) { const c = await scene(); if (c?.id === 'sc_q1_hoe_thanks') sawThanks = true; if (c) { if (await tid('scene-choice-0').count()) await tid('scene-choice-0').click(); else await tid('scene-skip').click(); } await p.waitForTimeout(400);
    if (await tid('dialog').count()) await tid('dialog-btn-1').click(); }
  s = await sv(); const q1 = JSON.parse(readFileSync(path.join(ROOT, 'src/data/world/quests.json'), 'utf8')).quests.find(q => q.id === 'q1_hoe');
  check(sawThanks && s.storyQuests.q1_hoe.s === 'completed' && s.gold - goldQ >= q1.rewards.goldValue, `quest turn-in at the giver: thanks scene, completed, +${s.gold - goldQ} gold (reward ${q1.rewards.goldValue})`);
  await keep('quest completed');

  // ---- quest-gated fight: q8_caged_beasts on beast_pens_1/deadend_3 ----
  await edit(s => { s.level = 12; s.hp = 999; }); await p.reload(); await tid('graph').or(tid('town')).first().waitFor();
  await p.evaluate(() => { window.__proto.noEncounters = true; window.__proto.sceneInstant = true; });
  await p.evaluate(() => { window.__proto.world.goto('beast_pens_1', 'deadend_3', true); }); await p.waitForTimeout(1200);
  check(!(await tid('battle').count()), 'quest-gated fight: no fight on deadend_3 while the quest is not active');
  await p.evaluate(() => window.__proto.world.accept('q8_caged_beasts'));
  await p.evaluate(() => { window.__proto.world.goto('realm_8', 'portal_2', true); }); await p.waitForTimeout(800); await skipScenes(4);
  for (let k = 0; k < 3 && await tid('dialog').count(); k++) await tid('dialog-btn-1').click();
  await p.evaluate(() => { window.__proto.world.goto('beast_pens_1', 'deadend_3', true); });
  await tid('battle').waitFor({ state: 'attached', timeout: 10000 });
  check(true, 'quest-gated fight: q8_caged_beasts active → the fight starts on beast_pens_1/deadend_3');
  await battle(); await skipScenes(3);
  s = await sv(); check(s.storyQuests.q8_caged_beasts.step >= 2, `quest-gated fight won → the quest moves on (step ${s.storyQuests.q8_caged_beasts.step})`);
  await keep('quest-gated fight');

  // ---- dungeon level transition: realm_2 portal → great_hive_1, then stairs between two levels of one dungeon ----
  await p.evaluate(() => window.__proto.world.goto('realm_2', 'portal_1')); await tid('graph').waitFor();
  await tid('gexit-x_portal_1').click(); await p.waitForFunction(() => document.querySelector('[data-testid=graph]')?.dataset.graph === 'great_hive_1', null, { timeout: 10000 });
  await skipScenes(3);
  s = await sv(); check(s.world.pos.graph === 'great_hive_1' && s.world.pos.node === 'stairs_1', 'dungeon: the portal edge loads the next graph (great_hive_1)');
  check((await p.evaluate(() => window.__proto.world.cloud())).pushes.some(x => x.trigger === 'graphChange' && x.detail === 'great_hive_1'), 'SaveStore: a graph change pushes right away (§9.1)');
  const idxJ = JSON.parse(readFileSync(path.join(ROOT, 'src/data/world/index.json'), 'utf8'));
  const lv = idxJ.graphs.filter(g => g.kind === 'dungeon_level');
  const dung = [...new Set(lv.map(g => g.dungeon))];
  check(lv.length === 26 && dung.length === 12, `dungeons: ${lv.length} levels in ${dung.length} dungeons, loaded from the index (no hard-coded ids)`);
  const g1J = JSON.parse(readFileSync(path.join(ROOT, 'public/world/graphs/goblin_caves_1.json'), 'utf8'));
  const down = g1J.edges.find(e => e.kind === 'stairs' && typeof e.to === 'object' && e.to.graph !== g1J.id && lv.some(l => l.id === e.to.graph && l.level === 2));
  await p.evaluate(([n]) => window.__proto.world.goto('goblin_caves_1', n), [down.from]); await tid('graph').waitFor(); await skipScenes(3);
  await tid('gexit-' + down.id).click(); await p.waitForFunction(g => document.querySelector('[data-testid=graph]')?.dataset.graph === g, down.to.graph, { timeout: 10000 });
  await skipScenes(3);
  s = await sv(); check(s.world.pos.graph === down.to.graph && s.world.pos.node === down.to.node && (await tid('graph').getAttribute('data-kind')) === 'dungeon_level',
    `dungeon: stairs ${down.id} go down a level (goblin_caves_1/${down.from} → ${down.to.graph}/${down.to.node})`);
  await shot('2026-10-03-graph-dungeon-level');
  await keep('dungeon');
  // ---- scroll + zoom: realm 8 (91 nodes) opens zoomed in; a 200-node graph renders and zooms ----
  await p.evaluate(() => window.__proto.world.goto('realm_8', 'town_3')); await tid('graph').waitFor(); await skipScenes(3);
  if (!(await tid('graph').count())) await tid('go-adventure').click().catch(() => {});
  await tid('graph').waitFor();
  check((await tid('zoom-level').innerText()) === '×2.0' && +(await tid('graph').getAttribute('data-nodes')) === 91, 'map: a 91-node realm opens at ×2 centred on the hero');
  const big = { id: 'synthetic_200', kind: 'overworld', realm: 1, title: { zh: '大地图', en: 'Test 200' }, nodes: [], edges: [] };
  for (let i = 0; i < 200; i++) big.nodes.push({ id: 'n' + i, idx: i, kind: i % 37 === 0 ? 'inn' : 'waypoint', x: +(0.02 + 0.96 * (i % 20) / 19).toFixed(4), y: +(0.02 + 0.96 * Math.floor(i / 20) / 9).toFixed(4), zone: 'meadow' });
  for (let i = 0; i < 200; i++) { if (i % 20 < 19) big.edges.push({ id: 'h' + i, idx: big.edges.length, from: 'n' + i, to: 'n' + (i + 1), kind: 'path', danger: 1, steps: 1 }); if (i < 180) big.edges.push({ id: 'v' + i, idx: big.edges.length, from: 'n' + i, to: 'n' + (i + 20), kind: 'path', danger: 1, steps: 1 }); }
  const t200 = await p.evaluate(async g => { const w = window.__proto.world; w.W.graphs[g.id] = g; w.E.registerGraph(g); const t0 = performance.now(); await w.goto(g.id, 'n105'); return performance.now() - t0; }, big);
  await tid('graph').waitFor();
  const nVis = await p.locator('[data-testid^="gnode-"]').count();
  check(+(await tid('graph').getAttribute('data-nodes')) === 200 && (await tid('zoom-level').innerText()) === '×3.0' && nVis >= 5 && t200 < 1500, `map: a 200-node graph renders at ×3 (${nVis} nodes in view after fog, ${Math.round(t200)} ms)`);
  await tid('zoom-out').click(); await tid('zoom-out').click();
  const z2 = await tid('zoom-level').innerText();
  await p.mouse.move(640, 360); await p.mouse.wheel(0, -400); await p.waitForTimeout(150); const z3 = await tid('zoom-level').innerText();
  const vb0 = await tid('graph-svg').getAttribute('viewBox'); await p.mouse.move(640, 300); await p.mouse.down(); await p.mouse.move(500, 250, { steps: 5 }); await p.mouse.up(); const vb1 = await tid('graph-svg').getAttribute('viewBox');
  check(z2 === '×1.5' && parseFloat(z3.slice(1)) > 1.5 && vb0 !== vb1, `map: ± buttons, the wheel and dragging zoom and scroll (${z2} → wheel ${z3}; drag moved the view)`);
  await tid('zoom-home').click(); await tid('gnode-n106').click(); await p.waitForFunction(() => document.querySelector('[data-testid=graph]')?.dataset.node === 'n106', null, { timeout: 8000 }).catch(() => {});
  check((await tid('graph').getAttribute('data-node')) === 'n106', 'map: tapping an adjacent node on the 200-node graph moves there');
  await p.evaluate(() => { const P = window.__proto.world.P(); delete P.graphs.synthetic_200; });
  // ---- the world map: realm nodes in order, realm 2 opens after the realm 1 realm boss; realms 3–9 not in this build ----
  await p.evaluate(() => window.__proto.world.goto('world', 'realm_1')); await tid('graph').waitFor();
  check(await p.locator('[data-testid="gnode-realm_2"].next').count() === 0, 'world map: realm 2 is locked before the realm 1 realm boss');
  await edit(s => { if (!s.world.zonesDefeated.includes('warren')) s.world.zonesDefeated.push('warren'); }); await p.reload(); await tid('graph').waitFor({ timeout: 15000 });
  await shot('2026-10-03-graph-world-map');
  check(await p.locator('[data-testid="gnode-realm_2"].next').count() === 1 && await p.locator('[data-testid="gnode-realm_3"].next').count() === 0, 'world map: beating warren opens realm 2 (realm 3 still locked)');
  await tid('gnode-realm_2').click();
  for (let i = 0; i < 40 && !(await tid('town').count()); i++) { await p.waitForTimeout(250);   // first-visit scenes / dialogues / quest offers ("Later")
    if (await tid('scene').count()) await tid('scene-skip').click().catch(() => {}); else if (await tid('dialog-btn-1').count()) await tid('dialog-btn-1').click().catch(() => {}); else if (await tid('dialog-btn-0').count()) await tid('dialog-btn-0').click().catch(() => {}); }
  await tid('town').waitFor({ timeout: 5000 });
  s = await sv(); check(s.world.pos.graph === 'realm_2' && s.world.pos.node === 'entry_town', 'world map: tapping realm 2 goes to its entry town');
  await tid('go-adventure').click(); await tid('graph').waitFor();
  await tid('go-world').click(); await p.waitForFunction(() => document.querySelector('[data-testid=graph]')?.dataset.graph === 'world', null, { timeout: 8000 });
  check((await sv()).world.pos.node === 'realm_2', 'world map: a realm town has a 🌍 World map button back (realms 2–9 have no exit edge in the data)');
  // a realm that is not in this build
  await p.evaluate(() => window.__proto.world.goto('world', 'realm_3')); await tid('graph').waitFor();
  await tid('gexit-x_realm_3').click(); await tid('not-in-build').waitFor({ timeout: 5000 }); await tid('dialog-btn-0').click();
  check((await sv()).world.pos.graph === 'world', 'world map: realms 3–9 say “not in this build” (world.json inBuild: false)');
  await p.evaluate(() => window.__proto.world.goto('realm_1', 'village'));
  // ---- a damaged / older save is migrated on load and validates ----
  await edit(s => { s.world.schema = 'progress/0.2'; s.world.feathers = 7; s.world.junk = 1; s.world.graphs.realm_1.cleared = 'AQ=='; });
  await p.reload(); await tid('graph').or(tid('town')).first().waitFor({ timeout: 15000 });
  const mv = await p.evaluate(() => ({ errs: window.__proto.world.validate(), mig: window.__proto.migratedProgress || [] })); s = await sv();
  check(mv.errs.length === 0 && mv.mig.length >= 3 && s.world.schema === 'progress/0.3' && !('junk' in s.world) && s.world.feathers <= 3, `save migration on load: ${mv.mig.length} schema errors fixed, the save validates again`);
  await keep('migrated on load');

  // ---- every captured save validates against progress.schema.json ----
  for (const [label, sv0] of saves) { const v = validateSave(sv0, label); check(v.ok, `save schema: “${label}” validates (progress/0.3)` + (v.ok ? '' : ': ' + v.errors.slice(0, 3).join('; '))); }
  check(errs.length === 0, 'world: no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await ctx.close();

  // ---- v3 → v4 migration; classic untouched ----
  const c2 = await browser.newContext({ viewport: { width: 1280, height: 720 } }); const q = await c2.newPage();
  await q.goto(BASE + (BASE.includes('?') ? '&' : '?') + 'world=classic'); await q.locator('[data-testid="consent"]').waitFor();
  await q.evaluate(k => localStorage.setItem(k, JSON.stringify({ __seed: 1 })), 'x');
  const cm = (await q.locator('[data-testid="consent"]').innerText()).match(/(\d+) × (\d+)/); await q.locator('[data-testid="consent-speech"]').uncheck();
  await q.locator('[data-testid="consent-answer"]').fill(String(+cm[1] * +cm[2])); await q.locator('[data-testid="consent-ok"]').click(); await q.locator('[data-testid="town"]').waitFor();
  await q.evaluate(k => { const s = JSON.parse(localStorage.getItem(k)); s.gold = 77; s.inv.feather = 1; s.locs.meadow.bossDefeated = true; s.heroName = undefined; localStorage.setItem(k, JSON.stringify(s)); }, KEY3);
  const v3before = await q.evaluate(k => localStorage.getItem(k), KEY3);
  await q.goto(B); await q.locator('[data-testid="name-input"]').waitFor({ timeout: 15000 }); await q.locator('[data-testid="name-input"]').fill('Leo'); await q.locator('[data-testid="name-ok"]').click();
  await q.waitForTimeout(1500);
  const v4 = await q.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY4); const v3after = await q.evaluate(k => localStorage.getItem(k), KEY3);
  check(v4 && v4.gold === 77 && v4.inv.feather === 1 && v4.world?.schema === 'progress/0.3' && ['meadow', 'clover_hills', 'warren'].every(z => v4.world.zonesDefeated.includes(z)) && v3after === v3before,
    `migration: v3 copied into v4 on first graph entry (gold, feathers, realm 1 cleared); the v3 save is untouched`);
  const vm = validateSave(v4, 'migrated'); check(vm.ok, 'save schema: the migrated save validates' + (vm.ok ? '' : ': ' + vm.errors.join('; ')));
  await q.goto(BASE + (BASE.includes('?') ? '&' : '?') + 'world=classic'); await q.locator('[data-testid="town"]').waitFor({ timeout: 15000 });
  check(!(await q.locator('[data-testid="graph"]').count()) && (await q.evaluate(k => localStorage.getItem(k), KEY3)) === v3before, '?world=classic: back to the classic village on the v3 save');
  await c2.close();
}

// standalone: node tests/world.mjs [baseUrl]
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const { chromium } = await import('playwright-core');
  const BASE = (process.argv[2] || 'http://127.0.0.1:8795/');
  let fails = 0, n = 0; const check = (ok, msg) => { n++; if (!ok) fails++; console.log(ok ? '✅' : '❌', msg); };
  await worldUnitTests({ check });
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  try { await worldTests({ browser, BASE, check, shots: process.env.WORLD_SHOTS || '' }); }
  catch (e) { check(false, 'world tests crashed: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' ')); }
  await browser.close();
  console.log(`\n${n - fails}/${n} world checks passed`); process.exit(fails ? 1 : 0);
}
