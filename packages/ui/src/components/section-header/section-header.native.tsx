import type { ReactNode } from 'react';

import { Text, XStack, styled } from 'tamagui';

const Row = styled(XStack, {
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 10,
});

const Title = styled(Text, {
  fontFamily: '$body',
  fontSize: 10,
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '$11',
  color: '$colorSubtle',
});

interface SectionHeaderProps {
  title: string;
  action?: ReactNode;
}

export function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <Row>
      <Title>{title}</Title>
      {action ?? null}
    </Row>
  );
}
