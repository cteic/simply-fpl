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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string): boolean {
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
  }
}

async function fetchTargetSubscriptions(
  env: Env,
  event: NotificationEvent,
  userIds?: string[]
): Promise<PushSubscriptionRow[]> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE) return [];

  const headers = serviceRoleHeaders(env.SUPABASE_SERVICE_ROLE);
  const prefField = eventToPrefField(event);

  let prefsUrl = `${env.SUPABASE_URL}/rest/v1/notification_prefs?select=user_id&${prefField}=eq.true`;
  if (userIds && userIds.length > 0) {
    if (!userIds.every(isValidUuid)) return [];
    const encoded = userIds.map(encodeURIComponent).join(',');
    prefsUrl += `&user_id=in.(${encoded})`;
  }

  const prefsRes = await fetch(prefsUrl, { headers });
  if (!prefsRes.ok) return [];

  const prefs: Array<{ user_id: string }> = await prefsRes.json();
  if (prefs.length === 0) return [];

  const targetIds = prefs.map((p) => p.user_id).join(',');
  const subsRes = await fetch(
    `${env.SUPABASE_URL}/rest/v1/push_subscriptions?select=id,user_id,endpoint,p256dh,auth_key&platform=eq.web&user_id=in.(${targetIds})`,
    { headers }
  );
  if (!subsRes.ok) return [];

  return subsRes.json();
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
    return { sent: 0, failed: 0 };
  }

  const subscriptions = await fetchTargetSubscriptions(env, options.event, options.userIds);
  if (subscriptions.length === 0) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;

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
      const webpushRes = await fetch(sub.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          TTL: '86400',
        },
        body: JSON.stringify(payload),
      });

      if (webpushRes.status === 410) {
        await deleteSubscription(env, sub.id);
        failed++;
      } else if (webpushRes.ok || webpushRes.status === 201) {
        sent++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return { sent, failed };
}
