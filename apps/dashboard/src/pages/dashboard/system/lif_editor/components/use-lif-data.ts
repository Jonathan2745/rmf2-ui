import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  createContext,
} from 'react';

import type { LifEditorData } from '@/clients/lif-editor';

import type {
  LifDocument,
  LifEdge,
  LifLayout,
  LifMapTool,
  LifNode,
} from './lif-types';

import { EMPTY_LIF_EDGES, EMPTY_LIF_NODES } from './constants';

export interface UseLifDataProps {
  lifData: LifEditorData;
  showGrid?: boolean;
  initialViewMode?: 'editor' | 'map';
}

export function useLifData({
  lifData,
  showGrid: initialShowGrid = true,
  initialViewMode = 'map',
}: UseLifDataProps) {
  const initializedRef = useRef(false);

  const [draftDocument, setDraftDocument] = useState<LifDocument | null>(null);

  const [layoutIndex, setLayoutIndex] = useState(0);

  const [showGrid, setShowGrid] = useState(initialShowGrid);

  const [viewMode, setViewMode] = useState<'editor' | 'map'>(initialViewMode);

  const [tool, setTool] = useState<LifMapTool>('select');

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  const [canUndo, setCanUndo] = useState(false);

  const [canRedo, setCanRedo] = useState(false);

  const clearSelection = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }, []);

  const replaceDraft = useCallback(
    (document: LifDocument) => {
      setDraftDocument(structuredClone(document));
      setLayoutIndex(0);
      clearSelection();

      // Initialize/reset history here when implemented.
      setCanUndo(false);
      setCanRedo(false);
    },
    [clearSelection],
  );

  /*
   * Initialize the draft once when the server document
   * first becomes available.
   *
   * Automatic refetches should not overwrite an active
   * unsaved draft.
   */
  useEffect(() => {
    if (!lifData.sourceDocument) return;
    if (initializedRef.current) return;

    initializedRef.current = true;
    replaceDraft(lifData.sourceDocument);
  }, [lifData.sourceDocument, replaceDraft]);

  const layout = useMemo<LifLayout | null>(
    () => draftDocument?.layouts[layoutIndex] ?? null,
    [draftDocument, layoutIndex],
  );

  const lifNodes: LifNode[] = layout?.nodes ?? EMPTY_LIF_NODES;

  const lifEdges: LifEdge[] = layout?.edges ?? EMPTY_LIF_EDGES;

  const selectedLifNode = useMemo(
    () => lifNodes.find((node) => node.nodeId === selectedNodeId) ?? null,
    [lifNodes, selectedNodeId],
  );

  const selectedLifEdge = useMemo(
    () => lifEdges.find((edge) => edge.edgeId === selectedEdgeId) ?? null,
    [lifEdges, selectedEdgeId],
  );

  const switchLayout = useCallback(
    (nextIndex: number) => {
      if (!draftDocument?.layouts[nextIndex]) {
        return;
      }

      setLayoutIndex(nextIndex);
      clearSelection();
    },
    [draftDocument, clearSelection],
  );

  const updateCurrentLayout = useCallback(
    (update: (layout: LifLayout) => LifLayout) => {
      setDraftDocument((currentDocument) => {
        if (!currentDocument) {
          return currentDocument;
        }

        const currentLayout = currentDocument.layouts[layoutIndex];

        if (!currentLayout) {
          return currentDocument;
        }

        return {
          ...currentDocument,
          layouts: currentDocument.layouts.map((existingLayout, index) =>
            index === layoutIndex ? update(existingLayout) : existingLayout,
          ),
        };
      });
    },
    [layoutIndex],
  );

  const updateNode = useCallback(
    (originalNodeId: string, updatedNode: LifNode) => {
      updateCurrentLayout((currentLayout) => ({
        ...currentLayout,

        nodes: currentLayout.nodes.map((node) =>
          node.nodeId === originalNodeId ? updatedNode : node,
        ),

        // Keep connected edges valid after a node rename.
        edges: currentLayout.edges.map((edge) => ({
          ...edge,
          startNodeId:
            edge.startNodeId === originalNodeId
              ? updatedNode.nodeId
              : edge.startNodeId,
          endNodeId:
            edge.endNodeId === originalNodeId
              ? updatedNode.nodeId
              : edge.endNodeId,
        })),
      }));

      setSelectedNodeId(updatedNode.nodeId);
    },
    [updateCurrentLayout],
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      updateCurrentLayout((currentLayout) => ({
        ...currentLayout,

        nodes: currentLayout.nodes.filter((node) => node.nodeId !== nodeId),

        edges: currentLayout.edges.filter(
          (edge) => edge.startNodeId !== nodeId && edge.endNodeId !== nodeId,
        ),
      }));

      clearSelection();
    },
    [updateCurrentLayout, clearSelection],
  );

  const updateEdge = useCallback(
    (updatedEdge: LifEdge) => {
      updateCurrentLayout((currentLayout) => ({
        ...currentLayout,
        edges: currentLayout.edges.map((edge) =>
          edge.edgeId === updatedEdge.edgeId ? updatedEdge : edge,
        ),
      }));
    },
    [updateCurrentLayout],
  );

  const deleteEdge = useCallback(
    (edgeId: string) => {
      updateCurrentLayout((currentLayout) => ({
        ...currentLayout,
        edges: currentLayout.edges.filter((edge) => edge.edgeId !== edgeId),
      }));

      clearSelection();
    },
    [updateCurrentLayout, clearSelection],
  );

  /*
   * These actions coordinate local state with the backend,
   * but the HTTP/query implementation remains in
   * clients/lif-editor.ts.
   */
  const saveDraft = useCallback(async () => {
    if (!draftDocument) return;

    const savedDocument = await lifData.saveDocument(draftDocument);

    replaceDraft(savedDocument);
  }, [draftDocument, lifData.saveDocument, replaceDraft]);

  const importDraft = useCallback(
    async (file: File) => {
      const importedDocument = await lifData.importDocument(file);

      initializedRef.current = true;
      replaceDraft(importedDocument);
    },
    [lifData.importDocument, replaceDraft],
  );

  const reloadDraft = useCallback(async () => {
    const loadedDocument = await lifData.reload();

    if (!loadedDocument) return;

    initializedRef.current = true;
    replaceDraft(loadedDocument);
  }, [lifData.reload, replaceDraft]);

  const exportDraft = useCallback(async () => {
    if (!draftDocument) return;

    await lifData.exportDocument(draftDocument);
  }, [draftDocument, lifData.exportDocument]);

  const isDirty = useMemo(() => {
    if (!draftDocument || !lifData.sourceDocument) {
      return false;
    }

    return (
      JSON.stringify(draftDocument) !== JSON.stringify(lifData.sourceDocument)
    );
  }, [draftDocument, lifData.sourceDocument]);

  return {
    // Remote status/actions
    lifClient: lifData.lifClient,
    loadStatus: lifData.loadStatus,
    loadMessage: lifData.loadMessage,
    saving: lifData.saving,
    importing: lifData.importing,
    exporting: lifData.exporting,

    // Local document state
    draftDocument,
    setDraftDocument,
    layout,
    layoutIndex,
    switchLayout,
    lifNodes,
    lifEdges,
    isDirty,

    // Local view state
    showGrid,
    setShowGrid,
    viewMode,
    setViewMode,
    tool,
    setTool,

    // Selection
    selectedNodeId,
    setSelectedNodeId,
    selectedEdgeId,
    setSelectedEdgeId,
    selectedLifNode,
    selectedLifEdge,
    clearSelection,

    // Document mutations
    updateCurrentLayout,
    updateNode,
    deleteNode,
    updateEdge,
    deleteEdge,

    // Backend coordination
    saveDraft,
    importDraft,
    exportDraft,
    reloadDraft,

    // History placeholders
    canUndo,
    setCanUndo,
    canRedo,
    setCanRedo,
  };
}

export type UseLifDataReturn = ReturnType<typeof useLifData>;

export const LifEditorContext = createContext<UseLifDataReturn | undefined>(
  undefined,
);

export function useLifEditorContext() {
  const context = useContext(LifEditorContext);

  if (context === undefined) {
    throw new Error('useLifEditorContext must be used inside LifEditor.Root');
  }

  return context;
}
