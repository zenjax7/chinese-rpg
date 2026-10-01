// Battle state machine (spec §1.2) driven by async UI prompts. Numbers come from src/data/*.json.
import { B, ENEMIES, EnemyDef, ITEM, LOC, LocationDef, GEAR, GEAR_LIST, CONS, SKILL } from '../data';
import { S, save, heroStats, addExp, session, speechOn, WayKey, clampHpMp } from './state';
import { chooseBattleSet, QuestionFeed, WayCtx, grade, prog, proficient, distractors, pickWay, decayRecentMisses } from './learning';
import { listen, speechSupported } from './speech';
import { sayItem } from './voice';
import { playSfx, playMusic, playSting } from '../audio/audio';
import { BG } from '../assets';
import { matchZh, matchEn } from './match';
import { view } from '../phaser/view';
import { $, $$, esc, render, hud, toast, sleep, on } from '../ui/dom';

export type BattleKind = 'path' | 'patrol' | 'boss' | 'walk';
export interface BattleResult { outcome: 'win' | 'defeat' | 'flee'; exp: number; gold: number; loot: string[]; levels: number; learned: string[];
  questions: number; correct: number; spoken: number; voids: number; tired: boolean; }
interface Foe { d: EnemyDef; hp: number; maxHp: number; alive: boolean; skipNext: boolean; halfDone: boolean; waxUsed: boolean; stolen: number; }
type Outcome = { result: 'correct' | 'wrong' | 'void'; spoken: boolean; hinted: boolean; fast: boolean };

const C = () => B.combat;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pickWeighted = <T extends { weight: number }>(l: T[]) => { let r = Math.random() * l.reduce((a, x) => a + x.weight, 0); for (const x of l) { r -= x.weight; if (r <= 0) return x; } return l[l.length - 1]; };
export function streakMult(s: number) { let m = 1; for (const t of C().streakTiers) if (s >= t.min) m = t.mult; return m; }
export function streakDrop(s: number) { const tiers = C().streakTiers.map((t: any) => t.min); let i = 0; tiers.forEach((m: number, k: number) => { if (s >= m) i = k; }); return tiers[Math.max(0, i - 1)]; }
const r = Math.round;   // spec: Math.round (half up)
export function heroDamage(atk: number, streak: number, spoken: boolean, tired: boolean, defE: number) {
  return Math.max(1, r(atk * streakMult(streak) * (spoken ? C().spokenDamageMult : 1) * (tired ? C().tiredHeroDamageMult : 1) - 0.5 * defE));
}
export function blockDamage(atkE: number, defH: number) { return Math.max(0, r(atkE - C().kBlock * defH)); }
export function brokenDamage(atkE: number, defH: number) { return r(Math.max(Math.ceil(C().brokenFloor * atkE), atkE - C().kBroken * defH)); }

// exposed for the debug panel / automated tests
(window as any).__proto = (window as any).__proto || {};

export async function runBattle(locId: string, kind: BattleKind, pathIndex = 0): Promise<BattleResult> {
  const loc = LOC[locId]; const isBoss = kind === 'boss';
  // ---- BATTLE_INIT
  const foes: Foe[] = [];
  const mk = (id: string): Foe => { const d = ENEMIES[id]; return { d, hp: d.hp, maxHp: d.hp, alive: true, skipNext: false, halfDone: false, waxUsed: false, stolen: 0 }; };
  const withMinions = (id: string) => { const f = mk(id); foes.push(f, ...ENEMIES[id].minions.map(mk)); return f; };
  const scripted = kind === 'path' ? loc.scripted?.[String(pathIndex)] : undefined;
  if (isBoss) {
    const b = withMinions(loc.boss); if (S.locs[locId].bossCheckpoint) b.hp = Math.floor(b.maxHp * C().bossCheckpointFrac);
  } else if (scripted) {
    for (const id of scripted) { if (ENEMIES[id].minions.length) withMinions(id); else foes.push(mk(id)); }
  } else {
    const first = pickWeighted(loc.roster).enemy;
    const n = loc.packs?.[first] ?? Math.floor(rnd(loc.enemiesPerBattle[0], loc.enemiesPerBattle[1] + 1));
    foes.push(mk(first));
    for (let i = 1; i < Math.min(n, C().maxEnemies); i++) foes.push(mk(loc.packs?.[first] ? first : pickWeighted(loc.roster).enemy));
    // v3: in patrol / random fights, 10% chance one normal enemy is replaced by the location elite
    const forced = (window as any).__proto.forceElite; (window as any).__proto.forceElite = false;
    if (kind !== 'walk' && loc.elite && (forced || Math.random() < B.learning.eliteReplaceChance)) foes[foes.length - 1] = mk(loc.elite);
  }
  foes.splice(C().maxEnemies);
  const leader = ['locboss', 'realmboss'].includes(foes[0].d.kind) ? foes[0] : null;   // boss down => minions flee
  const hero = { webbed: false, rooted: false, webMult: 1 };
  const tiredAt = C().tiredAtQuestions[leader ? leader.d.kind : 'normal'];
  const set = chooseBattleSet(locId, loc.reviewSlots + (isBoss ? 1 : 0));
  const feed = new QuestionFeed(set.ids);
  const ctx: WayCtx = { asked: 0, spoken: 0, cooling: new Set() };
  (window as any).__proto.summons = 0;
  const wpn = S.equip.weapon ? GEAR[S.equip.weapon] : null;
  const bs = { summons: 0, gauge: 0, round: 0, streak: wpn?.startStreak || 0, q: 0, potions: 0, insight: 0, heal: 0, shield: 0, doubleReady: 0, fastWrongs: 0, focus: false, log: [] as string[], checkpointHit: S.locs[locId].bossCheckpoint };
  const res: BattleResult = { outcome: 'win', exp: 0, gold: 0, loot: [], levels: 0, learned: [], questions: 0, correct: 0, spoken: 0, voids: 0, tired: false };
  const tired = () => bs.q >= tiredAt;
  const log = (m: string) => { bs.log.unshift(m); const el = $('#blog'); if (el) el.innerHTML = bs.log.slice(0, 30).map(x => `<div>${x}</div>`).join(''); };
  S.stats.battles++;
  view.mode('battle', parseInt(loc.bg), BG.battle(loc, isBoss));
  playMusic(leader || isBoss ? 'mus_battle_boss' : 'mus_battle_field');
  const syncView = () => view.enemies(foes.map(f => ({ sprite: f.d.sprite, tint: f.d.spriteTint, emoji: f.d.emoji, name: f.d.zh, hp: f.hp, maxHp: f.maxHp, color: f.d.color, boss: ['locboss', 'realmboss'].includes(f.d.kind) })));
  syncView();

  // ---- UI skeleton
  const skeleton = () => {
    render(`<div class="panel" data-testid="battle">
      <div class="enemyrow" id="foes"></div>
      <div class="row muted" id="bstat"></div>
      <div id="bmain"></div>
      <div class="log" id="blog"></div></div>`);
    log(leader ? `👑 Boss battle! ${foes[0].d.zh} ${esc(foes[0].d.en)}` : `${foes.map(f => f.d.emoji).join(' ')} appeared!`);
  };
  const refresh = () => {
    hud();
    const fe = $('#foes'); if (fe) fe.innerHTML = foes.map((f, i) => `<div class="card" data-testid="foe-${i}" style="${f.alive ? '' : 'opacity:.35'}" title="${esc(f.d.special)}">
      <div style="font-size:1.6rem">${f.d.emoji} <span class="zhname">${f.d.zh}</span></div><div class="muted">${esc(f.d.en)}</div>
      <div>${f.d.kind === 'elite' ? '<span class="tag">⭐ elite</span> ' : ''}HP <b data-testid="foe-hp-${i}">${Math.max(0, f.hp)}</b>/${f.maxHp} · ⚔️${f.d.atk} 🛡️${f.d.def_}${f.skipNext ? ' 💤' : ''}${tired() ? ' <span class="tag">😪 Tired</span>' : ''}</div></div>`).join('');
    const st = $('#bstat'); if (st) st.innerHTML = `<span class="tag" data-testid="gauge" title="Companion gauge: fills on mistakes (+${B.companion.gainPerWrong}) and correct answers (+${B.companion.gainPerCorrect})">🐲 <span class="gauge"><span style="width:${bs.gauge}%"></span></span> ${bs.gauge}</span><span class="tag">Round ${bs.round}</span><span class="tag" data-testid="streak">🔥 Streak ${bs.streak} (×${streakMult(bs.streak)})</span>
      <span class="tag">❓ ${bs.q}/${tiredAt}${tired() ? ' 😪 enemies tired' : ''}</span><span class="tag">🧪 ${C().potionsPerBattle - bs.potions} potion uses left</span>
      ${S.skillsEquipped.includes('shield') ? `<span class="tag">🔰 Guardian Shield ${bs.shield ? 'used' : S.mp >= SKILL.shield.mp ? 'ready' : 'needs MP'}</span>` : ''}
      ${hero.webbed ? '<span class="tag">🕸️ webbed</span>' : ''}${hero.rooted ? '<span class="tag">🌱 rooted</span>' : ''}`;
    foes.forEach((f, i) => view.updateEnemy(i, f.hp, tired()));
  };

  // Words are drawn silently from the location pool (no per-battle word list; the full pool is on the preview / practice pages).
  skeleton(); refresh();

  // ---- ASK
  async function ask(turn: 'attack' | 'defense' | 'heal', foe?: Foe): Promise<Outcome> {
    let { id, way, why } = feed.next(ctx);
    const item = ITEM[id];
    let reprompts = 0;
    let out: Outcome;
    for (;;) {
      if (way[0] === 's' && !speechOn()) way = pickWay(id, ctx);
      out = await renderQuestion(id, way, turn, foe, reprompts);
      if ((out as any).tech) {
        reprompts++;
        if (reprompts > B.speech.maxTechReprompts) {
          out = { result: 'void', spoken: true, hinted: false, fast: false };
          session.voids++; S.stats.voids++; ctx.cooling.add(id);
          if (session.voids >= B.speech.voidsToPauseSession) { session.speechBlocked = true; session.speechBlockReason = 'Your microphone seems sleepy. We\'ll use tapping for now.'; toast('🔇 ' + session.speechBlockReason); }
          break;
        }
        continue;   // same question, re-prompted
      }
      if ((out as any).fatal) { session.speechBlocked = true; session.speechBlockReason = (out as any).fatal; toast('🔇 Speech is off for now: ' + esc((out as any).fatal) + '. We\'ll use tapping.'); way = pickWay(id, ctx); continue; }
      break;
    }
    bs.q++; res.questions++;
    feed.record(id, way, out.result);
    (window as any).__proto.lastOutcome = { id, way, ...out };
    S.log.unshift({ t: Date.now(), id, way, why, turn, result: out.result, spoken: out.spoken, hinted: out.hinted, fast: out.fast }); S.log.length = Math.min(S.log.length, 300);
    if (out.result === 'void') { res.voids++; return out; }
    // companion gauge (v3): +20 wrong, +5 correct, 0 for hinted answers
    const CG = B.companion; const before = bs.gauge;
    if (!out.hinted) bs.gauge = Math.min(CG.gaugeFull, bs.gauge + (out.result === 'correct' ? CG.gainPerCorrect : CG.gainPerWrong));
    if (bs.gauge >= CG.gaugeFull && before < CG.gaugeFull) { log('💖 Your companion 小龙 is ready to help!'); toast('💖 小龙: 我来帮你!'); }
    ctx.asked++; if (out.spoken) { ctx.spoken++; res.spoken++; S.stats.spoken++; }
    S.stats.questions++;
    const g = grade(id, way, out.result === 'correct', out.hinted);
    if (g.wayDone) { bs_exp(B.learning.expWayComplete, `⭐ ${item.zh}: a way is complete! +${B.learning.expWayComplete} EXP`); }
    if (g.becameProficient) { bs_exp(B.learning.expProficient, `🏅 ${item.zh} is now Proficient! +${B.learning.expProficient} EXP`); res.learned.push(id); }
    if (out.result === 'correct') {
      res.correct++; S.stats.correct++;
      if (!(out.fast && !proficient(id))) bs.streak += 1 + (out.spoken ? C().spokenExtraStreak : 0);
      S.mp = Math.min(heroStats().maxMp, S.mp + C().mpPerCorrect);
      bs.fastWrongs = 0;
    } else {
      bs.streak = streakDrop(bs.streak);
      if (out.fast) { bs.fastWrongs++; if (bs.fastWrongs >= 2) { bs.focus = true; bs.fastWrongs = 0; toast('🦉 Focus! Read it carefully.'); } } else bs.fastWrongs = 0;
    }
    if (tired() && !res.tired) { res.tired = true; log('😪 The enemies are getting Tired! (ATK −30%, your hits +50%)'); }
    refresh();
    return out;
  }
  function bs_exp(n: number, msg: string) { const lv = addExp(n); res.exp += n; res.levels += lv; if (lv) playSfx('sfx_level_up'); log(msg); toast(msg); }

  async function renderQuestion(id: string, way: WayKey, turn: string, foe: Foe | undefined, reprompts: number): Promise<Outcome & { tech?: boolean; fatal?: string }> {
    const item = ITEM[id]; const p = prog(id);
    const zhHtml = `<div class="zh-big" data-testid="q-zh">${item.zh}</div>`;   // characters only (no pinyin anywhere; 🔊 gives the sound)
    const foeName = foe ? `${foe.d.emoji} ${foe.d.zh}` : '';
    const frame = turn === 'defense' ? `<div class="muted">${foeName} is casting a spell at you… 🛡️ Block it!</div>` : turn === 'heal' ? `<div class="muted">💚 Heal spell!</div>` : `<div class="muted">⚔️ Cast your spell!</div>`;
    const main = $('#bmain');
    const unlockDelay = bs.focus ? C().focusDelayMs : 0; bs.focus = false;
    if (way === 'rZE' || way === 'rEZ') {
      const first = Object.values(p.ways).every(w => w.a === 0);
      const n = Math.max(B.learning.minOptions, LOC[currentLoc].mcOptions - (first ? B.learning.firstAskOptionReduction : 0));
      const opts = [id, ...distractors(id, n - 1)].sort(() => Math.random() - 0.5);
      const label = (oid: string) => way === 'rZE' ? esc(ITEM[oid].enPrimary) : ITEM[oid].zh;
      const prompt = way === 'rZE'
        ? `<div class="prompt">${turn === 'defense' ? 'What does this mean?' : 'Cast it! What does this mean?'}</div>${zhHtml}`
        : `<div class="prompt">${turn === 'defense' ? 'Block it! Which one is' : 'Cast'} <b>“${esc(item.enPrimary)}”</b>${turn === 'defense' ? '?' : '! Tap the Chinese.'}</div>`;
      const canInsight = () => S.skillsEquipped.includes('insight') && bs.insight < SKILL.insight.perBattle! && S.mp >= SKILL.insight.mp && $$('.options button:not([disabled]):not(.gone)').length > 2;
      main.innerHTML = `<div style="text-align:center" data-testid="question" data-way="${way}">${frame}${prompt}
        <div class="row">${way === 'rZE' ? `<button class="secondary" id="replay">🔊 Hear it</button>` : ''}
        ${S.skillsEquipped.includes('insight') ? `<button class="secondary" id="insight" data-testid="insight">💡 Insight (${SKILL.insight.mp} MP)</button>` : ''}</div>
        <div class="options">${opts.map(o => `<button data-o="${o}" data-testid="opt" disabled>${label(o)}</button>`).join('')}</div>
        <div id="fb"></div></div>`;
      (window as any).__proto.q = { id, way, answerId: id, zh: item.zh, en: item.enPrimary, turn };
      let hinted = false;
      const ins = $('#insight') as HTMLButtonElement | null;
      const updIns = () => { if (ins) ins.disabled = !canInsight(); };
      if (ins) ins.onclick = () => {
        if (!canInsight()) return; S.mp -= SKILL.insight.mp; bs.insight++; hinted = true; hud();
        const wrong = $$('.options button:not(.gone)').filter(b => b.dataset.o !== id); const b = wrong[Math.floor(Math.random() * wrong.length)];
        b.classList.add('gone'); b.style.visibility = 'hidden'; updIns(); log('💡 Insight removed one choice (this answer won\'t count toward learning).');
      };
      const rp = $('#replay'); if (rp) rp.onclick = () => sayItem(id);
      updIns();
      // PROMPT_PLAY -> INPUT_UNLOCKED (after audio, or 800 ms for text-only prompts)
      if (way === 'rZE') await sayItem(id, C().audioUnlockMaxMs); else await sleep(C().textUnlockMs);
      if (unlockDelay) await sleep(unlockDelay);
      $$('.options button:not(.gone)').forEach(b => (b as HTMLButtonElement).disabled = false); updIns();
      const t0 = performance.now();
      const pick = await new Promise<string>(res => on('.options button', (_e, el) => res(el.dataset.o!), main));
      const fast = performance.now() - t0 < C().fastAnswerMs;
      $$('.options button').forEach(b => { (b as HTMLButtonElement).disabled = true; if (b.dataset.o === id) b.classList.add('right'); else if (b.dataset.o === pick) b.classList.add('wrong'); });
      if (ins) ins.disabled = true;
      const correct = pick === id;
      await feedback(id, correct, turn, undefined);
      return { result: correct ? 'correct' : 'wrong', spoken: false, hinted, fast };
    }
    // ---- spoken ways
    const zhAns = way === 'sEZ';
    const lang = zhAns ? 'zh-CN' : 'en-US';
    const prompt = zhAns ? `<div class="prompt">🎤 Say it in <b>Chinese</b>: <b>“${esc(item.enPrimary)}”</b></div>`
      : `<div class="prompt">🎤 Say what this means in <b>English</b>:</div>${zhHtml}`;
    main.innerHTML = `<div style="text-align:center" data-testid="question" data-way="${way}">${frame}${prompt}
      ${!zhAns ? `<button class="secondary" id="replay">🔊 Hear it</button>` : ''}
      <button id="mic" data-testid="mic" disabled>🎤</button><div id="micmsg" class="muted">${reprompts ? '🤫 I didn\'t hear anything. Tap and talk!' : 'Tap the mic, then speak.'}</div><div id="fb"></div></div>`;
    (window as any).__proto.q = { id, way, answerId: id, zh: item.zh, en: item.enPrimary, turn, spoken: true };
    const rp = $('#replay'); if (rp) rp.onclick = () => sayItem(id);
    if (!zhAns && reprompts === 0) await sayItem(id, C().audioUnlockMaxMs); else await sleep(C().textUnlockMs);
    const mic = $('#mic') as HTMLButtonElement; mic.disabled = false; mic.classList.add('pulse');
    await new Promise<void>(res => mic.onclick = () => res());
    mic.classList.remove('pulse'); mic.classList.add('listening'); mic.textContent = '👂'; $('#micmsg').textContent = 'Listening… say it now!';
    const long = [...item.zh].length > B.speech.longAnswerSyllables;   // 1 character = 1 syllable
    const lr = await listen(lang, long);
    mic.classList.remove('listening'); mic.textContent = '🎤'; mic.disabled = true;
    if (lr.kind === 'tech') { log(`🎤 (technical: ${lr.code}) re-prompt`); return { result: 'void', spoken: true, hinted: false, fast: false, tech: true }; }
    if (lr.kind === 'fatal') return { result: 'void', spoken: true, hinted: false, fast: false, fatal: lr.code };
    let correct = false; let heard = '';
    if (lr.kind === 'result') { const m = zhAns ? matchZh(lr.alts, item) : matchEn(lr.alts, item); correct = m.ok; heard = lr.alts.join(' / '); }
    else heard = '(could not understand)';
    await feedback(id, correct, turn, heard);
    return { result: correct ? 'correct' : 'wrong', spoken: true, hinted: false, fast: false };
  }

  async function feedback(id: string, correct: boolean, _turn: string, heard?: string) {
    const item = ITEM[id]; const fb = $('#fb');
    const heardHtml = heard !== undefined ? `<div class="muted">I heard: ${esc(heard)}</div>` : '';
    playSfx(correct ? 'sfx_correct' : 'sfx_wrong');
    if (correct) { fb.innerHTML = `<div class="feedback ok" data-testid="fb-ok">✅ Correct! ${item.zh} = ${esc(item.enPrimary)}${heardHtml}</div>`; await sleep(C().correctFeedbackMs); return; }
    fb.innerHTML = `<div class="feedback bad" data-testid="fb-bad">❌ Not quite. ${heardHtml}<div class="zh">${item.zh}</div><div>${esc(item.en)}</div>
      <button id="cont" data-testid="continue" disabled>Continue ▶</button></div>`;
    sayItem(id);
    await sleep(C().feedbackMinMs);
    const b = $('#cont') as HTMLButtonElement; b.disabled = false;
    await new Promise<void>(res => b.onclick = () => { b.disabled = true; b.remove(); res(); });
  }

  function kill(f: Foe) {
    f.alive = false; const i = foes.indexOf(f); view.updateEnemy(i, 0);
    if (f.stolen) { S.gold += f.stolen; log(`🪙 ${f.d.zh} drops the ${f.stolen} coins it stole.`); f.stolen = 0; }
    for (const o of foes) if (o.alive && o.d.id === f.d.id && o.d.mech.partnerFallSkip) { o.skipNext = true; log(`${o.d.emoji} ${o.d.zh} is sad about its partner and hides (skips its next attack).`); }
    const damp = S.level >= loc.recLevel[1] + B.economy.expDampLevelsAbove ? B.economy.expDampMult : 1;
    const exp = Math.round(f.d.exp * damp);
    const gold = Math.max(Math.ceil(f.d.gold * B.economy.goldRollMin), Math.round(f.d.gold * rnd(B.economy.goldRollMin, B.economy.goldRollMax)));
    S.gold += gold; res.gold += gold; res.exp += exp; const lv = addExp(exp); res.levels += lv;
    playSfx('sfx_enemy_defeat'); if (gold) setTimeout(() => playSfx('sfx_gold'), 250); if (lv) setTimeout(() => playSfx('sfx_level_up'), 500);
    log(`💥 ${f.d.emoji} ${f.d.zh} defeated!${exp || gold ? ` +${exp} EXP, +${gold} 🪙` : ' (no reward)'}`);
    if (lv) toast(`🎉 Level up! You are now level ${S.level}`);
    if (Math.random() < f.d.chestRate) openChest(f.d.kind);
    save();
  }
  function openChest(kind: string) {
    const G = loc.G;
    const giveFine = () => {
      const cand = GEAR_LIST.filter(g => g.rarity === 'fine' && g.tier === loc.tier && !S.gear.includes(g.id));
      if (!cand.length) { S.gold += 3 * G; res.gold += 3 * G; res.loot.push(`🪙 ${3 * G} gold`); return; }
      const g = cand[Math.floor(Math.random() * cand.length)]; S.gear.push(g.id); res.loot.push(`${g.emoji} ${g.zh} ${g.en} (fine)`);
    };
    const give = (itemId: string) => { S.inv[itemId] = (S.inv[itemId] || 0) + 1; res.loot.push(`${CONS[itemId].emoji} ${CONS[itemId].zh} ${CONS[itemId].en}`); };
    if (kind === 'normal' || kind === 'elite') {   // v3: elites use the normal chest table (elite gold ×2 is in their stats)
      const e = pickWeighted(B.chests.normal as any[]) as any;
      const capped = e.item && CONS[e.item].carryLimit && (S.inv[e.item] || 0) >= CONS[e.item].carryLimit!;
      const gG = e.goldG || (capped ? e.ifCappedGoldG : 0);
      if (gG) { S.gold += gG * G; res.gold += gG * G; res.loot.push(`🪙 ${gG * G} gold`); } else if (e.item) give(e.item); else giveFine();
    } else {
      const c = B.chests[kind]; S.gold += c.goldG * G; res.gold += c.goldG * G; res.loot.push(`🪙 ${c.goldG * G} gold`); give(c.item);
      if (c.fineGear) giveFine();
      const hid = loc.bossReward.heroic;
      if (c.heroicGear && hid && GEAR[hid] && !S.gear.includes(hid)) { S.gear.push(hid); res.loot.push(`👑 ${GEAR[hid].emoji} ${GEAR[hid].zh} ${GEAR[hid].en} (heroic)`); }
    }
    playSfx('sfx_chest'); log('🎁 A treasure chest! ' + res.loot[res.loot.length - 1]); toast('🎁 Treasure chest!');
  }
  let f_web = 1;
  function summon(id: string, max: number, by: Foe, maxSummons = 99) {
    if (foes.filter(x => x.alive).length >= Math.min(max, C().maxEnemies) || bs.summons >= maxSummons) return;
    bs.summons++; (window as any).__proto.summons = bs.summons;
    const n = mk(id); const dead = foes.findIndex(x => !x.alive && x !== leader);
    if (dead >= 0) foes[dead] = n; else foes.push(n);
    syncView(); log(`📣 ${by.d.emoji} ${by.d.zh} calls for help! A ${n.d.emoji} ${n.d.zh} joins the fight.`); toast(`📣 ${by.d.en} summons a ${n.d.en}!`);
  }
  function halfTriggers(f: Foe) {
    if (f.halfDone || f.hp >= f.maxHp * 0.5) return;
    const m = f.d.mech;
    if (m.summonAtHalf) { f.halfDone = true; summon(m.summonAtHalf.enemy, m.summonAtHalf.maxOnScreen, f); }
    if (m.healOnceAtHalf) { f.halfDone = true; f.hp = Math.min(f.maxHp, f.hp + m.healOnceAtHalf); view.updateEnemy(foes.indexOf(f), f.hp); log(`🍯 ${f.d.zh} licks honey off its paw and heals ${m.healOnceAtHalf} HP!`); toast(`🍯 ${f.d.en} heals ${m.healOnceAtHalf} HP`); }
  }
  const bossDead = () => !!leader && !leader.alive;
  const allDead = () => foes.every(f => !f.alive);
  function checkCheckpoint() {
    if (isBoss && !bs.checkpointHit && foes[0].alive && foes[0].hp <= foes[0].maxHp * C().bossCheckpointFrac) {
      bs.checkpointHit = true; S.locs[locId].bossCheckpoint = true; save(); log('🚩 Checkpoint saved! (A retry will start here. No heal.)'); toast('🚩 Boss checkpoint saved');
    }
  }
  async function hit(f: Foe, mult = 1, spoken = false) {
    const h = heroStats(); const i = foes.indexOf(f);
    let d = Math.max(1, Math.round(heroDamage(h.atk, bs.streak, spoken, tired(), f.d.def_) * mult * f_web));
    if (f.d.mech.waxShieldFirstHit && !f.waxUsed) { f.waxUsed = true; d = f.d.mech.waxShieldFirstHit; log(`🕯️ ${f.d.zh}'s wax shield soaks up the hit!`); }
    f.hp -= d; view.hitEnemy(i, d); playSfx('sfx_hit'); log(`⚔️ You hit ${f.d.zh} for ${d}${spoken ? ' (spoken ×1.25)' : ''}${bs.streak >= 3 ? ` (streak ×${streakMult(bs.streak)})` : ''}`);
    if (f.hp <= 0) kill(f); else { checkCheckpoint(); halfTriggers(f); }
    refresh(); await sleep(250);
  }

  // ---- rounds
  let potionUsedThisTurn = false;
  for (;;) {
    bs.round++; if (bs.doubleReady > 0) bs.doubleReady--; refresh();
    // HERO_ACTION_SELECT
    // Quick Start: in round 1 these enemies attack before the hero's first turn
    // Companion (v3): at 100 gauge, a free attack at the start of the hero turn; lowest-HP normal/elite (boss only if alone)
    if (bs.gauge >= B.companion.gaugeFull) {
      const live = foes.filter(x => x.alive); const small = live.filter(x => x.d.kind === 'normal' || x.d.kind === 'elite');
      const t = (small.length ? small : live).sort((a, b) => a.hp - b.hp)[0];
      if (t) {
        const h = heroStats(); let d = Math.max(1, r(B.companion.atkMult * h.atk - B.companion.defMult * t.d.def_));
        if (t.d.mech.waxShieldFirstHit && !t.waxUsed) { t.waxUsed = true; d = t.d.mech.waxShieldFirstHit; }
        bs.gauge = 0; (window as any).__proto.companionHits = ((window as any).__proto.companionHits || 0) + 1;
        t.hp -= d; view.hitEnemy(foes.indexOf(t), d); playSfx('sfx_hit'); log(`🐲 小龙: 我来帮你! 小龙 breathes fire on ${t.d.zh} for ${d}!`); toast('🐲 我来帮你!');
        if (t.hp <= 0) kill(t); else { checkCheckpoint(); halfTriggers(t); }
        refresh(); await sleep(400);
        if (bossDead() || allDead()) { res.outcome = 'win'; break; }
      }
    }
    if (bs.round === 1) for (const f of foes.filter(x => x.alive && x.d.mech.quickStart)) { log(`💨 ${f.d.zh} is super fast and attacks first!`); if (await enemyTurn(f)) { res.outcome = 'defeat'; return finish(); } }
    const act = await chooseAction();
    hero.rooted = false;
    potionUsedThisTurn = false;
    if (act.type === 'flee') { res.outcome = 'flee'; S.stats.flees++; log('🏃 You ran away!'); break; }
    if (act.type === 'potion') {
      const c = CONS[act.item!]; const h = heroStats(); S.inv[c.id]--; bs.potions++; potionUsedThisTurn = true; playSfx('sfx_potion');
      if (c.healHpFrac) for (const b of foes) if (b.alive && b.d.mech.honeyDistract) { b.skipNext = true; log(`${b.d.emoji} ${b.d.zh} stares at your honey and forgets to attack!`); }
      if (c.healHpFrac) { const n = Math.round(c.healHpFrac * h.maxHp); S.hp = Math.min(h.maxHp, S.hp + n); view.heroFloat('+' + n); log(`${c.emoji} +${n} HP`); }
      if (c.healMpFrac) { const n = Math.round(c.healMpFrac * h.maxMp); S.mp = Math.min(h.maxMp, S.mp + n); view.heroFloat('+' + n + ' MP', '#6dd5fa'); log(`${c.emoji} +${n} MP`); }
      refresh();
    } else if (act.type === 'heal') {
      S.mp -= SKILL.heal.mp; bs.heal++; hud();
      const o = await ask('heal');
      if (o.result === 'correct') { const h = heroStats(); const n = Math.round(SKILL.heal.healFrac! * h.maxHp); S.hp = Math.min(h.maxHp, S.hp + n); view.heroFloat('+' + n); log(`💚 Healed ${n} HP`); }
      else if (o.result === 'wrong') log('💚 The heal fizzled.');
      refresh();
    } else {
      const live = foes.filter(f => f.alive);
      const target = live.length > 1 ? live[await chooseTarget(live)] : live[0];
      const dbl = act.type === 'double';
      if (dbl) { S.mp -= SKILL.double.mp; bs.doubleReady = SKILL.double.cooldownRounds! + 1; hud(); }
      f_web = hero.webbed ? hero.webMult : 1;
      const o = await ask('attack');
      if (hero.webbed && o.result === 'correct') log('🕸️ The sticky web slows your attack (half damage).');
      if (o.result === 'correct') {
        await hit(target, 1, o.spoken);
        if (dbl && target.alive && bs.streak >= SKILL.double.minStreak!) await hit(target, SKILL.double.secondHitFrac!, o.spoken);
      } else if (o.result === 'wrong') { view.hitEnemy(foes.indexOf(target), 'MISS'); playSfx('sfx_miss'); log('💨 Your spell missed!'); }
      else log('🎤 Question skipped: no damage.');
      hero.webbed = false; f_web = 1;
    }
    if (bossDead() || allDead()) { if (bossDead() && !allDead()) log('The minions run away!'); res.outcome = 'win'; break; }
    // ENEMY_PHASE
    let dead = false;
    for (const f of foes.filter(x => x.alive).slice(0, C().maxEnemies)) { if (await enemyTurn(f)) { dead = true; break; } }
    if (!dead) for (const f of foes.filter(x => x.alive && x.d.mech.summonEveryNTurns)) { const m = f.d.mech.summonEveryNTurns!; if (bs.round % m.n === 0) summon(m.enemy, m.maxOnScreen, f, m.maxSummons ?? 99); }
    if (dead) { res.outcome = 'defeat'; break; }
  }
  void potionUsedThisTurn;
  return finish();

  /** One enemy attack (wind-up => question => block). Returns true if the hero fell. */
  async function enemyTurn(f: Foe): Promise<boolean> {
    const i = foes.indexOf(f); refresh();
    if (f.skipNext) { f.skipNext = false; log(`${f.d.emoji} ${f.d.zh} skips its attack.`); return false; }
    if (f.d.mech.dozeEveryNRounds && bs.round % f.d.mech.dozeEveryNRounds === 0) { log(`💤 ${f.d.zh} dozes off… Zzz (skips its attack)`); view.enemyAttack(i, 'Zzz', true); return false; }
    const o = await ask('defense', f);
    const h = heroStats(); const atkE = f.d.atk * (tired() ? C().tiredEnemyAtkMult : 1);
    let dmg = 0, blocked = false;
    if (o.result === 'void') { log(`🎤 ${f.d.zh}'s attack was skipped.`); return false; }
    if (o.result === 'correct') { dmg = blockDamage(atkE, h.defBattle); blocked = true; }
    else if (S.skillsEquipped.includes('shield') && !bs.shield && S.mp >= SKILL.shield.mp) { S.mp -= SKILL.shield.mp; bs.shield++; dmg = blockDamage(atkE, h.defBattle); blocked = true; log('🔰 Guardian Shield caught the attack!'); toast('🔰 Guardian Shield!'); }
    else dmg = brokenDamage(atkE, h.defBattle);
    const huff = f.d.mech.bigHuffEveryN;
    if (huff && bs.round % huff.n === 0 && !blocked) { dmg += huff.extraBrokenDamage; log(`🌬️ BIG HUFF! +${huff.extraBrokenDamage} damage`); }
    S.hp = Math.max(0, S.hp - dmg); view.enemyAttack(i, dmg, blocked);
    playSfx(blocked ? 'sfx_block' : 'sfx_block_break'); if (dmg > 0) setTimeout(() => playSfx('sfx_hurt'), 120);
    if (!blocked && f.d.mech.coinGrab && !f.stolen && S.gold > 0) { f.stolen = Math.min(S.gold, f.d.mech.coinGrab); S.gold -= f.stolen; log(`🪙 ${f.d.zh} snatches ${f.stolen} shiny coins! (Beat it to get them back.)`); }
    if (huff && bs.round % huff.n === huff.n - 1) log(`😤 ${f.d.zh} is puffing up its cheeks… block the next one!`);
    log(blocked ? `🛡️ Blocked ${f.d.zh}'s ${f.d.attackZh}${dmg ? ` (${dmg} got through)` : ''}` : `💢 Your block broke! ${f.d.zh}'s ${f.d.attackZh} (${esc(f.d.attackEn)}) hits you for ${dmg}`);
    if (!blocked && f.d.mech.webOnBroken) { hero.webbed = true; hero.webMult = f.d.mech.webOnBroken.nextAttackMult; log('🕸️ You are stuck in a web! Your next attack does half damage.'); }
    if (!blocked && f.d.mech.rootOnBroken) { hero.rooted = true; log('🌱 Roots trip you! You can\'t run away next turn.'); }
    refresh(); await sleep(300);
    return S.hp <= 0;
  }

  function finish(): BattleResult {
  decayRecentMisses(); clampHpMp();
  if (res.outcome !== 'flee') playSting(res.outcome === 'win' ? 'stg_victory' : 'stg_defeat');
  if (res.outcome === 'win') { S.stats.wins++; S.courage = 0; if (isBoss) S.locs[locId].bossCheckpoint = false; }
  save(); hud();
  (window as any).__proto.q = null;
  return res;
  }

  // ---- action menus
  function chooseAction(): Promise<{ type: 'attack' | 'double' | 'heal' | 'potion' | 'flee'; item?: string }> {
    return new Promise(resolve => {
      const eq = (s: string) => S.skillsEquipped.includes(s);
      const potionsLeft = C().potionsPerBattle - bs.potions;
      const pots = ['honey', 'bighoney', 'manatea'].filter(p => (S.inv[p] || 0) > 0);
      const dblOk = eq('double') && S.mp >= SKILL.double.mp && bs.doubleReady === 0 && bs.streak >= SKILL.double.minStreak!;
      const healOk = eq('heal') && S.mp >= SKILL.heal.mp && bs.heal < SKILL.heal.perBattle!;
      $('#bmain').innerHTML = `<div style="text-align:center" data-testid="action-menu"><div class="prompt">What will you do?</div>
        <div class="row"><button data-a="attack" data-testid="act-attack">⚔️ Attack</button>
        ${eq('double') ? `<button data-a="double" data-testid="act-double" ${dblOk ? '' : 'disabled'} title="${esc(SKILL.double.desc)}">⚔️⚔️ Double Strike (${SKILL.double.mp} MP${bs.doubleReady ? `, wait ${bs.doubleReady}` : ''})</button>` : ''}
        ${eq('heal') ? `<button data-a="heal" data-testid="act-heal" ${healOk ? '' : 'disabled'}>💚 Heal (${SKILL.heal.mp} MP, ${SKILL.heal.perBattle! - bs.heal} left)</button>` : ''}
        ${pots.map(p => `<button class="secondary" data-a="potion" data-item="${p}" data-testid="act-potion-${p}" ${potionsLeft > 0 ? '' : 'disabled'}>${CONS[p].emoji} ${CONS[p].en} ×${S.inv[p]}</button>`).join('')}
        <button class="secondary" data-a="flee" data-testid="act-flee" ${hero.rooted ? 'disabled title="Rooted!"' : ''}>🏃 Run away${hero.rooted ? ' (rooted 🌱)' : ''}</button></div>
        ${speechSupported() ? '' : ''}</div>`;
      on('#bmain button[data-a]', (_e, el) => resolve({ type: el.dataset.a as any, item: el.dataset.item }));
    });
  }
  function chooseTarget(live: Foe[]): Promise<number> {
    return new Promise(resolve => {
      $('#bmain').innerHTML = `<div style="text-align:center"><div class="prompt">Which enemy?</div><div class="row">
        ${live.map((f, i) => `<button data-t="${i}" data-testid="target-${i}">${f.d.emoji} ${f.d.zh} (${f.hp} HP)</button>`).join('')}</div></div>`;
      on('#bmain button[data-t]', (_e, el) => resolve(+el.dataset.t!));
    });
  }
}

let currentLoc = 'meadow';
export function setCurrentLoc(id: string) { currentLoc = id; }
