'use client';

import { Stack, Text, YStack, styled } from 'tamagui';

import { PBadge } from '../pbadge';
import { Shirt } from '../shirt';
import type { ShirtKind } from '../shirt';

const Wrap = styled(YStack, {
  alignItems: 'center',
  gap: 5,
  width: 70,
  cursor: 'pointer',
});

const ShirtWrap = styled(Stack, {
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

type BadgeTone = 'default' | 'hot' | 'bench' | 'captain' | 'tbp';

interface PlayerProps {
  name: string;
  detail?: string;
  position?: ShirtKind;
  badge?: string;
  badgeTone?: BadgeTone;
  bench?: boolean;
  kitUrl?: string | undefined;
  kitUrl2x?: string | undefined;
}

export function Player({
  name,
  detail,
  position = 'mid',
  badge,
  badgeTone = 'default',
  bench = false,
  kitUrl,
  kitUrl2x,
}: PlayerProps) {
  const shirtKind: ShirtKind = bench ? 'bch' : position;
  return (
    <Wrap>
      <ShirtWrap bench={bench}>
        <Shirt kind={shirtKind} kitUrl={kitUrl} kitUrl2x={kitUrl2x} />
        {badge ? <PBadge tone={badgeTone}>{badge}</PBadge> : null}
      </ShirtWrap>
      <Name bench={bench}>{name}</Name>
      {detail ? <Detail>{detail}</Detail> : null}
    </Wrap>
  );
}
