/** Cloud saving for the browser, OFF by default (architecture.md §9). It turns on only when the build sets VITE_CLOUD_SAVE=1 AND a
 *  signed-in parent picked a child profile on this device (localStorage "chinese-rpg-cloud" = {"childId": "<uuid>"}). Until then the
 *  CloudSaveStore stays the no-network stub and the local save is the only copy, exactly as today. */
import { ApiClient } from './api';
import { Outbox, type FlushResult, type KV } from './outbox';

export const CLOUD_KEY = 'chinese-rpg-cloud';
const lsKV: KV = {
  get: k => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* quota */ } },
  remove: k => { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};
/** The child this device saves for, or null (cloud off). */
export function cloudChild(kv: KV = lsKV): string | null {
  try { const c = JSON.parse(kv.get(CLOUD_KEY) || 'null'); return typeof c?.childId === 'string' && /^[0-9a-f-]{36}$/i.test(c.childId) ? c.childId : null; } catch { return null; }
}
/** The CloudSaveStore `send` function when cloud saving is on, else undefined (stub). */
export function cloudSender(buildFlag: boolean, contentVersion: string, opts: { kv?: KV; api?: ApiClient; onResult?: (r: FlushResult) => void } = {}) {
  const kv = opts.kv ?? lsKV; const child = buildFlag ? cloudChild(kv) : null;
  if (!child) return undefined;
  const box = new Outbox(kv, opts.api ?? new ApiClient(), child, contentVersion);
  let running: Promise<void> | null = null, timer: ReturnType<typeof setTimeout> | null = null;
  const run = async () => {
    for (let i = 0; i < 3 && box.hasWork; i++) {
      const r = await box.flush(); opts.onResult?.(r);
      if (r.kind === 'retry') { if (timer) clearTimeout(timer); timer = setTimeout(() => void kick(), r.afterSec * 1000); return; }
      if (r.kind === 'signedOut' || r.kind === 'idle') return;
      if (r.kind === 'conflict' && r.winner === 'server' && typeof window !== 'undefined')   // the account screen offers "load the newer cloud save"
        window.dispatchEvent(new CustomEvent('cloudsave:server-newer', { detail: r.server }));
    }
  };
  const kick = () => (running ??= run().finally(() => { running = null; }));
  return async (b: { seq: number; state: string }) => { try { box.enqueue(JSON.parse(b.state)); } catch { return; } await kick(); };
}
