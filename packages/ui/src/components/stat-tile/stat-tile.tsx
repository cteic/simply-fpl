'use client';

import type { ReactNode } from 'react';

import { Text, YStack, styled } from 'tamagui';

import { usePulse } from '../../hooks/use-pulse';
import type { StatTileTone } from './stat-tile-tone';

const TileBase = styled(YStack, {
  flexGrow: 1,
  flexBasis: 120,
  minWidth: 120,
  borderWidth: 1,
  borderColor: '$border',
  borderLeftWidth: 3,
  borderRadius: '$6',
  paddingHorizontal: 16,
  paddingVertical: 14,
  variants: {
    tone: {
      positive: { backgroundColor: '$positiveBg', borderLeftColor: '$positive' },
      brand: { backgroundColor: '$brandBg', borderLeftColor: '$brand' },
      warning: { backgroundColor: '$warningBg', borderLeftColor: '$warning' },
      neutral: { backgroundColor: '$surface', borderLeftColor: '$borderStrong' },
      negative: { backgroundColor: '$surface', borderLeftColor: '$negative' },
    },
  } as const,
  defaultVariants: { tone: 'neutral' },
});

const Label = styled(Text, {
  fontFamily: '$body',
  fontSize: 9.5,
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: 0.6,
  color: '$colorSubtle',
  marginBottom: 8,
});

const Sub = styled(Text, {
  fontFamily: '$body',
  fontSize: 10.5,
  color: '$colorMuted',
  marginTop: 6,
});

const PulseOverlay = styled(YStack, {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  borderRadius: '$6',
  pointerEvents: 'none',
  variants: {
    tone: {
      positive: { backgroundColor: '$positive' },
      brand: { backgroundColor: '$brand' },
      warning: { backgroundColor: '$warning' },
      neutral: { backgroundColor: '$borderStrong' },
      negative: { backgroundColor: '$negative' },
    },
  } as const,
  defaultVariants: { tone: 'neutral' },
});

interface StatTileProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: StatTileTone;
  pulseKey?: string | number | null;
  children?: ReactNode;
}

export function StatTile({
  label,
  value,
  sub,
  tone = 'neutral',
  pulseKey,
  children,
}: StatTileProps) {
  const { overlayOpacity, scale, pulseCount } = usePulse(pulseKey);

  return (
    <TileBase tone={tone} position="relative" scale={scale}>
      <Label>{label}</Label>
      {value}
      {sub ? <Sub>{sub}</Sub> : null}
      {children ?? null}
      {pulseCount > 0 && overlayOpacity > 0 ? (
        <PulseOverlay tone={tone} opacity={overlayOpacity} />
      ) : null}
    </TileBase>
  );
}

export { Sub as StatTileSub };
