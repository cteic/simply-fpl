'use client';

import { Stack, Text, XStack, YStack, styled } from 'tamagui';

import { FdrBadge } from '../fdr-badge';

const Grid = styled(XStack, {
  display: 'grid' as never,
  gridTemplateColumns: 'repeat(5, 1fr)' as never,
  gap: 1,
  backgroundColor: '$border',
  borderWidth: 1,
  borderColor: '$border',
  borderRadius: '$6',
  overflow: 'hidden',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 3,
  $sm: { gridTemplateColumns: 'repeat(3, 1fr)' as never },
});

const Cell = styled(YStack, {
  backgroundColor: '$surface',
  paddingHorizontal: 12,
  paddingVertical: 14,
});

const Head = styled(Text, {
  fontFamily: '$body',
  fontSize: 9.5,
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '$10',
  color: '$colorSubtle',
  marginBottom: 10,
});

const PlayerRow = styled(XStack, {
  alignItems: 'center',
  gap: 8,
  paddingVertical: 6,
  borderBottomWidth: 1,
  borderBottomColor: '$border',
  variants: {
    last: { true: { borderBottomWidth: 0 } },
  } as const,
});

const Dot = styled(Stack, {
  width: 6,
  height: 6,
  borderRadius: 999,
  flexShrink: 0,
  variants: {
    form: {
      good: { backgroundColor: '$positive' },
      avg: { backgroundColor: '$info' },
      warning: { backgroundColor: '$warning' },
      bad: { backgroundColor: '$negative' },
      none: { backgroundColor: '$borderStrong' },
    },
  } as const,
});

const Name = styled(Text, {
  flex: 1,
  fontFamily: '$body',
  fontSize: 11,
  fontWeight: '500',
  letterSpacing: '$6',
  color: '$color',
  numberOfLines: 1,
});

export interface PlannerPlayer {
  name: string;
  form: 'good' | 'avg' | 'warning' | 'bad' | 'none';
  fdr: 1 | 2 | 3 | 4 | 5;
}

export interface PlannerGwCell {
  label: string;
  players: PlannerPlayer[];
}

interface PlannerGridProps {
  cells: PlannerGwCell[];
}

export function PlannerGrid({ cells }: PlannerGridProps) {
  return (
    <Grid>
      {cells.map((cell, ci) => (
        <Cell key={`${cell.label}-${ci}`}>
          <Head>{cell.label}</Head>
          {cell.players.map((p, pi) => {
            const isLast = pi === cell.players.length - 1;
            return (
              <PlayerRow key={`${p.name}-${pi}`} last={isLast}>
                <Dot form={p.form} />
                <Name>{p.name}</Name>
                <FdrBadge score={p.fdr} />
              </PlayerRow>
            );
          })}
        </Cell>
      ))}
    </Grid>
  );
}
