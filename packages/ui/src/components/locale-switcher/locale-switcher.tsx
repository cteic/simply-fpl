'use client';

import { Text, XStack, styled } from 'tamagui';

import { LOCALE_LABELS, SUPPORTED_LOCALES, t } from '@simplyfpl/i18n';
import type { SupportedLocale } from '@simplyfpl/i18n';

const Option = styled(XStack, {
  alignItems: 'center',
  borderWidth: 1,
  borderRadius: 8,
  paddingHorizontal: 12,
  paddingVertical: 7,
  cursor: 'pointer',
  backgroundColor: '$surface',
  borderColor: '$border',
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

interface LocaleSwitcherProps {
  value: SupportedLocale;
  onSelect: (locale: SupportedLocale) => void;
}

export function LocaleSwitcher({ value, onSelect }: LocaleSwitcherProps) {
  return (
    <XStack role="radiogroup" aria-label={t('settings.section_language')} flexWrap="wrap" gap={8}>
      {SUPPORTED_LOCALES.map((code) => {
        const selected = code === value;
        return (
          <Option
            key={code}
            render="button"
            role="radio"
            aria-checked={selected}
            aria-label={LOCALE_LABELS[code]}
            selected={selected}
            onPress={() => {
              onSelect(code);
            }}
          >
            <Text
              fontFamily="$body"
              fontSize={13}
              fontWeight={selected ? '600' : '400'}
              color={selected ? '$brand' : '$color'}
            >
              {LOCALE_LABELS[code]}
            </Text>
          </Option>
        );
      })}
    </XStack>
  );
}
