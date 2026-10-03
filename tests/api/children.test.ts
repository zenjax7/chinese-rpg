import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { freshDb, parent, signIn, client, type TestDb } from './helpers';

let t: TestDb;
beforeAll(async () => { t = await freshDb(); });
afterAll(async () => { await t.close(); });

describe('child profiles', () => {
  it('cap at 6 per parent in the DAL: the 7th is a 409', async () => {
    const p = await parent(t.db, 'cap@example.com', { children: 6 });
    expect(p.kids.every(Boolean)).toBe(true);
    const r = await p.api('POST', '/children', { nickname: 'Seventh', avatar: 'fox' });
    expect(r.status).toBe(409);
    expect(r.body.error).toBe('child_limit');
    const me = await p.api('GET', '/me');
    expect(me.body.children).toHaveLength(6);
  });
  it('cap at 6 in the DB too: the before-insert trigger rejects a raw 7th insert', async () => {
    const p = await parent(t.db, 'trigger@example.com', { children: 6 });
    await expect(t.db.query(`insert into child_profiles (parent_id, nickname, avatar) values ($1, 'Raw', 'fox')`, [p.userId])).rejects.toThrow(/child profile limit/);
  });
  it('another parent is not affected by the first parent\'s cap', async () => {
    const p = await parent(t.db, 'other@example.com', { children: 1 });
    expect(p.kids[0]).toMatch(/^[0-9a-f-]{36}$/);
  });
  it('need the PIN unlock to create, and consent before anything', async () => {
    const s = await signIn(t.db, 'nopin@example.com');
    const api = client(t.db, s.token);
    expect((await api('POST', '/children', { nickname: 'A', avatar: 'fox' })).status).toBe(403);
    expect((await api('GET', '/me')).body.needsConsent).toBe(true);
  });
  it('patch nickname, avatar, speech mode and order', async () => {
    const p = await parent(t.db, 'patch@example.com', { children: 1 });
    const r = await p.api('PATCH', `/children/${p.kids[0]}`, { nickname: 'Panda', speechMode: 'off', sort: 3 });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ nickname: 'Panda', speechMode: 'off', sort: 3, avatar: 'fox' });
  });
});

describe('zod rejection (400, nothing written)', () => {
  it('rejects bad bodies and params', async () => {
    const p = await parent(t.db, 'zod@example.com', { children: 1 });
    const kid = p.kids[0];
    const cases: [string, string, unknown][] = [
      ['POST', '/children', { nickname: 'me@mail.com', avatar: 'fox' }],          // email in nickname
      ['POST', '/children', { nickname: 'call 555 123 4567', avatar: 'fox' }],    // phone number
      ['POST', '/children', { nickname: 'www.site.com', avatar: 'fox' }],         // URL
      ['POST', '/children', { nickname: '', avatar: 'fox' }],                     // empty
      ['POST', '/children', { nickname: 'abcdefghijklmnopq', avatar: 'fox' }],    // 17 chars
      ['POST', '/children', { nickname: 'Ok', avatar: 'fox', admin: true }],      // unknown key (.strict)
      ['POST', '/children', { nickname: 'Ok', avatar: '../x' }],
      ['POST', '/parent/unlock', { pin: '12' }],
      ['POST', '/parent/unlock', { pin: 'abcd' }],
      ['POST', '/consent', { noticeVersion: 'v1', pin: '1234' }],                 // no attest
      ['PATCH', `/children/${kid}`, {}],                                          // nothing to change
      ['PATCH', `/children/${kid}`, { speechMode: 'loud' }],
      ['PUT', `/children/${kid}/save`, { baseVersion: -1, deviceId: 'device-1234', seq: 1, contentVersion: 'x' }],
      ['PUT', `/children/${kid}/save`, { baseVersion: 0, deviceId: 'device-1234', seq: 1, contentVersion: 'x', mastery: [{ item: 'C001', way: 'rZE', da: 1, dc: 2, box: 0, due: 0, last: 0, wrongRun: 0 }] }],
      ['PUT', `/children/${kid}/save`, { baseVersion: 0, deviceId: 'device-1234', seq: 1, contentVersion: 'x', extra: 1 }],
      ['PUT', '/children/not-a-uuid/save', { baseVersion: 0, deviceId: 'device-1234', seq: 1, contentVersion: 'x' }],
      ['POST', `/children/${kid}/restore`, { backupId: 'drop table' }],
      ['DELETE', '/account', { confirm: 'yes', pin: '4821' }],
    ];
    for (const [m, path, body] of cases) {
      const r = await p.api(m, path, body);
      expect(r.status, `${m} ${path} ${JSON.stringify(body)}`).toBe(400);
      expect(r.body.error).toBe('bad_request');
    }
    const me = await p.api('GET', '/me');
    expect(me.body.children).toHaveLength(1);
    expect(me.body.children[0].nickname).toBe('Kid1');
  });
  it('rejects invalid JSON and oversized bodies', async () => {
    const p = await parent(t.db, 'size@example.com', { children: 1 });
    expect((await p.api('POST', '/children', '{nope')).status).toBe(400);
    const big = { nickname: 'A', avatar: 'fox', pad: 'x'.repeat(300 * 1024) };
    expect((await p.api('POST', '/children', big)).status).toBe(413);
  });
});
