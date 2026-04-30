'use client';

import { Text, XStack, styled } from 'tamagui';

const PillBase = styled(XStack, {
  alignItems: 'center',
  gap: 6,
  paddingHorizontal: 12,
  paddingVertical: 5,
  borderRadius: 20,
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: '$borderStrong',
  backgroundColor: '$surface',
  cursor: 'pointer',
  animation: 'fast',
  hoverStyle: { borderColor: '$colorSubtle' },
});

const Label = styled(Text, {
  fontFamily: '$body',
  fontSize: 11,
  fontWeight: '500',
  color: '$colorMuted',
});

interface TeamPillProps {
  teamId: string | number;
  onPress?: () => void;
}

export function TeamPill({ teamId, onPress }: TeamPillProps) {
  return (
    <PillBase tag="button" onPress={onPress}>
      <svg width={9} height={9} viewBox="0 0 9 9" fill="none">
        <circle cx="4.5" cy="4.5" r="3.5" stroke="currentColor" strokeWidth="1.1" />
        <path d="M4.5 2.5v2l1.2 1" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      </svg>
      <Label>Team ID: {teamId}</Label>
      <svg width={9} height={9} viewBox="0 0 9 9" fill="none">
        <path d="M2.5 3.5l2 2 2-2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      </svg>
    </PillBase>
  );
}
