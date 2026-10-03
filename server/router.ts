/** The /api/v1 router (architecture.md §8.2). Handlers only parse (zod) and call the DAL; they never see SQL. The route table is
 *  exported so the cross-parent test can enumerate every child-scoped route and fail when one has no denial test. */
import type { Db } from './db';
import type { Ctx } from './ctx';
import { HttpError, unauthorized } from './errors';
import { csrfCheck, errorResponse, json, readJson, IMPORT_CAP } from './http';
import { getCtx } from './session';
import * as S from './schemas';
import { getMe, unlock, changePin } from './dal/parents';
import { grantConsent, confirmConsent, revokeConsent } from './dal/consent';
import { createChild, updateChild, deleteChild } from './dal/children';
import { loadSave, saveProgress, importGuestSave } from './dal/saves';
import { listBackups, restoreBackup } from './dal/backups';
import { exportAccount, deleteAccount } from './dal/account';
import { dailyCron } from './dal/cron';
import { requireUnlocked } from './dal/guard';
import { timingSafeEqual } from 'node:crypto';

export interface Deps { db: Db }
type Args = { req: Request; ctx: Ctx; db: Db; childId: string; body: unknown };
export interface Route {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;              // ':childId' marks a child-scoped route
  pin?: boolean;             // needs the 10-minute PIN unlock (🔒 in §8.2)
  bodyCap?: number;
  handler: (a: Args) => Promise<unknown>;
}

export const ROUTES: Route[] = [
  { method: 'GET', path: '/me', handler: ({ db, ctx }) => getMe(db, ctx) },
  { method: 'POST', path: '/consent', handler: ({ db, ctx, body }) => grantConsent(db, ctx, S.parse(S.consentBody, body)) },
  { method: 'POST', path: '/consent/confirm', pin: true, handler: ({ db, ctx, body }) => (S.parse(S.emptyBody, body), confirmConsent(db, ctx)) },
  { method: 'POST', path: '/consent/revoke', pin: true, handler: ({ db, ctx, body }) => revokeConsent(db, ctx, S.parse(S.pinOnlyBody, body).pin) },
  { method: 'POST', path: '/parent/unlock', handler: ({ db, ctx, body }) => unlock(db, ctx, S.parse(S.pinOnlyBody, body).pin) },
  { method: 'POST', path: '/parent/pin', handler: ({ db, ctx, body }) => changePin(db, ctx, S.parse(S.changePinBody, body).newPin) },
  { method: 'POST', path: '/children', pin: true, handler: ({ db, ctx, body }) => createChild(db, ctx, S.parse(S.createChildBody, body)) },
  { method: 'PATCH', path: '/children/:childId', pin: true, handler: ({ db, ctx, childId, body }) => updateChild(db, ctx, childId, S.parse(S.patchChildBody, body)) },
  { method: 'DELETE', path: '/children/:childId', pin: true, handler: ({ db, ctx, childId, body }) => deleteChild(db, ctx, childId, S.parse(S.pinOnlyBody, body).pin) },
  { method: 'GET', path: '/children/:childId/save', handler: ({ db, ctx, childId }) => loadSave(db, ctx, childId) },
  { method: 'PUT', path: '/children/:childId/save', handler: ({ db, ctx, childId, body }) => saveProgress(db, ctx, childId, S.parse(S.saveBody, body)) },
  { method: 'POST', path: '/children/:childId/import', bodyCap: IMPORT_CAP, handler: ({ db, ctx, childId, body }) => importGuestSave(db, ctx, childId, S.parse(S.importBody, body)) },
  { method: 'GET', path: '/children/:childId/backups', pin: true, handler: ({ db, ctx, childId }) => listBackups(db, ctx, childId) },
  { method: 'POST', path: '/children/:childId/restore', pin: true, handler: ({ db, ctx, childId, body }) => restoreBackup(db, ctx, childId, S.parse(S.restoreBody, body).backupId) },
  { method: 'GET', path: '/export', pin: true, handler: ({ db, ctx }) => exportAccount(db, ctx) },
  { method: 'DELETE', path: '/account', pin: true, handler: ({ db, ctx, body }) => deleteAccount(db, ctx, S.parse(S.deleteAccountBody, body).pin) },
];

function match(route: Route, method: string, parts: string[]): { childId: string } | null {
  if (route.method !== method) return null;
  const rp = route.path.split('/').filter(Boolean);
  if (rp.length !== parts.length) return null;
  let childId = '';
  for (let i = 0; i < rp.length; i++) {
    if (rp[i] === ':childId') childId = parts[i];
    else if (rp[i] !== parts[i]) return null;
  }
  return { childId };
}

const PREFIX = '/api/v1';
let dbDownUntil = 0;   // §9.7 degraded mode: after a connection failure, answer 503 for 60 s without touching the DB
const isConnError = (e: any) => ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', '57P01', '57P03', '53300'].includes(e?.code)
  || /compute time quota|endpoint is disabled|Couldn't connect|connection terminated/i.test(String(e?.message ?? ''));

export async function handle(req: Request, deps: Deps): Promise<Response> {
  const reqId = Math.random().toString(36).slice(2, 10);
  try {
    const url = new URL(req.url);
    if (!url.pathname.startsWith(PREFIX)) throw new HttpError(404, 'not_found', 'Not found.');
    const parts = url.pathname.slice(PREFIX.length).split('/').filter(Boolean).map(decodeURIComponent);
    if (Date.now() < dbDownUntil) throw new HttpError(503, 'unavailable', 'Cloud saving is paused. Progress is safe on this device.', {}, { 'Retry-After': '60' });

    if (parts.join('/') === 'cron/daily' && req.method === 'GET') {
      const want = `Bearer ${process.env.CRON_SECRET ?? ''}`, got = req.headers.get('authorization') ?? '';
      if (!process.env.CRON_SECRET || want.length !== got.length || !timingSafeEqual(Buffer.from(want), Buffer.from(got))) throw unauthorized();
      return json(200, await dailyCron(deps.db));
    }

    let found: { route: Route; childId: string } | null = null;
    for (const route of ROUTES) { const m = match(route, req.method, parts); if (m) { found = { route, ...m }; break; } }
    if (!found) {
      if (ROUTES.some(r => match({ ...r, method: req.method as Route['method'] }, req.method, parts))) throw new HttpError(405, 'method_not_allowed', 'Method not allowed.');
      throw new HttpError(404, 'not_found', 'Not found.');
    }
    csrfCheck(req);
    const ctx = await getCtx(deps.db, req);
    if (!ctx) throw unauthorized();
    const childId = found.route.path.includes(':childId') ? S.parse(S.childId, found.childId) : '';
    const body = req.method === 'GET' ? {} : await readJson(req, found.route.bodyCap);
    if (found.route.pin) requireUnlocked(ctx);
    const out = await found.route.handler({ req, ctx, db: deps.db, childId, body });
    return json(200, out);
  } catch (e: any) {
    if (e instanceof HttpError) return errorResponse(e);
    if (isConnError(e)) { dbDownUntil = Date.now() + 60_000; return errorResponse(new HttpError(503, 'unavailable', 'Cloud saving is paused. Progress is safe on this device.', {}, { 'Retry-After': '60' })); }
    // Never log bodies, emails, nicknames, cookies or tokens (§14.3): the request id, route and error class only.
    console.error(`[api ${reqId}] ${req.method} ${new URL(req.url).pathname.replace(/[0-9a-f-]{36}/g, ':id')} ${e?.code ?? e?.name ?? 'error'}`);
    return errorResponse(new HttpError(500, 'server_error', 'Something went wrong.', { requestId: reqId }));
  }
}
/** Test hook: clear the degraded-mode timer. */
export function resetDegraded() { dbDownUntil = 0; }
