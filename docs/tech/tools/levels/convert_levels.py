"""Convert today's world data into one realm-less map file per map: docs/data/levels/<map_id>.json (schema level/0.2). Desy, 2026-10-11 PT.

Run from anywhere (repo-relative):  python docs/tech/tools/levels/convert_levels.py [--out DIR] [--check]
  --check  convert into a temp dir and fail if docs/data/levels differs (CI drift check).

Inputs (all in the repo): docs/data/world (index, graphs, zones, world_rules, quests_world, content/realm_N.json),
docs/data/quests/quests.json + src/data/world/quests.json (the same quests with every position resolved by tools/world/build_world.py),
docs/data/dialogue/sc_*.json, docs/data/curriculum/curriculum_location_pools.csv, docs/data/json/realm_difficulty.json,
docs/data/json/realm_location_difficulty.json, src/data/locations.json (realm 1-2 boss rewards).

What it does (docs/design/level-json-coverage.md §3 has the reasons):
 1. Graph surgery, the same code as the sim (docs/tech/tools/sim/world_loader.levels_proposal): realm_1 -> realm_1 + clover_hills + warren
    (portal links c_gate, w_gate); the 9 doorway paths move into the next map behind an `entry_gate` node. 38 maps, one word pool each.
 2. No realm field anywhere. Realm/tier-keyed values become per-map settings (G, recLevel, gearTier, difficulty, maxHopsToInn, boss
    reward) (world.json realms[] and its unlock rules are dropped: see 8).
 3. Zone ids in conditions become the boss map id (bossDefeated: warren -> warren, great_hive -> great_hive_1, ...).
 4. settings.words = the curriculum pool of the map's location, in curriculum order (editable later in the editor).
 5. Quests move into the giver's map (quest/0.2 minus realm/zone/pool/hook); every position is a resolved {graph, node}; area steps
    list maps; realm-wide kill scopes list maps. Quest-gated events move into node quest variants (pre/in/post), keeping their ids.
 6. Jack 2026-10-11: no random or scripted strong enemies. The zone `elite` / `scriptedElite` fields and the 9 scripted path-elite
    edges (`scripted`) are not converted. Bosses, mini-boss and quest fights are kept as they are. (No boss checkpoint exists in map data.)
 7. Inline graph dialogue becomes scene/0.2 objects (`sc_<map>__<key>`), {"dialogue": key} -> {"scene": id}; the 7 scene files go
    into their trigger map. `state` = beta for every map (playable; a change resets progress on that map, and every quest given on it goes back
    to not-started: Jack's decision, 2026-10-11). No retired/idxMax fields.
 8. Jack 2026-10-11 (the section 9 rulings): progression is purely by links, so every bossDefeated condition on an edge is dropped (the
    11 portal/exit links and the 8 world paths); the 153 trailing no-op 'nothing' events are dropped (nodes may have no event);
    settings.difficulty has no pathFights; node `fog` (landmark) is dropped (Jack 2026-10-11: node types show only on arrival); docs/data/levels/world_rules.json holds the global encounter rules without the battle
    budget, the pity roll and the beeline targets, with walked edges at 50% (map_rules).
"""
import json, os, sys, re, csv, glob, copy, collections, argparse, tempfile, filecmp, shutil
HERE = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.normpath(os.path.join(HERE, '..', '..', '..', '..'))
D = os.path.join(REPO, 'docs', 'data'); W = os.path.join(D, 'world')
sys.path.insert(0, os.path.join(HERE, '..', 'sim'))
import world_loader as WL
J = lambda p: json.load(open(p, encoding='utf-8'))
SCHEMA = 'level/0.2'

def load():
    rules, graphs, zones, hooks = WL._load_world(W)
    return dict(rules=rules, graphs=graphs, zones=zones, index=J(os.path.join(W, 'index.json')), qworld=J(os.path.join(W, 'quests_world.json')),
                quests_src={q['id']: q for q in J(os.path.join(D, 'quests', 'quests.json'))['quests']},
                quests_res={q['id']: q for q in J(os.path.join(REPO, 'src', 'data', 'world', 'quests.json'))['quests']},
                scenes={s['id']: s for s in (J(f) for f in sorted(glob.glob(os.path.join(D, 'dialogue', 'sc_*.json'))))},
                pools=list(csv.DictReader(open(os.path.join(D, 'curriculum', 'curriculum_location_pools.csv'), encoding='utf-8-sig'))),
                tiers={r['tier']: r for r in J(os.path.join(D, 'json', 'realm_difficulty.json'))},
                diff={r['location_id']: r for r in J(os.path.join(D, 'json', 'realm_location_difficulty.json'))},
                content={int(k): J(os.path.join(W, v)) for k, v in J(os.path.join(W, 'index.json')).get('content', {}).items()},
                classic={l['id']: l for l in J(os.path.join(REPO, 'src', 'data', 'locations.json'))['locations']})

def remaps(old, new):
    """(graph, node) and (graph, edge) of today's data -> where they are after the surgery."""
    nodes, edges = {}, {}
    where = collections.defaultdict(set)
    for gid, g in new.items():
        for n in g['nodes']: where[n['id']].add(gid)
    for gid, g in old.items():
        newg = new.get(gid, {'nodes': [], 'edges': []}); have = {n['id'] for n in newg['nodes']}
        for n in g['nodes']:
            if n['id'] in have: nodes[(gid, n['id'])] = (gid, n['id']); continue
            link = next((e for e in g['edges'] if e['from'] == n['id'] and isinstance(e['to'], dict)), None)
            moved = [x for x in where[n['id']] if x not in old or x in ('clover_hills', 'warren')]
            if moved and gid == 'realm_1': nodes[(gid, n['id'])] = (moved[0], n['id'])
            elif link and any(m['id'] == 'entry_gate' for m in new[link['to']['graph']]['nodes']): nodes[(gid, n['id'])] = (link['to']['graph'], 'entry_gate')
            else: raise AssertionError(f'node {gid}/{n["id"]} lost')
        for e in g['edges']:
            if isinstance(e['to'], dict): continue
            if any(x['id'] == e['id'] and x.get('from') == e['from'] for x in newg['edges']): edges[(gid, e['id'])] = (gid, e['id']); continue
            hit = [(g2, x['id']) for g2, gg in new.items() for x in gg['edges'] if x['id'] in (e['id'], e['id'] + '_in') and not isinstance(x['to'], dict)
                   and g2 != gid and (g2 in ('clover_hills', 'warren') if gid == 'realm_1' else nodes[(gid, e['to'])][0] == g2 and x['from'] == 'entry_gate')]
            assert len(hit) == 1, (gid, e['id'], hit); edges[(gid, e['id'])] = hit[0]
    return nodes, edges

def convert(src):
    old = src['graphs']; graphs, zones, log = WL.levels_proposal(old, src['zones'])
    nodes_rm, edges_rm = remaps(old, graphs)
    zone = {z['id']: z for z in zones}
    zone_map = {z['id']: z['bossNode']['graph'] for z in zones}            # zone id -> its boss map (the id used in conditions)
    loc_of = {gid: next(iter({n['zone'] for n in g['nodes'] if n.get('zone')}), None) for gid, g in graphs.items()}
    maps_of_zone = collections.defaultdict(list)
    for gid in sorted(graphs): loc_of[gid] and maps_of_zone[loc_of[gid]].append(gid)
    maps_of_realm = collections.defaultdict(list)
    for gid in sorted(graphs):
        r = old[gid]['realm'] if gid in old else 1
        if r: maps_of_realm[r].append(gid)
    words = collections.defaultdict(list)
    for r in src['pools']: words[r['location_id']].append(r['id'])                     # curriculum order (file order)
    rn = lambda g, n: '/'.join(nodes_rm[(g, n)])

    def cond(c):
        """zone ids in conditions -> boss map ids; any other condition unchanged."""
        if isinstance(c, list): return [cond(x) for x in c]
        if not isinstance(c, dict): return c
        out = {}
        for k, v in c.items():
            if k == 'bossDefeated': out[k] = zone_map[v]
            elif k in ('all', 'any'): out[k] = [cond(x) for x in v]
            elif k == 'not': out[k] = cond(v)
            else: out[k] = v
        return out
    def fix_actions(do, scene_of):
        out = []
        for a in do:
            a = dict(a)
            if 'dialogue' in a: a = {'scene': scene_of(a.pop('dialogue')), **a}
            out.append(a)
        return out
    def fix_event(ev, scene_of):
        ev = copy.deepcopy(ev)
        if 'cond' in ev: ev['cond'] = cond(ev['cond'])
        if 'do' in ev: ev['do'] = fix_actions(ev['do'], scene_of)
        for p in ev.get('pick', []):
            if 'cond' in p: p['cond'] = cond(p['cond'])
            p['do'] = fix_actions(p['do'], scene_of)
        return ev

    # ---- quests: source fields + resolved positions, remapped to the new maps
    def pos(at, label):
        if at is None: return None
        if 'edges' in at:
            ers = [edges_rm[(at['graph'], e)] for e in at['edges']]; assert len({g for g, _ in ers}) == 1, label
            return {'graph': ers[0][0], 'edges': [e for _, e in ers]}
        g, n = nodes_rm[(at['graph'], at['node'])]; out = {'graph': g, 'node': n}
        if at.get('refs'): out['refs'] = [rn(*r.split('/')) for r in at['refs']]
        return out
    quests_by_map = collections.defaultdict(list); quest_info = {}
    for qid, q in src['quests_res'].items():
        s = src['quests_src'][qid]; lab = f'quest {qid}'
        giver = pos(q['giverAt'], lab)
        nq = {'schema': 'quest/0.2', 'id': qid}
        for k in ('story', 'type', 'title'): nq[k] = s[k]
        nq['giver'] = {'npc': s['giver'].get('npc'), **giver}
        nq['alsoOnBoard'] = s['alsoOnBoard']
        ti = s['turnIn']
        nq['turnIn'] = ti if ti in ('giver', 'auto', None) else {'npc': ti.get('npc'), **pos(q['turnInAt'], lab + ' turnIn')}
        nq['returnToGiver'] = s['returnToGiver']; nq['requires'] = cond(s['requires']); nq['order'] = s['order']; nq['repeatable'] = s['repeatable']
        objs = []
        for o, orx in zip(s['objectives'], q['objectives']):
            ob = copy.deepcopy(o['objective'])
            sc = ob.pop('scope', None)
            if sc: ob['scope'] = {'maps': maps_of_realm[sc['realm']] if 'realm' in sc else maps_of_zone[sc['zone']]}
            if 'zone' in ob: ob['maps'] = maps_of_zone[ob.pop('zone')]
            if ob.get('type') == 'words':
                pl = ob.pop('pool'); ob['map'] = zone_map[next(z['id'] for z in zones if z['desyPool'] == pl)]
            if 'to' in ob: ob['to'] = pos(orx.get('toAt'), lab + ' escort')
            w = o['where']
            if orx.get('at'): where = pos(orx['at'], f'{lab}/{o["id"]}')
            elif w.get('nodeKind') == 'path': where = {'maps': maps_of_zone[w['zone']]}
            else: where = None
            ev_ = 'nothing' if o['event'] == 'portal' else o['event']   # LE F5: a portal is no step event; the step is objective reach
            if ev_ != o['event']: assert ob.get('type') == 'reach', (lab, o['id'], ob)
            no = {'id': o['id'], 'event': ev_, 'objective': ob, 'where': where}
            if o.get('note'): no['note'] = o['note']
            objs.append(no)
        nq['objectives'] = objs
        for k in ('scenes', 'rewards', 'words', 'summary'): nq[k] = copy.deepcopy(s[k])
        quests_by_map[giver['graph']].append(nq); quest_info[qid] = nq

    # ---- scenes: inline dialogue per map (keys used by that map's events) + the scene files by trigger
    scene_files = {}
    for sid, sc in src['scenes'].items():
        sc = copy.deepcopy(sc); t = sc['trigger']
        g, n = nodes_rm[(t['graph'], t['node'])]
        sc['trigger'] = {k: v for k, v in t.items() if k not in ('zone', 'nodeKind', 'position')}; sc['trigger'].update(graph=g, node=n)
        if 'cond' in sc['trigger']: sc['trigger']['cond'] = cond(sc['trigger']['cond'])
        sc.pop('realm', None); sc.pop('zone', None)
        for l in sc['lines']:
            if 'if' in l: l['if'] = cond(l['if'])
        scene_files.setdefault(g, {})[sid] = sc

    out = {}
    order = sorted(graphs, key=lambda g: (g != 'world', g))
    for gid in order:
        g = graphs[gid]; og = old.get(gid) or old['realm_1']
        sid_of = lambda key, gid=gid: 'sc_' + re.sub(r'[^a-z0-9_]', '_', f'{gid}__{key}'.lower())
        loc = loc_of[gid]; z = zone.get(loc)
        st = {}
        if z:
            tr = src['tiers'][z['tier']]; dr = src['diff'][z['desyPool']]
            cl = next((l for c in src['content'].values() for l in c['locations'] if l['id'] == loc), None)
            rec = [int(x) for x in re.split(r'[–-]', tr['rec_level_range'])]
            st = {'title': z['title'], 'emoji': (cl or {}).get('emoji'), 'background': g.get('background'),
                  'desyPool': z['desyPool'], 'words': words[z['desyPool']],
                  'G': tr['gold_per_normal'], 'recLevel': cl['recLevel'] if cl else rec, 'gearTier': tr['gear_tier'],
                  'difficulty': {'mcOptions': dr['mc_options'], 'reviewSlots': dr['review_slots']},   # no pathFights (Jack 2026-10-11: no own-word battle targets)
                  'enemiesPerBattle': z['enemiesPerBattle'], 'roster': z['roster'], 'packs': z['packs'], 'encounters': None,
                  'maxHopsToInn': src['rules']['maxHopsToInn'].get(str(z['realm']), src['rules']['maxHopsToInn']['default'])}
            if z['bossNode']['graph'] == gid:
                b = {'node': z['bossNode']['node'], 'gateEdge': z['gateEdge']['edge'], 'kind': z['bossKind'], 'enemy': z['boss']}
                if z['bossKind'] == 'realmboss':
                    rw = (cl or {}).get('bossReward') if cl else src['classic'].get({1: 'meadow', 2: 'forest'}[z['realm']], {}).get('bossReward')
                    b['reward'] = rw
                st['boss'] = b
        else:
            st = {'title': g.get('title'), 'background': g.get('background'), 'words': []}
        # events: quest-gated ones -> node variants (ids kept), the rest stay in order
        used_keys = set()
        def scene_of(key, used=used_keys): used.add(key); return sid_of(key)
        evs = [fix_event(e, scene_of) for e in g.get('events', [])
               if not (e.get('outcome') == 'nothing' and not e.get('do') and 'pick' not in e)]   # Jack 2026-10-11: no filler events (153 trailing no-op 'nothing' events)
        variants = collections.defaultdict(list)   # node -> [variant]
        plain = []
        def quest_of(ev):
            s = json.dumps(ev)
            m = re.search(r'"(?:questActive|questReady|questDone|questClaimed|offerQuest|quest)": "(q\d_[a-z0-9_]+)"', s)
            return m and m.group(1)
        for ev in evs:
            q = quest_of(ev)
            if not q or q not in quest_info: plain.append(ev); continue
            qi = quest_info[q]; at = f"{gid}/{ev['node']}"
            is_giver = f"{qi['giver']['graph']}/{qi['giver']['node']}" == at
            offer = any('offerQuest' in a for a in ev.get('do', []))
            step = next((o['id'] for o in qi['objectives'] if o['where'] and ((o['where'].get('graph') == gid and o['where'].get('node') == ev['node']) or at in o['where'].get('refs', []))), None)
            role = 'giver' if is_giver and (offer or not step) else 'step'
            v = next((x for x in variants[ev['node']] if x['quest'] == q and x['role'] == role), None)
            if not v:
                v = {'quest': q, 'role': role}
                if role == 'step': v['step'] = step
                variants[ev['node']].append(v)
            v.setdefault('pre' if offer else 'in', {}).setdefault('events', []).append(ev)
        for qi in quests_by_map.get(gid, []):    # every giver gets its variant, with the quest's scenes
            n = qi['giver']['node']; v = next((x for x in variants[n] if x['quest'] == qi['id'] and x['role'] == 'giver'), None)
            if not v: v = {'quest': qi['id'], 'role': 'giver'}; variants[n].append(v)
            sc = qi.get('scenes') or {}
            if sc.get('offer'): v.setdefault('pre', {})['scene'] = sc['offer']
            if sc.get('progress'): v.setdefault('in', {})['scene'] = sc['progress']
            if sc.get('turnIn'): v.setdefault('post', {})['scene'] = sc['turnIn']
        for qi in quest_info.values():           # every step node without an event still gets a step variant (steps resolve both ways)
            for o in qi['objectives']:
                w = o['where']
                if not w or 'node' not in w: continue
                at = [f"{w['graph']}/{w['node']}"] + [r for r in w.get('refs', []) if r != f"{w['graph']}/{w['node']}"]
                for n in [r.split('/')[1] for r in at if r.split('/')[0] == gid]:
                    if not any(x['quest'] == qi['id'] and (x.get('step') == o['id'] or (x['role'] == 'giver' and n == qi['giver']['node'] and qi['giver']['graph'] == gid)) for x in variants[n]):
                        variants[n].append({'quest': qi['id'], 'role': 'step', 'step': o['id']})
        nodes = []
        for n in g['nodes']:
            n = {k: v for k, v in n.items() if k not in ('zone', 'boss', 'fog')}   # fog: landmark dropped (Jack 2026-10-11: node types show only on arrival)
            if variants.get(n['id']): n['quests'] = variants[n['id']]
            nodes.append(n)
        edges = []
        for e in g['edges']:
            e = copy.deepcopy(e)
            if 'cond' in e: e['cond'] = cond(e['cond'])
            e.pop('scripted', None)   # the 9 scripted path elites (Jack 2026-10-11: no random or scripted strong enemies)
            if 'bossDefeated' in json.dumps(e.get('cond')):   # Jack 2026-10-11: progression is purely by links; no boss-gated link
                assert list(e['cond']) == ['bossDefeated'], (gid, e['id'], e['cond']); e.pop('cond')
            edges.append(e)
        scenes = {}
        dia = og.get('dialogue', {})
        for key in sorted(used_keys):
            lines = dia.get(key) or next(gg['dialogue'][key] for gg in old.values() if key in gg.get('dialogue', {}))   # moved doorway events keep their lines
            scenes[sid_of(key)] = {'schema': 'scene/0.2', 'id': sid_of(key), 'title': key, 'trigger': {'graph': gid, 'on': 'enter'},
                                   'lines': [dict({'id': f'l{i+1}'}, **l) for i, l in enumerate(lines)]}
        scenes.update(scene_files.get(gid, {}))
        m = {'schema': SCHEMA, 'id': gid, 'state': 'beta', 'kind': 'overworld' if g['kind'] == 'world' else g['kind']}   # no `world` kind (GameDev LE F1): the world map is an ordinary overworld map of portals
        for k in ('dungeon', 'level', 'levels', 'optional'):
            if g.get(k, og.get(k)) is not None: m[k] = g.get(k, og.get(k))
        m.update(title=g.get('title') or st.get('title'), entry=g.get('entry') or nodes[0]['id'], aspect=g.get('aspect') or og.get('aspect'), settings={k: v for k, v in st.items() if v is not None or k == 'encounters'})
        if gid != 'world' and 'boss' in m['settings'] and m['settings']['boss'].get('reward') is None: m['settings']['boss'].pop('reward', None)
        b = m['settings'].get('boss')    # LE F4: the boss chest (the Feather) is part of the boss reward, not an on:clear node event
        if b:
            for e in [e for e in plain if e['node'] == b['node'] and e.get('on') == 'clear' and e.get('do') and all('giveItem' in a and len(a) <= 2 for a in e['do'])]:
                assert [a['giveItem'] for a in e['do']] == ['feather'], (gid, e)
                b.setdefault('reward', {})['feather'] = b.get('reward', {}).get('feather', 0) + sum(a.get('qty', 1) for a in e['do'])
                plain.remove(e)
        m.update(nodes=nodes, edges=edges, events=[e for e in plain], quests=[{k: v for k, v in q.items() if k != 'scenes'} for q in quests_by_map.get(gid, [])], scenes=scenes)   # LE F5: quest scenes live only in the giver's variants
        npcs = og.get('npcs') or {}
        chars = sorted({l['speaker'] for s in scenes.values() for l in s['lines']} | {s2['char'] for s in scenes.values() for s2 in s.get('slots', {}).values()}
                       | {n['npc'] for n in nodes if n.get('npc')})
        m['characters'] = chars
        m['npcs'] = {k: v for k, v in npcs.items() if k in chars}
        out[gid] = m
    # entry nodes of the split maps
    for gid in ('clover_hills', 'warren'): out[gid]['entry'] = {'clover_hills': 'c_gate', 'warren': 'w_gate'}[gid]
    for gid in [g for g in out if any(n['id'] == 'entry_gate' for n in out[g]['nodes'])]: out[gid]['entry'] = 'entry_gate'
    idx = {'schema': 'levels_index/0.1', 'start': dict(zip(('graph', 'node'), nodes_rm[(src['index']['start']['graph'], src['index']['start']['node'])])),
           'maps': [{'id': g, 'state': out[g]['state'], 'kind': out[g]['kind'], 'title': out[g]['title']} for g in order],
           'globals': {'questItems': src['qworld'].get('questItems', {}), 'speakers': src['qworld'].get('speakers', {})},
           '_note': 'Generated by docs/tech/tools/levels/convert_levels.py from the v3.9.x world data. One file per map; no realms. GameDev seeds the DB from these files; afterwards the export writes them.'}
    return out, idx, dict(log=log, zone_map=zone_map, nodes=nodes_rm, edges=edges_rm)

DROP_RULES = ('zoneBattleBudget', 'budgetSpentMult', 'pityRolls', 'beelineBattleTarget', 'beelineBattleRange',   # Jack 2026-10-11
              'maxHopsToInn', 'townDensity', 'realmBossFeather')                                                  # realm-keyed: per-map settings / boss events
def map_rules(rules):
    """The global encounter rules for the maps (docs/data/levels/world_rules.json), from the frozen seed's world_rules.json with Jack's
    2026-10-11 rulings: no battle budget, no pity, no own-word battle targets, walked edges at 50% of the normal rate (was x0.05);
    the realm-keyed entries are per-map settings or boss events already. Everything else is copied unchanged."""
    r = {k: copy.deepcopy(v) for k, v in rules.items() if k not in DROP_RULES}
    r['_note'] = ("Global encounter rules for docs/data/levels (generated by docs/tech/tools/levels/convert_levels.py from docs/data/world/world_rules.json). "
                  "Jack 2026-10-11: no battle budget, no pity roll, no boss-approach patrols, no own-word battle targets; walked edges roll at 50% of the normal rate. "
                  "maxHopsToInn is per map (settings.maxHopsToInn); boss Feathers are on:clear events on the boss nodes.")
    r['version'] = 'maps-2026-10-11'; r['clearedStepMult'] = 0.5
    r['repel'] = {k: v for k, v in r['repel'].items() if k not in ('blocksScripted', 'blocksPatrols')}
    r['fog'] = {k: v for k, v in r['fog'].items() if k != 'landmarkKinds'}   # Jack 2026-10-11: no landmarks
    r['fog']['display'] = "Jack 2026-10-11: in game every unvisited node looks the same (revealed ones as '?'); a node's type and icon show only on arrival. No landmarks. The editor shows everything."
    return r

def write(out, idx, d, rules=None):
    os.makedirs(d, exist_ok=True)
    for f in glob.glob(os.path.join(d, '*.json')): os.remove(f)
    if rules: open(os.path.join(d, 'world_rules.json'), 'w', encoding='utf-8').write(json.dumps(rules, ensure_ascii=False, indent=1) + '\n')
    for gid, m in out.items(): open(os.path.join(d, gid + '.json'), 'w', encoding='utf-8').write(json.dumps(m, ensure_ascii=False, indent=1) + '\n')
    open(os.path.join(d, 'index.json'), 'w', encoding='utf-8').write(json.dumps(idx, ensure_ascii=False, indent=1) + '\n')

if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--out', default=os.path.join(D, 'levels')); ap.add_argument('--check', action='store_true'); a = ap.parse_args()
    src = load(); out, idx, info = convert(src); rules = map_rules(src['rules'])
    if a.check:
        t = tempfile.mkdtemp(); write(out, idx, t, rules)
        bad = [f for f in sorted(set(os.listdir(t)) | {x for x in os.listdir(a.out) if x.endswith('.json')}) if not os.path.exists(os.path.join(a.out, f)) or not os.path.exists(os.path.join(t, f)) or not filecmp.cmp(os.path.join(t, f), os.path.join(a.out, f), shallow=False)]
        shutil.rmtree(t); print('levels up to date' if not bad else f'levels drift: {bad[:8]}'); sys.exit(1 if bad else 0)
    write(out, idx, a.out, rules)
    print(f'{len(out)} maps -> {os.path.relpath(a.out, REPO)}'); print('\n'.join(info['log']))
    print('zone -> map:', ', '.join(f'{k}->{v}' for k, v in info['zone_map'].items()))
