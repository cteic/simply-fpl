'use client';

import { useEffect } from 'react';

import { t } from '@simplyfpl/i18n';
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
