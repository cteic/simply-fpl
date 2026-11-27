import type { Metadata } from 'next';

import { JsonLd } from '@/components/json-ld';
import { HomeChooser } from '@/components/views/home-chooser';
import { SAVED_ENTRY_HINT_SCRIPT } from '@/components/views/saved-entry-hint';
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/site-url';
import { buildWebApplicationSchema } from '@/lib/structured-data';

const TITLE = 'SimplyFPL — Live FPL Rank & Mini-League Tracker';

export const metadata: Metadata = {
  title: TITLE,
  description: SITE_DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: { url: '/', type: 'website', title: SITE_NAME, description: SITE_DESCRIPTION },
  twitter: { card: 'summary_large_image', title: SITE_NAME, description: SITE_DESCRIPTION },
};

export default function HomePage() {
  return (
    <>
      <JsonLd nodes={[buildWebApplicationSchema()]} />
      <script dangerouslySetInnerHTML={{ __html: SAVED_ENTRY_HINT_SCRIPT }} />
      <HomeChooser />
    </>
  );
}
