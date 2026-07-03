'use client';

import { Select, YStack } from 'tamagui';

import { LOCALE_LABELS, SUPPORTED_LOCALES } from '@simplyfpl/i18n';
import type { SupportedLocale } from '@simplyfpl/i18n';

interface LocaleSwitcherProps {
  value: SupportedLocale;
  onSelect: (locale: SupportedLocale) => void;
}

export function LocaleSwitcher({ value, onSelect }: LocaleSwitcherProps) {
  return (
    <YStack>
      <Select
        value={value}
        onValueChange={(next) => {
          if (SUPPORTED_LOCALES.includes(next as SupportedLocale)) {
            onSelect(next as SupportedLocale);
          }
        }}
      >
        <Select.Trigger
          backgroundColor="$surface"
          borderColor="$border"
          borderWidth={1}
          borderRadius={8}
          paddingHorizontal={12}
          paddingVertical={8}
          minWidth={160}
        >
          <Select.Value fontFamily="$body" fontSize={13} color="$color" />
        </Select.Trigger>

        <Select.Content>
          <Select.ScrollUpButton />
          <Select.Viewport>
            <Select.Group>
              {SUPPORTED_LOCALES.map((code, index) => (
                <Select.Item key={code} value={code} index={index}>
                  <Select.ItemText fontFamily="$body" fontSize={13}>
                    {LOCALE_LABELS[code]}
                  </Select.ItemText>
                </Select.Item>
              ))}
            </Select.Group>
          </Select.Viewport>
          <Select.ScrollDownButton />
        </Select.Content>
      </Select>
    </YStack>
  );
}
