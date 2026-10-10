import { defineConfig } from 'vitest/config';
// npm run test:api: the backend suite. PGlite in-process by default (no network services); TEST_DATABASE_URL for a real Postgres.
export default defineConfig({
  test: {
    include: ['tests/api/**/*.test.ts'],
    testTimeout: 30_000, hookTimeout: 60_000,
    env: {
      NODE_ENV: 'test', APP_ORIGIN: 'http://localhost:5173',
      // test-only values, not secrets
      PIN_PEPPER: 'test-pepper', IP_HASH_KEY: 'test-ip-key', AUDIT_HASH_SALT: 'test-audit-salt', CRON_SECRET: 'test-cron-secret',
    },
  },
});
