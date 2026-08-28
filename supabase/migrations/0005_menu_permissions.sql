-- =============================================================================
-- Migration 0005 — Head-configurable menus
--
-- Which navigation items each role sees. A missing row means "use the app's
-- built-in default for that role", so the table starts empty and only records
-- deliberate overrides.
--
-- Safe to re-run.
-- =============================================================================

create table if not exists public.menu_permissions (
  id uuid primary key default gen_random_uuid(),
  role user_role not null,
  item_key varchar(40) not null,
  visible boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (role, item_key)
);

create index if not exists menu_permissions_role_idx on public.menu_permissions (role);

alter table public.menu_permissions enable row level security;

-- Everyone needs to read their own menu; only the Head may change one.
drop policy if exists menu_permissions_select on public.menu_permissions;
create policy menu_permissions_select on public.menu_permissions
  for select to authenticated using (true);

drop policy if exists menu_permissions_write on public.menu_permissions;
create policy menu_permissions_write on public.menu_permissions
  for all to authenticated
  using (public.is_team_head())
  with check (public.is_team_head());

-- Hiding Configuration from the Head would lock the only account that can undo
-- it out of the settings screen. Refuse at the database, not just in the UI.
create or replace function public.guard_menu_lockout()
returns trigger
language plpgsql
as $$
begin
  if new.role = 'team_head' and new.item_key = 'configuration' and new.visible = false then
    raise exception 'The Configuration page cannot be hidden from the Head';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_menu_lockout on public.menu_permissions;
create trigger guard_menu_lockout
  before insert or update on public.menu_permissions
  for each row execute function public.guard_menu_lockout();
