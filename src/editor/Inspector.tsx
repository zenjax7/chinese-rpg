/** Node and link inspector (level-editor.md §5.3, §2.2, §2.3, §2.6.1): kind in Jack's words (Blank included), title, NPC, the
 *  node's ordered events, the quest gate (lockedUntilQuest / lockedScene) on nodes and links, and links to other maps. */
import { useState } from 'react';
import type { Level, LevelEdge, NodeRef } from '../shared/level/types';
import type { MapRow } from './api';
import * as X from './level-edit';
import { TextField, NumberField, SelectField, Check, JsonField } from './fields';

/** "Jack picks" -> kind (§2.2). Blank is waypoint/fork with no event. */
export const KINDS: [string, string][] = [['waypoint', 'Blank (waypoint)'], ['fork', 'Blank (fork)'], ['village', 'Village'], ['town', 'Town'], ['inn', 'Inn / campfire'],
  ['portal', 'Portal'], ['stairs_up', 'Stairs up'], ['stairs_down', 'Stairs down'], ['chest', 'Treasure'], ['npc', 'NPC'], ['miniboss', 'Mini-boss (placed)'],
  ['story', 'Story event'], ['boss', 'Boss'], ['exit', 'Exit'], ['lever', 'Lever'], ['shop', 'Shop']];
const EDGE_KINDS = ['path', 'stairs', 'portal', 'exit', 'shortcut', 'oneway'];

export interface InspectorProps {
  level: Level; readOnly: boolean; maps: MapRow[]; sel: { node?: string; edge?: string };
  edit: (f: (l: Level) => Level) => void;
  onSelect: (sel: { node?: string; edge?: string }) => void;
  /** Adds or removes the other half of a cross-map pair on the target map. */
  onPair: (op: 'add' | 'remove', target: NodeRef, back: NodeRef, kind: string) => Promise<void>;
  loadMapNodes: (id: string) => Promise<string[]>;
}

export function Inspector(p: InspectorProps) {
  const quests = (p.level.quests ?? []).map((q: any) => q.id as string);
  const scenes = Object.keys(p.level.scenes ?? {});
  const lists = <>
    <datalist id="dl-quests">{quests.map(q => <option key={q} value={q} />)}</datalist>
    <datalist id="dl-scenes">{scenes.map(s => <option key={s} value={s} />)}</datalist>
  </>;
  if (p.sel.node) return <div className="inspector" data-testid="ed-inspector">{lists}<NodePanel {...p} id={p.sel.node} /></div>;
  if (p.sel.edge) return <div className="inspector" data-testid="ed-inspector">{lists}<EdgePanel {...p} id={p.sel.edge} /></div>;
  return <div className="inspector muted" data-testid="ed-inspector"><p>Select a node or a link. Drag from a node’s right handle to another node to link them; press Delete to remove the selection.</p></div>;
}

function Gate(p: { value: { lockedUntilQuest?: string; lockedScene?: string }; disabled: boolean; onChange: (patch: { lockedUntilQuest?: string; lockedScene?: string }) => void }) {
  return <>
    <TextField label="🔒 locked until quest" value={p.value.lockedUntilQuest} list="dl-quests" disabled={p.disabled} placeholder="q…" onChange={v => p.onChange({ lockedUntilQuest: v || undefined })} />
    <TextField label="locked scene (optional)" value={p.value.lockedScene} list="dl-scenes" disabled={p.disabled} placeholder="sc_…" onChange={v => p.onChange({ lockedScene: v || undefined })} />
  </>;
}

function NodePanel(p: InspectorProps & { id: string }) {
  const n = p.level.nodes.find(x => x.id === p.id);
  const golden = p.level.state === 'golden';
  if (!n) return <p className="muted">Node {p.id} is gone.</p>;
  const set = (patch: Record<string, unknown>) => p.edit(l => X.updateNode(l, n.id, patch as any));
  const links = p.level.edges.filter(e => e.from === n.id && X.isCrossMap(e));
  return <>
    <h3>Node {n.id} · idx {n.idx}</h3>
    <TextField label="id" value={n.id} disabled={p.readOnly || golden} testid="ed-node-id" onChange={v => { p.edit(l => X.renameNode(l, n.id, v)); p.onSelect({ node: v }); }} />
    <SelectField label="kind" value={n.kind} options={KINDS.some(k => k[0] === n.kind) ? KINDS : [...KINDS, [n.kind, n.kind]]} disabled={p.readOnly} testid="ed-node-kind"
      onChange={v => p.edit(l => X.setKind(l, n.id, v))} />
    <TextField label="title (English)" value={n.title?.en} disabled={p.readOnly} testid="ed-node-title" onChange={v => set({ title: { ...n.title, en: v } })} />
    <TextField label="title (Chinese, optional)" value={n.title?.zh} disabled={p.readOnly} onChange={v => set({ title: { ...n.title, en: n.title?.en ?? '', zh: v || undefined } })} />
    {n.kind === 'npc' || n.npc ? <TextField label="NPC character id" value={n.npc} disabled={p.readOnly} onChange={v => set({ npc: v || undefined })} /> : null}
    {n.kind === 'inn' && <Check label="campfire" value={n.campfire as boolean} disabled={p.readOnly} onChange={v => set({ campfire: v || undefined })} />}
    <Check label="entry (where a beta reset puts a player)" value={p.level.entry === n.id} disabled={p.readOnly} onChange={v => { if (v) p.edit(l => ({ ...l, entry: n.id })); }} />
    <Gate value={n} disabled={p.readOnly} onChange={set} />
    <h4>Events (ordered) <button disabled={p.readOnly} data-testid="ed-blank" onClick={() => p.edit(l => X.blankNode(l, n.id))}>Blank (no event)</button></h4>
    <JsonField label="events on this node" value={X.nodeEvents(p.level, n.id)} disabled={p.readOnly} onChange={evs => Array.isArray(evs) && p.edit(l => X.setNodeEvents(l, n.id, evs))} />
    <h4>Links to other maps</h4>
    {links.map(e => <CrossLink key={e.id} {...p} edge={e as LevelEdge & { to: NodeRef }} />)}
    <AddCrossLink {...p} from={n.id} />
  </>;
}

function EdgePanel(p: InspectorProps & { id: string }) {
  const e = p.level.edges.find(x => x.id === p.id);
  if (!e) return <p className="muted">Link {p.id} is gone.</p>;
  if (X.isCrossMap(e)) return <><h3>Link {e.id}</h3><CrossLink {...p} edge={e} /></>;
  const set = (patch: Partial<LevelEdge>) => p.edit(l => X.updateEdge(l, e.id, patch));
  return <>
    <h3>Link {e.id}: {e.from} → {String(e.to)}</h3>
    <SelectField label="kind" value={e.kind ?? 'path'} options={EDGE_KINDS} disabled={p.readOnly} onChange={v => set({ kind: v })} />
    <NumberField label="danger 0–3" value={e.danger} min={0} max={3} disabled={p.readOnly} testid="ed-edge-danger" onChange={v => set({ danger: v })} />
    <NumberField label="steps" value={e.steps} min={1} max={20} disabled={p.readOnly} onChange={v => set({ steps: v })} />
    <TextField label="terrain" value={e.terrain} disabled={p.readOnly} onChange={v => set({ terrain: v || undefined })} />
    <Check label="patrol (the boss gate: no random rolls)" value={e.patrol as boolean} disabled={p.readOnly} onChange={v => set({ patrol: v || undefined })} />
    <Gate value={e} disabled={p.readOnly} onChange={set} />
    <button disabled={p.readOnly} onClick={() => { p.edit(l => X.removeEdges(l, [e.id]).level); p.onSelect({}); }}>Delete link</button>
  </>;
}

/** A cross-map link: retarget or delete it together with its pair on the other map (§2.3). An exit may stay one-way. */
function CrossLink(p: InspectorProps & { edge: LevelEdge & { to: NodeRef } }) {
  const e = p.edge, here: NodeRef = { graph: p.level.id, node: e.from };
  const remove = async () => {
    p.edit(l => X.removeEdges(l, [e.id]).level);
    if (e.kind !== 'exit') await p.onPair('remove', e.to, here, e.kind ?? 'portal');
    p.onSelect({ node: e.from });
  };
  return <div className="xlink" data-testid="ed-xlink">
    <span>{e.kind} → <b>{e.to.graph}/{e.to.node}</b></span>
    <button disabled={p.readOnly} onClick={remove}>delete (both maps)</button>
    <Gate value={e} disabled={p.readOnly} onChange={patch => p.edit(l => X.updateEdge(l, e.id, patch))} />
  </div>;
}

function AddCrossLink(p: InspectorProps & { from: string }) {
  const [map, setMap] = useState(''); const [nodes, setNodes] = useState<string[]>([]); const [node, setNode] = useState(''); const [kind, setKind] = useState('portal');
  const pick = async (id: string) => { setMap(id); setNode(''); setNodes(id ? await p.loadMapNodes(id) : []); };
  const add = async () => {
    if (!map || !node) return;
    p.edit(l => X.addEdge(l, p.from, { graph: map, node }, kind).level);
    if (kind !== 'exit') await p.onPair('add', { graph: map, node }, { graph: p.level.id, node: p.from }, kind);
    setMap(''); setNode('');
  };
  return <div className="addx">
    <SelectField label="to map" value={map} options={[['', '…'], ...p.maps.filter(m => m.id !== p.level.id).map(m => [m.id, m.id] as [string, string])]} disabled={p.readOnly} testid="ed-xmap" onChange={pick} />
    <SelectField label="node" value={node} options={[['', '…'], ...nodes.map(n => [n, n] as [string, string])]} disabled={p.readOnly || !map} testid="ed-xnode" onChange={setNode} />
    <SelectField label="kind" value={kind} options={['portal', 'stairs', 'exit']} disabled={p.readOnly} onChange={setKind} />
    <button disabled={p.readOnly || !map || !node} data-testid="ed-xadd" onClick={add}>+ link to another map</button>
  </div>;
}
