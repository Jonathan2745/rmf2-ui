import { SceneViewer } from './components';
import { Horizon } from '@rmf2-ui/chakra';
import Card = Horizon.Card;

export function Map() {
  return (
    <Card>
      <SceneViewer.Root>
        <SceneViewer.Viewport3D />
        <SceneViewer.SceneControl />
        <SceneViewer.ViewControl />
        <SceneViewer.RobotStatusPanel />
        <SceneViewer.LoadingOverlay />
      </SceneViewer.Root>
    </Card>
  );
}

export default Map;
