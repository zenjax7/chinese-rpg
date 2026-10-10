/** Browser client for /api/v1 (architecture.md §8). Same-origin only: the session is the Auth.js cookie, and every state-changing
 *  call carries the §5.2 CSRF headers (JSON + X-App-Request: 1). The client holds no keys. */
export interface ApiResult<T = any> { status: number; body: T | null; retryAfterSec: number | null }
export type Fetch = (input: string, init: RequestInit) => Promise<Response>;

export class ApiClient {
  constructor(private base = '/api/v1', private fetchFn: Fetch = (u, i) => fetch(u, i)) {}
  async call<T = any>(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body?: unknown): Promise<ApiResult<T>> {
    const headers: Record<string, string> = { 'x-app-request': '1' };
    if (method !== 'GET') headers['content-type'] = 'application/json';
    const res = await this.fetchFn(this.base + path, { method, headers, credentials: 'same-origin', cache: 'no-store',
      body: method === 'GET' || body === undefined ? undefined : JSON.stringify(body) });
    const text = await res.text();
    let parsed: any = null; try { parsed = text ? JSON.parse(text) : null; } catch { parsed = null; }
    const ra = Number(res.headers.get('retry-after'));
    return { status: res.status, body: parsed, retryAfterSec: Number.isFinite(ra) && ra > 0 ? ra : null };
  }
}
