'use client';

import { useMemo, useState } from 'react';

import { cohorts } from '@simplyfpl/features';
import type { CohortSnapshotPayload } from '@simplyfpl/features/cohorts';
import {
  BenchDivider,
  FilterButton,
  Pitch,
  PitchRow,
  Player,
  Text,
  WhatIfPanel,
  XStack,
  YStack,
} from '@simplyfpl/ui';
import type { WhatIfCandidateOption } from '@simplyfpl/ui';

import type { LivePitchPlayer } from './live-pitch';

const { aggregateToOwnershipMap, resolvePitchOwnership } = cohorts;

type OwnershipMode = 'global' | 'top10k';

export interface LivePitchColumnProps {
  teamName: string;
  formation: string;
  label: string;
  pitchRows: LivePitchPlayer[][];
  bench: LivePitchPlayer[];
  top10kPayload: CohortSnapshotPayload | undefined;
  provisionalBonusTotal: number;
  onWhatIf: (type: 'captain' | 'transfer', fromId: number) => void;
  whatIfOpen: boolean;
  whatIfType: 'captain' | 'transfer';
  whatIfCandidates: WhatIfCandidateOption[];
  whatIfActiveId: number | null;
  whatIfSimulatedPoints: number | null;
  whatIfDeltaPoints: number | null;
  whatIfDeltaRank: number | null;
  whatIfTransferSearch: string;
  onTransferSearchChange: (s: string) => void;
  onSelectCandidate: (id: number) => void;
  onWhatIfReset: () => void;
  onWhatIfClose: () => void;
}

export function LivePitchColumn({
  teamName,
  formation,
  label,
  pitchRows,
  bench,
  top10kPayload,
  provisionalBonusTotal,
  onWhatIf,
  whatIfOpen,
  whatIfType,
  whatIfCandidates,
  whatIfActiveId,
  whatIfSimulatedPoints,
  whatIfDeltaPoints,
  whatIfDeltaRank,
  whatIfTransferSearch,
  onTransferSearchChange,
  onSelectCandidate,
  onWhatIfReset,
  onWhatIfClose,
}: LivePitchColumnProps) {
  const [ownershipMode, setOwnershipMode] = useState<OwnershipMode>('global');

  const top10kOwnership = useMemo(
    () => (top10kPayload ? aggregateToOwnershipMap(top10kPayload) : undefined),
    [top10kPayload]
  );

  function ownershipFor(playerKey: number, globalPct: number | undefined) {
    if (ownershipMode === 'global') {
      return { ownershipPercent: globalPct, ownershipPartial: false };
    }
    const resolved = resolvePitchOwnership(playerKey, top10kOwnership, globalPct);
    if (resolved === undefined) {
      return { ownershipPercent: undefined, ownershipPartial: false };
    }
    return { ownershipPercent: resolved.value, ownershipPartial: resolved.source === 'global' };
  }

  const top10kSampleSize = top10kPayload?.entries_sampled ?? 0;
  const hasTop10kSample = top10kOwnership !== undefined && Object.keys(top10kOwnership).length > 0;
  const anyTop10kFallback =
    ownershipMode === 'top10k' &&
    [...pitchRows.flat(), ...bench].some(
      (p) => resolvePitchOwnership(p.key, top10kOwnership, p.ownershipPercent)?.source === 'global'
    );
  let ownershipNote: string | null = null;
  if (ownershipMode === 'top10k') {
    if (!hasTop10kSample) {
      ownershipNote = 'Top 10k sample still building — showing global ownership';
    } else if (anyTop10kFallback) {
      ownershipNote = `Top 10k sample building (${top10kSampleSize.toLocaleString()} managers) — some shown as global`;
    } else {
      ownershipNote = `Top 10k ownership · live sample of ${top10kSampleSize.toLocaleString()} managers`;
    }
  }

  const dataReady = pitchRows.length > 0;

  return (
    <>
      <Pitch teamName={teamName} formation={formation} label={label}>
        {dataReady ? (
          <YStack gap={6}>
            <XStack alignItems="center" justifyContent="space-between" gap={8} flexWrap="wrap">
              <Text
                fontFamily="$body"
                fontSize={9.5}
                fontWeight="600"
                textTransform="uppercase"
                letterSpacing={0.6}
                color="$colorSubtle"
              >
                Ownership
              </Text>
              <XStack gap={6}>
                <FilterButton
                  active={ownershipMode === 'global'}
                  onPress={() => setOwnershipMode('global')}
                >
                  Global
                </FilterButton>
                <FilterButton
                  active={ownershipMode === 'top10k'}
                  onPress={() => setOwnershipMode('top10k')}
                >
                  Top 10k
                </FilterButton>
              </XStack>
            </XStack>
            {ownershipNote ? (
              <Text fontFamily="$body" fontSize={10.5} color="$colorMuted">
                {ownershipNote}
              </Text>
            ) : null}
          </YStack>
        ) : null}
        {dataReady
          ? pitchRows.map((row, i) => (
              <PitchRow key={`row-${i}`}>
                {row.map((p) => {
                  const own = ownershipFor(p.key, p.ownershipPercent);
                  return (
                    <Player
                      key={p.key}
                      name={p.name}
                      detail={p.detail}
                      position={p.position}
                      badge={p.badge}
                      badgeTone={p.badgeTone}
                      kitUrl={p.kitUrl}
                      kitUrl2x={p.kitUrl2x}
                      ownershipPercent={own.ownershipPercent}
                      ownershipPartial={own.ownershipPartial}
                      accentColor={p.accentColor}
                      defcon={p.defcon}
                      onWhatIf={() => onWhatIf(p.isCaptain ? 'captain' : 'transfer', p.key)}
                    />
                  );
                })}
              </PitchRow>
            ))
          : null}
        {dataReady && bench.length > 0 ? (
          <>
            <BenchDivider />
            <PitchRow>
              {bench.map((p) => {
                const own = ownershipFor(p.key, p.ownershipPercent);
                return (
                  <Player
                    key={p.key}
                    name={p.name}
                    detail={p.detail}
                    position={p.position}
                    badge={p.badge}
                    badgeTone={p.badgeTone}
                    kitUrl={p.kitUrl}
                    kitUrl2x={p.kitUrl2x}
                    ownershipPercent={own.ownershipPercent}
                    ownershipPartial={own.ownershipPartial}
                    accentColor={p.accentColor}
                    bench
                  />
                );
              })}
            </PitchRow>
          </>
        ) : null}
        {dataReady && provisionalBonusTotal > 0 ? (
          <Text
            fontFamily="$body"
            fontSize={10.5}
            color="$colorMuted"
            marginTop={8}
            aria-label="Provisional bonus note"
          >
            Includes provisional bonus (
            <Text fontFamily="$mono" fontSize={10.5} color="$colorMuted">
              +{provisionalBonusTotal}b?
            </Text>
            ) — not yet confirmed by FPL
          </Text>
        ) : null}
      </Pitch>
      {whatIfOpen ? (
        <WhatIfPanel
          type={whatIfType}
          candidates={whatIfCandidates}
          activeId={whatIfActiveId}
          simulatedPoints={whatIfSimulatedPoints}
          deltaPoints={whatIfDeltaPoints}
          deltaRank={whatIfDeltaRank}
          transferSearch={whatIfType === 'transfer' ? whatIfTransferSearch : undefined}
          onTransferSearchChange={whatIfType === 'transfer' ? onTransferSearchChange : undefined}
          onSelectCandidate={onSelectCandidate}
          onReset={onWhatIfReset}
          onClose={onWhatIfClose}
        />
      ) : null}
    </>
  );
}
