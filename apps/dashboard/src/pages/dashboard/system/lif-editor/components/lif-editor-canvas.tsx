import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
  type NodeTypes,
} from '@xyflow/react';

import { MapNode } from './map-node';
import '@xyflow/react/dist/style.css';

import type { LifDocument, LifEdge, LifNode } from '../lif-editor-types';

type LifEditorCanvasProps = {
  layout: LifDocument;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
};

const POSITION_SCALE = 12;

const nodeTypes: NodeTypes = {
  mapNode: MapNode,
};

function getNodeId(node: LifNode): string {
  return node.node_id;
}

function getNodeLabel(node: LifNode): string {
  return node.map_description?.trim() || node.node_id;
}

function getNodeX(node: LifNode): number {
  return node.x * POSITION_SCALE;
}

function getNodeY(node: LifNode): number {
  // Optional: invert Y if the graph appears upside-down compared to your map.
  return -node.y * POSITION_SCALE;
}

function getEdgeId(edge: LifEdge): string {
  return edge.edge_id;
}

function getEdgeLabel(edge: LifEdge): string {
  return edge.edge_id;
}

function toFlowNodes(nodes: LifNode[], selectedNodeId: string | null): Node[] {
  return nodes.map((node) => {
    const id = getNodeId(node);
    const isSelected = id === selectedNodeId;

    return {
      id,
      position: {
        x: getNodeX(node),
        y: getNodeY(node),
      },
      data: {
        label: getNodeLabel(node),
        selected: isSelected,
      },
      type: 'mapNode',
    };
  });
}

function toFlowEdges(edges: LifEdge[], nodes: LifNode[]): Edge[] {
  const nodeIds = new Set(nodes.map((node) => node.node_id));

  const skippedEdges: LifEdge[] = [];

  const flowEdges = edges
    .map((edge): Edge | null => {
      const source = edge.start_node_id;
      const target = edge.end_node_id;

      if (!nodeIds.has(source) || !nodeIds.has(target)) {
        skippedEdges.push(edge);
        return null;
      }

      return {
        id: getEdgeId(edge),
        source,
        target,
        sourceHandle: 'center-source',
        targetHandle: 'center-target',
        label: getEdgeLabel(edge),
        type: 'straight',
        markerEnd: edge.bidirectional
          ? undefined
          : {
              type: MarkerType.ArrowClosed,
              width: 12,
              height: 12,
            },
        style: {
          strokeWidth: 1.25,
        },
        labelStyle: {
          fontSize: 4,
          fontWeight: 600,
        },
        labelShowBg: true,
        labelBgStyle: {
          fill: 'white',
        },
        labelBgPadding: [4, 2],
        labelBgBorderRadius: 2,
        interactionWidth: 8,
      };
    })
    .filter((edge): edge is Edge => edge !== null);

  if (skippedEdges.length > 0) {
    console.warn('Skipped edges because source/target node was not found', {
      skippedCount: skippedEdges.length,
      firstSkippedEdges: skippedEdges.slice(0, 10),
      firstAvailableNodeIds: Array.from(nodeIds).slice(0, 20),
    });
  }

  return flowEdges;
}

export function LifEditorCanvas({
  layout,
  selectedNodeId,
  onSelectNode,
}: LifEditorCanvasProps) {
  const nodes = toFlowNodes(layout.nodes ?? [], selectedNodeId);
  const edges = toFlowEdges(layout.edges ?? [], layout.nodes ?? []);

  console.log('LIF canvas render', {
    rawNodeCount: layout.nodes?.length ?? 0,
    rawEdgeCount: layout.edges?.length ?? 0,
    renderedNodeCount: nodes.length,
    renderedEdgeCount: edges.length,
    firstRawNode: layout.nodes?.[0],
    firstRenderedNode: nodes[0],
    firstRawEdge: layout.edges?.[0],
    firstRenderedEdge: edges[0],
  });

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      minZoom={0.05}
      maxZoom={3}
      defaultEdgeOptions={{
        type: 'straight',
        style: {
          strokeWidth: 1,
        },
      }}
      onNodeClick={(_, node) => onSelectNode(node.id)}
      onPaneClick={() => onSelectNode(null)}
    >
      <MiniMap />
      <Controls />
      <Background />
    </ReactFlow>
  );
}
