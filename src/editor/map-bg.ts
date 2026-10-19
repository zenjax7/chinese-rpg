/** Which background the game's map screen shows for a map, resolved the way src/ui/graph.ts does (zone -> location -> mapBgKeys, the
 *  first key the deployed asset manifest has). The game takes the zone from the map's bundled nodes; every node of a bundled map is
 *  in the same realm, so the map's own zone (world index) or its realm's first zone gives the same art. Realm 3–9 locations live in
 *  the realm content files, which the game loads before it shows such a map; the editor fetches the same files. */
import WORLD_INDEX from '../data/world/index.json';
import LOCATIONS from '../data/locations.json';
import { mapBgKeys, mapLocation } from '../shared/level/map-view';

type Loc = { id: string; tier: number; name: string; realm?: unknown };
type Zone = { id: string; realm?: number; location?: string };
const idx = WORLD_INDEX as unknown as { zones: Zone[]; graphs: { id: string; realm?: number }[]; content?: Record<string, string> };
const CLASSIC: Record<string, Loc> = Object.fromEntries((LOCATIONS as unknown as { locations: Loc[] }).locations.map(l => [l.id, l]));
const content: Record<number, Promise<Loc[]>> = {};
function realmLocations(realm: number): Promise<Loc[]> {
  const f = idx.content?.[String(realm)]; if (!f) return Promise.resolve([]);
  return content[realm] ??= fetch(`/world/${f}`).then(r => (r.ok ? r.json() : { locations: [] })).then(j => j.locations ?? []).catch(() => []);
}

export interface MapBg { keys: string[]; key: string | null; url: string | null; location: string }
/** `manifestBg` is the `bg` section of /assets-manifest.json (key -> path). */
export async function resolveMapBg(mapId: string, manifestBg: Record<string, string>): Promise<MapBg> {
  const own = idx.zones.find(z => z.id === mapId);
  const realm = idx.graphs.find(g => g.id === mapId)?.realm ?? own?.realm ?? 1;
  const zone = own ?? idx.zones.find(z => z.realm === realm);
  const locs: Record<string, Loc> = { ...CLASSIC };
  if ((zone?.realm ?? 1) >= 3) for (const l of await realmLocations(zone!.realm!)) locs[l.id] ??= l;
  const location = mapLocation(zone, l => !!locs[l]);
  const keys = mapBgKeys(locs[location]);
  const key = keys.find(k => manifestBg[k]) ?? null;
  return { keys, key, url: key ? new URL(manifestBg[key], location_origin()).href : null, location };
}
const location_origin = () => `${window.location.origin}/`;
