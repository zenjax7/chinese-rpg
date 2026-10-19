/** Family accounts UI (architecture.md §5, §9, §12). Loaded ONLY in the accounts build (VITE_CLOUD_SAVE=1 → __CLOUD__): main.ts
 *  imports it behind `if (__CLOUD__)`, so the GitHub Pages build never contains it.
 *
 *  Screens: launch (guest or parent sign-in) → Google via Auth.js → first-sign-in consent → PIN set → receipt → parent area
 *  (children, export, delete account, sign out; behind the PIN) → "Who's playing?" picker → the game, saving through
 *  CloudSaveStore + outbox. A guest save on this device can be imported into a child once. If the API can't be reached (or
 *  Neon is paused, 503) a small banner shows and play continues on the local save; the outbox syncs later. */
import { ApiClient, type ApiResult } from '../net/api';
import { CLOUD_KEY, stateFromCloud, type CloudSave } from '../net/cloud';
import { Outbox, adoptServer, type KV } from '../net/outbox';
import { S, save, newState, store, CHILD_ID, childKey, KEY_V3, KEY_V4 } from '../engine/state';
import { BG } from '../assets';
import { view } from '../phaser/view';
import { unlockAudio } from '../audio/audio';
import { $, $$, esc, render, on, toast, modal, closeModal, zh, dlg, setTitle } from './dom';
import { accountHooks } from './screens';
import './account.css';

// ---------------------------------------------------------------- types, storage, API
export interface Child { id: string; nickname: string; avatar: string; speechMode?: string; lastPlayed?: string | null }
export interface Me { email: string | null; consentStatus: 'none' | 'granted' | 'confirmed' | 'revoked'; noticeVersion: string; needsConsent: boolean;
  needsConfirmation: boolean; unlocked: boolean; children: Child[] }
export const MAX_CHILDREN = 6;
export const AVATARS: [string, string][] = [['panda', '🐼'], ['tiger', '🐯'], ['rabbit', '🐰'], ['dragon', '🐲'], ['cat', '🐱'], ['fox', '🦊'], ['monkey', '🐵'], ['chick', '🐥']];
const AV: Record<string, string> = Object.fromEntries(AVATARS);
const avatarOf = (id: string) => AV[id] || '🙂';
const IMPORT_KEY = 'chinese-rpg-import';          // {importedTo, at} after an import, or {dismissed: at} after "Not now"
const kv: KV = {
  get: k => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* quota */ } },
  remove: k => { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};
/** Calls time out after 8 s so a sleeping database can't hang the launch screen. */
const api = new ApiClient('/api/v1', (u, i) => fetch(u, { ...i, signal: (AbortSignal as any).timeout?.(8000) }));
type R<T = any> = ApiResult<T> & { offline: boolean };
async function call<T = any>(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body?: unknown): Promise<R<T>> {
  let r: ApiResult<T>;
  try { r = await api.call<T>(method, path, body); } catch { r = { status: 0, body: null, retryAfterSec: null }; }
  const offline = r.status === 0 || r.status === 502 || r.status === 503 || r.status === 504;
  banner(offline ? 'offline' : null);
  return { ...r, offline };
}
const errMsg = (r: R, fallback = '出错了 Something went wrong.') => {
  const b: any = r.body; if (r.offline) return '☁️ 现在连不上 Can\'t reach the family account right now.';
  const issue = Array.isArray(b?.issues) && b.issues[0]?.message;
  return esc(issue && issue !== 'Invalid input' ? issue : b?.message || fallback);
};
const bi = (z: string, en: string) => `${zh(z)} ${en}`;
const maskEmail = (e: string | null) => { if (!e) return ''; const [u, d] = e.split('@'); return `${esc(u.slice(0, 1))}•••@${esc(d || '')}`; };
/** Account screens sit on the village art without the game HUD (body.acct-screen hides it until the game starts). */
const scene = () => { view.mode('town', undefined, BG.village()); setTitle(null); closeModal(); document.body.classList.add('acct-screen'); };

// ---------------------------------------------------------------- offline banner (§9.7)
type BannerKind = 'offline' | 'signedOut' | null;
export function banner(kind: BannerKind) {
  let b = document.getElementById('netBanner');
  if (!kind) { b?.remove(); return; }
  if (!b) { b = document.createElement('div'); b.id = 'netBanner'; b.setAttribute('role', 'status'); $('#frame-ui').appendChild(b); }
  b.dataset.testid = 'offline-banner'; b.dataset.kind = kind;
  b.innerHTML = kind === 'offline'
    ? `☁️ ${zh('离线')} Offline · ${zh('进度存在这台设备上')} Saved on this device, will sync later`
    : `☁️ ${zh('未登录')} Signed out · ${zh('进度存在这台设备上')} Saved on this device`;
}

// ---------------------------------------------------------------- Auth.js (Google) sign-in / sign-out
/** Auth.js wants a POSTed form with its double-submit CSRF token (§5.2); a top-level form post lets it redirect to Google. */
async function authForm(action: 'signin/google' | 'signout') {
  let token = '';
  try { const r = await fetch('/api/auth/csrf', { credentials: 'same-origin', cache: 'no-store' }); token = (await r.json()).csrfToken || ''; } catch { token = ''; }
  if (!token) { banner('offline'); toast('☁️ 现在不能登录 Sign-in is not reachable right now. Guest play still works.'); return false; }
  const f = document.createElement('form'); f.method = 'POST'; f.action = `/api/auth/${action}`; f.style.display = 'none';
  const back = location.origin + location.pathname;
  for (const [k, v] of [['csrfToken', token], ['callbackUrl', back]]) { const i = document.createElement('input'); i.type = 'hidden'; i.name = k; i.value = v; f.appendChild(i); }
  document.body.appendChild(f); f.submit();
  return true;
}
export const signIn = () => authForm('signin/google');
async function signOut() { kv.remove(CLOUD_KEY); await authForm('signout'); }

// ---------------------------------------------------------------- the guest save on this device (§12.2)
const hasProgress = (s: any) => !!s && (s.level > 1 || Object.keys(s.prog || {}).length > 0 || Object.keys(s.quests || {}).length > 0);
/** The local guest save worth importing (the one with more progress of the classic v3 and graph v4 saves), or null. */
export function guestSave(): { key: string; save: any } | null {
  if (kv.get(IMPORT_KEY)) return null;   // imported already, or the parent said "Not now"
  const read = (k: string) => { try { return JSON.parse(kv.get(k) || 'null'); } catch { return null; } };
  const c = [KEY_V4, KEY_V3].map(key => ({ key, save: read(key) })).filter(x => x.save?.version === 3 && hasProgress(x.save));
  c.sort((a, b) => (b.save.level - a.save.level) || (Object.keys(b.save.prog || {}).length - Object.keys(a.save.prog || {}).length));
  return c[0] || null;
}

// ---------------------------------------------------------------- PIN keypad (§5.5)
type PinOutcome = { ok: true } | { ok: false; msg: string; locked?: boolean };
/** A 4–6 digit keypad. mode 'set' asks twice. onPin returns ok, or the message to show (the API's lockout message included). */
function keypad(o: { testid: string; title: string; sub: string; mode: 'set' | 'enter'; onPin: (pin: string) => Promise<PinOutcome>; onCancel?: () => void }) {
  let pin = '', first = '', busy = false, locked = false;
  const m = modal(`<div class="panel pinpad" data-testid="${o.testid}"><h2>${o.title}</h2><p class="muted" id="pinsub">${o.sub}</p>
    <div class="pindots" data-testid="pin-dots"></div><div class="pinmsg" data-testid="pin-msg" id="pinmsg"></div>
    <div class="keys">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => `<button class="secondary" data-d="${d}" data-key="${d}" data-testid="pin-key-${d}">${d}</button>`).join('')}
      <button class="ghost" data-del data-testid="pin-del" aria-label="Delete">⌫</button><button class="secondary" data-d="0" data-testid="pin-key-0">0</button>
      <button data-ok data-key="enter" data-testid="pin-ok" aria-label="OK">✓</button></div>
    ${o.onCancel ? `<button class="ghost small" id="pincancel" data-testid="pin-cancel">${bi('取消', 'Cancel')}</button>` : ''}</div>`)
    .querySelector('.pinpad') as HTMLElement;   // listeners go on the panel, so they die with it when the modal shows something else
  const paint = () => {
    $('.pindots', m).innerHTML = Array.from({ length: 6 }, (_, i) => `<i class="${i < pin.length ? 'on' : ''}${i >= 4 ? ' opt' : ''}"></i>`).join('');
    $$('button[data-d],button[data-del]', m).forEach(b => ((b as HTMLButtonElement).disabled = busy || locked));
    ($('[data-ok]', m) as HTMLButtonElement).disabled = busy || locked || pin.length < 4;
  };
  const say = (html: string, bad = true) => { const e = $('#pinmsg', m); e.innerHTML = html; e.classList.toggle('bad', bad); };
  const alive = () => m.isConnected;
  m.addEventListener('click', async e => {
    const b = (e.target as HTMLElement).closest('button') as HTMLButtonElement | null; if (!b || b.disabled) return;
    if (b.dataset.d !== undefined) { if (pin.length < 6) pin += b.dataset.d; }
    else if (b.hasAttribute('data-del')) pin = pin.slice(0, -1);
    else if (b.hasAttribute('data-ok')) {
      if (o.mode === 'set' && !first) { first = pin; pin = ''; $('#pinsub', m).innerHTML = bi('再输一次', 'Enter the same PIN again'); say('', false); paint(); return; }
      if (o.mode === 'set' && pin !== first) { first = ''; pin = ''; $('#pinsub', m).innerHTML = o.sub; say(bi('两次不一样', 'The two PINs did not match. Start again.')); paint(); return; }
      busy = true; paint(); say(bi('请稍等', 'Checking…'), false);
      const r = await o.onPin(pin); busy = false;
      if (r.ok || !alive()) return;   // done: the next screen has replaced the keypad
      { pin = ''; if (o.mode === 'set') { first = ''; $('#pinsub', m).innerHTML = o.sub; } locked = !!r.locked; say(r.msg); m.toggleAttribute('data-locked', locked); }
    } else if (b.id === 'pincancel') { closeModal(); o.onCancel?.(); return; }
    paint();
  });
  paint();
  return m;
}
/** Maps a PIN answer from the API (unlock, consent, delete) to what the keypad shows. */
function pinAnswer(r: R): PinOutcome {
  const b: any = r.body || {};
  if (r.status === 200) return { ok: true };
  if (r.status === 423 || b.error === 'pin_locked') {
    const until = b.until ? new Date(b.until) : null;
    const t = until ? until.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
    return { ok: false, locked: true, msg: `🔒 ${esc(b.message || 'Too many wrong PINs. Try again later.')}${t ? ` ${zh('请在')} ${esc(t)} ${zh('以后再试')} (try again after ${esc(t)})` : ''}` };
  }
  if (b.error === 'wrong_pin') return { ok: false, msg: `${bi('密码不对', 'Wrong PIN.')}${Number.isFinite(b.attemptsLeft) ? ` ${b.attemptsLeft} ${b.attemptsLeft === 1 ? 'try' : 'tries'} left.` : ''}` };
  return { ok: false, msg: errMsg(r) };
}
/** Asks for the PIN and unlocks the parent area for 10 minutes (POST /parent/unlock). */
function unlockThen(then: () => void, onCancel?: () => void) {
  keypad({ testid: 'pin-enter', title: `🔒 ${bi('家长密码', 'Parent PIN')}`, sub: bi('请输入家长密码', 'Enter your 4–6 digit parent PIN'), mode: 'enter', onCancel,
    onPin: async pin => { const r = await call('POST', '/parent/unlock', { pin }); const a = pinAnswer(r); if (a.ok) { closeModal(); then(); } return a; } });
}
/** Runs a parent-area call; if the 10-minute unlock ran out (403 pin_required) it asks for the PIN and tries once more. */
async function withUnlock<T>(fn: () => Promise<R<T>>): Promise<R<T> | null> {
  const r = await fn();
  if ((r.body as any)?.error !== 'pin_required') return r;
  return new Promise(res => unlockThen(async () => res(await fn()), () => res(null)));
}

// ---------------------------------------------------------------- 1. launch screen
export function launchScreen(start: () => void) {
  scene();
  render(`<div class="acct-title" data-testid="title-screen">
    <div class="logo">🐉 ${zh('中文大冒险', 'zh big')}<div class="en">Chinese Quest</div></div>
    <div class="acct-buttons">
      <button id="guest" data-testid="play-guest" data-key="enter">▶ ${bi('游客', 'Play as guest')}<span class="en">${zh('进度只存在这台设备上')} Progress stays on this device</span></button>
      <button class="secondary" id="signin" data-testid="parent-signin">👪 ${bi('家长登录', 'Parent sign-in with Google')}<span class="en">${zh('跨设备保存进度')} Save progress across devices</span></button>
    </div></div>`);
  on('#guest', () => { unlockAudio(); start(); });
  on('#signin', () => { void signIn(); });
}

// ---------------------------------------------------------------- 2. consent at first sign-in (§5.3, §5.8)
export function consentScreen(me: Me) {
  scene();
  const again = me.consentStatus !== 'none';
  render(dlg({ testid: 'account-consent', close: false, cls: 'wide', title: `👪 ${bi('家长同意', 'Parent consent')}`, body: `
    <p>${bi('已登录', 'Signed in as')} <b data-testid="consent-email">${maskEmail(me.email)}</b> <span class="muted">(verified by Google)</span></p>
    ${again ? `<div class="banner">${bi('通知已更新', 'Our privacy notice has changed. Please read it and agree again.')}</div>` : ''}
    <div class="card notice" data-testid="consent-notice">
      <p><b>Progress is saved to your family account.</b> We store your email, your children's nicknames and avatars, and game progress
      (levels, items, quests and which words they know). <b>No ads, no tracking, no audio.</b> You can export or delete everything at any time.</p>
      <ul><li>Children never sign in and never give an email. Use a nickname, not a real name.</li>
      <li>We don't keep your name or photo from Google, or any Google tokens.</li>
      <li>The answer log and speech results stay on this device.</li>
      <li>The parent area is behind a PIN that you set next. Your children won't need it to play.</li></ul>
      <p class="muted">Notice version <b data-testid="notice-version">${esc(me.noticeVersion)}</b></p></div>
    <label class="check"><input type="checkbox" id="agreeck" data-testid="consent-check"> I am the parent or legal guardian, I am 18 or older, and I agree to this notice.</label>`,
    foot: `<button class="ghost" id="cso" data-testid="consent-signout">${bi('退出', 'Sign out')}</button>
      <button id="agree" data-testid="consent-agree" data-key="enter" disabled>✓ ${bi('同意', 'Agree')}</button>` }));
  const ck = $('#agreeck') as HTMLInputElement, ag = $('#agree') as HTMLButtonElement;
  ck.addEventListener('change', () => (ag.disabled = !ck.checked));
  on('#cso', () => void signOut());
  on('#agree', () => {
    if (!ck.checked) return;
    const send = async (pin: string): Promise<PinOutcome> => {
      const r = await call('POST', '/consent', { noticeVersion: me.noticeVersion, pin, attest: true });
      if (r.status !== 200) return r.body && (r.body as any).error === 'bad_request' ? { ok: false, msg: errMsg(r) } : pinAnswer(r);
      closeModal(); receiptScreen((r.body as any).receipt, pin); return { ok: true };
    };
    if (again) keypad({ testid: 'pin-enter', title: `🔒 ${bi('家长密码', 'Parent PIN')}`, sub: bi('请输入家长密码', 'Enter your parent PIN to agree'), mode: 'enter', onPin: send, onCancel: () => {} });
    else keypad({ testid: 'pin-set', title: `🔒 ${bi('设置家长密码', 'Set a parent PIN')}`, sub: bi('选4到6位数字', 'Choose 4 to 6 digits. Children won\'t need it to play.'), mode: 'set', onPin: send, onCancel: () => {} });
  });
}
function receiptScreen(rc: any, pin: string) {
  const at = rc?.at ? new Date(rc.at) : new Date();
  render(dlg({ testid: 'consent-receipt', close: false, title: `✅ ${bi('谢谢', 'Consent recorded')}`, body: `
    <div class="card"><p>On <b>${esc(at.toLocaleString())}</b> you agreed to notice <b>${esc(rc?.noticeVersion || '')}</b> (receipt #${esc(rc?.id || '')}).</p>
    <ul><li><b>What we store:</b> your email, children's nicknames and avatars, game progress.</li>
    <li><b>Export or delete:</b> any time in the parent area (👪, behind your PIN).</li>
    <li><b>Change your mind:</b> deleting the account removes everything.</li></ul>
    <p class="muted">You can print this page or save it as a PDF from your browser.</p></div>`,
    foot: `<button id="rcok" data-testid="receipt-continue" data-key="enter">${bi('继续', 'Continue')} ▶</button>` }));
  on('#rcok', async () => {
    await call('POST', '/parent/unlock', { pin });   // the PIN was just set: open the parent area without asking again
    const me = await loadMe(); if (me) parentArea(me, { firstRun: true });
  });
}

// ---------------------------------------------------------------- 4. parent area (behind the PIN)
async function loadMe(): Promise<Me | null> { const r = await call<Me>('GET', '/me'); return r.status === 200 ? r.body : null; }
export function openParentArea() {
  unlockThen(async () => { const me = await loadMe(); if (me) parentArea(me); }, () => {});
}
export function parentArea(me: Me, opt: { firstRun?: boolean } = {}) {
  scene();
  const n = me.children.length, full = n >= MAX_CHILDREN, gs = guestSave();
  render(dlg({ testid: 'parent-area', cls: 'wide', title: `👪 ${bi('家长区', 'Parent area')}`, body: `
    <p class="muted">${bi('已登录', 'Signed in as')} ${maskEmail(me.email)} · ${zh('十分钟后自动锁上')} Locks again after 10 minutes</p>
    ${me.needsConfirmation ? `<div class="card" data-testid="confirm-consent">Please confirm: you allowed ${n} child profile${n === 1 ? '' : 's'} to save progress. Keep this?
      <button class="small" id="cconf" data-testid="confirm-consent-ok">${bi('确认', 'Confirm')}</button></div>` : ''}
    ${opt.firstRun && !n ? `<div class="card hint">${bi('先加一个孩子', 'Add your first player to start.')}</div>` : ''}
    <h3>${bi('孩子', 'Players')} <span class="muted" data-testid="pa-count">${n} / ${MAX_CHILDREN}</span></h3>
    <div class="pa-kids" data-testid="pa-children">${me.children.map(c => `<div class="pa-kid" data-testid="pa-child" data-id="${esc(c.id)}">
      <span class="av">${avatarOf(c.avatar)}</span><b class="nick">${esc(c.nickname)}</b>
      <button class="secondary small" data-ren="${esc(c.id)}" data-testid="pa-rename">✏️ ${bi('改名', 'Rename')}</button>
      <button class="danger small" data-del="${esc(c.id)}" data-testid="pa-delete">🗑 ${bi('删除', 'Delete')}</button></div>`).join('')}</div>
    <div class="row left"><button id="padd" data-testid="pa-add" ${full ? 'disabled' : ''}>➕ ${bi('加孩子', 'Add a player')}</button>
      ${full ? `<span class="muted" data-testid="pa-cap">${bi('最多六个', 'A family can have up to 6 players.')}</span>` : ''}
      ${gs && n ? `<button class="secondary" id="pimp" data-testid="pa-import">📥 ${bi('导入', 'Import this device\'s guest save')}</button>` : ''}</div>
`,
    foot: `<button class="secondary" id="pexp" data-testid="pa-export">⬇️ ${bi('导出', 'Export data')}</button>
      <button class="ghost" id="pso" data-testid="pa-signout">${bi('退出', 'Sign out')}</button>
      <button class="danger" id="pdelacc" data-testid="pa-delete-account">⚠️ ${bi('删除账户', 'Delete account')}</button>
      <button id="pdone" data-testid="pa-done" data-key="enter" ${n ? '' : 'disabled'}>${bi('谁在玩', 'Who\'s playing?')} ▶</button>` }));
  const refresh = async () => { const m2 = await loadMe(); if (m2) parentArea(m2); };
  on('#back', () => pickerScreen(me));
  on('#pdone', async () => { const m2 = await loadMe(); pickerScreen(m2 || me); });
  on('#padd', () => childForm(null, async c => { const m2 = await loadMe(); if (!m2) return;
    if (m2.children.length === 1 && guestSave()) importPrompt(m2, () => parentArea(m2)); else parentArea(m2); void c; }));
  on('[data-ren]', (_e, el) => childForm(me.children.find(c => c.id === el.dataset.ren) || null, refresh));
  on('[data-del]', (_e, el) => deleteChild(me.children.find(c => c.id === el.dataset.del)!, refresh));
  on('#pimp', () => importPrompt(me, refresh));
  on('#cconf', async () => { const r = await withUnlock(() => call('POST', '/consent/confirm', {})); if (r?.status === 200) { toast(bi('已确认', 'Confirmed. Thank you!')); refresh(); } else if (r) toast(errMsg(r)); });
  on('#pexp', async () => {
    const r = await withUnlock(() => call('GET', '/export')); if (!r) return;
    if (r.status !== 200) { toast(errMsg(r)); return; }
    const url = URL.createObjectURL(new Blob([JSON.stringify(r.body, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `chinese-quest-export-${new Date().toISOString().slice(0, 10)}.json`; a.dataset.testid = 'export-link';
    document.body.appendChild(a); a.click(); setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1000);
    toast(bi('已导出', 'Export downloaded.'));
  });
  on('#pso', () => void signOut());
  on('#pdelacc', () => deleteAccount());
}
/** Add (child = null) or rename a child: a nickname (no real names; the API blocks emails, phones and links) and an avatar. */
function childForm(child: Child | null, done: (c: Child) => void) {
  let av = child?.avatar || AVATARS[Math.floor(Math.random() * AVATARS.length)][0];
  const m = modal(`<div class="panel childform" data-testid="child-form"><h2>${child ? `✏️ ${bi('改名', 'Rename')}` : `➕ ${bi('加孩子', 'Add a player')}`}</h2>
    <label>${bi('昵称', 'Nickname')} <input type="text" id="cnick" data-testid="child-nickname" maxlength="16" autocomplete="off" value="${esc(child?.nickname || '')}"></label>
    <p class="muted">${zh('请用昵称，不要用真名')} Use a nickname, not a real name.</p>
    <div class="avatars">${AVATARS.map(([id, e]) => `<button class="secondary av${id === av ? ' sel' : ''}" data-av="${id}" data-testid="avatar-${id}" aria-label="${id}">${e}</button>`).join('')}</div>
    <div class="pinmsg bad" id="cerr" data-testid="child-err"></div>
    <div class="row"><button class="ghost" id="ccancel" data-testid="child-cancel">${bi('取消', 'Cancel')}</button>
      <button id="csave" data-testid="child-save" data-key="enter">✓ ${bi('保存', 'Save')}</button></div></div>`);
  ($('#cnick', m) as HTMLInputElement).focus();
  on('[data-av]', (_e, el) => { av = el.dataset.av!; $$('[data-av]', m).forEach(b => b.classList.toggle('sel', b === el)); }, m);
  on('#ccancel', closeModal, m);
  on('#csave', async () => {
    const nickname = ($('#cnick', m) as HTMLInputElement).value.trim();
    if (!nickname) { $('#cerr', m).innerHTML = bi('请写昵称', 'Please type a nickname.'); return; }
    const r = await withUnlock(() => child ? call('PATCH', `/children/${child.id}`, { nickname, avatar: av }) : call('POST', '/children', { nickname, avatar: av }));
    if (!r) return;
    if (r.status !== 200) { if (!$('#cerr')) childForm(child, done); $('#cerr').innerHTML = r.body && (r.body as any).error === 'child_limit' ? bi('最多六个', 'A family can have up to 6 players.') : errMsg(r); return; }
    closeModal(); toast(child ? bi('改好了', 'Saved.') : `${avatarOf(av)} ${esc(nickname)} ${bi('加好了', 'added!')}`); done(r.body as Child);
  }, m);
}
function deleteChild(c: Child, done: () => void) {
  const m = modal(`<div class="panel" data-testid="delete-child-confirm" style="width:760px;text-align:center"><h2>🗑 ${bi('删除', 'Delete')} ${avatarOf(c.avatar)} ${esc(c.nickname)}?</h2>
    <p>All of ${esc(c.nickname)}'s progress, items and words are deleted for good. This cannot be undone.</p>
    <div class="row"><button class="secondary" id="dno" data-testid="delete-child-cancel" data-key="enter">${bi('不删', 'Keep')}</button>
      <button class="danger" id="dyes" data-testid="delete-child-yes">${bi('删除', 'Delete')}</button></div></div>`);
  on('#dno', closeModal, m);
  on('#dyes', () => keypad({ testid: 'pin-enter', title: `🔒 ${bi('家长密码', 'Parent PIN')}`, sub: bi('删除前再输一次密码', 'Enter your PIN again to delete'), mode: 'enter', onCancel: () => {},
    onPin: async pin => { const r = await withUnlock(() => call('DELETE', `/children/${c.id}`, { pin })); if (!r) return { ok: false, msg: '' };
      const a = pinAnswer(r); if (a.ok) { forgetChild(c.id); closeModal(); toast(bi('已删除', 'Deleted.')); done(); } return a; } }), m);
}
function forgetChild(id: string) {
  if (CHILD_ID === id || kv.get(CLOUD_KEY)?.includes(id)) kv.remove(CLOUD_KEY);
  kv.remove(childKey(id)); kv.remove(`chinese-rpg-outbox-v1:${id}`);
}
function deleteAccount() {
  const m = modal(`<div class="panel" data-testid="delete-account-confirm" style="width:860px;text-align:center"><h2>⚠️ ${bi('删除账户', 'Delete the family account?')}</h2>
    <p>This deletes your account, every player and all their progress. It cannot be undone. Type <b>DELETE</b> to confirm.</p>
    <input type="text" id="dtype" data-testid="delete-account-type" autocomplete="off" style="width:240px">
    <div class="row" style="margin-top:12px"><button class="secondary" id="dno" data-testid="delete-account-cancel">${bi('不删', 'Keep my account')}</button>
      <button class="danger" id="dyes" data-testid="delete-account-yes" disabled>${bi('删除', 'Delete everything')}</button></div></div>`);
  const t = $('#dtype', m) as HTMLInputElement, y = $('#dyes', m) as HTMLButtonElement;
  t.addEventListener('input', () => (y.disabled = t.value.trim() !== 'DELETE'));
  on('#dno', closeModal, m);
  on('#dyes', () => keypad({ testid: 'pin-enter', title: `🔒 ${bi('家长密码', 'Parent PIN')}`, sub: bi('删除前再输一次密码', 'Enter your PIN to delete the account'), mode: 'enter', onCancel: () => {},
    onPin: async pin => { const r = await withUnlock(() => call('DELETE', '/account', { confirm: 'DELETE', pin })); if (!r) return { ok: false, msg: '' };
      const a = pinAnswer(r); if (!a.ok) return a;
      kv.remove(CLOUD_KEY); kv.remove(IMPORT_KEY);
      for (let i = localStorage.length - 1; i >= 0; i--) { const k = localStorage.key(i) || ''; if (k.startsWith(`${KEY_V4}:child:`) || k.startsWith('chinese-rpg-outbox-v1:')) kv.remove(k); }
      closeModal(); toast(bi('账户已删除', 'Your account was deleted.')); setTimeout(() => location.replace(location.pathname), 1200); return a; } }), m);
}

// ---------------------------------------------------------------- 6. import the guest save (§12.2)
export function importPrompt(me: Me, done: () => void) {
  const gs = guestSave(); if (!gs) { done(); return; }
  const full = me.children.length >= MAX_CHILDREN;
  const m = modal(`<div class="panel" data-testid="import-prompt" style="width:980px;text-align:center"><h2>📥 ${bi('带上这台设备的冒险', 'Bring this device\'s adventure along?')}</h2>
    <p>This device has a guest save at <b>Lv ${gs.save.level | 0}</b>. Which player should get it?</p>
    <div class="tiles small">${me.children.map(c => `<button class="tile" data-to="${esc(c.id)}" data-testid="import-to"><span class="av">${avatarOf(c.avatar)}</span><span class="nick">${esc(c.nickname)}</span></button>`).join('')}
      ${full ? '' : `<button class="tile ghost" id="inew" data-testid="import-new"><span class="av">➕</span><span class="nick">${bi('新的', 'New player')}</span></button>`}</div>
    <div class="pinmsg bad" id="ierr" data-testid="import-err"></div>
    <div class="row"><button class="ghost" id="ilater" data-testid="import-later">${bi('以后再说', 'Not now')}</button></div></div>`);
  const go = async (id: string) => {
    const r = await call('POST', `/children/${id}/import`, { contentVersion: 'graph', save: gs.save });
    if (r.status !== 200) { if ($('#ierr')) $('#ierr').innerHTML = errMsg(r); else toast(errMsg(r)); return; }
    const day = new Date().toISOString().slice(0, 10);
    kv.set(`${gs.key}.imported-${day}`, kv.get(gs.key) || ''); kv.remove(gs.key);   // kept as a backup (§12.2 step 4)
    kv.set(IMPORT_KEY, JSON.stringify({ importedTo: id, at: Date.now(), from: gs.key }));
    closeModal(); toast(bi('导入好了', 'Imported!')); done();
  };
  on('[data-to]', (_e, el) => void go(el.dataset.to!), m);
  on('#inew', () => childForm(null, c => void go(c.id)), m);
  on('#ilater', () => { kv.set(IMPORT_KEY, JSON.stringify({ dismissed: Date.now() })); closeModal(); done(); }, m);
}

// ---------------------------------------------------------------- 5. "Who's playing?" and loading a child's cloud save
export function pickerScreen(me: Me) {
  scene();
  const kids = me.children;
  render(`<div class="acct-pick" data-testid="child-picker"><h1>${zh('谁在玩？', 'zh big')} <span class="en">Who's playing?</span></h1>
    <div class="tiles">${kids.map(c => `<button class="tile" data-pick="${esc(c.id)}" data-testid="pick-child"><span class="av">${avatarOf(c.avatar)}</span><span class="nick">${esc(c.nickname)}</span></button>`).join('')}
      ${kids.length ? '' : `<div class="card" data-testid="picker-empty">${bi('请家长加一个孩子', 'Ask a grown-up to add a player in the parent area.')}</div>`}</div>
    ${guestSave() && kids.length ? `<div class="card import-hint" data-testid="picker-import">📥 ${bi('这台设备有游客进度', 'This device has a guest save.')} <button class="secondary small" id="pkimp">${bi('导入', 'Import…')}</button></div>` : ''}
    <div class="row"><button class="ghost" id="pkguest" data-testid="picker-guest">${bi('游客', 'Play as guest')}</button>
      <button class="ghost" id="pkparent" data-testid="picker-parent">👪 ${bi('家长区', 'Parent area')}</button></div></div>`);
  on('[data-pick]', (_e, el) => { unlockAudio(); void pickChild(kids.find(c => c.id === el.dataset.pick)!); });
  on('#pkparent', () => openParentArea());
  on('#pkimp', () => unlockThen(() => importPrompt(me, async () => { const m2 = await loadMe(); pickerScreen(m2 || me); }), () => {}));
  on('#pkguest', () => { kv.remove(CLOUD_KEY); location.replace(location.pathname + '?guest=1'); });
}
/** One tap: GET the child's cloud save, make it this device's local mirror for that child (unless this device has newer, unsent
 *  play for them), point CloudSaveStore at the child and restart into the game. Offline: play on the local mirror if there is one. */
export async function pickChild(c: Child, opt: { force?: boolean } = {}) {
  $$('[data-pick]').forEach(b => ((b as HTMLButtonElement).disabled = true));
  const r = await call<CloudSave>('GET', `/children/${c.id}/save`);
  const box = new Outbox(kv, new ApiClient(), c.id, 'graph');
  const mirror = kv.get(childKey(c.id));
  if (r.status === 200 && r.body) {
    const server = r.body;
    if (opt.force || !mirror || (!box.hasWork && server.version > box.version)) {
      const st = stateFromCloud(server, newState() as any) ?? { ...newState(), consent: { given: true, speech: true, at: Date.now() } };
      kv.set(childKey(c.id), JSON.stringify(st)); adoptServer(kv, c.id, server.version, st);
    }
  } else if (r.offline) {
    if (!mirror) { toast(`☁️ ${bi('现在打不开', 'Can\'t load')} ${esc(c.nickname)}${zh('的进度')} right now. Try again soon.`); $$('[data-pick]').forEach(b => ((b as HTMLButtonElement).disabled = false)); return; }
  } else { toast(errMsg(r)); $$('[data-pick]').forEach(b => ((b as HTMLButtonElement).disabled = false)); return; }
  kv.set(CLOUD_KEY, JSON.stringify({ childId: c.id, nickname: c.nickname, avatar: c.avatar }));
  location.replace(location.pathname);
}

// ---------------------------------------------------------------- boot
/** Called by main.ts instead of the normal start in the accounts build. */
export async function accountBoot(startGame: () => void) {
  const start = () => { document.body.classList.remove('acct-screen'); startGame(); };
  accountHooks.switchPlayer = switchPlayer;
  window.addEventListener('cloudsave:result', (e: any) => {
    const r = e.detail; if (!r) return;
    if (r.kind === 'retry' && (r.status === 0 || r.status >= 500)) banner('offline');
    else if (r.kind === 'signedOut') banner('signedOut');
    else if (r.kind === 'sent' || r.kind === 'conflict') banner(null);
  });
  window.addEventListener('cloudsave:server-newer', () => {
    const c = cur(); if (!c) return;
    toast(`☁️ ${bi('云端有更新的进度', 'A newer save is in the cloud.')} <button class="small" data-testid="load-newer" id="loadnewer">${bi('载入', 'Load it')}</button>`);
    on('#loadnewer', () => void pickChild({ id: c.childId, nickname: c.nickname || '', avatar: c.avatar || '' }, { force: true }));
  });
  if (CHILD_ID) {   // a child is playing on this device: straight into the game; check the session in the background
    if (!S.consent.given) { S.consent = { given: true, speech: true, at: Date.now() }; save(); }   // Jack 2026-10-18: child profiles have speech on; ⏸️ → Parents turns it off
    start(); badge();
    const r = await call('GET', '/me');
    if (r.status === 401) banner('signedOut');
    else if (r.status === 200 && kv.get(`chinese-rpg-outbox-v1:${CHILD_ID}`)?.match(/"(inflight|pending)":\{/)) { save(); store.trigger('online'); }   // unsent play from last time
    return;
  }
  if (/[?&]guest=1\b/.test(location.search)) { history.replaceState(null, '', location.pathname); start(); return; }
  scene(); render(`<div class="acct-title" data-testid="account-loading"><div class="logo">🐉</div></div>`);
  const r = await call<Me>('GET', '/me');
  if (r.status === 200 && r.body) { const me = r.body; if (me.needsConsent) consentScreen(me); else pickerScreen(me); return; }
  launchScreen(start);
}
const cur = (): { childId: string; nickname?: string; avatar?: string } | null => { try { return JSON.parse(kv.get(CLOUD_KEY) || 'null'); } catch { return null; } };
/** A small chip with who is playing (top centre-right), so a shared tablet shows whose save this is. */
function badge() {
  const c = cur(); if (!c) return;
  const b = document.createElement('div'); b.id = 'playerChip'; b.dataset.testid = 'player-chip'; b.innerHTML = `${avatarOf(c.avatar || '')} ${esc(c.nickname || '')}`;
  $('#frame-ui').appendChild(b);
}
/** "Switch player" in the game menu: save now, forget the chosen child on this device and go back to the picker (or the launch screen). */
export function switchPlayer() {
  try { save(); store.trigger('pagehide'); } catch { /* ignore */ }
  kv.remove(CLOUD_KEY);
  setTimeout(() => location.replace(location.pathname), 150);
}
