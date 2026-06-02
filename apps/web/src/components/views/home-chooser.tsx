'use client';

import { useEffect, useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { DashboardView } from '@/components/dashboard/dashboard-view';
import { readSavedEntryId, setSavedEntryId } from '@/lib/saved-entry-id';

import { HeroPreSaveView } from './hero-presave-view';
import { type HomeChoice, resolveHomeChoice } from './home-choice';

type Choice = 'pending' | HomeChoice;

export function HomeChooser() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const forceForm = searchParams?.get('change') === '1';
  const clearTeam = searchParams?.get('clear') === '1';
  const [choice, setChoice] = useState<Choice>('pending');

  useEffect(() => {
    const savedId = readSavedEntryId();

    const result = resolveHomeChoice({ clear: clearTeam, forceForm, savedId });
    if (result.clearStorage) {
      setSavedEntryId(null);
      router.replace('/');
    }
    setChoice(result.choice);
  }, [forceForm, clearTeam, router]);

  function handleSearchSubmit(id: number): void {
    setChoice({ entryId: id });
    if (forceForm) router.replace('/');
  }

  if (choice === 'pending') return null;
  if (choice === 'search') return <HeroPreSaveView onSave={handleSearchSubmit} />;
  return <DashboardView entryId={choice.entryId} />;
}
