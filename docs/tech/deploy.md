# Deploy: GitHub Pages

Owner: GameDev. Live build: https://zenjax7.github.io/chinese-rpg/ (decision log: [decisions.md](../decisions.md)).

## What happens on a push to `main`

[`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml) runs on every push to `main` (and on manual dispatch):

1. A gitleaks secret scan of the checked-out tree, then `npm ci` on Node 22.
2. `npm run test:api` (server type-check and the API tests on in-process PGlite; see [api.md](api.md)).
3. `pip install jsonschema`, then `npm run validate:world` with `CI=true` ([`tools/world/validate_all.py`](../../tools/world/validate_all.py)). It runs the world validator, Desy's dialogue validator and `build_quests.py` (from [`docs/tech/tools/story/`](tools/story/)), the quest and scene JSON Schemas, and checks that `src/data/world/` and `public/world/` were rebuilt from `docs/data/` and committed.
4. `npm run build:ci` = `tsc && vite build`. It skips the `prebuild` asset sync, because the art and audio source folders only exist on the team box.
5. `npm run check:dist` fails the build if `dist/` holds any server code or server env names.
6. The `dist/` folder is uploaded as the Pages artifact and deployed by `actions/deploy-pages`.

`docs/` is **not** part of the Pages build: Vite bundles `src/` and copies `public/` only. The game reads `docs/data/` only through the build tools below, whose output is committed.

## Before you push

- **Data:** after a change to `docs/data/`, run `python3 tools/build_data.py` (classic-mode tables in `src/data/`, then it runs `tools/world/build_world.py` for `src/data/world/` and `public/world/`) and commit the output. `npm run validate:world` must pass (needs `jsonschema`).
- **Assets:** `npm run build` (and `npm run dev`) first run `tools/sync_sprites.sh` and `tools/sync_assets.sh`, which copy Arty's delivered art and audio from `/workspace/art` and `/workspace/audio` into `public/` and write `public/assets-manifest.json`. Commit the synced files under `public/`; CI never syncs. See [asset-hooks.md](../art/asset-hooks.md).
- **Fonts:** after new Chinese text, run `python3 tools/build_fonts.py` (needs `fonttools` and `brotli`) and commit `src/fonts/`.
- **Tests** (not run in CI, they need a local Chrome at `/usr/bin/google-chrome`):
  - `npm run build`, then serve `dist/` on port 8795: `python3 -m http.server 8795 --bind 127.0.0.1 --directory dist`.
  - `npm run test:world`: graph-world unit and browser checks (a few minutes).
  - `npm test` (`tests/play.mjs`): the full headless play-through, about 238 checks and 20+ minutes; it also runs the world tests.

## Check the deploy

`gh run list --workflow deploy.yml --limit 3` and `gh run watch <id>`; then open the live URL. A failed `validate:world` step usually means generated data was not rebuilt or committed.
