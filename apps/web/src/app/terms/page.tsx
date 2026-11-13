import type { Metadata } from 'next';

import { LegalDocumentView } from '@/components/views/legal-document-view';
import { TERMS_OF_SERVICE_SECTIONS } from '@/content/legal/terms-of-service';

const TITLE = 'Terms of Service';
const DESCRIPTION =
  'The terms for using SimplyFPL: free and paid tiers, subscriptions and cancellation, acceptable use, and the limits of live rank accuracy.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return <LegalDocumentView titleKey="legal.terms_title" sections={TERMS_OF_SERVICE_SECTIONS} />;
}
