"""Paths for Desy's world tools in the repo (docs/tech/tools/world/). Default = the repo layout:
inputs from docs/data, docs/story and src/data; outputs to docs/data/world.
  WORLD_OUT=/tmp/w   write the generated world data somewhere else (e.g. to diff against docs/data/world)
  DESY_ROOT=/workspace/desy   run against Desy's own tree (old layout) instead of the repo."""
import os
REPO = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', '..'))
DESY_ROOT = os.environ.get('DESY_ROOT')
DOCS = os.path.join(REPO, 'docs')
# Desy-relative name -> repo path under docs/ (same map as tools/build_data.py, plus the world inputs)
_MAP = {'data/combat_data.json': 'data/json/combat_data.json', 'core-curriculum.csv': 'data/curriculum/curriculum.csv',
        'data/curriculum_location_pools.csv': 'data/curriculum/curriculum_location_pools.csv', 'data/curriculum_locations.csv': 'data/curriculum/curriculum_locations.csv',
        'enemies.json': 'data/json/enemies-art-roster.json', 'data/enemies.csv': 'data/enemies/enemies.csv', 'data/boss_hp.csv': 'data/enemies/boss_hp.csv',
        'data/spells_full.json': 'data/json/spells_full.json', 'data/realm_location_difficulty.csv': 'data/balance/realm_location_difficulty.csv',
        'data/quests.json': 'data/quests/quests.json', 'quests.md': 'story/quests.md', 'data/dialogue': 'data/dialogue'}
def D(rel: str) -> str:
    """Desy-relative path -> repo path (or Desy's tree when DESY_ROOT is set)."""
    return os.path.join(DESY_ROOT, rel) if DESY_ROOT else os.path.join(DOCS, _MAP[rel])
OUT = os.environ.get('WORLD_OUT') or (os.path.join(DESY_ROOT, 'data', 'world') if DESY_ROOT else os.path.join(DOCS, 'data', 'world'))
SRC_DATA = os.path.join(REPO, 'src', 'data')          # GameDev's built data (towns.json)
SPRITES = os.environ.get('ART_SPRITES', os.path.join(REPO, 'public', 'sprites'))   # sprite manifest (sprite keys)
