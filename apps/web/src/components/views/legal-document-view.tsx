'use client';

import { useTranslation } from '@simplyfpl/i18n';
import { FNote, LegalDocument, PageHeader, PageShell } from '@simplyfpl/ui';
import type { LegalSection } from '@simplyfpl/ui';

import { LEGAL_LAST_UPDATED } from '@/content/legal/constants';

interface LegalDocumentViewProps {
  titleKey: 'legal.privacy_title' | 'legal.terms_title';
  sections: LegalSection[];
}

export function LegalDocumentView({ titleKey, sections }: LegalDocumentViewProps) {
  const { t } = useTranslation();
  return (
    <PageShell>
      <PageHeader
        title={t(titleKey)}
        meta={t('legal.last_updated', { date: LEGAL_LAST_UPDATED })}
      />
      <LegalDocument sections={sections} />
      <FNote>{t('common.disclaimer')}</FNote>
    </PageShell>
  );
}
