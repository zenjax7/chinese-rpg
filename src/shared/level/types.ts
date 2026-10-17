/** level/0.2 shapes the editor and the API touch (docs/data/levels/schemas/level.schema.json is the full contract). */
export type Txt = { zh?: string; zhTrad?: string; en: string };
export type NodeRef = { graph: string; node: string };
export type MapState = 'draft' | 'beta' | 'golden';
export interface LevelNode { id: string; idx: number; kind: string; x: number; y: number; title?: Txt; npc?: string;
  lockedUntilQuest?: string; lockedScene?: string; [k: string]: unknown }
export interface LevelEdge { id: string; idx?: number; from: string; to: string | NodeRef; kind?: string; danger?: number; steps?: number;
  terrain?: string; label?: string; lockedUntilQuest?: string; lockedScene?: string; [k: string]: unknown }
export interface SceneLine { id: string; speaker: string; side?: string; expr?: string; en: string; zh?: string; zhTrad?: string; [k: string]: unknown }
export interface Scene { schema: 'scene/0.2'; id: string; trigger: { graph: string; on: string; [k: string]: unknown };
  slots?: Record<string, { char: string; expr?: string }>; lines: SceneLine[]; [k: string]: unknown }
export interface Level { schema: 'level/0.2'; id: string; version?: number; state: MapState; kind: string; title: Txt; entry: string;
  aspect?: number; settings: { words: string[]; boss?: { node?: string; [k: string]: unknown }; [k: string]: unknown };
  nodes: LevelNode[]; edges: LevelEdge[]; events?: any[]; quests?: any[]; scenes?: Record<string, Scene>; [k: string]: unknown }
export interface Problem { level: 'error' | 'warning'; code: string; msg: string; at?: string }
/** One row of src/shared/level/wordbank.json: [id, simplified, traditional, pinyin, english]. */
export type WordRow = [string, string, string, string, string];
