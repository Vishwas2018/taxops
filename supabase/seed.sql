-- Local dev seed data only. Never run against a production project.
-- Creates one demo user (email: demo@taxops.local, password: password123) with a sample
-- profile, checklist, saved article, and saved scenario so the dashboard has data to render.

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated',
  'authenticated',
  'demo@taxops.local',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now(),
  '',
  '',
  '',
  ''
)
on conflict (id) do nothing;

insert into auth.identities (
  id,
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
values (
  gen_random_uuid(),
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  '{"sub":"11111111-1111-1111-1111-111111111111","email":"demo@taxops.local"}',
  'email',
  now(),
  now(),
  now()
)
on conflict do nothing;

-- Matches CLAUDE.md's primary persona: dual-profile PAYG contractor who also holds an ABN and
-- an investment property, household income $400k-600k (above the top 250k+ band).
insert into public.profiles (
  id,
  work_arrangement,
  has_abn,
  investment_property_band,
  super_engagement,
  household_income_band,
  other_income_sources
)
values (
  '11111111-1111-1111-1111-111111111111',
  'mix',
  true,
  'one',
  'making_concessional_contributions',
  '250k_plus',
  array['dividends']::other_income_source[]
)
on conflict (id) do nothing;

with new_checklist as (
  insert into public.checklists (id, user_id, profile_type, financial_year)
  values (
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'both',
    'FY2025-26'
  )
  on conflict (id) do nothing
  returning id
)
insert into public.checklist_items (checklist_id, label, is_agent_question, sort_order)
select
  '22222222-2222-2222-2222-222222222222',
  label,
  is_agent_question,
  sort_order
from (
  values
    ('Gather all payment summaries / income statements', false, 0),
    ('Collect receipts for work-related expenses', false, 1),
    ('Reconcile rental income and expenses for each property', false, 2),
    ('Confirm depreciation schedule is up to date', false, 3),
    ('Ask my tax agent: am I affected by Division 293 this year?', true, 4),
    ('Ask my tax agent: does my PSI status change my deduction eligibility?', true, 5)
) as items (label, is_agent_question, sort_order)
where exists (select 1 from new_checklist);

insert into public.saved_articles (user_id, article_slug)
values ('11111111-1111-1111-1111-111111111111', 'contractor-expenses/home-office-deductions')
on conflict do nothing;

insert into public.saved_scenarios (user_id, calculator_name, label, inputs)
values (
  '11111111-1111-1111-1111-111111111111',
  'contractor-take-home',
  'Day rate scenario 2026',
  '{"dayRate": 950, "daysPerWeek": 4.5, "structure": "abn"}'
)
on conflict do nothing;
