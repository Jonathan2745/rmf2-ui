import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import {
  type RobotRuntime,
  type RobotTrailRuntime,
  type RobotConfig,
} from '../robot-types';
import { ROBOT_TRAIL_LINE_WIDTH } from '../constants';
import {
  createLineGeometryFromPoints,
  getRobotColor,
  getRobotPathWorldPoints,
  toFlatPositions,
  withTrailOffset,
} from './trail-geometry';

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
) {
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
  floorZ: number,
  startPosition: THREE.Vector3,
): RobotTrailRuntime {
  const color = getRobotColor(config);
  const group = new THREE.Group();
  group.name = `trail:${config.id}`;

  const plannedPoints = getRobotPathWorldPoints(config, floorZ);

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

export function disposeRobotTrail(trail: RobotTrailRuntime) {
  trail.plannedGeometry.dispose();
  trail.currentEdgeGeometry.dispose();
  trail.plannedMaterial.dispose();
  trail.currentEdgeMaterial.dispose();
}

export function resetCurrentEdgeHighlight(robot: RobotRuntime) {
  if (!robot.trail) return;
  updateCurrentEdgeLine(
    robot.trail,
    withTrailOffset(robot.root.position),
    true,
  );
}

export function updateCurrentEdgeHighlight(robot: RobotRuntime, force = false) {
  if (!robot.trail) return;
  updateCurrentEdgeLine(
    robot.trail,
    withTrailOffset(robot.root.position),
    force,
  );
}
