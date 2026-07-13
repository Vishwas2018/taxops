-- Day 8: EOFY Checklists. Templates are versioned code (src/lib/checklists/templates.ts), not
-- database content - the DB stores only per-user state: which template item ids are checked,
-- and any custom items a user has added. See PROGRESS.md for the full design rationale.
--
-- Ground truth read first: grepped `src/` for consumers of the Day 1 `checklists` /
-- `checklist_items` tables (DB-content-driven groups) - zero hits, same as every other
-- speculative Day 1 column removed on Day 7. This design replaces that approach outright (code
-- templates + state tables, not DB-stored checklist content), so both tables are dropped here
-- rather than left dormant alongside the new ones (Privacy rule 5: no speculative schema).
-- `employment_type` was kept alive on Day 7 only because `checklists.profile_type` still used
-- it; with `checklists` gone it has zero remaining consumers, so it is dropped too.
drop table public.checklist_items;
drop table public.checklists;
drop type employment_type;

-- One row per (user, template item id) the user has ever toggled. A template item the user has
-- never interacted with has no row at all - a fresh template item added to code later needs no
-- backfill migration. Composite primary key (no surrogate id) because the natural identity of
-- this table *is* the pair. `checked_at` is when the item most recently became checked - the
-- app clears it back to null on uncheck rather than a DB trigger, since it's a plain write, not
-- an invariant the database needs to enforce.
create table public.checklist_item_states (
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id text not null,
  checked boolean not null default false,
  checked_at timestamptz,
  primary key (user_id, item_id),
  constraint checklist_item_states_item_id_not_blank check (btrim(item_id) <> '')
);

-- User-authored checklist items alongside the template ones. `group_id` is a plain text label
-- matching one of the code-defined template group ids (src/lib/checklists/templates.ts) - not a
-- foreign key, since groups are code, not database rows; this is the one deliberate addition
-- beyond the brief's literal (user_id, label, checked, position) shape, needed so the UI can
-- place a custom item under the right group. `label` is a single short document name, per the
-- constitution's checklist-organizes-not-advises framing - no other fields, length-capped so it
-- stays a label, not free-form notes.
create table public.checklist_custom_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  group_id text not null,
  label text not null,
  checked boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  constraint checklist_custom_items_label_length check (
    btrim(label) <> '' and char_length(label) <= 120
  )
);

create index checklist_item_states_user_id_idx on public.checklist_item_states (user_id);
create index checklist_custom_items_user_id_idx on public.checklist_custom_items (user_id);

alter table public.checklist_item_states enable row level security;
alter table public.checklist_custom_items enable row level security;

-- Same grant convention as every other user table (Day 1): `authenticated` gets CRUD (RLS
-- restricts to owner rows below), `anon` gets nothing, `service_role` gets all for seed/admin
-- scripts.
grant select, insert, update, delete on public.checklist_item_states to authenticated;
grant select, insert, update, delete on public.checklist_custom_items to authenticated;
grant all on public.checklist_item_states to service_role;
grant all on public.checklist_custom_items to service_role;

create policy "checklist_item_states: owner read" on public.checklist_item_states
  for select using (auth.uid () = user_id);
create policy "checklist_item_states: owner insert" on public.checklist_item_states
  for insert with check (auth.uid () = user_id);
create policy "checklist_item_states: owner update" on public.checklist_item_states
  for update using (auth.uid () = user_id) with check (auth.uid () = user_id);
create policy "checklist_item_states: owner delete" on public.checklist_item_states
  for delete using (auth.uid () = user_id);

create policy "checklist_custom_items: owner read" on public.checklist_custom_items
  for select using (auth.uid () = user_id);
create policy "checklist_custom_items: owner insert" on public.checklist_custom_items
  for insert with check (auth.uid () = user_id);
create policy "checklist_custom_items: owner update" on public.checklist_custom_items
  for update using (auth.uid () = user_id) with check (auth.uid () = user_id);
create policy "checklist_custom_items: owner delete" on public.checklist_custom_items
  for delete using (auth.uid () = user_id);
