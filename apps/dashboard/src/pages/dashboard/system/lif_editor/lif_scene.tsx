import { LifEditor } from './components';
import { Horizon } from '@rmf2-ui/chakra';
import Card = Horizon.Card;

// TODO(Jonathan): Add in client for lif-editor to GET map and update map of broker with fallback
import useLifEditor from '@/clients/lif-editor';

export default function LifScene() {
  const lifData = useLifEditor();

  return (
    <Card>
      <LifEditor.Root lifData={lifData}>
        {/* Context Provider for whole Lif Module */}
        <LifEditor.CommandBar />

        <LifEditor.Content>
          <LifEditor.SceneControl />
          <LifEditor.Viewport />
          <LifEditor.EditPanel />
        </LifEditor.Content>

        <LifEditor.StatusPanel />
        <LifEditor.LoadingOverlay />
      </LifEditor.Root>
    </Card>
  );
}
