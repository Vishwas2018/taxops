-- Day 7: Guided Tax Profile interview. Extends the existing `public.profiles` table (already
-- 1:1 with auth.users per the Day 1 migration) rather than adding a new table - this table
-- *is* the tax profile per CLAUDE.md's schema description, and the interview's question groups
-- are all per-user, single-valued-or-small-array answers with no natural separate entity.
--
-- Ground truth read before this migration: the Day 1 profiles table was a placeholder scaffold
-- that predates two of the interview's design principles finalised for Day 7 -
-- privacy-minimizing banding and full skippability - and has zero application-code consumers
-- (grepped `src/` - only the Day 1 migration/seed touch these columns). That makes this a
-- genuine schema correction, not a purely additive change:
--   - `employment_type` (payg/abn/both, NOT NULL) is dropped from `profiles`. It can't be
--     skipped (NOT NULL) and can't distinguish PAYG employee from PAYG contractor, which the
--     interview's `work_arrangement` needs. The `employment_type` *type* is kept (not dropped)
--     since `checklists.profile_type` still uses it - only the column on `profiles` goes.
--   - `business_structure` and `super_contribution_habit` columns AND their enum types are
--     dropped entirely: nothing else references either type, and neither has a defined
--     consumer in the Day 7 interview (Privacy rule 5: "collect only what a feature needs - no
--     speculative columns"). `super_engagement` (this migration) replaces
--     `super_contribution_habit`'s role with the Day 7 wording.
--   - `expense_categories` is dropped: no consumer wired today either (checklist item
--     selection is a future day's module). Can be re-added with its own migration once a
--     consumer exists.
--   - `investment_property_count` (exact smallint) is replaced by `investment_property_band`
--     (banded enum) - an exact count doesn't match the privacy-minimizing-by-design principle
--     ("banded ranges" is explicit in the brief), even though a small count alone wouldn't be
--     too sensitive on its own.
--   - `other_income_sources` changes from a free-form `text[]` to `other_income_source[]` - a
--     real Postgres enum array gets DB-level validation of the fixed multi-select vocabulary,
--     which free text never had (this also matches the Day 1 migration's own stated intent:
--     "the DB enforces valid values via enums/arrays").
--
-- Every new column is nullable with no default: null means "not answered yet", distinct from
-- any answered value (including e.g. `investment_property_band = 'zero'`), which is what makes
-- profile completeness a derived count rather than a NOT NULL gate.

create type work_arrangement as enum (
  'payg_employee',
  'payg_contractor',
  'abn_sole_trader',
  'company_or_trust',
  'mix'
);

create type investment_property_band as enum ('zero', 'one', 'two_to_three', 'four_plus');

create type super_engagement as enum (
  'employer_only',
  'making_concessional_contributions',
  'not_sure'
);

create type household_income_band as enum (
  'under_100k',
  '100k_to_190k',
  '190k_to_250k',
  '250k_plus'
);

create type other_income_source as enum ('dividends', 'capital_gains', 'crypto', 'foreign', 'none');

alter table public.profiles
  drop column employment_type,
  drop column business_structure,
  drop column investment_property_count,
  drop column super_contribution_habit,
  drop column expense_categories;

drop type business_structure;
drop type super_contribution_habit;

alter table public.profiles
  add column work_arrangement work_arrangement,
  add column has_abn boolean,
  add column investment_property_band investment_property_band,
  add column super_engagement super_engagement,
  add column household_income_band household_income_band;

-- `other_income_sources` already exists (text[] not null default '{}'); tighten its element
-- type in place. The direct array cast works because every existing value ('dividends' in the
-- Day 1 seed) is already a valid `other_income_source` label.
alter table public.profiles
  alter column other_income_sources drop default;
alter table public.profiles
  alter column other_income_sources type other_income_source[]
  using other_income_sources::other_income_source[];
alter table public.profiles
  alter column other_income_sources set default '{}'::other_income_source[];

comment on column public.profiles.other_income_sources is
  'Multi-select; empty array means not answered. ''none'' is itself a selectable value, distinct from an empty (unanswered) array.';
