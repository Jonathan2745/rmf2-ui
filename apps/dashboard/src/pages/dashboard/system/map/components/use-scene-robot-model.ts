import { createContext, useContext, useEffect } from 'react';
import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';

import type { RobotConfig, RobotRuntime } from './robot-types';
import { disposeObject3D, disposeObject3DCollection } from './three-utils';
import { useRobotTemplate } from './use-robot-template';
import type { UseSceneViewerReturn } from './use-scene-viewer';

export type SceneViewerRobotModelContextValue = Pick<
  UseSceneViewerReturn,
  | 'mapClient'
  | 'sceneContextRef'
  | 'robotsRef'
  | 'robotTemplatesRef'
  | 'modelUrlMap'
> & {
  robotsVersion: number;
};

export const SceneViewerRobotModelContext = createContext<
  SceneViewerRobotModelContextValue | undefined
>(undefined);

function useSceneViewerRobotModelContext(): SceneViewerRobotModelContextValue {
  const context = useContext(SceneViewerRobotModelContext);

  if (!context) {
    throw new Error(
      'useSceneRobotModel must be used inside SceneViewer.RobotRoot',
    );
  }

  return context;
}

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

function applyRobotScale(
  visual: THREE.Group,
  scale: RobotConfig['scale'],
): void {
  if (typeof scale === 'number') {
    visual.scale.setScalar(scale);
    return;
  }

  if (isRecord(scale)) {
    visual.scale.set(
      readNumber(scale.x, 1),
      readNumber(scale.y, 1),
      readNumber(scale.z, 1),
    );
  }
}

function visualKey(config: RobotConfig): string {
  const scale = isRecord(config.scale)
    ? `${config.scale.x ?? 1}:${config.scale.y ?? 1}:${config.scale.z ?? 1}`
    : String(config.scale ?? 1);
  return `${config.model ?? ''}:${scale}`;
}

function attachRobotVisual(
  robot: RobotRuntime,
  templates: Map<string, THREE.Group>,
): void {
  const template =
    templates.get(robot.config.model ?? '') ?? [...templates.values()][0];

  if (!template) {
    throw new Error(
      `No robot template available for model "${robot.config.model}"`,
    );
  }

  const visual = cloneRobotTemplate(template);
  // Match the floor-plan rotation: GLB models are usually Y-up; the scene is Z-up.
  visual.rotation.x = Math.PI / 2;
  applyRobotScale(visual, robot.config.scale);

  robot.root.add(visual);
  robot.visual = visual;
  robot.lastConfigVisualKey = visualKey(robot.config);
}

export function removeRobotVisual(robot: RobotRuntime): void {
  if (!robot.visual) return;

  robot.root.remove(robot.visual);
  disposeObject3D(robot.visual);
  robot.visual = undefined;
  robot.lastConfigVisualKey = undefined;
}

/** Owns optional robot model templates and visual attachments. */
export function useSceneRobotModel() {
  const {
    mapClient,
    sceneContextRef,
    robotsRef,
    robotTemplatesRef,
    modelUrlMap,
    robotsVersion,
  } = useSceneViewerRobotModelContext();

  const templatesVersion = useRobotTemplate({
    mapClient,
    modelUrlMap,
    robotTemplatesRef,
    sceneContextRef,
  });

  useEffect(() => {
    const templates = robotTemplatesRef.current;
    if (!templates) return;

    for (const robot of robotsRef.current.values()) {
      const nextVisualKey = visualKey(robot.config);
      if (robot.visual && robot.lastConfigVisualKey === nextVisualKey) continue;

      removeRobotVisual(robot);
      attachRobotVisual(robot, templates);
    }
  }, [robotTemplatesRef, robotsRef, robotsVersion, templatesVersion]);

  useEffect(() => {
    const robots = robotsRef.current;

    return () => {
      for (const robot of robots.values()) removeRobotVisual(robot);
      disposeObject3DCollection(robotTemplatesRef.current?.values() ?? []);
      robotTemplatesRef.current = null;
    };
  }, [robotTemplatesRef, robotsRef]);
}
