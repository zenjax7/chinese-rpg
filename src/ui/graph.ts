/** v3.9.2 graph world UI (?world=graph). Data: src/data/world/ + public/world/graphs/ (tools/world/build_world.py from Desy's docs/data). Progress lives in
 *  S.world (progress/0.3), story quests in S.storyQuests, seen scenes in S.scenesSeen, all in the v4 save. Classic mode never loads this. */
import { B, LOC, CONS, TOWNS, GEAR, GEAR_LIST, ITEM, POOLS } from '../data';
import { S, save, heroStats, refreshSkills, gainGear, equipLine, worldPrice, addExp, cloudTrigger, store } from '../engine/state';
import { validateProgress, migrateProgress } from '../world/progress';
import PROGRESS_SCHEMA from '../data/world/progress.schema.json';
import COMMON_SCHEMA from '../data/world/common.schema.json';
import { runBattle, setCurrentLoc, BattleResult, BattleOpts } from '../engine/battle';
import { town, graphHooks, rewards, itemsScreen, applyDefeat, flushNotices } from './screens';
import { $, esc, render, on, hud, toast, dialog, zh, dlg, setTitle, ui } from './dom';
import { view } from '../phaser/view';
import { BG } from '../assets';
import { nodeXY, NODE_ICON, mapLocation, isDense, nodeRadius } from '../shared/level/map-view';
import { playMusic, playSfx } from '../audio/audio';
import * as E from '../world/engine';
import { playScene, Scene, SceneEnv } from '../world/scene';
import { loadRealmContent } from '../world/content';
import { levelIndex, publishedLevel, levelToGraph, resetMap, bundledHash, type LevelGraph } from '../world/levels';
import { battleHooks } from '../engine/battle';
import { mapLevels } from '../shared/leveling';

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
/** A published map from the API when it differs from the bundled copy (level-editor.md §7), else the static graph. */
async function loadGraph(id: string): Promise<E.Graph> {
  const api = await publishedLevel(id);
  if (!api) return J(`world/graphs/${id}.json`);
  const base = await J(`world/graphs/${id}.json`).catch(() => null);
  const g = levelToGraph(api.level, base, W.zones, api.hash);
  for (const [sid, sc] of Object.entries(g.scenes ?? {})) W.scenes[sid] = sc;   // the map's own scenes (§2.8) win over the bundled ones
  return g;
}
/** §2.9 / §7.3: a beta map whose published hash differs from the one this save last played is reset; the hash is then recorded. */
async function syncMapVersion(g: E.Graph) {
  const m = (await levelIndex())?.maps[g.id]; if (!m || !S.world) return;
  const seen = (S.mapVersions ??= {});
  const last = seen[g.id];   // Oct 24: no bundled-hash fallback, a bundled → published switch never wipes progress
  if (last && last !== m.hash && m.state === 'beta') resetMap(P(), S.storyQuests ??= {}, W.quests, g);
  if (seen[g.id] !== m.hash) { seen[g.id] = m.hash; saveW(); }
}
export async function graph(id: string): Promise<E.Graph> {
  if (!W.graphs[id]) { const g = await loadGraph(id); W.graphs[id] = g; E.registerGraph(g); await syncMapVersion(g); }
  const g = W.graphs[id]; if (g.realm >= 3) await loadRealmContent(g.realm, W.idx?.content);   // realm 3–9 enemies, words, zones (world/content.ts)
  return g;
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
    await syncMapVersion(g0);   // Oct 24: record the published hash on the first session (graph() above ran before S.world existed)
    // classic progress maps onto zones: the meadow realm boss (rabbitking) = realm 1 cleared, the forest boss = realm 2 cleared
    if (S.locs.meadow?.bossDefeated) S.world.zonesDefeated.push(...W.idx!.zones.filter(z => z.realm === 1).map(z => z.id));
    if (S.locs.forest?.bossDefeated) S.world.zonesDefeated.push(...W.idx!.zones.filter(z => z.realm === 2).map(z => z.id));
    delete (S as any).migratedFrom;
  } else {
    // every load: the saved progress must validate against progress.schema.json; older or damaged ones are migrated (src/world/progress.ts)
    const errs = validateProgress(S.world, PROGRESS_SCHEMA, COMMON_SCHEMA);
    if (errs.length) { console.warn('graph save: migrating progress (' + errs.slice(0, 3).join('; ') + ')'); S.world = migrateProgress(S.world, W.idx!.start, fr.carry) as E.Progress; proto().migratedProgress = errs; }
    // Jack Oct 11: an older save's battle budget / pity / patrol / boss checkpoint fields are valid but unused: drop them
    const z: any = S.world!.zone; S.world!.zone = { id: typeof z?.id === 'string' && z.id ? z.id : 'none' };
  }
  S.storyQuests ??= {}; S.scenesSeen ??= []; S.party ??= [];
  syncFeathers(); save();
  const idx = await levelIndex();   // §7.3 on load: maps this save played whose published hash changed
  for (const id of Object.keys(S.world!.graphs)) { const m = idx?.maps[id]; if (m && m.hash !== (S.mapVersions?.[id] ?? bundledHash(id))) await syncMapVersion(await graph(id)); }
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
  answer: (id: string) => onCorrect(id),
  fight: async (zone?: string, boss = false) => { const g = W.graphs[P().pos.graph]; const out = await fight(g, zone ? W.zones[zone] : zoneOf(g, P().pos.node), { boss }); graphScreen(); return out; },
  drop: (id: string) => { const q = W.quests.find(x => x.id === id)!; E.dropQuest(q, ctx()); saveW(); },
  validate: (p?: unknown) => validateProgress(p ?? S.world, PROGRESS_SCHEMA, COMMON_SCHEMA),
  xy: (id: string) => { const n = E.nodeOf(W.graphs[P().pos.graph], id); return n ? nodeXY(n) : null; },
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
const battleLoc = (z?: E.Zone) => mapLocation(z, l => !!LOC[l]);
/** A map loaded from the API fights with its own word pool (settings.words, §2.5.1), limited to words the game has loaded.
 *  That pool has its own draw cycle (poolKey `map:<id>`). */
function mapPool(g: E.Graph, loc: string): { restore: () => void; poolKey?: string } {
  const words = (g as LevelGraph).words?.filter(id => ITEM[id]);
  if (!words?.length) return { restore: () => {} };
  const before = POOLS[loc]; POOLS[loc] = words;
  return { restore: () => { POOLS[loc] = before; }, poolKey: `map:${g.id}` };
}
async function fight(g: E.Graph, z: E.Zone | undefined, o: { boss?: boolean; enemies?: string[]; canLose?: boolean; label?: string; wakeAt?: E.NodeRef }): Promise<BattleResult['outcome']> {
  // tests: every battle is logged with where it started; __proto.fakeBattle ('win' | 'flee') skips playing it
  const tp = proto(); (tp.battles ??= []).push({ graph: g.id, node: P().pos.node, edge: P().pos.edge, step: P().pos.step, party: tp.party && { ...tp.party } });
  await battleTransition();
  if (tp.fakeBattle === 'win' || tp.fakeBattle === 'flee') return tp.fakeBattle;
  const loc = battleLoc(z); setCurrentLoc(loc);
  // leveling v2: the level settings of the map being played: a published map's own, else the bundled ones of the zone's map
  // (realm_1's clover_hills / warren zones are their own maps), else of the graph's map
  const ml = W.idx!.mapLevels || {}; const levels = mapLevels((g as LevelGraph).levelSettings ?? (z && ml[z.id]) ?? ml[g.id]);
  const opts: BattleOpts = { roster: z?.roster, enemies: o.enemies, boss: o.boss ? z?.boss : undefined, levels };   // Jack Oct 11: no random elites, a boss always starts fresh
  battleHooks.onCorrect = onCorrect;
  const pool = mapPool(g, loc); opts.poolKey = pool.poolKey;
  let res: BattleResult; try { res = await runBattle(loc, o.boss ? 'boss' : 'field', 0, opts); } finally { battleHooks.onCorrect = undefined; pool.restore(); }
  if (res.outcome === 'win') {
    if (res.kills?.length) questUpdate(E.questEvent(W.quests, ctx(), { type: 'kill', enemies: res.kills, realm: g.realm }));
    saveW(); await rewards(res, o.label || '');
  } else if (res.outcome === 'defeat') {
    if (o.canLose === false) { const h = heroStats(); S.hp = h.maxHp; S.mp = h.maxMp; saveW(); await dialog('🐲 小龙 Xiaolong', `<p>“${zh('没关系')}! It's OK!” Xiaolong pulls you back up. Let's try that again later.</p>`, ['OK']); }
    else { await defeated(o.wakeAt); }
  }
  return res.outcome;
}
/** Map → battle (Director Oct 17): a short flash-to-dark screen effect, about 1 s; a tap or any key skips it. */
const TRANSITION_MS = 1000;
function battleTransition(): Promise<void> {
  return new Promise(res => {
    const el = document.createElement('div'); el.className = 'btrans'; el.dataset.testid = 'battle-transition';
    el.innerHTML = `<style>.btrans{position:absolute;inset:0;z-index:20;pointer-events:auto;animation:btrans ${TRANSITION_MS}ms linear forwards}
      @keyframes btrans{0%{background:rgba(255,255,255,0)}10%{background:#fff}20%{background:rgba(255,255,255,0)}30%{background:#fff}45%{background:rgba(255,255,255,.2)}100%{background:#0d1b3d}}</style>`;
    (ui()?.parentElement || document.body).appendChild(el);
    const t0 = performance.now(); let over = false;
    const end = (skipped: boolean) => { if (over) return; over = true; clearTimeout(timer); el.remove(); document.removeEventListener('keydown', key, true);
      proto().lastTransition = { ms: Math.round(performance.now() - t0), skipped }; res(); };
    const key = (ev: KeyboardEvent) => { ev.preventDefault(); ev.stopPropagation(); end(true); };
    const timer = setTimeout(() => end(false), TRANSITION_MS);
    el.addEventListener('click', ev => { ev.stopPropagation(); end(true); });
    document.addEventListener('keydown', key, true);
  });
}
/** quests.md §2a words steps: every correct battle answer to an item of the step's pool (Desy's pool id = ITEM.loc) adds 1. */
function onCorrect(itemId: string) {
  const pool = ITEM[itemId]?.loc; if (!pool) return;
  const ch = E.questEvent(W.quests, ctx(), { type: 'answer', item: itemId, pool });
  for (const q of W.quests) { const st = S.storyQuests![q.id]; const s = st?.s === 'active' && E.currentStep(q, st);
    if (s && s.objective.type === 'words' && s.objective.pool === pool) proto().wordsCount = { quest: q.id, n: st.obj[s.id], of: E.wordsNeeded(s) }; }
  questUpdate(ch);
}
/** A defeat: the usual fee / Courage / full HP and MP; the hero wakes at the last inn, or at `to` (Jack Oct 12: a lost boss fight
 *  sends the hero back to the node they came from). */
async function defeated(to?: E.NodeRef) {
  const w = to || P().lastInn;
  const { fee } = applyDefeat(); P().pos = { graph: w.graph, node: w.node, edge: null, step: 0 };
  await graph(w.graph); saveW(); cloudTrigger('defeat'); hud();
  await dialog('😵 You fainted!', `<p data-testid="defeat-msg">🐼 “There, there. You were so brave!” Your friends carried you back to <b>${esc(nodeTitle(w))}</b>. HP and MP are full.${fee ? ` The doctor's fee was ${fee} 🪙.` : ''}</p>`, ['OK']);
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
  const fine = () => { const t = E.chestTier(GEAR_LIST, g.realm); const pick = GEAR_LIST.filter(x => x.tier === t && x.rarity === 'fine' && x.slot !== 'charm'); const it = pick[Math.floor(r * 997) % Math.max(1, pick.length)];
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
  // v3.9.5: quest gear (quests.json rewards.gear, e.g. q5_fog_bottle → shield_t5_heroic, its only source); auto-equipped when strictly better
  for (const gr of r.gear || []) { const it = GEAR[gr.id]; if (!it || S.gear.includes(it.id)) continue;
    const res = gainGear(it.id); toast(res.equipped ? equipLine(it, res.from) : `🎁 ${it.emoji} ${zh(it.zh)} ${esc(it.en)}${it.rarity !== 'common' ? ` (${it.rarity})` : ''}`); }
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
    const o = step?.objective; const need = o?.type === 'words' ? E.wordsNeeded(step!) : o?.n;
    const where = o?.type === 'escort' && step!.toAt ? ` · to ${esc(nodeTitle(step!.toAt))}` : step?.at && 'node' in step.at ? ` · ${esc(nodeTitle(step.at as E.NodeRef))}` : '';
    const what = st.s === 'completed' ? '✅ done' : st.s === 'ready' ? `❗ go back to ${esc(nodeTitle(q.turnInAt || q.giverAt!))}` : step ? `${o!.type === 'escort' ? `👣 ${esc(names(o!.npc || '')?.en || '')} follows you` : esc(o!.type)}${need ? ` ${st.obj[step.id] || 0}/${need}` : ''}${where}` : '';
    const drop = st.s === 'active' ? `<button class="secondary" data-drop="${q.id}" data-testid="qdrop-${q.id}" style="float:right;font-size:14px">✖ Drop</button>` : '';
    return `<div class="card" data-testid="qlog-${q.id}" data-state="${st.s}">${drop}${zh(q.title.zh)} <b>${esc(q.title.en)}</b><div class="muted">${what}</div></div>`; });
  render(dlg({ testid: 'questlog', cls: 'narrow', title: `📜 ${zh('任务')} Quests`, body: rows.join('') || '<p class="muted">No quests yet. Talk to people in towns and villages!</p>' }));
  on('#back', back);
  on('[data-drop]', async (_e, el) => { const q = questById(el.dataset.drop!); if (!q) return;
    if (await dialog(`✖ ${zh(q.title.zh)} ${esc(q.title.en)}`, `<p>Drop this quest? You can ask ${esc(nodeTitle(q.giverAt || P().pos))} for it again.</p>`, ['Drop it', 'Keep it']) !== 0) return questLog(back);
    E.dropQuest(q, ctx()); saveW(); toast(`📜 Quest dropped: ${esc(q.title.en)}`); questLog(back); });
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
    cloudTrigger('feather', `${t.ref.graph}/${t.ref.node}`); toast(`🪶 Whoosh! You fly to ${esc(t.label)}.`);
    offeredNow.clear(); await questsAtNode(W.graphs[t.ref.graph], t.ref.node); saveW(); openNode(); });   // an escort can end at a Feather destination
  on('#back', back);
}
function bag(back: () => void) { itemsScreen(back, 'graph', () => featherPicker(() => bag(back))); }

// ---------------- movement ----------------
let busy = false;
/** The node the hero last walked from (Jack Oct 12: where a fled or lost boss fight sends them back to). */
let cameFrom: E.NodeRef | null = null;
async function walk(e: E.GEdge) {
  if (busy) return; busy = true; proto().walking = true;
  try {
    const g = W.graphs[P().pos.graph]; const from = P().pos.node;
    // Jack Oct 12: no way on past an unbeaten boss (only reachable from an old save or a teleport): the boss fight comes first
    if (E.unbeatenBoss(E.nodeOf(g, from), P())) return void await arrive(from);
    cameFrom = { graph: g.id, node: from };
    if (typeof e.to === 'object') {   // stairs / portal / exit
      const tgt = e.to as E.NodeRef; const meta = W.idx!.graphs.find(x => x.id === tgt.graph);
      const wn = g.kind === 'world' ? E.nodeOf(g, e.from) as any : null;
      if (!meta || (wn && wn.inBuild === false && !allRealms())) { await dialog(`🚧 ${zh('还没开放')} Not in this build`, `<p data-testid="not-in-build">${esc(wn?.title?.en || tgt.graph)} is not in this build yet.</p>`, ['OK']); return; }
      if (!E.edgeCondOpen(e, ctx()) || (wn && !realmNodeOpen(wn, ctx()))) { toast('🔒 The way is closed.'); return; }
      await graph(tgt.graph);
      { const lk = E.lockOnWay(g, e, from, ctx()); if (lk) return void await blocked(lk, g); } P().pos = { graph: tgt.graph, node: tgt.node, edge: null, step: 0 }; P().hops++; saveW(); cloudTrigger('graphChange', tgt.graph);
      return void await arrive(tgt.node);
    }
    if (!E.edgeCondOpen(e, ctx())) { toast('🔒 The way is closed.'); return; }
    { const lk = E.lockOnWay(g, e, from, ctx()); if (lk) return void await blocked(lk, g); }   // quest gate: the blocked line, the hero stays put
    const to = E.otherEnd(e, from) as string; const steps = e.steps || 1; const pr = E.gp(P(), g.id);
    const z = zoneOf(g, undefined, e); if (z && P().zone.id !== z.id) P().zone = { id: z.id };
    const a = E.nodeOf(g, from)!, b = E.nodeOf(g, to)!; const msStep = walkMsPerStep(); const t0 = performance.now();
    let s = pr.edgeProgress[e.idx] || 0; let t = s / steps; onEdge = true; partyLeft = b.x < a.x; walkUi(); partyRefresh();
    P().pos = { graph: g.id, node: from, edge: e.id, step: s }; pr.edgeProgress[e.idx] = s; saveW();
    // Director Oct 17 (Jack's playtest: 4 battles on a 4-step edge): at most one battle per crossing. The existing per-step roll picks the
    // first step that hits (Jack Oct 11: no scripted path elites); the party walks to that point on the edge, stops there and fights.
    const hit = proto().noEncounters ? -1 : E.edgeEncounter(g, e, s, P(), R());
    if (hit >= 0) {
      await walkParty(a, b, t, (hit + 0.5) / steps, (hit + 0.5 - s) * msStep); t = (hit + 0.5) / steps; s = hit;
      P().pos.step = s; pr.edgeProgress[e.idx] = s; saveW();
      const out = await fight(g, z, {});
      // a turned-back crossing counts as a crossing: the next try is a fresh roll (it used to repeat this same battle every time)
      if (out === 'defeat') { E.abandonEdge(P(), g, e); partyAt = null; onEdge = false; saveW(); return graphScreen(); }
      if (out === 'flee') { E.abandonEdge(P(), g, e); partyAt = null; onEdge = false; P().pos = { graph: g.id, node: from, edge: null, step: 0 }; saveW(); toast('🏃 You ran back.'); return graphScreen(); }
      graphScreen();   // after the win the party walks on from where it stopped
    }
    await walkParty(a, b, t, 1, (1 - t) * steps * msStep);
    proto().lastWalk = { edge: e.id, ms: Math.round(performance.now() - t0) };
    E.finishEdge(P(), g, e); partyAt = null; onEdge = false; P().pos = { graph: g.id, node: to, edge: null, step: 0 }; saveW();
    await arrive(to);
  } finally { busy = false; proto().walking = false; partyAt = null; onEdge = false; }
}
/** True while the party is out on an edge: the map's buttons (bag, quests, exits, rest, go in) wait until it arrives. */
let onEdge = false;
const walkUi = () => document.querySelectorAll<HTMLButtonElement>('[data-testid="graph"] .bottombar button').forEach(b => { b.disabled = onEdge; });
/** The party walk speed: rules.walkSecPerStep (1.5 s) per edge step; tests may set __proto.walkMs. */
const walkMsPerStep = () => proto().walkMs ?? (R().walkSecPerStep ?? 1.5) * 1000;
/** Where the party stands mid-walk (null: on its node). */
let partyAt: { x: number; y: number } | null = null;
/** Move the party sprite along the edge a → b from fraction t0 to t1 in `ms` (Director Oct 17: the party walks slowly to the tapped node). */
function walkParty(a: E.GNode, b: E.GNode, t0: number, t1: number, ms: number): Promise<void> {
  const A = nodeXY(a), Bp = nodeXY(b); const st = performance.now();
  return new Promise(res => { const tick = () => {
    const k = ms > 0 ? Math.min(1, (performance.now() - st) / ms) : 1; const f = t0 + (t1 - t0) * k;
    partyAt = { x: A.x + (Bp.x - A.x) * f, y: A.y + (Bp.y - A.y) * f }; proto().party = partyAt;
    document.querySelector('[data-testid="party-sprite"]')?.setAttribute('transform', `translate(${partyAt.x},${partyAt.y})`);
    if (k < 1) requestAnimationFrame(tick); else res(); }; tick(); });
}
/** A quest gate in the way: its lockedScene if the build has it, else the default line "The way is blocked." / 路不通。 */
async function blocked(l: E.Lock, g: E.Graph) {
  proto().lastBlocked = { quest: l.lockedUntilQuest, scene: l.lockedScene || null };
  const sc = l.lockedScene ? await scene(l.lockedScene) : null;
  if (sc) await runScene(sc, g);
  else await dialog(`🔒 ${zh(E.LOCK_LINE.zh)}`, `<p data-testid="lock-blocked">${zh(E.LOCK_LINE.zh)} ${esc(E.LOCK_LINE.en)}</p>`, ['OK']);
  graphScreen();
}
/** Arrival: boss fight, every eligible event (Jack Oct 11; a node may have none), quest hooks, then town / inn / map. */
export async function arrive(node: string) {
  offeredNow.clear();
  const g = W.graphs[P().pos.graph]; const n = E.nodeOf(g, node)!;
  const first = !E.bitGet(E.gp(P(), g.id).visited, n.idx); E.markVisited(P(), g, node); saveW(); cloudTrigger('nodeChange', `${g.id}/${node}`);
  graphScreen();
  if (n.kind === 'boss' && n.boss && !P().zonesDefeated.includes(n.boss)) {
    for (const f of E.pickEvents(g, node, 'enter', ctx(), first)) { E.markFired(P(), g, f); for (const a of f.actions.filter(a => a.dialogue || a.scene)) await doAction(a, g); }
    // Jack Oct 11: no boss checkpoint; a boss fight after a loss starts fresh
    const z = W.zones[n.boss]; const out = await fight(g, z, { boss: true, wakeAt: back(g, node), label: `<p>👑 ${zh(z?.title.zh || '')} ${esc(z?.title.en || '')} is clear!</p>` });
    if (out !== 'win') {   // Jack Oct 12: a flee or a loss sends the hero back to the previous node; nothing past the boss opens
      if (out === 'flee') { const b = back(g, node); P().pos = { graph: b.graph, node: b.node, edge: null, step: 0 }; await graph(b.graph); saveW(); } return graphScreen(); }
    await bossCleared(g, n, z); return openNode();
  }
  let handledFight = false;
  for (const f of E.pickEvents(g, node, 'enter', ctx(), first)) {   // re-checked one by one: an earlier event can change a later one's condition
    if (!E.pickEvents(g, node, 'enter', ctx(), first).some(f2 => f2.key === f.key)) continue;
    // Director Oct 17 (Jack's playtest): at most one battle per arrival; a later fight event (e.g. Desy's miniboss_N.2 after the quest
    // fight miniboss_N.1) is not marked fired and runs on a later visit
    if (handledFight && f.actions.some(a => a.fight)) continue;
    E.markFired(P(), g, f, f.ev.pick?.[+f.key.split('#')[1]]?.once); saveW();
    for (const a of f.actions) { if (a.fight) handledFight = true; if (await doAction(a, g) === 'stop') return graphScreen(); } }
  if (!handledFight) { const qf = E.questFightAt(W.quests, ctx(), g.id, node);
    if (qf) { const out = await fight(g, zoneOf(g, node), { enemies: qf.enemies }); if (out === 'win') questUpdate(E.questEvent(W.quests, ctx(), { type: 'fightWon', graph: g.id, node })); else return graphScreen(); } }
  await questsAtNode(g, node);
  saveW(); openNode();
}
/** The node before the boss: where the hero walked from, else a visited neighbour, else the last inn. */
function back(g: E.Graph, node: string): E.NodeRef {
  const cf = cameFrom; if (cf && cf.graph === g.id && cf.node !== node && E.edgesAt(g, node).some(e => E.otherEnd(e, node) === cf.node)) return cf;
  const o = E.edgesAt(g, node).map(e => E.otherEnd(e, node)).find(o => typeof o === 'string' && E.bitGet(E.gp(P(), g.id).visited, E.nodeOf(g, o as string)!.idx));
  return o ? { graph: g.id, node: o as string } : P().lastInn;
}
async function bossCleared(g: E.Graph, n: E.GNode, z?: E.Zone) {
  const P_ = P(); if (!P_.zonesDefeated.includes(n.boss!)) P_.zonesDefeated.push(n.boss!);
  cloudTrigger('bossDefeated', n.boss);
  E.markSafeBack(P_, g, n.id, R());
  // the classic towns, skills and quests read S.locs: a realm boss maps onto that realm's classic location
  if (z?.bossKind === 'realmboss') { const loc = z.realm === 1 ? 'meadow' : z.realm === 2 ? 'forest' : null;
    if (loc && S.locs[loc]) { S.locs[loc].bossDefeated = true; S.locs[loc].pathCleared = LOC[loc].pathFights; const nx = loc === 'meadow' ? 'forest' : null; if (nx && S.locs[nx]) S.locs[nx].unlocked = true; refreshSkills(S); } }
  // every eligible on:clear event, then the realm-boss Feather of realms 3 / 6 / 8 (unless an on:clear event already gave one; no tip, by design)
  const givesFeather = (g.events || []).some(e => e.node === n.id && e.on === 'clear' && (e.do || []).some(a => a.giveItem === 'feather'));
  for (const f of E.pickEvents(g, n.id, 'clear', ctx(), false)) { E.markFired(P_, g, f); for (const a of f.actions) await doAction(a, g); }
  const rb = R().realmBossFeather; if (rb && !givesFeather && z?.bossKind === 'realmboss' && rb.realms.includes(g.realm)) giveItem('feather', rb.qty || 1);
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
  graphHooks.hide = n.kind === 'village' ? ['magic'] : [];
  graphHooks.shopTown = E.smithTownOf(g, n);   // town t's blacksmith shelf; null in a village (v3.9.5, world-graph §2: inn + save + item shop with Feathers, no magic shop, no smith)
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
    const hh = heroStats(); S.hp = hh.maxHp; S.mp = hh.maxMp; P().lastInn = { graph: g.id, node: n.id }; clearSafe(); saveW(); cloudTrigger('inn', `${g.id}/${n.id}`); toast('💤 HP and MP restored!'); graphScreen(); });
  on('#back', () => graphScreen());
}

// ---------------- the map (SVG over the Phaser background) ----------------
const ICON = NODE_ICON;
const allRealms = () => /[?&]realms=all\b/.test(location.search) || !!proto().allRealms;
/** World map: Jack Oct 11, progression by links only: a realm node is open unless the data gives it an unlock condition (the build drops
 *  the old bossDefeated unlocks); ?realms=all opens all. Realms are left through their own exit edge (kind exit, from the entry town / village). */
const realmNodeOpen = (n: E.GNode, x: E.Ctx) => { if (allRealms()) return true;
  const rl = W.idx!.realms?.find(r => r.node === n.id); const r = rl?.realm ?? Number(String(n.id).match(/(\d+)$/)?.[1] || 1);
  return E.realmOpen(r, x.P, W.idx!.realms || [], x); };
let zoom = 1, panX = 0, panY = 0, zoomGraph = '';
const MAXZ = 4;   // node x / y -> the 1280x720 frame: nodeXY in shared/level/map-view.ts (the level editor uses the same)
/** The party's map sprites (Arty's final strips, approved by Jack 2026-10-18; docs/art/arty/map_sprites.md): file under public/, key, frame size,
 *  frames in the horizontal strip, feet line (origin y), loop fps, idle frame (null: it never stops, e.g. Xiaolong keeps flying). Facing right. */
const MAP_SPRITES: Record<string, { key: string; file: string; fw: number; fh: number; frames: number; feet: number; fps: number; idle: number | null }> = {
  hero: { key: 'hero_map_walk', file: 'map_sprites/hero_map_walk.png', fw: 128, fh: 128, frames: 4, feet: 0.97, fps: 8, idle: 1 },
  xiaolong: { key: 'xiaolong_map_fly', file: 'map_sprites/xiaolong_map_fly.png', fw: 128, fh: 128, frames: 4, feet: 0.92, fps: 8, idle: null },
};
/** One party member on the map, ps px tall, feet at (dx, dy) from the party's point; `moving` plays the loop (walk / fly), else the idle frame. */
function mapSprite(id: string, ps: number, dx: number, dy: number, moving: boolean) {
  const m = MAP_SPRITES[id]; if (!m) return '';
  const loop = moving || m.idle === null; const anim = loop ? (id === 'xiaolong' ? 'fly' : 'walk') : 'idle';
  const style = loop ? `animation:mapstrip ${m.frames / m.fps}s steps(${m.frames}) infinite;--strip:-${m.fw * m.frames}px` : `transform:translateX(-${m.fw * m.idle!}px)`;
  return `<svg data-testid="party-${id}" data-key="${m.key}" data-anim="${anim}" x="${dx - ps / 2}" y="${dy - ps * m.feet}" width="${ps}" height="${ps}" viewBox="0 0 ${m.fw} ${m.fh}"><image href="${m.file}" width="${m.fw * m.frames}" height="${m.fh}" style="${style}"/></svg>`;
}
/** The party group's inner markup: Xiaolong (0.6× the hero) behind and above on the trailing side, then the Hero; mirrored when walking left. */
function partyInner(ps: number, dy: number) {
  const moving = onEdge; const left = moving && partyLeft;
  const xl = S.party?.includes('xiaolong') ? mapSprite('xiaolong', ps * 0.6, -0.35 * ps, dy - 0.15 * ps, moving) : '';
  return `<g class="pflip" data-facing="${left ? 'left' : 'right'}"${left ? ' transform="scale(-1,1)"' : ''}>${xl}${mapSprite('hero', ps, 0, dy, moving)}</g>`;
}
/** Re-draw the party in place (walk start: walk / fly loops and facing). */
function partyRefresh() { const g = document.querySelector('[data-testid="party-sprite"]'); if (g) g.innerHTML = partyInner(+(g as HTMLElement).dataset.ps!, +(g as HTMLElement).dataset.dy!); }
let partyLeft = false;
const clampPan = () => { const mx = 640 - 640 / zoom, my = 360 - 360 / zoom; panX = Math.max(-mx, Math.min(mx, panX)); panY = Math.max(-my, Math.min(my, panY)); };
const vb = () => `${640 - 640 / zoom - panX} ${360 - 360 / zoom - panY} ${1280 / zoom} ${720 / zoom}`;
export function graphScreen() {
  const g = W.graphs[P().pos.graph]; if (!g) return;
  const here = P().pos.node; const hn = E.nodeOf(g, here)!;
  const px = (n: E.GNode) => nodeXY(n).x, py = (n: E.GNode) => nodeXY(n).y;
  if (zoomGraph !== g.id) {   // big graphs (up to ~200 nodes) open zoomed in on the hero; pinch / wheel / ± and drag to look around
    zoomGraph = g.id; zoom = g.nodes.length > 120 ? 3 : g.nodes.length > 60 ? 2 : 1; panX = 640 - px(hn); panY = 360 - py(hn); clampPan();
  }
  const isWorld = g.kind === 'world';
  const z = zoneOf(g, here); const loc = battleLoc(z); setCurrentLoc(loc);
  view.mode('map', parseInt(LOC[loc].bg), BG.map(LOC[loc])); playMusic('mus_village'); hud();
  const ttl = g.title || W.idx!.graphs.find(x => x.id === g.id)?.title;
  const lvl = g.kind === 'dungeon_level' && g.level && !(ttl?.zh || '').includes('层') ? ` · ${zh(`第${g.level}层`)} Level ${g.level}` : '';   // most titles already name the level
  setTitle(`${isWorld ? '🌍' : g.kind === 'dungeon_level' ? '🕳️' : '🗺️'} ${zh(ttl?.zh || '')} ${esc(ttl?.en || g.id)}${lvl}`);
  const x = ctx(); const fogS: Record<string, E.FogState> = isWorld ? Object.fromEntries(g.nodes.map(n => [n.id, 'visited' as E.FogState])) : E.fog(g, P(), x);
  const dense = isDense(g.nodes.length); const rr = nodeRadius(g.nodes.length);
  const adj = new Map<string, E.GEdge>(); for (const e of E.edgesAt(g, here)) { const o = E.otherEnd(e, here); adj.set(typeof o === 'string' ? o : `@${e.id}`, e); }
  // on the world map every open realm node is one tap away (through its own portal edge)
  const worldPick = new Map<string, E.GEdge>(); if (isWorld) for (const n of g.nodes) { const e = g.edges.find(e2 => e2.from === n.id && typeof e2.to === 'object'); if (e && realmNodeOpen(n, x)) worldPick.set(n.id, e); }
  const pr = E.gp(P(), g.id);
  const lines = isWorld ? g.edges.filter(e => typeof e.to === 'string').map(e => { const a = E.nodeOf(g, e.from)!, b = E.nodeOf(g, e.to as string)!;   // link edges w12..w89
    const open = allRealms() || E.edgeOpen(e, x); return `<line x1="${px(a)}" y1="${py(a)}" x2="${px(b)}" y2="${py(b)}" class="ge${open ? ' walked' : ' closed'}" data-edge="${e.id}"/>`; }).join('')
    : g.edges.filter(e => typeof e.to === 'string').map(e => { const a = E.nodeOf(g, e.from)!, b = E.nodeOf(g, e.to as string)!;
    if (fogS[a.id] === 'hidden' || fogS[b.id] === 'hidden' || (fogS[a.id] !== 'visited' && fogS[b.id] !== 'visited')) return '';
    const walked = E.bitGet(pr.walked, e.idx); const open = E.edgeCondOpen(e, x);
    // quest gate on the edge (or on the node it leads to): a 🔒 marker at the middle of the line; tapping the far node shows the blocked line
    const lk = E.locked(e, x) || [a, b].some(m => fogS[m.id] !== 'visited' && E.locked(m, x));
    const lock = lk ? `<text class="lock" data-testid="glock-${e.id}" x="${(px(a) + px(b)) / 2}" y="${(py(a) + py(b)) / 2 + 8}">🔒</text>` : '';
    return `<line x1="${px(a)}" y1="${py(a)}" x2="${px(b)}" y2="${py(b)}" class="ge${walked ? ' walked' : ''}${open ? '' : ' closed'}${lk ? ' locked' : ''}" data-edge="${e.id}"/>${lock}`; }).join('');
  // Jack Oct 11 (hidden node types): an unvisited node carries no kind, title, icon or id in the DOM: only its index and fog state
  const nodes = g.nodes.map(n => { const f = fogS[n.id]; if (f === 'hidden') return '';
    const isHere = n.id === here; const ae = adj.get(n.id); const next = isWorld ? worldPick.has(n.id) && !isHere : !!ae && E.edgeCondOpen(ae, x);
    const lockedWay = !isWorld && !!ae && next && !!E.lockOnWay(g, ae, here, x);
    const known = f === 'visited';
    const done = known && n.kind === 'boss' && P().zonesDefeated.includes(n.boss || '');
    const ic = !known ? '?' : done ? '✔' : isWorld ? (worldPick.has(n.id) ? '🌀' : '🔒') : (ICON[n.kind] || '•');
    const label = known && n.title ? `${n.title.zh}` : '';
    const ident = known ? `data-node="${n.id}" data-testid="gnode-${n.id}" data-kind="${n.kind}"` : `data-testid="gnode-i${n.idx}"`;
    return `<g class="gn ${f}${isHere ? ' here' : ''}${next ? ' next' : ''}${lockedWay ? ' locked' : ''}" data-idx="${n.idx}" ${ident} data-fog="${f}" transform="translate(${px(n)},${py(n)})">
      <circle r="${isHere ? rr + 4 : rr}"/><text class="ic" y="${dense ? 6 : 8}">${ic}</text>${label ? `<text class="lb" y="${rr + 22}" lang="zh-CN">${esc(label)}</text>` : ''}</g>`; }).join('');
  // Director Oct 17: the party on the map (MAP_SPRITES), Xiaolong with the Hero once Xiaolong has joined; both walk in one <g>
  const pp = partyAt || nodeXY(hn); proto().party = pp; const ps = dense ? 48 : 64;
  const party = `<g class="party" data-testid="party-sprite" data-ps="${ps}" data-dy="${-rr + 4}" transform="translate(${pp.x},${pp.y})">${partyInner(ps, -rr + 4)}</g>`;
  const exits = [...adj.entries()].filter(([k]) => k.startsWith('@')).map(([, e]) => { const t = e.to as E.NodeRef; const meta = W.idx!.graphs.find(m => m.id === t.graph);
    const lab = e.kind === 'exit' ? `🌍 ${zh('世界地图')} World map` : e.kind === 'stairs' ? (hn.kind === 'stairs_up' ? `⬆️ ${zh('上楼')} Up` : `⬇️ ${zh('下楼')} Down`) : `🌀 ${meta?.title?.zh ? zh(meta.title.zh) + ' ' : ''}${esc(meta?.title?.en || t.graph)}`;
    return `<button class="secondary" data-exit="${e.id}" data-testid="gexit-${e.id}">${lab}</button>`; }).join('');
  const fol = isWorld ? [] : E.escortFollowers(W.quests, x);
  const follow = fol.length ? `<span data-testid="escort-follower" data-npc="${fol.map(f => f.npc).join(' ')}"> · 👣 ${fol.map(f => esc(names(f.npc, g)?.en || f.npc)).join(', ')}</span>` : '';
  const act = hn.kind === 'inn' ? `<button data-testid="act-rest" id="rest">🛏️ ${zh('休息')} Rest</button>` : (hn.kind === 'town' || hn.kind === 'village') ? `<button data-testid="act-town" id="intown">🏘️ ${zh('进去')} Go in</button>` : '';
  render(`<div data-testid="graph" class="screen graph" data-graph="${g.id}" data-node="${here}" data-kind="${g.kind}" data-nodes="${g.nodes.length}">
    <style>.graph svg{position:absolute;left:0;top:0;width:1280px;height:720px;pointer-events:auto;touch-action:none}.graph .ge{stroke:#f6e7c1;stroke-width:5;stroke-dasharray:10 8;opacity:.8}.graph .ge.walked{stroke-dasharray:none}
    .graph .ge.closed{stroke:#a33;opacity:.6}.graph .gn circle{fill:#fff8e6;stroke:#7a581e;stroke-width:3}.graph .gn.seen circle{fill:#cfc7b4;opacity:.85}.graph .ge.locked{stroke:#c9a227;stroke-dasharray:4 6}.graph text.lock{font-size:20px;text-anchor:middle;pointer-events:none}.graph .gn.next.locked circle{stroke:#c9a227}
    .graph .gn.here circle{fill:#ffd95a;stroke:#d4a84a;stroke-width:5}.graph .gn.next{cursor:pointer}.graph .gn.next circle{stroke:#2a8f3a;stroke-width:5;animation:gpulse 1.2s infinite}
    @keyframes gpulse{50%{stroke-width:8}}.graph .gn text.ic{font-size:${dense ? 17 : 22}px;text-anchor:middle;pointer-events:none}.graph .gn text.lb{font:700 ${dense ? 13 : 16}px 'Noto Sans SC';text-anchor:middle;fill:#fff;paint-order:stroke;stroke:#0d1b3d;stroke-width:4px;pointer-events:none}
    .graph .party{pointer-events:none}@keyframes mapstrip{to{transform:translateX(var(--strip))}}.graph .party text{text-anchor:middle}.graph .zoom{position:absolute;right:24px;top:100px;display:flex;flex-direction:column;gap:8px}.graph .zoom .zl{font:700 14px Nunito;color:#fff;text-align:center;text-shadow:0 1px 2px #000}</style>
    <svg viewBox="${vb()}" data-testid="graph-svg">${lines}${nodes}${party}</svg>
    <div class="zoom"><button class="secondary" id="zin" data-testid="zoom-in" aria-label="Zoom in">＋</button><button class="secondary" id="zout" data-testid="zoom-out" aria-label="Zoom out">－</button><button class="secondary" id="zhome" data-testid="zoom-home" aria-label="Centre on the hero">◎</button><div class="zl" data-testid="zoom-level">×${zoom.toFixed(1)}</div></div>
    <div class="bottombar panel">
      <button class="secondary" id="gbag" data-testid="go-items" data-key="1"><span class="ic">🎒</span>${zh('背包')} Bag</button>
      <button class="secondary" id="gq" data-testid="go-quests" data-key="2">📜 ${zh('任务')} Quests</button>
      <div class="hint" data-testid="graph-hint">${esc(hn.title ? `${hn.title.en}` : '')} · 🪶×${S.inv.feather || 0}${follow}</div>${exits}${act}
    </div></div>`);
  if (onEdge) walkUi();
  const svg = $('[data-testid="graph-svg"]') as unknown as SVGSVGElement;
  svg.querySelectorAll('.gn.next').forEach(el => el.addEventListener('click', () => { if (moved) return; const id = g.nodes.find(n => n.idx === +(el as HTMLElement).dataset.idx!)?.id; if (!id) return; const e = isWorld ? worldPick.get(id) : adj.get(id); if (e) walk(e); }));
  on('[data-exit]', (_e, el) => { const e = g.edges.find(x2 => x2.id === el.dataset.exit); if (e) walk(e); });
  on('#rest', () => rest(g, hn)); on('#intown', () => enterTown(g, hn));
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
  const p = P();
  const seenRealms = new Set(Object.keys(p.graphs).map(id => W.idx!.graphs.find(m => m.id === id)?.realm || 0).filter(r => r >= 3));
  await Promise.all([...seenRealms].map(r => loadRealmContent(r, W.idx!.content).catch(() => false)));
  await graph(p.pos.graph);
  if (!E.nodeOf(W.graphs[p.pos.graph], p.pos.node)) p.pos = { ...W.idx!.start, edge: null, step: 0 };
  await graph(p.lastInn.graph).catch(() => {});
  const g = W.graphs[p.pos.graph]; const n = E.nodeOf(g, p.pos.node)!;
  if (!E.bitGet(E.gp(p, g.id).visited, n.idx) || E.unbeatenBoss(n, p)) return arrive(n.id);   // brand new game (tutorial event), or standing at an unbeaten boss
  p.pos.edge = null; p.pos.step = 0; saveW(); openNode();
}
