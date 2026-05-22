'use client';

import { Text, XStack } from '@simplyfpl/ui';

import { useBootstrapStatus } from '@/queries/fpl';

export function StaleDataBanner() {
  const { isStale } = useBootstrapStatus();

  if (!isStale) return null;

  return (
    <XStack
      role="status"
      backgroundColor="$warningBg"
      borderBottomWidth={1}
      borderBottomColor="$warningBorder"
      paddingHorizontal={28}
      paddingVertical={7}
      alignItems="center"
      justifyContent="center"
      gap={8}
      $sm={{ paddingHorizontal: 16 }}
    >
      <Text fontFamily="$body" fontSize={11.5} fontWeight="500" color="$warning" textAlign="center">
        Live updates paused — showing last data
      </Text>
    </XStack>
  );
}
