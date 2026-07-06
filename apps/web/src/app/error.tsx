'use client';

import { useEffect } from 'react';

import posthog from 'posthog-js';

import { t } from '@simplyfpl/i18n';
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
      <PageHeader title={t('error.title')} meta={t('error.meta')} />
      <YStack gap={12} marginBottom={20}>
        <Text fontFamily="$body" fontSize={13} color="$colorMuted">
          {t('error.body')}
        </Text>
        {error.message ? (
          <Text fontFamily="$body" fontSize={12} color="$colorSubtle">
            {error.message}
          </Text>
        ) : null}
        <YStack alignItems="flex-start">
          <Button tone="primary" size="md" onPress={reset}>
            {t('error.cta_retry')}
          </Button>
        </YStack>
      </YStack>
      <FNote>{t('error.fnote')}</FNote>
    </PageShell>
  );
}
