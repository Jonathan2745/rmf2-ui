import type {
  RobotConfig,
  RobotDefinition,
  RobotPositionResponse,
  RobotWaypoint,
} from '../robot-types';

export function mergeRobotConfigs(
  robots: RobotDefinition[],
  positions: Map<number, RobotPositionResponse | null>,
  paths: Map<number, RobotWaypoint[]>,
): RobotConfig[] {
  return robots.map((robot) => {
    const pos = positions.get(robot.id);
    const path = paths.get(robot.id);

    return {
      id: String(robot.id),
      name: robot.name,
      model: robot.model,
      position: pos ? { x: pos.x, y: pos.y, z: 0 } : undefined,
      rotationZ: pos?.theta,
      path,
      loop: false,
      speed: 1,
      coordinateSystem: 'navigation' as const,
      enabled: true,
    };
  });
}
