/** Map settings (level-editor.md §2.4, §5.3): the per-map numbers and the lifecycle state. */
import type { Level } from '../shared/level/types';
import * as X from './level-edit';
import { TextField, NumberField, SelectField } from './fields';

export function MapSettings(p: { level: Level; readOnly: boolean; edit: (f: (l: Level) => Level) => void }) {
  const s = p.level.settings as any;
  const set = (patch: Record<string, unknown>) => p.edit(l => X.updateSettings(l, patch));
  const pair = (key: string, i: 0 | 1, v: number | undefined) => { const a = [...(s[key] ?? [0, 0])]; a[i] = v ?? 0; set({ [key]: a }); };
  const diff = (k: string, v: number | undefined) => set({ difficulty: { ...(s.difficulty ?? {}), [k]: v } });
  return <div className="settings" data-testid="ed-settings">
    <SelectField label="state" value={p.level.state} options={[['draft', 'draft (editor only)'], ['beta', 'beta (players, resets on change)'], ['golden', 'golden (locked)']]}
      disabled={p.readOnly} testid="ed-state" onChange={v => p.edit(l => ({ ...l, state: v as Level['state'] }))} />
    <TextField label="map title (English)" value={p.level.title?.en} disabled={p.readOnly} onChange={v => p.edit(l => ({ ...l, title: { ...l.title, en: v } }))} />
    <TextField label="map title (Chinese)" value={p.level.title?.zh} disabled={p.readOnly} onChange={v => p.edit(l => ({ ...l, title: { ...l.title, zh: v || undefined } }))} />
    <TextField label="battle location name (English)" value={s.title?.en} disabled={p.readOnly} onChange={v => set({ title: { ...s.title, en: v } })} />
    <TextField label="emoji" value={s.emoji} disabled={p.readOnly} onChange={v => set({ emoji: v || undefined })} />
    <NumberField label="gold unit G" value={s.G} min={1} disabled={p.readOnly} onChange={v => set({ G: v })} />
    <NumberField label="rec. level min" value={s.recLevel?.[0]} min={1} disabled={p.readOnly} onChange={v => pair('recLevel', 0, v)} />
    <NumberField label="rec. level max" value={s.recLevel?.[1]} min={1} disabled={p.readOnly} onChange={v => pair('recLevel', 1, v)} />
    <NumberField label="gear tier" value={s.gearTier} min={1} disabled={p.readOnly} onChange={v => set({ gearTier: v })} />
    <NumberField label="MC options" value={s.difficulty?.mcOptions} min={2} disabled={p.readOnly} onChange={v => diff('mcOptions', v)} />
    <NumberField label="review slots" value={s.difficulty?.reviewSlots} min={0} disabled={p.readOnly} onChange={v => diff('reviewSlots', v)} />
    <NumberField label="path fights" value={s.difficulty?.pathFights} min={0} disabled={p.readOnly} onChange={v => diff('pathFights', v)} />
    <NumberField label="enemies per battle min" value={s.enemiesPerBattle?.[0]} min={1} disabled={p.readOnly} onChange={v => pair('enemiesPerBattle', 0, v)} />
    <NumberField label="enemies per battle max" value={s.enemiesPerBattle?.[1]} min={1} disabled={p.readOnly} onChange={v => pair('enemiesPerBattle', 1, v)} />
    <NumberField label="max hops to inn" value={s.maxHopsToInn} min={1} disabled={p.readOnly} onChange={v => set({ maxHopsToInn: v })} />
    {/* leveling v2 (Jack 2026-10-17, combat-spec §2.3): normals roll in enemyLevel, elites use eliteLevel (default: max), the boss its level */}
    <NumberField label="enemy level min" value={s.enemyLevel?.[0]} min={1} disabled={p.readOnly} testid="ed-enemy-level-min" onChange={v => pair('enemyLevel', 0, v)} />
    <NumberField label="enemy level max" value={s.enemyLevel?.[1]} min={1} disabled={p.readOnly} testid="ed-enemy-level-max" onChange={v => pair('enemyLevel', 1, v)} />
    <NumberField label="elite level" value={s.eliteLevel} min={1} disabled={p.readOnly} testid="ed-elite-level" onChange={v => set({ eliteLevel: v })} />
    {(s.roster ?? []).map((r: any, i: number) => Array.isArray(r.level)
      ? <label className="field num" key={i}><span>{`level: ${r.enemy}`}</span><input value={`${r.level[0]}–${r.level[1]}`} disabled /></label>
      : <NumberField key={i} label={`level: ${r.enemy} (optional)`} value={r.level} min={1} disabled={p.readOnly} testid={`ed-roster-level-${i}`}
          onChange={v => set({ roster: s.roster.map((x: any, k: number) => { if (k !== i) return x; const { level: _l, ...rest } = x; return v === undefined ? rest : { ...rest, level: v }; }) })} />)}
    {s.boss && <NumberField label={`boss level: ${s.boss.enemy ?? ''}`} value={s.boss.level} min={1} disabled={p.readOnly} testid="ed-boss-level" onChange={v => set({ boss: { ...s.boss, level: v } })} />}
  </div>;
}
