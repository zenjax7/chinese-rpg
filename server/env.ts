/** Server env (architecture.md §14.1 / §17). Nothing here is ever a VITE_* variable: the client needs no keys. */
export function env(name: 'PIN_PEPPER' | 'IP_HASH_KEY' | 'AUDIT_HASH_SALT' | 'CRON_SECRET' | 'AUTH_SECRET' | 'AUTH_GOOGLE_ID' | 'AUTH_GOOGLE_SECRET' | 'DATABASE_URL' | 'APP_ORIGIN'): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}
export const isTest = () => process.env.NODE_ENV === 'test';
