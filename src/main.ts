import { startView } from './phaser/view';
import { S } from './engine/state';
import { consentScreen, town, enterLocation, debugPanel, locationScreen } from './ui/screens';
import { hud, $ } from './ui/dom';
import { playSfx, toggleMute, audioSettings, onAudioSettings } from './audio/audio';

startView('game');
hud();
function home() {
  if (!S.consent.given) return consentScreen();
  if (S.where !== 'town' && S.locs[S.where]) return enterLocation(S.where);
  town();
}
home();
let inBattle = () => !!document.querySelector('[data-testid="battle"],[data-testid="scout"]');
$('#debugBtn').addEventListener('click', () => debugPanel(() => { hud(); if (inBattle() || !document.querySelector('[data-testid="town"],[data-testid="location"]')) return; if (S.where !== 'town' && S.locs[S.where]) locationScreen(S.where); else if (S.consent.given) town(); }));

// Sound: mute toggle (persisted) + a click sound for ordinary buttons. Answer buttons, the mic and 🔊 buttons get their own sounds.
const muteBtn = $('#muteBtn');
const showMute = () => { muteBtn.textContent = audioSettings().muted ? '🔇' : '🔊'; muteBtn.title = audioSettings().muted ? 'Sound off (tap to turn on)' : 'Sound on (tap to mute)'; };
showMute(); onAudioSettings(showMute);
muteBtn.addEventListener('click', () => toggleMute());
document.addEventListener('click', e => {
  const b = (e.target as HTMLElement)?.closest?.('button') as HTMLButtonElement | null;
  if (!b || b.disabled || b.matches('[data-o],[data-z],[data-e],#mic,.say,#say,#replay,#muteBtn')) return;
  playSfx('sfx_ui_click');
}, true);
