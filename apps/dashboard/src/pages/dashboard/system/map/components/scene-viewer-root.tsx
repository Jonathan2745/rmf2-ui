import { useMemo } from 'react';

import type { BoxProps } from '@chakra-ui/react';
import { Box } from '@chakra-ui/react';
import type { UseSceneViewerProps } from './use-scene-viewer';
import { useSceneViewer, SceneViewerContext } from './use-scene-viewer';

export interface SceneViewerRootProps extends BoxProps, UseSceneViewerProps {}

export function SceneViewerRoot(props: SceneViewerRootProps) {
  const { children, ...rest } = props as BoxProps;
  const { ...context } = useSceneViewer(props as UseSceneViewerProps);
  const ctx = useMemo(() => ({ ...context }), [context]);
  return (
    <Box
      w="100%"
      h={{ base: '400px', md: '600px', xl: '70vh' }}
      overflow="hidden"
      pointerEvents="auto"
      {...rest}
    >
      <SceneViewerContext value={ctx}>{children}</SceneViewerContext>
    </Box>
  );
}
