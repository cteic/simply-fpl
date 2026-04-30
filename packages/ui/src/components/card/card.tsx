'use client';

import { YStack, styled } from 'tamagui';

export const Card = styled(YStack, {
  backgroundColor: '$surface',
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: '$border',
  borderRadius: '$6',
  overflow: 'hidden',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 3,
});
