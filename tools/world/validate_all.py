#!/usr/bin/env python3
"""CI gate for the v3.9.1 world + story data (npm run validate:world). Repo-relative; needs `pip install jsonschema`.
 1. tools/world/validate_world.py           graphs, zones, rules (Desy's validator, ported)
 2. docs/tools/story/validate_dialogue.py   scenes (Desy's validator)
 3. docs/tools/story/build_quests.py        quests: must report 0 errors and reproduce docs/data/quests/quests.json byte for byte
 4. JSON Schemas: quests.json vs quests.schema.json (quest/0.2), every scene vs scene.schema.json (scene/0.2)
 5. tools/world/build_world.py              runtime data: resolves every quest position; src/data/world/ + public/world/graphs/ must be up to date
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
run('validate_dialogue', ['docs/tools/story/validate_dialogue.py'])
qt = os.path.join(ROOT, 'docs', 'tools', 'story', 'quests_tables.md'); had_qt = os.path.exists(qt)
q = os.path.join(ROOT, 'docs', 'data', 'quests'); keep = tempfile.mkdtemp(); shutil.copytree(q, os.path.join(keep, 'q'))
out = run('build_quests (0 errors)', ['docs/tools/story/build_quests.py'], lambda o, c: c == 0 and 'ERRORS: 0' in o)
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
print('FAILED: ' + ', '.join(fails) if fails else 'world + story data: all checks passed')
sys.exit(1 if fails else 0)
