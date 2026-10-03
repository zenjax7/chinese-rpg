// Battle state machine (spec §1.2) driven by async UI prompts. Numbers come from src/data/*.json.
import { B, ENEMIES, EnemyDef, ITEM, LOC, LocationDef, GEAR, GEAR_LIST, CONS, SKILL, SPELL, SPELLS, SPELL_RULES, SpellDef } from '../data';
import { onKill as questKill } from './quests';
import { S, save, heroStats, addExp, session, speechOn, WayKey, clampHpMp, gainGear, equipLine } from './state';
import { chooseBattleSet, QuestionFeed, WayCtx, grade, prog, proficient, distractors, pickWay, decayRecentMisses } from './learning';
import { listen, speechSupported } from './speech';
import { sayItem } from './voice';
import { playSfx, playMusic, playSting, beep, duck, playSpellSfx } from '../audio/audio';
import { BG, spellIcon } from '../assets';
import { matchZh, matchEn } from './match';
import { view, HERO_X, BASE_Y } from '../phaser/view';
import { $, $$, esc, render, hud, toast, sleep, on, zh, setBattleHud, setTitle, flyTo } from '../ui/dom';

export type BattleKind = 'path' | 'patrol' | 'boss' | 'walk';
export interface BattleResult { outcome: 'win' | 'defeat' | 'flee'; exp: number; gold: number; loot: string[]; levels: number; learned: string[];
  questions: number; correct: number; spoken: number; voids: number; tired: boolean; gearGot: string[]; equipped: string[]; }
interface Foe { d: EnemyDef; hp: number; maxHp: number; alive: boolean; skipNext: boolean; halfDone: boolean; waxUsed: boolean; stolen: number;
  skipWhy?: string; soaked?: boolean; summoned?: boolean; fx?: string | null; }
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
/** v3.4 §6.7 spell damage: max(1, round_half_up(P × (Tired ? 1.5 : 1) − DEF_e)). Fixed power P: no ATK, streak or spoken factor.
 *  Factors come from spells.json rules (tiredMult, defMult = 1 → full DEF). v3.5: no Magic Ward. */
export function spellDamage(power: number, tired: boolean, defE: number) {
  const R = SPELL_RULES;
  return Math.max(1, r(power * (tired ? R.tiredMult : 1) - R.defMult * defE));
}
export const isBossKind = (d: EnemyDef) => d.kind === 'locboss' || d.kind === 'realmboss';
export const TARGET_LABEL: Record<string, string> = { single: '🎯 单个 one enemy', same_type: '👥 同类 one kind (max 3)', all: '🌐 全部 all (max 3)' };
const STATUS_FX: Record<string, string> = { soak: 'soaked', daze: 'dazed', chill: 'chilled', freeze: 'frozen' };
(window as any).__proto = (window as any).__proto || {}; (window as any).__proto.spellRules = SPELL_RULES;
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
  const tiredAt = (C().tiredAtQuestions as Record<string, number>)[leader ? leader.d.kind : 'normal'] ?? C().tiredAtQuestions.normal;   // v3.2: 30 normal (elites too), 45 every boss
  const set = chooseBattleSet(locId, loc.reviewSlots + (isBoss ? 1 : 0));
  const feed = new QuestionFeed(set.ids);
  const ctx: WayCtx = { asked: 0, spoken: 0, cooling: new Set() };
  (window as any).__proto.summons = 0;
  const wpn = S.equip.weapon ? GEAR[S.equip.weapon] : null;
  const bs = { summons: 0, gauge: 0, round: 0, streak: wpn?.startStreak || 0, q: 0, potions: 0, insight: 0, heal: 0, shield: 0, doubleReady: 0, fastWrongs: 0, focus: false, log: [] as string[], checkpointHit: S.locs[locId].bossCheckpoint, casts: 0, lastCastQ: -1 };
  const res: BattleResult = { outcome: 'win', exp: 0, gold: 0, loot: [], levels: 0, learned: [], questions: 0, correct: 0, spoken: 0, voids: 0, tired: false, gearGot: [], equipped: [] };
  const tired = () => bs.q >= tiredAt;
  // v3.5 cast rule: no per-battle cap and no unlock; MP is the only limit (cast any turn, back to back)
  const castKind: 'normal' | 'elite' | 'boss' = leader || isBoss ? 'boss' : foes.some(f => f.d.kind === 'elite') ? 'elite' : 'normal';
  /** Why a spell can't be cast now (null = it can): only MP. */
  const castBlock = (sp?: SpellDef): { why: 'mp'; text: string } | null => (sp && S.mp < sp.mp ? { why: 'mp', text: `needs ${sp.mp} MP` } : null);
  let bookTab: 'skills' | 'spells' = 'skills'; let bookPage = 0;
  (window as any).__proto.foes = () => foes.map(f => ({ id: f.d.id, kind: f.d.kind, hp: f.hp, maxHp: f.maxHp, atk: f.d.atk, def: f.d.def_, alive: f.alive }));
  (window as any).__proto.castState = () => ({ casts: bs.casts, kind: castKind, correct: res.correct, q: bs.q, lastCastQ: bs.lastCastQ, streak: bs.streak, round: bs.round });
  const log = (m: string, line = true) => { bs.log.unshift(m); const el = $('#blog'); if (el) el.innerHTML = bs.log.slice(0, 60).map(x => `<div>${x}</div>`).join(''); if (line) msg(m); };
  /** The dock's one message line (replaces the old scrolling log; the full log is under ⏸️ → Battle log). */
  const msg = (html: string, testid = '') => { const el = $('#bmsg'); if (!el) return; el.innerHTML = html; if (testid) el.dataset.testid = testid; else delete el.dataset.testid; };
  const side = (html: string) => { const el = $('#bside'); if (el) el.innerHTML = html; };
  const zhName = (f: Foe) => zh(f.d.zh);
  S.stats.battles++;
  view.mode('battle', parseInt(loc.bg), BG.battle(loc, isBoss));
  playMusic(leader || isBoss ? 'mus_battle_boss' : 'mus_battle_field');
  const syncView = () => { view.enemies(foes.map(f => ({ sprite: f.d.sprite, tint: f.d.spriteTint, emoji: f.d.emoji, name: f.d.zh, hp: f.hp, maxHp: f.maxHp, color: f.d.color, boss: ['locboss', 'realmboss'].includes(f.d.kind) })));
    foes.forEach((f, i) => { if (f.alive && f.fx) view.setStatus(i, f.fx); }); };
  syncView();

  // ---- UI skeleton: everything sits inside the 1280x720 frame; the dock (24,464,1232x236) never changes size (spec §4)
  const skeleton = () => {
    render(`<div data-testid="battle" class="battle">
      <div id="roundchip" class="plate"></div>
      <div id="banner" class="hidden" data-testid="spell-banner"></div>
      <div id="tgts"></div>
      <div id="dock" class="panel" data-testid="dock"><div id="bmsg"></div><div id="bside"></div><div id="bmain"></div></div>
      <div id="blog" class="hidden"></div></div>`);
    setTitle(null);
    const names = foes.map(zhName).join(foes.length > 2 ? ', ' : ' and ');
    log(leader ? `👑 Boss battle! ${zhName(foes[0])} ${esc(foes[0].d.en)} appears!` : `${names} appeared!`);
  };
  let lastStreak = -1;
  const refresh = () => {
    setBattleHud({ gauge: bs.gauge });
    const rc = $('#roundchip');
    if (rc) {
      const st = [hero.webbed ? '<span title="Webbed: next attack does half damage">🕸️</span>' : '', hero.rooted ? '<span title="Rooted: can\'t run away">🌱</span>' : '', tired() ? '<span title="Enemies are tired">😪</span>' : ''].join('');
      rc.innerHTML = `Round ${bs.round} · <span class="st" data-testid="streak" title="Streak ${bs.streak} (damage ×${streakMult(bs.streak)})">🔥 ×${bs.streak}</span>${st}`;
      if (lastStreak >= 0 && bs.streak > lastStreak) { const e = $('.st', rc); e.classList.add('bump'); }
      lastStreak = bs.streak;
    }
    foes.forEach((f, i) => view.updateEnemy(i, f.hp, tired()));
  };
  const banner = (html: string | null, cls = '') => {
    const b = $('#banner'), rc = $('#roundchip'); if (!b) return;
    if (html === null) { b.classList.add('hidden'); b.innerHTML = ''; rc?.classList.remove('hidden'); return; }
    b.className = cls; b.innerHTML = html; rc?.classList.add('hidden');
  };
  const dockMain = async (html: string) => {   // dock content cross-fades (150 ms); the dock itself never resizes
    const m = $('#bmain'); if (!m) return m; m.classList.add('fade'); await sleep(90); m.innerHTML = html; m.classList.remove('fade'); return m;
  };
  const heroFrame = () => ({ x: HERO_X, y: BASE_Y - 250 });
  const splitEn = (en: string) => { const m = en.match(/^(.*?)\s*(\(.*\))\s*$/); return m ? `${esc(m[1])}<span class="hint"> ${esc(m[2])}</span>` : esc(en); };

  // Words are drawn silently from the location pool (no per-battle word list; the full pool is on the preview / practice pages).
  skeleton(); refresh();

  // ---- ASK
  async function ask(turn: 'attack' | 'defense' | 'heal' | 'spell', foe?: Foe, spell?: SpellDef): Promise<Outcome> {
    let { id, way, why } = feed.next(ctx);
    const item = ITEM[id];
    let reprompts = 0;
    let out: Outcome;
    for (;;) {
      if (way[0] === 's' && !speechOn()) way = pickWay(id, ctx);
      out = await renderQuestion(id, way, turn, foe, reprompts, spell);
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
    banner(null); view.clearFocus(); side('');
    bs.q++; res.questions++;
    feed.record(id, way, out.result);
    (window as any).__proto.lastOutcome = { id, way, ...out };
    S.log.unshift({ t: Date.now(), id, way, why, turn, result: out.result, spoken: out.spoken, hinted: out.hinted, fast: out.fast }); S.log.length = Math.min(S.log.length, 300);
    if (out.result === 'void') { res.voids++; return out; }
    // companion gauge (v3): +20 wrong, +5 correct, 0 for hinted answers
    const CG = B.companion; const before = bs.gauge;
    if (!out.hinted) bs.gauge = Math.min(CG.gaugeFull, bs.gauge + (out.result === 'correct' ? CG.gainPerCorrect : CG.gainPerWrong));
    if (bs.gauge > before && out.result !== 'correct') flyTo(`💖 +${bs.gauge - before}`, heroFrame(), 'gauge', '#ff7eb3');   // the mistake visibly turns into help
    if (bs.gauge >= CG.gaugeFull && before < CG.gaugeFull) { log(`💖 Your companion ${zh('小龙')} is ready to help!`); toast(`💖 ${zh('小龙')}: ${zh('我来帮你!')}`); }
    ctx.asked++; if (out.spoken) { ctx.spoken++; res.spoken++; S.stats.spoken++; }
    S.stats.questions++;
    const g = grade(id, way, out.result === 'correct', out.hinted);
    if (g.wayDone) { bs_exp(B.learning.expWayComplete, `⭐ ${item.zh}: a way is complete! +${B.learning.expWayComplete} EXP`); }
    if (g.becameProficient) { bs_exp(B.learning.expProficient, `🏅 ${item.zh} is now Proficient! +${B.learning.expProficient} EXP`); res.learned.push(id); }
    if (out.result === 'correct') {
      res.correct++; S.stats.correct++;
      if (!(out.fast && !proficient(id))) bs.streak += 1 + (out.spoken ? C().spokenExtraStreak : 0);
      const mp0 = S.mp; S.mp = Math.min(heroStats().maxMp, S.mp + C().mpPerCorrect);
      if (S.mp > mp0) flyTo(`+${S.mp - mp0} MP`, heroFrame(), 'mp');
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

  async function renderQuestion(id: string, way: WayKey, turn: string, foe: Foe | undefined, reprompts: number, spell?: SpellDef): Promise<Outcome & { tech?: boolean; fatal?: string }> {
    const item = ITEM[id]; const p = prog(id);
    // Spell banner (top centre) always holds the stimulus: gold edge = I'm casting, red = the enemy casts at me (spec §4.2)
    const head = turn === 'defense' ? `🛡️ ${foe ? zhName(foe) : ''} casts a spell! Block it!` : turn === 'heal' ? '💚 Heal spell!'
      : turn === 'spell' && spell ? `${spell.emoji} ${zh(spell.zh)} ${esc(spell.en)}! Answer right to cast it!` : '⚔️ Cast your spell!';
    const cls = turn === 'defense' ? 'def' : turn === 'heal' ? 'heal' : turn === 'spell' ? 'atk magic' : 'atk';
    const zhStim = `<div class="qzh" lang="zh-CN" data-testid="q-zh">${item.zh}</div><button class="secondary" id="replay" title="Hear it again" aria-label="Hear it again">🔊</button>`;   // characters only (no pinyin anywhere; 🔊 gives the sound)
    const enStim = `<div class="stim">${splitEn(item.enPrimary)}</div>`;
    const zhPrompt = way === 'rZE' || way === 'sZE';
    banner(`<div class="h">${head}</div>${zhPrompt ? zhStim : enStim}`, cls);
    view.focus({ turn: turn === 'spell' ? (foe ? 'attack' : 'heal') : turn, target: (turn === 'attack' || turn === 'spell') && foe ? foes.indexOf(foe) : undefined, attacker: turn === 'defense' && foe ? foes.indexOf(foe) : undefined });
    const unlockDelay = bs.focus ? C().focusDelayMs : 0; bs.focus = false;
    const rp = () => { const b = $('#replay'); if (b) b.onclick = () => sayItem(id); };
    if (way === 'rZE' || way === 'rEZ') {
      const first = Object.values(p.ways).every(w => w.a === 0);
      const n = Math.max(B.learning.minOptions, LOC[currentLoc].mcOptions - (first ? B.learning.firstAskOptionReduction : 0));
      const opts = [id, ...distractors(id, n - 1)].sort(() => Math.random() - 0.5);
      const zhOpts = way === 'rEZ';
      const label = (oid: string) => zhOpts ? `<span lang="zh-CN">${ITEM[oid].zh}</span>` : esc(ITEM[oid].enPrimary);
      const canInsight = () => S.skillsEquipped.includes('insight') && bs.insight < SKILL.insight.perBattle! && S.mp >= SKILL.insight.mp && $$('#bmain .ans:not(.gone)').length > 2;
      msg(zhOpts ? `${turn === 'defense' ? 'Block it! ' : ''}Tap the Chinese that means <b>${esc(item.enPrimary)}</b>` : `${turn === 'defense' ? 'Block it! ' : ''}Tap what it means`);
      side(S.skillsEquipped.includes('insight') ? `<button class="ghost" id="insight" data-testid="insight">💡 Insight · ${SKILL.insight.mp} MP</button>` : '');
      const nc = Math.min(4, Math.max(2, opts.length));
      const main = await dockMain(`<div class="answers" data-testid="question" data-way="${way}">${opts.map((o, k) =>
        `<button class="ans n${nc} ${zhOpts ? 'zhA' : 'enA'}" data-o="${o}" data-testid="opt" data-key="${k + 1}" disabled><span class="k">${k + 1}</span>${label(o)}</button>`).join('')}</div>`);
      rp();
      (window as any).__proto.q = { id, way, answerId: id, zh: item.zh, en: item.enPrimary, turn };
      let hinted = false;
      const ins = $('#insight') as HTMLButtonElement | null;
      const updIns = () => { if (ins) ins.disabled = !canInsight(); };
      if (ins) ins.onclick = () => {
        if (!canInsight()) return; S.mp -= SKILL.insight.mp; bs.insight++; hinted = true; hud();
        const wrong = $$('#bmain .ans:not(.gone)').filter(b => b.dataset.o !== id); const b = wrong[Math.floor(Math.random() * wrong.length)];
        b.classList.add('gone'); b.style.visibility = 'hidden'; updIns(); log('💡 Insight removed one choice (this answer won\'t count toward learning).');
      };
      updIns();
      // PROMPT_PLAY -> INPUT_UNLOCKED (after audio, or 800 ms for text-only prompts); cards sit at 60% with no press state until then
      if (zhPrompt) await sayItem(id, C().audioUnlockMaxMs); else await sleep(C().textUnlockMs);
      if (unlockDelay) await sleep(unlockDelay);
      $$('#bmain .ans:not(.gone)').forEach(b => { (b as HTMLButtonElement).disabled = false; b.classList.add('live'); }); updIns();
      const t0 = performance.now();
      const pick = await new Promise<string>(res => on('.ans', (_e, el) => res(el.dataset.o!), main!));
      const fast = performance.now() - t0 < C().fastAnswerMs;
      $$('#bmain .ans').forEach(b => { (b as HTMLButtonElement).disabled = true; b.classList.remove('live'); if (b.dataset.o === id) b.classList.add('right'); else if (b.dataset.o === pick) b.classList.add('wrong'); else b.classList.add('faded'); });
      if (ins) ins.disabled = true;
      const correct = pick === id;
      await feedback(id, correct, turn, undefined);
      return { result: correct ? 'correct' : 'wrong', spoken: false, hinted, fast };
    }
    // ---- spoken ways: one 150px mic in the dock centre, nothing else tappable (spec §4.3)
    const zhAns = way === 'sEZ';
    const lang = zhAns ? 'zh-CN' : 'en-US';
    msg(zhAns ? `🎤 Say it in <b>Chinese</b>: <b>${esc(item.enPrimary)}</b>` : '🎤 Say what it means in <b>English</b>');
    side('');
    await dockMain(`<div class="speech" data-testid="question" data-way="${way}">
      <div class="l">${reprompts ? '🤫 Didn\'t hear you.<br>Tap and talk!' : 'Tap the mic,<br>then say it out loud.'}</div>
      <button id="mic" data-testid="mic" data-key="enter" aria-label="Microphone" disabled>🎤</button>
      <div class="r" id="micmsg">Listening starts after the beep.<br>No rush: there is no clock.</div></div>`);
    rp();
    (window as any).__proto.q = { id, way, answerId: id, zh: item.zh, en: item.enPrimary, turn, spoken: true };
    if (!zhAns && reprompts === 0) await sayItem(id, C().audioUnlockMaxMs); else await sleep(C().textUnlockMs);
    const mic = $('#mic') as HTMLButtonElement; mic.disabled = false; mic.classList.add('pulse');
    await new Promise<void>(res => mic.onclick = () => res());
    mic.classList.remove('pulse'); mic.classList.add('listening'); mic.textContent = '👂'; $('#micmsg').innerHTML = '👂 Listening…<br>say it now!';
    beep(); duck(true);
    const long = [...item.zh].length > B.speech.longAnswerSyllables;   // 1 character = 1 syllable
    const lr = await listen(lang, long);
    duck(false);
    mic.classList.remove('listening'); mic.textContent = '🎤'; mic.disabled = true;
    if (lr.kind === 'tech') { mic.classList.add('hush'); mic.textContent = '🤫'; log(`🎤 (technical: ${lr.code}) re-prompt`, false); await sleep(400); return { result: 'void', spoken: true, hinted: false, fast: false, tech: true }; }
    if (lr.kind === 'fatal') return { result: 'void', spoken: true, hinted: false, fast: false, fatal: lr.code };
    let correct = false; let heard = '';
    if (lr.kind === 'result') { const m = zhAns ? matchZh(lr.alts, item) : matchEn(lr.alts, item); correct = m.ok; heard = lr.alts[0] || ''; }
    else heard = '(could not understand)';
    // "I heard: …" for 800 ms before grading, so the child sees the game listened
    mic.classList.add('heard'); mic.textContent = '💬'; $('#micmsg').innerHTML = `💬 I heard:<br>“${esc(heard)}”`;
    await sleep(800);
    await feedback(id, correct, turn, heard);
    return { result: correct ? 'correct' : 'wrong', spoken: true, hinted: false, fast: false };
  }

  /** Feedback lives on the cards (✔/✘) and the message line; the dock never grows. Wrong = the correct word's audio, never pinyin. */
  async function feedback(id: string, correct: boolean, _turn: string, heard?: string) {
    const item = ITEM[id];
    const heardTxt = heard !== undefined ? ` <span class="muted">(I heard “${esc(heard)}”)</span>` : '';
    if (correct) {
      playSfx('sfx_correct', { detune: 100 * Math.min(5, bs.streak) });
      msg(`✔ Great! ${zh(item.zh)} = ${esc(item.enPrimary)}`, 'fb-ok');
      sayItem(id);
      await sleep(Math.max(800, C().correctFeedbackMs));
      return;
    }
    playSfx('sfx_wrong');
    msg(`✘ Not quite. “${esc(item.enPrimary)}” is ${zh(item.zh)} 🔊${heardTxt}`, 'fb-bad');
    const audio = sayItem(id);   // the correct word's audio is the pronunciation aid
    await Promise.all([sleep(C().feedbackMinMs), audio]);
    side(`<button id="cont" data-testid="continue" data-key="enter">OK ▶</button>`);
    const b = $('#cont') as HTMLButtonElement;
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
    if (gold) setTimeout(() => { flyTo(`+${gold} 🪙`, { x: 900, y: 300 }, 'gold', '#ffe27a'); hud(); }, 700);
    playSfx('sfx_enemy_defeat'); if (gold) setTimeout(() => playSfx('sfx_gold'), 250); if (lv) setTimeout(() => playSfx('sfx_level_up'), 500);
    log(`💥 ${zhName(f)} defeated!${exp || gold ? ` +${exp} EXP, +${gold} 🪙` : ' (no reward)'}`);
    for (const m of questKill(f.d.id, locId, !!f.summoned)) { log(m, false); toast(m); }
    if (lv) toast(`🎉 Level up! You are now level ${S.level}`);
    if (Math.random() < f.d.chestRate) openChest(f.d.kind);
    save();
  }
  function openChest(kind: string) {
    const G = loc.G;
    const giveFine = () => {
      const cand = GEAR_LIST.filter(g => g.rarity === 'fine' && g.tier === loc.tier && !S.gear.includes(g.id));
      if (!cand.length) { S.gold += 3 * G; res.gold += 3 * G; res.loot.push(`🪙 ${3 * G} gold`); return; }
      const g = cand[Math.floor(Math.random() * cand.length)]; S.gear.push(g.id); res.gearGot.push(g.id); res.loot.push(`${g.emoji} ${g.zh} ${g.en} (fine)`);
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
      if (c.heroicGear && hid && GEAR[hid] && !S.gear.includes(hid)) { S.gear.push(hid); res.gearGot.push(hid); res.loot.push(`👑 ${GEAR[hid].emoji} ${GEAR[hid].zh} ${GEAR[hid].en} (heroic)`); }
    }
    playSfx('sfx_chest'); log('🎁 A treasure chest! ' + res.loot[res.loot.length - 1]); toast('🎁 Treasure chest!');
  }
  let f_web = 1;
  function summon(id: string, max: number, by: Foe, maxSummons = 99) {
    if (foes.filter(x => x.alive).length >= Math.min(max, C().maxEnemies) || bs.summons >= maxSummons) return;
    bs.summons++; (window as any).__proto.summons = bs.summons;
    const n = mk(id); n.summoned = true; const dead = foes.findIndex(x => !x.alive && x !== leader);
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
    f.hp -= d; view.hitEnemy(i, d, { spoken }); setTimeout(() => playSfx('sfx_hit'), 250); log(`⚔️ You hit ${zhName(f)} for ${d}${spoken ? ' (🎤 voice ×1.25)' : ''}${bs.streak >= 3 ? ` (streak ×${streakMult(bs.streak)})` : ''}`);
    if (f.hp <= 0) kill(f); else { checkCheckpoint(); halfTriggers(f); }
    refresh(); await sleep(750);
  }

  // ---- v3.4 spells: a free action (no question, no fizzle, no MP regen, streak unchanged) that replaces the attack (spec §6.7).
  // rules.castRequiresAnswer = true brings back the v3.3 "answer to cast" path (wrong answer fizzles).
  async function castSpell(sp: SpellDef, tgt: Foe | undefined) {
    const R = SPELL_RULES; const mpBefore = S.mp; const q0 = bs.q; const streak0 = bs.streak;
    const live = foes.filter(f => f.alive); const first = tgt && tgt.alive ? tgt : live[0];
    S.mp -= sp.mp; bs.casts++; bs.lastCastQ = bs.q; hud();
    flyTo(`−${sp.mp} MP`, heroFrame(), 'mp', '#9be7ff');
    const info: any = { id: sp.id, power: sp.power, defMult: R.defMult, tiredMult: R.tiredMult, mpBefore, mpCost: sp.mp, hits: [],
      qBefore: q0, streakBefore: streak0, casts: bs.casts, round: bs.round, kind: castKind, asked: false };
    (window as any).__proto.lastSpell = info;
    if (R.castRequiresAnswer) {
      info.asked = true; const o = await ask('spell', sp.target === 'all' ? undefined : first, sp); info.result = o.result;
      if (o.result !== 'correct') {
        if (o.result === 'void' || !R.fizzleSpendsMp) { S.mp = Math.min(heroStats().maxMp, S.mp + sp.mp); hud(); }
        if (o.result === 'wrong') { view.fizzle(sp.element); setTimeout(() => playSfx('sfx_miss'), 180); log(`💨 ${zh('失灵')} Fizzle! ${zh(sp.zh)} didn't work.`); $('#bmsg')!.dataset.testid = 'fizzle'; await sleep(900); }
        info.mpEnd = S.mp; save(); return;
      }
    }
    const tiredNow = tired(); info.tired = tiredNow;
    const pool = sp.target === 'single' ? [first] : sp.target === 'same_type' ? [first, ...live.filter(f => f !== first && f.d.id === first.d.id)] : live;
    const hitList = pool.filter(Boolean).slice(0, R.maxTargets);
    const dmgs: number[] = []; const status: (string | null)[] = []; const lines: string[] = [];
    for (const f of hitList) {
      let d = spellDamage(sp.power, tiredNow, f.d.def_);
      const wax = !!(f.d.mech.waxShieldFirstHit && !f.waxUsed);
      if (wax) { f.waxUsed = true; d = f.d.mech.waxShieldFirstHit!; log(`🕯️ ${f.d.zh}'s wax shield soaks up the spell!`, false); }
      f.hp = Math.max(0, f.hp - d); dmgs.push(d); let st: string | null = null;
      if (f.hp > 0 && sp.status) {
        const bm = isBossKind(f.d) ? (R.statusBossMultBy?.[sp.status] ?? R.bossStatusMult) : 1;
        if (sp.status === 'soak') { if (Math.random() < bm || bm >= 1) { f.soaked = true; st = 'soaked'; } }
        else if (sp.skipChance > 0 && Math.random() < sp.skipChance * bm) { f.skipNext = true; f.skipWhy = `${zh(sp.statusZh || '')} ${sp.statusEn}`; st = STATUS_FX[sp.status] || null; }
        if (st) { f.fx = st; lines.push(`${sp.emoji} ${zhName(f)} ${zh(sp.statusZh || '')} ${esc(sp.statusEn || '')}`); }
      }
      status.push(st); info.hits.push({ i: foes.indexOf(f), enemy: f.d.id, boss: isBossKind(f.d), def: f.d.def_, dmg: d, hpAfter: f.hp, status: st, wax });
    }
    msg(`${sp.emoji} ${zh(sp.zh)} ${esc(sp.en)}!`, 'spell-cast');
    void dockMain(`<div class="casting" data-testid="casting"><span class="sic">${spellIcon(sp.id, sp.emoji, 56)}</span><span><b lang="zh-CN">${sp.zh}</b> ${esc(sp.en)}<br><span class="muted">🔷 −${sp.mp} MP · ${TARGET_LABEL[sp.target]}</span></span></div>`);
    setTimeout(() => playSpellSfx(sp.id), 300);
    // the animation (2–3 s, src/data/spellfx.json castAnim) can be skipped with a tap anywhere / Enter / Space
    const sk = document.createElement('button'); sk.id = 'fxskip'; sk.className = 'fxskip'; sk.dataset.testid = 'fx-skip'; sk.setAttribute('aria-label', 'Skip');
    sk.innerHTML = '<span>▶▶ <span lang="zh-CN">跳过</span> Tap to skip</span>'; sk.onclick = () => { info.skippedAt ??= Math.round(performance.now() - t0); view.skipCast(); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { info.skippedAt ??= Math.round(performance.now() - t0); view.skipCast(); } };
    const t0 = performance.now();
    $('[data-testid="battle"]')?.appendChild(sk); document.addEventListener('keydown', key);
    await view.castSpell(sp, hitList.map(f => foes.indexOf(f)), dmgs, hitList.map(f => f.hp), { status });
    info.animMs = Math.round(performance.now() - t0);
    sk.remove(); document.removeEventListener('keydown', key);
    log(`${sp.emoji} ${zh(sp.zh)} ${esc(sp.en)} hits ${hitList.map((f, k) => `${zhName(f)} for ${dmgs[k]}`).join(', ')}${tiredNow ? ' (😪 ×' + R.tiredMult + ')' : ''}`);
    for (const l of lines) log(l, false);
    for (const f of hitList) { if (f.hp <= 0 && f.alive) kill(f); else if (f.alive) { checkCheckpoint(); halfTriggers(f); } }
    info.qAfter = bs.q; info.streakAfter = bs.streak; info.mpEnd = S.mp; info.done = true;
    refresh(); save(); await sleep(250);
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
        msg(`🐲 ${zh('小龙')} is ready!`); await sleep(400);
        t.hp -= d; view.hitEnemy(foes.indexOf(t), d, { companion: true }); setTimeout(() => playSfx('sfx_hit'), 250); log(`🐲 ${zh('小龙')}: ${zh('我来帮你!')} ${zh('小龙')} breathes fire on ${zhName(t)} for ${d}!`);
        if (t.hp <= 0) kill(t); else { checkCheckpoint(); halfTriggers(t); }
        refresh(); await sleep(1100);
        if (bossDead() || allDead()) { res.outcome = 'win'; break; }
      }
    }
    if (bs.round === 1) for (const f of foes.filter(x => x.alive && x.d.mech.quickStart)) { log(`💨 ${f.d.zh} is super fast and attacks first!`); if (await enemyTurn(f)) { res.outcome = 'defeat'; return finish(); } }
    let act: Awaited<ReturnType<typeof chooseAction>>; let target: Foe | undefined;
    for (;;) {   // TARGET_SELECT can go ◀ Back to the commands
      act = await chooseAction(); target = undefined;
      if (act.type !== 'attack' && act.type !== 'double' && !(act.type === 'spell' && SPELL[act.item!].target !== 'all')) break;
      const live = foes.filter(f => f.alive);
      if (live.length === 1) { target = live[0]; break; }
      const k = await chooseTarget(live, act.type === 'spell' ? SPELL[act.item!] : undefined); if (k >= 0) { target = live[k]; break; }
    }
    $('#tgts') && ($('#tgts').innerHTML = ''); view.setTarget(-1);
    hero.rooted = false;
    potionUsedThisTurn = false;
    if (act.type === 'flee') { res.outcome = 'flee'; S.stats.flees++; log('🏃 You ran away!'); break; }
    if (act.type === 'potion') {
      const c = CONS[act.item!]; const h = heroStats(); S.inv[c.id]--; bs.potions++; potionUsedThisTurn = true; playSfx('sfx_potion');
      if (c.healHpFrac) for (const b of foes) if (b.alive && b.d.mech.honeyDistract) { b.skipNext = true; log(`${b.d.emoji} ${b.d.zh} stares at your honey and forgets to attack!`); }
      if (c.healHpFrac) { const n = Math.round(c.healHpFrac * h.maxHp); S.hp = Math.min(h.maxHp, S.hp + n); view.heroFloat('+' + n); log(`${c.emoji} +${n} HP`); }
      if (c.healMpFrac) { const n = Math.round(c.healMpFrac * h.maxMp); S.mp = Math.min(h.maxMp, S.mp + n); view.heroFloat('+' + n + ' MP', '#6dd5fa'); log(`${c.emoji} +${n} MP`); }
      refresh();
    } else if (act.type === 'spell') {
      await castSpell(SPELL[act.item!], target);
    } else if (act.type === 'heal') {
      S.mp -= SKILL.heal.mp; bs.heal++; hud();
      const o = await ask('heal');
      if (o.result === 'correct') { const h = heroStats(); const n = Math.round(SKILL.heal.healFrac! * h.maxHp); S.hp = Math.min(h.maxHp, S.hp + n); view.heroFloat('+' + n); log(`💚 Healed ${n} HP`); }
      else if (o.result === 'wrong') log('💚 The heal fizzled.');
      refresh();
    } else {
      if (!target) target = foes.filter(f => f.alive)[0];
      const dbl = act.type === 'double';
      if (dbl) { S.mp -= SKILL.double.mp; bs.doubleReady = SKILL.double.cooldownRounds! + 1; hud(); }
      f_web = hero.webbed ? hero.webMult : 1;
      const o = await ask('attack', target);
      if (hero.webbed && o.result === 'correct') log('🕸️ The sticky web slows your attack (half damage).');
      if (o.result === 'correct') {
        await hit(target, 1, o.spoken);
        if (dbl && target.alive && bs.streak >= SKILL.double.minStreak!) await hit(target, SKILL.double.secondHitFrac!, o.spoken);
      } else if (o.result === 'wrong') { view.hitEnemy(foes.indexOf(target), 'MISS'); setTimeout(() => playSfx('sfx_miss'), 180); log('💨 Your spell missed!'); await sleep(600); }
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
    if (f.skipNext) { f.skipNext = false; log(`${f.d.emoji} ${f.d.zh}${f.skipWhy ? ` is ${f.skipWhy} and` : ''} skips its attack.`); f.skipWhy = undefined;
      if (f.fx && f.fx !== 'soaked') { f.fx = null; view.setStatus(i, null); } return false; }
    if (f.d.mech.dozeEveryNRounds && bs.round % f.d.mech.dozeEveryNRounds === 0) { log(`💤 ${f.d.zh} dozes off… Zzz (skips its attack)`); view.enemyAttack(i, 'Zzz', true); return false; }
    view.windUp(i, true); msg(`${zhName(f)} is casting!`); await sleep(400);   // ENEMY WIND-UP (telegraph)
    const o = await ask('defense', f);
    view.windUp(i, false);
    const h = heroStats(); const soak = f.soaked ? SPELL_RULES.soakMult : 1; f.soaked = false; if (f.fx === 'soaked') { f.fx = null; view.setStatus(i, null); }
    if (soak !== 1) log(`💧 ${f.d.zh} is soaked: its attack is weaker (×${soak}).`, false);
    const atkE = f.d.atk * (tired() ? C().tiredEnemyAtkMult : 1) * soak;
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
    refresh(); hud(); await sleep(700);
    return S.hp <= 0;
  }

  function finish(): BattleResult {
  decayRecentMisses();
  // v3.2 §7.9: a dropped piece that is strictly better than the worn one is equipped right away (after the fight, so stats never change mid-battle)
  for (const id of res.gearGot) { const r = gainGear(id); if (r.equipped) res.equipped.push(equipLine(GEAR[id], r.from)); }
  clampHpMp();
  if (res.outcome !== 'flee') playSting(res.outcome === 'win' ? 'stg_victory' : 'stg_defeat');
  if (res.outcome === 'win') { S.stats.wins++; S.courage = 0; if (isBoss) S.locs[locId].bossCheckpoint = false; }
  save(); setBattleHud(null); view.clearFocus();
  (window as any).__proto.q = null; (window as any).__proto.battleLog = bs.log.slice(0, 200);
  return res;
  }

  // ---- action menus: 4 big bilingual commands; Skills / Items / targets open inside the same dock (spec §4.1)
  function chooseAction(): Promise<{ type: 'attack' | 'double' | 'heal' | 'potion' | 'flee' | 'spell'; item?: string }> {
    return new Promise(async resolve => {
      const eq = (s: string) => S.skillsEquipped.includes(s);
      const potionsLeft = C().potionsPerBattle - bs.potions;
      const pots = ['honey', 'bighoney', 'manatea', 'bigmanatea'].filter(p => CONS[p] && CONS[p].battleUse !== false && (S.inv[p] || 0) > 0);   // v3.4: MP potions are map-only
      const nPots = pots.reduce((a, p) => a + (S.inv[p] || 0), 0);
      const dblOk = eq('double') && S.mp >= SKILL.double.mp && bs.doubleReady === 0 && bs.streak >= SKILL.double.minStreak!;
      const healOk = eq('heal') && S.mp >= SKILL.heal.mp && bs.heal < SKILL.heal.perBattle!;
      const hasSkillsOnly = eq('double') || eq('heal');
      const owned = S.spells.filter(id => SPELL[id]);
      const hasSkills = hasSkillsOnly || owned.length > 0;   // v3.3: the Spellbook tab lives inside ✨ 技能 Skills
      bookTab = hasSkillsOnly ? 'skills' : 'spells';   // opens on 技能 Skills each turn (Spells first when there are no skills)
      const live = foes.filter(f => f.alive); if (live.length > 1) view.setTarget(foes.indexOf(live[0]));
      const cmd = (k: number, a: string, ic: string, z: string, en: string, extra = '', cls = 'cream') =>
        `<button class="cmd ${cls}" ${a} data-key="${k}" ${extra}><span class="k">${k}</span><span class="ic">${ic}</span><span class="zh" lang="zh-CN">${z}</span><span class="en">${en}</span></button>`;
      const intro = bs.round === 1 && !bs.q && !/What will you do/.test($('#bmsg')?.textContent || '') ? ($('#bmsg')?.innerHTML || '') + ' ' : '';
      const menu = async () => {
        side('');
        msg(`${intro}What will you do?${hero.webbed ? ' 🕸️ (webbed: half damage)' : ''}`);
        await dockMain(`<div class="cmds" data-testid="action-menu">
          ${cmd(1, 'data-a="attack" data-testid="act-attack"', '⚔️', '攻击', 'Attack', '', '')}
          ${cmd(2, 'data-sub="skills" data-testid="act-skills"', '✨', '技能', hasSkills ? (owned.length ? 'Skills · Spells' : 'Skills') : 'Skills · none yet', hasSkills ? '' : 'disabled')}
          ${cmd(3, 'data-sub="items" data-testid="act-itemsmenu"', '🍯', '道具', `Items ×${nPots}`, nPots ? '' : 'disabled')}
          ${cmd(4, 'data-a="flee" data-testid="act-flee"', '🏃', '逃跑', hero.rooted ? 'Run · rooted 🌱' : 'Run', hero.rooted ? 'disabled title="Rooted!"' : '')}</div>`);
        wire();
      };
      const sub = async (which: 'skills' | 'items') => {
        const back = `<button class="ghost back" data-back="1" data-testid="act-back" data-key="${which === 'skills' ? 3 : pots.length + 1}">◀ Back</button>`;
        $('#dock')?.classList.remove('tabs');
        if (which === 'skills' && owned.length && !hasSkillsOnly) bookTab = 'spells';   // no skills yet: open straight on the Spellbook
        if (which === 'skills' && owned.length) {   // two tabs: 技能 Skills | 魔法 Spells (spec v3.3 §6.7)
          $('#dock')?.classList.add('tabs');
          side(`<div class="tabs" role="tablist"><button class="tab ${bookTab === 'skills' ? 'on' : 'ghost'}" data-tab="skills" data-testid="tab-skills" ${hasSkillsOnly ? '' : 'disabled'} role="tab">✨ <span lang="zh-CN">技能</span> Skills</button>`
            + `<button class="tab ${bookTab === 'spells' ? 'on' : 'ghost'}" data-tab="spells" data-testid="tab-spells" role="tab">📖 <span lang="zh-CN">魔法</span> Spells</button></div>`);
          on('#bside [data-tab]', (_e, el) => { bookTab = el.dataset.tab as any; bookPage = 0; sub('skills'); });
        }
        if (which === 'skills' && bookTab === 'spells' && owned.length) {
          const per = 4; const pages = Math.ceil(owned.length / per); bookPage = Math.min(bookPage, pages - 1);
          const shown = owned.slice(bookPage * per, bookPage * per + per).map(id => SPELL[id]);
          msg(`📖 ${zh('魔法书')} Spellbook: 🔷 ${S.mp} MP. Casting is instant (no question).`, 'spellbook-msg');
          await dockMain(`<div class="sublist spellbook" data-testid="spellbook">${shown.map((sp, k) => { const b2 = castBlock(sp); const ok = !b2;
            return `<button class="spell" data-a="spell" data-item="${sp.id}" data-testid="spell-${sp.id}" data-key="${k + 1}" data-block="${b2?.why || ''}" ${ok ? '' : 'disabled'} title="${esc(TARGET_LABEL[sp.target])}">
              <span class="sic">${spellIcon(sp.id, sp.emoji, 34)}</span><span class="zh" lang="zh-CN">${sp.zh}</span><span class="nm">${esc(sp.en)}</span>
              <span class="en">${sp.mp} MP · ${ok ? `<span data-testid="mp-left">${S.mp - sp.mp} left after</span>` : `<b class="need">${b2!.text}</b>`}</span><span class="tg">💥 ${sp.power} · ${TARGET_LABEL[sp.target]}</span></button>`; }).join('')}
            ${pages > 1 ? `<button class="ghost back" data-page="1" data-testid="spell-more">▶ ${zh('更多')} More<span class="en">${bookPage + 1}/${pages}</span></button>` : ''}
            <button class="ghost back" data-back="1" data-testid="act-back" data-key="${shown.length + 1}">◀ ${zh('返回')} Back</button></div>`);
          on('#bmain [data-page]', () => { bookPage = (bookPage + 1) % pages; sub('skills'); });
          if (shown.every(sp => S.mp < sp.mp)) msg(`📖 Not enough MP for a spell (🔷 ${S.mp}). ${C().mpPerCorrect ? ` Right answers give +${C().mpPerCorrect} MP.` : ' MP comes back at the inn or with Mana Tea.'}`, 'spell-nomp');
          wire(); return;
        }
        if (which === 'skills') {
          msg(`✨ Pick a skill. You still answer a question to use it.${owned.length ? ' 📖 Spells: no question.' : ''}`);
          await dockMain(`<div class="sublist" data-testid="skills-menu">
            ${eq('double') ? `<button data-a="double" data-testid="act-double" data-key="1" ${dblOk ? '' : 'disabled'} title="${esc(SKILL.double.desc)}"><span class="zh" lang="zh-CN">${SKILL.double.zh}</span>⚔️⚔️ ${SKILL.double.en}<span class="en">${SKILL.double.mp} MP${bs.doubleReady ? ` · wait ${bs.doubleReady}` : bs.streak < SKILL.double.minStreak! ? ` · needs 🔥${SKILL.double.minStreak}` : ''}</span></button>` : ''}
            ${eq('heal') ? `<button data-a="heal" data-testid="act-heal" data-key="${eq('double') ? 2 : 1}" ${healOk ? '' : 'disabled'}><span class="zh" lang="zh-CN">${SKILL.heal.zh}</span>💚 ${SKILL.heal.en}<span class="en">${SKILL.heal.mp} MP · ${SKILL.heal.perBattle! - bs.heal} left</span></button>` : ''}
            ${back}</div>`);
        } else {
          msg(`🍯 Potions: ${potionsLeft} of ${C().potionsPerBattle} left this battle`);
          await dockMain(`<div class="sublist" data-testid="items-menu">${pots.map((p, k) => `<button class="secondary" data-a="potion" data-item="${p}" data-testid="act-potion-${p}" data-key="${k + 1}" ${potionsLeft > 0 ? '' : 'disabled'}>
            <span class="zh" lang="zh-CN">${CONS[p].zh}</span>${CONS[p].emoji} ${esc(CONS[p].en)}<span class="en">×${S.inv[p]} · ${CONS[p].healHpFrac ? `+${CONS[p].healHpFrac * 100}% HP` : `+${(CONS[p].healMpFrac || 0) * 100}% MP`}</span></button>`).join('')}${back}</div>`);
        }
        wire();
      };
      const wire = () => {
        on('#bmain button[data-a]', (_e, el) => { $('#dock')?.classList.remove('tabs'); side(''); resolve({ type: el.dataset.a as any, item: el.dataset.item }); });
        on('#bmain button[data-sub]', (_e, el) => sub(el.dataset.sub as any));
        on('#bmain button[data-back]', () => { $('#dock')?.classList.remove('tabs'); menu(); });
      };
      await menu();
    });
  }
  /** TARGET_SELECT: tap the enemy itself (DOM hit areas over the sprites) or ◀ ▶ + Enter; ▼ marks the current target. -1 = back. */
  function chooseTarget(live: Foe[], sp?: SpellDef): Promise<number> {
    return new Promise(async resolve => {
      let cur = 0; const show = () => view.setTarget(foes.indexOf(live[cur]));
      msg(sp ? `🎯 ${sp.emoji} ${zh(sp.zh)}: tap ${sp.target === 'same_type' ? 'a kind of enemy (all of that kind are hit, up to 3)' : 'an enemy'}` : '🎯 Tap an enemy to attack');
      await dockMain(`<div class="cmds" data-testid="target-menu"><button class="ghost cmd" data-back="1" data-testid="act-back" data-key="9" style="width:220px"><span class="ic">◀</span><span class="en">Back</span></button></div>`);
      const boxes = view.foeBoxes();
      $('#tgts').innerHTML = live.map((f, k) => { const b = boxes[foes.indexOf(f)] || { x: 700 + k * 180, y: 200, w: 160, h: 200 };
        return `<button class="tgt" data-t="${k}" data-testid="target-${k}" data-key="${k + 1}" aria-label="${esc(f.d.en)}" style="left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px"></button>`; }).join('');
      show();
      const done = (k: number) => { document.removeEventListener('target-nav', nav as any); $('#tgts').innerHTML = ''; resolve(k); };
      const nav = (e: CustomEvent) => { cur = (cur + e.detail + live.length) % live.length; show(); };
      document.addEventListener('target-nav', nav as any);
      $$('#tgts .tgt').forEach(b => { b.addEventListener('mouseenter', () => { cur = +b.dataset.t!; show(); }); b.addEventListener('click', () => done(+b.dataset.t!)); });
      on('#bmain button[data-back]', () => done(-1));
      const enter = (e: KeyboardEvent) => { if (e.key === 'Enter') { document.removeEventListener('keydown', enter); if ($('#tgts .tgt')) done(cur); } };
      document.addEventListener('keydown', enter);
    });
  }
}

let currentLoc = 'meadow';
export function setCurrentLoc(id: string) { currentLoc = id; }
