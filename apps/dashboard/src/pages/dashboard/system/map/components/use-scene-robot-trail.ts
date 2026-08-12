import { createContext, useContext, useEffect } from 'react';
import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

import {
  DEFAULT_ROBOT_COLOR,
  ROBOT_TRAIL_LINE_WIDTH,
  ROBOT_TRAIL_Z_OFFSET,
} from './constants';
import { getRobotColor, getRobotPathWorldPoints } from './robot-utils';
import type {
  RobotConfig,
  RobotRuntime,
  RobotTrailRuntime,
} from './robot-types';
import type { UseSceneViewerReturn } from './use-scene-viewer';

export type SceneViewerRobotTrailContextValue = Pick<
  UseSceneViewerReturn,
  'sceneContextRef' | 'robotsRef' | 'robotConfigs' | 'showPathLines'
> & {
  robotsVersion: number;
};

export const SceneViewerRobotTrailContext = createContext<
  SceneViewerRobotTrailContextValue | undefined
>(undefined);

function useSceneViewerRobotTrailContext(): SceneViewerRobotTrailContextValue {
  const context = useContext(SceneViewerRobotTrailContext);

  if (!context) {
    throw new Error(
      'useSceneRobotTrail must be used inside SceneViewer.RobotRoot',
    );
  }

  return context;
}

function pathKey(path: RobotConfig['path']): string {
  if (!path?.length) return '';
  return path
    .map(
      (waypoint) =>
        `${waypoint.id}:${waypoint.label ?? ''}:${waypoint.x}:${waypoint.y}:${waypoint.z}`,
    )
    .join('|');
}

export function robotTrailKey(config: RobotConfig): string {
  const {
    color = DEFAULT_ROBOT_COLOR,
    pathCoordinateSystem = 'navigation',
    loop = false,
    path,
  } = config;

  return [color, pathCoordinateSystem, loop ? '1' : '0', pathKey(path)].join(
    '::',
  );
}

function withTrailOffset(point: THREE.Vector3): THREE.Vector3 {
  return point.clone().add(new THREE.Vector3(0, 0, ROBOT_TRAIL_Z_OFFSET));
}

function toFlatPositions(points: THREE.Vector3[]): number[] {
  return points.flatMap((point) => [point.x, point.y, point.z]);
}

function createLineGeometryFromPoints(points: THREE.Vector3[]): LineGeometry {
  const geometry = new LineGeometry();
  const geometryPoints =
    points.length === 0
      ? []
      : points.length === 1
        ? [points[0], points[0]]
        : points;

  if (geometryPoints.length >= 2) {
    geometry.setPositions(toFlatPositions(geometryPoints));
  }
  return geometry;
}

function createTrailMaterial(
  color: THREE.Color,
  opacity: number,
): LineMaterial {
  return new LineMaterial({
    color: color.getHex(),
    transparent: true,
    opacity,
    depthWrite: false,
    depthTest: true,
    worldUnits: true,
    linewidth: ROBOT_TRAIL_LINE_WIDTH,
  });
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

export function createRobotTrail(
  config: RobotConfig,
  startPosition: THREE.Vector3,
): RobotTrailRuntime {
  const color = getRobotColor(config);
  const group = new THREE.Group();
  group.name = `trail:${config.id}`;

  const plannedPoints = getRobotPathWorldPoints(config);
  const plannedGeometry = createLineGeometryFromPoints(plannedPoints);
  const currentEdgeGeometry = createLineGeometryFromPoints([]);

  const plannedMaterial = createTrailMaterial(color, 0.25);
  const currentEdgeMaterial = createTrailMaterial(color, 1);

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

export function disposeRobotTrail(trail: RobotTrailRuntime): void {
  trail.plannedGeometry.dispose();
  trail.currentEdgeGeometry.dispose();
  trail.plannedMaterial.dispose();
  trail.currentEdgeMaterial.dispose();
}

export function removeRobotTrail(
  robot: RobotRuntime,
  scene: THREE.Scene,
): void {
  if (!robot.trail) return;

  scene.remove(robot.trail.group);
  disposeRobotTrail(robot.trail);
  robot.trail = undefined;
  robot.lastConfigTrailKey = undefined;
}

export function updateCurrentEdgeHighlight(
  robot: RobotRuntime,
  force = false,
): void {
  if (!robot.trail) return;
  updateCurrentEdgeLine(
    robot.trail,
    withTrailOffset(robot.root.position),
    force,
  );
}

/** Owns trail creation, updates, visibility, and cleanup. */
export function useSceneRobotTrail() {
  const {
    robotConfigs,
    robotsRef,
    robotsVersion,
    sceneContextRef,
    showPathLines,
  } = useSceneViewerRobotTrailContext();

  useEffect(() => {
    const scene = sceneContextRef.current?.scene;
    if (!scene) return;

    const configsById = new Map(
      robotConfigs.map((config) => [config.id, config]),
    );

    for (const robot of robotsRef.current.values()) {
      const config = configsById.get(robot.id);

      if (!config) {
        removeRobotTrail(robot, scene);
        continue;
      }

      const nextTrailKey = robotTrailKey(config);
      if (nextTrailKey !== robot.lastConfigTrailKey) {
        removeRobotTrail(robot, scene);
        robot.trail = createRobotTrail(config, robot.root.position);
        robot.lastConfigTrailKey = nextTrailKey;
        scene.add(robot.trail.group);
      }

      if (robot.trail) robot.trail.group.visible = showPathLines;
    }
  }, [robotConfigs, robotsRef, robotsVersion, sceneContextRef, showPathLines]);

  useEffect(() => {
    const scene = sceneContextRef.current?.scene;
    const robots = robotsRef.current;

    return () => {
      if (!scene) return;
      for (const robot of robots.values()) removeRobotTrail(robot, scene);
    };
  }, [robotsRef, sceneContextRef]);
}
