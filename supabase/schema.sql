-- =============================================================================
-- PhonicsFlow — schema, indexes, row-level security and storage
-- Run this once in the Supabase SQL editor (or `supabase db push`).
-- Safe to re-run: every statement is guarded.
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('team_head', 'lead_trainer', 'trainer', 'parent');
  end if;
  if not exists (select 1 from pg_type where typname = 'student_level') then
    create type student_level as enum ('beginner', 'intermediate', 'advanced');
  end if;
  if not exists (select 1 from pg_type where typname = 'class_status') then
    create type class_status as enum ('scheduled', 'completed', 'cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'attendance_status') then
    create type attendance_status as enum ('present', 'absent', 'late');
  end if;
  if not exists (select 1 from pg_type where typname = 'homework_status') then
    create type homework_status as enum ('assigned', 'submitted', 'corrected');
  end if;
  if not exists (select 1 from pg_type where typname = 'sound_category') then
    create type sound_category as enum ('consonant', 'consonant_digraph', 'vowel_digraph');
  end if;
  if not exists (select 1 from pg_type where typname = 'contact_method') then
    create type contact_method as enum ('call', 'whatsapp', 'email', 'in_person', 'video_call');
  end if;
  if not exists (select 1 from pg_type where typname = 'report_status') then
    create type report_status as enum ('draft', 'submitted');
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- Application profile for each auth.users row.
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email varchar(255) not null unique,
  full_name varchar(120) not null default '',
  role user_role not null default 'trainer',
  -- Who this trainer reports to. Null for the Head and unassigned trainers.
  reports_to uuid references public.users (id) on delete set null,
  phone varchar(40),
  is_active boolean not null default true,
  -- Set when the Head provisions an account with a temporary password.
  must_change_password boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_reports_to_not_self check (reports_to is null or reports_to <> id)
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  name varchar(120) not null,
  age smallint check (age between 2 and 99),
  trainer_id uuid references public.users (id) on delete set null,
  parent_user_id uuid references public.users (id) on delete set null,
  level student_level not null default 'beginner',
  parent_name varchar(120),
  parent_email varchar(255),
  parent_phone varchar(40),
  class_day smallint check (class_day between 0 and 6),
  class_time time,
  start_date date,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  trainer_id uuid references public.users (id) on delete set null,
  scheduled_date date not null,
  scheduled_time time not null,
  duration_minutes smallint not null default 30,
  topics_covered text[] not null default '{}',
  status class_status not null default 'scheduled',
  attendance attendance_status,
  revision_notes text,
  dictation_notes text,
  reading_notes text,
  pronunciation_notes text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.phonics_sounds (
  id uuid primary key default gen_random_uuid(),
  category sound_category not null,
  sound_name varchar(40) not null,
  description text,
  example_words jsonb not null default '[]'::jsonb,
  display_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category, sound_name)
);

create table if not exists public.homework (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  class_id uuid references public.classes (id) on delete set null,
  assigned_date date not null default current_date,
  due_date date not null,
  topic varchar(160) not null,
  description text,
  status homework_status not null default 'assigned',
  submission_url text,
  corrections text,
  score smallint check (score between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.parent_contacts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  trainer_id uuid references public.users (id) on delete set null,
  contact_date date not null default current_date,
  method contact_method not null default 'call',
  summary text,
  next_contact_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.parent_feedback (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  submission_date date not null default current_date,
  video_url text,
  written_feedback text,
  rating smallint check (rating between 1 and 5),
  acknowledged_at timestamptz,
  acknowledged_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Single-use links handed to parents so they can submit feedback without login.
create table if not exists public.feedback_links (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  student_id uuid not null references public.students (id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_by uuid references public.users (id) on delete set null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.trainer_details (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.users (id) on delete cascade,
  week_ending_date date not null,
  videos_posted integer not null default 0 check (videos_posted >= 0),
  students_count integer not null default 0 check (students_count >= 0),
  classes_conducted integer not null default 0 check (classes_conducted >= 0),
  issues_notes text,
  submitted_at timestamptz not null default now(),
  unique (trainer_id, week_ending_date)
);

create table if not exists public.monthly_reports (
  id uuid primary key default gen_random_uuid(),
  year smallint not null,
  month smallint not null check (month between 1 and 12),
  summary_data jsonb not null default '{}'::jsonb,
  notes text,
  status report_status not null default 'draft',
  generated_by uuid references public.users (id) on delete set null,
  generated_at timestamptz not null default now(),
  submitted_at timestamptz,
  unique (year, month)
);

-- ---------------------------------------------------------------------------
-- Indexes — every foreign key and every column the dashboards filter on
-- ---------------------------------------------------------------------------
create index if not exists students_trainer_idx on public.students (trainer_id) where is_active;
create index if not exists students_parent_idx on public.students (parent_user_id);
create index if not exists users_reports_to_idx on public.users (reports_to);
create index if not exists classes_student_date_idx on public.classes (student_id, scheduled_date desc);
create index if not exists classes_date_idx on public.classes (scheduled_date desc);
create index if not exists classes_trainer_date_idx on public.classes (trainer_id, scheduled_date desc);
create index if not exists homework_student_idx on public.homework (student_id, due_date desc);
create index if not exists homework_status_idx on public.homework (status) where status <> 'corrected';
create index if not exists parent_contacts_student_idx on public.parent_contacts (student_id, contact_date desc);
create index if not exists parent_feedback_student_idx on public.parent_feedback (student_id, submission_date desc);
create index if not exists trainer_details_week_idx on public.trainer_details (week_ending_date desc);
create index if not exists phonics_sounds_category_idx on public.phonics_sounds (category, display_order);
create index if not exists feedback_links_token_idx on public.feedback_links (token);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['users', 'students', 'classes', 'phonics_sounds', 'homework']
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t);
  end loop;
end
$$;

-- New auth user -> profile row.
--
-- The role is decided here, never taken from raw_user_meta_data: that field is
-- supplied by whoever calls /auth/v1/signup, so trusting it would let anyone
-- sign themselves up as Head. The first account bootstraps as Head; everyone
-- after starts as a trainer and is promoted by the Head.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_role user_role;
begin
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Authorisation helpers
-- SECURITY DEFINER so policies on public.users don't recurse into themselves.
-- ---------------------------------------------------------------------------
create or replace function public.current_app_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

create or replace function public.is_team_head()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() = 'team_head', false);
$$;

-- The single source of truth for "whose students may I see".
--
-- One level deep on purpose: the model is three fixed tiers, so a lead trainer
-- sees their direct reports. It does not walk lead -> lead -> trainer chains.
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

-- True when the caller is the Head, the student's trainer, a lead trainer above
-- that trainer, or the student's parent.
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
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.students enable row level security;
alter table public.classes enable row level security;
alter table public.phonics_sounds enable row level security;
alter table public.homework enable row level security;
alter table public.parent_contacts enable row level security;
alter table public.parent_feedback enable row level security;
alter table public.feedback_links enable row level security;
alter table public.trainer_details enable row level security;
alter table public.monthly_reports enable row level security;

-- users -------------------------------------------------------------------
drop policy if exists users_select on public.users;
create policy users_select on public.users
  for select to authenticated
  using (
    id = auth.uid()
    or public.is_team_head()
    or (public.current_app_role() = 'lead_trainer' and reports_to = auth.uid())
  );

drop policy if exists users_insert on public.users;
create policy users_insert on public.users
  for insert to authenticated
  with check (public.is_team_head());

drop policy if exists users_update on public.users;
create policy users_update on public.users
  for update to authenticated
  using (id = auth.uid() or public.is_team_head())
  with check (id = auth.uid() or public.is_team_head());

-- students ----------------------------------------------------------------
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

drop policy if exists students_delete on public.students;
create policy students_delete on public.students
  for delete to authenticated
  using (public.is_team_head());

-- classes / homework / parent tables share the student-scoped rule ---------
do $$
declare
  t text;
begin
  foreach t in array array['classes', 'homework', 'parent_contacts', 'parent_feedback']
  loop
    execute format('drop policy if exists %1$s_select on public.%1$s', t);
    execute format(
      'create policy %1$s_select on public.%1$s for select to authenticated
         using (public.can_access_student(student_id))', t);

    execute format('drop policy if exists %1$s_insert on public.%1$s', t);
    execute format(
      'create policy %1$s_insert on public.%1$s for insert to authenticated
         with check (public.can_access_student(student_id))', t);

    execute format('drop policy if exists %1$s_update on public.%1$s', t);
    execute format(
      'create policy %1$s_update on public.%1$s for update to authenticated
         using (public.can_access_student(student_id))
         with check (public.can_access_student(student_id))', t);

    execute format('drop policy if exists %1$s_delete on public.%1$s', t);
    execute format(
      'create policy %1$s_delete on public.%1$s for delete to authenticated
         using (public.can_access_student(student_id))', t);
  end loop;
end
$$;

-- phonics_sounds: shared reference material -------------------------------
drop policy if exists sounds_select on public.phonics_sounds;
create policy sounds_select on public.phonics_sounds
  for select to authenticated using (true);

drop policy if exists sounds_insert on public.phonics_sounds;
create policy sounds_insert on public.phonics_sounds
  for insert to authenticated
  with check (public.current_app_role() in ('team_head', 'lead_trainer', 'trainer'));

drop policy if exists sounds_update on public.phonics_sounds;
create policy sounds_update on public.phonics_sounds
  for update to authenticated
  using (public.current_app_role() in ('team_head', 'lead_trainer', 'trainer'))
  with check (public.current_app_role() in ('team_head', 'lead_trainer', 'trainer'));

drop policy if exists sounds_delete on public.phonics_sounds;
create policy sounds_delete on public.phonics_sounds
  for delete to authenticated using (public.is_team_head());

-- feedback_links ----------------------------------------------------------
drop policy if exists feedback_links_select on public.feedback_links;
create policy feedback_links_select on public.feedback_links
  for select to authenticated using (public.can_access_student(student_id));

drop policy if exists feedback_links_insert on public.feedback_links;
create policy feedback_links_insert on public.feedback_links
  for insert to authenticated with check (public.can_access_student(student_id));

drop policy if exists feedback_links_delete on public.feedback_links;
create policy feedback_links_delete on public.feedback_links
  for delete to authenticated using (public.can_access_student(student_id));

-- trainer_details ---------------------------------------------------------
drop policy if exists trainer_details_select on public.trainer_details;
create policy trainer_details_select on public.trainer_details
  for select to authenticated
  using (public.is_team_head() or public.manages_trainer(trainer_id));

drop policy if exists trainer_details_insert on public.trainer_details;
create policy trainer_details_insert on public.trainer_details
  for insert to authenticated
  with check (trainer_id = auth.uid() or public.is_team_head());

drop policy if exists trainer_details_update on public.trainer_details;
create policy trainer_details_update on public.trainer_details
  for update to authenticated
  using (trainer_id = auth.uid() or public.is_team_head())
  with check (trainer_id = auth.uid() or public.is_team_head());

drop policy if exists trainer_details_delete on public.trainer_details;
create policy trainer_details_delete on public.trainer_details
  for delete to authenticated using (public.is_team_head());

-- monthly_reports: team head only ----------------------------------------
drop policy if exists monthly_reports_all on public.monthly_reports;
create policy monthly_reports_all on public.monthly_reports
  for all to authenticated
  using (public.is_team_head())
  with check (public.is_team_head());

-- ---------------------------------------------------------------------------
-- Storage buckets (private) + policies
-- Files are keyed <bucket>/<student_id>/<filename>, so access is decided by
-- the first path segment.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values
  ('homework', 'homework', false, 52428800),
  ('feedback-videos', 'feedback-videos', false, 52428800)
on conflict (id) do nothing;

-- A stray object whose first segment is not a uuid must read as "no access"
-- rather than raising on the cast.
create or replace function public.can_access_object(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  student uuid;
begin
  begin
    student := split_part(object_name, '/', 1)::uuid;
  exception when others then
    return false;
  end;
  return public.can_access_student(student);
end;
$$;

drop policy if exists storage_read on storage.objects;
create policy storage_read on storage.objects
  for select to authenticated
  using (
    bucket_id in ('homework', 'feedback-videos')
    and public.can_access_object(name)
  );

drop policy if exists storage_write on storage.objects;
create policy storage_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('homework', 'feedback-videos')
    and public.can_access_object(name)
  );

drop policy if exists storage_delete on storage.objects;
create policy storage_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('homework', 'feedback-videos')
    and public.can_access_object(name)
  );
