'use client';

import { useEffect, useRef, useState } from 'react';

import { Text, XStack, styled } from 'tamagui';

const Pill = styled(XStack, {
  alignItems: 'center',
  gap: 7,
  backgroundColor: '$surface',
  borderColor: '$borderStrong',
  borderWidth: 1,
  paddingHorizontal: 11,
  paddingVertical: 3,
  borderRadius: '$7',
  cursor: 'pointer',
  hoverStyle: { backgroundColor: '$border' },
  transition: 'fast',
});

const ANCHOR_STYLE = { textDecoration: 'none' as const };

const Label = styled(Text, {
  fontFamily: '$body',
  fontSize: 9.5,
  fontWeight: '500',
  letterSpacing: '$9',
  textTransform: 'uppercase',
  color: '$colorMuted',
});

const Value = styled(Text, {
  fontFamily: '$mono',
  fontSize: 13.5,
  fontWeight: '500',
  color: '$color',
  letterSpacing: '$1',
});

const Move = styled(Text, {
  fontFamily: '$mono',
  fontSize: 10.5,
  fontWeight: '500',
  variants: {
    move: {
      up: { color: '$positive' },
      down: { color: '$negative' },
      flat: { color: '$colorSubtle' },
    },
  } as const,
});

type MoveDirection = 'up' | 'down' | 'flat';

interface LiveRankPillProps {
  rank: number | null;
  movement?: number | null;
  direction?: MoveDirection | null;
  href?: string;
}

const PULSE_STYLE = { animation: 'sfPulse 0.7s ease-in-out' } as const;
const PULSE_HOLD = { width: 6, height: 6 } as const;

function compactMovement(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1000) {
    const k = abs / 1000;
    return k >= 10 ? `${Math.round(k)}k` : `${k.toFixed(1).replace(/\.0$/, '')}k`;
  }
  return String(abs);
}

export function LiveRankPill({ rank, movement, direction, href }: LiveRankPillProps) {
  const [pulseKey, setPulseKey] = useState(0);
  const prevRank = useRef<number | null>(rank);

  useEffect(() => {
    if (rank !== null && prevRank.current !== null && rank !== prevRank.current) {
      setPulseKey((k) => k + 1);
    }
    prevRank.current = rank;
  }, [rank]);

  const dir: MoveDirection = direction ?? 'flat';
  const showMove =
    typeof movement === 'number' && movement !== 0 && (dir === 'up' || dir === 'down');

  const content = (
    <>
      <XStack
        key={pulseKey}
        {...PULSE_HOLD}
        borderRadius={999}
        backgroundColor={dir === 'down' ? '$negative' : '$positive'}
        style={pulseKey > 0 ? PULSE_STYLE : undefined}
      />
      <Label>Rank</Label>
      <Value>{rank === null ? '—' : rank.toLocaleString()}</Value>
      {showMove ? (
        <Move move={dir}>
          {dir === 'up' ? '↑' : '↓'}
          {compactMovement(movement)}
        </Move>
      ) : null}
    </>
  );

  if (href !== undefined) {
    return <Pill render={<a href={href} role="link" style={ANCHOR_STYLE} />}>{content}</Pill>;
  }

  return <Pill>{content}</Pill>;
}
