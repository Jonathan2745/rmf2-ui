import { useSceneRobotTrail } from './use-scene-robot-trail';

/**
 * Headless child of SceneViewer.RobotRoot that owns trail creation, updates,
 * visibility, and disposal for every active robot runtime.
 */
export function SceneViewerRobotTrails() {
  useSceneRobotTrail();
  return null;
}
