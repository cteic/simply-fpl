'use client';

import { Text, XStack, YStack, styled } from 'tamagui';

const Wrap = styled(YStack, {
  marginTop: 12,
});

const LabelRow = styled(XStack, {
  justifyContent: 'space-between',
  marginBottom: 5,
});

const Label = styled(Text, {
  fontFamily: '$body',
  fontSize: '$1',
  color: '$colorSubtle',
});

const Track = styled(YStack, {
  height: 3,
  backgroundColor: '$border',
  borderRadius: 2,
  overflow: 'hidden',
});

const Fill = styled(YStack, {
  height: '100%',
  backgroundColor: '$color',
  borderRadius: 2,
  transition: 'bar',
});

interface ProgressBarProps {
  percent: number;
  labels?: string[];
}

export function ProgressBar({ percent, labels }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <Wrap>
      {labels && labels.length > 0 ? (
        <LabelRow>
          {labels.map((label, i) => (
            <Label key={i}>{label}</Label>
          ))}
        </LabelRow>
      ) : null}
      <Track>
        <Fill width={`${clamped}%`} />
      </Track>
    </Wrap>
  );
}
