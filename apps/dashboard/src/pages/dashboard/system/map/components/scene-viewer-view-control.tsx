import { LuLocateFixed } from 'react-icons/lu';
import { Text, Box, Kbd, IconButton } from '@chakra-ui/react';
import { Tooltip } from '@/components/ui/tooltip';
import { SceneViewerPanel } from './scene-viewer-panel';
import type { SceneViewerPanelProps } from './scene-viewer-panel';
import { useSceneViewerViewControl } from './use-scene-viewer';
import { applyCameraFrame } from './three-utils';

export interface SceneViewerViewControlProps extends SceneViewerPanelProps {
  // TODO(anyone): selectively turn on and off controls
}

export function SceneViewerViewControl(props: SceneViewerViewControlProps) {
  const { ...rest } = props;
  const { loadStatus, sceneContextRef, orbitOrigin } =
    useSceneViewerViewControl();

  const disabled = loadStatus !== 'success';
  const defaultIconButtons = [
    {
      id: 'reset-orbit',
      tooltip: 'Reset Orbit Origin',
      icon: <LuLocateFixed />,
      colorPalette: 'gray',
      onClick: () => {
        if (orbitOrigin === undefined) {
          return;
        }
        if (!sceneContextRef.current) {
          return;
        }

        const { camera, controls } = sceneContextRef.current;
        applyCameraFrame(
          camera,
          controls,
          orbitOrigin,
          orbitOrigin.endPosition,
        );
      },
      disabled,
    },
  ];

  const defaultHints = [
    {
      id: 'pan',
      shortcut: 'Shift',
      label: 'pan',
    },
  ];
  return (
    <SceneViewerPanel variant="bottom-panel-transparent" {...rest}>
      {defaultIconButtons.map(({ id, tooltip, icon, ...rest }) => (
        <Tooltip key={id} content={tooltip} showArrow>
          <IconButton
            aria-label={id}
            size="sm"
            variant="surface"
            pointerEvents="auto"
            css={{
              _icon: {
                width: '18px',
                height: '18px',
              },
            }}
            {...rest}
          >
            {icon}
          </IconButton>
        </Tooltip>
      ))}
      {defaultHints.map(({ id, shortcut, label, ...rest }) => (
        <Box
          key={id}
          px={2.5}
          py={1.5}
          rounded="md"
          bg="bg/80"
          borderWidth="1px"
          borderColor="border.subtle"
          backdropFilter="blur(4px)"
          {...rest}
        >
          <Text fontSize="xs" color="fg.muted">
            Hold <Kbd size="sm">{shortcut}</Kbd> to {label}
          </Text>
        </Box>
      ))}
    </SceneViewerPanel>
  );
}
