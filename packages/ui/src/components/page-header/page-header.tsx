'use client';

import type { ReactNode } from 'react';

import { styled, Text, useThemeName, XStack, YStack } from 'tamagui';

import { featureSurfaceStyle, resolveThemeName } from '../../theme';

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
  /**
   * Phone density: a slim band rather than a hero. The full-height header cost
   * every mobile screen roughly a fifth of its first fold.
   */
  compact?: boolean;
}

export function PageHeader({
  title,
  meta,
  right,
  tone = 'plain',
  compact = false,
}: PageHeaderProps) {
  const themeName = resolveThemeName(useThemeName());
  if (tone === 'stadium') {
    const surface = featureSurfaceStyle(themeName, 'panel');
    // Quiet has a light surface (no dark gradient), so hard-coded white text
    // is invisible. Stadium + Bold both render onto a dark gradient.
    const titleColor = themeName === 'quiet' ? '$color' : '#FFFFFF';
    const metaColor = themeName === 'quiet' ? '$colorMuted' : 'rgba(255,255,255,0.72)';
    return (
      <YStack
        borderRadius={compact ? 12 : 14}
        overflow="hidden"
        marginBottom={compact ? 0 : 20}
        paddingHorizontal={compact ? 14 : 22}
        paddingVertical={compact ? 10 : 20}
        backgroundColor="$featureSurface"
        borderWidth={surface.borderWidth}
        borderColor="$featureBorder"
        style={{ backgroundImage: surface.backgroundImage }}
      >
        <XStack alignItems="center" justifyContent="space-between" gap={12} flexWrap="wrap">
          <YStack flexShrink={1}>
            {typeof title === 'string' ? (
              <Text
                render="h1"
                fontFamily="$body"
                fontSize={compact ? 17 : '$13'}
                fontWeight="600"
                letterSpacing="$2"
                color={titleColor}
              >
                {title}
              </Text>
            ) : (
              title
            )}
            {meta ? (
              <Text
                fontFamily="$body"
                fontSize={compact ? 11.5 : '$4'}
                letterSpacing="$6"
                color={metaColor}
                marginTop={compact ? 2 : 5}
                {...(compact ? { numberOfLines: 2 } : {})}
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
        {typeof title === 'string' ? <Title render="h1">{title}</Title> : title}
        {meta ? <Meta>{meta}</Meta> : null}
      </YStack>
      {right ? <YStack>{right}</YStack> : null}
    </Header>
  );
}
