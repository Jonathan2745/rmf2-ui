import { chakra, HTMLChakraProps } from '@chakra-ui/react';

export interface SceneViewerPanelProps extends HTMLChakraProps<'div'> {}

export const SceneViewerPanel = chakra('div', {
  base: {
    position: 'absolute',
    color: 'fg',
    wordWrap: 'break-word',
    borderRadius: 'l3',
    borderWidth: '1px',
    borderColor: 'border',
    bg: 'bg/50',
    backdropFilter: 'blur(4px)',
    padding: 3,
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
  },
  variants: {
    variant: {
      'left-panel': {
        top: 3,
        left: 3,
        gap: 3,
        maxW: { base: 'calc(100% - 160px)', md: '280px' },
      },
      'bottom-panel-transparent': {
        bottom: 3,
        left: 3,
        gap: 2,
        flexDirection: 'row',
        align: 'center',
        color: 'inherit',
        borderWidth: 0,
        bg: 'transparent',
      },
      'right-panel': {
        top: '96px',
        right: 3,
        gap: 2.5,
        minW: '240px',
        maxW: '300px',
        maxH: 'calc(100% - 112px)',
        overflowY: 'auto',
      },
    },
  },
});

SceneViewerPanel.displayName = 'SceneViewer.Panel';
