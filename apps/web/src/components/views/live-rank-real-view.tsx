'use client';

import { useEffect } from 'react';

import { useParams } from 'next/navigation';

import { liveRank } from '@simplyfpl/features';
import {
  applyAutosubs,
  calculateLivePoints,
  estimateLiveRank,
  getKitUrl,
  predictBonusPoints,
} from '@simplyfpl/fpl-client';
import type { BonusPrediction, LiveRankEstimate } from '@simplyfpl/fpl-client';
import type {
  FplBootstrapStatic,
  FplEntryGameweekPicks,
  FplLiveGameweek,
  FplPlayer,
} from '@simplyfpl/types';
import {
  BenchDivider,
  CohortTable,
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
import type { BadgeTone, CohortTableRow, ShirtKind } from '@simplyfpl/ui';

import { useCohortAggregates } from '@/queries/cohort-aggregates';
import { useEntrySnapshot, useFixtures } from '@/queries/fpl';

const { setLiveRankEstimate, useLiveSnapshot } = liveRank;

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
  liveGw: FplLiveGameweek,
  bonusMap: Map<number, BonusPrediction>
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
      const basePoints = live?.stats.total_points ?? 0;
      const bonusInfo = bonusMap.get(pick.element);
      const additionalBonus = bonusInfo && bonusInfo.provisional ? bonusInfo.bonus : 0;
      const points = (basePoints + additionalBonus) * pick.multiplier;
      const isCaptain = pick.is_captain;
      const tbp = (live?.stats.minutes ?? 0) === 0;
      let tone: BadgeTone = 'default';
      if (tbp) tone = 'tbp';
      else if (isCaptain) tone = 'captain';
      else if (points >= 10) tone = 'hot';
      const name = `${player?.web_name ?? '?'}${isCaptain ? ' (C)' : ''}`;
      const provisionalBonusLabel =
        bonusInfo && bonusInfo.provisional && bonusInfo.bonus > 0 ? ` · +${bonusInfo.bonus}b?` : '';
      const detail = tbp ? `${teamShort} · TBP` : `${teamShort}${provisionalBonusLabel}`;
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

function renderMovementChip(estimate: LiveRankEstimate | null, movementLabel: string | null) {
  if (!estimate) return null;
  if (movementLabel) {
    return (
      <DeltaChip tone={estimate.direction === 'up' ? 'up' : 'down'}>{movementLabel}</DeltaChip>
    );
  }
  return <DeltaChip tone="neutral">live</DeltaChip>;
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
        <PageHeader title="Live Rank" meta="No team selected" />
        <Text fontFamily="$body" fontSize={13} color="$colorMuted">
          Enter your FPL team ID on the home page to see your live rank.
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
  const {
    data: snapshot,
    isLoading: snapshotLoading,
    isError: snapshotError,
  } = useEntrySnapshot(entryId);
  const bootstrap = snapshot?.bootstrap;
  const entry = snapshot?.entry;
  const picks = snapshot?.picks;
  const currentGw = snapshot?.gw ?? null;
  const aggregates = useCohortAggregates(currentGw);
  const { data: liveGw } = useLiveSnapshot(currentGw);
  const { data: fixtures } = useFixtures(currentGw);
  const liveLoading = liveGw === undefined;

  const ready = entry && picks && liveGw && bootstrap;
  const bonusMap =
    ready && fixtures
      ? predictBonusPoints(liveGw, fixtures, bootstrap)
      : new Map<number, BonusPrediction>();
  const livePoints = ready ? calculateLivePoints(picks, liveGw, bootstrap, bonusMap) : 0;
  const postSubsPicks = ready ? applyAutosubs(picks, liveGw, bootstrap) : null;
  const postSubsPoints =
    ready && postSubsPicks
      ? calculateLivePoints(postSubsPicks, liveGw, bootstrap, bonusMap)
      : livePoints;
  const xiPoints = livePoints;
  const transferHit = ready ? picks.entry_history.event_transfers_cost : 0;
  const formation = ready ? deriveFormation(picks, bootstrap) : '4–4–2';
  const pitchRows = ready ? rowsForFormation(picks, bootstrap, liveGw, bonusMap) : [];
  const bench = ready ? benchPlayers(picks, bootstrap, liveGw) : [];
  const teamName = entry?.name ?? '—';
  const playerName = entry ? `${entry.player_first_name} ${entry.player_last_name}`.trim() : '';
  const preGwRank = entry?.summary_overall_rank ?? 0;
  const avgEntryScore = bootstrap?.events.find((e) => e.id === currentGw)?.average_entry_score ?? 0;
  const estimate =
    ready && preGwRank > 0 ? estimateLiveRank(preGwRank, livePoints, avgEntryScore) : null;
  const estimateLiveRankValue = estimate?.liveRank ?? null;
  const estimateMovement = estimate?.movement ?? null;
  const estimateDirection = estimate?.direction ?? null;
  useEffect(() => {
    if (estimateLiveRankValue === null) return;
    setLiveRankEstimate({
      liveRank: estimateLiveRankValue,
      movement: estimateMovement,
      direction: estimateDirection,
    });
  }, [estimateLiveRankValue, estimateMovement, estimateDirection]);
  let liveRankLabel = '—';
  if (estimate) {
    liveRankLabel = estimate.liveRank.toLocaleString();
  }
  const movementLabel =
    estimate && estimate.movement !== 0
      ? `${estimate.direction === 'up' ? '↑' : '↓'} ${Math.abs(estimate.movement).toLocaleString()}`
      : null;
  const totalPointsLabel = entry?.summary_overall_points
    ? entry.summary_overall_points.toLocaleString()
    : '—';

  const top10kAvg = aggregates?.tiers.top_10k?.avg_event_points;
  const overallAvg = aggregates?.tiers.overall?.avg_event_points;
  const legendaryAvg = aggregates?.tiers.legendary?.avg_event_points;
  const cohortRows: CohortTableRow[] = aggregates
    ? [
        {
          label: 'Score',
          you: ready ? livePoints : '—',
          top10k: top10kAvg != null ? Math.round(top10kAvg) : '—',
          overall: overallAvg != null ? Math.round(overallAvg) : '—',
          legendary: legendaryAvg != null ? Math.round(legendaryAvg) : '—',
        },
        { label: 'Players played', you: '—', top10k: '—', overall: '—', legendary: '—' },
        { label: 'Budget played', you: '—', top10k: '—', overall: '—', legendary: '—' },
        { label: 'Captain pts', you: '—', top10k: '—', overall: '—', legendary: '—' },
      ]
    : [
        { label: 'Score', you: ready ? livePoints : '—', top10k: 80, overall: 65, legendary: 77 },
        { label: 'Players played', you: '—', top10k: 9, overall: 8, legendary: 10 },
        { label: 'Budget played', you: '—', top10k: '£82m', overall: '£78m', legendary: '£89m' },
        { label: 'Captain pts', you: '—', top10k: 14, overall: 10, legendary: 18 },
      ];
  const cohortFooter = aggregates
    ? 'Live cohort data refreshes every 60s while gameweeks are active.'
    : 'Placeholder data — real cohort numbers landing this week';

  if (snapshotError) {
    return (
      <PageShell>
        <PageHeader title="Live Rank" meta="Could not load this team" />
        <Text fontFamily="$body" fontSize={12} color="$colorMuted">
          Check the team ID and try again.
        </Text>
      </PageShell>
    );
  }

  const isLoading = snapshotLoading || liveLoading;

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
            {liveRankLabel}
          </Text>
          <Text
            fontFamily="$body"
            fontSize={10}
            fontWeight="600"
            color="$colorSubtle"
            textTransform="uppercase"
            letterSpacing={1.2}
          >
            est. live rank
          </Text>
          {renderMovementChip(estimate, movementLabel)}
        </XStack>
        <XStack gap={16} flexWrap="wrap" alignItems="center">
          <PtsChip label="GW" value={String(ready ? livePoints : '—')} />
          <PtsChip label="XI" value={String(xiPoints)} />
          {ready && postSubsPoints !== livePoints ? (
            <PtsChip label="Post-subs" value={String(postSubsPoints)} />
          ) : null}
          {transferHit > 0 ? <PtsChip label="Hit" value={`-${transferHit}`} /> : null}
          <PtsChip label="Chip" value={picks?.active_chip ?? 'None'} />
          <PtsChip label="Total" value={totalPointsLabel} />
        </XStack>
      </YStack>

      <YStack
        backgroundColor="$surface"
        paddingHorizontal={20}
        paddingVertical={12}
        marginBottom={16}
        gap={6}
      >
        <SectionHeader title="Cohort comparison" />
        <CohortTable rows={cohortRows} footer={cohortFooter} />
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
