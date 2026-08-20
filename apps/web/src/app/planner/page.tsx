import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { JsonLd } from '@/components/json-ld';
import { PlannerView } from '@/components/views/planner-view';
import { FEATURE_PLANNER } from '@/lib/feature-flags';
import { buildBreadcrumbSchema } from '@/lib/structured-data';

const TITLE = 'Transfer Planner';
const DESCRIPTION =
  'Plan transfers, chips and captain picks across upcoming gameweeks. Visualise FDR, fixture swings and squad value at a glance.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/planner' },
  openGraph: { url: '/planner', type: 'website', title: TITLE, description: DESCRIPTION },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};

export default function PlannerPage() {
  if (!FEATURE_PLANNER) redirect('/');
  return (
    <>
      <JsonLd
        nodes={[
          buildBreadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: TITLE, path: '/planner' },
          ]),
        ]}
      />
      <PlannerView />
    </>
  );
}
