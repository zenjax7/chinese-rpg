// Keeps the DOM UI layer (#frame-ui, a 1280x720 box) exactly on top of the FIT-scaled Phaser canvas, scaled by the
// same single factor s = canvasWidth / 1280 (spec §2). Everything outside the canvas is letterbox (#0b1020).
export const FRAME_W = 1280, FRAME_H = 720;
let scale = 1;
export const frameScale = () => scale;
export function syncFrame() {
  const ui = document.getElementById('frame-ui'); if (!ui) return;
  const c = document.querySelector('#game canvas') as HTMLCanvasElement | null;
  let r: { left: number; top: number; width: number; height: number };
  if (c && c.getBoundingClientRect().width > 0) r = c.getBoundingClientRect();
  else {   // before Phaser has booted: same maths as Scale.FIT + CENTER_BOTH on the #game box
    const g = (document.getElementById('game') || document.body).getBoundingClientRect();
    const s = Math.min(g.width / FRAME_W, g.height / FRAME_H);
    r = { left: g.left + (g.width - FRAME_W * s) / 2, top: g.top + (g.height - FRAME_H * s) / 2, width: FRAME_W * s, height: FRAME_H * s };
  }
  scale = r.width / FRAME_W;
  Object.assign(ui.style, { left: r.left + 'px', top: r.top + 'px', transform: `scale(${scale})` });
  (window as any).__proto = (window as any).__proto || {}; (window as any).__proto.frame = { left: r.left, top: r.top, scale };
}
export function watchFrame(game?: { scale?: { on: (e: string, f: () => void) => void } }) {
  syncFrame();
  window.addEventListener('resize', () => { syncFrame(); requestAnimationFrame(syncFrame); });
  window.visualViewport?.addEventListener('resize', syncFrame);
  game?.scale?.on('resize', () => requestAnimationFrame(syncFrame));
  // Phaser applies the FIT size on its own step; re-sync for a moment after boot
  let n = 0; const t = setInterval(() => { syncFrame(); if (++n > 20) clearInterval(t); }, 100);
}
/** Converts a client (page) point into frame coordinates. */
export function toFrame(clientX: number, clientY: number) {
  const ui = document.getElementById('frame-ui')!.getBoundingClientRect();
  return { x: (clientX - ui.left) / scale, y: (clientY - ui.top) / scale };
}
