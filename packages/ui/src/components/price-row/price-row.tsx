'use client';

import { Stack, Text, XStack, YStack, styled } from 'tamagui';

const Row = styled(XStack, {
  alignItems: 'center',
  paddingHorizontal: 16,
  paddingVertical: 10,
  gap: 12,
  borderBottomWidth: 1,
  borderBottomColor: '$border',
  cursor: 'pointer',
  animation: 'fast',
  hoverStyle: { backgroundColor: '$background' },
  variants: {
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

const Bar = styled(Stack, {
  flex: 1,
  minWidth: 40,
});

const Track = styled(Stack, {
  height: 3,
  backgroundColor: '$border',
  borderRadius: 2,
  overflow: 'hidden',
});

const Fill = styled(Stack, {
  height: '100%',
  borderRadius: 2,
  animation: 'bar',
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
    confidence: {
      hi: { color: '$positive', backgroundColor: '$positiveBg' },
      md: { color: '$warning', backgroundColor: '$warningBg' },
      lo: {
        color: '$colorSubtle',
        backgroundColor: '$background',
        borderWidth: 1,
        borderColor: '$border',
      },
    },
  } as const,
});

interface PriceRowProps {
  index: number;
  name: string;
  club: string;
  flow: 'rise' | 'fall';
  value: string;
  probability: number;
  last?: boolean;
}

function confidenceTier(probability: number): 'hi' | 'md' | 'lo' {
  if (probability >= 70) return 'hi';
  if (probability >= 40) return 'md';
  return 'lo';
}

export function PriceRow({ index, name, club, flow, value, probability, last }: PriceRowProps) {
  const arrow = flow === 'rise' ? '↑' : '↓';
  const tier = confidenceTier(probability);
  return (
    <Row last={last}>
      <Pos>{index}</Pos>
      <Info>
        <Name>{name}</Name>
        <Club>{club}</Club>
      </Info>
      <Bar>
        <Track>
          <Fill flow={flow} width={`${Math.max(0, Math.min(100, probability))}%`} />
        </Track>
      </Bar>
      <Right>
        <Value>{value}</Value>
        <Prob confidence={tier}>
          {arrow} {probability}%
        </Prob>
      </Right>
    </Row>
  );
}
