'use client';

import type { ReactNode } from 'react';

import { Text, styled } from 'tamagui';

const FilterBtn = styled(Text, {
  alignSelf: 'flex-start',
  fontFamily: '$body',
  fontSize: '$5',
  fontWeight: '500',
  letterSpacing: '$6',
  paddingHorizontal: 13,
  paddingVertical: 6,
  borderRadius: 20,
  borderWidth: 1,
  borderStyle: 'solid',
  cursor: 'pointer',
  animation: 'fast',
  variants: {
    active: {
      true: {
        backgroundColor: '$buttonPrimary',
        color: '$surface',
        borderColor: '$buttonPrimary',
      },
      false: {
        backgroundColor: '$surface',
        color: '$colorMuted',
        borderColor: '$borderStrong',
        hoverStyle: { borderColor: '$color' },
      },
    },
  } as const,
  defaultVariants: { active: false },
});

interface FilterButtonProps {
  children: ReactNode;
  active?: boolean;
  onPress?: () => void;
}

export function FilterButton({ children, active, onPress }: FilterButtonProps) {
  return (
    <FilterBtn tag="button" active={active} onPress={onPress} role="button">
      {children}
    </FilterBtn>
  );
}
