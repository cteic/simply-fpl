'use client';

import { Text, XStack, styled } from 'tamagui';

const Pill = styled(XStack, {
  alignItems: 'center',
  gap: 6,
  backgroundColor: '$surface',
  borderColor: '$borderStrong',
  borderWidth: 1,
  paddingHorizontal: 10,
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
  fontSize: 12,
  fontWeight: '500',
  color: '$color',
});

interface LiveRankPillProps {
  rank: number | null;
  href?: string;
}

export function LiveRankPill({ rank, href }: LiveRankPillProps) {
  const content = (
    <>
      <Label>Rank</Label>
      <Value>{rank === null ? '—' : rank.toLocaleString()}</Value>
    </>
  );

  if (href !== undefined) {
    return <Pill render={<a href={href} role="link" style={ANCHOR_STYLE} />}>{content}</Pill>;
  }

  return <Pill>{content}</Pill>;
}
