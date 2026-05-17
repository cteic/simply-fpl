'use client';

import { Text, XStack, YStack, styled } from 'tamagui';

/**
 * LivePill
 * --------
 * The signature "GW30 Live" indicator. Used in the nav and at the top of
 * gameweek-scoped views. Pulses its dot to indicate live data.
 *
 * This is the reference component for the SimplyFPL UI patterns:
 * - Tamagui primitives only (no raw View/Text from RN)
 * - Token references via $-prefixed values
 * - Variants for size/state rather than prop branching in JSX
 * - Cross-platform (works on web and native unchanged)
 */

const PillContainer = styled(XStack, {
  alignItems: 'center',
  gap: '$1',
  backgroundColor: '$positiveBg',
  borderColor: '$positiveBorder',
  borderWidth: 1,
  paddingHorizontal: 9,
  paddingVertical: 3,
  borderRadius: '$7',
  variants: {
    tone: {
      fresh: { backgroundColor: '$positiveBg', borderColor: '$positiveBorder' },
      stale: { backgroundColor: '$warningBg', borderColor: '$warningBorder' },
      cold: { backgroundColor: '$negativeBg', borderColor: '$negative' },
    },
  } as const,
});

const PillDot = styled(YStack, {
  width: 5,
  height: 5,
  borderRadius: 999,
  backgroundColor: '$positive',
  variants: {
    tone: {
      fresh: { backgroundColor: '$positive' },
      stale: { backgroundColor: '$warning' },
      cold: { backgroundColor: '$negative' },
    },
  } as const,
});

const PillText = styled(Text, {
  fontFamily: '$body',
  fontSize: '$2',
  fontWeight: '600',
  letterSpacing: '$9',
  textTransform: 'uppercase',
  color: '$positive',
  variants: {
    tone: {
      fresh: { color: '$positive' },
      stale: { color: '$warning' },
      cold: { color: '$negative' },
    },
  } as const,
});

const AgoText = styled(Text, {
  fontFamily: '$mono',
  fontSize: '$1',
  marginLeft: 4,
  color: '$colorSubtle',
  letterSpacing: '$2',
  textTransform: 'none',
});

interface LivePillProps {
  label: string;
  pulse?: boolean;
  agoMs?: number | null;
}

function formatAgo(ms: number): string {
  if (ms < 5_000) return 'just now';
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  return `${Math.floor(ms / 3_600_000)}h ago`;
}

function toneForAge(ms: number | null | undefined): 'fresh' | 'stale' | 'cold' {
  if (ms === null || ms === undefined) return 'fresh';
  if (ms < 30_000) return 'fresh';
  if (ms < 90_000) return 'stale';
  return 'cold';
}

export function LivePill({ label, pulse = true, agoMs }: LivePillProps) {
  const tone = toneForAge(agoMs);
  const showAgo = typeof agoMs === 'number';
  return (
    <PillContainer tone={tone}>
      {pulse && tone === 'fresh' ? (
        <PillDot tone={tone} transition="medium" />
      ) : (
        <PillDot tone={tone} opacity={1} />
      )}
      <PillText tone={tone}>{label}</PillText>
      {showAgo ? <AgoText>· {formatAgo(agoMs)}</AgoText> : null}
    </PillContainer>
  );
}
