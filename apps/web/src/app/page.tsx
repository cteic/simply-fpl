import { Suspense } from 'react';

import { HomeSearchView } from '@/components/views/home-search-view';

export default function HomePage() {
  return (
    <Suspense>
      <HomeSearchView />
    </Suspense>
  );
}
