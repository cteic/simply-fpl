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

const { filterThreatsByStatus, resolveThreats } = threatsNs;

const STATUS_FILTERS: ReadonlyArray<{ label: string; value: ThreatStatusFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Playing', value: 'playing' },
  { label: 'To play', value: 'to-play' },
  { label: 'Played', value: 'played' },
  { label: "Didn't play", value: 'didnt-play' },
];

const EMPTY_THREATS: Threat[] = [];

const POSITION_TO_SHIRT: Record<ThreatPosition, ShirtKind> = {
  gk: 'gk',
  def: 'def',
  mid: 'mid',
  fwd: 'fwd',
};

/** Rows shown before the list is cut off. Past this the impact is negligible. */
const MAX_ROWS = 20;

interface ThreatRowProps {
  threat: Threat;
  last: boolean;
}

function StatCell({ value, label }: { value: string; label: string }) {
  return (
    <YStack alignItems="flex-end" width={46}>
      <Text fontFamily="$mono" fontSize={13} fontWeight="500" color="$color" numberOfLines={1}>
        {value}
      </Text>
      <Text
        fontFamily="$body"
        fontSize={8.5}
        fontWeight="600"
        textTransform="uppercase"
        letterSpacing={0.6}
        color="$colorSubtle"
        numberOfLines={1}
      >
        {label}
      </Text>
    </YStack>
  );
}

function ThreatRow({ threat, last }: ThreatRowProps) {
  const isGoalkeeper = threat.position === 'gk';
  const kitUrl = threat.teamCode > 0 ? getKitUrl(threat.teamCode, { isGoalkeeper }) : undefined;
  const clubColor = getClubColor(threat.teamShort);
  const lostLabel =
    threat.pointsLostToThreat > 0 ? `\u2212${threat.pointsLostToThreat.toFixed(1)}` : '0.0';

  // Four stat columns at a fixed 52pt each left the name column about 30pt on
  // a phone, so "Haaland" rendered as "H\u2026" and the club line wrapped one word
  // per row. Score% is dropped here because it is the lost column divided by a
  // constant, and the name gets the space.
  return (
    <XStack
      paddingHorizontal={12}
      paddingVertical={8}
      alignItems="center"
      gap={8}
      borderBottomWidth={last ? 0 : 1}
      borderBottomColor="$border"
    >
      <Shirt kind={POSITION_TO_SHIRT[threat.position]} kitUrl={kitUrl} />
      <YStack flex={1} minWidth={96}>
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
          <Text fontFamily="$body" fontSize={11} color="$colorSubtle" numberOfLines={1}>
            {`${threat.teamShort} \u00b7 ${threat.position.toUpperCase()} \u00b7 ${threat.livePoints} pts`}
          </Text>
        </XStack>
      </YStack>
      <StatCell value={`${threat.effectiveOwnershipPct.toFixed(0)}%`} label="owned" />
      <StatCell value={lostLabel} label="lost" />
      <StatCell value={`\u2212${threat.liveRankImpactIfTheyHaul.toFixed(1)}`} label="if 8 pt" />
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

  const resolved = useMemo(() => {
    if (!bootstrap || !liveGw || !yourPicks || currentGw === null) return null;
    return resolveThreats({
      yourPicks,
      cohort,
      bootstrap,
      liveGw,
      fixtures: fixtures ?? [],
      gw: currentGw,
    });
  }, [cohort, bootstrap, liveGw, yourPicks, fixtures, currentGw]);

  const rows = resolved?.threats ?? EMPTY_THREATS;
  const visibleRows = useMemo(
    () => filterThreatsByStatus(rows, statusFilter).slice(0, MAX_ROWS),
    [rows, statusFilter]
  );

  let meta = 'Save a team on Home to see who can hurt your rank';
  if (entryId !== null) {
    meta = `GW${currentGw ?? '\u2014'} \u00b7 players you don\u2019t own, ranked by the rank they can cost you`;
  }

  let emptyMessage = 'No threats match this filter.';
  if (entryId === null) emptyMessage = 'Save a team on the Home tab to see your threats.';
  else if (resolved === null) emptyMessage = 'Loading your threats\u2026';

  let footnote = '';
  if (resolved?.source === 'top_10k') {
    footnote = 'Ownership and captaincy from a top-10k sample. Live points refresh every 60s.';
  } else if (resolved?.source === 'field') {
    footnote =
      'Ownership is FPL\u2019s overall figure for every squad, so captaincy is not counted. Live points refresh every 60s.';
  }

  return (
    <Screen testID="screen-threats" topInset>
      <PageHeader compact tone="stadium" title="Threats" meta={meta} />

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
              {emptyMessage}
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

      {footnote ? <FNote>{footnote}</FNote> : null}
    </Screen>
  );
}
