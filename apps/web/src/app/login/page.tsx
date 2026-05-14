import { redirect } from 'next/navigation';

import { LoginView } from '@/components/views/login-view';
import { FEATURE_AUTH } from '@/lib/feature-flags';

export default function LoginPage() {
  if (!FEATURE_AUTH) redirect('/');
  return <LoginView />;
}

export const metadata = {
  title: 'Sign in — SimplyFPL',
  description: 'Sign in with a magic link.',
};
