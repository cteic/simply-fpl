'use client';

import { useMemo } from 'react';

import { deriveScoutEvents, getCurrentGameweek } from '@simplyfpl/fpl-client';
import { useTranslation } from '@simplyfpl/i18n';
import {
  Card,
  FNote,
  PageHeader,
  PageShell,
  ScoutEventRow,
  SectionHeader,
  Text,
  YStack,
} from '@simplyfpl/ui';

import { useSavedEntryId } from '@/lib/saved-entry-id';
import { useBootstrap, useEntryPicks } from '@/queries/fpl';

import type { ScoutRowModel } from './scout-rows';
import { buildScoutRows } from './scout-rows';

export function ScoutView() {
  const { t, locale } = useTranslation();
  const entryId = useSavedEntryId();
  const { data: bootstrap, isLoading: bootstrapLoading } = useBootstrap();
  const currentGw = useMemo(() => (bootstrap ? getCurrentGameweek(bootstrap) : null), [bootstrap]);
  const { data: picks, isLoading: picksLoading } = useEntryPicks(
    entryId ?? 0,
    entryId === null ? null : currentGw
  );

  const rows = useMemo<ScoutRowModel[]>(() => {
    if (!bootstrap || !picks) return [];
    const pickIds = new Set(picks.picks.map((p) => p.element));
    return buildScoutRows(deriveScoutEvents(bootstrap, pickIds), locale);
  }, [bootstrap, picks, locale]);

  const meta =
    entryId !== null && currentGw !== null
      ? t('scout.meta', { gw: currentGw })
      : t('scout.meta_no_team');
  const isLoading = bootstrapLoading || (entryId !== null && picksLoading);

  return (
    <PageShell>
      <PageHeader title={t('scout.title')} meta={meta} />

      {entryId === null ? (
        <Card paddingHorizontal={16} paddingVertical={28} alignItems="center" marginBottom={20}>
          <Text fontFamily="$body" fontSize={12} color="$colorSubtle" textAlign="center">
            {t('scout.link_body')}
          </Text>
        </Card>
      ) : (
        <>
          <SectionHeader title={t('scout.section_inbox')} />
          <Card marginBottom={20}>
            {isLoading ? (
              <YStack paddingHorizontal={16} paddingVertical={28} alignItems="center">
                <Text fontFamily="$body" fontSize={12} color="$colorSubtle">
                  {t('common.loading')}
                </Text>
              </YStack>
            ) : null}
            {!isLoading && rows.length === 0 ? (
              <YStack paddingHorizontal={16} paddingVertical={28} alignItems="center">
                <Text
                  fontFamily="$body"
                  fontSize={12}
                  color="$colorSubtle"
                  textAlign="center"
                  maxWidth={420}
                >
                  {t('scout.empty')}
                </Text>
              </YStack>
            ) : null}
            {!isLoading
              ? rows.map((row, i) => (
                  <ScoutEventRow
                    key={row.id}
                    tone={row.tone}
                    chipLabel={row.chipLabel}
                    title={row.title}
                    meta={row.meta}
                    last={i === rows.length - 1}
                  />
                ))
              : null}
          </Card>
        </>
      )}

      <FNote>{t('scout.fnote')}</FNote>
    </PageShell>
  );
}
