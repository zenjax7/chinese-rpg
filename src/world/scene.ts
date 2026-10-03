/** Minimal Fire Emblem-style dialogue scene player (architecture §11.1, Desy's scene/0.2, Arty's portraits v2 + dialogue UI).
 *  DOM overlay inside the 1280x720 frame: portraits left / right (512x768 webp facing right; <id>.portrait.json: mirrored on the right
 *  when `mirror`, bottom-anchored on the panel's top edge, scale 0.62, ×1.15 when `big`), speaker lit / listener dimmed, 9-slice panel and nameplate
 *  (CSS border-image with the insets from ui/manifest.json), a bobbing ▼ next arrow. Text: the Chinese line (or the English line with
 *  {Cxxx} tokens shown as the Chinese word) and the English gloss below. No pinyin anywhere.
 *  Tap / Enter / Space advances (first tap finishes the typing), the Skip button or a long press (600 ms) skips the scene. */
import type { Txt } from './engine';

export interface SceneLine { id: string; speaker: string; side?: string; expr?: string; en: string; zh?: string; tokens?: string[]; portrait?: string;
  goto?: string; end?: boolean; setFlags?: string[]; clearFlags?: string[]; if?: any; else?: string;
  choices?: { id: string; en: string; tokens?: string[]; goto?: string; setFlags?: string[]; correct?: boolean }[] }
export interface Scene { id: string; title?: string; slots?: Record<string, { char: string; expr?: string }>; lines: SceneLine[]; once?: boolean;
  onEnd?: Record<string, any>[]; words?: string[] }
export interface SceneEnv {
  hero: string;                                   // {hero}
  words: Record<string, Txt>;                     // {Cxxx} -> zh / en
  names: (id: string) => Txt | null;              // speaker display names
  flag: (f: string) => boolean; setFlag: (f: string) => void; clearFlag?: (f: string) => void;
  cond?: (c: any) => boolean;
}
export interface SceneResult { skipped: boolean; choices: Record<string, string>; endedAt: string }

/** Arty's per-character file public/portraits/<id>.portrait.json: anchorY (eye line, canvas px), mirror (flip on the right), big (wide bust). */
export interface PChar { id: string; anchorY: number; mirror?: boolean; big?: boolean; defaultExpr?: string; expressions?: string[] }
const PC: Record<string, PChar | null> = {}; let UIM: any = null; let uiLoaded = false;
const SCALE = 0.62, BIG = 1.15, BOX = { x: 50, y: 510, w: 1180, h: 190 };
export async function loadPortrait(id: string): Promise<PChar | null> {
  if (!(id in PC)) PC[id] = await fetch(`portraits/${id}.portrait.json`).then(r => r.ok ? r.json() : null).catch(() => null);
  return PC[id];
}
export async function loadSceneArt(chars: string[] = []) {
  if (!uiLoaded) { uiLoaded = true; try { UIM = await (await fetch('ui/manifest.json')).json(); } catch { UIM = null; } }
  await Promise.all([...new Set(chars)].map(loadPortrait));
}
/** <id>_<expr>.webp when the character has that expression, else its default expression. */
export function portraitUrl(id: string, expr = 'neutral'): string | null {
  const c = PC[id]; if (!c) return null;
  const e = c.expressions?.includes(expr) ? expr : (c.defaultExpr || 'neutral'); return `portraits/${id}_${e}.webp`;
}
const esc = (s: string) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
/** Main line: Chinese where we have it ({Cxxx} -> the word), gloss: plain English. */
export function lineText(l: { en: string; zh?: string }, env: Pick<SceneEnv, 'hero' | 'words'>): { main: string; gloss: string; hasZh: boolean } {
  const en = l.en.replace(/\{hero\}/g, env.hero);
  const tok = /\{(C\d+)\}/g; let hasZh = !!l.zh;
  const main = l.zh ? esc(l.zh.replace(/\{hero\}/g, env.hero))
    : esc(en).replace(tok, (_m, c) => { const w = env.words[c]; if (!w) return c; hasZh = true; return `<span class="sc-w" lang="zh-CN">${esc(w.zh)}</span>`; });
  const gloss = en.replace(tok, (_m, c) => env.words[c]?.en || c);
  return { main, gloss: hasZh ? esc(gloss) : '', hasZh };
}
function css() {
  if (document.getElementById('sc-css')) return;
  const p = UIM?.dialogue_panel?.slice || { left: 24, right: 24, top: 24, bottom: 24 }; const n = UIM?.dialogue_nameplate?.slice || { left: 30, right: 30, top: 12, bottom: 12 };
  const st = document.createElement('style'); st.id = 'sc-css';
  st.textContent = `
  .sc-on #hud,.sc-on #ui .bottombar,.sc-on #ui .zoom,.sc-on #title{visibility:hidden}.sc-on #ui{pointer-events:none}
  .sc{position:absolute;inset:0;z-index:40;pointer-events:auto;user-select:none;-webkit-user-select:none;background:linear-gradient(180deg,rgba(13,27,61,.15),rgba(13,27,61,.45))}
  .sc-p{position:absolute;bottom:${720 - BOX.y - 8}px;transform-origin:50% 100%;transition:filter .18s,transform .18s;pointer-events:none}
  .sc-p img{display:block;height:100%;width:100%}
  .sc-p.flip img{transform:scaleX(-1)}
  .sc-p.dim{filter:brightness(.55) saturate(.75)}
  .sc-p.lit{transform:scale(1.03)}
  .sc-box{position:absolute;left:${BOX.x}px;top:${BOX.y}px;width:${BOX.w}px;height:${BOX.h}px;box-sizing:border-box;
    border-style:solid;border-width:${p.top}px ${p.right}px ${p.bottom}px ${p.left}px;border-image:url(ui/dialogue_panel.png) ${p.top} ${p.right} ${p.bottom} ${p.left} fill / ${p.top}px ${p.right}px ${p.bottom}px ${p.left}px stretch;
    background:rgba(13,27,61,.0);padding:14px 48px 10px 32px;color:#fff}
  .sc-name{position:absolute;top:${BOX.y - 34}px;height:46px;min-width:176px;box-sizing:border-box;padding:0 40px;display:flex;align-items:center;justify-content:center;gap:10px;
    border-style:solid;border-width:${n.top}px ${n.right}px ${n.bottom}px ${n.left}px;border-image:url(ui/dialogue_nameplate.png) ${n.top} ${n.right} ${n.bottom} ${n.left} fill / ${n.top}px ${n.right}px ${n.bottom}px ${n.left}px stretch;
    color:#f6de96;font:700 26px 'Noto Sans SC',sans-serif;line-height:1;white-space:nowrap}
  .sc-name .en{font:700 15px Nunito,sans-serif;color:#f6da8c;opacity:.9}
  .sc-name.L{left:80px}.sc-name.R{right:${1280 - 1200}px}
  .sc-main{font:500 30px 'Noto Sans SC',sans-serif;text-shadow:0 2px 3px rgba(0,0,0,.6);line-height:1.35;min-height:44px}
  .sc-main .sc-w{color:#f6da8c;font-weight:700}
  .sc-main.en-only{font:600 24px Nunito,sans-serif}
  .sc-gloss{margin-top:8px;font:500 18px Nunito,sans-serif;color:#c4cad6}
  .sc-next{position:absolute;left:${1172 - BOX.x}px;top:${646 - BOX.y}px;width:32px;height:32px;background:url(ui/dialogue_next_arrow.png) center/contain no-repeat;animation:scbob .66s steps(2) infinite}
  @keyframes scbob{0%{transform:translateY(0)}100%{transform:translateY(6px)}}
  .sc-skip{position:absolute;right:24px;top:84px;z-index:2}
  .sc-ch{position:absolute;left:340px;right:340px;top:300px;display:flex;flex-direction:column;gap:12px;z-index:2}
  .sc-ch button{font-size:24px}
  .sc-ch .sc-w{font:700 28px 'Noto Sans SC',sans-serif}`;
  document.head.appendChild(st);
}

/** Play one scene; resolves when it ends (or is skipped). Choices made are returned (line id -> choice id). */
export async function playScene(sc: Scene, env: SceneEnv, host: HTMLElement): Promise<SceneResult> {
  await loadSceneArt([...Object.values(sc.slots || {}).map(x => x.char), ...sc.lines.map(l => l.portrait || l.speaker).filter(x => x && x !== 'narrator')]); css();
  const res: SceneResult = { skipped: false, choices: {}, endedAt: '' };
  const root = document.createElement('div'); root.className = 'sc'; root.dataset.testid = 'scene'; root.dataset.scene = sc.id;
  root.innerHTML = `<button class="secondary sc-skip" data-testid="scene-skip">⏭ 跳过 <span class="en">Skip</span></button>
    <div class="sc-p" data-side="L"></div><div class="sc-p" data-side="R"></div>
    <div class="sc-name L hidden" data-testid="scene-name"></div>
    <div class="sc-box" data-testid="scene-box"><div class="sc-main" data-testid="scene-line"></div><div class="sc-gloss" data-testid="scene-gloss"></div><div class="sc-next" data-testid="scene-next"></div></div>
    <div class="sc-ch hidden" data-testid="scene-choices"></div>`;
  host.appendChild(root); host.classList.add('sc-on');
  const slots: Record<string, { char: string; expr?: string }> = JSON.parse(JSON.stringify(sc.slots || {}));
  const shown: Record<'L' | 'R', string | null> = { L: Object.keys(slots).filter(k => k[0] === 'L').sort()[0] || null, R: Object.keys(slots).filter(k => k[0] === 'R').sort()[0] || null };
  const byId = Object.fromEntries(sc.lines.map((l, i) => [l.id, i]));
  const pEl = (s: 'L' | 'R') => root.querySelector(`.sc-p[data-side="${s}"]`) as HTMLElement;
  const drawPortraits = (speakerSlot: string | null) => {
    for (const s of ['L', 'R'] as const) {
      const el = pEl(s); const slot = shown[s]; const c = slot ? slots[slot] : null; const url = c && portraitUrl(c.char, c.expr);
      if (!url || !c) { el.innerHTML = ''; el.style.display = 'none'; continue; }
      const pc = PC[c.char]!; const k = SCALE * (pc.big ? BIG : 1); const w = 512 * k, h = 768 * k;   // bottom-anchored on the panel's top edge
      el.style.display = ''; el.style.width = `${w}px`; el.style.height = `${h}px`;
      el.style.left = s === 'L' ? `${70 + 160 - w / 2}px` : `${850 + 160 - w / 2}px`;
      el.classList.toggle('flip', s === 'R' && pc.mirror !== false); el.dataset.anchorY = String(Math.round(pc.anchorY * k));
      el.dataset.char = c.char; el.dataset.expr = c.expr || 'neutral';
      const img = el.querySelector('img') as HTMLImageElement | null;
      if (img) { if (!img.src.endsWith(url)) img.src = url; } else el.innerHTML = `<img alt="" src="${url}">`;
      el.classList.toggle('lit', speakerSlot === slot); el.classList.toggle('dim', speakerSlot !== slot);
      el.dataset.testid = `portrait-${s}`;
    }
  };
  let done = false; let resolveTap: (() => void) | null = null; let typing: { finish: () => void } | null = null;
  const skip = () => { if (done) return; res.skipped = true; done = true; typing?.finish(); resolveTap?.(); };
  const tap = () => { if (typing) { typing.finish(); return; } resolveTap?.(); };
  let pressT: any = 0;
  root.addEventListener('pointerdown', e => { if ((e.target as HTMLElement).closest('button')) return; pressT = setTimeout(skip, 600); });
  root.addEventListener('pointerup', e => { if ((e.target as HTMLElement).closest('button')) return; if (pressT) { clearTimeout(pressT); pressT = 0; if (!res.skipped) tap(); } });
  root.addEventListener('pointerleave', () => { clearTimeout(pressT); pressT = 0; });
  (root.querySelector('.sc-skip') as HTMLElement).addEventListener('click', e => { e.stopPropagation(); skip(); });
  const key = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopImmediatePropagation(); if (!root.querySelector('.sc-ch:not(.hidden)')) tap(); } else if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); skip(); } };
  document.addEventListener('keydown', key, true);
  const waitTap = () => new Promise<void>(r => { resolveTap = () => { resolveTap = null; r(); }; });
  const instant = !!(window as any).__proto?.sceneInstant;
  const typeIn = (el: HTMLElement, html: string) => new Promise<void>(r => {
    if (instant) { el.innerHTML = html; return r(); }
    el.innerHTML = html; el.style.clipPath = 'inset(0 100% 0 0)'; const t0 = performance.now(); const dur = Math.min(900, 30 * el.textContent!.length);
    let raf = 0; const end = () => { cancelAnimationFrame(raf); el.style.clipPath = ''; typing = null; r(); };
    typing = { finish: end };
    const f = () => { const k = (performance.now() - t0) / dur; if (k >= 1) return end(); el.style.clipPath = `inset(0 ${100 - 100 * k}% 0 0)`; raf = requestAnimationFrame(f); }; raf = requestAnimationFrame(f);
  });
  let i = 0; let guard = 0;
  try {
    while (!done && i < sc.lines.length && guard++ < 500) {
      const l = sc.lines[i];
      if (l.if && env.cond && !env.cond(l.if)) { i = l.else && byId[l.else] !== undefined ? byId[l.else] : i + 1; continue; }
      const side = l.side && l.side !== 'none' ? l.side : null;
      if (side) { const s = side[0] as 'L' | 'R'; const ch = l.portrait || l.speaker; if (!slots[side] || slots[side].char !== ch) slots[side] = { char: ch, expr: l.expr }; slots[side].expr = l.expr || slots[side].expr; shown[s] = side; }
      drawPortraits(side);
      const nm = l.speaker === 'narrator' ? null : l.speaker === 'hero' ? { zh: env.hero, en: '' } : env.names(l.speaker);
      const nEl = root.querySelector('.sc-name') as HTMLElement;
      if (nm) { nEl.className = `sc-name ${side?.[0] === 'R' ? 'R' : 'L'}`; nEl.innerHTML = `<span lang="zh-CN">${esc(nm.zh || nm.en)}</span>${nm.zh && nm.en ? `<span class="en">${esc(nm.en)}</span>` : ''}`; nEl.dataset.speaker = l.speaker; }
      else nEl.className = 'sc-name hidden';
      const t = lineText(l, env);
      const mEl = root.querySelector('.sc-main') as HTMLElement; mEl.classList.toggle('en-only', !t.hasZh);
      root.dataset.line = l.id;
      (root.querySelector('.sc-gloss') as HTMLElement).innerHTML = t.gloss;
      (root.querySelector('.sc-next') as HTMLElement).style.visibility = 'hidden';
      await typeIn(mEl, t.main);
      for (const f of l.setFlags || []) env.setFlag(f); for (const f of l.clearFlags || []) env.clearFlag?.(f);
      if (done) break;
      if (l.choices?.length) {
        const box = root.querySelector('.sc-ch') as HTMLElement; box.classList.remove('hidden');
        box.innerHTML = l.choices.map((c, k) => { const ct = lineText(c, env); return `<button data-c="${k}" data-testid="scene-choice-${k}" data-key="${k + 1}">${ct.main}${ct.gloss ? ` <span class="en">${ct.gloss}</span>` : ''}</button>`; }).join('');
        const k = await new Promise<number>(r => { box.querySelectorAll('button').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); r(+(b as HTMLElement).dataset.c!); })); resolveTap = () => r(-1); });
        box.classList.add('hidden'); box.innerHTML = '';
        if (k < 0) break;
        const c = l.choices[k]; res.choices[l.id] = c.id; for (const f of c.setFlags || []) env.setFlag(f);
        i = c.goto === 'end' ? sc.lines.length : c.goto && byId[c.goto] !== undefined ? byId[c.goto] : i + 1; continue;
      }
      (root.querySelector('.sc-next') as HTMLElement).style.visibility = '';
      await waitTap();
      if (l.end || l.goto === 'end') break;
      i = l.goto && byId[l.goto] !== undefined ? byId[l.goto] : i + 1;
    }
  } finally {
    res.endedAt = root.dataset.line || '';
    document.removeEventListener('keydown', key, true); clearTimeout(pressT); root.remove(); host.classList.remove('sc-on');
  }
  return res;
}
