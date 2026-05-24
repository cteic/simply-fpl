'use client';

import { Text, XStack, YStack, styled } from 'tamagui';

import { PBadge } from '../pbadge';
import { Shirt } from '../shirt';
import type { ShirtKind } from '../shirt';

const Wrap = styled(YStack, {
  alignItems: 'center',
  gap: 5,
  width: 70,
  cursor: 'pointer',
});

const ShirtWrap = styled(YStack, {
  position: 'relative',
  variants: {
    bench: {
      true: { opacity: 0.38 },
    },
  } as const,
});

const Name = styled(Text, {
  fontFamily: '$body',
  fontSize: 9.5,
  fontWeight: '500',
  textAlign: 'center',
  letterSpacing: '$6',
  lineHeight: 11,
  maxWidth: 68,
  numberOfLines: 1,
  variants: {
    bench: {
      true: { color: '$colorSubtle' },
      false: { color: '$color' },
    },
  } as const,
});

const Detail = styled(Text, {
  fontFamily: '$body',
  fontSize: 9,
  color: '$colorSubtle',
  textAlign: 'center',
});

const ClubDot = styled(YStack, {
  width: 6,
  height: 6,
  borderRadius: 3,
  flexShrink: 0,
});

const Ownership = styled(Text, {
  fontFamily: '$mono',
  fontSize: 8.5,
  color: '$colorSubtle',
  textAlign: 'center',
  letterSpacing: 0,
});

type BadgeTone = 'default' | 'hot' | 'bench' | 'captain' | 'tbp';

interface PlayerProps {
  name: string;
  detail?: string;
  position?: ShirtKind;
  badge?: string;
  badgeTone?: BadgeTone;
  bench?: boolean;
  compact?: boolean;
  kitUrl?: string | undefined;
  kitUrl2x?: string | undefined;
  ownershipPercent?: number | undefined;
  accentColor?: string | undefined;
}

export function Player({
  name,
  detail,
  position = 'mid',
  badge,
  badgeTone = 'default',
  bench = false,
  compact = false,
  kitUrl,
  kitUrl2x,
  ownershipPercent,
  accentColor,
}: PlayerProps) {
  const shirtKind: ShirtKind = bench ? 'bch' : position;
  return (
    <Wrap width={compact ? 56 : undefined}>
      <ShirtWrap bench={bench}>
        <Shirt kind={shirtKind} kitUrl={kitUrl} kitUrl2x={kitUrl2x} size={compact ? 36 : 44} />
        {badge ? <PBadge tone={badgeTone}>{badge}</PBadge> : null}
      </ShirtWrap>
      <Name bench={bench} maxWidth={compact ? 54 : undefined}>
        {name}
      </Name>
      {detail ? (
        <XStack alignItems="center" justifyContent="center" gap={4}>
          {accentColor ? <ClubDot backgroundColor={accentColor} /> : null}
          <Detail>{detail}</Detail>
        </XStack>
      ) : null}
      {ownershipPercent !== undefined ? (
        <Ownership>{ownershipPercent.toFixed(1)}%</Ownership>
      ) : null}
    </Wrap>
  );
}
