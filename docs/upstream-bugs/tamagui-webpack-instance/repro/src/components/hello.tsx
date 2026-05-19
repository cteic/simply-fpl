'use client';

import { Text, YStack } from 'tamagui';

export function Hello() {
  return (
    <YStack padding="$4" gap="$2">
      <Text fontSize="$6">Hello from Tamagui</Text>
    </YStack>
  );
}
