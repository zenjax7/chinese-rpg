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

## Account screens (client)

`src/ui/account.ts` (+ `account.css`), loaded by `src/main.ts` only when the build sets `VITE_CLOUD_SAVE=1`. `vite.config.ts` turns that into the compile-time constant `__CLOUD__`; with it false every account branch folds away, so **the GitHub Pages bundle is byte-identical** to the build before accounts (checked by sha1 of every file in `dist/`).

| screen | what it does | API |
|---|---|---|
| Launch | `游客 Play as guest` (today's game, local save) or `家长登录 Parent sign-in with Google`. Shown when `GET /me` is 401; a signed-in device skips it | `GET /me` |
| Google sign-in | fetches the Auth.js CSRF token and POSTs a form to `/api/auth/signin/google` with `callbackUrl` = the app; Auth.js redirects to Google and back | `GET /api/auth/csrf`, `POST /api/auth/signin/google` |
| Consent (first sign-in, or a new notice version) | plain-language notice, masked verified email, notice version, the parent/guardian 18+ checkbox, Agree. A first-time parent then sets a 4–6 digit PIN twice on the keypad; a returning parent enters theirs. Then an on-screen receipt | `POST /consent {noticeVersion, pin, attest: true}`, then `POST /parent/unlock` |
| PIN keypad | 4–6 digits; wrong PIN shows the tries left; a lockout shows the API's message and the time it ends, and disables the keys. If the 10-minute unlock runs out mid-task, the keypad comes back and the task continues | `POST /parent/unlock` (403 `wrong_pin`, 423 `pin_locked`) |
| Parent area | players (avatar + nickname): add, rename, delete (confirmation + PIN again); 6-player cap (button disabled, and the API's 409 is shown); import this device's guest save; export JSON; sign out; delete account (type DELETE + PIN) | `POST /children`, `PATCH`/`DELETE /children/:id`, `GET /export`, `DELETE /account`, `POST /api/auth/signout` |
| Who's playing? | avatar tiles; one tap loads that child's cloud save and restarts into the game as them | `GET /children/:id/save` |
| Import prompt | after the first player is added (or from the parent area / picker), if the device has a guest save with progress: into an existing player, a new player, or "Not now" | `POST /children/:id/import` |
| In game | a chip with who is playing; `🔄 换人 Switch player` in the pause menu; the offline banner | outbox `PUT /children/:id/save` |

- **Per-child local copy.** A picked child saves locally under `chinese-rpg-proto-v4:child:<id>` (guest saves `-v3`/`-v4` are never touched). On pick, the cloud save replaces the local copy unless this device has unsent play for that child; `stateFromCloud()` rebuilds `prog` from the mastery rows, and `adoptServer()` marks the server's counters as already sent so another device's answers are never counted twice.
- **Offline.** If the API is unreachable or answers 502–504 (Neon paused, §9.7), a small banner shows (`离线 Offline · saved on this device, will sync later`), play continues on the local copy, the outbox keeps the batch, and the banner goes when a push succeeds. A 401 while playing shows "signed out" instead.
- **Import.** The raw v3 save goes to the server's converter; the local key is then renamed `…imported-<date>` and `chinese-rpg-import` records where it went, so the prompt never returns. "Not now" also stops the prompt (the parent area still offers it).
- **Tests:** `npm run build:cloud` (→ `dist-cloud/`) then `npm run test:account` (`tests/account.mjs`, 63 checks, API and Auth.js mocked with Playwright `page.route`; it serves `dist-cloud/` on :8796 itself and needs the Pages build on :8795). It also checks that the Pages build has no account chunk, no account strings and makes no `/api` request.

## Tests

- `npm run test:api` — type-checks the server and runs the API tests on in-process PGlite (no database needed). CI runs it before the Pages build.
- `npm run test:api:pg` — the same tests on a real local Postgres; set `TEST_DATABASE_URL` to a throwaway database first.
- Covered: migrations, children, cross-parent isolation, saves (seq, conflicts, schema, import), PIN hashing and lockouts, consent, rate limits, export and delete, CSRF, the session injector, the Auth.js config, cron, and the client outbox.
- CI also checks that `dist/` contains no server code or server env names.
- **Server imports are Node ESM.** Vercel compiles each `api/**` file separately and Node runs them as ESM (`"type": "module"`), so every relative import in `api/`, `server/` and `src/net/` ends in `.js` (`'./errors.js'`, `'../../server/router.js'`); JSON is imported with `with { type: 'json' }` and traced into the function bundle. `tsconfig.server.json` uses `nodenext` resolution so `tsc` rejects extensionless imports, and `npm run check:esm` (in CI and `test:api`) fails on them too.
- **Nested paths need `vercel.json` rewrites.** Outside Next.js, Vercel matches `api/v1/[...route].ts` and `api/auth/[...auth].ts` to one path segment only, so `/api/v1/children/:id/save`, `/api/v1/cron/daily` and `/api/auth/callback/google` were 404 at the edge. `rewrites` send `/api/v1/:path*` and `/api/auth/:path*` to the two functions; the request URL keeps the original path.
- **Without `DATABASE_URL`** the functions still load: the Neon pool is created on the first query, so `/api/v1/*` without a session is `401`, routes that need the database answer `503 {"error":"not_configured"}`, and Auth.js `csrf`/`providers` work (`tests/api/deploy.test.ts`).

## Deviations from architecture.md

- **`VITE_CLOUD_SAVE` is a `VITE_*` variable** although §14.1 says nothing is. It is an on/off build flag, not a key, and holds no secret.
- **`APP_ORIGIN`** (optional) is not in §14.1. When set, it is the allowed origin for the CSRF check; otherwise the request's own host is used.
- **Cloud children play the graph world only.** Cloud snapshots need the graph-mode `world` (progress/0.3), so picking a child forces graph mode for that child; guests keep the classic default.
- **Tests use PGlite** in-process instead of a Neon branch; `test:api:pg` covers real Postgres.
- **Partly deployed:** the Vercel project (`zenjax7/chinese-rpg`) exists, but no Neon database (`DATABASE_URL`) or Google OAuth client yet. See [architecture.md §17](architecture.md) for what Jack sets up.

## Planned: level editor and level endpoints (not built)

**Status: planned, from [level-editor.md](level-editor.md) (r1, 2026-10-11: maps without realms, `level/0.2`), which is proposed and pending Jack's approval. None of these routes exist yet.**

| Route | Who | What |
|---|---|---|
| `GET /api/v1/levels/index` | public | Latest content release: `{release, levels: {id: {v, hash, state, kind, title}}, start}` (beta and golden maps only, never drafts). `CDN-Cache-Control: s-maxage=300, stale-while-revalidate`, ETag `r<release>` |
| `GET /api/v1/levels/:id?v=N` | public | One published map (`level/0.2`) at version N: `immutable`, ETag = content hash. Without `v`: 302 to the current version |
| `GET /api/v1/levels/quests?r=R` | public | The compiled quest list of release R (immutable) |
| `GET /api/v1/editor/levels` | editor | Map list with lifecycle state (draft/beta/golden), versions and error counts |
| `GET /api/v1/editor/levels/:id/draft` | editor | The draft + `draftRev` + validation (also used by Playtest) |
| `PUT /api/v1/editor/levels/:id/draft` | editor | Autosave `{draftRev, body}`. Validated and stored even with errors. 409 on a stale `draftRev` |
| `POST /api/v1/editor/levels` | editor | Create a map (kind and a unique id; starts as draft) |
| `POST /api/v1/editor/publish` | editor, session < 12 h | Publish one level or a set `{levels: [{id, draftRev}], note, goldenConfirm?}` in one transaction (a golden map needs the owner's confirm, checked by role on the server) → new versions, `level_revisions` rows, a `content_releases` row. 422 with errors |
| `GET /api/v1/editor/levels/:id/revisions` | editor | Publish history and checkpoints |
| `POST /api/v1/editor/levels/:id/rollback` | editor, session < 12 h | Republish revision vM as a new version |
| `POST /api/v1/editor/import` | editor, session < 12 h | Import level JSON (e.g. a repo edit by Desy) as the **draft** only |
| `GET /api/v1/editor/export?state=published[&level=]` | editor session **or** Bearer `export:read` token | Read-only export of the published maps and editor-made learn items, plus the audio-pending word list (`state=draft` needs the session). GameDev's box uses it to write `docs/data/levels/` and the word audio |
| `POST /api/v1/editor/levels/:id/state` | owner, session < 12 h | Move a map between draft, beta and golden (leaving golden needs the golden confirm) |
| `GET`, `POST /api/v1/editor/learn-items` | editor | List and create learn items (new ids from the server; audio marked pending) |
| `POST /api/v1/editor/tokens`, `DELETE /api/v1/editor/tokens/:id` | owner, session < 12 h | Create (shown once) and revoke read-only export tokens |

- **Editor routes** accept only an `EditorCtx`: a session user in the `editors` table or in `EDITOR_GOOGLE_SUBS`. They use the `app_editor` DB role, which has no grant on player tables.
- **The same CSRF rules** as the routes above apply. Rate limits: save 240/h, publish 30/h, export 60/h per token.
- **`vercel.json`'s `no-store`** rule for `/api/(.*)` will be narrowed so the public `/api/v1/levels/*` routes can be CDN-cached.
- **Planned env names:** `DATABASE_URL_EDITOR`, `DATABASE_URL_LEVELS_RO`, `EDITOR_GOOGLE_SUBS`, `EXPORT_TOKEN_PEPPER`.
