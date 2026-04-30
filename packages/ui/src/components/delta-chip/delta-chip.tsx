'use client';

import type { ReactNode } from 'react';

import { Text, styled } from 'tamagui';

const ChipBase = styled(Text, {
  alignSelf: 'flex-start',
  fontFamily: '$body',
  fontSize: 11,
  fontWeight: '500',
  paddingHorizontal: 7,
  paddingVertical: 2,
  borderRadius: 4,
  variants: {
    tone: {
      up: { color: '$positive', backgroundColor: '$positiveBg' },
      down: { color: '$negative', backgroundColor: '$negativeBg' },
      neutral: {
        color: '$colorSubtle',
        backgroundColor: '$background',
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: '$border',
      },
    },
  } as const,
  defaultVariants: { tone: 'neutral' },
});

interface DeltaChipProps {
  children: ReactNode;
  tone?: 'up' | 'down' | 'neutral';
}

export function DeltaChip({ children, tone }: DeltaChipProps) {
  return <ChipBase tone={tone}>{children}</ChipBase>;
}
