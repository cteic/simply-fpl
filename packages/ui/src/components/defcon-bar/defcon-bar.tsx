'use client';

import { Text, XStack, YStack, styled } from 'tamagui';

const Track = styled(YStack, {
  height: 3,
  backgroundColor: '$border',
  borderRadius: 2,
  overflow: 'hidden',
  width: '100%',
});

const Fill = styled(YStack, {
  height: '100%',
  borderRadius: 2,
  variants: {
    awarded: {
      true: { backgroundColor: '$positive' },
      false: { backgroundColor: '$colorSubtle' },
    },
  } as const,
  defaultVariants: {
    awarded: false,
  },
});

const AwardedChip = styled(XStack, {
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '$positive',
  borderRadius: 4,
  paddingHorizontal: 4,
  paddingVertical: 1,
  gap: 2,
});

export interface DefConBarProps {
  current: number;
  threshold: number;
  percentage: number;
  awarded: boolean;
  breakdown?: string;
}

export function DefConBar({ current, threshold, percentage, awarded, breakdown }: DefConBarProps) {
  const clamped = Math.max(0, Math.min(100, percentage));

  return (
    <YStack width="100%" gap={2} aria-label={breakdown ?? `${current}/${threshold} CBIT`}>
      <Track>
        <Fill awarded={awarded} width={`${clamped}%`} />
      </Track>
      {awarded ? (
        <AwardedChip>
          <Text fontFamily="$mono" fontSize={7} fontWeight="600" color="#0B4F49" lineHeight={9}>
            ✓ +2
          </Text>
        </AwardedChip>
      ) : (
        <Text fontFamily="$mono" fontSize={7} color="$colorMuted" textAlign="center" lineHeight={9}>
          {current}/{threshold}
        </Text>
      )}
    </YStack>
  );
}
