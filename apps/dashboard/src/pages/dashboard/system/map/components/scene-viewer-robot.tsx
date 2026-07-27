import { useEffect } from 'react';
import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';

import {
  createRobotTrail,
  disposeRobotTrail,
  robotTrailKey,
  updateCurrentEdgeHighlight,
} from './scene-viewer-robot-trail';
import { useSceneViewerRobot } from './use-scene-viewer';
import { useRobotTemplates } from './use-robot-template';
import { tuneMaterials, disposeObject3D } from './three-utils';
import {
  ROBOT_MODEL_HEADING_OFFSET,
  MOTION_DURATION_SECONDS,
} from './constants';
import type { WaypointCoords, RobotConfig, RobotRuntime } from './robot-types';

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
    return { x: startWaypoint.x, y: startWaypoint.y, z: startWaypoint.z };
  }

  return { x: 0, y: 0, z: floorZ };
}

function poseKey(config: RobotConfig): string {
  if (!config.position) return '';
  return `${config.position.x}:${config.position.y}:${config.rotationZ ?? ''}`;
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

  const templatesVersion = useRobotTemplates({
    mapClient,
    modelUrlMap,
    robotTemplatesRef,
    sceneContextRef,
  });

  // Sync robot instances from the latest query-derived configs.
  useEffect(() => {
    const sceneCtx = sceneContextRef.current;
    const templates = robotTemplatesRef.current;
    if (!sceneCtx || !templates || floorZ === null) {
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
    const sceneCtx = sceneContextRef.current;
    const robots = robotsRef.current;

    return () => {
      if (sceneCtx) {
        for (const id of Array.from(robots.keys())) {
          removeRobot(id, sceneCtx.scene, robots);
        }
      }
      robots.clear();

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
