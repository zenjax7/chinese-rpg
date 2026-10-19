/** iPad on-screen keyboard (WebKit: Safari, Brave): the keyboard shrinks only the visual viewport, so a field at the bottom of the
 *  page ends up under it. While the keyboard is open the editor is pinned to window.visualViewport (top = offsetTop, height = height,
 *  via --vv-top / --vv-h); when the focused field is in the bottom panel (dialogue, settings, words) the panel takes the visible
 *  height above the keyboard (class kb-panel), and the focused field is scrolled into view. When the keyboard closes the classes and
 *  variables go and the normal layout comes back. */
import { useEffect } from 'react';

/** Keyboard counts as open when the visual viewport is this much shorter than the layout viewport. */
const KB_MIN = 120;
const inPanel = (el: Element | null) => !!el?.closest('.panel, .tabs');
const isField = (el: Element | null): el is HTMLElement => !!el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || !!(el as HTMLElement | null)?.isContentEditable;

export function useKeyboardViewport() {
  useEffect(() => {
    const root = document.documentElement;
    let raf = 0;
    const apply = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const vv = window.visualViewport; const active = document.activeElement;
        const open = !!vv && window.innerHeight - vv.height > KB_MIN && isField(active);
        root.classList.toggle('kb-open', open);
        root.classList.toggle('kb-panel', open && inPanel(active));
        if (open && vv) { root.style.setProperty('--vv-top', `${vv.offsetTop}px`); root.style.setProperty('--vv-h', `${vv.height}px`); }
        else { root.style.removeProperty('--vv-top'); root.style.removeProperty('--vv-h'); }
        if (open && isField(active)) requestAnimationFrame(() => active.scrollIntoView({ block: 'nearest', inline: 'nearest' }));
      });
    };
    const vv = window.visualViewport;
    vv?.addEventListener('resize', apply); vv?.addEventListener('scroll', apply);
    document.addEventListener('focusin', apply); document.addEventListener('focusout', apply);
    return () => {
      cancelAnimationFrame(raf);
      vv?.removeEventListener('resize', apply); vv?.removeEventListener('scroll', apply);
      document.removeEventListener('focusin', apply); document.removeEventListener('focusout', apply);
      root.classList.remove('kb-open', 'kb-panel'); root.style.removeProperty('--vv-top'); root.style.removeProperty('--vv-h');
    };
  }, []);
}
