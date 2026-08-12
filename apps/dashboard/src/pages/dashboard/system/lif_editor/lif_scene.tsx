import { LifEditor } from './components';
import { Horizon } from '@rmf2-ui/chakra';
import Card = Horizon.Card;

import { useLifEditor } from '@/clients/lif-editor';

export default function LifScene() {
  const lifData = useLifEditor();

  return (
    <Card>
      <LifEditor.Root lifData={lifData}>
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
