export type NotificationEvent =
  | 'deadline_reminder'
  | 'captain_scored'
  | 'bonus_confirmed'
  | 'price_drop'
  | 'rank_swing';

export interface PushPayload {
  v: 1;
  type: NotificationEvent;
  title: string;
  body: string;
  url: string;
  tag?: string;
  id: string;
}

export interface NotificationPrefsRow {
  user_id: string;
  deadline_reminder: boolean;
  captain_scored: boolean;
  bonus_confirmed: boolean;
  price_drop: boolean;
  rank_swing: boolean;
  rank_swing_threshold: number;
  updated_at: string;
}

export interface PushSubscriptionRow {
  id: string;
  user_id: string;
  platform: 'web';
  endpoint: string;
  p256dh: string;
  auth_key: string;
  created_at: string;
  last_used_at: string | null;
  last_error: string | null;
}
