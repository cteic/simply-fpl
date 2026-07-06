'use client';

import { Text, XStack, YStack, styled } from 'tamagui';

import { t } from '@simplyfpl/i18n';

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
  alignItems: 'stretch',
  $sm: { flexDirection: 'column', alignItems: 'stretch' },
});

const Col = styled(YStack, {
  flex: 1,
  flexBasis: 0,
  minWidth: 0,
  borderRightWidth: 1,
  borderRightColor: '$border',
  variants: {
    last: { true: { borderRightWidth: 0 } },
  } as const,
  $sm: {
    flexBasis: 'auto',
    width: '100%',
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

const ColHeadMeta = styled(Text, {
  fontFamily: '$body',
  fontSize: 9,
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '$10',
  color: '$colorSubtle',
});

const Row = styled(XStack, {
  paddingHorizontal: 16,
  paddingVertical: 9,
  alignItems: 'center',
  gap: 8,
  borderBottomWidth: 1,
  borderBottomColor: '$border',
});

const PlayerName = styled(Text, {
  flex: 1,
  minWidth: 0,
  fontFamily: '$body',
  fontSize: 12.5,
  fontWeight: '500',
  color: '$color',
});

const TeamShort = styled(Text, {
  fontFamily: '$body',
  fontSize: 11,
  color: '$colorSubtle',
  flexShrink: 0,
});

const Pts = styled(Text, {
  fontFamily: '$mono',
  fontSize: 12,
  fontWeight: '500',
  color: '$colorMuted',
  textAlign: 'right',
  minWidth: 34,
  flexShrink: 0,
});

const EmptyText = styled(Text, {
  paddingHorizontal: 16,
  paddingVertical: 14,
  fontFamily: '$body',
  fontSize: 12,
  color: '$colorSubtle',
});

const ColTotalRow = styled(XStack, {
  paddingHorizontal: 16,
  paddingVertical: 10,
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
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
  points: number;
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

function sumImpact(rows: LiveBattleRow[]): number {
  return rows.reduce((sum, row) => sum + row.rankImpact, 0);
}

export function LiveBattlePanel({ gains, losses, totalImpact }: LiveBattlePanelProps) {
  const gainsTotal = sumImpact(gains);
  const lossesTotal = sumImpact(losses);
  return (
    <Wrap>
      <Head>
        <SectionHeader title={t('live_battle.section_title')} />
        <SubTitle>{t('live_battle.subtitle')}</SubTitle>
      </Head>
      <Cols>
        <Col>
          <ColHead>
            <ColHeadLabel tone="up">{t('live_battle.gains')}</ColHeadLabel>
            <ColHeadMeta>{t('shared.pts')}</ColHeadMeta>
          </ColHead>
          <BattleList rows={gains} empty={t('live_battle.empty_gains')} columnTotal={gainsTotal} />
        </Col>
        <Col last>
          <ColHead>
            <ColHeadLabel tone="down">{t('live_battle.losses')}</ColHeadLabel>
            <ColHeadMeta>{t('shared.pts')}</ColHeadMeta>
          </ColHead>
          <BattleList
            rows={losses}
            empty={t('live_battle.empty_losses')}
            columnTotal={lossesTotal}
          />
        </Col>
      </Cols>
      <TotalRow>
        <TotalLabel>{t('live_battle.net_vs_field')}</TotalLabel>
        <DeltaChip tone={toneFor(totalImpact)}>{formatImpact(totalImpact)}</DeltaChip>
      </TotalRow>
    </Wrap>
  );
}

interface BattleListProps {
  rows: LiveBattleRow[];
  empty: string;
  columnTotal: number;
}

function BattleList({ rows, empty, columnTotal }: BattleListProps) {
  if (rows.length === 0) {
    return <EmptyText>{empty}</EmptyText>;
  }
  return (
    <YStack flex={1}>
      <YStack flex={1}>
        {rows.map((row) => (
          <Row key={row.id}>
            <PlayerName numberOfLines={1}>{row.name}</PlayerName>
            <TeamShort>{row.teamShort}</TeamShort>
            <Pts>{row.points}</Pts>
            <DeltaChip tone={toneFor(row.rankImpact)}>{formatImpact(row.rankImpact)}</DeltaChip>
          </Row>
        ))}
      </YStack>
      <ColTotalRow>
        <TotalLabel>{t('live_battle.total')}</TotalLabel>
        <DeltaChip tone={toneFor(columnTotal)}>{formatImpact(columnTotal)}</DeltaChip>
      </ColTotalRow>
    </YStack>
  );
}
