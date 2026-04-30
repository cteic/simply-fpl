'use client';

import { Stack, Text, XStack, styled } from 'tamagui';

const LogoLink = styled(XStack, {
  alignItems: 'center',
  gap: 9,
  cursor: 'pointer',
});

const LogoMark = styled(Stack, {
  width: 26,
  height: 26,
  backgroundColor: '$color',
  borderRadius: 7,
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
});

const LogoText = styled(Text, {
  fontFamily: '$body',
  fontSize: '$12',
  fontWeight: '600',
  letterSpacing: '$3',
  color: '$color',
});

interface LogoProps {
  showText?: boolean;
}

export function Logo({ showText = true }: LogoProps) {
  return (
    <LogoLink tag="a" href="/">
      <LogoMark>
        <svg viewBox="0 0 14 14" fill="none" width={14} height={14}>
          <rect x="1" y="1" width="5" height="5" rx="1.3" fill="white" />
          <rect x="8" y="1" width="5" height="5" rx="1.3" fill="white" opacity="0.4" />
          <rect x="1" y="8" width="5" height="5" rx="1.3" fill="white" opacity="0.4" />
          <rect x="8" y="8" width="5" height="5" rx="1.3" fill="white" />
        </svg>
      </LogoMark>
      {showText ? <LogoText>SimplyFPL</LogoText> : null}
    </LogoLink>
  );
}
