// Custom components
import { DropPointMarker } from './drop-point-marker';
import { DropPointPanel } from './components/ui/drop-point-panel';
import { RobotStatusPanel } from './components/ui/robot-status-panel';

// React imports
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';

// Icon imports
import { LuLocateFixed } from 'react-icons/lu';

// Three.js imports
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { ViewportGizmo } from 'three-viewport-gizmo';

// Types
import type {
  DropPointCoords,
  LoadState,
  MapGraph,
  RobotDefinition,
  RobotPositionResponse,
  RobotRuntime,
  RobotStatus,
  RobotWaypoint,
  SceneDebugInfo,
  SceneViewerApi,
  StaticCollisionBox,
} from './components/robot-types';

// Constants
import {
  AMR_URL,
  DRACO_DECODER_PATH,
  INITIAL_ROOF_SLICE_HEIGHT,
  INITIAL_SHOW_ROOF_SLICE,
  ROBOT_ARRIVAL_EPSILON,
  SCENE_URL,
} from './components/constants';

// API
import { mergeRobotConfigs } from './components/robot-map-config/robot-config-merge';
import { useMapClient, MAP_API_KEY, MapClientError } from '@/clients/map';
import { toaster } from '@/components/ui/toaster';

// Robot helpers
import { getActiveRobotTarget } from './components/robot-map-coordinates/waypoint-utils';
import { stepDirectlyTowardWaypoint } from './components/robot-map-motion/direct-waypoint-motion';
import {
  modelHeadingToMovementHeading,
  movementHeadingToModelHeading,
} from './components/robot-map-motion/robot-heading';
import { toRobotStatus } from './components/robot-map-runtime/robot-status';
import { tuneMaterials } from './components/robot-map-runtime/robot-runtime-utils';
import {
  removeRobot,
  syncRobotsFromConfig,
} from './components/robot-map-runtime/robot-sync';
import { updateRobotTrail } from './components/robot-map-draw-trail/robot-trail';

// Scene helpers
import { loadGltfAsync } from './components/robot-map-scene/gltf-loader';
import {
  computeSceneBounds,
  toSceneDebugInfo,
} from './components/robot-map-scene/scene-bounds';
import {
  animateIntroCamera,
  computeCameraFrame,
  frameCamera,
} from './components/robot-map-scene/scene-camera';
import {
  collectStaticCollisionBoxes,
  findRobotCollision,
} from './components/robot-map-scene/scene-collision';
import { disposeObject3D } from './components/robot-map-scene/scene-dispose';
import { createGridAxesHelpers } from './components/robot-map-scene/scene-grid-axis';

import {
  SceneViewer,
  type SceneViewerBottomPanelItem,
  type SceneViewerRoofSliceControl,
  type SceneViewerToggleControl,
} from './components/scene-viewer';

const ROBOT_POSITION_POLL_MS = 500;

export function Map() {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const resetOrbitRef = useRef<(() => void) | null>(null);
  const resetRobotsRef = useRef<(() => void) | null>(null);
  const sceneApiRef = useRef<SceneViewerApi | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const robotsRef = useRef<Map<string, RobotRuntime>>(new globalThis.Map());
  const robotTemplateRef = useRef<Map<string, THREE.Group> | null>(null);
  const floorZRef = useRef(0);
  const publishRobotStatusesRef = useRef<((force?: boolean) => void) | null>(
    null,
  );
  const showDropPointRef = useRef(false);
  const showPathLineRef = useRef(true);
  const dropPointRef = useRef<DropPointCoords>({
    x: 0,
    y: 0,
    z: 0,
  });

  // State
  const [robotConfigReady, setRobotConfigReady] = useState(false);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showGridAxes, setShowGridAxes] = useState(false);
  const [showDropPoint, setShowDropPoint] = useState(false);
  const [showPathLine, setShowPathLine] = useState(true);
  const [showRoofSlice, setShowRoofSlice] = useState(INITIAL_SHOW_ROOF_SLICE);
  const [roofSliceHeight, setRoofSliceHeight] = useState(
    INITIAL_ROOF_SLICE_HEIGHT,
  );
  const [dropPoint, setDropPoint] = useState<DropPointCoords>({
    x: 0,
    y: 0,
    z: 0,
  });
  const [sceneDebug, setSceneDebug] = useState<SceneDebugInfo | null>(null);
  const [robotStatuses, setRobotStatuses] = useState<RobotStatus[]>([]);
  const [loadingMessage, setLoadingMessage] = useState('Preparing scene...');
  const [loadingProgress, setLoadingProgress] = useState<number | null>(null);
  showDropPointRef.current = showDropPoint; // potentially can abstract out
  showPathLineRef.current = showPathLine;
  dropPointRef.current = dropPoint;

  const mapClient = useMapClient();

  // Kept current so the Three.js effect can read it without re-triggering
  const modelUrlMapRef = useRef<Map<string, string>>(new globalThis.Map());

  // ── Queries ────────────────────────────────────────────────────────────────

  // Scene and model URLs are returned synchronously — no fetch needed at query time.
  // Three.js loader fetches the binary with the auth header set on the loader itself.
  const sceneUrl = useMemo(() => mapClient.getSceneUrl(), [mapClient]);

  const {
    data: robotList = [],
    isError: isRobotListError,
    error: robotListError,
  } = useQuery<RobotDefinition[]>({
    queryKey: ['robots'],
    queryFn: () => mapClient.getRobotList(),
    staleTime: Infinity,
    retry: 1,
  });

  // Map graph — fetched once, not used for rendering yet
  useQuery<MapGraph>({
    queryKey: ['map'],
    queryFn: () => mapClient.getMap(),
    staleTime: Infinity,
    retry: 1,
  });

  const uniqueModels = useMemo(
    () => [...new Set(robotList.map((r) => r.model))],
    [robotList],
  );

  const modelUrlMap = useMemo(() => {
    const map = new globalThis.Map<string, string>();
    for (const model of uniqueModels) {
      map.set(model, mapClient.getModelUrl(model));
    }
    return map;
  }, [uniqueModels, mapClient]);
  modelUrlMapRef.current = modelUrlMap;

  const pathResults = useQueries({
    queries: robotList.map((robot) => ({
      queryKey: ['path', robot.id],
      queryFn: () => mapClient.getRobotPath(robot.id),
      staleTime: Infinity,
      retry: 1,
    })),
  });

  const pathMap = useMemo(() => {
    const map = new globalThis.Map<number, RobotWaypoint[]>();
    robotList.forEach((robot, i) => {
      const path = pathResults[i]?.data;
      if (path) map.set(robot.id, path);
    });
    return map;
  }, [robotList, pathResults]);

  const positionResults = useQueries({
    queries: robotList.map((robot) => ({
      queryKey: ['position', robot.id],
      queryFn: () => mapClient.getRobotPosition(robot.id),
      refetchInterval: ROBOT_POSITION_POLL_MS,
      staleTime: 0,
      gcTime: 0,
      enabled: robotConfigReady,
      retry: 0,
    })),
  });

  const positionMap = useMemo(() => {
    const map = new globalThis.Map<number, RobotPositionResponse | null>();
    robotList.forEach((robot, i) => {
      map.set(robot.id, positionResults[i]?.data ?? null);
    });
    return map;
  }, [robotList, positionResults]);

  const robotConfigs = useMemo(
    () => mergeRobotConfigs(robotList, positionMap, pathMap),
    [robotList, positionMap, pathMap],
  );

  // ── Error toasts (auth only — network errors fall back silently) ───────────

  useEffect(() => {
    if (!isRobotListError || !robotListError) return;
    toaster.create({
      id: 'map-auth-error',
      title: 'Authentication failed',
      description:
        'The map server rejected the API key. Check VITE_MAP_API_KEY.',
      type: 'error',
    });
  }, [isRobotListError, robotListError]);

  useEffect(() => {
    const authFailure = positionResults.find(
      (r) => r.isError && r.error instanceof MapClientError && r.error.isAuth,
    );
    if (!authFailure) return;
    toaster.create({
      id: 'map-position-auth-error',
      title: 'Position update rejected',
      description:
        'The map server rejected the API key while polling robot positions.',
      type: 'error',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionResults.map((r) => r.isError).join(',')]);

  const isAssetUrlLoading = false;

  const bottomPanelItems: SceneViewerBottomPanelItem[] = [
    {
      type: 'icon-button',
      tooltip: 'Reset orbit origin',
      ariaLabel: 'Reset orbit origin',
      icon: <LuLocateFixed />,
      colorPalette: 'gray',
      disabled: loadState !== 'ready',
      onClick: () => resetOrbitRef.current?.(),
    },
    {
      type: 'button',
      tooltip: 'Reset all robots',
      label: 'Reset robots',
      colorPalette: 'blue',
      disabled: loadState !== 'ready' || robotStatuses.length === 0,
      onClick: () => resetRobotsRef.current?.(),
    },
    {
      type: 'shortcut-hint',
      shortcut: 'Shift',
      label: 'pan',
    },
  ];

  const sceneViewerToggles: SceneViewerToggleControl[] = [
    {
      id: 'grid-axes',
      label: 'Show grid / axes',
      checked: showGridAxes,
      onCheckedChange: setShowGridAxes,
      disabled: loadState !== 'ready',
    },
    {
      id: 'drop-point',
      label: 'Show drop point',
      checked: showDropPoint,
      onCheckedChange: setShowDropPoint,
      disabled: loadState !== 'ready',
    },
    {
      id: 'roof-slice',
      label: 'Slice roof',
      checked: showRoofSlice,
      onCheckedChange: setShowRoofSlice,
      disabled: loadState !== 'ready',
    },
    {
      id: 'robot-path',
      label: 'Show path lines',
      checked: showPathLine,
      onCheckedChange: setShowPathLine,
      disabled: loadState !== 'ready',
    },
  ];

  const roofSliceControl: SceneViewerRoofSliceControl = {
    label: 'Roof slice height',
    value: roofSliceHeight,
    onValueChange: setRoofSliceHeight,
    enabled: showRoofSlice,
    disabled: loadState !== 'ready',
    min: 0,
    max: 20,
    step: 0.1,
  };

  // Sync robot configs into Three.js runtime
  useEffect(() => {
    if (!robotConfigReady || robotConfigs.length === 0) return;

    const scene = sceneRef.current;
    const templates = robotTemplateRef.current;
    const publishRobotStatuses = publishRobotStatusesRef.current;

    if (!scene || !templates || !publishRobotStatuses) return;

    syncRobotsFromConfig({
      configs: robotConfigs,
      scene,
      robots: robotsRef.current,
      templates,
      floorZ: floorZRef.current,
      publishRobotStatuses,
    });

    if (!showPathLineRef.current) {
      sceneApiRef.current?.setPathLineVisible(false);
    }
  }, [robotConfigReady, robotConfigs]);

  useEffect(() => {
    sceneApiRef.current?.setPathLineVisible(showPathLine);
  }, [showPathLine, loadState]);

  // Sync control panel values with scene API
  useEffect(() => {
    sceneApiRef.current?.setShowGridAxes(showGridAxes);
  }, [showGridAxes, sceneDebug]);

  useEffect(() => {
    sceneApiRef.current?.setDropPointEnabled(showDropPoint);
  }, [showDropPoint, loadState]);

  useEffect(() => {
    sceneApiRef.current?.setDropPointPosition(dropPoint);
  }, [dropPoint, loadState]);

  useEffect(() => {
    sceneApiRef.current?.setRoofSliceEnabled(showRoofSlice);
  }, [showRoofSlice, loadState]);

  useEffect(() => {
    sceneApiRef.current?.setRoofSliceHeight(roofSliceHeight);
  }, [roofSliceHeight, loadState]);

  // Three.js scene setup
  useEffect(() => {
    if (!sceneUrl) return;

    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);

    const previousDefaultUp = THREE.Object3D.DEFAULT_UP.clone();
    THREE.Object3D.DEFAULT_UP.set(0, 0, 1);

    camera.up.set(0, 0, 1);
    camera.position.set(5, -5, 5);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      logarithmicDepthBuffer: true,
      powerPreference: 'high-performance',
    });

    const roofClipPlane = new THREE.Plane(
      new THREE.Vector3(0, 0, -1),
      INITIAL_ROOF_SLICE_HEIGHT,
    );

    renderer.clippingPlanes = INITIAL_SHOW_ROOF_SLICE ? [roofClipPlane] : [];
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    container.appendChild(renderer.domElement);

    const clock = new THREE.Clock();

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(10, 20, 10);
    scene.add(directionalLight);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    controls.zoomSpeed = 2.5;

    const gizmo = new ViewportGizmo(camera, renderer, {
      container: renderer.domElement.parentElement ?? container,
    });

    gizmo.attachControls(controls);

    const loadingManager = new THREE.LoadingManager();

    loadingManager.onStart = () => {
      setLoadingMessage('Loading 3D scene...');
      setLoadingProgress(0);
    };

    loadingManager.onProgress = (_url, loaded, total) => {
      if (total > 0) {
        setLoadingProgress(Math.round((loaded / total) * 100));
      }
    };

    loadingManager.onLoad = () => {
      setLoadingProgress(100);
    };

    loadingManager.onError = () => {
      setLoadingMessage('Failed to load one or more scene assets.');
    };

    const dracoLoader = new DRACOLoader(loadingManager);
    dracoLoader.setDecoderPath(DRACO_DECODER_PATH);

    const loader = new GLTFLoader(loadingManager);
    loader.setDRACOLoader(dracoLoader);
    if (MAP_API_KEY) {
      loader.setRequestHeader({ Authorization: `Bearer ${MAP_API_KEY}` });
    }

    let animationFrameId = 0;
    let disposed = false;

    let loadedScene: THREE.Group | null = null;
    let gridAxesHelpers: THREE.Group | null = null;
    let dropPointMarker: DropPointMarker | null = null;
    let robotTemplates: Map<string, THREE.Group> | null = null;

    let staticCollisionBoxes: StaticCollisionBox[] = [];
    let lastRobotStatusPublish = 0;
    let currentFloorZ = 0;

    const robots = robotsRef.current;

    const pickRaycaster = new THREE.Raycaster();
    const pickPointer = new THREE.Vector2();

    const publishRobotStatuses = (force = false) => {
      const now = performance.now();

      if (!force && now - lastRobotStatusPublish < 250) return;

      lastRobotStatusPublish = now;

      setRobotStatuses(
        Array.from(robots.values()).map((robot) =>
          toRobotStatus(robot, currentFloorZ),
        ),
      );
    };

    publishRobotStatusesRef.current = publishRobotStatuses;

    const updateRobots = (deltaSeconds: number, floorZ: number) => {
      for (const robot of robots.values()) {
        robot.blockedBy = undefined;
        robot.status = 'idle';

        if (robot.config.enabled === false) {
          robot.status = 'disabled';
          continue;
        }

        // Live position mode: smoothly interpolate toward the backend-reported
        // position rather than path-following. Uses exponential decay so the
        // robot covers ~95 % of the gap within one poll interval (500 ms).
        if (robot.lerpTarget) {
          const alpha = 1 - Math.exp(-10 * deltaSeconds);

          robot.root.position.lerp(robot.lerpTarget.position, alpha);

          // Shortest-path rotation lerp to avoid spinning the wrong way
          let rotDiff = robot.lerpTarget.rotationZ - robot.root.rotation.z;
          if (rotDiff > Math.PI) rotDiff -= 2 * Math.PI;
          if (rotDiff < -Math.PI) rotDiff += 2 * Math.PI;
          robot.root.rotation.z += rotDiff * alpha;

          robot.status = 'moving';
          updateRobotTrail(robot);
          continue;
        }

        const activeTarget = getActiveRobotTarget(robot, floorZ);
        if (!activeTarget) continue;

        const { target } = activeTarget;

        const previousPosition = robot.root.position.clone();
        const previousModelHeading = robot.root.rotation.z;
        const previousMovementHeading =
          modelHeadingToMovementHeading(previousModelHeading);

        const stepResult = stepDirectlyTowardWaypoint({
          current: previousPosition,
          target,
          speed: Math.max(robot.config.speed ?? 1, 0),
          deltaSeconds,
          arrivalEpsilon: ROBOT_ARRIVAL_EPSILON,
          previousHeading: previousMovementHeading,
        });

        robot.root.position.copy(stepResult.position);
        robot.root.rotation.z = movementHeadingToModelHeading(
          stepResult.heading,
        );

        robot.driveState = null;

        const blockedBy = findRobotCollision({
          robot,
          robots,
          staticCollisionBoxes,
        });

        if (blockedBy) {
          robot.root.position.copy(previousPosition);
          robot.root.rotation.z = previousModelHeading;
          robot.driveState = null;
          robot.blockedBy = blockedBy;
          robot.status = 'blocked';
          continue;
        }

        if (stepResult.arrived) {
          const pathLength = robot.config.path?.length ?? 0;

          if (pathLength > 0) {
            if (robot.pathIndex < pathLength - 1) {
              robot.pathIndex += 1;
              robot.status = 'moving';
            } else if (robot.config.loop) {
              robot.pathIndex = 0;
              robot.status = 'moving';
            } else {
              robot.status = 'arrived';
            }
          } else {
            robot.status = 'idle';
          }

          updateRobotTrail(robot, true);
          continue;
        }

        robot.status = 'moving';
        updateRobotTrail(robot);
      }

      publishRobotStatuses();
    };

    const onDropPointPointerDown = (event: PointerEvent) => {
      if (!showDropPointRef.current || !event.altKey || !dropPointMarker) {
        return;
      }

      const rect = renderer.domElement.getBoundingClientRect();

      pickPointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pickPointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      pickRaycaster.setFromCamera(pickPointer, camera);

      const picked = dropPointMarker.pickOnPlane(
        pickRaycaster,
        dropPointRef.current.z,
      );

      if (!picked) return;

      dropPointRef.current = picked;
      dropPointMarker.setPosition(picked);
      setDropPoint(picked);
    };

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;

      if (width === 0 || height === 0) return;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
      gizmo.update();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    renderer.domElement.addEventListener('pointerdown', onDropPointPointerDown);

    const animate = () => {
      if (disposed) return;

      animationFrameId = requestAnimationFrame(animate);

      const deltaSeconds = clock.getDelta();

      controls.update();
      updateRobots(deltaSeconds, currentFloorZ);

      renderer.render(scene, camera);
      gizmo.render();
    };

    animate();

    setLoadState('loading');
    setLoadingMessage('Loading scene assets ...');
    setLoadingProgress(null);

    const onSceneLoaded = async (gltf: GLTF) => {
      if (disposed) return;

      loadedScene = gltf.scene;

      // GLTF is usually Y-up; rotate to Z-up world convention.
      gltf.scene.rotation.x = Math.PI / 2;

      tuneMaterials(gltf.scene);
      scene.add(gltf.scene);

      const bounds = computeSceneBounds(gltf.scene);

      currentFloorZ = bounds.floorZ;
      floorZRef.current = bounds.floorZ;

      staticCollisionBoxes = collectStaticCollisionBoxes(
        gltf.scene,
        bounds.floorZ,
      );

      gridAxesHelpers = createGridAxesHelpers(bounds);
      scene.add(gridAxesHelpers);

      dropPointMarker = new DropPointMarker(bounds.maxDim * 0.012);
      scene.add(dropPointMarker.mesh);

      const initialDrop: DropPointCoords = {
        x: (bounds.min.x + bounds.max.x) / 2,
        y: (bounds.min.y + bounds.max.y) / 2,
        z: bounds.floorZ,
      };

      dropPointRef.current = initialDrop;
      dropPointMarker.setPosition(initialDrop);
      setDropPoint(initialDrop);

      sceneApiRef.current = {
        setShowGridAxes(show) {
          if (gridAxesHelpers) {
            gridAxesHelpers.visible = show;
          }
        },

        setDropPointEnabled(enabled) {
          dropPointMarker?.setVisible(enabled);
        },

        setDropPointPosition(position) {
          dropPointMarker?.setPosition(position);
        },

        setRoofSliceEnabled(enabled) {
          renderer.clippingPlanes = enabled ? [roofClipPlane] : [];
        },

        setRoofSliceHeight(height) {
          roofClipPlane.constant = height;
        },

        setPathLineVisible(visible) {
          for (const robot of robots.values()) {
            if (robot.trail) robot.trail.group.visible = visible;
          }
        },
      };

      setSceneDebug(toSceneDebugInfo(bounds));

      const frame = computeCameraFrame(gltf.scene);

      resetOrbitRef.current = () => {
        frameCamera(camera, controls, gltf.scene);
      };

      try {
        const templates = new globalThis.Map<string, THREE.Group>();
        for (const [model, url] of modelUrlMapRef.current) {
          let tmpl: THREE.Group;
          try {
            tmpl = await loadGltfAsync(loader, url);
          } catch {
            // CDN fallback — clear auth header so the browser doesn't send a
            // preflight that the CDN rejects. All subsequent models will also
            // fall back since auth is no longer sent.
            loader.setRequestHeader({});
            tmpl = await loadGltfAsync(loader, AMR_URL);
          }
          tuneMaterials(tmpl);
          templates.set(model, tmpl);
        }
        robotTemplates = templates;
        robotTemplateRef.current = robotTemplates;
        setRobotConfigReady(true);
      } catch (robotError) {
        console.error('Robots failed to load', robotError);
        setRobotStatuses([]);
        robotTemplateRef.current = null;
        setRobotConfigReady(false);
      }

      if (disposed) return;

      setLoadState('ready');
      animateIntroCamera(camera, controls, frame, () => disposed);
    };

    loader.load(sceneUrl, onSceneLoaded, undefined, () => {
      // Backend scene URL failed — notify and retry with the CDN fallback
      if (disposed) return;
      if (sceneUrl !== SCENE_URL) {
        toaster.create({
          id: 'map-offline-fallback',
          title: 'Map server unreachable',
          description: 'Showing offline fallback scene and demo robot.',
          type: 'warning',
        });
        // CDN URLs don't support the Authorization header — clear it before
        // the retry so the browser doesn't send a preflight that the CDN rejects.
        loader.setRequestHeader({});
        loader.load(SCENE_URL, onSceneLoaded, undefined, () => {
          if (!disposed) {
            setErrorMessage('Failed to load 3D scene');
            setLoadState('error');
          }
        });
      } else {
        setErrorMessage('Failed to load 3D scene');
        setLoadState('error');
      }
    });

    return () => {
      disposed = true;

      setRobotConfigReady(false);

      resetOrbitRef.current = null;
      resetRobotsRef.current = null;
      sceneApiRef.current = null;
      sceneRef.current = null;
      robotTemplateRef.current = null;
      publishRobotStatusesRef.current = null;
      floorZRef.current = 0;

      for (const id of Array.from(robots.keys())) {
        removeRobot({
          id,
          scene,
          robots,
        });
      }

      robots.clear();

      if (robotTemplates) {
        for (const tmpl of robotTemplates.values()) {
          disposeObject3D(tmpl);
        }
        robotTemplates = null;
      }

      staticCollisionBoxes = [];

      setRobotStatuses([]);
      setSceneDebug(null);

      renderer.domElement.removeEventListener(
        'pointerdown',
        onDropPointPointerDown,
      );

      dropPointMarker?.dispose();
      dropPointMarker = null;

      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();

      if (gridAxesHelpers) {
        scene.remove(gridAxesHelpers);
        disposeObject3D(gridAxesHelpers);
        gridAxesHelpers = null;
      }

      if (loadedScene) {
        disposeObject3D(loadedScene);
        scene.remove(loadedScene);
        loadedScene = null;
      }

      gizmo.dispose();

      THREE.Object3D.DEFAULT_UP.copy(previousDefaultUp);

      controls.dispose();
      renderer.dispose();
      dracoLoader.dispose();

      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [sceneUrl]);

  return (
    <SceneViewer.Root ref={containerRef}>
      <SceneViewer.Pending
        isVisible={isAssetUrlLoading || loadState === 'loading'}
        title={isAssetUrlLoading ? 'Resolving scene assets...' : loadingMessage}
        description={
          loadingProgress === null
            ? 'Please wait while the 3D viewer prepares the map.'
            : `${loadingProgress}%`
        }
      />

      <SceneViewer.Error
        isVisible={loadState === 'error'}
        message={errorMessage ?? 'Failed to load floor plan'}
      />

      <SceneViewer.LeftPanel>
        <SceneViewer.ControlPanel
          loadState={loadState}
          toggles={sceneViewerToggles}
          roofSlice={roofSliceControl}
        />

        {showDropPoint && (
          <DropPointPanel
            dropPoint={dropPoint}
            setDropPoint={setDropPoint}
            sceneDebug={sceneDebug}
          />
        )}

        <SceneViewer.LeftPanelReference
          isVisible={showGridAxes}
          sceneDebug={sceneDebug}
        />
      </SceneViewer.LeftPanel>

      <RobotStatusPanel robots={robotStatuses} />

      <SceneViewer.BottomPanel>
        <SceneViewer.BottomPanelStack items={bottomPanelItems} />
      </SceneViewer.BottomPanel>
    </SceneViewer.Root>
  );
}

export default Map;
