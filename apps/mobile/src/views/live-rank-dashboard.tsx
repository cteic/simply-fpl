import { useEffect, useState } from 'react';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { liveBattle, liveRank } from '@simplyfpl/features';
import {
  applyAutosubs,
  calculateLivePoints,
  computeDefConProgress,
  formatCompactRank,
  getClubColor,
  getKitUrl,
  predictBonusPoints,
  seasonSparklinePoints,
} from '@simplyfpl/fpl-client';
import type { BonusPrediction } from '@simplyfpl/fpl-client';
import type {
  FplBootstrapStatic,
  FplEntryGameweekPicks,
  FplLiveGameweek,
  FplPlayer,
  LiveSquadEvent,
  LiveSquadEventKind,
  SeasonStory,
} from '@simplyfpl/types';
import {
  BenchDivider,
  CohortTable,
  FNote,
  LiveBattlePanel,
  LiveEventToast,
  Logo,
  NumberTicker,
  Pitch,
  PitchRow,
  Player,
  SectionHeader,
  StatTile,
  TeamPill,
  Text,
  XStack,
  YStack,
} from '@simplyfpl/ui';
import type {
  BadgeTone,
  CohortTableRow,
  LiveEventTone,
  ShirtKind,
  StatTileTone,
} from '@simplyfpl/ui';

import { RankSparkline, SPARKLINE_HEIGHT, SPARKLINE_WIDTH } from '@/components/rank-sparkline';
import { RefreshBar } from '@/components/refresh-bar';
import { Screen } from '@/components/screen';
import { StadiumGradient } from '@/components/stadium-gradient';
import { useCohortAggregates } from '@/queries/cohort-aggregates';
import { useEntrySnapshot, useFixtures, useLiveGameweek } from '@/queries/fpl';

const { useLiveAgoMs, useLiveRankEstimate, useLiveSquadEvents, useSeasonStory, setLiveLastUpdate } =
  liveRank;
const { computeLiveBattle } = liveBattle;

function formatLiveAgo(ms: number | null): string {
  if (ms === null || ms < 5_000) return 'just now';
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  return `${Math.floor(ms / 3_600_000)}h ago`;
}

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

const EVENT_LABEL: Record<LiveSquadEventKind, string> = {
  goal: 'Goal',
  assist: 'Assist',
  bonus: 'Bonus',
  red_card: 'Red card',
  clean_sheet_lost: 'Clean sheet lost',
};

const EVENT_TONE: Record<LiveSquadEventKind, LiveEventTone> = {
  goal: 'positive',
  assist: 'positive',
  bonus: 'positive',
  red_card: 'negative',
  clean_sheet_lost: 'negative',
};

function eventDetail(event: LiveSquadEvent): string | undefined {
  if (event.onBench) return 'on your bench';
  if (event.isCaptain) return 'your captain';
  return undefined;
}

function eventPoints(event: LiveSquadEvent): string | undefined {
  if (event.pointsDelta === 0) return undefined;
  return event.pointsDelta > 0 ? `+${event.pointsDelta}` : `\u2212${Math.abs(event.pointsDelta)}`;
}

/**
 * One line of season context under the rank chart: the current run of arrows
 * and the best rank reached. Null when there is nothing settled to report.
 */
function describeSeason(story: SeasonStory): string | null {
  const parts: string[] = [];
  if (story.streak.length >= 2) {
    parts.push(`${story.streak.length} ${story.streak.direction} arrows running`);
  } else if (story.greenArrows + story.redArrows > 0) {
    parts.push(`${story.greenArrows} green, ${story.redArrows} red arrows`);
  }
  if (story.bestRank) {
    // "best 1,605,173 (GW1)" read as if the screen were about gameweek 1.
    parts.push(`season best ${story.bestRank.rank.toLocaleString()} in GW${story.bestRank.gw}`);
  }
  return parts.length > 0 ? parts.join(' \u00b7 ') : null;
}

/**
 * The hold line: what is still needed to keep position, or how clear they are.
 *
 * Zero gets its own wording. At kickoff nothing has been scored and the field
 * average is zero too, so the difference is zero, and "holding, 0 clear" reads
 * as a bug.
 */
function describeHold(holdFromHere: number): string {
  if (holdFromHere > 0) return `${holdFromHere} more to hold`;
  if (holdFromHere === 0) return 'level with the field';
  return `holding \u00b7 ${Math.abs(holdFromHere)} clear`;
}

export function LiveRankDashboard({ entryId, onChangeTeam }: LiveRankDashboardProps) {
  const { data: snapshot, isLoading: snapshotLoading, isError } = useEntrySnapshot(entryId);
  const bootstrap = snapshot?.bootstrap;
  const entry = snapshot?.entry;
  const picks = snapshot?.picks;
  const currentGw = snapshot?.gw ?? null;
  const { data: liveGw, dataUpdatedAt: liveGwUpdatedAt } = useLiveGameweek(currentGw);
  const { data: fixtures } = useFixtures(currentGw);
  const aggregates = useCohortAggregates(currentGw);
  // targets is null until FPL's curve has loaded. Without it there is nothing
  // to invert, so the line is hidden rather than showing a guessed target.
  const { estimate, postSubsEstimate, targets } = useLiveRankEstimate(entryId);
  const agoMs = useLiveAgoMs();
  const { story } = useSeasonStory(entryId);
  const { events: squadEvents } = useLiveSquadEvents({ picks, liveGw, bootstrap });
  const insets = useSafeAreaInsets();
  const sparkPoints = story
    ? seasonSparklinePoints(story.trajectory, {
        width: SPARKLINE_WIDTH,
        height: SPARKLINE_HEIGHT,
      })
    : null;
  const seasonLine = story ? describeSeason(story) : null;
  const [subsMode, setSubsMode] = useState<SubsMode>('pre');

  useEffect(() => {
    if (liveGwUpdatedAt) setLiveLastUpdate(liveGwUpdatedAt);
  }, [liveGwUpdatedAt]);

  if (isError) {
    return (
      <Screen testID="screen-home">
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
  const battle =
    ready && picks && liveGw && bootstrap && fixtures
      ? computeLiveBattle({ yourPicks: picks, bootstrap, liveGw, fixtures, bonusMap })
      : null;
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

  // No estimate means the gameweek has finished and FPL has published the real
  // overall rank, so show that rather than an empty hero.
  const gwFinished = bootstrap?.events.find((e) => e.id === currentGw)?.finished === true;
  const settledRank = entry?.summary_overall_rank ?? null;
  const heroRank =
    showPostSubs && postSubsEstimate
      ? postSubsEstimate.liveRank
      : (estimate?.liveRank ?? (gwFinished ? settledRank : null));
  // The other side of the pre/post toggle, from the same model as the hero.
  let subsAltLabel: string | null = null;
  if (estimate && postSubsEstimate && autosubsApply) {
    subsAltLabel = showPostSubs
      ? `Pre-subs ~${estimate.liveRank.toLocaleString()}`
      : `Post-subs ~${postSubsEstimate.liveRank.toLocaleString()}`;
  }
  const heroLabel = estimate === null && gwFinished ? 'overall rank' : 'est. live rank';
  const movementLabel =
    estimate && estimate.movement !== 0
      ? `${estimate.direction === 'up' ? '↑' : '↓'} ${Math.abs(estimate.movement).toLocaleString()}`
      : null;

  // What the line under the rank says. A settled gameweek has no estimate, so
  // it must not claim to be live or show movement "since GW start".
  let heroStatus: 'final' | 'moved' | 'live' = 'live';
  if (gwFinished && estimate === null) heroStatus = 'final';
  else if (movementLabel) heroStatus = 'moved';

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

  const defconGwPoints =
    ready && picks && bootstrap && liveGw
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

  // A settled gameweek's score is final, not live.
  let gwSub = gwFinished ? 'final' : 'live';
  if (ready && autosubsApply) {
    gwSub = showPostSubs ? `Pre-subs ${livePoints}` : `Post-subs ${postSubsPoints}`;
  }

  const showSafety = overallAvg != null;
  const showOffTop10k = ready && top10kAvg != null;
  const safetyValue = overallAvg != null ? String(Math.round(overallAvg)) : '—';
  const offTop10kValue =
    ready && top10kAvg != null ? String(Math.max(0, Math.round(top10kAvg) - livePoints)) : '—';

  const tiles: {
    label: string;
    value: string;
    tick: number | null;
    sub: string;
    tone: StatTileTone;
  }[] = [
    {
      label: 'GW pts',
      value: String(ready ? displayedPoints : '—'),
      tick: ready ? displayedPoints : null,
      sub: gwSub,
      tone: 'positive',
    },
    {
      label: 'Total',
      value: totalPointsLabel,
      tick: entry?.summary_overall_points ?? null,
      sub: 'overall',
      tone: 'brand',
    },
    {
      label: 'Bench',
      value: String(ready ? benchPoints : '—'),
      tick: ready ? benchPoints : null,
      sub: 'on bench',
      tone: 'neutral',
    },
    ...(showSafety
      ? [
          {
            label: 'Safety',
            value: safetyValue,
            tick: null,
            sub: 'green arrow',
            tone: 'positive' as const,
          },
        ]
      : []),
    ...(showOffTop10k
      ? [
          {
            label: 'Off 10k',
            value: offTop10kValue,
            tick: null,
            sub: 'pts behind',
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
    },
    ...(ready && defconGwPoints > 0
      ? [
          {
            label: 'DefCon',
            value: String(defconGwPoints),
            tick: defconGwPoints,
            sub: 'def pts',
            tone: 'positive' as const,
          },
        ]
      : []),
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
    <YStack flex={1}>
      <Screen testID="screen-home" topInset>
        <StadiumGradient borderRadius={12} paddingHorizontal={14} paddingVertical={10}>
          <XStack alignItems="center" justifyContent="space-between" gap={8} marginBottom={4}>
            <Logo variant="lockup" tone="stadium" size="sm" />
            <TeamPill teamId={entryId} onPress={onChangeTeam} />
          </XStack>
          <XStack alignItems="center" justifyContent="space-between" gap={8} flexWrap="wrap">
            <Text
              fontFamily="$body"
              fontSize={10}
              fontWeight="600"
              textTransform="uppercase"
              letterSpacing={1.4}
              color="#34D399"
            >
              {heroLabel}
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
            ) : null}
          </XStack>

          <NumberTicker
            testID="live-rank-value"
            value={heroRank}
            format={(n) => n.toLocaleString()}
            fontFamily="$mono"
            fontSize={36}
            lineHeight={38}
            fontWeight="400"
            letterSpacing={-1.5}
            color="#FFFFFF"
            marginTop={0}
          />

          <XStack alignItems="center" gap={8} marginTop={2} flexWrap="wrap">
            {heroStatus === 'final' ? (
              <Text fontFamily="$body" fontSize={12} color="rgba(255,255,255,0.8)">
                {`final after GW${currentGw ?? ''}`}
              </Text>
            ) : null}
            {heroStatus === 'moved' ? (
              <XStack
                alignItems="center"
                backgroundColor="#34D399"
                paddingHorizontal={9}
                paddingVertical={2}
                borderRadius={99}
              >
                <Text fontFamily="$mono" fontSize={12.5} fontWeight="500" color="#0B4F49">
                  {movementLabel}
                </Text>
              </XStack>
            ) : null}
            {heroStatus === 'live' ? (
              <XStack
                alignItems="center"
                gap={6}
                borderWidth={1}
                borderColor="rgba(255,255,255,0.3)"
                paddingHorizontal={9}
                paddingVertical={2}
                borderRadius={99}
              >
                <LiveDot />
                <Text fontFamily="$body" fontSize={12} color="rgba(255,255,255,0.85)">
                  live
                </Text>
              </XStack>
            ) : null}
            {heroStatus === 'final' ? null : (
              <Text fontFamily="$body" fontSize={12} color="rgba(255,255,255,0.6)">
                {`was ${preGwRank.toLocaleString()}`}
              </Text>
            )}
            {subsAltLabel ? (
              <Text fontFamily="$mono" fontSize={12} color="rgba(255,255,255,0.85)">
                {subsAltLabel}
              </Text>
            ) : null}
            <Text
              fontFamily="$body"
              fontSize={10.5}
              color="rgba(255,255,255,0.6)"
              marginLeft="auto"
            >
              {isLoading ? 'updating\u2026' : `updated ${formatLiveAgo(agoMs)}`}
            </Text>
          </XStack>

          {targets ? (
            <XStack
              alignItems="center"
              gap={10}
              marginTop={6}
              flexWrap="wrap"
              testID="rank-targets"
            >
              <Text fontFamily="$mono" fontSize={12.5} color="rgba(255,255,255,0.85)">
                {describeHold(targets.holdFromHere)}
              </Text>
              {targets.nextTarget ? (
                <Text fontFamily="$mono" fontSize={12.5} color="rgba(255,255,255,0.55)">
                  {`top ${formatCompactRank(targets.nextTarget.rank)} needs ${targets.nextTarget.pointsFromHere} more`}
                </Text>
              ) : null}
            </XStack>
          ) : null}

          {sparkPoints ? <RankSparkline points={sparkPoints} /> : null}
          {seasonLine ? (
            <Text
              fontFamily="$body"
              fontSize={11}
              color="rgba(255,255,255,0.72)"
              marginTop={4}
              numberOfLines={1}
              testID="season-line"
            >
              {seasonLine}
            </Text>
          ) : null}

          <XStack marginTop={6}>
            <RefreshBar paused={isLoading} />
          </XStack>
        </StadiumGradient>

        <XStack flexWrap="wrap" gap={6}>
          {tiles.map((tile) => (
            <StatTile
              key={tile.label}
              compact
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
                    fontSize={18}
                    lineHeight={20}
                    fontWeight="500"
                    color="$color"
                  />
                ) : (
                  <Text
                    fontFamily="$mono"
                    fontSize={13}
                    lineHeight={20}
                    fontWeight="500"
                    color="$color"
                    numberOfLines={1}
                  >
                    {tile.value}
                  </Text>
                )
              }
            />
          ))}
        </XStack>

        <YStack>
          <Pitch dense teamName={teamName} formation={formation} label={`GW${currentGw ?? '—'}`}>
            {ready
              ? pitchRows.map((row, i) => (
                  <PitchRow key={`row-${i}`} gap={2}>
                    {row.map((p) => (
                      <Player
                        key={p.key}
                        dense
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
                <PitchRow gap={2}>
                  {bench.map((p) => (
                    <Player
                      key={p.key}
                      dense
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

        {battle && battle.isLive && (battle.gains.length > 0 || battle.losses.length > 0) ? (
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
        ) : null}

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
      {squadEvents.length > 0 ? (
        <YStack
          position="absolute"
          top={insets.top + 6}
          left={12}
          right={12}
          gap={6}
          zIndex={10}
          pointerEvents="none"
          testID="live-events"
        >
          {squadEvents.map((event) => (
            <LiveEventToast
              key={event.id}
              kind={EVENT_LABEL[event.kind]}
              title={event.playerName}
              detail={eventDetail(event)}
              points={eventPoints(event)}
              tone={EVENT_TONE[event.kind]}
            />
          ))}
        </YStack>
      ) : null}
    </YStack>
  );
}
