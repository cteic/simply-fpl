'use client';

import { Suspense, lazy } from 'react';

import { SkeletonLeagueTable, YStack } from '@simplyfpl/ui';

import { DashboardContainer, DashboardSection } from './dashboard-container';
import { LiveRankSection } from './sections/live-rank-section';

const ThreatsSection = lazy(() =>
  import('./sections/threats-section').then((m) => ({ default: m.ThreatsSection }))
);
const RivalsSection = lazy(() =>
  import('./sections/rivals-section').then((m) => ({ default: m.RivalsSection }))
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
          <LiveRankSection entryId={entryId} />
        </DashboardSection>
        <DashboardSection id="threats" index={1}>
          <Suspense fallback={<SectionFallback />}>
            <ThreatsSection />
          </Suspense>
        </DashboardSection>
        <DashboardSection id="rivals" index={2}>
          <Suspense fallback={<SectionFallback />}>
            <RivalsSection entryId={entryId} />
          </Suspense>
        </DashboardSection>
      </YStack>
    </DashboardContainer>
  );
}
