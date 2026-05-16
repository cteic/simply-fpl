'use client';

import { useMemo } from 'react';

import { useParams } from 'next/navigation';

import { liveRank } from '@simplyfpl/features';
import { calculateLivePoints, getCurrentGameweek, getKitUrl } from '@simplyfpl/fpl-client';
import type {
  FplBootstrapStatic,
  FplEntryGameweekPicks,
  FplLiveGameweek,
  FplPlayer,
} from '@simplyfpl/types';
import {
  BenchDivider,
  DeltaChip,
  FNote,
  PageHeader,
  PageShell,
  Pitch,
  PitchRow,
  Player,
  PtsChip,
  SectionHeader,
  TeamPill,
  Text,
  XStack,
  YStack,
} from '@simplyfpl/ui';
import type { BadgeTone, ShirtKind } from '@simplyfpl/ui';

import { useBootstrap, useEntry, useEntryPicks } from '@/queries/fpl';

const { useLiveSnapshot } = liveRank;

function parseEntryIdParam(raw: string | string[] | undefined): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string') return null;
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return null;
  return parsed;
}

const POSITION: Record<number, ShirtKind> = {
  1: 'gk',
  2: 'def',
  3: 'mid',
  4: 'fwd',
};

function rowsForFormation(
  picks: FplEntryGameweekPicks,
  bootstrap: FplBootstrapStatic,
  liveGw: FplLiveGameweek
) {
  const elementsById = new Map<number, FplPlayer>();
  for (const e of bootstrap.elements) {
    elementsById.set(e.id, e);
  }
  const teamShortById = new Map<number, string>();
  const teamCodeById = new Map<number, number>();
  for (const t of bootstrap.teams) {
    teamShortById.set(t.id, t.short_name);
    teamCodeById.set(t.id, t.code);
  }
  const liveById = new Map(liveGw.elements.map((e) => [e.id, e]));

  const starters = picks.picks.filter((p) => p.position <= 11);
  const grouped: Record<ShirtKind, typeof starters> = {
    gk: [],
    def: [],
    mid: [],
    fwd: [],
    bch: [],
  };
  for (const pick of starters) {
    const player = elementsById.get(pick.element);
    if (!player) continue;
    const kind = POSITION[player.element_type] ?? 'mid';
    grouped[kind].push(pick);
  }

  function build(picksOfRow: typeof starters) {
    return picksOfRow.map((pick) => {
      const player = elementsById.get(pick.element);
      const live = liveById.get(pick.element);
      const teamShort = player ? (teamShortById.get(player.team) ?? '') : '';
      const teamCode = player ? teamCodeById.get(player.team) : undefined;
      const isGoalkeeper = player?.element_type === 1;
      const points = (live?.stats.total_points ?? 0) * pick.multiplier;
      const isCaptain = pick.is_captain;
      const tbp = (live?.stats.minutes ?? 0) === 0;
      let tone: BadgeTone = 'default';
      if (tbp) tone = 'tbp';
      else if (isCaptain) tone = 'captain';
      else if (points >= 10) tone = 'hot';
      const name = `${player?.web_name ?? '?'}${isCaptain ? ' (C)' : ''}`;
      const detail = tbp ? `${teamShort} · TBP` : teamShort;
      const ownershipPercent = player ? Number.parseFloat(player.selected_by_percent) : undefined;
      return {
        key: pick.element,
        name,
        detail,
        position: POSITION[player?.element_type ?? 3] ?? 'mid',
        badge: tbp ? '–' : String(points),
        badgeTone: tone,
        kitUrl: teamCode !== undefined ? getKitUrl(teamCode, { isGoalkeeper }) : undefined,
        kitUrl2x:
          teamCode !== undefined ? getKitUrl(teamCode, { isGoalkeeper, size: 220 }) : undefined,
        ownershipPercent:
          ownershipPercent !== undefined && Number.isFinite(ownershipPercent)
            ? ownershipPercent
            : undefined,
      };
    });
  }

  const rows = [build(grouped.gk), build(grouped.def), build(grouped.mid), build(grouped.fwd)];
  return rows;
}

function benchPlayers(
  picks: FplEntryGameweekPicks,
  bootstrap: FplBootstrapStatic,
  liveGw: FplLiveGameweek
) {
  const elementsById = new Map<number, FplPlayer>();
  for (const e of bootstrap.elements) elementsById.set(e.id, e);
  const teamShortById = new Map<number, string>();
  const teamCodeById = new Map<number, number>();
  for (const t of bootstrap.teams) {
    teamShortById.set(t.id, t.short_name);
    teamCodeById.set(t.id, t.code);
  }
  const liveById = new Map(liveGw.elements.map((e) => [e.id, e]));

  return picks.picks
    .filter((p) => p.position > 11)
    .map((pick) => {
      const player = elementsById.get(pick.element);
      const live = liveById.get(pick.element);
      const teamShort = player ? (teamShortById.get(player.team) ?? '') : '';
      const teamCode = player ? teamCodeById.get(player.team) : undefined;
      const isGoalkeeper = player?.element_type === 1;
      const points = live?.stats.total_points ?? 0;
      const ownershipPercent = player ? Number.parseFloat(player.selected_by_percent) : undefined;
      return {
        key: pick.element,
        name: player?.web_name ?? '?',
        detail: teamShort,
        position: POSITION[player?.element_type ?? 3] ?? 'mid',
        badge: String(points),
        badgeTone: 'bench' as const,
        kitUrl: teamCode !== undefined ? getKitUrl(teamCode, { isGoalkeeper }) : undefined,
        kitUrl2x:
          teamCode !== undefined ? getKitUrl(teamCode, { isGoalkeeper, size: 220 }) : undefined,
        ownershipPercent:
          ownershipPercent !== undefined && Number.isFinite(ownershipPercent)
            ? ownershipPercent
            : undefined,
      };
    });
}

function deriveFormation(picks: FplEntryGameweekPicks, bootstrap: FplBootstrapStatic): string {
  const elementsById = new Map<number, FplPlayer>();
  for (const e of bootstrap.elements) elementsById.set(e.id, e);
  let def = 0;
  let mid = 0;
  let fwd = 0;
  for (const pick of picks.picks.filter((p) => p.position <= 11)) {
    const player = elementsById.get(pick.element);
    if (!player) continue;
    if (player.element_type === 2) def += 1;
    if (player.element_type === 3) mid += 1;
    if (player.element_type === 4) fwd += 1;
  }
  return `${def}–${mid}–${fwd}`;
}

interface LiveRankRealViewProps {
  entryId?: number;
}

export function LiveRankRealView({ entryId: entryIdProp }: LiveRankRealViewProps = {}) {
  const params = useParams();
  const entryId = entryIdProp ?? parseEntryIdParam(params?.entryId);

  if (entryId === null || entryId === undefined) {
    return (
      <PageShell>
        <PageHeader title="Live Rank" meta="Invalid team ID in URL" />
        <Text fontFamily="$body" fontSize={13} color="$colorMuted">
          The URL needs a positive integer FPL team ID, like
          <code> /rank/123456</code>.
        </Text>
      </PageShell>
    );
  }

  return <LiveRankInner entryId={entryId} />;
}

interface InnerProps {
  entryId: number;
}

function LiveRankInner({ entryId }: InnerProps) {
  const { data: bootstrap } = useBootstrap();
  const currentGw = useMemo(() => (bootstrap ? getCurrentGameweek(bootstrap) : null), [bootstrap]);
  const { data: entry, isLoading: entryLoading, isError: entryError } = useEntry(entryId);
  const { data: picks, isLoading: picksLoading } = useEntryPicks(entryId, currentGw);
  const { data: liveGw } = useLiveSnapshot(currentGw);
  const liveLoading = liveGw === undefined;

  const ready = entry && picks && liveGw && bootstrap;
  const livePoints = ready ? calculateLivePoints(picks, liveGw, bootstrap) : 0;
  const xiPoints = livePoints; // placeholder until bonus + autosub split is implemented
  const transferHit = ready ? picks.entry_history.event_transfers_cost : 0;
  const formation = ready ? deriveFormation(picks, bootstrap) : '4–4–2';
  const pitchRows = ready ? rowsForFormation(picks, bootstrap, liveGw) : [];
  const bench = ready ? benchPlayers(picks, bootstrap, liveGw) : [];
  const teamName = entry?.name ?? '—';
  const playerName = entry ? `${entry.player_first_name} ${entry.player_last_name}`.trim() : '';
  const overallRankLabel = entry?.summary_overall_rank
    ? entry.summary_overall_rank.toLocaleString()
    : '—';
  const totalPointsLabel = entry?.summary_overall_points
    ? entry.summary_overall_points.toLocaleString()
    : '—';

  if (entryError) {
    return (
      <PageShell>
        <PageHeader title="Live Rank" meta="Could not load this team" />
        <Text fontFamily="$body" fontSize={12} color="$colorMuted">
          Check the team ID and try again.
        </Text>
      </PageShell>
    );
  }

  const isLoading = entryLoading || picksLoading || liveLoading;

  return (
    <PageShell>
      <PageHeader
        title="Live Rank"
        meta={isLoading ? 'Loading…' : `Gameweek ${currentGw ?? '—'} · ${playerName || teamName}`}
        right={<TeamPill teamId={entryId} />}
      />

      <YStack
        backgroundColor="$surface"
        paddingHorizontal={20}
        paddingVertical={12}
        marginBottom={16}
        gap={6}
      >
        <XStack alignItems="baseline" gap={10} flexWrap="wrap">
          <Text fontFamily="$mono" fontSize={26} fontWeight="500" color="$color">
            {overallRankLabel}
          </Text>
          <Text
            fontFamily="$body"
            fontSize={10}
            fontWeight="600"
            color="$colorSubtle"
            textTransform="uppercase"
            letterSpacing={1.2}
          >
            Overall Rank
          </Text>
          <DeltaChip tone="neutral">live</DeltaChip>
        </XStack>
        <XStack gap={16} flexWrap="wrap" alignItems="center">
          <PtsChip label="GW" value={String(ready ? livePoints : '—')} />
          <PtsChip label="XI" value={String(xiPoints)} />
          {transferHit > 0 ? <PtsChip label="Hit" value={`-${transferHit}`} /> : null}
          <PtsChip label="Chip" value={picks?.active_chip ?? 'None'} />
          <PtsChip label="Total" value={totalPointsLabel} />
        </XStack>
      </YStack>

      <YStack marginBottom={20}>
        <SectionHeader title={`Your Team · GW${currentGw ?? '—'}`} />
        <Pitch teamName={teamName} formation={formation}>
          {ready
            ? pitchRows.map((row, i) => (
                <PitchRow key={`row-${i}`}>
                  {row.map((p) => (
                    <Player
                      key={p.key}
                      name={p.name}
                      detail={p.detail}
                      position={p.position}
                      badge={p.badge}
                      badgeTone={p.badgeTone}
                      kitUrl={p.kitUrl}
                      kitUrl2x={p.kitUrl2x}
                      ownershipPercent={p.ownershipPercent}
                    />
                  ))}
                </PitchRow>
              ))
            : null}
          {ready && bench.length > 0 ? (
            <>
              <BenchDivider />
              <PitchRow>
                {bench.map((p) => (
                  <Player
                    key={p.key}
                    name={p.name}
                    detail={p.detail}
                    position={p.position}
                    badge={p.badge}
                    badgeTone={p.badgeTone}
                    kitUrl={p.kitUrl}
                    kitUrl2x={p.kitUrl2x}
                    ownershipPercent={p.ownershipPercent}
                    bench
                  />
                ))}
              </PitchRow>
            </>
          ) : null}
        </Pitch>
      </YStack>

      <XStack marginTop={12} marginBottom={8} justifyContent="center">
        <Text fontFamily="$body" fontSize={12} color="$colorSubtle">
          Not your team?{' '}
          <Text render={<a href="/?change=1" />} color="$color" fontSize={12} fontFamily="$body">
            Search again →
          </Text>
        </Text>
      </XStack>

      <FNote>
        Data via Fantasy Premier League API · Live values refresh every 60s while gameweeks are
        active.
      </FNote>
    </PageShell>
  );
}
