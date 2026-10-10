/** The cloud-save outbox (architecture.md §9.2). One persisted batch per child: the newest snapshot (without prog and log), mastery
 *  deltas since the last acknowledged push, and graph bitsets that changed. A batch keeps its seq until the server acknowledges it,
 *  so a retry after a lost response is a duplicate the server ignores (idempotent by deviceId + seq). Nothing here touches the DOM;
 *  storage and the API client are injected, so the same code runs in the browser and in the API tests. */
import type { ApiClient } from './api';

export interface KV { get(k: string): string | null; set(k: string, v: string): void; remove(k: string): void }
type Way = 'rZE' | 'rEZ' | 'sZE' | 'sEZ';
interface WayStat { a: number; c: number; box: number; due: number; last: number; wrongRun: number }
export interface MasteryDelta { item: string; way: Way; da: number; dc: number; box: number; due: number; last: number; wrongRun: number; seen?: boolean; recentMiss?: number }
export interface GraphDelta { graph: string; visited: string; cleared: string }
interface Batch { seq: number; baseVersion: number; contentVersion: string; state: Record<string, unknown> | null; mastery: MasteryDelta[]; graphs: GraphDelta[]; sentAc: Record<string, [number, number]>; sentGraphs: Record<string, string> }
interface Persisted { deviceId: string; seq: number; version: number; sentAc: Record<string, [number, number]>; sentGraphs: Record<string, string>; inflight: Batch | null; pending: Record<string, unknown> | null }
export type FlushResult =
  | { kind: 'idle' } | { kind: 'sent'; version: number; duplicate?: boolean }
  | { kind: 'conflict'; winner: 'client'; version: number }
  | { kind: 'conflict'; winner: 'server'; version: number; server: { version: number; contentVersion: string; state: unknown } }
  | { kind: 'retry'; afterSec: number; status: number } | { kind: 'signedOut'; status: number } | { kind: 'dropped'; status: number; error?: string };

const WAYS: Way[] = ['rZE', 'rEZ', 'sZE', 'sEZ'];
const MAX_MASTERY = 300, MAX_GRAPHS = 64;
const rnd = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2, '0')).join('');

export class Outbox {
  private p: Persisted; private key: string; private backoff = 0;
  constructor(private kv: KV, private api: ApiClient, readonly childId: string, private contentVersion: string) {
    this.key = `chinese-rpg-outbox-v1:${childId}`;
    let p: Persisted | null = null; try { p = JSON.parse(kv.get(this.key) || 'null'); } catch { p = null; }
    this.p = p && typeof p.seq === 'number' ? p : { deviceId: `dev-${rnd()}`, seq: 0, version: 0, sentAc: {}, sentGraphs: {}, inflight: null, pending: null };
    this.save();
  }
  private save() { this.kv.set(this.key, JSON.stringify(this.p)); }
  get deviceId() { return this.p.deviceId; }
  get version() { return this.p.version; }
  get hasWork() { return !!(this.p.inflight || this.p.pending); }
  /** Adopt the server's version (after GET /save or a server-wins conflict) so the next push is a normal update. */
  setVersion(v: number) { this.p.version = v; this.save(); }
  /** Queue the newest local save (the full SaveState JSON); only the latest one is kept. */
  enqueue(fullState: Record<string, unknown>) { this.p.pending = fullState; this.save(); }

  /** Build the batch from the pending state: snapshot without prog/log, mastery deltas against what was acknowledged, changed graphs. */
  private build(st: Record<string, any>): Batch {
    const { prog, log, ...snap } = st;
    const sentAc = { ...this.p.sentAc }, mastery: MasteryDelta[] = [];
    for (const [item, ip] of Object.entries<any>(prog || {})) for (const way of WAYS) {
      const w: WayStat | undefined = ip?.ways?.[way]; if (!w) continue;
      const k = `${item}|${way}`, [a0, c0] = sentAc[k] || [0, 0];
      if (w.a <= a0 && w.c <= c0) continue;
      const da = Math.max(0, w.a - a0), dc = Math.min(da, Math.max(0, w.c - c0));
      if (mastery.length >= MAX_MASTERY) break;
      mastery.push({ item, way, da, dc, box: w.box, due: w.due, last: w.last, wrongRun: w.wrongRun, seen: !!ip.seen, recentMiss: ip.recentMiss | 0 });
      sentAc[k] = [a0 + da, c0 + dc];
    }
    const sentGraphs = { ...this.p.sentGraphs }, graphs: GraphDelta[] = [];
    for (const [graph, g] of Object.entries<any>(st.world?.graphs || {})) {
      const sig = `${g.visited || ''}|${g.walked || ''}`;
      if (sentGraphs[graph] === sig || graphs.length >= MAX_GRAPHS) continue;
      graphs.push({ graph, visited: g.visited || '', cleared: g.walked || '' }); sentGraphs[graph] = sig;
    }
    return { seq: this.p.seq + 1, baseVersion: this.p.version, contentVersion: this.contentVersion, state: st.world ? snap : null, mastery, graphs, sentAc, sentGraphs };
  }

  /** Send the in-flight batch (or build one from the pending state). Safe to call often: one request at a time. */
  async flush(): Promise<FlushResult> {
    if (!this.p.inflight) {
      if (!this.p.pending) return { kind: 'idle' };
      this.p.inflight = this.build(this.p.pending as Record<string, any>); this.p.seq = this.p.inflight.seq; this.p.pending = null; this.save();
    }
    const b = this.p.inflight;
    let r;
    try {
      r = await this.api.call('PUT', `/children/${encodeURIComponent(this.childId)}/save`, { baseVersion: b.baseVersion, deviceId: this.p.deviceId, seq: b.seq,
        contentVersion: b.contentVersion, ...(b.state ? { state: b.state } : {}), mastery: b.mastery, graphs: b.graphs });
    } catch { return this.retry(0); }   // offline: keep the batch, same seq
    if (r.status === 200 && r.body) {
      const body: any = r.body; this.backoff = 0;
      this.p.sentAc = b.sentAc; this.p.sentGraphs = b.sentGraphs; this.p.inflight = null; this.p.version = body.version; this.save();
      if (body.conflict && body.winner === 'server') return { kind: 'conflict', winner: 'server', version: body.version, server: body.server };
      if (body.conflict) return { kind: 'conflict', winner: 'client', version: body.version };
      return { kind: 'sent', version: body.version, duplicate: !!body.duplicate };
    }
    if (r.status === 401 || r.status === 403) return { kind: 'signedOut', status: r.status };   // keep the batch for after sign-in / consent
    if (r.status === 429 || r.status >= 500) return this.retry(r.status, r.retryAfterSec);
    // 400 / 404 / 409 / 413: this batch can never succeed; drop it (the local save is still the source of truth)
    this.p.inflight = null; this.save();
    return { kind: 'dropped', status: r.status, error: (r.body as any)?.error };
  }
  private retry(status: number, afterSec: number | null = null): FlushResult {
    this.backoff = Math.min(300, this.backoff ? this.backoff * 2 : 5);
    return { kind: 'retry', status, afterSec: afterSec ?? this.backoff };
  }
}
