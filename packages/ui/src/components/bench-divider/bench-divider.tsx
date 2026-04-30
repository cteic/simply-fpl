'use client';

import { Stack, Text, XStack, styled } from 'tamagui';

const Row = styled(XStack, {
  alignItems: 'center',
  gap: 10,
  marginVertical: 4,
});

const Line = styled(Stack, {
  flex: 1,
  height: 1,
  backgroundColor: '$border',
});

const Label = styled(Text, {
  fontFamily: '$body',
  fontSize: 9.5,
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '$10',
  color: '$colorSubtle',
});

export function BenchDivider() {
  return (
    <Row>
      <Line />
      <Label>Bench</Label>
      <Line />
    </Row>
  );
}
