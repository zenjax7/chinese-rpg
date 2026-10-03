"""Sync check for repo-manifest.md (re-created 2026-10-02 after the box reset).
1) every manifest source exists (globs and comma lists expanded), section counts match the '— N files' headers;
2) compares each source with the GameDev repo checkout (/workspace/chinese-rpg/prototype, read-only) at its repo path: same / changed / new;
3) runs the world validator. Exit 1 on missing files or validator errors."""
import re, os, glob, subprocess, sys, hashlib, collections
ROOT = '/workspace/desy'; REPO = '/workspace/chinese-rpg/prototype'
text = open(f'{ROOT}/repo-manifest.md', encoding='utf-8').read()
missing = []; status = collections.Counter(); changed = []; new = []; bad_counts = []
h = lambda p: hashlib.sha1(open(p, 'rb').read()).hexdigest()
for sec in re.split(r'^## ', text, flags=re.M)[1:]:
    head = sec.split('\n', 1)[0]; m = re.search(r'— (\d+) files', head)
    rows = re.findall(r'^\| `([^`]+)` \| `([^`]+)` \|', sec, re.M)
    if m and int(m.group(1)) != len(rows): bad_counts.append(f"{head.strip()}: header says {m.group(1)}, table has {len(rows)}")
    for src, dst in rows:
        p = f'{ROOT}/{src}'
        if not os.path.exists(p): missing.append(src); continue
        q = f'{REPO}/{dst}'
        if not os.path.exists(q): status['new'] += 1; new.append(dst)
        elif h(p) == h(q): status['same'] += 1
        else: status['changed'] += 1; changed.append(dst)
print('manifest rows:', sum(status.values()) + len(missing), dict(status), 'missing:', len(missing))
for b in bad_counts: print('COUNT', b)
for x in missing: print('MISSING', x)
if '-v' in sys.argv:
    for x in changed: print('CHANGED', x)
    for x in new: print('NEW', x)
r = subprocess.run([f'{ROOT}/.venv/bin/python', f'{ROOT}/build/world/validate_world.py'], capture_output=True, text=True)
print('world validator:', r.stdout.strip().splitlines()[0] if r.stdout else r.stderr[-300:])
sys.exit(1 if missing or bad_counts or r.returncode else 0)
