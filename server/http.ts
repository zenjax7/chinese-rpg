/** Request checks and JSON responses for /api/v1 (architecture.md §5.2 CSRF, §8.4 body caps). No CORS headers are ever sent. */
import { HttpError, forbidden } from './errors';

export const BODY_CAP = 256 * 1024, IMPORT_CAP = 1024 * 1024;
const BASE_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };

export function json(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { ...BASE_HEADERS, ...headers } });
}
export function errorResponse(e: HttpError) { return json(e.status, { error: e.code, message: e.message, ...e.extra }, e.headers); }

/** The app's own origin: APP_ORIGIN when set (recommended in production), else the request's own host (x-forwarded-host on Vercel). */
export function appOrigins(req: Request): string[] {
  const set = (process.env.APP_ORIGIN ?? '').split(',').map(s => s.trim().replace(/\/$/, '')).filter(Boolean);
  if (set.length) return set;
  const u = new URL(req.url);
  const host = req.headers.get('x-forwarded-host') ?? u.host;
  const proto = req.headers.get('x-forwarded-proto') ?? u.protocol.replace(':', '');
  return [`${proto}://${host}`];
}

/** §5.2: every state-changing request must come from our own origin (Origin header), not be cross-site (Sec-Fetch-Site), be JSON,
 *  and carry the custom X-App-Request: 1 header. A cross-site form or no-CORS fetch can't satisfy all of these. */
export function csrfCheck(req: Request) {
  if (req.method === 'GET' || req.method === 'HEAD') return;
  const origin = req.headers.get('origin');
  if (!origin || !appOrigins(req).includes(origin.replace(/\/$/, ''))) throw forbidden('bad_origin', 'Cross-origin requests are not allowed.');
  if ((req.headers.get('sec-fetch-site') ?? '') === 'cross-site') throw forbidden('bad_origin', 'Cross-site requests are not allowed.');
  if (req.headers.get('x-app-request') !== '1') throw forbidden('missing_app_header', 'Missing X-App-Request header.');
  const ct = req.headers.get('content-type') ?? '';
  if (!/^application\/json\b/i.test(ct)) throw new HttpError(415, 'unsupported_media_type', 'Use Content-Type: application/json.');
}

export async function readJson(req: Request, cap = BODY_CAP): Promise<unknown> {
  const len = Number(req.headers.get('content-length') ?? 0);
  if (len > cap) throw new HttpError(413, 'too_large', 'Request body is too large.');
  const buf = await req.arrayBuffer();
  if (buf.byteLength > cap) throw new HttpError(413, 'too_large', 'Request body is too large.');
  if (!buf.byteLength) return {};
  try { return JSON.parse(new TextDecoder().decode(buf)); } catch { throw new HttpError(400, 'bad_json', 'Body is not valid JSON.'); }
}

export function clientIp(req: Request): string {
  return req.headers.get('x-real-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '0.0.0.0';
}
