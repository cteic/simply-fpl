'use client';

import type { ReactNode } from 'react';

import { Text, XStack, YStack, styled } from 'tamagui';

const CardBase = styled(YStack, {
  backgroundColor: '$surface',
  paddingVertical: 18,
  paddingHorizontal: 22,
});

const Label = styled(Text, {
  fontFamily: '$body',
  fontSize: 10,
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '$10',
  color: '$colorSubtle',
  marginBottom: 9,
});

const Value = styled(Text, {
  fontFamily: '$mono',
  fontSize: '$14',
  fontWeight: '400',
  letterSpacing: '$1',
  lineHeight: 32,
  color: '$color',
});

const Sub = styled(XStack, {
  alignItems: 'center',
  gap: 6,
  marginTop: 8,
  flexWrap: 'wrap',
});

const SubText = styled(Text, {
  fontFamily: '$body',
  fontSize: 10.5,
  color: '$colorSubtle',
  letterSpacing: '$6',
});

interface StatCardProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  extra?: ReactNode;
}

export function StatCard({ label, value, sub, extra }: StatCardProps) {
  return (
    <CardBase>
      <Label>{label}</Label>
      <Value>{value}</Value>
      {sub ? <Sub>{sub}</Sub> : null}
      {extra ?? null}
    </CardBase>
  );
}

export { SubText as StatSubText };
