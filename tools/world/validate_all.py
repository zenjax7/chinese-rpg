#!/usr/bin/env python3
"""CI gate for the v3.9.1 world + story data (npm run validate:world). Repo-relative; needs `pip install jsonschema`.
 1. tools/world/validate_world.py           graphs, zones, rules (Desy's validator, ported)
 2. docs/tech/tools/story/validate_dialogue.py   scenes (Desy's validator)
 3. docs/tech/tools/story/build_quests.py        quests: must report 0 errors and reproduce docs/data/quests/quests.json byte for byte
 4. JSON Schemas: quests.json vs quests.schema.json (quest/0.2), every scene vs scene.schema.json (scene/0.2)
 5. tools/world/build_world.py              runtime data: resolves every quest position; src/data/world/ + public/world/graphs/ must be up to date
 6. docs/tech/tools/world/ (v3.9.4)        Desy's world tools (make_world_data -> world_gen -> make_realm_content -> make_schemas), run into a
                                            temp dir (WORLD_OUT), must reproduce every generated file in docs/data/world byte for byte
 7. docs/tech/tools/levels/ (level/0.2 maps, LE §14 F7): validate_levels.py must report 0 errors (schema, links, quest locks,
                                            boss reward), test_locks.py must pass (lock fixtures), convert_levels.py --check must find
                                            docs/data/levels up to date
 8. docs/tech/tools/data/leveling_v2_tables.py --check (leveling v2, 2026-10-17): hero_levels / enemy_stat_bands / enemies stats and
                                            their JSON twins match the formulas and the maps' enemy levels
Exit 1 on any failure."""
import json, os, subprocess, sys, glob, filecmp, shutil, tempfile
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
PY = sys.executable; fails = []
def run(name, args, ok=lambda out, code: code == 0):
    r = subprocess.run([PY, *args], cwd=ROOT, capture_output=True, text=True)
    out = r.stdout + r.stderr; good = ok(out, r.returncode)
    print(f"{'✅' if good else '❌'} {name}"); 
    if not good: print('   ' + '\n   '.join(out.strip().splitlines()[-15:])); fails.append(name)
    return out
run('validate_world', ['tools/world/validate_world.py'])
run('validate_dialogue', ['docs/tech/tools/story/validate_dialogue.py'])
qt = os.path.join(ROOT, 'docs', 'tech', 'tools', 'story', 'quests_tables.md'); had_qt = os.path.exists(qt)
q = os.path.join(ROOT, 'docs', 'data', 'quests'); keep = tempfile.mkdtemp(); shutil.copytree(q, os.path.join(keep, 'q'))
out = run('build_quests (0 errors)', ['docs/tech/tools/story/build_quests.py'], lambda o, c: c == 0 and 'ERRORS: 0' in o)
same = filecmp.cmp(os.path.join(q, 'quests.json'), os.path.join(keep, 'q', 'quests.json'), shallow=False)
print(f"{'✅' if same else '❌'} build_quests reproduces docs/data/quests/quests.json")
if not same: fails.append('quests.json drift')
for f in os.listdir(os.path.join(keep, 'q')): shutil.copy(os.path.join(keep, 'q', f), os.path.join(q, f))   # never leave the docs modified
shutil.rmtree(keep)
if not had_qt and os.path.exists(qt): os.remove(qt)   # build_quests' side table (quests.md source) is not part of the repo
try:
    import jsonschema
    def schema_check(name, schema_path, docs):
        sch = json.load(open(schema_path, encoding='utf-8')); v = jsonschema.Draft202012Validator(sch); errs = []
        for label, d in docs:
            for e in v.iter_errors(d): errs.append(f"{label}: {'/'.join(map(str, e.absolute_path))}: {e.message[:160]}")
        print(f"{'✅' if not errs else '❌'} {name} ({len(docs)} files)")
        for e in errs[:10]: print('   ' + e)
        if errs: fails.append(name)
    schema_check('quest/0.2 schema', os.path.join(q, 'quests.schema.json'), [('quests.json', json.load(open(os.path.join(q, 'quests.json'), encoding='utf-8')))])
    dl = os.path.join(ROOT, 'docs', 'data', 'dialogue')
    schema_check('scene/0.2 schema', os.path.join(dl, 'scene.schema.json'), [(os.path.basename(f), json.load(open(f, encoding='utf-8'))) for f in sorted(glob.glob(os.path.join(dl, 'sc_*.json')))])
except ImportError:
    print('❌ jsonschema missing (pip install jsonschema)'); fails.append('jsonschema')
# generated runtime data must be committed up to date: src/data/world/ (bundled) and public/world/ (graphs fetched at run time)
outs = [os.path.join(ROOT, 'src', 'data', 'world'), os.path.join(ROOT, 'public', 'world')]
old = tempfile.mkdtemp(); snaps = []
for k, d in enumerate(outs):
    snaps.append(os.path.join(old, str(k)))
    if os.path.isdir(d): shutil.copytree(d, snaps[-1])
run('build_world', ['tools/world/build_world.py'])
def diff(dc): return dc.left_only + dc.right_only + dc.diff_files + [x for s in dc.subdirs.values() for x in diff(s)]
stale = []
for d, sn in zip(outs, snaps):
    stale += [os.path.relpath(d, ROOT) + '/' + x for x in (diff(filecmp.dircmp(d, sn)) if os.path.isdir(sn) else ['(missing)'])]
print(f"{'✅' if not stale else '❌'} src/data/world + public/world are up to date{'' if not stale else ': ' + ', '.join(stale[:6])}")
if stale and os.environ.get('CI'): fails.append('world data stale')
shutil.rmtree(old)
# 6. Desy's world tools reproduce docs/data/world (v3.9.4: repo paths, WORLD_OUT); hand-kept extras (diagrams/, examples/, world_realm_table.csv) are not generated
wout = tempfile.mkdtemp(); env = dict(os.environ, WORLD_OUT=wout); env.pop('DESY_ROOT', None); tl = os.path.join('docs', 'tech', 'tools', 'world'); terr = ''
for t in ('make_world_data.py', 'world_gen.py', 'make_schemas.py'):
    r = subprocess.run([PY, os.path.join(tl, t)], cwd=ROOT, env=env, capture_output=True, text=True)
    if r.returncode: terr = f"{t} failed: " + (r.stdout + r.stderr).strip().splitlines()[-1][:200]; break
W = os.path.join(ROOT, 'docs', 'data', 'world'); regen = []
if not terr:
    for dp, _, fs in os.walk(wout):
        for f in fs:
            rel = os.path.relpath(os.path.join(dp, f), wout)
            if not os.path.exists(os.path.join(W, rel)) or not filecmp.cmp(os.path.join(dp, f), os.path.join(W, rel), shallow=False): regen.append(rel)
    for sub in ('graphs', 'content', 'schemas'):   # every committed graph / content / schema file must come from the tools
        regen += [f"{sub}/{f} (not generated)" for f in os.listdir(os.path.join(W, sub)) if f.endswith('.json') and not os.path.exists(os.path.join(wout, sub, f))]
ok = not terr and not regen
print(f"{'✅' if ok else '❌'} world tools reproduce docs/data/world byte for byte{'' if ok else ': ' + (terr or ', '.join(sorted(regen)[:8]))}")
if not ok: fails.append('world tools drift')
shutil.rmtree(wout)
# 7. level/0.2 maps (docs/data/levels)
lt = os.path.join('docs', 'tech', 'tools', 'levels')
run('validate_levels (0 errors)', [os.path.join(lt, 'validate_levels.py')], lambda o, c: c == 0 and 'ERRORS: 0' in o)
run('test_locks (quest-lock fixtures)', [os.path.join(lt, 'test_locks.py')], lambda o, c: c == 0 and '0 failures' in o)
run('test_boss_level (a boss without boss.level is an error)', [os.path.join('tools', 'world', 'test_boss_level.py')], lambda o, c: c == 0 and '0 failures' in o)
run('convert_levels --check (docs/data/levels up to date)', [os.path.join(lt, 'convert_levels.py'), '--check'])
# 8. leveling v2 tables (hero by level, enemy bands and roster stats at their levels)
run('leveling_v2_tables --check (enemy and hero tables up to date)', [os.path.join('docs', 'tech', 'tools', 'data', 'leveling_v2_tables.py'), '--check'])
print('FAILED: ' + ', '.join(fails) if fails else 'world + story data: all checks passed')
sys.exit(1 if fails else 0)
