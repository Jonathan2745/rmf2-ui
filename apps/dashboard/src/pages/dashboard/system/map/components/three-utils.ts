import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  INTRO_START_DISTANCE_FACTOR,
  END_DISTANCE_FACTOR,
  END_VIEW_ANGLE,
} from './constants';

export function tuneMaterials(root: THREE.Object3D) {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];

    for (const material of materials) {
      // Coplanar faces in architectural exports often z-fight at grazing angles.
      material.polygonOffset = true;
      material.polygonOffsetFactor = 1;
      material.polygonOffsetUnits = 1;

      if (material.transparent || material.opacity < 1) {
        material.depthWrite = false;
        material.side = THREE.FrontSide;
        child.renderOrder = 1;
      } else if (material.side === THREE.DoubleSide) {
        // Back faces fighting with front faces on thin geometry.
        material.side = THREE.FrontSide;
      }
    }
  });
}

/**
 * Completely disposes a Three.js scene, its children, and the renderer to free GPU memory.
 */
export function disposeScene(
  scene: THREE.Scene,
  renderer?: THREE.WebGLRenderer,
): void {
  // Traverse the entire scene graph
  scene.traverse((object: THREE.Object3D) => {
    // Check if the object has a geometry attached
    if (
      'geometry' in object &&
      object.geometry instanceof THREE.BufferGeometry
    ) {
      object.geometry.dispose();
    }

    // Check if the object has materials attached
    if ('material' in object && object.material) {
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];

      for (const material of materials) {
        if (material instanceof THREE.Material) {
          // Recursively discover and dispose all textures bound to this material
          Object.keys(material).forEach((key) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const value = (material as any)[key];
            if (value && value instanceof THREE.Texture) {
              value.dispose();
            }
          });

          material.dispose(); // Dispose the material itself
        }
      }
    }
  });

  // Remove all child objects from the scene parent graph
  while (scene.children.length > 0) {
    const object = scene.children[0];
    scene.remove(object);
  }

  // Dispose of the renderer and WebGL context if provided
  if (renderer) {
    renderer.dispose();
    renderer.renderLists.dispose(); // Clean internal rendering caches
  }
}

export type CameraFrame = {
  center: THREE.Vector3;
  maxDim: number;
  sphereRadius: number;
  startPosition: THREE.Vector3;
  endPosition: THREE.Vector3;
};

export function computeCameraFrame(root: THREE.Object3D): CameraFrame {
  const box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const sphere = box.getBoundingSphere(new THREE.Sphere());

  const startDistance = maxDim * INTRO_START_DISTANCE_FACTOR;
  const endDistance = maxDim * END_DISTANCE_FACTOR;

  // Z-up: intro starts straight overhead (high +Z) and ends at an angled view
  // offset along -Y so that +Y projects "up" on screen.
  return {
    center,
    maxDim,
    sphereRadius: sphere.radius,
    startPosition: new THREE.Vector3(
      center.x,
      center.y,
      center.z + startDistance,
    ),
    endPosition: new THREE.Vector3(
      center.x,
      center.y - endDistance * Math.sin(END_VIEW_ANGLE),
      center.z + endDistance * Math.cos(END_VIEW_ANGLE),
    ),
  };
}

export function applyCameraFrame(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  frame: CameraFrame,
  position: THREE.Vector3,
) {
  // Tight near/far improves depth precision and reduces z-fighting.
  camera.near = Math.max(frame.sphereRadius / 500, 0.05);
  camera.far = frame.sphereRadius * 20;
  camera.updateProjectionMatrix();

  controls.target.copy(frame.center);
  controls.minDistance = frame.maxDim * 0.15;
  controls.maxDistance = frame.maxDim * 4;
  camera.position.copy(position);
  camera.lookAt(frame.center);
  controls.update();
}

export function frameCamera(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  root: THREE.Object3D,
) {
  const frame = computeCameraFrame(root);
  applyCameraFrame(camera, controls, frame, frame.endPosition);
}
