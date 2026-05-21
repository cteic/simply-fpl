'use client';

import { useEffect, useMemo, useState } from 'react';

import { threats as threatsNs } from '@simplyfpl/features';
import type { Threat, ThreatPosition } from '@simplyfpl/features/threats';
import { getCurrentGameweek, getKitUrl } from '@simplyfpl/fpl-client';
import {
  Card,
  FNote,
  PageHeader,
  PageShell,
  SectionHeader,
  Shirt,
  Text,
  XStack,
  YStack,
  styled,
} from '@simplyfpl/ui';
import type { ShirtKind } from '@simplyfpl/ui';

import { useCohortAggregates } from '@/queries/cohort-aggregates';
import { useBootstrap, useEntryPicks, useLiveGameweek } from '@/queries/fpl';

const { computeThreats } = threatsNs;

const STORAGE_KEY = 'simplyfpl:lastEntryId';

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
    livePoints: 0,
    liveRankImpactIfTheyHaul: 9.52,
  },
  {
    elementId: 328,
    name: 'M.Salah',
    teamShort: 'LIV',
    teamCode: 14,
    position: 'mid',
    ownedByCount: 72,
    ownedByPct: 72,
    captainPct: 18,
    effectiveOwnershipPct: 90,
    livePoints: 0,
    liveRankImpactIfTheyHaul: 7.2,
  },
  {
    elementId: 401,
    name: 'Saka',
    teamShort: 'ARS',
    teamCode: 3,
    position: 'mid',
    ownedByCount: 54,
    ownedByPct: 54,
    captainPct: 4,
    effectiveOwnershipPct: 58,
    livePoints: 0,
    liveRankImpactIfTheyHaul: 4.64,
  },
  {
    elementId: 220,
    name: 'Palmer',
    teamShort: 'CHE',
    teamCode: 8,
    position: 'mid',
    ownedByCount: 49,
    ownedByPct: 49,
    captainPct: 7,
    effectiveOwnershipPct: 56,
    livePoints: 0,
    liveRankImpactIfTheyHaul: 4.48,
  },
  {
    elementId: 182,
    name: 'Watkins',
    teamShort: 'AVL',
    teamCode: 7,
    position: 'fwd',
    ownedByCount: 36,
    ownedByPct: 36,
    captainPct: 3,
    effectiveOwnershipPct: 39,
    livePoints: 0,
    liveRankImpactIfTheyHaul: 3.12,
  },
];

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
  useEffect(() => {
    setEntryId(readSavedEntryId());
  }, []);

  const { data: bootstrap } = useBootstrap();
  const currentGw = useMemo(() => (bootstrap ? getCurrentGameweek(bootstrap) : null), [bootstrap]);
  const aggregates = useCohortAggregates(currentGw);
  const cohort = aggregates?.tiers.top_10k;
  const { data: yourPicks } = useEntryPicks(entryId ?? 0, entryId === null ? null : currentGw);
  const { data: liveGw } = useLiveGameweek(currentGw);

  const rows = useMemo<Threat[]>(() => {
    if (cohort && bootstrap && liveGw && yourPicks) {
      return computeThreats({
        yourPicks,
        cohort,
        bootstrap,
        liveGw,
      });
    }
    return PLACEHOLDER_THREATS;
  }, [cohort, bootstrap, liveGw, yourPicks]);

  const headline = entryId === null ? 'Save a team on Home to personalise' : `For team ${entryId}`;

  return (
    <PageShell>
      <PageHeader
        tone="stadium"
        title="Threats"
        meta={`${headline} · GW${currentGw ?? '—'} · Players nearby managers own that you don't`}
      />

      <Card paddingHorizontal={0} paddingVertical={0} marginBottom={16}>
        <YStack paddingHorizontal={16} paddingTop={14} paddingBottom={8}>
          <SectionHeader title={`Top threats (${rows.length})`} />
        </YStack>
        <YStack>
          {rows.map((row, idx) => (
            <ThreatRow key={row.elementId} threat={row} last={idx === rows.length - 1} />
          ))}
        </YStack>
      </Card>

      <FNote>
        {cohort
          ? 'Live cohort data refreshes every 60s while gameweeks are active.'
          : 'Placeholder data — real threats landing once cohort aggregates are available.'}
      </FNote>
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

const StatBlock = styled(YStack, {
  alignItems: 'flex-end',
  minWidth: 64,
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
  return (
    <Row last={last}>
      <Shirt kind={POSITION_TO_SHIRT[threat.position]} kitUrl={kitUrl} kitUrl2x={kitUrl2x} />
      <YStack flex={1} minWidth={0}>
        <NameText numberOfLines={1}>{threat.name}</NameText>
        <TeamMeta>
          {threat.teamShort} · {threat.position.toUpperCase()}
        </TeamMeta>
      </YStack>
      <StatBlock>
        <StatNumber>{threat.ownedByPct.toFixed(0)}%</StatNumber>
        <StatLabel>owned</StatLabel>
      </StatBlock>
      <StatBlock>
        <StatNumber>{threat.effectiveOwnershipPct.toFixed(0)}%</StatNumber>
        <StatLabel>EO</StatLabel>
      </StatBlock>
      <StatBlock>
        <StatNumber>−{threat.liveRankImpactIfTheyHaul.toFixed(1)}</StatNumber>
        <StatLabel>if 8 pt</StatLabel>
      </StatBlock>
    </Row>
  );
}
