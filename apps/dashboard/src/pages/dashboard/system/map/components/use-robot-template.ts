import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import { AMR_URL, DRACO_DECODER_PATH } from './constants';
import {
  disposeObject3DCollection,
  loadGltfAsync,
  tuneMaterials,
} from './three-utils';
import type { UseSceneViewerReturn } from './use-scene-viewer';

async function loadRobotTemplate(
  loader: GLTFLoader,
  modelUrlMap: Map<string, string>,
  fallbackUrl: string,
): Promise<Map<string, THREE.Group>> {
  const templates = new Map<string, THREE.Group>();

  for (const [model, url] of modelUrlMap) {
    let template: THREE.Group;

    try {
      template = await loadGltfAsync(loader, url);
    } catch {
      template = await loadGltfAsync(loader, fallbackUrl);
    }

    tuneMaterials(template);
    templates.set(model, template);
  }

  return templates;
}

type UseRobotTemplatesArgs = Pick<
  UseSceneViewerReturn,
  'mapClient' | 'modelUrlMap' | 'robotTemplatesRef' | 'sceneContextRef'
>;

export function useRobotTemplate({
  mapClient,
  modelUrlMap,
  robotTemplatesRef,
  sceneContextRef,
}: UseRobotTemplatesArgs): number {
  const [templatesVersion, setTemplatesVersion] = useState(0);

  useEffect(() => {
    if (!mapClient) return;
    if (modelUrlMap.size === 0) return;
    if (!sceneContextRef.current) return;

    let cancelled = false;
    const { loadingManager } = sceneContextRef.current;

    const dracoLoader = new DRACOLoader(loadingManager);
    dracoLoader.setDecoderPath(DRACO_DECODER_PATH);

    const robotLoader = new GLTFLoader(loadingManager);
    robotLoader.setDRACOLoader(dracoLoader);

    loadRobotTemplate(robotLoader, modelUrlMap, AMR_URL)
      .then((templates) => {
        if (cancelled) {
          // Loading cannot necessarily be aborted, so dispose late results.
          disposeObject3DCollection(templates.values());
          return;
        }

        const previousTemplates = robotTemplatesRef.current;

        if (previousTemplates) {
          disposeObject3DCollection(previousTemplates.values());
        }

        robotTemplatesRef.current = templates;
        setTemplatesVersion((version) => version + 1);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          console.error('Failed to load robot templates', error);
        }
      })
      .finally(() => {
        dracoLoader.dispose();
      });

    return () => {
      cancelled = true;
    };
  }, [mapClient, modelUrlMap, robotTemplatesRef, sceneContextRef]);

  return templatesVersion;
}
