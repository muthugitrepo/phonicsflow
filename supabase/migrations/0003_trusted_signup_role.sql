-- =============================================================================
-- Migration 0003 — stop trusting the client for the sign-up role
--
-- SECURITY FIX. The previous trigger read the new user's role from
-- raw_user_meta_data, which is supplied by whoever calls /auth/v1/signup:
--
--   supabase.auth.signUp({ email, password,
--                          options: { data: { role: 'team_head' } } })
--
-- That let anyone with the public anon key create themselves as Head and read
-- every student in the academy. The role is now decided server-side and the
-- metadata is used only for the display name.
--
-- Bootstrapping: the very first account becomes the Head, so a new install
-- needs no manual SQL. Every later account starts as a trainer and is promoted
-- by the Head, whose role changes are already guarded by guard_user_role().
--
-- Safe to re-run.
-- =============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_role user_role;
begin
  -- First account in an empty install bootstraps as the Head.
  if not exists (select 1 from public.users) then
    assigned_role := 'team_head';
  else
    assigned_role := 'trainer';
  end if;

  insert into public.users (id, email, full_name, role)
  values (
    new.id,
    new.email,
    -- Display name only. Carries no privilege, so client-supplied is fine.
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      split_part(new.email, '@', 1)
    ),
    assigned_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
