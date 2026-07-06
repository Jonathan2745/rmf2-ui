import type { HTMLChakraProps } from '@chakra-ui/react';
import { Stack, Text } from '@chakra-ui/react';
import { Pending } from '@/components/pending';

export interface SceneViewerLoadingProps extends HTMLChakraProps<'div'> {
  isLoading: boolean;
  title: string;
  description: string;
}

export function SceneViewerLoading(props: SceneViewerLoadingProps) {
  const { isLoading, title, description, color, ...rest } = props;
  const loadingColor = color ?? { base: 'gray.700', _dark: 'gray.400' };

  return (
    <>
      {isLoading && (
        <Pending.Root {...rest}>
          <Pending.Overlay />
          <Stack align="center" gap="5px">
            <Text fontWeight="semibold" zIndex={10} color={loadingColor}>
              {title}
            </Text>

            <Text fontSize="sm" zIndex={10} pb="10px" color={loadingColor}>
              {description}
            </Text>
            <Pending.Spinner color={loadingColor} />
          </Stack>
        </Pending.Root>
      )}
    </>
  );
}
