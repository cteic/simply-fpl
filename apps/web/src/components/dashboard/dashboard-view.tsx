'use client';

import { Suspense, lazy } from 'react';

import { Text, YStack } from '@simplyfpl/ui';

import { DashboardContainer, DashboardSection } from './dashboard-container';
import { LiveRankSection } from './sections/live-rank-section';

const ThreatsSection = lazy(() =>
  import('./sections/threats-section').then((m) => ({ default: m.ThreatsSection }))
);
const EffectiveOwnershipSection = lazy(() =>
  import('./sections/effective-ownership-section').then((m) => ({
    default: m.EffectiveOwnershipSection,
  }))
);
const RivalsSection = lazy(() =>
  import('./sections/rivals-section').then((m) => ({ default: m.RivalsSection }))
);
const LeaguesSection = lazy(() =>
  import('./sections/leagues-section').then((m) => ({ default: m.LeaguesSection }))
);

function SectionFallback({ label }: { label: string }) {
  return (
    <YStack paddingVertical={24} alignItems="center">
      <Text fontFamily="$body" fontSize={12} color="$colorSubtle">
        Loading {label}…
      </Text>
    </YStack>
  );
}

interface DashboardViewProps {
  entryId: number;
}

export function DashboardView({ entryId }: DashboardViewProps) {
  return (
    <DashboardContainer>
      <YStack data-testid="home-unified-dashboard">
        <DashboardSection id="live-rank" fillViewport>
          <LiveRankSection entryId={entryId} />
        </DashboardSection>
        <DashboardSection id="effective-ownership">
          <Suspense fallback={<SectionFallback label="cohort comparison" />}>
            <EffectiveOwnershipSection />
          </Suspense>
        </DashboardSection>
        <DashboardSection id="threats">
          <Suspense fallback={<SectionFallback label="threats" />}>
            <ThreatsSection />
          </Suspense>
        </DashboardSection>
        <DashboardSection id="rivals">
          <Suspense fallback={<SectionFallback label="rivals" />}>
            <RivalsSection entryId={entryId} />
          </Suspense>
        </DashboardSection>
        <DashboardSection id="leagues">
          <Suspense fallback={<SectionFallback label="leagues" />}>
            <LeaguesSection />
          </Suspense>
        </DashboardSection>
      </YStack>
    </DashboardContainer>
  );
}
