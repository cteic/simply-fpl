'use client';

import { useCallback, useEffect, useState } from 'react';

import { readAlertPermission, shouldNotify, shouldOfferAlerts } from '@/lib/event-notifications';
import type { AlertPermission, EventNotification } from '@/lib/event-notifications';

const DISMISSED_KEY = 'simplyfpl.event-alerts.dismissed';

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

export interface BackgroundEventAlerts {
  /** True once an event has fired and the manager has not yet answered. */
  offer: boolean;
  enable: () => void;
  dismiss: () => void;
  notify: (notifications: EventNotification[]) => void;
}

/**
 * Browser notifications for squad events while the tab is in the background.
 * The live feed arrives over a WebSocket, which keeps delivering to a hidden
 * tab, so a goal can reach the manager while they are in another window. The
 * tab has to stay open: nothing here reaches a closed browser.
 */
export function useBackgroundEventAlerts(): BackgroundEventAlerts {
  const [permission, setPermission] = useState<AlertPermission>('unsupported');
  const [dismissed, setDismissed] = useState(true);
  const [seenEvent, setSeenEvent] = useState(false);

  useEffect(() => {
    setPermission(readAlertPermission());
    setDismissed(readDismissed());
  }, []);

  const notify = useCallback((notifications: EventNotification[]) => {
    if (notifications.length === 0) return;
    setSeenEvent(true);
    if (!shouldNotify(readAlertPermission(), document.hidden)) return;
    for (const item of notifications) {
      new Notification(item.title, { body: item.body, tag: item.tag });
    }
  }, []);

  const enable = useCallback(() => {
    if (readAlertPermission() === 'unsupported') return;
    void Notification.requestPermission().then((result) => setPermission(result));
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // Storage can be blocked. The prompt then returns next session, which is harmless.
    }
  }, []);

  return { offer: seenEvent && shouldOfferAlerts(permission, dismissed), enable, dismiss, notify };
}
