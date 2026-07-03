'use client';

import { useEffect } from 'react';

import { auth, push } from '@simplyfpl/features';

import { FEATURE_WEB_PUSH, VAPID_PUBLIC_KEY } from '@/lib/feature-flags';

const { useAuth } = auth;
const { useServiceWorker } = push;

export function ServiceWorkerInitializer() {
  const { isPro } = useAuth();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  }, []);

  useServiceWorker(FEATURE_WEB_PUSH && isPro ? VAPID_PUBLIC_KEY : undefined);

  return null;
}
