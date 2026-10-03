/** Auth.js configuration (architecture.md §5.2): Google only, scope `openid email`, database sessions in Postgres through the Neon
 *  adapter, no name/photo and no Google tokens stored. Used by api/auth/[...auth].ts; the tests import it without a network. */
import type { AuthConfig } from '@auth/core';
import type { Adapter, AdapterAccount } from '@auth/core/adapters';
import Google from '@auth/core/providers/google';

/** Drops Google's access, refresh and id tokens before the adapter stores the account row: we never call Google APIs. */
export function minimalAccounts(adapter: Adapter): Adapter {
  return {
    ...adapter,
    linkAccount: (account: AdapterAccount) => adapter.linkAccount!({ ...account, access_token: undefined, refresh_token: undefined, id_token: undefined, expires_at: undefined, session_state: undefined }),
  };
}

export function authConfig(adapter: Adapter, env: Record<string, string | undefined> = process.env): AuthConfig {
  return {
    basePath: '/api/auth',
    trustHost: true,
    secret: env.AUTH_SECRET,
    adapter: minimalAccounts(adapter),
    session: { strategy: 'database', maxAge: 30 * 24 * 3600, updateAge: 24 * 3600 },
    providers: [Google({
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
      authorization: { params: { scope: 'openid email', prompt: 'select_account' } },
      profile: (p: any) => ({ id: p.sub, email: p.email, emailVerified: p.email_verified ? new Date() : null, name: null, image: null }),
    })],
    callbacks: { signIn: ({ profile }) => (profile as any)?.email_verified === true },   // verified Google emails only
  };
}
