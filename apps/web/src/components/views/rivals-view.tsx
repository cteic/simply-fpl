'use client';

import { useEffect, useMemo, useState } from 'react';

import { useParams, useRouter } from 'next/navigation';

import { auth, leagues as leagueFeatures, rivals, subscriptions } from '@simplyfpl/features';
import { getCurrentGameweek } from '@simplyfpl/fpl-client';
import { t } from '@simplyfpl/i18n';
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
  LeagueSwitcher,
  PageHeader,
  PageShell,
  ProBanner,
  RivalCell,
  RivalsWindowSelector,
  SectionHeader,
  Text,
  XStack,
  YStack,
} from '@simplyfpl/ui';
import type { DifferentialPlayer } from '@simplyfpl/ui';

import { useFlipAnimation } from '@/hooks/use-flip-animation';
import { useBootstrap, useClassicLeague, useEntryPicks, useLiveGameweek } from '@/queries/fpl';

const {
  computeDifferentials,
  computeRivalsBoard,
  selectRivalEntryIds,
  useRivalPicks,
  windowSizeToSelectOptions,
  useRivalsWindowSize,
  getVisibleLeagues,
  WINDOW_OPTIONS,
} = rivals;
const { useTier } = subscriptions;
const { useTrackedLeagues } = leagueFeatures;
const { useAuth } = auth;

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
        <PageHeader title={t('rivals.title')} meta={t('rivals.meta_invalid_id')} />
        <Text fontFamily="$body" fontSize={13} color="$colorMuted">
          {t('rivals.invalid_id_body')}
        </Text>
      </PageShell>
    );
  }

  if (!hydrated) {
    return (
      <PageShell>
        <PageHeader title={t('rivals.title')} meta={t('common.loading')} />
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
      <PageHeader title={t('rivals.title')} meta={t('rivals.meta_no_team')} />
      <Card paddingHorizontal={20} paddingVertical={20}>
        <YStack gap={10}>
          <Text fontFamily="$body" fontSize={13} color="$colorMuted">
            {t('rivals.no_team_body')}
          </Text>
          <XStack>
            <Button
              tone="primary"
              size="md"
              onPress={() => {
                window.location.href = '/';
              }}
            >
              {t('common.cta_enter_team_id')}
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

export function RivalsInner({ leagueId, userEntryId }: RivalsInnerProps) {
  const router = useRouter();
  const { isPro } = useTier();
  const { user } = useAuth();
  const { leagues: allLeagues } = useTrackedLeagues();
  const visibleLeagues = useMemo(() => getVisibleLeagues(allLeagues, isPro), [allLeagues, isPro]);
  const hasHiddenLeagues = !isPro && allLeagues.length > 1;
  const [windowSize, setWindowSize] = useRivalsWindowSize(user?.id ?? null, isPro);

  const { data: league, isLoading: leagueLoading, error: leagueError } = useClassicLeague(leagueId);
  const { data: bootstrap } = useBootstrap();
  const currentGw = useMemo(() => (bootstrap ? getCurrentGameweek(bootstrap) : null), [bootstrap]);
  const { data: liveGw } = useLiveGameweek(currentGw);

  const standings: FplLeagueStanding[] = league?.standings.results ?? [];
  const selectOptions = useMemo(() => windowSizeToSelectOptions(windowSize), [windowSize]);
  const { rivalEntryIds, userStanding, isWholeLeague } = useMemo(
    () => selectRivalEntryIds(standings, userEntryId, selectOptions),
    [standings, userEntryId, selectOptions]
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

  function handleLeagueSelect(id: number) {
    router.push(`/rivals/${String(id)}`);
  }

  function handleWindowSizeChange(size: number) {
    const coerced = size as (typeof WINDOW_OPTIONS)[number];
    setWindowSize(coerced);
  }

  if (leagueLoading) {
    return (
      <PageShell>
        <PageHeader title={t('rivals.title')} meta={t('rivals.meta_loading_league')} />
      </PageShell>
    );
  }

  if (leagueError || !league) {
    return (
      <PageShell>
        <PageHeader title={t('rivals.title')} meta={`League ${leagueId}`} />
        <Card paddingHorizontal={16} paddingVertical={14}>
          <Text fontFamily="$body" fontSize={13} color="$danger">
            {t('rivals.load_error')}
          </Text>
        </Card>
      </PageShell>
    );
  }

  if (userStanding === null) {
    return (
      <PageShell>
        <PageHeader title={t('rivals.title')} meta={league.league.name} />
        <Card paddingHorizontal={16} paddingVertical={14}>
          <Text fontFamily="$body" fontSize={13} color="$colorMuted">
            {t('rivals.not_in_league', { entryId: userEntryId })}
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
      activeLeagueId={leagueId}
      userStanding={userStanding}
      standings={standings}
      rivalEntryIds={rivalEntryIds}
      picksMap={picksMap}
      picksErrors={picksErrors}
      userPicks={userPicks ?? null}
      liveGw={liveGw ?? null}
      bootstrap={bootstrap ?? null}
      currentGw={currentGw}
      isPro={isPro}
      visibleLeagueIds={visibleLeagues.map((l) => l.league_id)}
      hasHiddenLeagues={hasHiddenLeagues}
      windowSize={windowSize}
      windowOptions={WINDOW_OPTIONS}
      onWindowSizeChange={handleWindowSizeChange}
      onLeagueSelect={handleLeagueSelect}
    />
  );
}

interface RivalsBoardProps {
  leagueName: string;
  leagueSize: number;
  isWholeLeague: boolean;
  userEntryId: number;
  activeLeagueId: number;
  userStanding: FplLeagueStanding;
  standings: FplLeagueStanding[];
  rivalEntryIds: number[];
  picksMap: Map<number, FplEntryGameweekPicks>;
  picksErrors: Map<number, Error>;
  userPicks: FplEntryGameweekPicks | null;
  liveGw: FplLiveGameweek | null;
  bootstrap: FplBootstrapStatic | null;
  currentGw: number | null;
  isPro: boolean;
  visibleLeagueIds: number[];
  hasHiddenLeagues: boolean;
  windowSize: number;
  windowOptions: readonly number[];
  onWindowSizeChange: (size: number) => void;
  onLeagueSelect: (leagueId: number) => void;
}

function RivalsBoardSection({
  leagueName,
  leagueSize,
  isWholeLeague,
  userEntryId,
  activeLeagueId,
  userStanding,
  standings,
  rivalEntryIds,
  picksMap,
  picksErrors,
  userPicks,
  liveGw,
  bootstrap,
  currentGw,
  isPro,
  visibleLeagueIds,
  hasHiddenLeagues,
  windowSize,
  windowOptions,
  onWindowSizeChange,
  onLeagueSelect,
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
    const rowByEntry = new Map(board.map((r) => [r.entryId, r]));
    const orderedIds = board.length > 0 ? board.map((r) => r.entryId) : includedEntryIds;
    return orderedIds.flatMap((entryId) => {
      const standing = standingsByEntry.get(entryId);
      if (!standing) return [];
      return [{ entryId, standing, row: rowByEntry.get(entryId) }];
    });
  }, [board, includedEntryIds, standingsByEntry]);

  const orderedKeys = useMemo(() => orderedRows.map((r) => r.entryId), [orderedRows]);
  const boardRef = useFlipAnimation(orderedKeys);

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

  const showLeagueSwitcher = visibleLeagueIds.length > 1;

  return (
    <PageShell>
      <PageHeader tone="stadium" title={t('rivals.title')} meta={meta} />

      {showLeagueSwitcher || hasHiddenLeagues ? (
        <YStack marginBottom={12}>
          {showLeagueSwitcher ? (
            <LeagueSwitcher
              leagueIds={visibleLeagueIds}
              activeLeagueId={activeLeagueId}
              onSelect={onLeagueSelect}
            />
          ) : null}
          {hasHiddenLeagues ? (
            <ProBanner
              title={t('rivals.pro_banner_title')}
              body="You have more than one mini-league tracked. Upgrade to switch between them."
              ctaLabel="Upgrade"
              onPress={() => {
                window.location.href = '/upgrade';
              }}
            />
          ) : null}
        </YStack>
      ) : null}

      {isPro ? (
        <XStack alignItems="center" gap={8} marginBottom={12}>
          <Text fontFamily="$body" fontSize="$4" color="$colorSubtle">
            Window
          </Text>
          <RivalsWindowSelector
            options={windowOptions}
            selected={windowSize}
            onSelect={onWindowSizeChange}
          />
        </XStack>
      ) : null}

      {!ready ? (
        <Card paddingHorizontal={16} paddingVertical={14} marginBottom={16}>
          <Text fontFamily="$body" fontSize={12} color="$colorSubtle">
            {t('rivals.loading_live')}
          </Text>
        </Card>
      ) : null}

      <div ref={boardRef} data-testid="rivals-board">
        <YStack gap={10} marginBottom={20}>
          {orderedRows.length === 0 ? (
            <Card paddingHorizontal={16} paddingVertical={14}>
              <Text fontFamily="$body" fontSize={13} color="$colorMuted">
                {t('rivals.no_rival_data')}
              </Text>
            </Card>
          ) : (
            orderedRows.map(({ entryId, standing, row }) => {
              const isYou = entryId === userEntryId;
              const captainEl = row?.captainElement ?? null;
              const captainPts =
                captainEl !== null
                  ? (liveLookup?.get(captainEl)?.stats.total_points ?? null)
                  : null;
              const erroredCell = picksErrors.has(entryId);
              return (
                <div key={entryId} data-rival-key={String(entryId)}>
                  <RivalCell
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
                </div>
              );
            })
          )}
        </YStack>
      </div>

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
            <SectionHeader title={t('differentials.section_title')} />
            <Text fontFamily="$body" fontSize={12} color="$colorMuted" marginTop={6}>
              {rivalAbove ? t('rivals.loading_rival_picks') : t('rivals.top_of_window')}
            </Text>
          </Card>
        </YStack>
      )}

      <FNote>{t('rivals.fnote')}</FNote>
    </PageShell>
  );
}
