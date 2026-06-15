'use client';

import { Text, XStack } from 'tamagui';

import { FilterButton } from '../filter-button';

interface RivalsWindowSelectorProps {
  options: readonly number[];
  selected: number;
  onSelect: (size: number) => void;
}

export function RivalsWindowSelector({ options, selected, onSelect }: RivalsWindowSelectorProps) {
  return (
    <XStack alignItems="center" gap={2}>
      {options.map((size, i) => (
        <XStack key={size} alignItems="center" gap={2}>
          {i > 0 && (
            <Text fontFamily="$body" fontSize="$4" color="$borderStrong" paddingHorizontal={2}>
              │
            </Text>
          )}
          <FilterButton active={selected === size} onPress={() => onSelect(size)}>
            {String(size)}
          </FilterButton>
        </XStack>
      ))}
    </XStack>
  );
}
