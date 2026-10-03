/** PIN hashing (§5.5), IP hashing (§5.3) and audit hashing (§7.2), all with Node's built-in crypto (no native modules). */
import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { env } from './env';

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 32 } as const;
function scrypt(pw: Buffer, salt: Buffer): Promise<Buffer> {
  return new Promise((res, rej) => scryptCb(pw, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p, maxmem: 64 * 1024 * 1024 }, (e, k) => e ? rej(e) : res(k)));
}
const hmac = (key: string, data: string) => createHmac('sha256', key).update(data).digest();

/** scrypt(HMAC-SHA256(PIN_PEPPER, pin), per-parent random salt). Stored as "scrypt$N$r$p$<b64>" + the salt in its own column. */
export async function hashPin(pin: string): Promise<{ hash: string; salt: Buffer }> {
  const salt = randomBytes(16);
  const k = await scrypt(hmac(env('PIN_PEPPER'), pin), salt);
  return { hash: `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${k.toString('base64')}`, salt };
}
export async function verifyPin(pin: string, hash: string | null, salt: Buffer | null): Promise<boolean> {
  if (!hash || !salt) return false;
  const want = Buffer.from(hash.split('$')[4] ?? '', 'base64');
  const got = await scrypt(hmac(env('PIN_PEPPER'), pin), Buffer.from(salt));
  return want.length === got.length && timingSafeEqual(want, got);
}
/** HMAC-SHA256(IP_HASH_KEY, ip), hex. The raw IP is never stored. */
export const hashIp = (ip: string) => hmac(env('IP_HASH_KEY'), ip.trim().toLowerCase()).toString('hex');
/** Salted hashes for audit rows: no raw ids, so tombstones carry no personal data. */
export const auditHash = (kind: 'p' | 'c', id: string | number) => hmac(env('AUDIT_HASH_SALT'), `${kind}:${id}`).toString('hex').slice(0, 32);
