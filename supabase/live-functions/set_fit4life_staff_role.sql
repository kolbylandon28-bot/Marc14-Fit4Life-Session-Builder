CREATE OR REPLACE FUNCTION public.set_fit4life_staff_role(target_user uuid, target_role text, change_reason text DEFAULT 'Owner changed staff role'::text, org_id uuid DEFAULT NULL::uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  owner_organization uuid;
  clean_role text := lower(trim(coalesce(target_role, '')));
begin
  owner_organization := public.fit4life_active_org(org_id);

  if owner_organization is null then
    raise exception 'Only an active gym owner can change staff roles.';
  end if;

  -- owner of THIS org, not owner somewhere
  if not public.is_org_owner(owner_organization) then
    raise exception 'Only an active gym owner can change staff roles.';
  end if;

  if clean_role not in ('owner', 'trainer') then
    raise exception 'Staff role must be owner or trainer.';
  end if;

  if not exists (
    select 1 from public.memberships membership
    where membership.organization_id = owner_organization
      and membership.user_id = target_user
      and membership.role in ('owner', 'trainer')
  ) then
    raise exception 'That staff account was not found in this gym.';
  end if;

  perform set_config(
    'fit4life.membership_reason',
    left(coalesce(nullif(trim(change_reason), ''), 'Owner changed staff role to ' || clean_role), 500),
    true
  );

  update public.memberships
  set role = clean_role, is_active = true, updated_at = now()
  where organization_id = owner_organization
    and user_id = target_user
    and role in ('owner', 'trainer');

  update public.staff_profiles
  set is_active = true, updated_at = now()
  where organization_id = owner_organization
    and user_id = target_user;

  return clean_role;
end;
$function$
