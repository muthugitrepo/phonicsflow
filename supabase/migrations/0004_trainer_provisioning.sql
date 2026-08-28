-- =============================================================================
-- Migration 0004 — Head-provisioned trainer accounts
--
-- The Head creates an account with a temporary password. The trainer is forced
-- to choose their own on first sign-in, so the shared secret is short-lived.
--
-- Safe to re-run.
-- =============================================================================

alter table public.users
  add column if not exists must_change_password boolean not null default false;

-- A user clears their own flag by setting a new password. The role guard
-- already prevents them touching role or reports_to in the same update.
