import { createContext, useContext, useMemo, useRef, useState } from 'react';

import type {
  LoadMessage,
  LoadStatus,
  LifDocument,
  LifData,
  LifNodeCreationOptions,
  LifMapTool,
  ImageOverlay,
} from './lif-types';
import {
  EMPTY_LIF_DOCUMENT,
  DEFAULT_LIF_NODE_CREATION_OPTIONS,
  DEFAULT_LIF_MAP_SCALE,
  EMPTY_LIF_NODES,
  EMPTY_LIF_EDGES,
} from './constants';

// export interface UseLifEditorProps extends UseLifMapProps {}

export interface UseLifDataProps {
  lifData?: LifData;
}

export interface UseLifEditorProps extends UseLifDataProps {
  lifData: LifData;
  showGrid?: boolean;
  initialViewMode?: 'editor' | 'map';
}


export function useLifEditor(props: UseLifEditorProps) {
  const { lifData, showGrid: showGridDefault } = props;

  // TODO(Jonathan): set up initilization of lifDocument from lifData [to put within component ?]
  const [lifDocument, setLifDocument] = useState<LifDocument | null>(
    EMPTY_LIF_DOCUMENT,
  );
  const [layoutIndex, setLayoutIndex] = useState<number>(0);

  const lifClient = lifData?.lifClient;
  const layout = lifDocument?.layouts[layoutIndex] ?? null;
  const lifNodes = layout?.nodes ?? EMPTY_LIF_NODES;
  const lifEdges = layout?.edges ?? EMPTY_LIF_EDGES;

  const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading');
  const [loadMessage, setLoadMessage] = useState<LoadMessage | undefined>();

  // TODO(Jonathan): combine states or switch to using ref for better performance?
  const [showGrid, setShowGrid] = useState<boolean>(showGridDefault ?? true);
  const [selectedLifNode, setSelectedLifNode] = useState<string | null>(null);
  const [selectedLifEdge, setSelectedLifEdge] = useState<string | null>(null);

  const [adjacentNodeCreateOptions, setAdjacentNodeCreateOptions] =
    useState<LifNodeCreationOptions | null>(DEFAULT_LIF_NODE_CREATION_OPTIONS);
  const [ViewScale, setViewScale] = useState<number>(DEFAULT_LIF_MAP_SCALE);
  const [imageOverlay, setImageOverlay] = useState<ImageOverlay | null>(null);
  // References

  // Undo functionality
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);

  // Tool selection
  const [tool, setTool] = useState<LifMapTool>('select');

  return {
    lifClient,
    lifNodes,
    lifEdges,
    lifDocument,
    setLifDocument,

    selectedLifEdge,
    setSelectedLifEdge,
    selectedLifNode,
    setSelectedLifNode,
    loadStatus,
    setLoadStatus,
    loadMessage,
    setLoadMessage,

    ViewScale,
    setViewScale,

    showGrid,
    setShowGrid,

    canUndo,
    setCanUndo,
    canRedo,
    setCanRedo,

    tool,
    setTool,
    adjacentNodeCreateOptions,
    setAdjacentNodeCreateOptions,

    imageOverlay,
    setImageOverlay,
  };
}

export type UseLifEditorReturn = ReturnType<typeof useLifEditor>;
export const LifEditorContext = createContext<UseLifEditorReturn | undefined>(
  undefined,
);

export function useLifEditorContext() {
  const lifEditorContext = useContext(LifEditorContext);
  if (lifEditorContext === undefined) {
    throw new Error(
      'useLifEditorContext must be used within a LifEditorProvider',
    );
  }
  return lifEditorContext;
}

export function useLifEditorEditPanel() {
  const {
    selectedLifNode,
    selectedLifEdge,
    lifNodes,
    adjacentNodeCreateOptions,
    tool,
    setTool,
    imageOverlay,
    setImageOverlay,
  } = useLifEditorContext();

  return {
    selectedNode: selectedLifNode,
    selectedEdge: selectedLifEdge,
    lifNodes,
    adjacentNodeCreateOptions,

    imageOverlay,
    onImageOverlayChange: setImageOverlay,
  };
}

export function useLifEditorStatusPanel() {
  const { loadStatus, loadMessage, lifDocument } = useLifEditorContext();

  return {
    loadStatus,
    loadMessage,
    lifDocument,
  };
}

export function useLifEditorLoadingOverlay() {
  const { loadStatus, loadMessage } = useLifEditorContext();

  return { loadStatus, loadMessage };
}

export function useLifEditorSceneControl() {
  const { showGrid, setShowGrid, ViewScale, setViewScale } =
    useLifEditorContext();

  return {
    showGrid,
    setShowGrid,
    ViewScale,
    setViewScale,
  };
}

export function useLifEditorCommandBar() {
  const { tool, setTool, canUndo, canRedo } = useLifEditorContext();

  return {
    tool,
    setTool,
    canUndo,
    canRedo,
  };
}
