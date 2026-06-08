import { Card, Stack, Text } from '@chakra-ui/react';
import type { LifLayout } from '../lif-editor-types';

type LifEditorSidePanelProps = {
  layout: LifLayout;
  selectedNodeId: string | null;
};

export function LifEditorSidePanel({
  layout,
  selectedNodeId,
}: LifEditorSidePanelProps) {
  const selectedNode = layout.nodes.find(
    (node) => node.nodeId === selectedNodeId,
  );

  return (
    <Card.Root variant="outline" h="full">
      <Card.Body gap={4}>
        <Stack gap={1}>
          <Text fontWeight="semibold">LIF Layout</Text>
          <Text fontSize="sm" color="fg.muted">
            {layout.name}
          </Text>
        </Stack>

        <Stack gap={1} fontSize="sm">
          <Text>Nodes: {layout.nodes.length}</Text>
          <Text>Edges: {layout.edges.length}</Text>
          <Text>Stations: {layout.stations?.length ?? 0}</Text>
        </Stack>

        {selectedNode && (
          <Stack gap={1} borderTopWidth="1px" pt={4}>
            <Text fontWeight="semibold">Selected Node</Text>
            <Text fontSize="sm">ID: {selectedNode.nodeId}</Text>
            <Text fontSize="sm">X: {selectedNode.x}</Text>
            <Text fontSize="sm">Y: {selectedNode.y}</Text>
            {selectedNode.description && (
              <Text fontSize="sm" color="fg.muted">
                {selectedNode.description}
              </Text>
            )}
          </Stack>
        )}
      </Card.Body>
    </Card.Root>
  );
}
