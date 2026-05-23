'use client';

import { Text, XStack, styled } from 'tamagui';

import { colors } from '../../theme';

/**
 * DeadlinePill
 * ------------
 * Counts down to the next gameweek deadline. Distinct from the green LivePill
 * (which reports data freshness): this is the teal "plan ahead" indicator. The
 * counting itself happens in the caller (see `useCountdown`); this component is
 * purely presentational so it stays cross-platform.
 */

const Pill = styled(XStack, {
  alignItems: 'center',
  gap: 5,
  backgroundColor: '$brandBg',
  borderColor: '$borderStrong',
  borderWidth: 1,
  paddingHorizontal: 9,
  paddingVertical: 3,
  borderRadius: '$7',
  $sm: { display: 'none' },
});

const Label = styled(Text, {
  fontFamily: '$body',
  fontSize: '$2',
  fontWeight: '600',
  letterSpacing: '$9',
  textTransform: 'uppercase',
  color: '$brand',
});

const Value = styled(Text, {
  fontFamily: '$mono',
  fontSize: '$3',
  fontWeight: '500',
  color: '$brand',
});

interface DeadlinePillProps {
  gwLabel: string;
  countdown: string;
}

export function DeadlinePill({ gwLabel, countdown }: DeadlinePillProps) {
  return (
    <Pill>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
        <circle cx="5" cy="5.4" r="3.7" stroke={colors.brand} strokeWidth="1.1" />
        <path d="M5 3.4v2l1.3 1" stroke={colors.brand} strokeWidth="1.1" strokeLinecap="round" />
      </svg>
      <Label>{gwLabel} deadline</Label>
      <Value>{countdown}</Value>
    </Pill>
  );
}
