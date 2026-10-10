/** zod schemas for every request body and path param (architecture.md §8.4). All objects are .strict(): unknown keys are rejected. */
import { z } from 'zod';
import { badRequest } from './errors';

export const childId = z.uuid();
const ID = /^[a-z0-9_]+$/;
const B64 = /^[A-Za-z0-9+/]*={0,2}$/;

/** Blocks emails, phone numbers and URLs in nicknames (§5.1: "a hint not to use a real name, and a filter"). */
export function noContactInfo(s: string): boolean {
  if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(s)) return false;                         // email
  if (/(\d[\s\-().]*){7,}/.test(s)) return false;                               // phone-like digit runs
  if (/(https?:\/\/|www\.)|\b[a-z0-9-]+\.(com|net|org|io|me|co|app|cn|uk|us|ly|gg)\b/i.test(s)) return false;  // URL
  return true;
}
export const nickname = z.string().trim().min(1).max(16).refine(noContactInfo, 'Nicknames cannot contain emails, phone numbers or links.');
export const avatar = z.string().regex(/^[a-z0-9_]{1,32}$/);
export const pin = z.string().regex(/^\d{4,6}$/, 'PIN must be 4 to 6 digits.');
export const noticeVersion = z.string().regex(/^[a-z0-9._-]{1,32}$/i);

export const consentBody = z.object({ noticeVersion, pin, attest: z.literal(true) }).strict();
export const pinOnlyBody = z.object({ pin }).strict();
export const emptyBody = z.object({}).strict();
export const changePinBody = z.object({ newPin: pin }).strict();
export const createChildBody = z.object({ nickname, avatar }).strict();
export const patchChildBody = z.object({
  nickname: nickname.optional(), avatar: avatar.optional(),
  speechMode: z.enum(['off', 'on_device', 'cloud']).optional(), sort: z.number().int().min(0).max(100).optional(),
}).strict().refine(o => Object.keys(o).length > 0, 'Nothing to change.');
export const deleteAccountBody = z.object({ confirm: z.literal('DELETE'), pin }).strict();
export const restoreBody = z.object({ backupId: z.union([z.number().int().positive(), z.string().regex(/^\d{1,18}$/)]).transform(String) }).strict();

export const WAYS = ['rZE', 'rEZ', 'sZE', 'sEZ'] as const;
export type Way = typeof WAYS[number];
/** One (item, way) delta from the outbox (§9.2): summed attempts/corrects plus the newest scheduling fields. */
export const masteryDelta = z.object({
  item: z.string().regex(/^[A-Za-z0-9_]{1,32}$/),
  way: z.enum(WAYS),
  da: z.number().int().min(0).max(300),
  dc: z.number().int().min(0).max(300),
  box: z.number().int().min(0).max(20),
  due: z.number().finite().min(0),
  last: z.number().finite().min(0),
  wrongRun: z.number().int().min(0).max(1000),
  seen: z.boolean().optional(),
  recentMiss: z.number().int().min(0).max(1000).optional(),
}).strict().refine(d => d.dc <= d.da, 'dc must be <= da');
export type MasteryDelta = z.infer<typeof masteryDelta>;

/** Grow-only graph bitsets (§6.4). Standard base64, matching progress.schema.json (bit i = node idx i). At most 64 bytes each. */
const bitset = z.string().max(88).regex(B64);
export const graphDelta = z.object({
  graph: z.string().regex(ID).max(64),
  n: z.number().int().min(0).max(512).optional(),
  visited: bitset, cleared: bitset,
  lastNode: z.string().regex(ID).max(64).optional(),
}).strict();
export type GraphDelta = z.infer<typeof graphDelta>;

/** The snapshot: today's SaveState (version 3) with the graph-mode `world` (progress/0.3, checked by ajv in server/progress.ts).
 *  `prog` travels as mastery deltas and `log` stays on the device (§5.6), so neither may be in the snapshot. Other keys pass
 *  through: the snapshot's shape changes while Desy iterates (§7.1). */
export const snapshot = z.object({
  version: z.number().int().min(3).max(4),
  level: z.number().int().min(1).max(999),
  exp: z.number().int().min(0),
  gold: z.number().int().min(0).optional(),
  world: z.record(z.string(), z.unknown()),
}).catchall(z.unknown()).refine(s => !('prog' in s) && !('log' in s), 'prog and log are not part of the cloud snapshot');

export const saveBody = z.object({
  baseVersion: z.number().int().min(0),
  deviceId: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/),
  seq: z.number().int().min(1),
  contentVersion: z.string().regex(/^[A-Za-z0-9._-]{1,64}$/),
  state: snapshot.optional(),
  mastery: z.array(masteryDelta).max(300).default([]),
  graphs: z.array(graphDelta).max(64).default([]),
}).strict();
export type SaveBody = z.infer<typeof saveBody>;

/** POST .../import: the raw v3 guest save (§12), converted server-side. Only the fields we keep are read; the rest is ignored. */
export const importBody = z.object({
  contentVersion: z.string().regex(/^[A-Za-z0-9._-]{1,64}$/),
  save: z.object({ version: z.literal(3), level: z.number().int().min(1), exp: z.number().int().min(0) }).catchall(z.unknown()),
}).strict();

export function parse<T extends z.ZodType>(schema: T, v: unknown): z.infer<T> {
  const r = schema.safeParse(v);
  if (!r.success) throw badRequest('Invalid request.', r.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })));
  return r.data;
}
