"""Boss-skip routes on docs/data/levels (Jack 2026-10-11: progression is purely by links, beating a boss unlocks nothing; Jack 2026-10-12:
a boss node blocks passage until its boss is beaten, and "skippable" only means an alternate route that never goes through the node). Desy, 2026-10-11 PT. Static graph analysis, no battles simulated.

  python docs/tech/tools/sim/boss_skips.py        -> docs/data/sim/sim_world_boss_skips.csv (+ a printed summary)

Graph: every node of every map; in-map edges both ways (oneway: one way), cross-map links as written. Cost of an edge = its steps
(stairs / portal / exit links: 1 hop, 0 steps). Expected random battles = sum of steps x the fresh encounter rate (world_loader.rate on
docs/data/levels/world_rules.json; safe edges 0). A boss node blocks passage: you get past it only by winning it (Jack 2026-10-12).
 1. per boss: what is behind it = nodes you can't reach from the start when that boss node is a wall (every other boss passable).
 2. skip beeline: the route from the start to the final boss with the fewest boss fights, then the fewest steps.
 3. full beeline: start -> boss 1 -> boss 2 -> ... -> final boss in the campaign order (gearTier, then link order), each leg with the
    bosses not beaten yet as walls; the same costs. 2 vs 3 = how much skipping shortens the walk."""
import os, sys, json, glob, heapq, collections, csv
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import world_loader as WG
J = lambda p: json.load(open(p, encoding='utf-8'))

def build(d=None):
    d = d or WG.LEVELS_DIR
    WG.configure(dict(source='levels')); maps = {}
    for f in glob.glob(os.path.join(d, '*.json')):
        m = J(f)
        if m.get('schema', '').startswith('level/'): maps[m['id']] = m
    idx = J(os.path.join(d, 'index.json')); s0 = f"{idx['start']['graph']}/{idx['start']['node']}"
    kind = {f"{mid}/{n['id']}": n['kind'] for mid, m in maps.items() for n in m['nodes']}
    svc = {f"{mid}/{n['id']}": n.get('services', []) for mid, m in maps.items() for n in m['nodes']}
    safe_node = lambda k: kind.get(k) in ('town', 'village') or 'inn' in svc.get(k, [])
    adj = collections.defaultdict(list)
    for mid, m in maps.items():
        lvl = m.get('level', 0)
        for e in m['edges']:
            a = f"{mid}/{e['from']}"
            if isinstance(e['to'], dict): adj[a].append((f"{e['to']['graph']}/{e['to']['node']}", 0, 0.0, f"{mid}/{e['id']}")); continue
            b = f"{mid}/{e['to']}"; st = e.get('steps', 1) if e['kind'] not in ('stairs', 'portal') else 0
            safe = not e.get('danger') or e.get('patrol') or e['kind'] in ('stairs', 'portal') or safe_node(a) or safe_node(b)
            eb = 0.0 if safe else st*WG.rate(e['danger'], lvl)
            adj[a].append((b, st, eb, f"{mid}/{e['id']}"))
            if e['kind'] != 'oneway': adj[b].append((a, st, eb, f"{mid}/{e['id']}"))
    bosses = {f"{mid}/{m['settings']['boss']['node']}": mid for mid, m in maps.items() if m['settings'].get('boss')}
    return maps, s0, adj, bosses

def route(adj, a, b, walls, soft=False):
    """Shortest route a -> b by steps. walls: boss nodes not beaten yet. soft=False: never through a wall; soft=True: through a wall
    only when there is no other way (cost = (boss fights on the way, steps, expected battles))."""
    best = {a: (0, 0, 0.0, 0, None)}; pq = [(0, 0, 0.0, a)]; done = set()
    while pq:
        f, c, eb, u = heapq.heappop(pq)
        if u in done: continue
        done.add(u)
        if u == b: break
        if u in walls and u != a and not soft: continue
        for v, st, x, eid in adj[u]:
            if v in walls and v != b and not soft: continue
            nc = (f + (v in walls and v != b), c + st, eb + x)
            if v not in best or nc < best[v][:3]: best[v] = nc + (best[u][3] + 1, u); heapq.heappush(pq, nc + (v,))
    if b not in best: return None
    path = []; v = b
    while v: path.append(v); v = best[v][4]
    return dict(fights=best[b][0], steps=best[b][1], battles=best[b][2], hops=best[b][3], maps=list(dict.fromkeys(x.split('/')[0] for x in path[::-1])), path=path[::-1])

def reach(adj, s0, walls):
    seen = {s0}; q = collections.deque([s0])
    while q:
        u = q.popleft()
        if u in walls: continue
        for v, *_ in adj[u]:
            if v not in seen: seen.add(v); q.append(v)
    return seen

def analyse():
    maps, s0, adj, bosses = build()
    order = [z['bossNode']['graph'] + '/' + z['bossNode']['node'] for z in sorted(WG.ZONES, key=lambda z: (z['realm'], z['order']))]
    final = order[-1]; allr = reach(adj, s0, set()); rows = []
    for b in order:
        r = reach(adj, s0, {b}); behind = sorted((allr - r) - {b})
        rows.append(dict(kind='behind_boss', boss_map=bosses[b], boss_node=b, tier=maps[bosses[b]]['settings']['gearTier'], skippable=not behind,
                         nodes_behind=len(behind), maps_behind=' '.join(sorted({x.split('/')[0] for x in behind})), steps='', expected_battles='', hops='', route_maps=''))
    sk = route(adj, s0, final, set(order) - {final}, soft=True)
    rows.append(dict(kind='skip_beeline', boss_map=bosses[final], boss_node=final, tier=9, skippable='', nodes_behind='', maps_behind='',
                     steps=sk['steps'], expected_battles=round(sk['battles'], 2), hops=sk['hops'], route_maps=' > '.join(sk['maps']),
                     bosses_on_route=sum(x in bosses for x in sk['path']), bosses_fought=' '.join(bosses[x] for x in sk['path'] if x in bosses)))
    pos = s0; tot = dict(steps=0, battles=0.0, hops=0); left = list(order)
    for b in order:
        left.remove(b); r = route(adj, pos, b, set(left))
        tot['steps'] += r['steps']; tot['battles'] += r['battles']; tot['hops'] += r['hops']; pos = b
    rows.append(dict(kind='full_beeline', boss_map=bosses[final], boss_node=final, tier=9, skippable='', nodes_behind='', maps_behind='',
                     steps=tot['steps'], expected_battles=round(tot['battles'], 2), hops=tot['hops'], route_maps=f'all {len(order)} bosses in campaign order', bosses_on_route=len(order)))
    for t in range(2, 10):   # the cheapest way to each tier's first boss with no boss beaten
        b = next(x for x in order if maps[bosses[x]]['settings']['gearTier'] == t); r = route(adj, s0, b, set(order) - {b}, soft=True)
        if r: rows.append(dict(kind='first_boss_of_tier_no_boss_beaten', boss_map=bosses[b], boss_node=b, tier=t, skippable='', nodes_behind='', maps_behind='',
                               steps=r['steps'], expected_battles=round(r['battles'], 2), hops=r['hops'], route_maps=' > '.join(r['maps']), bosses_on_route=sum(x in bosses for x in r['path']), bosses_fought=' '.join(bosses[x] for x in r['path'] if x in bosses)))
    return rows

if __name__ == '__main__':
    rows = analyse(); keys = list(dict.fromkeys(k for r in rows for k in r))
    p = os.path.join(WG.REPO, 'docs', 'data', 'sim', 'sim_world_boss_skips.csv')
    with open(p, 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=keys, lineterminator='\n'); w.writeheader(); w.writerows(rows)
    for r in rows: print({k: v for k, v in r.items() if v != ''})
    print('wrote', os.path.relpath(p, WG.REPO))
