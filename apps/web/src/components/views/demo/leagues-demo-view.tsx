'use client';

import { FNote, LeagueCard, PageHeader, PageShell, YStack } from '@simplyfpl/ui';

import { DEMO_GIBBINGTONS_ROWS, DEMO_WORK_LEAGUE_ROWS } from '../../demo-data';

export function LeaguesDemoView() {
  return (
    <PageShell>
      <PageHeader title="My Leagues — Demo" meta="Static example data" />

      <YStack gap={10}>
        <LeagueCard
          name="The Gibbingtons"
          meta="Classic · 12 managers"
          rows={DEMO_GIBBINGTONS_ROWS}
        />
        <LeagueCard
          name="Work League 2024/25"
          meta="Classic · 28 managers"
          rows={DEMO_WORK_LEAGUE_ROWS}
        />
      </YStack>

      <FNote>
        Demo only · sign in on the live page to track your real FPL mini-leagues.
        {'\n'}SimplyFPL is not affiliated with the Premier League or Fantasy Premier League
      </FNote>
    </PageShell>
  );
}
