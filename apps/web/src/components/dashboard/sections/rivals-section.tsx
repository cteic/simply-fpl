'use client';

import { useMemo, useState } from 'react';

import { t } from '@simplyfpl/i18n';
import type { FplEntryLeague } from '@simplyfpl/types';
import {
  Card,
  FNote,
  FilterButton,
  PageHeader,
  PageShell,
  SkeletonLeagueTable,
  Text,
  XStack,
  YStack,
} from '@simplyfpl/ui';

import { RivalsInner } from '@/components/views/rivals-view';
import { useEntry } from '@/queries/fpl';

const GLOBAL_LEAGUE_MAX = 320;

function pickableLeagues(leagues: FplEntryLeague[]): FplEntryLeague[] {
  return leagues.filter((league) => league.id > GLOBAL_LEAGUE_MAX);
}

interface RivalsSectionProps {
  entryId: number;
}

export function RivalsSection({ entryId }: RivalsSectionProps) {
  const { data: entry, isLoading } = useEntry(entryId);
  const [selectedLeagueId, setSelectedLeagueId] = useState<number | null>(null);

  const leagues = useMemo(
    () => pickableLeagues(entry?.leagues?.classic ?? []),
    [entry?.leagues?.classic]
  );
  const activeLeagueId = selectedLeagueId ?? leagues[0]?.id ?? null;

  if (isLoading) {
    return (
      <section data-testid="home-unified-rivals">
        <PageShell>
          <PageHeader title={t('rivals.title')} meta={t('rivals_section.loading_meta')} />
          <SkeletonLeagueTable />
        </PageShell>
      </section>
    );
  }

  if (leagues.length === 0) {
    return (
      <section data-testid="home-unified-rivals">
        <PageShell>
          <PageHeader title={t('rivals.title')} meta={t('rivals_section.empty_meta')} />
          <Card paddingHorizontal={16} paddingVertical={14}>
            <Text fontFamily="$body" fontSize={13} color="$colorMuted">
              Join a classic mini-league in the FPL app to see the managers right next to you.
            </Text>
          </Card>
          <FNote>
            Only invitational mini-leagues are shown — global leagues are too large to rank.
          </FNote>
        </PageShell>
      </section>
    );
  }

  return (
    <section data-testid="home-unified-rivals">
      <PageShell>
        <YStack gap={10}>
          <Text
            fontFamily="$body"
            fontSize={11}
            fontWeight="600"
            color="$colorSubtle"
            textTransform="uppercase"
            letterSpacing={1.2}
          >
            Your leagues
          </Text>
          <XStack gap={8} flexWrap="wrap" data-testid="home-unified-rivals-picker">
            {leagues.map((league) => (
              <FilterButton
                key={league.id}
                active={league.id === activeLeagueId}
                onPress={() => setSelectedLeagueId(league.id)}
              >
                {league.name}
              </FilterButton>
            ))}
          </XStack>
        </YStack>
      </PageShell>
      {activeLeagueId !== null ? (
        <RivalsInner leagueId={activeLeagueId} userEntryId={entryId} />
      ) : null}
    </section>
  );
}
