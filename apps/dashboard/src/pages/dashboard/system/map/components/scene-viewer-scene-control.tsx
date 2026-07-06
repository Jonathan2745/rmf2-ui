import { useState } from 'react';

import { chakra, Stack, Switch, Slider, HStack, Text } from '@chakra-ui/react';
import { SceneViewerPanel } from './scene-viewer-panel';
import type { SceneViewerPanelProps } from './scene-viewer-panel';

export interface SceneViewerToggleControlProps
  extends Omit<Switch.RootProps, 'children'> {
  label: string;
}

export function SceneViewerToggleControl(props: SceneViewerToggleControlProps) {
  const { label, ...rest } = props;
  return (
    <Switch.Root size="sm" {...rest}>
      <Switch.HiddenInput />

      <HStack justify="space-between" w="full">
        <Switch.Label>
          <Text fontSize="sm" color="fg.muted">
            {label}
          </Text>
        </Switch.Label>

        <Switch.Control />
      </HStack>
    </Switch.Root>
  );
}

export interface SceneViewerSliderControlProps
  extends Omit<Slider.RootProps, 'children' | 'value'> {
  value: number;
  label: string;
}

export function SceneViewerSliderControl(props: SceneViewerSliderControlProps) {
  const { label, value: valueExternal, ...rest } = props;

  return (
    <Slider.Root size="sm" value={[valueExternal]} {...rest}>
      <Stack gap={2}>
        <HStack justify="space-between">
          <Text fontSize="sm" color="fg.muted">
            {label ?? 'Roof slice height'}
          </Text>

          <Text fontSize="xs" fontFamily="mono" color="fg.muted">
            {valueExternal.toFixed(2)}
          </Text>
        </HStack>
        <chakra.div>
          <Slider.Control>
            <Slider.Track>
              <Slider.Range />
            </Slider.Track>

            <Slider.Thumbs />
          </Slider.Control>
        </chakra.div>
      </Stack>
    </Slider.Root>
  );
}

export interface SceneViewerSceneControlProps extends SceneViewerPanelProps {
  // TODO(anyone): selectively turn on and off controls
}

export function SceneViewerSceneControl(props: SceneViewerSceneControlProps) {
  const { ...rest } = props;
  const [roofSliceHeight, setRoofSliceHeight] = useState(3.4);
  const defaultSceneControlToggles = [
    {
      id: 'grid-axes',
      label: 'Show grid / axes',
      checked: true,
    },
    {
      id: 'drop-point',
      label: 'Show drop point',
      checked: true,
    },
    {
      id: 'roof-slice',
      label: 'Slice roof',
      checked: false,
    },
    {
      id: 'robot-path',
      label: 'Show path lines',
      onCheckedChange: () => console.log('hello'),
    },
  ];

  const defaultSceneControlSlider = [
    {
      id: 'roof-slice-height',
      label: 'Roof slice height',
      value: roofSliceHeight,
      onValueChange: (event: Slider.ValueChangeDetails) =>
        setRoofSliceHeight(event.value[0]),
      enabled: true,
      min: 0,
      max: 20,
      step: 0.1,
    },
  ];
  return (
    <SceneViewerPanel variant="left-panel" {...rest}>
      <Text fontSize="sm" fontWeight="semibold">
        Scene controls
      </Text>
      {defaultSceneControlToggles.map(({ id, ...rest }) => (
        <SceneViewerToggleControl key={id} {...rest} />
      ))}
      {defaultSceneControlSlider.map(({ id, ...rest }) => (
        <SceneViewerSliderControl key={id} {...rest} />
      ))}
    </SceneViewerPanel>
  );
}
