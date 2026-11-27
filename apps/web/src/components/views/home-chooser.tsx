'use client';

import { Suspense, useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { DashboardView } from '@/components/dashboard/dashboard-view';
import { readSavedEntryId, setSavedEntryId } from '@/lib/saved-entry-id';

import { HeroPreSaveView } from './hero-presave-view';
import { resolveHomeChoice, type HomeChoice } from './home-choice';
import { HomeSearchParamsWatcher, type HomeSearchParams } from './home-search-params';
import { clearSavedEntryHint } from './saved-entry-hint';

export function HomeChooser() {
  const router = useRouter();
  const [params, setParams] = useState<HomeSearchParams | null>(null);
  // The server has no saved team, so it renders the hero. A returning visitor
  // keeps it hidden through the saved-entry hint until the effect below swaps
  // in the dashboard.
  const [choice, setChoice] = useState<HomeChoice>('search');

  useEffect(() => {
    if (!params) return;
    const savedId = readSavedEntryId();

    const result = resolveHomeChoice({
      clear: params.clear,
      forceForm: params.forceForm,
      savedId,
    });
    if (result.clearStorage) {
      setSavedEntryId(null);
      router.replace('/');
    }
    if (result.choice === 'search') clearSavedEntryHint();
    setChoice(result.choice);
  }, [params, router]);

  function handleSearchSubmit(id: number): void {
    setChoice({ entryId: id });
    if (params?.forceForm) router.replace('/');
  }

  return (
    <>
      <Suspense fallback={null}>
        <HomeSearchParamsWatcher onChange={setParams} />
      </Suspense>
      {choice === 'search' ? (
        <HeroPreSaveView onSave={handleSearchSubmit} />
      ) : (
        <DashboardView entryId={choice.entryId} />
      )}
    </>
  );
}
