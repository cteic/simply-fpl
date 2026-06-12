'use client';

import { useEffect } from 'react';

import posthog from 'posthog-js';

import { Button, FNote, PageHeader, PageShell, Text, YStack } from '@simplyfpl/ui';

import { sanitizePath } from '@/lib/analytics';

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// Strips numeric segments from error messages so FPL entry/league IDs don't
// appear in PostHog exceptions.
function sanitizeMessage(message: string): string {
  return message.replace(/\b\d{4,}\b/g, ':id');
}

export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    console.error('App error boundary:', error);

    if (posthog.__loaded) {
      posthog.captureException(error, {
        properties: {
          component: 'AppErrorBoundary',
          message_hash: sanitizeMessage(error.message ?? ''),
          path: sanitizePath(window.location.pathname),
          digest: error.digest ?? null,
        },
      });
    }
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
