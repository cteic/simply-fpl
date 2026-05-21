'use client';

import { useParams } from 'next/navigation';

import { liveRank } from '@simplyfpl/features';
import {
  applyAutosubs,
  calculateLivePoints,
  getKitUrl,
  predictBonusPoints,
} from '@simplyfpl/fpl-client';
import type { BonusPrediction } from '@simplyfpl/fpl-client';
import type {
  FplBootstrapStatic,
  FplEntryGameweekPicks,
  FplLiveGameweek,
  FplPlayer,
} from '@simplyfpl/types';
import {
  BenchDivider,
  CohortTable,
  FNote,
  PageHeader,
  PageShell,
  Pitch,
  PitchRow,
  Player,
  SectionHeader,
  TeamPill,
  Text,
  XStack,
  YStack,
} from '@simplyfpl/ui';
import type { BadgeTone, CohortTableRow, ShirtKind } from '@simplyfpl/ui';

import { useCohortAggregates } from '@/queries/cohort-aggregates';
import { useEntrySnapshot, useFixtures } from '@/queries/fpl';

const { useLiveRankEstimate, useLiveSnapshot } = liveRank;

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
  const transferHit = ready ? picks.entry_history.event_transfers_cost : 0;
  const formation = ready ? deriveFormation(picks, bootstrap) : '4–4–2';
  const pitchRows = ready ? rowsForFormation(picks, bootstrap, liveGw, bonusMap) : [];
  const bench = ready ? benchPlayers(picks, bootstrap, liveGw) : [];
  const teamName = entry?.name ?? '—';
  const playerName = entry ? `${entry.player_first_name} ${entry.player_last_name}`.trim() : '';
  const { estimate } = useLiveRankEstimate(entryId);
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

  const benchPoints = bench.reduce((sum, p) => sum + (Number(p.badge) || 0), 0);
  const chipLabel = picks?.active_chip ?? '';
  const tiles = [
    {
      label: 'GW Points',
      value: String(ready ? livePoints : '—'),
      sub: ready && postSubsPoints !== livePoints ? `Post-subs ${postSubsPoints}` : 'live points',
      accent: '$positive',
    },
    { label: 'Total Points', value: totalPointsLabel, sub: 'overall', accent: '$brand' },
    {
      label: 'On Bench',
      value: String(ready ? benchPoints : '—'),
      sub: 'autosubs ready',
      accent: '$colorSubtle',
    },
    {
      label: chipLabel ? 'Active Chip' : 'Transfer Hit',
      value: chipLabel || (transferHit > 0 ? `-${transferHit}` : 'None'),
      sub: chipLabel ? 'this gameweek' : 'points spent',
      accent: '$warning',
    },
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

  const isLoading = snapshotLoading || liveLoading;

  return (
    <PageShell>
      <PageHeader
        title="Live Rank"
        meta={isLoading ? 'Loading…' : `Gameweek ${currentGw ?? '—'} · ${playerName || teamName}`}
        right={<TeamPill teamId={entryId} />}
      />

      <YStack
        borderRadius={14}
        overflow="hidden"
        marginBottom={12}
        paddingHorizontal={22}
        paddingVertical={22}
        backgroundColor="$brand"
        style={{
          backgroundImage:
            'radial-gradient(120% 130% at 85% -20%, #1A8A6E 0%, #0F766E 45%, #0B4F49 100%)',
        }}
      >
        <XStack alignItems="center" justifyContent="space-between" gap={8} flexWrap="wrap">
          <Text
            fontFamily="$body"
            fontSize={10}
            fontWeight="600"
            textTransform="uppercase"
            letterSpacing={1.4}
            color="#5EEAD4"
          >
            est. live rank
          </Text>
          <XStack alignItems="center" gap={6}>
            <YStack
              width={6}
              height={6}
              borderRadius={3}
              backgroundColor="#5EEAD4"
              style={{ animation: 'sfPulse 1.5s ease-in-out infinite' }}
            />
            <Text
              fontFamily="$body"
              fontSize={10}
              fontWeight="600"
              textTransform="uppercase"
              letterSpacing={1}
              color="#5EEAD4"
            >
              {currentGw !== null ? `GW${currentGw} live` : 'live'}
            </Text>
          </XStack>
        </XStack>

        <Text
          fontFamily="$mono"
          fontSize={56}
          lineHeight={58}
          fontWeight="400"
          letterSpacing={-2}
          color="#FFFFFF"
          marginTop={6}
        >
          {liveRankLabel}
        </Text>

        <XStack alignItems="center" gap={10} marginTop={8} flexWrap="wrap">
          {estimate && movementLabel ? (
            <XStack
              alignItems="center"
              backgroundColor="#5EEAD4"
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
              borderColor="rgba(255,255,255,0.3)"
              paddingHorizontal={10}
              paddingVertical={3}
              borderRadius={99}
            >
              <Text fontFamily="$body" fontSize={12} color="rgba(255,255,255,0.85)">
                live
              </Text>
            </XStack>
          )}
          <Text fontFamily="$body" fontSize={12.5} color="rgba(255,255,255,0.8)">
            since GW start
          </Text>
        </XStack>

        <XStack alignItems="center" gap={10} marginTop={16}>
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
              backgroundColor="#5EEAD4"
              style={{ animation: 'sfRefresh 60s linear infinite' }}
            />
          </YStack>
          <Text fontFamily="$body" fontSize={11} color="rgba(255,255,255,0.7)">
            {isLoading ? 'loading…' : 'refreshes every 60s'}
          </Text>
        </XStack>
      </YStack>

      <XStack flexWrap="wrap" gap={10} marginBottom={16}>
        {tiles.map((tile) => (
          <YStack
            key={tile.label}
            flex={1}
            minWidth={140}
            backgroundColor="$surface"
            borderWidth={1}
            borderColor="$border"
            borderLeftWidth={3}
            borderLeftColor={tile.accent}
            borderRadius={10}
            paddingHorizontal={16}
            paddingVertical={14}
          >
            <Text
              fontFamily="$body"
              fontSize={10}
              fontWeight="600"
              textTransform="uppercase"
              letterSpacing={0.7}
              color="$colorSubtle"
              marginBottom={8}
            >
              {tile.label}
            </Text>
            <Text fontFamily="$mono" fontSize={28} lineHeight={30} fontWeight="400" color="$color">
              {tile.value}
            </Text>
            <Text fontFamily="$body" fontSize={11} color="$colorMuted" marginTop={6}>
              {tile.sub}
            </Text>
          </YStack>
        ))}
      </XStack>

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
