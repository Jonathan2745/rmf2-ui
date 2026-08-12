import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { toaster } from '@/components/ui/toaster';
import { ROBOT_POSITION_POLL_MS } from '@/pages/dashboard/system/map/components/constants';
import type {
  RobotDefinition,
  RobotPositionResponse,
  RobotWaypoint,
} from '@/pages/dashboard/system/map/components/robot-types';
import type { RobotConfig } from '@/pages/dashboard/system/map/components/robot-types';
import { FallbackMapClient } from './fallback-map';

const MAP_BASE_URL: string = import.meta.env.VITE_MAP_BASE ?? '';

// ── Error type ─────────────────────────────────────────────────────────────

export class MapClientError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly isNetwork: boolean = false,
  ) {
    super(message);
    this.name = 'MapClientError';
  }
}

// ── Shared types ───────────────────────────────────────────────────────────

export type RobotPath = {
  waypoints: RobotWaypoint[];
  /** Whether the path loops back to its first waypoint (closes the rendered polyline). */
  loop: boolean;
};

// ── Interface ──────────────────────────────────────────────────────────────

export interface IMapClient {
  getRobotList(): Promise<RobotDefinition[]>;
  /** Returns the URL to pass to Three.js GLTFLoader (binary route). */
  getSceneUrl(): string;
  getRobotPath(robotId: number): Promise<RobotPath>;
  /** Returns the URL to pass to Three.js GLTFLoader (binary route). */
  getModelUrl(robotModel: string): string;
  getRobotPosition(robotId: number): Promise<RobotPositionResponse | null>;
}

const fallbackMapClient: IMapClient = new FallbackMapClient();

// ── LiveMapClient ──────────────────────────────────────────────────────────

// Real /path/{robotId} response shape:
// { nodes: PathNode[], edges: PathEdge[], loop: boolean }.
// Ground-plane world coordinates (x, y, theta) — no z, unlike RobotWaypoint.
type PathNode = {
  id: string | number;
  x: number;
  y: number;
  theta?: number;
  label?: string;
};

// [fromId, toId]. Kept for response typing; path rendering relies on the
// backend's explicit `loop` boolean instead of inferring from edge topology.
type PathEdge = [string | number, string | number];

type PathResponse =
  | { path?: RobotWaypoint[]; loop?: boolean }
  | { nodes?: PathNode[]; edges?: PathEdge[]; loop?: boolean }
  | RobotWaypoint[];

class LiveMapClient implements IMapClient {
  private readonly _baseUrl: string;
  private _serverReachable = true;

  constructor() {
    this._baseUrl = MAP_BASE_URL.replace(/\/$/, '');
  }

  private async _get<T>(path: string, label: string): Promise<T> {
    let response: Response;

    try {
      response = await fetch(`${this._baseUrl}${path}`);
    } catch (err) {
      throw new MapClientError(
        `${label}: network error — ${err instanceof Error ? err.message : 'fetch failed'}`,
        undefined,
        true,
      );
    }

    if (!response.ok) {
      throw new MapClientError(
        `${label} failed: ${response.status} ${response.statusText}`,
        response.status,
      );
    }

    return response.json() as Promise<T>;
  }

  async getRobotList(): Promise<RobotDefinition[]> {
    try {
      const data = await this._get<
        RobotDefinition[] | { robots?: RobotDefinition[] }
      >('/robots', 'GET /robots');
      // Handle both bare-array and wrapped { robots: [...] } response shapes
      return Array.isArray(data) ? data : (data.robots ?? []);
    } catch {
      this._serverReachable = false;
      toaster.create({
        id: 'map-offline-fallback',
        title: 'Map server unreachable',
        description: 'Showing offline fallback scene and demo robot.',
        type: 'warning',
      });
      return fallbackMapClient.getRobotList();
    }
  }

  /** Returns the backend URL for the scene GLB. */
  getSceneUrl(): string {
    return this._serverReachable
      ? `${this._baseUrl}/scene`
      : fallbackMapClient.getSceneUrl();
  }

  async getRobotPath(robotId: number): Promise<RobotPath> {
    try {
      const data = await this._get<PathResponse>(
        `/path/${robotId}`,
        `GET /path/${robotId}`,
      );

      if (Array.isArray(data)) return { waypoints: data, loop: false };

      if ('nodes' in data && data.nodes) {
        // Real backend shape: { nodes: [{id,x,y,theta,label}], edges, loop }.
        // These are already ground-plane world coordinates (no z) — unlike
        // RobotWaypoint's z field, which callers should ignore for this data.
        const nodes = data.nodes;

        return {
          waypoints: nodes.map((node) => ({
            id: node.id,
            x: node.x,
            y: node.y,
            z: 0,
            label: node.label,
          })),
          loop: data.loop === true,
        };
      }
      return {
        waypoints: 'path' in data ? (data.path ?? []) : [],
        loop: data.loop === true,
      };
    } catch {
      return fallbackMapClient.getRobotPath(robotId);
    }
  }

  /** Returns the backend URL for a robot model GLB. */
  getModelUrl(robotModel: string): string {
    return this._serverReachable
      ? `${this._baseUrl}/models/${encodeURIComponent(robotModel)}`
      : fallbackMapClient.getModelUrl(robotModel);
  }

  async getRobotPosition(
    robotId: number,
  ): Promise<RobotPositionResponse | null> {
    if (!this._serverReachable)
      return fallbackMapClient.getRobotPosition(robotId);
    try {
      return await this._get<RobotPositionResponse>(
        `/position/${robotId}`,
        `GET /position/${robotId}`,
      );
    } catch {
      return null;
    }
  }
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useMapClient(): IMapClient {
  return useMemo(() => {
    if (!MAP_BASE_URL) return fallbackMapClient;
    return new LiveMapClient();
  }, []);
}

// ── useMapData ───────────────────────────────────────────────────────────────
// Colocated with the client: owns the react-query fetching/polling for robot
// list/path/position and derives render-ready RobotConfig[]. The Map page hands
// this data to SceneViewer.Root, which exposes it to the rendering components.

export type MapData = {
  mapClient: IMapClient;
  robotConfigs: RobotConfig[];
  modelUrlMap: Map<string, string>;
};

// Prop shape for any component that wants to accept map data (e.g.
// SceneViewerRootProps extends this alongside UseSceneViewerProps) — kept
// independent of scene-control/runtime props so map data stays a separate,
// parallel concern rather than bundled into the scene-viewer's own prop type.
export interface UseMapProps {
  mapData?: MapData;
}

export function useMapData(): MapData {
  const mapClient = useMapClient();

  const { data: robotList = [] } = useQuery<RobotDefinition[]>({
    queryKey: ['robots'],
    queryFn: () => mapClient.getRobotList(),
    staleTime: Infinity,
    retry: 1,
  });

  const uniqueModels = useMemo(
    () => Array.from(new Set(robotList.map((r) => r.model))),
    [robotList],
  );

  const modelUrlMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const model of uniqueModels)
      map.set(model, mapClient.getModelUrl(model));
    return map;
  }, [uniqueModels, mapClient]);

  // `combine` gives referentially-stable results (via structural sharing)
  // when the underlying data hasn't actually changed — without it, useQueries
  // returns a fresh array every render regardless of whether any query's
  // data changed, which cascades into robotConfigs recomputing constantly.
  const pathByRobot = useQueries({
    queries: robotList.map((robot) => ({
      queryKey: ['path', robot.id],
      queryFn: () => mapClient.getRobotPath(robot.id),
      staleTime: Infinity,
      retry: 1,
    })),
    combine: (results) => results.map((r) => r.data),
  });

  const positionByRobot = useQueries({
    queries: robotList.map((robot) => ({
      queryKey: ['position', robot.id],
      queryFn: () => mapClient.getRobotPosition(robot.id),
      refetchInterval: ROBOT_POSITION_POLL_MS,
      staleTime: 0,
      gcTime: 0,
      retry: 0,
    })),
    combine: (results) => results.map((r) => r.data ?? null),
  });

  const robotConfigs = useMemo<RobotConfig[]>(
    () =>
      robotList.map((robot, i) => {
        const pos = positionByRobot[i];
        const path = pathByRobot[i];

        return {
          id: String(robot.id),
          name: robot.name,
          model: robot.model,
          position: pos ? { x: pos.x, y: pos.y } : undefined,
          rotationZ: pos?.theta,
          path: path?.waypoints,
          loop: path?.loop,
          enabled: true,
          backendState: pos?.state,
        };
      }),
    [robotList, positionByRobot, pathByRobot],
  );

  return useMemo(
    () => ({ mapClient, robotConfigs, modelUrlMap }),
    [mapClient, robotConfigs, modelUrlMap],
  );
}
