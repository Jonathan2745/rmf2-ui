import type * as THREE from 'three';
import type { Line2 } from 'three/addons/lines/Line2.js';
import type { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import type { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import type { RobotWaypoint } from './old/robot-types';

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
  /** Live world-space (x, y) from backend telemetry — direct mapping, no remap. */
  position?: { x: number; y: number };
  /** Live heading (radians), "movement" convention — model-heading offset applied downstream. */
  rotationZ?: number;
  /** Planned path for trail rendering, in `pathCoordinateSystem` source space. */
  path?: RobotWaypoint[];
  pathCoordinateSystem?: RobotPathCoordinateSystem;
  enabled?: boolean;
  scale?: number | Partial<WaypointCoords>;
  color?: string;
  /** Raw backend motion state (e.g. "driving" | "stopped"), for the status panel. */
  backendState?: string;
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

export type RobotLerpTarget = {
  position: THREE.Vector3;
  /** Model-space rotation.z target (offset already applied). */
  rotationZ: number;
};

export type RobotRuntime = {
  id: string;
  name: string;
  root: THREE.Group;
  config: RobotConfig;
  status: RobotMotionStatus;
  lastConfigPositionKey: string;
  lastConfigTrailKey: string;
  trail?: RobotTrailRuntime;
  lerpTarget?: RobotLerpTarget;
};

export type RobotSyncContext = {
  scene: THREE.Scene;
  robots: Map<string, RobotRuntime>;
  templates: Map<string, THREE.Group>;
  floorZ: number;
};
