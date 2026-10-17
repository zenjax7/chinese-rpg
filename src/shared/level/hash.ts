/** The map version hash (level-editor.md §2.9): SHA-256 of the canonical JSON (sorted keys, no whitespace). The server-set
 *  `version` field is left out, so a map seeded from docs/data/levels hashes the same as the file it came from. Runs in the browser
 *  and in Node (Web Crypto). */
export function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (v && typeof v === 'object') {
    return `{${Object.keys(v).sort().filter(k => (v as any)[k] !== undefined).map(k => `${JSON.stringify(k)}:${canonical((v as any)[k])}`).join(',')}}`;
  }
  return JSON.stringify(v ?? null);
}

export async function levelHash(level: Record<string, unknown>): Promise<string> {
  const { version: _v, ...rest } = level;
  const bytes = new TextEncoder().encode(canonical(rest));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}
