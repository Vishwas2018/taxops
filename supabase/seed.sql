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

-- Day 8: checklist state only - the checklist *content* is code (src/lib/checklists/templates.ts),
-- so seeding here just marks a couple of template items checked plus one custom item, matching
-- the demo persona (contractor + one investment property).
insert into public.checklist_item_states (user_id, item_id, checked, checked_at)
values
  ('11111111-1111-1111-1111-111111111111', 'contractor-income-expense.bank-statements-business', true, now()),
  ('11111111-1111-1111-1111-111111111111', 'property-documents.loan-statements', true, now())
on conflict (user_id, item_id) do nothing;

-- id uses a valid v4-shaped UUID (version nibble 4, variant nibble 8) - the app's
-- editCustomItemLabelSchema/toggleCustomItemSchema/deleteCustomItemSchema validate with
-- z.uuid(), which rejects a plain repeated-digit id like '33333333-...-333333333333'.
insert into public.checklist_custom_items (id, user_id, group_id, label, checked, position)
values (
  '33333333-3333-4333-8333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  'property-documents',
  '2019 depreciation schedule',
  false,
  0
)
on conflict (id) do nothing;

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
