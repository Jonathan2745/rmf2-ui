import { useMemo } from 'react';

import type { BoxProps } from '@chakra-ui/react';
import { Box } from '@chakra-ui/react';
import type { UseSceneViewerProps } from './use-scene-viewer';
import { useSceneViewer, SceneViewerContext } from './use-scene-viewer';

export interface SceneViewerRootProps extends BoxProps, UseSceneViewerProps {}

// TODO(jonathan): include Robot AMR movement

export function SceneViewerRoot(props: SceneViewerRootProps) {
  const { children, ...rest } = props as BoxProps;
  const { ...context } = useSceneViewer(props as UseSceneViewerProps);
  // KNOWN ISSUE (left as-is intentionally): `context` is a fresh object on
  // every render (useSceneViewer returns a new object literal each call), so
  // `Object.is(prevContext, context)` is never true and this useMemo never
  // actually skips recomputing — it recreates `ctx` every render regardless
  // of whether anything inside it changed, providing no memoization benefit.
  // A real fix needs the dependency array to list the individual stable
  // values (mapClient, sceneUri, showGrid, ...) rather than the wrapper
  // object itself.
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
