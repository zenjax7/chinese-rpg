/** Cloud saving for the browser, OFF by default (architecture.md §9). It turns on only when the build sets VITE_CLOUD_SAVE=1 AND a
 *  signed-in parent picked a child profile on this device (localStorage "chinese-rpg-cloud" = {"childId": "<uuid>"}). Until then the
 *  CloudSaveStore stays the no-network stub and the local save is the only copy, exactly as today. */
import { ApiClient } from './api.js';
import { Outbox, type FlushResult, type KV } from './outbox.js';

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

/** GET /children/:id/save body (server/dal/saves.ts loadSave). */
export interface CloudSave {
  version: number; contentVersion: string | null; state: Record<string, any> | null;
  graphs: { graph: string; n?: number; visited: string; cleared: string; lastNode?: string | null }[];
  mastery: { item: string; seen: boolean; recentMiss: number; ways: Record<string, any> }[];
}
const blankWay = () => ({ c: 0, a: 0, box: 0, last: 0, due: 0, wrongRun: 0 });
/** Turns the cloud save into a full local SaveState on top of `base` (a fresh newState()): the snapshot, `prog` rebuilt from the
 *  word_mastery rows, graph bitsets the snapshot lacks, an empty answer log (it never leaves a device), and consent marked given
 *  (the parent consented for the account; speech is on by default, Jack 2026-10-18, and ⏸️ → Parents turns it off). Returns null when there is no snapshot
 *  and no mastery yet (a brand-new child: start fresh). */
export function stateFromCloud(save: CloudSave, base: Record<string, any>): Record<string, any> | null {
  if (!save.state && !save.mastery.length) return null;
  const st: Record<string, any> = { ...base, ...(save.state || {}), log: [] };
  st.consent = { given: true, speech: true, at: Date.now() };
  const prog: Record<string, any> = {};
  for (const m of save.mastery) {
    const ways: Record<string, any> = {};
    for (const w of ['rZE', 'rEZ', 'sZE', 'sEZ']) ways[w] = { ...blankWay(), ...(m.ways?.[w] || {}) };
    prog[m.item] = { seen: !!m.seen, recentMiss: m.recentMiss | 0, ways };
  }
  st.prog = prog;
  if (st.world && typeof st.world === 'object') {
    const graphs = (st.world.graphs ||= {});
    for (const g of save.graphs) if (!graphs[g.graph]) graphs[g.graph] = { visited: g.visited, walked: g.cleared, revealed: '', crossings: {}, edgeProgress: {}, visits: {} };
  }
  return st;
}
