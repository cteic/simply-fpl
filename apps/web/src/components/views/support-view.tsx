'use client';

import { useTranslation } from '@simplyfpl/i18n';
import {
  Card,
  FNote,
  LegalDocument,
  PageHeader,
  PageShell,
  SectionHeader,
  Text,
  YStack,
} from '@simplyfpl/ui';

import { SUPPORT_EMAIL } from '@/content/legal/constants';
import { SUPPORT_CONTACT_BODY, SUPPORT_FAQ_SECTIONS } from '@/content/legal/support';

export function SupportView() {
  const { t } = useTranslation();
  return (
    <PageShell>
      <PageHeader tone="stadium" title={t('legal.support_title')} />

      <Card paddingHorizontal={24} paddingVertical={20} marginBottom={28}>
        <SectionHeader title={t('support.section_contact')} />
        <YStack gap={10} marginTop={8}>
          <Text fontFamily="$body" fontSize={13} lineHeight={21} color="$color">
            {SUPPORT_CONTACT_BODY}
          </Text>
          <Text
            render={<a href={`mailto:${SUPPORT_EMAIL}`} />}
            fontFamily="$mono"
            fontSize={13}
            color="$brand"
            hoverStyle={{ color: '$brandHover' }}
          >
            {SUPPORT_EMAIL}
          </Text>
        </YStack>
      </Card>

      <SectionHeader title={t('support.section_faq')} />
      <LegalDocument sections={SUPPORT_FAQ_SECTIONS} />

      <FNote>{t('common.disclaimer')}</FNote>
    </PageShell>
  );
}
