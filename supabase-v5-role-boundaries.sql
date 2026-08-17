-- FIT4LIFE V5 owner / trainer boundary upgrade
-- Run in Supabase SQL Editor after the existing FIT4LIFE schema and trainer-account upgrades.
-- Safe to run again. This does not delete client, workout, or staff data.

begin;

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

-- Browser-authenticated membership changes are owner-only. The verified signup
-- and approval RPCs remain the only narrow SECURITY DEFINER entry points.
drop policy if exists memberships_insert_trainer on public.memberships;
drop policy if exists memberships_update_trainer on public.memberships;
drop policy if exists memberships_delete_trainer on public.memberships;
drop policy if exists memberships_insert_owner on public.memberships;
drop policy if exists memberships_update_owner on public.memberships;
drop policy if exists memberships_delete_owner on public.memberships;

create policy memberships_insert_owner on public.memberships
for insert to authenticated
with check ((select public.is_org_owner(organization_id)));

create policy memberships_update_owner on public.memberships
for update to authenticated
using ((select public.is_org_owner(organization_id)))
with check ((select public.is_org_owner(organization_id)));

create policy memberships_delete_owner on public.memberships
for delete to authenticated
using ((select public.is_org_owner(organization_id)));

-- Trainers may create and normally update shared client records, but only an
-- owner may delete the row. Archiving is protected by the status trigger below.
drop policy if exists client_profiles_delete_trainer on public.client_profiles;
drop policy if exists client_profiles_delete_owner on public.client_profiles;
create policy client_profiles_delete_owner on public.client_profiles
for delete to authenticated
using ((select public.is_org_owner(organization_id)));

create or replace function public.protect_fit4life_client_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status is distinct from new.status
     and not public.is_org_owner(old.organization_id) then
    raise exception 'Only an active owner can archive or reactivate a client profile.';
  end if;
  return new;
end;
$$;

drop trigger if exists client_profiles_owner_status_guard on public.client_profiles;
create trigger client_profiles_owner_status_guard
before update of status on public.client_profiles
for each row execute function public.protect_fit4life_client_status();

-- Prevent the final active owner from being demoted, deactivated, or removed.
create or replace function public.protect_fit4life_last_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  remaining integer;
begin
  if tg_op = 'DELETE' and old.role = 'owner' and old.is_active then
    select count(*) into remaining
    from public.memberships membership
    where membership.organization_id = old.organization_id
      and membership.role = 'owner'
      and membership.is_active
      and membership.id <> old.id;
    if remaining < 1 then
      raise exception 'Every gym must keep at least one active owner. Promote another owner first.';
    end if;
  elsif tg_op = 'UPDATE' and old.role = 'owner' and old.is_active
        and (new.role <> 'owner' or not new.is_active) then
    select count(*) into remaining
    from public.memberships membership
    where membership.organization_id = old.organization_id
      and membership.role = 'owner'
      and membership.is_active
      and membership.id <> old.id;
    if remaining < 1 then
      raise exception 'Every gym must keep at least one active owner. Promote another owner first.';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists memberships_last_owner_guard on public.memberships;
create trigger memberships_last_owner_guard
before update or delete on public.memberships
for each row execute function public.protect_fit4life_last_owner();

-- V12 shared appearance guard. The browser hides the holiday-theme picker from
-- trainers, and this trigger enforces the same owner-only rule in PostgreSQL so a
-- crafted request cannot bypass the interface. Service-role maintenance remains
-- available for trusted server processes.
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

-- Owner-only write path used by the Settings theme and shared gym setup controls.
-- Recreate the exact signature so this upgrade is safe whether an older draft of
-- the RPC exists or the project has never installed it.
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

-- Publish organization appearance changes to authenticated devices. RLS still
-- controls which organization rows each signed-in user can read.
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

-- Ask Supabase's API layer to discover the recreated RPC immediately after commit.
notify pgrst, 'reload schema';

commit;
