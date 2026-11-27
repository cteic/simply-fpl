'use client';

import { useEffect } from 'react';

import { useSearchParams } from 'next/navigation';

export interface HomeSearchParams {
  clear: boolean;
  forceForm: boolean;
}

interface HomeSearchParamsWatcherProps {
  onChange: (params: HomeSearchParams) => void;
}

/**
 * Reads the home query string in its own Suspense boundary. `useSearchParams`
 * makes Next.js skip server rendering up to the nearest boundary, so keeping
 * it here lets the hero next to it render into the static HTML.
 */
export function HomeSearchParamsWatcher({ onChange }: HomeSearchParamsWatcherProps) {
  const searchParams = useSearchParams();
  const forceForm = searchParams?.get('change') === '1';
  const clear = searchParams?.get('clear') === '1';

  useEffect(() => {
    onChange({ clear, forceForm });
  }, [clear, forceForm, onChange]);

  return null;
}
