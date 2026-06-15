import type { ReactNode } from 'react';

import { StyleSheet } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';

import { Text, XStack, YStack, styled } from 'tamagui';

import { colors } from '../../theme/colors';

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
  title: string | ReactNode;
  meta?: string;
  right?: ReactNode;
  tone?: 'plain' | 'stadium';
}

const STADIUM_STOPS = [colors.stadium1, colors.stadium2, colors.stadium3] as const;
const STADIUM_LOCATIONS = [0, 0.45, 1] as const;

export function PageHeader({ title, meta, right, tone = 'plain' }: PageHeaderProps) {
  if (tone === 'stadium') {
    return (
      <YStack
        borderRadius={14}
        overflow="hidden"
        marginBottom={20}
        paddingHorizontal={22}
        paddingVertical={20}
        backgroundColor="$brand"
      >
        <LinearGradient
          colors={STADIUM_STOPS}
          locations={STADIUM_LOCATIONS}
          start={{ x: 0.9, y: 0 }}
          end={{ x: 0.1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <XStack alignItems="center" justifyContent="space-between" gap={12} flexWrap="wrap">
          <YStack>
            {typeof title === 'string' ? (
              <Text
                fontFamily="$body"
                fontSize="$13"
                fontWeight="600"
                letterSpacing="$2"
                color="#FFFFFF"
              >
                {title}
              </Text>
            ) : (
              title
            )}
            {meta ? (
              <Text
                fontFamily="$body"
                fontSize="$4"
                letterSpacing="$6"
                color="rgba(255,255,255,0.72)"
                marginTop={5}
              >
                {meta}
              </Text>
            ) : null}
          </YStack>
          {right ? <YStack>{right}</YStack> : null}
        </XStack>
      </YStack>
    );
  }

  return (
    <Header>
      <YStack>
        {typeof title === 'string' ? <Title>{title}</Title> : title}
        {meta ? <Meta>{meta}</Meta> : null}
      </YStack>
      {right ? <YStack>{right}</YStack> : null}
    </Header>
  );
}
