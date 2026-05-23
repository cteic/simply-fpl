import type { ReactNode } from 'react';

import { Text, styled } from 'tamagui';

const ButtonBase = styled(Text, {
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  fontFamily: '$body',
  fontWeight: '500',
  letterSpacing: '$6',
  borderRadius: '$3',
  borderWidth: 1,
  pressStyle: { opacity: 0.85 },
  variants: {
    tone: {
      primary: {
        backgroundColor: '$buttonPrimary',
        borderColor: '$buttonPrimary',
        color: '$surface',
      },
      ghost: {
        backgroundColor: 'transparent',
        borderColor: '$borderStrong',
        color: '$colorMuted',
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
    <ButtonBase tone={tone} size={size} onPress={onPress}>
      {children}
    </ButtonBase>
  );
}
