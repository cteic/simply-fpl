-- SimplyFPL initial schema
-- Tables: profiles, user_leagues
-- Auth: magic-link only (configured in Supabase dashboard)

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  fpl_entry_id integer,
  is_pro boolean not null default false,
  pro_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_leagues (
  user_id uuid not null references auth.users(id) on delete cascade,
  league_id integer not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (user_id, league_id)
);

create index user_leagues_user_id_position_idx
  on public.user_leagues (user_id, position);

alter table public.profiles enable row level security;
alter table public.user_leagues enable row level security;

create policy "profiles are viewable by owner"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles are updatable by owner"
  on public.profiles for update
  using (auth.uid() = id);

create policy "user_leagues readable by owner"
  on public.user_leagues for select
  using (auth.uid() = user_id);

create policy "user_leagues insertable by owner"
  on public.user_leagues for insert
  with check (auth.uid() = user_id);

create policy "user_leagues deletable by owner"
  on public.user_leagues for delete
  using (auth.uid() = user_id);

create policy "user_leagues updatable by owner"
  on public.user_leagues for update
  using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
