import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Card,
  Center,
  Grid,
  Spinner,
  Stack,
  Text,
} from '@chakra-ui/react';

import {
  exportLifLayout,
  fetchLifLayout,
  importLifLayout,
  saveLifLayout,
} from './lif-editor-api';

import type { LifLayout } from './lif-editor-types';

import { LifEditorCanvas } from './components/lif-editor-canvas';
import { LifEditorSidePanel } from './components/lif-editor-side-panel';
import { LifEditorToolbar } from './components/lif-editor-toolbar';

const EMPTY_LAYOUT: LifLayout = {
  name: 'Untitled LIF Layout',
  version: '1.0.0',
  nodes: [],
  edges: [],
  stations: [],
};

export function LifEditorPage() {
  const [layout, setLayout] = useState<LifLayout>(EMPTY_LAYOUT);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadLayout = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const nextLayout = await fetchLifLayout();
      setLayout(nextLayout);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load LIF layout';

      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLayout();
  }, [loadLayout]);

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const savedLayout = await saveLifLayout(layout);
      setLayout(savedLayout);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save LIF layout';

      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleImport = async (file: File) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const importedLayout = await importLifLayout(file);
      setLayout(importedLayout);
      setSelectedNodeId(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to import LIF file';

      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    setErrorMessage(null);

    try {
      const blob = await exportLifLayout(layout);
      const url = URL.createObjectURL(blob);

      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${layout.name || 'layout'}.lif.json`;
      anchor.click();

      URL.revokeObjectURL(url);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to export LIF file';

      setErrorMessage(message);
    }
  };

  return (
    <Stack gap={4} h="full">
      <Stack gap={1}>
        <Text fontSize="2xl" fontWeight="semibold">
          LIF Editor
        </Text>

        <Text color="fg.muted">
          Create, import, edit, and export VDA5050 LIF route layouts.
        </Text>
      </Stack>

      <LifEditorToolbar
        isLoading={isLoading}
        isSaving={isSaving}
        onRefresh={loadLayout}
        onSave={handleSave}
        onImport={handleImport}
        onExport={handleExport}
      />

      {errorMessage && (
        <Card.Root borderColor="red.300">
          <Card.Body>
            <Text color="fg.error">{errorMessage}</Text>
          </Card.Body>
        </Card.Root>
      )}

      <Grid
        templateColumns={{ base: '1fr', xl: '1fr 320px' }}
        gap={4}
        minH="600px"
      >
        <Box
          position="relative"
          h={{ base: '500px', xl: '70vh' }}
          borderWidth="1px"
          borderColor="border.subtle"
          rounded="lg"
          overflow="hidden"
          bg="white"
        >
          {isLoading ? (
            <Center h="full">
              <Spinner />
            </Center>
          ) : (
            <LifEditorCanvas
              layout={layout}
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
            />
          )}
        </Box>

        <LifEditorSidePanel layout={layout} selectedNodeId={selectedNodeId} />
      </Grid>
    </Stack>
  );
}

export default LifEditorPage;
