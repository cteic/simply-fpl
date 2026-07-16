import webpush from 'web-push';

import type { NotificationEvent, PushPayload, PushSubscriptionRow } from '@simplyfpl/types';

import type { Env } from '../index';

export interface DispatchOptions {
  event: NotificationEvent;
  userIds?: string[];
  payload: Omit<PushPayload, 'v' | 'id'>;
}

export interface DispatchResult {
  sent: number;
  failed: number;
}

interface SupabasePrefRow {
  user_id: string;
  quiet_hours_start: number | null;
  quiet_hours_end: number | null;
}

interface SupabaseLogInsert {
  user_id: string;
  event: string;
  payload: unknown;
  sent_at: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function serviceRoleHeaders(serviceRole: string): Record<string, string> {
  return {
    apikey: serviceRole,
    Authorization: `Bearer ${serviceRole}`,
    'Content-Type': 'application/json',
  };
}

function eventToPrefField(event: NotificationEvent): string {
  switch (event) {
    case 'deadline_reminder':
      return 'deadline_reminder';
    case 'captain_scored':
      return 'captain_scored';
    case 'bonus_confirmed':
      return 'bonus_confirmed';
    case 'price_drop':
      return 'price_drop';
    case 'rank_swing':
      return 'rank_swing';
    case 'goal_scored':
      return 'goal_scored';
    case 'assist':
      return 'assist';
    case 'red_card':
      return 'red_card';
  }
}

function isInQuietHours(utcHour: number, start: number | null, end: number | null): boolean {
  if (start === null || end === null) return false;
  if (start <= end) return utcHour >= start && utcHour < end;
  return utcHour >= start || utcHour < end;
}

async function fetchTargetSubscriptions(
  env: Env,
  event: NotificationEvent,
  userIds?: string[],
  nowUtcHour?: number
): Promise<PushSubscriptionRow[]> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE) return [];

  const headers = serviceRoleHeaders(env.SUPABASE_SERVICE_ROLE);
  const prefField = eventToPrefField(event);

  let prefsUrl = `${env.SUPABASE_URL}/rest/v1/notification_prefs?select=user_id,quiet_hours_start,quiet_hours_end&${prefField}=eq.true`;
  if (userIds && userIds.length > 0) {
    if (!userIds.every(isValidUuid)) return [];
    const encoded = userIds.map(encodeURIComponent).join(',');
    prefsUrl += `&user_id=in.(${encoded})`;
  }

  const prefsRes = await fetch(prefsUrl, { headers });
  if (!prefsRes.ok) return [];

  const prefs: SupabasePrefRow[] = await prefsRes.json();
  if (prefs.length === 0) return [];

  const hour = nowUtcHour ?? new Date().getUTCHours();
  const activePrefs = prefs.filter(
    (p) => !isInQuietHours(hour, p.quiet_hours_start, p.quiet_hours_end)
  );
  if (activePrefs.length === 0) return [];

  const targetIds = activePrefs.map((p) => p.user_id).join(',');
  const subsRes = await fetch(
    `${env.SUPABASE_URL}/rest/v1/push_subscriptions?select=id,user_id,endpoint,p256dh,auth_key&platform=eq.web&user_id=in.(${targetIds})`,
    { headers }
  );
  if (!subsRes.ok) return [];

  return subsRes.json();
}

async function insertLogBatch(env: Env, entries: SupabaseLogInsert[]): Promise<void> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE || entries.length === 0) return;

  await fetch(`${env.SUPABASE_URL}/rest/v1/notification_log`, {
    method: 'POST',
    headers: {
      ...serviceRoleHeaders(env.SUPABASE_SERVICE_ROLE),
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(entries),
  }).catch(() => undefined);
}

async function deleteSubscription(env: Env, subId: string): Promise<void> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE) return;

  await fetch(`${env.SUPABASE_URL}/rest/v1/push_subscriptions?id=eq.${subId}`, {
    method: 'DELETE',
    headers: serviceRoleHeaders(env.SUPABASE_SERVICE_ROLE),
  }).catch(() => undefined);
}

export async function dispatchNotification(
  env: Env,
  options: DispatchOptions
): Promise<DispatchResult> {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    console.warn('notify/dispatch: VAPID keys not configured, skipping');
    return { sent: 0, failed: 0 };
  }

  const subscriptions = await fetchTargetSubscriptions(env, options.event, options.userIds);
  if (subscriptions.length === 0) return { sent: 0, failed: 0 };

  webpush.setVapidDetails(
    env.VAPID_SUBJECT ?? 'mailto:pete@cteic.ie',
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY
  );

  let sent = 0;
  let failed = 0;
  const logEntries: SupabaseLogInsert[] = [];
  const now = new Date().toISOString();

  for (const sub of subscriptions) {
    const notificationId = crypto.randomUUID();
    const payload: PushPayload = {
      v: 1,
      type: options.event,
      title: options.payload.title,
      body: options.payload.body,
      url: options.payload.url,
      id: notificationId,
      ...(options.payload.tag !== undefined ? { tag: options.payload.tag } : {}),
    };

    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        JSON.stringify(payload),
        { TTL: 86400 }
      );

      logEntries.push({
        user_id: sub.user_id,
        event: options.event,
        payload,
        sent_at: now,
      });
      sent++;
    } catch (err: unknown) {
      failed++;
      const statusCode =
        err && typeof err === 'object' && 'statusCode' in err
          ? (err as { statusCode: number }).statusCode
          : null;
      if (statusCode === 410) {
        await deleteSubscription(env, sub.id);
      }
    }
  }

  await insertLogBatch(env, logEntries);

  return { sent, failed };
}
