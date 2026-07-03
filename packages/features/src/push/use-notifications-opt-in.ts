import { useCallback, useEffect, useState } from 'react';

import type { LeagueAlertRule } from '@simplyfpl/types';

export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export interface NotificationPrefs {
  deadlineReminder: boolean;
  captainScored: boolean;
  bonusConfirmed: boolean;
  goalScored: boolean;
  assist: boolean;
  redCard: boolean;
  rankSwing: boolean;
  rankSwingThreshold: number;
  quietHoursStart: number | null;
  quietHoursEnd: number | null;
}

export type { LeagueAlertRule };

export interface UseNotificationsOptInOptions {
  vapidPublicKey: string;
  apiBase?: string;
}

export interface UseNotificationsOptInReturn {
  permission: NotificationPermissionState;
  isSubscribed: boolean;
  isLoading: boolean;
  prefs: NotificationPrefs;
  leagueAlerts: LeagueAlertRule[];
  error: string | null;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
  updatePrefs: (updates: Partial<NotificationPrefs>) => Promise<void>;
  addLeagueAlert: (rule: Omit<LeagueAlertRule, 'leagueName'>) => Promise<void>;
  removeLeagueAlert: (leagueId: number) => Promise<void>;
}

const DEFAULT_PREFS: NotificationPrefs = {
  deadlineReminder: true,
  captainScored: true,
  bonusConfirmed: false,
  goalScored: true,
  assist: true,
  redCard: true,
  rankSwing: false,
  rankSwingThreshold: 5000,
  quietHoursStart: null,
  quietHoursEnd: null,
};

export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i += 1) view[i] = raw.charCodeAt(i);
  return view;
}

function isSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

function parsePrefsResponse(data: Record<string, unknown>): NotificationPrefs {
  return {
    deadlineReminder:
      typeof data['deadline_reminder'] === 'boolean' ? data['deadline_reminder'] : true,
    captainScored: typeof data['captain_scored'] === 'boolean' ? data['captain_scored'] : true,
    bonusConfirmed: typeof data['bonus_confirmed'] === 'boolean' ? data['bonus_confirmed'] : false,
    goalScored: typeof data['goal_scored'] === 'boolean' ? data['goal_scored'] : true,
    assist: typeof data['assist'] === 'boolean' ? data['assist'] : true,
    redCard: typeof data['red_card'] === 'boolean' ? data['red_card'] : true,
    rankSwing: typeof data['rank_swing'] === 'boolean' ? data['rank_swing'] : false,
    rankSwingThreshold:
      typeof data['rank_swing_threshold'] === 'number' ? data['rank_swing_threshold'] : 5000,
    quietHoursStart:
      typeof data['quiet_hours_start'] === 'number' ? data['quiet_hours_start'] : null,
    quietHoursEnd: typeof data['quiet_hours_end'] === 'number' ? data['quiet_hours_end'] : null,
  };
}

function prefsToApiBody(updates: Partial<NotificationPrefs>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (typeof updates.deadlineReminder === 'boolean')
    body['deadline_reminder'] = updates.deadlineReminder;
  if (typeof updates.captainScored === 'boolean') body['captain_scored'] = updates.captainScored;
  if (typeof updates.bonusConfirmed === 'boolean') body['bonus_confirmed'] = updates.bonusConfirmed;
  if (typeof updates.goalScored === 'boolean') body['goal_scored'] = updates.goalScored;
  if (typeof updates.assist === 'boolean') body['assist'] = updates.assist;
  if (typeof updates.redCard === 'boolean') body['red_card'] = updates.redCard;
  if (typeof updates.rankSwing === 'boolean') body['rank_swing'] = updates.rankSwing;
  if (typeof updates.rankSwingThreshold === 'number')
    body['rank_swing_threshold'] = updates.rankSwingThreshold;
  if ('quietHoursStart' in updates) body['quiet_hours_start'] = updates.quietHoursStart ?? null;
  if ('quietHoursEnd' in updates) body['quiet_hours_end'] = updates.quietHoursEnd ?? null;
  return body;
}

export function useNotificationsOptIn({
  vapidPublicKey,
  apiBase = '',
}: UseNotificationsOptInOptions): UseNotificationsOptInReturn {
  const [permission, setPermission] = useState<NotificationPermissionState>('unsupported');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [leagueAlerts, setLeagueAlerts] = useState<LeagueAlertRule[]>([]);
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
        setPrefs(parsePrefsResponse(data as Record<string, unknown>));
      })
      .catch(() => undefined);

    void fetch(`${apiBase}/api/notifications/league-alerts`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: unknown) => {
        if (!Array.isArray(data)) return;
        const rules: LeagueAlertRule[] = (
          data as Array<{
            league_id: number;
            top_n: number | null;
            swing_n: number | null;
          }>
        ).map((row) => ({
          leagueId: row.league_id,
          topN: row.top_n,
          swingN: row.swing_n,
        }));
        setLeagueAlerts(rules);
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
        body: JSON.stringify(prefsToApiBody(updates)),
      }).catch(() => undefined);
    },
    [apiBase]
  );

  const addLeagueAlert = useCallback(
    async (rule: Omit<LeagueAlertRule, 'leagueName'>) => {
      setLeagueAlerts((prev) => {
        const filtered = prev.filter((r) => r.leagueId !== rule.leagueId);
        return [...filtered, rule];
      });
      await fetch(`${apiBase}/api/notifications/league-alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          league_id: rule.leagueId,
          top_n: rule.topN,
          swing_n: rule.swingN,
        }),
      }).catch(() => undefined);
    },
    [apiBase]
  );

  const removeLeagueAlert = useCallback(
    async (leagueId: number) => {
      setLeagueAlerts((prev) => prev.filter((r) => r.leagueId !== leagueId));
      await fetch(`${apiBase}/api/notifications/league-alerts`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ league_id: leagueId }),
      }).catch(() => undefined);
    },
    [apiBase]
  );

  return {
    permission,
    isSubscribed,
    isLoading,
    prefs,
    leagueAlerts,
    error,
    subscribe,
    unsubscribe,
    updatePrefs,
    addLeagueAlert,
    removeLeagueAlert,
  };
}
