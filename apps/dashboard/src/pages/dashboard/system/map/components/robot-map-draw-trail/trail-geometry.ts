import * as THREE from 'three';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { type RobotConfig } from '../robot-types';
import { DEFAULT_ROBOT_COLOR, ROBOT_TRAIL_Z_OFFSET } from '../constants';
import { configCoordsToWorld } from '../robot-map-coordinates/coordinate-system';

export function withTrailOffset(point: THREE.Vector3) {
  return point.clone().add(new THREE.Vector3(0, 0, ROBOT_TRAIL_Z_OFFSET));
}

export function toFlatPositions(points: THREE.Vector3[]): number[] {
  return points.flatMap((p) => [p.x, p.y, p.z]);
}

export function createLineGeometryFromPoints(
  points: THREE.Vector3[],
): LineGeometry {
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

export function getRobotPathWorldPoints(
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

export function getRobotColor(config: RobotConfig) {
  try {
    return new THREE.Color(config.color ?? DEFAULT_ROBOT_COLOR);
  } catch {
    return new THREE.Color(DEFAULT_ROBOT_COLOR);
  }
}
