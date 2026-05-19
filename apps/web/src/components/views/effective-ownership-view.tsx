'use client';

import { useMemo } from 'react';

import { effectiveOwnership as eoNs } from '@simplyfpl/features';
import type { EoRow } from '@simplyfpl/features/effective-ownership';
import { getCurrentGameweek } from '@simplyfpl/fpl-client';
import {
  Card,
  FNote,
  PageHeader,
  PageShell,
  SectionHeader,
  Text,
  XStack,
  YStack,
  styled,
} from '@simplyfpl/ui';

import { useCohortAggregatesAvailable } from '@/queries/cohort-aggregates';
import { useBootstrap } from '@/queries/fpl';

const { computeEffectiveOwnership } = eoNs;

const PLACEHOLDER_EO: EoRow[] = [
  {
    elementId: 351,
    name: 'Haaland',
    teamShort: 'MCI',
    teamCode: 43,
    position: 'fwd',
    nowCost: 145,
    eoTop1k: 152,
    eoTop10k: 138,
    eoTop100k: 122,
    eoOverall: 105,
  },
  {
    elementId: 328,
    name: 'M.Salah',
    teamShort: 'LIV',
    teamCode: 14,
    position: 'mid',
    nowCost: 132,
    eoTop1k: 121,
    eoTop10k: 109,
    eoTop100k: 94,
    eoOverall: 81,
  },
  {
    elementId: 401,
    name: 'Saka',
    teamShort: 'ARS',
    teamCode: 3,
    position: 'mid',
    nowCost: 102,
    eoTop1k: 71,
    eoTop10k: 64,
    eoTop100k: 55,
    eoOverall: 48,
  },
  {
    elementId: 220,
    name: 'Palmer',
    teamShort: 'CHE',
    teamCode: 8,
    position: 'mid',
    nowCost: 110,
    eoTop1k: 68,
    eoTop10k: 61,
    eoTop100k: 53,
    eoOverall: 46,
  },
  {
    elementId: 182,
    name: 'Watkins',
    teamShort: 'AVL',
    teamCode: 7,
    position: 'fwd',
    nowCost: 91,
    eoTop1k: 44,
    eoTop10k: 41,
    eoTop100k: 38,
    eoOverall: 34,
  },
  {
    elementId: 17,
    name: 'Saliba',
    teamShort: 'ARS',
    teamCode: 3,
    position: 'def',
    nowCost: 62,
    eoTop1k: 58,
    eoTop10k: 51,
    eoTop100k: 42,
    eoOverall: 35,
  },
  {
    elementId: 285,
    name: 'Trippier',
    teamShort: 'NEW',
    teamCode: 4,
    position: 'def',
    nowCost: 67,
    eoTop1k: 32,
    eoTop10k: 28,
    eoTop100k: 24,
    eoOverall: 21,
  },
  {
    elementId: 99,
    name: 'Isak',
    teamShort: 'NEW',
    teamCode: 4,
    position: 'fwd',
    nowCost: 85,
    eoTop1k: 39,
    eoTop10k: 33,
    eoTop100k: 27,
    eoOverall: 22,
  },
  {
    elementId: 12,
    name: 'Raya',
    teamShort: 'ARS',
    teamCode: 3,
    position: 'gk',
    nowCost: 56,
    eoTop1k: 47,
    eoTop10k: 42,
    eoTop100k: 35,
    eoOverall: 29,
  },
  {
    elementId: 244,
    name: 'Gordon',
    teamShort: 'NEW',
    teamCode: 4,
    position: 'mid',
    nowCost: 77,
    eoTop1k: 25,
    eoTop10k: 22,
    eoTop100k: 19,
    eoOverall: 16,
  },
];

const TOP_N = 30;

export function EffectiveOwnershipView() {
  const { data: bootstrap } = useBootstrap();
  const currentGw = useMemo(() => (bootstrap ? getCurrentGameweek(bootstrap) : null), [bootstrap]);
  const cohortAggregatesAvailable = useCohortAggregatesAvailable(currentGw);

  const rows = useMemo<EoRow[]>(() => {
    if (cohortAggregatesAvailable && bootstrap) {
      return computeEffectiveOwnership({
        byTier: { top_1k: {}, top_10k: {}, top_100k: {}, overall: {} },
        bootstrap,
      });
    }
    return PLACEHOLDER_EO;
  }, [cohortAggregatesAvailable, bootstrap]);

  const visible = rows.slice(0, TOP_N);

  return (
    <PageShell>
      <PageHeader
        title="Effective Ownership"
        meta={`GW${currentGw ?? '—'} · Ownership × captaincy by rank tier`}
      />

      <Card paddingHorizontal={0} paddingVertical={0} marginBottom={16}>
        <YStack paddingHorizontal={16} paddingTop={14} paddingBottom={8}>
          <SectionHeader title={`Top ${visible.length} by Top 10k EO`} />
        </YStack>
        <HeaderRow>
          <HeaderCellName>Player</HeaderCellName>
          <HeaderCellNumber>Top 1k</HeaderCellNumber>
          <HeaderCellNumber>Top 10k</HeaderCellNumber>
          <HeaderCellNumber>Top 100k</HeaderCellNumber>
          <HeaderCellNumber>Overall</HeaderCellNumber>
        </HeaderRow>
        <YStack>
          {visible.map((row, idx) => (
            <EoRowDisplay key={row.elementId} row={row} last={idx === visible.length - 1} />
          ))}
        </YStack>
      </Card>

      <FNote>
        {cohortAggregatesAvailable
          ? 'Live cohort data refreshes every 60s while gameweeks are active.'
          : 'Placeholder data — real EO splits landing once cohort aggregates are available.'}
      </FNote>
    </PageShell>
  );
}

const HeaderRow = styled(XStack, {
  paddingHorizontal: 16,
  paddingVertical: 10,
  alignItems: 'center',
  gap: 8,
  borderBottomWidth: 1,
  borderBottomColor: '$border',
  backgroundColor: '$background',
});

const HeaderCellName = styled(Text, {
  flex: 1,
  fontFamily: '$body',
  fontSize: 9,
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '$11',
  color: '$colorSubtle',
});

const HeaderCellNumber = styled(Text, {
  width: 60,
  textAlign: 'right',
  fontFamily: '$body',
  fontSize: 9,
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '$11',
  color: '$colorSubtle',
});

const BodyRow = styled(XStack, {
  paddingHorizontal: 16,
  paddingVertical: 10,
  alignItems: 'center',
  gap: 8,
  borderBottomWidth: 1,
  borderBottomColor: '$border',
  variants: {
    last: { true: { borderBottomWidth: 0 } },
  } as const,
});

const NameCell = styled(YStack, {
  flex: 1,
  minWidth: 0,
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

const NumberCell = styled(Text, {
  width: 60,
  textAlign: 'right',
  fontFamily: '$mono',
  fontSize: 12.5,
  fontWeight: '500',
  color: '$color',
});

interface EoRowDisplayProps {
  row: EoRow;
  last: boolean;
}

function EoRowDisplay({ row, last }: EoRowDisplayProps) {
  return (
    <BodyRow last={last}>
      <NameCell>
        <NameText numberOfLines={1}>{row.name}</NameText>
        <TeamMeta>
          {row.teamShort} · {row.position.toUpperCase()}
        </TeamMeta>
      </NameCell>
      <NumberCell>{row.eoTop1k.toFixed(0)}%</NumberCell>
      <NumberCell>{row.eoTop10k.toFixed(0)}%</NumberCell>
      <NumberCell>{row.eoTop100k.toFixed(0)}%</NumberCell>
      <NumberCell>{row.eoOverall.toFixed(0)}%</NumberCell>
    </BodyRow>
  );
}
