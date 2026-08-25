-- FIT4LIFE: booking report inbox + trainer name links
-- Safe to run more than once.

create table if not exists public.booking_imports (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null unique,
  filename text,
  subject text,
  sender text,
  csv_body text not null,
  received_at timestamptz not null default now(),
  applied_at timestamptz,
  applied_by uuid,
  status text not null default 'pending'
    check (status in ('pending','applied','ignored'))
);

create index if not exists booking_imports_pending_idx
  on public.booking_imports (received_at desc) where status = 'pending';

alter table public.booking_imports enable row level security;

drop policy if exists booking_imports_select_staff
  on public.booking_imports;
create policy booking_imports_select_staff on public.booking_imports
  for select using (public.is_org_trainer((
    select organization_id from public.memberships
    where user_id = auth.uid() and is_active limit 1)));

drop policy if exists booking_imports_update_staff
  on public.booking_imports;
create policy booking_imports_update_staff on public.booking_imports
  for update using (public.is_org_trainer((
    select organization_id from public.memberships
    where user_id = auth.uid() and is_active limit 1)));

create table if not exists public.trainer_name_aliases (
  id uuid primary key default gen_random_uuid(),
  normalized_name text not null unique,
  source_name text not null,
  trainer_user_id uuid,
  display_name text,
  email text,
  status text not null default 'unresolved'
    check (status in ('unresolved','linked','external','ignored')),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  seen_count integer not null default 1,
  resolved_by uuid,
  resolved_at timestamptz
);

alter table public.trainer_name_aliases enable row level security;

drop policy if exists trainer_aliases_select_staff
  on public.trainer_name_aliases;
create policy trainer_aliases_select_staff
  on public.trainer_name_aliases
  for select using (public.is_org_trainer((
    select organization_id from public.memberships
    where user_id = auth.uid() and is_active limit 1)));

drop policy if exists trainer_aliases_write_owner
  on public.trainer_name_aliases;
create policy trainer_aliases_write_owner
  on public.trainer_name_aliases
  for all using (public.is_org_owner((
    select organization_id from public.memberships
    where user_id = auth.uid() and is_active limit 1)));

select
  to_regclass('public.booking_imports')::text      as reports_table,
  to_regclass('public.trainer_name_aliases')::text as trainer_links_table,
  (select count(*) from pg_policies
    where schemaname='public'
      and tablename='booking_imports') as report_rules,
  (select count(*) from pg_policies
    where schemaname='public'
      and tablename='trainer_name_aliases') as link_rules;
