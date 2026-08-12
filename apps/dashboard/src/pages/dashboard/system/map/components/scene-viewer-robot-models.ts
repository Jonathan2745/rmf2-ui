import { useSceneRobotModel } from './use-scene-robot-model';

/** Headless subscriber that owns robot model creation and synchronization. */
export function SceneViewerRobotModels() {
  useSceneRobotModel();
  return null;
}
