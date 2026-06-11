import { useEffect } from 'react';

export function useServiceWorker(vapidPublicKey: string | undefined): void {
  useEffect(() => {
    if (!vapidPublicKey) return;
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  }, [vapidPublicKey]);
}
