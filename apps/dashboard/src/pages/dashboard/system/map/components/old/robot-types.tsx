import * as THREE from 'three';
import { type Line2 } from 'three/addons/lines/Line2.js';
import { type LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { type LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { type DriveState } from '../differential-drive.demo.ts';
export type LoadState = 'loading' | 'ready' | 'error';

export type CameraFrame = {
  center: THREE.Vector3;
  maxDim: number;
  sphereRadius: number;
  startPosition: THREE.Vector3;
  endPosition: THREE.Vector3;
};

export type SceneBounds = {
  min: THREE.Vector3;
  max: THREE.Vector3;
  maxDim: number;
  floorZ: number;
};

export type SceneDebugInfo = {
  floorZ: number;
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
};

export type DropPointCoords = { x: number; y: number; z: number };
export type RobotMotionStatus =
  | 'idle'
  | 'moving'
  | 'blocked'
  | 'disabled'
  | 'arrived';
export type RobotCoordinateSystem = 'navigation' | 'world';

export type RobotWaypoint = DropPointCoords & {
  id: string | number;
  label?: string;
};

export type RobotConfig = {
  id: string;
  model?: string;
  name?: string;
  position?: Partial<DropPointCoords>;
  target?: Partial<DropPointCoords> | null;
  path?: RobotWaypoint[];
  startWaypointIndex?: number;
  loop?: boolean;
  speed?: number;
  enabled?: boolean;
  rotationZ?: number;
  scale?: number | Partial<DropPointCoords>;
  coordinateSystem?: RobotCoordinateSystem;
  color?: string;
};

export type RobotStatus = {
  id: string;
  name: string;
  status: RobotMotionStatus;
  position: DropPointCoords;
  target?: DropPointCoords;
  waypointId?: string | number;
  waypointLabel?: string;
  waypointIndex?: number;
  waypointCount?: number;
  blockedBy?: string;
};

export type RobotTrailRuntime = {
  group: THREE.Group;
  plannedLine: Line2;
  activeLine: Line2;
  plannedMaterial: LineMaterial;
  activeMaterial: LineMaterial;
  plannedGeometry: LineGeometry;
  activeGeometry: LineGeometry;
  visitedPoints: THREE.Vector3[];
  lastSampledPoint: THREE.Vector3;
};

export type RobotRuntime = {
  id: string;
  name: string;
  root: THREE.Group;
  config: RobotConfig;
  pathIndex: number;
  lastConfigPositionKey: string;
  lastConfigPathKey: string;
  driveState: DriveState | null;
  blockedBy?: string;
  status: RobotMotionStatus;
  lastConfigTrailKey: string;
  trail?: RobotTrailRuntime;
  /**
   * Set when a live backend position is available. The animation loop lerps
   * the robot toward this target instead of running path-following.
   */
  lerpTarget?: { position: THREE.Vector3; rotationZ: number };
};

export type StaticCollisionBox = {
  box: THREE.Box3;
  name: string;
};

export type SceneViewerApi = {
  setShowGridAxes: (show: boolean) => void;
  setDropPointEnabled: (enabled: boolean) => void;
  setDropPointPosition: (position: DropPointCoords) => void;
  setRoofSliceEnabled: (enabled: boolean) => void;
  setRoofSliceHeight: (height: number) => void;
  setPathLineVisible: (visible: boolean) => void;
};

export type RobotDefinition = {
  id: number;
  name?: string;
  model: string;
};

export type RobotPositionResponse = {
  id: number;
  x: number;
  y: number;
  theta: number;
};

export type MapNode = {
  id: number | string;
  x: number;
  y: number;
  z?: number;
  label?: string;
};

export type MapEdge = {
  from: number | string;
  to: number | string;
};

export type MapGraph = {
  nodes: MapNode[];
  edges: MapEdge[];
};

export type RobotSyncContext = {
  scene: THREE.Scene;
  robots: Map<string, RobotRuntime>;
  templates: Map<string, THREE.Group>;
  floorZ: number;
  publishRobotStatuses: (force?: boolean) => void;
};
