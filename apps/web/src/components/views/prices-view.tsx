'use client';

import { useMemo, useState } from 'react';

import { formatPrice, getClubColor } from '@simplyfpl/fpl-client';
import { t } from '@simplyfpl/i18n';
import {
  Card,
  FNote,
  FilterButton,
  PageHeader,
  PageShell,
  PriceRow,
  SkeletonPrices,
  Text,
  XStack,
  YStack,
} from '@simplyfpl/ui';

import { DEMO_BIG_PRICE_ROWS } from '@/components/demo-data';
import { usePrices } from '@/queries/fpl';

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
  const [filter, setFilter] = useState<Filter>('All');

  const rows = useMemo(() => {
    if (!prices) return [];
    return prices.changes.map((change) => {
      const positionLabel = POSITION_BY_ELEMENT_TYPE[change.element_type] ?? 'MID';
      return {
        id: change.id,
        name: change.web_name,
        club: `${positionLabel} · ${change.team_name} · ${formatPrice(change.now_cost)}`,
        accentColor: getClubColor(change.team_name),
        flow: change.direction,
        value: change.direction === 'rise' ? '+0.1m' : '−0.1m',
        probability: Math.round(change.probability * 100),
        position: positionLabel,
      };
    });
  }, [prices]);

  const visibleRows = useMemo(() => {
    return rows.filter((r) => {
      if (filter === 'All') return true;
      if (filter === 'Risers') return r.flow === 'rise';
      if (filter === 'Fallers') return r.flow === 'fall';
      return r.position === filter;
    });
  }, [rows, filter]);

  const showFallback = isError || !prices;
  const fallbackRows = !isLoading && showFallback ? DEMO_BIG_PRICE_ROWS : null;

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

      {!isLoading && fallbackRows ? (
        <Card>
          {fallbackRows.map((row, i) => (
            <PriceRow
              key={`demo-${row.name}`}
              index={i + 1}
              name={row.name}
              club={row.club}
              flow={row.flow}
              value={row.value}
              probability={row.probability}
              accentColor={getClubColor(row.club.split(' · ')[1])}
              last={i === fallbackRows.length - 1}
            />
          ))}
        </Card>
      ) : null}

      {!isLoading && !fallbackRows ? (
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
                probability={row.probability}
                accentColor={row.accentColor}
                last={i === visibleRows.length - 1}
              />
            ))
          )}
        </Card>
      ) : null}

      <FNote>{t('prices.disclaimer')}</FNote>
    </PageShell>
  );
}
