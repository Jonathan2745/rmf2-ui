import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { LifLayout } from '../lif-editor-types';

type LifEditorCanvasProps = {
  layout: LifLayout;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
};

function toFlowNodes(layout: LifLayout): Node[] {
  return layout.nodes.map((node) => ({
    id: node.nodeId,
    position: {
      x: node.x,
      y: node.y,
    },
    data: {
      label: node.description || node.nodeId,
    },
    type: 'default',
  }));
}

function toFlowEdges(layout: LifLayout): Edge[] {
  return layout.edges.map((edge) => ({
    id: edge.edgeId,
    source: edge.startNodeId,
    target: edge.endNodeId,
    label: edge.description || edge.edgeId,
  }));
}

export function LifEditorCanvas({
  layout,
  // selectedNodeId,
  onSelectNode,
}: LifEditorCanvasProps) {
  const nodes = toFlowNodes(layout);
  const edges = toFlowEdges(layout);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      fitView
      onNodeClick={(_, node) => onSelectNode(node.id)}
      onPaneClick={() => onSelectNode(null)}
    >
      <MiniMap />
      <Controls />
      <Background />
    </ReactFlow>
  );
}
