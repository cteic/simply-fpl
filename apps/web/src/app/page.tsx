import { Suspense } from 'react';

import type { Metadata } from 'next';

import { HomeSearchView } from '@/components/views/home-search-view';

export const metadata: Metadata = {
  title: 'simply.fpl — Fastest live-rank companion for Fantasy Premier League',
  description:
    'The fastest, most reliable live-rank companion for FPL. Track your gameweek rank as it changes, watch mini-leagues update in real time, and compare head-to-head against any rival.',
};

export default function HomePage() {
  return (
    <Suspense>
      <HomeSearchView />
    </Suspense>
  );
}
