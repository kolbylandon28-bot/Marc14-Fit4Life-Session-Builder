CREATE OR REPLACE FUNCTION public.revoke_fit4life_staff_invite(target_organization uuid, invite_email text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_org_owner(target_organization) then
    raise exception 'Only an owner can revoke a staff invite';
  end if;
  update public.staff_invites
     set revoked_at = now()
   where organization_id = target_organization
     and lower(email) = lower(btrim(invite_email))
     and accepted_at is null;
  return true;
end;
$function$
