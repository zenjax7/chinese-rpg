/** v3.9.2 realm 3–9 content (Desy's docs/data/world/content/realm_N.json → public/world/content/, pinyin stripped by build_world.py).
 *  Graph mode only: fetched when a realm's graph loads and merged into the battle tables (ENEMIES, ITEM, ITEMS, POOLS, LOC). Never added to
 *  LOCATIONS, so classic mode (which iterates LOCATIONS) is unchanged. */
import { ENEMIES, ITEM, ITEMS, POOLS, LOC, LOCATIONS, POOL_ORDER, EnemyDef, Item, LocationDef } from '../data';
import { S } from '../engine/state';

export interface RealmContent { realm: number; version: string; title?: any; G?: number; enemies: EnemyDef[]; locations: LocationDef[]; pools: Record<string, string[]>; items: Item[] }
const loaded: Record<number, Promise<boolean>> = {};
const order: { id: string; realm: number; k: number }[] = [];

/** Merge one realm's content into the battle tables (idempotent). */
export function registerContent(c: RealmContent) {
  for (const e of c.enemies) if (!ENEMIES[e.id]) ENEMIES[e.id] = { ...e, py: '' };
  for (const i of c.items) if (!ITEM[i.id]) { const it = { ...i, py: '' }; ITEM[i.id] = it; ITEMS.push(it); }
  c.locations.forEach((l, k) => {
    // Jack Oct 11: no random or scripted path elites, so a zone's elite / scripted fields are not copied
    if (!LOC[l.id]) { const { elite: _e, scripted: _s, ...rest } = l as any; LOC[l.id] = { ...rest, bossReward: l.bossReward || { text: '' }, packs: l.packs || {}, scripted: {} }; }
    if (!order.some(o => o.id === l.id)) order.push({ id: l.id, realm: c.realm, k });
  });
  for (const [z, ids] of Object.entries(c.pools)) if (!POOLS[z]) POOLS[z] = ids.filter(id => ITEM[id]);
  // review order: the classic pools first, then realm 3.. zones in realm / zone order (learning.earlierItems)
  order.sort((a, b) => a.realm - b.realm || a.k - b.k);
  POOL_ORDER.splice(LOCATIONS.length, POOL_ORDER.length, ...order.map(o => o.id));
  ensureLocState();
}
/** Graph-mode battle state for content zones (S.locs is keyed by location id; classic only creates meadow / forest). */
export function ensureLocState() {
  for (const o of order) S.locs[o.id] ??= { unlocked: true, bossDefeated: false, pathCleared: 0, previewSeen: false };
}
/** Fetch + register realm `realm`'s content once; false when this realm has no content file (realms 1–2 live in the classic tables). */
export function loadRealmContent(realm: number, files: Record<string, string> | undefined): Promise<boolean> {
  const f = files?.[String(realm)]; if (!f) return Promise.resolve(false);
  return loaded[realm] ??= fetch(`world/${f}`).then(r => { if (!r.ok) throw new Error(`${f}: ${r.status}`); return r.json(); })
    .then((c: RealmContent) => { registerContent(c); return true; })
    .catch(err => { delete loaded[realm]; throw err; });
}
export const contentLoaded = (realm: number) => realm in loaded;
