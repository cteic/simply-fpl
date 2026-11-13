'use client';

import { useState } from 'react';

import { ads } from '@simplyfpl/features';
import { t } from '@simplyfpl/i18n';
import { AdSlot, Button, Card, LeagueCard, LeagueTable, Text, XStack, YStack } from '@simplyfpl/ui';
import type { LeagueTableRow } from '@simplyfpl/ui';

import { FEATURE_SCOUT } from '@/lib/feature-flags';
import { useClassicLeague } from '@/queries/fpl';

const AD_FREQUENCY = 8;

interface TrackedLeagueCardProps {
  leagueId: number;
  myEntryId?: number;
}

export function TrackedLeagueCard({ leagueId, myEntryId }: TrackedLeagueCardProps) {
  const adFree = ads.useAdFree();
  const { data, isLoading, error } = useClassicLeague(leagueId);
  const [expanded, setExpanded] = useState(false);

  if (isLoading) {
    return (
      <Card paddingHorizontal={16} paddingVertical={13}>
        <Text fontFamily="$body" fontSize={12} color="$colorSubtle">
          {t('league_card.loading', { leagueId })}
        </Text>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card paddingHorizontal={16} paddingVertical={13}>
        <YStack gap={4}>
          <Text fontFamily="$body" fontSize={13} color="$danger">
            {t('league_card.error', { leagueId })}
          </Text>
          <Text fontFamily="$body" fontSize={11} color="$colorSubtle">
            {error instanceof Error ? error.message : 'Unknown error'}
          </Text>
        </YStack>
      </Card>
    );
  }

  if (data.standings.results.length === 0) {
    return (
      <Card paddingHorizontal={16} paddingVertical={13}>
        <YStack gap={4}>
          <Text fontFamily="$body" fontSize={13} fontWeight="600" color="$color">
            {data.league.name}
          </Text>
          <Text fontFamily="$body" fontSize={12} color="$colorSubtle">
            {t('league_card.empty')}
          </Text>
        </YStack>
      </Card>
    );
  }

  const totalRows = data.standings.results.length;
  const visible =
    expanded || totalRows <= 10 ? data.standings.results : data.standings.results.slice(0, 10);

  const rows: LeagueTableRow[] = visible.map((row) => ({
    position: row.rank,
    managerName: row.player_name,
    teamName: row.entry_name,
    entryId: row.entry,
    isYou: myEntryId !== undefined && row.entry === myEntryId,
    gwScore: row.event_total,
    totalPoints: row.total,
  }));

  const onRowClick =
    myEntryId !== undefined
      ? (theirEntryId: number) => {
          window.location.href = `/h2h/${myEntryId}/${theirEntryId}`;
        }
      : undefined;

  const chunks: LeagueTableRow[][] = [];
  for (let i = 0; i < rows.length; i += AD_FREQUENCY) {
    chunks.push(rows.slice(i, i + AD_FREQUENCY));
  }

  return (
    <YStack gap={6}>
      {chunks.map((chunk, idx) =>
        idx === 0 ? (
          <LeagueCard
            key={idx}
            name={data.league.name}
            meta={`Classic · ${totalRows} managers`}
            rows={chunk}
            {...(onRowClick !== undefined ? { onRowClick } : {})}
          />
        ) : (
          <YStack key={idx} gap={6}>
            <AdSlot placement="leagues-row" minHeight={120} adFree={adFree} />
            <Card>
              <LeagueTable rows={chunk} {...(onRowClick !== undefined ? { onRowClick } : {})} />
            </Card>
          </YStack>
        )
      )}
      <XStack gap={8}>
        <Button
          tone="primary"
          size="sm"
          onPress={() => {
            window.location.href = `/rivals/${leagueId}`;
          }}
        >
          {t('league_card.cta_rivals')}
        </Button>
        {FEATURE_SCOUT ? (
          <Button
            tone="ghost"
            size="sm"
            onPress={() => {
              window.location.href = `/press/${leagueId}`;
            }}
          >
            {t('league_card.cta_press')}
          </Button>
        ) : null}
        {totalRows > 10 ? (
          <Button tone="ghost" size="sm" onPress={() => setExpanded((v: boolean) => !v)}>
            {expanded
              ? t('league_card.show_top_10')
              : t('league_card.show_all', { count: totalRows })}
          </Button>
        ) : null}
      </XStack>
    </YStack>
  );
}
