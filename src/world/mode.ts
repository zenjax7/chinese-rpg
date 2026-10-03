/** World mode switch (v3.9 graph world behind a flag). ?world=graph|classic wins and is remembered; otherwise the stored choice.
 *  Classic is the default and is untouched (save key chinese-rpg-proto-v3). Graph mode saves to chinese-rpg-proto-v4. */
export type WorldMode = 'classic' | 'graph';
export const MODE_KEY = 'chinese-rpg-world-mode';
function read(): WorldMode {
  try {
    const q = new URLSearchParams(location.search).get('world');
    if (q === 'graph' || q === 'classic') { localStorage.setItem(MODE_KEY, q); return q; }
    return localStorage.getItem(MODE_KEY) === 'graph' ? 'graph' : 'classic';
  } catch { return 'classic'; }
}
export const WORLD_MODE: WorldMode = typeof location === 'undefined' ? 'classic' : read();
export const isGraph = () => WORLD_MODE === 'graph';
/** Debug toggle: switch mode and reload (keeps both saves). */
export function setWorldMode(m: WorldMode) {
  localStorage.setItem(MODE_KEY, m);
  const u = new URL(location.href); u.searchParams.set('world', m); location.href = u.toString();
}
