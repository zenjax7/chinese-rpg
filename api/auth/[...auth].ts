// Vercel Function: Auth.js at /api/auth/* (signin/google, callback/google, signout, session, csrf). architecture.md §5.2.
import { Auth } from '@auth/core';
import NeonAdapter from '@auth/neon-adapter';
import { neonPool } from '../../server/db';
import { authConfig } from '../../server/auth-config';

export default {
  async fetch(request: Request): Promise<Response> {
    const pool = neonPool();   // created per request and closed after it, per the adapter docs
    try { return await Auth(request, authConfig(NeonAdapter(pool))); }
    finally { await pool.end(); }
  },
};
