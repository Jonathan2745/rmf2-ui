import { useMemo } from 'react';
import { MapAPI } from '@rmf2-ui/client';
import {
  AMR_URL,
  SCENE_URL,
} from '@/pages/dashboard/system/map/components/constants';

export const MapClientOptions: MapAPI.ClientOptions = {
  baseUrl: import.meta.env.VITE_MAP_BASE,
};

export type ResolvedSceneAssetUrls = {
  sceneUrl: string;
  amrUrl: string;
  usedFallback: boolean;
  fallbackReasons: string[];
};

const CDN_FALLBACK: ResolvedSceneAssetUrls = {
  sceneUrl: SCENE_URL,
  amrUrl: AMR_URL,
  usedFallback: true,
  fallbackReasons: [],
};

export interface IMapClient {
  getRobots(): Promise<MapAPI.RobotsResponse>;
  getSceneAssets(): Promise<ResolvedSceneAssetUrls>;
}

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
  private _inner: MapAPI.Client;
  private _baseUrl: string;

  constructor() {
    this._inner = new MapAPI.Client(MapClientOptions);
    this._baseUrl = (MapClientOptions.baseUrl ?? '').replace(/\/$/, '');
  }

  // Fallback (Temp) for no backend
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
}

class FallbackMapClient implements IMapClient {
  async getRobots(): Promise<MapAPI.RobotsResponse> {
    return { robots: [], coordinateSystem: 'navigation' };
  }

  async getSceneAssets(): Promise<ResolvedSceneAssetUrls> {
    return CDN_FALLBACK;
  }
}

export function useMapClient(): IMapClient {
  return useMemo(() => {
    if (!MapClientOptions.baseUrl) return new FallbackMapClient();
    return new LiveMapClient();
  }, []);
}
