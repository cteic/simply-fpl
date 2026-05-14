'use client';

import type { ReactNode } from 'react';

import { Text, styled } from 'tamagui';

const ButtonBase = styled(Text, {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 5,
  fontFamily: '$body',
  fontWeight: '500',
  letterSpacing: '$6',
  borderRadius: '$3',
  cursor: 'pointer',
  borderWidth: 1,
  whiteSpace: 'nowrap',
  transition: 'fast',
  pressStyle: { opacity: 0.85 },
  variants: {
    tone: {
      primary: {
        backgroundColor: '$buttonPrimary',
        borderColor: '$buttonPrimary',
        color: '$surface',
        hoverStyle: { backgroundColor: '$buttonPrimaryHover', borderColor: '$buttonPrimaryHover' },
      },
      ghost: {
        backgroundColor: 'transparent',
        borderColor: '$borderStrong',
        color: '$colorMuted',
        hoverStyle: { backgroundColor: '$border', color: '$color' },
      },
    },
    size: {
      sm: { paddingHorizontal: 11, paddingVertical: 4, fontSize: '$5' },
      md: { paddingHorizontal: 14, paddingVertical: 6, fontSize: '$7' },
      lg: { paddingHorizontal: 18, paddingVertical: 9, fontSize: '$8' },
    },
  } as const,
  defaultVariants: {
    tone: 'primary',
    size: 'md',
  },
});

interface ButtonProps {
  children: ReactNode;
  tone?: 'primary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  onPress?: () => void;
}

export function Button({ children, tone = 'primary', size = 'md', onPress }: ButtonProps) {
  return (
    <ButtonBase render="button" tone={tone} size={size} onPress={onPress} role="button">
      {children}
    </ButtonBase>
  );
}
