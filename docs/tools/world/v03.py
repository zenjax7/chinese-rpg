"""Converts the internal graph dicts (make_world_data.py / world_gen.py) to the published format graph/0.3,
which builds on GameDev's graph/0.2 draft (docs/architecture.md §6.3): one JSON file per overworld or dungeon level, nodes with
a never-reused idx, edges with kind path|oneway|shortcut|stairs|portal|exit (cross-graph: to {graph,node}), per-graph events
(on / cond / do), dialogue and npcs inside the graph. Desy additions: zone, danger, steps, patrol, outcome, pick, cooldown."""
KIND = {'path': 'waypoint', 'crossroads': 'fork', 'treasure': 'chest', 'deadend': 'waypoint', 'campfire': 'inn', 'story': 'story', 'miniboss': 'miniboss',
        'npc': 'npc', 'town': 'town', 'inn': 'inn', 'boss': 'boss', 'landmark': 'waypoint', 'exit': 'exit', 'portal': 'portal', 'stairs': 'stairs'}
CHEST = {'normal': 'chest_normal', 'locboss': 'chest_fine'}
def cond(reqs):
    if not reqs: return None
    out = []
    for r in reqs:
        k, v = next(iter(r.items()))
        if k == 'bossDefeated': v = ZONE_OF_BOSS.get(v, v)
        out.append({k: v})
    return out[0] if len(out) == 1 else {"all": out}
ZONE_OF_BOSS = {}
EVS_REF = {}
def actions(ev, dlg):
    ty = ev['type']; do = []
    if ty == 'story':
        dlg[ev['id']] = ev['lines']; do.append({"dialogue": ev['id']})
    elif ty == 'quest_offer': do.append({"offerQuest": ev['quest']})
    elif ty == 'item': do.append({"giveItem": ev['item'], "qty": ev.get('qty', 1)} | ({"quest": ev['quest']} if ev.get('quest') else {}))
    elif ty == 'treasure': do.append({"openChest": CHEST.get(ev.get('chest'), 'chest_normal')})
    elif ty == 'miniboss':
        do.append({"fight": {"enemies": ev['enemies'], "kind": "miniboss"}} | ({"quest": ev['quest']} if ev.get('quest') else {}))
        rw = ev.get('reward', {})
        if rw.get('goldG'): do.append({"giveGold": {"G": rw['goldG']}})
        if rw.get('item'): do.append({"giveItem": rw['item'], "qty": 1})
        for f in ev.get('setFlags', []): do.append({"setFlag": f})
    elif ty == 'portal': do.append({"teleport": {"graph": ev['toGraph'], "node": ev['toNode']}})
    elif ty == 'scene': do.append({"scene": ev['scene']})
    elif ty == 'tutorial':
        if ev.get('scene'): do.append({"scene": ev['scene']})
        if ev.get('intro'):
            dlg[ev['intro']] = EVS_REF[ev['intro']]['lines']; do.append({"dialogue": ev['intro']})
        dlg[ev['id']] = ev['lines']; do.append({"dialogue": ev['id']})
        do.append({"fight": {"kind": "tutorial", "enemies": ev['enemies'], "fill": False, "canLose": False}})
        if ev.get('after'): dlg[ev['id'] + '_after'] = ev['after']; do.append({"dialogue": ev['id'] + '_after'})
    return do
def rep(ev):
    m = ev['repeat']['mode']
    return {"once": True} if m == 'once' else {"cooldown": ev['repeat']['visits']} if m == 'cooldown' else {"once": False}
def convert(g, EVS, speakers=None, graph_kind=None):
    EVS_REF.update(EVS)
    gid = g['id']; idx = {n['id']: i for i, n in enumerate(g['nodes'])}
    kind = graph_kind or {'realm': 'overworld', 'dungeon': 'dungeon_level', 'world': 'world'}[g['kind']]
    out = {"schema": "graph/0.3", "id": gid, "kind": kind, "realm": g.get('tier'), "dungeon": (g.get('dungeon') or {}).get('id'), "level": g.get('level', 0),
           "title": {"zh": g.get('zh'), "en": g.get('name')}, "status": g.get('status', 'authored'), "entry": g['entry'], "idxMax": len(g['nodes']) - 1}
    if g.get('dungeon'): out["levels"] = g['dungeon']['levels']; out["optional"] = g['dungeon'].get('optional', False)
    if kind != 'world': out["background"] = {"map": f"bg_map_{gid}", "battle": f"bg_battle_r{g.get('tier')}"}
    if g.get('_note'): out["_note"] = g['_note']
    nodes, edges, events, dlg = [], [], [], {}
    for n in g['nodes']:
        k = KIND.get(n['kind'], n['kind'])
        if k == 'stairs': k = 'stairs_up' if n['name'] in ('Stairs up', 'Dungeon mouth', 'Entrance') else 'stairs_down'
        if k == 'town' and n.get('village'): k = 'village'
        nn = {"id": n['id'], "idx": idx[n['id']], "kind": k, "x": n['x'], "y": n['y']}
        if n.get('zone'): nn["zone"] = n['zone']
        nn["title"] = {"zh": n['zh'], "en": n['name']}
        if n['kind'] == 'campfire': nn["campfire"] = True
        if k in ('inn', 'town', 'village'): nn["save"] = True; nn["services"] = n.get('services', ["inn", "save"])
        if k == 'town': nn["hub"] = "village"; nn["town"] = n.get('town')
        if k == 'village': nn["services"] = ["inn", "save", "shop"]; nn["shops"] = ["items"]
        if n.get('npc'): nn["npc"] = n['npc']
        if n.get('boss'): nn["boss"] = n.get('zone')   # zone id; enemy, kind and reward live in zones.json
        if n.get('inBuild') is not None: nn["inBuild"] = n['inBuild']
        nodes.append(nn)
        p = n.get('portal')
        if p and not p['toGraph'].startswith('village_'):
            edges.append({"id": f"x_{n['id']}", "from": n['id'], "kind": 'stairs' if k.startswith('stairs') else 'portal', "to": {"graph": p['toGraph'], "node": p['toNode']}})
        if n.get('exitTo'):
            edges.append({"id": f"x_{n['id']}", "from": n['id'], "kind": "exit", "to": {"graph": n['exitTo']['graph'], "node": n['exitTo']['node']}} | ({"cond": {"bossDefeated": n['zone']}} if n['kind'] == 'boss' else {}))
        for j, slot in enumerate(n.get('onArrive', [])):
            e = {"id": f"{n['id']}.{j+1}", "node": n['id'], "on": "enter"}
            c = cond(slot.get('requires'))
            if 'event' in slot:
                ev = EVS[slot['event']]
                e.update(rep(ev)); e["outcome"] = 'story' if ev['type'] in ('tutorial', 'scene') else ev['type']
                if ev.get('on'): e["on"] = ev['on']
                if ev['type'] == 'tutorial': e["tutorial"] = True
                cc = cond((slot.get('requires') or []) + ev.get('requires', []))
                if cc: e["cond"] = cc
                if ev['type'] == 'story' and ev['id'].endswith(('beaten',)) or (n['kind'] == 'boss'): e["on"] = "clear"
                e["do"] = actions(ev, dlg)
            else:
                if c: e["cond"] = c
                e["pick"] = []
                for p_ in slot['pick']:
                    ev = EVS[p_['event']]; pe = {"weight": p_['weight'], "outcome": ev['type']}; pe.update(rep(ev))
                    cc = cond(p_.get('requires', []) + ev.get('requires', []))
                    if cc: pe["cond"] = cc
                    pe["do"] = actions(ev, dlg); e["pick"].append(pe)
            events.append(e)
    for e in g['edges']:
        ee = {"id": e['id'], "from": e['from'], "to": e['to'], "kind": {'gate': 'path', 'road': 'path', 'grass': 'path', 'tunnel': 'path', 'street': 'path'}.get(e.get('kind', 'path'), e.get('kind', 'path')),
              "danger": e['danger'], "steps": e.get('steps', 1)}
        if e.get('kind') in ('grass', 'tunnel', 'road'): ee["terrain"] = e['kind']
        if e.get('patrolGate'): ee["patrol"] = True; ee["terrain"] = "boss_approach"
        if e.get('scripted'): ee["scripted"] = e['scripted']
        c = cond(e.get('requires'))
        if c: ee["cond"] = c
        if e.get('note'): ee["note"] = e['note']
        edges.append(ee)
    for i, ee in enumerate(edges): ee["idx"] = i                      # v3.9: stable edge idx (progress bitsets)
    out["edgeIdxMax"] = len(edges) - 1
    # v3.9: x/y normalised to 0-1 per graph (GameDev); 'aspect' = width/height of the layout box so art can keep the shape
    xs = [n['x'] for n in nodes]; ys = [n['y'] for n in nodes]; w = (max(xs) - min(xs)) or 1; hgt = (max(ys) - min(ys)) or 1
    side = max(w, hgt)
    for n in nodes:
        n['x'] = round(0.05 + 0.9*(n['x'] - min(xs))/w, 4) if w > 1 else 0.5
        n['y'] = round(0.05 + 0.9*(n['y'] - min(ys))/hgt, 4) if hgt > 1 else 0.5
        if n['kind'] in ('town', 'village', 'boss'): n['fog'] = 'landmark'
    out["aspect"] = round(w/hgt, 3) if hgt > 1 else 1.0
    out["nodes"] = nodes; out["edges"] = edges; out["events"] = events; out["dialogue"] = dlg
    if speakers:
        used = {l['speaker'] for v in dlg.values() for l in v}
        out["npcs"] = {k: {"name": v} for k, v in speakers.items() if k in used}
    return out
