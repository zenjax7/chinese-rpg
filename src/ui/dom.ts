import { S, heroStats, expToNext, speechOn, session } from '../engine/state';
import { view } from '../phaser/view';
import { B } from '../data';
export const $ = (sel: string, root: ParentNode = document) => root.querySelector(sel) as HTMLElement;
export const $$ = (sel: string, root: ParentNode = document) => Array.from(root.querySelectorAll(sel)) as HTMLElement[];
export const esc = (s: any) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
/** Chinese text always carries lang="zh-CN" so browsers pick Simplified glyph shapes (spec §3). */
export const zh = (s: string, cls = 'zh') => `<span lang="zh-CN" class="${cls}">${s}</span>`;
/** Debug tools (🐞) only in dev builds, or with ?debug in the URL (used by the automated tests). */
export const DEBUG = !!(import.meta as any).env?.DEV || /[?&]debug\b/.test(location.search);
export const ui = () => $('#ui');
/** Replaces the screen layer (#ui, a 1280x720 box inside the frame). */
export function render(html: string) { const u = ui(); u.innerHTML = `<div class="screen">${html}</div>`; return u; }
export function on(sel: string, fn: (e: Event, el: HTMLElement) => void, root: ParentNode = document) {
  $$(sel, root).forEach(el => el.addEventListener('click', e => fn(e, el)));
}
export function toast(msg: string) {
  const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = msg; $('#toasts').appendChild(t); setTimeout(() => t.remove(), 3300);
}
export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
export function modal(html: string): HTMLElement { const m = $('#modal'); m.innerHTML = html; m.classList.remove('hidden'); return m; }
export function closeModal() { const m = $('#modal'); m.classList.add('hidden'); m.innerHTML = ''; }
/** Simple message dialog inside the frame; resolves with the index of the button pressed. */
export function dialog(title: string, body: string, buttons: string[] = ['OK']): Promise<number> {
  return new Promise(res => {
    const m = modal(`<div class="panel" data-testid="dialog"><h2>${title}</h2><div>${body}</div><div class="row">
      ${buttons.map((b, i) => `<button data-i="${i}" data-testid="dialog-btn-${i}" data-key="${i ? '' : 'enter'}" class="${i ? 'secondary' : ''}">${b}</button>`).join('')}</div></div>`);
    on('button[data-i]', (_e, el) => { closeModal(); res(+el.dataset.i!); }, m);
  });
}
/** A dialog over the scene (max 1000x560, centred, dims the scene) with a big ✕ (data-testid="back"). */
export function dlg(o: { testid: string; title: string; body: string; foot?: string; cls?: string; attrs?: string; close?: boolean }) {
  return `<div class="dlg-back"><div class="panel dlg ${o.cls || ''}" data-testid="${o.testid}" ${o.attrs || ''}>
    ${o.close === false ? '' : `<button class="ghost x" id="back" data-testid="back" aria-label="Close" title="Close">✕</button>`}
    <h1>${o.title}</h1><div class="dlg-body">${o.body}</div>${o.foot ? `<div class="dlg-foot">${o.foot}</div>` : ''}</div></div>`;
}

// ---------------- HUD: party plate (top-left) + title chip (top-centre), spec §4.1 ----------------
let battleHud: { gauge: number } | null = null;
export function setBattleHud(v: { gauge: number } | null) { battleHud = v; hud(); }
export function setTitle(html: string | null) { const t = $('#title'); if (!t) { hud(); return setTitle(html); } t.innerHTML = html || ''; t.classList.toggle('hidden', !html); }
const pct = (a: number, b: number) => Math.max(0, Math.min(100, 100 * a / b));
function portrait(el: HTMLElement) {
  const sh = view.spriteSheet('hero');
  if (!sh) { el.textContent = '🧙'; el.style.cssText = 'font-size:52px;display:flex;align-items:center;justify-content:center'; return; }
  const k = 150 / sh.fh;   // frame shown at 150px, head centred in the 82px circle
  el.textContent = ''; el.style.backgroundImage = `url(sprites/${sh.file})`; el.style.backgroundSize = `${sh.fw * sh.frames * k}px ${sh.fh * k}px`;
  el.style.backgroundPosition = `${-(sh.fw * k - 82) / 2 - 2}px -12px`;
}
export function hud() {
  const h = heroStats(); const root = $('#hud');
  if (!$('#party', root)) {
    root.innerHTML = `<div id="party" class="plate pe" data-testid="party"><div class="portrait"></div>
      <div class="lv">Lv <span data-testid="hud-level"></span></div>
      <div class="ln"><b>HP</b><div class="bar hp"><i></i></div><span class="v"><span data-testid="hud-hp"></span>/<span class="hpmax"></span></span></div>
      <div class="ln"><b>MP</b><div class="bar mp"><i></i></div><span class="v"><span data-testid="hud-mp"></span>/<span class="mpmax"></span></span></div>
      <div class="ln small" id="hud3"></div></div>
      <div id="hudgold" class="plate">🪙 <span data-testid="hud-gold"></span></div><div id="hudextra"></div>
      <div id="title" class="plate hidden"></div>`;
    view.onReady(() => portrait($('#party .portrait')));
    portrait($('#party .portrait'));
  }
  const set = (sel: string, v: any) => { const e = $(sel, root); if (e && e.textContent !== String(v)) { e.textContent = String(v); e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); } };
  set('[data-testid="hud-level"]', S.level); set('[data-testid="hud-hp"]', S.hp); set('.hpmax', h.maxHp); set('[data-testid="hud-mp"]', S.mp); set('.mpmax', h.maxMp); set('[data-testid="hud-gold"]', S.gold);
  ($('.bar.hp i', root)).style.width = pct(S.hp, h.maxHp) + '%'; ($('.bar.mp i', root)).style.width = pct(S.mp, h.maxMp) + '%';
  const l3 = $('#hud3', root);
  if (battleHud) {
    const full = battleHud.gauge >= B.companion.gaugeFull;
    l3.innerHTML = `<b>🐲</b><div class="bar fr${full ? ' full' : ''}" data-testid="gauge" title="小龙 friendship: fills on mistakes and right answers"><i style="width:${pct(battleHud.gauge, B.companion.gaugeFull)}%"></i></div><span class="v">${zh('小龙')} 💖</span>`;
  } else l3.innerHTML = `<b>⭐</b><div class="bar xp" title="EXP"><i style="width:${pct(S.exp, expToNext(S.level))}%"></i></div><span class="v">EXP</span>`;
  // speech state is data for tests/parents, not a label for the child (spec §8.1): only an icon when speech is on
  const sp = speechOn() ? 'on' : session.speechBlocked ? 'paused' : 'tap';
  root.dataset.speech = sp;
  const ex = [S.courage ? `<span class="tag" title="Courage: +${Math.round((h.courageMult - 1) * 100)}% DEF until your next win">💪 +${Math.round((h.courageMult - 1) * 100)}% DEF</span>` : '',
    sp === 'on' ? '<span class="tag" title="Speaking questions on">🎤</span>' : sp === 'paused' && S.consent.speech ? '<span class="tag" title="Speech paused this session">🔇</span>' : ''].join('');
  const exEl = $('#hudextra', root); if (exEl.innerHTML !== ex) exEl.innerHTML = ex;
}
/** A reward label that flies into a HUD element ('mp' | 'gold' | 'gauge'). from = frame coordinates. */
export function flyTo(text: string, from: { x: number; y: number }, to: 'mp' | 'gold' | 'gauge' | 'hp', color = '#9be7ff') {
  const fr = $('#frame-ui'); const t = document.createElement('div'); t.className = 'flyer'; t.innerHTML = text; t.style.color = color;
  t.style.left = from.x + 'px'; t.style.top = from.y + 'px'; fr.appendChild(t);
  const dest = { mp: [200, 76], hp: [200, 44], gauge: [200, 106], gold: [60, 150] }[to];
  requestAnimationFrame(() => requestAnimationFrame(() => { t.style.left = dest[0] + 'px'; t.style.top = dest[1] + 'px'; t.style.opacity = '0.2'; t.style.transform = 'scale(.7)'; }));
  setTimeout(() => t.remove(), 800);
}

// ---------------- "book" dialog: paged instead of scrolling (spec §6.3) ----------------
/** 1100x600 book inside the frame. pages: HTML per page (all pages stay in the DOM; only one is shown). */
export function bookHtml(o: { testid: string; title: string; pages: string[]; left?: string; right?: string; pagesTestid?: string; closeId?: string; attrs?: string; start?: number }) {
  const n = o.pages.length, st = Math.min(o.start || 0, n - 1);
  return `<div class="dlg-back"><div class="panel book" data-testid="${o.testid}" ${o.attrs || ''} data-page="${st}">
    ${o.closeId ? `<button class="ghost x" id="${o.closeId}" data-testid="book-close" aria-label="Close" title="Close">✕</button>` : ''}
    <h1>${o.title}</h1>
    <div class="pages" ${o.pagesTestid ? `data-testid="${o.pagesTestid}"` : ''}>${o.pages.map((p, i) => `<div class="page${i === st ? '' : ' hidden'}" data-pg="${i}">${p}</div>`).join('')}</div>
    <div class="pager">${o.left || ''}${n > 1 ? `<button class="secondary arrow" data-testid="book-prev" aria-label="Previous page" ${st ? '' : 'disabled'}>◀</button>
      <span class="pn" data-testid="book-page">Page ${st + 1} / ${n}</span>
      <button class="secondary arrow" data-testid="book-next" aria-label="Next page" ${st < n - 1 ? '' : 'disabled'}>▶</button>` : ''}${o.right || ''}</div></div></div>`;
}
export function wireBook(root: ParentNode = document) {
  const b = $('.book', root); if (!b) return;
  const pgs = $$('.page', b); const prev = $('[data-testid="book-prev"]', b) as HTMLButtonElement, next = $('[data-testid="book-next"]', b) as HTMLButtonElement;
  const go = (k: number) => { k = Math.max(0, Math.min(pgs.length - 1, k)); b.dataset.page = String(k);
    pgs.forEach((p, i) => p.classList.toggle('hidden', i !== k));
    if (prev) prev.disabled = k === 0; if (next) next.disabled = k === pgs.length - 1;
    const pn = $('[data-testid="book-page"]', b); if (pn) pn.textContent = `Page ${k + 1} / ${pgs.length}`; };
  prev?.addEventListener('click', () => go(+b.dataset.page! - 1)); next?.addEventListener('click', () => go(+b.dataset.page! + 1));
  return go;
}
export const chunk = <T>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
