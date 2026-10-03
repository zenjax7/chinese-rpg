"""Generates reference realm graphs for realms 2-9 (and their dungeon levels) from per-realm layout targets (LAYOUT below,
also written to data/world/layout_targets.json). Realm 1 is hand-authored (make_world_data.py). The generated graphs are
reference layouts for the sim and for level designers to replace with authored maps; they follow every validator rule.
Run after make_world_data.py:  /workspace/desy/.venv/bin/python world_gen.py"""
import json, os, random, csv, re, collections
OUT = '/workspace/desy/data/world'; VERSION = 'v3.8'
RULES = json.load(open(f'{OUT}/world_rules.json'))
def dump(path, obj):
    p = os.path.join(OUT, path); os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w', encoding='utf-8') as f: json.dump(obj, f, ensure_ascii=False, indent=1); f.write('\n')
# ---- layout targets per realm: nodes = realm graph + its dungeon levels (town interiors not counted)
LAYOUT = {
 2: dict(nodes=25,  towns=1, minis=1, loop=0.25, dungeons=[dict(id='great_hive', name='Great Hive', zh='大蜂巢', levels=1, zones=[[2]], innLevels=[])]),
 3: dict(nodes=40,  towns=2, minis=2, loop=0.25, dungeons=[dict(id='bazaar_cellars', name='Bazaar Cellars', zh='夜市地窖', levels=1, zones=[[2]], innLevels=[])]),
 4: dict(nodes=60,  towns=2, minis=3, loop=0.3,  dungeons=[dict(id='goblin_caves', name='Goblin Caves', zh='哥布林洞穴', levels=3, zones=[[1], [2], [3]], innLevels=[2])]),
 5: dict(nodes=80,  towns=2, minis=3, loop=0.3,  dungeons=[dict(id='hydra_lair', name="Hydra's Lair", zh='九头蛇巢穴', levels=2, zones=[[2], [2]], innLevels=[1])]),
 6: dict(nodes=105, towns=3, minis=4, loop=0.3,  dungeons=[dict(id='moonlit_crypt', name='Moonlit Crypt', zh='月光地穴', levels=2, zones=[[2], [2]], innLevels=[1]),
                                                     dict(id='old_mine', name='Old Mine (optional)', zh='旧矿洞', levels=1, zones=[[]], innLevels=[], optional=True)]),
 7: dict(nodes=130, towns=3, minis=4, loop=0.3,  dungeons=[dict(id='griffin_spire', name='Griffin Spire', zh='狮鹫塔', levels=3, zones=[[2], [2], [2]], innLevels=[2]),
                                                     dict(id='cloud_caves', name='Cloud Caves (optional)', zh='云洞', levels=1, zones=[[]], innLevels=[], optional=True)]),
 8: dict(nodes=165, towns=4, minis=5, loop=0.3,  dungeons=[dict(id='undercroft', name='Colosseum Undercroft', zh='角斗场地下', levels=3, zones=[[2], [2], [2]], innLevels=[2]),
                                                     dict(id='beast_pens', name='Beast Pens (optional)', zh='兽栏', levels=2, zones=[[], []], innLevels=[1], optional=True)]),
 9: dict(nodes=200, towns=4, minis=6, loop=0.3,  dungeons=[dict(id='demon_castle', name="Demon King's Castle", zh='魔王城', levels=5, zones=[[1], [1], [2], [2], [2]], innLevels=[2, 4]),
                                                     dict(id='shadow_vault', name='Shadow Vault (optional)', zh='暗影宝库', levels=2, zones=[[], []], innLevels=[1], optional=True)]),
}
TOWNS = json.load(open('/workspace/chinese-rpg/prototype/src/data/towns.json'))['towns']
LOCROWS = list(csv.DictReader(open('/workspace/desy/data/realm_location_difficulty.csv', encoding='utf-8-sig')))
ENEM = {r['id']: r for r in csv.DictReader(open('/workspace/desy/data/enemies.csv', encoding='utf-8-sig'))}
PROTO = {}   # v3.8: data uses desy enemy ids everywhere (build_data maps them to prototype ids via desyId)
slug = lambda s: re.sub(r'[^a-z0-9]+', '_', s.lower()).strip('_')
PATH = [{"pick": [{"event": "nothing", "weight": 70}, {"event": "ambient", "weight": 15}, {"event": "find_honey", "weight": 15}]}]
END_W = [('treasure', 32), ('story', 20), ('npc', 13), ('deadend', 15), ('miniboss', 12), ('inn', 4)]
EVG, HOOKS = [], []
def rate(d, level): return min(RULES['maxRate'], RULES['encounterRate'][str(d)] * (1 + RULES['depthStep']*max(0, level - 1)))

def gen(t):
    rng = random.Random(4100 + t); spec = LAYOUT[t]
    rid = f'realm_{t}'; town = TOWNS[t-1]
    G = {rid: dict(id=rid, kind='realm', version=VERSION, name=None, zh=None, tier=t, level=0, entry='entry_town', status='reference', nodes=[], edges=[], zones=[])}
    lv_of = {rid: 0}
    for d in spec['dungeons']:
        for k in range(1, d['levels'] + 1):
            gid = f"{d['id']}_{k}"; lv_of[gid] = k
            G[gid] = dict(id=gid, kind='dungeon', version=VERSION, name=f"{d['name']} - level {k}", zh=f"{d['zh']} 第{k}层", tier=t, level=k,
                          dungeon=dict(id=d['id'], level=k, levels=d['levels'], optional=bool(d.get('optional'))), parent=rid, status='reference', nodes=[], edges=[])
    cnt = collections.Counter(); NODE = {}
    def node(gid, kind, zone, name, zh, **kw):
        cnt[(gid, kind)] += 1; nid = f"{kind}_{cnt[(gid, kind)]}" if kind not in ('town',) or cnt[(gid, kind)] > 1 or gid != rid else 'entry_town'
        n = dict(id=nid, kind=kind, name=name, zh=zh, x=0, y=0, zone=zone); n.update(kw); G[gid]['nodes'].append(n); NODE[(gid, nid)] = n; return (gid, nid)
    ecnt = collections.Counter()
    def edge(a, b, danger, steps=1, kind='grass', **kw):
        assert a[0] == b[0]; gid = a[0]; ecnt[gid] += 1
        e = dict(id=f"e{ecnt[gid]}", **{'from': a[1], 'to': b[1]}, danger=danger, steps=steps, kind=kind); e.update(kw); G[gid]['edges'].append(e); return e
    def portal(a, b, kind='stairs'):
        NODE[a]['portal'] = {"toGraph": b[0], "toNode": b[1]}; NODE[b]['portal'] = {"toGraph": a[0], "toNode": a[1]}
    rows = [r for r in LOCROWS if r['realm_no'] == str(t)]
    realm_name = rows[0]['realm']; G[rid]['name'] = realm_name
    zh_realm = {2: '蜂巢森林', 3: '十字路口集市', 4: '哥布林洞穴', 5: '九头蛇沼泽', 6: '僵尸之地', 7: '狮鹫山峰', 8: '食人魔角斗场', 9: '魔王城'}[t]; G[rid]['zh'] = zh_realm
    zone_graphs = {}
    for d in spec['dungeons']:
        for k, zs in enumerate(d['zones'], 1):
            for z in zs: zone_graphs.setdefault(z, []).append(f"{d['id']}_{k}")
    start = node(rid, 'town', None, town['en'], town['zh'], town=t, services=["inn", "save", "shop"], portal={"toGraph": f"village_{t}", "toNode": "square"} if t == 2 else None)
    if NODE[start].get('portal') is None: NODE[start].pop('portal')
    spine_nodes = []; zones = []; cur = start
    k_spine = max(3, min(8, round(spec['nodes']*0.15/len(rows))))
    for zi, r in enumerate(rows, 1):
        zid = 'forest' if r['location_id'] == 'L2.1' else slug(r['location_name'])
        if zi == 1: NODE[start]['zone'] = zid
        gl = zone_graphs.get(zi, [rid])
        boss_id = r['boss_id']; bossk = 'realmboss' if r['boss_type'] == 'realm' else 'locboss'
        per = [k_spine // len(gl) + (1 if j < k_spine % len(gl) else 0) for j in range(len(gl))]
        zspine = []
        for j, gid in enumerate(gl):
            if cur[0] != gid:      # enter the next graph: dungeon door / stairs
                door = node(cur[0], 'portal' if lv_of[cur[0]] == 0 else 'stairs', zid, 'Dungeon door' if lv_of[cur[0]] == 0 else 'Stairs down', '地牢入口' if lv_of[cur[0]] == 0 else '下楼梯')
                edge(cur, door, 2 if NODE[cur]['kind'] != 'boss' else 2, 1, kind='grass' if lv_of[cur[0]] == 0 else 'tunnel'); zspine.append(door)
                arr = node(gid, 'stairs', zid, 'Stairs up' if lv_of[gid] > 1 else 'Dungeon mouth', '上楼梯' if lv_of[gid] > 1 else '地牢口'); portal(door, arr); cur = arr; zspine.append(arr)
            n_here = per[j]; mid = n_here >= 3 and (lv_of[gid] in next((d['innLevels'] for d in spec['dungeons'] if gid.startswith(d['id'])), []) or (lv_of[gid] == 0 and n_here >= 4))
            for k in range(n_here):
                kind = 'campfire' if (mid and k == n_here // 2) else 'path'
                nn = node(gid, kind, zid, 'Midpoint campfire inn' if kind == 'campfire' else f"{r['location_name']} path", '半路营火' if kind == 'campfire' else '小路',
                          services=["inn", "save", "practice", "potions"] if kind == 'campfire' else None)
                if NODE[nn].get('services') is None: NODE[nn].pop('services')
                edge(cur, nn, 2, 1, kind='grass' if lv_of[gid] == 0 else 'tunnel'); cur = nn; zspine.append(nn)
        appr = node(cur[0], 'inn', zid, 'Boss-approach inn', '营地客栈', services=["inn", "save", "practice", "potions"])
        edge(cur, appr, 2, 1, kind='grass' if lv_of[cur[0]] == 0 else 'tunnel'); zspine.append(appr)
        en = ENEM[boss_id]
        boss = node(cur[0], 'boss', zid, en['name_en'], en['name_zh'], boss={"enemy": PROTO.get(boss_id, boss_id), "kind": bossk, "reward": "locations.json bossReward", "setFlags": [f"{zid}.bossDefeated"]})
        if bossk == 'realmboss':      # rename the realm boss node so world.json can point at it
            G[boss[0]]['nodes'][-1]['id'] = f'boss_{t}'; NODE[(boss[0], f'boss_{t}')] = NODE.pop(boss); boss = (boss[0], f'boss_{t}')
        ge = edge(appr, boss, 0, 1, kind='gate', patrolGate=True)
        z = {"id": zid, "order": zi, "location": zid, "desyPool": r['location_id'], "pool": zid, "boss": f"{boss[0]}/{boss[1]}", "bossKind": bossk, "enemy": PROTO.get(boss_id, boss_id),
             "gateEdge": f"{boss[0]}/{ge['id']}", "encounterTable": zid}
        if zi > 1: z["requires"] = [{"bossDefeated": zones[-1]['boss']}]
        if r['scripted_elite_id']: z["scriptedElite"] = PROTO.get(r['scripted_elite_id'], r['scripted_elite_id'])
        zones.append(z); spine_nodes += zspine; cur = boss
        enc = {"id": zid, "tier": t, "enemiesPerBattle": [int(x) for x in r['enemies_per_fight'].replace('–', '-').split('-')] * (1 if '–' in r['enemies_per_fight'] else 2)}
        if t == 2: enc["roster"] = [{"enemy": PROTO.get(e, e), "weight": 1} for e in r['normal_enemy_ids'].split(';')]
        else: enc["fromRoster"] = {"location": r['location_id']}
        el = r['scripted_elite_id'] or next((e['id'] for e in ENEM.values() if e['role'] == 'elite' and e['realm'] == str(t)), None)
        enc["elite"] = PROTO.get(el, el); ENCG.append(enc)
    G[rid]['zones'] = zones
    # optional dungeons hang off the overworld spine
    for d in spec['dungeons']:
        if not d.get('optional'): continue
        att = rng.choice([n for n in spine_nodes if n[0] == rid and NODE[n]['kind'] == 'path'] or [start])
        door = node(rid, 'portal', NODE[att]['zone'], f"{d['name']} door", d['zh']); edge(att, door, 1, 1)
        prev = door
        for k in range(1, d['levels'] + 1):
            gid = f"{d['id']}_{k}"; arr = node(gid, 'stairs', NODE[att]['zone'], 'Stairs' if k > 1 else 'Entrance', '楼梯'); portal(prev, arr)
            p = node(gid, 'path', NODE[att]['zone'], 'Dark hall', '暗厅'); edge(arr, p, 2, 1, kind='tunnel'); spine_nodes += [arr, p]
            if k in d['innLevels']:
                inn = node(gid, 'inn', NODE[att]['zone'], 'Deep inn', '地下客栈', services=["inn", "save", "potions"]); edge(p, inn, 2, 1, kind='tunnel'); spine_nodes.append(inn)
            if k < d['levels']: prev = node(gid, 'stairs', NODE[att]['zone'], 'Stairs down', '下楼梯'); edge(p, prev, 2, 1, kind='tunnel')
            else:
                vault = node(gid, 'treasure', NODE[att]['zone'], 'Vault', '宝库'); edge(p, vault, 2, 2, kind='tunnel'); spine_nodes.append(vault)
    # extra towns: overworld branch ends
    total = lambda: sum(len(g['nodes']) for g in G.values())
    ow = [n for n in spine_nodes if n[0] == rid and NODE[n]['kind'] in ('path', 'boss') ]
    if not ow: ow = [start]
    for k in range(spec['towns'] - 1):
        att = ow[min(len(ow)-1, (k+1)*len(ow)//spec['towns'])]
        if NODE[att]['kind'] == 'boss': att = ow[max(0, ow.index(att)-1)]
        a2 = node(rid, 'path', NODE[att]['zone'], 'Side road', '小路'); edge(att, a2, 1, 1)
        tw = node(rid, 'town', NODE[att]['zone'], f"{town['en']} outpost {k+1}", f"{town['zh']}分站", services=["inn", "save", "shop"], village={"shops": ["items"], "note": "small village: inn + item shop"})
        edge(a2, tw, 1, 1, kind='road')
    # branches until the node target is reached
    minis = 0; graphs_w = [g for g in G if G[g]['nodes']]
    while total() < spec['nodes']:
        gid = rng.choices(graphs_w, weights=[len(G[g]['nodes']) for g in graphs_w])[0]
        cands = [(gid, n['id']) for n in G[gid]['nodes'] if n['kind'] in ('path', 'crossroads', 'campfire', 'inn', 'treasure', 'story', 'npc', 'deadend') and n['kind'] != 'boss'
                 and not any(e.get('patrolGate') and e['from'] == n['id'] for e in G[gid]['edges'])]
        att = rng.choice(cands); zid = NODE[att]['zone']; lv = lv_of[gid]
        L = 1
        while L < 5 and rng.random() < 0.45: L += 1
        L = min(L, spec['nodes'] - total())
        prev = att
        if NODE[att]['kind'] == 'path' and sum(1 for e in G[gid]['edges'] if att[1] in (e['from'], e['to'])) >= 3: NODE[att]['kind'] = 'crossroads'
        for k in range(L):
            last = k == L - 1
            if last:
                kinds = [(kk, w) for kk, w in END_W if not (kk == 'miniboss' and minis >= spec['minis'])]
                kind = rng.choices([k_ for k_, _ in kinds], weights=[w for _, w in kinds])[0]
            else: kind = 'path'
            nm = {'path': 'Winding path', 'treasure': 'Treasure spot', 'story': 'Story spot', 'npc': 'Traveller', 'deadend': 'Dead end', 'miniboss': 'Mini-boss lair', 'inn': 'Hidden inn'}[kind]
            zh = {'path': '弯路', 'treasure': '宝藏', 'story': '故事点', 'npc': '旅人', 'deadend': '死胡同', 'miniboss': '小头目', 'inn': '隐藏客栈'}[kind]
            nn = node(gid, kind, zid, nm, zh, services=["inn", "save", "potions"] if kind == 'inn' else None)
            if NODE[nn].get('services') is None: NODE[nn].pop('services')
            edge(prev, nn, 2 if kind == 'miniboss' else 1, 2 if (k == 0 and L >= 3) else 1, kind='grass' if lv == 0 else 'tunnel'); prev = nn
            if kind == 'miniboss': minis += 1
        if L >= 2 and rng.random() < spec['loop']:        # loop back to a node of the same zone and graph (never the boss)
            back = [(gid, n['id']) for n in G[gid]['nodes'] if n.get('zone') == zid and n['kind'] in ('path', 'crossroads') and (gid, n['id']) not in (prev, att)]
            if back and NODE[prev]['kind'] not in ('miniboss', 'treasure'): edge(prev, rng.choice(back), 1, 1, note='loop')
    for n in [n for n in NODE.values() if n['kind'] == 'deadend']:     # top up mini-bosses from dead ends
        if minis >= spec['minis']: break
        n['kind'] = 'miniboss'; n['name'] = 'Mini-boss lair'; n['zh'] = '小头目'; minis += 1
    # inn coverage: no node more than maxHopsToInn hops from an inn or town (portals/stairs count as 0 hops)
    def adjm():
        A = collections.defaultdict(set)
        for g in G.values():
            for e in g['edges']: A[(g['id'], e['from'])].add(((g['id'], e['to']), 1)); A[(g['id'], e['to'])].add(((g['id'], e['from']), 1))
        for k_, n in NODE.items():
            if n.get('portal') and (n['portal']['toGraph'], n['portal']['toNode']) in NODE: A[k_].add(((n['portal']['toGraph'], n['portal']['toNode']), 0))
        return A
    for _ in range(50):
        A = adjm(); src = [k_ for k_, n in NODE.items() if 'inn' in n.get('services', [])]
        dist = {s: 0 for s in src}; dq = collections.deque(src)
        while dq:
            u = dq.popleft()
            for v, w in A[u]:
                if v not in dist or dist[u] + w < dist[v]: dist[v] = dist[u] + w; dq.append(v)
        far = [k_ for k_ in NODE if dist.get(k_, 99) > RULES['maxHopsToInn']]
        if not far: break
        f = max(far, key=lambda k_: dist.get(k_, 99))
        # walk 2 hops back toward an inn and turn a plain node there into a campfire inn
        cand = [f] + [v for v, _ in A[f]]
        c = next((x for x in cand if NODE[x]['kind'] in ('path', 'deadend', 'crossroads')), None)
        if c is None: c = f
        NODE[c]['kind'] = 'campfire'; NODE[c]['name'] = 'Campfire inn'; NODE[c]['zh'] = '营火'; NODE[c]['services'] = ["inn", "save", "potions"]
    # events
    for (gid, nid), n in NODE.items():
        k = n['kind']
        if k in ('path', 'crossroads'): n['onArrive'] = PATH
        elif k == 'treasure': n['onArrive'] = [{"event": 'chest_fine' if lv_of[gid] >= 2 else 'chest_normal'}, {"event": "nothing"}]
        elif k in ('story', 'deadend', 'npc', 'miniboss'):
            eid = f"{gid}.{nid}"
            if k == 'story': EVG.append({"id": eid, "type": "story", "repeat": {"mode": "once"}, "lines": [{"speaker": "panda", "zh": "（故事待写）", "en": "(story beat to write)"}]}); n['onArrive'] = [{"event": eid}]
            elif k == 'deadend': n['onArrive'] = [{"pick": [{"event": "nothing", "weight": 80}, {"event": "find_honey", "weight": 20}]}]
            elif k == 'npc':
                q = f"q{t}_{gid}_{nid}"; HOOKS.append({"id": q, "status": "hook", "type": "fetch", "titleZh": "（任务待写）", "titleEn": "(quest to write)", "giver": f"{gid}/{nid}", "target": {"item": None, "n": 1}, "turnIn": f"{gid}/{nid}", "rewardG": 2, "rewardItem": None})
                EVG.append({"id": eid, "type": "quest_offer", "repeat": {"mode": "once"}, "quest": q, "npc": "traveller"}); n['onArrive'] = [{"event": eid}, {"event": "ambient"}]
            else:
                el = next(e['id'] for e in ENEM.values() if e['role'] == 'elite' and e['realm'] == str(t))
                EVG.append({"id": eid, "type": "miniboss", "repeat": {"mode": "once"}, "enemies": [PROTO.get(el, el)], "reward": {"goldG": 2, "item": "honey"}, "setFlags": [f"{eid}.beaten"]}); n['onArrive'] = [{"event": eid}, {"event": "nothing"}]
    # beeline step sizing: per zone, battle edges on the shortest path (zone start -> approach inn) share ~beelineBattleTarget rolls
    return G, zones, NODE, lv_of, start

def size_steps(G, zones, NODE, lv_of, start):
    adj = collections.defaultdict(list); E = {}
    for g in G.values():
        for e in g['edges']:
            a, b = (g['id'], e['from']), (g['id'], e['to']); E[(g['id'], e['id'])] = e
            adj[a].append(((g['id'], e['id']), b)); adj[b].append(((g['id'], e['id']), a))
    for k_, n in NODE.items():
        if n.get('portal') and (n['portal']['toGraph'], n['portal']['toNode']) in NODE: adj[k_].append((None, (n['portal']['toGraph'], n['portal']['toNode'])))
    def bfs(a, b, block):
        prev = {a: None}; dq = collections.deque([a])
        while dq:
            u = dq.popleft()
            if u == b: break
            for e, v in adj[u]:
                if v in prev or (e and E[e].get('patrolGate')) or (e and e in block): continue
                prev[v] = (u, e); dq.append(v)
        out = []; v = b
        while prev[v]: u, e = prev[v]; out.append(e); v = u
        return out[::-1]
    is_safe_node = lambda k_: 'inn' in NODE[k_].get('services', []) or NODE[k_]['kind'] == 'town'
    cur = start; res = []
    for z in zones:
        bg, bn = z['boss'].split('/'); ge = E[tuple(z['gateEdge'].split('/'))]; appr = (bg, ge['from'])
        path = bfs(cur, appr, set())
        battle = []
        for e in path:
            if e is None: continue
            ed = E[e]; a, b = (e[0], ed['from']), (e[0], ed['to'])
            if ed['danger'] == 0 or is_safe_node(a) or is_safe_node(b): continue
            battle.append(e)
        target = RULES['beelineBattleTarget'] - (1 if z.get('scriptedElite') else 0)
        for e in battle: E[e]['steps'] = 1
        ps = [rate(E[e]['danger'], lv_of[e[0]]) for e in battle]
        for _ in range(60):
            exp = sum(p*E[e]['steps'] for e, p in zip(battle, ps))
            if exp >= target - 0.4: break
            j = min(range(len(battle)), key=lambda i: E[battle[i]]['steps'])
            if E[battle[j]]['steps'] >= 6: break
            E[battle[j]]['steps'] += 1
        if z.get('scriptedElite') and battle: E[battle[0]]['scripted'] = {"enemies": [z['scriptedElite']], "fill": True, "once": True, "step": 1}
        res.append((z['id'], len(battle), round(sum(p*E[e]['steps'] for e, p in zip(battle, ps)) + (1 if z.get('scriptedElite') else 0), 2)))
        cur = (bg, bn)
    return res

def layout(G, NODE):
    """Rough frame coordinates (1280x720) for each graph: BFS layers left to right from the entry."""
    for g in G.values():
        ids = [n['id'] for n in g['nodes']]; A = collections.defaultdict(list)
        for e in g['edges']: A[e['from']].append(e['to']); A[e['to']].append(e['from'])
        root = g.get('entry') or next((n['id'] for n in g['nodes'] if n['kind'] == 'stairs' and n['name'] in ('Stairs up', 'Dungeon mouth', 'Entrance')), ids[0])
        g['entry'] = root
        depth = {root: 0}; dq = collections.deque([root])
        while dq:
            u = dq.popleft()
            for v in A[u]:
                if v not in depth: depth[v] = depth[u] + 1; dq.append(v)
        for i in ids: depth.setdefault(i, max(depth.values()) + 1)
        layers = collections.defaultdict(list)
        for i in ids: layers[depth[i]].append(i)
        D = max(layers) or 1
        for d, L in layers.items():
            for j, i in enumerate(L):
                n = next(x for x in g['nodes'] if x['id'] == i); n['x'] = round(60 + 1160*d/D); n['y'] = round(360 + (j - (len(L)-1)/2) * min(110, 640/max(1, len(L))))

ENCG = []
def main():
    import v03, make_world_data as MW
    EVS = {e['id']: e for e in MW.EV}
    world = json.load(open(f'{OUT}/graphs/world.json'))
    zfile = json.load(open(f'{OUT}/zones.json')); qfile = json.load(open(f'{OUT}/quests_world.json'))
    zfile['zones'] = [z for z in zfile['zones'] if z['realm'] == 1]
    qfile['questHooks'] = [q for q in qfile['questHooks'] if q['id'].startswith('q1_')]
    for f in os.listdir(f'{OUT}/graphs'):
        if f not in ('realm_1.json', 'world.json'): os.remove(f'{OUT}/graphs/{f}')
    stats = {}
    for t in range(2, 10):
        EVG.clear(); ENCG.clear(); h0 = len(HOOKS)
        G, zones, NODE, lv_of, start = gen(t)
        st = size_steps(G, zones, NODE, lv_of, start); layout(G, NODE)
        EV = dict(EVS); EV.update({e['id']: e for e in EVG})
        v03.ZONE_OF_BOSS.clear(); v03.ZONE_OF_BOSS.update({z['boss']: z['id'] for z in zones})
        for g in G.values():
            for n in g['nodes']:
                if n['kind'] == 'boss': n['exitTo'] = None
                n.pop('exitTo', None)
            dump(f"graphs/{g['id']}.json", v03.convert(g, EV, MW.SPEAKERS))
        stats[t] = st
        enc = {e['id']: e for e in ENCG}; prev = None
        for z in zones:
            e = enc[z['id']]; r = next(r for r in LOCROWS if r['location_id'] == z['desyPool'])
            bg, bn = z['boss'].split('/'); gg, ge = z['gateEdge'].split('/')
            d = {"id": z['id'], "realm": t, "order": z['order'], "title": {"en": r['location_name'], "zh": r['location_name_zh']}, "location": z['location'], "desyPool": z['desyPool'],
                 "pool": z['pool'], "tier": t, "bossNode": {"graph": bg, "node": bn}, "gateEdge": {"graph": gg, "edge": ge}, "bossKind": z['bossKind'], "boss": z['enemy'],
                 "enemiesPerBattle": e['enemiesPerBattle'], "elite": e['elite']}
            if 'roster' in e: d["roster"] = e['roster']; d["packs"] = {}
            else: d["fromRoster"] = e['fromRoster']
            if z.get('scriptedElite'): d["scriptedElite"] = z['scriptedElite']
            d["unlockRequires"] = [prev] if prev else ([zfile['zones'][-1]['id']] if t > 1 else [])
            zfile['zones'].append(d); prev = z['id']
        realm_boss_zone = next(z['id'] for z in zones if z['bossKind'] == 'realmboss')
        for e in world['edges']:
            if e.get('from') == f'realm_{t}' and e['kind'] != 'portal': e['cond'] = {"bossDefeated": realm_boss_zone}
        for q in HOOKS[h0:]: qfile['questHooks'].append(q)
    for e in world['edges']:
        if e.get('from') == 'realm_1' and e['kind'] != 'portal': e['cond'] = {"bossDefeated": "warren"}
    for e in world['edges']:
        if e['kind'] == 'portal' and e['to']['graph'] != 'realm_1': e['to']['node'] = 'entry_town'
    dump('graphs/world.json', world); dump('zones.json', zfile); dump('quests_world.json', qfile)
    dump('layout_targets.json', {"_note": "Per-realm layout targets used by build/world/world_gen.py. nodes = overworld + dungeon levels (town hub screens are not graphs).", "version": VERSION,
                                 "realms": {str(t): v for t, v in LAYOUT.items()}, "realm1": {"nodes": 17, "authored": True}})
    graphs = sorted(f[:-5] for f in os.listdir(f'{OUT}/graphs') if f.endswith('.json'))
    meta = {g: json.load(open(f'{OUT}/graphs/{g}.json')) for g in graphs}
    dump('index.json', {"_note": "v3.8 world index: every file the loader reads, plus the start position. status reference = generated by build/world/world_gen.py (replace with authored maps); authored = hand-made.",
                        "schema": "index/0.3", "version": VERSION, "renames": {}, "start": {"graph": "realm_1", "node": "village"},
                        "files": {"rules": "world_rules.json", "zones": "zones.json", "quests": "quests_world.json", "layoutTargets": "layout_targets.json"},
                        "graphs": [{"id": g, "kind": meta[g]['kind'], "realm": meta[g]['realm'], "dungeon": meta[g].get('dungeon'), "level": meta[g].get('level', 0), "status": meta[g].get('status', 'authored'),
                                    "nodes": len(meta[g]['nodes']), "file": f"graphs/{g}.json"} for g in graphs]})
    for t, s_ in stats.items(): print(t, s_)
if __name__ == '__main__': main()
