CREATE OR REPLACE FUNCTION public.set_fit4life_trainer_tier(target_user uuid, target_tier text, org_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  caller_org uuid;
begin
  if target_tier not in ('staff_standard','staff_premium') then
    raise exception 'Unknown trainer tier %', target_tier;
  end if;

  caller_org := public.fit4life_active_org(org_id);

  if caller_org is null then
    raise exception 'Only an owner can change a trainer tier';
  end if;

  -- owner of THIS org, not owner somewhere
  if not public.is_org_owner(caller_org) then
    raise exception 'Only an owner can change a trainer tier';
  end if;

  update public.memberships
     set trainer_tier = target_tier
   where user_id = target_user
     and organization_id = caller_org
     and role = 'trainer';

  return found;
end;
$function$
