'use client';

import { Text, XStack, styled } from 'tamagui';

import type { ThemeName } from '@simplyfpl/types';

import { THEME_OPTIONS } from '../../theme';

const Group = styled(XStack, {
  alignItems: 'center',
  gap: 3,
  padding: 3,
  borderRadius: 99,
  borderWidth: 1,
  borderColor: '$borderStrong',
  backgroundColor: '$surface',
});

const Segment = styled(Text, {
  fontFamily: '$body',
  fontSize: 11,
  fontWeight: '600',
  letterSpacing: '$6',
  paddingHorizontal: 11,
  paddingVertical: 5,
  borderRadius: 99,
  cursor: 'pointer',
  transition: 'fast',
  variants: {
    active: {
      true: { backgroundColor: '$color', color: '$surface' },
      false: {
        backgroundColor: 'transparent',
        color: '$colorMuted',
        hoverStyle: { color: '$color' },
      },
    },
  } as const,
  defaultVariants: { active: false },
});

interface ThemeToggleProps {
  value: ThemeName;
  onSelect: (theme: ThemeName) => void;
}

export function ThemeToggle({ value, onSelect }: ThemeToggleProps) {
  return (
    <Group role="radiogroup" aria-label="Theme">
      {THEME_OPTIONS.map((option) => {
        const selected = option.name === value;
        return (
          <Segment
            key={option.name}
            render="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.label}
            active={selected}
            onPress={() => {
              onSelect(option.name);
            }}
          >
            {option.label}
          </Segment>
        );
      })}
    </Group>
  );
}
