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
import json, os, re, glob, hashlib, sys
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
    if ow and kind == 'town' and pos == 'entry_town':
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

qf = J(os.path.join(SRC, 'quests', 'quests.json')); quests = []
for q in qf['quests']:
    q = dict(q); g = resolve_pos(q['giver'], q['id'])
    if not g: err.append(f"quest {q['id']}: giver position {q['giver']} does not resolve")
    q['giverAt'] = g
    ti = q.get('turnIn'); q['turnInAt'] = g if ti in ('giver', None) else (resolve_pos(ti, q['id']) if isinstance(ti, dict) else None)
    for o in q['objectives']:
        w = o.get('where') or {}
        if 'edges' in w: o['at'] = {'graph': w['graph'], 'edges': w['edges']}
        else:
            r = resolve_pos(w, q['id']); o['at'] = r
            if not r and o['objective']['type'] in ('talk', 'reach', 'deliver'): warn.append(f"quest {q['id']}/{o['id']}: position {w} unresolved")
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

if err:
    for m in err: print('ERROR', m)
    sys.exit(1)
os.makedirs(os.path.join(OUT, 'graphs'), exist_ok=True); os.makedirs(os.path.join(OUT, 'scenes'), exist_ok=True)
for d in (os.path.join(OUT, 'graphs'), os.path.join(OUT, 'scenes')):
    for f in os.listdir(d): os.remove(os.path.join(d, f))
dump = lambda o, p: json.dump(o, open(p, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
h = hashlib.sha256()
for gid in sorted(graphs): s = json.dumps(graphs[gid], sort_keys=True, ensure_ascii=False); h.update(s.encode()); dump(graphs[gid], os.path.join(OUT, 'graphs', f'{gid}.json'))
for sid, s in scenes.items(): h.update(json.dumps(s, sort_keys=True, ensure_ascii=False).encode()); dump(s, os.path.join(OUT, 'scenes', f'{sid}.json'))
h.update(json.dumps([rules, zones, quests], sort_keys=True, ensure_ascii=False).encode())
dump({'quests': quests, 'economy': qf.get('economy', {})}, os.path.join(OUT, 'quests.json'))
out = {'_note': 'Generated by tools/world/build_world.py from docs/data (Desy v3.9.1). Do not edit by hand.',
       'contentVersion': h.hexdigest()[:8], 'dataVersion': rules.get('version', idx.get('version')), 'start': idx['start'],
       'rules': rules, 'zones': zones, 'questHooks': qworld.get('questHooks', []), 'questItems': qworld.get('questItems', []), 'speakers': qworld.get('speakers', {}),
       'graphs': [{k: g[k] for k in ('id', 'kind', 'realm', 'dungeon', 'level', 'nodes') if k in g} | {'title': graphs[g['id']].get('title')} for g in idx['graphs']],
       'scenes': sorted(scenes), 'words': words}
dump(out, os.path.join(OUT, 'index.json'))
print(f"world: {len(graphs)} graphs, {sum(len(g['nodes']) for g in graphs.values())} nodes, {len(zones)} zones, {len(quests)} quests, {len(scenes)} scenes, "
      f"contentVersion {out['contentVersion']} -> public/world/" + (f"; {len(warn)} warnings" if warn else ''))
for m in warn[:12]: print('  WARN', m)
