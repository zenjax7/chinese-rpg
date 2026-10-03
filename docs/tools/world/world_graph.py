"""Loads the v3.8 world data (data/world, format graph/0.3) for world_sim.py, the validator and the renderer.
A Realm = the realm's overworld graph plus every dungeon level reachable from it by stairs/portal edges, merged into one node
space ('graph/node'). Zones (one per location/word pool) come from zones.json."""
import json, collections, os
ROOT = os.environ.get('WORLD_DATA', '/workspace/desy/data/world')
J = lambda p: json.load(open(os.path.join(ROOT, p), encoding='utf-8'))
RULES = J('world_rules.json'); INDEX = J('index.json'); ZONES = J(INDEX['files']['zones'])['zones']
QF = J(INDEX['files']['quests']); HOOKS = {q['id']: q for q in QF['questHooks']}
GRAPHS = {g['id']: J(g['file']) for g in INDEX['graphs']}
def rate(d, level):
    return min(RULES['maxRate'], RULES['encounterRate'][str(d)] * (1 + RULES['depthStep']*max(0, level - 1)))
class Realm:
    def __init__(self, t):
        rid = f'realm_{t}'; self.t = t; self.rid = rid; self.N = {}; self.E = {}; self.adj = collections.defaultdict(list); self.level = {}; self.EV = collections.defaultdict(list)
        todo = [rid]; seen = set(); xlinks = []
        while todo:
            g = GRAPHS[todo.pop()]
            if g['id'] in seen: continue
            seen.add(g['id'])
            for n in g['nodes']:
                k = f"{g['id']}/{n['id']}"; self.N[k] = dict(n, graph=g['id'], key=k); self.level[k] = g.get('level', 0)
            for e in g['edges']:
                a = f"{g['id']}/{e['from']}"
                if isinstance(e.get('to'), dict):
                    if e['kind'] in ('stairs', 'portal') and GRAPHS.get(e['to']['graph'], {}).get('kind') == 'dungeon_level':
                        todo.append(e['to']['graph']); xlinks.append((a, f"{e['to']['graph']}/{e['to']['node']}", e['kind']))
                    continue
                b = f"{g['id']}/{e['to']}"; k = f"{g['id']}/{e['id']}"
                self.E[k] = dict(e, key=k, a=a, b=b, level=g.get('level', 0)); self.adj[a].append((k, b))
                if e['kind'] != 'oneway': self.adj[b].append((k, a))
            for ev in g.get('events', []): self.EV[f"{g['id']}/{ev['node']}"].append(ev)
        for a, b, kind in xlinks:
            ek = 'link:' + '|'.join(sorted((a, b)))
            if ek in self.E or b not in self.N: continue
            self.E[ek] = dict(id=ek, key=ek, a=a, b=b, danger=0, steps=1, kind=kind, level=0); self.adj[a].append((ek, b)); self.adj[b].append((ek, a))
        self.entry = f"{rid}/{GRAPHS[rid]['entry']}"
        self.zones = []
        for z in sorted([z for z in ZONES if z['realm'] == t], key=lambda z: z['order']):
            boss = f"{z['bossNode']['graph']}/{z['bossNode']['node']}"; ge = f"{z['gateEdge']['graph']}/{z['gateEdge']['edge']}"
            self.zones.append(dict(z, boss=boss, gate=ge, approach=self.E[ge]['a'] if self.E[ge]['b'] == boss else self.E[ge]['b']))
        self.bosses = [z['boss'] for z in self.zones]
        self.inns = [k for k, n in self.N.items() if 'inn' in n.get('services', [])]
        self.towns = [k for k, n in self.N.items() if n['kind'] in ('town', 'village')]
        safe_node = lambda k: k in self.inns or k in self.towns
        for k, e in self.E.items():
            e['safe'] = e['danger'] == 0 or bool(e.get('patrol')) or e['kind'] in ('stairs', 'portal') or safe_node(e['a']) or safe_node(e['b'])
            e['p'] = 0.0 if e['safe'] else rate(e['danger'], e['level'])
        self._path = {}; self._bl = {}
    def blocked(self, zi):
        if zi not in self._bl:
            b = set()   # an undefeated boss (current or later zone) blocks every edge through its node; beaten bosses are open
            for z in self.zones[zi:]: b |= {k for k, _ in self.adj[z['boss']]}
            self._bl[zi] = b
        return self._bl[zi]
    def path(self, a, b, zi):
        key = (a, b, zi)
        if key in self._path: return self._path[key]
        bl = self.blocked(zi); prev = {a: None}; q = collections.deque([a])
        while q:
            u = q.popleft()
            if u == b: break
            for e, v in self.adj[u]:
                if e in bl or v in prev: continue
                prev[v] = (u, e); q.append(v)
        if b not in prev: self._path[key] = None; return None
        out = []; v = b
        while prev[v]: u, e = prev[v]; out.append((e, v)); v = u
        self._path[key] = out[::-1]; return self._path[key]
    def stats(self):
        deg = collections.Counter(); links = 0
        for e in self.E.values():
            if e['kind'] in ('stairs', 'portal'): links += 1; continue
            deg[e['a']] += 1; deg[e['b']] += 1
        n = len(self.N); m = sum(1 for e in self.E.values() if e['kind'] not in ('stairs', 'portal'))
        dead = sum(1 for k in self.N if deg[k] + sum(1 for e, _ in self.adj[k] if self.E[e]['kind'] in ('stairs', 'portal')) == 1)
        graphs = {k.split('/')[0] for k in self.N}
        dung = {GRAPHS[g]['dungeon'] for g in graphs if GRAPHS[g]['kind'] == 'dungeon_level'}
        return dict(graphs=len(graphs), nodes=n, edges=m, links=links, density=round(m/n, 2), mean_degree=round(2*(m+links)/n, 2),
                    branch_nodes=sum(1 for k in self.N if deg[k] >= 3), dead_end_share=round(dead/n, 2), cycles=m + links - n + 1,
                    towns=sum(1 for k in self.N if self.N[k]['kind'] == 'town'), villages=sum(1 for k in self.N if self.N[k]['kind'] == 'village'),
                    inns=sum(1 for k in self.N if self.N[k]['kind'] == 'inn'), dungeons=len(dung), levels=sum(1 for g in graphs if GRAPHS[g]['kind'] == 'dungeon_level'),
                    bosses=len(self.zones), minibosses=sum(1 for k in self.N if self.N[k]['kind'] == 'miniboss'), chests=sum(1 for k in self.N if self.N[k]['kind'] == 'chest'),
                    story=sum(1 for k in self.N if self.N[k]['kind'] == 'story'), npcs=sum(1 for k in self.N if self.N[k]['kind'] == 'npc'))
REALMS = {}
def realm(t):
    if t not in REALMS: REALMS[t] = Realm(t)
    return REALMS[t]
if __name__ == '__main__':
    for t in range(1, 10): print(t, realm(t).stats())
