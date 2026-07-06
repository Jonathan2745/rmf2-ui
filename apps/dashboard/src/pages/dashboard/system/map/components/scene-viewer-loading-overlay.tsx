import type { HTMLChakraProps } from '@chakra-ui/react';
import { Stack, Text } from '@chakra-ui/react';
import { Pending } from '@/components/pending';

export interface SceneViewerLoadingOverlayProps extends HTMLChakraProps<'div'> {
  loadStatus: 'success' | 'loading' | 'error';
  title: string;
  description: string;
}

export function SceneViewerLoadingOverlay(
  props: SceneViewerLoadingOverlayProps,
) {
  const { loadStatus, title, description, color, ...rest } = props;
  const loadingColor = color ?? { base: 'gray.700', _dark: 'gray.400' };

  const message = 'unknown error';

  return (
    <>
      {loadStatus != 'success' && (
        <Pending.Root {...rest}>
          <Pending.Overlay />
          {loadStatus == 'loading' && (
            <Stack align="center" zIndex={10} gap="5px">
              <Text fontWeight="semibold" color={loadingColor}>
                {title}
              </Text>

              <Text fontSize="sm" pb="10px" color={loadingColor}>
                {description}
              </Text>
              <Pending.Spinner color={loadingColor} />
            </Stack>
          )}
          {loadStatus == 'error' && (
            <Text color="fg.error" zIndex={10} textAlign="center">
              {message}
            </Text>
          )}
        </Pending.Root>
      )}
    </>
  );
}
