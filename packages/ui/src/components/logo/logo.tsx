'use client';

import { Text, XStack, styled } from 'tamagui';

type LogoVariant = 'wordmark' | 'mark';
type LogoSize = 'sm' | 'md' | 'lg';
type LogoTone = 'default' | 'inverse';

interface LogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  tone?: LogoTone;
  href?: string;
}

const WORDMARK_SIZE: Record<LogoSize, number> = {
  sm: 13,
  md: 16,
  lg: 21,
};

const MARK_SIZE: Record<LogoSize, number> = {
  sm: 16,
  md: 24,
  lg: 32,
};

const Wrap = styled(XStack, {
  alignItems: 'center',
  gap: 0,
});

const Glyph = styled(Text, {
  fontFamily: '$mono',
  fontWeight: '500',
  letterSpacing: -0.5,
});

export function Logo({ variant = 'wordmark', size = 'md', tone = 'default', href }: LogoProps) {
  const baseColor = tone === 'inverse' ? '$background' : '$color';
  const linkProps = href ? { tag: 'a' as const, href } : {};

  if (variant === 'mark') {
    const px = MARK_SIZE[size];
    return (
      <Wrap {...linkProps}>
        <Glyph fontSize={px} lineHeight={px} color={baseColor}>
          s
        </Glyph>
        <Glyph fontSize={px} lineHeight={px} color="$brand">
          .
        </Glyph>
      </Wrap>
    );
  }

  const px = WORDMARK_SIZE[size];
  return (
    <Wrap {...linkProps}>
      <Glyph fontSize={px} lineHeight={px} color={baseColor}>
        simply
      </Glyph>
      <Glyph fontSize={px} lineHeight={px} color="$brand">
        .
      </Glyph>
      <Glyph fontSize={px} lineHeight={px} color={baseColor}>
        fpl
      </Glyph>
    </Wrap>
  );
}
