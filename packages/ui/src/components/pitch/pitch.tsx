'use client';

import type { ReactNode } from 'react';

import { Text, XStack, YStack, styled, useThemeName } from 'tamagui';

import {
  getThemeDesign,
  resolveThemeName,
  stadiumPitchBodyGradient,
  stadiumPitchHeaderGradient,
} from '../../theme';
import { Card } from '../card';

const Head = styled(XStack, {
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: 18,
  paddingVertical: 13,
  borderBottomColor: '$border',
});

const Label = styled(Text, {
  fontFamily: '$body',
  fontSize: 10,
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '$11',
  marginBottom: 3,
});

const Title = styled(Text, {
  fontFamily: '$body',
  fontSize: 12.5,
  fontWeight: '500',
  letterSpacing: '$5',
});

const FormationTag = styled(Text, {
  fontFamily: '$mono',
  fontSize: 11,
  fontWeight: '500',
  borderWidth: 1,
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
  children: ReactNode;
}

export function Pitch({ teamName, formation, label, children }: PitchProps) {
  const design = getThemeDesign(resolveThemeName(useThemeName()));
  const gradientHeader = design.pitchHeader === 'gradient';

  return (
    <Card
      borderRadius={design.cardRadius}
      shadowColor={design.cardShadow.shadowColor}
      shadowOffset={design.cardShadow.shadowOffset}
      shadowOpacity={design.cardShadow.shadowOpacity}
      shadowRadius={design.cardShadow.shadowRadius}
    >
      <Head
        borderBottomWidth={gradientHeader ? 0 : 1}
        backgroundColor={gradientHeader ? '$featureSurface' : 'transparent'}
        style={gradientHeader ? { backgroundImage: stadiumPitchHeaderGradient } : undefined}
      >
        <YStack>
          {label ? (
            <Label color={gradientHeader ? '$inverseStrong' : '$colorSubtle'}>{label}</Label>
          ) : null}
          <Title color={gradientHeader ? '$inverse' : '$color'}>{teamName}</Title>
        </YStack>
        <FormationTag
          color={gradientHeader ? '$inverse' : '$colorMuted'}
          backgroundColor={gradientHeader ? '$overlay3' : '$background'}
          borderColor={gradientHeader ? '$overlay4' : '$borderStrong'}
        >
          {formation}
        </FormationTag>
      </Head>
      <Body style={design.pitchGrass ? { backgroundImage: stadiumPitchBodyGradient } : undefined}>
        {children}
      </Body>
    </Card>
  );
}
