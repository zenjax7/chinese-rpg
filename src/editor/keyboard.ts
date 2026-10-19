/** iPad on-screen keyboard (WebKit: Safari, Brave): the keyboard shrinks only the visual viewport, so a field at the bottom of the
 *  page ends up under it. While the keyboard is open the editor is pinned to window.visualViewport (top = offsetTop, height = height,
 *  via --vv-top / --vv-h); when the field being edited is in the bottom panel (dialogue, settings, words) the panel takes the visible
 *  height above the keyboard (class kb-panel), and the focused field is scrolled into view inside its panel.
 *
 *  Jack's iPad bug (91a0387): tapping another field while the keyboard is open fires blur / focusout first, leaves a gap with nothing
 *  focused (the keyboard stays open), and iOS scrolls the window, then focuses the new field. The old code decided "closed" from
 *  document.activeElement in that gap and snapped the layout back. Now:
 *  - "keyboard open" comes only from the visual viewport height (layout height − visualViewport.height > KB_MIN);
 *  - the bottom-panel mode is sticky: set when a panel field gets focus, kept through blur / gaps, changed only when focus lands on a
 *    field outside the panel (checked one frame after focusout), cleared when the keyboard closes;
 *  - any window / document scroll iOS applies while the keyboard is open is undone (the editor is fixed to the visual viewport);
 *  - the new field is scrolled into view inside its scrolling panel, never by scrolling the page. */
import { useEffect } from 'react';

/** Keyboard counts as open when the visual viewport is this much shorter than the layout viewport. */
const KB_MIN = 120;
const inPanel = (el: Element | null) => !!el?.closest('.panel, .tabs');
const isField = (el: Element | null): el is HTMLElement => !!el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || (el as HTMLElement).isContentEditable);
/** The layout viewport height; on iOS it does not shrink when the keyboard opens. */
const layoutH = () => Math.max(window.innerHeight, document.documentElement.clientHeight);

/** Scrolls `el` into view inside its nearest scrolling ancestor (the panel or inspector), leaving the page alone. */
function revealInPanel(el: HTMLElement) {
  const box = el.closest('.panel, .inspector') as HTMLElement | null; if (!box) return;
  const r = el.getBoundingClientRect(), b = box.getBoundingClientRect(), pad = 12;
  if (r.top < b.top + pad) box.scrollTop -= b.top + pad - r.top;
  else if (r.bottom > b.bottom - pad) box.scrollTop += Math.min(r.bottom - (b.bottom - pad), r.top - (b.top + pad));
}

export function useKeyboardViewport() {
  useEffect(() => {
    const root = document.documentElement;
    let panelMode = false, open = false, raf = 0, out = 0;
    const unscroll = () => {
      if (window.scrollX || window.scrollY) window.scrollTo(0, 0);
      const se = document.scrollingElement; if (se && se.scrollTop) se.scrollTop = 0;
      if (document.body.scrollTop) document.body.scrollTop = 0;
    };
    const apply = () => {
      const vv = window.visualViewport;
      const was = open;
      open = !!vv && (vv.scale ?? 1) < 1.05 && layoutH() - vv.height > KB_MIN;   // a pinch-zoomed page is not a keyboard
      if (was && !open) panelMode = false;   // the keyboard closed (focus comes before the keyboard opens, so only on close)
      root.classList.toggle('kb-open', open);
      root.classList.toggle('kb-panel', open && panelMode);
      if (open && vv) { unscroll(); root.style.setProperty('--vv-top', `${vv.offsetTop}px`); root.style.setProperty('--vv-h', `${vv.height}px`); }
      else { root.style.removeProperty('--vv-top'); root.style.removeProperty('--vv-h'); }
    };
    const reveal = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { const a = document.activeElement; if (open && isField(a)) revealInPanel(a); }); };
    const onViewport = () => { apply(); reveal(); };
    const onFocusIn = (e: FocusEvent) => {
      clearTimeout(out);
      const t = e.target as Element | null; if (!isField(t)) return;
      panelMode = inPanel(t); apply(); reveal();
    };
    const onFocusOut = () => {   // iOS: blur comes before the next field's focus; decide one frame later, and never "closed" from here
      clearTimeout(out);
      out = window.setTimeout(() => requestAnimationFrame(() => {
        const a = document.activeElement;
        if (isField(a)) panelMode = inPanel(a);   // focus moved to another field: follow it; nothing focused: keep the mode
        apply();
      }), 0);
    };
    const onScroll = () => { if (open) { unscroll(); apply(); } };
    const vv = window.visualViewport;
    vv?.addEventListener('resize', onViewport); vv?.addEventListener('scroll', onViewport);
    window.addEventListener('scroll', onScroll, { passive: true }); document.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('focusin', onFocusIn); document.addEventListener('focusout', onFocusOut);
    return () => {
      cancelAnimationFrame(raf); clearTimeout(out);
      vv?.removeEventListener('resize', onViewport); vv?.removeEventListener('scroll', onViewport);
      window.removeEventListener('scroll', onScroll); document.removeEventListener('scroll', onScroll);
      document.removeEventListener('focusin', onFocusIn); document.removeEventListener('focusout', onFocusOut);
      root.classList.remove('kb-open', 'kb-panel'); root.style.removeProperty('--vv-top'); root.style.removeProperty('--vv-h');
    };
  }, []);
}
