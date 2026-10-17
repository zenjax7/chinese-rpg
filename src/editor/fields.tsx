/** Small form fields shared by the editor panels. Text fields commit on blur/Enter so typing doesn't autosave every keystroke. */
import { useEffect, useState } from 'react';

export function TextField(p: { label: string; value: string | undefined; onChange: (v: string) => void; disabled?: boolean; list?: string; testid?: string; placeholder?: string; wide?: boolean }) {
  const [v, setV] = useState(p.value ?? '');
  useEffect(() => setV(p.value ?? ''), [p.value]);
  const commit = () => { if (v !== (p.value ?? '')) p.onChange(v); };
  return (
    <label className={`field${p.wide ? ' wide' : ''}`}><span>{p.label}</span>
      <input value={v} disabled={p.disabled} list={p.list} placeholder={p.placeholder} data-testid={p.testid}
        onChange={e => setV(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') commit(); }} />
    </label>
  );
}
export function NumberField(p: { label: string; value: number | undefined; onChange: (v: number | undefined) => void; disabled?: boolean; min?: number; max?: number; step?: number; testid?: string }) {
  return (
    <label className="field num"><span>{p.label}</span>
      <input type="number" value={p.value ?? ''} min={p.min} max={p.max} step={p.step ?? 1} disabled={p.disabled} data-testid={p.testid}
        onChange={e => p.onChange(e.target.value === '' ? undefined : Number(e.target.value))} />
    </label>
  );
}
export function SelectField(p: { label: string; value: string | undefined; options: (string | [string, string])[]; onChange: (v: string) => void; disabled?: boolean; testid?: string }) {
  return (
    <label className="field"><span>{p.label}</span>
      <select value={p.value ?? ''} disabled={p.disabled} data-testid={p.testid} onChange={e => p.onChange(e.target.value)}>
        {p.options.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return <option key={v} value={v}>{l}</option>; })}
      </select>
    </label>
  );
}
export function Check(p: { label: string; value: boolean | undefined; onChange: (v: boolean) => void; disabled?: boolean }) {
  return <label className="field chk"><input type="checkbox" checked={!!p.value} disabled={p.disabled} onChange={e => p.onChange(e.target.checked)} /> {p.label}</label>;
}
/** A JSON value edited as text; invalid JSON is shown and not committed. */
export function JsonField(p: { label: string; value: unknown; onChange: (v: any) => void; disabled?: boolean; testid?: string }) {
  const text = JSON.stringify(p.value, null, 1);
  const [v, setV] = useState(text); const [bad, setBad] = useState(false);
  useEffect(() => { setV(text); setBad(false); }, [text]);
  return (
    <label className="field wide"><span>{p.label}{bad && <em className="bad"> (not valid JSON)</em>}</span>
      <textarea rows={Math.min(12, v.split('\n').length + 1)} value={v} disabled={p.disabled} data-testid={p.testid}
        onChange={e => setV(e.target.value)}
        onBlur={() => { try { const parsed = JSON.parse(v); setBad(false); if (JSON.stringify(parsed) !== JSON.stringify(p.value)) p.onChange(parsed); } catch { setBad(true); } }} />
    </label>
  );
}
