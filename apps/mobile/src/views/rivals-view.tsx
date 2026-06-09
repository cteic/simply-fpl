import { useMemo } from 'react';

import { useLocalSearchParams, useRouter } from 'expo-router';

import { rivals } from '@simplyfpl/features';
import { getCurrentGameweek } from '@simplyfpl/fpl-client';
import type {
  FplBootstrapStatic,
  FplEntryGameweekPicks,
  FplLeagueStanding,
  FplLiveGameweek,
} from '@simplyfpl/types';
import {
  Button,
  Card,
  DifferentialsPanel,
  FNote,
  RivalCell,
  SectionHeader,
  Text,
  XStack,
  YStack,
} from '@simplyfpl/ui';
import type { DifferentialPlayer } from '@simplyfpl/ui';

import { Screen } from '@/components/screen';
import { useSavedEntryId } from '@/lib/saved-team';
import { useBootstrap, useClassicLeague, useEntryPicks, useLiveGameweek } from '@/queries/fpl';

const { computeDifferentials, computeRivalsBoard, selectRivalEntryIds, useRivalPicks } = rivals;

function parseLeagueId(raw: string | string[] | undefined): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string') return null;
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return null;
  return parsed;
}

export function RivalsView() {
  const params = useLocalSearchParams<{ leagueId?: string }>();
  const leagueId = parseLeagueId(params.leagueId);
  const { entryId, hydrated } = useSavedEntryId();

  if (leagueId === null) {
    return (
      <Screen>
        <Header title="Rivals" meta="Invalid league ID" />
        <Card paddingHorizontal={16} paddingVertical={14}>
          <Text fontFamily="$body" fontSize={13} color="$colorMuted">
            Open one of your mini-leagues to see your rivals.
          </Text>
        </Card>
      </Screen>
    );
  }

  if (!hydrated) {
    return (
      <Screen>
        <Header title="Rivals" meta="Loading…" />
      </Screen>
    );
  }

  if (entryId === null) {
    return <NoTeamView />;
  }

  return <RivalsInner leagueId={leagueId} userEntryId={entryId} />;
}

function NoTeamView() {
  const router = useRouter();
  return (
    <Screen>
      <Header title="Rivals" meta="Tell us your team ID to see your rivals" />
      <Card paddingHorizontal={20} paddingVertical={20}>
        <YStack gap={10}>
          <Text fontFamily="$body" fontSize={13} color="$colorMuted">
            We pull the closest managers from your mini-league once we know your team ID.
          </Text>
          <XStack>
            <Button tone="primary" size="md" onPress={() => router.push('/')}>
              Enter team ID
            </Button>
          </XStack>
        </YStack>
      </Card>
    </Screen>
  );
}

interface HeaderProps {
  title: string;
  meta: string;
}

function Header({ title, meta }: HeaderProps) {
  return (
    <YStack>
      <Text fontFamily="$body" fontSize={21} fontWeight="600" letterSpacing={-0.4} color="$color">
        {title}
      </Text>
      <Text fontFamily="$body" fontSize={12} color="$colorMuted" marginTop={4}>
        {meta}
      </Text>
    </YStack>
  );
}

interface RivalsInnerProps {
  leagueId: number;
  userEntryId: number;
}

function RivalsInner({ leagueId, userEntryId }: RivalsInnerProps) {
  const { data: league, isLoading: leagueLoading, error: leagueError } = useClassicLeague(leagueId);
  const { data: bootstrap } = useBootstrap();
  const currentGw = useMemo(() => (bootstrap ? getCurrentGameweek(bootstrap) : null), [bootstrap]);
  const { data: liveGw } = useLiveGameweek(currentGw);

  const standings: FplLeagueStanding[] = league?.standings.results ?? [];
  const { rivalEntryIds, userStanding, isWholeLeague } = useMemo(
    () => selectRivalEntryIds(standings, userEntryId),
    [standings, userEntryId]
  );

  const allEntryIds = useMemo(() => {
    const ids = new Set<number>(rivalEntryIds);
    ids.add(userEntryId);
    return Array.from(ids);
  }, [rivalEntryIds, userEntryId]);

  const { data: picksMap, errors: picksErrors } = useRivalPicks(allEntryIds, currentGw);
  const { data: userPicksFromHook } = useEntryPicks(userEntryId, currentGw);

  const userPicks: FplEntryGameweekPicks | undefined =
    picksMap.get(userEntryId) ?? userPicksFromHook;

  if (leagueLoading) {
    return (
      <Screen>
        <Header title="Rivals" meta="Loading league…" />
      </Screen>
    );
  }

  if (leagueError || !league) {
    return (
      <Screen>
        <Header title="Rivals" meta={`League ${leagueId}`} />
        <Card paddingHorizontal={16} paddingVertical={14}>
          <Text fontFamily="$body" fontSize={13} color="$danger">
            Couldn't load this league. Double-check the league ID.
          </Text>
        </Card>
      </Screen>
    );
  }

  if (userStanding === null) {
    return (
      <Screen>
        <Header title="Rivals" meta={league.league.name} />
        <Card paddingHorizontal={16} paddingVertical={14}>
          <Text fontFamily="$body" fontSize={13} color="$colorMuted">
            Team {userEntryId} isn't in this league. Pick a league you've joined.
          </Text>
        </Card>
      </Screen>
    );
  }

  return (
    <RivalsBoardSection
      leagueName={league.league.name}
      leagueSize={standings.length}
      isWholeLeague={isWholeLeague}
      userEntryId={userEntryId}
      userStanding={userStanding}
      standings={standings}
      rivalEntryIds={rivalEntryIds}
      picksMap={picksMap}
      picksErrors={picksErrors}
      userPicks={userPicks ?? null}
      liveGw={liveGw ?? null}
      bootstrap={bootstrap ?? null}
      currentGw={currentGw}
    />
  );
}

interface RivalsBoardProps {
  leagueName: string;
  leagueSize: number;
  isWholeLeague: boolean;
  userEntryId: number;
  userStanding: FplLeagueStanding;
  standings: FplLeagueStanding[];
  rivalEntryIds: number[];
  picksMap: Map<number, FplEntryGameweekPicks>;
  picksErrors: Map<number, Error>;
  userPicks: FplEntryGameweekPicks | null;
  liveGw: FplLiveGameweek | null;
  bootstrap: FplBootstrapStatic | null;
  currentGw: number | null;
}

function RivalsBoardSection({
  leagueName,
  leagueSize,
  isWholeLeague,
  userEntryId,
  userStanding,
  standings,
  rivalEntryIds,
  picksMap,
  picksErrors,
  userPicks,
  liveGw,
  bootstrap,
  currentGw,
}: RivalsBoardProps) {
  const standingsByEntry = useMemo(() => {
    const map = new Map<number, FplLeagueStanding>();
    for (const s of standings) map.set(s.entry, s);
    return map;
  }, [standings]);

  const playerLookup = useMemo(() => {
    if (bootstrap === null) return null;
    return new Map(bootstrap.elements.map((p) => [p.id, p]));
  }, [bootstrap]);

  const teamLookup = useMemo(() => {
    if (bootstrap === null) return null;
    return new Map(bootstrap.teams.map((t) => [t.id, t]));
  }, [bootstrap]);

  const liveLookup = useMemo(() => {
    if (liveGw === null) return null;
    return new Map(liveGw.elements.map((e) => [e.id, e]));
  }, [liveGw]);

  const meta = useMemo(() => {
    const parts = [leagueName, `${leagueSize} managers`, `GW${currentGw ?? '—'}`];
    if (isWholeLeague) parts.push('Whole league shown');
    return parts.join(' · ');
  }, [leagueName, leagueSize, isWholeLeague, currentGw]);

  const ready = liveGw !== null && bootstrap !== null;

  const includedEntryIds = useMemo(
    () => [userEntryId, ...rivalEntryIds],
    [userEntryId, rivalEntryIds]
  );

  const rivalsData = useMemo(() => {
    return includedEntryIds.flatMap((entryId) => {
      const picks = picksMap.get(entryId);
      const standing = standingsByEntry.get(entryId);
      if (!picks || !standing) return [];
      return [
        {
          entryId,
          entryName: standing.entry_name,
          playerName: standing.player_name,
          picks,
        },
      ];
    });
  }, [includedEntryIds, picksMap, standingsByEntry]);

  const board = useMemo(() => {
    if (!ready) return [];
    return computeRivalsBoard(userEntryId, standings, rivalsData, liveGw, bootstrap);
  }, [ready, userEntryId, standings, rivalsData, liveGw, bootstrap]);

  const orderedRows = useMemo(() => {
    return includedEntryIds.flatMap((entryId) => {
      const standing = standingsByEntry.get(entryId);
      if (!standing) return [];
      const row = board.find((r) => r.entryId === entryId);
      return [{ entryId, standing, row }];
    });
  }, [includedEntryIds, standingsByEntry, board]);

  const rivalAbove = useMemo(() => {
    return [...rivalEntryIds]
      .map((id) => standingsByEntry.get(id))
      .filter((s): s is FplLeagueStanding => s !== undefined)
      .filter((s) => s.rank < userStanding.rank)
      .sort((a, b) => b.rank - a.rank)[0];
  }, [rivalEntryIds, standingsByEntry, userStanding.rank]);

  const rivalAbovePicks = rivalAbove ? picksMap.get(rivalAbove.entry) : undefined;
  const differentials =
    userPicks && rivalAbovePicks ? computeDifferentials(userPicks, rivalAbovePicks) : null;

  function lookupPlayer(elementId: number): DifferentialPlayer | null {
    if (playerLookup === null || teamLookup === null) return null;
    const player = playerLookup.get(elementId);
    if (!player) return null;
    const team = teamLookup.get(player.team);
    const live = liveLookup?.get(elementId);
    return {
      id: elementId,
      name: player.web_name,
      teamShort: team?.short_name ?? '—',
      livePoints: live?.stats.total_points ?? 0,
    };
  }

  const yoursOnly = (differentials?.yoursOnly ?? [])
    .map(lookupPlayer)
    .filter((p): p is DifferentialPlayer => p !== null);
  const theirsOnly = (differentials?.theirsOnly ?? [])
    .map(lookupPlayer)
    .filter((p): p is DifferentialPlayer => p !== null);

  function captainName(picks: FplEntryGameweekPicks | undefined): string | null {
    if (!picks || playerLookup === null) return null;
    const cap = picks.picks.find((p) => p.is_captain);
    if (!cap) return null;
    return playerLookup.get(cap.element)?.web_name ?? null;
  }

  const router = useRouter();

  return (
    <Screen>
      <Header title="Rivals" meta={meta} />

      {!ready ? (
        <Card paddingHorizontal={16} paddingVertical={14}>
          <Text fontFamily="$body" fontSize={12} color="$colorSubtle">
            Loading live data…
          </Text>
        </Card>
      ) : null}

      <YStack gap={10}>
        {orderedRows.length === 0 ? (
          <Card paddingHorizontal={16} paddingVertical={14}>
            <Text fontFamily="$body" fontSize={13} color="$colorMuted">
              No rival data yet — picks are still loading.
            </Text>
          </Card>
        ) : (
          orderedRows.map(({ entryId, standing, row }) => {
            const isYou = entryId === userEntryId;
            const captainEl = row?.captainElement ?? null;
            const captainPts =
              captainEl !== null ? (liveLookup?.get(captainEl)?.stats.total_points ?? null) : null;
            const erroredCell = picksErrors.has(entryId);
            return (
              <RivalCell
                key={entryId}
                rank={standing.rank}
                managerName={standing.player_name}
                teamName={standing.entry_name}
                livePoints={row?.livePoints ?? 0}
                captainName={
                  captainEl !== null ? (playerLookup?.get(captainEl)?.web_name ?? null) : null
                }
                captainPoints={erroredCell ? null : captainPts}
                captainMultiplier={row?.captainMultiplier ?? 1}
                activeChip={row?.activeChip ?? null}
                transferHits={row?.transferHits ?? 0}
                benchPointsWasted={row?.benchPointsWasted ?? 0}
                isYou={isYou}
                {...(isYou
                  ? {}
                  : {
                      onPress: () =>
                        router.push({
                          pathname: '/h2h',
                          params: { you: userEntryId, them: entryId },
                        }),
                    })}
              />
            );
          })
        )}
      </YStack>

      {differentials && rivalAbove ? (
        <DifferentialsPanel
          rivalLabel={rivalAbove.player_name}
          yoursOnly={yoursOnly}
          theirsOnly={theirsOnly}
          captain={{
            yoursName: captainName(userPicks ?? undefined),
            theirsName: captainName(rivalAbovePicks),
            same: differentials.captaincyDiff.same,
          }}
        />
      ) : (
        <Card paddingHorizontal={16} paddingVertical={14}>
          <SectionHeader title="Differentials" />
          <Text fontFamily="$body" fontSize={12} color="$colorMuted" marginTop={6}>
            {rivalAbove
              ? 'Loading rival picks…'
              : "You're top of the rivals window — no manager above to compare against."}
          </Text>
        </Card>
      )}

      <FNote>Live GW points refresh every 60s. Bonus shown is provisional until confirmed.</FNote>
    </Screen>
  );
}
