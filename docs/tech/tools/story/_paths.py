"""Path resolver for Desy's story tools in the repo (docs/tools/story/). Desy writes paths relative to /workspace/desy;
in the repo the same files live where docs/tools/desy_paths.json (generated from repo-manifest.md) says.
DESY_ROOT=/workspace/desy runs the tools against Desy's own tree instead."""
import json, os
REPO = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
DESY = os.environ.get('DESY_ROOT')
MAP = json.load(open(os.path.join(REPO, 'docs', 'tools', 'desy_paths.json'), encoding='utf-8'))
DIRS = {}
for s, d in MAP.items():
    if '*' not in s: DIRS.setdefault(os.path.dirname(s), os.path.dirname(d))
def P(rel: str) -> str:
    """Desy-relative path -> absolute path (repo layout unless DESY_ROOT is set). Unknown outputs go to docs/tools/story/out/."""
    if DESY: return os.path.join(DESY, rel)
    if rel in MAP and '*' not in MAP[rel]: return os.path.join(REPO, MAP[rel])
    d, b = os.path.split(rel)
    if d in DIRS: return os.path.join(REPO, DIRS[d], b)
    out = os.path.join(REPO, 'docs', 'tools', 'story', 'out', rel); os.makedirs(os.path.dirname(out), exist_ok=True); return out
