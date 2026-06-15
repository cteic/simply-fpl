'use client';

import { XStack } from 'tamagui';

import { FilterButton } from '../filter-button';

interface LeagueSwitcherProps {
  leagueIds: number[];
  activeLeagueId: number;
  onSelect: (leagueId: number) => void;
}

export function LeagueSwitcher({ leagueIds, activeLeagueId, onSelect }: LeagueSwitcherProps) {
  return (
    <XStack gap={6} flexWrap="wrap">
      {leagueIds.map((id) => (
        <FilterButton key={id} active={id === activeLeagueId} onPress={() => onSelect(id)}>
          #{String(id)}
        </FilterButton>
      ))}
    </XStack>
  );
}
