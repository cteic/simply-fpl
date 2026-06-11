import { useMemo } from 'react';

import { router } from 'expo-router';

import { planner } from '@simplyfpl/features';
import type { PlannerGridCell } from '@simplyfpl/features/planner';
import {
  Button,
  Card,
  FNote,
  PlannerGrid,
  SectionHeader,
  Text,
  XStack,
  YStack,
} from '@simplyfpl/ui';
import type { PlannerGwCell } from '@simplyfpl/ui';

import { Screen } from '@/components/screen';
import { useSavedEntryId } from '@/lib/saved-team';
import { useBootstrap, useEntryPicks, useFixtures } from '@/queries/fpl';

const { computePlannerGrid } = planner;

export function PlannerView() {
  const { entryId, hydrated } = useSavedEntryId();

  if (!hydrated) {
    return (
      <Screen>
        <Text fontFamily="$body" fontSize={13} color="$colorMuted">
          Loading…
        </Text>
      </Screen>
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
    <Screen>
      <YStack>
        <Text fontFamily="$body" fontSize={21} fontWeight="600" letterSpacing={-0.4} color="$color">
          Transfer Planner
        </Text>
        <Text fontFamily="$body" fontSize={12} color="$colorMuted" marginTop={4}>
          {isLoading ? 'Loading…' : `Your XI · GW${currentGw ?? '—'}–${(currentGw ?? 0) + 4}`}
        </Text>
      </YStack>

      {isLoading || uiCells.length === 0 ? (
        <Card paddingHorizontal={20} paddingVertical={20}>
          <Text fontFamily="$body" fontSize={13} color="$colorSubtle">
            {isLoading
              ? 'Loading fixtures and your XI…'
              : 'No fixture data yet for the next 5 GWs.'}
          </Text>
        </Card>
      ) : (
        <PlannerGrid cells={uiCells} />
      )}

      <FNote>Fixture difficulty ratings (FDR) are based on FPL's official data.</FNote>
    </Screen>
  );
}

function NoTeamView() {
  return (
    <Screen>
      <YStack>
        <Text fontFamily="$body" fontSize={21} fontWeight="600" letterSpacing={-0.4} color="$color">
          Transfer Planner
        </Text>
        <Text fontFamily="$body" fontSize={12} color="$colorMuted" marginTop={4}>
          Enter your FPL team ID to start
        </Text>
      </YStack>
      <Card paddingHorizontal={20} paddingVertical={20}>
        <SectionHeader title="Link your FPL team" />
        <YStack gap={10} marginTop={4}>
          <Text fontFamily="$body" fontSize={13} color="$colorMuted">
            We need your FPL team ID to load your XI and compute fixture difficulty across the next
            5 gameweeks.
          </Text>
          <XStack>
            <Button
              tone="primary"
              size="md"
              onPress={() => {
                router.navigate('/');
              }}
            >
              Enter team ID
            </Button>
          </XStack>
        </YStack>
      </Card>
      <FNote>Fixture difficulty ratings (FDR) are based on FPL's official data.</FNote>
    </Screen>
  );
}
