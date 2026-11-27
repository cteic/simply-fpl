-- A daily token budget for Frank that cannot be raced past.
--
-- The /api/frank/ask route used to protect the bill by reading every
-- frank_queries row for the day, summing the tokens and then deciding. Two
-- requests arriving together both read the pre-spend total and both proceed,
-- and the scan grows with the table. That check is the only thing between a
-- bug or a scraper and an unbounded bill, so it has to be a single statement.
--
-- frank_reserve_tokens adds to the day's counter only when the result stays
-- within the cap. The UPDATE takes the row lock, so concurrent callers queue,
-- and each re-evaluates the WHERE clause against the committed total: at most
-- the cap is ever reserved. The route reserves an estimate before calling the
-- model and settles the difference afterwards with frank_settle_tokens.

create table public.frank_daily_budget (
  day date primary key,
  tokens_reserved bigint not null default 0 check (tokens_reserved >= 0)
);

-- No policies: only the service_role client, which bypasses RLS, touches it.
alter table public.frank_daily_budget enable row level security;

create or replace function public.frank_reserve_tokens(p_tokens integer, p_cap bigint)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date := (now() at time zone 'utc')::date;
begin
  if p_tokens is null or p_tokens <= 0 or p_cap is null then
    return false;
  end if;

  insert into public.frank_daily_budget (day, tokens_reserved)
  values (v_day, 0)
  on conflict (day) do nothing;

  update public.frank_daily_budget
     set tokens_reserved = tokens_reserved + p_tokens
   where day = v_day
     and tokens_reserved + p_tokens <= p_cap;

  return found;
end;
$$;

-- Replace a reservation with what was really spent. p_delta is
-- (actual - reserved): negative releases tokens, positive records an overrun.
-- The counter never goes below zero.
create or replace function public.frank_settle_tokens(p_delta integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date := (now() at time zone 'utc')::date;
begin
  if p_delta is null or p_delta = 0 then
    return;
  end if;

  update public.frank_daily_budget
     set tokens_reserved = greatest(0, tokens_reserved + p_delta)
   where day = v_day;
end;
$$;

revoke all on function public.frank_reserve_tokens(integer, bigint) from public, anon, authenticated;
revoke all on function public.frank_settle_tokens(integer) from public, anon, authenticated;
grant execute on function public.frank_reserve_tokens(integer, bigint) to service_role;
grant execute on function public.frank_settle_tokens(integer) to service_role;
