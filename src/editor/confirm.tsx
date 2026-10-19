/** A touch-friendly confirm dialog (big buttons) for every delete: askConfirm(text) resolves true on "Delete", false on "Cancel". */
import { useEffect, useState } from 'react';

type Ask = { text: string; ok: string; done: (v: boolean) => void };
let show: ((a: Ask | null) => void) | null = null;
export function askConfirm(text: string, ok = 'Delete'): Promise<boolean> {
  return new Promise(res => { if (!show) { res(window.confirm(text)); return; } show({ text, ok, done: res }); });
}
export function ConfirmHost() {
  const [a, setA] = useState<Ask | null>(null);
  useEffect(() => { show = setA; return () => { show = null; }; }, []);
  if (!a) return null;
  const close = (v: boolean) => { setA(null); a.done(v); };
  return <div className="modal" data-testid="ed-confirm" onClick={e => { if (e.target === e.currentTarget) close(false); }}>
    <div className="box confirm" role="alertdialog" aria-label={a.text}>
      <p data-testid="ed-confirm-text">{a.text}</p>
      <div className="big-row">
        <button className="big" data-testid="ed-confirm-no" onClick={() => close(false)}>Cancel</button>
        <button className="big danger" data-testid="ed-confirm-yes" onClick={() => close(true)}>{a.ok}</button>
      </div>
    </div>
  </div>;
}
