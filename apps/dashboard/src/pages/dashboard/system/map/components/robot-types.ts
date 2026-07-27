import type * as THREE from 'three';
import type { Line2 } from 'three/addons/lines/Line2.js';
import type { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import type { LineMaterial } from 'three/addons/lines/LineMaterial.js';

export type DropPointCoords = { x: number; y: number; z: number };

export type RobotWaypoint = DropPointCoords & {
  id: string | number;
  label?: string;
};

export type WaypointCoords = { x: number; y: number; z: number };
export type RobotMotionStatus =
  | 'idle'
  | 'moving'
  | 'blocked'
  | 'disabled'
  | 'arrived';
export type RobotStatus = {
  id: string;
  name: string;
  status: RobotMotionStatus;
  position: WaypointCoords;
  target?: WaypointCoords;
  waypointId?: string | number;
  waypointLabel?: string;
  waypointIndex?: number;
  waypointCount?: number;
  blockedBy?: string;
};

/** Which transform a robot's `path` waypoints were authored in. See robot-coordinates.ts. */
export type RobotPathCoordinateSystem = 'navigation' | 'world';

export type RobotConfig = {
  id: string;
  model?: string;
  name?: string;
  /** Live world-space position from backend or fallback telemetry. */
  position?: { x: number; y: number };
  /** Live heading (radians), "movement" convention — model-heading offset applied downstream. */
  rotationZ?: number;
  /** Planned path for trail rendering, in `pathCoordinateSystem` source space. */
  path?: RobotWaypoint[];
  pathCoordinateSystem?: RobotPathCoordinateSystem;
  /** Whether `path` loops back to its first waypoint — closes the rendered polyline. */
  loop?: boolean;
  enabled?: boolean;
  scale?: number | Partial<WaypointCoords>;
  color?: string;
  /** Raw backend motion state (e.g. "driving" | "stopped"), for the status panel. */
  backendState?: string;
};

export type RobotTrailRuntime = {
  group: THREE.Group;
  plannedLine: Line2;
  currentEdgeLine: Line2;
  plannedMaterial: LineMaterial;
  currentEdgeMaterial: LineMaterial;
  plannedGeometry: LineGeometry;
  currentEdgeGeometry: LineGeometry;
  pathPoints: THREE.Vector3[];
  currentEdgeIndex: number | null;
};

export type RobotLerpTarget = {
  fromPosition: THREE.Vector3;
  toPosition: THREE.Vector3;
  /** Model-space rotation.z values (offset already applied). */
  fromRotationZ: number;
  toRotationZ: number;
  elapsedSeconds: number;
  durationSeconds: number;
};

export type RobotRuntime = {
  id: string;
  name: string;
  /** Stable transform anchor owned by SceneViewer.RobotRoot. */
  root: THREE.Group;
  /** Optional cloned model attached by SceneViewer.RobotModels. */
  visual?: THREE.Group;
  config: RobotConfig;
  status: RobotMotionStatus;
  lastConfigPoseKey: string;
  lastConfigVisualKey?: string;
  lastConfigTrailKey?: string;
  trail?: RobotTrailRuntime;
  lerpTarget?: RobotLerpTarget;
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
  /** Backend-reported motion state, e.g. "driving" | "stopped". */
  state?: string;
};
