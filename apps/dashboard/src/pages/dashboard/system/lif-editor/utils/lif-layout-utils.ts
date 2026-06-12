import type { LifDocument } from '../lif-editor-types';

export function cloneLayout(layout: LifDocument): LifDocument {
  return typeof structuredClone === 'function'
    ? structuredClone(layout)
    : JSON.parse(JSON.stringify(layout));
}

export function updateNodePosition(
  layout: LifDocument,
  nodeId: string,
  position: { x: number; y: number },
): LifDocument {
  return {
    ...layout,
    nodes: (layout.nodes ?? []).map((node) => {
      if (node.node_id !== nodeId) return node;

      return {
        ...node,
        x: position.x,
        y: position.y,
      };
    }),
  };
}
