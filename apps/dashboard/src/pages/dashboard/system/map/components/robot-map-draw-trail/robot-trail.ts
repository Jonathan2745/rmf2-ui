import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import {
  type RobotRuntime,
  type RobotTrailRuntime,
  type RobotConfig,
} from '../robot-types';
import {
  ROBOT_TRAIL_LINE_WIDTH,
  ROBOT_TRAIL_SAMPLE_DISTANCE,
} from '../constants';
import {
  createLineGeometryFromPoints,
  getRobotColor,
  getRobotPathWorldPoints,
  toFlatPositions,
  withTrailOffset,
} from './trail-geometry';

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
  const activeGeometry = createLineGeometryFromPoints([
    withTrailOffset(startPosition),
    withTrailOffset(startPosition),
  ]);

  const plannedMaterial = new LineMaterial({
    color: color.getHex(),
    transparent: true,
    opacity: 0.25,
    depthWrite: false,
    depthTest: false,
    worldUnits: true,
    linewidth: ROBOT_TRAIL_LINE_WIDTH,
  });

  const activeMaterial = new LineMaterial({
    color: color.getHex(),
    transparent: true,
    opacity: 1,
    depthWrite: false,
    depthTest: false,
    worldUnits: true,
    linewidth: ROBOT_TRAIL_LINE_WIDTH,
  });

  const plannedLine = new Line2(plannedGeometry, plannedMaterial);
  const activeLine = new Line2(activeGeometry, activeMaterial);

  plannedLine.name = `planned-path:${config.id}`;
  activeLine.name = `active-trail:${config.id}`;

  plannedLine.renderOrder = 20;
  activeLine.renderOrder = 30;
  activeLine.frustumCulled = false;

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

export function disposeRobotTrail(trail: RobotTrailRuntime) {
  trail.plannedGeometry.dispose();
  trail.activeGeometry.dispose();
  trail.plannedMaterial.dispose();
  trail.activeMaterial.dispose();
}

export function resetRobotTrail(robot: RobotRuntime) {
  if (!robot.trail) return;

  const startPoint = withTrailOffset(robot.root.position);

  robot.trail.visitedPoints = [startPoint.clone()];
  robot.trail.lastSampledPoint.copy(startPoint);
  robot.trail.activeGeometry.setPositions(
    toFlatPositions([startPoint, startPoint]),
  );
  robot.trail.activeGeometry.computeBoundingSphere();
}

export function updateRobotTrail(robot: RobotRuntime, force = false) {
  if (!robot.trail) return;

  const currentPoint = withTrailOffset(robot.root.position);
  const distance = currentPoint.distanceTo(robot.trail.lastSampledPoint);

  if (!force && distance < ROBOT_TRAIL_SAMPLE_DISTANCE) return;

  robot.trail.visitedPoints.push(currentPoint.clone());
  robot.trail.lastSampledPoint.copy(currentPoint);

  robot.trail.activeGeometry.setPositions(
    toFlatPositions(robot.trail.visitedPoints),
  );
  robot.trail.activeGeometry.computeBoundingSphere();
}
