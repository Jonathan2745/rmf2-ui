import { Handle, Position, type NodeProps } from '@xyflow/react';

type MapNodeData = {
  label?: string;
  selected?: boolean;
};

const NODE_SIZE = 18;

export function MapNode({ data }: NodeProps) {
  const nodeData = data as MapNodeData;

  return (
    <div
      style={{
        position: 'relative',
        width: NODE_SIZE,
        height: NODE_SIZE,
        overflow: 'visible',
        boxSizing: 'border-box',
      }}
      title={nodeData.label}
    >
      <Handle
        id="center-source"
        type="source"
        position={Position.Top}
        isConnectable={false}
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          right: 'auto',
          bottom: 'auto',
          width: 1,
          height: 1,
          minWidth: 1,
          minHeight: 1,
          transform: 'translate(-50%, -50%)',
          opacity: 0,
          pointerEvents: 'none',
          border: 0,
          background: 'transparent',
        }}
      />

      <Handle
        id="center-target"
        type="target"
        position={Position.Top}
        isConnectable={false}
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          right: 'auto',
          bottom: 'auto',
          width: 1,
          height: 1,
          minWidth: 1,
          minHeight: 1,
          transform: 'translate(-50%, -50%)',
          opacity: 0,
          pointerEvents: 'none',
          border: 0,
          background: 'transparent',
        }}
      />

      <div
        style={{
          width: NODE_SIZE,
          height: NODE_SIZE,
          borderRadius: '999px',
          background: nodeData.selected ? '#2563eb' : '#111827',
          border: '2px solid white',
          boxSizing: 'border-box',
          boxShadow: nodeData.selected
            ? '0 0 0 5px rgba(37, 99, 235, 0.3), 0 2px 8px rgba(15, 23, 42, 0.35)'
            : '0 2px 6px rgba(15, 23, 42, 0.35)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: NODE_SIZE + 6,
          left: '50%',
          transform: 'translateX(-50%)',
          whiteSpace: 'nowrap',
          fontSize: 10,
          fontWeight: 600,
          lineHeight: 1.2,
          color: '#0f172a',
          background: 'rgba(255, 255, 255, 0.92)',
          border: '1px solid rgba(148, 163, 184, 0.45)',
          borderRadius: 4,
          padding: '1px 5px',
          pointerEvents: 'none',
        }}
      >
        {nodeData.label}
      </div>
    </div>
  );
}
