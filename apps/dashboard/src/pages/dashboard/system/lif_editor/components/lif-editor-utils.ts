import { MarkerType, type Edge, type Node } from '@xyflow/react';
import type {
  LifDocument,
  LifEdge,
  LifLayout,
  LifNode,
  LifNodeCreationOption,
} from './lif-types';
import { toRfX, toRfY } from './constants';

export type LifFlowNode = Node<{ label: string; lifNode: LifNode }, 'lifNode'>;
export type LifFlowEdge = Edge<{ lifEdge: LifEdge }>;

export function lifNodeToRf(node: LifNode): LifFlowNode {
  return {
    id: node.nodeId,
    position: {
      x: toRfX(node.nodePosition.x),
      y: toRfY(node.nodePosition.y),
    },
    data: { label: node.nodeName || node.nodeId, lifNode: node },
    type: 'lifNode',
  };
}

export function lifEdgeToRf(edge: LifEdge): LifFlowEdge {
  return {
    id: edge.edgeId,
    source: edge.startNodeId,
    target: edge.endNodeId,
    label: edge.edgeName || edge.edgeId,
    data: { lifEdge: edge },
    type: 'straight',
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: '#16a085',
      width: 16,
      height: 16,
    },
    style: { strokeWidth: 2, stroke: '#1abc9c' },
  };
}

export function patchLayout(
  document: LifDocument,
  layoutIndex: number,
  patch: Partial<LifLayout>,
): LifDocument {
  return {
    ...document,
    layouts: document.layouts.map((layout, index) =>
      index === layoutIndex ? { ...layout, ...patch } : layout,
    ),
  };
}

export function undirectedEdgeKey(startNodeId: string, endNodeId: string) {
  return [startNodeId, endNodeId].sort().join('::');
}

function parseGridId(value: string) {
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  return { x: Number(match[1]), y: Number(match[2]) };
}

function formatGridPart(value: number) {
  return Number.isInteger(value)
    ? String(value)
    : String(Number(value.toFixed(2)));
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function inferAxisStep(
  anchorNode: LifNode,
  anchorGrid: { x: number; y: number },
  nodes: LifNode[],
  axis: 'x' | 'y',
) {
  const otherAxis = axis === 'x' ? 'y' : 'x';
  const candidates = nodes.flatMap((node) => {
    const grid = parseGridId(node.nodeId);
    if (!grid || grid[otherAxis] !== anchorGrid[otherAxis]) return [];
    const gridDelta = grid[axis] - anchorGrid[axis];
    if (gridDelta === 0) return [];
    const step =
      (node.nodePosition[axis] - anchorNode.nodePosition[axis]) / gridDelta;
    return Number.isFinite(step) && step !== 0 ? [step] : [];
  });
  return average(candidates) ?? 1;
}

function inferAdjacentPosition(
  anchorNode: LifNode,
  targetGrid: { x: number; y: number },
  nodes: LifNode[],
) {
  const anchorGrid = parseGridId(anchorNode.nodeId);
  if (!anchorGrid) return { ...anchorNode.nodePosition };
  const xFromColumn = average(
    nodes.flatMap((node) => {
      const grid = parseGridId(node.nodeId);
      return grid?.x === targetGrid.x ? [node.nodePosition.x] : [];
    }),
  );
  const yFromRow = average(
    nodes.flatMap((node) => {
      const grid = parseGridId(node.nodeId);
      return grid?.y === targetGrid.y ? [node.nodePosition.y] : [];
    }),
  );
  return {
    x: Number(
      (
        xFromColumn ??
        anchorNode.nodePosition.x +
          (targetGrid.x - anchorGrid.x) *
            inferAxisStep(anchorNode, anchorGrid, nodes, 'x')
      ).toFixed(2),
    ),
    y: Number(
      (
        yFromRow ??
        anchorNode.nodePosition.y +
          (targetGrid.y - anchorGrid.y) *
            inferAxisStep(anchorNode, anchorGrid, nodes, 'y')
      ).toFixed(2),
    ),
  };
}

export function getAdjacentNodeCreateOptions(
  anchorNode: LifNode | null,
  nodes: LifNode[],
): LifNodeCreationOption[] {
  if (!anchorNode) return [];
  const anchorGrid = parseGridId(anchorNode.nodeId);
  if (!anchorGrid) return [];
  const usedIds = new Set(
    nodes.flatMap((node) => [node.nodeId, node.nodeName || node.nodeId]),
  );
  const candidates = [
    {
      dx: -1,
      dy: 0,
      label: 'Left',
      axis: 'x' as const,
      direction: -1 as const,
    },
    {
      dx: 0,
      dy: -1,
      label: 'Down',
      axis: 'y' as const,
      direction: -1 as const,
    },
    { dx: 0, dy: 1, label: 'Up', axis: 'y' as const, direction: 1 as const },
    { dx: 1, dy: 0, label: 'Right', axis: 'x' as const, direction: 1 as const },
  ];

  return candidates.flatMap((candidate) => {
    const nodeId = `${formatGridPart(anchorGrid.x + candidate.dx)},${formatGridPart(anchorGrid.y + candidate.dy)}`;
    if (usedIds.has(nodeId)) return [];
    const targetGrid = {
      x: anchorGrid.x + candidate.dx,
      y: anchorGrid.y + candidate.dy,
    };
    const defaultPosition = inferAdjacentPosition(
      anchorNode,
      targetGrid,
      nodes,
    );
    const fixedAxis = candidate.axis === 'x' ? 'y' : 'x';
    defaultPosition[fixedAxis] = Number(
      anchorNode.nodePosition[fixedAxis].toFixed(2),
    );
    const anchorCoordinate = anchorNode.nodePosition[candidate.axis];
    if (
      candidate.direction > 0
        ? defaultPosition[candidate.axis] <= anchorCoordinate
        : defaultPosition[candidate.axis] >= anchorCoordinate
    ) {
      const step = Math.max(
        Math.abs(inferAxisStep(anchorNode, anchorGrid, nodes, candidate.axis)),
        0.01,
      );
      defaultPosition[candidate.axis] = Number(
        (anchorCoordinate + candidate.direction * step).toFixed(2),
      );
    }
    return [
      {
        nodeId,
        nodeName: nodeId,
        label: `${nodeId} (${candidate.label})`,
        adjustableAxis: candidate.axis,
        axisDirection: candidate.direction,
        defaultPosition,
      },
    ];
  });
}
