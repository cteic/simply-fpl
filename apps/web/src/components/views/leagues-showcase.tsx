'use client';

import {
  Button,
  Card,
  FNote,
  LeagueCard,
  PageHeader,
  PageShell,
  SectionHeader,
  Text,
  XStack,
  YStack,
} from '@simplyfpl/ui';

import { DEMO_GIBBINGTONS_ROWS, DEMO_WORK_LEAGUE_ROWS } from '../demo-data';

export function LeaguesShowcase() {
  return (
    <PageShell>
      <PageHeader title="My Leagues" meta="Gameweek 30 · Live standings" />

      <Card paddingHorizontal={24} paddingVertical={24} marginBottom={20}>
        <SectionHeader title="Add a league" />
        <XStack gap={10} marginTop={4}>
          <YStack
            flex={1}
            backgroundColor="$background"
            borderWidth={1}
            borderColor="$borderStrong"
            borderRadius="$3"
            paddingHorizontal={14}
            paddingVertical={9}
          >
            <Text fontFamily="$body" fontSize={12} color="$colorSubtle" letterSpacing="$6">
              Enter league ID or paste FPL league URL…
            </Text>
          </YStack>
          <Button tone="primary" size="md">
            Track League
          </Button>
        </XStack>
      </Card>

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

      <FNote>SimplyFPL is not affiliated with the Premier League or Fantasy Premier League</FNote>
    </PageShell>
  );
}
