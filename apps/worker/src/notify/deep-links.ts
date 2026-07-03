import type { NotificationEvent } from '@simplyfpl/types';

const BASE_URL = 'https://simplyfpl.com';

export function buildDeepLink(event: NotificationEvent, params?: Record<string, string>): string {
  switch (event) {
    case 'deadline_reminder':
      return `${BASE_URL}/`;
    case 'captain_scored':
      return params?.['entryId']
        ? `${BASE_URL}/live/team/${params['entryId']}`
        : `${BASE_URL}/live`;
    case 'bonus_confirmed':
      return `${BASE_URL}/live`;
    case 'price_drop':
      return params?.['playerId']
        ? `${BASE_URL}/prices?focus=${params['playerId']}`
        : `${BASE_URL}/prices`;
    case 'rank_swing':
      return params?.['entryId']
        ? `${BASE_URL}/live/team/${params['entryId']}`
        : `${BASE_URL}/live`;
    case 'goal_scored':
    case 'assist':
    case 'red_card':
      return params?.['entryId']
        ? `${BASE_URL}/live/team/${params['entryId']}`
        : `${BASE_URL}/live`;
  }
}
