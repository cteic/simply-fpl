import { useEffect, useState } from 'react';

import { liveRank } from '@simplyfpl/features';
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
  CohortTable,
  FNote,
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
import { useEntrySnapshot, useFixtures, useLiveGameweek } from '@/queries/fpl';

const { useLiveRankEstimate } = liveRank;

const POSITION: Record<number, ShirtKind> = { 1: 'gk', 2: 'def', 3: 'mid', 4: 'fwd' };

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
      backgroundColor="#5EEAD4"
      opacity={bright ? 1 : 0.3}
    />
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
  const { estimate } = useLiveRankEstimate(entryId);

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
  const formation = picks && bootstrap ? deriveFormation(picks, bootstrap) : '4–4–2';
  const pitchRows =
    picks && bootstrap && liveGw ? rowsForFormation(picks, bootstrap, liveGw, bonusMap) : [];
  const bench = picks && bootstrap && liveGw ? benchPlayers(picks, bootstrap, liveGw) : [];
  const teamName = entry?.name ?? '—';

  let liveRankLabel = '—';
  if (estimate) liveRankLabel = estimate.liveRank.toLocaleString();
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
  const captainPick = picks?.picks.find((p) => p.is_captain);
  if (ready && captainPick && bootstrap && liveGw) {
    const captainPlayer = bootstrap.elements.find((e) => e.id === captainPick.element);
    const captainLive = liveGw.elements.find((e) => e.id === captainPick.element);
    const captainTbp = (captainLive?.stats.minutes ?? 0) === 0;
    const captainPts = (captainLive?.stats.total_points ?? 0) * captainPick.multiplier;
    captainName = captainPlayer?.web_name ?? '—';
    captainSub = `×${captainPick.multiplier} · ${captainTbp ? 'TBP' : `${captainPts} pts`}`;
  }

  const gwSub =
    ready && postSubsPoints !== livePoints ? `Post-subs ${postSubsPoints}` : 'live points';

  const tiles = [
    {
      label: 'GW Points',
      value: String(ready ? livePoints : '—'),
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
    { label: 'Captain', value: captainName, sub: captainSub, accent: '$negative' },
  ];

  const cohortRows: CohortTableRow[] = [
    { label: 'Score', you: ready ? livePoints : '—', top10k: 80, overall: 65, legendary: 77 },
    { label: 'Players played', you: '—', top10k: 9, overall: 8, legendary: 10 },
    { label: 'Budget played', you: '—', top10k: '£82m', overall: '£78m', legendary: '£89m' },
    { label: 'Captain pts', you: '—', top10k: 14, overall: 10, legendary: 18 },
  ];

  const isLoading = snapshotLoading || liveGw === undefined;

  return (
    <Screen topInset>
      <StadiumGradient borderRadius={14} paddingHorizontal={22} paddingVertical={22}>
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
          <TeamPill teamId={entryId} onPress={onChangeTeam} />
        </XStack>

        <Text
          fontFamily="$mono"
          fontSize={52}
          lineHeight={56}
          fontWeight="400"
          letterSpacing={-2}
          color="#FFFFFF"
          marginTop={6}
        >
          {liveRankLabel}
        </Text>

        <XStack alignItems="center" gap={10} marginTop={8} flexWrap="wrap">
          {movementLabel ? (
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

        <RankSparkline />

        <XStack alignItems="center" gap={10} marginTop={12}>
          <YStack flex={1} height={4} borderRadius={2} backgroundColor="rgba(255,255,255,0.18)">
            <YStack height={4} borderRadius={2} backgroundColor="#5EEAD4" width="35%" />
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
        </Pitch>
      </YStack>

      <YStack backgroundColor="$surface" paddingHorizontal={16} paddingVertical={12} gap={6}>
        <SectionHeader title="Cohort comparison" />
        <CohortTable
          rows={cohortRows}
          footer="Placeholder data — real cohort numbers landing this week"
        />
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
