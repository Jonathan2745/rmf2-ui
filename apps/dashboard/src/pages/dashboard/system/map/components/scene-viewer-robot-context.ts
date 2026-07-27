import { createContext, useContext } from 'react';

import type { RobotConfig } from './robot-types';
import type { UseSceneViewerReturn } from './use-scene-viewer';

export type SceneViewerRobotContextValue = Pick<
  UseSceneViewerReturn,
  'robotsRef' | 'sceneContextRef' | 'showPathLines'
> & {
  robotConfigs: RobotConfig[];
  robotsVersion: number;
};

export const SceneViewerRobotContext = createContext<
  SceneViewerRobotContextValue | undefined
>(undefined);

export function useSceneViewerRobotContext(): SceneViewerRobotContextValue {
  const context = useContext(SceneViewerRobotContext);

  if (!context) {
    throw new Error(
      'useSceneViewerRobotContext must be used inside SceneViewer.SceneRobot',
    );
  }

  return context;
}
