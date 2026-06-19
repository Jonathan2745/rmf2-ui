import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toaster } from '@/components/ui/toaster';

import {
  Box,
  Button,
  Card,
  Center,
  Grid,
  HStack,
  Icon,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
} from '@chakra-ui/react';
import { Banner } from '@/components/banner';
import { MiniStatisticsCard } from '@/components/card';
import { IconBox } from '@/components/icons';

import { FiCircle, FiGitBranch, FiEdit3 } from 'react-icons/fi';

import {
  exportLifLayout,
  fetchLifLayout,
  importLifLayout,
  saveLifLayout,
} from './lif-editor-api';

import { type LifDocument } from './lif-editor-types';
import { LifEditorCanvas } from './components/lif-editor-canvas';
import { LifEditorSidePanel } from './components/lif-editor-side-panel';
import { cloneLayout, updateNodePosition } from './utils/lif-layout-utils';
import { downloadJsonFile } from './utils/download-json-file';

const LIF_LAYOUT_QUERY_KEY = ['LIFLayout'];

const EMPTY_LAYOUT: LifDocument = {
  metaInformation: {},
  layouts: [],
  map_info: {
    map_id: 'warehouse',
    map_version: '1.0',
    map_status: 'ENABLED',
    map_descriptor: 'Untitled Map',
  },
  nodes: [],
  edges: [],
};

export function LifEditorPage() {
  const [draftLayout, setDraftLayout] = useState<LifDocument | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const queryClient = useQueryClient();

  const {
    data: layout = EMPTY_LAYOUT,
    isPending: isLoading,
    isError: isLoadError,
    error: loadError,
  } = useQuery({
    queryKey: LIF_LAYOUT_QUERY_KEY,
    queryFn: fetchLifLayout,
    staleTime: 50 * 1000,
    gcTime: 0,
  });

  const handleImportButtonClick = () => {
    importInputRef.current?.click();
  };

  const handleImportFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await handleImport(file);
    event.target.value = '';
  };

  const activeLayout = useMemo(() => {
    return editMode && draftLayout ? draftLayout : layout;
  }, [editMode, draftLayout, layout]);

  const nodeCount = activeLayout.nodes?.length ?? 0;
  const edgeCount = activeLayout.edges?.length ?? 0;
  const brandColor = { base: 'brand.500', _dark: 'white' };
  const boxBg = { base: 'secondaryGray.300', _dark: 'whiteAlpha.100' };

  const confirmDiscardDraft = () => {
    if (!editMode) return true;

    return window.confirm(
      'You are editing a temporary copy. This action will discard your current draft edits. Continue?',
    );
  };

  // Error Toaster
  useEffect(() => {
    if (!isLoadError) {
      return;
    }
    const toasterId = 'lif-layout-load-error';
    if (toaster.isVisible(toasterId)) {
      return;
    }

    toaster.create({
      id: toasterId,
      title: 'Error Loading LIF Layout',
      description:
        loadError instanceof Error
          ? `${loadError.name}: ${loadError.message}`
          : 'Failed to load LIF layout',
      type: 'error',
      duration: 10000,
      closable: true,
    });
  }, [isLoadError, loadError]);

  const saveLayoutMutation = useMutation({
    mutationFn: saveLifLayout,
    onSuccess: (savedLayout) => {
      queryClient.setQueryData(LIF_LAYOUT_QUERY_KEY, savedLayout);
      setSelectedNodeId(null);

      toaster.create({
        title: 'LIF Layout Saved',
        description: 'The original LIF layout was saved successfully.',
        type: 'success',
        duration: 5000,
        closable: true,
      });
    },
    onError: (error) => {
      toaster.create({
        title: 'Failed to Save LIF Layout',
        description:
          error instanceof Error ? error.message : 'Failed to save LIF layout',
        type: 'error',
        duration: 10000,
        closable: true,
      });
    },
  });

  const importLayoutMutation = useMutation({
    mutationFn: importLifLayout,
    onSuccess: (importedLayout) => {
      queryClient.setQueryData(LIF_LAYOUT_QUERY_KEY, importedLayout);

      setDraftLayout(null);
      setEditMode(false);
      setSelectedNodeId(null);

      toaster.create({
        title: 'LIF File Imported',
        description: 'The imported LIF layout is now loaded.',
        type: 'success',
        duration: 5000,
        closable: true,
      });
    },
    onError: (error) => {
      toaster.create({
        title: 'Failed to Import LIF File',
        description:
          error instanceof Error ? error.message : 'Failed to import LIF file',
        type: 'error',
        duration: 10000,
        closable: true,
      });
    },
  });

  const exportLayoutMutation = useMutation({
    mutationFn: exportLifLayout,
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);

      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${layout.map_info?.map_id || 'layout'}.lif.json`;
      anchor.click();

      URL.revokeObjectURL(url);
    },
    onError: (error) => {
      toaster.create({
        title: 'Failed to Export LIF File',
        description:
          error instanceof Error ? error.message : 'Failed to export LIF file',
        type: 'error',
        duration: 10000,
        closable: true,
      });
    },
  });

  // const handleRefresh = async () => {
  //   if (!confirmDiscardDraft()) return;

  //   setDraftLayout(null);
  //   setEditMode(false);
  //   setSelectedNodeId(null);

  //   await queryClient.invalidateQueries({
  //     queryKey: LIF_LAYOUT_QUERY_KEY,
  //   });
  // };

  // const handleSave = async () => {
  //   if (editMode) {
  //     toaster.create({
  //       title: 'Cannot Save Temporary Copy',
  //       description:
  //         'You are editing a temporary copy. Export lif-temp.json instead, or cancel edit mode before saving the original layout.',
  //       type: 'warning',
  //       duration: 7000,
  //       closable: true,
  //     });
  //     return;
  //   }

  //   saveLayoutMutation.mutateAsync(layout);
  // };

  const handleImport = async (file: File) => {
    if (!confirmDiscardDraft()) return;

    importLayoutMutation.mutateAsync(file);
  };

  const handleExport = async () => {
    if (editMode) {
      handleExportDraft();
      return;
    }

    exportLayoutMutation.mutateAsync(layout);
  };

  const startEditing = () => {
    setDraftLayout(cloneLayout(layout));
    setEditMode(true);
    setSelectedNodeId(null);
  };

  const cancelEditing = () => {
    setDraftLayout(null);
    setEditMode(false);
    setSelectedNodeId(null);
  };

  const resetDraft = () => {
    setDraftLayout(cloneLayout(layout));
    setSelectedNodeId(null);
  };

  const handleExportDraft = () => {
    if (!draftLayout) {
      toaster.create({
        title: 'No temporary LIF draft is available to export.',
        description:
          'Create a temporary LIF layout before trying to export it.',
        type: 'warning',
        duration: 7000,
        closable: true,
      });
      return;
    }

    downloadJsonFile(draftLayout, 'lif-temp.json');
  };

  const handleMoveNode = (
    nodeId: string,
    position: {
      x: number;
      y: number;
    },
  ) => {
    setDraftLayout((currentDraft) => {
      if (!currentDraft) return currentDraft;

      return updateNodePosition(currentDraft, nodeId, position);
    });
  };

  const isSaving = saveLayoutMutation.isPending;
  const isImporting = importLayoutMutation.isPending;
  const isExporting = exportLayoutMutation.isPending;

  const isBusy = isLoading || isSaving || isImporting || isExporting;

  return (
    <Box>
      <Stack gap={4} h="full">
        <Stack gap={1}>
          <Banner.Root gradientFrom="purple.800" gradientTo="purple.100">
            <Banner.Header>
              Create, import, edit, and export route layouts.
            </Banner.Header>
            <Banner.Content>
              <Banner.Button
                borderRadius="5px"
                onClick={handleImportButtonClick}
                disabled={isBusy}
                bg="white"
                _hover={{ bg: 'whiteAlpha.800' }}
              >
                Import LIF
              </Banner.Button>

              <Banner.Button
                borderRadius="5px"
                onClick={handleExport}
                disabled={isBusy}
                bg="white"
                _hover={{ bg: 'whiteAlpha.800' }}
              >
                {editMode ? 'Export lif-temp.json' : 'Export LIF'}
              </Banner.Button>
            </Banner.Content>
          </Banner.Root>

          <input
            ref={importInputRef}
            type="file"
            accept=".json,.lif,.lif.json,application/json"
            hidden
            onChange={handleImportFileChange}
          />
          <Text color="fg.muted"></Text>
          <SimpleGrid
            columns={{ base: 2, sm: 2, md: 3, lg: 4 }}
            gap="20px"
            mt="20px"
          >
            <MiniStatisticsCard
              startContent={
                <IconBox
                  w="56px"
                  h="56px"
                  bg={boxBg}
                  icon={
                    <Icon w="32px" h="32px" as={FiEdit3} color={brandColor} />
                  }
                />
              }
              name="Editor Mode"
              value={editMode ? 'Edit Mode' : 'View Only'}
            />
            <MiniStatisticsCard
              startContent={
                <IconBox
                  w="56px"
                  h="56px"
                  bg={boxBg}
                  icon={
                    <Icon w="32px" h="32px" as={FiCircle} color={brandColor} />
                  }
                />
              }
              name="Total Nodes"
              value={nodeCount}
            />

            <MiniStatisticsCard
              startContent={
                <IconBox
                  w="56px"
                  h="56px"
                  bg={boxBg}
                  icon={
                    <Icon
                      w="32px"
                      h="32px"
                      as={FiGitBranch}
                      color={brandColor}
                    />
                  }
                />
              }
              name="Total Edges"
              value={edgeCount}
            />
          </SimpleGrid>
        </Stack>

        <Card.Root variant="outline">
          <Card.Body>
            <HStack justify="space-between" align="center" gap={3} wrap="wrap">
              <Stack gap={1}>
                <Text fontWeight="semibold">Temporary edit mode</Text>

                <Text fontSize="sm" color="fg.muted">
                  {editMode
                    ? 'You are editing a temporary copy. The original lif.json is not modified.'
                    : 'Enable edit mode to create a temporary copy of the current LIF layout.'}
                </Text>
              </Stack>

              <HStack gap={2} wrap="wrap">
                {!editMode ? (
                  <Button
                    size="sm"
                    colorPalette="blue"
                    onClick={startEditing}
                    disabled={isLoading}
                  >
                    Edit copy
                  </Button>
                ) : (
                  <>
                    <Button
                      size="sm"
                      colorPalette="green"
                      onClick={handleExportDraft}
                      disabled={!draftLayout}
                    >
                      Export lif-temp.json
                    </Button>

                    <Button
                      size="sm"
                      variant="surface"
                      colorPalette="orange"
                      onClick={resetDraft}
                      disabled={!draftLayout}
                    >
                      Reset edits
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      colorPalette="gray"
                      onClick={cancelEditing}
                    >
                      Cancel edit
                    </Button>
                  </>
                )}
              </HStack>
            </HStack>
          </Card.Body>
        </Card.Root>

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
                layout={activeLayout}
                selectedNodeId={selectedNodeId}
                onSelectNode={setSelectedNodeId}
                editable={editMode}
                onMoveNode={handleMoveNode}
              />
            )}
          </Box>

          <LifEditorSidePanel
            layout={activeLayout}
            selectedNodeId={selectedNodeId}
          />
        </Grid>
      </Stack>
    </Box>
  );
}

export default LifEditorPage;
