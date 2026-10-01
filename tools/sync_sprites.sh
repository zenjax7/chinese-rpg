#!/bin/sh
# Copies Arty's battle sprites (manifest.json + sheets) into public/sprites if they exist.
# The game loads sprites/manifest.json at runtime; missing manifest => emoji placeholders.
SRC=${ART_SPRITES:-/workspace/art/sprites}
DST="$(dirname "$0")/../public/sprites"
if [ -f "$SRC/manifest.json" ]; then
  mkdir -p "$DST" && cp "$SRC/manifest.json" "$DST/" && \
  python3 -c "import json,sys; [print(v['file']) for k,v in json.load(open('$SRC/manifest.json')).items() if not k.startswith('_') and isinstance(v,dict) and 'file' in v]" | while read f; do cp "$SRC/$f" "$DST/"; done
  echo "sprites synced from $SRC"
else echo "no sprite manifest at $SRC; using placeholders"; fi
