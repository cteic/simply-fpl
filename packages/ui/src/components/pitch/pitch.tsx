'use client';

import type { ReactNode } from 'react';

import { Text, XStack, YStack, styled } from 'tamagui';

import { Card } from '../card';

const Head = styled(XStack, {
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: 18,
  paddingVertical: 13,
  borderBottomWidth: 1,
  borderBottomColor: '$border',
});

const Title = styled(Text, {
  fontFamily: '$body',
  fontSize: 12.5,
  fontWeight: '500',
  letterSpacing: '$5',
  color: '$color',
});

const FormationTag = styled(Text, {
  fontFamily: '$mono',
  fontSize: 11,
  fontWeight: '500',
  color: '$colorMuted',
  backgroundColor: '$background',
  borderWidth: 1,
  borderColor: '$borderStrong',
  paddingHorizontal: 8,
  paddingVertical: 3,
  borderRadius: 4,
});

const Body = styled(YStack, {
  paddingHorizontal: 18,
  paddingVertical: 20,
  gap: 16,
});

export const PitchRow = styled(XStack, {
  justifyContent: 'center',
  gap: 8,
  flexWrap: 'wrap',
});

interface PitchProps {
  teamName: string;
  formation: string;
  children: ReactNode;
}

export function Pitch({ teamName, formation, children }: PitchProps) {
  return (
    <Card>
      <Head>
        <Title>{teamName}</Title>
        <FormationTag>{formation}</FormationTag>
      </Head>
      <Body>{children}</Body>
    </Card>
  );
}
