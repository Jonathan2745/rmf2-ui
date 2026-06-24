// components/scene-viewer.tsx

import type { ReactNode } from 'react';
import { forwardRef } from 'react';

import {
  Box,
  Center,
  Spinner,
  Stack,
  Text,
  type BoxProps,
} from '@chakra-ui/react';

type RootProps = BoxProps & {
  children: ReactNode;
};

type PendingProps = {
  isVisible: boolean;
  title: string;
  description: string;
};

type ErrorProps = {
  isVisible: boolean;
  message: string;
};

type PanelProps = {
  children: ReactNode;
};

const Root = forwardRef<HTMLDivElement, RootProps>(function Root(
  { children, ...props },
  ref,
) {
  return (
    <Box
      ref={ref}
      position="relative"
      w="100%"
      h={{ base: '400px', md: '600px', xl: '70vh' }}
      bg="white"
      borderWidth="1px"
      borderColor="border.subtle"
      rounded="lg"
      overflow="hidden"
      {...props}
    >
      {children}
    </Box>
  );
});

function Pending({ isVisible, title, description }: PendingProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <Center position="absolute" inset={0} zIndex={3} bg="white" px={6}>
      <Stack align="center" gap={3}>
        <Text fontWeight="semibold">{title}</Text>

        <Text fontSize="sm" color="fg.muted">
          {description}
        </Text>

        <Spinner />
      </Stack>
    </Center>
  );
}

function Error({ isVisible, message }: ErrorProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <Center position="absolute" inset={0} zIndex={1} bg="white" px={6}>
      <Text color="fg.error" textAlign="center">
        {message}
      </Text>
    </Center>
  );
}

function LeftPanel({ children }: PanelProps) {
  return (
    <Stack
      position="absolute"
      top={3}
      left={3}
      zIndex={2}
      gap={2}
      align="flex-start"
      pointerEvents="none"
      maxW={{ base: 'calc(100% - 160px)', md: '280px' }}
    >
      {children}
    </Stack>
  );
}

function BottomPanel({ children }: PanelProps) {
  return (
    <Box
      position="absolute"
      bottom={3}
      left={3}
      zIndex={2}
      pointerEvents="none"
    >
      {children}
    </Box>
  );
}

export const SceneViewer = {
  Root,
  Pending,
  Error,
  LeftPanel,
  BottomPanel,
};
