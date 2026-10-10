"""World data validator (v3.9.4): thin wrapper for the CI validator tools/world/validate_world.py.
The old copy here was Desy's v3.9.1 validator with /workspace paths; the repo copy in tools/world/ already has every v3.9.2 check
(realms[] links + unlock, exit edges, no portal outcome, seed test vectors, content files, explicit rosters), so there is one validator only.
Run (repo root): python3 docs/tech/tools/world/validate_world.py [data_dir]   (default docs/data/world; exit 1 on errors)
Full gate: CI=1 python3 tools/world/validate_all.py"""
import os, runpy, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _paths import REPO
T = os.path.join(REPO, 'tools', 'world')
sys.path.insert(0, T); sys.argv[0] = os.path.join(T, 'validate_world.py')
runpy.run_path(sys.argv[0], run_name='__main__')
