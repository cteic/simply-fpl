'use client';

import { Text, XStack, YStack, styled } from 'tamagui';

import { t } from '@simplyfpl/i18n';

const Row = styled(XStack, {
  alignItems: 'center',
  gap: 10,
  marginVertical: 4,
});

const Line = styled(YStack, {
  flex: 1,
  height: 1,
  backgroundColor: '$border',
  variants: {
    onPitch: {
      true: { backgroundColor: '$overlay4' },
    },
  } as const,
});

const Label = styled(Text, {
  fontFamily: '$body',
  fontSize: 9.5,
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '$10',
  color: '$colorSubtle',
  variants: {
    onPitch: {
      true: { color: '$inverseMuted' },
    },
  } as const,
});

interface BenchDividerProps {
  onPitch?: boolean;
}

export function BenchDivider({ onPitch = false }: BenchDividerProps) {
  return (
    <Row>
      <Line onPitch={onPitch} />
      <Label onPitch={onPitch}>{t('pitch.bench_divider')}</Label>
      <Line onPitch={onPitch} />
    </Row>
  );
}
