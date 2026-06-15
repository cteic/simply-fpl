'use client';

import { Button, PageHeader, PageShell, Text, YStack } from '@simplyfpl/ui';

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function VsLivefplError({ error, reset }: ErrorBoundaryProps) {
  return (
    <PageShell>
      <PageHeader title="Could not load comparison" meta="Speed data unavailable" />
      <YStack gap={12} marginBottom={20}>
        <Text fontFamily="$body" fontSize={13} color="$colorMuted">
          {error.message}
        </Text>
        <YStack alignItems="flex-start">
          <Button tone="primary" size="md" onPress={reset}>
            Try again
          </Button>
        </YStack>
      </YStack>
    </PageShell>
  );
}
