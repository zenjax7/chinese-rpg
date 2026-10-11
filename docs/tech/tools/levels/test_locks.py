"""Fixture test for quest locks (lockedUntilQuest, Jack 2026-10-11). Desy, 2026-10-11 PT.

  python docs/tech/tools/levels/test_locks.py        exit 1 on failure

fixtures/locks/valid        the broken bridge opens when q1_bridge_materials is done; the planks are on the near side -> 0 errors
fixtures/locks/unreachable  the same map with the planks beyond the bridge -> exactly one lock error (step s2 unreachable)
plus two in-memory cases: a lock on the quest's own giver (circular) and an unknown quest id.
Both fixtures go through the full validate_levels.validate (schema = docs/data/levels/schemas)."""
import os, sys, copy, json
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import validate_levels as V
SCH = os.path.join(V.REPO, 'docs', 'data', 'levels', 'schemas'); FX = os.path.join(HERE, 'fixtures', 'locks')
fails = []
def check(name, ok, info=''):
    print(('ok   ' if ok else 'FAIL ') + name + (f'  {info}' if info else '')); ok or fails.append(name)
err, warn, _ = V.validate(os.path.join(FX, 'valid'), SCH)
check('valid fixture: 0 errors', not err, '; '.join(err))
err, warn, _ = V.validate(os.path.join(FX, 'unreachable'), SCH)
check('unreachable fixture: exactly the lock error', len(err) == 1 and 'edge:bridge_town/bridge' in err[0] and 's2' in err[0], '; '.join(err))
m = V.J(os.path.join(FX, 'valid', 'bridge_town.json')); q = {x['id']: x for x in m['quests']}; st = {'graph': 'bridge_town', 'node': 'town'}
c = copy.deepcopy(m); next(n for n in c['nodes'] if n['id'] == 'camp')['lockedUntilQuest'] = 'q1_bridge_materials'
e = V.lock_errors({'bridge_town': c}, st, q); check('a lock on its own giver: unreachable', len(e) == 1 and 'giver' in e[0], '; '.join(e))
# circular: the bridge waits on q1, whose planks are at the quarry behind edge e5; e5 waits on q2, given beyond the bridge
c = copy.deepcopy(m); qq = copy.deepcopy(q); qq['q1_bridge_materials']['objectives'][1]['where']['node'] = 'quarry'
c['edges'][4]['lockedUntilQuest'] = 'q2_quarry_key'
q2 = copy.deepcopy(qq['q1_bridge_materials']); q2.update(id='q2_quarry_key', giver={'graph': 'bridge_town', 'node': 'bridge_e'}); q2['objectives'] = [q2['objectives'][0]]; q2['objectives'][0]['where'] = {'graph': 'bridge_town', 'node': 'bridge_e'}
qq['q2_quarry_key'] = q2
e = V.lock_errors({'bridge_town': c}, st, qq); check('circular: two locks waiting on each other', len(e) == 2 and all('circular' in x for x in e), '; '.join(e))
c = copy.deepcopy(m); c['edges'][3]['lockedUntilQuest'] = 'q1_nope'
e = V.lock_errors({'bridge_town': c}, st, q); check('unknown quest id', any('is not a quest' in x for x in e), '; '.join(e))
print(f'{len(fails)} failures'); sys.exit(1 if fails else 0)
