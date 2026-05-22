'use client';

import { useParams } from 'next/navigation';

import { useThemeName } from 'tamagui';

import { liveBattle, liveRank } from '@simplyfpl/features';
import {
  applyAutosubs,
  calculateLivePoints,
  getClubColor,
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
  Card,
  CohortTable,
  FNote,
  LiveBattlePanel,
  Logo,
  NumberTicker,
  PageHeader,
  PageShell,
  Pitch,
  PitchRow,
  Player,
  SectionHeader,
  SkeletonLiveRank,
  TeamPill,
  Text,
  XStack,
  YStack,
  colors,
  featureSurfaceStyle,
  resolveThemeName,
} from '@simplyfpl/ui';
import type { BadgeTone, CohortTableRow, ShirtKind } from '@simplyfpl/ui';

import { useCohortAggregates } from '@/queries/cohort-aggregates';
import { useEntrySnapshot, useFixtures } from '@/queries/fpl';

const { useLiveAgoMs, useLiveRankEstimate, useLiveSnapshot } = liveRank;
const { computeLiveBattle } = liveBattle;

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
        accentColor: getClubColor(teamShort),
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
        accentColor: getClubColor(teamShort),
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
  const heroSurface = featureSurfaceStyle(resolveThemeName(useThemeName()), 'panel');
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
  const battle =
    ready && fixtures
      ? computeLiveBattle({ yourPicks: picks, bootstrap, liveGw, fixtures, bonusMap })
      : null;
  const postSubsPicks = ready ? applyAutosubs(picks, liveGw, bootstrap) : null;
  const postSubsPoints =
    ready && postSubsPicks
      ? calculateLivePoints(postSubsPicks, liveGw, bootstrap, bonusMap)
      : livePoints;
  const formation = ready ? deriveFormation(picks, bootstrap) : '4–4–2';
  const pitchRows = ready ? rowsForFormation(picks, bootstrap, liveGw, bonusMap) : [];
  const bench = ready ? benchPlayers(picks, bootstrap, liveGw) : [];
  const teamName = entry?.name ?? '—';
  const { estimate } = useLiveRankEstimate(entryId);
  const agoMs = useLiveAgoMs();
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
  // Only the "Score" row has real numbers today; the per-stat breakdowns
  // (players played / budget / captain pts) are not aggregated yet, so we omit
  // them rather than render a wall of em-dashes. When no aggregates exist at
  // all we fall back to a "coming soon" message below instead of fake numbers.
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
        ]
      : [];
  const hasCohortData = cohortRows.length > 0;

  const benchPoints = bench.reduce((sum, p) => sum + (Number(p.badge) || 0), 0);

  const captainPick = ready ? picks.picks.find((p) => p.is_captain) : undefined;
  let captainName = '—';
  let captainSub = 'no captain set';
  if (ready && captainPick) {
    const captainPlayer = bootstrap.elements.find((e) => e.id === captainPick.element);
    const captainLive = liveGw.elements.find((e) => e.id === captainPick.element);
    const captainTbp = (captainLive?.stats.minutes ?? 0) === 0;
    const captainPts = (captainLive?.stats.total_points ?? 0) * captainPick.multiplier;
    captainName = captainPlayer?.web_name ?? '—';
    captainSub = `×${captainPick.multiplier} · ${captainTbp ? 'TBP' : `${captainPts} pts`}`;
  }

  const showSafety = overallAvg != null;
  const showOffTop10k = ready && top10kAvg != null;
  const safetyValue = overallAvg != null ? String(Math.round(overallAvg)) : '—';
  const offTop10kValue =
    ready && top10kAvg != null ? String(Math.max(0, Math.round(top10kAvg) - livePoints)) : '—';
  const gwSub =
    ready && postSubsPoints !== livePoints ? `Post-subs ${postSubsPoints}` : 'live points';

  const tiles = [
    {
      label: 'GW Points',
      value: String(ready ? livePoints : '—'),
      tick: ready ? livePoints : null,
      sub: gwSub,
      accent: '$positive',
    },
    {
      label: 'Total Points',
      value: totalPointsLabel,
      tick: entry?.summary_overall_points ?? null,
      sub: 'overall',
      accent: '$brand',
    },
    {
      label: 'On Bench',
      value: String(ready ? benchPoints : '—'),
      tick: ready ? benchPoints : null,
      sub: 'autosubs ready',
      accent: '$colorSubtle',
    },
    ...(showSafety
      ? [
          {
            label: 'Safety Score',
            value: safetyValue,
            tick: null,
            sub: 'green-arrow line',
            accent: '$positive',
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
            accent: '$warning',
          },
        ]
      : []),
    { label: 'Captain', value: captainName, tick: null, sub: captainSub, accent: '$negative' },
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

            <XStack alignItems="center" justifyContent="space-between" gap={8} flexWrap="wrap">
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
              <TeamPill teamId={entryId} />
            </XStack>

            <NumberTicker
              value={estimate?.liveRank ?? null}
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

          <XStack gap={10} style={STAT_GRID_STYLE}>
            {tiles.map((tile) => (
              <YStack
                key={tile.label}
                backgroundColor="$surface"
                borderWidth={1}
                borderColor="$border"
                borderLeftWidth={3}
                borderLeftColor={tile.accent}
                borderRadius={8}
                paddingHorizontal={16}
                paddingVertical={14}
              >
                <Text
                  fontFamily="$body"
                  fontSize={9.5}
                  fontWeight="600"
                  textTransform="uppercase"
                  letterSpacing={0.6}
                  color="$colorSubtle"
                  marginBottom={8}
                >
                  {tile.label}
                </Text>
                {tile.tick !== null ? (
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
                )}
                <Text fontFamily="$body" fontSize={10.5} color="$colorMuted" marginTop={6}>
                  {tile.sub}
                </Text>
              </YStack>
            ))}
          </XStack>

          <Card paddingHorizontal={20} paddingVertical={16} gap={8}>
            <SectionHeader title="Cohort comparison" />
            {hasCohortData ? (
              <CohortTable
                rows={cohortRows}
                footer="Live cohort data refreshes every 60s · more breakdowns coming soon"
              />
            ) : (
              <Text fontFamily="$body" fontSize={12.5} color="$colorMuted" lineHeight={18}>
                Cohort comparison is coming soon — live Top 10k, Overall and Legendary benchmarks
                land this week.
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
          <Pitch
            teamName={teamName}
            formation={formation}
            label={`Your Team · GW${currentGw ?? '—'}`}
          >
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
                        accentColor={p.accentColor}
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
                      accentColor={p.accentColor}
                      bench
                    />
                  ))}
                </PitchRow>
              </>
            ) : null}
          </Pitch>
        </YStack>
      </XStack>

      {battle && battle.isLive && (battle.gains.length > 0 || battle.losses.length > 0) ? (
        <YStack marginBottom={16}>
          <LiveBattlePanel
            gains={battle.gains.map((p) => ({
              id: p.elementId,
              name: p.name,
              teamShort: p.teamShort,
              rankImpact: p.rankImpact,
            }))}
            losses={battle.losses.map((p) => ({
              id: p.elementId,
              name: p.name,
              teamShort: p.teamShort,
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
