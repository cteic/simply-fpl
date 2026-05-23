'use client';

import { useEffect, useState } from 'react';

import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';

import { DashboardView } from '@/components/dashboard/dashboard-view';

import { type HomeChoice, resolveHomeChoice } from './home-choice';

const HeroPreSaveView = dynamic(
  () => import('./hero-presave-view').then((m) => m.HeroPreSaveView),
  { ssr: false }
);

const STORAGE_KEY = 'simplyfpl:lastEntryId';

type Choice = 'pending' | HomeChoice;

export function HomeChooser() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const forceForm = searchParams?.get('change') === '1';
  const clearTeam = searchParams?.get('clear') === '1';
  const [choice, setChoice] = useState<Choice>('pending');

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const id = saved ? Number(saved) : NaN;
    const savedId = Number.isInteger(id) && id > 0 ? id : null;

    const result = resolveHomeChoice({ clear: clearTeam, forceForm, savedId });
    if (result.clearStorage) {
      window.localStorage.removeItem(STORAGE_KEY);
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
