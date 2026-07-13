import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { MapAPI } from '@rmf2-ui/client';
import { toaster } from '@/components/ui/toaster';
import {
  AMR_URL,
  DEFAULT_ORGANISATION,
  SCENE_URL,
} from '@/pages/dashboard/system/map/components/constants';
import type {
  MapGraph,
  RobotDefinition,
  RobotPositionResponse,
  RobotWaypoint,
} from '@/pages/dashboard/system/map/components/robot-types';
import { ROBOT_POSITION_POLL_MS } from '@/pages/dashboard/system/map/components/constants';
import type { RobotConfig } from '@/pages/dashboard/system/map/components/robot-types';

export const MapClientOptions: MapAPI.ClientOptions = {
  baseUrl: import.meta.env.VITE_MAP_BASE,
};

// Exported so the Three.js GLTFLoader can set the same header for binary routes
export const MAP_API_KEY: string = import.meta.env.VITE_MAP_API_KEY ?? '';

// ── Offline fallback data ───────────────────────────────────────────────────

const FALLBACK_ROBOT_LIST: RobotDefinition[] = [
  { id: 1, name: 'AMR Demo', model: 'amr' },
];

async function fetchFallbackPath(): Promise<RobotWaypoint[]> {
  try {
    const res = await fetch('/navigation-path.json');
    if (!res.ok) return [];
    const data = (await res.json()) as { path?: RobotWaypoint[] };
    return data.path ?? [];
  } catch {
    return [];
  }
}

// ── Error type ─────────────────────────────────────────────────────────────

export class MapClientError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly isAuth: boolean = false,
    public readonly isNetwork: boolean = false,
  ) {
    super(message);
    this.name = 'MapClientError';
  }
}

// ── Shared types ───────────────────────────────────────────────────────────

export type ResolvedSceneAssetUrls = {
  sceneUrl: string;
  amrUrl: string;
  usedFallback: boolean;
  fallbackReasons: string[];
};

export type RobotPath = {
  waypoints: RobotWaypoint[];
  /** Whether the path loops back to its first waypoint (closes the rendered polyline). */
  loop: boolean;
};

const CDN_FALLBACK: ResolvedSceneAssetUrls = {
  sceneUrl: SCENE_URL,
  amrUrl: AMR_URL,
  usedFallback: true,
  fallbackReasons: [],
};

// ── Interface ──────────────────────────────────────────────────────────────

export interface IMapClient {
  // Legacy (used by LIF editor and other existing features)
  getRobots(): Promise<MapAPI.RobotsResponse>;
  getSceneAssets(): Promise<ResolvedSceneAssetUrls>;

  // New routes — org is inferred server-side from the Bearer token
  getOrganisation(): Promise<string>;
  getRobotList(): Promise<RobotDefinition[]>;
  /** Returns the URL to pass to Three.js GLTFLoader (binary route). */
  getSceneUrl(): string;
  getMap(): Promise<MapGraph>;
  getRobotPath(robotId: number): Promise<RobotPath>;
  /** Returns the URL to pass to Three.js GLTFLoader (binary route). */
  getModelUrl(robotModel: string): string;
  getRobotPosition(robotId: number): Promise<RobotPositionResponse | null>;
  /**
   * Headers to attach to Three.js loader requests for binary routes.
   * GLTFLoader/DRACOLoader issue their own requests outside this client's
   * fetch wrapper, so callers must apply these via loader.setRequestHeader().
   */
  getRequestHeaders(): Record<string, string>;
}

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

type SceneAssetUrlResponse = {
  sceneUrl?: string;
  scene_url?: string;
  amrUrl?: string;
  amr_url?: string;
};

function toAbsoluteAssetUrl(url: string, baseUrl: string): string {
  try {
    return new URL(url, `${baseUrl}/`).toString();
  } catch {
    return url;
  }
}

class LiveMapClient implements IMapClient {
  private readonly _inner: MapAPI.Client;
  private readonly _baseUrl: string;
  private readonly _authHeaders: HeadersInit;
  private _serverReachable = true;

  constructor() {
    this._inner = new MapAPI.Client(MapClientOptions);
    this._baseUrl = (MapClientOptions.baseUrl ?? '').replace(/\/$/, '');
    this._authHeaders = {
      Authorization: MAP_API_KEY ? `Bearer ${MAP_API_KEY}` : '',
      Accept: 'application/json',
    };
  }

  private async _get<T>(path: string, label: string): Promise<T> {
    let response: Response;

    try {
      response = await fetch(`${this._baseUrl}${path}`, {
        headers: this._authHeaders,
      });
    } catch (err) {
      throw new MapClientError(
        `${label}: network error — ${err instanceof Error ? err.message : 'fetch failed'}`,
        undefined,
        false,
        true,
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw new MapClientError(
        `${label}: unauthorized (${response.status})`,
        response.status,
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

  // ── Legacy ─────────────────────────────────────────────────────────────

  async getRobots(): Promise<MapAPI.RobotsResponse> {
    try {
      return await this._inner.getRobots();
    } catch {
      return { robots: [], coordinateSystem: 'navigation' };
    }
  }

  async getSceneAssets(): Promise<ResolvedSceneAssetUrls> {
    try {
      const response = await fetch(`${this._baseUrl}/scene-assets`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch scene asset URLs: ${response.status} ${response.statusText}`,
        );
      }

      const assetUrls: SceneAssetUrlResponse = await response.json();
      const fallbackReasons: string[] = [];

      const rawSceneUrl = assetUrls.sceneUrl ?? assetUrls.scene_url;
      const rawAmrUrl = assetUrls.amrUrl ?? assetUrls.amr_url;

      if (!rawSceneUrl)
        fallbackReasons.push('Map server did not return a scene URL.');
      if (!rawAmrUrl)
        fallbackReasons.push('Map server did not return an AMR URL.');

      return {
        sceneUrl: rawSceneUrl
          ? toAbsoluteAssetUrl(rawSceneUrl, this._baseUrl)
          : SCENE_URL,
        amrUrl: rawAmrUrl
          ? toAbsoluteAssetUrl(rawAmrUrl, this._baseUrl)
          : AMR_URL,
        usedFallback: !rawSceneUrl || !rawAmrUrl,
        fallbackReasons,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to fetch scene asset URLs from map server.';

      return { ...CDN_FALLBACK, fallbackReasons: [message] };
    }
  }

  // ── New routes ──────────────────────────────────────────────────────────

  async getOrganisation(): Promise<string> {
    const data = await this._get<unknown>('/organisation', 'GET /organisation');
    return typeof data === 'string'
      ? data
      : String(
          (data as { organisation?: string }).organisation ??
            DEFAULT_ORGANISATION,
        );
  }

  async getRobotList(): Promise<RobotDefinition[]> {
    try {
      const data = await this._get<
        RobotDefinition[] | { robots?: RobotDefinition[] }
      >('/robots', 'GET /robots');
      // Handle both bare-array and wrapped { robots: [...] } response shapes
      return Array.isArray(data) ? data : (data.robots ?? []);
    } catch (err) {
      if (err instanceof MapClientError && err.isAuth) throw err;
      this._serverReachable = false;
      toaster.create({
        id: 'map-offline-fallback',
        title: 'Map server unreachable',
        description: 'Showing offline fallback scene and demo robot.',
        type: 'warning',
      });
      return FALLBACK_ROBOT_LIST;
    }
  }

  /**
   * Returns the backend URL for the scene GLB. Three.js loader fetches it
   * directly using the auth header set via loader.setRequestHeader.
   */
  getSceneUrl(): string {
    return `${this._baseUrl}/scene`;
  }

  async getMap(): Promise<MapGraph> {
    try {
      return await this._get<MapGraph>('/map', 'GET /map');
    } catch (err) {
      if (err instanceof MapClientError && err.isAuth) throw err;
      return { nodes: [], edges: [] };
    }
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
    } catch (err) {
      if (err instanceof MapClientError && err.isAuth) throw err;
      return { waypoints: await fetchFallbackPath(), loop: false };
    }
  }

  /**
   * Returns the backend URL for a robot model GLB. Three.js loader fetches it
   * directly using the auth header set via loader.setRequestHeader.
   */
  getModelUrl(robotModel: string): string {
    return `${this._baseUrl}/models/${encodeURIComponent(robotModel)}`;
  }

  async getRobotPosition(
    robotId: number,
  ): Promise<RobotPositionResponse | null> {
    if (!this._serverReachable) return null;
    try {
      return await this._get<RobotPositionResponse>(
        `/position/${robotId}`,
        `GET /position/${robotId}`,
      );
    } catch (err) {
      if (err instanceof MapClientError && err.isAuth) throw err;
      return null;
    }
  }

  getRequestHeaders(): Record<string, string> {
    return { Authorization: MAP_API_KEY ? `Bearer ${MAP_API_KEY}` : '' };
  }
}

// ── FallbackMapClient ──────────────────────────────────────────────────────

class FallbackMapClient implements IMapClient {
  async getRobots(): Promise<MapAPI.RobotsResponse> {
    return { robots: [], coordinateSystem: 'navigation' };
  }

  async getSceneAssets(): Promise<ResolvedSceneAssetUrls> {
    return CDN_FALLBACK;
  }

  async getOrganisation(): Promise<string> {
    return DEFAULT_ORGANISATION;
  }

  async getRobotList(): Promise<RobotDefinition[]> {
    return FALLBACK_ROBOT_LIST;
  }

  getSceneUrl(): string {
    return SCENE_URL;
  }

  async getMap(): Promise<MapGraph> {
    return { nodes: [], edges: [] };
  }

  async getRobotPath(): Promise<RobotPath> {
    return { waypoints: await fetchFallbackPath(), loop: false };
  }

  getModelUrl(): string {
    return AMR_URL;
  }

  async getRobotPosition(): Promise<null> {
    return null;
  }

  getRequestHeaders(): Record<string, string> {
    return {};
  }
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useMapClient(): IMapClient {
  return useMemo(() => {
    if (!MapClientOptions.baseUrl) return new FallbackMapClient();
    return new LiveMapClient();
  }, []);
}

// ── useMapData ───────────────────────────────────────────────────────────────
// Colocated with the client: owns the react-query fetching/polling for robot
// list/path/position and derives render-ready RobotConfig[]. Callers (e.g.
// the Map page) just call this hook and hand the result to consumers — no
// context/provider needed, and no data-fetching concern leaks into the
// SceneViewer component tree, which only renders what it's given.

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
