'use client';

import { Text, YStack } from 'tamagui';

import { resolveAdSlotState } from './ad-slot-state';

export interface AdSlotProps {
  placement: 'rank-inline' | 'leagues-row' | 'h2h-below-fold';
  minHeight: number;
  adFree?: boolean;
}

export function AdSlot({ placement: _placement, minHeight, adFree = false }: AdSlotProps) {
  const state = resolveAdSlotState({ adFree });

  if (state === 'hidden') return null;

  if (state === 'placeholder') {
    return <YStack height={minHeight} />;
  }

  return (
    <YStack
      minHeight={minHeight}
      backgroundColor="#F7F7F5"
      borderWidth={1}
      borderColor="$border"
      borderRadius={12}
      paddingHorizontal={14}
      paddingVertical={10}
    >
      <Text fontFamily="$body" fontSize={11} color="$colorSubtle">
        Sponsored
      </Text>
    </YStack>
  );
}
