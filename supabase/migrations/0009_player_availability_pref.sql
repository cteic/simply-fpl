-- Add player availability change notification preference.

alter table public.notification_prefs
  add column if not exists player_availability_changed bool not null default true;
