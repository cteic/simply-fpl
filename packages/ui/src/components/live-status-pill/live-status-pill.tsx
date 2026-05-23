'use client';

import { Text, XStack, YStack, styled } from 'tamagui';

/**
 * LiveStatusPill
 * --------------
 * One pill that encompasses the three things the nav used to spread across
 * separate chips: live freshness, your live rank, and the next deadline.
 * Segments are divided by hairlines so it reads as a single elegant unit.
 * Rank and deadline segments are optional (e.g. the landing page has no rank).
 *
 * Colours are literal hex/rgba rather than theme tokens: the stadium token set
 * does not resolve to CSS variables in this build (tokens fall back to black),
 * so the pill states its own palette to render reliably on the light nav.
 */

const Pill = styled(XStack, {
  alignItems: 'center',
  gap: 8,
  backgroundColor: '#FFFFFF',
  borderColor: '#CDD0C5',
  borderWidth: 1,
  paddingHorizontal: 11,
  paddingVertical: 4,
  borderRadius: '$7',
  $sm: { display: 'none' },
  // Note: no Tamagui `animation`/`transition` here. This pill is always
  // mounted while the entry id loads (href toggles undefined → "/"), and a
  // toggling animation prop changes the hook count on the same instance,
  // which crashes with "rendered fewer hooks than expected".
  variants: {
    interactive: {
      true: { cursor: 'pointer', hoverStyle: { backgroundColor: '#F2F2EF' } },
    },
  } as const,
});

const ANCHOR_STYLE = { textDecoration: 'none' as const };

const Dot = styled(YStack, {
  width: 6,
  height: 6,
  borderRadius: 999,
  variants: {
    tone: {
      fresh: { backgroundColor: '#15803D' },
      stale: { backgroundColor: '#B45309' },
      cold: { backgroundColor: '#C2333B' },
    },
  } as const,
});

const Divider = styled(YStack, {
  width: 1,
  height: 12,
  backgroundColor: '#E2E4DC',
});

const LiveLabel = styled(Text, {
  fontFamily: '$body',
  fontSize: '$2',
  fontWeight: '600',
  letterSpacing: '$9',
  textTransform: 'uppercase',
  variants: {
    tone: {
      fresh: { color: '#15803D' },
      stale: { color: '#B45309' },
      cold: { color: '#C2333B' },
    },
  } as const,
});

const MetaLabel = styled(Text, {
  fontFamily: '$body',
  fontSize: 9.5,
  fontWeight: '600',
  letterSpacing: '$9',
  textTransform: 'uppercase',
  color: '#566055',
});

const RankValue = styled(Text, {
  fontFamily: '$mono',
  fontSize: 13.5,
  fontWeight: '500',
  color: '#15201A',
  letterSpacing: '$1',
});

const Move = styled(Text, {
  fontFamily: '$mono',
  fontSize: 10.5,
  fontWeight: '500',
  marginLeft: 3,
  variants: {
    move: {
      up: { color: '#15803D' },
      down: { color: '#C2333B' },
      flat: { color: '#869083' },
    },
  } as const,
});

const DeadlineValue = styled(Text, {
  fontFamily: '$mono',
  fontSize: '$3',
  fontWeight: '500',
  color: '#0F766E',
});

type MoveDirection = 'up' | 'down' | 'flat';
type FreshnessTone = 'fresh' | 'stale' | 'cold';

interface LiveStatusPillProps {
  liveLabel: string;
  agoMs?: number | null;
  rank?: number | null;
  movement?: number | null;
  direction?: MoveDirection | null;
  deadlineLabel?: string;
  deadlineCountdown?: string;
  href?: string;
}

function toneForAge(ms: number | null | undefined): FreshnessTone {
  if (ms === null || ms === undefined) return 'fresh';
  if (ms < 30_000) return 'fresh';
  if (ms < 90_000) return 'stale';
  return 'cold';
}

function compactMovement(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1000) {
    const k = abs / 1000;
    return k >= 10 ? `${Math.round(k)}k` : `${k.toFixed(1).replace(/\.0$/, '')}k`;
  }
  return String(abs);
}

export function LiveStatusPill({
  liveLabel,
  agoMs,
  rank,
  movement,
  direction,
  deadlineLabel,
  deadlineCountdown,
  href,
}: LiveStatusPillProps) {
  const tone = toneForAge(agoMs);
  const hasRank = rank !== null && rank !== undefined;
  const dir: MoveDirection = direction ?? 'flat';
  const showMove =
    typeof movement === 'number' && movement !== 0 && (dir === 'up' || dir === 'down');
  const hasDeadline = typeof deadlineLabel === 'string' && typeof deadlineCountdown === 'string';

  const content = (
    <>
      <Dot tone={tone} />
      <LiveLabel tone={tone}>{liveLabel}</LiveLabel>

      {hasRank ? (
        <>
          <Divider />
          <MetaLabel>Rank</MetaLabel>
          <RankValue>{rank.toLocaleString()}</RankValue>
          {showMove ? (
            <Move move={dir}>
              {dir === 'up' ? '↑' : '↓'}
              {compactMovement(movement)}
            </Move>
          ) : null}
        </>
      ) : null}

      {hasDeadline ? (
        <>
          <Divider />
          <MetaLabel>{deadlineLabel}</MetaLabel>
          <DeadlineValue>{deadlineCountdown}</DeadlineValue>
        </>
      ) : null}
    </>
  );

  if (href !== undefined) {
    return (
      <Pill interactive render={<a href={href} role="link" style={ANCHOR_STYLE} />}>
        {content}
      </Pill>
    );
  }

  return <Pill>{content}</Pill>;
}
