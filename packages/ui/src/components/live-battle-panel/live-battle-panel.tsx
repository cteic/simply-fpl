'use client';

import { Text, XStack, YStack, styled } from 'tamagui';

import { Card } from '../card';
import { DeltaChip } from '../delta-chip';
import { SectionHeader } from '../section-header';

const Wrap = styled(Card, {
  paddingHorizontal: 0,
  paddingVertical: 0,
});

const Head = styled(YStack, {
  paddingHorizontal: 16,
  paddingTop: 14,
  paddingBottom: 8,
});

const SubTitle = styled(Text, {
  fontFamily: '$body',
  fontSize: 11,
  color: '$colorMuted',
  marginTop: 2,
});

const Cols = styled(XStack, {
  gap: 0,
  borderTopWidth: 1,
  borderTopColor: '$border',
  $sm: { flexDirection: 'column' },
});

const Col = styled(YStack, {
  flex: 1,
  minWidth: 0,
  borderRightWidth: 1,
  borderRightColor: '$border',
  variants: {
    last: { true: { borderRightWidth: 0 } },
  } as const,
  $sm: {
    borderRightWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: '$border',
  },
});

const ColHead = styled(XStack, {
  paddingHorizontal: 16,
  paddingVertical: 10,
  alignItems: 'center',
  justifyContent: 'space-between',
  borderBottomWidth: 1,
  borderBottomColor: '$border',
});

const ColHeadLabel = styled(Text, {
  fontFamily: '$body',
  fontSize: 10,
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '$10',
  variants: {
    tone: {
      up: { color: '$positive' },
      down: { color: '$negative' },
    },
  } as const,
});

const Row = styled(XStack, {
  paddingHorizontal: 16,
  paddingVertical: 9,
  alignItems: 'center',
  gap: 8,
  borderBottomWidth: 1,
  borderBottomColor: '$border',
  variants: {
    last: { true: { borderBottomWidth: 0 } },
  } as const,
});

const PlayerName = styled(Text, {
  flex: 1,
  fontFamily: '$body',
  fontSize: 12.5,
  fontWeight: '500',
  color: '$color',
});

const TeamShort = styled(Text, {
  fontFamily: '$body',
  fontSize: 11,
  color: '$colorSubtle',
});

const EmptyText = styled(Text, {
  paddingHorizontal: 16,
  paddingVertical: 14,
  fontFamily: '$body',
  fontSize: 12,
  color: '$colorSubtle',
});

const TotalRow = styled(XStack, {
  paddingHorizontal: 16,
  paddingVertical: 12,
  borderTopWidth: 1,
  borderTopColor: '$border',
  alignItems: 'center',
  justifyContent: 'space-between',
});

const TotalLabel = styled(Text, {
  fontFamily: '$body',
  fontSize: 10,
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '$10',
  color: '$colorSubtle',
});

export interface LiveBattleRow {
  id: number;
  name: string;
  teamShort: string;
  rankImpact: number;
}

export interface LiveBattlePanelProps {
  gains: LiveBattleRow[];
  losses: LiveBattleRow[];
  totalImpact: number;
}

function formatImpact(value: number): string {
  let sign = '';
  if (value > 0) sign = '+';
  else if (value < 0) sign = '−';
  return `${sign}${Math.abs(value).toFixed(2)}`;
}

function toneFor(value: number): 'up' | 'down' | 'neutral' {
  if (value > 0) return 'up';
  if (value < 0) return 'down';
  return 'neutral';
}

export function LiveBattlePanel({ gains, losses, totalImpact }: LiveBattlePanelProps) {
  return (
    <Wrap>
      <Head>
        <SectionHeader title="Live Battle" />
        <SubTitle>Players moving your rank right now · currently playing</SubTitle>
      </Head>
      <Cols>
        <Col>
          <ColHead>
            <ColHeadLabel tone="up">Gains</ColHeadLabel>
          </ColHead>
          <BattleList rows={gains} empty="No live gains yet." />
        </Col>
        <Col last>
          <ColHead>
            <ColHeadLabel tone="down">Losses</ColHeadLabel>
          </ColHead>
          <BattleList rows={losses} empty="No live losses yet." />
        </Col>
      </Cols>
      <TotalRow>
        <TotalLabel>Net vs field</TotalLabel>
        <DeltaChip tone={toneFor(totalImpact)}>{formatImpact(totalImpact)}</DeltaChip>
      </TotalRow>
    </Wrap>
  );
}

function BattleList({ rows, empty }: { rows: LiveBattleRow[]; empty: string }) {
  if (rows.length === 0) {
    return <EmptyText>{empty}</EmptyText>;
  }
  return (
    <YStack>
      {rows.map((row, idx) => (
        <Row key={row.id} last={idx === rows.length - 1}>
          <PlayerName numberOfLines={1}>{row.name}</PlayerName>
          <TeamShort>{row.teamShort}</TeamShort>
          <DeltaChip tone={toneFor(row.rankImpact)}>{formatImpact(row.rankImpact)}</DeltaChip>
        </Row>
      ))}
    </YStack>
  );
}
