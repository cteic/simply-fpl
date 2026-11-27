'use client';

import type { ReactNode } from 'react';

import { styled, Text, XStack, YStack } from 'tamagui';

import { Card } from '../card';

const Head = styled(XStack, {
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: 18,
  paddingVertical: 13,
  borderBottomWidth: 1,
  borderBottomColor: '$border',
});

const Label = styled(Text, {
  fontFamily: '$body',
  fontSize: 10,
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '$11',
  color: '$colorSubtle',
  marginBottom: 3,
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
  label?: string;
  /** Phone density: a one-line header and tighter rows. */
  dense?: boolean;
  children: ReactNode;
}

export function Pitch({ teamName, formation, label, dense = false, children }: PitchProps) {
  if (dense) {
    return (
      <Card>
        <Head paddingHorizontal={12} paddingVertical={6}>
          <XStack alignItems="center" gap={8} flexShrink={1}>
            <Title numberOfLines={1}>{teamName}</Title>
            {label ? <Label marginBottom={0}>{label}</Label> : null}
          </XStack>
          <FormationTag>{formation}</FormationTag>
        </Head>
        <Body paddingHorizontal={6} paddingVertical={8} gap={8}>
          {children}
        </Body>
      </Card>
    );
  }
  return (
    <Card>
      <Head>
        <YStack>
          {label ? <Label>{label}</Label> : null}
          <Title>{teamName}</Title>
        </YStack>
        <FormationTag>{formation}</FormationTag>
      </Head>
      <Body>{children}</Body>
    </Card>
  );
}
