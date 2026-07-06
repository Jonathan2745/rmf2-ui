import { SceneViewer } from './components';
import { Horizon } from '@rmf2-ui/chakra';
import Card = Horizon.Card;

export type LoadState = 'loading' | 'ready' | 'error';

export function Map() {
  return (
    <Card>
      <SceneViewer.Root>
        <SceneViewer.SceneControl />
        <SceneViewer.ViewControl />
        <SceneViewer.RobotStatusPanel />
        <SceneViewer.LoadingOverlay
          loadStatus="success"
          title="ABCD"
          description="hello"
        />
      </SceneViewer.Root>
    </Card>
  );
}

export default Map;
