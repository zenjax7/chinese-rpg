/** The editor's calls to /api/v1/editor/* (level-editor.md §6). Same-origin, Auth.js session cookie, CSRF headers (src/net/api.ts). */
import { ApiClient, type ApiResult } from '../net/api';
import type { Level, Problem } from '../shared/level/types';

export interface MapRow { id: string; kind: string; state: string; title?: { en?: string; zh?: string }; dungeon?: string | null; draftRev: number;
  publishedVersion: number; draftAhead: boolean; errors: number; words?: string[] }
export interface Draft { id: string; state: string; draft: Level; draftRev: number; validation: Problem[]; publishedVersion: number }

/** Error bodies share the success type's slot: { error, message } plus the 409 server copy or the 422 problems. */
export interface ApiErr { error?: string; message?: string; draft?: Level; draftRev?: number; problems?: Record<string, Problem[]> }
const api = new ApiClient('/api/v1');
export const editorApi = {
  me: () => api.call<{ role: string }>('GET', '/editor/me'),
  list: () => api.call<{ levels: MapRow[] }>('GET', '/editor/levels'),
  get: (id: string) => api.call<Draft>('GET', `/editor/levels/${id}`),
  affected: (id: string) => api.call<{ saves: number }>('GET', `/editor/levels/${id}/affected`),
  save: (id: string, draftRev: number, body: Level, goldenConfirm = false) =>
    api.call<{ draftRev: number; validation: Problem[] } & ApiErr>('PUT', `/editor/levels/${id}/draft`, { draftRev, body, ...(goldenConfirm ? { goldenConfirm } : {}) }),
  publish: (id: string, draftRev: number, note: string, goldenConfirm = false) =>
    api.call<{ release: number; versions: Record<string, number> } & ApiErr>('POST', '/editor/publish', { levels: [{ id, draftRev }], ...(note ? { note } : {}), ...(goldenConfirm ? { goldenConfirm } : {}) }),
};
export type { ApiResult };

/** Auth.js wants a POSTed form with its CSRF token; a top-level form post lets it redirect to Google and back to /editor. */
export async function authForm(action: 'signin/google' | 'signout') {
  const r = await fetch('/api/auth/csrf', { credentials: 'same-origin', cache: 'no-store' });
  const token = (await r.json()).csrfToken || '';
  const f = document.createElement('form'); f.method = 'POST'; f.action = `/api/auth/${action}`; f.style.display = 'none';
  for (const [k, v] of [['csrfToken', token], ['callbackUrl', location.origin + '/editor']]) {
    const i = document.createElement('input'); i.type = 'hidden'; i.name = k; i.value = v; f.appendChild(i);
  }
  document.body.appendChild(f); f.submit();
}
