'use client';

import { Text, XStack, styled } from 'tamagui';

type LogoVariant = 'wordmark' | 'mark';
type LogoSize = 'sm' | 'md' | 'lg';
type LogoTone = 'default' | 'inverse' | 'stadium';

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

function baseColorForTone(tone: LogoTone): string {
  if (tone === 'inverse') return '$background';
  if (tone === 'stadium') return '$inverse';
  return '$color';
}

export function Logo({ variant = 'wordmark', size = 'md', tone = 'default', href }: LogoProps) {
  const baseColor = baseColorForTone(tone);
  const dotColor = tone === 'stadium' ? '$stadiumAccent' : '$brand';
  const linkProps = href ? { tag: 'a' as const, href } : {};

  if (variant === 'mark') {
    const px = MARK_SIZE[size];
    return (
      <Wrap {...linkProps}>
        <Glyph fontSize={px} lineHeight={px} color={baseColor}>
          s
        </Glyph>
        <Glyph fontSize={px} lineHeight={px} color={dotColor}>
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
      <Glyph fontSize={px} lineHeight={px} color={dotColor}>
        .
      </Glyph>
      <Glyph fontSize={px} lineHeight={px} color={baseColor}>
        fpl
      </Glyph>
    </Wrap>
  );
}
