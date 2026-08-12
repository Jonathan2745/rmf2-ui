import type { HTMLChakraProps } from '@chakra-ui/react';
import { chakra } from '@chakra-ui/react';

export type LifEditorContentProps = HTMLChakraProps<'div'>;

export const LifEditorContent = chakra('div', {
  base: {
    display: 'flex',
    flex: 1,
    minH: 0,
    minW: 0,
    overflow: 'hidden',
  },
});

LifEditorContent.displayName = 'LifEditor.Content';
