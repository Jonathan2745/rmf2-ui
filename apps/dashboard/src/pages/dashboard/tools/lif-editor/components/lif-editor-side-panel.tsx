import { Card, Stack, Text } from '@chakra-ui/react';
import type { LifDocument } from '../lif-editor-types';

type LifEditorSidePanelProps = {
  layout: LifDocument;
  selectedNodeId: string | null;
};

export function LifEditorSidePanel({
  layout,
  selectedNodeId,
}: LifEditorSidePanelProps) {
  const selectedNode = layout.nodes.find(
    (node) => node.node_id === selectedNodeId,
  );

  return (
    <Card.Root variant="outline" h="full">
      <Card.Body gap={4}>
        <Stack gap={1}>
          <Text fontWeight="semibold">LIF Layout</Text>
          <Text fontSize="sm" color="fg.muted">
            {layout.map_info?.map_id ?? 'layout'}
          </Text>
        </Stack>

        <Stack gap={1} fontSize="sm">
          <Text>Nodes: {layout.nodes.length}</Text>
          <Text>Edges: {layout.edges.length}</Text>
        </Stack>

        {selectedNode && (
          <Stack gap={1} borderTopWidth="1px" pt={4}>
            <Text fontWeight="semibold">Selected Node</Text>
            <Text fontSize="sm">ID: {selectedNode.node_id}</Text>
            <Text fontSize="sm">X: {selectedNode.x}</Text>
            <Text fontSize="sm">Y: {selectedNode.y}</Text>
            {selectedNode.map_description && (
              <Text fontSize="sm" color="fg.muted">
                {selectedNode.map_description}
              </Text>
            )}
          </Stack>
        )}
      </Card.Body>
    </Card.Root>
  );
}
