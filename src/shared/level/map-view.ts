/** The graph map's frame, shared by the game (src/ui/graph.ts) and the level editor (src/editor/Canvas.tsx), so a node sits on the
 *  same spot over the map background in both. The map screen is a 1280x720 frame: the background art is cover-scaled to it (Phaser
 *  setArt), and a node's stored x / y (0..1) is placed in the node area below, which keeps nodes and labels clear of the HUD and the
 *  bottom bar (top 592). Pure: no game or editor imports. */
export const FRAME_W = 1280, FRAME_H = 720;
export const NODE_AREA = { x: 60, y: 130, w: 1160, h: 410 } as const;
/** A node's point in the frame (the map's SVG coordinates in the game). */
export const nodeXY = (n: { x: number; y: number }) => ({ x: NODE_AREA.x + n.x * NODE_AREA.w, y: NODE_AREA.y + n.y * NODE_AREA.h });
/** The inverse: a frame point -> the stored node x / y (not clamped). */
export const frameToNode = (p: { x: number; y: number }) => ({ x: (p.x - NODE_AREA.x) / NODE_AREA.w, y: (p.y - NODE_AREA.y) / NODE_AREA.h });
/** Maps with more than 60 nodes draw smaller nodes and labels. */
export const isDense = (nodeCount: number) => nodeCount > 60;
export const nodeRadius = (nodeCount: number) => (isDense(nodeCount) ? 17 : 22);
/** The game's node icon by kind. */
export const NODE_ICON: Record<string, string> = { town: '🏘️', village: '🏡', inn: '🛏️', boss: '👑', miniboss: '💀', chest: '🧰', story: '📖', npc: '🙂', portal: '🌀', stairs_up: '⬆️', stairs_down: '⬇️', fork: '•', waypoint: '•', shop: '🛒' };
/** The location whose art the map screen shows for a zone: the zone's own location when it is loaded, else meadow (realm 1) / forest. */
export const mapLocation = (z: { location?: string; realm?: number } | undefined, has: (loc: string) => boolean): string =>
  (z?.location && has(z.location) ? z.location : (z?.realm ?? 1) >= 2 && has('forest') ? 'forest' : 'meadow');
/** Realm slug used in background file names: r<tier>_<name in snake_case>, e.g. r1_starter_meadow, r2_honeycomb_forest.
 *  A location may override it with an optional "realm" field in locations.json. */
export function realmSlug(l: { tier: number; name: string; realm?: unknown }): string {
  return (l as any).realm || `r${l.tier}_${l.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`;
}
/** The map screen's background keys for a location, in priority order (the first one in the asset manifest wins). */
export const mapBgKeys = (l: { tier: number; name: string; realm?: unknown }) => [`bg_map_${realmSlug(l)}`];
