import type { Metadata } from 'next';

import { ReplayView } from '@/components/views/replay-view';

const TITLE = 'Season Replay (demo)';
const DESCRIPTION =
  'Play back the 2025–26 FPL season through the live-rank dashboard. Demo / screencast surface — not linked from primary navigation.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  robots: { index: false, follow: false },
};

export default function ReplayPage() {
  return <ReplayView />;
}
