import Link from 'next/link';

import { t } from '@simplyfpl/i18n';
import { Button, FNote, PageHeader, PageShell, Text, XStack, YStack } from '@simplyfpl/ui';

export const runtime = 'edge';
export const dynamic = 'force-static';

export default function NotFound() {
  return (
    <PageShell>
      <PageHeader title={t('error.not_found_title')} meta="404" />
      <YStack gap={12} marginBottom={20}>
        <Text fontFamily="$body" fontSize={13} color="$colorMuted">
          {t('error.not_found_body')}
        </Text>
        <XStack>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Button tone="primary" size="md">
              {t('error.back_to_home')}
            </Button>
          </Link>
        </XStack>
      </YStack>
      <FNote>{t('common.disclaimer')}</FNote>
    </PageShell>
  );
}
