-- Lock down profiles entitlement columns
--
-- The owner UPDATE policy on public.profiles (0001_init.sql) only checked the
-- row owner, so an authenticated user (anon key) could write ANY column on
-- their own row -- including the paid-entitlement columns (tier, is_pro,
-- pro_until) and the Stripe linkage columns -- and grant themselves Pro or
-- Ultimate without paying. Server-side tier gates read these columns, so the
-- column itself must be the trust boundary.
--
-- Entitlement and Stripe columns are now writable only by the service-role
-- client (the Stripe webhook), which bypasses RLS and column privileges.
-- Authenticated users may update only fpl_entry_id (the one field the app
-- writes via the anon key, in packages/features/src/auth/use-auth.tsx).

-- Remove blanket UPDATE and re-grant only the user-editable column.
revoke update on public.profiles from authenticated;
revoke update on public.profiles from anon;

grant update (fpl_entry_id) on public.profiles to authenticated;

-- Add a WITH CHECK so a user cannot re-point their row's ownership (id) to
-- another user while updating.
drop policy if exists "profiles are updatable by owner" on public.profiles;

create policy "profiles are updatable by owner"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
