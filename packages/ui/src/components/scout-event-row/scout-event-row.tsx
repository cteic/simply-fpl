'use client';

import { Text, XStack, YStack, styled } from 'tamagui';

const Row = styled(XStack, {
  alignItems: 'flex-start',
  gap: 12,
  paddingHorizontal: 16,
  paddingVertical: 13,
  borderBottomWidth: 1,
  borderBottomColor: '$border',
  borderStyle: 'solid',
  variants: {
    last: {
      true: { borderBottomWidth: 0 },
    },
  } as const,
});

const Dot = styled(YStack, {
  width: 8,
  height: 8,
  borderRadius: 4,
  marginTop: 5,
  flexShrink: 0,
  variants: {
    tone: {
      bad: { backgroundColor: '$negative' },
      warn: { backgroundColor: '$warning' },
      good: { backgroundColor: '$positive' },
    },
  } as const,
  defaultVariants: { tone: 'warn' },
});

const Chip = styled(Text, {
  alignSelf: 'flex-start',
  fontFamily: '$body',
  fontSize: 9,
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  paddingHorizontal: 6,
  paddingVertical: 1,
  borderRadius: 3,
  variants: {
    tone: {
      bad: { color: '$negative', backgroundColor: '$negativeBg' },
      warn: { color: '$warning', backgroundColor: '$warningBg' },
      good: { color: '$positive', backgroundColor: '$positiveBg' },
    },
  } as const,
  defaultVariants: { tone: 'warn' },
});

export type ScoutEventTone = 'bad' | 'warn' | 'good';

export interface ScoutEventRowProps {
  tone: ScoutEventTone;
  chipLabel: string;
  title: string;
  meta?: string;
  last?: boolean;
}

export function ScoutEventRow({ tone, chipLabel, title, meta, last = false }: ScoutEventRowProps) {
  return (
    <Row last={last}>
      <Dot tone={tone} />
      <YStack flex={1} minWidth={0} gap={4}>
        <XStack alignItems="center" gap={8}>
          <Chip tone={tone}>{chipLabel}</Chip>
        </XStack>
        <Text fontFamily="$body" fontSize={13} fontWeight="600" letterSpacing={-0.2} color="$color">
          {title}
        </Text>
        {meta ? (
          <Text fontFamily="$mono" fontSize={10} color="$colorSubtle">
            {meta}
          </Text>
        ) : null}
      </YStack>
    </Row>
  );
}
