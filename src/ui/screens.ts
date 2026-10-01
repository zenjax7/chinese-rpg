import { B, LOCATIONS, LOC, GEAR, GEAR_LIST, CONS, CONSUMABLES, SKILL, SKILLS, ITEM, POOLS } from '../data';
import { S, save, heroStats, innPrice, consPrice, speechOn, session, skillSlots, refreshSkills, resetAll, clampHpMp, expToNext, WAY_LABEL, ALL_WAYS, replaceState } from '../engine/state';
import { readiness, prog, proficient, progress, activeWays, distractors, bossPool } from '../engine/learning';
import { runBattle, setCurrentLoc, BattleResult, BattleKind } from '../engine/battle';
import { speak, speechSupported, requestMic, hasZhVoice } from '../engine/speech';
import { sayBtn, wireSayButtons } from '../engine/voice';
import { playMusic, playSfx, unlockAudio, audioSettings, setAudio } from '../audio/audio';
import { BG } from '../assets';
import { view } from '../phaser/view';
import { $, $$, esc, render, on, hud, toast, dialog, modal, closeModal, sleep } from './dom';
import { practiceMenu } from './practice';

// =============== consent (first launch) ===============
export function consentScreen() {
  view.mode('blank');
  const a = 3 + Math.floor(Math.random() * 6), b = 4 + Math.floor(Math.random() * 5);
  render(`<div class="panel" data-testid="consent"><h1>👋 Grown-ups first!</h1>
    <p>This is a prototype of a Chinese-learning adventure game for kids. A parent or guardian should set it up.</p>
    <div class="card"><h3>🎤 Speaking questions (on by default, you can turn them off)</h3>
      <p class="muted">Some questions can be answered by speaking. In Chrome the voice audio is sent to Google's speech service to turn it into text.
      This game does not record or store audio; it keeps only the recognized text on this device. Tones are not graded. Works in Chrome/Edge only.</p>
      <label><input type="checkbox" id="sp" data-testid="consent-speech" checked> Allow speaking questions (turns on the microphone only when my child taps 🎤)</label></div>
    <div class="card" style="margin-top:8px"><b>Parent check:</b> what is ${a} × ${b}? <input type="number" id="pc" data-testid="consent-answer"> </div>
    <p class="muted">Progress is saved only in this browser (localStorage). No accounts, no ads, no data leaves this device except speech audio if you allow it.</p>
    <div class="row"><button id="ok" data-testid="consent-ok">I'm a parent/guardian: Start ▶</button></div><div id="err"></div></div>`);
  on('#ok', async () => {
    unlockAudio();   // first user gesture: browsers allow audio from here on
    if (+(($('#pc') as HTMLInputElement).value) !== a * b) { $('#err').innerHTML = '<div class="banner">Please ask a grown-up to answer the parent check.</div>'; return; }
    const wantSpeech = ($('#sp') as HTMLInputElement).checked;
    S.consent = { given: true, speech: false, at: Date.now() };
    if (wantSpeech) {
      if (!speechSupported()) { toast('This browser has no speech recognition, so we\'ll use tapping.'); }
      else if (!(await requestMic())) { toast('Microphone permission was denied, so we\'ll use tapping.'); session.speechBlocked = true; }
      else S.consent.speech = true;
    }
    save(); town();
  });
}

// =============== town hub ===============
export function town() {
  S.where = 'town'; save(); view.mode('town', undefined, BG.village()); playMusic('mus_village'); hud();
  const fl = LOCATIONS.filter(l => S.locs[l.id].unlocked);
  render(`<div class="panel" data-testid="town"><h1>🏘️ Little Hill Village 小山村</h1>
    ${session.speechBlocked && S.consent.speech ? `<div class="banner">🔇 ${esc(session.speechBlockReason || 'Speech is off for this session.')}</div>` : ''}
    <div class="grid">
      <button data-go="inn" data-testid="go-inn">🛏️ Inn 客栈</button>
      <button data-go="shop" data-testid="go-shop">🛒 Shop 商店</button>
      <button data-go="equip" data-testid="go-equip">🎒 Gear & Skills</button>
      <button data-go="items" class="secondary" data-testid="go-items">🍯 Use items</button>
    </div>
    <h3 style="margin-top:14px">🗺️ Where to?</h3>
    <div class="grid">${LOCATIONS.map(l => { const st = S.locs[l.id]; return `<button ${st.unlocked ? '' : 'disabled'} data-loc="${l.id}" data-testid="loc-${l.id}">
      ${l.emoji} ${l.zh} ${l.name}<br><span class="muted" style="color:#5a4a10">Lv ${l.recLevel[0]}–${l.recLevel[1]} ${st.bossDefeated ? '· 👑 cleared' : st.unlocked ? '' : '· 🔒 beat the previous boss'}</span></button>`; }).join('')}</div>
    <div class="row" style="margin-top:10px"><button class="secondary" data-go="settings" data-testid="go-settings">⚙️ Parent settings</button></div></div>`);
  void fl;
  on('[data-go]', (_e, el) => ({ inn: () => inn(), shop, equip, items: () => itemsScreen(town), settings } as any)[el.dataset.go!]());
  on('[data-loc]', (_e, el) => enterLocation(el.dataset.loc!, true));
}

// =============== inn ===============
export function innName(place: string, node = 0) {
  if (place === 'town') return '🛏️ The Sleepy Panda Inn 熊猫客栈 (village)';
  const n = B.inns.nodes.find((x: any) => x.at === node) || B.inns.nodes[0];
  return `🏕️ ${n.zh} ${n.name} · ${LOC[place].emoji} ${LOC[place].name}`;
}
/** Inn at the village (place 'town') or at a location node (entrance 0 / midpoint / boss approach). */
export function inn(msg = '', place = 'town', node = 0) {
  hud(); const price = innPrice(place); const h = heroStats(); const broke = S.gold < price;
  const backTo = () => place === 'town' ? town() : locationScreen(place);
  if (place === 'town') view.mode('town', undefined, BG.inn());
  playMusic('mus_village');
  render(`<div class="panel" data-testid="inn" data-place="${place}" data-node="${node}"><h1>${innName(place, node)}</h1>
    ${msg ? `<div class="card" data-testid="inn-msg">${msg}</div>` : ''}
    <p>HP ${S.hp}/${h.maxHp} · MP ${S.mp}/${h.maxMp}. A night's rest restores all HP and MP.</p>
    <div class="row"><button id="stay" data-testid="inn-stay">${broke ? '😴 Rest for free (you are short on gold)' : `😴 Stay the night (${price} 🪙)`}</button>
    ${place !== 'town' ? `<button class="secondary" id="ipr" data-testid="inn-practice">🎯 Practice words</button>` : ''}
    <button class="secondary" id="back" data-testid="back">⬅ Back to ${place === 'town' ? 'town' : 'the map'}</button></div></div>`);
  on('#ipr', async () => { await practiceMenu(place); inn('', place, node); });
  on('#stay', () => {
    const hs = heroStats(); let m;
    if (S.gold < price) {
      S.stats.freeInn++; m = '🐼 "Rest, little hero, pay me later!" (free stay)';
      if ((S.inv.honey || 0) + (S.inv.bighoney || 0) === 0) { S.inv[B.economy.brokePotion] = (S.inv[B.economy.brokePotion] || 0) + 1; m += `<br>🍯 The innkeeper slips you a free ${CONS[B.economy.brokePotion].en}.`; }
    } else { S.gold -= price; S.stats.paidInn++; m = `You paid ${price} 🪙 and slept well.`; }
    S.hp = hs.maxHp; S.mp = hs.maxMp; S.lastInn = { place, node };
    // resting away from the boss approach re-arms the approach patrols; the approach inn itself does not (spec v3 §7.3/§7.4)
    if (!(place !== 'town' && node >= LOC[place].pathFights)) for (const l of LOCATIONS) S.locs[l.id].approachArmed = true;
    save(); toast('💤 HP and MP restored!'); inn(m, place, node);
  });
  on('#back', backTo);
}

// =============== shop ===============
export function shop() {
  hud();
  const gear = GEAR_LIST.filter(g => g.shop && (!g.shopRequires || S.locs[g.shopRequires]?.unlocked));
  const statTxt = (g: any) => [g.atk ? `⚔️+${g.atk}` : '', g.def ? `🛡️+${g.def}` : '', g.mp ? `🔷+${g.mp} MP` : ''].filter(Boolean).join(' ');
  render(`<div class="panel" data-testid="shop"><h1>🛒 Grandma Wu's Shop</h1><p>Your gold: 🪙 ${S.gold}</p>
    <h3>Potions & tools</h3><div class="grid">${CONSUMABLES.map(c => `<div class="card"><div style="font-size:1.4rem">${c.emoji} ${c.zh}</div><div>${c.en}</div>
      <div class="muted">${c.healHpFrac ? `+${c.healHpFrac * 100}% HP` : c.healMpFrac ? `+${c.healMpFrac * 100}% MP` : 'Warp to the last inn you used (map only)'} · you have ${S.inv[c.id] || 0}${c.carryLimit ? ` (max ${c.carryLimit})` : ''}</div>
      <button data-buyc="${c.id}" data-testid="buy-${c.id}" ${S.gold >= consPrice(c.id) && !(c.carryLimit && (S.inv[c.id] || 0) >= c.carryLimit) ? '' : 'disabled'}>${c.carryLimit && (S.inv[c.id] || 0) >= c.carryLimit ? 'Bag full' : `Buy ${consPrice(c.id)} 🪙`}</button></div>`).join('')}</div>
    <h3 style="margin-top:10px">Weapons, armor, shields & charms</h3><div class="grid">${gear.map(g => { const own = S.gear.includes(g.id); return `<div class="card">
      <div style="font-size:1.3rem">${g.emoji} ${g.zh}</div><div>${g.en} <span class="tag">${g.slot} · tier ${g.tier}</span></div><div class="muted">${statTxt(g)}${g.slot === 'charm' ? ` · charm slot opens at Lv ${B.slots.charmUnlockLevel}` : ''}</div>
      ${own ? `<button class="secondary" disabled>Owned</button>${S.equip[g.slot] !== g.id ? `<button data-eq="${g.id}" data-testid="equip-${g.id}">Equip</button>` : '<span class="tag">equipped</span>'}`
        : `<button data-buyg="${g.id}" data-testid="buy-${g.id}" ${S.gold >= g.price ? '' : 'disabled'}>Buy ${g.price} 🪙</button>`}</div>`; }).join('')}</div>
    <div class="row"><button class="secondary" id="back" data-testid="back">⬅ Back to town</button></div></div>`);
  on('[data-buyc]', (_e, el) => { const id = el.dataset.buyc!; const p = consPrice(id); if (S.gold < p || (CONS[id].carryLimit && (S.inv[id] || 0) >= CONS[id].carryLimit!)) return; S.gold -= p; S.inv[id] = (S.inv[id] || 0) + 1; playSfx('sfx_gold'); save(); toast(`Bought ${CONS[id].en}`); shop(); });
  on('[data-buyg]', (_e, el) => { const g = GEAR[el.dataset.buyg!]; if (S.gold < g.price) return; S.gold -= g.price; S.gear.push(g.id); if (!S.equip[g.slot]) S.equip[g.slot] = g.id; playSfx('sfx_gold'); save(); toast(`Bought ${g.en}! Equip it in Gear.`); shop(); });
  on('[data-eq]', (_e, el) => { const g = GEAR[el.dataset.eq!]; S.equip[g.slot] = g.id; clampHpMp(); save(); shop(); });
  on('#back', town);
}

// =============== equipment & skills ===============
export function equip(back: () => void = town) {
  hud(); const h = heroStats(); const slots = skillSlots();
  const slotNames = ['weapon', 'armor', 'shield', 'charm'] as const;
  const stat = (g: any) => [g.atk ? `⚔️+${g.atk}` : '', g.def ? `🛡️+${g.def}` : '', g.mp ? `🔷+${g.mp}` : ''].filter(Boolean).join(' ');
  render(`<div class="panel" data-testid="equip"><h1>🎒 Gear & Skills</h1>
    <p>Level ${S.level} (EXP ${S.exp}/${expToNext(S.level)}) · ❤️ ${h.maxHp} · 🔷 ${h.maxMp} · ⚔️ ATK ${h.atk} · 🛡️ DEF ${h.def}</p>
    <div class="grid">${slotNames.map(sl => { const locked = sl === 'charm' && S.level < B.slots.charmUnlockLevel; const owned = S.gear.filter(id => GEAR[id].slot === sl);
      return `<div class="card"><h3>${sl}${locked ? ` 🔒 (Lv ${B.slots.charmUnlockLevel})` : ''}</h3>
      ${owned.length ? owned.map(id => { const g = GEAR[id]; const on_ = S.equip[sl] === id;
        return `<div><button class="${on_ ? '' : 'secondary'}" data-eq="${id}" data-testid="eq-${id}" ${locked ? 'disabled' : ''}>${on_ ? '✅ ' : ''}${g.emoji} ${g.zh} ${g.en} ${stat(g)}${g.rarity !== 'common' ? ` (${g.rarity})` : ''}</button></div>`; }).join('') : '<div class="muted">nothing yet</div>'}
      ${S.equip[sl] ? `<button class="secondary" data-uneq="${sl}">Take off</button>` : ''}</div>`; }).join('')}</div>
    <h3 style="margin-top:12px">✨ Skills (${S.skillsEquipped.length}/${slots} slots)</h3>
    <div class="grid">${SKILLS.map(sk => { const known = S.skills.includes(sk.id); const eq = S.skillsEquipped.includes(sk.id);
      const u = sk.unlock; const how = u.start ? 'start' : u.level ? `Level ${u.level}` : `beat the ${LOC[u.boss!].name} boss`;
      return `<div class="card" style="${known ? '' : 'opacity:.5'}"><div style="font-size:1.2rem">${sk.emoji} ${sk.zh} ${sk.en}</div><div class="muted">${esc(sk.desc)}<br>${sk.mp} MP${sk.perBattle ? ` · ${sk.perBattle}/battle` : ''}${sk.cooldownRounds ? ` · every ${sk.cooldownRounds} rounds` : ''}</div>
      ${known ? `<button data-sk="${sk.id}" data-testid="sk-${sk.id}" class="${eq ? '' : 'secondary'}">${eq ? '✅ Equipped' : 'Equip'}</button>` : `<div class="muted">🔒 Unlock: ${how}</div>`}</div>`; }).join('')}</div>
    <div class="row"><button class="secondary" id="back" data-testid="back">⬅ Back</button></div></div>`);
  on('[data-eq]', (_e, el) => { const g = GEAR[el.dataset.eq!]; S.equip[g.slot] = g.id; clampHpMp(); save(); equip(back); });
  on('[data-uneq]', (_e, el) => { (S.equip as any)[el.dataset.uneq!] = null; clampHpMp(); save(); equip(back); });
  on('[data-sk]', (_e, el) => { const id = el.dataset.sk!; const i = S.skillsEquipped.indexOf(id);
    if (i >= 0) S.skillsEquipped.splice(i, 1); else if (S.skillsEquipped.length < slots) S.skillsEquipped.push(id); else toast(`All ${slots} skill slots are full. Unequip one first.`);
    save(); equip(back); });
  on('#back', back);
}

// =============== use items outside battle ===============
export function itemsScreen(back: () => void) {
  hud();
  render(`<div class="panel" data-testid="items"><h1>🍯 Items</h1><div class="grid">${['honey', 'bighoney', 'manatea'].map(id => `<div class="card">${CONS[id].emoji} ${CONS[id].zh} ${CONS[id].en} ×${S.inv[id] || 0}
    <button data-use="${id}" data-testid="use-${id}" ${(S.inv[id] || 0) > 0 ? '' : 'disabled'}>Use</button></div>`).join('')}</div>
    <div class="row"><button class="secondary" id="back" data-testid="back">⬅ Back</button></div></div>`);
  on('[data-use]', (_e, el) => { const c = CONS[el.dataset.use!]; const h = heroStats(); S.inv[c.id]--; playSfx('sfx_potion');
    if (c.healHpFrac) S.hp = Math.min(h.maxHp, S.hp + Math.round(c.healHpFrac * h.maxHp)); if (c.healMpFrac) S.mp = Math.min(h.maxMp, S.mp + Math.round(c.healMpFrac * h.maxMp)); save(); itemsScreen(back); });
  on('#back', back);
}

// =============== parent settings ===============
export function settings() {
  const a = 6 + Math.floor(Math.random() * 4), b = 3 + Math.floor(Math.random() * 6);
  render(`<div class="panel"><h1>⚙️ Parent settings</h1>
    <p>Speech: <b>${S.consent.speech ? 'allowed' : 'off'}</b>${session.speechBlocked ? ' (paused this session)' : ''} · recognizer ${speechSupported() ? 'available' : 'not available in this browser'} · Chinese voice for 🔊: ${hasZhVoice() ? 'found' : 'not found (default voice used)'}</p>
    <div class="card">Parent check: ${a} × ${b} = <input type="number" id="pc"> <button id="toggle">${S.consent.speech ? 'Turn speech OFF' : 'Allow speech (sends audio to the browser\'s speech service)'}</button></div>
    <div class="card" style="margin-top:8px" data-testid="audio-settings"><b>🔊 Sound</b> (saved on this device)
      ${(['master', 'music', 'sfx'] as const).map(k => `<label style="margin-left:10px">${({ master: 'Master', music: 'Music', sfx: 'Effects' })[k]}
        <input type="range" min="0" max="100" value="${Math.round(audioSettings()[k] * 100)}" data-vol="${k}" data-testid="vol-${k}"></label>`).join('')}
      <label style="margin-left:10px"><input type="checkbox" id="mute" data-testid="audio-mute" ${audioSettings().muted ? 'checked' : ''}> Mute all</label></div>
    <div class="row"><button class="secondary" id="back">⬅ Back</button></div></div>`);
  $$('[data-vol]').forEach(el => el.addEventListener('input', () => setAudio({ [el.dataset.vol!]: +(el as HTMLInputElement).value / 100 })));
  $('#mute').addEventListener('change', () => setAudio({ muted: ($('#mute') as HTMLInputElement).checked }));
  on('#toggle', async () => {
    if (+(($('#pc') as HTMLInputElement).value) !== a * b) { toast('Parent check failed'); return; }
    if (S.consent.speech) S.consent.speech = false;
    else if (!speechSupported()) toast('No speech recognition in this browser.');
    else if (await requestMic()) { S.consent.speech = true; session.speechBlocked = false; } else toast('Microphone permission denied.');
    save(); settings();
  });
  on('#back', town);
}

// =============== location ===============
export async function enterLocation(id: string, fromTown = false) {
  const l = LOC[id]; const st = S.locs[id]; setCurrentLoc(id);
  S.where = id;
  if (fromTown) st.approachArmed = true;
  save();
  if (!st.previewSeen) { await preview(id); st.previewSeen = true; save(); }
  locationScreen(id);
}
function armApproach(id: string) {
  const st = S.locs[id];
  if (st.pathCleared >= LOC[id].pathFights && st.approachArmed) { st.patrolsLeft = readiness(id).ready ? 0 : B.learning.patrolsPerTrip; st.approachArmed = false; save(); }
}
export function locationScreen(id: string, note = '') {
  const l = LOC[id]; const st = S.locs[id]; setCurrentLoc(id); view.mode('map', parseInt(l.bg), BG.map(l)); playMusic('mus_village'); hud(); armApproach(id);
  const rd = readiness(id); const pathDone = st.pathCleared >= l.pathFights;
  const underLv = S.level <= l.recLevel[0] - 2;
  const innAt = new Set(B.inns.nodes.map((n: any) => n.at));
  const nodes = Array.from({ length: l.pathFights }, (_, i) => `${innAt.has(i) ? '<span title="inn">🛏️</span>' : ''}<span class="${i < st.pathCleared ? 'done' : i === st.pathCleared ? 'here' : ''}">${i < st.pathCleared ? '✓' : '⚔️'}</span>`).join('')
    + `${innAt.has(l.pathFights) ? '<span title="inn">🛏️</span>' : ''}<span class="${pathDone ? 'here' : ''}">🚧</span><span>${st.bossDefeated ? '✓' : '👑'}</span>`;
  const innHere = B.inns.nodes.find((n: any) => n.at === Math.min(st.pathCleared, l.pathFights));
  let actions = '';
  if (!pathDone) actions = `<button data-act="path" data-testid="act-path">⚔️ Next fight (${st.pathCleared + 1}/${l.pathFights})</button>`;
  else if (st.patrolsLeft > 0) actions = `<p>🚧 Boss approach: <b>${st.patrolsLeft}</b> patrol${st.patrolsLeft > 1 ? 's' : ''} block${st.patrolsLeft > 1 ? '' : 's'} the path (words not ready yet).</p>
      <button data-act="patrol" data-testid="act-patrol">⚔️ Fight the patrol</button>`;
  else actions = `<p>${rd.ready ? '✨ <b>Ready!</b> The boss gate glows.' : 'The boss gate is open. You can train more or face the boss now.'}</p>
      <button data-act="boss" data-testid="act-boss">👑 Enter the boss lair${st.bossCheckpoint ? ' (🚩 checkpoint: boss at 50%)' : ''}</button>
      <button class="secondary" data-act="train" data-testid="act-train">🏋️ ${rd.ready ? 'Fight a wandering patrol' : 'Train (fight a patrol)'}</button>`;
  render(`<div class="panel" data-testid="location" data-loc="${id}"><h1>${l.emoji} ${l.zh} ${l.name}</h1>
    ${note ? `<div class="card">${note}</div>` : ''}
    ${underLv ? `<div class="banner">⚠️ Recommended level ${l.recLevel[0]}–${l.recLevel[1]}. You are level ${S.level}.</div>` : ''}
    <div class="path">${nodes}</div>
    <p style="text-align:center" data-testid="readiness">📚 Ready words: <b>${rd.n} / ${rd.total}</b> (need ${rd.need} for the patrols to leave) ${st.bossDefeated ? '· 👑 boss beaten' : ''}</p>
    <div style="text-align:center">${actions}</div>
    <div class="row" style="margin-top:10px">
      ${innHere ? `<button class="secondary" data-act="inn" data-testid="act-inn">🛏️ ${innHere.name} (${innPrice(id)} 🪙)</button>` : ''}
      <button class="secondary" data-act="preview" data-testid="act-preview">📖 Word preview</button>
      <button class="secondary" data-act="practice" data-testid="act-practice">🎯 Practice</button>
      <button class="secondary" data-act="items" data-testid="act-items">🍯 Items</button>
      <button class="secondary" data-act="equip">🎒 Gear</button>
      <button class="secondary" data-act="walk" data-testid="act-walk">🏠 Walk back to town</button>
      <button class="secondary" data-act="feather" data-testid="act-feather" ${(S.inv.feather || 0) > 0 ? '' : 'disabled'}>🪶 Return Feather ×${S.inv.feather || 0}</button></div></div>`);
  on('[data-act]', async (_e, el) => {
    const a = el.dataset.act!;
    if (a === 'path') return doBattle(id, 'path');
    if (a === 'patrol' || a === 'train') return doBattle(id, 'patrol');
    if (a === 'boss') return doBattle(id, 'boss');
    if (a === 'preview') { await preview(id); return locationScreen(id); }
    if (a === 'practice') { await practiceMenu(id); return locationScreen(id); }
    if (a === 'inn') return inn('', id, innHere.at);
    if (a === 'items') return itemsScreen(() => locationScreen(id));
    if (a === 'equip') return equip(() => locationScreen(id));
    if (a === 'feather') {
      // v3: warp to the last inn used (or this location's entrance inn if none yet)
      const t = S.lastInn || { place: id, node: 0 }; S.inv.feather--;
      if (t.place === 'town' || t.node < LOC[t.place].pathFights) for (const l2 of LOCATIONS) S.locs[l2.id].approachArmed = true;
      save(); toast(`🪶 Whoosh! You fly to ${t.place === 'town' ? 'the village inn' : 'the inn'}.`);
      if (t.place === 'town') { S.where = 'town'; view.mode('town', undefined, BG.village()); } else { S.where = t.place; setCurrentLoc(t.place); }
      return inn(`🪶 The Return Feather carried you to ${innName(t.place, t.node)}.`, t.place, t.node);
    }
    if (a === 'walk') {
      if (st.pathCleared > 0 && Math.random() < B.economy.walkBackEncounterChance) { await dialog('👣 On the road…', 'A wild monster jumps out on your way home!', ['Fight!']); return doBattle(id, 'walk'); }
      return town();
    }
  });
}

async function doBattle(id: string, kind: BattleKind) {
  const st = S.locs[id];
  const res = await runBattle(id, kind, kind === 'path' ? st.pathCleared + 1 : 0);
  if (res.outcome === 'defeat') return defeat(id);
  if (res.outcome === 'flee') return kind === 'walk' ? town() : locationScreen(id, '🏃 You got away safely.');
  let extra = '';
  if (kind === 'path') st.pathCleared = Math.min(LOC[id].pathFights, st.pathCleared + 1);
  if (kind === 'patrol') { st.patrolsFought++; if (st.patrolsLeft > 0) st.patrolsLeft--; }
  if (kind === 'boss') {
    const first = !st.bossDefeated; st.bossDefeated = true;
    const i = LOCATIONS.findIndex(l => l.id === id); const next = LOCATIONS[i + 1];
    if (next && !S.locs[next.id].unlocked) { S.locs[next.id].unlocked = true; extra += `<p>🗺️ <b>${next.emoji} ${next.zh} ${next.name}</b> is now unlocked!</p>`; }
    if (first) { refreshSkills(S); extra += `<p>${esc(LOC[id].bossReward.text)}</p>`; }
  }
  save();
  await rewards(res, extra);
  if (kind === 'walk') return town();
  if (kind === 'boss') return town();
  locationScreen(id);
}

function rewards(r: BattleResult, extra: string): Promise<void> {
  hud();
  return new Promise(res => {
    render(`<div class="panel" data-testid="victory"><h1>🎉 Victory!</h1>
      <div class="grid"><div class="card">⭐ +${r.exp} EXP${r.levels ? `<br>🎉 Level up! Now level ${S.level}` : ''}</div><div class="card">🪙 +${r.gold} gold</div>
      <div class="card">❓ ${r.correct}/${r.questions - r.voids} correct${r.spoken ? ` · 🎤 ${r.spoken} spoken` : ''}${r.voids ? ` · ${r.voids} skipped` : ''}${r.tired ? '<br>😪 Enemies got tired' : ''}</div></div>
      ${r.loot.length ? `<h3>🎁 Treasure</h3><div>${r.loot.map(esc).join('<br>')}</div>` : ''}
      ${r.learned.length ? `<h3>🏅 New proficient words</h3><div class="zh">${r.learned.map(i => ITEM[i].zh).join('、')}</div>` : ''}
      ${extra}<p class="muted">HP and MP do not refill by themselves. Rest at the inn or drink a potion.</p>
      <div class="row"><button id="ok" data-testid="victory-ok">Continue ▶</button></div></div>`);
    on('#ok', () => res());
  });
}

// Defeat (spec §7.5): wake at the inn, full HP/MP, lose max(10% gold, inn price) but never below 2 inn stays; Courage +1; broke potion.
export function wakePlace() { return S.lastInn || { place: 'town', node: 0 }; }
export function applyDefeat(): { fee: number; potion: boolean } {
  const w = wakePlace(); const price = innPrice(w.place); const e = B.economy;
  const floor = e.defeatFloorInns * price;
  const fee = Math.max(0, Math.min(Math.round(Math.max(e.defeatFeePct * S.gold, price)), S.gold - floor));
  S.gold -= fee; S.stats.defeats++;
  S.courage = Math.min(e.courageMaxStacks, S.courage + 1);
  const h = heroStats(); S.hp = h.maxHp; S.mp = h.maxMp;
  let potion = false;
  if ((S.inv.honey || 0) + (S.inv.bighoney || 0) === 0 && S.gold < price) { S.inv[e.brokePotion] = (S.inv[e.brokePotion] || 0) + 1; potion = true; }
  for (const l of LOCATIONS) S.locs[l.id].approachArmed = true;
  S.where = w.place; save();
  return { fee, potion };
}
function defeat(id: string) {
  const { fee, potion } = applyDefeat(); hud(); const w = wakePlace();
  if (w.place === 'town') view.mode('town', undefined, BG.village()); else { setCurrentLoc(w.place); view.mode('map', parseInt(LOC[w.place].bg), BG.map(LOC[w.place])); }
  const h = heroStats();
  inn(`<div data-testid="defeat-msg">😵 <b>You fainted!</b> Your friends carried you back to the last inn you rested at.<br>
    You keep all your items, EXP and treasure. ${fee ? `The doctor's fee was ${fee} 🪙.` : 'The doctor treated you for free.'}<br>
    ❤️ HP and MP fully restored.${potion ? '<br>🍯 The innkeeper gives you a free Honey Potion.' : ''}<br>
    💪 Courage +${Math.round((h.courageMult - 1) * 100)}% DEF until your next win.${S.locs[id].bossCheckpoint ? '<br>🚩 Your boss checkpoint is saved.' : ''}</div>`, w.place, w.node);
}

// =============== preview + quick practice ===============
export function preview(id: string): Promise<void> {
  const l = LOC[id]; const ids = POOLS[id];
  view.mode('map', parseInt(l.bg), BG.map(l)); playMusic('mus_village');
  return new Promise(res => {
    const show = () => {
      render(`<div class="panel" data-testid="preview"><h1>📖 ${l.zh} ${l.name}: words you'll meet</h1>
        <p class="muted">Tap 🔊 to hear each word${hasZhVoice() ? '' : ' (🔊 is greyed out if this device has no Chinese voice)'}. Try a quick practice before you go!</p>
        <table class="mastery"><tr><th>汉字</th><th>🔊</th><th>English</th><th>Progress</th></tr>
        ${ids.map(i => { const it = ITEM[i]; return `<tr><td class="zhc" style="font-size:1.5rem">${it.zh}</td><td>${sayBtn(i, 'style="padding:2px 8px"')}</td><td>${esc(it.en)}</td>
          <td>${prog(i).seen ? pips(i) : '<span class="tag">new</span>'}</td></tr>`; }).join('')}</table>
        <div class="row" style="margin-top:10px"><button id="prac" data-testid="practice">🎯 Practice modes</button><button class="secondary" id="done" data-testid="preview-done">Let's go! ▶</button></div></div>`);
      wireSayButtons($('[data-testid="preview"]'));
      on('#prac', async () => { await practiceMenu(id); show(); });
      on('#done', () => res());
    };
    show();
  });
}
async function practice(pool: string[]) {
  // Unscored practice: tap questions in both reading directions. Does not change proficiency.
  const ids = [...pool].sort((a, b) => (prog(a).seen ? 1 : 0) - (prog(b).seen ? 1 : 0) || Math.random() - 0.5).slice(0, 8);
  let right = 0;
  for (let k = 0; k < ids.length; k++) {
    const id = ids[k]; const it = ITEM[id]; const zhToEn = k % 2 === 0;
    const opts = [id, ...distractors(id, 2)].sort(() => Math.random() - 0.5);
    render(`<div class="panel" data-testid="practice-q"><h2>🎯 Practice ${k + 1}/${ids.length}</h2>
      <div style="text-align:center">${zhToEn ? `<div class="zh-big">${it.zh}</div><button class="secondary" id="say">🔊</button>` : `<div class="prompt">Which one is <b>“${esc(it.enPrimary)}”</b>?</div>`}
      <div class="options">${opts.map(o => `<button data-o="${o}" data-testid="opt">${zhToEn ? esc(ITEM[o].enPrimary) : ITEM[o].zh}</button>`).join('')}</div><div id="fb"></div>
      <button class="secondary" id="quit" style="margin-top:10px">Stop practice</button></div></div>`);
    (window as any).__proto.q = { id, answerId: id, practice: true };
    if (zhToEn) { on('#say', () => speak(it.zh)); speak(it.zh); }
    const pick = await new Promise<string>(r => { on('[data-o]', (_e, el) => r(el.dataset.o!)); on('#quit', () => r('__quit')); });
    if (pick === '__quit') break;
    $$('[data-o]').forEach(b => { if (b.dataset.o === id) b.classList.add('right'); else if (b.dataset.o === pick) b.classList.add('wrong'); });
    if (pick === id) right++;
    $('#fb').innerHTML = `<div class="feedback ${pick === id ? 'ok' : 'bad'}">${pick === id ? '✅' : '❌'} ${it.zh} = ${esc(it.en)}</div>`;
    if (pick !== id) speak(it.zh);
    await sleep(pick === id ? 600 : 1500);
  }
  (window as any).__proto.q = null;
  await dialog('🎯 Practice done', `You got ${right} right. Practice doesn't change your battle progress. Words become Proficient in battle.`);
}
export function pips(id: string) {
  const p = prog(id); return `<span class="pips">${activeWays(id).map(w => '●'.repeat(Math.min(2, p.ways[w].c)) + '○'.repeat(2 - Math.min(2, p.ways[w].c))).join(' ')}</span>${proficient(id) ? ' 🏅' : ''}`;
}

// =============== debug panel ===============
export function debugPanel(onChange: () => void) {
  const h = heroStats();
  const rows = LOCATIONS.flatMap(l => POOLS[l.id].map(id => ({ id, l })));
  const m = modal(`<div class="panel" data-testid="debug"><h2>🐞 Debug panel</h2>
    <div class="row" style="justify-content:flex-start">
      Gold <input type="number" id="dg" value="${S.gold}" data-testid="dbg-gold"> Level <input type="number" id="dl" value="${S.level}" data-testid="dbg-level">
      HP <input type="number" id="dh" value="${S.hp}" data-testid="dbg-hp"> (max ${h.maxHp}) MP <input type="number" id="dm" value="${S.mp}">
      <button id="apply" data-testid="dbg-apply">Apply</button></div>
    <div class="row" style="justify-content:flex-start">
      <button class="secondary" id="clearpath" data-testid="dbg-clearpath">Clear path fights (this location; all if in town)</button>
      <button class="secondary" id="unlock">Unlock all locations</button>
      <button class="secondary" id="export">Export save JSON</button>
      <button class="danger" id="reset" data-testid="dbg-reset">Reset everything</button>
      <button id="close" data-testid="dbg-close">Close</button></div>
    <p class="muted">Speech: consent ${S.consent.speech ? 'yes' : 'no'}, session ${session.speechBlocked ? 'paused (' + esc(session.speechBlockReason) + ')' : 'ok'}, voids ${session.voids}. Stats: ${esc(JSON.stringify(S.stats))}. Courage ${S.courage}.
      ${LOCATIONS.map(l => { const r = readiness(l.id); return `${l.name}: ready ${r.n}/${r.total} (trigger ${Math.round(r.trigger * 100)}%), path ${S.locs[l.id].pathCleared}, patrols left ${S.locs[l.id].patrolsLeft}`; }).join(' · ')}</p>
    <h3>Item mastery (correct/attempts, Leitner box)</h3>
    <table class="mastery" data-testid="mastery"><tr><th>Loc</th><th>Item</th><th>English</th>${ALL_WAYS.map(w => `<th>${WAY_LABEL[w]}</th>`).join('')}<th>Progress</th><th>Proficient</th></tr>
    ${rows.map(({ id, l }) => { const p = prog(id); const it = ITEM[id]; return `<tr style="${p.seen ? '' : 'opacity:.45'}"><td>${l.emoji}</td><td class="zhc">${it.zh}</td><td>${esc(it.enPrimary)}</td>
      ${ALL_WAYS.map(w => { const ws = p.ways[w]; const act = activeWays(id).includes(w); return `<td style="${act ? '' : 'opacity:.4'}">${ws.c}/${ws.a} b${ws.box}</td>`; }).join('')}
      <td>${Math.round(progress(id) * 100)}%</td><td>${proficient(id) ? '🏅' : ''}</td></tr>`; }).join('')}</table>
    <textarea id="exp" class="hidden" style="width:100%;height:120px"></textarea></div>`);
  on('#apply', () => {
    S.gold = Math.max(0, +(($('#dg') as HTMLInputElement).value) | 0);
    const lv = Math.max(1, +(($('#dl') as HTMLInputElement).value) | 0); S.level = lv; if (S.exp >= expToNext(lv)) S.exp = 0; refreshSkills(S);
    S.hp = +(($('#dh') as HTMLInputElement).value) | 0; S.mp = +(($('#dm') as HTMLInputElement).value) | 0; clampHpMp(); save(); hud(); closeModal(); onChange();
  }, m);
  on('#clearpath', () => { for (const l of LOCATIONS.filter(x => S.where === 'town' || x.id === S.where)) { S.locs[l.id].pathCleared = l.pathFights; S.locs[l.id].approachArmed = true; } save(); closeModal(); onChange(); }, m);
  on('#unlock', () => { for (const l of LOCATIONS) S.locs[l.id].unlocked = true; save(); closeModal(); onChange(); }, m);
  on('#export', () => { const t = $('#exp') as HTMLTextAreaElement; t.classList.remove('hidden'); t.value = JSON.stringify(S); }, m);
  on('#reset', async () => { closeModal(); if ((await dialog('Reset?', 'Delete all progress and start over?', ['Yes, reset', 'Cancel'])) === 0) { resetAll(); location.reload(); } }, m);
  on('#close', () => closeModal(), m);
  void bossPool; void replaceState; void practice;
}
