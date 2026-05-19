'use client';

import { useEffect, useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { DashboardView } from '@/components/dashboard/dashboard-view';
import { FEATURE_HOME_UNIFIED } from '@/lib/feature-flags';

import { HomeSearchView } from './home-search-view';
import { LiveRankRealView } from './live-rank-real-view';

const STORAGE_KEY = 'simplyfpl:lastEntryId';

type Choice = 'pending' | 'search' | { entryId: number };

export function HomeChooser() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const forceForm = searchParams?.get('change') === '1';
  const unifiedOverride = searchParams?.get('unified') === '1';
  const useUnified = FEATURE_HOME_UNIFIED || unifiedOverride;
  const [choice, setChoice] = useState<Choice>('pending');

  useEffect(() => {
    if (forceForm) {
      setChoice('search');
      return;
    }
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const id = saved ? Number(saved) : NaN;
    if (Number.isInteger(id) && id > 0) {
      setChoice({ entryId: id });
    } else {
      setChoice('search');
    }
  }, [forceForm]);

  function handleSearchSubmit(id: number): void {
    setChoice({ entryId: id });
    if (forceForm) router.replace('/');
  }

  if (choice === 'pending') return null;
  if (choice === 'search') return <HomeSearchView onSave={handleSearchSubmit} />;
  if (useUnified) return <DashboardView entryId={choice.entryId} />;
  return <LiveRankRealView entryId={choice.entryId} />;
}
