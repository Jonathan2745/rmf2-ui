// TODO (Jonathan): include useMapClient, once the backend routing is confirmed.
// need to include the client.getSceneAssets() and client.getAssetUrls()

import { AMR_URL, SCENE_URL } from '../constants';
import { MapClientOptions } from '@/clients/map';

type SceneAssetUrlResponse = {
  sceneUrl?: string;
  scene_url?: string;
  amrUrl?: string;
  amr_url?: string;
};

export type ResolvedSceneAssetUrls = {
  sceneUrl: string;
  amrUrl: string;
  usedFallback: boolean;
  fallbackReasons: string[];
};

const SCENE_ASSET_ENDPOINT = '/scene-assets';

function getMapBaseUrl() {
  return MapClientOptions.baseUrl?.replace(/\/$/, '') ?? '';
}

function toAbsoluteAssetUrl(url: string, baseUrl: string) {
  try {
    return new URL(url, `${baseUrl}/`).toString();
  } catch {
    return url;
  }
}

export async function fetchSceneAssetUrls(): Promise<SceneAssetUrlResponse> {
  const baseUrl = getMapBaseUrl();

  if (!baseUrl) {
    throw new Error('VITE_MAP_BASE is not configured.');
  }

  const response = await fetch(`${baseUrl}${SCENE_ASSET_ENDPOINT}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch scene asset URLs: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
}

export async function resolveSceneAssetUrls(): Promise<ResolvedSceneAssetUrls> {
  const baseUrl = getMapBaseUrl();
  const fallbackReasons: string[] = [];

  try {
    const assetUrls = await fetchSceneAssetUrls();

    const rawSceneUrl = assetUrls.sceneUrl ?? assetUrls.scene_url;
    const rawAmrUrl = assetUrls.amrUrl ?? assetUrls.amr_url;

    if (!rawSceneUrl) {
      fallbackReasons.push('Map server did not return a scene URL.');
    }

    if (!rawAmrUrl) {
      fallbackReasons.push('Map server did not return an AMR URL.');
    }

    const sceneUrl = rawSceneUrl
      ? toAbsoluteAssetUrl(rawSceneUrl, baseUrl)
      : SCENE_URL;

    const amrUrl = rawAmrUrl ? toAbsoluteAssetUrl(rawAmrUrl, baseUrl) : AMR_URL;

    return {
      sceneUrl,
      amrUrl,
      usedFallback: !rawSceneUrl || !rawAmrUrl,
      fallbackReasons,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to fetch scene asset URLs from map server.';

    return {
      sceneUrl: SCENE_URL,
      amrUrl: AMR_URL,
      usedFallback: true,
      fallbackReasons: [message],
    };
  }
}
