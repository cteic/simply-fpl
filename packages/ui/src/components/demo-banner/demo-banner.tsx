'use client';

import { Text, XStack, styled } from 'tamagui';

const Bar = styled(XStack, {
  backgroundColor: '$color',
  paddingHorizontal: 28,
  paddingVertical: 9,
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
});

const Badge = styled(Text, {
  fontFamily: '$body',
  fontSize: 10,
  fontWeight: '600',
  letterSpacing: '$8',
  textTransform: 'uppercase',
  color: '$surface',
  backgroundColor: 'rgba(255,255,255,0.15)',
  paddingHorizontal: 8,
  paddingVertical: 2,
  borderRadius: 20,
});

const Message = styled(Text, {
  fontFamily: '$body',
  fontSize: 11,
  letterSpacing: '$6',
  color: '$surface',
  textAlign: 'center',
});

export function DemoBanner() {
  return (
    <Bar>
      <Badge>Preview</Badge>
      <Message>This is a design demo of SimplyFPL — data is illustrative.</Message>
    </Bar>
  );
}
