'use client';

import { replay } from '@simplyfpl/features';
import { FilterButton, Text, XStack, YStack } from '@simplyfpl/ui';

const { REPLAY_SPEEDS } = replay;
type ReplaySpeed = replay.ReplaySpeed;
type ReplayClockState = replay.ReplayClockState;

interface ReplayControlsProps {
  state: ReplayClockState;
  totalGameweeks: number;
  loadedGameweeks: number;
  onPlay: () => void;
  onPause: () => void;
  onRestart: () => void;
  onSetSpeed: (speed: ReplaySpeed) => void;
  onSeek: (gw: number) => void;
}

function formatStatus(state: ReplayClockState): string {
  if (state.status === 'playing') return 'Playing';
  if (state.status === 'finished') return 'Finished';
  return 'Paused';
}

export function ReplayControls({
  state,
  totalGameweeks,
  loadedGameweeks,
  onPlay,
  onPause,
  onRestart,
  onSetSpeed,
  onSeek,
}: ReplayControlsProps) {
  const isPlaying = state.status === 'playing';
  const fullyLoaded = loadedGameweeks >= totalGameweeks;
  let playLabel = 'Play';
  if (state.status === 'finished') playLabel = 'Restart';
  else if (isPlaying) playLabel = 'Pause';

  return (
    <YStack
      data-testid="replay-controls"
      borderRadius={12}
      borderWidth={1}
      borderColor="$border"
      backgroundColor="$surface"
      paddingHorizontal={20}
      paddingVertical={14}
      gap={12}
      marginBottom={16}
    >
      <XStack alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={12}>
        <YStack gap={2}>
          <Text
            fontFamily="$body"
            fontSize={10}
            fontWeight="600"
            textTransform="uppercase"
            letterSpacing={1.4}
            color="$colorSubtle"
          >
            Season Replay · 2025–26
          </Text>
          <Text fontFamily="$mono" fontSize={18} fontWeight="500" color="$color">
            GW{state.gw}
            <Text fontFamily="$body" fontSize={13} color="$colorMuted">
              {' '}
              of GW{state.endGw}
            </Text>
          </Text>
        </YStack>
        <XStack gap={6} alignItems="center" flexWrap="wrap">
          <FilterButton
            active={isPlaying}
            onPress={() => {
              if (state.status === 'finished') {
                onRestart();
                return;
              }
              if (isPlaying) onPause();
              else onPlay();
            }}
          >
            <Text fontFamily="$body" fontSize={12} fontWeight="600">
              {playLabel}
            </Text>
          </FilterButton>
          <FilterButton onPress={onRestart}>
            <Text fontFamily="$body" fontSize={12} fontWeight="600">
              Restart
            </Text>
          </FilterButton>
        </XStack>
      </XStack>

      <YStack gap={6}>
        <XStack alignItems="center" justifyContent="space-between" gap={10}>
          <Text
            fontFamily="$body"
            fontSize={10}
            fontWeight="600"
            textTransform="uppercase"
            letterSpacing={1.4}
            color="$colorSubtle"
          >
            Speed
          </Text>
          <Text fontFamily="$body" fontSize={11} color="$colorMuted">
            {formatStatus(state)} ·{' '}
            {fullyLoaded ? 'all data ready' : `loading ${loadedGameweeks}/${totalGameweeks}`}
          </Text>
        </XStack>
        <XStack gap={6} flexWrap="wrap">
          {REPLAY_SPEEDS.map((s) => (
            <FilterButton key={s} active={state.speed === s} onPress={() => onSetSpeed(s)}>
              <Text fontFamily="$mono" fontSize={12} fontWeight="600">
                {s}x
              </Text>
            </FilterButton>
          ))}
        </XStack>
      </YStack>

      <YStack gap={6}>
        <XStack alignItems="center" justifyContent="space-between" gap={10}>
          <Text
            fontFamily="$body"
            fontSize={10}
            fontWeight="600"
            textTransform="uppercase"
            letterSpacing={1.4}
            color="$colorSubtle"
          >
            Jump to GW
          </Text>
          <Text fontFamily="$mono" fontSize={11} color="$colorMuted">
            {state.startGw}–{state.endGw}
          </Text>
        </XStack>
        <input
          type="range"
          min={state.startGw}
          max={state.endGw}
          step={1}
          value={state.gw}
          aria-label="Jump to gameweek"
          data-testid="replay-seek"
          onChange={(e) => onSeek(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </YStack>
    </YStack>
  );
}
