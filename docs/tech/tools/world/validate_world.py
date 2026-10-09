"""v3.9 world data validator: python validate_world.py [data_dir]  -> exit 1 on errors.
Checks: JSON Schema (data/world/schemas), unique ids/idx, edge and event references, two-way stairs/portals, enemy/item/quest/pool refs,
zones (one boss node + one patrol edge each), v2 quests (data/quests.json) and hooks, scene refs (data/dialogue), realm-1 word density D1, speakers,, reachability with one-way edges, inn coverage (<= maxHopsToInn hops), beeline battle budget per zone."""
import json, os, sys, csv, glob, collections
from jsonschema import Draft202012Validator
from referencing import Registry, Resource
ARGS = [a for a in sys.argv[1:] if not a.startswith('-')]
D = ARGS[0] if ARGS else '/workspace/desy/data/world'
DESY = '/workspace/desy/data'; PROTO = '/workspace/chinese-rpg/prototype/src/data'
err = []; warn = []
E = lambda m: err.append(m); W = lambda m: warn.append(m)
J = lambda p: json.load(open(p, encoding='utf-8'))
# ---- schemas
S = {os.path.basename(f).replace('.schema.json', ''): J(f) for f in glob.glob(f'{D}/schemas/*.schema.json')}
reg = Registry().with_resources([(s['$id'], Resource.from_contents(s)) for s in S.values()])
def check(name, doc, label):
    for e in Draft202012Validator(S[name], registry=reg).iter_errors(doc):
        E(f"schema {label}: {'/'.join(map(str, e.absolute_path))}: {e.message[:160]}")
idx = J(f'{D}/index.json'); check('index', idx, 'index.json')
rules = J(f"{D}/{idx['files']['rules']}"); check('world_rules', rules, 'world_rules.json')
zf = J(f"{D}/{idx['files']['zones']}"); check('zones', zf, 'zones.json')
qf = J(f"{D}/{idx['files']['quests']}"); check('quests_world', qf, 'quests_world.json')
G = {}
if os.path.exists(f'{D}/examples/progress_example.json'): check('progress', J(f'{D}/examples/progress_example.json'), 'examples/progress_example.json')
for g in idx['graphs']:
    p = f"{D}/{g['file']}"
    if not os.path.exists(p): E(f"index: missing file {g['file']}"); continue
    G[g['id']] = J(p); check('graph', G[g['id']], g['file'])
    if G[g['id']]['id'] != g['id']: E(f"{g['file']}: id {G[g['id']]['id']} != index id {g['id']}")
listed = {os.path.basename(f)[:-5] for f in glob.glob(f'{D}/graphs/*.json')}
for x in listed - set(G): E(f"graphs/{x}.json is not listed in index.json")
# ---- reference tables
ENEMIES = {r['id'] for r in csv.DictReader(open(f'{DESY}/enemies.csv', encoding='utf-8-sig'))}
POOLS = {r['location_id'] for r in csv.DictReader(open(f'{DESY}/curriculum_locations.csv', encoding='utf-8-sig'))}
ITEMS = {'honey', 'bighoney', 'manatea', 'bigmanatea', 'feather', 'bell'}
if os.path.exists(f'{PROTO}/shop.json'): ITEMS |= {c['id'] for c in J(f'{PROTO}/shop.json')['consumables']}
QITEMS = {q['id']: q for q in qf['questItems']}; HOOKS = {q['id']: q for q in qf['questHooks']}
BOARD = {q['id'] for q in J(f'{PROTO}/quests.json')['quests']} if os.path.exists(f'{PROTO}/quests.json') else set()
ZONES = {z['id']: z for z in zf['zones']}
SPEAKERS = set(qf.get('speakers', {}))
QV2P = os.environ.get('QUESTS_V2', f'{DESY}/quests.json'); DLG = os.environ.get('DIALOGUE_DIR', f'{DESY}/dialogue')
QV2 = {q['id']: q for q in J(QV2P)['quests']} if os.path.exists(QV2P) else {}
BOARD |= set(QV2)
OFFERS = collections.defaultdict(set)   # graph/node -> quest ids offered there
import re as _re
TOK = _re.compile(r'\{C\d{3}\}'); CJK = _re.compile(r'[\u4e00-\u9fff]{2,}')
# ---- per graph
def node_ok(gid, nid): return gid in G and any(n['id'] == nid for n in G[gid]['nodes'])
def conds(c, where):
    if not c: return
    k, v = next(iter(c.items()))
    if k in ('all', 'any'): [conds(x, where) for x in v]
    elif k == 'not': conds(v, where)
    elif k == 'bossDefeated' and v not in ZONES: E(f"{where}: bossDefeated '{v}' is not a zone id")
    elif k in ('questActive', 'questClaimed', 'questDone') and v not in HOOKS and v not in BOARD: E(f"{where}: unknown quest '{v}'")
    elif k == 'hasItem' and v not in ITEMS and v not in QITEMS: E(f"{where}: unknown item '{v}'")
def acts(lst, g, where):
    for a in lst:
        k = next(iter(a)); v = a[k]
        if k == 'dialogue' and v not in g.get('dialogue', {}): E(f"{where}: dialogue '{v}' not in the graph's dialogue map")
        if k == 'offerQuest' and v not in HOOKS and v not in BOARD: E(f"{where}: offerQuest '{v}' unknown")
        if k == 'scene' and not os.path.exists(f"{DLG}/{v}.json"): E(f"{where}: scene '{v}' not in {DLG}")
        if k == 'giveItem' and v not in ITEMS and v not in QITEMS: E(f"{where}: giveItem '{v}' unknown")
        if k == 'giveItem' and v in QITEMS and a.get('quest') and QITEMS[v]['quest'] != a['quest']: E(f"{where}: item {v} belongs to quest {QITEMS[v]['quest']}")
        if k == 'fight':
            for en in v.get('enemies', []):
                if en not in ENEMIES: E(f"{where}: enemy '{en}' not in enemies.csv")
        if k == 'teleport' and not node_ok(v['graph'], v['node']): E(f"{where}: teleport target missing")
XL = []
for gid, g in G.items():
    ids = [n['id'] for n in g['nodes']]; ix = [n['idx'] for n in g['nodes']]
    for x, c in collections.Counter(ids).items():
        if c > 1: E(f"{gid}: duplicate node id {x}")
    for x, c in collections.Counter(ix).items():
        if c > 1: E(f"{gid}: duplicate node idx {x}")
    if ix and max(ix) > g['idxMax']: E(f"{gid}: idx {max(ix)} > idxMax {g['idxMax']}")
    N = {n['id']: n for n in g['nodes']}
    if g['entry'] not in N: E(f"{gid}: entry {g['entry']} missing")
    for x, c in collections.Counter(e['id'] for e in g['edges']).items():
        if c > 1: E(f"{gid}: duplicate edge id {x}")
    for x, c in collections.Counter(e.get('idx') for e in g['edges']).items():
        if c > 1: E(f"{gid}: duplicate edge idx {x}")
    if g['edges'] and max(e.get('idx', 0) for e in g['edges']) > g.get('edgeIdxMax', -1): E(f"{gid}: edge idx > edgeIdxMax")
    for e in g['edges']:
        if e['from'] not in N: E(f"{gid}/{e['id']}: from '{e['from']}' missing")
        if isinstance(e['to'], dict): XL.append((gid, e))
        elif e['to'] not in N: E(f"{gid}/{e['id']}: to '{e['to']}' missing")
        conds(e.get('cond'), f"{gid}/{e['id']}")
        for en in (e.get('scripted') or {}).get('enemies', []):
            if en not in ENEMIES: E(f"{gid}/{e['id']}: scripted enemy '{en}' not in enemies.csv")
    for x, c in collections.Counter(v['id'] for v in g.get('events', [])).items():
        if c > 1: E(f"{gid}: duplicate event id {x}")
    for v in g.get('events', []):
        w = f"{gid}/event {v['id']}"
        if v['node'] not in N: E(f"{w}: node '{v['node']}' missing")
        conds(v.get('cond'), w); acts(v.get('do', []), g, w)
        for a in v.get('do', []) + [a for p in v.get('pick', []) for a in p['do']]:
            if 'offerQuest' in a: OFFERS[f"{gid}/{v['node']}"].add(a['offerQuest'])
        for p in v.get('pick', []): conds(p.get('cond'), w); acts(p['do'], g, w)
    evk = collections.defaultdict(set)
    for v in g.get('events', []):
        for a in v.get('do', []) + [a for p in v.get('pick', []) for a in p['do']]: evk[v['node']].add(next(iter(a)))
    for n in g['nodes']:
        if n['kind'] == 'chest' and 'openChest' not in evk[n['id']] and 'giveItem' not in evk[n['id']]: E(f"{gid}/{n['id']}: chest node without openChest/giveItem event")
        if n['kind'] == 'miniboss' and 'fight' not in evk[n['id']]: E(f"{gid}/{n['id']}: miniboss node without a fight event")
        if n['kind'] in ('npc', 'story') and not evk[n['id']]: W(f"{gid}/{n['id']}: {n['kind']} node has no event")
        if n.get('zone') and n['zone'] not in ZONES: E(f"{gid}/{n['id']}: zone '{n['zone']}' unknown")
        if n['kind'] == 'boss' and n.get('boss') and n['boss'] not in ZONES: E(f"{gid}/{n['id']}: boss zone '{n['boss']}' unknown")
    spk = set(g.get('npcs', {})) | SPEAKERS | {'xiaolong', 'narrator', 'hero'}
    nl = nt = 0
    for did, lines in g.get('dialogue', {}).items():
        for l in lines:
            if l['speaker'] == 'panda': E(f"{gid}: dialogue {did} speaker 'panda' (v3.9: companion is xiaolong; pandas are innkeeper_panda)")
            elif l['speaker'] not in spk: W(f"{gid}: dialogue {did} speaker '{l['speaker']}' not in npcs/speakers")
            ph = TOK.findall(l.get('en', '')); tk = l.get('tokens', [])
            if sorted(p_[1:-1] for p_ in ph) != sorted(tk): E(f"{gid}: dialogue {did}: placeholders {ph} do not match tokens {tk}")
            if g.get('realm') == 1:   # story.md density D1
                nl += 1; nt += bool(tk)
                if len(tk) > 1: E(f"{gid}: dialogue {did}: {len(tk)} word tokens in one line (D1 max 1)")
                if CJK.search(l.get('en', '') + l.get('zh', '')): E(f"{gid}: dialogue {did}: Chinese text in a realm-1 line (D1: English + at most one {{Cxxx}} token)")
    if g.get('realm') == 1 and nt > max(2, 0.3*nl): E(f"{gid}: {nt}/{nl} dialogue lines carry a word token (D1 max 30%)")
# ---- cross-graph links: target exists; stairs/portal between non-world graphs must be two-way
for gid, e in XL:
    t = e['to']
    if not node_ok(t['graph'], t['node']): E(f"{gid}/{e['id']}: target {t['graph']}/{t['node']} missing"); continue
    if e['kind'] in ('stairs', 'portal') and G[gid]['kind'] != 'world' and G[t['graph']]['kind'] != 'world':
        back = [x for x in G[t['graph']]['edges'] if isinstance(x['to'], dict) and x['from'] == t['node'] and x['to'] == {"graph": gid, "node": e['from']}]
        if not back: E(f"{gid}/{e['id']}: {e['kind']} to {t['graph']}/{t['node']} has no matching way back")
# ---- zones
bossnodes = collections.Counter()
for z in zf['zones']:
    w = f"zone {z['id']}"
    b = z['bossNode']; ge = z['gateEdge']
    if z['desyPool'] not in POOLS: E(f"{w}: desyPool {z['desyPool']} not in curriculum_locations.csv")
    if z['boss'] not in ENEMIES: E(f"{w}: boss '{z['boss']}' not in enemies.csv")
    for r in z.get('roster', []):
        if r['enemy'] not in ENEMIES: E(f"{w}: roster enemy '{r['enemy']}' not in enemies.csv")
    for k in ('elite', 'scriptedElite'):
        if isinstance(z.get(k), str) and z[k] not in ENEMIES: E(f"{w}: {k} '{z[k]}' not in enemies.csv")
    if z.get('fromRoster') and z['fromRoster']['location'] not in POOLS: E(f"{w}: fromRoster location unknown")
    for u in z['unlockRequires']:
        if u not in ZONES: E(f"{w}: unlockRequires '{u}' unknown")
    if not node_ok(b['graph'], b['node']): E(f"{w}: bossNode missing"); continue
    bn = next(n for n in G[b['graph']]['nodes'] if n['id'] == b['node'])
    if bn['kind'] != 'boss': E(f"{w}: bossNode kind is {bn['kind']}")
    bossnodes[(b['graph'], b['node'])] += 1
    ed = [x for x in G.get(ge['graph'], {}).get('edges', []) if x['id'] == ge['edge']]
    if not ed: E(f"{w}: gateEdge missing"); continue
    ed = ed[0]
    if not ed.get('patrol'): E(f"{w}: gateEdge {ge['edge']} lacks patrol: true")
    if ge['graph'] != b['graph'] or b['node'] not in (ed['from'], ed['to']): E(f"{w}: gateEdge does not touch the boss node")
    pe = [x for x in G[b['graph']]['edges'] if x.get('patrol') and b['node'] in (x['from'], x['to'])]
    if len(pe) != 1: E(f"{w}: boss node has {len(pe)} patrol edges (want 1)")
for k, c in bossnodes.items():
    if c > 1: E(f"boss node {k} used by {c} zones")
for gid, g in G.items():
    for n in g['nodes']:
        if n['kind'] == 'boss' and bossnodes[(gid, n['id'])] == 0: E(f"{gid}/{n['id']}: boss node not used by any zone")
# ---- realm-level graph checks (merged realm incl. dungeon levels)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
stats = {}
schema_or_ref_errors = [m for m in err if 'missing' in m or m.startswith('schema')]
if not schema_or_ref_errors:
    os.environ['WORLD_DATA'] = D
    import world_graph as WG
    for t in range(1, 10):
        if f'realm_{t}' not in G: continue
        T = WG.Realm(t); stats[t] = T.stats()
        # reachability ignoring conditions (undirected for two-way edges)
        seen = {T.entry}; q = [T.entry]
        while q:
            u = q.pop()
            for e, v in T.adj[u]:
                if v not in seen: seen.add(v); q.append(v)
        for k in T.N:
            if k not in seen: E(f"realm {t}: node {k} unreachable from {T.entry}")
        # no traps: from every node an inn/town is reachable (respects one-way edges)
        rev = collections.defaultdict(list)
        for u, lst in T.adj.items():
            for e, v in lst: rev[v].append(u)
        ok = set(T.inns) | set(T.towns); q = list(ok)
        while q:
            v = q.pop()
            for u in rev[v]:
                if u not in ok: ok.add(u); q.append(u)
        for k in T.N:
            if k not in ok: E(f"realm {t}: node {k} cannot get back to any inn (one-way trap)")
        # inn coverage
        dist = {k: 0 for k in set(T.inns) | set(T.towns)}; q = collections.deque(dist)
        while q:   # 0-1 BFS: stairs/portal links cost 0 hops (both ends are the same spot)
            u = q.popleft()
            for e, v in T.adj[u]:
                w = 0 if T.E[e]['kind'] in ('stairs', 'portal') else 1
                if dist[u] + w < dist.get(v, 99):
                    dist[v] = dist[u] + w; q.appendleft(v) if w == 0 else q.append(v)
        mh = rules['maxHopsToInn']; mh = mh.get(str(t), mh['default']) if isinstance(mh, dict) else mh
        far = [k for k in T.N if dist.get(k, 99) > mh and T.N[k]['kind'] != 'boss']
        for k in far: E(f"realm {t}: {k} is {dist.get(k)} hops from the nearest inn (max {mh})")
        # town density (world_rules.townDensity)
        # v3.9.1: max(1, ceil(nodes / (20 + 5(t-1)))) exactly (a settlement serves at most 20, 25 ... 60 nodes)
        want = max(1, -(-len(T.N) // (20 + 5*(t - 1)))); have = len(T.towns)
        if have < want: E(f"realm {t}: {have} towns/villages, density rule wants {want}")
        elif have > want + 1: E(f"realm {t}: {have} towns/villages, density rule wants {want}")
        elif have != want: W(f"realm {t}: {have} towns/villages, density rule wants {want}")
        stats[t]['nodes_per_settlement'] = round(len(T.N)/max(1, have), 1)
        rbf = rules.get('realmBossFeather', {})
        if t in rbf.get('realms', []):
            rb = next((z for z in zf['zones'] if z['realm'] == t and z['bossKind'] == 'realmboss'), None)
            if rb:
                bg, bn = rb['bossNode']['graph'], rb['bossNode']['node']
                if not any(v['node'] == bn and v.get('on') == 'clear' and any(a.get('giveItem') == 'feather' for a in v.get('do', [])) for v in G[bg].get('events', [])):
                    E(f"realm {t}: realm boss {bg}/{bn} has no clear event giving a Return Feather (world_rules.realmBossFeather)")
        stats[t]['towns_villages'] = have
        stats[t]['max_hops_to_inn'] = max(dist.get(k, 99) for k in T.N)
        # beeline battle budget per zone (expected random battles on the shortest route from the previous boss to the approach node)
        pos = T.entry; lo, hi = rules['beelineBattleRange']; zb = []
        for zi, z in enumerate(T.zones):
            p = T.path(pos, z['approach'], zi)
            if p is None: E(f"realm {t}: zone {z['id']} approach unreachable"); continue
            ex = sum(T.E[e]['p']*T.E[e]['steps'] for e, _ in p); zb.append(round(ex, 2))
            if not lo <= ex <= hi: E(f"realm {t}: zone {z['id']} beeline expects {ex:.2f} battles (range {lo}-{hi})")
            pos = z['boss']
        stats[t]['beeline_expected'] = zb
# ---- v3.9 hooks <-> data/quests.json
for h in HOOKS.values():
    gg, nn = h['giver'].split('/')
    if not node_ok(gg, nn): E(f"hook {h['id']}: giver {h['giver']} missing"); continue
    if h['status'] == 'quest':
        if not h['quests']: E(f"hook {h['id']}: status quest without quests")
        for q in h['quests']:
            if q not in BOARD: E(f"hook {h['id']}: quest {q} not in data/quests.json")
        for q in h.get('offers', []):
            if q not in OFFERS[h['giver']]: E(f"hook {h['id']}: {h['giver']} has no offerQuest {q}")
    elif h['quests']: E(f"hook {h['id']}: ambient hook lists quests")
for q in QV2.values():
    if q.get('hook') and q['hook'] not in HOOKS: E(f"quest {q['id']}: hook {q['hook']} not in quests_world.json")
    for w in [q.get('giver') or {}] + [o.get('where') or {} for o in q.get('objectives', [])]:
        r = w.get('ref') or (f"{w['graph']}/{w['node']}" if w.get('graph') and w.get('node') else None)
        if not r: continue
        if '/' in r and not node_ok(*r.split('/', 1)): E(f"quest {q['id']}: node {r} missing")
        elif '/' not in r and r not in G: E(f"quest {q['id']}: graph {r} missing")
    gr = (q.get('giver') or {}).get('ref')
    if gr and '/' in gr and q['id'] not in OFFERS[gr]: E(f"quest {q['id']}: giver node {gr} has no offerQuest {q['id']}")
stats_h = collections.Counter(h['status'] for h in HOOKS.values())
if '-v' in sys.argv: print('hooks', dict(stats_h), 'v2 quests', len(QV2))
print(json.dumps({'graphs': len(G), 'zones': len(ZONES), 'hooks': dict(stats_h), 'errors': len(err), 'warnings': len(warn)}))
for m in err[:60]: print('ERROR', m)
for m in warn[:20]: print('WARN', m)
if stats and '-v' in sys.argv:
    for t, s in stats.items(): print(t, s)
sys.exit(1 if err else 0)
