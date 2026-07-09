import { createContext, useContext, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import {
  SCENE_URL,
  INITIAL_SHOW_ROOF_SLICE,
  INITIAL_ROOF_SLICE_HEIGHT,
} from './constants';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { CameraFrame } from './three-utils';
import type { IMapClient, UseMapProps } from '@/clients/map';
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

// Robot data (mapClient, robotConfigs, modelUrlMap) is fetched at the page
// level via clients/map.ts's useMapData() and handed in via UseMapProps —
// SceneViewer itself doesn't own data-fetching, only rendering. Stable
// module-scope defaults so an omitted prop doesn't create a fresh empty
// array/map (and thus a "changed" context value) on every render.
const EMPTY_ROBOT_CONFIGS: RobotConfig[] = [];
const EMPTY_MODEL_URL_MAP = new Map<string, string>();

// Scene-control/runtime props only — deliberately independent of UseMapProps
// so map data stays a separate, parallel concern (see SceneViewerRootProps).
export interface UseSceneViewerProps {
  sceneUri?: string;
  showGrid?: boolean;
  showDropPoint?: boolean;
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
  const firstWaypoint = config.path?.[0];
  const position = config.position
    ? { x: config.position.x, y: config.position.y, z: 0 }
    : firstWaypoint
      ? { x: firstWaypoint.x, y: firstWaypoint.y, z: firstWaypoint.z }
      : { x: 0, y: 0, z: 0 };

  return {
    id: config.id,
    name: config.name ?? config.id,
    status: robotMotionStatusFromBackendState(config),
    position,
  };
}

// ── Scene runtime context — camera/loading/scene-graph state ────────────────
// Changes on scene load, camera framing, and roof-related geometry lookups.
// Deliberately excludes UI-toggle state and robot data so those don't force
// this context's consumers (mainly Viewport3D) to re-render unnecessarily.

interface SceneRuntimeValue {
  sceneUri: string;
  sceneContextRef: RefObject<SceneContext | null>;
  orbitOrigin: CameraFrame | undefined;
  setOrbitOrigin: (value: CameraFrame | undefined) => void;
  loadStatus: LoadStatus;
  setLoadStatus: (value: LoadStatus) => void;
  loadMessage: LoadMessage | undefined;
  setLoadMessage: (value: LoadMessage | undefined) => void;
  floorZ: number | null;
  setFloorZ: (value: number | null) => void;
}

const SceneRuntimeContext = createContext<SceneRuntimeValue | undefined>(
  undefined,
);

export function useSceneRuntimeState(sceneUriProp?: string): SceneRuntimeValue {
  const sceneUri = sceneUriProp ?? SCENE_URL;
  const [loadStatus, setLoadStatus] = useState<LoadStatus>('success');
  const [loadMessage, setLoadMessage] = useState<LoadMessage | undefined>();
  const [orbitOrigin, setOrbitOrigin] = useState<CameraFrame | undefined>();
  const [floorZ, setFloorZ] = useState<number | null>(null);
  const sceneContextRef = useRef<SceneContext>(null);

  return useMemo(
    () => ({
      sceneUri,
      sceneContextRef,
      orbitOrigin,
      setOrbitOrigin,
      loadStatus,
      setLoadStatus,
      loadMessage,
      setLoadMessage,
      floorZ,
      setFloorZ,
    }),
    [sceneUri, orbitOrigin, loadStatus, loadMessage, floorZ],
  );
}

function useSceneRuntimeContext(): SceneRuntimeValue {
  const ctx = useContext(SceneRuntimeContext);
  if (ctx === undefined) {
    throw new Error('must be used within a SceneViewerRoot');
  }
  return ctx;
}

// ── Scene control context — UI toggle/slider state ───────────────────────────
// Purely local UI state (grid/drop-point/path-lines/roof-slice toggles).
// Changing one of these should never force robot data consumers to re-render.

interface SceneControlValue {
  showGrid: boolean;
  setShowGrid: (value: boolean) => void;
  showDropPoint: boolean;
  setShowDropPoint: (value: boolean) => void;
  showPathLines: boolean;
  setShowPathLines: (value: boolean) => void;
  showRoofSlice: boolean;
  setShowRoofSlice: (value: boolean) => void;
  roofSliceHeight: number;
  setRoofSliceHeight: (value: number) => void;
}

const SceneControlContext = createContext<SceneControlValue | undefined>(
  undefined,
);

export interface SceneControlDefaults {
  showGrid?: boolean;
  showDropPoint?: boolean;
  showPathLines?: boolean;
  showRoofSlice?: boolean;
  roofSliceHeight?: number;
}

export function useSceneControlState(
  defaults: SceneControlDefaults,
): SceneControlValue {
  // TODO(anyone): combine states or switch to using ref for better performance?
  const [showGrid, setShowGrid] = useState<boolean>(defaults.showGrid ?? true);
  const [showDropPoint, setShowDropPoint] = useState<boolean>(
    defaults.showDropPoint ?? true,
  );
  const [showPathLines, setShowPathLines] = useState<boolean>(
    defaults.showPathLines ?? true,
  );
  const [showRoofSlice, setShowRoofSlice] = useState<boolean>(
    defaults.showRoofSlice ?? INITIAL_SHOW_ROOF_SLICE,
  );
  const [roofSliceHeight, setRoofSliceHeight] = useState<number>(
    defaults.roofSliceHeight ?? INITIAL_ROOF_SLICE_HEIGHT,
  );

  return useMemo(
    () => ({
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
    }),
    [showGrid, showDropPoint, showPathLines, showRoofSlice, roofSliceHeight],
  );
}

function useSceneControlContext(): SceneControlValue {
  const ctx = useContext(SceneControlContext);
  if (ctx === undefined) {
    throw new Error('must be used within a SceneViewerRoot');
  }
  return ctx;
}

// ── Robot data context — props-sourced data + Three.js runtime refs ─────────
// robotConfigs/modelUrlMap/mapClient come from the page (map.tsx), which owns
// data-fetching; robotsRef/robotTemplatesRef are pure rendering-runtime state
// that stays local to the SceneViewer tree. Kept separate from scene-control
// state so a roof-slider drag can't cascade into a robot-data re-render.

interface RobotDataValue {
  mapClient: IMapClient | undefined;
  robotConfigs: RobotConfig[];
  modelUrlMap: Map<string, string>;
  robotStatuses: RobotStatus[];
  robotsRef: RefObject<Map<string, RobotRuntime>>;
  robotTemplatesRef: RefObject<Map<string, THREE.Group> | null>;
}

const RobotDataContext = createContext<RobotDataValue | undefined>(undefined);

export function useRobotDataState(props: UseMapProps): RobotDataValue {
  const mapClient = props.mapData?.mapClient;
  const robotConfigs = props.mapData?.robotConfigs ?? EMPTY_ROBOT_CONFIGS;
  const modelUrlMap = props.mapData?.modelUrlMap ?? EMPTY_MODEL_URL_MAP;

  // Data-only status derivation — see robotConfigToStatus above.
  const robotStatuses = useMemo(
    () => robotConfigs.map(robotConfigToStatus),
    [robotConfigs],
  );

  const robotsRef = useRef<Map<string, RobotRuntime>>(new globalThis.Map());
  const robotTemplatesRef = useRef<Map<string, THREE.Group> | null>(null);

  return useMemo(
    () => ({
      mapClient,
      robotConfigs,
      modelUrlMap,
      robotStatuses,
      robotsRef,
      robotTemplatesRef,
    }),
    [mapClient, robotConfigs, modelUrlMap, robotStatuses],
  );
}

function useRobotDataContext(): RobotDataValue {
  const ctx = useContext(RobotDataContext);
  if (ctx === undefined) {
    throw new Error('must be used within a SceneViewerRoot');
  }
  return ctx;
}

export { SceneRuntimeContext, SceneControlContext, RobotDataContext };

// ── Consumer selector hooks ───────────────────────────────────────────────────

export function useSceneViewerViewport3D() {
  const {
    sceneUri,
    sceneContextRef,
    setLoadStatus,
    setLoadMessage,
    setOrbitOrigin,
    setFloorZ,
  } = useSceneRuntimeContext();
  const { showRoofSlice, roofSliceHeight } = useSceneControlContext();
  const { mapClient, robotsRef } = useRobotDataContext();

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
  const { sceneContextRef, floorZ } = useSceneRuntimeContext();
  const { showPathLines } = useSceneControlContext();
  const { mapClient, robotsRef, robotTemplatesRef, robotConfigs, modelUrlMap } =
    useRobotDataContext();

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
  const { robotStatuses } = useRobotDataContext();
  return { robotStatuses };
}

export function useSceneViewerSceneControl() {
  const { loadStatus } = useSceneRuntimeContext();
  const {
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
  } = useSceneControlContext();

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
  const { loadStatus, sceneContextRef, orbitOrigin } = useSceneRuntimeContext();

  return {
    loadStatus,
    sceneContextRef,
    orbitOrigin,
  };
}

export function useSceneViewerLoadingOverlay() {
  const { loadStatus, loadMessage } = useSceneRuntimeContext();

  return {
    loadStatus,
    loadMessage,
  };
}
