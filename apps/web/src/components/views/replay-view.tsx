'use client';

import { useMemo, useState } from 'react';

import { replay } from '@simplyfpl/features';
import { Text, YStack } from '@simplyfpl/ui';

import { LiveRankRealView } from './live-rank-real-view';
import { ReplayControls } from './replay-controls';

const {
  useReplayBootstrap,
  useReplayClock,
  useReplayGameweeks,
  useReplayLiveRank,
  useReplayManifest,
} = replay;
type ReplayBundle = replay.ReplayBundle;
type ReplaySpeed = replay.ReplaySpeed;

const BASE_PATH = '/replay/2025-26';

export function ReplayView() {
  const {
    manifest,
    isLoading: manifestLoading,
    error: manifestError,
  } = useReplayManifest(BASE_PATH);
  const { bootstrap, isLoading: bootstrapLoading } = useReplayBootstrap(BASE_PATH);
  const { byGw, loadedCount, totalCount } = useReplayGameweeks(manifest?.gameweeks, BASE_PATH);

  const [startGw, setStartGw] = useState<number>(1);
  const [hasStarted, setHasStarted] = useState(false);

  const totalGameweeks = manifest?.gameweeks?.length ?? 38;
  const endGw = manifest?.gameweeks?.[manifest.gameweeks.length - 1] ?? 38;

  const initialSpeed: ReplaySpeed = 1;
  const { state, play, pause, seek, setSpeed } = useReplayClock({
    startGw,
    endGw,
    speed: initialSpeed,
  });

  const bundle = useMemo<ReplayBundle | undefined>(() => {
    if (!manifest || !bootstrap) return undefined;
    if (byGw.size === 0) return undefined;
    return { manifest, bootstrap, byGw };
  }, [manifest, bootstrap, byGw]);

  const replayData = useReplayLiveRank({ bundle, clock: state });

  const dataOverride = useMemo(
    () => ({
      snapshot: replayData.snapshot,
      snapshotLoading: replayData.snapshotLoading,
      snapshotError: replayData.snapshotError,
      liveGw: replayData.liveGw,
      fixtures: replayData.fixtures,
      estimate: replayData.estimate,
      agoMs: replayData.agoMs,
      replayBanner: replayData.replayLabel,
    }),
    [replayData]
  );

  function handlePlay() {
    setHasStarted(true);
    play();
  }

  function handleRestart() {
    seek(startGw);
    play();
    setHasStarted(true);
  }

  if (manifestError) {
    return (
      <YStack padding={32}>
        <Text fontFamily="$body" fontSize={14} color="$negative">
          Failed to load replay bundle: {String(manifestError.message)}
        </Text>
      </YStack>
    );
  }

  if (manifestLoading || bootstrapLoading || !bundle) {
    return (
      <YStack padding={32}>
        <Text fontFamily="$body" fontSize={13} color="$colorMuted">
          Loading replay bundle ({loadedCount}/{totalCount} GWs)…
        </Text>
      </YStack>
    );
  }

  return (
    <YStack
      data-testid="replay-view"
      paddingHorizontal={28}
      paddingTop={20}
      $sm={{ paddingHorizontal: 12 }}
    >
      <ReplayControls
        state={state}
        totalGameweeks={totalGameweeks}
        loadedGameweeks={loadedCount}
        onPlay={handlePlay}
        onPause={pause}
        onRestart={handleRestart}
        onSetSpeed={setSpeed}
        onSeek={(gw) => {
          setStartGw(gw);
          seek(gw);
        }}
      />
      <Text
        fontFamily="$mono"
        fontSize={11}
        color="$colorMuted"
        marginBottom={8}
        data-testid="replay-progress-label"
      >
        {replayData.replayLabel}
      </Text>
      {!hasStarted ? (
        <Text fontFamily="$body" fontSize={12.5} color="$colorMuted" marginBottom={12}>
          Press Play to replay the 2025–26 season. Default 1 gameweek per minute — switch to 60x for
          a full season in 38 seconds.
        </Text>
      ) : null}
      <LiveRankRealView entryId={bundle.manifest.entryId} dataOverride={dataOverride} />
    </YStack>
  );
}
