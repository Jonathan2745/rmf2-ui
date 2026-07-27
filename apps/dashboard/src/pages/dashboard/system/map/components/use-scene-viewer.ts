import { createContext, useContext, useMemo, useRef, useState } from 'react';
import {
  SCENE_URL,
  INITIAL_SHOW_ROOF_SLICE,
  INITIAL_ROOF_SLICE_HEIGHT,
} from './constants';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { CameraFrame } from './three-utils';
import { getRobotPosition } from './robot-utils';
import type { UseMapProps } from '@/clients/map';
import type {
  RobotConfig,
  RobotRuntime,
  RobotStatus,
  RobotMotionStatus,
} from './robot-types';

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

// Stable module-scope defaults so an omitted mapData prop doesn't create a
// fresh empty array/map (and thus a spuriously "changed" context value) on
// every render.
const EMPTY_ROBOT_CONFIGS: RobotConfig[] = [];
const EMPTY_MODEL_URL_MAP = new Map<string, string>();

export interface UseSceneViewerProps extends UseMapProps {
  sceneUri?: string;
  showPathLines?: boolean;
  showRoofSlice?: boolean;
  roofSliceHeight?: number;
}

// Pure, data-only status derivation — no dependency on the Three.js render
// tree, so the status panel reflects backend state even if rendering fails.
function robotMotionStatusFromBackendState(
  config: RobotConfig,
): RobotMotionStatus {
  if (config.enabled === false) return 'disabled';
  if (!config.position) return 'idle'; // no live telemetry — sitting at fallback spawn
  switch (config.backendState) {
    case 'driving':
      return 'moving';
    case 'stopped':
      return 'idle';
    default:
      return 'idle';
  }
}

function robotConfigToStatus(config: RobotConfig): RobotStatus {
  return {
    id: config.id,
    name: config.name ?? config.id,
    status: robotMotionStatusFromBackendState(config),
    position: getRobotPosition(config),
  };
}

export function useSceneViewer(props: UseSceneViewerProps) {
  const {
    mapData,
    sceneUri: sceneUriDefault,
    showPathLines: showPathLinesDefault,
    showRoofSlice: showRoofSliceDefault,
    roofSliceHeight: roofSliceHeightDefault,
  } = props;

  const mapClient = mapData?.mapClient;
  const robotConfigs = mapData?.robotConfigs ?? EMPTY_ROBOT_CONFIGS;
  const modelUrlMap = mapData?.modelUrlMap ?? EMPTY_MODEL_URL_MAP;

  const sceneUri = sceneUriDefault ?? SCENE_URL;
  const [loadStatus, setLoadStatus] = useState<LoadStatus>('success');
  const [loadMessage, setLoadMessage] = useState<LoadMessage | undefined>();
  const [orbitOrigin, setOrbitOrigin] = useState<CameraFrame | undefined>();

  // TODO(anyone): combine states or switch to using ref for better performance?
  const [showPathLines, setShowPathLines] = useState<boolean>(
    showPathLinesDefault ?? true,
  );
  const [showRoofSlice, setShowRoofSlice] = useState<boolean>(
    showRoofSliceDefault ?? INITIAL_SHOW_ROOF_SLICE,
  );
  const [roofSliceHeight, setRoofSliceHeight] = useState<number>(
    roofSliceHeightDefault ?? INITIAL_ROOF_SLICE_HEIGHT,
  );
  const [floorZ, setFloorZ] = useState<number | null>(null);

  const sceneContextRef = useRef<SceneContext>(null);
  // Three.js robot runtime state — refs (not state) because they're mutated
  // imperatively every frame/sync, mirroring sceneContextRef above.
  const robotsRef = useRef<Map<string, RobotRuntime>>(new globalThis.Map());
  const robotTemplatesRef = useRef<Map<string, THREE.Group> | null>(null);

  // Robot statuses for the status panel — derived purely from backend/query
  // data (robotConfigs), independent of the Three.js render tree. Falls back
  // to the first path waypoint (itself already backed by navigation-path.json
  // when the backend is unreachable, via getRobotPath's own fallback) when
  // there's no live position.
  const robotStatuses = useMemo<RobotStatus[]>(
    () => robotConfigs.map(robotConfigToStatus),
    [robotConfigs],
  );

  // Deliberately NOT wrapped in useMemo here — this hook just gathers state;
  // packaging it into one memoized context value is the provider's job (see
  // SceneViewerRoot), which keeps this hook usable independent of whether its
  // result ends up in a context at all, and keeps the memo's dependency list
  // colocated with the component that actually needs the stable reference.
  return {
    mapClient,
    sceneUri,
    sceneContextRef,
    orbitOrigin,
    setOrbitOrigin,
    loadStatus,
    setLoadStatus,
    loadMessage,
    setLoadMessage,
    showPathLines,
    setShowPathLines,
    showRoofSlice,
    setShowRoofSlice,
    roofSliceHeight,
    setRoofSliceHeight,
    robotConfigs,
    modelUrlMap,
    robotsRef,
    robotTemplatesRef,
    floorZ,
    setFloorZ,
    robotStatuses,
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
    mapClient,
    sceneUri,
    sceneContextRef,
    showRoofSlice,
    roofSliceHeight,
    robotsRef,
    setLoadStatus,
    setLoadMessage,
    setOrbitOrigin,
    setFloorZ,
  } = useSceneViewerContext();

  return {
    mapClient,
    sceneUri,
    sceneContextRef,
    showRoofSlice,
    roofSliceHeight,
    robotsRef,
    setLoadStatus,
    setLoadMessage,
    setOrbitOrigin,
    setFloorZ,
  };
}

export function useSceneViewerRobot() {
  const {
    mapClient,
    sceneContextRef,
    robotsRef,
    robotTemplatesRef,
    floorZ,
    robotConfigs,
    modelUrlMap,
    showPathLines,
  } = useSceneViewerContext();

  return {
    mapClient,
    sceneContextRef,
    robotsRef,
    robotTemplatesRef,
    floorZ,
    robotConfigs,
    modelUrlMap,
    showPathLines,
  };
}

export function useSceneViewerRobotStatusPanel() {
  const { robotStatuses } = useSceneViewerContext();
  return { robotStatuses };
}

export function useSceneViewerSceneControl() {
  const {
    loadStatus,
    showPathLines,
    setShowPathLines,
    showRoofSlice,
    setShowRoofSlice,
    roofSliceHeight,
    setRoofSliceHeight,
  } = useSceneViewerContext();

  return {
    loadStatus,
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
