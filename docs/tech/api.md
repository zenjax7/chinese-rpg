# Accounts and cloud-save API (`/api/v1`)

How the server half of [architecture.md](architecture.md) is built: what is in the repo, how to run and test it, and where it differs from the doc. The architecture doc is the design; this page is the as-built note. **Nothing is deployed yet**: GitHub Pages keeps serving the static game, and the client's cloud saving is **off by default**.

## Layout

| path | what |
|---|---|
| `api/v1/[...route].ts` | The one Vercel Function for `/api/v1/*`; hands the request to `server/router.ts` |
| `api/auth/[...auth].ts` | Auth.js (Google only, `openid email`, database sessions) |
| `server/router.ts` | Route table. Handlers parse with zod (`server/schemas.ts`) and call the DAL; no SQL in handlers |
| `server/http.ts` | CSRF and body checks, JSON responses, no CORS headers |
| `server/session.ts`, `server/ctx.ts` | The only place a request context (parent id) is built, from the session cookie |
| `server/dal/*` | Data access layer: every query scoped by the session's parent id, ownership checked in the same statement |
| `server/db.ts` | The only file that imports the Neon driver; tests swap in PGlite or a local Postgres |
| `server/progress.ts` | ajv validation of graph-mode saves against [progress.schema.json](../data/world/schemas/progress.schema.json) |
| `server/crypto.ts` | PIN hashing (scrypt over HMAC with `PIN_PEPPER`), IP and audit hashes |
| `migrations/*.sql`, `server/migrate.mjs` | Schema (§7), indexes and the child-cap trigger; `npm run db:migrate` / `db:status` |
| `src/net/api.ts`, `src/net/outbox.ts`, `src/net/cloud.ts` | Client: API client, save outbox, the `CloudSaveStore` sender |
| `vercel.json` | Build command, function limits, the daily cron, security and cache headers |
| `.env.example` | Variable names only (§14.1) |

## Routes (all JSON, all under `/api/v1`)

`GET /me` · `POST /consent`, `/consent/confirm`, `/consent/revoke` · `POST /parent/unlock`, `/parent/pin` · `POST /children`, `PATCH|DELETE /children/:childId` · `GET|PUT /children/:childId/save` · `POST /children/:childId/import` · `GET /children/:childId/backups`, `POST /children/:childId/restore` · `GET /export` · `DELETE /account` · `GET /cron/daily` (Bearer `CRON_SECRET`, called by Vercel Cron).

Routes that change parent-level data need a fresh PIN unlock. Every state-changing request must carry a same-origin `Origin`, must not be `Sec-Fetch-Site: cross-site`, must be `application/json` and must send `X-App-Request: 1`.

PIN lockouts: 5 wrong in a row lock for 15 minutes, 10 wrong in 24 hours lock for 60 minutes, and PIN attempts are also rate-limited to 10 an hour.

## Client cloud saving (off by default)

- `src/engine/state.ts` wraps the local save store in `CloudSaveStore`. The sender does nothing unless **both** the build flag `VITE_CLOUD_SAVE=1` is set and the player has a cloud child selected (`localStorage["chinese-rpg-cloud"] = {"childId": …}`). The Pages build sets neither, so classic and graph play are unchanged.
- `src/net/outbox.ts` queues saves per child (`chinese-rpg-outbox-v1:<childId>`). A retry reuses the same `seq`, so the server treats it as the same write; mastery is sent as deltas against the last acknowledged counters. Results: sent, conflict (the server has a newer save; the game gets a `cloudsave:server-newer` event), retry, signed out, dropped.

## Tests

- `npm run test:api` — type-checks the server and runs the API tests on in-process PGlite (no database needed). CI runs it before the Pages build.
- `npm run test:api:pg` — the same tests on a real local Postgres; set `TEST_DATABASE_URL` to a throwaway database first.
- Covered: migrations, children, cross-parent isolation, saves (seq, conflicts, schema, import), PIN hashing and lockouts, consent, rate limits, export and delete, CSRF, the session injector, the Auth.js config, cron, and the client outbox.
- CI also checks that `dist/` contains no server code or server env names.

## Deviations from architecture.md

- **`VITE_CLOUD_SAVE` is a `VITE_*` variable** although §14.1 says nothing is. It is an on/off build flag, not a key, and holds no secret.
- **`APP_ORIGIN`** (optional) is not in §14.1. When set, it is the allowed origin for the CSRF check; otherwise the request's own host is used.
- **No sign-in or parent-area UI yet.** The client side is the save path only; picking a cloud child is a localStorage value for now.
- **Tests use PGlite** in-process instead of a Neon branch; `test:api:pg` covers real Postgres.
- **Not deployed:** no Vercel project, Neon database or Google OAuth client exists yet. See [architecture.md §17](architecture.md) for what Jack sets up.
