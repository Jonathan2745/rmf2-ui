import { Box, Text } from '@chakra-ui/react';
import { LifEditorPanel } from './lif-editor-panel';
import type { LifEditorPanelProps } from './lif-editor-panel';
import { useLifEditorStatusPanel } from './use-lif-data';

export type LifEditorStatusPanelProps = Omit<LifEditorPanelProps, 'variant'>;

export function LifEditorStatusPanel(props: LifEditorStatusPanelProps) {
  const { nodeCount, edgeCount, layoutName, tool, edgeStartNodeId, isDirty } =
    useLifEditorStatusPanel();
  const instruction =
    tool === 'createEdge'
      ? edgeStartNodeId
        ? `Select target node for ${edgeStartNodeId}`
        : 'Select the first node, then the target node'
      : 'Select a node to create adjacent nodes from the right panel';

  return (
    <LifEditorPanel {...props} variant="bottom-panel">
      <Text fontSize="xs">
        Nodes: <strong>{nodeCount}</strong>
      </Text>
      <Text fontSize="xs">
        Edges: <strong>{edgeCount}</strong>
      </Text>
      {layoutName && (
        <Text fontSize="xs" color="fg.muted">
          {layoutName}
        </Text>
      )}
      {isDirty && (
        <Text fontSize="xs" color="orange.fg">
          Unsaved changes
        </Text>
      )}
      <Box flex={1} />
      <Text fontSize="xs" color="fg.muted">
        {instruction}
      </Text>
    </LifEditorPanel>
  );
}
