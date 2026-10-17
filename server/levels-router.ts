/** /api/v1/editor/* and /api/v1/levels/* (level-editor.md §4, §6, §7.1, §9.2). Editor routes accept only an EditorCtx (never the
 *  parent ctx); the public level routes need no session and serve published (beta / golden) maps only, CDN-cacheable. */
import type { Db } from './db.js';
import { HttpError, unauthorized, forbidden } from './errors.js';
import { csrfCheck, json, readJson } from './http.js';
import { sessionToken } from './session.js';
import * as S from './schemas.js';
import { editorCtx, bootstrapSubs, type EditorCtx } from './dal/editors.js';
import * as L from './dal/levels.js';
import { countProgressOnMap } from './dal/graphs.js';
import { hit, LIMITS } from './dal/rateLimit.js';

const LEVEL_BODY_CAP = 1024 * 1024;
type EArgs = { db: Db; ctx: EditorCtx; id: string; body: unknown };
interface EditorRoute { method: 'GET' | 'PUT' | 'POST'; path: string; bodyCap?: number; handler: (a: EArgs) => Promise<unknown>; headers?: Record<string, string> }

export const EDITOR_ROUTES: EditorRoute[] = [
  { method: 'GET', path: 'me', handler: async ({ ctx }) => ({ role: ctx.role }) },
  { method: 'GET', path: 'levels', handler: ({ db, ctx }) => L.listLevels(db, ctx) },
  { method: 'GET', path: 'levels/:id', handler: ({ db, ctx, id }) => L.getLevel(db, ctx, id) },
  { method: 'GET', path: 'levels/:id/affected', handler: async ({ db, id }) => ({ saves: await countProgressOnMap(db, id) }) },
  { method: 'PUT', path: 'levels/:id/draft', bodyCap: LEVEL_BODY_CAP, handler: async ({ db, ctx, id, body }) => {
    const b = S.parse(S.saveDraftBody, body);
    await hit(db, LIMITS.editorSave, ctx.userId);
    return L.saveDraft(db, ctx, id, b as any);
  } },
  { method: 'POST', path: 'publish', handler: async ({ db, ctx, body }) => {
    const b = S.parse(S.publishBody, body);
    await hit(db, LIMITS.editorPublish, ctx.userId);
    return L.publish(db, ctx, b);
  } },
  { method: 'GET', path: 'export', headers: { 'content-disposition': 'attachment; filename="levels-export.json"' }, handler: ({ db, ctx }) => L.exportLevels(db, ctx) },
];

function matchRoute(path: string, parts: string[]): { id: string } | null {
  const rp = path.split('/');
  if (rp.length !== parts.length) return null;
  let id = '';
  for (let i = 0; i < rp.length; i++) { if (rp[i] === ':id') id = parts[i]; else if (rp[i] !== parts[i]) return null; }
  return { id };
}

async function handleEditor(req: Request, parts: string[], db: Db): Promise<Response> {
  let found: { route: EditorRoute; id: string } | null = null;
  for (const route of EDITOR_ROUTES) { const m = route.method === req.method && matchRoute(route.path, parts); if (m) { found = { route, ...m }; break; } }
  if (!found) {
    if (EDITOR_ROUTES.some(r => matchRoute(r.path, parts))) throw new HttpError(405, 'method_not_allowed', 'Method not allowed.');
    throw new HttpError(404, 'not_found', 'Not found.');
  }
  csrfCheck(req);
  const token = sessionToken(req);
  if (!token || token.length > 255) throw unauthorized();
  const ctx = await editorCtx(db, token, bootstrapSubs());
  if (!ctx) throw forbidden('not_editor', 'This Google account is not on the editor list.');
  const id = found.route.path.includes(':id') ? S.parse(S.levelId, found.id) : '';
  const body = req.method === 'GET' ? {} : await readJson(req, found.route.bodyCap);
  return json(200, await found.route.handler({ db, ctx, id, body }), found.route.headers);
}

const INDEX_CACHE = { 'cache-control': 'public, max-age=60', 'cdn-cache-control': 'public, s-maxage=300, stale-while-revalidate=86400' };
const IMMUTABLE = { 'cache-control': 'public, max-age=31536000, immutable' };

async function handlePublic(req: Request, url: URL, parts: string[], db: Db): Promise<Response> {
  if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'method_not_allowed', 'Method not allowed.');
  if (parts.length !== 1) throw new HttpError(404, 'not_found', 'Not found.');
  if (parts[0] === 'index') {
    const idx = await L.publicIndex(db);
    const etag = `"r${idx.release}"`;
    if (req.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers: { ...INDEX_CACHE, etag } });
    return json(200, idx, { ...INDEX_CACHE, etag });
  }
  const id = S.parse(S.levelId, parts[0]);
  const v = url.searchParams.get('v');
  if (v === null) {
    const cur = await L.currentVersion(db, id);
    return new Response(null, { status: 302, headers: { location: `/api/v1/levels/${id}?v=${cur}`, ...INDEX_CACHE } });
  }
  return json(200, await L.publicLevel(db, id, S.parse(S.levelVersion, v)), IMMUTABLE);
}

/** Returns null for paths that aren't level routes, so the parent router carries on. */
export async function handleLevels(req: Request, url: URL, parts: string[], db: Db): Promise<Response | null> {
  if (parts[0] === 'editor') return handleEditor(req, parts.slice(1), db);
  if (parts[0] === 'levels') return handlePublic(req, url, parts.slice(1), db);
  return null;
}
