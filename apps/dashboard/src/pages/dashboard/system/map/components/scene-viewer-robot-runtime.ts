import { updateCurrentEdgeHighlight } from './use-scene-robot-trail';
import type { RobotRuntime } from './robot-types';

function shortestAngleDelta(from: number, to: number): number {
  let delta = to - from;
  if (delta > Math.PI) delta -= 2 * Math.PI;
  if (delta < -Math.PI) delta += 2 * Math.PI;
  return delta;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Advances every active robot from the Viewport3D animation loop. */
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
