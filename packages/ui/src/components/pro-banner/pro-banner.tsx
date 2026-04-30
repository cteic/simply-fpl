'use client';

import { Text, XStack, YStack, styled } from 'tamagui';

import { Button } from '../button';

const Banner = styled(XStack, {
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: 20,
  paddingVertical: 16,
  marginTop: 16,
  backgroundColor: '$warningBg',
  borderWidth: 1,
  borderColor: '$warningBorder',
  borderRadius: '$6',
  gap: 16,
});

const Title = styled(Text, {
  fontFamily: '$body',
  fontSize: 13,
  fontWeight: '600',
  letterSpacing: '$4',
  color: '$warning',
});

const Body = styled(Text, {
  fontFamily: '$body',
  fontSize: 11,
  color: '$colorMuted',
  marginTop: 3,
});

interface ProBannerProps {
  title: string;
  body: string;
  ctaLabel?: string;
  onPress?: () => void;
}

const NOOP = () => {};

export function ProBanner({ title, body, ctaLabel = 'Go Pro ✦', onPress = NOOP }: ProBannerProps) {
  return (
    <Banner>
      <YStack flexShrink={1}>
        <Title>{title}</Title>
        <Body>{body}</Body>
      </YStack>
      <Button tone="primary" size="md" onPress={onPress}>
        {ctaLabel}
      </Button>
    </Banner>
  );
}
