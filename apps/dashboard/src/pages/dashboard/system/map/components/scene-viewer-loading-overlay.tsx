import type { HTMLChakraProps } from '@chakra-ui/react';
import { Stack, Text } from '@chakra-ui/react';
import { Pending } from '@/components/pending';
import { useSceneViewerLoadingOverlay } from './use-scene-viewer';

export interface SceneViewerLoadingOverlayProps extends HTMLChakraProps<'div'> {
  loadStatus?: 'success' | 'loading' | 'error';
  title?: string;
  description?: string;
}

export function SceneViewerLoadingOverlay(
  props: SceneViewerLoadingOverlayProps,
) {
  const {
    loadStatus: loadStatusExternal,
    title: titleExternal,
    description: descriptionExternal,
    color,
    ...rest
  } = props;

  const { loadStatus: loadStatusCtx, loadMessage: loadMessageCtx } =
    useSceneViewerLoadingOverlay();

  const loadStatus = loadStatusExternal ?? loadStatusCtx;
  const title = titleExternal ?? loadMessageCtx?.title;
  const description = titleExternal ?? loadMessageCtx?.description;

  const loadingColor = color ?? { base: 'gray.700', _dark: 'gray.400' };

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
            <Stack align="center" zIndex={10} gap="5px">
              <Text fontWeight="semibold" color={loadingColor}>
                {title}
              </Text>

              <Text fontSize="sm" pb="10px" color={loadingColor}>
                {description}
              </Text>
            </Stack>
          )}
        </Pending.Root>
      )}
    </>
  );
}
