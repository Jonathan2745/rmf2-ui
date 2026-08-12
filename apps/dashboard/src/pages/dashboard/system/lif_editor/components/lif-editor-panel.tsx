import type { HTMLChakraProps } from '@chakra-ui/react';
import { chakra } from '@chakra-ui/react';

export type LifEditorPanelVariant =
  | 'top-panel'
  | 'left-panel'
  | 'right-panel'
  | 'bottom-panel';

export interface LifEditorPanelProps extends HTMLChakraProps<'div'> {
  variant?: LifEditorPanelVariant;
}

export const LifEditorPanel = chakra('div', {
  base: {
    display: 'flex',
    flexShrink: 0,
    bg: 'bg.subtle',
  },
  variants: {
    variant: {
      'top-panel': {
        px: 3,
        py: 2,
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 2,
        borderBottomWidth: '1px',
        borderColor: 'border.subtle',
      },
      'left-panel': {
        p: 2,
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
        borderRightWidth: '1px',
        borderColor: 'border.subtle',
      },
      'right-panel': {
        w: '300px',
        flexDirection: 'column',
        overflow: 'hidden',
        borderLeftWidth: '1px',
        borderColor: 'border.subtle',
      },
      'bottom-panel': {
        px: 3,
        py: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderTopWidth: '1px',
        borderColor: 'border.subtle',
      },
    },
  },
});

LifEditorPanel.displayName = 'LifEditor.Panel';
