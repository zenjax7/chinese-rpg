import type { Queryable } from '../db';
import type { Ctx } from '../ctx';
import { forbidden, notFound, HttpError } from '../errors';
import { audit } from './audit';

/** The parents row exists (consent was given at least once). */
export function requireParent(ctx: Ctx): number {
  if (ctx.parentId == null) throw forbidden('consent_required', 'Parental consent is needed first.');
  return ctx.parentId;
}
/** §8.3 rule 5: child-scoped calls need consent 'granted' or 'confirmed' (and the current notice version is not required here:
 *  a bumped notice re-shows the consent screen, but existing saves keep working until the parent answers). */
export function requireConsent(ctx: Ctx): number {
  const id = requireParent(ctx);
  if (ctx.consent !== 'granted' && ctx.consent !== 'confirmed') throw forbidden('consent_required', 'Parental consent is needed first.');
  return id;
}
export function requireUnlocked(ctx: Ctx) {
  if (!ctx.unlocked) throw new HttpError(403, 'pin_required', 'Enter the parent PIN first.');
}
/** §8.3 rule 4: another parent's child (or no such child) is a 404, never a 403, and every denial leaves an audit row. */
export async function denied(q: Queryable, ctx: Ctx, childId: string, route: string): Promise<never> {
  await audit(q, { actor: 'parent', parentId: ctx.parentId ?? ctx.userId, childId, action: 'cross_parent_denied', details: { route } });
  throw notFound();
}
