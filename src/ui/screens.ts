import { B, LOCATIONS, LOC, GEAR, GEAR_LIST, CONS, CONSUMABLES, SKILLS, ITEM, POOLS, ENEMIES, LocationDef } from '../data';
import { S, save, heroStats, innPrice, consPrice, speechOn, session, skillSlots, refreshSkills, resetAll, clampHpMp, expToNext, WAY_LABEL, ALL_WAYS, replaceState } from '../engine/state';
import { readiness, prog, proficient, progress, activeWays, distractors, bossPool } from '../engine/learning';
import { runBattle, setCurrentLoc, BattleResult, BattleKind } from '../engine/battle';
import { speak, speechSupported, requestMic, hasZhVoice } from '../engine/speech';
import { sayBtn, wireSayButtons } from '../engine/voice';
import { playMusic, playSfx, unlockAudio, audioSettings, setAudio } from '../audio/audio';
import { BG, assets } from '../assets';
import { view } from '../phaser/view';
import { $, $$, esc, render, on, hud, toast, dialog, modal, closeModal, sleep, zh, dlg, setTitle, bookHtml, wireBook, chunk } from './dom';
import { practiceMenu } from './practice';

const bgUrl = (keys: string[]) => { const k = keys.find(x => assets().bg[x]); return k ? assets().bg[k] : ''; };
const locTitle = (l: LocationDef) => `${l.emoji} ${zh(l.zh)} ${esc(l.name)}`;

// =============== consent (first launch) ===============
export function consentScreen() {
  view.mode('town', undefined, BG.village()); setTitle(null);
  const a = 3 + Math.floor(Math.random() * 6), b = 4 + Math.floor(Math.random() * 5);
  render(dlg({ testid: 'consent', close: false, title: '👋 Grown-ups first!', body: `
    <p>This is a prototype of a Chinese-learning adventure game for kids. A parent or guardian should set it up.</p>
    <div class="card"><b>🎤 Speaking questions</b> (on by default, you can turn them off)
      <p class="muted">Some questions can be answered by speaking. In Chrome the voice audio is sent to Google's speech service to turn it into text.
      This game does not record or store audio; it keeps only the recognized text on this device. Tones are not graded. Works in Chrome/Edge only.</p>
      <label><input type="checkbox" id="sp" data-testid="consent-speech" checked> Allow speaking questions (the mic turns on only when my child taps 🎤)</label></div>
    <div class="card" style="margin-top:10px"><b>Parent check:</b> what is ${a} × ${b}? <input type="number" id="pc" data-testid="consent-answer"></div>
    <p class="muted">Progress is saved only in this browser (localStorage). No accounts, no ads, no data leaves this device except speech audio if you allow it.</p>
    <div id="err"></div>`, foot: `<button id="ok" data-testid="consent-ok" data-key="enter">I'm a parent/guardian: Start ▶</button>` }));
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
    save(); hud(); town();
  });
}

// =============== village hub: the art is the menu (spec §6.1) ===============
/** The location the child is working on: first unlocked one whose boss is not beaten (else the last unlocked). */
export function frontier() { const u = LOCATIONS.filter(l => S.locs[l.id].unlocked); return u.find(l => !S.locs[l.id].bossDefeated) || u[u.length - 1]; }
const VILLAGE = {   // signboards (centre x, top y) and building hotspots, in frame coordinates on bg_village
  inn: { sign: [214, 150], hot: [40, 250, 270, 250], z: '🛏️ 客栈', e: 'Inn · rest', tid: 'go-inn' },
  equip: { sign: [477, 176], hot: [340, 290, 210, 210], z: '⚔️ 装备', e: 'Gear & skills', tid: 'go-equip' },
  shop: { sign: [688, 186], hot: [580, 300, 190, 200], z: '🧪 商店', e: 'Shop', tid: 'go-shop' },
  words: { sign: [910, 138], hot: [800, 240, 240, 190], z: '📖 学堂', e: 'Words & practice', tid: 'go-words' },
  gate: { sign: [1175, 288], hot: [1090, 390, 180, 190], z: '🗺️ 出发', e: 'Adventure', tid: 'go-gate' },
} as const;
export function town() {
  S.where = 'town'; save(); view.mode('town', undefined, BG.village()); playMusic('mus_village'); hud();
  setTitle(`🏘️ ${zh('小山村')} Little Hill Village`);
  const h = heroStats(); const fl = frontier();
  // one suggestion at a time
  const potionP = consPrice('honey');
  const hasPotion = (S.inv.honey || 0) + (S.inv.bighoney || 0) > 0;
  const tip: { at: keyof typeof VILLAGE; line: string } =
    S.hp < h.maxHp * 0.5 ? { at: 'inn', line: `The inn is warm! Rest, then let's go to the ${esc(fl.name.split(' ').pop()!.toLowerCase())}.` }
    : !S.locs[fl.id].previewSeen ? { at: 'words', line: `New words wait in ${zh(fl.zh)} ${esc(fl.name)}! Let's peek in the 学堂 first.`.replace('学堂', zh('学堂')) }
    : !hasPotion && S.gold >= potionP ? { at: 'shop', line: `We have ${S.gold} 🪙. A honey potion (${potionP} 🪙) would help us!` }
    : { at: 'gate', line: `Ready? Let's go to ${zh(fl.zh)} ${esc(fl.name)}!` };
  const sign = (k: keyof typeof VILLAGE) => { const v = VILLAGE[k]; const [z1, z2] = v.z.split(' ');
    return `<button class="hot" data-go="${k}" aria-label="${v.e}" style="left:${v.hot[0]}px;top:${v.hot[1]}px;width:${v.hot[2]}px;height:${v.hot[3]}px"></button>
      <button class="sign${k === 'gate' ? ' gold' : ''}" data-go="${k}" data-testid="${v.tid}" style="left:${v.sign[0]}px;top:${v.sign[1]}px"><span class="z">${z1} <span lang="zh-CN">${z2}</span></span><span class="e">${v.e}</span></button>`; };
  const bang = VILLAGE[tip.at].sign;
  render(`<div data-testid="town" class="screen">
    ${(Object.keys(VILLAGE) as (keyof typeof VILLAGE)[]).map(sign).join('')}
    <div class="bang" data-testid="suggest" data-at="${tip.at}" style="left:${bang[0] + 62}px;top:${bang[1] - 52}px">❗</div>
    ${session.speechBlocked && S.consent.speech ? `<div class="tip warn" style="left:440px;top:92px">🔇 ${esc(session.speechBlockReason || 'Speech is off for this session.')}</div>` : ''}
    <div class="bottombar panel">
      <button class="secondary" data-go="bag" data-testid="go-items" data-key="1"><span class="ic">🎒</span>Bag</button>
      <div class="hint" data-testid="companion-hint">🐲 ${zh('小龙')}: “${tip.line}”</div>
      <button class="primary" data-go="gate" data-testid="go-adventure" data-key="enter"><span class="ic">🗺️</span><span><span class="zh" lang="zh-CN">出发</span><span class="en">Adventure</span></span></button>
    </div></div>`);
  on('[data-go]', (_e, el) => {
    const g = el.dataset.go!;
    if (g === 'inn') return inn();
    if (g === 'shop') return shop();
    if (g === 'equip') return equip(town);
    if (g === 'bag') return itemsScreen(town);
    if (g === 'words') { setCurrentLoc(fl.id); return preview(fl.id).then(() => { S.locs[fl.id].previewSeen = true; save(); town(); }); }
    if (g === 'gate') return worldMap();
  });
}

// =============== world map: "Where to?" location cards (spec §6.1) ===============
export function worldMap() {
  view.mode('map', parseInt(frontier().bg), BG.map(frontier())); setTitle('🗺️ Where to?'); hud();
  const card = (l: LocationDef, i: number) => { const st = S.locs[l.id]; const prev = LOCATIONS[i - 1];
    const sub = st.unlocked ? `Lv ${l.recLevel[0]}–${l.recLevel[1]} · ${st.pathCleared >= l.pathFights ? 'path cleared' : `fight ${st.pathCleared + 1} of ${l.pathFights}`} · ${st.bossDefeated ? '👑 cleared' : '👑 not beaten'}`
      : `🔒 Lv ${l.recLevel[0]}–${l.recLevel[1]} · beat ${prev ? zh(bossName(prev)) : 'the boss'} to open`;
    return `<button class="loccard" data-loc="${l.id}" data-testid="loc-${l.id}" data-key="${i + 1}" ${st.unlocked ? '' : 'disabled'} style="left:${LOCATIONS.length === 1 ? 430 : 150 + i * 560}px">
      <div class="art" style="background-image:url(${bgUrl(BG.map(l))})"></div>${st.unlocked ? '' : '<div class="lock">🔒</div>'}
      <div class="cap"><div class="nm">${l.emoji} ${zh(l.zh)} ${esc(l.name)}</div><div class="sub">${sub}</div></div></button>`; };
  render(`<div data-testid="worldmap" class="screen">${LOCATIONS.map(card).join('')}
    <div class="bottombar panel"><button class="secondary" id="wback" data-testid="world-back"><span class="ic">◀</span>Village</button>
      <div class="hint">Pick a place. Locked places tell you how to open them.</div></div></div>`);
  on('[data-loc]', (_e, el) => enterLocation(el.dataset.loc!, true));
  on('#wback', town);
}
const bossName = (l: LocationDef) => ENEMIES[l.boss]?.zh || l.boss;

// =============== inn (dialog in the frame) ===============
export function innName(place: string, node = 0) {
  if (place === 'town') return `🛏️ ${zh('熊猫客栈')} Sleepy Panda Inn`;
  const n = B.inns.nodes.find((x: any) => x.at === node) || B.inns.nodes[0];
  return `🏕️ ${zh(n.zh)} ${esc(n.name)}`;
}
/** Inn at the village (place 'town') or at a location node (entrance 0 / midpoint / boss approach). */
export function inn(msg = '', place = 'town', node = 0) {
  hud(); const price = innPrice(place); const h = heroStats(); const broke = S.gold < price;
  const backTo = () => place === 'town' ? town() : locationScreen(place);
  if (place === 'town') view.mode('town', undefined, BG.inn());
  playMusic('mus_village');
  render(dlg({ testid: 'inn', cls: 'narrow', attrs: `data-place="${place}" data-node="${node}"`, title: innName(place, node), body: `
    ${msg ? `<div class="card" data-testid="inn-msg">${msg}</div>` : ''}
    <p>❤️ HP ${S.hp}/${h.maxHp} · 🔷 MP ${S.mp}/${h.maxMp}</p><p class="muted">A night's rest restores all HP and MP.</p>`,
    foot: `<button id="stay" data-testid="inn-stay" data-key="enter">${broke ? '😴 Rest for free<span class="en">you are short on gold</span>' : `😴 Stay the night<span class="en">${price} 🪙</span>`}</button>
      ${place !== 'town' ? `<button class="secondary" id="ipr" data-testid="inn-practice">🎯 Practice words</button>` : ''}` }));
  on('#ipr', async () => { await practiceMenu(place); inn('', place, node); });
  on('#stay', () => {
    const hs = heroStats(); let m;
    if (S.gold < price) {
      S.stats.freeInn++; m = `🐼 “Rest, little hero, pay me later!” (free stay)`;
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
  hud(); view.mode('town', undefined, BG.village());
  const gear = GEAR_LIST.filter(g => g.shop && (!g.shopRequires || S.locs[g.shopRequires]?.unlocked));
  const statTxt = (g: any) => [g.atk ? `⚔️+${g.atk}` : '', g.def ? `🛡️+${g.def}` : '', g.mp ? `🔷+${g.mp} MP` : ''].filter(Boolean).join(' ');
  render(dlg({ testid: 'shop', title: `🧪 ${zh('商店')} Grandma Wu's Shop <span class="tag">🪙 ${S.gold}</span>`, body: `
    <h3>Potions & tools</h3><div class="grid">${CONSUMABLES.map(c => `<div class="card"><div>${c.emoji} ${zh(c.zh)} ${esc(c.en)}</div>
      <div class="muted">${c.healHpFrac ? `+${c.healHpFrac * 100}% HP` : c.healMpFrac ? `+${c.healMpFrac * 100}% MP` : 'Warp to the last inn you used (map only)'} · you have ${S.inv[c.id] || 0}${c.carryLimit ? ` (max ${c.carryLimit})` : ''}</div>
      <button data-buyc="${c.id}" data-testid="buy-${c.id}" ${S.gold >= consPrice(c.id) && !(c.carryLimit && (S.inv[c.id] || 0) >= c.carryLimit) ? '' : 'disabled'}>${c.carryLimit && (S.inv[c.id] || 0) >= c.carryLimit ? 'Bag full' : `Buy ${consPrice(c.id)} 🪙`}</button></div>`).join('')}</div>
    <h3 style="margin-top:14px">Weapons, armor, shields & charms</h3><div class="grid">${gear.map(g => { const own = S.gear.includes(g.id); return `<div class="card">
      <div>${g.emoji} ${zh(g.zh)} ${esc(g.en)}</div><div class="muted">${g.slot} · tier ${g.tier} · ${statTxt(g)}${g.slot === 'charm' ? ` · charm slot opens at Lv ${B.slots.charmUnlockLevel}` : ''}</div>
      ${own ? `<button class="secondary" disabled>Owned</button> ${S.equip[g.slot] !== g.id ? `<button data-eq="${g.id}" data-testid="equip-${g.id}">Equip</button>` : '<span class="tag">equipped</span>'}`
        : `<button data-buyg="${g.id}" data-testid="buy-${g.id}" ${S.gold >= g.price ? '' : 'disabled'}>Buy ${g.price} 🪙</button>`}</div>`; }).join('')}</div>` }));
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
  render(dlg({ testid: 'equip', title: `⚔️ ${zh('装备')} Gear & Skills`, body: `
    <p>Level ${S.level} (EXP ${S.exp}/${expToNext(S.level)}) · ❤️ ${h.maxHp} · 🔷 ${h.maxMp} · ⚔️ ATK ${h.atk} · 🛡️ DEF ${h.def}</p>
    <div class="grid">${slotNames.map(sl => { const locked = sl === 'charm' && S.level < B.slots.charmUnlockLevel; const owned = S.gear.filter(id => GEAR[id].slot === sl);
      return `<div class="card"><h3>${sl}${locked ? ` 🔒 (Lv ${B.slots.charmUnlockLevel})` : ''}</h3>
      ${owned.length ? owned.map(id => { const g = GEAR[id]; const on_ = S.equip[sl] === id;
        return `<div style="margin-bottom:8px"><button class="${on_ ? '' : 'secondary'}" data-eq="${id}" data-testid="eq-${id}" ${locked ? 'disabled' : ''}>${on_ ? '✅ ' : ''}${g.emoji} ${zh(g.zh)} ${esc(g.en)} ${stat(g)}${g.rarity !== 'common' ? ` (${g.rarity})` : ''}</button></div>`; }).join('') : '<div class="muted">nothing yet</div>'}
      ${S.equip[sl] ? `<button class="ghost" data-uneq="${sl}">Take off</button>` : ''}</div>`; }).join('')}</div>
    <h3 style="margin-top:14px">✨ ${zh('技能')} Skills (${S.skillsEquipped.length}/${slots} slots)</h3>
    <div class="grid">${SKILLS.map(sk => { const known = S.skills.includes(sk.id); const eq = S.skillsEquipped.includes(sk.id);
      const u = sk.unlock; const how = u.start ? 'start' : u.level ? `Level ${u.level}` : `beat the ${LOC[u.boss!].name} boss`;
      return `<div class="card" style="${known ? '' : 'opacity:.6'}"><div>${sk.emoji} ${zh(sk.zh)} ${esc(sk.en)}</div><div class="muted">${esc(sk.desc)}<br>${sk.mp} MP${sk.perBattle ? ` · ${sk.perBattle}/battle` : ''}${sk.cooldownRounds ? ` · every ${sk.cooldownRounds} rounds` : ''}</div>
      ${known ? `<button data-sk="${sk.id}" data-testid="sk-${sk.id}" class="${eq ? '' : 'secondary'}">${eq ? '✅ Equipped' : 'Equip'}</button>` : `<div class="muted">🔒 Unlock: ${how}</div>`}</div>`; }).join('')}</div>` }));
  on('[data-eq]', (_e, el) => { const g = GEAR[el.dataset.eq!]; S.equip[g.slot] = g.id; clampHpMp(); save(); equip(back); });
  on('[data-uneq]', (_e, el) => { (S.equip as any)[el.dataset.uneq!] = null; clampHpMp(); save(); equip(back); });
  on('[data-sk]', (_e, el) => { const id = el.dataset.sk!; const i = S.skillsEquipped.indexOf(id);
    if (i >= 0) S.skillsEquipped.splice(i, 1); else if (S.skillsEquipped.length < slots) S.skillsEquipped.push(id); else toast(`All ${slots} skill slots are full. Unequip one first.`);
    save(); equip(back); });
  on('#back', back);
}

// =============== 🎒 bag: items, gear and (on a map) the Return Feather ===============
export function itemsScreen(back: () => void, mapLoc?: string, onFeather?: () => void) {
  hud();
  render(dlg({ testid: 'items', cls: 'narrow', title: `🎒 Bag`, body: `<div class="grid">${['honey', 'bighoney', 'manatea'].map(id => `<div class="card">${CONS[id].emoji} ${zh(CONS[id].zh)} ${esc(CONS[id].en)} ×${S.inv[id] || 0}
      <div style="margin-top:8px"><button data-use="${id}" data-testid="use-${id}" ${(S.inv[id] || 0) > 0 ? '' : 'disabled'}>Use</button></div></div>`).join('')}
    <div class="card">🪶 ${zh(CONS.feather?.zh || '回城羽毛')} Return Feather ×${S.inv.feather || 0}<div class="muted">Warps you to the last inn you used${mapLoc ? '' : ' (use it on a map)'}</div>
      ${mapLoc ? `<div style="margin-top:8px"><button data-testid="act-feather" id="feather" ${(S.inv.feather || 0) > 0 ? '' : 'disabled'}>Fly 🪶</button></div>` : ''}</div></div>`,
    foot: `<button class="secondary" id="gear" data-testid="act-equip">⚔️ Gear & skills</button>` }));
  on('[data-use]', (_e, el) => { const c = CONS[el.dataset.use!]; const h = heroStats(); S.inv[c.id]--; playSfx('sfx_potion');
    if (c.healHpFrac) S.hp = Math.min(h.maxHp, S.hp + Math.round(c.healHpFrac * h.maxHp)); if (c.healMpFrac) S.mp = Math.min(h.maxMp, S.mp + Math.round(c.healMpFrac * h.maxMp)); save(); itemsScreen(back, mapLoc, onFeather); });
  on('#gear', () => equip(() => itemsScreen(back, mapLoc, onFeather)));
  on('#feather', () => onFeather?.());
  on('#back', back);
}

// =============== ⏸️ pause: word list, battle log, parents (behind the maths gate) ===============
export function pauseMenu() {
  const inBattle = !!document.querySelector('[data-testid="battle"]');
  const m = modal(`<div class="panel" data-testid="pause-menu" style="width:620px;text-align:center"><h2>⏸️ Paused</h2>
    <div style="display:flex;flex-direction:column;gap:16px;align-items:center;margin-top:10px">
      <button id="pclose" data-testid="pause-resume" data-key="enter" style="width:420px">▶ Keep playing</button>
      <button class="secondary" id="pwords" data-testid="pause-words" style="width:420px">📖 Word list</button>
      ${inBattle ? `<button class="secondary" id="plog" data-testid="pause-log" style="width:420px">📜 Battle log</button>` : ''}
      <button class="ghost" id="pparents" data-testid="pause-parents" style="width:420px">👪 Parents</button></div></div>`);
  on('#pclose', closeModal, m);
  on('#pwords', () => wordListModal(S.where !== 'town' && LOC[S.where] ? S.where : frontier().id), m);
  on('#plog', () => modal(`<div class="panel" data-testid="battle-log" style="width:900px"><h2>📜 Battle log</h2><div style="font-size:20px">${$('#blog')?.innerHTML || ''}</div>
    <div class="row" style="margin-top:12px"><button id="pclose" data-key="enter">Close</button></div></div>`) && on('#pclose', closeModal), m);
  on('#pparents', () => parentGate(settings), m);
}
function parentGate(then: () => void) {
  const a = 6 + Math.floor(Math.random() * 4), b = 3 + Math.floor(Math.random() * 6);
  const m = modal(`<div class="panel" data-testid="parent-gate" style="width:620px;text-align:center"><h2>👪 Parents only</h2><p>What is ${a} × ${b}?</p>
    <input type="number" id="pg" data-testid="parent-answer"> <div id="pgerr" class="muted"></div>
    <div class="row" style="margin-top:14px"><button id="pgo" data-testid="parent-ok">Go ▶</button><button class="secondary" id="pclose">Cancel</button></div></div>`);
  ($('#pg') as HTMLInputElement).focus();
  on('#pclose', closeModal, m);
  on('#pgo', () => { if (+(($('#pg') as HTMLInputElement).value) === a * b) then(); else $('#pgerr').textContent = 'Please ask a grown-up.'; }, m);
}
// =============== parent settings (modal, behind the gate) ===============
export function settings() {
  const m = modal(`<div class="panel" data-testid="settings" style="width:1000px"><h2>👪 Parent settings</h2>
    <p>Speech: <b>${S.consent.speech ? 'allowed' : 'off'}</b>${session.speechBlocked ? ' (paused this session)' : ''} · recognizer ${speechSupported() ? 'available' : 'not available in this browser'} · Chinese voice for 🔊: ${hasZhVoice() ? 'found' : 'not found (default voice used)'}</p>
    <div class="card"><button id="toggle">${S.consent.speech ? 'Turn speech OFF' : 'Allow speech (sends audio to the browser\'s speech service)'}</button></div>
    <div class="card" style="margin-top:10px" data-testid="audio-settings"><b>🔊 Sound</b> <span class="muted">(saved on this device)</span><br>
      ${(['master', 'music', 'sfx'] as const).map(k => `<label style="margin-right:16px">${({ master: 'Master', music: 'Music', sfx: 'Effects' })[k]}
        <input type="range" min="0" max="100" value="${Math.round(audioSettings()[k] * 100)}" data-vol="${k}" data-testid="vol-${k}"></label>`).join('')}
      <label><input type="checkbox" id="mute" data-testid="audio-mute" ${audioSettings().muted ? 'checked' : ''}> Mute all</label></div>
    <div class="row" style="margin-top:14px"><button class="secondary" id="pclose" data-key="enter">Done</button></div></div>`);
  $$('[data-vol]', m).forEach(el => el.addEventListener('input', () => setAudio({ [el.dataset.vol!]: +(el as HTMLInputElement).value / 100 })));
  $('#mute', m).addEventListener('change', () => setAudio({ muted: ($('#mute') as HTMLInputElement).checked }));
  on('#toggle', async () => {
    if (S.consent.speech) S.consent.speech = false;
    else if (!speechSupported()) toast('No speech recognition in this browser.');
    else if (await requestMic()) { S.consent.speech = true; session.speechBlocked = false; } else toast('Microphone permission denied.');
    save(); hud(); settings();
  }, m);
  on('#pclose', closeModal, m);
}

// =============== location ===============
export async function enterLocation(id: string, fromTown = false) {
  const st = S.locs[id]; setCurrentLoc(id);
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
type MapNode = { x: number; y: number; kind: 'inn' | 'fight' | 'gate' | 'boss'; fight?: number; innAt?: number };
/** Node positions on the painted path (locations.json mapNodes), mapped onto the logical path: inns, fights, gate, boss. */
function mapNodes(l: LocationDef): MapNode[] {
  const innAt: number[] = B.inns.nodes.map((n: any) => n.at);
  const seq: MapNode[] = [];
  for (let i = 0; i < l.pathFights; i++) { if (innAt.includes(i)) seq.push({ x: 0, y: 0, kind: 'inn', innAt: i }); seq.push({ x: 0, y: 0, kind: 'fight', fight: i }); }
  if (innAt.includes(l.pathFights)) seq.push({ x: 0, y: 0, kind: 'inn', innAt: l.pathFights });
  seq.push({ x: 0, y: 0, kind: 'gate' }, { x: 0, y: 0, kind: 'boss' });
  const data = l.mapNodes && l.mapNodes.length === seq.length && l.mapNodes.every((n, i) => n.kind === seq[i].kind) ? l.mapNodes : null;
  seq.forEach((n, i) => { if (data) { n.x = data[i].x; n.y = data[i].y; } else { n.x = 140 + i * (1000 / (seq.length - 1)); n.y = 500 - Math.sin(i / 2) * 120 - i * 18; } });
  return seq;
}
export function locationScreen(id: string, note = '') {
  const l = LOC[id]; const st = S.locs[id]; setCurrentLoc(id); view.mode('map', parseInt(l.bg), BG.map(l)); playMusic('mus_village'); hud(); armApproach(id);
  setTitle(locTitle(l));
  const rd = readiness(id); const pathDone = st.pathCleared >= l.pathFights;
  const underLv = S.level <= l.recLevel[0] - 2;
  const nodes = mapNodes(l);
  const innNow = Math.min(st.pathCleared, l.pathFights);
  const innHere = B.inns.nodes.find((n: any) => n.at === innNow);
  const idx = (f: (n: MapNode) => boolean) => nodes.findIndex(f);
  const gateI = idx(n => n.kind === 'gate'), bossI = idx(n => n.kind === 'boss');
  const restedHere = S.lastInn && S.lastInn.place === id && S.lastInn.node === innNow;
  let heroI = st.pathCleared === 0 || restedHere ? idx(n => n.kind === 'inn' && n.innAt === innNow) : idx(n => n.fight === st.pathCleared - 1);
  if (pathDone && st.patrolsLeft === 0 && !restedHere) heroI = gateI;
  if (heroI < 0) heroI = 0;
  let act: { a: string; tid: string; label: string; to: number };
  if (!pathDone) act = { a: 'path', tid: 'act-path', label: `Go! Fight ${st.pathCleared + 1}`, to: idx(n => n.fight === st.pathCleared) };
  else if (st.patrolsLeft > 0) act = { a: 'patrol', tid: 'act-patrol', label: 'Fight the patrol', to: gateI };
  else act = { a: 'boss', tid: 'act-boss', label: `Boss!${st.bossCheckpoint ? ' 🚩' : ''}`, to: bossI };
  const nodeHtml = nodes.map((n, i) => {
    let cls = n.kind, ic = '⚔️', tid = '', dis = '';
    if (n.kind === 'fight') { const done = n.fight! < st.pathCleared; cls += done ? ' done' : n.fight === st.pathCleared ? ' next' : ''; ic = done ? '✔' : '⚔️'; tid = `node-f${n.fight}`; }
    else if (n.kind === 'inn') { ic = '🛏️'; if (n.innAt === innNow) { cls += ' here'; tid = 'act-inn'; } }
    else if (n.kind === 'gate') { ic = '🚧'; cls += pathDone && st.patrolsLeft === 0 ? ' done' : pathDone ? ' next' : ''; if (pathDone && st.patrolsLeft === 0) ic = '✔'; }
    else { ic = '👑'; cls += st.bossDefeated ? ' done' : ''; if (pathDone && st.patrolsLeft === 0 && !st.bossDefeated) cls += ' next'; }
    return `<button class="mapnode ${cls}" data-node="${i}" ${tid ? `data-testid="${tid}"` : ''} ${dis} style="left:${n.x}px;top:${n.y}px" aria-label="${n.kind}">${ic}</button>`;
  }).join('');
  const chip = (i: number, html: string, cls = '', dx = 48, dy = -64) => nodes[i] ? `<div class="tip ${cls}" style="left:${nodes[i].x + dx}px;top:${nodes[i].y + dy}px">${html}</div>` : '';
  const chips = [
    !pathDone ? chip(act.to, `⚔️ Fight ${st.pathCleared + 1} of ${l.pathFights}`, '', -70, -86) : '',
    !rd.ready && !st.bossDefeated && (!pathDone || st.patrolsLeft > 0) ? chip(gateI, `🚧 Patrols leave at ${rd.need} ready words (you have ${rd.n})`, 'warn', -520, -60) : '',
    chip(bossI, `${zh(bossName(l))} · Boss${st.bossDefeated ? ' ✔' : ''}`, 'boss', 56, -26),
  ].join('');
  const pts = nodes.map(n => `${n.x},${n.y}`).join(' ');
  render(`<div data-testid="location" data-loc="${id}" class="screen">
    <svg class="mapsvg" width="1280" height="720"><polyline points="${pts}" fill="none" stroke="#fff" stroke-width="6" stroke-dasharray="4 14" stroke-linecap="round" opacity=".9"/></svg>
    ${nodeHtml}${chips}
    <div class="token" id="token" data-testid="hero-token" style="left:${nodes[heroI].x - 65}px;top:${nodes[heroI].y - 118}px"></div>
    <div id="nodetip"></div>
    ${underLv ? `<div class="tip warn" style="left:440px;top:92px">⚠️ Recommended level ${l.recLevel[0]}–${l.recLevel[1]}. You are level ${S.level}.</div>` : ''}
    <div class="bottombar panel">
      <button class="secondary" data-act="walk" data-testid="act-walk"><span class="ic">🏠</span>Town</button>
      <button class="secondary" data-act="bag" data-testid="act-bag"><span class="ic">🎒</span>Bag</button>
      <button class="secondary" data-act="preview" data-testid="act-preview" style="width:220px;line-height:1.1"><span class="ic">📖</span>Words &amp; practice</button>
      <div class="meter" data-testid="readiness">📚 Ready words <b>${rd.n} / ${rd.total}</b><div class="bar gold"><i style="width:${Math.round(100 * rd.n / rd.total)}%"></i></div>
        <span class="muted">${st.bossDefeated ? '👑 boss beaten' : rd.ready ? '✨ Ready for the boss!' : `patrols leave at ${rd.need}`}</span></div>
      ${act.a === 'boss' ? `<button class="secondary" data-act="train" data-testid="act-train" style="width:150px;line-height:1.1">🏋️ Train</button>` : ''}
      <button class="primary" data-act="${act.a}" data-testid="${act.tid}" data-key="enter" style="${act.a === 'boss' ? 'min-width:250px' : ''}"><span class="ic">${act.a === 'boss' ? '👑' : '⚔️'}</span>${act.label}</button>
    </div></div>`);
  if (note) toast(note);
  const paintToken = () => { const t = $('#token'); const tok = view.spriteSheet('hero'); if (!t) return;
    if (tok) { t.innerHTML = ''; Object.assign(t.style, { backgroundImage: `url(sprites/${tok.file})`, backgroundSize: `${130 * tok.frames}px 130px`, backgroundPosition: '0 0' }); }
    else t.innerHTML = '<span style="font-size:80px">🧙</span>'; };
  paintToken(); view.onReady(paintToken);
  // tapping a node shows its info chip; only the next node (via Go) or the current inn can be entered
  $$('.mapnode').forEach(b => b.addEventListener('click', () => {
    const n = nodes[+b.dataset.node!]; if (b.dataset.testid === 'act-inn') return;
    const txt = n.kind === 'fight' ? (n.fight! < st.pathCleared ? `✔ Fight ${n.fight! + 1}: done` : n.fight === st.pathCleared ? `⚔️ Fight ${n.fight! + 1}: press Go!` : `⚔️ Fight ${n.fight! + 1}: ahead`)
      : n.kind === 'inn' ? '🛏️ An inn. Reach it first to rest here.' : n.kind === 'gate' ? (rd.ready ? '🚧 The patrols are gone!' : `🚧 Patrols leave at ${rd.need} ready words (you have ${rd.n})`) : `👑 ${zh(bossName(l))} waits at the big tree.`;
    $('#nodetip').innerHTML = `<div class="tip" style="left:${n.x - 40}px;top:${n.y + 40}px">${txt}</div>`;
    setTimeout(() => { const t = $('#nodetip'); if (t) t.innerHTML = ''; }, 2200);
  }));
  const walk = async (to: number) => {   // the hero token walks the dotted line, 400 ms per node
    const t = $('#token'); if (!t || to < 0) return;
    const step = to >= heroI ? 1 : -1;
    for (let i = heroI + step; step > 0 ? i <= to : i >= to; i += step) { t.style.left = nodes[i].x - 65 + 'px'; t.style.top = nodes[i].y - 118 + 'px'; await sleep(400); }
  };
  on('[data-act]', async (_e, el) => {
    const a = el.dataset.act!;
    if (a === 'path' || a === 'patrol' || a === 'boss' || a === 'train') { $$('.bottombar button').forEach(b => (b as HTMLButtonElement).disabled = true); await walk(a === 'train' ? gateI : act.to); }
    if (a === 'path') return doBattle(id, 'path');
    if (a === 'patrol' || a === 'train') return doBattle(id, 'patrol');
    if (a === 'boss') return doBattle(id, 'boss');
    if (a === 'preview') { await preview(id); return locationScreen(id); }
    if (a === 'bag') return itemsScreen(() => locationScreen(id), id, () => feather(id));
    if (a === 'walk') {
      if (st.pathCleared > 0 && Math.random() < B.economy.walkBackEncounterChance) { await dialog('👣 On the road…', 'A wild monster jumps out on your way home!', ['Fight!']); return doBattle(id, 'walk'); }
      return town();
    }
  });
  on('[data-testid="act-inn"]', () => inn('', id, innHere.at));
}
function feather(id: string) {
  // v3: warp to the last inn used (or this location's entrance inn if none yet)
  if ((S.inv.feather || 0) <= 0) return;
  const t = S.lastInn || { place: id, node: 0 }; S.inv.feather--;
  if (t.place === 'town' || t.node < LOC[t.place].pathFights) for (const l2 of LOCATIONS) S.locs[l2.id].approachArmed = true;
  save(); toast(`🪶 Whoosh! You fly to ${t.place === 'town' ? 'the village inn' : 'the inn'}.`);
  if (t.place === 'town') { S.where = 'town'; view.mode('town', undefined, BG.village()); } else { S.where = t.place; setCurrentLoc(t.place); view.mode('map', parseInt(LOC[t.place].bg), BG.map(LOC[t.place])); }
  return inn(`🪶 The Return Feather carried you to ${innName(t.place, t.node)}.`, t.place, t.node);
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
    if (next && !S.locs[next.id].unlocked) { S.locs[next.id].unlocked = true; extra += `<p>🗺️ <b>${next.emoji} ${zh(next.zh)} ${esc(next.name)}</b> is now unlocked!</p>`; }
    if (first) { refreshSkills(S); extra += `<p>${esc(LOC[id].bossReward.text)}</p>`; }
  }
  save();
  await rewards(res, extra);
  if (kind === 'walk') return town();
  if (kind === 'boss') return town();
  locationScreen(id);
}

/** Results card inside the frame (spec §4.4): EXP, gold, questions, improved words as big Chinese chips. */
function rewards(r: BattleResult, extra: string): Promise<void> {
  hud();
  return new Promise(res => {
    render(dlg({ testid: 'victory', cls: 'results', close: false, title: '🎉 Victory!', body: `
      <div class="big"><div class="card">⭐ +${r.exp} EXP${r.levels ? `<br>🎉 Level up! Now level ${S.level}` : ''}</div><div class="card">🪙 +${r.gold} gold</div>
      <div class="card">❓ ${r.correct}/${r.questions - r.voids} correct${r.spoken ? `<br>🎤 ${r.spoken} spoken` : ''}${r.voids ? ` · ${r.voids} skipped` : ''}${r.tired ? '<br>😪 Enemies got tired' : ''}</div></div>
      ${r.learned.length ? `<h3>🏅 New proficient words</h3><div class="chips">${r.learned.map(i => zh(ITEM[i].zh)).join('')}</div>` : ''}
      ${r.loot.length ? `<h3>🎁 Treasure</h3><div>${r.loot.map(esc).join('<br>')}</div>` : ''}
      ${extra}<p class="muted">HP and MP do not refill by themselves. Rest at the inn or drink a potion.</p>`,
      foot: `<button id="ok" data-testid="victory-ok" data-key="enter">Continue ▶</button>` }));
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
  if (w.place === 'town') view.mode('town', undefined, BG.village()); else { setCurrentLoc(w.place); view.mode('map', parseInt(LOC[w.place].bg), BG.map(LOC[w.place])); setTitle(locTitle(LOC[w.place])); }
  const h = heroStats();
  inn(`<div data-testid="defeat-msg">🐼 “There, there. You were so brave! Rest now.”<br>😵 <b>You fainted!</b> Your friends carried you back to the last inn you rested at.
    You keep all your items, EXP and treasure. ${fee ? `The doctor's fee was ${fee} 🪙.` : 'The doctor treated you for free.'}
    ❤️ HP and MP fully restored.${potion ? ' 🍯 The innkeeper gives you a free Honey Potion.' : ''}
    💪 Courage +${Math.round((h.courageMult - 1) * 100)}% DEF until your next win.${S.locs[id].bossCheckpoint ? ' 🚩 Your boss checkpoint is saved.' : ''}</div>`, w.place, w.node);
}

// =============== preview: a paged "book" of word cards (spec §6.3) ===============
export function wordCard(i: string) { const it = ITEM[i];
  return `<div class="wordcard" data-testid="w-${i}"><span class="zhc" lang="zh-CN">${it.zh}</span>${sayBtn(i)}<span class="en">${esc(it.enPrimary)}</span>
    <span class="pp">${prog(i).seen ? pips(i) : '<span class="tag" style="color:#fff">new</span>'}</span></div>`; }
export const wordPages = (ids: string[]) => chunk(ids, 8).map(p => `<div class="words8">${p.map(wordCard).join('')}</div>`);
export function preview(id: string): Promise<void> {
  const l = LOC[id]; const ids = POOLS[id];
  view.mode('map', parseInt(l.bg), BG.map(l)); playMusic('mus_village'); setTitle(locTitle(l));
  return new Promise(res => {
    const show = () => {
      render(bookHtml({ testid: 'preview', closeId: 'pvx', title: `📖 ${zh(l.zh)} ${esc(l.name)}: words you'll meet <span class="muted">· ${ids.length} words · tap 🔊 to hear</span>`,
        pages: wordPages(ids),
        left: `<button class="secondary" id="prac" data-testid="practice" style="margin-right:auto">🎯 Practice modes</button>`,
        right: `<button id="done" data-testid="preview-done" data-key="enter" style="margin-left:auto;min-width:220px">Let's go! ▶</button>` }));
      wireBook(); wireSayButtons($('[data-testid="preview"]'));
      on('#prac', async () => { await practiceMenu(id); show(); });
      on('#done', () => res()); on('#pvx', () => res());
    };
    show();
  });
}
/** Read-only word list (⏸️ → Word list), in the modal so it never disturbs the screen underneath. */
export function wordListModal(id: string) {
  const l = LOC[id];
  const m = modal(bookHtml({ testid: 'wordlist', closeId: 'pclose', title: `📖 ${zh(l.zh)} ${esc(l.name)} words`, pages: wordPages(POOLS[id]) }));
  wireBook(m); wireSayButtons(m); on('#pclose', closeModal, m);
}
export function pips(id: string) {
  const p = prog(id); return `<span class="pips">${activeWays(id).map(w => '●'.repeat(Math.min(2, p.ways[w].c)) + '○'.repeat(2 - Math.min(2, p.ways[w].c))).join(' ')}</span>${proficient(id) ? ' 🏅' : ''}`;
}

// =============== debug panel (dev builds / ?debug only) ===============
export function debugPanel(onChange: () => void) {
  const h = heroStats();
  const rows = LOCATIONS.flatMap(l => POOLS[l.id].map(id => ({ id, l })));
  const m = modal(`<div class="panel" data-testid="debug" style="width:1180px;font-size:18px"><h2>🐞 Debug panel</h2>
    <div class="row" style="justify-content:flex-start">
      Gold <input type="number" id="dg" value="${S.gold}" data-testid="dbg-gold"> Level <input type="number" id="dl" value="${S.level}" data-testid="dbg-level">
      HP <input type="number" id="dh" value="${S.hp}" data-testid="dbg-hp"> (max ${h.maxHp}) MP <input type="number" id="dm" value="${S.mp}">
      <button id="apply" data-testid="dbg-apply">Apply</button></div>
    <div class="row" style="justify-content:flex-start;margin-top:10px">
      <button class="secondary" id="clearpath" data-testid="dbg-clearpath">Clear path fights (this location; all if in town)</button>
      <button class="secondary" id="unlock">Unlock all locations</button>
      <button class="secondary" id="export">Export save JSON</button>
      <button class="danger" id="reset" data-testid="dbg-reset">Reset everything</button>
      <button id="close" data-testid="dbg-close">Close</button></div>
    <p class="muted">Speech: consent ${S.consent.speech ? 'yes' : 'no'}, session ${session.speechBlocked ? 'paused (' + esc(session.speechBlockReason) + ')' : 'ok'}, voids ${session.voids}. Stats: ${esc(JSON.stringify(S.stats))}. Courage ${S.courage}.
      ${LOCATIONS.map(l => { const r = readiness(l.id); return `${l.name}: ready ${r.n}/${r.total} (trigger ${Math.round(r.trigger * 100)}%), path ${S.locs[l.id].pathCleared}, patrols left ${S.locs[l.id].patrolsLeft}`; }).join(' · ')}</p>
    <h3>Item mastery (correct/attempts, Leitner box)</h3>
    <table class="mastery" data-testid="mastery"><tr><th>Loc</th><th>Item</th><th>English</th>${ALL_WAYS.map(w => `<th>${WAY_LABEL[w]}</th>`).join('')}<th>Progress</th><th>Proficient</th></tr>
    ${rows.map(({ id, l }) => { const p = prog(id); const it = ITEM[id]; return `<tr style="${p.seen ? '' : 'opacity:.45'}"><td>${l.emoji}</td><td class="zhc" lang="zh-CN">${it.zh}</td><td>${esc(it.enPrimary)}</td>
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
  void bossPool; void replaceState; void distractors; void speak;
}
