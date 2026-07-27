import * as THREE from 'three';

import { DEFAULT_ROBOT_COLOR, ROBOT_TRAIL_Z_OFFSET } from './constants';
import type { RobotConfig, WaypointCoords } from './robot-types';

/**
 * Resolves a robot's world position from live telemetry, its first planned
 * waypoint, or a caller-provided floor fallback, in that order.
 */
export function getRobotPosition(
  config: RobotConfig,
  fallbackZ = 0,
): WaypointCoords {
  if (config.position) {
    return {
      x: config.position.x,
      y: config.position.y,
      z: config.path?.[0]?.z ?? fallbackZ,
    };
  }

  const startWaypoint = config.path?.[0];
  if (startWaypoint) {
    return { x: startWaypoint.x, y: startWaypoint.y, z: startWaypoint.z };
  }

  return { x: 0, y: 0, z: fallbackZ };
}

export function getRobotColor(config: RobotConfig): THREE.Color {
  try {
    return new THREE.Color(config.color ?? DEFAULT_ROBOT_COLOR);
  } catch {
    return new THREE.Color(DEFAULT_ROBOT_COLOR);
  }
}

export function getRobotPathWorldPoints(config: RobotConfig): THREE.Vector3[] {
  const points = (config.path ?? []).map(
    (waypoint) =>
      new THREE.Vector3(
        waypoint.x,
        waypoint.y,
        waypoint.z + ROBOT_TRAIL_Z_OFFSET,
      ),
  );

  if (config.loop && points.length >= 2) {
    points.push(points[0].clone());
  }

  return points;
}
