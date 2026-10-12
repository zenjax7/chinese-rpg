#!/usr/bin/env python3
"""Builds the graph-world runtime data (?world=graph) from Desy's docs copy into public/world/ (fetched at run time, so new
graph files drop in without code changes):

  docs/data/world/index.json + world_rules + zones + quests_world  -> public/world/index.json (one file, + contentVersion)
  docs/data/world/graphs/*.json (every graph listed in index.json)  -> public/world/graphs/<id>.json (x/y normalised to 0..1)
  docs/data/quests/quests.json (quest/0.2)                           -> public/world/quests.json (giver / turn-in / where
                                                                       positions resolved to graph/node, see resolve_pos)
  docs/data/dialogue/sc_*.json (scene/0.2)                           -> public/world/scenes/<id>.json
  docs/data/curriculum/curriculum.csv tokens {Cxxx}                  -> checked against src/data/items.json

Nothing is hard-coded: node counts, towns, inns and positions all come from the data. Exit 1 on unresolved references.
Run: python3 tools/world/build_world.py   (also run by `npm run build` via tools/sync_assets.sh? no: by `npm run world`)."""
import json, os, re, glob, hashlib, sys, shutil
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
SRC = os.environ.get('WORLD_SRC', os.path.join(ROOT, 'docs', 'data'))
OUT = os.path.join(ROOT, 'public', 'world')
J = lambda p: json.load(open(p, encoding='utf-8'))
err, warn = [], []
W = os.path.join(SRC, 'world'); idx = J(os.path.join(W, 'index.json'))
rules = J(os.path.join(W, idx['files']['rules'])); zones = J(os.path.join(W, idx['files']['zones']))['zones']
qworld = J(os.path.join(W, idx['files']['quests']))
graphs = {}
for g in idx['graphs']:
    d = J(os.path.join(W, g['file']))
    xs = [n.get('x', 0) for n in d['nodes']]; ys = [n.get('y', 0) for n in d['nodes']]
    if xs and (max(xs) > 1.0001 or max(ys) > 1.0001 or min(xs) < 0 or min(ys) < 0):   # v3.8 pixel layouts -> 0..1
        x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
        for n in d['nodes']:
            n['x'] = round(0.05 + 0.9 * (n['x'] - x0) / max(1, x1 - x0), 4); n['y'] = round(0.05 + 0.9 * (n['y'] - y0) / max(1, y1 - y0), 4)
    for i, e in enumerate(d['edges']): e.setdefault('idx', i)
    graphs[g['id']] = d
ZONE = {z['id']: z for z in zones}

# ---- positions: entry_town / [lantern_]outpost[_k] / village_k / level_k... -> graph/node
def overworld(realm): return graphs.get(f'realm_{realm}')
def resolve_pos(loc, qid):
    """{'graph','node'} | {'zone','nodeKind','position','ref'} -> {'graph','node'} or None."""
    if not loc: return None
    if loc.get('graph') and loc.get('node'): return {'graph': loc['graph'], 'node': loc['node']}
    ref = loc.get('ref')
    if isinstance(ref, str) and '/' in ref:
        g, n = ref.split('/', 1)
        if g in graphs and any(x['id'] == n for x in graphs[g]['nodes']): return {'graph': g, 'node': n}
    z = ZONE.get(loc.get('zone')); pos = loc.get('position') or ''; kind = loc.get('nodeKind')
    if not z: return None
    ow = overworld(z['realm'])
    if ow and kind == 'town' and pos in ('entry_town', ''):   # a town without a position = the realm's (entry) town
        t = [n for n in ow['nodes'] if n['kind'] == 'town']
        tz = [n for n in t if n.get('zone') == z['id']] or t
        if tz: return {'graph': ow['id'], 'node': sorted(tz, key=lambda n: n['idx'])[0]['id']}
    if ow and kind == 'village':
        vs = sorted((n for n in ow['nodes'] if n['kind'] == 'village' and n.get('zone') == z['id']), key=lambda n: n['idx'])
        m = re.search(r'(\d+)$', pos); k = int(m.group(1)) if m else 1
        if (m or len(vs) == 1) and 0 < k <= len(vs): return {'graph': ow['id'], 'node': vs[k - 1]['id']}
    if kind and kind != 'town' and kind != 'village':   # a dungeon position: first node of that kind in the zone's graphs
        for g in graphs.values():
            if g.get('realm') != z['realm']: continue
            ms = [n for n in g['nodes'] if n['kind'] == kind and n.get('zone') == z['id']]
            lv = re.search(r'level_(\d+)', pos)
            if lv and g.get('level') != int(lv.group(1)): continue
            if ms: return {'graph': g['id'], 'node': sorted(ms, key=lambda n: n['idx'])[0]['id']}
    return None

# ---- v3.9.2 step-position check (quests.md §6 "Extended build check"): every giver, step, turn-in and escort target must resolve.
#   town/village positions resolve by position (entry_town / outpost_k); `path` steps are area steps (edge battles or walking in the zone);
#   every other step needs a ref / refs, or the same zone + kind + position as an earlier step or the giver that has one. The node must
#   exist, be in that zone and have the matching kind (quest-hook nodes and nodeKind 'any' may be any kind).
HOOK_NODES = {h['giver'] for h in qworld.get('questHooks', [])}
def node_at(ref):
    g, _, n = ref.partition('/'); gg = graphs.get(g)
    return gg and next((x for x in gg['nodes'] if x['id'] == n), None)
KIND_ALIASES = {'deadend': ('waypoint', 'fork', 'chest')}   # 'deadend' is a position-like kind in quests.json; the graphs call those nodes waypoints
def check_ref(ref, loc, label):
    kind, zone = loc.get('nodeKind'), loc.get('zone')
    if '/' not in ref and ref in graphs:   # a graph-only ref: the first node of that kind in the graph (by idx)
        ms = sorted((x for x in graphs[ref]['nodes'] if x['kind'] == kind or kind == 'any'), key=lambda x: x['idx'])
        if not ms: err.append(f"{label}: graph {ref} has no {kind} node"); return None
        warn.append(f"{label}: ref {ref} names a graph only; using its first {kind} node {ms[0]['id']}"); ref = f"{ref}/{ms[0]['id']}"
    n = node_at(ref)
    if not n: err.append(f"{label}: node {ref} does not exist"); return None
    if kind in KIND_ALIASES and n['kind'] in KIND_ALIASES[kind]: kind = n['kind']
    if zone and n.get('zone') and n['zone'] != zone and ref not in HOOK_NODES: err.append(f"{label}: {ref} is in zone {n['zone']}, not {zone}")
    if kind and kind not in ('any',) and n['kind'] != kind and ref not in HOOK_NODES: err.append(f"{label}: {ref} is a {n['kind']} node, not {kind}")
    g, _, nn = ref.partition('/'); return {'graph': g, 'node': nn}
def resolve_step(loc, label, known):
    """-> {'graph','node'} | {'graph','node','refs':[...]} | 'area' | None (unresolved). known: (zone, kind, position) -> ref seen earlier."""
    if not loc: return None
    if loc.get('graph') and loc.get('node'):
        if not node_at(f"{loc['graph']}/{loc['node']}"): err.append(f"{label}: node {loc['graph']}/{loc['node']} does not exist"); return None
        return {'graph': loc['graph'], 'node': loc['node']}
    key = (loc.get('zone'), loc.get('nodeKind'), loc.get('position'))
    if loc.get('refs'):
        rs = [check_ref(r, loc, label) for r in loc['refs']]
        if not all(rs): return None
        known.setdefault(key, loc['refs'][0]); return {**rs[0], 'refs': [f"{r['graph']}/{r['node']}" for r in rs]}
    if loc.get('ref'):
        r = check_ref(loc['ref'], loc, label)
        if r: known.setdefault(key, loc['ref'])
        return r
    if loc.get('nodeKind') == 'path': return 'area'
    if loc.get('nodeKind') in ('town', 'village'):
        r = resolve_pos(loc, label)
        if not r: err.append(f"{label}: {loc.get('nodeKind')} position {loc.get('zone')}/{loc.get('position') or '(none)'} does not resolve")
        return r
    if key in known: return check_ref(known[key], loc, label)
    err.append(f"{label}: {loc.get('nodeKind')} step at {loc.get('zone')}/{loc.get('position')} has no ref/refs and no earlier step with the same position")
    return None

qf = J(os.path.join(SRC, 'quests', 'quests.json')); quests = []
for q in qf['quests']:
    q = dict(q); known = {}
    g = resolve_step(q['giver'], f"quest {q['id']} giver", known)
    if not isinstance(g, dict): err.append(f"quest {q['id']}: giver position {q['giver']} does not resolve"); g = None
    q['giverAt'] = g and {'graph': g['graph'], 'node': g['node']}
    ti = q.get('turnIn')
    if ti in ('giver', None): q['turnInAt'] = q['giverAt']
    elif isinstance(ti, dict):
        r = resolve_step(ti, f"quest {q['id']} turn-in", known); q['turnInAt'] = r if isinstance(r, dict) else None
        if not q['turnInAt']: err.append(f"quest {q['id']}: turn-in {ti} does not resolve")
    else: q['turnInAt'] = None   # 'auto'
    for o in q['objectives']:
        w = o.get('where') or {}; lab = f"quest {q['id']}/{o['id']}"; ob = o['objective']
        if 'edges' in w: o['at'] = {'graph': w['graph'], 'edges': w['edges']}
        else:
            r = resolve_step(w, lab, known); o['at'] = r if isinstance(r, dict) else None
            if r is None and ob['type'] in ('talk', 'reach', 'deliver', 'collect') and not ob.get('dropFrom') and ob['type'] != 'kill':
                err.append(f"{lab}: {ob['type']} step position {w} does not resolve")
        if ob['type'] == 'escort':   # quests.md §2a: the step completes when the party enters `to`
            r = resolve_step(ob.get('to') or {}, f"{lab} escort target", known); o['toAt'] = r if isinstance(r, dict) else None
            if not o['toAt']: err.append(f"{lab}: escort target {ob.get('to')} does not resolve")
        if ob['type'] == 'words' and not re.fullmatch(r'L[1-9]\.[1-3]', ob.get('pool', '')): err.append(f"{lab}: words step needs a pool like L2.1")
    quests.append(q)

# ---- scenes + word tokens
items = {i['id']: i for i in J(os.path.join(ROOT, 'src', 'data', 'items.json'))['items']}
cur = {}
cp = os.path.join(SRC, 'curriculum', 'curriculum.csv')
if os.path.exists(cp):
    import csv
    for r in csv.DictReader(open(cp, encoding='utf-8-sig')): cur[r['id']] = {'zh': r['simplified'], 'en': r['english']}
scenes = {}
for f in sorted(glob.glob(os.path.join(SRC, 'dialogue', 'sc_*.json'))):
    s = J(f); scenes[s['id']] = s
    for l in s['lines']:
        for t in re.findall(r'\{(C\d+)\}', l['en'] + ''.join(c['en'] for c in l.get('choices', []))):
            if t not in items and t not in cur: err.append(f"scene {s['id']}/{l['id']}: token {t} unknown")
words = {t: (items.get(t) and {'zh': items[t]['zh'], 'en': items[t]['en']}) or cur[t]
         for s in scenes.values() for l in s['lines'] for t in re.findall(r'\{(C\d+)\}', l['en'] + ''.join(c['en'] for c in l.get('choices', []))) if t in items or t in cur}
for g in graphs.values():
    for ev in g.get('events', []):
        for a in ev.get('do', []) + [a for p in ev.get('pick', []) for a in p['do']]:
            if 'scene' in a and a['scene'] not in scenes: warn.append(f"{g['id']}/{ev['id']}: scene {a['scene']} not delivered yet (skipped at run time)")

# ---- v3.9.2 realm content (realms 3-9): enemies, locations (= zones), word pools, items -> public/world/content/realm_<n>.json,
# fetched with the realm's graphs (src/world/content.ts merges them into the battle tables at run time; classic mode never loads them).
# A realm is in this build only when its content is complete: every zone has a location row, a non-empty pool whose items all exist,
# and its boss / elite / roster / scripted / minion enemies all exist. Pinyin is not shipped (the UI never shows it).
content, in_build = {}, {1: True, 2: True}
base_enemies = {e['desyId'].split(' ')[0] for e in J(os.path.join(ROOT, 'src', 'data', 'enemies.json'))['enemies']} | {e['id'] for e in J(os.path.join(ROOT, 'src', 'data', 'enemies.json'))['enemies']}
for rk, rel in sorted((idx.get('content') or {}).items(), key=lambda kv: int(kv[0])):
    t = int(rk); c = J(os.path.join(W, rel)); probs = []
    if c.get('realm') != t: probs.append(f"realm field {c.get('realm')} != {t}")
    en = {e['id'] for e in c['enemies']} | base_enemies; it = {i['id'] for i in c['items']} | set(items)
    locs = {l['id']: l for l in c['locations']}
    for z in [z for z in zones if z['realm'] == t]:
        l = locs.get(z['id'])
        if not l: probs.append(f"zone {z['id']} has no location row"); continue
        if z.get('fromRoster') and not z.get('roster'): z['roster'] = l['roster']
        need = [r['enemy'] for r in l['roster'] + (z.get('roster') or [])] + [l.get('boss'), z.get('boss'), l.get('elite')] + [x for v in (l.get('scripted') or {}).values() for x in v]
        need += [m for e in c['enemies'] for m in e.get('minions', [])]
        probs += [f"zone {z['id']}: enemy {x} missing" for x in need if x and x not in en]
        pool = c.get('pools', {}).get(z['id']) or []
        if not pool: probs.append(f"zone {z['id']}: empty word pool")
        probs += [f"zone {z['id']}: pool item {x} missing" for x in pool if x not in it]
        if z['location'] != z['id']: probs.append(f"zone {z['id']}: location {z['location']} != zone id")
    in_build[t] = not probs
    for m in probs: warn.append(f"content realm {t} (kept out of this build): {m}")   # an incomplete realm stays locked ("not in this build")
    strip = lambda d: {k: v for k, v in d.items() if k != 'py'}
    content[t] = {'realm': t, 'version': c.get('version'), 'title': c.get('title'), 'G': c.get('G'), 'enemies': [strip(e) for e in c['enemies']],
                  'locations': c['locations'], 'pools': c['pools'], 'items': [strip(i) for i in c['items']]}
for g in graphs.values():   # world map: a realm node is in this build when its content is complete (realms 1-2 come from the classic tables)
    if g['kind'] == 'world':
        for n in g['nodes']:
            m = re.fullmatch(r'realm_(\d+)', n['id'])
            if m: n['inBuild'] = bool(in_build.get(int(m.group(1))))
realms = next((g.get('realms') for g in graphs.values() if g['kind'] == 'world'), None) or []

# ---- Jack's Oct 11 rules on top of the frozen seed (docs/data/world stays frozen; Desy's handoff_simplify):
#   - the global encounter rules come from docs/data/levels/world_rules.json (walked edges x0.5; no battle budget, no pity, no patrols)
#   - progression by links only: bossDefeated conditions on edges and realm unlocks are dropped (as in docs/data/levels, F3)
#   - no scripted path elites (edge `scripted`), no fog landmarks (node `fog`): every unvisited node looks the same
LEVEL_RULES = os.path.join(SRC, 'levels', 'world_rules.json')
if os.path.exists(LEVEL_RULES): rules = J(LEVEL_RULES)
# the realm-boss Feathers (realms 3/6/8) live in the level files as settings.boss.reward.feather; the frozen seed's graphs have no
# on:clear Feather event, so keep the seed's realmBossFeather rule until the game reads the level files
if 'realmBossFeather' not in rules and isinstance(J(os.path.join(SRC, 'world', 'world_rules.json')).get('realmBossFeather'), dict):
    rules['realmBossFeather'] = J(os.path.join(SRC, 'world', 'world_rules.json'))['realmBossFeather']
def drop_boss_cond(c):
    """A condition without its bossDefeated parts (None when nothing is left)."""
    if not isinstance(c, dict): return c
    out = {}
    for k, v in c.items():
        if k == 'bossDefeated': continue
        if k in ('all', 'any'):
            v = [x for x in (drop_boss_cond(y) for y in v) if x]
            if not v: continue
        if k == 'not':
            v = drop_boss_cond(v)
            if not v: continue
        out[k] = v
    return out or None
for g in graphs.values():
    for e in g['edges']:
        e.pop('scripted', None)
        if 'cond' in e:
            c = drop_boss_cond(e['cond'])
            if c: e['cond'] = c
            else: del e['cond']
    for n in g['nodes']: n.pop('fog', None)
    if g.get('realms'):
        for r in g['realms']: r['unlock'] = drop_boss_cond(r.get('unlock'))
for r in realms: r['unlock'] = drop_boss_cond(r.get('unlock'))

if err:
    for m in err: print('ERROR', m)
    sys.exit(1)
# Output split (architecture §6.2/§10: the loading unit is one graph):
#   src/data/world/   index.json (rules, zones, graph list, words, speakers), quests.json, scenes/<id>.json, progress + common schemas
#                     -> bundled (scenes as lazy chunks); this is what build_data.py emits (it calls this script)
#   public/world/graphs/<id>.json -> fetched one graph at a time at run time (up to ~200 nodes each)
SRC_OUT = os.path.join(ROOT, 'src', 'data', 'world')
for d in (os.path.join(OUT, 'graphs'), os.path.join(OUT, 'content'), os.path.join(SRC_OUT, 'scenes')):
    os.makedirs(d, exist_ok=True)
    for f in os.listdir(d): os.remove(os.path.join(d, f))
for f in ('index.json', 'quests.json'):   # pre-split layout (v3.9 WIP) lived in public/world/
    if os.path.exists(os.path.join(OUT, f)): os.remove(os.path.join(OUT, f))
if os.path.isdir(os.path.join(OUT, 'scenes')): shutil.rmtree(os.path.join(OUT, 'scenes'))
dump = lambda o, p: json.dump(o, open(p, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
h = hashlib.sha256()
for gid in sorted(graphs): s = json.dumps(graphs[gid], sort_keys=True, ensure_ascii=False); h.update(s.encode()); dump(graphs[gid], os.path.join(OUT, 'graphs', f'{gid}.json'))
for sid, s in scenes.items(): h.update(json.dumps(s, sort_keys=True, ensure_ascii=False).encode()); dump(s, os.path.join(SRC_OUT, 'scenes', f'{sid}.json'))
for t in sorted(content): h.update(json.dumps(content[t], sort_keys=True, ensure_ascii=False).encode()); dump(content[t], os.path.join(OUT, 'content', f'realm_{t}.json'))
h.update(json.dumps([rules, zones, quests], sort_keys=True, ensure_ascii=False).encode())
dump({'quests': quests, 'economy': qf.get('economy', {})}, os.path.join(SRC_OUT, 'quests.json'))
for f in ('progress.schema.json', 'common.schema.json'):   # the runtime validates saves against these (src/world/progress.ts)
    shutil.copyfile(os.path.join(W, 'schemas', f), os.path.join(SRC_OUT, f))
out = {'_note': 'Generated by tools/world/build_world.py from docs/data (Desy v3.9.2 seed + docs/data/levels/world_rules.json, Jack Oct 11 rules). Do not edit by hand.',
       'contentVersion': h.hexdigest()[:8], 'dataVersion': rules.get('version', idx.get('version')), 'start': idx['start'],
       'rules': rules, 'zones': zones, 'questHooks': qworld.get('questHooks', []), 'questItems': qworld.get('questItems', []), 'speakers': qworld.get('speakers', {}),
       'graphs': [{k: g[k] for k in ('id', 'kind', 'realm', 'dungeon', 'level', 'nodes') if k in g} | {'title': graphs[g['id']].get('title')} for g in idx['graphs']],
       'scenes': sorted(scenes), 'words': words,
       'realms': realms, 'content': {str(t): f'content/realm_{t}.json' for t in sorted(content)}, 'inBuild': {str(k): v for k, v in sorted(in_build.items())}}
dump(out, os.path.join(SRC_OUT, 'index.json'))
print(f"world: {len(graphs)} graphs, {sum(len(g['nodes']) for g in graphs.values())} nodes, {len(zones)} zones, {len(quests)} quests, {len(scenes)} scenes, "
      f"content realms {sorted(content)} (in build: {sorted(k for k, v in in_build.items() if v)}), "
      f"contentVersion {out['contentVersion']} -> src/data/world/ + public/world/graphs/" + (f"; {len(warn)} warnings" if warn else ''))
for m in warn[:12]: print('  WARN', m)
