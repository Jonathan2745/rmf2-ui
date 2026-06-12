import { useMemo } from 'react';
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

const POSITION_SCALE = 50;

const EDGE_STROKE_WIDTH = 2.5;
const EDGE_LABEL_FONT_SIZE = 10;
const EDGE_MARKER_SIZE = 18;

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
  return -node.y * POSITION_SCALE;
}

function getEdgeId(edge: LifEdge): string {
  return edge.edge_id;
}

function getEdgeLabel(edge: LifEdge): string {
  return edge.description?.trim() || edge.edge_id;
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

        // Keep these only if your MapNode has matching Handle IDs.
        sourceHandle: 'center-source',
        targetHandle: 'center-target',

        label: getEdgeLabel(edge),
        type: 'straight',

        markerEnd: edge.bidirectional
          ? undefined
          : {
              type: MarkerType.ArrowClosed,
              width: EDGE_MARKER_SIZE,
              height: EDGE_MARKER_SIZE,
            },

        style: {
          strokeWidth: EDGE_STROKE_WIDTH,
          stroke: '#475569',
        },

        labelStyle: {
          fontSize: EDGE_LABEL_FONT_SIZE,
          fontWeight: 700,
          fill: '#0f172a',
        },

        labelShowBg: true,
        labelBgStyle: {
          fill: '#ffffff',
          fillOpacity: 0.95,
        },
        labelBgPadding: [8, 5],
        labelBgBorderRadius: 6,

        interactionWidth: 16,
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
  const nodes = useMemo(
    () => toFlowNodes(layout.nodes ?? [], selectedNodeId),
    [layout.nodes, selectedNodeId],
  );

  const edges = useMemo(
    () => toFlowEdges(layout.edges ?? [], layout.nodes ?? []),
    [layout.edges, layout.nodes],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      nodeOrigin={[0.5, 0.5]}
      fitView
      fitViewOptions={{
        padding: 0.25,
      }}
      minZoom={0.05}
      maxZoom={4}
      defaultEdgeOptions={{
        type: 'straight',
        style: {
          strokeWidth: EDGE_STROKE_WIDTH,
          stroke: '#475569',
        },
      }}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable
      onNodeClick={(_, node) => onSelectNode(node.id)}
      onPaneClick={() => onSelectNode(null)}
    >
      <MiniMap zoomable pannable />
      <Controls />
      <Background gap={32} size={1} />
    </ReactFlow>
  );
}
