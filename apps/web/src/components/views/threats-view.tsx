'use client';

import { useEffect, useMemo, useState } from 'react';

import { threats as threatsNs } from '@simplyfpl/features';
import type { Threat, ThreatPosition, ThreatStatusFilter } from '@simplyfpl/features/threats';
import { getClubColor, getCurrentGameweek, getKitUrl } from '@simplyfpl/fpl-client';
import { t } from '@simplyfpl/i18n';
import {
  Card,
  FilterButton,
  FNote,
  PageHeader,
  PageShell,
  SectionHeader,
  Shirt,
  styled,
  Text,
  XStack,
  YStack,
} from '@simplyfpl/ui';
import type { ShirtKind } from '@simplyfpl/ui';

import { useCohortAggregates } from '@/queries/cohort-aggregates';
import { useBootstrap, useEntryPicks, useFixtures, useLiveGameweek } from '@/queries/fpl';

const { filterThreatsByStatus, resolveThreats } = threatsNs;

const STATUS_FILTERS: ReadonlyArray<{ label: string; value: ThreatStatusFilter }> = [
  { label: t('threats.filter_all'), value: 'all' },
  { label: t('threats.filter_playing'), value: 'playing' },
  { label: t('threats.filter_to_play'), value: 'to-play' },
  { label: t('threats.filter_played'), value: 'played' },
  { label: t('threats.filter_didnt_play'), value: 'didnt-play' },
];

const STORAGE_KEY = 'simplyfpl:lastEntryId';

const EMPTY_THREATS: Threat[] = [];

/** Rows shown before the list is cut off. Past this the impact is negligible. */
const MAX_ROWS = 25;

const POSITION_TO_SHIRT: Record<ThreatPosition, ShirtKind> = {
  gk: 'gk',
  def: 'def',
  mid: 'mid',
  fwd: 'fwd',
};

function readSavedEntryId(): number | null {
  if (typeof window === 'undefined') return null;
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (!saved) return null;
  const parsed = Number(saved);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

export function ThreatsView() {
  const [entryId, setEntryId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<ThreatStatusFilter>('all');
  useEffect(() => {
    setEntryId(readSavedEntryId());
  }, []);

  const { data: bootstrap } = useBootstrap();
  const currentGw = useMemo(() => (bootstrap ? getCurrentGameweek(bootstrap) : null), [bootstrap]);
  const { data: aggregates } = useCohortAggregates(currentGw);
  const cohort = aggregates?.tiers.top_10k;
  const { data: yourPicks } = useEntryPicks(entryId ?? 0, entryId === null ? null : currentGw);
  const { data: liveGw } = useLiveGameweek(currentGw);
  const { data: fixtures } = useFixtures(currentGw);

  // Real ownership or nothing. This used to fall back to invented rows, with
  // made-up players and percentages, whenever the sampled cohort was missing.
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

  const meta =
    entryId === null
      ? t('threats.meta_no_team')
      : t('threats.meta_team', { gw: currentGw ?? '\u2014' });

  let emptyMessage = t('threats.empty_filter');
  if (entryId === null) emptyMessage = t('threats.empty_no_team');
  else if (resolved === null) emptyMessage = t('threats.empty_loading');

  let footnote = '';
  if (resolved?.source === 'top_10k') footnote = t('threats.note_top10k');
  else if (resolved?.source === 'field') footnote = t('threats.note_field');

  return (
    <PageShell>
      <PageHeader tone="stadium" title={t('threats.title')} meta={meta} />

      <XStack gap={8} flexWrap="wrap" marginBottom={16}>
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

      <Card paddingHorizontal={0} paddingVertical={0} marginBottom={16}>
        <YStack paddingHorizontal={16} paddingTop={14} paddingBottom={8}>
          <SectionHeader title={t('threats.section_top', { count: visibleRows.length })} />
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
    </PageShell>
  );
}

const Row = styled(XStack, {
  paddingHorizontal: 16,
  paddingVertical: 12,
  alignItems: 'center',
  gap: 12,
  borderBottomWidth: 1,
  borderBottomColor: '$border',
  variants: {
    last: { true: { borderBottomWidth: 0 } },
  } as const,
});

const NameText = styled(Text, {
  fontFamily: '$body',
  fontSize: 13,
  fontWeight: '500',
  color: '$color',
});

const TeamMeta = styled(Text, {
  fontFamily: '$body',
  fontSize: 11,
  color: '$colorSubtle',
});

const ClubDot = styled(YStack, {
  width: 7,
  height: 7,
  borderRadius: 4,
  flexShrink: 0,
});

const StatBlock = styled(YStack, {
  alignItems: 'flex-end',
  minWidth: 52,
});

const StatNumber = styled(Text, {
  fontFamily: '$mono',
  fontSize: 13,
  fontWeight: '500',
  color: '$color',
});

const StatLabel = styled(Text, {
  fontFamily: '$body',
  fontSize: 9,
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '$11',
  color: '$colorSubtle',
});

interface ThreatRowProps {
  threat: Threat;
  last: boolean;
}

function ThreatRow({ threat, last }: ThreatRowProps) {
  const isGoalkeeper = threat.position === 'gk';
  const kitUrl = threat.teamCode > 0 ? getKitUrl(threat.teamCode, { isGoalkeeper }) : undefined;
  const kitUrl2x =
    threat.teamCode > 0 ? getKitUrl(threat.teamCode, { isGoalkeeper, size: 220 }) : undefined;
  const clubColor = getClubColor(threat.teamShort);
  const scoreLabel = threat.scorePct === null ? '—' : `${threat.scorePct.toFixed(0)}%`;
  const lostLabel =
    threat.pointsLostToThreat > 0 ? `−${threat.pointsLostToThreat.toFixed(1)}` : '0.0';
  return (
    <Row last={last}>
      <Shirt kind={POSITION_TO_SHIRT[threat.position]} kitUrl={kitUrl} kitUrl2x={kitUrl2x} />
      <YStack flex={1} minWidth={0}>
        <NameText numberOfLines={1}>{threat.name}</NameText>
        <XStack alignItems="center" gap={4}>
          {clubColor ? <ClubDot backgroundColor={clubColor} /> : null}
          <TeamMeta>
            {threat.teamShort} · {threat.position.toUpperCase()} · {threat.ownedByPct.toFixed(0)}%
            own
          </TeamMeta>
        </XStack>
      </YStack>
      <StatBlock>
        <StatNumber>{threat.effectiveOwnershipPct.toFixed(0)}%</StatNumber>
        <StatLabel>{t('threats.col_eo')}</StatLabel>
      </StatBlock>
      <StatBlock>
        <StatNumber>{scoreLabel}</StatNumber>
        <StatLabel>{t('threats.col_score_pct')}</StatLabel>
      </StatBlock>
      <StatBlock>
        <StatNumber>{lostLabel}</StatNumber>
        <StatLabel>{t('threats.col_lost')}</StatLabel>
      </StatBlock>
      <StatBlock>
        <StatNumber>−{threat.liveRankImpactIfTheyHaul.toFixed(1)}</StatNumber>
        <StatLabel>{t('threats.col_haul_impact')}</StatLabel>
      </StatBlock>
    </Row>
  );
}
