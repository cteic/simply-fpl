import type { Env } from '../index';
import { buildDeepLink } from './deep-links';
import { dispatchNotification } from './dispatch';

export async function runDeadlineReminder(env: Env): Promise<void> {
  await dispatchNotification(env, {
    event: 'deadline_reminder',
    payload: {
      type: 'deadline_reminder',
      title: 'FPL deadline in 30 minutes',
      body: 'Make your transfers now before the gameweek locks.',
      url: buildDeepLink('deadline_reminder'),
      tag: 'deadline',
    },
  });
}
