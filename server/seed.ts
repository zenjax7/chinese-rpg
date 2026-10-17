/** Seed entry for server/seed-levels.mjs (level-editor.md §8): reads docs/data/levels/*.json and index.json's start, then seeds. */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Db } from './db.js';
import { seedLevels } from './dal/levels.js';
import type { Level } from '../src/shared/level/types.js';

const NOT_MAPS = new Set(['index.json', 'world_rules.json']);

export function readLevelsDir(dir: string): { maps: Level[]; start: { graph: string; node: string } } {
  const maps = readdirSync(dir).filter(f => f.endsWith('.json') && !NOT_MAPS.has(f)).sort().map(f => JSON.parse(readFileSync(join(dir, f), 'utf8')) as Level);
  const start = JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8')).start;
  return { maps, start };
}

export async function seedFromDir(db: Db, dir: string, opts: { restore?: boolean } = {}) {
  const { maps, start } = readLevelsDir(dir);
  return seedLevels(db, maps, start, opts);
}
