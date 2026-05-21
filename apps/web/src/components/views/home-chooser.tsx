'use client';

import { useEffect, useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { DashboardView } from '@/components/dashboard/dashboard-view';

import { HeroPreSaveView } from './hero-presave-view';

const STORAGE_KEY = 'simplyfpl:lastEntryId';

type Choice = 'pending' | 'search' | { entryId: number };

export function HomeChooser() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const forceForm = searchParams?.get('change') === '1';
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
  if (choice === 'search') return <HeroPreSaveView onSave={handleSearchSubmit} />;
  return <DashboardView entryId={choice.entryId} />;
}
