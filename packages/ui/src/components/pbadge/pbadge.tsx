'use client';

import type { ReactNode } from 'react';

import { Text, styled } from 'tamagui';

const Badge = styled(Text, {
  position: 'absolute',
  top: -5,
  right: -5,
  fontFamily: '$mono',
  fontSize: 9,
  fontWeight: '500',
  paddingHorizontal: 4,
  paddingVertical: 1,
  borderRadius: 3,
  minWidth: 16,
  textAlign: 'center',
  lineHeight: 13,
  variants: {
    tone: {
      default: { backgroundColor: '$color', color: '$surface' },
      hot: { backgroundColor: '$positive', color: '$surface' },
      bench: { backgroundColor: '$borderStrong', color: '$colorMuted' },
      captain: { backgroundColor: '$info', color: '$surface' },
      tbp: { backgroundColor: '$warning', color: '$surface' },
    },
  } as const,
  defaultVariants: { tone: 'default' },
});

export type BadgeTone = 'default' | 'hot' | 'bench' | 'captain' | 'tbp';

interface PBadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
}

export function PBadge({ children, tone }: PBadgeProps) {
  return <Badge tone={tone}>{children}</Badge>;
}
