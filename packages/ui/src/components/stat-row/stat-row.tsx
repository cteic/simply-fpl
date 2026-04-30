'use client';

import type { ReactNode } from 'react';

import { XStack, styled } from 'tamagui';

const Row = styled(XStack, {
  display: 'grid' as never,
  gridTemplateColumns: 'repeat(3, 1fr)' as never,
  gap: 1,
  backgroundColor: '$border',
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: '$border',
  borderRadius: '$6',
  overflow: 'hidden',
  marginBottom: 20,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 3,
  $sm: { gridTemplateColumns: '1fr' as never },
});

interface StatRowProps {
  children: ReactNode;
}

export function StatRow({ children }: StatRowProps) {
  return <Row>{children}</Row>;
}
