'use client';

import { useMemo, useState } from 'react';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

import { useThemeName } from 'tamagui';

import { liveBattle, liveRank, whatIf } from '@simplyfpl/features';
import {
  applyAutosubs,
  calculateLivePoints,
  computeDefConProgress,
  computeRankDetails,
  getClubColor,
  getKitUrl,
  predictBonusPoints,
} from '@simplyfpl/fpl-client';
import type { BonusPrediction, LiveRankEstimate } from '@simplyfpl/fpl-client';
import type {
  FplBootstrapStatic,
  FplEntryGameweekPicks,
  FplEntrySnapshot,
  FplFixture,
  FplLiveGameweek,
  FplPlayer,
} from '@simplyfpl/types';
import {
  AdSlot,
  Card,
  CohortTable,
  FNote,
  LiveBattlePanel,
  Logo,
  NumberTicker,
  PageHeader,
  PageShell,
  SectionHeader,
  SkeletonCohortTable,
  SkeletonLiveRank,
  StatTile,
  Text,
  XStack,
  YStack,
  colors,
  featureSurfaceStyle,
  resolveThemeName,
} from '@simplyfpl/ui';
import type {
  BadgeTone,
  CohortTableRow,
  ShirtKind,
  StatTileTone,
  WhatIfCandidateOption,
} from '@simplyfpl/ui';

import { useCohortAggregates } from '@/queries/cohort-aggregates';
import type { CohortAggregates } from '@/queries/cohort-aggregates';
import { useEntrySnapshot, useFixtures } from '@/queries/fpl';

import type { LivePitchPlayer } from './live-pitch';

export interface LiveRankDataOverride {
  snapshot: FplEntrySnapshot | undefined;
  snapshotLoading: boolean;
  snapshotError: boolean;
  liveGw: FplLiveGameweek | undefined;
  fixtures: FplFixture[] | undefined;
  aggregates?: CohortAggregates | undefined;
  estimate: LiveRankEstimate | null;
  agoMs: number | null;
  replayBanner?: string;
}

const { useLiveAgoMs, useLiveRankEstimate, useLiveSnapshot } = liveRank;
const { computeLiveBattle } = liveBattle;

type SubsMode = 'pre' | 'post';

const LivePitchColumn = dynamic(
  () => import('./live-pitch-column').then((m) => m.LivePitchColumn),
  {
    ssr: false,
    loading: () => (
      <Card>
        <YStack minHeight={540} />
      </Card>
    ),
  }
);

function parseEntryIdParam(raw: string | string[] | undefined): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string') return null;
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return null;
  return parsed;
}

function formatLiveAgo(ms: number | null): string {
  if (ms === null || ms < 5_000) return 'just now';
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  return `${Math.floor(ms / 3_600_000)}h ago`;
}

const STAT_GRID_STYLE = { display: 'grid' as const, gridTemplateColumns: '1fr 1fr' };

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
): LivePitchPlayer[][] {
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
      const defconProgress =
        player && live
          ? computeDefConProgress(player.element_type, {
              clearances_blocks_interceptions: live.stats.clearances_blocks_interceptions,
              tackles: live.stats.tackles,
            })
          : null;
      const defcon = defconProgress?.eligible
        ? {
            current: defconProgress.current,
            threshold: defconProgress.threshold,
            percentage: defconProgress.percentage,
            awarded: defconProgress.awarded,
            breakdown: `CBI: ${defconProgress.cbi}, T: ${defconProgress.tackles} = ${defconProgress.current}/${defconProgress.threshold}${defconProgress.awarded ? ' ✓' : ''}`,
          }
        : undefined;
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
        accentColor: getClubColor(teamShort),
        ownershipPercent:
          ownershipPercent !== undefined && Number.isFinite(ownershipPercent)
            ? ownershipPercent
            : undefined,
        defcon,
        isCaptain: pick.is_captain,
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
): LivePitchPlayer[] {
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
        accentColor: getClubColor(teamShort),
        ownershipPercent:
          ownershipPercent !== undefined && Number.isFinite(ownershipPercent)
            ? ownershipPercent
            : undefined,
        defcon: undefined,
        isCaptain: false,
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

interface SubsToggleButtonProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

function SubsToggleButton({ label, active, onPress }: SubsToggleButtonProps) {
  return (
    <Text
      render="button"
      role="button"
      onPress={onPress}
      fontFamily="$body"
      fontSize={11}
      fontWeight="600"
      paddingHorizontal={11}
      paddingVertical={4}
      cursor="pointer"
      color={active ? '#0B4F49' : 'rgba(255,255,255,0.78)'}
      backgroundColor={active ? '#34D399' : 'transparent'}
    >
      {label}
    </Text>
  );
}

interface LiveRankRealViewProps {
  entryId?: number;
  dataOverride?: LiveRankDataOverride;
}

export function LiveRankRealView({
  entryId: entryIdProp,
  dataOverride,
}: LiveRankRealViewProps = {}) {
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

  if (dataOverride) {
    return <LiveRankInner entryId={entryId} dataOverride={dataOverride} />;
  }
  return <LiveRankInner entryId={entryId} />;
}

interface InnerProps {
  entryId: number;
  dataOverride?: LiveRankDataOverride;
}

function LiveRankInner({ entryId, dataOverride }: InnerProps) {
  const heroSurface = featureSurfaceStyle(resolveThemeName(useThemeName()), 'panel');
  const queryEntryId = dataOverride ? null : entryId;
  const liveSnapshotQuery = useEntrySnapshot(queryEntryId);
  const snapshot = dataOverride ? dataOverride.snapshot : liveSnapshotQuery.data;
  const snapshotLoading = dataOverride ? dataOverride.snapshotLoading : liveSnapshotQuery.isLoading;
  const snapshotError = dataOverride ? dataOverride.snapshotError : liveSnapshotQuery.isError;
  const bootstrap = snapshot?.bootstrap;
  const entry = snapshot?.entry;
  const picks = snapshot?.picks;
  const currentGw = snapshot?.gw ?? null;
  const cohortGw = dataOverride ? null : currentGw;
  const {
    data: liveAggregates,
    isLoading: cohortLoading,
    isUnavailable: cohortUnavailable,
  } = useCohortAggregates(cohortGw);
  const aggregates = dataOverride ? dataOverride.aggregates : liveAggregates;
  const showCohortLoading = !dataOverride && cohortLoading;
  const showCohortUnavailable = !dataOverride && cohortUnavailable;
  const [subsMode, setSubsMode] = useState<SubsMode>('pre');
  const [whatIfOpen, setWhatIfOpen] = useState(false);
  const [whatIfFromId, setWhatIfFromId] = useState<number | null>(null);
  const [whatIfType, setWhatIfType] = useState<'captain' | 'transfer'>('captain');
  const [whatIfTransferSearch, setWhatIfTransferSearch] = useState('');
  const liveGwQuery = useLiveSnapshot(dataOverride ? null : currentGw);
  const liveGw = dataOverride ? dataOverride.liveGw : liveGwQuery.data;
  const fixturesQuery = useFixtures(dataOverride ? null : currentGw);
  const fixtures = dataOverride ? dataOverride.fixtures : fixturesQuery.data;
  const liveLoading = liveGw === undefined;

  const ready = entry && picks && liveGw && bootstrap;
  const bonusMap =
    ready && fixtures
      ? predictBonusPoints(liveGw, fixtures, bootstrap)
      : new Map<number, BonusPrediction>();
  const livePoints = ready ? calculateLivePoints(picks, liveGw, bootstrap, bonusMap) : 0;
  const avgEntryScore = bootstrap?.events.find((e) => e.id === currentGw)?.average_entry_score ?? 0;
  const whatIfSim = whatIf.useWhatIfSimulation({
    picks: ready ? picks : null,
    liveGw: ready ? liveGw : null,
    bootstrap: ready ? bootstrap : null,
    preGwRank: ready ? (entry.summary_overall_rank ?? 0) : 0,
    currentLivePoints: livePoints,
    avgEntryScore,
  });

  const captainSwapCandidates = useMemo<WhatIfCandidateOption[]>(() => {
    if (!ready) return [];
    return picks.picks
      .filter((p) => p.position <= 11 && !p.is_captain)
      .map((p) => {
        const player = bootstrap.elements.find((e) => e.id === p.element);
        const live = liveGw.elements.find((e) => e.id === p.element);
        return {
          id: p.element,
          name: player?.web_name ?? '?',
          livePoints: live?.stats.total_points ?? 0,
        };
      })
      .sort((a, b) => b.livePoints - a.livePoints);
  }, [ready, picks, bootstrap, liveGw]);

  const transferCandidates = useMemo<WhatIfCandidateOption[]>(() => {
    if (!ready || whatIfFromId === null) return [];
    const fromPlayer = bootstrap.elements.find((e) => e.id === whatIfFromId);
    if (!fromPlayer) return [];
    const position = fromPlayer.element_type;
    const positionShort = ['', 'GK', 'DEF', 'MID', 'FWD'][position] ?? '';
    const existingIds = new Set(picks.picks.map((p) => p.element));
    return bootstrap.elements
      .filter((e) => e.element_type === position && !existingIds.has(e.id))
      .map((e) => {
        const live = liveGw.elements.find((le) => le.id === e.id);
        return {
          id: e.id,
          name: e.web_name,
          livePoints: live?.stats.total_points ?? 0,
          positionShort,
        };
      })
      .sort((a, b) => b.livePoints - a.livePoints)
      .slice(0, 40);
  }, [ready, bootstrap, liveGw, picks, whatIfFromId]);

  const whatIfCandidates = whatIfType === 'captain' ? captainSwapCandidates : transferCandidates;

  function openWhatIf(type: 'captain' | 'transfer', fromId: number) {
    setWhatIfType(type);
    setWhatIfFromId(fromId);
    setWhatIfOpen(true);
    setWhatIfTransferSearch('');
    whatIfSim.reset();
  }

  function closeWhatIf() {
    setWhatIfOpen(false);
    setWhatIfFromId(null);
    whatIfSim.reset();
  }
  const battle =
    ready && fixtures
      ? computeLiveBattle({ yourPicks: picks, bootstrap, liveGw, fixtures, bonusMap })
      : null;
  const postSubsPicks = ready ? applyAutosubs(picks, liveGw, bootstrap) : null;
  const postSubsPoints =
    ready && postSubsPicks
      ? calculateLivePoints(postSubsPicks, liveGw, bootstrap, bonusMap)
      : livePoints;
  const preGwRank = entry?.summary_overall_rank ?? 0;
  const rankDetails = ready
    ? computeRankDetails(
        preGwRank,
        livePoints,
        postSubsPoints,
        avgEntryScore,
        currentGw ?? undefined
      )
    : null;
  const autosubsApply = postSubsPoints !== livePoints;
  const showPostSubs = autosubsApply && subsMode === 'post';
  const displayedPoints = showPostSubs ? postSubsPoints : livePoints;
  const provisionalBonusTotal =
    ready && picks
      ? picks.picks
          .filter((p) => p.position <= 11)
          .reduce((sum, p) => {
            const info = bonusMap.get(p.element);
            const bonus = info && info.provisional ? info.bonus : 0;
            return sum + bonus * p.multiplier;
          }, 0)
      : 0;
  const formation = ready ? deriveFormation(picks, bootstrap) : '4–4–2';
  const pitchRows = ready ? rowsForFormation(picks, bootstrap, liveGw, bonusMap) : [];
  const bench = ready ? benchPlayers(picks, bootstrap, liveGw) : [];

  const defconGwPoints = ready
    ? picks.picks
        .filter((p) => p.position <= 11)
        .reduce((sum, p) => {
          const player = bootstrap.elements.find((e) => e.id === p.element);
          const live = liveGw.elements.find((e) => e.id === p.element);
          if (!player || !live) return sum;
          const progress = computeDefConProgress(player.element_type, {
            clearances_blocks_interceptions: live.stats.clearances_blocks_interceptions,
            tackles: live.stats.tackles,
          });
          return sum + (progress.awarded ? 2 : 0);
        }, 0)
    : 0;

  const top10kPayload = aggregates?.tiers.top_10k;

  const teamName = entry?.name ?? '—';
  const liveEstimate = useLiveRankEstimate(dataOverride ? null : entryId);
  const estimate = dataOverride ? dataOverride.estimate : liveEstimate.estimate;
  const heroRank =
    showPostSubs && rankDetails ? rankDetails.postSubsRank : (estimate?.liveRank ?? null);
  const liveAgoMs = useLiveAgoMs();
  const agoMs = dataOverride ? dataOverride.agoMs : liveAgoMs;
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
  const captainPick = ready ? picks.picks.find((p) => p.is_captain) : undefined;
  let captainName = '—';
  let captainSub = 'no captain set';
  let captainPointsValue: number | null = null;
  if (ready && captainPick) {
    const captainPlayer = bootstrap.elements.find((e) => e.id === captainPick.element);
    const captainLive = liveGw.elements.find((e) => e.id === captainPick.element);
    const captainTbp = (captainLive?.stats.minutes ?? 0) === 0;
    const captainPts = (captainLive?.stats.total_points ?? 0) * captainPick.multiplier;
    captainName = captainPlayer?.web_name ?? '—';
    captainSub = `×${captainPick.multiplier} · ${captainTbp ? 'TBP' : `${captainPts} pts`}`;
    captainPointsValue = captainTbp ? null : captainPts;
  }

  const liveById = ready ? new Map(liveGw.elements.map((e) => [e.id, e])) : null;
  const playersPlayed =
    ready && liveById
      ? picks.picks.filter(
          (p) => p.position <= 11 && (liveById.get(p.element)?.stats.minutes ?? 0) > 0
        ).length
      : null;

  // The cohort aggregates currently expose only an average score per tier; the
  // per-stat breakdowns aren't aggregated yet, so those cohort columns show an
  // em-dash placeholder rather than collapsing the table to a single row.
  const cohortRows: CohortTableRow[] =
    aggregates && ready
      ? [
          {
            label: 'Score',
            you: livePoints,
            top10k: top10kAvg != null ? Math.round(top10kAvg) : '—',
            overall: overallAvg != null ? Math.round(overallAvg) : '—',
            legendary: legendaryAvg != null ? Math.round(legendaryAvg) : '—',
          },
          {
            label: 'Players played',
            you: playersPlayed ?? '—',
            top10k: '—',
            overall: '—',
            legendary: '—',
          },
          { label: 'Budget played', you: '—', top10k: '—', overall: '—', legendary: '—' },
          {
            label: 'Captain pts',
            you: captainPointsValue ?? '—',
            top10k: '—',
            overall: '—',
            legendary: '—',
          },
        ]
      : [];
  const hasCohortData = cohortRows.length > 0;
  const cohortFallbackText = showCohortUnavailable
    ? 'Cohort data unavailable'
    : 'Cohort comparison loads once your gameweek is active.';

  const benchPoints = bench.reduce((sum, p) => sum + (Number(p.badge) || 0), 0);

  const showSafety = overallAvg != null;
  const showOffTop10k = ready && top10kAvg != null;
  const safetyValue = overallAvg != null ? String(Math.round(overallAvg)) : '—';
  const offTop10kValue =
    ready && top10kAvg != null ? String(Math.max(0, Math.round(top10kAvg) - livePoints)) : '—';
  let gwSub = 'live points';
  if (ready && autosubsApply) {
    gwSub = showPostSubs ? `Pre-subs ${livePoints}` : `Post-subs ${postSubsPoints}`;
  }

  const tiles: {
    label: string;
    value: string;
    tick: number | null;
    sub: string;
    tone: StatTileTone;
    whatIfButton?: (() => void) | undefined;
  }[] = [
    {
      label: 'GW Points',
      value: String(ready ? displayedPoints : '—'),
      tick: ready ? displayedPoints : null,
      sub: gwSub,
      tone: 'positive',
    },
    {
      label: 'Total Points',
      value: totalPointsLabel,
      tick: entry?.summary_overall_points ?? null,
      sub: 'overall',
      tone: 'brand',
    },
    {
      label: 'On Bench',
      value: String(ready ? benchPoints : '—'),
      tick: ready ? benchPoints : null,
      sub: 'autosubs ready',
      tone: 'neutral',
    },
    ...(showSafety
      ? [
          {
            label: 'Safety Score',
            value: safetyValue,
            tick: null,
            sub: 'green-arrow line',
            tone: 'positive' as const,
          },
        ]
      : []),
    ...(showOffTop10k
      ? [
          {
            label: 'Off Top 10k',
            value: offTop10kValue,
            tick: null,
            sub: 'points behind',
            tone: 'warning' as const,
          },
        ]
      : []),
    {
      label: 'Captain',
      value: captainName,
      tick: null,
      sub: captainSub,
      tone: 'negative',
      whatIfButton:
        ready && captainPick ? () => openWhatIf('captain', captainPick.element) : undefined,
    },
    ...(ready && defconGwPoints > 0
      ? [
          {
            label: 'DefCon',
            value: String(defconGwPoints),
            tick: defconGwPoints,
            sub: 'def contribution pts',
            tone: 'positive' as const,
          },
        ]
      : []),
  ];

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

  const noPicksYet = snapshot !== undefined && snapshot.picks === null;
  if (noPicksYet) {
    return (
      <PageShell>
        <PageHeader title="Live Rank" meta={`${teamName} · GW${currentGw ?? '—'}`} />
        <YStack gap={10}>
          <Text fontFamily="$body" fontSize={14} fontWeight="500" color="$color">
            No picks yet for this gameweek
          </Text>
          <Text fontFamily="$body" fontSize={12.5} color="$colorMuted">
            Your team and live rank will appear here once your squad is confirmed for the gameweek.
            Check back after the deadline.
          </Text>
        </YStack>
      </PageShell>
    );
  }

  const isLoading = snapshotLoading || liveLoading;

  if (snapshotLoading) {
    return (
      <PageShell>
        <SkeletonLiveRank />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <XStack
        gap={16}
        alignItems="flex-start"
        marginBottom={16}
        flexDirection="row"
        $md={{ flexDirection: 'column' }}
      >
        <YStack
          flexGrow={1.2}
          flexShrink={1}
          flexBasis={0}
          minWidth={0}
          gap={16}
          $md={{ flexGrow: 0, flexBasis: 'auto', width: '100%' }}
        >
          <YStack
            borderRadius={14}
            overflow="hidden"
            paddingHorizontal={22}
            paddingVertical={22}
            backgroundColor="$featureSurface"
            borderWidth={heroSurface.borderWidth}
            borderColor="$featureBorder"
            style={{ backgroundImage: heroSurface.backgroundImage }}
          >
            <YStack marginBottom={12}>
              <Logo variant="lockup" tone="stadium" size="md" />
            </YStack>

            <XStack alignItems="center" justifyContent="space-between" gap={10} flexWrap="wrap">
              <Text
                fontFamily="$body"
                fontSize={10}
                fontWeight="600"
                textTransform="uppercase"
                letterSpacing={1.4}
                color="#34D399"
              >
                est. live rank
              </Text>
              {autosubsApply ? (
                <XStack
                  alignItems="center"
                  borderWidth={1}
                  borderColor="rgba(255,255,255,0.28)"
                  borderRadius={99}
                  overflow="hidden"
                  aria-label="Autosubs toggle"
                >
                  <SubsToggleButton
                    label="Pre"
                    active={subsMode === 'pre'}
                    onPress={() => setSubsMode('pre')}
                  />
                  <SubsToggleButton
                    label="Post"
                    active={subsMode === 'post'}
                    onPress={() => setSubsMode('post')}
                  />
                </XStack>
              ) : null}
            </XStack>

            <NumberTicker
              value={heroRank}
              format={(n) => n.toLocaleString()}
              fontFamily="$mono"
              fontSize={56}
              lineHeight={58}
              fontWeight="400"
              letterSpacing={-2}
              color="#FFFFFF"
              marginTop={6}
              $sm={{ fontSize: 44, lineHeight: 46 }}
            />

            <XStack alignItems="center" gap={10} marginTop={8} flexWrap="wrap">
              {estimate && movementLabel ? (
                <XStack
                  alignItems="center"
                  backgroundColor="#34D399"
                  paddingHorizontal={10}
                  paddingVertical={3}
                  borderRadius={99}
                >
                  <Text fontFamily="$mono" fontSize={13} fontWeight="500" color="#0B4F49">
                    {movementLabel}
                  </Text>
                </XStack>
              ) : (
                <XStack
                  alignItems="center"
                  borderWidth={1}
                  borderColor="rgba(255,255,255,0.28)"
                  paddingHorizontal={10}
                  paddingVertical={3}
                  borderRadius={99}
                >
                  <Text fontFamily="$body" fontSize={12} color="rgba(255,255,255,0.8)">
                    live
                  </Text>
                </XStack>
              )}
              <Text fontFamily="$body" fontSize={12.5} color="rgba(255,255,255,0.8)">
                since GW start
              </Text>
            </XStack>

            {rankDetails ? (
              <XStack alignItems="center" gap={10} marginTop={6} flexWrap="wrap">
                <Text fontFamily="$mono" fontSize={12.5} color="rgba(255,255,255,0.85)">
                  {showPostSubs
                    ? `Pre-subs ~${rankDetails.preSubsRank.toLocaleString()}`
                    : `Post-subs ~${rankDetails.postSubsRank.toLocaleString()}`}
                </Text>
                <Text fontFamily="$body" fontSize={12.5} color="rgba(255,255,255,0.55)">
                  was {rankDetails.oldRank.toLocaleString()}
                </Text>
                <Text
                  fontFamily="$mono"
                  fontSize={12.5}
                  color={rankDetails.changePct >= 0 ? '#34D399' : 'rgba(255,255,255,0.8)'}
                >
                  {rankDetails.changePct >= 0 ? '+' : ''}
                  {rankDetails.changePct.toFixed(1)}%
                </Text>
              </XStack>
            ) : null}

            <YStack height={40} marginTop={14}>
              <svg
                viewBox="0 0 400 40"
                preserveAspectRatio="none"
                style={{ width: '100%', height: '100%', overflow: 'visible' }}
              >
                <polyline
                  points="0,33 57,34 114,28 171,30 228,19 285,21 342,10 400,6"
                  fill="none"
                  stroke={colors.stadiumAccent}
                  strokeWidth={2.4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle
                  cx={400}
                  cy={6}
                  r={3.4}
                  fill={colors.inverse}
                  stroke={colors.stadiumAccent}
                  strokeWidth={2}
                />
              </svg>
            </YStack>

            <XStack alignItems="center" gap={10} marginTop={12}>
              <YStack
                flex={1}
                height={4}
                borderRadius={2}
                backgroundColor="rgba(255,255,255,0.18)"
                overflow="hidden"
              >
                <YStack
                  height={4}
                  borderRadius={2}
                  backgroundColor="#34D399"
                  style={{ animation: 'sfRefresh 60s linear infinite' }}
                />
              </YStack>
              <Text
                fontFamily="$body"
                fontSize={11}
                color="rgba(255,255,255,0.72)"
                aria-label="Live data freshness"
              >
                {isLoading ? 'Updating…' : `Updated ${formatLiveAgo(agoMs)} · refreshes every 60s`}
              </Text>
            </XStack>
          </YStack>

          <AdSlot placement="rank-inline" minHeight={250} />

          <XStack gap={10} style={STAT_GRID_STYLE}>
            {tiles.map((tile) => (
              <StatTile
                key={tile.label}
                label={tile.label}
                tone={tile.tone}
                sub={tile.sub}
                pulseKey={tile.tick}
                value={
                  tile.tick !== null ? (
                    <NumberTicker
                      value={tile.tick}
                      format={(n) => n.toLocaleString()}
                      fontFamily="$mono"
                      fontSize={26}
                      lineHeight={28}
                      fontWeight="400"
                      color="$color"
                    />
                  ) : (
                    <Text
                      fontFamily="$mono"
                      fontSize={26}
                      lineHeight={28}
                      fontWeight="400"
                      color="$color"
                    >
                      {tile.value}
                    </Text>
                  )
                }
              >
                {tile.whatIfButton ? (
                  <Text
                    render="button"
                    role="button"
                    fontFamily="$body"
                    fontSize={9.5}
                    fontWeight="600"
                    color="$brand"
                    cursor="pointer"
                    marginTop={6}
                    hoverStyle={{ color: '$brandHover' }}
                    onPress={tile.whatIfButton}
                  >
                    What if?
                  </Text>
                ) : null}
              </StatTile>
            ))}
          </XStack>

          <Card paddingHorizontal={20} paddingVertical={16} gap={8}>
            <SectionHeader title="Cohort comparison" />
            {showCohortLoading && <SkeletonCohortTable />}
            {!showCohortLoading && hasCohortData && (
              <CohortTable
                rows={cohortRows}
                footer="Live cohort data refreshes every 60s · more breakdowns coming soon"
              />
            )}
            {!showCohortLoading && !hasCohortData && (
              <Text fontFamily="$body" fontSize={12.5} color="$colorMuted" lineHeight={18}>
                {cohortFallbackText}
              </Text>
            )}
          </Card>
        </YStack>

        <YStack
          flexGrow={1}
          flexShrink={1}
          flexBasis={0}
          minWidth={0}
          $md={{ flexGrow: 0, flexBasis: 'auto', width: '100%' }}
        >
          <LivePitchColumn
            teamName={teamName}
            formation={formation}
            label={`Your Team · GW${currentGw ?? '—'}`}
            pitchRows={pitchRows}
            bench={bench}
            top10kPayload={top10kPayload}
            provisionalBonusTotal={provisionalBonusTotal}
            onWhatIf={openWhatIf}
            whatIfOpen={whatIfOpen}
            whatIfType={whatIfType}
            whatIfCandidates={whatIfCandidates}
            whatIfActiveId={whatIfSim.activeSwap?.to ?? null}
            whatIfSimulatedPoints={whatIfSim.result?.newLivePoints ?? null}
            whatIfDeltaPoints={whatIfSim.result?.deltaPoints ?? null}
            whatIfDeltaRank={whatIfSim.result?.deltaRank ?? null}
            whatIfTransferSearch={whatIfTransferSearch}
            onTransferSearchChange={setWhatIfTransferSearch}
            onSelectCandidate={(id) => {
              if (whatIfFromId !== null) {
                whatIfSim.simulate({ type: whatIfType, from: whatIfFromId, to: id });
              }
            }}
            onWhatIfReset={whatIfSim.reset}
            onWhatIfClose={closeWhatIf}
          />
        </YStack>
      </XStack>

      {battle && battle.isLive && (battle.gains.length > 0 || battle.losses.length > 0) ? (
        <YStack marginBottom={16}>
          <LiveBattlePanel
            gains={battle.gains.map((p) => ({
              id: p.elementId,
              name: p.name,
              teamShort: p.teamShort,
              points: p.livePoints,
              rankImpact: p.rankImpact,
            }))}
            losses={battle.losses.map((p) => ({
              id: p.elementId,
              name: p.name,
              teamShort: p.teamShort,
              points: p.livePoints,
              rankImpact: p.rankImpact,
            }))}
            totalImpact={battle.totalImpact}
          />
        </YStack>
      ) : null}

      <XStack marginTop={4} marginBottom={8} justifyContent="center" gap={10}>
        <Text fontFamily="$body" fontSize={12} color="$colorSubtle">
          Not your team?{' '}
          <Text render={<a href="/?change=1" />} color="$color" fontSize={12} fontFamily="$body">
            Search again →
          </Text>
        </Text>
        <Text fontFamily="$body" fontSize={12} color="$colorSubtle">
          ·{' '}
          <Text render={<a href="/?clear=1" />} color="$color" fontSize={12} fontFamily="$body">
            Deselect team
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
