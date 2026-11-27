'use client';

import { styled, Text, XStack, YStack } from 'tamagui';

import { useEnter } from '../../hooks/use-enter';

export type LiveEventTone = 'positive' | 'negative' | 'neutral';

const Toast = styled(XStack, {
  alignItems: 'center',
  gap: 10,
  paddingHorizontal: 12,
  paddingVertical: 9,
  borderRadius: 12,
  borderWidth: 1,
  borderLeftWidth: 4,
  backgroundColor: '$surface',
  borderColor: '$border',
  overflow: 'hidden',
  variants: {
    tone: {
      positive: { borderLeftColor: '$positive' },
      negative: { borderLeftColor: '$negative' },
      neutral: { borderLeftColor: '$borderStrong' },
    },
  } as const,
  defaultVariants: { tone: 'neutral' },
});

const Flash = styled(YStack, {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  pointerEvents: 'none',
  variants: {
    tone: {
      positive: { backgroundColor: '$positive' },
      negative: { backgroundColor: '$negative' },
      neutral: { backgroundColor: '$borderStrong' },
    },
  } as const,
  defaultVariants: { tone: 'neutral' },
});

const Kind = styled(Text, {
  fontFamily: '$body',
  fontSize: 9.5,
  fontWeight: '700',
  textTransform: 'uppercase',
  letterSpacing: 1,
  variants: {
    tone: {
      positive: { color: '$positive' },
      negative: { color: '$negative' },
      neutral: { color: '$colorSubtle' },
    },
  } as const,
  defaultVariants: { tone: 'neutral' },
});

const Points = styled(Text, {
  fontFamily: '$mono',
  fontSize: 18,
  fontWeight: '500',
  variants: {
    tone: {
      positive: { color: '$positive' },
      negative: { color: '$negative' },
      neutral: { color: '$colorMuted' },
    },
  } as const,
  defaultVariants: { tone: 'neutral' },
});

export interface LiveEventToastProps {
  /** Short label for what happened, e.g. "Goal". */
  kind: string;
  /** Who it happened to. */
  title: string;
  /** Optional qualifier, e.g. "captain" or "on your bench". */
  detail?: string | undefined;
  /** Signed points swing, already formatted, e.g. "+8". Omit when there is none. */
  points?: string | undefined;
  tone?: LiveEventTone;
  testID?: string;
}

/**
 * One alert for something that just happened to the manager's squad.
 *
 * It drops in from above, with a wash of its accent colour that fades as it
 * settles, so a goal registers in peripheral vision without a modal or a sound.
 */
export function LiveEventToast({
  kind,
  title,
  detail,
  points,
  tone = 'neutral',
  testID,
}: LiveEventToastProps) {
  const progress = useEnter();
  return (
    <Toast
      tone={tone}
      opacity={progress}
      y={(1 - progress) * -18}
      scale={0.96 + progress * 0.04}
      {...(testID === undefined ? {} : { testID })}
    >
      <Flash tone={tone} opacity={(1 - progress) * 0.28} />
      <YStack flex={1} minWidth={0}>
        <Kind tone={tone}>{kind}</Kind>
        <Text fontFamily="$body" fontSize={14} fontWeight="600" color="$color" numberOfLines={1}>
          {title}
        </Text>
        {detail ? (
          <Text fontFamily="$body" fontSize={11} color="$colorSubtle" numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
      </YStack>
      {points ? <Points tone={tone}>{points}</Points> : null}
    </Toast>
  );
}
