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
        <SceneViewer.SceneRobot>
          <SceneViewer.RobotTrails />
        </SceneViewer.SceneRobot>
        <SceneViewer.SceneControl />
        <SceneViewer.ViewControl />
        <SceneViewer.RobotStatusPanel />
        <SceneViewer.LoadingOverlay />
      </SceneViewer.Root>
    </Card>
  );
}

export default Map;
