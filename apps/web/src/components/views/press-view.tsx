'use client';

import { useMemo, useState } from 'react';

import { useParams } from 'next/navigation';

import { buildLeaguePress, getCurrentGameweek } from '@simplyfpl/fpl-client';
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
import { useBootstrap, useClassicLeague } from '@/queries/fpl';

import { buildPressModel, buildPressShareText } from './press-copy';

export function PressView() {
  const { t, locale } = useTranslation();
  const params = useParams<{ leagueId: string }>();
  const leagueId = Number(params?.leagueId);
  const entryId = useSavedEntryId();
  const [copied, setCopied] = useState(false);

  const { data: bootstrap } = useBootstrap();
  const currentGw = useMemo(() => (bootstrap ? getCurrentGameweek(bootstrap) : null), [bootstrap]);
  const { data: league, isLoading, isError } = useClassicLeague(leagueId);

  const press = useMemo(
    () => (league ? buildLeaguePress(league, entryId) : null),
    [league, entryId]
  );
  const model = useMemo(() => (press ? buildPressModel(press, locale) : null), [press, locale]);

  async function handleCopy() {
    if (!press) return;
    try {
      await navigator.clipboard.writeText(buildPressShareText(press, currentGw, locale));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // clipboard unavailable
    }
  }

  const meta =
    press && currentGw !== null
      ? t('press.meta', { league: press.leagueName, gw: currentGw })
      : t('press.title');

  return (
    <PageShell>
      <PageHeader title={t('press.title')} meta={meta} />

      {isLoading ? (
        <Card paddingHorizontal={16} paddingVertical={28} alignItems="center" marginBottom={20}>
          <Text fontFamily="$body" fontSize={12} color="$colorSubtle">
            {t('common.loading')}
          </Text>
        </Card>
      ) : null}

      {!isLoading && (isError || (league && press === null)) ? (
        <Card paddingHorizontal={16} paddingVertical={28} alignItems="center" marginBottom={20}>
          <Text fontFamily="$body" fontSize={12} color="$colorSubtle" textAlign="center">
            {isError ? t('press.error') : t('press.empty')}
          </Text>
        </Card>
      ) : null}

      {press && model ? (
        <>
          <Card marginBottom={20}>
            <XStack
              alignItems="baseline"
              justifyContent="space-between"
              paddingHorizontal={18}
              paddingVertical={13}
              borderBottomWidth={1}
              borderBottomColor="$border"
              borderStyle="solid"
            >
              <Text
                fontFamily="$mono"
                fontSize={11}
                fontWeight="500"
                letterSpacing={2}
                textTransform="uppercase"
                color="$color"
              >
                {press.leagueName} · {t('press.masthead')}
              </Text>
              {currentGw !== null ? (
                <Text fontFamily="$mono" fontSize={10} color="$colorSubtle">
                  {t('press.issue_no', { gw: currentGw })}
                </Text>
              ) : null}
            </XStack>
            <YStack paddingHorizontal={18} paddingVertical={16} gap={8}>
              <Text
                fontFamily="$body"
                fontSize={20}
                fontWeight="700"
                letterSpacing={-0.5}
                lineHeight={26}
                color="$color"
              >
                {model.headline}
              </Text>
              <Text fontFamily="$body" fontSize={12} color="$colorMuted" lineHeight={19}>
                {model.lede}
              </Text>
              <Text fontFamily="$mono" fontSize={10} color="$colorSubtle">
                {t('press.byline')}
              </Text>
            </YStack>
            {model.stories.map((story, i) => (
              <ScoutEventRow
                key={story.id}
                tone={story.tone}
                chipLabel={story.chipLabel}
                title={story.text}
                last={i === model.stories.length - 1}
              />
            ))}
          </Card>

          <SectionHeader title={t('press.share_title')} />
          <Card marginBottom={20}>
            <YStack paddingHorizontal={16} paddingVertical={14} gap={10}>
              <Text fontFamily="$body" fontSize={12} color="$colorMuted">
                {t('press.share_note')}
              </Text>
              <XStack alignItems="center" gap={10}>
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  style={{
                    fontFamily: 'var(--font-body, sans-serif)',
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '8px 16px',
                    borderRadius: 6,
                    border: 'none',
                    background: copied ? 'var(--positive, #16A34A)' : 'var(--color, #1A1A18)',
                    color: '#FFF',
                    cursor: 'pointer',
                  }}
                >
                  {copied ? t('press.share_copied') : t('press.share_cta')}
                </button>
                {press.complete && press.yourRank !== null ? (
                  <Text fontFamily="$mono" fontSize={11} color="$colorSubtle">
                    {t('press.your_rank', { rank: press.yourRank, count: press.memberCount })}
                  </Text>
                ) : null}
              </XStack>
            </YStack>
          </Card>
        </>
      ) : null}

      <FNote>{t('press.fnote')}</FNote>
    </PageShell>
  );
}
