'use client';

import { FNote, PageHeader, PageShell, PlannerGrid, ProBanner, Text } from '@simplyfpl/ui';

import { DEMO_PLANNER_CELLS } from '../demo-data';

export function PlannerShowcase() {
  return (
    <PageShell>
      <PageHeader
        title="Transfer Planner"
        meta="Plan your squad across upcoming gameweeks"
        right={
          <Text
            fontFamily="$body"
            fontSize={11}
            fontWeight="500"
            color="$warning"
            backgroundColor="$warningBg"
            borderWidth={1}
            borderColor="$warningBorder"
            paddingHorizontal={10}
            paddingVertical={4}
            borderRadius={20}
          >
            ✦ Pro feature
          </Text>
        }
      />

      <PlannerGrid cells={DEMO_PLANNER_CELLS} />

      <ProBanner
        title="Unlock Transfer Planner with Pro"
        body="Plan transfers, chips and captain picks across the full season. €4/mo or €25/yr."
      />

      <FNote>Fixture difficulty ratings (FDR) are based on FPL&apos;s official data.</FNote>
    </PageShell>
  );
}
