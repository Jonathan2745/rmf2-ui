import { SceneViewer } from './components';
import { Horizon } from '@rmf2-ui/chakra';
import Card = Horizon.Card;
import { SCENE_URL } from './components/constants';

export type LoadState = 'loading' | 'ready' | 'error';

export function Map() {
  return (
    <Card>
      <SceneViewer.Root>
        <SceneViewer.Viewport3D sceneUrl={SCENE_URL} />
        <SceneViewer.SceneControl />
        <SceneViewer.ViewControl />
        <SceneViewer.RobotStatusPanel />
        <SceneViewer.LoadingOverlay />
      </SceneViewer.Root>
    </Card>
  );
}

export default Map;
