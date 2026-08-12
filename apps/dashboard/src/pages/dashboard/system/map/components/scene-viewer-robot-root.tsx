import { useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import * as THREE from 'three';

import {
  MOTION_DURATION_SECONDS,
  ROBOT_MODEL_HEADING_OFFSET,
} from './constants';
import { getRobotPosition } from './robot-utils';
import {
  removeRobotVisual,
  SceneViewerRobotModelContext,
} from './use-scene-robot-model';
import {
  removeRobotTrail,
  SceneViewerRobotTrailContext,
} from './use-scene-robot-trail';
import { useSceneViewerRobot } from './use-scene-viewer';
import type { RobotConfig, RobotRuntime } from './robot-types';

export type SceneViewerRobotRootProps = PropsWithChildren;

function movementHeadingToModelHeading(heading: number): number {
  return heading + ROBOT_MODEL_HEADING_OFFSET;
}

function poseKey(config: RobotConfig): string {
  if (!config.position) return '';
  return `${config.position.x}:${config.position.y}:${config.rotationZ ?? ''}`;
}

function createRobotRuntime(
  config: RobotConfig,
  scene: THREE.Scene,
  floorZ: number,
): RobotRuntime {
  const root = new THREE.Group();
  root.name = `robot:${config.id}`;

  const position = getRobotPosition(config, floorZ);
  root.position.set(position.x, position.y, position.z);
  root.rotation.z = movementHeadingToModelHeading(config.rotationZ ?? 0);
  scene.add(root);

  return {
    id: config.id,
    name: config.name ?? config.id,
    root,
    config,
    status: config.enabled === false ? 'disabled' : 'idle',
    lastConfigPoseKey: poseKey(config),
  };
}

function removeRobotRuntime(
  id: string,
  scene: THREE.Scene,
  robots: Map<string, RobotRuntime>,
): void {
  const robot = robots.get(id);
  if (!robot) return;

  removeRobotVisual(robot);
  removeRobotTrail(robot, scene);
  scene.remove(robot.root);
  robots.delete(id);
}

function syncRobotRuntimes(
  configs: RobotConfig[],
  scene: THREE.Scene,
  robots: Map<string, RobotRuntime>,
  floorZ: number,
): void {
  const nextIds = new Set(configs.map((config) => config.id));

  for (const id of Array.from(robots.keys())) {
    if (!nextIds.has(id)) removeRobotRuntime(id, scene, robots);
  }

  for (const config of configs) {
    const existing = robots.get(config.id);
    if (!existing) {
      robots.set(config.id, createRobotRuntime(config, scene, floorZ));
      continue;
    }

    existing.name = config.name ?? config.id;
    existing.config = config;

    if (config.enabled === false) {
      existing.status = 'disabled';
      existing.lerpTarget = undefined;
      continue;
    }

    const nextPoseKey = poseKey(config);
    if (config.position && nextPoseKey !== existing.lastConfigPoseKey) {
      const position = getRobotPosition(config, floorZ);
      existing.lerpTarget = {
        fromPosition: existing.root.position.clone(),
        toPosition: new THREE.Vector3(position.x, position.y, position.z),
        fromRotationZ: existing.root.rotation.z,
        toRotationZ:
          config.rotationZ === undefined
            ? existing.root.rotation.z
            : movementHeadingToModelHeading(config.rotationZ),
        elapsedSeconds: 0,
        durationSeconds: MOTION_DURATION_SECONDS,
      };
      existing.lastConfigPoseKey = nextPoseKey;
    }
  }
}

/**
 * Headless provider for robot model and trail behavior.
 */
export function SceneViewerRobotRoot({ children }: SceneViewerRobotRootProps) {
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
  const [robotsVersion, setRobotsVersion] = useState(0);

  useEffect(() => {
    const scene = sceneContextRef.current?.scene;
    if (!scene || floorZ === null) return;

    syncRobotRuntimes(robotConfigs, scene, robotsRef.current, floorZ);
    setRobotsVersion((version) => version + 1);
  }, [floorZ, robotConfigs, robotsRef, sceneContextRef]);

  useEffect(() => {
    if (floorZ === null) return;
    const scene = sceneContextRef.current?.scene;
    if (!scene) return;
    const robots = robotsRef.current;

    return () => {
      for (const id of Array.from(robots.keys())) {
        removeRobotRuntime(id, scene, robots);
      }
      robots.clear();
    };
  }, [floorZ, robotsRef, sceneContextRef]);

  const modelContext = useMemo(
    () => ({
      mapClient,
      sceneContextRef,
      robotsRef,
      robotTemplatesRef,
      modelUrlMap,
      robotsVersion,
    }),
    [
      mapClient,
      sceneContextRef,
      robotsRef,
      robotTemplatesRef,
      modelUrlMap,
      robotsVersion,
    ],
  );

  const trailContext = useMemo(
    () => ({
      sceneContextRef,
      robotsRef,
      robotConfigs,
      showPathLines,
      robotsVersion,
    }),
    [sceneContextRef, robotsRef, robotConfigs, showPathLines, robotsVersion],
  );

  return (
    <SceneViewerRobotModelContext value={modelContext}>
      <SceneViewerRobotTrailContext value={trailContext}>
        {children}
      </SceneViewerRobotTrailContext>
    </SceneViewerRobotModelContext>
  );
}
