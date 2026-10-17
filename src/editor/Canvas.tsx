/** The graph canvas (level-editor.md §5.3): every node with its type, icon and title (the editor shows everything, §11); links
 *  labelled with danger and steps; cross-map links as stubs (double-click opens that map). Drag to move, drag handle to handle to
 *  link, Delete to remove, "+ node" to add. */
import { useEffect, useMemo } from 'react';
import { ReactFlow, Background, Controls, MiniMap, Handle, Position, useNodesState, useEdgesState, type Node, type Edge, type NodeProps, type Connection } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { Level } from '../shared/level/types';
import { isCrossMap } from './level-edit';

export const KIND_ICON: Record<string, string> = { waypoint: '·', fork: '⑂', village: '🏘️', town: '🏯', inn: '🛏️', portal: '🌀', stairs_up: '⬆️', stairs_down: '⬇️',
  chest: '🎁', npc: '🧑', miniboss: '⚔️', story: '📜', boss: '👑', exit: '🚪', lever: '🔧', shop: '🛒' };
const SCALE = 600;

type MapNodeData = { label: string; icon: string; kind: string; entry: boolean; locked: boolean; error: boolean };
function MapNode({ data, selected }: NodeProps<Node<MapNodeData>>) {
  return (
    <div className={`mapnode k-${data.kind}${selected ? ' sel' : ''}${data.error ? ' err' : ''}`} data-testid="ed-node">
      <Handle type="target" position={Position.Left} />
      <span className="icon">{data.icon}</span><span className="lbl">{data.label}</span>
      {data.entry && <span className="badge" title="entry">▶</span>}{data.locked && <span className="badge" title="quest gate">🔒</span>}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
function StubNode({ data }: NodeProps<Node<{ label: string }>>) {
  return <div className="stubnode" title="Double-click to open this map"><Handle type="target" position={Position.Left} />→ {data.label}</div>;
}
const nodeTypes = { map: MapNode, stub: StubNode };

export interface CanvasProps {
  level: Level; readOnly: boolean; errorAt: Set<string>;
  onSelect: (sel: { node?: string; edge?: string }) => void;
  onMove: (id: string, x: number, y: number) => void;
  onConnect: (from: string, to: string) => void;
  onDelete: (nodes: string[], edges: string[]) => void;
  onOpenMap: (id: string) => void;
}

export function Canvas(p: CanvasProps) {
  const aspect = p.level.aspect || 1.6;
  const { nodes, edges } = useMemo(() => {
    const ns: Node[] = p.level.nodes.map(n => ({
      id: n.id, type: 'map', position: { x: n.x * SCALE * aspect, y: n.y * SCALE }, draggable: !p.readOnly,
      data: { label: n.title?.en || n.id, icon: KIND_ICON[n.kind] ?? '?', kind: n.kind, entry: p.level.entry === n.id, locked: !!n.lockedUntilQuest, error: p.errorAt.has(`node:${n.id}`) },
    }));
    const es: Edge[] = [];
    for (const e of p.level.edges) {
      const label = `${e.kind && e.kind !== 'path' ? e.kind + ' ' : ''}${e.danger ?? ''}${e.steps ? '·' + e.steps : ''}${e.lockedUntilQuest ? ' 🔒' : ''}`;
      if (isCrossMap(e)) {
        const from = p.level.nodes.find(n => n.id === e.from);
        const stub = `stub:${e.id}`;
        ns.push({ id: stub, type: 'stub', draggable: false, selectable: false, data: { label: `${e.to.graph}/${e.to.node}`, graph: e.to.graph },
          position: { x: (from?.x ?? 0) * SCALE * aspect + 40, y: (from?.y ?? 0) * SCALE + 60 } });
        es.push({ id: e.id, source: e.from, target: stub, label: e.kind, className: 'xedge', data: { cross: true } });
      } else es.push({ id: e.id, source: e.from, target: e.to as string, label, className: p.errorAt.has(`edge:${e.id}`) ? 'err' : undefined });
    }
    return { nodes: ns, edges: es };
  }, [p.level, p.readOnly, p.errorAt, aspect]);

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<Node>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([]);
  useEffect(() => { setRfNodes(nodes); setRfEdges(edges); }, [nodes, edges, setRfNodes, setRfEdges]);

  return (
    <div className="canvas" data-testid="ed-canvas">
      <ReactFlow nodes={rfNodes} edges={rfEdges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} nodeTypes={nodeTypes} fitView minZoom={0.1} deleteKeyCode={p.readOnly ? null : ['Delete', 'Backspace']}
        nodesConnectable={!p.readOnly}
        onNodeClick={(_e, n) => { if (n.type === 'map') p.onSelect({ node: n.id }); }}
        onEdgeClick={(_e, e) => p.onSelect({ edge: e.id })}
        onPaneClick={() => p.onSelect({})}
        onNodeDoubleClick={(_e, n) => { if (n.type === 'stub') p.onOpenMap((n.data as any).graph); }}
        onNodeDragStop={(_e, n) => { if (n.type === 'map') p.onMove(n.id, n.position.x / (SCALE * aspect), n.position.y / SCALE); }}
        onConnect={(c: Connection) => { if (c.source && c.target && !c.target.startsWith('stub:') && c.source !== c.target) p.onConnect(c.source, c.target); }}
        onDelete={({ nodes: dn, edges: de }) => p.onDelete(dn.filter(n => n.type === 'map').map(n => n.id), de.map(e => e.id))}>
        <Background /><Controls /><MiniMap pannable zoomable />
      </ReactFlow>
    </div>
  );
}
