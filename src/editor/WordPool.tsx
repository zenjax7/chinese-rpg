/** Word pool (level-editor.md §5.3, §2.5): the map's ordered settings.words with add (search by Chinese, English, pinyin or id),
 *  remove, reorder, "also in …", and per-word status (meaning, pinyin, 🔈 audio ready or pending). */
import { useMemo, useState } from 'react';
import type { Level } from '../shared/level/types';
import { WORDS } from '../shared/level/wordbank';
import type { MapRow } from './api';
import * as X from './level-edit';

const BY_ID = new Map(WORDS.map(w => [w[0], w]));

export function WordPool(p: { level: Level; readOnly: boolean; maps: MapRow[]; audio: Set<string>; edit: (f: (l: Level) => Level) => void }) {
  const [q, setQ] = useState('');
  const words = p.level.settings.words;
  const alsoIn = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const row of p.maps) if (row.id !== p.level.id) for (const w of row.words ?? []) m.set(w, [...(m.get(w) ?? []), row.id]);
    return m;
  }, [p.maps, p.level.id]);
  const hits = useMemo(() => {
    const t = q.trim().toLowerCase(); if (!t) return [];
    return WORDS.filter(w => !words.includes(w[0]) && (w[0].toLowerCase().startsWith(t) || w[1].includes(t) || w[4].toLowerCase().includes(t) || w[3].toLowerCase().includes(t))).slice(0, 12);
  }, [q, words]);
  return <div className="wordpool" data-testid="ed-words">
    <p className="muted">{words.length} words, in review order. Removing a word keeps every player’s mastery of it; it just stops appearing in this map’s battles.</p>
    <div className="row"><label className="field"><span>add a word</span><input value={q} disabled={p.readOnly} data-testid="ed-word-search" placeholder="Chinese, English, pinyin or C-id" onChange={e => setQ(e.target.value)} /></label></div>
    {hits.length > 0 && <ul className="hits">{hits.map(w => <li key={w[0]}><button data-testid="ed-word-add" onClick={() => { p.edit(l => X.addWord(l, w[0])); setQ(''); }}>+ {w[0]} {w[1]} · {w[4]}</button></li>)}</ul>}
    <ol className="words">{words.map((id, i) => { const w = BY_ID.get(id); const also = alsoIn.get(id);
      return <li key={id} data-testid="ed-word" data-id={id} className={w ? '' : 'err'}>
        <b>{id}</b> {w ? <>{w[1]} · {w[4]}</> : <em>not in the word bank</em>}
        {w && !w[3] && <span className="warn"> no pinyin</span>}
        <span className="audio">{p.audio.has(id) ? ' 🔈' : ' 🔈 pending'}</span>
        {also && <span className="muted"> · also in: {also.slice(0, 4).join(', ')}{also.length > 4 ? ` +${also.length - 4}` : ''}</span>}
        <span className="ops">
          <button disabled={p.readOnly || i === 0} onClick={() => p.edit(l => X.moveWord(l, id, -1))}>↑</button>
          <button disabled={p.readOnly || i === words.length - 1} onClick={() => p.edit(l => X.moveWord(l, id, 1))}>↓</button>
          <button disabled={p.readOnly} data-testid="ed-word-remove" onClick={() => p.edit(l => X.removeWord(l, id))}>✖</button>
        </span>
      </li>; })}</ol>
  </div>;
}
