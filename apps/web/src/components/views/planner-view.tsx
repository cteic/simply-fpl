'use client';

import { useEffect, useMemo, useState } from 'react';

import { planner } from '@simplyfpl/features';
import type { PlannerGridCell } from '@simplyfpl/features/planner';
import {
  Button,
  Card,
  FNote,
  PageHeader,
  PageShell,
  PlannerGrid,
  SectionHeader,
  Text,
  XStack,
  YStack,
} from '@simplyfpl/ui';
import type { PlannerGwCell } from '@simplyfpl/ui';

import { useBootstrap, useEntryPicks, useFixtures } from '@/queries/fpl';

const { computePlannerGrid } = planner;

const STORAGE_KEY = 'simplyfpl:lastEntryId';

export function PlannerView() {
  const [entryId, setEntryId] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const id = saved ? Number(saved) : NaN;
    if (Number.isInteger(id) && id > 0) {
      setEntryId(id);
    }
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return (
      <PageShell>
        <PageHeader title="Transfer Planner" meta="Loading…" />
      </PageShell>
    );
  }

  if (entryId === null) {
    return <NoTeamView />;
  }

  return <RealPlannerView entryId={entryId} />;
}

function RealPlannerView({ entryId }: { entryId: number }) {
  const { data: bootstrap } = useBootstrap();
  const currentGw = useMemo(() => {
    if (!bootstrap) return null;
    const event =
      bootstrap.events.find((e) => e.is_current) ?? bootstrap.events.find((e) => e.is_next);
    return event?.id ?? null;
  }, [bootstrap]);
  const { data: picks, isLoading: picksLoading } = useEntryPicks(entryId, currentGw);
  const { data: fixtures, isLoading: fixturesLoading } = useFixtures(null);

  const grid: PlannerGridCell[] = useMemo(() => {
    if (!bootstrap || !picks || !fixtures || currentGw === null) return [];
    return computePlannerGrid({
      picks,
      bootstrap,
      fixtures,
      startGameweek: currentGw,
      count: 5,
    });
  }, [bootstrap, picks, fixtures, currentGw]);

  const uiCells: PlannerGwCell[] = useMemo(
    () =>
      grid.map((cell) => ({
        label: cell.label,
        players: cell.players.map((p) => ({
          name: p.doubleGameweek ? `${p.name} ×2` : p.name,
          form: p.form,
          fdr: p.fdr,
        })),
      })),
    [grid]
  );

  const isLoading = picksLoading || fixturesLoading || !bootstrap || currentGw === null;

  return (
    <PageShell>
      <PageHeader
        title="Transfer Planner"
        meta={isLoading ? 'Loading…' : `Your XI · GW${currentGw ?? '—'}–${(currentGw ?? 0) + 4}`}
      />

      {isLoading || uiCells.length === 0 ? (
        <Card paddingHorizontal={20} paddingVertical={20} marginBottom={20}>
          <Text fontFamily="$body" fontSize={13} color="$colorSubtle">
            {isLoading
              ? 'Loading fixtures and your XI…'
              : 'No fixture data yet for the next 5 GWs.'}
          </Text>
        </Card>
      ) : (
        <PlannerGrid cells={uiCells} />
      )}

      <FNote>Fixture difficulty ratings (FDR) are based on FPL&apos;s official data.</FNote>
    </PageShell>
  );
}

function NoTeamView() {
  return (
    <PageShell>
      <PageHeader title="Transfer Planner" meta="Enter your FPL team ID to start" />
      <Card paddingHorizontal={24} paddingVertical={24} marginBottom={20}>
        <SectionHeader title="Link your FPL team" />
        <YStack gap={10} marginTop={4}>
          <Text fontFamily="$body" fontSize={13} color="$colorMuted">
            We need your FPL team ID to load your XI and compute their fixture difficulty across the
            next 5 gameweeks.
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
      <FNote>Fixture difficulty ratings (FDR) are based on FPL&apos;s official data.</FNote>
    </PageShell>
  );
}
