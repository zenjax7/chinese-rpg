/** Story rework 2026-11-20: world exits w12…w89 stay closed until that land's climax main is turned in (docs/data/levels/world.json,
 *  copied onto the runtime world graph by build_world.py). A realm node on the world map is open when open links join it to the hero's
 *  node or a realm already visited; else the first locked link on the way is the gate whose line the game shows. */
import { describe, it, expect } from 'vitest';
import { worldLockOnWay, newProgress, registerGraph, markVisited, type Graph, type Ctx, type QState } from '../../src/world/engine';
import WORLD from '../../public/world/graphs/world.json';

const g = WORLD as unknown as Graph;
registerGraph(g);
const done: QState = { s: 'completed', at: 0, step: 0, obj: {} };
function ctx(completed: string[] = [], visited: string[] = []): Ctx {
  const P = newProgress(1, { graph: 'world', node: 'realm_1' });
  for (const n of visited) markVisited(P, g, n);
  return { P, quests: Object.fromEntries(completed.map(q => [q, { ...done }])) };
}

describe('world exit locks', () => {
  it('the runtime world graph carries the climax locks on w12…w89', () => {
    const locks = Object.fromEntries(g.edges.filter(e => (e as any).lockedUntilQuest).map(e => [e.id, (e as any).lockedUntilQuest]));
    expect(locks).toEqual({ w12: 'q1_shatter_crown', w23: 'q2_royal_jelly', w34: 'q3_fog_jar', w45: 'q4_school_bell',
      w56: 'q5_time_pearl', w67: 'q6_cure_mayor', w78: 'q7_storm_crown', w89: 'q8_win_tournament' });
  });
  it('realm 2 is blocked by w12 until q1_shatter_crown is turned in; realm 9 by the first closed link on the way', () => {
    expect(worldLockOnWay(g, 'realm_2', 'realm_1', ctx())?.lockedUntilQuest).toBe('q1_shatter_crown');
    expect(worldLockOnWay(g, 'realm_9', 'realm_1', ctx())?.lockedUntilQuest).toBe('q1_shatter_crown');
    expect(worldLockOnWay(g, 'realm_2', 'realm_1', ctx(['q1_shatter_crown']))).toBeNull();
    expect(worldLockOnWay(g, 'realm_3', 'realm_1', ctx(['q1_shatter_crown']))?.lockedUntilQuest).toBe('q2_royal_jelly');
  });
  it('the hero’s own realm and realms already visited stay open (old saves are never stranded)', () => {
    expect(worldLockOnWay(g, 'realm_1', 'realm_1', ctx())).toBeNull();
    expect(worldLockOnWay(g, 'realm_5', 'realm_1', ctx([], ['realm_1', 'realm_5']))).toBeNull();
    expect(worldLockOnWay(g, 'realm_4', 'realm_1', ctx([], ['realm_1', 'realm_5']))?.lockedUntilQuest).toBe('q4_school_bell');   // a gate closes both ways
    expect(worldLockOnWay(g, 'realm_4', 'realm_1', ctx([], ['realm_1', 'realm_4', 'realm_5']))).toBeNull();
  });
});
