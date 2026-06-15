'use client';

import { useState } from 'react';

import { Text, XStack, YStack } from 'tamagui';

import { Input } from '../input';

export interface WhatIfCandidateOption {
  id: number;
  name: string;
  livePoints: number;
  positionShort?: string;
}

export interface WhatIfPanelProps {
  type: 'captain' | 'transfer';
  candidates: WhatIfCandidateOption[];
  activeId: number | null;
  simulatedPoints: number | null;
  deltaPoints: number | null;
  deltaRank: number | null;
  transferSearch?: string | undefined;
  onTransferSearchChange?: ((value: string) => void) | undefined;
  onSelectCandidate: (id: number) => void;
  onReset: () => void;
  onClose: () => void;
}

export function WhatIfPanel({
  type,
  candidates,
  activeId,
  simulatedPoints,
  deltaPoints,
  deltaRank,
  transferSearch = '',
  onTransferSearchChange,
  onSelectCandidate,
  onReset,
  onClose,
}: WhatIfPanelProps) {
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const title = type === 'captain' ? 'Change captain to' : 'Simulate transfer in';
  const hasResult = simulatedPoints !== null && deltaPoints !== null;
  const highlightId = activeId ?? hoveredId;

  const filteredCandidates =
    type === 'transfer' && transferSearch.length > 0
      ? candidates.filter((c) => c.name.toLowerCase().includes(transferSearch.toLowerCase()))
      : candidates;

  return (
    <YStack
      backgroundColor="$surface"
      borderWidth={1}
      borderColor="$border"
      borderRadius={10}
      padding={14}
      gap={10}
    >
      <XStack justifyContent="space-between" alignItems="center">
        <Text
          fontFamily="$body"
          fontSize={10}
          fontWeight="600"
          textTransform="uppercase"
          letterSpacing={0.8}
          color="$colorSubtle"
        >
          {title}
        </Text>
        <XStack gap={10} alignItems="center">
          {activeId !== null ? (
            <Text
              render="button"
              role="button"
              fontFamily="$body"
              fontSize={10}
              color="$brand"
              cursor="pointer"
              onPress={onReset}
            >
              Reset
            </Text>
          ) : null}
          <Text
            render="button"
            role="button"
            fontFamily="$body"
            fontSize={11}
            color="$colorSubtle"
            cursor="pointer"
            onPress={onClose}
            hoverStyle={{ color: '$color' }}
          >
            ✕
          </Text>
        </XStack>
      </XStack>

      {hasResult ? (
        <XStack
          backgroundColor={deltaPoints >= 0 ? '$positiveBg' : '$negativeBg'}
          borderWidth={1}
          borderColor={deltaPoints >= 0 ? '$positiveBorder' : 'transparent'}
          borderRadius={6}
          paddingHorizontal={10}
          paddingVertical={7}
          gap={12}
          alignItems="center"
          flexWrap="wrap"
        >
          <Text
            fontFamily="$mono"
            fontSize={14}
            fontWeight="500"
            color={deltaPoints >= 0 ? '$positive' : '$negative'}
          >
            {simulatedPoints} pts
          </Text>
          <Text
            fontFamily="$mono"
            fontSize={11}
            color={deltaPoints >= 0 ? '$positive' : '$negative'}
          >
            {deltaPoints >= 0 ? '+' : ''}
            {deltaPoints}
          </Text>
          {deltaRank !== null ? (
            <Text
              fontFamily="$mono"
              fontSize={11}
              color={deltaRank >= 0 ? '$positive' : '$negative'}
            >
              {deltaRank >= 0 ? '↑' : '↓'} {Math.abs(deltaRank).toLocaleString()} rank
            </Text>
          ) : null}
        </XStack>
      ) : null}

      {type === 'transfer' && onTransferSearchChange ? (
        <Input
          fontSize={12}
          paddingHorizontal={10}
          paddingVertical={5}
          minHeight={30}
          placeholder="Search by name…"
          value={transferSearch}
          onChangeText={onTransferSearchChange}
        />
      ) : null}

      <YStack gap={1} maxHeight={260} overflow="scroll">
        {filteredCandidates.map((candidate) => {
          const isActive = candidate.id === highlightId;
          return (
            <XStack
              key={candidate.id}
              role="button"
              cursor="pointer"
              paddingHorizontal={8}
              paddingVertical={6}
              borderRadius={6}
              alignItems="center"
              justifyContent="space-between"
              backgroundColor={isActive ? '$brandBg' : 'transparent'}
              hoverStyle={{ backgroundColor: '$background' }}
              onPress={() => {
                onSelectCandidate(candidate.id);
                setHoveredId(null);
              }}
              onMouseEnter={() => setHoveredId(candidate.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <XStack alignItems="center" gap={6}>
                {candidate.positionShort ? (
                  <Text
                    fontFamily="$body"
                    fontSize={9}
                    fontWeight="600"
                    textTransform="uppercase"
                    letterSpacing={0.4}
                    color="$colorSubtle"
                    width={24}
                  >
                    {candidate.positionShort}
                  </Text>
                ) : null}
                <Text
                  fontFamily="$body"
                  fontSize={12}
                  color={isActive ? '$brand' : '$color'}
                  fontWeight={isActive ? '600' : '400'}
                >
                  {candidate.name}
                </Text>
              </XStack>
              <Text fontFamily="$mono" fontSize={11} color="$colorMuted">
                {candidate.livePoints} pts
              </Text>
            </XStack>
          );
        })}
        {filteredCandidates.length === 0 ? (
          <Text
            fontFamily="$body"
            fontSize={12}
            color="$colorMuted"
            paddingHorizontal={8}
            paddingVertical={6}
          >
            No players found
          </Text>
        ) : null}
      </YStack>

      <Text fontFamily="$body" fontSize={10} color="$colorSubtle" lineHeight={14}>
        Phase 1 · No price or chip simulation
      </Text>
    </YStack>
  );
}
