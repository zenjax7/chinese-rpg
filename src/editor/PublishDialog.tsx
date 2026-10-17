/** Publish… (level-editor.md §6.3): blocked by errors; for a beta map it says plainly that players' progress on it resets, with
 *  the number of saves that have progress there; a golden map needs the owner's confirm (§4.1). */
import { useEffect, useState } from 'react';
import { editorApi } from './api';
import type { Level, Problem } from '../shared/level/types';

export function PublishDialog(p: { level: Level; draftRev: number; golden: boolean; goldenConfirmed: boolean; problems: Problem[]; onClose: () => void; onDone: () => void }) {
  const [saves, setSaves] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const errors = p.problems.filter(x => x.level === 'error');
  useEffect(() => { editorApi.affected(p.level.id).then(r => setSaves(r.body?.saves ?? null)); }, [p.level.id]);
  const go = async () => {
    let confirmGolden = p.goldenConfirmed;
    if (p.golden && !confirmGolden) { if (!confirm('This map is golden. Change it?')) return; confirmGolden = true; }
    setBusy(true);
    const r = await editorApi.publish(p.level.id, p.draftRev, note, confirmGolden).catch(() => null);
    setBusy(false);
    if (r?.status === 200) { setMsg(`Published as ${p.level.state}: version ${r.body!.versions[p.level.id]} (release ${r.body!.release}).`); setTimeout(p.onDone, 1200); return; }
    if (r?.status === 422) { setMsg('The server found errors: ' + Object.values(r.body?.problems ?? {}).flat().map((x: any) => x.msg).slice(0, 5).join(' ')); return; }
    setMsg(r?.body?.message ?? 'Publishing failed. Try again.');
  };
  return <div className="modal" data-testid="ed-publish-dialog"><div className="box">
    <h2>Publish {p.level.id} as <b>{p.level.state}</b></h2>
    {p.level.state === 'beta' && <p className="warn" data-testid="ed-beta-notice">Publishing resets every player’s progress on this map, and its quests go back to not-started.
      {saves !== null && <> {saves} save{saves === 1 ? '' : 's'} have progress here.</>}</p>}
    {p.level.state === 'draft' && <p className="muted">A draft map is not in the game: players can’t reach it.</p>}
    {p.level.state === 'golden' && <p className="muted">Golden: locked after this; later changes need your confirm.</p>}
    {errors.length > 0 && <><p className="errn">Fix {errors.length} error{errors.length === 1 ? '' : 's'} first:</p><ul>{errors.slice(0, 8).map((e, i) => <li key={i}>{e.msg}</li>)}</ul></>}
    <label className="field wide"><span>note (optional)</span><input value={note} onChange={e => setNote(e.target.value)} maxLength={500} /></label>
    {msg && <p data-testid="ed-publish-msg">{msg}</p>}
    <div className="row"><button onClick={p.onClose}>Cancel</button><button className="primary" data-testid="ed-publish-go" disabled={busy || errors.length > 0} onClick={go}>Publish</button></div>
  </div></div>;
}
