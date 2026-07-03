'use client';

import { t } from '@simplyfpl/i18n';
import { Button, PageHeader, PageShell, Text, YStack } from '@simplyfpl/ui';

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function VsLivefplError({ error, reset }: ErrorBoundaryProps) {
  return (
    <PageShell>
      <PageHeader title={t('vs_livefpl.error_title')} meta={t('vs_livefpl.error_meta')} />
      <YStack gap={12} marginBottom={20}>
        <Text fontFamily="$body" fontSize={13} color="$colorMuted">
          {error.message}
        </Text>
        <YStack alignItems="flex-start">
          <Button tone="primary" size="md" onPress={reset}>
            {t('error.cta_retry')}
          </Button>
        </YStack>
      </YStack>
    </PageShell>
  );
}
