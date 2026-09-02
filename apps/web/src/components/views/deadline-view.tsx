'use client';

import { useMemo } from 'react';

import { liveRank } from '@simplyfpl/features';
import { buildDeadlineBrief, getCurrentGameweek, getNextDeadline } from '@simplyfpl/fpl-client';
import type { DeadlineBrief } from '@simplyfpl/fpl-client';
import { useTranslation } from '@simplyfpl/i18n';
import {
  Card,
  FNote,
  PageHeader,
  PageShell,
  ScoutEventRow,
  SectionHeader,
  Text,
  XStack,
  YStack,
} from '@simplyfpl/ui';

import { useSavedEntryId } from '@/lib/saved-entry-id';
import { useBootstrap, useEntryPicks } from '@/queries/fpl';

import { buildScoutRows } from './scout-rows';

const { useCountdown } = liveRank;

interface BriefRowProps {
  label: string;
  value: number;
  last?: boolean;
}

function BriefRow({ label, value, last = false }: BriefRowProps) {
  return (
    <XStack
      alignItems="center"
      justifyContent="space-between"
      paddingHorizontal={16}
      paddingVertical={11}
      borderBottomWidth={last ? 0 : 1}
      borderBottomColor="$border"
      borderStyle="solid"
    >
      <Text fontFamily="$body" fontSize={12} color="$colorMuted">
        {label}
      </Text>
      <Text fontFamily="$mono" fontSize={13} fontWeight="500" color="$color">
        {value}
      </Text>
    </XStack>
  );
}

export function DeadlineView() {
  const { t, locale } = useTranslation();
  const entryId = useSavedEntryId();
  const { data: bootstrap } = useBootstrap();
  const nextDeadline = useMemo(() => (bootstrap ? getNextDeadline(bootstrap) : null), [bootstrap]);
  const countdown = useCountdown(nextDeadline?.deadlineTime ?? null);
  const currentGw = useMemo(() => (bootstrap ? getCurrentGameweek(bootstrap) : null), [bootstrap]);
  const { data: picks } = useEntryPicks(entryId ?? 0, entryId === null ? null : currentGw);

  const brief = useMemo<DeadlineBrief | null>(() => {
    if (!bootstrap || !picks) return null;
    return buildDeadlineBrief(bootstrap, new Set(picks.picks.map((p) => p.element)));
  }, [bootstrap, picks]);

  const issueRows = useMemo(
    () => (brief ? buildScoutRows(brief.openIssues, locale) : []),
    [brief, locale]
  );
  const goodRows = useMemo(
    () => (brief ? buildScoutRows(brief.goodNews, locale) : []),
    [brief, locale]
  );

  const gw = nextDeadline?.event ?? null;
  const clock = countdown.isPast ? t('deadline.closed') : (countdown.label ?? '—');
  const title = (
    <Text fontFamily="$mono" fontSize={30} fontWeight="400" letterSpacing={-1} color="#FFFFFF">
      {clock}
    </Text>
  );

  return (
    <PageShell>
      <PageHeader
        tone="stadium"
        title={title}
        meta={gw !== null ? t('deadline.hero_sub', { gw }) : t('deadline.title')}
      />

      {entryId === null ? (
        <Card paddingHorizontal={16} paddingVertical={28} alignItems="center" marginBottom={20}>
          <Text fontFamily="$body" fontSize={12} color="$colorSubtle" textAlign="center">
            {t('scout.link_body')}
          </Text>
        </Card>
      ) : (
        <>
          <SectionHeader
            title={`${t('deadline.issues_title')} · ${t('deadline.open_count', {
              count: issueRows.length,
            })}`}
          />
          <Card marginBottom={20}>
            {issueRows.length === 0 ? (
              <YStack paddingHorizontal={16} paddingVertical={28} alignItems="center">
                <Text fontFamily="$body" fontSize={12} color="$colorSubtle" textAlign="center">
                  {t('deadline.issues_empty')}
                </Text>
              </YStack>
            ) : (
              issueRows.map((row, i) => (
                <ScoutEventRow
                  key={row.id}
                  tone={row.tone}
                  chipLabel={row.chipLabel}
                  title={row.title}
                  meta={row.meta}
                  last={i === issueRows.length - 1}
                />
              ))
            )}
          </Card>

          {goodRows.length > 0 ? (
            <>
              <SectionHeader title={t('deadline.good_title')} />
              <Card marginBottom={20}>
                {goodRows.map((row, i) => (
                  <ScoutEventRow
                    key={row.id}
                    tone={row.tone}
                    chipLabel={row.chipLabel}
                    title={row.title}
                    meta={row.meta}
                    last={i === goodRows.length - 1}
                  />
                ))}
              </Card>
            </>
          ) : null}

          <SectionHeader title={t('deadline.brief_title')} />
          <Card marginBottom={20}>
            <BriefRow label={t('deadline.brief_rises')} value={brief?.risesTonight ?? 0} />
            <BriefRow label={t('deadline.brief_falls')} value={brief?.fallsTonight ?? 0} />
            <BriefRow
              label={t('deadline.brief_falls_you_own')}
              value={brief?.openIssues.filter((e) => e.kind === 'price_fall').length ?? 0}
            />
            <BriefRow
              label={t('deadline.brief_rises_you_own')}
              value={brief?.goodNews.length ?? 0}
              last
            />
          </Card>
        </>
      )}

      <FNote>{t('deadline.fnote')}</FNote>
    </PageShell>
  );
}
