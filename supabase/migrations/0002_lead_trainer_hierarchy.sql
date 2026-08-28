-- =============================================================================
-- Migration 0002 — reporting hierarchy
--
-- Run AFTER 0001 has been executed and committed.
--
-- Visibility model:
--   trainer      → their own students
--   lead_trainer → their own students + those of every trainer reporting to them
--   team_head    → everyone (the "Head")
--   parent       → their own child only
--
-- Safe to re-run.
-- =============================================================================

-- Who a trainer reports to. Null for the Head and for unassigned trainers.
alter table public.users
  add column if not exists reports_to uuid references public.users (id) on delete set null;

create index if not exists users_reports_to_idx on public.users (reports_to);

-- A user cannot report to themselves.
alter table public.users drop constraint if exists users_reports_to_not_self;
alter table public.users
  add constraint users_reports_to_not_self check (reports_to is null or reports_to <> id);

-- ---------------------------------------------------------------------------
-- The single source of truth for "whose students may I see".
--
-- One level deep on purpose: the model is three fixed tiers, so a lead trainer
-- sees their direct reports. It does not walk lead → lead → trainer chains.
-- ---------------------------------------------------------------------------
create or replace function public.manages_trainer(target_trainer uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    target_trainer is not null
    and (
      target_trainer = auth.uid()
      or (
        public.current_app_role() = 'lead_trainer'
        and exists (
          select 1
          from public.users u
          where u.id = target_trainer
            and u.reports_to = auth.uid()
        )
      )
    );
$$;

-- Student-scoped tables (classes, homework, parent_contacts, parent_feedback,
-- storage objects) all route through this.
create or replace function public.can_access_student(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.students s
    where s.id = target
      and (
        public.is_team_head()
        or s.parent_user_id = auth.uid()
        or public.manages_trainer(s.trainer_id)
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- Policies that carried their own inline rule and so must be restated
-- ---------------------------------------------------------------------------

-- students -----------------------------------------------------------------
drop policy if exists students_select on public.students;
create policy students_select on public.students
  for select to authenticated
  using (
    public.is_team_head()
    or parent_user_id = auth.uid()
    or public.manages_trainer(trainer_id)
  );

drop policy if exists students_write on public.students;
create policy students_write on public.students
  for insert to authenticated
  with check (public.is_team_head() or public.manages_trainer(trainer_id));

drop policy if exists students_update on public.students;
create policy students_update on public.students
  for update to authenticated
  using (public.is_team_head() or public.manages_trainer(trainer_id))
  with check (public.is_team_head() or public.manages_trainer(trainer_id));

-- users: a lead trainer needs to see the profiles of their reports ---------
drop policy if exists users_select on public.users;
create policy users_select on public.users
  for select to authenticated
  using (
    id = auth.uid()
    or public.is_team_head()
    or (public.current_app_role() = 'lead_trainer' and reports_to = auth.uid())
  );

-- trainer_details: a lead trainer reviews their reports' weekly submissions -
drop policy if exists trainer_details_select on public.trainer_details;
create policy trainer_details_select on public.trainer_details
  for select to authenticated
  using (public.is_team_head() or public.manages_trainer(trainer_id));

-- Only the Head may change a role or rewire the reporting line.
create or replace function public.guard_user_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if new.role is distinct from old.role and not public.is_team_head() then
    raise exception 'Only the Head can change a role';
  end if;
  if new.reports_to is distinct from old.reports_to and not public.is_team_head() then
    raise exception 'Only the Head can change the reporting line';
  end if;
  return new;
end;
$$;
