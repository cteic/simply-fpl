'use client';

import { Text, styled } from 'tamagui';

const Badge = styled(Text, {
  fontFamily: '$mono',
  fontSize: 10,
  fontWeight: '500',
  width: 18,
  height: 18,
  borderRadius: 4,
  textAlign: 'center',
  lineHeight: 18,
  color: '$surface',
  variants: {
    score: {
      1: { backgroundColor: '$fdr1' },
      2: { backgroundColor: '$fdr2' },
      3: { backgroundColor: '$fdr3' },
      4: { backgroundColor: '$fdr4' },
      5: { backgroundColor: '$fdr5' },
    },
  } as const,
});

interface FdrBadgeProps {
  score: 1 | 2 | 3 | 4 | 5;
}

export function FdrBadge({ score }: FdrBadgeProps) {
  return <Badge score={score}>{score}</Badge>;
}
