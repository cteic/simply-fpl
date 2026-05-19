'use client';

import { EffectiveOwnershipView } from '@/components/views/effective-ownership-view';

export function EffectiveOwnershipSection() {
  return (
    <section data-testid="home-unified-effective-ownership">
      <EffectiveOwnershipView />
    </section>
  );
}
