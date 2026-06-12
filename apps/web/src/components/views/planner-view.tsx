'use client';

import { useEffect, useMemo, useState } from 'react';

import { planner } from '@simplyfpl/features';
import type { PlannerGridCell } from '@simplyfpl/features/planner';
import { t } from '@simplyfpl/i18n';
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
        <PageHeader title={t('planner.title')} meta={t('planner.loading_meta')} />
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
        tone="stadium"
        title={t('planner.title')}
        meta={
          isLoading
            ? t('planner.loading_meta')
            : t('planner.team_gw_range', { from: currentGw ?? '—', to: (currentGw ?? 0) + 4 })
        }
      />

      {isLoading || uiCells.length === 0 ? (
        <Card paddingHorizontal={20} paddingVertical={20} marginBottom={20}>
          <Text fontFamily="$body" fontSize={13} color="$colorSubtle">
            {isLoading ? t('planner.loading_fixtures') : t('planner.no_fixtures')}
          </Text>
        </Card>
      ) : (
        <PlannerGrid cells={uiCells} />
      )}

      <FNote>{t('planner.fdr_note')}</FNote>
    </PageShell>
  );
}

function NoTeamView() {
  return (
    <PageShell>
      <PageHeader title={t('planner.title')} meta={t('planner.no_team_meta')} />
      <Card paddingHorizontal={24} paddingVertical={24} marginBottom={20}>
        <SectionHeader title={t('planner.link_team')} />
        <YStack gap={10} marginTop={4}>
          <Text fontFamily="$body" fontSize={13} color="$colorMuted">
            {t('planner.link_body')}
          </Text>
          <XStack>
            <Button
              tone="primary"
              size="md"
              onPress={() => {
                window.location.href = '/';
              }}
            >
              {t('common.enter_team_id')}
            </Button>
          </XStack>
        </YStack>
      </Card>
      <FNote>{t('planner.fdr_note')}</FNote>
    </PageShell>
  );
}
