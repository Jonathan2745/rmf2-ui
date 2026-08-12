import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toaster } from '@/components/ui/toaster';
import type {
  Connection,
  NodeMouseHandler,
  EdgeMouseHandler,
  XYPosition,
} from '@xyflow/react';
import type { LifEditorData } from '@/clients/lif-editor';
import type {
  AdjacentNodePreview,
  ImageOverlay,
  LifDocument,
  LifEdge,
  LifLayout,
  LifMapTool,
  LifNode,
  LifNodeCreationOption,
} from './lif-types';
import {
  EMPTY_LIF_EDGES,
  EMPTY_LIF_NODES,
  MAX_HISTORY,
  toLifX,
  toLifY,
} from './constants';
import {
  getAdjacentNodeCreateOptions,
  lifEdgeToRf,
  lifNodeToRf,
  undirectedEdgeKey,
} from './lif-editor-utils';

export interface UseLifDataProps {
  lifData: LifEditorData;
  showGrid?: boolean;
}

export function useLifData({
  lifData,
  showGrid: initialShowGrid = true,
}: UseLifDataProps) {
  const initializedRef = useRef(false);
  const baselineRef = useRef('');
  const snapshotsRef = useRef<string[]>([]);
  const snapshotIndexRef = useRef(-1);

  const [draftDocument, setDraftDocument] = useState<LifDocument | null>(null);
  const [layoutIndex, setLayoutIndex] = useState(0);
  const [showGrid, setShowGrid] = useState(initialShowGrid);
  const [tool, setTool] = useState<LifMapTool>('select');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [edgeStartNodeId, setEdgeStartNodeId] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [imageOverlay, setImageOverlay] = useState<ImageOverlay | null>(null);
  const [adjacentNodePreview, setAdjacentNodePreview] =
    useState<AdjacentNodePreview | null>(null);
  const [viewMode, setViewMode] = useState<'editor' | 'map'>('map');
  const [mapRotated, setMapRotated] = useState(false);

  const clearSelection = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setEdgeStartNodeId(null);
  }, []);

  const initializeHistory = useCallback((document: LifDocument) => {
    const serialized = JSON.stringify(document);
    snapshotsRef.current = [serialized];
    snapshotIndexRef.current = 0;
    setCanUndo(false);
    setCanRedo(false);
  }, []);

  const replaceDraft = useCallback(
    (document: LifDocument, markAsSaved = true) => {
      const draft = structuredClone(document);
      setDraftDocument(draft);
      setLayoutIndex(0);
      clearSelection();
      initializeHistory(draft);
      if (markAsSaved) baselineRef.current = JSON.stringify(draft);
    },
    [clearSelection, initializeHistory],
  );

  useEffect(() => {
    if (!lifData.sourceDocument || initializedRef.current) return;
    initializedRef.current = true;
    replaceDraft(lifData.sourceDocument);
  }, [lifData.sourceDocument, replaceDraft]);

  const mapImageAppliedRef = useRef(false);
  useEffect(() => {
    if (!lifData.mapImage || mapImageAppliedRef.current) return;
    mapImageAppliedRef.current = true;
    const { url, resolution, origin, width, height } = lifData.mapImage;
    setImageOverlay({
      url,
      opacity: 0.45,
      naturalW: width,
      naturalH: height,
      scale: resolution * 30,
      x: origin[0] * 30,
      y: -(origin[1] + height * resolution) * 30,
    });
  }, [lifData.mapImage]);

  useEffect(() => {
    return () => {
      if (imageOverlay?.url.startsWith('blob:')) {
        URL.revokeObjectURL(imageOverlay.url);
      }
    };
  }, [imageOverlay]);

  const layout = useMemo<LifLayout | null>(
    () => draftDocument?.layouts[layoutIndex] ?? null,
    [draftDocument, layoutIndex],
  );
  const lifNodes = layout?.nodes ?? EMPTY_LIF_NODES;
  const lifEdges = layout?.edges ?? EMPTY_LIF_EDGES;
  const selectedLifNode = useMemo(
    () => lifNodes.find((node) => node.nodeId === selectedNodeId) ?? null,
    [lifNodes, selectedNodeId],
  );
  const selectedLifEdge = useMemo(
    () => lifEdges.find((edge) => edge.edgeId === selectedEdgeId) ?? null,
    [lifEdges, selectedEdgeId],
  );
  const adjacentNodeCreateOptions = useMemo(
    () => getAdjacentNodeCreateOptions(selectedLifNode, lifNodes),
    [lifNodes, selectedLifNode],
  );
  const rfNodes = useMemo(() => lifNodes.map(lifNodeToRf), [lifNodes]);
  const rfEdges = useMemo(() => lifEdges.map(lifEdgeToRf), [lifEdges]);
  const isDirty = useMemo(
    () =>
      !!draftDocument && JSON.stringify(draftDocument) !== baselineRef.current,
    [draftDocument],
  );

  const commitDocument = useCallback(
    (update: (current: LifDocument) => LifDocument) => {
      setDraftDocument((current) => {
        if (!current) return current;
        const next = update(current);
        const serialized = JSON.stringify(next);
        snapshotsRef.current = snapshotsRef.current.slice(
          0,
          snapshotIndexRef.current + 1,
        );
        snapshotsRef.current.push(serialized);
        if (snapshotsRef.current.length > MAX_HISTORY) {
          snapshotsRef.current.shift();
        }
        snapshotIndexRef.current = snapshotsRef.current.length - 1;
        setCanUndo(snapshotIndexRef.current > 0);
        setCanRedo(false);
        return next;
      });
    },
    [],
  );

  const updateCurrentLayout = useCallback(
    (update: (layout: LifLayout) => LifLayout) => {
      commitDocument((current) => ({
        ...current,
        layouts: current.layouts.map((existing, index) =>
          index === layoutIndex ? update(existing) : existing,
        ),
      }));
    },
    [commitDocument, layoutIndex],
  );

  const undo = useCallback(() => {
    if (snapshotIndexRef.current <= 0) return;
    snapshotIndexRef.current -= 1;
    setDraftDocument(
      JSON.parse(
        snapshotsRef.current[snapshotIndexRef.current]!,
      ) as LifDocument,
    );
    clearSelection();
    setCanUndo(snapshotIndexRef.current > 0);
    setCanRedo(true);
  }, [clearSelection]);

  const redo = useCallback(() => {
    if (snapshotIndexRef.current >= snapshotsRef.current.length - 1) return;
    snapshotIndexRef.current += 1;
    setDraftDocument(
      JSON.parse(
        snapshotsRef.current[snapshotIndexRef.current]!,
      ) as LifDocument,
    );
    clearSelection();
    setCanUndo(true);
    setCanRedo(snapshotIndexRef.current < snapshotsRef.current.length - 1);
  }, [clearSelection]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const modifier = event.ctrlKey || event.metaKey;
      if (modifier && event.key.toLowerCase() === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if (
        modifier &&
        (event.key.toLowerCase() === 'y' ||
          (event.key.toLowerCase() === 'z' && event.shiftKey))
      ) {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [redo, undo]);

  const switchLayout = useCallback(
    (nextIndex: number) => {
      if (!draftDocument?.layouts[nextIndex]) return;
      setLayoutIndex(nextIndex);
      clearSelection();
    },
    [clearSelection, draftDocument],
  );

  const selectTool = useCallback(
    (nextTool: LifMapTool) => {
      if (nextTool === 'createNode' && !selectedLifNode) {
        setTool('select');
        toaster.create({
          title: 'Select a node first',
          description:
            'Choose the node you want to create from, then press create node.',
          type: 'info',
        });
        return;
      }
      setTool(nextTool);
      setSelectedEdgeId(null);
      setEdgeStartNodeId(null);
      setAdjacentNodePreview(null);
    },
    [selectedLifNode],
  );

  const createEdgeBetween = useCallback(
    (startNodeId: string, endNodeId: string) => {
      if (startNodeId === endNodeId) return;
      updateCurrentLayout((currentLayout) => {
        const key = undirectedEdgeKey(startNodeId, endNodeId);
        if (
          currentLayout.edges.some(
            (edge) =>
              undirectedEdgeKey(edge.startNodeId, edge.endNodeId) === key,
          )
        ) {
          return currentLayout;
        }
        const edgeId = `${startNodeId}_TO_${endNodeId}`;
        return {
          ...currentLayout,
          edges: [
            ...currentLayout.edges,
            {
              edgeId,
              edgeName: `${startNodeId} → ${endNodeId}`,
              startNodeId,
              endNodeId,
            },
          ],
        };
      });
      setSelectedEdgeId(`${startNodeId}_TO_${endNodeId}`);
      setSelectedNodeId(null);
      setEdgeStartNodeId(null);
    },
    [updateCurrentLayout],
  );

  const pickNode = useCallback(
    (nodeId: string) => {
      if (tool === 'createEdge') {
        if (!edgeStartNodeId) {
          setEdgeStartNodeId(nodeId);
          setSelectedNodeId(nodeId);
          setSelectedEdgeId(null);
        } else {
          createEdgeBetween(edgeStartNodeId, nodeId);
        }
        return;
      }
      setSelectedNodeId(nodeId);
      setSelectedEdgeId(null);
    },
    [createEdgeBetween, edgeStartNodeId, tool],
  );

  const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
  }, []);

  const onEdgeClick: EdgeMouseHandler = useCallback((_event, edge) => {
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
    setEdgeStartNodeId(null);
  }, []);

  const pickEdge = useCallback((edgeId: string) => {
    setSelectedEdgeId(edgeId);
    setSelectedNodeId(null);
    setEdgeStartNodeId(null);
  }, []);

  const onPaneClick = useCallback(() => {
    clearSelection();
    setAdjacentNodePreview(null);
  }, [clearSelection]);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      createEdgeBetween(connection.source, connection.target);
    },
    [createEdgeBetween],
  );

  const createNodeAt = useCallback(
    (position: XYPosition) => {
      if (tool !== 'createNode') return;
      const nodePosition = {
        x: Number(toLifX(position.x).toFixed(2)),
        y: Number(toLifY(position.y).toFixed(2)),
      };
      const baseId = `${nodePosition.x},${nodePosition.y}`;
      let nodeId = baseId;
      let suffix = 2;
      while (lifNodes.some((node) => node.nodeId === nodeId)) {
        nodeId = `${baseId}-${suffix++}`;
      }
      const newNode: LifNode = {
        nodeId,
        nodeName: nodeId,
        mapId: layout?.layoutId ?? 'map',
        nodePosition,
      };
      updateCurrentLayout((currentLayout) => ({
        ...currentLayout,
        nodes: [...currentLayout.nodes, newNode],
      }));
      setSelectedNodeId(nodeId);
      setSelectedEdgeId(null);
    },
    [layout?.layoutId, lifNodes, tool, updateCurrentLayout],
  );

  const createAdjacentNode = useCallback(
    (option: LifNodeCreationOption, coordinate: number) => {
      if (!selectedLifNode || !Number.isFinite(coordinate)) return;
      const anchorCoordinate =
        selectedLifNode.nodePosition[option.adjustableAxis];
      const directionIsValid =
        option.axisDirection > 0
          ? coordinate > anchorCoordinate
          : coordinate < anchorCoordinate;
      if (!directionIsValid) return;
      const nodePosition = {
        ...option.defaultPosition,
        [option.adjustableAxis]: Number(coordinate.toFixed(2)),
      };
      const newNode: LifNode = {
        nodeId: option.nodeId,
        nodeName: option.nodeName,
        mapId: selectedLifNode.mapId,
        nodePosition,
      };
      updateCurrentLayout((currentLayout) => ({
        ...currentLayout,
        nodes: [...currentLayout.nodes, newNode],
      }));
      setSelectedNodeId(newNode.nodeId);
      setSelectedEdgeId(null);
      setEdgeStartNodeId(null);
      setAdjacentNodePreview(null);
    },
    [selectedLifNode, updateCurrentLayout],
  );

  const updateNode = useCallback(
    (originalNodeId: string, updatedNode: LifNode) => {
      const nextNodeId = updatedNode.nodeId.trim();
      if (!nextNodeId) return;
      if (
        lifNodes.some(
          (node) =>
            node.nodeId === nextNodeId && node.nodeId !== originalNodeId,
        )
      )
        return;
      const nextNodeName = updatedNode.nodeName.trim() || nextNodeId;
      if (
        lifNodes.some(
          (node) =>
            (node.nodeName || node.nodeId) === nextNodeName &&
            node.nodeId !== originalNodeId,
        )
      )
        return;
      const savedNode = {
        ...updatedNode,
        nodeId: nextNodeId,
        nodeName: nextNodeName,
        nodePosition: {
          x: Number(updatedNode.nodePosition.x.toFixed(2)),
          y: Number(updatedNode.nodePosition.y.toFixed(2)),
        },
      };
      updateCurrentLayout((currentLayout) => ({
        ...currentLayout,
        nodes: currentLayout.nodes.map((node) =>
          node.nodeId === originalNodeId ? savedNode : node,
        ),
        edges: currentLayout.edges.map((edge) => {
          const startNodeId =
            edge.startNodeId === originalNodeId
              ? savedNode.nodeId
              : edge.startNodeId;
          const endNodeId =
            edge.endNodeId === originalNodeId
              ? savedNode.nodeId
              : edge.endNodeId;
          const oldAutoId = `${edge.startNodeId}_TO_${edge.endNodeId}`;
          const newAutoId = `${startNodeId}_TO_${endNodeId}`;
          const oldAutoName = `${edge.startNodeId} → ${edge.endNodeId}`;
          return {
            ...edge,
            startNodeId,
            endNodeId,
            edgeId: edge.edgeId === oldAutoId ? newAutoId : edge.edgeId,
            edgeName:
              edge.edgeName === oldAutoName || edge.edgeName === oldAutoId
                ? `${startNodeId} → ${endNodeId}`
                : edge.edgeName,
          };
        }),
      }));
      setSelectedNodeId(savedNode.nodeId);
    },
    [lifNodes, updateCurrentLayout],
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
    [clearSelection, updateCurrentLayout],
  );

  const deleteEdge = useCallback(
    (edgeId: string) => {
      updateCurrentLayout((currentLayout) => ({
        ...currentLayout,
        edges: currentLayout.edges.filter((edge) => edge.edgeId !== edgeId),
      }));
      clearSelection();
    },
    [clearSelection, updateCurrentLayout],
  );

  const deleteSelection = useCallback(() => {
    if (selectedNodeId) deleteNode(selectedNodeId);
    else if (selectedEdgeId) deleteEdge(selectedEdgeId);
  }, [deleteEdge, deleteNode, selectedEdgeId, selectedNodeId]);

  const importImage = useCallback(
    async (file: File) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        const xs = rfNodes.map((node) => node.position.x);
        const ys = rfNodes.map((node) => node.position.y);
        const minX = xs.length ? Math.min(...xs) - 60 : 0;
        const minY = ys.length ? Math.min(...ys) - 60 : 0;
        const maxX = xs.length ? Math.max(...xs) + 60 : 400;
        const maxY = ys.length ? Math.max(...ys) + 60 : 400;
        setImageOverlay({
          url,
          opacity: 0.5,
          naturalW: image.naturalWidth,
          naturalH: image.naturalHeight,
          scale: Math.min(
            (maxX - minX) / image.naturalWidth,
            (maxY - minY) / image.naturalHeight,
          ),
          x: minX,
          y: minY,
        });
      };
      image.onerror = () => URL.revokeObjectURL(url);
      image.src = url;
    },
    [rfNodes],
  );

  const saveDraft = useCallback(async () => {
    if (!draftDocument) return;
    try {
      const saved = await lifData.saveDocument(draftDocument);
      replaceDraft(saved);
      toaster.create({ title: 'LIF layout saved', type: 'success' });
    } catch (error) {
      toaster.create({
        title: 'Save failed',
        description: String(error),
        type: 'error',
      });
    }
  }, [draftDocument, lifData, replaceDraft]);

  const importDraft = useCallback(
    async (file: File) => {
      try {
        const imported = await lifData.importDocument(file);
        initializedRef.current = true;
        replaceDraft(imported);
        toaster.create({ title: 'LIF layout imported', type: 'success' });
      } catch (error) {
        toaster.create({
          title: 'Import failed',
          description: String(error),
          type: 'error',
        });
      }
    },
    [lifData, replaceDraft],
  );

  const exportDraft = useCallback(async () => {
    if (!draftDocument) return;
    try {
      await lifData.exportDocument(draftDocument);
    } catch (error) {
      toaster.create({
        title: 'Export failed',
        description: String(error),
        type: 'error',
      });
    }
  }, [draftDocument, lifData]);

  const reloadDraft = useCallback(async () => {
    try {
      const loaded = await lifData.reload();
      if (loaded) replaceDraft(loaded);
    } catch (error) {
      toaster.create({
        title: 'Reload failed',
        description: String(error),
        type: 'error',
      });
    }
  }, [lifData, replaceDraft]);

  return {
    loadStatus: lifData.loadStatus,
    loadMessage: lifData.loadMessage,
    saving: lifData.saving,
    importing: lifData.importing,
    exporting: lifData.exporting,
    draftDocument,
    layout,
    layoutIndex,
    lifNodes,
    lifEdges,
    rfNodes,
    rfEdges,
    isDirty,
    showGrid,
    setShowGrid,
    tool,
    selectTool,
    selectedNodeId,
    selectedEdgeId,
    selectedLifNode,
    selectedLifEdge,
    edgeStartNodeId,
    adjacentNodeCreateOptions,
    imageOverlay,
    setImageOverlay,
    adjacentNodePreview,
    setAdjacentNodePreview,
    viewMode,
    setViewMode,
    mapRotated,
    setMapRotated,
    mapImage: lifData.mapImage,
    canUndo,
    canRedo,
    undo,
    redo,
    switchLayout,
    onNodeClick,
    onEdgeClick,
    onPaneClick,
    onConnect,
    createNodeAt,
    pickNode,
    pickEdge,
    createEdgeBetween,
    createAdjacentNode,
    updateNode,
    updateEdge,
    deleteNode,
    deleteEdge,
    deleteSelection,
    importImage,
    saveDraft,
    importDraft,
    exportDraft,
    reloadDraft,
  };
}

export type UseLifDataReturn = ReturnType<typeof useLifData>;
export const LifEditorContext = createContext<UseLifDataReturn | undefined>(
  undefined,
);

export function useLifEditorContext() {
  const context = useContext(LifEditorContext);
  if (!context) {
    throw new Error('useLifEditorContext must be used inside LifEditor.Root');
  }
  return context;
}

export function useLifEditorViewport() {
  const context = useLifEditorContext();
  return {
    rfNodes: context.rfNodes,
    rfEdges: context.rfEdges,
    showGrid: context.showGrid,
    tool: context.tool,
    imageOverlay: context.imageOverlay,
    lifNodes: context.lifNodes,
    lifEdges: context.lifEdges,
    selectedNodeId: context.selectedNodeId,
    selectedEdgeId: context.selectedEdgeId,
    edgeStartNodeId: context.edgeStartNodeId,
    adjacentNodePreview: context.adjacentNodePreview,
    viewMode: context.viewMode,
    mapRotated: context.mapRotated,
    setMapRotated: context.setMapRotated,
    mapImage: context.mapImage,
    onNodeClick: context.onNodeClick,
    onEdgeClick: context.onEdgeClick,
    onPaneClick: context.onPaneClick,
    onConnect: context.onConnect,
    createNodeAt: context.createNodeAt,
    pickNode: context.pickNode,
    pickEdge: context.pickEdge,
    createEdgeBetween: context.createEdgeBetween,
    deleteNode: context.deleteNode,
    deleteEdge: context.deleteEdge,
  };
}

export function useLifEditorSceneControl() {
  const context = useLifEditorContext();
  return {
    tool: context.tool,
    selectTool: context.selectTool,
    showGrid: context.showGrid,
    viewMode: context.viewMode,
    setShowGrid: context.setShowGrid,
    hasSelection: !!context.selectedNodeId || !!context.selectedEdgeId,
    deleteSelection: context.deleteSelection,
    canUndo: context.canUndo,
    canRedo: context.canRedo,
    undo: context.undo,
    redo: context.redo,
  };
}

export function useLifEditorCommandBar() {
  const context = useLifEditorContext();
  return {
    document: context.draftDocument,
    layout: context.layout,
    layoutIndex: context.layoutIndex,
    isDirty: context.isDirty,
    imageOverlay: context.imageOverlay,
    viewMode: context.viewMode,
    setViewMode: context.setViewMode,
    saving: context.saving,
    importing: context.importing,
    exporting: context.exporting,
    switchLayout: context.switchLayout,
    saveDraft: context.saveDraft,
    importDraft: context.importDraft,
    exportDraft: context.exportDraft,
    reloadDraft: context.reloadDraft,
    importImage: context.importImage,
  };
}

export function useLifEditorEditPanel() {
  const context = useLifEditorContext();
  return {
    selectedNode: context.selectedLifNode,
    selectedEdge: context.selectedLifEdge,
    lifNodes: context.lifNodes,
    adjacentNodeCreateOptions: context.adjacentNodeCreateOptions,
    showCreateAdjacentNode: context.tool === 'createNode',
    imageOverlay: context.imageOverlay,
    onImageOverlayChange: context.setImageOverlay,
    onAdjacentNodePreviewChange: context.setAdjacentNodePreview,
    onNodeSave: context.updateNode,
    onEdgeUpdate: context.updateEdge,
    onCreateAdjacentNode: context.createAdjacentNode,
    onDeleteNode: context.deleteNode,
    onDeleteEdge: context.deleteEdge,
    importImage: context.importImage,
  };
}

export function useLifEditorStatusPanel() {
  const context = useLifEditorContext();
  return {
    nodeCount: context.lifNodes.length,
    edgeCount: context.lifEdges.length,
    layoutName: context.layout?.layoutName ?? context.layout?.layoutId,
    tool: context.tool,
    edgeStartNodeId: context.edgeStartNodeId,
    isDirty: context.isDirty,
  };
}

export function useLifEditorLoadingOverlay() {
  const { loadStatus, loadMessage } = useLifEditorContext();
  return { loadStatus, loadMessage };
}
