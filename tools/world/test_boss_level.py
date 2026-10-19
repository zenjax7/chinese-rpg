"""Desy 2026-10-17: a boss with no settings.boss.level keeps its table stats only as a runtime fallback; validate_levels must error
on any map whose boss has no level. Copies docs/data/levels, drops warren's boss.level, and expects exactly that error.
  python tools/world/test_boss_level.py        exit 1 on failure"""
import os, sys, json, shutil, tempfile
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
LT = os.path.join(REPO, 'docs', 'tech', 'tools', 'levels'); sys.path.insert(0, LT)
import validate_levels as V
SRC = os.path.join(REPO, 'docs', 'data', 'levels'); SCH = os.path.join(SRC, 'schemas')
fails = []
def check(name, ok, info=''):
    print(('ok   ' if ok else 'FAIL ') + name + (f'  {info}' if info else '')); ok or fails.append(name)
tmp = tempfile.mkdtemp()
try:
    d = os.path.join(tmp, 'levels'); shutil.copytree(SRC, d)
    err, _, _ = V.validate(d, SCH)
    check('repo maps: no boss_level error', not any('boss.level' in e for e in err), '; '.join(err[:3]))
    p = os.path.join(d, 'warren.json'); m = json.load(open(p, encoding='utf-8'))
    check('warren has a boss with a level', bool(m['settings'].get('boss', {}).get('level')))
    del m['settings']['boss']['level']; json.dump(m, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    err, _, _ = V.validate(d, SCH)
    check('warren without boss.level: validate_levels errors', any(e.startswith('warren') and 'boss' in e and 'level' in e for e in err), '; '.join(err[:4]))
finally:
    shutil.rmtree(tmp)
print(f'{len(fails)} failures'); sys.exit(1 if fails else 0)
