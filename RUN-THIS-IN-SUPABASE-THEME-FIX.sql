-- FIT4LIFE owner theme publishing repair — 2026-08-17
-- Paste this ENTIRE file into Supabase > SQL Editor and click Run.
-- Safe to run again. It does not delete client, workout, staff, or theme data.

begin;

-- Older Fit4Life databases created the organization table before shared themes and
-- equipment settings existed. Add the required columns without replacing the table
-- or touching any existing organization, staff, client, or workout records.
alter table public.organizations
  add column if not exists brand_config jsonb not null default '{}'::jsonb,
  add column if not exists equipment_config jsonb not null default '{}'::jsonb,
  add column if not exists public_registration_enabled boolean not null default true;

create or replace function public.is_org_owner(target_organization uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships membership
    where membership.organization_id = target_organization
      and membership.user_id = (select auth.uid())
      and membership.role = 'owner'
      and membership.is_active
  );
$$;

create or replace function public.protect_fit4life_organization_setup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (old.brand_config is distinct from new.brand_config
      or old.equipment_config is distinct from new.equipment_config)
     and coalesce((select auth.role()), '') <> 'service_role'
     and not public.is_org_owner(old.id) then
    raise exception 'Only an active owner can change the shared gym theme, branding, or equipment.';
  end if;
  return new;
end;
$$;

drop trigger if exists organizations_owner_setup_guard on public.organizations;
create trigger organizations_owner_setup_guard
before update of brand_config, equipment_config on public.organizations
for each row execute function public.protect_fit4life_organization_setup();

alter table public.organizations enable row level security;
grant select on public.organizations to authenticated;
grant update (brand_config, equipment_config) on public.organizations to authenticated;

drop policy if exists fit4life_organizations_member_read on public.organizations;
create policy fit4life_organizations_member_read on public.organizations
for select to authenticated
using (
  exists (
    select 1 from public.memberships membership
    where membership.organization_id = organizations.id
      and membership.user_id = (select auth.uid())
      and membership.is_active
  )
);

drop policy if exists fit4life_organizations_owner_setup_update on public.organizations;
create policy fit4life_organizations_owner_setup_update on public.organizations
for update to authenticated
using ((select public.is_org_owner(id)))
with check ((select public.is_org_owner(id)));

drop function if exists public.update_my_organization_setup(uuid, jsonb, jsonb);
create function public.update_my_organization_setup(
  target_organization uuid,
  new_brand_config jsonb,
  new_equipment_config jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_organization jsonb;
begin
  if not public.is_org_owner(target_organization) then
    raise exception 'Only an active owner can change the shared gym theme, branding, or equipment.';
  end if;

  update public.organizations as organization
  set brand_config = coalesce(new_brand_config, organization.brand_config, '{}'::jsonb),
      equipment_config = coalesce(new_equipment_config, organization.equipment_config, '{}'::jsonb)
  where organization.id = target_organization
  returning pg_catalog.jsonb_build_object(
    'organization_id', organization.id,
    'slug', organization.slug,
    'name', organization.name,
    'brand_config', organization.brand_config,
    'equipment_config', organization.equipment_config,
    'public_registration_enabled', organization.public_registration_enabled
  ) into saved_organization;

  if saved_organization is null then
    raise exception 'The shared gym organization could not be found.';
  end if;

  return saved_organization;
end;
$$;

revoke all on function public.update_my_organization_setup(uuid, jsonb, jsonb) from public;
revoke all on function public.update_my_organization_setup(uuid, jsonb, jsonb) from anon;
grant execute on function public.update_my_organization_setup(uuid, jsonb, jsonb) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'organizations'
     ) then
    alter publication supabase_realtime add table public.organizations;
  end if;
end;
$$;

notify pgrst, 'reload schema';
commit;

-- The Results panel should show the function name and TRUE for all three checks.
select
  to_regprocedure('public.update_my_organization_setup(uuid,jsonb,jsonb)')::text as installed_function,
  (
    select count(*) = 3
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'organizations'
      and column_name in ('brand_config', 'equipment_config', 'public_registration_enabled')
  ) as required_columns_present,
  has_function_privilege(
    'authenticated',
    'public.update_my_organization_setup(uuid,jsonb,jsonb)',
    'EXECUTE'
  ) as authenticated_can_call,
  exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'organizations'
  ) as realtime_enabled;
