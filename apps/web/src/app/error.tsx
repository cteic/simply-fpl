'use client';

import { useEffect } from 'react';

import { Button, FNote, PageHeader, PageShell, Text, YStack } from '@simplyfpl/ui';

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    console.error('App error boundary:', error);
  }, [error]);

  return (
    <PageShell>
      <PageHeader title="Something went wrong" meta="An unexpected error occurred" />
      <YStack gap={12} marginBottom={20}>
        <Text fontFamily="$body" fontSize={13} color="$colorMuted">
          We hit an error rendering this page. Try again, or head back to the home page.
        </Text>
        {error.message ? (
          <Text fontFamily="$body" fontSize={12} color="$colorSubtle">
            {error.message}
          </Text>
        ) : null}
        <YStack alignItems="flex-start">
          <Button tone="primary" size="md" onPress={reset}>
            Try again
          </Button>
        </YStack>
      </YStack>
      <FNote>If this keeps happening, please refresh or come back in a few minutes.</FNote>
    </PageShell>
  );
}
