#!/usr/bin/env python3
"""Validate graph-mode saves against docs/data/world/schemas/progress.schema.json (progress/0.3, with common.schema.json refs).
  python3 tools/world/validate_save.py save.json [...]     (a whole v4 save: its .world is checked; or a bare progress object)
  echo '<json>' | python3 tools/world/validate_save.py -
Prints one line per file, exit 1 if any is invalid. Needs jsonschema (+ referencing)."""
import json, os, sys, glob
from jsonschema import Draft202012Validator
from referencing import Registry, Resource
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
SD = os.path.join(ROOT, 'docs', 'data', 'world', 'schemas')
reg = Registry()
for f in glob.glob(os.path.join(SD, '*.json')):
    s = json.load(open(f, encoding='utf-8')); r = Resource.from_contents(s)
    reg = reg.with_resource(s.get('$id', os.path.basename(f)), r).with_resource(os.path.basename(f), r)
V = Draft202012Validator(json.load(open(os.path.join(SD, 'progress.schema.json'), encoding='utf-8')), registry=reg)
bad = 0
for a in sys.argv[1:] or ['-']:
    d = json.load(sys.stdin if a == '-' else open(a, encoding='utf-8'))
    p = d.get('world', d) if isinstance(d, dict) else d
    errs = [f"{'/'.join(map(str, e.absolute_path)) or '(root)'}: {e.message[:200]}" for e in V.iter_errors(p)]
    print(json.dumps({'file': a, 'valid': not errs, 'errors': errs[:20]}, ensure_ascii=False)); bad += bool(errs)
sys.exit(1 if bad else 0)
