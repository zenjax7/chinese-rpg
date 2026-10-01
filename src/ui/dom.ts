import { S, heroStats, expToNext, speechOn, session } from '../engine/state';
export const $ = (sel: string, root: ParentNode = document) => root.querySelector(sel) as HTMLElement;
export const $$ = (sel: string, root: ParentNode = document) => Array.from(root.querySelectorAll(sel)) as HTMLElement[];
export const esc = (s: any) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export const ui = () => $('#ui');
export function render(html: string) { const u = ui(); u.innerHTML = html; u.scrollTop = 0; return u; }
export function on(sel: string, fn: (e: Event, el: HTMLElement) => void, root: ParentNode = document) {
  $$(sel, root).forEach(el => el.addEventListener('click', e => fn(e, el)));
}
export function toast(msg: string) {
  const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = msg; $('#toasts').appendChild(t); setTimeout(() => t.remove(), 3300);
}
export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
export function modal(html: string): HTMLElement { const m = $('#modal'); m.innerHTML = html; m.classList.remove('hidden'); return m; }
export function closeModal() { const m = $('#modal'); m.classList.add('hidden'); m.innerHTML = ''; }
/** Simple message dialog; resolves with the index of the button pressed. */
export function dialog(title: string, body: string, buttons: string[] = ['OK']): Promise<number> {
  return new Promise(res => {
    const m = modal(`<div class="panel" data-testid="dialog" style="max-width:560px"><h2>${title}</h2><div>${body}</div><div class="row" style="margin-top:12px">
      ${buttons.map((b, i) => `<button data-i="${i}" data-testid="dialog-btn-${i}" class="${i ? 'secondary' : ''}">${b}</button>`).join('')}</div></div>`);
    on('button[data-i]', (_e, el) => { closeModal(); res(+el.dataset.i!); }, m);
  });
}
export function hud() {
  const h = heroStats(); const pct = (a: number, b: number) => Math.max(0, Math.min(100, 100 * a / b));
  $('#hud').innerHTML = `<span>🧙 Lv <span data-testid="hud-level">${S.level}</span></span>
    <span>❤️ <span data-testid="hud-hp">${S.hp}</span>/${h.maxHp}<span class="bar hp"><i style="width:${pct(S.hp, h.maxHp)}%"></i></span></span>
    <span>🔷 <span data-testid="hud-mp">${S.mp}</span>/${h.maxMp}<span class="bar mp"><i style="width:${pct(S.mp, h.maxMp)}%"></i></span></span>
    <span title="EXP">⭐<span class="bar xp"><i style="width:${pct(S.exp, expToNext(S.level))}%"></i></span></span>
    <span>🪙 <span data-testid="hud-gold">${S.gold}</span></span>
    <span>⚔️ ${h.atk} 🛡️ ${h.def}${S.courage ? ` <span class="tag" title="Courage: +${Math.round((h.courageMult - 1) * 100)}% DEF">💪 Courage +${Math.round((h.courageMult - 1) * 100)}%</span>` : ''}</span>
    <span class="muted">${speechOn() ? '🎤 speech on' : session.speechBlocked ? '🔇 speech paused' : '👆 tap mode'}</span>`;
}
