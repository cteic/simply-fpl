'use client';

import { styled, Text, XStack, YStack } from 'tamagui';

const Row = styled(XStack, {
  alignItems: 'center',
  paddingHorizontal: 16,
  paddingVertical: 10,
  gap: 12,
  borderBottomWidth: 1,
  borderBottomColor: '$border',
  cursor: 'pointer',
  transition: 'fast',
  hoverStyle: { backgroundColor: '$background' },
  borderLeftWidth: 3,
  borderLeftColor: 'transparent',
  variants: {
    flow: {
      rise: { borderLeftColor: '$positive' },
      fall: { borderLeftColor: '$negative' },
    },
    last: {
      true: { borderBottomWidth: 0 },
    },
  } as const,
});

const Pos = styled(Text, {
  fontFamily: '$mono',
  fontSize: 10,
  color: '$colorSubtle',
  width: 12,
});

const Info = styled(YStack, {
  flex: 1,
  minWidth: 0,
});

const ClubDot = styled(YStack, {
  width: 7,
  height: 7,
  borderRadius: 4,
  flexShrink: 0,
});

const Name = styled(Text, {
  fontFamily: '$body',
  fontSize: 12,
  fontWeight: '500',
  letterSpacing: '$5',
  color: '$color',
  numberOfLines: 1,
});

const Club = styled(Text, {
  fontFamily: '$body',
  fontSize: 10,
  color: '$colorSubtle',
  marginTop: 1,
});

const Bar = styled(YStack, {
  flex: 1,
  minWidth: 40,
});

const Track = styled(YStack, {
  height: 3,
  backgroundColor: '$border',
  borderRadius: 2,
  overflow: 'hidden',
});

const Fill = styled(YStack, {
  height: '100%',
  borderRadius: 2,
  transition: 'bar',
  variants: {
    flow: {
      rise: { backgroundColor: '$positive' },
      fall: { backgroundColor: '$negative' },
    },
  } as const,
});

const Right = styled(YStack, {
  alignItems: 'flex-end',
  minWidth: 72,
});

const Value = styled(Text, {
  fontFamily: '$mono',
  fontSize: 12,
  fontWeight: '500',
  color: '$color',
});

const Prob = styled(Text, {
  alignSelf: 'flex-end',
  fontFamily: '$body',
  fontSize: 10,
  fontWeight: '600',
  paddingHorizontal: 6,
  paddingVertical: 2,
  borderRadius: 4,
  marginTop: 2,
  variants: {
    flow: {
      rise: { color: '#FFFFFF', backgroundColor: '$positive' },
      fall: { color: '#FFFFFF', backgroundColor: '$negative' },
    },
    muted: {
      true: { color: '$colorSubtle', backgroundColor: '$border' },
    },
  } as const,
});

interface DefConMiniBar {
  percentage: number;
  breakdown?: string;
}

interface PriceRowProps {
  index: number;
  name: string;
  club: string;
  flow: 'rise' | 'fall';
  value: string;
  /**
   * How far along FPL's own price-change threshold the player is. 100 means a
   * change is due, and it can read above 100 while one is pending.
   */
  progressPercent: number;
  /** FPL has locked this player, so no change lands today whatever the bar says. */
  locked?: boolean | undefined;
  last?: boolean;
  accentColor?: string | undefined;
  defconBar?: DefConMiniBar | undefined;
}

export function PriceRow({
  index,
  name,
  club,
  flow,
  value,
  progressPercent,
  locked,
  last,
  accentColor,
  defconBar,
}: PriceRowProps) {
  const arrow = flow === 'rise' ? '↑' : '↓';
  const fillWidth = Math.max(0, Math.min(100, progressPercent));
  const badge = locked === true ? 'locked' : `${arrow} ${Math.round(progressPercent)}%`;
  return (
    <Row last={last} flow={flow}>
      <Pos>{index}</Pos>
      <Info>
        <XStack alignItems="center" gap={6}>
          {accentColor ? <ClubDot backgroundColor={accentColor} /> : null}
          <Name>{name}</Name>
        </XStack>
        <Club>{club}</Club>
        {defconBar ? (
          <YStack
            marginTop={4}
            aria-label={defconBar.breakdown ?? `${Math.round(defconBar.percentage)}% CBIT/90`}
          >
            <Track>
              <YStack
                height="100%"
                borderRadius={2}
                backgroundColor="$colorSubtle"
                width={`${Math.max(0, Math.min(100, defconBar.percentage))}%`}
              />
            </Track>
          </YStack>
        ) : null}
      </Info>
      <Bar>
        <Track>
          <Fill flow={flow} width={`${fillWidth}%`} />
        </Track>
      </Bar>
      <Right>
        <Value>{value}</Value>
        <Prob flow={flow} muted={locked === true}>
          {badge}
        </Prob>
      </Right>
    </Row>
  );
}
