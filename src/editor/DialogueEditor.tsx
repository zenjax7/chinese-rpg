/** Dialogue editor (level-editor.md §5.3, §2.8): the map's scene/0.2 scenes; slots with character and expression; per line the
 *  speaker, side, expression, optional Chinese and the English gloss. No pinyin field; a line with no Chinese is valid. */
import { useState } from 'react';
import type { Level } from '../shared/level/types';
import * as X from './level-edit';
import { TextField, SelectField } from './fields';

export function DialogueEditor(p: { level: Level; readOnly: boolean; characters: string[]; edit: (f: (l: Level) => Level) => void }) {
  const ids = Object.keys(p.level.scenes ?? {}).sort();
  const [sel, setSel] = useState(ids[0] ?? '');
  const [newId, setNewId] = useState(`sc_${p.level.id}_`);
  const s = p.level.scenes?.[sel];
  const chars = [...new Set([...p.characters, ...Object.keys((p.level as any).npcs ?? {})])].sort();
  return <div className="dialogue" data-testid="ed-dialogue">
    <datalist id="dl-chars">{chars.map(c => <option key={c} value={c} />)}</datalist>
    <div className="row">
      <SelectField label="scene" value={sel} options={[['', '…'], ...ids.map(i => [i, i] as [string, string])]} testid="ed-scene" onChange={setSel} />
      <TextField label="new scene id" value={newId} onChange={setNewId} disabled={p.readOnly} testid="ed-scene-new" />
      <button disabled={p.readOnly || !/^sc_[a-z0-9_]+$/.test(newId) || !!p.level.scenes?.[newId]} data-testid="ed-scene-add"
        onClick={() => { p.edit(l => X.addScene(l, newId)); setSel(newId); }}>+ scene</button>
    </div>
    {s && <>
      <div className="row slots">{X.SIDES.map(side => <span key={side} className="slot">
        <TextField label={side} value={s.slots?.[side]?.char} list="dl-chars" disabled={p.readOnly} onChange={v => p.edit(l => X.setSlot(l, sel, side, v, s.slots?.[side]?.expr))} />
        <SelectField label="expr" value={s.slots?.[side]?.expr} options={['', ...X.EXPRESSIONS]} disabled={p.readOnly || !s.slots?.[side]} onChange={v => p.edit(l => X.setSlot(l, sel, side, s.slots![side].char, v))} />
      </span>)}</div>
      <table className="lines"><thead><tr><th>id</th><th>speaker</th><th>side</th><th>expr</th><th>Chinese (optional)</th><th>English</th><th /></tr></thead><tbody>
        {s.lines.map((line, i) => <tr key={line.id} data-testid="ed-line">
          <td>{line.id}</td>
          <td><TextField label="" value={line.speaker} list="dl-chars" disabled={p.readOnly} onChange={v => p.edit(l => X.updateLine(l, sel, line.id, { speaker: v }))} /></td>
          <td><SelectField label="" value={line.side} options={['', ...X.SIDES]} disabled={p.readOnly} onChange={v => p.edit(l => X.updateLine(l, sel, line.id, { side: v || undefined }))} /></td>
          <td><SelectField label="" value={line.expr} options={['', ...X.EXPRESSIONS]} disabled={p.readOnly} onChange={v => p.edit(l => X.updateLine(l, sel, line.id, { expr: v || undefined }))} /></td>
          <td><TextField label="" value={line.zh} disabled={p.readOnly} testid="ed-line-zh" onChange={v => p.edit(l => X.updateLine(l, sel, line.id, { zh: v || undefined }))} /></td>
          <td><TextField label="" value={line.en} disabled={p.readOnly} testid="ed-line-en" wide onChange={v => p.edit(l => X.updateLine(l, sel, line.id, { en: v }))} /></td>
          <td className="ops">
            <button disabled={p.readOnly || i === 0} onClick={() => p.edit(l => X.moveLine(l, sel, line.id, -1))}>↑</button>
            <button disabled={p.readOnly || i === s.lines.length - 1} onClick={() => p.edit(l => X.moveLine(l, sel, line.id, 1))}>↓</button>
            <button disabled={p.readOnly || s.lines.length < 2} onClick={() => p.edit(l => X.removeLine(l, sel, line.id))}>✖</button>
          </td>
        </tr>)}
      </tbody></table>
      <button disabled={p.readOnly} data-testid="ed-line-add" onClick={() => p.edit(l => X.addLine(l, sel))}>+ line</button>
    </>}
  </div>;
}
