'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { auth } from '@simplyfpl/features';
import { t } from '@simplyfpl/i18n';
import {
  Button,
  Card,
  FNote,
  FilterButton,
  PageHeader,
  PageShell,
  SectionHeader,
  SkeletonLeagueTable,
  Text,
  XStack,
  YStack,
} from '@simplyfpl/ui';

import { FEATURE_AUTH } from '@/lib/feature-flags';
import { useEntry } from '@/queries/fpl';

import { TrackedLeagueCard } from './tracked-league-card';

const { useAuth } = auth;

const STORAGE_KEY = 'simplyfpl:lastEntryId';
const MAX_CLASSIC_LEAGUES = 5;

export function LeaguesShowcase() {
  const { session, isLoading: isAuthLoading } = useAuth();
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

  if (isAuthLoading || !hydrated) {
    return (
      <PageShell>
        <PageHeader title={t('leagues.title')} meta={t('common.loading')} />
        <SkeletonLeagueTable />
      </PageShell>
    );
  }

  if (entryId === null) {
    return <NoTeamView signedIn={session !== null} />;
  }

  return <EntryLeaguesView entryId={entryId} signedIn={session !== null} />;
}

function EntryLeaguesView({ entryId, signedIn }: { entryId: number; signedIn: boolean }) {
  const { data: entry, isLoading, isError } = useEntry(entryId);
  const [activeLeagueId, setActiveLeagueId] = useState<number | null>(null);

  const classicLeagues = (entry?.leagues?.classic ?? [])
    .filter((l) => l.league_type !== 's')
    .slice(0, MAX_CLASSIC_LEAGUES);

  const activeId = activeLeagueId ?? classicLeagues[0]?.id ?? null;

  return (
    <PageShell>
      <PageHeader
        tone="stadium"
        title={t('leagues.title')}
        meta={
          entry ? `Team ${entryId} · ${entry.name}` : t('leagues.meta_loading_team', { entryId })
        }
      />

      <LeagueTabsBody
        isLoading={isLoading}
        isError={isError}
        leagues={classicLeagues}
        activeId={activeId}
        onSelect={setActiveLeagueId}
        myEntryId={entryId}
      />

      {FEATURE_AUTH && !signedIn ? (
        <Card paddingHorizontal={20} paddingVertical={16} marginTop={20}>
          <Text fontFamily="$body" fontSize={12} color="$colorSubtle">
            {t('leagues.sign_in_note')}
          </Text>
          <XStack marginTop={8}>
            <Button
              tone="ghost"
              size="sm"
              onPress={() => {
                window.location.href = '/login';
              }}
            >
              {t('nav.sign_in')}
            </Button>
          </XStack>
        </Card>
      ) : null}

      <FNote>{t('common.disclaimer')}</FNote>
    </PageShell>
  );
}

function NoTeamView({ signedIn }: { signedIn: boolean }) {
  return (
    <PageShell>
      <PageHeader title={t('leagues.title')} meta={t('leagues.meta_no_team')} />

      <Card paddingHorizontal={24} paddingVertical={24} marginBottom={20}>
        <SectionHeader title={t('leagues.section_link_team')} />
        <YStack gap={10} marginTop={4}>
          <Text fontFamily="$body" fontSize={13} color="$colorMuted">
            {t('leagues.link_body')}
          </Text>
          <XStack gap={10}>
            <Button
              tone="primary"
              size="md"
              onPress={() => {
                window.location.href = '/';
              }}
            >
              {t('common.cta_enter_team_id')}
            </Button>
            {FEATURE_AUTH && !signedIn ? (
              <Button
                tone="ghost"
                size="md"
                onPress={() => {
                  window.location.href = '/login';
                }}
              >
                {t('nav.sign_in')}
              </Button>
            ) : null}
          </XStack>
        </YStack>
      </Card>

      <FNote>{t('common.disclaimer')}</FNote>
    </PageShell>
  );
}

interface LeagueTab {
  id: number;
  name: string;
}

interface LeagueTabsBodyProps {
  isLoading: boolean;
  isError: boolean;
  leagues: LeagueTab[];
  activeId: number | null;
  onSelect: (leagueId: number) => void;
  myEntryId: number;
}

function LeagueTabsBody({
  isLoading,
  isError,
  leagues,
  activeId,
  onSelect,
  myEntryId,
}: LeagueTabsBodyProps) {
  const router = useRouter();

  if (isLoading) {
    return <SkeletonLeagueTable />;
  }

  if (isError) {
    return (
      <Card paddingHorizontal={16} paddingVertical={13}>
        <Text fontFamily="$body" fontSize={13} color="$danger">
          {t('leagues.error_load_team')}
        </Text>
      </Card>
    );
  }

  if (leagues.length === 0) {
    return (
      <Card paddingHorizontal={16} paddingVertical={13}>
        <Text fontFamily="$body" fontSize={13} color="$colorMuted">
          {t('leagues.empty_leagues')}
        </Text>
      </Card>
    );
  }

  return (
    <YStack gap={14}>
      <XStack
        gap={6}
        flexWrap="wrap"
        alignItems="center"
        role="group"
        aria-label={t('leagues.aria_mini_leagues')}
        backgroundColor="$surface"
        borderWidth={1}
        borderColor="$border"
        borderRadius="$7"
        paddingHorizontal={6}
        paddingVertical={6}
      >
        {leagues.map((league) => (
          <FilterButton
            key={league.id}
            active={league.id === activeId}
            onPress={() => onSelect(league.id)}
          >
            {league.name}
          </FilterButton>
        ))}
      </XStack>
      {activeId !== null ? (
        <YStack gap={12}>
          <XStack justifyContent="flex-end">
            <Button tone="primary" size="sm" onPress={() => router.push(`/rivals/${activeId}`)}>
              {t('leagues.cta_view_rivals')}
            </Button>
          </XStack>
          <TrackedLeagueCard key={activeId} leagueId={activeId} myEntryId={myEntryId} />
        </YStack>
      ) : null}
    </YStack>
  );
}
