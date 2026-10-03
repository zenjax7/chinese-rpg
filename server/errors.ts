/** Typed errors the router maps to JSON responses. Messages are safe to show: no ids, emails or SQL. */
export class HttpError extends Error {
  constructor(public status: number, public code: string, message = code, public extra: Record<string, unknown> = {}, public headers: Record<string, string> = {}) { super(message); }
}
export const badRequest = (message: string, issues?: unknown) => new HttpError(400, 'bad_request', message, issues ? { issues } : {});
export const unauthorized = () => new HttpError(401, 'unauthorized', 'Sign in first.');
export const forbidden = (code = 'forbidden', message = 'Not allowed.') => new HttpError(403, code, message);
export const notFound = () => new HttpError(404, 'not_found', 'Not found.');
export const conflict = (code: string, message: string) => new HttpError(409, code, message);
export const locked = (until: Date) => new HttpError(423, 'pin_locked', 'Too many wrong PINs. Try again later.', { until: until.toISOString() },
  { 'Retry-After': String(Math.max(1, Math.ceil((until.getTime() - Date.now()) / 1000))) });
export const tooMany = (retryAfterSec: number) => new HttpError(429, 'rate_limited', 'Too many requests. Try again later.', {}, { 'Retry-After': String(retryAfterSec) });
