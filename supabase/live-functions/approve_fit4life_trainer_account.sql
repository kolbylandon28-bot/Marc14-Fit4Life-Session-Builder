CREATE OR REPLACE FUNCTION public.approve_fit4life_trainer_account(target_email text, target_display_name text, org_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  resolved_organization uuid;
begin
  resolved_organization := public.fit4life_active_org(org_id);

  if resolved_organization is null then
    raise exception 'Only an active gym owner can grant trainer or owner access.';
  end if;

  if not public.is_org_owner(resolved_organization) then
    raise exception 'Only an active gym owner can grant trainer or owner access.';
  end if;

  return public.grant_fit4life_staff_account(
    target_email,
    target_display_name,
    'trainer',
    'Owner approved trainer access',
    resolved_organization
  );
end;
$function$
