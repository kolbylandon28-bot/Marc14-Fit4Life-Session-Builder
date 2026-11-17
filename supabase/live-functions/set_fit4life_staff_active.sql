CREATE OR REPLACE FUNCTION public.set_fit4life_staff_active(target_user uuid, target_active boolean, change_reason text DEFAULT 'Owner changed staff access'::text, org_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  owner_organization uuid;
begin
  owner_organization := public.fit4life_active_org(org_id);

  if owner_organization is null then
    raise exception 'Only an active gym owner can change staff access.';
  end if;

  -- owner of THIS org, not owner somewhere
  if not public.is_org_owner(owner_organization) then
    raise exception 'Only an active gym owner can change staff access.';
  end if;

  if target_user = (select auth.uid()) and not target_active then
    raise exception 'You cannot deactivate your own owner account. Ask another owner to do it.';
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
    left(coalesce(nullif(trim(change_reason), ''), case when target_active then 'Owner reactivated staff access' else 'Owner deactivated staff access' end), 500),
    true
  );

  update public.memberships
  set is_active = target_active, updated_at = now()
  where organization_id = owner_organization
    and user_id = target_user
    and role in ('owner', 'trainer');

  update public.staff_profiles
  set is_active = target_active, updated_at = now()
  where organization_id = owner_organization
    and user_id = target_user;

  return true;
end;
$function$
