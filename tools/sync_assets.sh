#!/bin/sh
# Wrapper so package.json can chain it after sync_sprites.sh. See tools/sync_assets.py and ASSETS.md.
exec python3 "$(dirname "$0")/sync_assets.py" "$@"
