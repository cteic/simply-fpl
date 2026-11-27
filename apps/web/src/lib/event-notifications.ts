import type { LiveSquadEvent } from '@simplyfpl/types';

export type AlertPermission = 'granted' | 'denied' | 'default' | 'unsupported';

export interface EventNotification {
  title: string;
  body: string;
  tag: string;
}

/**
 * A browser notification is only worth raising when the manager cannot see the
 * in-page alert: the tab is hidden and they have said yes.
 */
export function shouldNotify(permission: AlertPermission, tabHidden: boolean): boolean {
  return permission === 'granted' && tabHidden;
}

/** Offer the opt-in once something has happened and the question is still open. */
export function shouldOfferAlerts(permission: AlertPermission, dismissed: boolean): boolean {
  return permission === 'default' && !dismissed;
}

export function buildEventNotification(
  event: LiveSquadEvent,
  kindLabel: string,
  detail: string | undefined
): EventNotification {
  const sign = event.pointsDelta > 0 ? '+' : '\u2212';
  const points = event.pointsDelta === 0 ? null : `${sign}${Math.abs(event.pointsDelta)} pts`;
  const body = [points, detail].filter((part) => part !== null && part !== undefined).join(', ');
  return { title: `${kindLabel}: ${event.playerName}`, body, tag: event.id };
}

export function readAlertPermission(): AlertPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}
