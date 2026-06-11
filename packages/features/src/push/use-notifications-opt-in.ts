import { useCallback, useEffect, useState } from 'react';

export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export interface NotificationPrefs {
  deadlineReminder: boolean;
  captainScored: boolean;
}

export interface UseNotificationsOptInOptions {
  vapidPublicKey: string;
  apiBase?: string;
}

export interface UseNotificationsOptInReturn {
  permission: NotificationPermissionState;
  isSubscribed: boolean;
  isLoading: boolean;
  prefs: NotificationPrefs;
  error: string | null;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
  updatePrefs: (updates: Partial<NotificationPrefs>) => Promise<void>;
}

const DEFAULT_PREFS: NotificationPrefs = { deadlineReminder: true, captainScored: true };

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

function isSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function useNotificationsOptIn({
  vapidPublicKey,
  apiBase = '',
}: UseNotificationsOptInOptions): UseNotificationsOptInReturn {
  const [permission, setPermission] = useState<NotificationPermissionState>('unsupported');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupported()) {
      setPermission('unsupported');
      setIsLoading(false);
      return;
    }

    setPermission(Notification.permission as NotificationPermissionState);

    void navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((sub) => {
        setIsSubscribed(sub !== null);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!isSupported()) return;

    void fetch(`${apiBase}/api/notifications/prefs`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: unknown) => {
        if (!data || typeof data !== 'object') return;
        const d = data as Record<string, unknown>;
        setPrefs({
          deadlineReminder:
            typeof d['deadline_reminder'] === 'boolean' ? d['deadline_reminder'] : true,
          captainScored: typeof d['captain_scored'] === 'boolean' ? d['captain_scored'] : true,
        });
      })
      .catch(() => undefined);
  }, [apiBase]);

  const subscribe = useCallback(async () => {
    if (!isSupported()) return;
    setIsLoading(true);
    setError(null);

    try {
      const result = await Notification.requestPermission();
      setPermission(result as NotificationPermissionState);
      if (result !== 'granted') return;

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const json = subscription.toJSON();
      const res = await fetch(`${apiBase}/api/notifications/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: json.endpoint,
          p256dh: json.keys?.['p256dh'],
          auth: json.keys?.['auth'],
        }),
      });

      if (!res.ok) throw new Error('Failed to register subscription');
      setIsSubscribed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enable notifications');
    } finally {
      setIsLoading(false);
    }
  }, [vapidPublicKey, apiBase]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported()) return;
    setIsLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await fetch(`${apiBase}/api/notifications/subscribe`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint }),
        });
      }
      setIsSubscribed(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable notifications');
    } finally {
      setIsLoading(false);
    }
  }, [apiBase]);

  const updatePrefs = useCallback(
    async (updates: Partial<NotificationPrefs>) => {
      setPrefs((prev) => ({ ...prev, ...updates }));
      await fetch(`${apiBase}/api/notifications/prefs`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(typeof updates.deadlineReminder === 'boolean'
            ? { deadline_reminder: updates.deadlineReminder }
            : {}),
          ...(typeof updates.captainScored === 'boolean'
            ? { captain_scored: updates.captainScored }
            : {}),
        }),
      }).catch(() => undefined);
    },
    [apiBase]
  );

  return { permission, isSubscribed, isLoading, prefs, error, subscribe, unsubscribe, updatePrefs };
}
