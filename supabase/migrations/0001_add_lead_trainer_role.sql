-- =============================================================================
-- Migration 0001 — add the lead_trainer role
--
-- RUN THIS FILE ON ITS OWN, BEFORE 0002.
-- Postgres will not let a newly added enum value be *used* in the same
-- transaction that adds it, and the Supabase SQL editor runs each script as one
-- transaction. Splitting the ALTER TYPE into its own run is what keeps 0002
-- from failing with "unsafe use of new value of enum type".
-- =============================================================================

alter type user_role add value if not exists 'lead_trainer' before 'trainer';
