import { Handle, Position, type NodeProps } from '@xyflow/react';

type MapNodeData = {
  label: string;
  selected?: boolean;
};

export function MapNode({ data }: NodeProps) {
  const nodeData = data as MapNodeData;
  const isSelected = nodeData.selected ?? false;

  const size = isSelected ? 18 : 10;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '999px',
        border: isSelected ? '3px solid #3182ce' : '1px solid #1a202c',
        background: 'white',
        boxShadow: isSelected ? '0 0 0 4px rgba(66, 153, 225, 0.35)' : 'none',
        position: 'relative',
      }}
      title={nodeData.label}
    >
      <Handle
        id="center-source"
        type="source"
        position={Position.Top}
        style={{
          left: '50%',
          top: '50%',
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: 'none',
          transform: 'translate(-50%, -50%)',
        }}
      />

      <Handle
        id="center-target"
        type="target"
        position={Position.Top}
        style={{
          left: '50%',
          top: '50%',
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: 'none',
          transform: 'translate(-50%, -50%)',
        }}
      />
    </div>
  );
}
