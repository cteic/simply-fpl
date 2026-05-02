'use client';

import { useMemo } from 'react';

import { auth, planner } from '@simplyfpl/features';
import type { PlannerGridCell } from '@simplyfpl/features/planner';
import {
  Button,
  Card,
  FNote,
  PageHeader,
  PageShell,
  PlannerGrid,
  ProBanner,
  SectionHeader,
  Text,
  XStack,
  YStack,
} from '@simplyfpl/ui';
import type { PlannerGwCell } from '@simplyfpl/ui';

import { useBootstrap, useEntryPicks, useFixtures } from '@/queries/fpl';

const { useAuth } = auth;
const { computePlannerGrid } = planner;

export function PlannerView() {
  const { session, profile, isPro, isLoading, isProfileLoading } = useAuth();

  if (isLoading || isProfileLoading) {
    return (
      <PageShell>
        <PageHeader title="Transfer Planner" meta="Loading…" />
      </PageShell>
    );
  }

  if (!session) {
    return <UpsellView />;
  }

  if (!profile?.fplEntryId) {
    return <NoTeamView />;
  }

  return <RealPlannerView entryId={profile.fplEntryId} isPro={isPro} />;
}

function RealPlannerView({ entryId, isPro }: { entryId: number; isPro: boolean }) {
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
          name: dgwName(p.name, p.doubleGameweek),
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
        right={
          <Text
            fontFamily="$body"
            fontSize={11}
            fontWeight="500"
            color="$warning"
            backgroundColor="$warningBg"
            borderWidth={1}
            borderColor="$warningBorder"
            paddingHorizontal={10}
            paddingVertical={4}
            borderRadius={20}
          >
            ✦ Pro feature
          </Text>
        }
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

      {!isPro ? (
        <ProBanner
          title="Unlock Transfer Planner with Pro"
          body="Plan transfers, chips and captain picks across the full season. €4/mo or €25/yr."
        />
      ) : null}

      <FNote>Fixture difficulty ratings (FDR) are based on FPL&apos;s official data.</FNote>
    </PageShell>
  );
}

function dgwName(name: string, doubleGameweek: boolean): string {
  return doubleGameweek ? `${name} ×2` : name;
}

function UpsellView() {
  return (
    <PageShell>
      <PageHeader title="Transfer Planner" meta="Pro feature · €4/mo or €25/yr" />

      <Card paddingHorizontal={24} paddingVertical={24} marginBottom={20}>
        <SectionHeader title="Plan your transfers across the season" />
        <YStack gap={10} marginTop={4}>
          <Text fontFamily="$body" fontSize={13} color="$colorMuted">
            See fixture difficulty, captain picks and chip strategy in one grid — across the next
            five gameweeks. Sign in to view your XI.
          </Text>
          <XStack gap={10}>
            <Button
              tone="primary"
              size="md"
              onPress={() => {
                window.location.href = '/login';
              }}
            >
              Sign in
            </Button>
            <Button
              tone="ghost"
              size="md"
              onPress={() => {
                window.location.href = '/demo/planner';
              }}
            >
              See a demo
            </Button>
          </XStack>
        </YStack>
      </Card>

      <ProBanner
        title="Unlock Transfer Planner with Pro"
        body="Plan transfers, chips and captain picks across the full season. €4/mo or €25/yr."
      />

      <FNote>Fixture difficulty ratings (FDR) are based on FPL&apos;s official data.</FNote>
    </PageShell>
  );
}

function NoTeamView() {
  return (
    <PageShell>
      <PageHeader title="Transfer Planner" meta="Link your FPL team to start planning" />
      <Card paddingHorizontal={24} paddingVertical={24} marginBottom={20}>
        <SectionHeader title="Link your FPL team" />
        <YStack gap={10} marginTop={4}>
          <Text fontFamily="$body" fontSize={13} color="$colorMuted">
            We need your FPL team ID to load your XI and compute their fixture difficulty.
          </Text>
          <XStack>
            <Button
              tone="primary"
              size="md"
              onPress={() => {
                window.location.href = '/onboarding';
              }}
            >
              Link your team
            </Button>
          </XStack>
        </YStack>
      </Card>
      <FNote>Fixture difficulty ratings (FDR) are based on FPL&apos;s official data.</FNote>
    </PageShell>
  );
}
