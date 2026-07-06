'use client';

import { ThreatsView } from '@/components/views/threats-view';

export function ThreatsSection() {
  return (
    <section data-testid="home-unified-threats">
      <ThreatsView />
    </section>
  );
}
