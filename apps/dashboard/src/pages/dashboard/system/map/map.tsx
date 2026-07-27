import { SceneViewer } from './components';
import { Horizon } from '@rmf2-ui/chakra';
import Card = Horizon.Card;
import { useMapData } from '@/clients/map';

export function Map() {
  const mapData = useMapData();

  return (
    <Card>
      <SceneViewer.Root mapData={mapData}>
        <SceneViewer.Viewport3D />
        <SceneViewer.RobotRoot>
          {/* Headless subscribers to context provided by RobotRoot */}
          <SceneViewer.RobotModels />
          <SceneViewer.RobotTrails />
        </SceneViewer.RobotRoot>
        <SceneViewer.SceneControl />
        <SceneViewer.ViewControl />
        <SceneViewer.RobotStatusPanel />
        <SceneViewer.LoadingOverlay />
      </SceneViewer.Root>
    </Card>
  );
}

export default Map;
