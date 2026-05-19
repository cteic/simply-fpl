import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { LoginView } from '@/components/views/login-view';
import { FEATURE_AUTH } from '@/lib/feature-flags';

const TITLE = 'Sign in';
const DESCRIPTION = 'Sign in to SimplyFPL with a magic link.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/login' },
  robots: { index: false, follow: false },
  openGraph: { url: '/login', type: 'website', title: TITLE, description: DESCRIPTION },
  twitter: { card: 'summary', title: TITLE, description: DESCRIPTION },
};

export default function LoginPage() {
  if (!FEATURE_AUTH) redirect('/');
  return <LoginView />;
}
