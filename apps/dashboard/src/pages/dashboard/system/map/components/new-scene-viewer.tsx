import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Center,
  HStack,
  IconButton,
  Kbd,
  Stack,
  Text,
} from '@chakra-ui/react';
import { LuLocateFixed, LuRotateCcw } from 'react-icons/lu';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ViewportGizmo } from 'three-viewport-gizmo';
<<<<<<< HEAD
import { Tooltip } from '@/components/ui/tooltip';
<<<<<<< HEAD
<<<<<<< HEAD
=======
// import {
//   ROBOT_TURN_SPEED_RAD,
//   stepDifferentialDrive,
//   type DriveState,
// } from '../differential-drive.demo';
import { type DriveState } from '../differential-drive.demo';
=======
>>>>>>> 60c350e (feat(refactor): abstracted data types to robot-types.tsx)

>>>>>>> 5c325b1 (feat(frontend): fixed robot pathing and heading when stopped)
=======

import { Tooltip } from '@/components/ui/tooltip';
>>>>>>> 7fee38d (feat(reformat): reformatted scene viewer)
import { DropPointMarker } from '../drop-point-marker';
import { NavigationOverlay } from '../navigation-overlay';

import type {
  DropPointCoords,
  LoadState,
  RobotRuntime,
  RobotStatus,
  SceneDebugInfo,
  SceneViewerApi,
  StaticCollisionBox,
} from './robot-types';

<<<<<<< HEAD
const SCENE_URL = '/RMF2_SIM/Test_3.glb';
const ROBOT_MODEL_URL = '/robot.glb';
// const ROBOTS_CONFIG_URL = '/robots.json';
// replaced with API route
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8008';
const ROBOTS_CONFIG_URL = `${API_BASE_URL}/api/robots`;

const ROBOT_CONFIG_REFRESH_MS = 1000;
const ROBOT_COLLISION_PADDING = 0.05;
const ROBOT_ARRIVAL_EPSILON = 0.05;
const STATIC_COLLISION_IGNORE_NAMES = new Set(['Box128', 'Box127']);
const ROBOT_MODEL_HEADING_OFFSET = -Math.PI / 2; // model faces +X, but we want it to face +Y

// const SCENE_URL = '/scene.draco.glb';
const DRACO_DECODER_PATH =
  'https://www.gstatic.com/draco/versioned/decoders/1.5.6/';
const INTRO_DURATION_MS = 500;
const INTRO_START_DISTANCE_FACTOR = 1.5;
const END_DISTANCE_FACTOR = 0.75;

// Scene is Z-up (robotics convention): +Z is vertical, floor lies in the XY plane.
// END_VIEW_ANGLE is measured from +Z (vertical) toward -Y (the camera's horizontal
// offset), so 45° gives an isometric-style angled look from above.
const END_VIEW_ANGLE = Math.PI / 4;
const ROBOT_TRAIL_Z_OFFSET = 0.08;
const ROBOT_TRAIL_SAMPLE_DISTANCE = 0.25;
const DEFAULT_ROBOT_COLOR = '#00A3FF';

<<<<<<< HEAD
type LoadState = 'loading' | 'ready' | 'error';

type CameraFrame = {
  center: THREE.Vector3;
  maxDim: number;
  sphereRadius: number;
  startPosition: THREE.Vector3;
  endPosition: THREE.Vector3;
};

type SceneBounds = {
  min: THREE.Vector3;
  max: THREE.Vector3;
  maxDim: number;
  floorZ: number;
};

type SceneDebugInfo = {
  floorZ: number;
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
};

type DropPointCoords = { x: number; y: number; z: number };

type RobotMotionStatus = 'idle' | 'moving' | 'blocked' | 'disabled' | 'arrived';

type RobotCoordinateSystem = 'navigation' | 'world';

type RobotWaypoint = DropPointCoords & {
  id: string | number;
  label?: string;
};

type RobotConfig = {
  id: string;
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

type RobotStatus = {
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

type RobotTrailRuntime = {
  group: THREE.Group;
  plannedLine: THREE.Line;
  activeLine: THREE.Line;
  plannedMaterial: THREE.LineBasicMaterial;
  activeMaterial: THREE.LineBasicMaterial;
  plannedGeometry: THREE.BufferGeometry;
  activeGeometry: THREE.BufferGeometry;
  visitedPoints: THREE.Vector3[];
  lastSampledPoint: THREE.Vector3;
};

type RobotRuntime = {
  id: string;
  name: string;
  root: THREE.Group;
  config: RobotConfig;
  pathIndex: number;
  lastConfigPositionKey: string;
  lastConfigPathKey: string;
  blockedBy?: string;
  status: RobotMotionStatus;
  lastConfigTrailKey: string;
  trail?: RobotTrailRuntime;
};

type StaticCollisionBox = {
  box: THREE.Box3;
  name: string;
};

type SceneViewerApi = {
  setShowGridAxes: (show: boolean) => void;
  setNavigationEnabled: (enabled: boolean) => void;
  setDropPointEnabled: (enabled: boolean) => void;
  setDropPointPosition: (position: DropPointCoords) => void;
  setRoofSliceEnabled: (enabled: boolean) => void;
  setRoofSliceHeight: (height: number) => void;
};

=======
>>>>>>> 60c350e (feat(refactor): abstracted data types to robot-types.tsx)
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function readCoords(
  value: unknown,
  fallback: DropPointCoords,
): DropPointCoords {
  if (!isRecord(value)) return fallback;

  return {
    x: readNumber(value.x, fallback.x),
    y: readNumber(value.y, fallback.y),
    z: readNumber(value.z, fallback.z),
  };
}

function coordKey(position: Partial<DropPointCoords> | undefined) {
  if (!position) return '';
  return `${position.x ?? ''}:${position.y ?? ''}:${position.z ?? ''}`;
}

function normalizeRobotPath(value: unknown): RobotWaypoint[] | undefined {
  if (!Array.isArray(value)) return undefined;

  return value.filter(isRecord).map((waypoint, index) => ({
    id:
      typeof waypoint.id === 'string' || typeof waypoint.id === 'number'
        ? waypoint.id
        : index,
    label: typeof waypoint.label === 'string' ? waypoint.label : undefined,
    x: readNumber(waypoint.x, 0),
    y: readNumber(waypoint.y, 0),
    z: readNumber(waypoint.z, 0),
  }));
}

function pathKey(path: RobotWaypoint[] | undefined) {
  if (!path?.length) return '';

  return path
    .map(
      (waypoint) =>
        `${waypoint.id}:${waypoint.label ?? ''}:${waypoint.x}:${waypoint.y}:${waypoint.z}`,
    )
    .join('|');
}

function normalizeCoordinateSystem(value: unknown): RobotCoordinateSystem {
  return value === 'world' ? 'world' : 'navigation';
}

function configCoordsToWorld(
  value: unknown,
  fallbackWorld: DropPointCoords,
  coordinateSystem: RobotCoordinateSystem,
): DropPointCoords {
  if (!isRecord(value)) return fallbackWorld;

  if (coordinateSystem === 'world') {
    return readCoords(value, fallbackWorld);
  }

  // navigation-path.json uses the same coordinates as the original GLB path.
  // The viewer rotates GLB content by +90° around X, so convert:
  // source (x, y, z) -> viewer/world (x, -z, y).
  const sourceX = readNumber(value.x, fallbackWorld.x);
  const sourceY = readNumber(value.y, fallbackWorld.z);
  const sourceZ = readNumber(value.z, -fallbackWorld.y);

  return {
    x: sourceX,
    y: -sourceZ,
    z: sourceY,
  };
}

function clampWaypointIndex(index: number, waypointCount: number) {
  if (waypointCount <= 0) return 0;
  return Math.min(Math.max(Math.floor(index), 0), waypointCount - 1);
}

function getConfiguredStartWaypointIndex(config: RobotConfig) {
  const waypointCount = config.path?.length ?? 0;
  return clampWaypointIndex(
    readNumber(config.startWaypointIndex, 0),
    waypointCount,
  );
}

function getInitialPathIndex(config: RobotConfig) {
  const waypointCount = config.path?.length ?? 0;
  if (waypointCount <= 0) return 0;

  const startWaypointIndex = getConfiguredStartWaypointIndex(config);

  // If a custom position is supplied, treat startWaypointIndex as the first
  // target. If position is omitted, spawn at startWaypointIndex and target the
  // next waypoint.
  if (config.position) return startWaypointIndex;
  if (startWaypointIndex < waypointCount - 1) return startWaypointIndex + 1;
  return config.loop ? 0 : startWaypointIndex;
}

function getInitialRobotPosition(config: RobotConfig, floorZ: number) {
  const coordinateSystem = config.coordinateSystem ?? 'navigation';
  const defaultWorldPosition = { x: 0, y: 0, z: floorZ };

  if (config.position) {
    return configCoordsToWorld(
      config.position,
      defaultWorldPosition,
      coordinateSystem,
    );
  }

  const startWaypoint = config.path?.[getConfiguredStartWaypointIndex(config)];
  if (startWaypoint) {
    return configCoordsToWorld(
      startWaypoint,
      defaultWorldPosition,
      coordinateSystem,
    );
  }

  return defaultWorldPosition;
}

function getActiveRobotWaypoint(robot: RobotRuntime) {
  const path = robot.config.path;
  if (!path?.length) return undefined;

  const waypointIndex = clampWaypointIndex(robot.pathIndex, path.length);
  return {
    waypoint: path[waypointIndex],
    waypointIndex,
    waypointCount: path.length,
  };
}

function getActiveRobotTarget(
  robot: RobotRuntime,
  floorZ: number,
):
  | {
      target: DropPointCoords;
      waypoint?: RobotWaypoint;
      waypointIndex?: number;
      waypointCount?: number;
    }
  | undefined {
  const coordinateSystem = robot.config.coordinateSystem ?? 'navigation';
  const fallback = {
    x: robot.root.position.x,
    y: robot.root.position.y,
    z: floorZ,
  };

  const activeWaypoint = getActiveRobotWaypoint(robot);
  if (activeWaypoint) {
    return {
      target: configCoordsToWorld(
        activeWaypoint.waypoint,
        fallback,
        coordinateSystem,
      ),
      ...activeWaypoint,
    };
  }

  if (robot.config.target) {
    return {
      target: configCoordsToWorld(
        robot.config.target,
        fallback,
        coordinateSystem,
      ),
    };
  }

  return undefined;
}

function normalizeRobotConfigs(payload: unknown): RobotConfig[] {
  const sharedPath = isRecord(payload)
    ? normalizeRobotPath(payload.path)
    : undefined;
  const sharedCoordinateSystem = isRecord(payload)
    ? normalizeCoordinateSystem(payload.coordinateSystem)
    : 'navigation';

  const rawRobots = Array.isArray(payload)
    ? payload
    : isRecord(payload) && Array.isArray(payload.robots)
      ? payload.robots
      : [];

  return rawRobots.filter(isRecord).map((robot, index) => {
    const robotPath = normalizeRobotPath(robot.path) ?? sharedPath;
    const coordinateSystem = normalizeCoordinateSystem(
      robot.coordinateSystem ?? sharedCoordinateSystem,
    );

    return {
      id:
        typeof robot.id === 'string' && robot.id.trim()
          ? robot.id
          : `robot-${index + 1}`,
      name: typeof robot.name === 'string' ? robot.name : undefined,
      color: typeof robot.color === 'string' ? robot.color : undefined,
      position: isRecord(robot.position) ? robot.position : undefined,
      target:
        isRecord(robot.target) || robot.target === null
          ? robot.target
          : undefined,
      path: robotPath,
      startWaypointIndex: readNumber(robot.startWaypointIndex, 0),
      loop: robot.loop === true,
      speed: readNumber(robot.speed, 1),
      enabled: robot.enabled !== false,
      rotationZ:
        typeof robot.rotationZ === 'number' && Number.isFinite(robot.rotationZ)
          ? robot.rotationZ
          : undefined,
      scale:
        typeof robot.scale === 'number' || isRecord(robot.scale)
          ? robot.scale
          : 1,
      coordinateSystem,
    };
  });
}

async function fetchRobotConfigs(): Promise<RobotConfig[]> {
  const response = await fetch(`${ROBOTS_CONFIG_URL}?t=${Date.now()}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to load ${ROBOTS_CONFIG_URL}`);
  }

  return normalizeRobotConfigs(await response.json());
}

function loadGltfAsync(loader: GLTFLoader, url: string) {
  return new Promise<THREE.Group>((resolve, reject) => {
    loader.load(
      url,
      (gltf) => resolve(gltf.scene),
      undefined,
      (error) => reject(error),
    );
  });
}

function cloneRobotTemplate(template: THREE.Group) {
  const cloned = cloneSkeleton(template) as THREE.Group;

  cloned.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    child.geometry = child.geometry.clone();
    child.material = Array.isArray(child.material)
      ? child.material.map((material) => material.clone())
      : child.material.clone();
  });

  return cloned;
}

function applyRobotScale(root: THREE.Group, scale: RobotConfig['scale']) {
  if (typeof scale === 'number') {
    root.scale.setScalar(scale);
    return;
  }

  if (isRecord(scale)) {
    root.scale.set(
      readNumber(scale.x, 1),
      readNumber(scale.y, 1),
      readNumber(scale.z, 1),
    );
  }
}

function collectStaticCollisionBoxes(
  root: THREE.Object3D,
  floorZ: number,
): StaticCollisionBox[] {
  const boxes: StaticCollisionBox[] = [];

  root.updateWorldMatrix(true, true);
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    const objectNames = [child.name, child.parent?.name].filter(Boolean);

    if (objectNames.some((name) => STATIC_COLLISION_IGNORE_NAMES.has(name!))) {
      return;
    }

    const box = new THREE.Box3().setFromObject(child);
    const size = box.getSize(new THREE.Vector3());

    if (
      !Number.isFinite(size.x) ||
      !Number.isFinite(size.y) ||
      !Number.isFinite(size.z)
    ) {
      return;
    }

    // Skip flat floor plates, decals, and tiny mesh fragments. Otherwise every
    // robot would constantly collide with the ground it is standing on.
    if (size.x < 0.01 || size.y < 0.01 || size.z < 0.01) return;
    const height = size.z;
    const isVeryFlat = height < 0.25;
    const isNearFloor = box.min.z <= floorZ + 0.2;
    const isLargeFloorLikeSurface =
      isVeryFlat && isNearFloor && size.x > 2 && size.y > 2;

    if (box.max.z <= floorZ + 0.15) return;
    if (isLargeFloorLikeSurface) return;

    boxes.push({
      box: box.expandByScalar(ROBOT_COLLISION_PADDING),
      name: child.name || child.parent?.name || 'scene obstacle',
    });
  });

  return boxes;
}

function getObjectBox(root: THREE.Object3D) {
  root.updateWorldMatrix(true, true);
  return new THREE.Box3()
    .setFromObject(root)
    .expandByScalar(ROBOT_COLLISION_PADDING);
}

function toRobotStatus(robot: RobotRuntime, floorZ: number): RobotStatus {
  const activeTarget = getActiveRobotTarget(robot, floorZ);

  return {
    id: robot.id,
    name: robot.name,
    status: robot.config.enabled === false ? 'disabled' : robot.status,
    position: {
      x: robot.root.position.x,
      y: robot.root.position.y,
      z: robot.root.position.z,
    },
    target: activeTarget?.target,
    waypointId: activeTarget?.waypoint?.id,
    waypointLabel: activeTarget?.waypoint?.label,
    waypointIndex: activeTarget?.waypointIndex,
    waypointCount: activeTarget?.waypointCount,
    blockedBy: robot.blockedBy,
  };
}

function robotTrailKey(config: RobotConfig) {
  return [
    config.color ?? DEFAULT_ROBOT_COLOR,
    config.coordinateSystem ?? 'navigation',
    pathKey(config.path),
  ].join('::');
}

function getRobotColor(config: RobotConfig) {
  try {
    return new THREE.Color(config.color ?? DEFAULT_ROBOT_COLOR);
  } catch {
    return new THREE.Color(DEFAULT_ROBOT_COLOR);
  }
}

function withTrailOffset(point: THREE.Vector3) {
  return point.clone().add(new THREE.Vector3(0, 0, ROBOT_TRAIL_Z_OFFSET));
}

function getRobotPathWorldPoints(
  config: RobotConfig,
  floorZ: number,
): THREE.Vector3[] {
  const coordinateSystem = config.coordinateSystem ?? 'navigation';

  return (config.path ?? []).map((waypoint) => {
    const world = configCoordsToWorld(
      waypoint,
      { x: 0, y: 0, z: floorZ },
      coordinateSystem,
    );

    return new THREE.Vector3(world.x, world.y, world.z + ROBOT_TRAIL_Z_OFFSET);
  });
}

function createLineGeometryFromPoints(points: THREE.Vector3[]) {
  const geometry = new THREE.BufferGeometry();

  if (points.length === 0) {
    geometry.setFromPoints([]);
  } else if (points.length === 1) {
    geometry.setFromPoints([points[0], points[0]]);
  } else {
    geometry.setFromPoints(points);
  }

  return geometry;
}

function createRobotTrail(
  config: RobotConfig,
  floorZ: number,
  startPosition: THREE.Vector3,
): RobotTrailRuntime {
  const color = getRobotColor(config);
  const group = new THREE.Group();
  group.name = `trail:${config.id}`;

  const plannedPoints = getRobotPathWorldPoints(config, floorZ);

  const plannedGeometry = createLineGeometryFromPoints(plannedPoints);
  const activeGeometry = createLineGeometryFromPoints([
    withTrailOffset(startPosition),
    withTrailOffset(startPosition),
  ]);

  const plannedMaterial = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.25,
    depthWrite: false,
    depthTest: false,
  });

  const activeMaterial = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    depthTest: false,
  });

  const plannedLine = new THREE.Line(plannedGeometry, plannedMaterial);
  const activeLine = new THREE.Line(activeGeometry, activeMaterial);

  plannedLine.name = `planned-path:${config.id}`;
  activeLine.name = `active-trail:${config.id}`;

  plannedLine.renderOrder = 20;
  activeLine.renderOrder = 30;

  group.add(plannedLine);
  group.add(activeLine);

  const startPoint = withTrailOffset(startPosition);

  return {
    group,
    plannedLine,
    activeLine,
    plannedMaterial,
    activeMaterial,
    plannedGeometry,
    activeGeometry,
    visitedPoints: [startPoint.clone()],
    lastSampledPoint: startPoint.clone(),
  };
}

function disposeRobotTrail(trail: RobotTrailRuntime) {
  trail.plannedGeometry.dispose();
  trail.activeGeometry.dispose();
  trail.plannedMaterial.dispose();
  trail.activeMaterial.dispose();
}

function resetRobotTrail(robot: RobotRuntime) {
  if (!robot.trail) return;

  const startPoint = withTrailOffset(robot.root.position);

  robot.trail.visitedPoints = [startPoint.clone()];
  robot.trail.lastSampledPoint.copy(startPoint);
  robot.trail.activeGeometry.setFromPoints([startPoint, startPoint]);
  robot.trail.activeGeometry.computeBoundingSphere();
}

function updateRobotTrail(robot: RobotRuntime, force = false) {
  if (!robot.trail) return;

  const currentPoint = withTrailOffset(robot.root.position);
  const distance = currentPoint.distanceTo(robot.trail.lastSampledPoint);

  if (!force && distance < ROBOT_TRAIL_SAMPLE_DISTANCE) return;

  robot.trail.visitedPoints.push(currentPoint.clone());
  robot.trail.lastSampledPoint.copy(currentPoint);

  robot.trail.activeGeometry.setFromPoints(robot.trail.visitedPoints);
  robot.trail.activeGeometry.computeBoundingSphere();
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function stepDirectlyTowardWaypoint({
  current,
  target,
  speed,
  deltaSeconds,
  arrivalEpsilon,
  previousHeading,
}: {
  current: THREE.Vector3;
  target: DropPointCoords;
  speed: number;
  deltaSeconds: number;
  arrivalEpsilon: number;
  previousHeading: number;
}) {
  const targetPosition = new THREE.Vector3(target.x, target.y, target.z);
  const toTarget = targetPosition.clone().sub(current);
  const distance = toTarget.length();

  const dx = target.x - current.x;
  const dy = target.y - current.y;
  const heading =
    Math.abs(dx) > 0.000001 || Math.abs(dy) > 0.000001
      ? Math.atan2(dy, dx)
      : previousHeading;

  if (distance <= arrivalEpsilon) {
    return {
      position: targetPosition,
      heading,
      arrived: true,
    };
  }

  if (speed <= 0 || deltaSeconds <= 0) {
    return {
      position: current.clone(),
      heading: previousHeading,
      arrived: false,
    };
  }

  const travelDistance = Math.min(speed * deltaSeconds, distance);
  const direction = toTarget.normalize();
  const nextPosition = current
    .clone()
    .add(direction.multiplyScalar(travelDistance));

  return {
    position: nextPosition,
    heading,
    arrived: nextPosition.distanceTo(targetPosition) <= arrivalEpsilon,
  };
}

function tuneMaterials(root: THREE.Object3D) {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];

    for (const material of materials) {
      // Coplanar faces in architectural exports often z-fight at grazing angles.
      material.polygonOffset = true;
      material.polygonOffsetFactor = 1;
      material.polygonOffsetUnits = 1;

      if (material.transparent || material.opacity < 1) {
        material.depthWrite = false;
        material.side = THREE.FrontSide;
        child.renderOrder = 1;
      } else if (material.side === THREE.DoubleSide) {
        // Back faces fighting with front faces on thin geometry.
        material.side = THREE.FrontSide;
      }
    }
  });
}

function computeSceneBounds(root: THREE.Object3D): SceneBounds {
  const box = new THREE.Box3().setFromObject(root);
  const min = box.min.clone();
  const max = box.max.clone();
  const size = box.getSize(new THREE.Vector3());

  return {
    min,
    max,
    maxDim: Math.max(size.x, size.y, size.z),
    floorZ: min.z,
  };
}

function toSceneDebugInfo(bounds: SceneBounds): SceneDebugInfo {
  return {
    floorZ: bounds.floorZ,
    min: { x: bounds.min.x, y: bounds.min.y, z: bounds.min.z },
    max: { x: bounds.max.x, y: bounds.max.y, z: bounds.max.z },
  };
}
=======
import {
  DRACO_DECODER_PATH,
  ROBOT_ARRIVAL_EPSILON,
  ROBOT_CONFIG_REFRESH_MS,
  ROBOT_MODEL_URL,
  SCENE_URL,
  INITIAL_SHOW_ROOF_SLICE,
  INITIAL_ROOF_SLICE_HEIGHT,
} from './constants';

import { fetchRobotConfigs } from './robot-map-config/robot-config-api';

// import { getInitialRobotPosition } from './robot-map-coordinates/robot-position';
import { getActiveRobotTarget } from './robot-map-coordinates/waypoint-utils';

import { stepDirectlyTowardWaypoint } from './robot-map-motion/direct-waypoint-motion';
import {
  movementHeadingToModelHeading,
  modelHeadingToMovementHeading,
} from './robot-map-motion/robot-heading';

import { toRobotStatus } from './robot-map-runtime/robot-status';
import { tuneMaterials } from './robot-map-runtime/robot-runtime-utils';

import {
  removeRobot,
  syncRobotsFromConfig,
} from './robot-map-runtime/robot-sync';

import { updateRobotTrail } from './robot-map-draw-trail/robot-trail';

import { loadGltfAsync } from './robot-map-scene/gltf-loader';
import {
  computeSceneBounds,
  toSceneDebugInfo,
} from './robot-map-scene/scene-bounds';
import {
  animateIntroCamera,
  computeCameraFrame,
  frameCamera,
} from './robot-map-scene/scene-camera';
import {
  collectStaticCollisionBoxes,
  findRobotCollision,
} from './robot-map-scene/scene-collision';
import { disposeObject3D } from './robot-map-scene/scene-dispose';
import { createGridAxesHelpers } from './robot-map-scene/scene-grid-axis';

import { SceneControlPanel } from './ui/scene-control-panel';
import { DropPointPanel } from './ui/drop-point-panel';
import { RobotStatusPanel } from './ui/robot-status-panel';
>>>>>>> 7fee38d (feat(reformat): reformatted scene viewer)

function formatCoord(value: number) {
  return value.toFixed(3);
}

export function SceneViewer() {
  const containerRef = useRef<HTMLDivElement>(null);

  const resetOrbitRef = useRef<(() => void) | null>(null);
  const resetPathRef = useRef<(() => void) | null>(null);
  const resetRobotsRef = useRef<(() => void) | null>(null);
  const sceneApiRef = useRef<SceneViewerApi | null>(null);

  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [showGridAxes, setShowGridAxes] = useState(false);
  const [showNavigation, setShowNavigation] = useState(true);
  const [showDropPoint, setShowDropPoint] = useState(false);
  const [showRoofSlice, setShowRoofSlice] = useState(INITIAL_SHOW_ROOF_SLICE);
  const [roofSliceHeight, setRoofSliceHeight] = useState(
    INITIAL_ROOF_SLICE_HEIGHT,
  );

  const [dropPoint, setDropPoint] = useState<DropPointCoords>({
    x: 0,
    y: 0,
    z: 0,
  });

  const [sceneDebug, setSceneDebug] = useState<SceneDebugInfo | null>(null);
  const [robotStatuses, setRobotStatuses] = useState<RobotStatus[]>([]);
<<<<<<< HEAD
  const showNavigationRef = useRef(showNavigation);
=======

>>>>>>> 7fee38d (feat(reformat): reformatted scene viewer)
  const showDropPointRef = useRef(showDropPoint);
  const dropPointRef = useRef(dropPoint);

  showNavigationRef.current = showNavigation;
  showDropPointRef.current = showDropPoint;
  dropPointRef.current = dropPoint;

  useEffect(() => {
    sceneApiRef.current?.setShowGridAxes(showGridAxes);
  }, [showGridAxes, sceneDebug]);

  useEffect(() => {
    sceneApiRef.current?.setNavigationEnabled(showNavigation);
  }, [showNavigation, loadState]);

  useEffect(() => {
    sceneApiRef.current?.setDropPointEnabled(showDropPoint);
  }, [showDropPoint, loadState]);

  useEffect(() => {
    sceneApiRef.current?.setDropPointPosition(dropPoint);
  }, [dropPoint, loadState]);

  useEffect(() => {
    sceneApiRef.current?.setRoofSliceEnabled(showRoofSlice);
  }, [showRoofSlice, loadState]);

  useEffect(() => {
    sceneApiRef.current?.setRoofSliceHeight(roofSliceHeight);
  }, [roofSliceHeight, loadState]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);

    const previousDefaultUp = THREE.Object3D.DEFAULT_UP.clone();
    THREE.Object3D.DEFAULT_UP.set(0, 0, 1);

    camera.up.set(0, 0, 1);
    camera.position.set(5, -5, 5);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      logarithmicDepthBuffer: true,
      powerPreference: 'high-performance',
    });

    const roofClipPlane = new THREE.Plane(
      new THREE.Vector3(0, 0, -1),
      INITIAL_ROOF_SLICE_HEIGHT,
    );

    renderer.clippingPlanes = INITIAL_SHOW_ROOF_SLICE ? [roofClipPlane] : [];
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    container.appendChild(renderer.domElement);

    const clock = new THREE.Clock();

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(10, 20, 10);
    scene.add(directionalLight);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    controls.zoomSpeed = 2.5;

    const gizmo = new ViewportGizmo(camera, renderer, {
      container: renderer.domElement.parentElement ?? container,
    });

    gizmo.attachControls(controls);

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(DRACO_DECODER_PATH);

    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    let animationFrameId = 0;
    let disposed = false;

    let loadedScene: THREE.Group | null = null;
    let gridAxesHelpers: THREE.Group | null = null;
    let navigationOverlay: NavigationOverlay | null = null;
    let dropPointMarker: DropPointMarker | null = null;
    let robotTemplate: THREE.Group | null = null;

    let robotConfigTimerId: number | null = null;
    let staticCollisionBoxes: StaticCollisionBox[] = [];
    let lastRobotStatusPublish = 0;
    let currentFloorZ = 0;

    const robots = new Map<string, RobotRuntime>();

    const pickRaycaster = new THREE.Raycaster();
    const pickPointer = new THREE.Vector2();

    const publishRobotStatuses = (force = false) => {
      const now = performance.now();

      if (!force && now - lastRobotStatusPublish < 250) return;

      lastRobotStatusPublish = now;

      setRobotStatuses(
        Array.from(robots.values()).map((robot) =>
          toRobotStatus(robot, currentFloorZ),
        ),
      );
    };

<<<<<<< HEAD
    const removeRobot = (id: string) => {
      const robot = robots.get(id);
      if (!robot) return;

      scene.remove(robot.root);
      disposeObject3D(robot.root);

      if (robot.trail) {
        scene.remove(robot.trail.group);
        disposeRobotTrail(robot.trail);
      }

      robots.delete(id);
    };

    const createRobot = (
      config: RobotConfig,
      template: THREE.Group,
      floorZ: number,
    ) => {
      const visual = cloneRobotTemplate(template);
      // Match the main floor-plan rotation: GLB is usually Y-up, this viewer is Z-up.
      visual.rotation.x = Math.PI / 2;
      tuneMaterials(visual);

      const root = new THREE.Group();
      root.name = `robot:${config.id}`;
      root.add(visual);
      applyRobotScale(root, config.scale);

      const position = getInitialRobotPosition(config, floorZ);
      root.position.set(position.x, position.y, position.z);
      root.rotation.z = config.rotationZ ?? 0;

      scene.add(root);

      const trail = createRobotTrail(config, floorZ, root.position);
      scene.add(trail.group);

      const runtime: RobotRuntime = {
        id: config.id,
        name: config.name ?? config.id,
        root,
        config,
        pathIndex: getInitialPathIndex(config),
        status: config.enabled === false ? 'disabled' : 'idle',
        lastConfigPositionKey: coordKey(config.position),
        lastConfigPathKey: pathKey(config.path),
        lastConfigTrailKey: robotTrailKey(config),
        trail,
      };

      robots.set(config.id, runtime);
      return runtime;
    };

    const syncRobotsFromConfig = (
      configs: RobotConfig[],
      template: THREE.Group,
      floorZ: number,
    ) => {
      const nextIds = new Set(configs.map((config) => config.id));

      for (const id of Array.from(robots.keys())) {
        if (!nextIds.has(id)) removeRobot(id);
      }

      for (const config of configs) {
        const existing = robots.get(config.id);

        if (!existing) {
          createRobot(config, template, floorZ);
          continue;
        }

        existing.name = config.name ?? config.id;
        existing.config = config;
        existing.blockedBy = undefined;
        if (config.enabled === false) {
          existing.status = 'disabled';
        }

        const nextPathKey = pathKey(config.path);
        if (nextPathKey !== existing.lastConfigPathKey) {
          existing.pathIndex = getInitialPathIndex(config);
          existing.lastConfigPathKey = nextPathKey;
        }

        const nextTrailKey = robotTrailKey(config);

        if (nextTrailKey !== existing.lastConfigTrailKey) {
          if (existing.trail) {
            scene.remove(existing.trail.group);
            disposeRobotTrail(existing.trail);
          }

          existing.trail = createRobotTrail(
            config,
            floorZ,
            existing.root.position,
          );

          scene.add(existing.trail.group);
          existing.lastConfigTrailKey = nextTrailKey;
        }

        const nextPositionKey = coordKey(config.position);
        if (
          nextPositionKey &&
          nextPositionKey !== existing.lastConfigPositionKey
        ) {
          const position = configCoordsToWorld(
            config.position,
            {
              x: existing.root.position.x,
              y: existing.root.position.y,
              z: floorZ,
            },
            config.coordinateSystem ?? 'navigation',
          );
          existing.root.position.set(position.x, position.y, position.z);
          existing.pathIndex = getInitialPathIndex(config);
          existing.lastConfigPositionKey = nextPositionKey;
        }

        applyRobotScale(existing.root, config.scale);
      }

      publishRobotStatuses(true);
    };

    const resetAllRobotsToStart = () => {
      for (const robot of robots.values()) {
        const startPosition = getInitialRobotPosition(
          robot.config,
          currentFloorZ,
        );

        robot.root.position.set(
          startPosition.x,
          startPosition.y,
          startPosition.z,
        );
        robot.root.rotation.z = robot.config.rotationZ
          ? robot.config.rotationZ + ROBOT_MODEL_HEADING_OFFSET
          : ROBOT_MODEL_HEADING_OFFSET;

        robot.pathIndex = getInitialPathIndex(robot.config);
        robot.blockedBy = undefined;
        robot.status = robot.config.enabled === false ? 'disabled' : 'idle';

        resetRobotTrail(robot);
      }

      publishRobotStatuses(true);
    };

    resetRobotsRef.current = resetAllRobotsToStart;

=======
>>>>>>> 7fee38d (feat(reformat): reformatted scene viewer)
    const refreshRobotConfig = async (floorZ: number) => {
      const template = robotTemplate;

      if (!template) return;

      try {
        const configs = await fetchRobotConfigs();

        if (disposed) return;

        syncRobotsFromConfig({
          configs,
          scene,
          robots,
          template,
          floorZ,
          publishRobotStatuses,
        });
      } catch (robotConfigError) {
        console.error('Robot config failed to load', robotConfigError);
      }
    };

    const updateRobots = (deltaSeconds: number, floorZ: number) => {
      for (const robot of robots.values()) {
        robot.blockedBy = undefined;
        robot.status = 'idle';

        if (robot.config.enabled === false) {
          robot.status = 'disabled';
          continue;
        }

        const activeTarget = getActiveRobotTarget(robot, floorZ);
        if (!activeTarget) continue;

        const { target } = activeTarget;
<<<<<<< HEAD
<<<<<<< HEAD
        const current = robot.root.position.clone();
        const delta = new THREE.Vector3(
          target.x - current.x,
          target.y - current.y,
          target.z - current.z,
        );
        const distance = delta.length();
=======
=======

>>>>>>> 7fee38d (feat(reformat): reformatted scene viewer)
        const previousPosition = robot.root.position.clone();
        const previousModelHeading = robot.root.rotation.z;
        const previousMovementHeading =
          modelHeadingToMovementHeading(previousModelHeading);

        const stepResult = stepDirectlyTowardWaypoint({
          current: previousPosition,
          target,
          speed: Math.max(robot.config.speed ?? 1, 0),
          deltaSeconds,
          arrivalEpsilon: ROBOT_ARRIVAL_EPSILON,
          previousHeading: previousMovementHeading,
        });

        robot.root.position.copy(stepResult.position);
        robot.root.rotation.z = movementHeadingToModelHeading(
          stepResult.heading,
        );

        robot.driveState = null;

        const blockedBy = findRobotCollision({
          robot,
          robots,
          staticCollisionBoxes,
        });

        if (blockedBy) {
          robot.root.position.copy(previousPosition);
          robot.root.rotation.z = previousModelHeading;
          robot.driveState = null;
          robot.blockedBy = blockedBy;
          robot.status = 'blocked';
          continue;
        }
>>>>>>> 5c325b1 (feat(frontend): fixed robot pathing and heading when stopped)

<<<<<<< HEAD
        if (distance <= ROBOT_ARRIVAL_EPSILON) {
          robot.root.position.set(target.x, target.y, target.z);

=======
        if (stepResult.arrived) {
>>>>>>> 7fee38d (feat(reformat): reformatted scene viewer)
          const pathLength = robot.config.path?.length ?? 0;

          if (pathLength > 0) {
            if (robot.pathIndex < pathLength - 1) {
              robot.pathIndex += 1;
              robot.status = 'moving';
            } else if (robot.config.loop) {
              robot.pathIndex = 0;
              robot.status = 'moving';
            } else {
              robot.status = 'arrived';
            }
          } else {
            robot.status = 'idle';
          }

          updateRobotTrail(robot, true);
          continue;
        }

<<<<<<< HEAD
        const direction = delta.normalize();
        const speed = Math.max(robot.config.speed ?? 1, 0);
        const step = Math.min(distance, speed * deltaSeconds);

        const previousPosition = robot.root.position.clone();
        robot.root.position.addScaledVector(direction, step);

        if (Math.abs(direction.x) > 0.001 || Math.abs(direction.y) > 0.001) {
          robot.root.rotation.z = Math.atan2(direction.y, direction.x);
        }

        const blockedBy = findRobotCollision(robot);
        if (blockedBy) {
          robot.root.position.copy(previousPosition);
          robot.blockedBy = blockedBy;
          robot.status = 'blocked';
        } else {
          robot.status = 'moving';
        }
=======
        robot.status = 'moving';
        updateRobotTrail(robot);
<<<<<<< HEAD

        // if (stepResult.arrived) {
        //   robot.driveState = null;

        //   const pathLength = robot.config.path?.length ?? 0;
        //   if (pathLength > 0) {
        //     if (robot.pathIndex < pathLength - 1) {
        //       robot.pathIndex += 1;
        //       robot.status = 'moving';
        //     } else if (robot.config.loop) {
        //       robot.pathIndex = 0;
        //       robot.status = 'moving';
        //     } else {
        //       robot.status = 'arrived';
        //     }
        //   } else {
        //     robot.status = 'idle';
        //   }

        //   continue;
        // }

        // const blockedBy = findRobotCollision(robot);
        // if (blockedBy) {
        //   robot.root.position.copy(previousPosition);
        //   robot.root.rotation.z = previousHeading;
        //   robot.driveState = null;
        //   robot.blockedBy = blockedBy;
        //   robot.status = 'blocked';
        // } else if (stepResult.mode === 'turn' || stepResult.mode === 'drive') {
        //   robot.status = 'moving';
        // }

        // updateRobotTrail(robot);
>>>>>>> 5c325b1 (feat(frontend): fixed robot pathing and heading when stopped)
=======
>>>>>>> 7fee38d (feat(reformat): reformatted scene viewer)
      }

      publishRobotStatuses();
    };

    const onDropPointPointerDown = (event: PointerEvent) => {
      if (!showDropPointRef.current || !event.altKey || !dropPointMarker) {
        return;
      }

      const rect = renderer.domElement.getBoundingClientRect();

      pickPointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pickPointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      pickRaycaster.setFromCamera(pickPointer, camera);

      const picked = dropPointMarker.pickOnPlane(
        pickRaycaster,
        dropPointRef.current.z,
      );

      if (!picked) return;

      dropPointRef.current = picked;
      dropPointMarker.setPosition(picked);
      setDropPoint(picked);
    };

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;

      if (width === 0 || height === 0) return;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
      gizmo.update();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    renderer.domElement.addEventListener('pointerdown', onDropPointPointerDown);

    const animate = () => {
      if (disposed) return;

      animationFrameId = requestAnimationFrame(animate);

      const deltaSeconds = clock.getDelta();

      controls.update();
<<<<<<< HEAD
      navigationOverlay?.tick(deltaSeconds);

=======
>>>>>>> 7fee38d (feat(reformat): reformatted scene viewer)
      updateRobots(deltaSeconds, currentFloorZ);

      renderer.render(scene, camera);
      gizmo.render();
    };

    animate();

    loader.load(
      SCENE_URL,
      async (gltf) => {
        if (disposed) return;

        loadedScene = gltf.scene;

        // GLTF is usually Y-up; rotate to Z-up world convention.
        gltf.scene.rotation.x = Math.PI / 2;

        tuneMaterials(gltf.scene);
        scene.add(gltf.scene);

        const bounds = computeSceneBounds(gltf.scene);
        currentFloorZ = bounds.floorZ;

        staticCollisionBoxes = collectStaticCollisionBoxes(
          gltf.scene,
          bounds.floorZ,
        );

        gridAxesHelpers = createGridAxesHelpers(bounds);
        scene.add(gridAxesHelpers);

        dropPointMarker = new DropPointMarker(bounds.maxDim * 0.012);
        scene.add(dropPointMarker.mesh);

        const initialDrop: DropPointCoords = {
          x: (bounds.min.x + bounds.max.x) / 2,
          y: (bounds.min.y + bounds.max.y) / 2,
          z: bounds.floorZ,
        };

        dropPointRef.current = initialDrop;
        dropPointMarker.setPosition(initialDrop);
        setDropPoint(initialDrop);

        sceneApiRef.current = {
          setShowGridAxes(show) {
            if (gridAxesHelpers) {
              gridAxesHelpers.visible = show;
            }
          },
<<<<<<< HEAD
          setNavigationEnabled(enabled) {
            navigationOverlay?.setEnabled(enabled);
          },
=======

>>>>>>> 7fee38d (feat(reformat): reformatted scene viewer)
          setDropPointEnabled(enabled) {
            dropPointMarker?.setVisible(enabled);
          },

          setDropPointPosition(position) {
            dropPointMarker?.setPosition(position);
          },

          setRoofSliceEnabled(enabled) {
            renderer.clippingPlanes = enabled ? [roofClipPlane] : [];
          },

          setRoofSliceHeight(height) {
            roofClipPlane.constant = height;
          },
        };

        setSceneDebug(toSceneDebugInfo(bounds));

        const frame = computeCameraFrame(gltf.scene);

        resetOrbitRef.current = () => {
          frameCamera(camera, controls, gltf.scene);
        };

        try {
          navigationOverlay = await NavigationOverlay.create({
            scene,
            domElement: renderer.domElement,
            camera,
            pathUrl: '/navigation-path.json',
          });
          // Match the GLTF Y-up → Z-up rotation applied to the floorplan.
          navigationOverlay.group.rotation.x = Math.PI / 2;
          navigationOverlay.on('waypoint:selected', ({ waypointId }) => {
            console.info('[navigation] waypoint:selected', waypointId);
          });
          navigationOverlay.on('robot:arrived', ({ goalId }) => {
            console.info('[navigation] robot:arrived', goalId);
          });
          navigationOverlay.setEnabled(showNavigationRef.current);
          resetPathRef.current = () => {
            if (navigationOverlay?.isEnabled()) navigationOverlay.reset();
          };
        } catch (overlayError) {
          console.error('Navigation overlay failed to load', overlayError);
        }

        try {
          robotTemplate = await loadGltfAsync(loader, ROBOT_MODEL_URL);
          tuneMaterials(robotTemplate);

          await refreshRobotConfig(bounds.floorZ);

          robotConfigTimerId = window.setInterval(() => {
            void refreshRobotConfig(bounds.floorZ);
          }, ROBOT_CONFIG_REFRESH_MS);
        } catch (robotError) {
          console.error('Robots failed to load', robotError);
          setRobotStatuses([]);
        }

<<<<<<< HEAD
        if (disposed) {
          navigationOverlay?.dispose();
          navigationOverlay = null;
          return;
        }
=======
        if (disposed) return;
>>>>>>> 7fee38d (feat(reformat): reformatted scene viewer)

        setLoadState('ready');
        animateIntroCamera(camera, controls, frame, () => disposed);
      },
      undefined,
      (error) => {
        if (disposed) return;

        const message =
          error instanceof Error ? error.message : 'Failed to load 3D scene';

        setErrorMessage(message);
        setLoadState('error');
      },
    );

    return () => {
      disposed = true;

      resetOrbitRef.current = null;
      resetPathRef.current = null;
      resetRobotsRef.current = null;
      sceneApiRef.current = null;

      navigationOverlay?.dispose();
      navigationOverlay = null;

      if (robotConfigTimerId !== null) {
        window.clearInterval(robotConfigTimerId);
        robotConfigTimerId = null;
      }

      for (const id of Array.from(robots.keys())) {
        removeRobot({
          id,
          scene,
          robots,
        });
      }

      if (robotTemplate) {
        disposeObject3D(robotTemplate);
        robotTemplate = null;
      }

      staticCollisionBoxes = [];
      setRobotStatuses([]);

      renderer.domElement.removeEventListener(
        'pointerdown',
        onDropPointPointerDown,
      );

      dropPointMarker?.dispose();
      dropPointMarker = null;

      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();

      if (gridAxesHelpers) {
        scene.remove(gridAxesHelpers);
        disposeObject3D(gridAxesHelpers);
        gridAxesHelpers = null;
      }

      if (loadedScene) {
        disposeObject3D(loadedScene);
        scene.remove(loadedScene);
        loadedScene = null;
      }

      setSceneDebug(null);

      gizmo.dispose();

      THREE.Object3D.DEFAULT_UP.copy(previousDefaultUp);

      controls.dispose();
      renderer.dispose();
      dracoLoader.dispose();

      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <Box
      ref={containerRef}
      position="relative"
      w="100%"
      h={{ base: '400px', md: '600px', xl: '70vh' }}
      bg="white"
      borderWidth="1px"
      borderColor="border.subtle"
      rounded="lg"
      overflow="hidden"
    >
      {loadState === 'error' && (
        <Center position="absolute" inset={0} zIndex={1} bg="white" px={6}>
          <Text color="fg.error" textAlign="center">
            {errorMessage ?? 'Failed to load floor plan'}
          </Text>
        </Center>
      )}

      <Stack
        position="absolute"
        top={3}
        left={3}
        zIndex={2}
        gap={2}
        align="flex-start"
        pointerEvents="none"
        maxW={{ base: 'calc(100% - 160px)', md: '280px' }}
      >
<<<<<<< HEAD
        <Box
          px={2.5}
          py={2}
          rounded="md"
          bg="bg/90"
          borderWidth="1px"
          borderColor="border.subtle"
          backdropFilter="blur(4px)"
          pointerEvents="auto"
        >
          <Stack gap={2}>
            <Switch.Root
              size="sm"
              colorPalette="blue"
              checked={showGridAxes}
              disabled={loadState !== 'ready'}
              onCheckedChange={(details) => setShowGridAxes(details.checked)}
            >
              <Switch.HiddenInput />
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              <Switch.Label fontSize="sm">Grid &amp; axes</Switch.Label>
            </Switch.Root>
            <Switch.Root
              size="sm"
              colorPalette="purple"
              checked={showNavigation}
              disabled={loadState !== 'ready'}
              onCheckedChange={(details) => setShowNavigation(details.checked)}
            >
              <Switch.HiddenInput />
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              <Switch.Label fontSize="sm">Robot navigation</Switch.Label>
            </Switch.Root>
            <Switch.Root
              size="sm"
              colorPalette="yellow"
              checked={showDropPoint}
              disabled={loadState !== 'ready'}
              onCheckedChange={(details) => setShowDropPoint(details.checked)}
            >
              <Switch.HiddenInput />
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              <Switch.Label fontSize="sm">Drop point</Switch.Label>
            </Switch.Root>
            <Switch.Root
              size="sm"
              colorPalette="orange"
              checked={showRoofSlice}
              disabled={loadState !== 'ready'}
              onCheckedChange={(details) => setShowRoofSlice(details.checked)}
            >
              <Switch.HiddenInput />
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              <Switch.Label fontSize="sm">Slice roof</Switch.Label>
            </Switch.Root>
          </Stack>
        </Box>
        {showRoofSlice && (
          <Field.Root>
            <Field.Label fontSize="xs">Roof slice Z height</Field.Label>
            <Input
              size="sm"
              type="number"
              step="0.1"
              fontFamily="mono"
              value={roofSliceHeight}
              onChange={(e) => {
                const value = Number.parseFloat(e.target.value);
                if (!Number.isNaN(value)) setRoofSliceHeight(value);
              }}
            />
          </Field.Root>
        )}
        {showDropPoint && (
          <Card.Root
            size="sm"
            variant="outline"
            bg="bg/90"
            backdropFilter="blur(4px)"
            pointerEvents="auto"
            w="full"
          >
            <Card.Body gap={3} py={3}>
              <Text fontSize="sm" fontWeight="semibold">
                Drop point
              </Text>
              <Text fontSize="xs" color="fg.muted" lineHeight="short">
                Same world X, Y, Z as navigation-path.json (blue axis = Z up).
                Alt+click sets X and Y on the plane at the current Z.
              </Text>
              <Stack gap={2}>
                {(['x', 'y', 'z'] as const).map((axis) => (
                  <Field.Root key={axis}>
                    <Field.Label fontSize="xs" textTransform="uppercase">
                      {axis}
                    </Field.Label>
                    <Input
                      size="sm"
                      type="number"
                      step="0.1"
                      fontFamily="mono"
                      value={dropPoint[axis]}
                      onChange={(e) => {
                        const value = Number.parseFloat(e.target.value);
                        if (Number.isNaN(value)) return;
                        setDropPoint((prev) => ({ ...prev, [axis]: value }));
                      }}
                    />
                  </Field.Root>
                ))}
              </Stack>
              {sceneDebug && (
                <Button
                  size="xs"
                  variant="outline"
                  colorPalette="gray"
                  onClick={() =>
                    setDropPoint((prev) => ({
                      ...prev,
                      z: sceneDebug.floorZ,
                    }))
                  }
                >
                  Snap Z to floor ({formatCoord(sceneDebug.floorZ)})
                </Button>
              )}
              <Box
                px={2}
                py={1.5}
                rounded="md"
                bg="bg.subtle"
                borderWidth="1px"
                borderColor="border.subtle"
                fontFamily="mono"
                fontSize="xs"
                color="fg.muted"
                wordBreak="break-all"
              >
                {`"x": ${formatCoord(dropPoint.x)}, "y": ${formatCoord(dropPoint.y)}, "z": ${formatCoord(dropPoint.z)}`}
              </Box>
            </Card.Body>
          </Card.Root>
=======
        <SceneControlPanel
          loadState={loadState}
          showGridAxes={showGridAxes}
          onShowGridAxesChange={setShowGridAxes}
          showDropPoint={showDropPoint}
          onShowDropPointChange={setShowDropPoint}
          showRoofSlice={showRoofSlice}
          onShowRoofSliceChange={setShowRoofSlice}
          roofSliceHeight={roofSliceHeight}
          onRoofSliceHeightChange={setRoofSliceHeight}
        />

        {showDropPoint && (
          <DropPointPanel
            dropPoint={dropPoint}
            setDropPoint={setDropPoint}
            sceneDebug={sceneDebug}
          />
>>>>>>> 7fee38d (feat(reformat): reformatted scene viewer)
        )}

        {showGridAxes && sceneDebug && (
          <Card.Root
            size="sm"
            variant="outline"
            bg="bg/90"
            backdropFilter="blur(4px)"
            pointerEvents="auto"
            w="full"
          >
            <Card.Body gap={2} py={3}>
              <Text fontSize="sm" fontWeight="semibold">
                Floor reference
              </Text>

              <Text fontSize="sm" color="fg.muted">
                Floor Z height:{' '}
                <Text as="span" fontFamily="mono" color="fg">
                  {formatCoord(sceneDebug.floorZ)}
                </Text>
              </Text>

              <Text fontSize="xs" color="fg.muted" lineHeight="short">
                Red = +X, green = +Y, blue = +Z. Read vertex positions from the
                grid; bounds min Z is the floor level.
              </Text>

              <Stack gap={0.5} fontFamily="mono" fontSize="xs" color="fg.muted">
                <Text>
                  min ({formatCoord(sceneDebug.min.x)},{' '}
                  {formatCoord(sceneDebug.min.y)},{' '}
                  {formatCoord(sceneDebug.min.z)})
                </Text>

                <Text>
                  max ({formatCoord(sceneDebug.max.x)},{' '}
                  {formatCoord(sceneDebug.max.y)},{' '}
                  {formatCoord(sceneDebug.max.z)})
                </Text>
              </Stack>
            </Card.Body>
          </Card.Root>
        )}
      </Stack>

      <RobotStatusPanel robots={robotStatuses} />

      <HStack
        position="absolute"
        bottom={3}
        left={3}
        zIndex={2}
        gap={2}
        align="center"
        pointerEvents="none"
      >
        <Tooltip content="Reset orbit origin" showArrow>
          <IconButton
            aria-label="Reset orbit origin"
            size="sm"
            variant="surface"
            colorPalette="gray"
            pointerEvents="auto"
            disabled={loadState !== 'ready'}
            onClick={() => resetOrbitRef.current?.()}
            css={{
              _icon: {
                width: '18px',
                height: '18px',
              },
            }}
          >
            <LuLocateFixed />
          </IconButton>
        </Tooltip>
<<<<<<< HEAD
        <Tooltip content="Restart path" showArrow>
          <IconButton
            aria-label="Restart path"
            size="sm"
            variant="surface"
            colorPalette="purple"
            pointerEvents="auto"
            disabled={loadState !== 'ready' || !showNavigation}
            onClick={() => resetPathRef.current?.()}
            css={{
              _icon: {
                width: '18px',
                height: '18px',
              },
            }}
          >
            <LuRotateCcw />
          </IconButton>
        </Tooltip>
=======

>>>>>>> 7fee38d (feat(reformat): reformatted scene viewer)
        <Tooltip content="Reset all robots" showArrow>
          <Button
            size="sm"
            variant="surface"
            colorPalette="blue"
            pointerEvents="auto"
            disabled={loadState !== 'ready' || robotStatuses.length === 0}
            onClick={() => resetRobotsRef.current?.()}
          >
            Reset robots
          </Button>
        </Tooltip>

        <Box
          px={2.5}
          py={1.5}
          rounded="md"
          bg="bg/80"
          borderWidth="1px"
          borderColor="border.subtle"
          backdropFilter="blur(4px)"
        >
          <Text fontSize="xs" color="fg.muted">
            Hold <Kbd size="sm">Shift</Kbd> to pan
          </Text>
        </Box>
      </HStack>
    </Box>
  );
}

export default SceneViewer;
