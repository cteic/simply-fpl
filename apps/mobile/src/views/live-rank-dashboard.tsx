import { useEffect, useState } from 'react';

import { liveRank } from '@simplyfpl/features';
import {
  applyAutosubs,
  calculateLivePoints,
  computeRankDetails,
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
  CohortTable,
  FNote,
  Logo,
  NumberTicker,
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

import { RankSparkline } from '@/components/rank-sparkline';
import { Screen } from '@/components/screen';
import { StadiumGradient } from '@/components/stadium-gradient';
import { StatTile } from '@/components/stat-tile';
import { useCohortAggregates } from '@/queries/cohort-aggregates';
import { useEntrySnapshot, useFixtures, useLiveGameweek } from '@/queries/fpl';

const { useLiveRankEstimate } = liveRank;

const POSITION: Record<number, ShirtKind> = { 1: 'gk', 2: 'def', 3: 'mid', 4: 'fwd' };

type SubsMode = 'pre' | 'post';

interface PitchPlayer {
  key: number;
  name: string;
  detail: string;
  position: ShirtKind;
  badge: string;
  badgeTone: BadgeTone;
  kitUrl: string | undefined;
  kitUrl2x: string | undefined;
  accentColor: string | undefined;
  ownershipPercent: number | undefined;
}

function buildMaps(bootstrap: FplBootstrapStatic) {
  const elementsById = new Map<number, FplPlayer>();
  for (const e of bootstrap.elements) elementsById.set(e.id, e);
  const teamShortById = new Map<number, string>();
  const teamCodeById = new Map<number, number>();
  for (const t of bootstrap.teams) {
    teamShortById.set(t.id, t.short_name);
    teamCodeById.set(t.id, t.code);
  }
  return { elementsById, teamShortById, teamCodeById };
}

function rowsForFormation(
  picks: FplEntryGameweekPicks,
  bootstrap: FplBootstrapStatic,
  liveGw: FplLiveGameweek,
  bonusMap: Map<number, BonusPrediction>
): PitchPlayer[][] {
  const { elementsById, teamShortById, teamCodeById } = buildMaps(bootstrap);
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
    grouped[POSITION[player.element_type] ?? 'mid'].push(pick);
  }

  function build(picksOfRow: typeof starters): PitchPlayer[] {
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
      const provisionalBonusLabel =
        bonusInfo && bonusInfo.provisional && bonusInfo.bonus > 0 ? ` · +${bonusInfo.bonus}b?` : '';
      const ownership = player ? Number.parseFloat(player.selected_by_percent) : undefined;
      return {
        key: pick.element,
        name: `${player?.web_name ?? '?'}${isCaptain ? ' (C)' : ''}`,
        detail: tbp ? `${teamShort} · TBP` : `${teamShort}${provisionalBonusLabel}`,
        position: POSITION[player?.element_type ?? 3] ?? 'mid',
        badge: tbp ? '–' : String(points),
        badgeTone: tone,
        kitUrl: teamCode !== undefined ? getKitUrl(teamCode, { isGoalkeeper }) : undefined,
        kitUrl2x:
          teamCode !== undefined ? getKitUrl(teamCode, { isGoalkeeper, size: 220 }) : undefined,
        accentColor: getClubColor(teamShort),
        ownershipPercent:
          ownership !== undefined && Number.isFinite(ownership) ? ownership : undefined,
      };
    });
  }

  return [build(grouped.gk), build(grouped.def), build(grouped.mid), build(grouped.fwd)];
}

function benchPlayers(
  picks: FplEntryGameweekPicks,
  bootstrap: FplBootstrapStatic,
  liveGw: FplLiveGameweek
): PitchPlayer[] {
  const { elementsById, teamShortById, teamCodeById } = buildMaps(bootstrap);
  const liveById = new Map(liveGw.elements.map((e) => [e.id, e]));
  return picks.picks
    .filter((p) => p.position > 11)
    .map((pick) => {
      const player = elementsById.get(pick.element);
      const live = liveById.get(pick.element);
      const teamShort = player ? (teamShortById.get(player.team) ?? '') : '';
      const teamCode = player ? teamCodeById.get(player.team) : undefined;
      const isGoalkeeper = player?.element_type === 1;
      const ownership = player ? Number.parseFloat(player.selected_by_percent) : undefined;
      return {
        key: pick.element,
        name: player?.web_name ?? '?',
        detail: teamShort,
        position: POSITION[player?.element_type ?? 3] ?? 'mid',
        badge: String(live?.stats.total_points ?? 0),
        badgeTone: 'bench' as const,
        kitUrl: teamCode !== undefined ? getKitUrl(teamCode, { isGoalkeeper }) : undefined,
        kitUrl2x:
          teamCode !== undefined ? getKitUrl(teamCode, { isGoalkeeper, size: 220 }) : undefined,
        accentColor: getClubColor(teamShort),
        ownershipPercent:
          ownership !== undefined && Number.isFinite(ownership) ? ownership : undefined,
      };
    });
}

function deriveFormation(picks: FplEntryGameweekPicks, bootstrap: FplBootstrapStatic): string {
  const { elementsById } = buildMaps(bootstrap);
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

function LiveDot() {
  const [bright, setBright] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setBright((v) => !v), 1500);
    return () => clearInterval(id);
  }, []);
  return (
    <YStack
      width={6}
      height={6}
      borderRadius={99}
      backgroundColor="#34D399"
      opacity={bright ? 1 : 0.3}
    />
  );
}

interface SubsToggleButtonProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

function SubsToggleButton({ label, active, onPress }: SubsToggleButtonProps) {
  return (
    <Text
      onPress={onPress}
      fontFamily="$body"
      fontSize={11}
      fontWeight="600"
      paddingHorizontal={11}
      paddingVertical={4}
      color={active ? '#0B4F49' : 'rgba(255,255,255,0.78)'}
      backgroundColor={active ? '#34D399' : 'transparent'}
      pressStyle={{ opacity: 0.7 }}
    >
      {label}
    </Text>
  );
}

interface LiveRankDashboardProps {
  entryId: number;
  onChangeTeam: () => void;
}

export function LiveRankDashboard({ entryId, onChangeTeam }: LiveRankDashboardProps) {
  const { data: snapshot, isLoading: snapshotLoading, isError } = useEntrySnapshot(entryId);
  const bootstrap = snapshot?.bootstrap;
  const entry = snapshot?.entry;
  const picks = snapshot?.picks;
  const currentGw = snapshot?.gw ?? null;
  const { data: liveGw } = useLiveGameweek(currentGw);
  const { data: fixtures } = useFixtures(currentGw);
  const aggregates = useCohortAggregates(currentGw);
  const { estimate } = useLiveRankEstimate(entryId);
  const [subsMode, setSubsMode] = useState<SubsMode>('pre');

  if (isError) {
    return (
      <Screen>
        <Text fontFamily="$body" fontSize={14} color="$danger" marginTop={40}>
          Couldn't load this team. Check the team ID and try again.
        </Text>
        <Text onPress={onChangeTeam} fontFamily="$body" fontSize={13} color="$brand" marginTop={12}>
          Search again →
        </Text>
      </Screen>
    );
  }

  const ready = Boolean(entry && picks && liveGw && bootstrap);
  const bonusMap =
    ready && fixtures && liveGw && bootstrap
      ? predictBonusPoints(liveGw, fixtures, bootstrap)
      : new Map<number, BonusPrediction>();
  const livePoints =
    ready && picks && liveGw && bootstrap
      ? calculateLivePoints(picks, liveGw, bootstrap, bonusMap)
      : 0;
  const postSubsPicks =
    ready && picks && liveGw && bootstrap ? applyAutosubs(picks, liveGw, bootstrap) : null;
  const postSubsPoints =
    postSubsPicks && liveGw && bootstrap
      ? calculateLivePoints(postSubsPicks, liveGw, bootstrap, bonusMap)
      : livePoints;
  const preGwRank = entry?.summary_overall_rank ?? 0;
  const avgEntryScore = bootstrap?.events.find((e) => e.id === currentGw)?.average_entry_score ?? 0;
  const rankDetails =
    ready && entry
      ? computeRankDetails(preGwRank, livePoints, postSubsPoints, avgEntryScore)
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
  const formation = picks && bootstrap ? deriveFormation(picks, bootstrap) : '4–4–2';
  const pitchRows =
    picks && bootstrap && liveGw ? rowsForFormation(picks, bootstrap, liveGw, bonusMap) : [];
  const bench = picks && bootstrap && liveGw ? benchPlayers(picks, bootstrap, liveGw) : [];
  const teamName = entry?.name ?? '—';

  const heroRank =
    showPostSubs && rankDetails ? rankDetails.postSubsRank : (estimate?.liveRank ?? null);
  const movementLabel =
    estimate && estimate.movement !== 0
      ? `${estimate.direction === 'up' ? '↑' : '↓'} ${Math.abs(estimate.movement).toLocaleString()}`
      : null;

  const totalPointsLabel = entry?.summary_overall_points
    ? entry.summary_overall_points.toLocaleString()
    : '—';
  const benchPoints = bench.reduce((sum, p) => sum + (Number(p.badge) || 0), 0);

  let captainName = '—';
  let captainSub = 'no captain set';
  let captainPointsValue: number | null = null;
  const captainPick = picks?.picks.find((p) => p.is_captain);
  if (ready && captainPick && bootstrap && liveGw) {
    const captainPlayer = bootstrap.elements.find((e) => e.id === captainPick.element);
    const captainLive = liveGw.elements.find((e) => e.id === captainPick.element);
    const captainTbp = (captainLive?.stats.minutes ?? 0) === 0;
    const captainPts = (captainLive?.stats.total_points ?? 0) * captainPick.multiplier;
    captainName = captainPlayer?.web_name ?? '—';
    captainSub = `×${captainPick.multiplier} · ${captainTbp ? 'TBP' : `${captainPts} pts`}`;
    captainPointsValue = captainTbp ? null : captainPts;
  }

  const liveById = liveGw ? new Map(liveGw.elements.map((e) => [e.id, e])) : null;
  const playersPlayed =
    ready && picks && liveById
      ? picks.picks.filter(
          (p) => p.position <= 11 && (liveById.get(p.element)?.stats.minutes ?? 0) > 0
        ).length
      : null;

  const top10kAvg = aggregates?.tiers.top_10k?.avg_event_points;
  const overallAvg = aggregates?.tiers.overall?.avg_event_points;
  const legendaryAvg = aggregates?.tiers.legendary?.avg_event_points;

  let gwSub = 'live points';
  if (ready && autosubsApply) {
    gwSub = showPostSubs ? `Pre-subs ${livePoints}` : `Post-subs ${postSubsPoints}`;
  }

  const showSafety = overallAvg != null;
  const showOffTop10k = ready && top10kAvg != null;
  const safetyValue = overallAvg != null ? String(Math.round(overallAvg)) : '—';
  const offTop10kValue =
    ready && top10kAvg != null ? String(Math.max(0, Math.round(top10kAvg) - livePoints)) : '—';

  const tiles = [
    {
      label: 'GW Points',
      value: String(ready ? displayedPoints : '—'),
      sub: gwSub,
      accent: '$positive',
    },
    { label: 'Total Points', value: totalPointsLabel, sub: 'overall', accent: '$brand' },
    {
      label: 'On Bench',
      value: String(ready ? benchPoints : '—'),
      sub: 'autosubs ready',
      accent: '$colorSubtle',
    },
    ...(showSafety
      ? [
          {
            label: 'Safety Score',
            value: safetyValue,
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
            sub: 'points behind',
            accent: '$warning',
          },
        ]
      : []),
    { label: 'Captain', value: captainName, sub: captainSub, accent: '$negative' },
  ];

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

  const isLoading = snapshotLoading || liveGw === undefined;

  return (
    <Screen topInset>
      <StadiumGradient borderRadius={14} paddingHorizontal={22} paddingVertical={22}>
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
          {autosubsApply ? (
            <XStack
              alignItems="center"
              borderWidth={1}
              borderColor="rgba(255,255,255,0.28)"
              borderRadius={99}
              overflow="hidden"
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
          ) : (
            <TeamPill teamId={entryId} onPress={onChangeTeam} />
          )}
        </XStack>

        <NumberTicker
          value={heroRank}
          format={(n) => n.toLocaleString()}
          fontFamily="$mono"
          fontSize={52}
          lineHeight={56}
          fontWeight="400"
          letterSpacing={-2}
          color="#FFFFFF"
          marginTop={6}
        />

        <XStack alignItems="center" gap={10} marginTop={8} flexWrap="wrap">
          {movementLabel ? (
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
              gap={6}
              borderWidth={1}
              borderColor="rgba(255,255,255,0.3)"
              paddingHorizontal={10}
              paddingVertical={3}
              borderRadius={99}
            >
              <LiveDot />
              <Text fontFamily="$body" fontSize={12} color="rgba(255,255,255,0.85)">
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

        <RankSparkline />

        <XStack alignItems="center" gap={10} marginTop={12}>
          <YStack flex={1} height={4} borderRadius={2} backgroundColor="rgba(255,255,255,0.18)">
            <YStack height={4} borderRadius={2} backgroundColor="#34D399" width="35%" />
          </YStack>
          <Text fontFamily="$body" fontSize={11} color="rgba(255,255,255,0.7)">
            {isLoading ? 'loading…' : 'refreshes every 60s'}
          </Text>
        </XStack>
      </StadiumGradient>

      <XStack flexWrap="wrap" gap={10}>
        {tiles.map((tile) => (
          <StatTile
            key={tile.label}
            label={tile.label}
            value={tile.value}
            sub={tile.sub}
            accent={tile.accent}
          />
        ))}
      </XStack>

      <YStack>
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
          {ready && provisionalBonusTotal > 0 ? (
            <Text fontFamily="$body" fontSize={10.5} color="$colorMuted" marginTop={8}>
              Includes provisional bonus (
              <Text fontFamily="$mono" fontSize={10.5} color="$colorMuted">
                +{provisionalBonusTotal}b?
              </Text>
              ) — not yet confirmed by FPL
            </Text>
          ) : null}
        </Pitch>
      </YStack>

      <YStack backgroundColor="$surface" paddingHorizontal={16} paddingVertical={12} gap={6}>
        <SectionHeader title="Cohort comparison" />
        {hasCohortData ? (
          <CohortTable
            rows={cohortRows}
            footer="Live cohort data refreshes every 60s · more breakdowns coming soon"
          />
        ) : (
          <Text fontFamily="$body" fontSize={12.5} color="$colorMuted">
            Cohort benchmarks loading…
          </Text>
        )}
      </YStack>

      <XStack justifyContent="center">
        <Text fontFamily="$body" fontSize={12} color="$colorSubtle">
          Not your team?{' '}
          <Text onPress={onChangeTeam} color="$color" fontSize={12} fontFamily="$body">
            Search again →
          </Text>
        </Text>
      </XStack>

      <FNote>
        Data via Fantasy Premier League API · Live values refresh every 60s while gameweeks are
        active.
      </FNote>
    </Screen>
  );
}
