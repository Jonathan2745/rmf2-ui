import type { BoxProps } from '@chakra-ui/react';
import { Box } from '@chakra-ui/react';

export interface SceneViewerRootProps extends BoxProps {}

export function SceneViewerRoot({ children, ...rest }: SceneViewerRootProps) {
  return (
    <Box
      w="100%"
      h={{ base: '400px', md: '600px', xl: '70vh' }}
      overflow="hidden"
      {...rest}
    >
      {children}
    </Box>
  );
}
