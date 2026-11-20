/** Story rework 2026-11-20 (Desy, approved by Jack): q1_quiet_morning is handed in at the well, where sc_r1_hatch (the egg hatches,
 *  joinParty 小龙) plays before the quest's own thanks scene. build_world.py derives the order and the place from the scene triggers. */
import { describe, it, expect } from 'vitest';
import { turnInScenes, type Quest } from '../../src/world/engine';
import QUESTS from '../../src/data/world/quests.json';

const q = (id: string) => (QUESTS as { quests: Quest[] }).quests.find(x => x.id === id)!;

describe('turn-in scenes', () => {
  it('plays the hatch before the thanks at the well for q1_quiet_morning', () => {
    expect(turnInScenes(q('q1_quiet_morning'))).toEqual(['sc_r1_hatch', 'sc_q1_quiet_morning_thanks']);
    expect(q('q1_quiet_morning').turnInAt).toEqual({ graph: 'realm_1', node: 'm_well' });
  });
  it('leaves other quests with just their thanks scene, handed in at the giver', () => {
    const hoe = q('q1_hoe');
    expect(turnInScenes(hoe)).toEqual(['sc_q1_hoe_thanks']);
    expect(hoe.turnInAt).toEqual(hoe.giverAt);
  });
  it('copes with a quest without scenes', () => {
    expect(turnInScenes({ scenes: null })).toEqual([]);
    expect(turnInScenes({ scenes: { beforeTurnIn: ['a'] } })).toEqual(['a']);
  });
});
