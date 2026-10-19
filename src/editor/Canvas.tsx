/** The graph canvas (level-editor.md §5.3), touch first (iPad) and still fine with a mouse.
 *  The map is drawn in the game's own 1280x720 frame (shared/level/map-view.ts): the map's background art, cover-scaled like the game's
 *  map screen, sits locked under the nodes, and every node is at its in-game spot. Pan / pinch-zoom move both together.
 *  Gestures: one finger on a node drags it (saved as x / y on release), one finger on empty space pans, pinch zooms.
 *  Modes (toolbar): Select (tap a node or a link to edit it), Connect (tap node A, then node B; stays on), Add node (tap the spot).
 *  Cross-map links are stubs next to their node: tap one to select the link. A mouse can also drag from a node's handle to link. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ReactFlow, Controls, ControlButton, MiniMap, Handle, Position, ViewportPortal, useNodesState, useEdgesState, useStore, type Node, type Edge, type NodeProps,
  type Connection, type ReactFlowInstance } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { Level } from '../shared/level/types';
import { isCrossMap } from './level-edit';
import { FRAME_W, FRAME_H, NODE_AREA, nodeXY, frameToNode, nodeRadius, isDense, NODE_ICON } from '../shared/level/map-view';
import type { MapBg } from './map-bg';
import { askConfirm } from './confirm';

/** Editor-only kinds the game's icon table doesn't list. */
export const KIND_ICON: Record<string, string> = { ...NODE_ICON, exit: '🚪', lever: '🔧' };
export type CanvasMode = 'select' | 'connect' | 'add';
/** Smallest on-screen touch target for a node, in CSS px. */
const TOUCH = 48;

type MapNodeData = { label: string; sub: string; icon: string; kind: string; r: number; dense: boolean; entry: boolean; locked: boolean; error: boolean; source: boolean };
function MapNode({ data, selected }: NodeProps<Node<MapNodeData>>) {
  const zoom = useStore(s => s.transform[2]);
  const hit = Math.min(Math.max(TOUCH / zoom, TOUCH), 2.2 * TOUCH);   // ≥ 48 screen px at any zoom (capped so neighbours stay tappable)
  return (
    <div className={`mapnode k-${data.kind}${selected ? ' sel' : ''}${data.error ? ' err' : ''}${data.source ? ' src' : ''}${data.dense ? ' dense' : ''}`} data-testid="ed-node"
      style={{ width: hit, height: hit }}>
      <Handle type="target" position={Position.Top} id="c" className="h-center" isConnectableStart={false} />
      <div className="dot" style={{ width: data.r * 2, height: data.r * 2 }}><span className="icon">{data.icon}</span></div>
      {data.label && <span className="lbl" lang="zh-CN" style={{ top: `calc(50% + ${data.r + 6}px)` }}>{data.label}</span>}
      {data.sub && <span className="sub" style={{ top: `calc(50% + ${data.r + (data.label ? 26 : 6)}px)` }}>{data.sub}</span>}
      {data.entry && <span className="badge b-entry" title="entry">▶</span>}{data.locked && <span className="badge b-lock" title="quest gate">🔒</span>}
      <Handle type="source" position={Position.Right} id="s" className="h-mouse" />
      <Handle type="source" position={Position.Top} id="o" className="h-center" isConnectable={false} />
    </div>
  );
}
function StubNode({ data }: NodeProps<Node<{ label: string }>>) {
  return <div className="stubnode" data-testid="ed-stub"><Handle type="target" position={Position.Top} id="c" className="h-center" isConnectable={false} />→ {data.label}</div>;
}
const nodeTypes = { map: MapNode, stub: StubNode };

export interface CanvasProps {
  level: Level; readOnly: boolean; errorAt: Set<string>; mode: CanvasMode; bg: MapBg | null | 'loading';
  selected: { node?: string; edge?: string };
  onSelect: (sel: { node?: string; edge?: string }) => void;
  onMove: (id: string, x: number, y: number) => void;
  onConnect: (from: string, to: string) => void;
  onAdd: (x: number, y: number) => void;
  onDelete: (nodes: string[], edges: string[]) => void;
  onOpenMap: (id: string) => void;
}

export function Canvas(p: CanvasProps) {
  const [from, setFrom] = useState<string | null>(null);   // Connect mode: node A
  const [msg, setMsg] = useState('');
  useEffect(() => { setFrom(null); setMsg(''); }, [p.mode, p.level.id]);
  const { nodes, edges } = useMemo(() => {
    const r = nodeRadius(p.level.nodes.length), dense = isDense(p.level.nodes.length);
    const ns: Node[] = p.level.nodes.map(n => ({
      id: n.id, type: 'map', position: nodeXY(n), draggable: !p.readOnly && p.mode === 'select', selected: p.selected.node === n.id,
      data: { label: n.title?.zh || '', sub: n.title?.zh ? '' : n.title?.en || n.id, icon: KIND_ICON[n.kind] ?? '•', kind: n.kind, r, dense,
        entry: p.level.entry === n.id, locked: !!n.lockedUntilQuest, error: p.errorAt.has(`node:${n.id}`), source: from === n.id },
    }));
    const es: Edge[] = [];
    for (const e of p.level.edges) {
      const label = `${e.kind && e.kind !== 'path' ? e.kind + ' ' : ''}${e.danger ?? ''}${e.steps ? '·' + e.steps : ''}${e.lockedUntilQuest ? ' 🔒' : ''}`;
      const sel = p.selected.edge === e.id;
      if (isCrossMap(e)) {
        const at = nodeXY(p.level.nodes.find(n => n.id === e.from) ?? { x: 0, y: 0 });
        const stub = `stub:${e.id}`;
        ns.push({ id: stub, type: 'stub', draggable: false, selectable: false, data: { label: `${e.to.graph}/${e.to.node}`, graph: e.to.graph, edge: e.id },
          position: { x: at.x + 70, y: at.y + 46 } });
        es.push({ id: e.id, source: e.from, sourceHandle: 'o', target: stub, targetHandle: 'c', type: 'straight', label: e.kind, className: `xedge${sel ? ' sel' : ''}`, selected: sel, data: { cross: true }, interactionWidth: 36 });
      } else es.push({ id: e.id, source: e.from, sourceHandle: 'o', target: e.to as string, targetHandle: 'c', type: 'straight', label, selected: sel, interactionWidth: 36,
        className: `${p.errorAt.has(`edge:${e.id}`) ? 'err' : ''}${sel ? ' sel' : ''}` });
    }
    return { nodes: ns, edges: es };
  }, [p.level, p.readOnly, p.errorAt, p.mode, p.selected, from]);

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<Node>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([]);
  useEffect(() => { setRfNodes(nodes); setRfEdges(edges); }, [nodes, edges, setRfNodes, setRfEdges]);
  const rf = useRef<ReactFlowInstance | null>(null);
  const fit = () => rf.current?.fitBounds({ x: 0, y: 0, width: FRAME_W, height: FRAME_H }, { padding: 0.02 });

  // iOS Safari: keep pinch / double-tap / bounce on the canvas for the editor, not the page
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const stop = (e: Event) => e.preventDefault();
    const multi = (e: TouchEvent) => { if (e.touches.length > 1) e.preventDefault(); };
    el.addEventListener('gesturestart', stop); el.addEventListener('gesturechange', stop); el.addEventListener('touchmove', multi, { passive: false });
    return () => { el.removeEventListener('gesturestart', stop); el.removeEventListener('gesturechange', stop); el.removeEventListener('touchmove', multi); };
  }, []);

  const tapNode = (id: string) => {
    if (p.mode === 'connect' && !p.readOnly) {
      if (!from) { setFrom(id); setMsg(''); return; }
      if (from === id) { setFrom(null); return; }
      const dup = p.level.edges.some(e => typeof e.to === 'string' && ((e.from === from && e.to === id) || (e.from === id && e.to === from)));
      if (dup) setMsg(`${from} and ${id} are already linked.`); else { p.onConnect(from, id); setMsg(`Linked ${from} → ${id}.`); }
      setFrom(null); return;
    }
    if (p.mode === 'add') return;
    p.onSelect({ node: id });
  };
  const instruction = p.readOnly ? '' : p.mode === 'connect' ? (from ? `Tap the node to connect to (from ${from}). Tap ${from} again to cancel.` : 'Connect: tap the first node.')
    : p.mode === 'add' ? 'Tap the spot on the map for the new node.' : '';
  const note = p.bg === 'loading' ? '' : !p.bg?.key ? `No map background for this map (${p.bg?.keys.join(', ') || 'none'} not delivered): the game shows a plain map too.` : '';

  return (
    <div className={`canvas mode-${p.mode}`} data-testid="ed-canvas" ref={box}>
      {(instruction || msg) && <div className="instruction" data-testid="ed-instruction">{instruction}{msg && <span className="msg"> {msg}</span>}</div>}
      {note && <div className="bgnote" data-testid="ed-bg-note">{note}</div>}
      <ReactFlow nodes={rfNodes} edges={rfEdges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} nodeTypes={nodeTypes} nodeOrigin={[0.5, 0.5]}
        onInit={i => { rf.current = i; requestAnimationFrame(fit); }} minZoom={0.2} maxZoom={4}
        translateExtent={[[-FRAME_W * 0.5, -FRAME_H * 0.5], [FRAME_W * 1.5, FRAME_H * 1.5]]}
        zoomOnDoubleClick={false} autoPanOnNodeDrag={false} autoPanOnConnect={false} nodeDragThreshold={6} nodeClickDistance={6} paneClickDistance={6} elevateEdgesOnSelect
        deleteKeyCode={p.readOnly ? null : ['Delete', 'Backspace']}
        onBeforeDelete={async ({ nodes: dn, edges: de }) => {
          const n = dn.filter(x => x.type === 'map').length, e = de.filter(x => !String(x.target).startsWith('stub:') || dn.length === 0).length;
          return askConfirm(`Delete ${n ? `${n} node${n > 1 ? 's' : ''}` : ''}${n && e ? ' and ' : ''}${e ? `${e} link${e > 1 ? 's' : ''}` : ''}?`);
        }}
        nodesConnectable={!p.readOnly && p.mode === 'select'} connectionRadius={36}
        onNodeClick={(_e, n) => { if (n.type === 'map') tapNode(n.id); else if (n.type === 'stub' && p.mode === 'select') p.onSelect({ edge: (n.data as any).edge }); }}
        onEdgeClick={(_e, e) => { if (p.mode === 'select') p.onSelect({ edge: e.id }); }}
        onPaneClick={ev => {
          if (p.mode === 'add' && !p.readOnly && rf.current) { const at = frameToNode(rf.current.screenToFlowPosition({ x: ev.clientX, y: ev.clientY })); p.onAdd(at.x, at.y); return; }
          if (p.mode === 'connect') { setFrom(null); return; }
          p.onSelect({});
        }}
        onNodeDoubleClick={(_e, n) => { if (n.type === 'stub') p.onOpenMap((n.data as any).graph); }}
        onNodeDragStop={(_e, n) => { if (n.type === 'map') { const at = frameToNode(n.position); p.onMove(n.id, at.x, at.y); } }}
        onConnect={(c: Connection) => { if (c.source && c.target && !c.target.startsWith('stub:') && c.source !== c.target) p.onConnect(c.source, c.target); }}
        onDelete={({ nodes: dn, edges: de }) => p.onDelete(dn.filter(n => n.type === 'map').map(n => n.id), de.map(e => e.id))}>
        <ViewportPortal>
          <div className="mapframe" data-testid="ed-map-frame" data-bg={p.bg && p.bg !== 'loading' ? p.bg.key ?? '' : ''}
            style={{ width: FRAME_W, height: FRAME_H, backgroundImage: p.bg && p.bg !== 'loading' && p.bg.url ? `url("${p.bg.url}")` : undefined }}>
            <div className="nodearea" style={{ left: NODE_AREA.x, top: NODE_AREA.y, width: NODE_AREA.w, height: NODE_AREA.h }} />
          </div>
        </ViewportPortal>
        <Controls showInteractive={false} showFitView={false}><ControlButton className="react-flow__controls-fitview" data-testid="ed-fit" title="Show the whole map" aria-label="Show the whole map" onClick={fit}>⤢</ControlButton></Controls>
        <MiniMap pannable zoomable style={{ width: 150, height: 90 }} />
      </ReactFlow>
    </div>
  );
}
