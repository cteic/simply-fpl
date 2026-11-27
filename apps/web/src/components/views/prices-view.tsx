'use client';

import { useMemo, useState } from 'react';

import { computeSeasonDefConRate, formatPrice, getClubColor } from '@simplyfpl/fpl-client';
import { t } from '@simplyfpl/i18n';
import type { FplPlayer } from '@simplyfpl/types';
import {
  Button,
  Card,
  FilterButton,
  FNote,
  PageHeader,
  PageShell,
  PriceRow,
  SkeletonPrices,
  Text,
  XStack,
  YStack,
} from '@simplyfpl/ui';

import { useBootstrap, usePrices } from '@/queries/fpl';

/** Rows rendered before the user asks for the rest. */
const INITIAL_ROWS = 30;

const FILTERS = ['All', 'Risers', 'Fallers', 'GK', 'DEF', 'MID', 'FWD'] as const;
type Filter = (typeof FILTERS)[number];

const POSITION_BY_ELEMENT_TYPE: Record<number, Filter | undefined> = {
  1: 'GK',
  2: 'DEF',
  3: 'MID',
  4: 'FWD',
};

export function PricesView() {
  const { data: prices, isLoading, isError } = usePrices();
  const { data: bootstrap } = useBootstrap();
  const [filter, setFilter] = useState<Filter>('All');
  const [showAll, setShowAll] = useState(false);

  const bootstrapById = useMemo(() => {
    if (!bootstrap) return new Map<number, FplPlayer>();
    return new Map(bootstrap.elements.map((e) => [e.id, e]));
  }, [bootstrap]);

  const rows = useMemo(() => {
    if (!prices) return [];
    return prices.changes.map((change) => {
      const positionLabel = POSITION_BY_ELEMENT_TYPE[change.element_type] ?? 'MID';
      const player = bootstrapById.get(change.id);
      const defconRate = player ? computeSeasonDefConRate(change.element_type, player) : null;
      const defconBar = defconRate?.eligible
        ? {
            percentage: defconRate.percentage,
            breakdown: `${defconRate.cbitPer90.toFixed(1)} CBIT/90 vs ${defconRate.threshold} threshold`,
          }
        : undefined;
      return {
        id: change.id,
        name: change.web_name,
        club: `${positionLabel} · ${change.team_name} · ${formatPrice(change.now_cost)}`,
        accentColor: getClubColor(change.team_name),
        flow: change.direction,
        value: change.direction === 'rise' ? '+0.1m' : '−0.1m',
        progressPercent: change.progress_percent,
        locked: change.locked_until !== null,
        position: positionLabel,
        defconBar,
      };
    });
  }, [prices, bootstrapById]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (filter === 'All') return true;
      if (filter === 'Risers') return r.flow === 'rise';
      if (filter === 'Fallers') return r.flow === 'fall';
      return r.position === filter;
    });
  }, [rows, filter]);
  // A first screenful, then the rest on request. Rendering every row up front
  // kept a long list mounted behind the other tabs and made the app sluggish.
  const visibleRows = showAll ? filteredRows : filteredRows.slice(0, INITIAL_ROWS);

  // A failed request shows that it failed. It used to render a canned list of
  // price rises, so an outage looked like real predictions for real players.
  const failed = !isLoading && (isError || !prices);

  return (
    <PageShell>
      <PageHeader tone="stadium" title={t('prices.title')} meta={t('prices.meta')} />

      <XStack gap={8} flexWrap="wrap" marginBottom={16}>
        {FILTERS.map((f) => (
          <FilterButton key={f} active={f === filter} onPress={() => setFilter(f)}>
            {f}
          </FilterButton>
        ))}
      </XStack>

      {isLoading ? <SkeletonPrices /> : null}

      {failed ? (
        <Card>
          <YStack paddingHorizontal={16} paddingVertical={28} alignItems="center">
            <Text fontFamily="$body" fontSize={12} color="$colorSubtle">
              {t('prices.error')}
            </Text>
          </YStack>
        </Card>
      ) : null}

      {!isLoading && !failed ? (
        <Card>
          {visibleRows.length === 0 ? (
            <YStack paddingHorizontal={16} paddingVertical={28} alignItems="center">
              <Text fontFamily="$body" fontSize={12} color="$colorSubtle">
                {t('prices.empty')}
              </Text>
            </YStack>
          ) : (
            visibleRows.map((row, i) => (
              <PriceRow
                key={row.id}
                index={i + 1}
                name={row.name}
                club={row.club}
                flow={row.flow}
                value={row.value}
                progressPercent={row.progressPercent}
                locked={row.locked}
                accentColor={row.accentColor}
                defconBar={row.defconBar}
                last={i === visibleRows.length - 1}
              />
            ))
          )}
        </Card>
      ) : null}

      {!showAll && filteredRows.length > INITIAL_ROWS ? (
        <XStack>
          <Button tone="ghost" size="sm" onPress={() => setShowAll(true)}>
            {t('prices.show_all', { count: filteredRows.length })}
          </Button>
        </XStack>
      ) : null}

      <FNote>{t('prices.fnote')}</FNote>
    </PageShell>
  );
}
