/** Save storage behind one interface (architecture §9). LocalSaveStore = today's localStorage mirror (classic mode uses only this).
 *  CloudSaveStore = the §9.1 cloud layer as a STUB: it keeps the local mirror as the source of truth and records when a push would
 *  happen (the §9.1 trigger table), but sends nothing. The database / API layer is a separate task; `push` is the seam for it. */
export interface SaveStore {
  readonly kind: 'local' | 'cloud';
  load(key: string): string | null;
  save(key: string, data: string): void;
  remove(key: string): void;
  /** A §9.1 cloud trigger. LocalSaveStore ignores it. */
  trigger(t: CloudTrigger, detail?: string): void;
}
/** §9.1: quest given / completed, graph node change (debounced 20 s), graph change, shortcut opened, boss defeated, inn (rest, Feather,
 *  waking after a defeat), plus the safety flushes (hidden, pagehide, every 3 min while dirty, back online). */
export type CloudTrigger = 'questGiven' | 'questCompleted' | 'nodeChange' | 'graphChange' | 'shortcutOpened' | 'bossDefeated' | 'inn' | 'feather' | 'defeat'
  | 'hidden' | 'pagehide' | 'interval' | 'online';
export const DEBOUNCED: CloudTrigger[] = ['nodeChange'];
export const NODE_DEBOUNCE_MS = 20_000, SAFETY_MS = 180_000;

export class LocalSaveStore implements SaveStore {
  readonly kind = 'local' as const;
  load(key: string) { try { return localStorage.getItem(key); } catch { return null; } }
  save(key: string, data: string) { try { localStorage.setItem(key, data); } catch { /* quota */ } }
  remove(key: string) { try { localStorage.removeItem(key); } catch { /* ignore */ } }
  trigger() { /* local only */ }
}

export interface PushRecord { trigger: CloudTrigger; detail?: string; at: number; bytes: number }
/** Stub cloud store. Every save() writes the local mirror and marks the state dirty; triggers decide when a push would go out. */
export class CloudSaveStore implements SaveStore {
  readonly kind = 'cloud' as const;
  dirty = false; pending: string | null = null; key = ''; seq = 0;
  /** what would have been sent (newest last, capped) and the triggers seen; the tests read these via window.__proto.cloud */
  pushes: PushRecord[] = []; triggers: { trigger: CloudTrigger; detail?: string; at: number }[] = [];
  private debounce: ReturnType<typeof setTimeout> | null = null;
  constructor(private local: SaveStore = new LocalSaveStore(), private send: (body: { seq: number; state: string }) => Promise<void> = async () => { /* stub: no network */ }) {
    if (typeof window === 'undefined') return;
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') this.trigger('hidden'); });
    window.addEventListener('pagehide', () => this.trigger('pagehide'));
    window.addEventListener('online', () => this.trigger('online'));
    setInterval(() => { if (this.dirty) this.trigger('interval'); }, SAFETY_MS);
  }
  load(key: string) { return this.local.load(key); }
  save(key: string, data: string) { this.local.save(key, data); this.key = key; this.pending = data; this.dirty = true; }
  remove(key: string) { this.local.remove(key); this.pending = null; this.dirty = false; }
  trigger(t: CloudTrigger, detail?: string) {
    this.triggers.push({ trigger: t, detail, at: Date.now() }); if (this.triggers.length > 200) this.triggers.shift();
    if (DEBOUNCED.includes(t)) { if (this.debounce) clearTimeout(this.debounce); this.debounce = setTimeout(() => { this.debounce = null; this.push(t, detail); }, NODE_DEBOUNCE_MS); return; }
    this.push(t, detail);
  }
  /** Flush now (also cancels a pending node-change debounce: one push carries everything). */
  push(t: CloudTrigger, detail?: string) {
    if (this.debounce) { clearTimeout(this.debounce); this.debounce = null; }
    const state = this.pending ?? this.local.load(this.key) ?? ''; if (!state) return;
    this.seq++; this.pushes.push({ trigger: t, detail, at: Date.now(), bytes: state.length }); if (this.pushes.length > 100) this.pushes.shift();
    this.dirty = false; void this.send({ seq: this.seq, state }).catch(() => { this.dirty = true; });
  }
}
