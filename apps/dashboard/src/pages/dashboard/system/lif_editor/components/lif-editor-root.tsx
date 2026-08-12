import type { BoxProps } from '@chakra-ui/react';
import { Box } from '@chakra-ui/react';
import { ReactFlowProvider } from '@xyflow/react';

import type { UseLifDataProps } from './use-lif-data';
import {
  LifEditorContext,
  useLifData,
} from './use-lif-data';

export interface LifEditorRootProps
  extends BoxProps,
    UseLifDataProps {}

export function LifEditorRoot({
  children,
  lifData,
  showGrid,
  initialViewMode,
  ...boxProps
}: LifEditorRootProps) {
  const context = useLifData({
    lifData,
    showGrid,
    initialViewMode,
  });

  return (
    <ReactFlowProvider>
      {/*  */}
      <Box
        display="flex"
        flexDirection="column"
        position="relative"
        width="100%"
        height={{
          base: '600px',
          xl: '80vh',
        }}
        minHeight={0}
        overflow="hidden"
        {...boxProps}
      >
        <LifEditorContext value={context}>
          {children}
        </LifEditorContext>
      </Box>
    </ReactFlowProvider>
  );
}