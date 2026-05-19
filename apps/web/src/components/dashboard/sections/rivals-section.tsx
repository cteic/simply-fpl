'use client';

import { Card, FNote, PageHeader, PageShell, SectionHeader, Text, YStack } from '@simplyfpl/ui';

export function RivalsSection() {
  return (
    <section data-testid="home-unified-rivals">
      <PageShell>
        <PageHeader
          title="Rivals"
          meta="Pick a mini-league to see the managers right next to you"
        />
        <Card paddingHorizontal={16} paddingVertical={16} marginBottom={16}>
          <YStack gap={8}>
            <SectionHeader title="League picker coming soon" />
            <Text fontFamily="$body" fontSize={13} color="$colorMuted">
              Until the in-dashboard picker ships, open any league from{' '}
              <Text render={<a href="/leagues" />} color="$color" fontFamily="$body" fontSize={13}>
                Leagues
              </Text>{' '}
              then tap into a specific one to see rivals.
            </Text>
          </YStack>
        </Card>
        <FNote>Coming in Phase 3 of the unified-home rollout.</FNote>
      </PageShell>
    </section>
  );
}
