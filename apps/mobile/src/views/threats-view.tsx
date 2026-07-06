import { useMemo, useState } from 'react';

import { threats as threatsNs } from '@simplyfpl/features';
import type { Threat, ThreatPosition, ThreatStatusFilter } from '@simplyfpl/features/threats';
import { getClubColor, getCurrentGameweek, getKitUrl } from '@simplyfpl/fpl-client';
import {
  Card,
  FNote,
  FilterButton,
  PageHeader,
  SectionHeader,
  Shirt,
  Text,
  XStack,
  YStack,
} from '@simplyfpl/ui';
import type { ShirtKind } from '@simplyfpl/ui';

import { Screen } from '@/components/screen';
import { useSavedEntryId } from '@/lib/saved-team';
import { useCohortAggregates } from '@/queries/cohort-aggregates';
import { useBootstrap, useEntryPicks, useFixtures, useLiveGameweek } from '@/queries/fpl';

const { computeThreats, filterThreatsByStatus } = threatsNs;

const STATUS_FILTERS: ReadonlyArray<{ label: string; value: ThreatStatusFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Playing', value: 'playing' },
  { label: 'To play', value: 'to-play' },
  { label: 'Played', value: 'played' },
  { label: "Didn't play", value: 'didnt-play' },
];

const POSITION_TO_SHIRT: Record<ThreatPosition, ShirtKind> = {
  gk: 'gk',
  def: 'def',
  mid: 'mid',
  fwd: 'fwd',
};

const PLACEHOLDER_THREATS: Threat[] = [
  {
    elementId: 351,
    name: 'Haaland',
    teamShort: 'MCI',
    teamCode: 43,
    position: 'fwd',
    ownedByCount: 78,
    ownedByPct: 78,
    captainPct: 41,
    effectiveOwnershipPct: 119,
    livePoints: 13,
    minutes: 90,
    liveRankImpactIfTheyHaul: 9.52,
    pointsLostToThreat: 15.47,
    scorePct: 26,
    playingStatus: 'played',
  },
  {
    elementId: 328,
    name: 'M.Salah',
    teamShort: 'LIV',
    teamCode: 14,
    position: 'mid',
    ownedByCount: 52,
    ownedByPct: 52,
    captainPct: 18,
    effectiveOwnershipPct: 70,
    livePoints: 9,
    minutes: 90,
    liveRankImpactIfTheyHaul: 6.1,
    pointsLostToThreat: 8.2,
    scorePct: 18,
    playingStatus: 'played',
  },
];

interface ThreatRowProps {
  threat: Threat;
  last: boolean;
}

function ThreatRow({ threat, last }: ThreatRowProps) {
  const isGoalkeeper = threat.position === 'gk';
  const kitUrl = threat.teamCode > 0 ? getKitUrl(threat.teamCode, { isGoalkeeper }) : undefined;
  const clubColor = getClubColor(threat.teamShort);
  const scoreLabel = threat.scorePct === null ? '—' : `${threat.scorePct.toFixed(0)}%`;
  const lostLabel =
    threat.pointsLostToThreat > 0 ? `−${threat.pointsLostToThreat.toFixed(1)}` : '0.0';

  return (
    <XStack
      paddingHorizontal={16}
      paddingVertical={12}
      alignItems="center"
      gap={12}
      borderBottomWidth={last ? 0 : 1}
      borderBottomColor="$border"
    >
      <Shirt kind={POSITION_TO_SHIRT[threat.position]} kitUrl={kitUrl} />
      <YStack flex={1} minWidth={0}>
        <Text fontFamily="$body" fontSize={13} fontWeight="500" color="$color" numberOfLines={1}>
          {threat.name}
        </Text>
        <XStack alignItems="center" gap={4}>
          {clubColor !== undefined ? (
            <YStack
              width={7}
              height={7}
              borderRadius={4}
              backgroundColor={clubColor}
              flexShrink={0}
            />
          ) : null}
          <Text fontFamily="$body" fontSize={11} color="$colorSubtle">
            {threat.teamShort} · {threat.position.toUpperCase()} · {threat.ownedByPct.toFixed(0)}%
            own
          </Text>
        </XStack>
      </YStack>
      <YStack alignItems="flex-end" minWidth={52}>
        <Text fontFamily="$mono" fontSize={13} fontWeight="500" color="$color">
          {threat.effectiveOwnershipPct.toFixed(0)}%
        </Text>
        <Text
          fontFamily="$body"
          fontSize={9}
          fontWeight="600"
          textTransform="uppercase"
          letterSpacing={1}
          color="$colorSubtle"
        >
          EO
        </Text>
      </YStack>
      <YStack alignItems="flex-end" minWidth={52}>
        <Text fontFamily="$mono" fontSize={13} fontWeight="500" color="$color">
          {scoreLabel}
        </Text>
        <Text
          fontFamily="$body"
          fontSize={9}
          fontWeight="600"
          textTransform="uppercase"
          letterSpacing={1}
          color="$colorSubtle"
        >
          score%
        </Text>
      </YStack>
      <YStack alignItems="flex-end" minWidth={52}>
        <Text fontFamily="$mono" fontSize={13} fontWeight="500" color="$color">
          {lostLabel}
        </Text>
        <Text
          fontFamily="$body"
          fontSize={9}
          fontWeight="600"
          textTransform="uppercase"
          letterSpacing={1}
          color="$colorSubtle"
        >
          lost
        </Text>
      </YStack>
      <YStack alignItems="flex-end" minWidth={52}>
        <Text fontFamily="$mono" fontSize={13} fontWeight="500" color="$color">
          −{threat.liveRankImpactIfTheyHaul.toFixed(1)}
        </Text>
        <Text
          fontFamily="$body"
          fontSize={9}
          fontWeight="600"
          textTransform="uppercase"
          letterSpacing={1}
          color="$colorSubtle"
        >
          if 8 pt
        </Text>
      </YStack>
    </XStack>
  );
}

export function ThreatsView() {
  const { entryId } = useSavedEntryId();
  const [statusFilter, setStatusFilter] = useState<ThreatStatusFilter>('all');

  const { data: bootstrap } = useBootstrap();
  const currentGw = useMemo(() => (bootstrap ? getCurrentGameweek(bootstrap) : null), [bootstrap]);
  const aggregates = useCohortAggregates(currentGw);
  const cohort = aggregates?.tiers.top_10k;
  const { data: yourPicks } = useEntryPicks(entryId ?? 0, entryId === null ? null : currentGw);
  const { data: liveGw } = useLiveGameweek(currentGw);
  const { data: fixtures } = useFixtures(currentGw);

  const rows = useMemo<Threat[]>(() => {
    if (cohort && bootstrap && liveGw && yourPicks) {
      return computeThreats({
        yourPicks,
        cohort,
        bootstrap,
        liveGw,
        fixtures: fixtures ?? [],
      });
    }
    return PLACEHOLDER_THREATS;
  }, [cohort, bootstrap, liveGw, yourPicks, fixtures]);

  const visibleRows = useMemo(
    () => filterThreatsByStatus(rows, statusFilter),
    [rows, statusFilter]
  );

  const headline = entryId === null ? 'Save a team on Home to personalise' : `For team ${entryId}`;

  return (
    <Screen topInset>
      <PageHeader
        tone="stadium"
        title="Threats"
        meta={`${headline} · GW${currentGw ?? '—'} · Players nearby managers own that you don't`}
      />

      <XStack gap={8} flexWrap="wrap">
        {STATUS_FILTERS.map((f) => (
          <FilterButton
            key={f.value}
            active={f.value === statusFilter}
            onPress={() => setStatusFilter(f.value)}
          >
            {f.label}
          </FilterButton>
        ))}
      </XStack>

      <Card paddingHorizontal={0} paddingVertical={0}>
        <YStack paddingHorizontal={16} paddingTop={14} paddingBottom={8}>
          <SectionHeader title={`Top threats (${visibleRows.length})`} />
        </YStack>
        {visibleRows.length === 0 ? (
          <YStack paddingHorizontal={16} paddingVertical={28} alignItems="center">
            <Text fontFamily="$body" fontSize={12} color="$colorSubtle">
              No threats match this filter.
            </Text>
          </YStack>
        ) : (
          <YStack>
            {visibleRows.map((row, idx) => (
              <ThreatRow key={row.elementId} threat={row} last={idx === visibleRows.length - 1} />
            ))}
          </YStack>
        )}
      </Card>

      <FNote>
        {cohort !== undefined
          ? 'Live GW points refresh every 60s. EO and rank impact based on top-10k cohort.'
          : 'Save a team on the Home tab to see your personal threats.'}
      </FNote>
    </Screen>
  );
}
