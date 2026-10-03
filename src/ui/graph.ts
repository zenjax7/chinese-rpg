/** v3.9.1 graph world UI (?world=graph). Data: src/data/world/ + public/world/graphs/ (tools/world/build_world.py from Desy's docs/data). Progress lives in
 *  S.world (progress/0.3), story quests in S.storyQuests, seen scenes in S.scenesSeen, all in the v4 save. Classic mode never loads this. */
import { B, LOC, CONS, TOWNS, GEAR_LIST } from '../data';
import { S, save, heroStats, refreshSkills, gainGear, equipLine, worldPrice, addExp, cloudTrigger, store } from '../engine/state';
import { validateProgress, migrateProgress } from '../world/progress';
import PROGRESS_SCHEMA from '../data/world/progress.schema.json';
import COMMON_SCHEMA from '../data/world/common.schema.json';
import { runBattle, setCurrentLoc, BattleResult, BattleOpts } from '../engine/battle';
import { town, graphHooks, rewards, itemsScreen, applyDefeat, flushNotices } from './screens';
import { $, esc, render, on, hud, toast, dialog, zh, dlg, setTitle, ui } from './dom';
import { view } from '../phaser/view';
import { BG } from '../assets';
import { playMusic, playSfx } from '../audio/audio';
import * as E from '../world/engine';
import { playScene, Scene, SceneEnv } from '../world/scene';

// ---------------- data ----------------
export const W: { idx: E.WorldIndex | null; quests: E.Quest[]; graphs: Record<string, E.Graph>; scenes: Record<string, Scene | null>; zones: Record<string, E.Zone> } =
  { idx: null, quests: [], graphs: {}, scenes: {}, zones: {} };
// index (rules, zones, graph list, words) + quests are bundled from src/data/world/ (tools/build_data.py -> tools/world/build_world.py);
// scenes are lazy chunks; graphs are fetched one at a time from public/world/graphs/ (the loading unit, architecture §6.2).
import WORLD_INDEX from '../data/world/index.json';
import WORLD_QUESTS from '../data/world/quests.json';
const SCENES = import.meta.glob<Scene>('../data/world/scenes/*.json', { import: 'default' });
const J = async (u: string) => { const r = await fetch(u); if (!r.ok) throw new Error(`${u}: ${r.status}`); return r.json(); };
export async function loadWorld() {
  if (W.idx) return;
  W.idx = WORLD_INDEX as unknown as E.WorldIndex;
  W.quests = (WORLD_QUESTS as unknown as { quests: E.Quest[] }).quests;
  W.zones = Object.fromEntries(W.idx!.zones.map(z => [z.id, z]));
  worldPrice.featherG = W.idx!.rules.returnFeather?.priceG ?? 2;
}
export async function graph(id: string): Promise<E.Graph> {
  if (!W.graphs[id]) { const g = await J(`world/graphs/${id}.json`); W.graphs[id] = g; E.registerGraph(g); }
  return W.graphs[id];
}
async function scene(id: string): Promise<Scene | null> {
  if (!(id in W.scenes)) { const ld = SCENES[`../data/world/scenes/${id}.json`]; W.scenes[id] = ld ? await ld().catch(() => null) : null; }
  return W.scenes[id];
}
const R = () => W.idx!.rules;
const P = () => S.world!;
const ctx = (): E.Ctx => ({ P: P(), quests: S.storyQuests!, level: S.level, inv: S.inv });
const realmG = (realm: number) => TOWNS[Math.max(0, Math.min(TOWNS.length - 1, realm - 1))]?.G ?? 6;
const nodeTitle = (r: E.NodeRef) => { const g = W.graphs[r.graph]; const n = g && E.nodeOf(g, r.node); return n?.title ? `${n.title.zh} ${n.title.en}` : r.node; };

/** Create / migrate the graph-mode state (first entry: v3 save copied into v4 by state.ts). */
export async function ensureProgress() {
  const fr = R().returnFeather || { start: 2, carry: 3 };
  if (!S.world) {
    const seed = (crypto.getRandomValues(new Uint32Array(1))[0]) >>> 0;
    const migrated = !!(S as any).migratedFrom;
    S.inv.feather = migrated ? Math.min(fr.carry, S.inv.feather || 0) : fr.start;
    const g0 = await graph(W.idx!.start.graph); const z0 = E.nodeOf(g0, W.idx!.start.node)?.zone || W.idx!.zones[0].id;
    S.world = E.newProgress(seed, W.idx!.start, W.idx!.dataVersion, S.inv.feather, z0);
    // classic progress maps onto zones: the meadow realm boss (rabbitking) = realm 1 cleared, the forest boss = realm 2 cleared
    if (S.locs.meadow?.bossDefeated) S.world.zonesDefeated.push(...W.idx!.zones.filter(z => z.realm === 1).map(z => z.id));
    if (S.locs.forest?.bossDefeated) S.world.zonesDefeated.push(...W.idx!.zones.filter(z => z.realm === 2).map(z => z.id));
    delete (S as any).migratedFrom;
  } else {
    // every load: the saved progress must validate against progress.schema.json; older or damaged ones are migrated (src/world/progress.ts)
    const errs = validateProgress(S.world, PROGRESS_SCHEMA, COMMON_SCHEMA);
    if (errs.length) { console.warn('graph save: migrating progress (' + errs.slice(0, 3).join('; ') + ')'); S.world = migrateProgress(S.world, W.idx!.start, fr.carry) as E.Progress; proto().migratedProgress = errs; }
  }
  S.storyQuests ??= {}; S.scenesSeen ??= []; S.party ??= [];
  syncFeathers(); save();
}
function syncFeathers() { const c = R().returnFeather?.carry ?? 3; S.inv.feather = Math.min(c, S.inv.feather || 0); P().feathers = S.inv.feather; }
function saveW() { syncFeathers(); save(); }

// ---------------- debug / test hooks ----------------
const proto = () => ((window as any).__proto = (window as any).__proto || {});
Object.assign(proto(), { world: {
  P: () => S.world, quests: () => S.storyQuests, seen: () => S.scenesSeen, W, E,
  goto: async (g: string, n: string, arriveToo = false) => { await graph(g); P().pos = { graph: g, node: n, edge: null, step: 0 }; if (arriveToo) return arrive(n); E.markVisited(P(), W.graphs[g], n); saveW(); graphScreen(); },
  playScene: async (id: string) => { const s = await scene(id); if (s) await runScene(s); graphScreen(); },
  clearBoss: async (g: string, n: string) => { await graph(g); const gg = W.graphs[g]; const nn = E.nodeOf(gg, n)!; await bossCleared(gg, nn, W.zones[nn.boss!]); },
  accept: (id: string) => { const q = W.quests.find(x => x.id === id)!; E.accept(q, ctx()); saveW(); cloudTrigger('questGiven', q.id); },
  cloud: () => ({ kind: store.kind, triggers: (store as any).triggers || [], pushes: (store as any).pushes || [] }),
  validate: (p?: unknown) => validateProgress(p ?? S.world, PROGRESS_SCHEMA, COMMON_SCHEMA),
} });

// ---------------- scenes & dialogue ----------------
function names(id: string, g?: E.Graph): E.Txt | null {
  const n: any = g?.npcs?.[id]; const t: any = n?.name || (n?.zh || n?.en ? n : null) || W.idx!.speakers[id];
  if (!t) return { zh: '', en: id.replace(/_/g, ' ') };
  return { zh: t.zh || '', en: String(t.en || '').replace(/\s*\(.*\)\s*$/, '') };   // nameplate: "Xiaolong (Little Dragon, companion)" -> "Xiaolong"
}
function sceneEnv(g?: E.Graph): SceneEnv {
  return { hero: S.heroName || 'Hero', words: W.idx!.words, names: id => names(id, g),
    flag: f => P().flags.includes(f), setFlag: f => { if (!P().flags.includes(f)) P().flags.push(f); },
    clearFlag: f => { P().flags = P().flags.filter(x => x !== f); }, cond: c => E.evalCond(c, ctx()) };
}
async function runScene(sc: Scene, g?: E.Graph) {
  const r = await playScene(sc, sceneEnv(g), ui()!.parentElement || document.body);
  if (!S.scenesSeen!.includes(sc.id)) S.scenesSeen!.push(sc.id);
  for (const a of sc.onEnd || []) await doAction(a, g);
  saveW(); return r;
}
async function runDialogue(id: string, g: E.Graph) {
  const lines = g.dialogue?.[id]; if (!lines?.length) return;
  const sideOf = (sp: string) => sp === 'narrator' ? 'none' : sp === 'hero' ? 'L1' : sp === 'xiaolong' ? 'L2' : 'R1';
  const sc: Scene = { id: `${g.id}:${id}`, lines: lines.map((l, i) => ({ id: `d${i}`, speaker: l.speaker, side: sideOf(l.speaker), expr: 'neutral', en: l.en, zh: l.zh, tokens: l.tokens,
    portrait: g.npcs?.[l.speaker]?.portrait || g.npcs?.[l.speaker]?.base })) };
  await playScene(sc, sceneEnv(g), ui()!.parentElement || document.body);
}

// ---------------- battles ----------------
function zoneOf(g: E.Graph, node?: string, e?: E.GEdge): E.Zone | undefined {
  const zid = e ? E.edgeZone(g, e) : (node ? E.nodeOf(g, node)?.zone : undefined);
  return (zid && W.zones[zid]) || W.idx!.zones.find(z => z.realm === g.realm);
}
const battleLoc = (z?: E.Zone) => (z && LOC[z.location] ? z.location : (z?.realm ?? 1) >= 2 && LOC.forest ? 'forest' : 'meadow');
async function fight(g: E.Graph, z: E.Zone | undefined, o: { boss?: boolean; enemies?: string[]; canLose?: boolean; label?: string }): Promise<BattleResult['outcome']> {
  const loc = battleLoc(z); setCurrentLoc(loc);
  const opts: BattleOpts = { roster: z?.roster, enemies: o.enemies, boss: o.boss ? z?.boss : undefined, noElite: !!o.enemies };
  S.locs[loc].bossCheckpoint = false;
  const res = await runBattle(loc, o.boss ? 'boss' : 'patrol', 0, opts);
  if (res.outcome === 'win') {
    if (res.kills?.length) questUpdate(E.questEvent(W.quests, ctx(), { type: 'kill', enemies: res.kills, realm: g.realm }));
    saveW(); await rewards(res, o.label || '');
  } else if (res.outcome === 'defeat') {
    if (o.canLose === false) { const h = heroStats(); S.hp = h.maxHp; S.mp = h.maxMp; saveW(); await dialog('🐲 小龙 Xiaolong', `<p>“${zh('没关系')}! It's OK!” Xiaolong pulls you back up. Let's try that again later.</p>`, ['OK']); }
    else { await defeated(); }
  }
  return res.outcome;
}
async function defeated() {
  const { fee } = applyDefeat(); P().pos = { graph: P().lastInn.graph, node: P().lastInn.node, edge: null, step: 0 };
  await graph(P().lastInn.graph); saveW(); cloudTrigger('defeat'); hud();
  await dialog('😵 You fainted!', `<p data-testid="defeat-msg">🐼 “There, there. You were so brave!” Your friends carried you back to <b>${esc(nodeTitle(P().lastInn))}</b>. HP and MP are full.${fee ? ` The doctor's fee was ${fee} 🪙.` : ''}</p>`, ['OK']);
}

// ---------------- actions ----------------
async function doAction(a: E.Action, g?: E.Graph): Promise<'stop' | void> {
  const gg = g || W.graphs[P().pos.graph];
  if (a.scene) { const s = await scene(a.scene); if (s && !(s.once && S.scenesSeen!.includes(s.id))) await runScene(s, gg); }
  else if (a.dialogue) await runDialogue(a.dialogue, gg);
  else if (a.fight) {
    const f = a.fight; const z = zoneOf(gg, P().pos.node);
    const out = await fight(gg, z, { enemies: f.enemies, canLose: f.canLose, boss: f.kind === 'boss' });
    if (out === 'win' && a.quest) questUpdate(E.questEvent(W.quests, ctx(), { type: 'fightWon', graph: gg.id, node: P().pos.node }));
    if (out === 'win' && E.nodeOf(gg, P().pos.node)?.kind === 'miniboss') E.markSafeBack(P(), gg, P().pos.node, R());   // §4: the way back after a mini-boss stays safe
    if (out !== 'win' && f.canLose !== false) return 'stop';
  }
  else if (a.giveItem) giveItem(a.giveItem, a.qty || 1);
  else if (a.giveGold) { const n = Math.round((a.giveGold.G ?? a.giveGold) * realmG(gg.realm)); S.gold += n; playSfx('sfx_gold'); toast(`🪙 +${n} gold`); }
  else if (a.openChest) openChest(a.openChest, gg);
  else if (a.setFlag) { if (!P().flags.includes(a.setFlag)) P().flags.push(a.setFlag); }
  else if (a.joinParty) { if (!S.party!.includes(a.joinParty)) S.party!.push(a.joinParty); }
  else if (a.offerQuest || a.startQuest) await offerQuest(a.offerQuest || a.startQuest, gg, !!a.startQuest);
  else if (a.teleport) { await graph(a.teleport.graph); P().pos = { graph: a.teleport.graph, node: a.teleport.node, edge: null, step: 0 }; E.markVisited(P(), W.graphs[a.teleport.graph], a.teleport.node); }
  saveW();
}
function giveItem(id: string, n: number) {
  if (id === 'feather') { const add = E.addFeathers(S.inv.feather || 0, n, R().returnFeather?.carry ?? 3); S.inv.feather = (S.inv.feather || 0) + add; if (add) toast(`🪶 +${add} ${zh('回城羽毛')} Return Feather`); }
  else { S.inv[id] = (S.inv[id] || 0) + n; const c = CONS[id]; toast(`🎁 +${n} ${c ? `${zh(c.zh)} ${esc(c.en)}` : esc(id.replace(/_/g, ' '))}`); }
  questUpdate(E.questEvent(W.quests, ctx(), { type: 'collect', item: id, n }));
}
/** desy chest_contents (src/data/v3.json): normal = 40% 3G gold / 35% honey / 5% feather (3G if full) / 10% mana tea / 10% fine gear; fine & boss = 3G + honey + gear. */
function openChest(kind: string, g: E.Graph) {
  const G = realmG(g.realm); const r = E.roll(`${P().seed}|${g.id}|${P().pos.node}|chest`);
  const fine = () => { const pick = GEAR_LIST.filter(x => x.tier === Math.min(2, g.realm) && x.rarity === 'fine'); const it = pick[Math.floor(r * 997) % Math.max(1, pick.length)];
    if (it) { const res = gainGear(it.id); toast(res.equipped ? equipLine(it, res.from) : `🎁 ${zh(it.zh)} ${esc(it.en)}`); } else { S.gold += 3 * G; } };
  playSfx('sfx_gold');
  if (kind !== 'chest_normal') { S.gold += 3 * G; S.inv.honey = (S.inv.honey || 0) + 1; toast(`🧰 +${3 * G} 🪙 + ${zh('蜂蜜药水')} Honey Potion`); fine(); return; }
  if (r < 0.4) { S.gold += 3 * G; toast(`🧰 +${3 * G} 🪙`); }
  else if (r < 0.75) giveItem('honey', 1);
  else if (r < 0.8) { if ((S.inv.feather || 0) >= (R().returnFeather?.carry ?? 3)) { S.gold += 3 * G; toast(`🧰 +${3 * G} 🪙`); } else giveItem('feather', 1); }
  else if (r < 0.9) giveItem('manatea', 1);
  else fine();
}

// ---------------- quests ----------------
const questById = (id: string) => W.quests.find(q => q.id === id);
function questUpdate(ch: { id: string; s: string; stepDone: boolean }[]) {
  for (const c of ch) { const q = questById(c.id)!;
    if (c.s === 'completed' || c.s === 'ready') cloudTrigger('questCompleted', `${q.id}:${c.s}`);
    if (c.s === 'completed') { giveRewards(q); toast(`✅ ${zh(q.title.zh)} ${esc(q.title.en)}: done!`); }
    else if (c.s === 'ready') toast(`❗ ${zh(q.title.zh)}: go back to ${esc(nodeTitle(q.turnInAt || q.giverAt!))}`);
    else if (c.stepDone) toast(`📜 ${zh(q.title.zh)}: step done`);
  }
  if (ch.length) saveW();
}
function giveRewards(q: E.Quest) {
  const r = q.rewards; S.gold += r.goldValue || 0; let msg = `+${r.goldValue || 0} 🪙`;
  if (r.expValue) { addExp(r.expValue); refreshSkills(S); msg += ` · +${r.expValue} EXP`; }
  for (const [k, n] of Object.entries(r.items || {})) if (CONS[k]) { if (k === 'feather') giveItem(k, n); else S.inv[k] = (S.inv[k] || 0) + n; msg += ` · ${CONS[k].emoji}×${n}`; }
  for (const f of r.flags || []) if (!P().flags.includes(f)) P().flags.push(f);
  playSfx('sfx_gold'); toast(`🎁 ${msg}`);
}
const offeredNow = new Set<string>();
async function offerQuest(id: string, g: E.Graph, force = false) {
  const q = questById(id); if (!q) return; offeredNow.add(id);
  const st = E.questStatus(q, ctx()); if (st !== 'available') return;
  const sc = q.scenes?.offer ? await scene(q.scenes.offer) : null; let yes: boolean;
  if (sc) { const flag = `accept_${q.id}`; await runScene(sc, g); yes = force || P().flags.includes(flag) || !sc.lines.some(l => l.choices?.some(c => c.setFlags?.includes(flag))); }
  else yes = force || (await dialog(`📜 ${zh(q.title.zh)} ${esc(q.title.en)}`, `<p data-testid="quest-offer" data-quest="${q.id}">${esc(q.summary || '')}</p>`, ['Accept ✔', 'Later'])) === 0;
  if (!yes) return;
  E.accept(q, ctx()); cloudTrigger('questGiven', q.id); playSfx('sfx_gold'); toast(`📜 Quest accepted: ${zh(q.title.zh)} ${esc(q.title.en)}`);
  questUpdate(E.questEvent(W.quests, ctx(), { type: 'arrive', graph: g.id, node: P().pos.node }));
  saveW();
}
async function questsAtNode(g: E.Graph, node: string) {
  questUpdate(E.questEvent(W.quests, ctx(), { type: 'arrive', graph: g.id, node }));
  for (const q of W.quests) {
    const st = S.storyQuests![q.id];
    if (st?.s === 'ready' && E.atNode(q.turnInAt || q.giverAt, g.id, node)) {
      const sc = q.scenes?.turnIn ? await scene(q.scenes.turnIn) : null;
      if (sc) await runScene(sc, g); else await dialog(`✅ ${zh(q.title.zh)} ${esc(q.title.en)}`, `<p data-testid="quest-turnin" data-quest="${q.id}">Thank you, ${esc(S.heroName || 'Hero')}!</p>`, ['OK']);
      E.turnIn(st); giveRewards(q); saveW(); cloudTrigger('questCompleted', `${q.id}:completed`);
    } else if (st?.s === 'active' && E.atNode(q.giverAt, g.id, node) && q.scenes?.progress) {
      const sc = await scene(q.scenes.progress); if (sc) await runScene(sc, g);
    } else if (!st && E.atNode(q.giverAt, g.id, node) && E.questStatus(q, ctx()) === 'available' && !offeredNow.has(q.id)) {
      await offerQuest(q.id, g);   // a giver offers again on every visit until accepted (a declined once-event offer is not lost)
    }
  }
}
export function questLog(back: () => void = graphScreen) {
  const rows = W.quests.filter(q => S.storyQuests![q.id]).map(q => { const st = S.storyQuests![q.id]; const step = E.currentStep(q, st);
    const what = st.s === 'completed' ? '✅ done' : st.s === 'ready' ? `❗ go back to ${esc(nodeTitle(q.turnInAt || q.giverAt!))}` : step ? `${esc(step.objective.type)}${step.objective.n ? ` ${st.obj[step.id] || 0}/${step.objective.n}` : ''}${step.at && 'node' in step.at ? ` · ${esc(nodeTitle(step.at as E.NodeRef))}` : ''}` : '';
    return `<div class="card" data-testid="qlog-${q.id}" data-state="${st.s}">${zh(q.title.zh)} <b>${esc(q.title.en)}</b><div class="muted">${what}</div></div>`; });
  render(dlg({ testid: 'questlog', cls: 'narrow', title: `📜 ${zh('任务')} Quests`, body: rows.join('') || '<p class="muted">No quests yet. Talk to people in towns and villages!</p>' }));
  on('#back', back);
}

// ---------------- Return Feather ----------------
function featherPicker(back: () => void) {
  const n = E.nodeOf(W.graphs[P().pos.graph], P().pos.node);
  if (n?.kind === 'boss' && !P().zonesDefeated.includes(n.boss || '')) { toast('🪶 Not in the boss room!'); return back(); }
  const d = E.featherDestinations(P(), nodeTitle);
  render(dlg({ testid: 'feather-picker', cls: 'narrow', title: `🪶 ${zh('回城羽毛')} Return Feather`, body: `<p class="muted">Where to? (${S.inv.feather || 0} left)</p>
    ${d.map((x, i) => `<button class="secondary" data-d="${i}" data-testid="feather-to-${x.ref.graph}-${x.ref.node}" style="display:block;width:100%;margin:6px 0">${x.kind === 'inn' ? '🛏️' : '🏘️'} ${esc(x.label)}</button>`).join('') || '<p>No other place to fly to yet.</p>'}` }));
  on('[data-d]', async (_e, el) => { const t = d[+el.dataset.d!]; if ((S.inv.feather || 0) <= 0) return; S.inv.feather--; await graph(t.ref.graph);
    P().pos = { graph: t.ref.graph, node: t.ref.node, edge: null, step: 0 }; E.markVisited(P(), W.graphs[t.ref.graph], t.ref.node); saveW(); playSfx('sfx_gold');
    cloudTrigger('feather', `${t.ref.graph}/${t.ref.node}`); toast(`🪶 Whoosh! You fly to ${esc(t.label)}.`); openNode(); });
  on('#back', back);
}
function bag(back: () => void) { itemsScreen(back, 'graph', () => featherPicker(() => bag(back))); }

// ---------------- movement ----------------
let busy = false;
async function walk(e: E.GEdge) {
  if (busy) return; busy = true;
  try {
    const g = W.graphs[P().pos.graph]; const from = P().pos.node;
    if (typeof e.to === 'object') {   // stairs / portal / exit
      const tgt = e.to as E.NodeRef; const meta = W.idx!.graphs.find(x => x.id === tgt.graph);
      const wn = g.kind === 'world' ? E.nodeOf(g, e.from) as any : null;
      if (!meta || (wn && wn.inBuild === false && !allRealms())) { await dialog(`🚧 ${zh('还没开放')} Not in this build`, `<p data-testid="not-in-build">${esc(wn?.title?.en || tgt.graph)} is not in this build yet.</p>`, ['OK']); return; }
      if (!E.edgeOpen(e, ctx())) { toast('🔒 The way is closed.'); return; }
      await graph(tgt.graph); P().pos = { graph: tgt.graph, node: tgt.node, edge: null, step: 0 }; P().hops++; saveW(); cloudTrigger('graphChange', tgt.graph);
      return void await arrive(tgt.node);
    }
    if (!E.edgeOpen(e, ctx())) { toast('🔒 The way is closed.'); return; }
    const to = E.otherEnd(e, from) as string; const steps = e.steps || 1; const pr = E.gp(P(), g.id);
    const z = zoneOf(g, undefined, e); if (z && P().zone.id !== z.id) P().zone = { ...P().zone, id: z.id, freshBattles: 0, pity: 0 };
    for (let s = pr.edgeProgress[e.idx] || 0; s < steps; s++) {
      P().pos = { graph: g.id, node: from, edge: e.id, step: s }; pr.edgeProgress[e.idx] = s; saveW();
      const scr = e.scripted; const sk = `${g.id}/${e.id}#scripted`;
      let out: string | null = null;
      if (scr && (scr.step ?? 0) === s && !P().eventsDone.includes(sk)) { out = await fight(g, z, { enemies: scr.enemies }); if (out === 'win' && scr.once !== false) P().eventsDone.push(sk); }
      else if (!proto().noEncounters && E.rollStep(g, e, s, P(), R())) out = await fight(g, z, {});
      if (out === 'defeat') return graphScreen();
      if (out === 'flee') { P().pos = { graph: g.id, node: from, edge: null, step: 0 }; saveW(); toast('🏃 You ran back.'); return graphScreen(); }
    }
    E.finishEdge(P(), g, e); P().pos = { graph: g.id, node: to, edge: null, step: 0 }; saveW();
    await arrive(to);
  } finally { busy = false; }
}
/** Arrival: boss fight, one event, quest hooks, then town / inn / map. */
export async function arrive(node: string) {
  offeredNow.clear();
  const g = W.graphs[P().pos.graph]; const n = E.nodeOf(g, node)!;
  const first = !E.bitGet(E.gp(P(), g.id).visited, n.idx); E.markVisited(P(), g, node); saveW(); cloudTrigger('nodeChange', `${g.id}/${node}`);
  graphScreen();
  if (n.kind === 'boss' && n.boss && !P().zonesDefeated.includes(n.boss)) {
    const f = E.pickEvent(g, node, 'enter', ctx(), first); if (f) { E.markFired(P(), g, f); for (const a of f.actions.filter(a => a.dialogue || a.scene)) await doAction(a, g); }
    const z = W.zones[n.boss]; const out = await fight(g, z, { boss: true, label: `<p>👑 ${zh(z?.title.zh || '')} ${esc(z?.title.en || '')} is clear!</p>` });
    if (out !== 'win') { if (out === 'flee') { const back = E.edgesAt(g, node).map(e => E.otherEnd(e, node)).find(o => typeof o === 'string' && E.bitGet(E.gp(P(), g.id).visited, E.nodeOf(g, o as string)!.idx)); if (back) P().pos.node = back as string; saveW(); } return graphScreen(); }
    await bossCleared(g, n, z); return openNode();
  }
  const f = E.pickEvent(g, node, 'enter', ctx(), first);
  let handledFight = false;
  if (f) { E.markFired(P(), g, f, f.ev.pick?.[+f.key.split('#')[1]]?.once); saveW();
    for (const a of f.actions) { if (a.fight) handledFight = true; if (await doAction(a, g) === 'stop') return graphScreen(); } }
  if (!handledFight) { const qf = E.questFightAt(W.quests, ctx(), g.id, node);
    if (qf) { const out = await fight(g, zoneOf(g, node), { enemies: qf.enemies }); if (out === 'win') questUpdate(E.questEvent(W.quests, ctx(), { type: 'fightWon', graph: g.id, node })); else return graphScreen(); } }
  await questsAtNode(g, node);
  saveW(); openNode();
}
async function bossCleared(g: E.Graph, n: E.GNode, z?: E.Zone) {
  const P_ = P(); if (!P_.zonesDefeated.includes(n.boss!)) P_.zonesDefeated.push(n.boss!);
  cloudTrigger('bossDefeated', n.boss);
  E.markSafeBack(P_, g, n.id, R());
  // the classic towns, skills and quests read S.locs: a realm boss maps onto that realm's classic location
  if (z?.bossKind === 'realmboss') { const loc = z.realm === 1 ? 'meadow' : z.realm === 2 ? 'forest' : null;
    if (loc && S.locs[loc]) { S.locs[loc].bossDefeated = true; S.locs[loc].pathCleared = LOC[loc].pathFights; const nx = loc === 'meadow' ? 'forest' : null; if (nx && S.locs[nx]) S.locs[nx].unlocked = true; refreshSkills(S); } }
  const f = E.pickEvent(g, n.id, 'clear', ctx(), false);
  const givesFeather = (g.events || []).some(e => e.node === n.id && e.on === 'clear' && (e.do || []).some(a => a.giveItem === 'feather'));
  if (f) { E.markFired(P_, g, f); for (const a of f.actions) await doAction(a, g); }
  const rb = R().realmBossFeather; if (rb && !givesFeather && z?.bossKind === 'realmboss' && rb.realms.includes(g.realm)) giveItem('feather', rb.qty || 1);   // no tip, by design
  saveW(); flushNotices();
}
/** After arriving or loading: towns open the village screens, everything else shows the map. */
function openNode() {
  const g = W.graphs[P().pos.graph]; const n = E.nodeOf(g, P().pos.node)!;
  if (n.kind === 'town' || n.kind === 'village') return enterTown(g, n);
  graphScreen();
}
function enterTown(g: E.Graph, n: E.GNode) {
  graphHooks.title = `${n.kind === 'village' ? '🏡' : '🏘️'} ${zh(n.title?.zh || '')} ${esc(n.title?.en || '')}`;
  graphHooks.hide = n.kind === 'village' ? ['magic'] : [];   // world-graph §2: a village has inn + save + item shop (Feathers), no magic shop
  graphHooks.exit = () => graphScreen(); graphHooks.questLog = () => questLog(() => town()); graphHooks.bag = () => bag(() => town());
  graphHooks.onRest = () => { P().lastInn = { graph: g.id, node: n.id }; clearSafe(); saveW(); cloudTrigger('inn', `${g.id}/${n.id}`); };
  town();
}
function clearSafe() { if (R().safe?.afterBossClear?.endsOnInnRest) P().safeUntil = {}; }
function rest(g: E.Graph, n: E.GNode) {
  const price = B.economy.innPriceG * realmG(g.realm); const h = heroStats();
  render(dlg({ testid: 'inn', cls: 'narrow', title: `🛏️ ${zh(n.title?.zh || '客栈')} ${esc(n.title?.en || 'Inn')}`, body: `<p>❤️ HP ${S.hp}/${h.maxHp} · 🔷 MP ${S.mp}/${h.maxMp}</p><p class="muted">A night's rest restores all HP and MP. This inn becomes your Return Feather inn.</p>`,
    foot: `<button id="stay" data-testid="inn-stay" data-key="enter">${S.gold < price ? '😴 Rest for free' : `😴 Stay the night <span class="en">${price} 🪙</span>`}</button>` }));
  on('#stay', () => { if (S.gold >= price) { S.gold -= price; S.stats.paidInn++; } else S.stats.freeInn++;
    const hh = heroStats(); S.hp = hh.maxHp; S.mp = hh.maxMp; P().lastInn = { graph: g.id, node: n.id }; P().zone.approachArmed = true; clearSafe(); saveW(); cloudTrigger('inn', `${g.id}/${n.id}`); toast('💤 HP and MP restored!'); graphScreen(); });
  on('#back', () => graphScreen());
}

// ---------------- the map (SVG over the Phaser background) ----------------
const ICON: Record<string, string> = { town: '🏘️', village: '🏡', inn: '🛏️', boss: '👑', miniboss: '💀', chest: '🧰', story: '📖', npc: '🙂', portal: '🌀', stairs_up: '⬆️', stairs_down: '⬇️', fork: '•', waypoint: '•', shop: '🛒' };
const allRealms = () => /[?&]realms=all\b/.test(location.search) || !!proto().allRealms;
/** World map: realm nodes link through their portal edges; realm t+1 opens when realm t's realm boss falls (world-graph §2). */
const realmNodeOpen = (n: E.GNode, x: E.Ctx) => { const r = Number(String(n.id).match(/(\d+)$/)?.[1] || 1); return E.realmOpen(r, x.P, W.idx!.zones); };
/** The world-map node that leads into graph `gid` (any realm overworld; realms 2–9 have no exit edge in the data, so towns offer one). */
const worldNodeFor = async (gid: string) => { const w = await graph('world').catch(() => null); return w?.edges.find(e => typeof e.to === 'object' && (e.to as E.NodeRef).graph === gid)?.from || null; };
let zoom = 1, panX = 0, panY = 0, zoomGraph = '';
const MAXZ = 4, MW = 1160, MH = 410, OX = 60, OY = 130;   // the node area keeps nodes + labels clear of the HUD and the bottom bar (top 592)
const clampPan = () => { const mx = 640 - 640 / zoom, my = 360 - 360 / zoom; panX = Math.max(-mx, Math.min(mx, panX)); panY = Math.max(-my, Math.min(my, panY)); };
const vb = () => `${640 - 640 / zoom - panX} ${360 - 360 / zoom - panY} ${1280 / zoom} ${720 / zoom}`;
export function graphScreen() {
  const g = W.graphs[P().pos.graph]; if (!g) return;
  const here = P().pos.node; const hn = E.nodeOf(g, here)!;
  const px = (n: E.GNode) => OX + n.x * MW, py = (n: E.GNode) => OY + n.y * MH;
  if (zoomGraph !== g.id) {   // big graphs (up to ~200 nodes) open zoomed in on the hero; pinch / wheel / ± and drag to look around
    zoomGraph = g.id; zoom = g.nodes.length > 120 ? 3 : g.nodes.length > 60 ? 2 : 1; panX = 640 - px(hn); panY = 360 - py(hn); clampPan();
  }
  const isWorld = g.kind === 'world';
  const z = zoneOf(g, here); const loc = battleLoc(z); setCurrentLoc(loc);
  view.mode('map', parseInt(LOC[loc].bg), BG.map(LOC[loc])); playMusic('mus_village'); hud();
  const ttl = g.title || W.idx!.graphs.find(x => x.id === g.id)?.title;
  const lvl = g.kind === 'dungeon_level' && g.level && !(ttl?.zh || '').includes('层') ? ` · ${zh(`第${g.level}层`)} Level ${g.level}` : '';   // most titles already name the level
  setTitle(`${isWorld ? '🌍' : g.kind === 'dungeon_level' ? '🕳️' : '🗺️'} ${zh(ttl?.zh || '')} ${esc(ttl?.en || g.id)}${lvl}`);
  const x = ctx(); const fogS: Record<string, E.FogState> = isWorld ? Object.fromEntries(g.nodes.map(n => [n.id, 'visited' as E.FogState])) : E.fog(g, P(), x, R().fog?.landmarkKinds);
  const dense = g.nodes.length > 60; const rr = dense ? 17 : 22;
  const adj = new Map<string, E.GEdge>(); for (const e of E.edgesAt(g, here)) { const o = E.otherEnd(e, here); adj.set(typeof o === 'string' ? o : `@${e.id}`, e); }
  // on the world map every open realm node is one tap away (through its own portal edge)
  const worldPick = new Map<string, E.GEdge>(); if (isWorld) for (const n of g.nodes) { const e = g.edges.find(e2 => e2.from === n.id && typeof e2.to === 'object'); if (e && realmNodeOpen(n, x)) worldPick.set(n.id, e); }
  const pr = E.gp(P(), g.id);
  const lines = isWorld ? g.nodes.slice(1).map((n, k) => { const a = g.nodes[k]; return `<line x1="${px(a)}" y1="${py(a)}" x2="${px(n)}" y2="${py(n)}" class="ge${realmNodeOpen(n, x) ? ' walked' : ' closed'}"/>`; }).join('')
    : g.edges.filter(e => typeof e.to === 'string').map(e => { const a = E.nodeOf(g, e.from)!, b = E.nodeOf(g, e.to as string)!;
    if (fogS[a.id] === 'hidden' || fogS[b.id] === 'hidden' || (fogS[a.id] !== 'visited' && fogS[b.id] !== 'visited')) return '';
    const walked = E.bitGet(pr.walked, e.idx); const open = E.edgeOpen(e, x);
    return `<line x1="${px(a)}" y1="${py(a)}" x2="${px(b)}" y2="${py(b)}" class="ge${walked ? ' walked' : ''}${open ? '' : ' closed'}${e.patrol ? ' patrol' : ''}" data-edge="${e.id}"/>`; }).join('');
  const nodes = g.nodes.map(n => { const f = fogS[n.id]; if (f === 'hidden') return '';
    const isHere = n.id === here; const next = isWorld ? worldPick.has(n.id) && !isHere : adj.has(n.id) && E.edgeOpen(adj.get(n.id)!, x);
    const done = n.kind === 'boss' && P().zonesDefeated.includes(n.boss || '');
    const ic = f === 'seen' ? '?' : done ? '✔' : isWorld ? (worldPick.has(n.id) ? '🌀' : '🔒') : (ICON[n.kind] || '•');
    const label = f === 'visited' || f === 'landmark' ? (n.title ? `${n.title.zh}` : '') : '';
    return `<g class="gn ${f}${isHere ? ' here' : ''}${next ? ' next' : ''}" data-node="${n.id}" data-testid="gnode-${n.id}" data-fog="${f}" data-kind="${n.kind}" transform="translate(${px(n)},${py(n)})">
      <circle r="${isHere ? rr + 4 : rr}"/><text class="ic" y="${dense ? 6 : 8}">${ic}</text>${label ? `<text class="lb" y="${rr + 22}" lang="zh-CN">${esc(label)}</text>` : ''}</g>`; }).join('');
  const exits = [...adj.entries()].filter(([k]) => k.startsWith('@')).map(([, e]) => { const t = e.to as E.NodeRef; const meta = W.idx!.graphs.find(m => m.id === t.graph);
    const lab = e.kind === 'exit' ? `🌍 ${zh('世界地图')} World map` : e.kind === 'stairs' ? (hn.kind === 'stairs_up' ? `⬆️ ${zh('上楼')} Up` : `⬇️ ${zh('下楼')} Down`) : `🌀 ${meta?.title?.zh ? zh(meta.title.zh) + ' ' : ''}${esc(meta?.title?.en || t.graph)}`;
    return `<button class="secondary" data-exit="${e.id}" data-testid="gexit-${e.id}">${lab}</button>`; }).join('');
  const hasExit = [...adj.values()].some(e => e.kind === 'exit');
  const toWorld = !isWorld && !hasExit && g.kind === 'overworld' && (hn.kind === 'town' || hn.kind === 'village') ? `<button class="secondary" id="toworld" data-testid="go-world">🌍 ${zh('世界地图')} World map</button>` : '';
  const act = hn.kind === 'inn' ? `<button data-testid="act-rest" id="rest">🛏️ ${zh('休息')} Rest</button>` : (hn.kind === 'town' || hn.kind === 'village') ? `<button data-testid="act-town" id="intown">🏘️ ${zh('进去')} Go in</button>` : '';
  render(`<div data-testid="graph" class="screen graph" data-graph="${g.id}" data-node="${here}" data-kind="${g.kind}" data-nodes="${g.nodes.length}">
    <style>.graph svg{position:absolute;left:0;top:0;width:1280px;height:720px;pointer-events:auto;touch-action:none}.graph .ge{stroke:#f6e7c1;stroke-width:5;stroke-dasharray:10 8;opacity:.8}.graph .ge.walked{stroke-dasharray:none}
    .graph .ge.closed{stroke:#a33;opacity:.6}.graph .gn circle{fill:#fff8e6;stroke:#7a581e;stroke-width:3}.graph .gn.seen circle{fill:#cfc7b4;opacity:.85}.graph .gn.landmark circle{fill:#e8dfc8;opacity:.8}
    .graph .gn.here circle{fill:#ffd95a;stroke:#d4a84a;stroke-width:5}.graph .gn.next{cursor:pointer}.graph .gn.next circle{stroke:#2a8f3a;stroke-width:5;animation:gpulse 1.2s infinite}
    @keyframes gpulse{50%{stroke-width:8}}.graph .gn text.ic{font-size:${dense ? 17 : 22}px;text-anchor:middle;pointer-events:none}.graph .gn text.lb{font:700 ${dense ? 13 : 16}px 'Noto Sans SC';text-anchor:middle;fill:#fff;paint-order:stroke;stroke:#0d1b3d;stroke-width:4px;pointer-events:none}
    .graph .zoom{position:absolute;right:24px;top:100px;display:flex;flex-direction:column;gap:8px}.graph .zoom .zl{font:700 14px Nunito;color:#fff;text-align:center;text-shadow:0 1px 2px #000}</style>
    <svg viewBox="${vb()}" data-testid="graph-svg">${lines}${nodes}</svg>
    <div class="zoom"><button class="secondary" id="zin" data-testid="zoom-in" aria-label="Zoom in">＋</button><button class="secondary" id="zout" data-testid="zoom-out" aria-label="Zoom out">－</button><button class="secondary" id="zhome" data-testid="zoom-home" aria-label="Centre on the hero">◎</button><div class="zl" data-testid="zoom-level">×${zoom.toFixed(1)}</div></div>
    <div class="bottombar panel">
      <button class="secondary" id="gbag" data-testid="go-items" data-key="1"><span class="ic">🎒</span>${zh('背包')} Bag</button>
      <button class="secondary" id="gq" data-testid="go-quests" data-key="2">📜 ${zh('任务')} Quests</button>
      <div class="hint" data-testid="graph-hint">${esc(hn.title ? `${hn.title.en}` : '')} · 🪶×${S.inv.feather || 0}</div>${exits}${toWorld}${act}
    </div></div>`);
  const svg = $('[data-testid="graph-svg"]') as unknown as SVGSVGElement;
  svg.querySelectorAll('.gn.next').forEach(el => el.addEventListener('click', () => { if (moved) return; const id = (el as HTMLElement).dataset.node!; const e = isWorld ? worldPick.get(id) : adj.get(id); if (e) walk(e); }));
  on('[data-exit]', (_e, el) => { const e = g.edges.find(x2 => x2.id === el.dataset.exit); if (e) walk(e); });
  on('#rest', () => rest(g, hn)); on('#intown', () => enterTown(g, hn));
  on('#toworld', async () => { const wn = await worldNodeFor(g.id); if (!wn) return; await graph('world'); P().pos = { graph: 'world', node: wn, edge: null, step: 0 }; saveW(); cloudTrigger('graphChange', 'world'); graphScreen(); });
  on('#gbag', () => bag(graphScreen)); on('#gq', () => questLog());
  const setZoom = (k: number, cx = 640, cy = 360) => { const z0 = zoom; zoom = Math.max(1, Math.min(MAXZ, k));
    // keep the point under (cx, cy) in place
    const wx = 640 - 640 / z0 - panX + cx / z0; panX = 640 - 640 / zoom - wx + cx / zoom; clampPan();
    const wy = 360 - 360 / z0 - panY + cy / z0; panY = 360 - 360 / zoom - wy + cy / zoom; clampPan();
    svg.setAttribute('viewBox', vb()); const zl = $('[data-testid="zoom-level"]'); if (zl) zl.textContent = `×${zoom.toFixed(1)}`; };
  on('#zin', () => setZoom(zoom * 1.4)); on('#zout', () => setZoom(zoom / 1.4));
  on('#zhome', () => { panX = 640 - px(hn); panY = 360 - py(hn); clampPan(); svg.setAttribute('viewBox', vb()); });
  const frameXY = (ev: { clientX: number; clientY: number }) => { const r = svg.getBoundingClientRect(); return [(ev.clientX - r.left) * 1280 / r.width, (ev.clientY - r.top) * 720 / r.height]; };
  svg.addEventListener('wheel', ev => { ev.preventDefault(); const [cx, cy] = frameXY(ev); setZoom(zoom * (ev.deltaY < 0 ? 1.2 : 1 / 1.2), cx, cy); }, { passive: false });
  // drag to scroll (and two-finger pinch on tablets); a drag of more than 6 px does not count as a tap on a node
  const pts = new Map<number, { x: number; y: number }>(); let drag: { x: number; y: number; px: number; py: number } | null = null; let pinch0 = 0, zoom0 = 1; let moved = false;
  svg.addEventListener('pointerdown', ev => { pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY }); moved = false;
    if (pts.size === 1) drag = { x: ev.clientX, y: ev.clientY, px: panX, py: panY };
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); zoom0 = zoom; drag = null; } });
  svg.addEventListener('pointermove', ev => { if (!pts.has(ev.pointerId)) return; pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    const r = svg.getBoundingClientRect(); const k = 1280 / r.width;
    if (pts.size === 2 && pinch0) { const [a, b] = [...pts.values()]; moved = true; const [cx, cy] = frameXY({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 }); setZoom(zoom0 * Math.hypot(a.x - b.x, a.y - b.y) / pinch0, cx, cy); return; }
    if (!drag) return; const dx = (ev.clientX - drag.x) * k, dy = (ev.clientY - drag.y) * k; if (Math.hypot(dx, dy) > 6) moved = true;
    if (zoom > 1) { panX = drag.px + dx / zoom; panY = drag.py + dy / zoom; clampPan(); svg.setAttribute('viewBox', vb()); } });
  const up = (ev: PointerEvent) => { pts.delete(ev.pointerId); if (pts.size < 2) pinch0 = 0; if (!pts.size) drag = null; };
  svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
}

// ---------------- entry ----------------
async function askName() {
  if (S.heroName) return;
  await new Promise<void>(res => {
    render(dlg({ testid: 'name', cls: 'narrow', close: false, title: `✏️ ${zh('你叫什么名字')}? What's your name?`, body: `<input id="hname" data-testid="name-input" maxlength="12" value="" placeholder="Hero" style="font-size:28px;width:100%">`,
      foot: `<button id="nok" data-testid="name-ok" data-key="enter">OK ✔</button>` }));
    const done = () => { const v = (($('#hname') as HTMLInputElement).value || '').trim(); S.heroName = v || 'Hero'; save(); res(); };
    on('#nok', done); ($('#hname') as HTMLInputElement).addEventListener('keydown', e => { if (e.key === 'Enter') done(); });
  });
}
export async function startGraph() {
  await loadWorld(); await ensureProgress();
  await askName();
  const p = P(); await graph(p.pos.graph);
  if (!E.nodeOf(W.graphs[p.pos.graph], p.pos.node)) p.pos = { ...W.idx!.start, edge: null, step: 0 };
  await graph(p.lastInn.graph).catch(() => {});
  const g = W.graphs[p.pos.graph]; const n = E.nodeOf(g, p.pos.node)!;
  if (!E.bitGet(E.gp(p, g.id).visited, n.idx)) return arrive(n.id);   // brand new game: the start village (tutorial event)
  p.pos.edge = null; p.pos.step = 0; saveW(); openNode();
}
