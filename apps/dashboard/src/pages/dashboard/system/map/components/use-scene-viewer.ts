import { createContext, useRef, useContext, useState } from 'react';
import {
  SCENE_URL,
  INITIAL_SHOW_ROOF_SLICE,
  INITIAL_ROOF_SLICE_HEIGHT,
} from './constants';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { CameraFrame } from './three-utils';

type LoadStatus = 'loading' | 'success' | 'error';
interface LoadMessage {
  title: string;
  description?: string;
}

interface SceneContext {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  loadingManager: THREE.LoadingManager;
  roofClipPlane: THREE.Plane;
}

export interface UseSceneViewerProps {
  sceneUri?: string;
  showGrid?: boolean;
  showDropPoint?: boolean;
  showPathLines?: boolean;
  showRoofSlice?: boolean;
  roofSliceHeight?: number;
}

export function useSceneViewer(props: UseSceneViewerProps) {
  const {
    sceneUri: sceneUriDefault,
    showGrid: showGridDefault,
    showDropPoint: showDropPointDefault,
    showPathLines: showPathLinesDefault,
    showRoofSlice: showRoofSliceDefault,
    roofSliceHeight: roofSliceHeightDefault,
  } = props;

  const sceneUri = sceneUriDefault ?? SCENE_URL;
  const [loadStatus, setLoadStatus] = useState<LoadStatus>('success');
  const [loadMessage, setLoadMessage] = useState<LoadMessage | undefined>();
  const [orbitOrigin, setOrbitOrigin] = useState<CameraFrame | undefined>();

  // TODO(anyone): combine states or switch to using ref for better performance?
  const [showGrid, setShowGrid] = useState<boolean>(showGridDefault ?? true);
  const [showDropPoint, setShowDropPoint] = useState<boolean>(
    showDropPointDefault ?? true,
  );
  const [showPathLines, setShowPathLines] = useState<boolean>(
    showPathLinesDefault ?? true,
  );
  const [showRoofSlice, setShowRoofSlice] = useState<boolean>(
    showRoofSliceDefault ?? INITIAL_SHOW_ROOF_SLICE,
  );
  const [roofSliceHeight, setRoofSliceHeight] = useState<number>(
    roofSliceHeightDefault ?? INITIAL_ROOF_SLICE_HEIGHT,
  );

  const sceneContextRef = useRef<SceneContext>(null);

  return {
    sceneUri,
    sceneContextRef,
    orbitOrigin,
    setOrbitOrigin,
    loadStatus,
    setLoadStatus,
    loadMessage,
    setLoadMessage,
    showGrid,
    setShowGrid,
    showDropPoint,
    setShowDropPoint,
    showPathLines,
    setShowPathLines,
    showRoofSlice,
    setShowRoofSlice,
    roofSliceHeight,
    setRoofSliceHeight,
  };
}

export type UseSceneViewerReturn = ReturnType<typeof useSceneViewer>;

export const SceneViewerContext = createContext<
  UseSceneViewerReturn | undefined
>(undefined);

const useSceneViewerContext = () => {
  const sceneViewerContext = useContext(SceneViewerContext);
  if (sceneViewerContext === undefined) {
    throw new Error(
      'useSceneViewerContext must be inside a SceneViewerContext.Provider',
    );
  }
  return sceneViewerContext;
};

export function useSceneViewerViewport3D() {
  const {
    sceneUri,
    sceneContextRef,
    showRoofSlice,
    roofSliceHeight,
    setLoadStatus,
    setLoadMessage,
    setOrbitOrigin,
  } = useSceneViewerContext();

  return {
    sceneUri,
    sceneContextRef,
    showRoofSlice,
    roofSliceHeight,
    setLoadStatus,
    setLoadMessage,
    setOrbitOrigin,
  };
}

export function useSceneViewerSceneControl() {
  const {
    loadStatus,
    showGrid,
    setShowGrid,
    showDropPoint,
    setShowDropPoint,
    showPathLines,
    setShowPathLines,
    showRoofSlice,
    setShowRoofSlice,
    roofSliceHeight,
    setRoofSliceHeight,
  } = useSceneViewerContext();

  return {
    loadStatus,
    showGrid,
    setShowGrid,
    showDropPoint,
    setShowDropPoint,
    showPathLines,
    setShowPathLines,
    showRoofSlice,
    setShowRoofSlice,
    roofSliceHeight,
    setRoofSliceHeight,
  };
}

export function useSceneViewerViewControl() {
  const { loadStatus, sceneContextRef, orbitOrigin } = useSceneViewerContext();

  return {
    loadStatus,
    sceneContextRef,
    orbitOrigin,
  };
}

export function useSceneViewerLoadingOverlay() {
  const { loadStatus, loadMessage } = useSceneViewerContext();

  return {
    loadStatus,
    loadMessage,
  };
}
