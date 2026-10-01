// Runtime view of public/assets-manifest.json (written by tools/sync_assets.py at build time).
// Only files listed here are ever requested, so missing art/audio silently falls back (no 404s).
import type { LocationDef } from './data';

export interface AudioEntry { urls: string[]; loopStart?: number; loopEnd?: number; volume?: number; }
export interface AssetManifest { bg: Record<string, string>; sfx: Record<string, AudioEntry>; music: Record<string, AudioEntry>; vo: Record<string, string[]>; }
const EMPTY: AssetManifest = { bg: {}, sfx: {}, music: {}, vo: {} };
let M: AssetManifest = EMPTY;
const waiters: ((m: AssetManifest) => void)[] = [];

export function setAssetManifest(m: any) {
  M = { bg: m?.bg || {}, sfx: m?.sfx || {}, music: m?.music || {}, vo: m?.vo || {} };
  (window as any).__proto = (window as any).__proto || {};
  (window as any).__proto.assets = { bg: Object.keys(M.bg), sfx: Object.keys(M.sfx), music: Object.keys(M.music), vo: Object.keys(M.vo).length };
  waiters.splice(0).forEach(f => f(M));
}
export const assets = () => M;
export function onAssets(f: (m: AssetManifest) => void) { if (M !== EMPTY) f(M); else waiters.push(f); }

/** Realm slug used in background file names: r<tier>_<name in snake_case>, e.g. r1_starter_meadow, r2_honeycomb_forest.
 *  A location may override it with an optional "realm" field in locations.json. */
export function realmSlug(l: LocationDef): string {
  return (l as any).realm || `r${l.tier}_${l.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`;
}
/** Background keys in priority order (first one present wins; none present => procedural placeholder scene). */
export const BG = {
  village: () => ['bg_village'],
  inn: () => ['bg_inn', 'bg_village'],
  map: (l: LocationDef) => [`bg_map_${realmSlug(l)}`],
  battle: (l: LocationDef, boss: boolean) => [...(boss ? [`bg_battle_${realmSlug(l)}_boss`] : []), `bg_battle_${realmSlug(l)}`],
};
