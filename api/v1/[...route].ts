// Vercel Function: every /api/v1/* endpoint (architecture.md §8.1). Node.js runtime, Web-standard fetch handler.
import { handle } from '../../server/router';
import { neonDb } from '../../server/db';

export default {
  async fetch(request: Request): Promise<Response> {
    const { db, close } = neonDb();
    try { return await handle(request, { db }); }
    finally { await close(); }
  },
};
