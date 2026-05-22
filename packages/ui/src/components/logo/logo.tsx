'use client';

import { Text, XStack, styled } from 'tamagui';

type LogoVariant = 'wordmark' | 'mark' | 'lockup';
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

const LOCKUP_MARK_SIZE: Record<LogoSize, number> = {
  sm: 22,
  md: 26,
  lg: 42,
};

const LOCKUP_MARK_SRC: Record<LogoTone, string> = {
  default: '/brand/simplyfpl-mark.svg',
  inverse: '/brand/simplyfpl-mark-inverse.svg',
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
  const dotColor = tone === 'inverse' ? '#5EEAD4' : '$brand';
  const linkProps = href ? { tag: 'a' as const, href } : {};

  if (variant === 'lockup') {
    const px = WORDMARK_SIZE[size];
    const markPx = LOCKUP_MARK_SIZE[size];
    return (
      <Wrap {...linkProps} gap={9}>
        <XStack
          width={markPx}
          height={markPx}
          flexShrink={0}
          style={{
            backgroundImage: `url(${LOCKUP_MARK_SRC[tone]})`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
          }}
        />
        <XStack alignItems="center" gap={0}>
          <Glyph fontSize={px} lineHeight={px} color={baseColor}>
            simply
          </Glyph>
          <Glyph fontSize={px} lineHeight={px} color={dotColor}>
            .
          </Glyph>
          <Glyph fontSize={px} lineHeight={px} color={baseColor}>
            fpl
          </Glyph>
        </XStack>
      </Wrap>
    );
  }

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
