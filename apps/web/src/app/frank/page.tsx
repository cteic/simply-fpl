import type { Metadata } from 'next';

import { FrankView } from '@/components/views/frank-view';

export const metadata: Metadata = {
  title: 'Frank — AI FPL Coach',
  description:
    'Weekly AI-powered captain picks, transfer targets, and chip advice for your FPL team.',
};

export default function FrankPage() {
  return <FrankView />;
}
