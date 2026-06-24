import type { ComponentProps, ReactNode } from 'react';
import { forwardRef } from 'react';

import {
  Box,
  Card,
  Center,
  HStack,
  Slider,
  Spinner,
  Stack,
  Switch,
  Text,
  Button,
  IconButton,
  Kbd,
  type BoxProps,
} from '@chakra-ui/react';

type ChakraButtonProps = ComponentProps<typeof Button>;
type ChakraIconButtonProps = ComponentProps<typeof IconButton>;

import type { LoadState, SceneDebugInfo } from './robot-types';
import { Tooltip } from '@/components/ui/tooltip';

function formatCoord(value: number) {
  return value.toFixed(3);
}

export type SceneViewerToggleControl = {
  id: string;
  label: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
};

export type SceneViewerRoofSliceControl = {
  label?: ReactNode;
  value: number;
  onValueChange: (value: number) => void;
  enabled?: boolean;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
};

export type SceneViewerBottomPanelItem =
  | {
      type: 'icon-button';
      tooltip: string;
      ariaLabel: string;
      icon: ReactNode;
      disabled?: boolean;
      onClick?: () => void;
      colorPalette?: ChakraIconButtonProps['colorPalette'];
      variant?: ChakraIconButtonProps['variant'];
      size?: ChakraIconButtonProps['size'];
    }
  | {
      type: 'button';
      tooltip: string;
      label: ReactNode;
      disabled?: boolean;
      onClick?: () => void;
      colorPalette?: ChakraButtonProps['colorPalette'];
      variant?: ChakraButtonProps['variant'];
      size?: ChakraButtonProps['size'];
    }
  | {
      type: 'shortcut-hint';
      shortcut: string;
      label: string;
    };

type ControlPanelProps = {
  loadState: LoadState;
  toggles: SceneViewerToggleControl[];
  roofSlice?: SceneViewerRoofSliceControl;
};

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

type BottomPanelStackProps = {
  items: SceneViewerBottomPanelItem[];
};

type LeftPanelReferenceProps = {
  isVisible: boolean;
  sceneDebug: SceneDebugInfo | null;
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

function LeftPanelReference({
  isVisible,
  sceneDebug,
}: LeftPanelReferenceProps) {
  if (!isVisible || !sceneDebug) {
    return null;
  }

  return (
    <Card.Root
      size="sm"
      variant="outline"
      bg="bg/90"
      backdropFilter="blur(4px)"
      pointerEvents="auto"
      w="full"
    >
      <Card.Body gap={2} py={3}>
        <Text fontSize="sm" fontWeight="semibold">
          Floor reference
        </Text>

        <Text fontSize="sm" color="fg.muted">
          Floor Z height:{' '}
          <Text as="span" fontFamily="mono" color="fg">
            {formatCoord(sceneDebug.floorZ)}
          </Text>
        </Text>

        <Text fontSize="xs" color="fg.muted" lineHeight="short">
          Red = +X, green = +Y, blue = +Z. Read vertex positions from the grid;
          bounds min Z is the floor level.
        </Text>

        <Stack gap={0.5} fontFamily="mono" fontSize="xs" color="fg.muted">
          <Text>
            min ({formatCoord(sceneDebug.min.x)},{' '}
            {formatCoord(sceneDebug.min.y)}, {formatCoord(sceneDebug.min.z)})
          </Text>

          <Text>
            max ({formatCoord(sceneDebug.max.x)},{' '}
            {formatCoord(sceneDebug.max.y)}, {formatCoord(sceneDebug.max.z)})
          </Text>
        </Stack>
      </Card.Body>
    </Card.Root>
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

function BottomPanelStack({ items }: BottomPanelStackProps) {
  return (
    <HStack gap={2} align="center" pointerEvents="none">
      {items.map((item, index) => {
        if (item.type === 'icon-button') {
          return (
            <Tooltip key={index} content={item.tooltip} showArrow>
              <IconButton
                aria-label={item.ariaLabel}
                size={item.size ?? 'sm'}
                variant={item.variant ?? 'surface'}
                colorPalette={item.colorPalette ?? 'gray'}
                pointerEvents="auto"
                disabled={item.disabled}
                onClick={item.onClick}
                css={{
                  _icon: {
                    width: '18px',
                    height: '18px',
                  },
                }}
              >
                {item.icon}
              </IconButton>
            </Tooltip>
          );
        }

        if (item.type === 'button') {
          return (
            <Tooltip key={index} content={item.tooltip} showArrow>
              <Button
                size={item.size ?? 'sm'}
                variant={item.variant ?? 'surface'}
                colorPalette={item.colorPalette ?? 'blue'}
                pointerEvents="auto"
                disabled={item.disabled}
                onClick={item.onClick}
              >
                {item.label}
              </Button>
            </Tooltip>
          );
        }

        return (
          <Box
            key={index}
            px={2.5}
            py={1.5}
            rounded="md"
            bg="bg/80"
            borderWidth="1px"
            borderColor="border.subtle"
            backdropFilter="blur(4px)"
          >
            <Text fontSize="xs" color="fg.muted">
              Hold <Kbd size="sm">{item.shortcut}</Kbd> to {item.label}
            </Text>
          </Box>
        );
      })}
    </HStack>
  );
}

function ControlPanel({ loadState, toggles, roofSlice }: ControlPanelProps) {
  const isReady = loadState === 'ready';

  return (
    <Card.Root
      size="sm"
      variant="outline"
      bg="bg/90"
      backdropFilter="blur(4px)"
      pointerEvents="auto"
      w="full"
    >
      <Card.Body gap={3} py={3}>
        <Text fontSize="sm" fontWeight="semibold">
          Scene controls
        </Text>

        <Stack gap={2}>
          {toggles.map((toggle) => (
            <Switch.Root
              key={toggle.id}
              size="sm"
              checked={toggle.checked}
              disabled={toggle.disabled ?? !isReady}
              onCheckedChange={(details) => {
                toggle.onCheckedChange(details.checked);
              }}
            >
              <Switch.HiddenInput />

              <HStack justify="space-between" w="full">
                <Switch.Label>
                  <Text fontSize="sm" color="fg.muted">
                    {toggle.label}
                  </Text>
                </Switch.Label>

                <Switch.Control />
              </HStack>
            </Switch.Root>
          ))}
        </Stack>

        {roofSlice && (
          <Stack gap={2} pt={2}>
            <HStack justify="space-between">
              <Text fontSize="sm" color="fg.muted">
                {roofSlice.label ?? 'Roof slice height'}
              </Text>

              <Text fontSize="xs" fontFamily="mono" color="fg.muted">
                {roofSlice.value.toFixed(2)}
              </Text>
            </HStack>

            <Slider.Root
              size="sm"
              value={[roofSlice.value]}
              min={roofSlice.min ?? 0}
              max={roofSlice.max ?? 20}
              step={roofSlice.step ?? 0.1}
              disabled={
                roofSlice.disabled ?? (!isReady || roofSlice.enabled === false)
              }
              onValueChange={(details) => {
                const nextValue = details.value[0];

                if (nextValue === undefined) {
                  return;
                }

                roofSlice.onValueChange(nextValue);
              }}
            >
              <Slider.Control>
                <Slider.Track>
                  <Slider.Range />
                </Slider.Track>

                <Slider.Thumbs />
              </Slider.Control>
            </Slider.Root>
          </Stack>
        )}
      </Card.Body>
    </Card.Root>
  );
}

export const SceneViewer = {
  Root,
  Pending,
  Error,
  LeftPanel,
  LeftPanelReference,
  BottomPanel,
  BottomPanelStack,
  ControlPanel,
};
