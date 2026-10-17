"""World loader for the campaign sim (world_sim.py), Desy. Repo-relative; nothing under /workspace/desy.
2026-10-10 PT: world + level/0.1 sources. 2026-10-11 PT: level/0.2 maps (no realms, Jack's review of the level editor).

Two sources, same in-memory shape (the sim's segment t = a group of maps with their bosses, merged into one 'graph/node' space;
one *location* per word pool, with its boss record):
  * world  - docs/data/world (index.json, graphs/*.json, zones.json, world_rules.json) + docs/data/quests/quests.json (rewards).
             segment t = realm_<t> plus the same-realm maps its stairs/portal links reach.
  * levels - docs/data/levels/*.json (level/0.2, written by docs/tech/tools/levels/convert_levels.py, later by GameDev's export) +
             docs/data/levels/index.json (start). No realm field: the order is read from links, bosses and conditions (unlock_order),
             a location = the maps with the same word list (one boss map each), segment t = the boss map's settings.gearTier.
             Quests come from the maps; events = plain events + the events kept in node quest variants (map_events).
             Global rules stay in docs/data/world/world_rules.json.
Default source: docs/data/levels/ when it holds map files, else docs/data/world.

Transform 'levels_proposal' (world source only, in memory): realm_1 split into realm_1 + clover_hills + warren behind portal links
(c_gate, w_gate); the 9 doorway paths moved into the next map behind an `entry_gate` node. convert_levels.py applies the same code,
so `source=levels` and `source=world, transform=levels_proposal` give identical runs (checked in run_world_sim.py ci).
Use: configure({'source': 'world'|'levels', 'world': dir, 'levels': dir, 'quests': file, 'transform': None|'levels_proposal'}).
"""
import json, collections, os, glob, copy
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.normpath(os.path.join(HERE, '..', '..', '..', '..'))
DATA = os.path.join(REPO, 'docs', 'data')
WORLD_DIR = os.path.join(DATA, 'world'); LEVELS_DIR = os.path.join(DATA, 'levels'); QUESTS_FILE = os.path.join(DATA, 'quests', 'quests.json')
J = lambda p: json.load(open(p, encoding='utf-8'))

RULES = {}; GRAPHS = {}; ZONES = []; QV2 = {}; HOOKS = {}; REALMS = {}; CONFIG = None

def has_levels(d=LEVELS_DIR):
    return any(J(f).get('schema', '').startswith('level/') for f in glob.glob(os.path.join(d, '*.json')))

def _load_world(d):
    idx = J(os.path.join(d, 'index.json'))
    rules = J(os.path.join(d, idx['files']['rules'])); zones = J(os.path.join(d, idx['files']['zones']))['zones']
    graphs = {g['id']: J(os.path.join(d, g['file'])) for g in idx['graphs']}
    qw = idx['files'].get('quests'); hooks = J(os.path.join(d, qw)).get('questHooks', []) if qw else []
    return rules, graphs, zones, hooks

def map_events(m):
    """Runtime event list of a level/0.2 map: its plain events plus the events kept in node quest variants, per node in id order
    (event ids are <node>.<n>; first eligible wins per node, so the per-node order is the data that matters)."""
    evs = list(m.get('events', []))
    for n in m['nodes']:
        for v in n.get('quests', []):
            for part in ('pre', 'in', 'post'):
                evs += (v.get(part) or {}).get('events', [])
    key = lambda e: (e['node'], int(str(e['id']).rsplit('.', 1)[1]) if str(e['id']).rsplit('.', 1)[-1].isdigit() else 0)
    pos = {}
    for e in evs: pos.setdefault(e['node'], len(pos))
    return sorted(evs, key=lambda e: (pos[e['node']], key(e)[1]))

def _cond_open(c, done):
    """Static reading of a link condition for the unlock order: bossDefeated needs that boss map beaten; quest and flag conditions
    count as open (they gate side content, never the main way on)."""
    if not c: return True
    k, v = next(iter(c.items()))
    if k == 'bossDefeated': return v in done
    if k == 'all': return all(_cond_open(x, done) for x in v)
    if k == 'any': return any(_cond_open(x, done) for x in v)
    if k == 'not': return True
    return True

def unlock_order(maps, start):
    """Realm-less progression, read from the links (Jack 2026-10-11: no link conditions on bosses; Jack 2026-10-12: a boss node blocks
    passage). From the start node, walk every edge and link; an unbeaten boss node can be entered (that is the fight) but nothing
    beyond it is reachable through it; beat the nearest reachable boss, repeat. Quest locks (lockedUntilQuest) and quest conditions
    count as open (validate_levels checks every lock's quest is reachable without it).
    -> (boss maps in the order they are beaten, {map id: round in which it first becomes reachable}). Round r = after r bosses.
    The sim plays locations in gearTier order, then this order."""
    adj, boss = _link_graph(maps)
    s0 = f"{start['graph']}/{start['node']}"; done = []; rnd = {}
    for r in range(len(boss) + 1):
        dist = _walk(adj, s0, {u for u, m in boss.items() if m not in done})
        for u in dist: rnd.setdefault(u.split('/')[0], r)
        nxt = sorted((d, boss[u]) for u, d in dist.items() if u in boss and boss[u] not in done)
        if not nxt: break
        done.append(nxt[0][1])
    return done, rnd

def _link_graph(maps):
    """'map/node' adjacency over in-map edges (both ways unless oneway) and cross-map links (as written); {boss 'map/node': map}."""
    adj = collections.defaultdict(list); boss = {}
    for mid, m in maps.items():
        b = (m.get('settings') or {}).get('boss')
        if b: boss[f"{mid}/{b['node']}"] = mid
        for e in m['edges']:
            a = f"{mid}/{e['from']}"
            if isinstance(e['to'], dict): adj[a].append(f"{e['to']['graph']}/{e['to']['node']}"); continue
            bb = f"{mid}/{e['to']}"; adj[a].append(bb)
            if e['kind'] != 'oneway': adj[bb].append(a)
    return adj, boss

def _walk(adj, s0, walls):
    """BFS distances from s0; a wall node (an unbeaten boss) is reached but not passed through (Jack 2026-10-12)."""
    dist = {s0: 0}; q = collections.deque([s0])
    while q:
        u = q.popleft()
        if u in walls and u != s0: continue
        for v in adj[u]:
            if v not in dist: dist[v] = dist[u] + 1; q.append(v)
    return dist

def behind_bosses(maps, start):
    """Jack 2026-10-12 (a boss node blocks passage): {'map/node': set of boss maps that must be beaten to reach it}. A node needs boss B
    when it can't be reached with B's node as a wall (every other boss beaten). Bosses nothing needs are the avoidable ones."""
    adj, boss = _link_graph(maps); s0 = f"{start['graph']}/{start['node']}"
    allr = set(_walk(adj, s0, set())); need = collections.defaultdict(set)
    for u, m in boss.items():
        for v in allr - set(_walk(adj, s0, {u})): need[v].add(m)
    return need

def met_words(maps, start):
    """Proposed met rule without realms: a word is met in map M when it is in the pool of a map that becomes reachable no later than M
    (same or earlier round of unlock_order: an unbeaten boss node blocks passage, Jack 2026-10-12).
    Returns {map id: set of word ids} and the review order of maps."""
    order, rnd = unlock_order(maps, start)
    seq = sorted(rnd, key=lambda m: (rnd[m], m))
    met, acc = {}, set()
    for r in sorted(set(rnd.values())):
        acc |= {w for m in seq if rnd[m] == r for w in (maps[m].get('settings') or {}).get('words', [])}
        for m in seq:
            if rnd[m] == r: met[m] = set(acc)
    return met, seq

def scene_met(maps, start):
    """met(map, trigger cond) -> the words met when a scene in `map` with that trigger condition can first play: the pools of every map
    reachable by then (unlock_order rounds; a boss node blocks passage, Jack 2026-10-12), where the round is the later of the map's own round and the round right after every boss
    the condition names (e.g. a village scene gated on bossDefeated: clover_hills may use clover_hills words)."""
    order, rnd = unlock_order(maps, start)
    def bosses(c):
        if isinstance(c, dict): return [v for k, v in c.items() if k == 'bossDefeated'] + [b for k, v in c.items() if k in ('all', 'any') for x in v for b in bosses(x)]
        return []
    def met(mid, cond=None):
        r = max([rnd.get(mid, 0)] + [order.index(b) + 1 for b in bosses(cond) if b in order])
        return {w for m, rr in rnd.items() if rr <= r for w in (maps[m].get('settings') or {}).get('words', [])}
    return met

def _load_levels(d, world_dir):
    """level/0.2 maps (no realms) -> the sim's world shape. Grouping is read from the data, never from a realm field:
    a location = the maps whose word lists are equal (one boss map each; its id is the location id); the campaign order = unlock_order();
    the sim's segment t (its hero / gear / price model) = the boss map's settings.gearTier, written into graph['realm'] in memory only."""
    rp = os.path.join(d, 'world_rules.json'); rules = J(rp if os.path.exists(rp) else os.path.join(world_dir, 'world_rules.json'))
    maps = {}
    for f in sorted(glob.glob(os.path.join(d, '*.json'))):
        L = J(f)
        if L.get('schema', '').startswith('level/'): maps[L['id']] = L
    ip = os.path.join(d, 'index.json'); start = J(ip)['start'] if os.path.exists(ip) else {'graph': 'realm_1', 'node': 'village'}
    order, rnd = unlock_order(maps, start)
    loc_of_words = {}
    for mid in order:
        loc_of_words.setdefault(tuple(maps[mid]['settings']['words']), mid)
    graphs, zones = {}, []
    for mid, L in maps.items():
        st = L.get('settings') or {}; ws = tuple(st.get('words') or ())
        loc = loc_of_words.get(ws) if ws else None
        assert not ws or loc, f'{mid}: its word pool belongs to no boss map'
        g = {k: v for k, v in L.items() if k not in ('settings', 'schema', 'quests', 'scenes', 'state', 'characters', 'npcs')}
        g['realm'] = maps[loc]['settings']['gearTier'] if loc else None
        g['nodes'] = [dict(n, zone=loc) if loc else dict(n) for n in L['nodes']]
        g['events'] = map_events(L)
        graphs[mid] = g
    for k, mid in enumerate(order):
        st = maps[mid]['settings']; b = st['boss']
        z = dict(id=mid, realm=st['gearTier'], order=k + 1, location=mid, pool=mid, tier=st['gearTier'], words=list(st['words']),
                 bossNode={'graph': mid, 'node': b['node']}, gateEdge={'graph': mid, 'edge': b['gateEdge']}, bossKind=b['kind'], boss=b.get('enemy'))
        if st.get('scriptedElite'): z['scriptedElite'] = st['scriptedElite']
        z['clearFeather'] = (b.get('reward') or {}).get('feather', 0) + sum(a.get('qty', 1) for e in graphs[mid]['events'] if e['node'] == b['node'] and e.get('on') == 'clear'
                                for a in e.get('do', []) if a.get('giveItem') == 'feather')
        zones.append(z)
    quests = {q['id']: q for L in maps.values() for q in L.get('quests', [])}
    return rules, graphs, zones, quests, start

# ---------------- transform: the Director's working defaults for dropping zones (pending Jack) ----------------
def _next_idx(g, key):
    return max([x.get('idx', -1) for x in g[key]] + [-1]) + 1
def _link(frm, to_graph, to_node, kind, eid, idx, cond=None):
    e = dict(id=eid, idx=idx, **{'from': frm}, to={'graph': to_graph, 'node': to_node}, kind=kind)
    if cond: e['cond'] = cond
    return e
def _move_edge_behind_gate(graphs, src, edge_id, dst, gate_id, gate_kind, link_kind):
    """Edge `edge_id` of graph `src` (from node A in src to node B, B now in dst) moves into `dst` as gate_id -> B; A links to gate."""
    S, D = graphs[src], graphs[dst]
    e = next(x for x in S['edges'] if x['id'] == edge_id); S['edges'].remove(e)
    D['nodes'].append(dict(id=gate_id, idx=_next_idx(D, 'nodes'), kind=gate_kind, title={'en': 'Way in', 'zh': '入口'}, x=0.05, y=0.5))
    eid = edge_id if not any(x['id'] == edge_id for x in D['edges']) else edge_id + '_in'
    D['edges'].append(dict({k: v for k, v in e.items() if k not in ('from', 'to', 'idx', 'cond')}, id=eid, idx=_next_idx(D, 'edges'), **{'from': gate_id}, to=e['to']))
    S['edges'].append(_link(e['from'], dst, gate_id, link_kind, f'x_{e["from"]}_{dst}', _next_idx(S, 'edges'), e.get('cond')))
    D['edges'].append(_link(gate_id, src, e['from'], link_kind, f'x_{gate_id}', _next_idx(D, 'edges')))
    return e

def levels_proposal(graphs, zones, index_graphs=None):
    graphs = copy.deepcopy(graphs); zones = copy.deepcopy(zones); log = []
    # 1. realm_1 -> realm_1 + clover_hills + warren
    r1 = graphs.get('realm_1')
    if r1 and len({n.get('zone') for n in r1['nodes']}) == 3:
        zone_of = {n['id']: n['zone'] for n in r1['nodes']}
        for zid in ('clover_hills', 'warren'):
            ns = [n for n in r1['nodes'] if n['zone'] == zid]
            graphs[zid] = dict(id=zid, kind='overworld', realm=1, status=r1.get('status'), title=next((z['title'] for z in zones if z['id'] == zid), {}),
                               nodes=[dict(n, idx=i) for i, n in enumerate(ns)], edges=[], events=[e for e in r1.get('events', []) if zone_of.get(e['node']) == zid])
            r1['events'] = [e for e in r1.get('events', []) if zone_of.get(e['node']) != zid]
        r1['nodes'] = [n for n in r1['nodes'] if n['zone'] == 'meadow']
        border = []
        for e in list(r1['edges']):
            if isinstance(e['to'], dict):
                fz = zone_of[e['from']]
                if fz != 'meadow': r1['edges'].remove(e); graphs[fz]['edges'].append(dict(e, idx=_next_idx(graphs[fz], 'edges')))
                continue
            a, b = zone_of[e['from']], zone_of[e['to']]
            if a == b and a != 'meadow': r1['edges'].remove(e); graphs[a]['edges'].append(dict(e, idx=_next_idx(graphs[a], 'edges')))
            elif a != b: border.append((e['id'], a, b))
        for eid, a, b in border:   # e7: meadow -> clover_hills, e11: clover_hills -> warren
            src = 'realm_1' if a == 'meadow' else a
            if src != 'realm_1':   # the path's start node lives in the split-off level: carry the path there first
                e = next(x for x in r1['edges'] if x['id'] == eid); r1['edges'].remove(e); graphs[src]['edges'].append(dict(e, idx=_next_idx(graphs[src], 'edges')))
            gate = {'clover_hills': 'c_gate', 'warren': 'w_gate'}[b]
            _move_edge_behind_gate(graphs, src, eid, b, gate, 'portal', 'portal')
            log.append(f'realm_1 split: {src}/{eid} -> {b}/{gate} + {eid}')
        for z in zones:
            if z['id'] in ('clover_hills', 'warren'): z['bossNode']['graph'] = z['gateEdge']['graph'] = z['id']
    # 2. the doorway paths: boss -> the next location's portal/stairs node, moved into the next level
    for gid in list(graphs):
        g = graphs[gid]
        c = collections.Counter(n.get('zone') for n in g['nodes'] if n.get('zone'))
        if len(c) != 2: continue
        main = c.most_common(1)[0][0]
        for s in [n for n in g['nodes'] if n.get('zone') and n['zone'] != main]:
            link = next(e for e in g['edges'] if e['from'] == s['id'] and isinstance(e['to'], dict))
            path = next(e for e in g['edges'] if e['to'] == s['id'] and not isinstance(e['to'], dict))
            dst, dnode = link['to']['graph'], link['to']['node']; D = graphs[dst]
            back = next(e for e in D['edges'] if isinstance(e['to'], dict) and e['to'] == {'graph': gid, 'node': s['id']})
            D['edges'].remove(back); g['edges'].remove(link); g['nodes'].remove(s)
            gate_kind = 'portal' if s['kind'] == 'portal' else 'stairs_up'
            path['to'] = dnode   # in the destination level the path ends at the old link target
            _move_edge_behind_gate(graphs, gid, path['id'], dst, 'entry_gate', gate_kind, link['kind'])
            for ev in g.get('events', []):
                if ev['node'] == s['id']: ev['node'] = 'entry_gate'
            D.setdefault('events', []).extend(ev for ev in g.get('events', []) if ev['node'] == 'entry_gate')
            g['events'] = [ev for ev in g.get('events', []) if ev['node'] != 'entry_gate']
            for n in D['nodes']:
                if n['id'] == 'entry_gate': n['zone'] = s['zone']
            log.append(f'doorway: {gid}/{path["id"]} ({path.get("steps")} steps) -> {dst}/entry_gate -> {dnode} (depth {g.get("level", 0)} -> {D.get("level", 0)})')
    for gid, g in graphs.items():   # every node now carries its level's single zone
        zs = {n.get('zone') for n in g['nodes'] if n.get('zone')}
        assert len(zs) <= 1, (gid, zs)
    return graphs, zones, log

# ---------------- configure + the Realm view used by world_sim ----------------
def configure(cfg=None):
    """cfg: None (defaults) or a dict; cached, so repeated calls with the same cfg are free (world_sim calls it per campaign)."""
    global RULES, GRAPHS, ZONES, QV2, HOOKS, REALMS, CONFIG, LOG
    cfg = dict(cfg or {}); key = json.dumps(cfg, sort_keys=True)
    if CONFIG == key: return
    src = cfg.get('source') or ('levels' if has_levels(cfg.get('levels', LEVELS_DIR)) else 'world')
    world_dir = cfg.get('world', WORLD_DIR)
    global START, LQ
    START = None; LQ = None
    if src == 'levels': RULES, GRAPHS, ZONES, LQ, START = _load_levels(cfg.get('levels', LEVELS_DIR), world_dir); hooks = []
    else: RULES, GRAPHS, ZONES, hooks = _load_world(world_dir)
    LOG = []
    if cfg.get('transform') == 'levels_proposal': GRAPHS, ZONES, LOG = levels_proposal(GRAPHS, ZONES)
    elif cfg.get('transform'): raise ValueError(cfg['transform'])
    qf = cfg.get('quests', QUESTS_FILE)
    QV2 = LQ if LQ is not None else ({q['id']: q for q in J(qf)['quests']} if qf and os.path.exists(qf) else {})   # levels: quests live in their giver's map
    HOOKS = {h['id']: h for h in hooks}; REALMS = {}; CONFIG = key
LOG = []; START = None; LQ = None

def rate(d, level):
    return min(RULES['maxRate'], RULES['encounterRate'][str(d)] * (1 + RULES['depthStep']*max(0, level - 1)))

class Realm:
    def __init__(self, t):
        rid = entry_graph(t); self.t = t; self.rid = rid; self.N = {}; self.E = {}; self.adj = collections.defaultdict(list); self.level = {}; self.EV = collections.defaultdict(list)
        todo = [rid]; seen = set(); xlinks = []
        self.locks = {}; self.quest_done = set()   # Jack 2026-10-11: lockedUntilQuest (edge key -> quest id); world_sim sets quest_done = the kid's done quests
        while todo:
            g = GRAPHS[todo.pop()]
            if g['id'] in seen: continue
            seen.add(g['id'])
            for n in g['nodes']:
                k = f"{g['id']}/{n['id']}"; self.N[k] = dict(n, graph=g['id'], key=k); self.level[k] = g.get('level', 0)
            for e in g['edges']:
                a = f"{g['id']}/{e['from']}"
                if e.get('lockedUntilQuest') and not isinstance(e.get('to'), dict): self.locks[f"{g['id']}/{e['id']}"] = e['lockedUntilQuest']
                if isinstance(e.get('to'), dict):
                    tg = GRAPHS.get(e['to']['graph'], {})
                    # stairs/portal links to the other maps of this segment (v3.9.1: the realm's dungeon levels; never the world map)
                    if e['kind'] in ('stairs', 'portal') and tg.get('realm') == t:   # the world map has no word pool, so no tier
                        todo.append(e['to']['graph']); xlinks.append((a, f"{e['to']['graph']}/{e['to']['node']}", e['kind'], e.get('lockedUntilQuest')))
                    continue
                b = f"{g['id']}/{e['to']}"; k = f"{g['id']}/{e['id']}"
                self.E[k] = dict(e, key=k, a=a, b=b, level=g.get('level', 0), graph=g['id']); self.adj[a].append((k, b))
                if e['kind'] != 'oneway': self.adj[b].append((k, a))
            for ev in g.get('events', []): self.EV[f"{g['id']}/{ev['node']}"].append(ev)
        for a, b, kind, lq in xlinks:
            ek = 'link:' + '|'.join(sorted((a, b)))
            if lq: self.locks[ek] = lq
            if ek in self.E or b not in self.N: continue
            self.E[ek] = dict(id=ek, key=ek, a=a, b=b, danger=0, steps=1, kind=kind, level=0, graph=a.split('/')[0]); self.adj[a].append((ek, b)); self.adj[b].append((ek, a))
        self.entry = entry_node(t, rid)
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
            nb, na = self.N.get(e['b']), self.N.get(e['a'])
            e['pool'] = (nb or {}).get('zone') or (na or {}).get('zone')   # engine edgeZone(): the to-node's zone, else the from-node's
        for k, n in self.N.items():   # a locked node: every edge into it is closed until its quest is done
            if n.get('lockedUntilQuest'):
                for ek, _ in self.adj[k]: self.locks[ek] = n['lockedUntilQuest']
        self._path = {}; self._bl = {}
    def closed(self):
        """Jack 2026-10-11: the quest locks still closed (their quest not completed yet). Empty for every converted map."""
        return frozenset(e for e, q in self.locks.items() if q not in self.quest_done) if self.locks else frozenset()
    def blocked(self, zi):
        if zi not in self._bl:
            b = set()   # an undefeated boss (current or later location) blocks every edge through its node; beaten bosses are open
            for z in self.zones[zi:]: b |= {k for k, _ in self.adj[z['boss']]}
            self._bl[zi] = b
        cl = self.closed()
        return self._bl[zi] | cl if cl else self._bl[zi]
    def path(self, a, b, zi):
        key = (a, b, zi, self.closed())
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
def entry_graph(t):
    """The map a segment starts in: world data = realm_<t>; levels = the start map, or the map a link from outside the segment reaches."""
    if START is None: return f'realm_{t}'
    if GRAPHS[START['graph']].get('realm') == t: return START['graph']
    return entry_node(t).split('/')[0]
def entry_node(t, rid=None):
    if START is None: return f"{rid}/{GRAPHS[rid]['entry']}"
    if GRAPHS[START['graph']].get('realm') == t: return f"{START['graph']}/{START['node']}"
    hits = [f"{e['to']['graph']}/{e['to']['node']}" for g in GRAPHS.values() if g.get('realm') != t for e in g['edges']
            if isinstance(e['to'], dict) and GRAPHS.get(e['to']['graph'], {}).get('realm') == t and g.get('realm') is None]   # from the pool-less world map (kind overworld since 2026-10-11)
    assert len(hits) == 1, (t, hits); return hits[0]
def realm(t):
    if t not in REALMS: REALMS[t] = Realm(t)
    return REALMS[t]

# ---------------- engine RNG (src/world/engine.ts: mulberry32(FNV-1a 32 of the key)) ----------------
def fnv1a(s):
    h = 0x811c9dc5
    for ch in s: h ^= ord(ch); h = (h * 0x01000193) & 0xFFFFFFFF
    return h
def _imul(a, b): return ((a & 0xFFFFFFFF) * (b & 0xFFFFFFFF)) & 0xFFFFFFFF
def mulberry32_first(a):
    a = (a + 0x6D2B79F5) & 0xFFFFFFFF
    t = _imul(a ^ (a >> 15), 1 | a)
    t = ((t + _imul(t ^ (t >> 7), 61 | t)) & 0xFFFFFFFF) ^ t
    return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296
def roll(key): return mulberry32_first(fnv1a(key))
