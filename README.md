# chinese-rpg

A browser RPG prototype for learning Chinese, built with **Phaser 4 + TypeScript + Vite**.
Battles are driven by vocabulary questions (typed or spoken via the Web Speech API).
See `ASSETS.md` for the art/audio asset pipeline.

## Requirements

Node.js `^20.19` or `>=22.12` (CI uses Node 22).

```sh
npm ci
```

## Develop

```sh
npm run dev        # predev syncs assets from /workspace/art and /workspace/audio (if present), then starts Vite
```

## Build

```sh
npm run build      # prebuild: tools/sync_sprites.sh + tools/sync_assets.sh, then tsc && vite build -> dist/
npm run build:ci   # tsc && vite build only (no asset sync) - used by GitHub Actions
npm run preview    # serve dist/ locally
```

Synced assets (`public/sprites`, `public/bg`, `public/audio`, `public/assets-manifest.json`) are **committed**,
so the build works on machines without the source art/audio folders. The sync scripts skip any missing
source folder and keep the existing `public/` contents and manifest. After new art/audio is delivered,
run `npm run build` locally and commit the updated `public/` files.

`vite.config.ts` uses `base: './'`, so all asset URLs are relative and the site works under
`https://OWNER.github.io/chinese-rpg/`.

## Test

Headless play-through with `playwright-core` (uses the system Chrome at `/usr/bin/google-chrome`):

```sh
npm run build
python3 -m http.server 8795 --bind 127.0.0.1 --directory dist &   # or any server for dist/
npm test                                   # = node tests/play.mjs [baseUrl], default http://127.0.0.1:8795/
```

Extra scripts (same server):
- `node tests/queen.mjs [baseUrl] [t1|t1s|dagger|t2|test] [runs] [acc]`: Queen Bee win rate for a gear kit (spec v3.2 §7.9).
- `node tests/shots.mjs [baseUrl] [outPrefix] [viewports]` and `node tests/gearshots.mjs [baseUrl] [outPrefix]`: screenshots.
- Debug panel (dev build or `?debug`): 🎽 *Tier gear* wears the shop weapon/armor/shield/charm of the current location's tier.

Tests are **not** run in CI.

## Deploy (GitHub Pages via GitHub Actions)

`.github/workflows/deploy.yml` runs on every push to `main` (and manually via *workflow_dispatch*):
`npm ci` -> `npm run build:ci` -> upload `dist/` -> `actions/deploy-pages`.

The repository's Pages source must be set to **GitHub Actions**
(Settings -> Pages -> Build and deployment -> Source), or via the API (see below).

### First-time setup (after `gh auth login`)

```sh
# optional: set your real commit identity first (initial commit used a placeholder)
git config user.name "Your Name"; git config user.email "you@example.com"
git commit --amend --reset-author --no-edit

gh repo create chinese-rpg --public --source=. --remote=origin --push
gh api -X POST repos/OWNER/chinese-rpg/pages -f build_type=workflow   # OWNER = your GitHub username
gh workflow run deploy.yml     # the first push may run before Pages is enabled; re-run it
```

Site URL: `https://OWNER.github.io/chinese-rpg/`

### Redeploy

```sh
git push                       # any push to main deploys
gh workflow run deploy.yml     # or trigger manually
```
