import { chakra, Stack, Switch, Slider, HStack, Text } from '@chakra-ui/react';
import { SceneViewerPanel } from './scene-viewer-panel';
import type { SceneViewerPanelProps } from './scene-viewer-panel';
import { useSceneViewerSceneControl } from './use-scene-viewer';

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
  const {
    loadStatus,
    showGrid,
    setShowGrid,
    showDropPoint,
    setShowDropPoint,
    showPathLines,
    setShowPathLines,
    showRoofSlice,
    setShowRoofSlice,
    roofSliceHeight,
    setRoofSliceHeight,
  } = useSceneViewerSceneControl();
  const disabled = loadStatus !== 'success';

  const sceneControlToggles = [
    {
      id: 'grid-axes',
      label: 'Show grid / axes',
      checked: showGrid,
      onCheckedChange: (event: Switch.CheckedChangeDetails) =>
        setShowGrid(event.checked),
      disabled,
    },
    {
      id: 'drop-point',
      label: 'Show drop point',
      checked: showDropPoint,
      onCheckedChange: (event: Switch.CheckedChangeDetails) =>
        setShowDropPoint(event.checked),
      disabled,
    },
    {
      id: 'roof-slice',
      label: 'Slice roof',
      checked: showRoofSlice,
      onCheckedChange: (event: Switch.CheckedChangeDetails) =>
        setShowRoofSlice(event.checked),
      disabled,
    },
    {
      id: 'robot-path',
      label: 'Show path lines',
      checked: showPathLines,
      onCheckedChange: (event: Switch.CheckedChangeDetails) =>
        setShowPathLines(event.checked),
      disabled,
    },
  ];

  const sceneControlSlider = [
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
      {sceneControlToggles.map(({ id, ...rest }) => (
        <SceneViewerToggleControl key={id} {...rest} />
      ))}
      {sceneControlSlider.map(({ id, ...rest }) => (
        <SceneViewerSliderControl key={id} {...rest} />
      ))}
    </SceneViewerPanel>
  );
}
