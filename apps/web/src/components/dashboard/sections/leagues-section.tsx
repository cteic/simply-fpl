'use client';

import { LeaguesShowcase } from '@/components/views/leagues-showcase';

export function LeaguesSection() {
  return (
    <section data-testid="home-unified-leagues">
      <LeaguesShowcase />
    </section>
  );
}
