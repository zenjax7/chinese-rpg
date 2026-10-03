import { startView } from './phaser/view';
import { S } from './engine/state';
import { consentScreen, town, enterLocation, debugPanel, locationScreen, pauseMenu } from './ui/screens';
import { hud, $, DEBUG, ui } from './ui/dom';
import { watchFrame } from './ui/frame';
import { playSfx, toggleMute, audioSettings, onAudioSettings } from './audio/audio';
import { matchZh, matchEn, normZh } from './engine/match';
import { ITEM, ITEMS } from './data';

async function boot() {
  // Phaser bakes text into textures, so wait (briefly) for the web fonts before the scene creates enemy names (spec §3).
  const fonts = [document.fonts?.load('700 28px "Noto Sans SC"', '角兔'), document.fonts?.load('800 22px "Nunito"'), document.fonts?.load('700 30px "Fredoka"')];
  await Promise.race([Promise.all(fonts).catch(() => {}), new Promise(r => setTimeout(r, 2500))]);
  const game = startView('game');
  watchFrame(game as any);
  hud();
  if (DEBUG) $('#debugBtn').classList.remove('hidden');
  if (!S.consent.given) consentScreen();
  else if (S.where !== 'town' && S.locs[S.where]) enterLocation(S.where);
  else town();
}
boot();
// ?debug: the spoken-answer grader, for the tests (tests/speech.mjs)
if (DEBUG) Object.assign(((window as any).__proto = (window as any).__proto || {}), {
  gradeZh: (alts: string[], id: string) => matchZh(alts, ITEM[id]), gradeEn: (alts: string[], id: string) => matchEn(alts, ITEM[id]), normZh,
  findItem: (zh: string) => ITEMS.find(i => i.zh === zh)?.id ?? null });

const inBattle = () => !!document.querySelector('[data-testid="battle"]');
$('#debugBtn').addEventListener('click', () => debugPanel(() => { hud(); if (inBattle() || !document.querySelector('[data-testid="town"],[data-testid="location"],[data-testid="worldmap"]')) return; if (S.where !== 'town' && S.locs[S.where]) locationScreen(S.where); else if (S.consent.given) town(); }));
$('#pauseBtn').addEventListener('click', () => pauseMenu());

// Sound: mute toggle (persisted) + a click sound for ordinary buttons. Answer buttons, the mic and 🔊 buttons get their own sounds.
const muteBtn = $('#muteBtn');
const showMute = () => { muteBtn.textContent = audioSettings().muted ? '🔇' : '🔊'; muteBtn.title = audioSettings().muted ? 'Sound off (tap to turn on)' : 'Sound on (tap to mute)'; };
showMute(); onAudioSettings(showMute);
muteBtn.addEventListener('click', () => toggleMute());

// Kids double-tap: ignore a second tap on the same button within 300 ms (spec §3).
const lastTap = new WeakMap<Element, number>();
document.addEventListener('click', e => {
  const b = (e.target as HTMLElement)?.closest?.('button') as HTMLButtonElement | null; if (!b) return;
  const t = performance.now(); if (t - (lastTap.get(b) || 0) < 300) { e.stopImmediatePropagation(); e.preventDefault(); return; }
  lastTap.set(b, t);
  if (b.disabled || b.matches('[data-o],[data-z],[data-e],#mic,.say,#say,#replay,#muteBtn')) return;
  playSfx('sfx_ui_click');
}, true);

// Keyboard for laptops: 1-4 pick the numbered command/answer, Enter/Space the primary button, ◀ ▶ move the target.
document.addEventListener('keydown', e => {
  const tgt = e.target as HTMLElement; if (tgt?.matches?.('input,textarea')) return;
  const m = $('#modal'); const scope: ParentNode = m && !m.classList.contains('hidden') ? m : ui();
  const press = (sel: string) => { const b = scope.querySelector(sel) as HTMLButtonElement | null; if (b && !b.disabled) { e.preventDefault(); b.click(); } };
  if (/^[1-9]$/.test(e.key)) press(`[data-key="${e.key}"]`);
  else if (e.key === 'Enter' || e.key === ' ') press('[data-key="enter"]');
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') document.dispatchEvent(new CustomEvent('target-nav', { detail: e.key === 'ArrowLeft' ? -1 : 1 }));
  else if (e.key === 'Escape') press('[data-testid="back"],#pclose');
});
