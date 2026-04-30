'use client';

import type { ReactNode } from 'react';

import { Text, XStack, YStack, styled } from 'tamagui';

const Header = styled(XStack, {
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  marginBottom: 24,
  $sm: { flexDirection: 'column', gap: 12 },
});

const Title = styled(Text, {
  fontFamily: '$body',
  fontSize: '$13',
  fontWeight: '600',
  letterSpacing: '$2',
  color: '$color',
});

const Meta = styled(Text, {
  fontFamily: '$body',
  fontSize: '$4',
  letterSpacing: '$6',
  color: '$colorMuted',
  marginTop: 5,
});

interface PageHeaderProps {
  title: string;
  meta?: string;
  right?: ReactNode;
}

export function PageHeader({ title, meta, right }: PageHeaderProps) {
  return (
    <Header>
      <YStack>
        <Title>{title}</Title>
        {meta ? <Meta>{meta}</Meta> : null}
      </YStack>
      {right ? <YStack>{right}</YStack> : null}
    </Header>
  );
}
