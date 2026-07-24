import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

import {
  DEFAULT_ROBOT_COLOR,
  ROBOT_TRAIL_LINE_WIDTH,
  ROBOT_TRAIL_Z_OFFSET,
} from './constants';
import type {
  RobotConfig,
  RobotPathCoordinateSystem,
  RobotRuntime,
  RobotTrailRuntime,
  WaypointCoords,
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
  return [
    config.color ?? DEFAULT_ROBOT_COLOR,
    config.pathCoordinateSystem ?? 'navigation',
    config.loop ? '1' : '0',
    pathKey(config.path),
  ].join('::');
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

export function disposeRobotTrail(trail: RobotTrailRuntime): void {
  trail.plannedGeometry.dispose();
  trail.currentEdgeGeometry.dispose();
  trail.plannedMaterial.dispose();
  trail.currentEdgeMaterial.dispose();
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
