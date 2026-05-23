'use client';

import { Suspense, lazy } from 'react';

import { SkeletonLeagueTable, YStack } from '@simplyfpl/ui';

import { DashboardContainer, DashboardSection } from './dashboard-container';

const LiveRankSection = lazy(() =>
  import('./sections/live-rank-section').then((m) => ({ default: m.LiveRankSection }))
);
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

function SectionFallback() {
  return (
    <YStack paddingHorizontal={28} paddingVertical={32} $sm={{ paddingHorizontal: 16 }}>
      <SkeletonLeagueTable />
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
        <DashboardSection id="live-rank" fillViewport index={0}>
          <Suspense fallback={<SectionFallback />}>
            <LiveRankSection entryId={entryId} />
          </Suspense>
        </DashboardSection>
        <DashboardSection id="effective-ownership" index={1}>
          <Suspense fallback={<SectionFallback />}>
            <EffectiveOwnershipSection />
          </Suspense>
        </DashboardSection>
        <DashboardSection id="threats" index={2}>
          <Suspense fallback={<SectionFallback />}>
            <ThreatsSection />
          </Suspense>
        </DashboardSection>
        <DashboardSection id="rivals" index={3}>
          <Suspense fallback={<SectionFallback />}>
            <RivalsSection entryId={entryId} />
          </Suspense>
        </DashboardSection>
        <DashboardSection id="leagues" index={4}>
          <Suspense fallback={<SectionFallback />}>
            <LeaguesSection />
          </Suspense>
        </DashboardSection>
      </YStack>
    </DashboardContainer>
  );
}
