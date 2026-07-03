'use client';

import type { ReactNode } from 'react';

import { YStack, styled } from 'tamagui';

import { PitchBackground } from '../pitch-background';

const Field = styled(YStack, {
  position: 'relative',
  overflow: 'hidden',
  borderRadius: '$6',
  borderWidth: 1,
  borderColor: '$overlay3',
});

const Rows = styled(YStack, {
  position: 'relative',
  zIndex: 1,
  gap: 16,
  paddingHorizontal: 12,
  paddingVertical: 18,
});

interface PitchFieldProps {
  children: ReactNode;
}

export function PitchField({ children }: PitchFieldProps) {
  return (
    <Field>
      <PitchBackground />
      <Rows>{children}</Rows>
    </Field>
  );
}
