'use client';

import { Stack, Text, XStack, styled } from 'tamagui';

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
});

const PillDot = styled(Stack, {
  width: 5,
  height: 5,
  borderRadius: 999,
  backgroundColor: '$positive',
  // Note: pulse animation is handled in component below using Tamagui's
  // animation prop. Add `animation="pulse"` and the bar animations from
  // tamagui.config.ts when wiring up.
});

const PillText = styled(Text, {
  fontFamily: '$body',
  fontSize: '$2',
  fontWeight: '600',
  letterSpacing: '$9',
  textTransform: 'uppercase',
  color: '$positive',
});

interface LivePillProps {
  /** e.g. "GW30 Live" */
  label: string;
  /** Whether to pulse the dot. Default: true */
  pulse?: boolean;
}

export function LivePill({ label, pulse = true }: LivePillProps) {
  return (
    <PillContainer>
      {pulse ? <PillDot animation="medium" /> : <PillDot opacity={1} />}
      <PillText>{label}</PillText>
    </PillContainer>
  );
}
