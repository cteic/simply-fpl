'use client';

import { Text, XStack, styled } from 'tamagui';

const Chip = styled(XStack, {
  alignItems: 'center',
  gap: 3,
});

const Label = styled(Text, {
  fontFamily: '$body',
  fontSize: 10.5,
  color: '$colorMuted',
});

const Value = styled(Text, {
  fontFamily: '$mono',
  fontSize: 11.5,
  fontWeight: '500',
  color: '$color',
});

interface PtsChipProps {
  label: string;
  value: string;
}

export function PtsChip({ label, value }: PtsChipProps) {
  return (
    <Chip>
      <Label>{label}</Label>
      <Value>{value}</Value>
    </Chip>
  );
}
