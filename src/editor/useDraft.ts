/** One map's draft in the editor (level-editor.md §6.2, §6.4, §4.1): autosave 2 s after the last change and on blur, never blocked
 *  by validation errors; a stale draftRev offers "overwrite with mine" or "reload theirs"; offline, the unsent draft waits in
 *  localStorage and is retried; a golden map stays read-only until the owner confirms. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { editorApi } from './api';
import type { Level, Problem } from '../shared/level/types';

export type SaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'offline' | 'error';
export interface DraftDoc { level: Level; draftRev: number; state: string; publishedVersion: number }
const AUTOSAVE_MS = 2000, RETRY_MS = 10_000;
const stashKey = (id: string) => `chinese-rpg-editor-unsent:${id}`;

export function useDraft(id: string | null, onSaved: () => void) {
  const [doc, setDoc] = useState<DraftDoc | null>(null);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [serverProblems, setServerProblems] = useState<Problem[]>([]);
  const [goldenUnlocked, setGoldenUnlocked] = useState(false);
  const latest = useRef<Level | null>(null), dirty = useRef(false), inflight = useRef<Promise<'again' | 'done'> | null>(null);
  const rev = useRef(0), golden = useRef(false), timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    setDoc(null); setStatus('idle'); setGoldenUnlocked(false); golden.current = false; dirty.current = false;
    if (!id) return;
    let live = true;
    editorApi.get(id).then(r => {
      if (!live || r.status !== 200 || !r.body) { if (live) setStatus('error'); return; }
      let level = r.body.draft;
      rev.current = r.body.draftRev;
      const stash = localStorage.getItem(stashKey(id));
      if (stash && confirm('This device has unsent changes to this map from before. Use them?')) { level = JSON.parse(stash); dirty.current = true; }
      localStorage.removeItem(stashKey(id));
      latest.current = level;
      setDoc({ level, draftRev: r.body.draftRev, state: r.body.state, publishedVersion: r.body.publishedVersion });
      setServerProblems(r.body.validation ?? []);
      if (dirty.current) schedule(0);
    });
    return () => { live = false; window.clearTimeout(timer.current); };
  }, [id]);   // eslint-disable-line react-hooks/exhaustive-deps

  const saveNow = useCallback(async (): Promise<void> => {
    if (!id || !latest.current) return;
    if (inflight.current) { await inflight.current; if (!dirty.current) return; }
    const body = latest.current; dirty.current = false; setStatus('saving');
    const run = (async (): Promise<'again' | 'done'> => {
      const r = await editorApi.save(id, rev.current, body, golden.current).catch(() => null);
      if (r?.status === 200 && r.body) {
        rev.current = r.body.draftRev; setServerProblems(r.body.validation); setSavedAt(new Date());
        setDoc(d => d && { ...d, draftRev: r.body!.draftRev });
        localStorage.removeItem(stashKey(id)); setStatus(dirty.current ? 'unsaved' : 'saved'); onSaved(); return 'again';
      }
      if (r?.status === 409 && r.body?.error === 'golden_locked') {
        if (confirm('This map is golden. Change it?')) { golden.current = true; setGoldenUnlocked(true); dirty.current = true; return 'again'; }
        setStatus('error'); return 'done';
      }
      if (r?.status === 409 && r.body?.error === 'draft_conflict') {
        if (confirm('Someone saved this map since you opened it.\nOK = overwrite with mine, Cancel = reload theirs.')) { rev.current = r.body.draftRev; dirty.current = true; return 'again'; }
        const theirs = r.body.draft!, theirRev = r.body.draftRev;
        rev.current = theirRev; latest.current = theirs;
        setDoc(d => d && { ...d, level: theirs, draftRev: theirRev }); setStatus('saved'); return 'done';
      }
      dirty.current = true; localStorage.setItem(stashKey(id), JSON.stringify(body));
      setStatus(r ? 'error' : 'offline'); schedule(RETRY_MS); return 'done';
    })();
    inflight.current = run; const next = await run; inflight.current = null;
    if (dirty.current && next === 'again') await saveNow();
  }, [id, onSaved]);   // eslint-disable-line react-hooks/exhaustive-deps

  function schedule(ms: number) { window.clearTimeout(timer.current); timer.current = window.setTimeout(() => { void saveNow(); }, ms); }

  const edit = useCallback((f: (l: Level) => Level) => {
    setDoc(d => {
      if (!d) return d;
      const level = f(d.level); if (level === d.level) return d;
      latest.current = level; dirty.current = true; setStatus('unsaved'); schedule(AUTOSAVE_MS);
      return { ...d, level };
    });
  }, [saveNow]);   // eslint-disable-line react-hooks/exhaustive-deps

  /** Saves now (Publish waits for this so the published draft is the one on screen). */
  const flush = useCallback(async () => { window.clearTimeout(timer.current); if (dirty.current) await saveNow(); else if (inflight.current) await inflight.current; }, [saveNow]);

  useEffect(() => {
    const blur = () => { if (dirty.current) void flush(); };
    const unload = () => { if (dirty.current && id && latest.current) localStorage.setItem(stashKey(id), JSON.stringify(latest.current)); };
    window.addEventListener('blur', blur); window.addEventListener('beforeunload', unload);
    return () => { window.removeEventListener('blur', blur); window.removeEventListener('beforeunload', unload); };
  }, [flush, id]);

  const unlockGolden = () => { if (confirm('This map is golden. Change it?')) { golden.current = true; setGoldenUnlocked(true); } };
  const readOnly = !!doc && doc.state === 'golden' && !goldenUnlocked;
  const reload = useCallback(async () => {
    if (!id) return; const r = await editorApi.get(id);
    if (r.status === 200 && r.body) { rev.current = r.body.draftRev; latest.current = r.body.draft; setDoc({ level: r.body.draft, draftRev: r.body.draftRev, state: r.body.state, publishedVersion: r.body.publishedVersion }); }
  }, [id]);
  return { doc, status, savedAt, serverProblems, edit, flush, readOnly, unlockGolden, goldenConfirmed: () => golden.current, reload, draftRev: () => rev.current };
}
