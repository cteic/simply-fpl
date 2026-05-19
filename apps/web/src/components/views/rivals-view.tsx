'use client';

import { useEffect, useMemo, useState } from 'react';

import { useParams } from 'next/navigation';

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
  PageHeader,
  PageShell,
  RivalCell,
  SectionHeader,
  Text,
  XStack,
  YStack,
} from '@simplyfpl/ui';
import type { DifferentialPlayer } from '@simplyfpl/ui';

import { useBootstrap, useClassicLeague, useEntryPicks, useLiveGameweek } from '@/queries/fpl';

const { computeDifferentials, computeRivalsBoard, selectRivalEntryIds, useRivalPicks } = rivals;

const STORAGE_KEY = 'simplyfpl:lastEntryId';

function parseLeagueId(raw: string | string[] | undefined): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string') return null;
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return null;
  return parsed;
}

export function RivalsView() {
  const params = useParams();
  const leagueId = parseLeagueId(params?.leagueId);
  const [entryId, setEntryId] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const id = saved ? Number(saved) : NaN;
    if (Number.isInteger(id) && id > 0) setEntryId(id);
    setHydrated(true);
  }, []);

  if (leagueId === null) {
    return (
      <PageShell>
        <PageHeader title="Rivals" meta="Invalid league ID in URL" />
        <Text fontFamily="$body" fontSize={13} color="$colorMuted">
          The URL needs a positive integer league ID, like <code>/rivals/123456</code>.
        </Text>
      </PageShell>
    );
  }

  if (!hydrated) {
    return (
      <PageShell>
        <PageHeader title="Rivals" meta="Loading…" />
      </PageShell>
    );
  }

  if (entryId === null) {
    return <NoTeamView />;
  }

  return <RivalsInner leagueId={leagueId} userEntryId={entryId} />;
}

function NoTeamView() {
  return (
    <PageShell>
      <PageHeader title="Rivals" meta="Tell us your team ID to see your rivals" />
      <Card paddingHorizontal={20} paddingVertical={20}>
        <YStack gap={10}>
          <Text fontFamily="$body" fontSize={13} color="$colorMuted">
            We pull the closest managers from your mini-league once we know your team ID.
          </Text>
          <XStack>
            <Button
              tone="primary"
              size="md"
              onPress={() => {
                window.location.href = '/';
              }}
            >
              Enter team ID
            </Button>
          </XStack>
        </YStack>
      </Card>
    </PageShell>
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
      <PageShell>
        <PageHeader title="Rivals" meta="Loading league…" />
      </PageShell>
    );
  }

  if (leagueError || !league) {
    return (
      <PageShell>
        <PageHeader title="Rivals" meta={`League ${leagueId}`} />
        <Card paddingHorizontal={16} paddingVertical={14}>
          <Text fontFamily="$body" fontSize={13} color="$danger">
            Couldn&apos;t load this league. Double-check the league ID.
          </Text>
        </Card>
      </PageShell>
    );
  }

  if (userStanding === null) {
    return (
      <PageShell>
        <PageHeader title="Rivals" meta={league.league.name} />
        <Card paddingHorizontal={16} paddingVertical={14}>
          <Text fontFamily="$body" fontSize={13} color="$colorMuted">
            Team {userEntryId} isn&apos;t in this league. Pick a league you&apos;ve joined.
          </Text>
        </Card>
      </PageShell>
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

  return (
    <PageShell>
      <PageHeader title="Rivals" meta={meta} />

      {!ready ? (
        <Card paddingHorizontal={16} paddingVertical={14} marginBottom={16}>
          <Text fontFamily="$body" fontSize={12} color="$colorSubtle">
            Loading live data…
          </Text>
        </Card>
      ) : null}

      <YStack gap={10} marginBottom={20} data-testid="rivals-board">
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
                {...(isYou ? {} : { onPress: () => {} })}
              />
            );
          })
        )}
      </YStack>

      {differentials && rivalAbove ? (
        <YStack marginBottom={20}>
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
        </YStack>
      ) : (
        <YStack marginBottom={20}>
          <Card paddingHorizontal={16} paddingVertical={14}>
            <SectionHeader title="Differentials" />
            <Text fontFamily="$body" fontSize={12} color="$colorMuted" marginTop={6}>
              {rivalAbove
                ? 'Loading rival picks…'
                : "You're top of the rivals window — no manager above to compare against."}
            </Text>
          </Card>
        </YStack>
      )}

      <FNote>Live GW points refresh every 60s. Bonus shown is provisional until confirmed.</FNote>
    </PageShell>
  );
}
