/** The /editor app (level-editor.md §5.3): sign-in gate, map list, graph canvas, inspector, and the dialogue / settings / word-pool
 *  panels, with autosave, live validation, Publish… and Download JSON. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { editorApi, authForm, type MapRow } from './api';
import { useDraft } from './useDraft';
import { Canvas, type CanvasMode } from './Canvas';
import { ConfirmHost } from './confirm';
import { resolveMapBg, type MapBg } from './map-bg';
import { Inspector } from './Inspector';
import { DialogueEditor } from './DialogueEditor';
import { WordPool } from './WordPool';
import { MapSettings } from './MapSettings';
import { PublishDialog } from './PublishDialog';
import * as X from './level-edit';
import { validateLevel } from '../shared/level/validate';
import { WORD_IDS } from '../shared/level/wordbank';
import type { NodeRef, Problem } from '../shared/level/types';

type Auth = { state: 'loading' } | { state: 'signedOut' } | { state: 'notEditor' } | { state: 'error' } | { state: 'ok'; role: string };
const BADGE: Record<string, string> = { draft: 'D', beta: 'β', golden: 'G' };

export function App() {
  const [auth, setAuth] = useState<Auth>({ state: 'loading' });
  useEffect(() => {
    editorApi.me().then(r => setAuth(r.status === 200 ? { state: 'ok', role: r.body!.role } : r.status === 401 ? { state: 'signedOut' } : r.status === 403 ? { state: 'notEditor' } : { state: 'error' }))
      .catch(() => setAuth({ state: 'error' }));
  }, []);
  if (auth.state === 'loading') return <div className="gate">Loading…</div>;
  if (auth.state === 'signedOut') return <div className="gate" data-testid="ed-signin"><h1>Map editor</h1><button onClick={() => authForm('signin/google')}>Sign in with Google</button></div>;
  if (auth.state === 'notEditor') return <div className="gate" data-testid="ed-not-editor"><h1>Map editor</h1><p>This Google account is not on the editor list.</p><button onClick={() => authForm('signout')}>Sign out</button></div>;
  if (auth.state === 'error') return <div className="gate"><h1>Map editor</h1><p>The editor can’t reach the server right now. Try again in a minute.</p></div>;
  return <Editor role={auth.role} />;
}

function Editor({ role }: { role: string }) {
  const [maps, setMaps] = useState<MapRow[]>([]);
  const [search, setSearch] = useState('');
  const [current, setCurrent] = useState<string | null>(() => new URLSearchParams(location.search).get('map'));
  const [sel, setSel] = useState<{ node?: string; edge?: string }>({});
  const [tab, setTab] = useState<'dialogue' | 'settings' | 'words' | 'problems'>('dialogue');
  const [publishing, setPublishing] = useState(false);
  const [characters, setCharacters] = useState<string[]>([]);
  const [audio, setAudio] = useState<Set<string>>(new Set());
  const [bgManifest, setBgManifest] = useState<Record<string, string> | null>(null);
  const [bg, setBg] = useState<MapBg | null | 'loading'>('loading');
  const [mode, setMode] = useState<CanvasMode>('select');
  const [mapsOpen, setMapsOpen] = useState(false);
  const refreshList = useCallback(() => { editorApi.list().then(r => { if (r.status === 200 && r.body) setMaps(r.body.levels); }); }, []);
  const d = useDraft(current, refreshList);
  const owner = role === 'owner';
  const readOnly = !owner || d.readOnly;

  const reloadAssets = useCallback(() => {   // §2.7: pickers from the deployed manifests, no-store
    fetch('/portraits/portraits_index.json', { cache: 'no-store' }).then(r => r.json()).then(j => setCharacters(j.characters.map((c: { id: string }) => c.id))).catch(() => {});
    fetch('/assets-manifest.json', { cache: 'no-store' }).then(r => r.json()).then(j => { setAudio(new Set(Object.keys(j.vo ?? {}).map(k => k.replace(/^vo\//, '')))); setBgManifest(j.bg ?? {}); }).catch(() => setBgManifest({}));
  }, []);
  useEffect(() => { refreshList(); reloadAssets(); window.addEventListener('focus', reloadAssets); return () => window.removeEventListener('focus', reloadAssets); }, [refreshList, reloadAssets]);
  const open = (id: string) => { void d.flush(); setCurrent(id); setSel({}); setMode('select'); setMapsOpen(false); history.replaceState(null, '', `/editor?map=${id}`); };
  useEffect(() => {   // the map screen's background art for this map, from the deployed manifest (map-bg.ts)
    if (!current || !bgManifest) { setBg('loading'); return; }
    let live = true; setBg('loading'); resolveMapBg(current, bgManifest).then(b => { if (live) setBg(b); }).catch(() => { if (live) setBg(null); });
    return () => { live = false; };
  }, [current, bgManifest]);

  const level = d.doc?.level ?? null;
  const problems: Problem[] = useMemo(() => {
    if (!level) return [];
    return validateLevel(level, { words: WORD_IDS });   // links to other maps are checked by the server on save
  }, [level]);
  const errorAt = useMemo(() => new Set(problems.filter(p => p.level === 'error' && p.at).map(p => p.at!)), [problems]);
  const allProblems = useMemo(() => { const seen = new Set<string>(); return [...problems, ...d.serverProblems].filter(p => { const k = p.code + p.msg; if (seen.has(k)) return false; seen.add(k); return true; }); }, [problems, d.serverProblems]);
  const errors = allProblems.filter(p => p.level === 'error').length, warnings = allProblems.length - errors;

  /** The other half of a cross-map pair (§2.3) is saved on the target map's draft right away. */
  const onPair = async (op: 'add' | 'remove', target: NodeRef, back: NodeRef, kind: string) => {
    const r = await editorApi.get(target.graph); if (r.status !== 200 || !r.body) { alert(`Could not open ${target.graph} to update its side of the link.`); return; }
    const next = op === 'add' ? X.addPair(r.body.draft, target.node, back, kind) : X.removePair(r.body.draft, target.node, back);
    if (next === r.body.draft) return;
    let s = await editorApi.save(target.graph, r.body.draftRev, next);
    if (s.status === 409 && s.body?.error === 'golden_locked' && confirm(`${target.graph} is golden. Change it?`)) s = await editorApi.save(target.graph, r.body.draftRev, next, true);
    if (s.status !== 200) alert(`${target.graph}: its side of the link was not saved (${s.body?.message ?? s.status}).`);
    refreshList();
  };
  const loadMapNodes = async (id: string) => { const r = await editorApi.get(id); return r.body?.draft.nodes.map(n => n.id) ?? []; };
  const edit = d.edit;
  const onDelete = async (nodes: string[], edges: string[]) => {
    if (readOnly || !level) return;
    const a = X.removeEdges(level, edges); const b = X.removeNodes(a.level, nodes);
    edit(() => b.level); setSel({});
    for (const e of [...a.crossMap, ...b.crossMap]) if (e.kind !== 'exit' && typeof e.to === 'object') await onPair('remove', e.to, { graph: level.id, node: e.from }, e.kind ?? 'portal');
  };

  const shown = maps.filter(m => !search || m.id.includes(search.toLowerCase()) || (m.title?.en ?? '').toLowerCase().includes(search.toLowerCase()));
  return <div className={`editor${mapsOpen ? ' maps-open' : ''}`}>
    <ConfirmHost />
    <aside className="maps" data-testid="ed-maps">
      <h2>Maps</h2>
      <input placeholder="search" value={search} onChange={e => setSearch(e.target.value)} data-testid="ed-map-search" />
      <ul>{shown.map(m => <li key={m.id} className={m.id === current ? 'cur' : ''}>
        <button data-testid={`ed-map-${m.id}`} onClick={() => open(m.id)}>
          <span className={`st st-${m.state}`}>{BADGE[m.state]}</span> {m.id}
          {m.errors > 0 && <span className="errn"> ⚠{m.errors}</span>}{m.draftAhead && <span className="muted"> · draft ahead of v{m.publishedVersion}</span>}
        </button></li>)}</ul>
      <a className="dl" href="/api/v1/editor/export" data-testid="ed-download">⬇ Download JSON</a>
    </aside>
    <main>
      {!level ? <div className="empty"><button className="big maps-toggle" data-testid="ed-maps-toggle" onClick={() => setMapsOpen(o => !o)}>☰ Maps</button>{current ? 'Loading map…' : 'Open a map on the left.'}</div> : <>
        <div className="toolbar">
          <button className="big maps-toggle" data-testid="ed-maps-toggle" onClick={() => setMapsOpen(o => !o)}>☰ Maps</button>
          <b>{level.id}</b> <span className={`st st-${level.state}`}>{level.state}</span> v{d.doc!.publishedVersion}
          <span className="modes">
            <button className={`big${mode === 'connect' ? ' on' : ''}`} disabled={readOnly} data-testid="ed-connect" aria-pressed={mode === 'connect'}
              onClick={() => { setMode(m => (m === 'connect' ? 'select' : 'connect')); setSel({}); }}>🔗 Connect{mode === 'connect' ? ': on' : ''}</button>
            <button className={`big${mode === 'add' ? ' on' : ''}`} disabled={readOnly} data-testid="ed-add-node" aria-pressed={mode === 'add'}
              onClick={() => setMode(m => (m === 'add' ? 'select' : 'add'))}>＋ Add node</button>
          </span>
          {d.readOnly && owner && <button data-testid="ed-golden-unlock" onClick={d.unlockGolden}>🔒 golden: unlock to edit</button>}
          {!owner && <span className="muted">read-only ({role})</span>}
          <span className={`save s-${d.status}`} data-testid="ed-save-status">{statusText(d.status, d.savedAt)}</span>
          <span className={errors ? 'errn' : 'muted'}>{errors} errors · {warnings} warnings</span>
          <button onClick={reloadAssets}>Reload assets</button>
          {owner && <button className="primary" data-testid="ed-publish" onClick={async () => { await d.flush(); setPublishing(true); }}>Publish…</button>}
        </div>
        <div className="work">
          <Canvas key={level.id} level={level} readOnly={readOnly} errorAt={errorAt} onSelect={setSel} mode={mode} bg={bg} selected={sel}
            onAdd={(x, y) => { const r = X.addNode(level, { x: Math.round(x * 1e4) / 1e4, y: Math.round(y * 1e4) / 1e4 }); edit(() => r.level); setSel({ node: r.id }); setMode('select'); }}
            onMove={(id, x, y) => edit(l => X.moveNode(l, id, x, y))}
            onConnect={(from, to) => { const r = X.addEdge(level, from, to); edit(() => r.level); setSel({ edge: r.id }); }}
            onDelete={onDelete} onOpenMap={open} />
          <Inspector level={level} readOnly={readOnly} maps={maps} sel={sel} edit={edit} onSelect={setSel} onPair={onPair} loadMapNodes={loadMapNodes} onDelete={onDelete} onOpenMap={open} />
        </div>
        <div className="tabs">
          {(['dialogue', 'settings', 'words', 'problems'] as const).map(t => <button key={t} className={tab === t ? 'on' : ''} data-testid={`ed-tab-${t}`} onClick={() => setTab(t)}>
            {t === 'dialogue' ? 'Dialogue' : t === 'settings' ? 'Map settings' : t === 'words' ? `Word pool (${level.settings.words.length})` : `Problems (${allProblems.length})`}</button>)}
        </div>
        <div className="panel">
          {tab === 'dialogue' && <DialogueEditor key={level.id} level={level} readOnly={readOnly} characters={characters} edit={edit} />}
          {tab === 'settings' && <MapSettings level={level} readOnly={readOnly} edit={edit} />}
          {tab === 'words' && <WordPool level={level} readOnly={readOnly} maps={maps} audio={audio} edit={edit} />}
          {tab === 'problems' && <Problems problems={allProblems} />}
        </div>
      </>}
    </main>
    {publishing && level && <PublishDialog level={level} draftRev={d.draftRev()} golden={d.doc!.state === 'golden'} goldenConfirmed={d.goldenConfirmed()}
      problems={allProblems} onClose={() => setPublishing(false)} onDone={() => { setPublishing(false); refreshList(); void d.reload(); }} />}
  </div>;
}

function statusText(s: string, at: Date | null) {
  if (s === 'saving') return 'saving…';
  if (s === 'unsaved') return 'unsaved changes';
  if (s === 'offline') return 'offline: kept on this device, retrying';
  if (s === 'error') return 'not saved';
  return at ? `✓ autosaved ${at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '✓ saved';
}
function Problems({ problems }: { problems: Problem[] }) {
  if (!problems.length) return <p className="muted" data-testid="ed-problems">No problems.</p>;
  return <ul className="problems" data-testid="ed-problems">{problems.map((p, i) => <li key={i} className={p.level}>{p.level === 'error' ? '⛔' : '⚠️'} {p.msg}</li>)}</ul>;
}
