"""Validate the realm-less map files in docs/data/levels (level/0.2). Desy, 2026-10-11 PT. Repo-relative; needs jsonschema.

  python docs/tech/tools/levels/validate_levels.py [--dir DIR]      exit 1 on any error; warnings never fail

Checks:
 1. schema: every map against docs/data/levels/schemas/level.schema.json (no realm, zone, retired, idxMax, elite, scriptedElite or
    scripted-edge fields can pass);
    index.json lists every map once and its start node exists.
 2. graph: unique node ids and idx, unique edge ids, every edge end exists, entry exists; boss node exists, its gate edge touches it
    and is the patrol edge; every map is reachable from the start over links (warning).
 3. links: every cross-map edge {graph, node} resolves, and the target map has the return edge (both ways).
 4. conditions: bossDefeated names a map with a boss; quest conditions name an existing quest.
 5. quests: unique ids; giver, turn-in, escort targets, every step position (node, refs, edges, maps, scope maps, words map) resolves;
    every step node carries a variant for that quest and step, and every variant points at a real quest and step (both ways).
 6. ids: every enemy (roster, boss, packs, fight actions, quest kill/drop enemies) exists in
    docs/data/json/enemies.json; every word (settings.words, quest words, scene words and {Cxxx} tokens) exists in the curriculum;
    scene ids are unique; scene actions name a scene in some map (else a warning: "not delivered yet", as build_world.py says today).
 7. met rule (proposed): scene words must be met when the scene can first play (world_loader.scene_met); warnings for now.
"""
import json, os, sys, re, glob, csv, collections, argparse
HERE = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.normpath(os.path.join(HERE, '..', '..', '..', '..'))
sys.path.insert(0, os.path.join(HERE, '..', 'sim'))
import world_loader as WL
J = lambda p: json.load(open(p, encoding='utf-8'))

def validate(d):
    err, warn = [], []
    try:
        import jsonschema
    except ImportError:
        return ['jsonschema missing (pip install jsonschema)'], []
    sch = J(os.path.join(d, 'schemas', 'level.schema.json')); V = jsonschema.Draft202012Validator(sch)
    maps = {}
    for f in sorted(glob.glob(os.path.join(d, '*.json'))):
        m = J(f)
        if m.get('schema', '').startswith('level/'):
            for e in V.iter_errors(m): err.append(f"{m.get('id')}: schema: {'/'.join(map(str, e.absolute_path))}: {e.message[:140]}")
            if os.path.basename(f) != f"{m.get('id')}.json": err.append(f'{f}: file name != id')
            maps[m['id']] = m
    idx = J(os.path.join(d, 'index.json'))
    ids = [x['id'] for x in idx['maps']]
    if sorted(ids) != sorted(maps) or len(set(ids)) != len(ids): err.append('index.json maps != the map files')
    for x in idx['maps']:
        if x['id'] in maps and x.get('state') != maps[x['id']]['state']: err.append(f"index.json: {x['id']} state differs")
    nodes = {mid: {n['id']: n for n in m['nodes']} for mid, m in maps.items()}
    node_ok = lambda g, n: g in nodes and n in nodes[g]
    st = idx['start']
    if not node_ok(st['graph'], st['node']): err.append(f'start {st} does not exist')
    # 2. graph
    for mid, m in maps.items():
        ns = nodes[mid]
        if len(ns) != len(m['nodes']): err.append(f'{mid}: duplicate node ids')
        if len({n['idx'] for n in m['nodes']}) != len(m['nodes']): err.append(f'{mid}: duplicate node idx')
        if len({e['id'] for e in m['edges']}) != len(m['edges']): err.append(f'{mid}: duplicate edge ids')
        if m['entry'] not in ns: err.append(f'{mid}: entry {m["entry"]} missing')
        for e in m['edges']:
            if e['from'] not in ns: err.append(f"{mid}/{e['id']}: from {e['from']} missing")
            if isinstance(e['to'], str) and e['to'] not in ns: err.append(f"{mid}/{e['id']}: to {e['to']} missing")
        for ev in m['events'] + [x for n in m['nodes'] for v in n.get('quests', []) for p in ('pre', 'in', 'post') for x in (v.get(p) or {}).get('events', [])]:
            if ev['node'] not in ns: err.append(f"{mid}/{ev['id']}: node missing")
        b = m['settings'].get('boss')
        if b:
            ge = next((e for e in m['edges'] if e['id'] == b['gateEdge']), None)
            if b['node'] not in ns or ns[b['node']]['kind'] != 'boss': err.append(f'{mid}: boss node {b["node"]} missing or not kind boss')
            if not ge or b['node'] not in (ge['from'], ge['to']) or not ge.get('patrol'): err.append(f'{mid}: gate edge {b["gateEdge"]} does not reach the boss as the patrol edge')
            if not m['settings']['words']: err.append(f'{mid}: a boss map needs words')
        elif m['settings']['words'] and not any(e.get('danger') for e in m['edges']): warn.append(f'{mid}: words but no battle edges')
    # 3. links both ways
    for mid, m in maps.items():
        for e in m['edges']:
            if not isinstance(e['to'], dict): continue
            g, n = e['to']['graph'], e['to']['node']
            if not node_ok(g, n): err.append(f"{mid}/{e['id']}: link target {g}/{n} does not exist"); continue
            back = [x for x in maps[g]['edges'] if isinstance(x['to'], dict) and x['from'] == n and x['to'] == {'graph': mid, 'node': e['from']}]
            if back: continue
            if e['kind'] == 'exit' and any(isinstance(x['to'], dict) and x['from'] == n for x in maps[g]['edges']):
                warn.append(f"{mid}/{e['id']}: one-way exit to {g}/{n} (by design today: the way back from {g}/{n} goes to another node)")
            else: err.append(f"{mid}/{e['id']}: link to {g}/{n} has no return link")
    # reachability
    order, rnd = WL.unlock_order(maps, st)
    for mid in maps:
        if mid not in rnd: warn.append(f'{mid}: not reachable from the start')
    # 4./5. quests
    quests = {}
    for mid, m in maps.items():
        for q in m['quests']:
            if q['id'] in quests: err.append(f"quest {q['id']} defined twice")
            quests[q['id']] = (mid, q)
            if q['giver']['graph'] != mid: err.append(f"quest {q['id']}: lives in {mid} but its giver is in {q['giver']['graph']}")
    def conds(x, lab):
        if isinstance(x, dict):
            for k, v in x.items():
                if k == 'bossDefeated' and (v not in maps or not maps[v]['settings'].get('boss')): err.append(f'{lab}: bossDefeated {v} is not a boss map')
                if k in ('questActive', 'questReady', 'questDone', 'questClaimed', 'offerQuest') and isinstance(v, str) and v not in quests: err.append(f'{lab}: {k} {v} unknown')
                conds(v, lab)
        elif isinstance(x, list):
            for v in x: conds(v, lab)
    for mid, m in maps.items(): conds({k: m[k] for k in ('edges', 'events', 'nodes', 'quests', 'scenes')}, mid)
    variants = collections.defaultdict(list)
    for mid, m in maps.items():
        for n in m['nodes']:
            for v in n.get('quests', []):
                variants[(v['quest'], mid, n['id'])].append(v)
                if v['quest'] not in quests: err.append(f"{mid}/{n['id']}: variant for unknown quest {v['quest']}"); continue
                q = quests[v['quest']][1]
                if v['role'] == 'step' and v.get('step') and v['step'] not in {o['id'] for o in q['objectives']}: err.append(f"{mid}/{n['id']}: variant step {v['step']} not in {q['id']}")
                if v['role'] == 'giver' and (q['giver']['graph'], q['giver']['node']) != (mid, n['id']): err.append(f"{mid}/{n['id']}: giver variant but {q['id']}'s giver is elsewhere")
    def has_variant(qid, g, n, step):
        return any(v['role'] == 'giver' or v.get('step') == step for v in variants[(qid, g, n)])
    for qid, (mid, q) in quests.items():
        lab = f'quest {qid}'
        if not node_ok(q['giver']['graph'], q['giver']['node']): err.append(f'{lab}: giver does not resolve')
        elif not any(v['role'] == 'giver' for v in variants[(qid, q['giver']['graph'], q['giver']['node'])]): err.append(f'{lab}: giver node has no giver variant')
        if isinstance(q['turnIn'], dict) and not node_ok(q['turnIn']['graph'], q['turnIn']['node']): err.append(f'{lab}: turn-in does not resolve')
        for o in q['objectives']:
            w = o['where'] or {}; ob = o['objective']; l2 = f"{lab}/{o['id']}"
            if 'node' in w:
                for r in [f"{w['graph']}/{w['node']}"] + w.get('refs', []):
                    g, n = r.split('/')
                    if not node_ok(g, n): err.append(f'{l2}: position {r} does not resolve')
                    elif not has_variant(qid, g, n, o['id']): err.append(f'{l2}: {r} has no variant for this step')
            elif 'edges' in w:
                for e in w['edges']:
                    if w['graph'] not in maps or e not in {x['id'] for x in maps[w['graph']]['edges']}: err.append(f'{l2}: edge {w["graph"]}/{e} missing')
            elif 'maps' in w:
                for g in w['maps']:
                    if g not in maps: err.append(f'{l2}: area map {g} missing')
            elif ob['type'] in ('talk', 'reach', 'deliver') or (ob['type'] == 'collect' and not ob.get('dropFrom')): err.append(f'{l2}: {ob["type"]} step has no position')
            for g in (ob.get('scope') or {}).get('maps', []) + ob.get('maps', []):
                if g not in maps: err.append(f'{l2}: scope map {g} missing')
            if ob['type'] == 'words' and (ob.get('map') not in maps or not maps[ob['map']]['settings']['words']): err.append(f'{l2}: words map {ob.get("map")} has no pool')
            if ob['type'] == 'escort' and (not ob.get('to') or not node_ok(ob['to']['graph'], ob['to']['node'])): err.append(f'{l2}: escort target does not resolve')
    # 6. enemies, words, scenes
    enemies = {e['id'] for e in J(os.path.join(REPO, 'docs', 'data', 'json', 'enemies.json'))}
    words = {r['id'] for r in csv.DictReader(open(os.path.join(REPO, 'docs', 'data', 'curriculum', 'curriculum.csv'), encoding='utf-8-sig'))}
    def need_enemy(x, lab):
        if x and x not in enemies: err.append(f'{lab}: enemy {x} unknown')
    def walk_actions(x, lab):
        if isinstance(x, dict):
            if 'fight' in x and isinstance(x['fight'], dict):
                for en in x['fight'].get('enemies', []): need_enemy(en, lab)
            for v in x.values(): walk_actions(v, lab)
        elif isinstance(x, list):
            for v in x: walk_actions(v, lab)
    scene_ids = {}; scene_refs = []
    for mid, m in maps.items():
        s = m['settings']
        for r in s.get('roster', []): need_enemy(r['enemy'], f'{mid} roster')
        for k in s.get('packs', {}): need_enemy(k, f'{mid} packs')
        if s.get('boss'): need_enemy(s['boss']['enemy'], f'{mid} boss')
        walk_actions([m['events'], m['nodes']], mid)
        for w in s['words']:
            if w not in words: err.append(f'{mid}: word {w} unknown')
        for q in m['quests']:
            for w in q.get('words', []):
                if w not in words: err.append(f"quest {q['id']}: word {w} unknown")
            for o in q['objectives']:
                ob = o['objective']
                for en in ob.get('enemies', []) + ob.get('dropFrom', []) + ([ob['enemy']] if ob.get('enemy') else []): need_enemy(en, f"quest {q['id']}/{o['id']}")
        for sid, sc in m['scenes'].items():
            if sid != sc['id']: err.append(f'{mid}: scene key {sid} != id')
            if sid in scene_ids: err.append(f'scene {sid} in {scene_ids[sid]} and {mid}')
            scene_ids[sid] = mid
            if sc['trigger'].get('graph') != mid: err.append(f'{mid}: scene {sid} triggers in {sc["trigger"].get("graph")}')
            toks = set(sc.get('words', [])) | {t for l in sc['lines'] for t in re.findall(r'\{(C\d+)\}', l['en'] + ''.join(c.get('en', '') for c in l.get('choices', [])))}
            for t in toks:
                if t not in words: err.append(f'{mid}: scene {sid} word {t} unknown')
        for x in re.findall(r'"scene": "(sc_[a-z0-9_]+)"', json.dumps([m['events'], m['nodes'], m['quests']])): scene_refs.append((mid, x))
    missing = sorted({x for _, x in scene_refs if x not in scene_ids})
    if missing: warn.append(f'{len(missing)} scene ids are referenced but not delivered yet (skipped at run time), e.g. {", ".join(missing[:4])}')
    # 7. met rule (proposed)
    met = WL.scene_met(maps, st)
    for mid, m in maps.items():
        for sid, sc in m['scenes'].items():
            un = [w for w in sc.get('words', []) if w not in met(mid, sc['trigger'].get('cond'))]
            if un: warn.append(f'met rule: scene {sid} in {mid} uses {len(un)} word(s) not met yet: {", ".join(un[:5])}')
    return err, warn, dict(maps=len(maps), quests=len(quests), scenes=len(scene_ids), links=sum(isinstance(e['to'], dict) for m in maps.values() for e in m['edges']),
                           variants=sum(len(v) for v in variants.values()), bosses=len(order))

if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--dir', default=os.path.join(REPO, 'docs', 'data', 'levels')); a = ap.parse_args()
    r = validate(a.dir); err, warn = r[0], r[1]
    for w in warn: print('warn ', w)
    for e in err: print('ERROR', e)
    if len(r) > 2: print('checked:', ', '.join(f'{k} {v}' for k, v in r[2].items()))
    print(f'ERRORS: {len(err)}  warnings: {len(warn)}'); sys.exit(1 if err else 0)
