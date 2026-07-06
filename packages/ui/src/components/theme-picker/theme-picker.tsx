'use client';

import { Text, XStack, YStack, styled } from 'tamagui';

import { t } from '@simplyfpl/i18n';
import type { ThemeName } from '@simplyfpl/types';

import { THEME_OPTIONS } from '../../theme';

const Option = styled(YStack, {
  flexGrow: 1,
  flexBasis: 160,
  borderWidth: 1,
  borderRadius: 12,
  padding: 14,
  gap: 12,
  cursor: 'pointer',
  backgroundColor: '$surface',
  borderColor: '$border',
  transition: 'medium',
  hoverStyle: { borderColor: '$borderStrong' },
  variants: {
    selected: {
      true: {
        borderColor: '$brand',
        backgroundColor: '$brandBg',
        hoverStyle: { borderColor: '$brand' },
      },
    },
  } as const,
});

interface ThemePickerProps {
  value: ThemeName;
  onSelect: (theme: ThemeName) => void;
}

export function ThemePicker({ value, onSelect }: ThemePickerProps) {
  return (
    <XStack role="radiogroup" aria-label={t('theme_picker.aria_label')} flexWrap="wrap" gap={12}>
      {THEME_OPTIONS.map((option) => {
        const selected = option.name === value;
        return (
          <Option
            key={option.name}
            render="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.label}
            selected={selected}
            onPress={() => {
              onSelect(option.name);
            }}
          >
            <XStack alignItems="center" justifyContent="space-between">
              <XStack borderRadius={8} overflow="hidden" borderWidth={1} borderColor="$border">
                {option.swatch.map((color) => (
                  <YStack key={color} width={20} height={26} backgroundColor={color} />
                ))}
              </XStack>
              <YStack
                width={10}
                height={10}
                borderRadius={99}
                backgroundColor={selected ? '$brand' : 'transparent'}
                borderWidth={selected ? 0 : 1}
                borderColor="$borderStrong"
              />
            </XStack>
            <YStack gap={3}>
              <Text fontFamily="$body" fontSize={13} fontWeight="600" color="$color">
                {option.label}
              </Text>
              <Text fontFamily="$body" fontSize={11} lineHeight={15} color="$colorMuted">
                {option.description}
              </Text>
            </YStack>
          </Option>
        );
      })}
    </XStack>
  );
}
