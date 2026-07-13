-- Day 10 hardening. Hosted Supabase (unlike the local CLI's Docker image) auto-grants anon,
-- authenticated, and service_role broad privileges - including TRUNCATE/REFERENCES/TRIGGER, and
-- for anon specifically full SELECT/INSERT/UPDATE/DELETE - on every table via a schema-level
-- `ALTER DEFAULT PRIVILEGES` set for the `postgres` role. This project's migrations never asked
-- for that and don't rely on it: every migration so far already grants exactly what each role
-- needs, per table, explicitly (see the Day 1 migration's own comment: "grants are explicit
-- here"). Confirmed via `information_schema.role_table_grants` / `pg_default_acl` against
-- taxops-staging on 2026-07-13 - RLS was never bypassed (it's enabled on every table below and
-- correctly scoped every authenticated-user access in scripts/smoke-test-rls.mjs), but `anon`
-- silently holding table-level grants it was never meant to have is a real defense-in-depth gap:
-- a future table added without RLS enabled would have zero protection instead of one layer.
-- See PROGRESS.md's Day 10 entry for the full investigation.

-- Strip every current user table back to exactly the grants this project has always declared,
-- for every Data API role - removing both anon's unintended access and the extra privileges
-- (TRUNCATE/REFERENCES/TRIGGER) authenticated/service_role picked up the same way.
revoke all on public.profiles, public.saved_articles, public.saved_scenarios,
  public.checklist_item_states, public.checklist_custom_items
  from anon, authenticated, service_role;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.saved_articles to authenticated;
grant select, insert, update, delete on public.saved_scenarios to authenticated;
grant select, insert, update, delete on public.checklist_item_states to authenticated;
grant select, insert, update, delete on public.checklist_custom_items to authenticated;

grant all on public.profiles to service_role;
grant all on public.saved_articles to service_role;
grant all on public.saved_scenarios to service_role;
grant all on public.checklist_item_states to service_role;
grant all on public.checklist_custom_items to service_role;

-- `anon` gets nothing, matching every prior migration's stated intent - no v1 feature needs
-- unauthenticated access to user data.

-- Prevent the same drift for every future table: without this, any `create table` in a future
-- migration (run as `postgres`, same role that issues this statement) would silently inherit
-- the hosted platform's default privileges again, regardless of what that migration itself
-- explicitly grants. This makes explicit, per-table grants mandatory going forward, not optional.
alter default privileges in schema public
  revoke all on tables from anon, authenticated, service_role;
