import { useCallback, useEffect } from 'react';
import { chakra } from '@chakra-ui/react';
import type { HTMLChakraProps } from '@chakra-ui/react';

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ViewportGizmo } from 'three-viewport-gizmo';

import { useSceneViewerViewport3D } from './use-scene-viewer';
import { updateRobots } from './scene-viewer-robot-runtime';
import { DRACO_DECODER_PATH } from './constants';
import {
  tuneMaterials,
  disposeScene,
  computeCameraFrame,
  applyCameraFrame,
  computeSceneBounds,
  loadGltfAsync,
} from './three-utils';

// Added for THREE.Cache
THREE.Cache.enabled = true;

export type SceneViewerViewport3DProps = Omit<
  HTMLChakraProps<'div'>,
  'children'
>;

export function SceneViewerViewport3D(props: SceneViewerViewport3DProps) {
  const { ...rest } = props;

  const {
    mapClient,
    sceneUri,
    sceneContextRef,
    showRoofSlice,
    roofSliceHeight,
    robotsRef,
    setLoadStatus,
    setLoadMessage,
    setOrbitOrigin,
    setFloorZ,
  } = useSceneViewerViewport3D();

  const containerRef = useCallback((node: HTMLDivElement) => {
    if (sceneContextRef.current !== null) {
      if (!node) {
        // node is unmounted but refs are not cleanedup
        // CLEANUP
        const { scene, renderer } = sceneContextRef.current;

        renderer.setAnimationLoop(null);
        disposeScene(scene, renderer);
        sceneContextRef.current = null;
        return;
      }
      return;
    }

    if (!node) {
      return;
    }

    // Setup THREE scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    // Setup loading manager
    const loadingManager = new THREE.LoadingManager();

    loadingManager.onStart = (_url, loaded, total) => {
      setLoadStatus('loading');
      setLoadMessage({
        title: 'Loading 3D scene...',
        description: `(${loaded}/${total})`,
      });
    };

    loadingManager.onProgress = (_url, loaded, total) => {
      setLoadStatus('loading');
      setLoadMessage({
        title: `Loading 3D scene...`,
        description: `(${loaded}/${total})\n`,
      });
    };

    loadingManager.onLoad = () => {
      setLoadStatus('success');
      setLoadMessage({
        title: 'Loading 3D scene...',
        description: '100%',
      });
    };

    loadingManager.onError = () => {
      setLoadStatus('error');
      setLoadMessage({
        title: 'Failed to load one or more scene assets.',
      });
    };

    // Setup lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(10, 20, 10);
    scene.add(directionalLight);

    // Setup renderer
    const renderer = new THREE.WebGLRenderer({
      // antialias: true,
      logarithmicDepthBuffer: true,
      powerPreference: 'high-performance',
    });
    node.appendChild(renderer.domElement);

    // Setup Roof clip plane
    const roofClipPlane = new THREE.Plane(
      new THREE.Vector3(0, 0, -1),
      roofSliceHeight,
    );

    // Setup camera
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.up.set(0, 0, 1);
    camera.position.set(5, -5, 5);

    // Setup aspect ratio
    const resize = () => {
      const width = node.clientWidth;
      const height = node.clientHeight;

      if (width === 0 || height === 0) return;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
      gizmo.update();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(node);

    // Setup Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    controls.zoomSpeed = 2.5;
    controls.update();

    // Setup Gizmo
    const gizmo = new ViewportGizmo(camera, renderer, {
      container: node,
      placement: 'bottom-right',
      size: 100,
      offset: {
        right: 20,
        bottom: 20,
      },
    });
    gizmo.attachControls(controls);
    gizmo.update();

    const clock = new THREE.Clock();

    function animate() {
      const deltaSeconds = clock.getDelta();
      controls.update();
      updateRobots(robotsRef.current, deltaSeconds);
      renderer.render(scene, camera);
      gizmo.render();
    }

    // Start animation loop
    renderer.setAnimationLoop(animate);

    sceneContextRef.current = {
      scene,
      renderer,
      camera,
      controls,
      loadingManager,
      roofClipPlane,
    };

    return () => {
      // do nothing
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Loading scene — try the map server first, fall back to the CDN asset
  // (sceneUri) on failure, mirroring the robot template loader's fallback.
  useEffect(() => {
    if (!sceneContextRef.current) {
      return;
    }

    if (sceneUri === undefined) {
      return;
    }

    let cancelled = false;
    const manager = sceneContextRef.current.loadingManager;

    const dracoLoader = new DRACOLoader(manager);
    dracoLoader.setDecoderPath(DRACO_DECODER_PATH);

    const gltflLoader = new GLTFLoader(manager);
    gltflLoader.setDRACOLoader(dracoLoader);

    const mapServerUrl = mapClient?.getSceneUrl();

    async function load(): Promise<THREE.Group> {
      if (mapServerUrl && mapServerUrl !== sceneUri) {
        try {
          return await loadGltfAsync(gltflLoader, mapServerUrl);
        } catch {
          if (cancelled) throw new Error('cancelled');
        }
      }
      return loadGltfAsync(gltflLoader, sceneUri);
    }

    load()
      .then((sceneRoot) => {
        if (cancelled || !sceneContextRef.current) return;
        const { scene, camera, controls } = sceneContextRef.current;

        // GLTF is usually Y-up; rotate to Z-up world convention.
        sceneRoot.rotation.x = Math.PI / 2;
        tuneMaterials(sceneRoot);
        scene.add(sceneRoot);

        // adjust camera and set orbit origin
        const frame = computeCameraFrame(sceneRoot);
        applyCameraFrame(camera, controls, frame, frame.endPosition);
        setOrbitOrigin(frame);
        setFloorZ(computeSceneBounds(sceneRoot).floorZ);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error('Failed to load scene', error);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneUri, mapClient]);

  // roof slice control
  useEffect(() => {
    if (!sceneContextRef.current) {
      return;
    }

    const { renderer, roofClipPlane } = sceneContextRef.current;
    roofClipPlane.constant = roofSliceHeight;
    renderer.clippingPlanes = showRoofSlice ? [roofClipPlane] : [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roofSliceHeight, showRoofSlice]);

  return (
    <chakra.div
      ref={containerRef}
      w="full"
      h="full"
      zIndex={100}
      {...rest}
    ></chakra.div>
  );
}
