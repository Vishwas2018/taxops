-- TaxOps initial schema: tax profile, checklists, saved articles, saved calculator scenarios.
-- Every table below has RLS enabled with owner-only policies in the same migration.

create type employment_type as enum ('payg', 'abn', 'both');
create type business_structure as enum ('sole_trader', 'company', 'trust', 'partnership', 'none');
create type super_contribution_habit as enum (
  'guarantee_only',
  'salary_sacrifice',
  'personal_deductible',
  'none'
);

-- 1:1 with auth.users. Tax-profile answers are typed columns, not a JSON blob, so schema
-- changes are explicit migrations and the DB enforces valid values via enums/arrays.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  employment_type employment_type not null,
  business_structure business_structure,
  investment_property_count smallint not null default 0,
  super_contribution_habit super_contribution_habit,
  expense_categories text[] not null default '{}',
  other_income_sources text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint investment_property_count_non_negative check (investment_property_count >= 0)
);

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

create table public.checklists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_type employment_type not null,
  financial_year text not null,
  created_at timestamptz not null default now()
);

create table public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references public.checklists (id) on delete cascade,
  label text not null,
  is_agent_question boolean not null default false,
  is_checked boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.saved_articles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  article_slug text not null,
  saved_at timestamptz not null default now(),
  unique (user_id, article_slug)
);

create table public.saved_scenarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  calculator_name text not null,
  label text,
  inputs jsonb not null,
  created_at timestamptz not null default now()
);

-- Indexes for the owner-scoped lookups every RLS policy below performs.
create index checklists_user_id_idx on public.checklists (user_id);
create index checklist_items_checklist_id_idx on public.checklist_items (checklist_id);
create index saved_articles_user_id_idx on public.saved_articles (user_id);
create index saved_scenarios_user_id_idx on public.saved_scenarios (user_id);

alter table public.profiles enable row level security;
alter table public.checklists enable row level security;
alter table public.checklist_items enable row level security;
alter table public.saved_articles enable row level security;
alter table public.saved_scenarios enable row level security;

-- This Supabase version does not auto-expose new tables to the Data API roles, so grants are
-- explicit here. `authenticated` gets CRUD (RLS below still restricts to the owner's rows).
-- `anon` gets nothing on these tables: no v1 feature needs unauthenticated access to user
-- data, so the row is never reachable rather than reachable-but-filtered. `service_role`
-- bypasses RLS by default but still needs grants for trusted server-side/admin operations
-- (seed scripts, maintenance scripts).
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.checklists to authenticated;
grant select, insert, update, delete on public.checklist_items to authenticated;
grant select, insert, update, delete on public.saved_articles to authenticated;
grant select, insert, update, delete on public.saved_scenarios to authenticated;

grant all on public.profiles to service_role;
grant all on public.checklists to service_role;
grant all on public.checklist_items to service_role;
grant all on public.saved_articles to service_role;
grant all on public.saved_scenarios to service_role;

create policy "profiles: owner read" on public.profiles
  for select using (auth.uid () = id);
create policy "profiles: owner insert" on public.profiles
  for insert with check (auth.uid () = id);
create policy "profiles: owner update" on public.profiles
  for update using (auth.uid () = id) with check (auth.uid () = id);
create policy "profiles: owner delete" on public.profiles
  for delete using (auth.uid () = id);

create policy "checklists: owner read" on public.checklists
  for select using (auth.uid () = user_id);
create policy "checklists: owner insert" on public.checklists
  for insert with check (auth.uid () = user_id);
create policy "checklists: owner update" on public.checklists
  for update using (auth.uid () = user_id) with check (auth.uid () = user_id);
create policy "checklists: owner delete" on public.checklists
  for delete using (auth.uid () = user_id);

-- checklist_items has no user_id column; ownership is derived through its parent checklist.
create policy "checklist_items: owner read" on public.checklist_items
  for select using (
    exists (
      select 1
      from public.checklists
      where checklists.id = checklist_items.checklist_id
        and checklists.user_id = auth.uid ()
    )
  );
create policy "checklist_items: owner insert" on public.checklist_items
  for insert with check (
    exists (
      select 1
      from public.checklists
      where checklists.id = checklist_items.checklist_id
        and checklists.user_id = auth.uid ()
    )
  );
create policy "checklist_items: owner update" on public.checklist_items
  for update using (
    exists (
      select 1
      from public.checklists
      where checklists.id = checklist_items.checklist_id
        and checklists.user_id = auth.uid ()
    )
  )
  with check (
    exists (
      select 1
      from public.checklists
      where checklists.id = checklist_items.checklist_id
        and checklists.user_id = auth.uid ()
    )
  );
create policy "checklist_items: owner delete" on public.checklist_items
  for delete using (
    exists (
      select 1
      from public.checklists
      where checklists.id = checklist_items.checklist_id
        and checklists.user_id = auth.uid ()
    )
  );

create policy "saved_articles: owner read" on public.saved_articles
  for select using (auth.uid () = user_id);
create policy "saved_articles: owner insert" on public.saved_articles
  for insert with check (auth.uid () = user_id);
create policy "saved_articles: owner delete" on public.saved_articles
  for delete using (auth.uid () = user_id);

create policy "saved_scenarios: owner read" on public.saved_scenarios
  for select using (auth.uid () = user_id);
create policy "saved_scenarios: owner insert" on public.saved_scenarios
  for insert with check (auth.uid () = user_id);
create policy "saved_scenarios: owner update" on public.saved_scenarios
  for update using (auth.uid () = user_id) with check (auth.uid () = user_id);
create policy "saved_scenarios: owner delete" on public.saved_scenarios
  for delete using (auth.uid () = user_id);
