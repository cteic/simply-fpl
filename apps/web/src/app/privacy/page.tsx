import type { Metadata } from 'next';

import { LegalDocumentView } from '@/components/views/legal-document-view';
import { PRIVACY_POLICY_SECTIONS } from '@/content/legal/privacy-policy';

const TITLE = 'Privacy Policy';
const DESCRIPTION =
  'How SimplyFPL collects, uses and protects your data: what we store, who processes it, how long we keep it, and your GDPR rights.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return <LegalDocumentView titleKey="legal.privacy_title" sections={PRIVACY_POLICY_SECTIONS} />;
}
