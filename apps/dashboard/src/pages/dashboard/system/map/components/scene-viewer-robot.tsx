import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import { useSceneViewerRobot } from './use-scene-viewer';
import { tuneMaterials, disposeObject3D, loadGltfAsync } from './three-utils';
import {
  AMR_URL,
  DRACO_DECODER_PATH,
  DEFAULT_ROBOT_COLOR,
  ROBOT_MODEL_HEADING_OFFSET,
  ROBOT_POSITION_POLL_MS,
  ROBOT_TRAIL_LINE_WIDTH,
  ROBOT_TRAIL_Z_OFFSET,
} from './constants';
import type {
  WaypointCoords,
  RobotConfig,
  RobotRuntime,
  RobotTrailRuntime,
  RobotPathCoordinateSystem,
} from './robot-types';

function pathCoordsToWorld(
  value: WaypointCoords | undefined,
  fallbackWorld: WaypointCoords,
  coordinateSystem: RobotPathCoordinateSystem = 'navigation',
): WaypointCoords {
  if (!value) return fallbackWorld;
  if (coordinateSystem === 'world') {
    return { x: value.x, y: value.y, z: value.z };
  }
  return { x: value.x, y: value.y, z: value.z };
}

function livePositionToWorld(position: {
  x: number;
  y: number;
  z?: number;
}): WaypointCoords {
  return { x: position.x, y: position.y, z: position.z || 0 };
}

function movementHeadingToModelHeading(heading: number): number {
  return heading + ROBOT_MODEL_HEADING_OFFSET;
}

function getInitialModelHeading(rotationZ?: number): number {
  return movementHeadingToModelHeading(rotationZ ?? 0);
}

function getInitialRobotPosition(
  config: RobotConfig,
  floorZ: number,
): WaypointCoords {
  if (config.position) return livePositionToWorld(config.position);

  const startWaypoint = config.path?.[0];
  if (startWaypoint) {
    return pathCoordsToWorld(
      startWaypoint,
      { x: 0, y: 0, z: floorZ },
      config.pathCoordinateSystem,
    );
  }

  return { x: 0, y: 0, z: floorZ };
}

const MOTION_DURATION_SECONDS = ROBOT_POSITION_POLL_MS / 1000;

// ── Config / diff-key helpers ────────────────────────────────────────────────

function poseKey(config: RobotConfig): string {
  if (!config.position) return '';
  return `${config.position.x}:${config.position.y}:${config.rotationZ ?? ''}`;
}

function pathKey(path: RobotConfig['path']): string {
  if (!path?.length) return '';
  return path
    .map((w) => `${w.id}:${w.label ?? ''}:${w.x}:${w.y}:${w.z}`)
    .join('|');
}

function robotTrailKey(config: RobotConfig): string {
  return [
    config.color ?? DEFAULT_ROBOT_COLOR,
    config.pathCoordinateSystem ?? 'navigation',
    config.loop ? '1' : '0',
    pathKey(config.path),
  ].join('::');
}

// ── Trail rendering ───────────────────────────────────────────────────────────

function withTrailOffset(point: THREE.Vector3): THREE.Vector3 {
  return point.clone().add(new THREE.Vector3(0, 0, ROBOT_TRAIL_Z_OFFSET));
}

function toFlatPositions(points: THREE.Vector3[]): number[] {
  return points.flatMap((p) => [p.x, p.y, p.z]);
}

function createLineGeometryFromPoints(points: THREE.Vector3[]): LineGeometry {
  const geometry = new LineGeometry();
  const pts =
    points.length === 0
      ? []
      : points.length === 1
        ? [points[0], points[0]]
        : points;
  if (pts.length >= 2) {
    geometry.setPositions(toFlatPositions(pts));
  }
  return geometry;
}

function getRobotColor(config: RobotConfig): THREE.Color {
  try {
    return new THREE.Color(config.color ?? DEFAULT_ROBOT_COLOR);
  } catch {
    return new THREE.Color(DEFAULT_ROBOT_COLOR);
  }
}

function getRobotPathWorldPoints(config: RobotConfig): THREE.Vector3[] {
  const points = (config.path ?? []).map((waypoint) => {
    const world = pathCoordsToWorld(
      waypoint,
      { x: 0, y: 0, z: 0 },
      config.pathCoordinateSystem,
    );
    return new THREE.Vector3(world.x, world.y, world.z + ROBOT_TRAIL_Z_OFFSET);
  });

  // Close the polyline back to the start when the backend marks this path as looping.
  if (config.loop && points.length >= 2) {
    points.push(points[0].clone());
  }

  return points;
}

function distanceSqToSegment2D(
  point: THREE.Vector3,
  start: THREE.Vector3,
  end: THREE.Vector3,
): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    const px = point.x - start.x;
    const py = point.y - start.y;
    return px * px + py * py;
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq,
    ),
  );
  const projectionX = start.x + t * dx;
  const projectionY = start.y + t * dy;
  const px = point.x - projectionX;
  const py = point.y - projectionY;
  return px * px + py * py;
}

function getClosestPathEdge(
  pathPoints: THREE.Vector3[],
  robotPosition: THREE.Vector3,
): { index: number; points: [THREE.Vector3, THREE.Vector3] } | null {
  if (pathPoints.length < 2) return null;

  let closestIndex = 0;
  let closestDistanceSq = Number.POSITIVE_INFINITY;

  for (let i = 0; i < pathPoints.length - 1; i += 1) {
    const distanceSq = distanceSqToSegment2D(
      robotPosition,
      pathPoints[i],
      pathPoints[i + 1],
    );
    if (distanceSq < closestDistanceSq) {
      closestDistanceSq = distanceSq;
      closestIndex = i;
    }
  }

  return {
    index: closestIndex,
    points: [pathPoints[closestIndex], pathPoints[closestIndex + 1]],
  };
}

function updateCurrentEdgeLine(
  trail: RobotTrailRuntime,
  robotPosition: THREE.Vector3,
  force = false,
): void {
  const edge = getClosestPathEdge(trail.pathPoints, robotPosition);
  if (!edge) {
    trail.currentEdgeIndex = null;
    trail.currentEdgeLine.visible = false;
    return;
  }

  if (
    !force &&
    trail.currentEdgeLine.visible &&
    trail.currentEdgeIndex === edge.index
  ) {
    return;
  }

  trail.currentEdgeGeometry.setPositions(toFlatPositions(edge.points));
  trail.currentEdgeGeometry.computeBoundingSphere();
  trail.currentEdgeIndex = edge.index;
  trail.currentEdgeLine.visible = true;
}

function createRobotTrail(
  config: RobotConfig,
  startPosition: THREE.Vector3,
): RobotTrailRuntime {
  const color = getRobotColor(config);
  const group = new THREE.Group();
  group.name = `trail:${config.id}`;

  const plannedPoints = getRobotPathWorldPoints(config);

  const plannedGeometry = createLineGeometryFromPoints(plannedPoints);
  const currentEdgeGeometry = createLineGeometryFromPoints([]);

  const plannedMaterial = new LineMaterial({
    color: color.getHex(),
    transparent: true,
    opacity: 0.25,
    depthWrite: false,
    depthTest: true,
    worldUnits: true,
    linewidth: ROBOT_TRAIL_LINE_WIDTH,
  });

  const currentEdgeMaterial = new LineMaterial({
    color: color.getHex(),
    transparent: true,
    opacity: 1,
    depthWrite: false,
    depthTest: true,
    worldUnits: true,
    linewidth: ROBOT_TRAIL_LINE_WIDTH,
  });

  const plannedLine = new Line2(plannedGeometry, plannedMaterial);
  const currentEdgeLine = new Line2(currentEdgeGeometry, currentEdgeMaterial);

  plannedLine.name = `planned-path:${config.id}`;
  currentEdgeLine.name = `current-edge:${config.id}`;

  plannedLine.renderOrder = 20;
  currentEdgeLine.renderOrder = 30;
  currentEdgeLine.frustumCulled = false;
  currentEdgeLine.visible = false;

  group.add(plannedLine);
  group.add(currentEdgeLine);

  const trail: RobotTrailRuntime = {
    group,
    plannedLine,
    currentEdgeLine,
    plannedMaterial,
    currentEdgeMaterial,
    plannedGeometry,
    currentEdgeGeometry,
    pathPoints: plannedPoints,
    currentEdgeIndex: null,
  };

  updateCurrentEdgeLine(trail, withTrailOffset(startPosition), true);
  return trail;
}

function disposeRobotTrail(trail: RobotTrailRuntime): void {
  trail.plannedGeometry.dispose();
  trail.currentEdgeGeometry.dispose();
  trail.plannedMaterial.dispose();
  trail.currentEdgeMaterial.dispose();
}

function updateCurrentEdgeHighlight(robot: RobotRuntime, force = false): void {
  if (!robot.trail) return;
  updateCurrentEdgeLine(
    robot.trail,
    withTrailOffset(robot.root.position),
    force,
  );
}

function shortestAngleDelta(from: number, to: number): number {
  let delta = to - from;
  if (delta > Math.PI) delta -= 2 * Math.PI;
  if (delta < -Math.PI) delta += 2 * Math.PI;
  return delta;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// ── Template lifecycle ───────────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function cloneRobotTemplate(template: THREE.Group): THREE.Group {
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

async function loadRobotTemplates(
  loader: GLTFLoader,
  modelUrlMap: Map<string, string>,
  fallbackUrl: string,
  requestHeaders: Record<string, string>,
): Promise<Map<string, THREE.Group>> {
  const templates = new Map<string, THREE.Group>();

  for (const [model, url] of modelUrlMap) {
    let tmpl: THREE.Group;
    try {
      // Restore the auth header before each attempt — a previous model's
      // CDN fallback (below) may have cleared it on this shared loader.
      loader.setRequestHeader(requestHeaders);
      tmpl = await loadGltfAsync(loader, url);
    } catch {
      // The CDN fallback rejects a preflight carrying an Authorization header
      // it doesn't expect, so clear it before retrying against the CDN asset.
      loader.setRequestHeader({});
      tmpl = await loadGltfAsync(loader, fallbackUrl);
    }
    tuneMaterials(tmpl);
    templates.set(model, tmpl);
  }

  return templates;
}

function applyRobotScale(root: THREE.Group, scale: RobotConfig['scale']): void {
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

// ── Instance lifecycle ────────────────────────────────────────────────────────

type CreateRobotArgs = {
  config: RobotConfig;
  templates: Map<string, THREE.Group>;
  floorZ: number;
  scene: THREE.Scene;
};

function createRobot({
  config,
  templates,
  floorZ,
  scene,
}: CreateRobotArgs): RobotRuntime {
  const template =
    templates.get(config.model ?? '') ?? [...templates.values()][0];

  if (!template) {
    throw new Error(`No robot template available for model "${config.model}"`);
  }

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
  root.rotation.z = getInitialModelHeading(config.rotationZ);

  scene.add(root);
  const trail = createRobotTrail(config, root.position);
  scene.add(trail.group);

  return {
    id: config.id,
    name: config.name ?? config.id,
    root,
    config,
    status: config.enabled === false ? 'disabled' : 'idle',
    lastConfigPoseKey: poseKey(config),
    lastConfigTrailKey: robotTrailKey(config),
    trail,
  };
}

function removeRobot(
  id: string,
  scene: THREE.Scene,
  robots: Map<string, RobotRuntime>,
): void {
  const robot = robots.get(id);
  if (!robot) return;

  scene.remove(robot.root);
  disposeObject3D(robot.root);

  if (robot.trail) {
    scene.remove(robot.trail.group);
    disposeRobotTrail(robot.trail);
  }

  robots.delete(id);
}

type SyncRobotsFromConfigArgs = {
  configs: RobotConfig[];
  scene: THREE.Scene;
  robots: Map<string, RobotRuntime>;
  templates: Map<string, THREE.Group>;
  floorZ: number;
};

function syncRobotsFromConfig({
  configs,
  scene,
  robots,
  templates,
  floorZ,
}: SyncRobotsFromConfigArgs): void {
  const nextIds = new Set(configs.map((config) => config.id));

  for (const id of Array.from(robots.keys())) {
    if (!nextIds.has(id)) removeRobot(id, scene, robots);
  }

  for (const config of configs) {
    const existing = robots.get(config.id);

    if (!existing) {
      robots.set(config.id, createRobot({ config, templates, floorZ, scene }));
      continue;
    }

    existing.name = config.name ?? config.id;
    existing.config = config;
    if (config.enabled === false) {
      existing.status = 'disabled';
      existing.lerpTarget = undefined;
    }

    const nextTrailKey = robotTrailKey(config);
    if (nextTrailKey !== existing.lastConfigTrailKey) {
      if (existing.trail) {
        scene.remove(existing.trail.group);
        disposeRobotTrail(existing.trail);
      }
      existing.trail = createRobotTrail(config, existing.root.position);
      scene.add(existing.trail.group);
      existing.lastConfigTrailKey = nextTrailKey;
    }

    if (config.enabled === false) {
      applyRobotScale(existing.root, config.scale);
      continue;
    }

    const nextPoseKey = poseKey(config);
    if (config.position && nextPoseKey !== existing.lastConfigPoseKey) {
      const worldPosition = livePositionToWorld(config.position);
      const toRotationZ =
        config.rotationZ !== undefined
          ? movementHeadingToModelHeading(config.rotationZ)
          : existing.root.rotation.z;

      existing.lerpTarget = {
        fromPosition: existing.root.position.clone(),
        toPosition: new THREE.Vector3(
          worldPosition.x,
          worldPosition.y,
          worldPosition.z,
        ),
        fromRotationZ: existing.root.rotation.z,
        toRotationZ,
        elapsedSeconds: 0,
        durationSeconds: MOTION_DURATION_SECONDS,
      };
      existing.lastConfigPoseKey = nextPoseKey;
    }

    applyRobotScale(existing.root, config.scale);
  }
}

// ── Per-frame update — imported by SceneViewerViewport3D's animation loop ────

export function updateRobots(
  robots: Map<string, RobotRuntime>,
  deltaSeconds: number,
): void {
  for (const robot of robots.values()) {
    if (robot.config.enabled === false) {
      robot.status = 'disabled';
      continue;
    }

    if (!robot.lerpTarget) {
      robot.status = 'idle';
      updateCurrentEdgeHighlight(robot);
      continue;
    }

    const target = robot.lerpTarget;
    target.elapsedSeconds += deltaSeconds;

    const t = Math.min(target.elapsedSeconds / target.durationSeconds, 1);
    const eased = easeOutCubic(t);

    robot.root.position.lerpVectors(
      target.fromPosition,
      target.toPosition,
      eased,
    );
    robot.root.rotation.z =
      target.fromRotationZ +
      shortestAngleDelta(target.fromRotationZ, target.toRotationZ) * eased;

    if (t === 1) {
      robot.root.position.copy(target.toPosition);
      robot.root.rotation.z = target.toRotationZ;
      robot.lerpTarget = undefined;
      robot.status = 'idle';
      updateCurrentEdgeHighlight(robot, true);
      continue;
    }

    robot.status = 'moving';
    updateCurrentEdgeHighlight(robot);
  }
}

// ── Component ──────────────────────────────────────────────────────────────

/**
 * Headless sibling of SceneViewerViewport3D: subscribes to the same
 * SceneViewerContext and owns robot template loading, robot/trail
 * creation-and-sync from live query data, and the "Show path lines" toggle.
 * Renders nothing — it only mutates the shared THREE.Scene (via
 * sceneContextRef) and the shared robotsRef that Viewport3D's render loop
 * reads from every frame via `updateRobots` above.
 */
export function SceneViewerRobot() {
  const {
    mapClient,
    sceneContextRef,
    robotsRef,
    robotTemplatesRef,
    floorZ,
    robotConfigs,
    modelUrlMap,
    showPathLines,
  } = useSceneViewerRobot();

  const [templatesVersion, setTemplatesVersion] = useState(0);

  // Load robot GLTF templates whenever the set of models changes.
  useEffect(() => {
    if (!mapClient) return;
    if (modelUrlMap.size === 0) return;
    if (!sceneContextRef.current) return;

    let cancelled = false;
    const { loadingManager } = sceneContextRef.current;

    const robotDracoLoader = new DRACOLoader(loadingManager);
    robotDracoLoader.setDecoderPath(DRACO_DECODER_PATH);
    const robotLoader = new GLTFLoader(loadingManager);
    robotLoader.setDRACOLoader(robotDracoLoader);

    loadRobotTemplates(
      robotLoader,
      modelUrlMap,
      AMR_URL,
      mapClient.getRequestHeaders(),
    )
      .then((templates) => {
        if (cancelled) return;
        const previous = robotTemplatesRef.current;
        if (previous) {
          for (const template of previous.values()) disposeObject3D(template);
        }
        robotTemplatesRef.current = templates;
        setTemplatesVersion((v) => v + 1);
      })
      .catch((error: unknown) => {
        console.error('Failed to load robot templates', error);
      })
      .finally(() => robotDracoLoader.dispose());

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapClient, modelUrlMap]);

  // Sync robot instances from the latest query-derived configs.
  useEffect(() => {
    const sceneCtx = sceneContextRef.current;
    const templates = robotTemplatesRef.current;
    if (
      !sceneCtx ||
      !templates ||
      floorZ === null ||
      robotConfigs.length === 0
    ) {
      return;
    }

    syncRobotsFromConfig({
      configs: robotConfigs,
      scene: sceneCtx.scene,
      robots: robotsRef.current,
      templates,
      floorZ,
    });

    // Re-apply the current toggle so a robot created while it's off doesn't
    // flash visible until the next toggle change.
    for (const robot of robotsRef.current.values()) {
      if (robot.trail) robot.trail.group.visible = showPathLines;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [robotConfigs, templatesVersion, floorZ]);

  // "Show path lines" toggle.
  useEffect(() => {
    for (const robot of robotsRef.current.values()) {
      if (robot.trail) robot.trail.group.visible = showPathLines;
    }
  }, [robotsRef, showPathLines]);

  // Dispose robot templates + clear the runtime map on unmount. Robot roots
  // and trail lines are children of `scene`, so Viewport3D's own unmount
  // (disposeScene) already frees their GPU resources — templates live
  // outside the scene graph (only their clones are ever added), so they're
  // the one thing only this component can clean up.
  useEffect(() => {
    return () => {
      const sceneCtx = sceneContextRef.current;
      if (sceneCtx) {
        for (const id of Array.from(robotsRef.current.keys())) {
          removeRobot(id, sceneCtx.scene, robotsRef.current);
        }
      }
      robotsRef.current.clear();

      if (robotTemplatesRef.current) {
        for (const template of robotTemplatesRef.current.values()) {
          disposeObject3D(template);
        }
        robotTemplatesRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
