CREATE OR REPLACE FUNCTION public.deactivate_fit4life_trainer_account(target_user uuid, org_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  resolved_organization uuid;
begin
  resolved_organization := public.fit4life_active_org(org_id);

  if resolved_organization is null then
    raise exception 'Only an active gym owner can change staff access.';
  end if;

  if not public.is_org_owner(resolved_organization) then
    raise exception 'Only an active gym owner can change staff access.';
  end if;

  -- owner guard scoped to this branch, not every branch
  if exists (
    select 1 from public.memberships membership
    where membership.organization_id = resolved_organization
      and membership.user_id = target_user
      and membership.role = 'owner'
      and membership.is_active
  ) then
    raise exception 'Use the owner role controls for another owner account.';
  end if;

  return public.set_fit4life_staff_active(
    target_user,
    false,
    'Owner deactivated trainer access',
    resolved_organization
  );
end;
$function$
