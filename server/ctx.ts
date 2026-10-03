/** The request context, built ONLY by server/session.ts from the session cookie (architecture.md §8.3 rule 2). There is no DAL
 *  function that takes a parent id from the request: every DAL function takes this ctx and scopes by ctx.parentId. */
export interface Ctx {
  userId: number;
  sessionId: number;
  /** null until POST /consent creates the parents row */
  parentId: number | null;
  consent: 'none' | 'granted' | 'confirmed' | 'revoked';
  consentVersion: string | null;
  consentGrantedAt: Date | null;
  role: 'parent' | 'dev';
  /** the 10-minute PIN unlock for this session (§5.5) */
  unlocked: boolean;
  sessionAgeSec: number;
  email: string | null;
  ip: string;
  userAgent: string;
}
/** The privacy-notice version parents consent to. Bump it on a material change: the consent screen shows again (§5.3). */
export const NOTICE_VERSION = 'v1';
