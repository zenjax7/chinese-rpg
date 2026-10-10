/** Session cookie -> ctx (§5.2, §8.3). The test injector (X-Test-Session) works ONLY when NODE_ENV=test; in every other
 *  environment the header is ignored and only the Auth.js cookie counts. */
import type { Queryable } from './db';
import type { Ctx } from './ctx';
import { sessionCtx } from './dal/session';
import { clientIp } from './http';
import { isTest } from './env';

export const SESSION_COOKIES = ['__Secure-authjs.session-token', 'authjs.session-token'];
export const TEST_SESSION_HEADER = 'x-test-session';

export function readCookie(header: string | null, name: string): string | null {
  for (const part of (header ?? '').split(';')) {
    const i = part.indexOf('='); if (i < 0) continue;
    if (part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}
export function sessionToken(req: Request): string | null {
  if (isTest()) { const t = req.headers.get(TEST_SESSION_HEADER); if (t) return t; }
  for (const n of SESSION_COOKIES) { const t = readCookie(req.headers.get('cookie'), n); if (t) return t; }
  return null;
}
export async function getCtx(q: Queryable, req: Request): Promise<Ctx | null> {
  const token = sessionToken(req);
  if (!token || token.length > 255) return null;
  return sessionCtx(q, token, { ip: clientIp(req), userAgent: req.headers.get('user-agent') ?? '' });
}
