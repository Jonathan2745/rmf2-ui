import {
  AMR_URL,
  SCENE_URL,
} from '@/pages/dashboard/system/map/components/constants';
import type {
  RobotDefinition,
  RobotPositionResponse,
  RobotWaypoint,
} from '@/pages/dashboard/system/map/components/robot-types';
import type { IMapClient, RobotPath } from './map';

const FALLBACK_ROBOT_LIST: RobotDefinition[] = [
  { id: 1, name: 'AMR Demo', model: 'amr' },
];
const FALLBACK_ROBOT_SPEED_MPS = 1;

let fallbackPathPromise: Promise<RobotWaypoint[]> | undefined;
let fallbackMotionStartedAtMs: number | undefined;

function fetchFallbackPath(): Promise<RobotWaypoint[]> {
  fallbackPathPromise ??= (async () => {
    try {
      const response = await fetch('/navigation-path.json');
      if (!response.ok) return [];
      const data = (await response.json()) as { path?: RobotWaypoint[] };
      return data.path ?? [];
    } catch {
      return [];
    }
  })();

  return fallbackPathPromise;
}

function lerp(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}

/**
 * Samples the demo path as if it were live telemetry from the map backend.
 * The robot travels to the end and then reverses continuously.
 */
function sampleFallbackPath(
  robotId: number,
  waypoints: RobotWaypoint[],
  elapsedSeconds: number,
): RobotPositionResponse | null {
  const first = waypoints[0];
  if (!first) return null;
  if (waypoints.length === 1) {
    return {
      id: robotId,
      x: first.x,
      y: first.y,
      theta: 0,
      state: 'stopped',
    };
  }

  const segments = waypoints.slice(1).map((end, index) => {
    const start = waypoints[index];
    return {
      start,
      end,
      length: Math.hypot(end.x - start.x, end.y - start.y),
    };
  });
  const totalLength = segments.reduce(
    (length, segment) => length + segment.length,
    0,
  );

  if (totalLength === 0) {
    return {
      id: robotId,
      x: first.x,
      y: first.y,
      theta: 0,
      state: 'stopped',
    };
  }

  const cycleDistance =
    (elapsedSeconds * FALLBACK_ROBOT_SPEED_MPS) % (totalLength * 2);
  const reversing = cycleDistance > totalLength;
  const sampledDistance = reversing
    ? totalLength * 2 - cycleDistance
    : cycleDistance;

  let accumulatedDistance = 0;
  for (const segment of segments) {
    if (segment.length === 0) continue;
    const segmentEndDistance = accumulatedDistance + segment.length;
    if (sampledDistance <= segmentEndDistance) {
      const progress = (sampledDistance - accumulatedDistance) / segment.length;
      const direction = reversing ? -1 : 1;
      const dx = segment.end.x - segment.start.x;
      const dy = segment.end.y - segment.start.y;

      return {
        id: robotId,
        x: lerp(segment.start.x, segment.end.x, progress),
        y: lerp(segment.start.y, segment.end.y, progress),
        theta: Math.atan2(dy * direction, dx * direction),
        state: 'driving',
      };
    }
    accumulatedDistance = segmentEndDistance;
  }

  const last = waypoints[waypoints.length - 1];
  return {
    id: robotId,
    x: last.x,
    y: last.y,
    theta: 0,
    state: 'stopped',
  };
}

export class FallbackMapClient implements IMapClient {
  async getRobotList(): Promise<RobotDefinition[]> {
    return FALLBACK_ROBOT_LIST;
  }

  getSceneUrl(): string {
    return SCENE_URL;
  }

  async getRobotPath(): Promise<RobotPath> {
    return { waypoints: await fetchFallbackPath(), loop: false };
  }

  getModelUrl(): string {
    return AMR_URL;
  }

  async getRobotPosition(
    robotId: number,
  ): Promise<RobotPositionResponse | null> {
    const waypoints = await fetchFallbackPath();
    fallbackMotionStartedAtMs ??= Date.now();
    return sampleFallbackPath(
      robotId,
      waypoints,
      (Date.now() - fallbackMotionStartedAtMs) / 1000,
    );
  }
}
